import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { pesosEnLetras } from '../../../../shared/utils/numero-a-letras';
import { PRESUPUESTOS_MATERIAL } from '../../material/presupuestos-material';
import { PRESUPUESTO_CURRENCY, PresupuestoTotales } from '../../models/presupuesto.model';

/** Bloque de costos indirectos y valor total de la hoja PRESUPUESTO, con el total en letras. */
@Component({
  selector: 'app-presupuesto-resumen',
  imports: [CurrencyPipe, DecimalPipe, ...PRESUPUESTOS_MATERIAL],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <mat-card appearance="outlined">
      <mat-card-header><mat-card-title>Resumen</mat-card-title></mat-card-header>
      <mat-card-content>
        <dl>
          <dt>Costo directo</dt>
          <dd><strong>{{ t().costoDirecto | currency: moneda : 'symbol-narrow' : '1.0-2' }}</strong></dd>
          <dt>Administración <small>{{ aiu().administracion | number: '1.0-2' }} %</small></dt>
          <dd>{{ t().administracion | currency: moneda : 'symbol-narrow' : '1.0-2' }}</dd>
          <dt>Imprevistos <small>{{ aiu().imprevistos | number: '1.0-2' }} %</small></dt>
          <dd>{{ t().imprevistos | currency: moneda : 'symbol-narrow' : '1.0-2' }}</dd>
          <dt>Utilidad <small>{{ aiu().utilidad | number: '1.0-2' }} %</small></dt>
          <dd>{{ t().utilidad | currency: moneda : 'symbol-narrow' : '1.0-2' }}</dd>
          <dt class="sum">Total AIU <small>{{ aiuTotal() | number: '1.0-2' }} %</small></dt>
          <dd class="sum">{{ t().totalAiu | currency: moneda : 'symbol-narrow' : '1.0-2' }}</dd>
          <dt>IVA sobre utilidad <small>{{ aiu().ivaUtilidad | number: '1.0-2' }} %</small></dt>
          <dd>{{ t().ivaUtilidad | currency: moneda : 'symbol-narrow' : '1.0-2' }}</dd>
        </dl>
        <mat-divider />
        <div class="grand">
          <span>Valor total del presupuesto</span>
          <strong>{{ t().valorTotal | currency: moneda : 'symbol-narrow' : '1.0-0' }}</strong>
          <small class="letras">{{ letras() }}</small>
        </div>
        @if (t().anticipo !== null) {
          <p class="anticipo">Anticipo: <strong>{{ t().anticipo | currency: moneda : 'symbol-narrow' : '1.0-0' }}</strong></p>
        }
      </mat-card-content>
    </mat-card>
  `,
  styles: `
    dl { display: grid; grid-template-columns: 1fr auto; gap: 6px 12px; margin: 8px 0 12px; }
    dt { opacity: 0.8; }
    dt small { opacity: 0.7; margin-left: 4px; }
    dd { margin: 0; text-align: right; font-variant-numeric: tabular-nums; }
    .sum { font-weight: 500; opacity: 1; border-top: 1px dashed var(--mat-sys-outline-variant); padding-top: 6px; }
    .grand { display: flex; flex-direction: column; gap: 4px; padding-top: 12px; }
    .grand strong { font-size: 1.6rem; font-weight: 500; color: var(--mat-sys-primary); font-variant-numeric: tabular-nums; }
    .letras { font-size: 11px; line-height: 1.4; opacity: 0.75; letter-spacing: 0.02em; }
    .anticipo { margin: 12px 0 0; font-size: 14px; }
  `,
})
export class PresupuestoResumenComponent {
  readonly t = input.required<PresupuestoTotales>({ alias: 'totales' });
  /** Porcentajes tal como se escriben (9 = 9 %). */
  readonly aiu = input.required<{ administracion: number; imprevistos: number; utilidad: number; ivaUtilidad: number }>();

  protected readonly moneda = PRESUPUESTO_CURRENCY;
  protected readonly aiuTotal = computed(() => this.aiu().administracion + this.aiu().imprevistos + this.aiu().utilidad);
  protected readonly letras = computed(() => pesosEnLetras(this.t().valorTotal));
}
