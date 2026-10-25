import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { AutofocusDirective } from '../../../../shared/directives/autofocus.directive';
import { TipoInsumo, UnidadMedida } from '../../../mantenimiento/models/mantenimiento.model';
import { PROVEEDORES_MATERIAL } from '../../material/proveedores-material';
import { ProductoProveedor, ProductoProveedorDto } from '../../models/proveedores.model';

export interface ProductoFormData {
  producto: ProductoProveedor | null;
  tipos: TipoInsumo[];
  unidades: UnidadMedida[];
}

const opt = (s: string): string | null => s.trim().replace(/\s+/g, ' ') || null;

/** Alta o edición de un producto del catálogo propio. El código (SKU) lo pone el proveedor. */
@Component({
  selector: 'app-producto-form-dialog',
  imports: [ReactiveFormsModule, AutofocusDirective, ...PROVEEDORES_MATERIAL],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2 mat-dialog-title>{{ data.producto ? 'Editar producto ' + data.producto.codigo : 'Nuevo producto' }}</h2>
    <form [formGroup]="form" (ngSubmit)="submit()">
      <mat-dialog-content class="grid">
        <mat-form-field appearance="outline">
          <mat-label>Código</mat-label>
          <input matInput formControlName="codigo" maxlength="40" appAutofocus />
          <mat-hint>Tu referencia o SKU</mat-hint>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Marca</mat-label>
          <input matInput formControlName="marca" maxlength="80" />
        </mat-form-field>
        <mat-form-field appearance="outline" class="wide">
          <mat-label>Descripción</mat-label>
          <input matInput formControlName="descripcion" maxlength="200" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Tipo</mat-label>
          <mat-select formControlName="tipoInsumoId">
            @for (t of data.tipos; track t.id) {
              <mat-option [value]="t.id">{{ t.nombre }}</mat-option>
            }
          </mat-select>
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
          <mat-label>Categoría</mat-label>
          <input matInput formControlName="categoria" maxlength="80" />
          <mat-hint>Por ejemplo Cementos, Aceros, Eléctricos</mat-hint>
        </mat-form-field>
        @if (data.producto) {
          <mat-slide-toggle formControlName="activo">Activo (visible para las constructoras)</mat-slide-toggle>
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
export class ProductoFormDialogComponent {
  protected readonly data = inject<ProductoFormData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject<MatDialogRef<ProductoFormDialogComponent, ProductoProveedorDto>>(MatDialogRef);
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly form = this.fb.group({
    codigo: [this.data.producto?.codigo ?? '', [Validators.required, Validators.maxLength(40), Validators.pattern(/\S/)]],
    descripcion: [this.data.producto?.descripcion ?? '', [Validators.required, Validators.maxLength(200), Validators.pattern(/\S/)]],
    tipoInsumoId: [this.data.producto?.tipoInsumoId ?? this.data.tipos[0]?.id ?? 0, Validators.min(1)],
    unidadMedidaId: [this.data.producto?.unidadMedidaId ?? 0, Validators.min(1)],
    marca: [this.data.producto?.marca ?? ''],
    categoria: [this.data.producto?.categoria ?? ''],
    activo: [this.data.producto?.activo ?? true],
  });

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    this.dialogRef.close({
      codigo: v.codigo.trim().toUpperCase(),
      descripcion: v.descripcion.trim().replace(/\s+/g, ' '),
      tipoInsumoId: v.tipoInsumoId,
      unidadMedidaId: v.unidadMedidaId,
      marca: opt(v.marca),
      categoria: opt(v.categoria),
      activo: v.activo,
    });
  }
}
