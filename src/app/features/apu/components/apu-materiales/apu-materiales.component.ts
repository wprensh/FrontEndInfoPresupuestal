import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormArray, ReactiveFormsModule } from '@angular/forms';

import { APU_MATERIAL } from '../../material/apu-material';
import { totalMaterial } from '../../models/apu.calc';
import { MaterialForm } from '../../models/apu.form';
import { APU_CURRENCY, InsumoCatalogo, TIPO_MATERIAL, UnidadMedida } from '../../models/apu.model';
import { InsumoAutocompleteComponent } from '../insumo-autocomplete/insumo-autocomplete.component';

/** Sección MATERIALES: cantidad × precio unitario más el porcentaje de desperdicio. */
@Component({
  selector: 'app-apu-materiales',
  imports: [CurrencyPipe, ReactiveFormsModule, InsumoAutocompleteComponent, ...APU_MATERIAL],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="head">
      <h3>Materiales</h3>
      @if (!soloLectura()) {
        <button mat-stroked-button type="button" (click)="agregar.emit()"><mat-icon>add</mat-icon>Agregar material</button>
      }
    </div>
    @for (row of lineas().controls; track row; let i = $index) {
      <div class="row" [formGroup]="row">
        <app-insumo-autocomplete
          class="wide"
          label="Descripción del material"
          [tipoInsumoId]="tipo"
          [descripcion]="row.controls.descripcion"
          [insumoId]="row.controls.insumoId"
          (elegido)="elegir(row, $event)"
        />
        <mat-form-field appearance="outline">
          <mat-label>Unidad</mat-label>
          <mat-select formControlName="unidadMedidaId">
            @for (u of unidades(); track u.id) {
              <mat-option [value]="u.id">{{ u.codigo }}</mat-option>
            }
          </mat-select>
          @if (row.controls.unidadMedidaId.hasError('required')) {
            <mat-error>Requerida</mat-error>
          }
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Cantidad</mat-label>
          <input matInput type="number" formControlName="cantidad" min="0" step="any" />
          @if (row.controls.cantidad.invalid) {
            <mat-error>Mayor que 0</mat-error>
          }
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Desperdicio</mat-label>
          <input matInput type="number" formControlName="desperdicio" min="0" max="100" step="any" />
          <span matTextSuffix>%</span>
          @if (row.controls.desperdicio.invalid) {
            <mat-error>Entre 0 y 100</mat-error>
          }
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Precio unitario</mat-label>
          <span matTextPrefix>$&nbsp;</span>
          <input matInput type="number" formControlName="precioUnitario" min="0" step="any" />
          @if (row.controls.precioUnitario.invalid) {
            <mat-error>No puede ser negativo</mat-error>
          }
        </mat-form-field>
        <div class="total">
          <small>Total</small>
          <strong>{{ total(row) | currency: moneda : 'symbol-narrow' : '1.0-2' }}</strong>
        </div>
        @if (!soloLectura()) {
          <button mat-icon-button type="button" class="remove" (click)="quitar.emit(i)" matTooltip="Quitar material" aria-label="Quitar material">
            <mat-icon>delete</mat-icon>
          </button>
        }
      </div>
    } @empty {
      <p class="empty">Sin materiales.</p>
    }
    <div class="foot">
      <span>Subtotal materiales</span>
      <span>{{ subtotal() | currency: moneda : 'symbol-narrow' : '1.0-2' }}</span>
    </div>
  `,
  styleUrl: '../apu-seccion.styles.scss',
  host: { style: '--apu-cols: minmax(220px, 3fr) 120px 1fr 1fr 1.4fr 1.2fr 40px' },
})
export class ApuMaterialesComponent {
  readonly lineas = input.required<FormArray<MaterialForm>>();
  readonly unidades = input.required<readonly UnidadMedida[]>();
  readonly subtotal = input.required<number>();
  readonly soloLectura = input(false);
  readonly agregar = output<void>();
  readonly quitar = output<number>();

  protected readonly tipo = TIPO_MATERIAL;
  protected readonly moneda = APU_CURRENCY;

  protected total(row: MaterialForm): number {
    return totalMaterial(row.getRawValue());
  }

  /** Al elegir un material del catálogo se proponen su unidad y su precio vigente. */
  protected elegir(row: MaterialForm, insumo: InsumoCatalogo): void {
    row.patchValue({ unidadMedidaId: insumo.unidadMedidaId, ...(insumo.precio ? { precioUnitario: insumo.precio.valorUnitario } : {}) });
  }
}
