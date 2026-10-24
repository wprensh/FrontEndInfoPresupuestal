import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { AutofocusDirective } from '../../../../shared/directives/autofocus.directive';
import { ADMIN_MATERIAL } from '../../material/admin-material';
import { PASSWORD_HINT, PASSWORD_PATTERN } from '../../models/admin.model';

/** Asigna una contraseña nueva. Devuelve la contraseña al confirmar. */
@Component({
  selector: 'app-password-dialog',
  imports: [ReactiveFormsModule, AutofocusDirective, ...ADMIN_MATERIAL],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2 mat-dialog-title>Cambiar contraseña</h2>
    <form [formGroup]="form" (ngSubmit)="submit()">
      <mat-dialog-content>
        <p>Usuario: <b>{{ nombre }}</b></p>
        <mat-form-field appearance="outline" class="full">
          <mat-label>Contraseña nueva</mat-label>
          <input matInput formControlName="password" type="password" autocomplete="new-password" appAutofocus />
          <mat-hint>{{ hint }}</mat-hint>
        </mat-form-field>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button type="button" mat-dialog-close>Cancelar</button>
        <button mat-flat-button type="submit">Cambiar</button>
      </mat-dialog-actions>
    </form>
  `,
  styles: `.full { width: min(380px, 75vw); }`,
})
export class PasswordDialogComponent {
  protected readonly nombre = inject<string>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject<MatDialogRef<PasswordDialogComponent, string>>(MatDialogRef);
  protected readonly hint = PASSWORD_HINT;
  protected readonly form = inject(NonNullableFormBuilder).group({
    password: ['', [Validators.required, Validators.pattern(PASSWORD_PATTERN)]],
  });

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.dialogRef.close(this.form.getRawValue().password);
  }
}
