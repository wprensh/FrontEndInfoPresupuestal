import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormArray, ReactiveFormsModule } from '@angular/forms';
import { MatSelectChange } from '@angular/material/select';

import { APU_MATERIAL } from '../../material/apu-material';
import { totalJornal, totalManoObra } from '../../models/apu.calc';
import { ManoObraForm } from '../../models/apu.form';
import { APU_CURRENCY, ManoObraCatalogo } from '../../models/apu.model';

/** Sección MANO DE OBRA: jornal × prestaciones, dividido entre el rendimiento diario. */
@Component({
  selector: 'app-apu-mano-obra',
  imports: [CurrencyPipe, ReactiveFormsModule, ...APU_MATERIAL],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="head">
      <h3>Mano de obra</h3>
      <button mat-stroked-button type="button" (click)="agregar.emit()"><mat-icon>add</mat-icon>Agregar mano de obra</button>
    </div>
    @for (row of lineas().controls; track row; let i = $index) {
      <div class="row" [formGroup]="row">
        <mat-form-field appearance="outline" class="wide">
          <mat-label>Descripción de la mano de obra</mat-label>
          <mat-select formControlName="insumoId" (selectionChange)="elegir(row, $event)">
            @for (m of catalogo(); track m.id) {
              <mat-option [value]="m.id">{{ m.descripcion }}</mat-option>
            }
          </mat-select>
          @if (row.controls.insumoId.hasError('required')) {
            <mat-error>Elige una cuadrilla u oficio</mat-error>
          }
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Valor jornal</mat-label>
          <span matTextPrefix>$&nbsp;</span>
          <input matInput type="number" formControlName="jornal" min="0" step="any" />
          @if (row.controls.jornal.invalid) {
            <mat-error>No puede ser negativo</mat-error>
          }
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Factor prest.</mat-label>
          <input matInput type="number" formControlName="prestaciones" min="1" max="3" step="0.01" />
          <span matTextSuffix>×</span>
          @if (row.controls.prestaciones.invalid) {
            <mat-error>Entre 1 y 3</mat-error>
          }
        </mat-form-field>
        <div class="total">
          <small>Total jornal</small>
          <span>{{ jornalTotal(row) | currency: moneda : 'symbol-narrow' : '1.0-2' }}</span>
        </div>
        <mat-form-field appearance="outline">
          <mat-label>Rendimiento por día</mat-label>
          <input matInput type="number" formControlName="rendimiento" min="0" step="any" />
          @if (row.controls.rendimiento.invalid) {
            <mat-error>Mayor que 0</mat-error>
          }
        </mat-form-field>
        <div class="total">
          <small>Total</small>
          <strong>{{ total(row) | currency: moneda : 'symbol-narrow' : '1.0-2' }}</strong>
        </div>
        <button mat-icon-button type="button" class="remove" (click)="quitar.emit(i)" matTooltip="Quitar mano de obra" aria-label="Quitar mano de obra">
          <mat-icon>delete</mat-icon>
        </button>
      </div>
    } @empty {
      <p class="empty">Sin mano de obra.</p>
    }
    <div class="foot">
      <span>Subtotal mano de obra</span>
      <span>{{ subtotal() | currency: moneda : 'symbol-narrow' : '1.0-2' }}</span>
    </div>
  `,
  styleUrl: '../apu-seccion.styles.scss',
  host: { style: '--apu-cols: minmax(220px, 3fr) 1.4fr 1fr 1.2fr 1fr 1.2fr 40px' },
})
export class ApuManoObraComponent {
  readonly lineas = input.required<FormArray<ManoObraForm>>();
  readonly catalogo = input.required<readonly ManoObraCatalogo[]>();
  readonly subtotal = input.required<number>();
  readonly agregar = output<void>();
  readonly quitar = output<number>();

  protected readonly moneda = APU_CURRENCY;

  protected jornalTotal(row: ManoObraForm): number {
    return totalJornal(row.getRawValue());
  }

  protected total(row: ManoObraForm): number {
    return totalManoObra(row.getRawValue());
  }

  /** Al elegir del catálogo se propone el valor del jornal. */
  protected elegir(row: ManoObraForm, e: MatSelectChange): void {
    const m = this.catalogo().find((x) => x.id === e.value);
    if (m) row.patchValue({ descripcion: m.descripcion, jornal: m.jornal });
  }
}
