import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { UsersService } from '../users.service';
import { RolesService } from '../roles.service';
import { Role } from '../../../shared/models/role.model';

// HU-03 — one component, two modes depending on whether the route carries
// an :id. Create asks for a password; edit doesn't (no password-reset flow
// yet, ADR-26). Edit resolves the target user from the paginated users list
// (no GET /users/:id in plan section 7.4's endpoint table — same criterion
// role-permissions.component.ts already uses for roles).
@Component({
  selector: 'app-user-form',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './user-form.component.html',
})
export class UserFormComponent {
  private fb = inject(FormBuilder);
  private usersService = inject(UsersService);
  private rolesService = inject(RolesService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  userId = this.route.snapshot.paramMap.get('id');
  isEditMode = this.userId !== null;

  roles = signal<Role[]>([]);
  loading = signal(this.isEditMode);
  errorMessage: string | null = null;
  isSubmitting = false;

  form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', this.isEditMode ? [] : [Validators.required, Validators.minLength(8)]],
    roleId: ['', [Validators.required]],
    status: ['active' as 'active' | 'blocked'],
  });

  constructor() {
    if (this.isEditMode) {
      forkJoin({
        roles: this.rolesService.listRoles(1, 100),
        users: this.usersService.listUsers(1, 100),
      }).subscribe({
        next: ({ roles, users }) => {
          this.roles.set(roles.items);
          const user = users.items.find((u) => u.id === this.userId);
          if (user) {
            this.form.patchValue({
              name: user.name,
              email: user.email,
              roleId: user.role.id,
              status: user.status,
            });
          }
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
    } else {
      this.rolesService.listRoles(1, 100).subscribe({
        next: (response) => this.roles.set(response.items),
      });
    }
  }

  onSubmit(): void {
    if (this.form.invalid) return;

    this.errorMessage = null;
    this.isSubmitting = true;
    const { name, email, password, roleId, status } = this.form.getRawValue();

    const request$ = this.isEditMode
      ? this.usersService.updateUser(this.userId as string, { name, email, roleId, status })
      : this.usersService.createUser({ name, email, password, roleId });

    request$.subscribe({
      next: () => {
        this.isSubmitting = false;
        this.router.navigateByUrl('/users');
      },
      error: (error: HttpErrorResponse) => {
        this.isSubmitting = false;
        this.errorMessage =
          error.status === 409
            ? 'Ya existe un usuario con ese correo.'
            : error.status === 400
              ? 'El rol seleccionado no es válido.'
              : 'No se pudo guardar el usuario. Intentá de nuevo.';
      },
    });
  }
}
