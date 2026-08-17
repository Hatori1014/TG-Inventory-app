import { Component, inject } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../../core/services/auth.service';

// HU-01 — functional login. Password policy (HU-19) and lockout on failed
// attempts (HU-20) are separate stories, not enforced here.
// Note: on-screen text stays in Spanish — that's the app's UI language
// for its Spanish-speaking end users. English applies to code, not UI copy.
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  private fb = new FormBuilder();
  private authService = inject(AuthService);
  private router = inject(Router);

  form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  errorMessage: string | null = null;
  isSubmitting = false;

  onSubmit(): void {
    if (this.form.invalid) return;

    this.errorMessage = null;
    this.isSubmitting = true;
    const { email, password } = this.form.getRawValue();

    this.authService.login(email, password).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.router.navigateByUrl('/dashboard');
      },
      error: (error: HttpErrorResponse) => {
        this.isSubmitting = false;
        // Fixed Spanish copy regardless of what the backend sends — the UI
        // never surfaces the server's own error text (convenciones.md, "UI en español").
        this.errorMessage =
          error.status === 401
            ? 'Usuario o contraseña incorrectos.'
            : 'No se pudo iniciar sesión. Intentá de nuevo.';
      },
    });
  }
}
