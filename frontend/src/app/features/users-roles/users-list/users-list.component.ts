import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { UsersService } from '../users.service';
import { UserAccount } from '../../../shared/models/user-account.model';

// HU-03 — lists users created so far, with a link to create a new one and
// to edit each user's role.
@Component({
  selector: 'app-users-list',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './users-list.component.html',
})
export class UsersListComponent {
  private usersService = inject(UsersService);

  users = signal<UserAccount[]>([]);
  loading = signal(true);

  constructor() {
    this.usersService.listUsers().subscribe({
      next: (response) => {
        this.users.set(response.items);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
