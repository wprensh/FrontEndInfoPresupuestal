import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { fechaIso, fechaLocal } from '../../../../shared/utils/fecha.utils';
import { PROGRAMACION_MATERIAL } from '../../material/programacion-material';
import { GenerarProgramacionDto } from '../../models/programacion.model';

export interface GenerarDialogData {
  fechaInicio: string;
  duracionDias: number | null;
  reemplaza: boolean;
}

/** Fecha de inicio y plazo con que se arma la programación desde los capítulos e ítems. */
@Component({
  selector: 'app-generar-dialog',
  imports: [ReactiveFormsModule, ...PROGRAMACION_MATERIAL],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2 mat-dialog-title>Generar desde el presupuesto</h2>
    <form [formGroup]="form" (ngSubmit)="aceptar()">
      <mat-dialog-content>
        <p class="ayuda">
          Cada capítulo será un resumen con sus ítems como actividades. El plazo se reparte según el valor de cada capítulo,
          los capítulos quedan encadenados (fin a comienzo) y al final se agrega el hito de entrega.
        </p>
        @if (data.reemplaza) {
          <p class="aviso">Se reemplazará la programación actual, con su avance y sus dependencias.</p>
        }
        <div class="campos">
          <mat-form-field appearance="outline">
            <mat-label>Fecha de inicio</mat-label>
            <input matInput [matDatepicker]="picker" formControlName="fechaInicio" />
            <mat-datepicker-toggle matIconSuffix [for]="picker" />
            <mat-datepicker #picker />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Plazo de la obra</mat-label>
            <input matInput type="number" min="1" max="3650" formControlName="duracionDias" />
            <span matTextSuffix>días</span>
            @if (form.controls.duracionDias.invalid) {
              <mat-error>Entre 1 y 3650 días</mat-error>
            }
          </mat-form-field>
        </div>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button type="button" mat-dialog-close>Cancelar</button>
        <button mat-flat-button type="submit" [disabled]="form.invalid"><mat-icon>auto_fix_high</mat-icon>Generar</button>
      </mat-dialog-actions>
    </form>
  `,
  styles: `
    .ayuda { margin-top: 0; font-size: 13px; color: var(--mat-sys-on-surface-variant); max-width: 460px; }
    .aviso { color: var(--mat-sys-error); font-size: 13px; }
    .campos { display: grid; grid-template-columns: 1fr 1fr; gap: 0 12px; }
  `,
})
export class GenerarDialogComponent {
  protected readonly data = inject<GenerarDialogData>(MAT_DIALOG_DATA);
  private readonly ref = inject(MatDialogRef<GenerarDialogComponent, GenerarProgramacionDto>);

  protected readonly form = inject(NonNullableFormBuilder).group({
    fechaInicio: [fechaLocal(this.data.fechaInicio), Validators.required],
    duracionDias: [this.data.duracionDias ?? 30, [Validators.required, Validators.min(1), Validators.max(3650)]],
  });

  protected aceptar(): void {
    const v = this.form.getRawValue();
    this.ref.close({ fechaInicio: fechaIso(v.fechaInicio), duracionDias: v.duracionDias, reemplazar: this.data.reemplaza });
  }
}
