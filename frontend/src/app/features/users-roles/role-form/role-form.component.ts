import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { RolesService } from '../roles.service';

// HU-02 — creates a role with name/description. Permission assignment
// happens separately, from the roles list, once the role exists.
@Component({
  selector: 'app-role-form',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './role-form.component.html',
})
export class RoleFormComponent {
  private fb = inject(FormBuilder);
  private rolesService = inject(RolesService);
  private router = inject(Router);

  form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    description: ['', [Validators.maxLength(255)]],
  });

  errorMessage: string | null = null;
  isSubmitting = false;

  onSubmit(): void {
    if (this.form.invalid) return;

    this.errorMessage = null;
    this.isSubmitting = true;
    const { name, description } = this.form.getRawValue();

    this.rolesService.createRole({ name, description: description || undefined }).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.router.navigateByUrl('/roles');
      },
      error: (error: HttpErrorResponse) => {
        this.isSubmitting = false;
        this.errorMessage =
          error.status === 409
            ? 'Ya existe un rol con ese nombre.'
            : 'No se pudo crear el rol. Intentá de nuevo.';
      },
    });
  }
}
