import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { AutofocusDirective } from '../../../../shared/directives/autofocus.directive';
import { ADMIN_MATERIAL } from '../../material/admin-material';
import { CreateUsuarioDto, PASSWORD_HINT, PASSWORD_PATTERN, RolResumen, UpdateUsuarioDto, Usuario } from '../../models/admin.model';

export interface UsuarioFormData {
  usuario: Usuario | null;
  roles: RolResumen[];
  /** El usuario de la sesión no puede cambiar su propio rol ni desactivarse. */
  esPropio: boolean;
}

export type UsuarioFormResult = { tipo: 'crear'; dto: CreateUsuarioDto } | { tipo: 'editar'; dto: UpdateUsuarioDto };

/** Crea o edita un usuario. El correo no se cambia: es el usuario de inicio de sesión. */
@Component({
  selector: 'app-usuario-form-dialog',
  imports: [ReactiveFormsModule, AutofocusDirective, ...ADMIN_MATERIAL],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2 mat-dialog-title>{{ data.usuario ? 'Editar usuario' : 'Nuevo usuario' }}</h2>
    <form [formGroup]="form" (ngSubmit)="submit()">
      <mat-dialog-content class="fields">
        <mat-form-field appearance="outline">
          <mat-label>Nombre</mat-label>
          <input matInput formControlName="nombre" appAutofocus />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Correo</mat-label>
          <input matInput formControlName="email" type="email" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Rol</mat-label>
          <mat-select formControlName="rolId">
            @for (rol of data.roles; track rol.id) {
              <mat-option [value]="rol.id">{{ rol.nombre }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
        @if (!data.usuario) {
          <mat-form-field appearance="outline">
            <mat-label>Contraseña inicial</mat-label>
            <input matInput formControlName="password" type="password" autocomplete="new-password" />
            <mat-hint>{{ passwordHint }}</mat-hint>
          </mat-form-field>
        } @else {
          <mat-slide-toggle formControlName="activo">Activo</mat-slide-toggle>
        }
        @if (data.esPropio) {
          <p class="note">No puedes cambiar tu propio rol ni desactivarte.</p>
        }
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button type="button" mat-dialog-close>Cancelar</button>
        <button mat-flat-button type="submit">Guardar</button>
      </mat-dialog-actions>
    </form>
  `,
  styles: `
    .fields { display: flex; flex-direction: column; gap: 4px; min-width: min(420px, 80vw); }
    .note { font-size: 12px; opacity: 0.7; margin: 8px 0 0; }
  `,
})
export class UsuarioFormDialogComponent {
  protected readonly data = inject<UsuarioFormData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject<MatDialogRef<UsuarioFormDialogComponent, UsuarioFormResult>>(MatDialogRef);
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly passwordHint = PASSWORD_HINT;

  protected readonly form = this.fb.group({
    nombre: [this.data.usuario?.nombre ?? '', [Validators.required, Validators.maxLength(150)]],
    email: [{ value: this.data.usuario?.email ?? '', disabled: !!this.data.usuario }, [Validators.required, Validators.email, Validators.maxLength(200)]],
    rolId: [{ value: this.data.usuario?.rolId ?? '', disabled: this.data.esPropio }, Validators.required],
    password: ['', this.data.usuario ? [] : [Validators.required, Validators.pattern(PASSWORD_PATTERN)]],
    activo: [{ value: this.data.usuario?.activo ?? true, disabled: this.data.esPropio }],
  });

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    this.dialogRef.close(
      this.data.usuario
        ? { tipo: 'editar', dto: { nombre: v.nombre.trim(), rolId: v.rolId, activo: v.activo } }
        : { tipo: 'crear', dto: { nombre: v.nombre.trim(), email: v.email.trim(), rolId: v.rolId, password: v.password } },
    );
  }
}
