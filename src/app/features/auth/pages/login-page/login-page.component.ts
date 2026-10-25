import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Router } from '@angular/router';

import { AuthService } from '../../../../core/auth/auth.service';
import { environment } from '../../../../../environments/environment';
import { BrandLogoComponent } from '../../../../shared/ui/brand-logo/brand-logo.component';

/** Inicio de sesión con empresa + correo + contraseña. */
@Component({
  selector: 'app-login-page',
  imports: [ReactiveFormsModule, MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule, MatProgressBarModule, BrandLogoComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main>
      <form [formGroup]="form" (ngSubmit)="submit()" class="card">
        <app-brand-logo />
        <h1>Iniciar sesión</h1>
        @if (loading()) {
          <mat-progress-bar mode="indeterminate" />
        }
        <mat-form-field appearance="outline">
          <mat-label>Empresa</mat-label>
          <mat-icon matPrefix>apartment</mat-icon>
          <input matInput formControlName="empresa" autocomplete="organization" />
          <mat-hint>Identificador de tu empresa, por ejemplo demo</mat-hint>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Correo</mat-label>
          <mat-icon matPrefix>mail</mat-icon>
          <input matInput formControlName="email" type="email" autocomplete="username" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Contraseña</mat-label>
          <mat-icon matPrefix>lock</mat-icon>
          <input matInput formControlName="password" [type]="showPassword() ? 'text' : 'password'" autocomplete="current-password" />
          <button mat-icon-button matSuffix type="button" (click)="showPassword.set(!showPassword())" [attr.aria-label]="showPassword() ? 'Ocultar contraseña' : 'Mostrar contraseña'">
            <mat-icon>{{ showPassword() ? 'visibility_off' : 'visibility' }}</mat-icon>
          </button>
        </mat-form-field>
        @if (error(); as message) {
          <p class="error" role="alert">{{ message }}</p>
        }
        <button mat-flat-button type="submit" [disabled]="loading()">Entrar</button>
        @if (demo) {
          <p class="hint">
            Demo: empresa <b>demo</b>, <b>admin&#64;demo.local</b> / <b>Admin123*</b> (administrador),
            <b>consulta&#64;demo.local</b> / <b>Consulta123</b> (solo lectura) o
            <b>proveedor&#64;demo.local</b> / <b>Proveedor123</b> (proveedor). Superadministrador: empresa <b>sistema</b>,
            <b>superadmin&#64;infopresupuestal.local</b> / <b>Admin123*</b>.
          </p>
        }
      </form>
    </main>
  `,
  styles: `
    main { min-height: 100vh; display: grid; place-items: center; padding: 16px; box-sizing: border-box; background: var(--mat-sys-surface-container-low); }
    .card { width: min(400px, 100%); display: flex; flex-direction: column; gap: 8px; padding: 32px; border-radius: 16px; background: var(--mat-sys-surface); box-shadow: var(--mat-sys-level2); box-sizing: border-box; }
    h1 { margin: 16px 0 8px; font-size: 1.5rem; font-weight: 500; }
    .error { color: var(--mat-sys-error); margin: 0; }
    .hint { font-size: 12px; opacity: 0.75; margin: 8px 0 0; line-height: 1.5; }
  `,
})
export class LoginPageComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly demo = environment.useMockBackend;
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly showPassword = signal(false);

  protected readonly form = this.fb.group({
    empresa: [this.demo ? 'demo' : '', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  protected async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    try {
      const { empresa, email, password } = this.form.getRawValue();
      await this.auth.login({ empresa: empresa.trim().toLowerCase(), email: email.trim(), password });
      await this.router.navigateByUrl('/');
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'No se pudo iniciar sesión');
    } finally {
      this.loading.set(false);
    }
  }
}
