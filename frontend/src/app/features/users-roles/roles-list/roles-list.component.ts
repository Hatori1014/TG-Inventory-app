import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { RolesService } from '../roles.service';
import { Role } from '../../../shared/models/role.model';

// HU-02 — lists roles created so far, with a link to create a new one and
// to manage each role's assigned permissions.
@Component({
  selector: 'app-roles-list',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './roles-list.component.html',
})
export class RolesListComponent {
  private rolesService = inject(RolesService);

  roles = signal<Role[]>([]);
  loading = signal(true);

  constructor() {
    this.rolesService.listRoles().subscribe({
      next: (response) => {
        this.roles.set(response.items);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
