import { CurrencyPipe, PercentPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';

import { PRESUPUESTOS_MATERIAL } from '../../material/presupuestos-material';
import { valorItem } from '../../models/presupuesto.calc';
import { CapituloForm, ItemForm, crearItem } from '../../models/presupuesto.form';
import { PRESUPUESTO_CURRENCY, UnidadMedida } from '../../models/presupuesto.model';
import { ApuPickerComponent } from '../apu-picker/apu-picker.component';

/**
 * Un capítulo con sus ítems. El consecutivo (1.1, 1.2...) sale de la posición, como al guardar;
 * mover o quitar un ítem renumera los demás.
 */
@Component({
  selector: 'app-capitulo-editor',
  imports: [CurrencyPipe, PercentPipe, ReactiveFormsModule, ApuPickerComponent, ...PRESUPUESTOS_MATERIAL],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="capitulo" [formGroup]="capitulo()">
      <header>
        <span class="num">{{ numero() }}</span>
        <mat-form-field appearance="outline" subscriptSizing="dynamic" class="nombre">
          <mat-label>Capítulo</mat-label>
          <input matInput formControlName="nombre" maxlength="200" placeholder="CIMENTACIÓN" />
        </mat-form-field>
        <div class="sub">
          <strong>{{ subtotal() | currency: moneda : 'symbol-narrow' : '1.0-0' }}</strong>
          <small>{{ participacion() | percent: '1.0-1' }} del costo directo</small>
        </div>
        @if (!soloLectura()) {
          <button mat-icon-button type="button" [matMenuTriggerFor]="menuCap" aria-label="Acciones del capítulo"><mat-icon>more_vert</mat-icon></button>
          <mat-menu #menuCap="matMenu">
            <button mat-menu-item type="button" (click)="subir.emit()" [disabled]="primero()"><mat-icon>arrow_upward</mat-icon>Subir capítulo</button>
            <button mat-menu-item type="button" (click)="bajar.emit()" [disabled]="ultimo()"><mat-icon>arrow_downward</mat-icon>Bajar capítulo</button>
            <button mat-menu-item type="button" (click)="quitar.emit()"><mat-icon>delete</mat-icon>Quitar capítulo</button>
          </mat-menu>
        }
      </header>
      <div class="bar" aria-hidden="true"><span [style.width.%]="participacion() * 100"></span></div>

      <div class="items" formArrayName="items">
        @if (items().length > 0) {
          <div class="row head">
            <span>Ítem</span><span>Descripción</span><span>Unidad</span><span class="num-col">Cantidad</span><span class="num-col">Vr. unitario</span><span class="num-col">Vr. total</span><span></span>
          </div>
        }
        @for (row of items(); track row; let i = $index; let last = $last) {
          <div class="row" [formGroupName]="i">
            <span class="codigo">{{ numero() }}.{{ i + 1 }}</span>
            <app-apu-picker [item]="row" />
            <mat-form-field appearance="outline" subscriptSizing="dynamic">
              <mat-select formControlName="unidadMedidaId" aria-label="Unidad">
                @for (u of unidades(); track u.id) {
                  <mat-option [value]="u.id">{{ u.codigo }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline" subscriptSizing="dynamic">
              <input matInput type="number" formControlName="cantidad" aria-label="Cantidad" min="0" step="any" class="right" />
            </mat-form-field>
            <mat-form-field appearance="outline" subscriptSizing="dynamic">
              <span matTextPrefix>$&nbsp;</span>
              <input matInput type="number" formControlName="valorUnitario" aria-label="Valor unitario" min="0" step="any" class="right" />
              @if (desactualizado(row); as actual) {
                <button mat-icon-button matSuffix type="button" class="warn" [disabled]="soloLectura()"
                  [matTooltip]="'El APU cuesta ahora ' + (actual | currency: moneda : 'symbol-narrow' : '1.0-2') + '. Clic para actualizar.'"
                  (click)="row.controls.valorUnitario.setValue(actual)">
                  <mat-icon>update</mat-icon>
                </button>
              }
            </mat-form-field>
            <span class="total">{{ total(row) | currency: moneda : 'symbol-narrow' : '1.0-2' }}</span>
            @if (!soloLectura()) {
              <button mat-icon-button type="button" [matMenuTriggerFor]="menuItem" aria-label="Acciones del ítem"><mat-icon>more_vert</mat-icon></button>
              <mat-menu #menuItem="matMenu">
                <button mat-menu-item type="button" (click)="mover(i, -1)" [disabled]="i === 0"><mat-icon>arrow_upward</mat-icon>Subir</button>
                <button mat-menu-item type="button" (click)="mover(i, 1)" [disabled]="last"><mat-icon>arrow_downward</mat-icon>Bajar</button>
                <button mat-menu-item type="button" (click)="capitulo().controls.items.removeAt(i)"><mat-icon>delete</mat-icon>Quitar ítem</button>
              </mat-menu>
            } @else {
              <span></span>
            }
          </div>
        } @empty {
          <p class="empty">Sin ítems. Agrega uno y busca un APU para traer su descripción, unidad y costo.</p>
        }
      </div>

      @if (!soloLectura()) {
        <button mat-button type="button" (click)="agregarItem()"><mat-icon>add</mat-icon>Agregar ítem</button>
      }
    </section>
  `,
  styles: `
    :host { display: block; }
    .capitulo { border: 1px solid var(--mat-sys-outline-variant); border-radius: 12px; padding: 12px 16px; background: var(--mat-sys-surface); }
    header { display: flex; align-items: center; gap: 12px; }
    .num { width: 32px; height: 32px; border-radius: 50%; display: grid; place-items: center; background: var(--mat-sys-primary-container); color: var(--mat-sys-on-primary-container); font-weight: 500; flex: none; }
    .nombre { flex: 1; min-width: 0; }
    .sub { display: flex; flex-direction: column; align-items: flex-end; font-variant-numeric: tabular-nums; }
    .sub small { opacity: 0.7; font-size: 12px; }
    .bar { height: 4px; border-radius: 2px; background: var(--mat-sys-surface-container-high); margin: 8px 0 12px; overflow: hidden; }
    .bar span { display: block; height: 100%; background: var(--mat-sys-primary); transition: width 200ms; }
    .row { display: grid; grid-template-columns: 48px minmax(200px, 3fr) 96px 1fr 1.4fr 1.2fr 40px; gap: 8px; align-items: center; padding: 4px 0; }
    .row.head { font-size: 12px; opacity: 0.65; padding-bottom: 0; }
    .num-col, .total { text-align: right; }
    .codigo { font-family: var(--ip-font-mono); font-size: 13px; opacity: 0.8; }
    .total { font-variant-numeric: tabular-nums; font-weight: 500; }
    .right { text-align: right; }
    .warn { color: var(--mat-sys-tertiary); }
    .empty { opacity: 0.7; margin: 8px 0; }
    @media (max-width: 900px) {
      .row { grid-template-columns: 40px 1fr 1fr; padding: 8px 0; border-top: 1px solid var(--mat-sys-outline-variant); }
      .row.head { display: none; }
      .row app-apu-picker { grid-column: 2 / -1; }
      .total { grid-column: 2; text-align: left; }
    }
  `,
})
export class CapituloEditorComponent {
  private readonly fb = inject(NonNullableFormBuilder);

  readonly capitulo = input.required<CapituloForm>();
  readonly numero = input.required<number>();
  readonly unidades = input.required<readonly UnidadMedida[]>();
  readonly costoDirecto = input.required<number>();
  readonly primero = input(false);
  readonly ultimo = input(false);
  readonly soloLectura = input(false);
  readonly subir = output<void>();
  readonly bajar = output<void>();
  readonly quitar = output<void>();

  protected readonly moneda = PRESUPUESTO_CURRENCY;

  protected items(): ItemForm[] {
    return this.capitulo().controls.items.controls;
  }

  protected total(row: ItemForm): number {
    return valorItem(row.controls.cantidad.value, row.controls.valorUnitario.value);
  }

  protected subtotal(): number {
    return this.items().reduce((acc, row) => acc + this.total(row), 0);
  }

  protected participacion(): number {
    const cd = this.costoDirecto();
    return cd > 0 ? this.subtotal() / cd : 0;
  }

  /** Costo actual del APU cuando ya no coincide con el valor del ítem. */
  protected desactualizado(row: ItemForm): number | null {
    const actual = row.controls.costoApuActual.value;
    return actual !== null && Math.abs(actual - row.controls.valorUnitario.value) >= 0.005 ? actual : null;
  }

  protected agregarItem(): void {
    this.capitulo().controls.items.push(crearItem(this.fb));
  }

  protected mover(i: number, delta: number): void {
    const items = this.capitulo().controls.items;
    const row = items.at(i);
    items.removeAt(i, { emitEvent: false });
    items.insert(i + delta, row);
  }
}
