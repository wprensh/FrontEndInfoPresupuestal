import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { MANTENIMIENTO_MATERIAL } from '../../material/mantenimiento-material';
import { Clasificacion, CreateInsumoDto, Insumo, TipoInsumo, UnidadMedida, UpdateInsumoDto } from '../../models/mantenimiento.model';

export interface InsumoFormData {
  insumo: Insumo | null;
  tipos: TipoInsumo[];
  unidades: UnidadMedida[];
  clasificaciones: Clasificacion[];
}

export type InsumoFormResult = { tipo: 'crear'; dto: CreateInsumoDto } | { tipo: 'editar'; dto: UpdateInsumoDto };

/** Alta o edición de un insumo. El tipo no cambia después de creado porque arma el código. */
@Component({
  selector: 'app-insumo-form-dialog',
  imports: [ReactiveFormsModule, ...MANTENIMIENTO_MATERIAL],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2 mat-dialog-title>{{ data.insumo ? 'Editar insumo ' + data.insumo.codigo : 'Nuevo insumo' }}</h2>
    <form [formGroup]="form" (ngSubmit)="submit()">
      <mat-dialog-content class="grid">
        <mat-form-field appearance="outline" class="wide">
          <mat-label>Descripción</mat-label>
          <input matInput formControlName="descripcion" maxlength="200" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Tipo</mat-label>
          <mat-select formControlName="tipoInsumoId">
            @for (t of data.tipos; track t.id) {
              <mat-option [value]="t.id">{{ t.nombre }} ({{ t.prefijo }})</mat-option>
            }
          </mat-select>
          @if (!data.insumo) {
            <mat-hint>El código se asigna solo</mat-hint>
          }
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Unidad</mat-label>
          <mat-select formControlName="unidadMedidaId">
            @for (u of data.unidades; track u.id) {
              <mat-option [value]="u.id">{{ u.codigo }} · {{ u.nombre }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline" class="wide">
          <mat-label>Clasificación</mat-label>
          <mat-select formControlName="clasificacionId">
            <mat-option [value]="null">Sin clasificación</mat-option>
            @for (c of data.clasificaciones; track c.id) {
              <mat-option [value]="c.id">{{ c.nombre }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
        @if (data.insumo) {
          <mat-slide-toggle formControlName="activo">Activo</mat-slide-toggle>
        }
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button type="button" mat-dialog-close>Cancelar</button>
        <button mat-flat-button type="submit">Guardar</button>
      </mat-dialog-actions>
    </form>
  `,
  styles: `
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 12px; min-width: min(560px, 85vw); }
    .wide { grid-column: 1 / -1; }
    @media (max-width: 600px) { .grid { grid-template-columns: 1fr; } }
  `,
})
export class InsumoFormDialogComponent {
  protected readonly data = inject<InsumoFormData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject<MatDialogRef<InsumoFormDialogComponent, InsumoFormResult>>(MatDialogRef);
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly form = this.fb.group({
    descripcion: [this.data.insumo?.descripcion ?? '', [Validators.required, Validators.maxLength(200), Validators.pattern(/\S/)]],
    tipoInsumoId: [{ value: this.data.insumo?.tipoInsumoId ?? this.data.tipos[0]?.id ?? 0, disabled: !!this.data.insumo }, Validators.min(1)],
    unidadMedidaId: [this.data.insumo?.unidadMedidaId ?? 0, Validators.min(1)],
    clasificacionId: this.fb.control<number | null>(this.data.insumo?.clasificacionId ?? null),
    activo: [this.data.insumo?.activo ?? true],
  });

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const descripcion = v.descripcion.trim().replace(/\s+/g, ' ');
    this.dialogRef.close(
      this.data.insumo
        ? { tipo: 'editar', dto: { descripcion, unidadMedidaId: v.unidadMedidaId, clasificacionId: v.clasificacionId, activo: v.activo } }
        : { tipo: 'crear', dto: { descripcion, tipoInsumoId: v.tipoInsumoId, unidadMedidaId: v.unidadMedidaId, clasificacionId: v.clasificacionId } },
    );
  }
}
