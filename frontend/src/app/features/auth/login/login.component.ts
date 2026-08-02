import { Component } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';

// HU-01 — functional login with password policy (HU-19) and lockout on
// failed attempts (HU-20) enforced by the backend. This component is the
// Iteration 1 skeleton; still needs to connect to the real AuthService.
// Note: on-screen text stays in Spanish — that's the app's UI language
// for its Spanish-speaking end users. English applies to code, not UI copy.
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  private fb = new FormBuilder();

  form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  onSubmit(): void {
    if (this.form.invalid) return;
    // [PENDING: call AuthService.login() — Iteration 1]
  }
}
