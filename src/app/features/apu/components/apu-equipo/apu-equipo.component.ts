import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormArray, ReactiveFormsModule } from '@angular/forms';

import { APU_MATERIAL } from '../../material/apu-material';
import { totalEquipo } from '../../models/apu.calc';
import { EquipoForm } from '../../models/apu.form';
import { APU_CURRENCY, InsumoCatalogo, TIPO_EQUIPO, UnidadMedida } from '../../models/apu.model';
import { InsumoAutocompleteComponent } from '../insumo-autocomplete/insumo-autocomplete.component';

/** Sección EQUIPO: incidencia × precio unitario. */
@Component({
  selector: 'app-apu-equipo',
  imports: [CurrencyPipe, ReactiveFormsModule, InsumoAutocompleteComponent, ...APU_MATERIAL],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="head">
      <h3>Equipo</h3>
      @if (!soloLectura()) {
        <button mat-stroked-button type="button" (click)="agregar.emit()"><mat-icon>add</mat-icon>Agregar equipo</button>
      }
    </div>
    @for (row of lineas().controls; track row; let i = $index) {
      <div class="row" [formGroup]="row">
        <app-insumo-autocomplete
          class="wide"
          label="Descripción del equipo"
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
          <mat-label>Incidencia</mat-label>
          <input matInput type="number" formControlName="incidencia" min="0" step="any" />
          @if (row.controls.incidencia.invalid) {
            <mat-error>Mayor que 0</mat-error>
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
          <button mat-icon-button type="button" class="remove" (click)="quitar.emit(i)" matTooltip="Quitar equipo" aria-label="Quitar equipo">
            <mat-icon>delete</mat-icon>
          </button>
        }
      </div>
    } @empty {
      <p class="empty">Sin equipo.</p>
    }
    <div class="foot">
      <span>Subtotal equipo</span>
      <span>{{ subtotal() | currency: moneda : 'symbol-narrow' : '1.0-2' }}</span>
    </div>
  `,
  styleUrl: '../apu-seccion.styles.scss',
  host: { style: '--apu-cols: minmax(220px, 3fr) 120px 1fr 1.4fr 1.2fr 40px' },
})
export class ApuEquipoComponent {
  readonly lineas = input.required<FormArray<EquipoForm>>();
  readonly unidades = input.required<readonly UnidadMedida[]>();
  readonly subtotal = input.required<number>();
  readonly soloLectura = input(false);
  readonly agregar = output<void>();
  readonly quitar = output<number>();

  protected readonly tipo = TIPO_EQUIPO;
  protected readonly moneda = APU_CURRENCY;

  protected total(row: EquipoForm): number {
    return totalEquipo(row.getRawValue());
  }

  /** Al elegir un equipo del catálogo se proponen su unidad y su tarifa vigente. */
  protected elegir(row: EquipoForm, insumo: InsumoCatalogo): void {
    row.patchValue({ unidadMedidaId: insumo.unidadMedidaId, ...(insumo.precio ? { precioUnitario: insumo.precio.valorUnitario } : {}) });
  }
}
