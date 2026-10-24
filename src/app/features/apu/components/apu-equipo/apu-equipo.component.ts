import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormArray, ReactiveFormsModule } from '@angular/forms';
import { MatSelectChange } from '@angular/material/select';

import { APU_MATERIAL } from '../../material/apu-material';
import { totalEquipo } from '../../models/apu.calc';
import { EquipoForm } from '../../models/apu.form';
import { APU_CURRENCY, EquipoCatalogo, UNIDADES } from '../../models/apu.model';

/** Sección EQUIPO: incidencia × precio unitario. */
@Component({
  selector: 'app-apu-equipo',
  imports: [CurrencyPipe, ReactiveFormsModule, ...APU_MATERIAL],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="head">
      <h3>Equipo</h3>
      <button mat-stroked-button type="button" (click)="agregar.emit()"><mat-icon>add</mat-icon>Agregar equipo</button>
    </div>
    @for (row of lineas().controls; track row; let i = $index) {
      <div class="row" [formGroup]="row">
        <mat-form-field appearance="outline" class="wide">
          <mat-label>Descripción del equipo</mat-label>
          <mat-select formControlName="insumoId" (selectionChange)="elegir(row, $event)">
            @for (m of catalogo(); track m.id) {
              <mat-option [value]="m.id">{{ m.descripcion }}</mat-option>
            }
          </mat-select>
          @if (row.controls.insumoId.hasError('required')) {
            <mat-error>Elige un equipo</mat-error>
          }
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Unidad</mat-label>
          <mat-select formControlName="unidad">
            @for (u of unidades; track u) {
              <mat-option [value]="u">{{ u }}</mat-option>
            }
          </mat-select>
          @if (row.controls.unidad.hasError('required')) {
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
        <button mat-icon-button type="button" class="remove" (click)="quitar.emit(i)" matTooltip="Quitar equipo" aria-label="Quitar equipo">
          <mat-icon>delete</mat-icon>
        </button>
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
  readonly catalogo = input.required<readonly EquipoCatalogo[]>();
  readonly subtotal = input.required<number>();
  readonly agregar = output<void>();
  readonly quitar = output<number>();

  protected readonly unidades = UNIDADES;
  protected readonly moneda = APU_CURRENCY;

  protected total(row: EquipoForm): number {
    return totalEquipo(row.getRawValue());
  }

  /** Al elegir un equipo del catálogo se proponen su unidad y su precio. */
  protected elegir(row: EquipoForm, e: MatSelectChange): void {
    const m = this.catalogo().find((x) => x.id === e.value);
    if (m) row.patchValue({ descripcion: m.descripcion, unidad: m.unidad, precioUnitario: m.precio });
  }
}
