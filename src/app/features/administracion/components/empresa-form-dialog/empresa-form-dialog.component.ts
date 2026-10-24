import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { AutofocusDirective } from '../../../../shared/directives/autofocus.directive';
import { ADMIN_MATERIAL } from '../../material/admin-material';
import { CreateEmpresaDto, Empresa, PASSWORD_HINT, PASSWORD_PATTERN, UpdateEmpresaDto } from '../../models/admin.model';

export type EmpresaFormResult = { tipo: 'crear'; dto: CreateEmpresaDto } | { tipo: 'editar'; dto: UpdateEmpresaDto };

const TENANT_PATTERN = /^[a-z0-9][a-z0-9-]{0,62}$/;

/** Alta de empresa (con su primer administrador) o edición de sus datos. */
@Component({
  selector: 'app-empresa-form-dialog',
  imports: [ReactiveFormsModule, AutofocusDirective, ...ADMIN_MATERIAL],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2 mat-dialog-title>{{ empresa ? 'Editar empresa' : 'Nueva empresa' }}</h2>
    <form [formGroup]="form" (ngSubmit)="submit()">
      <mat-dialog-content class="grid">
        <mat-form-field appearance="outline">
          <mat-label>Identificador</mat-label>
          <input matInput formControlName="tenantId" />
          <mat-hint>Minúsculas, números y guiones. Con él inician sesión; no cambia.</mat-hint>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Razón social</mat-label>
          <input matInput formControlName="razonSocial" appAutofocus />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>NIT</mat-label>
          <input matInput formControlName="nit" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Teléfono</mat-label>
          <input matInput formControlName="telefono" />
        </mat-form-field>
        <mat-form-field appearance="outline" class="wide">
          <mat-label>Correo de contacto</mat-label>
          <input matInput formControlName="email" type="email" />
        </mat-form-field>
        @if (empresa) {
          <mat-slide-toggle formControlName="activo" [disabled]="empresa.tenantId === 'sistema'">Activa</mat-slide-toggle>
        } @else {
          <h3 class="wide">Primer administrador</h3>
          <mat-form-field appearance="outline">
            <mat-label>Nombre</mat-label>
            <input matInput formControlName="adminNombre" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Correo</mat-label>
            <input matInput formControlName="adminEmail" type="email" />
          </mat-form-field>
          <mat-form-field appearance="outline" class="wide">
            <mat-label>Contraseña inicial</mat-label>
            <input matInput formControlName="adminPassword" type="password" autocomplete="new-password" />
            <mat-hint>{{ passwordHint }}</mat-hint>
          </mat-form-field>
        }
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button type="button" mat-dialog-close>Cancelar</button>
        <button mat-flat-button type="submit">Guardar</button>
      </mat-dialog-actions>
    </form>
  `,
  styles: `
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 12px; }
    .wide { grid-column: 1 / -1; }
    h3 { margin: 8px 0 0; font-size: 14px; font-weight: 500; }
    @media (max-width: 600px) { .grid { grid-template-columns: 1fr; } }
  `,
})
export class EmpresaFormDialogComponent {
  protected readonly empresa = inject<Empresa | null>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject<MatDialogRef<EmpresaFormDialogComponent, EmpresaFormResult>>(MatDialogRef);
  protected readonly passwordHint = PASSWORD_HINT;

  private readonly creating = !this.empresa;

  protected readonly form = inject(NonNullableFormBuilder).group({
    tenantId: [{ value: this.empresa?.tenantId ?? '', disabled: !this.creating }, this.creating ? [Validators.required, Validators.pattern(TENANT_PATTERN)] : []],
    razonSocial: [this.empresa?.razonSocial ?? '', [Validators.required, Validators.maxLength(200)]],
    nit: [this.empresa?.nit ?? '', Validators.maxLength(20)],
    email: [this.empresa?.email ?? '', [Validators.email, Validators.maxLength(200)]],
    telefono: [this.empresa?.telefono ?? '', Validators.maxLength(30)],
    activo: [this.empresa?.activo ?? true],
    adminNombre: ['', this.creating ? [Validators.required, Validators.maxLength(150)] : []],
    adminEmail: ['', this.creating ? [Validators.required, Validators.email] : []],
    adminPassword: ['', this.creating ? [Validators.required, Validators.pattern(PASSWORD_PATTERN)] : []],
  });

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const opt = (s: string) => s.trim() || null;
    const datos = { razonSocial: v.razonSocial.trim(), nit: opt(v.nit), email: opt(v.email), telefono: opt(v.telefono) };
    this.dialogRef.close(
      this.creating
        ? { tipo: 'crear', dto: { ...datos, tenantId: v.tenantId.trim(), adminNombre: v.adminNombre.trim(), adminEmail: v.adminEmail.trim(), adminPassword: v.adminPassword } }
        : { tipo: 'editar', dto: { ...datos, activo: v.activo } },
    );
  }
}
