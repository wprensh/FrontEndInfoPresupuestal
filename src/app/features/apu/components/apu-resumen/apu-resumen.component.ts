import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { APU_MATERIAL } from '../../material/apu-material';
import { APU_CURRENCY, ApuTotales, Unidad } from '../../models/apu.model';

/** Resumen de costos del APU, equivalente al bloque "TOTAL COSTO DIRECTO" del Excel. */
@Component({
  selector: 'app-apu-resumen',
  imports: [CurrencyPipe, ...APU_MATERIAL],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <mat-card appearance="outlined">
      <mat-card-header><mat-card-title>Resumen</mat-card-title></mat-card-header>
      <mat-card-content>
        <dl>
          <dt>Materiales</dt>
          <dd>{{ totales().materiales | currency: moneda : 'symbol-narrow' : '1.0-2' }}</dd>
          <dt>Mano de obra</dt>
          <dd>{{ totales().manoObra | currency: moneda : 'symbol-narrow' : '1.0-2' }}</dd>
          <dt>Equipo</dt>
          <dd>{{ totales().equipo | currency: moneda : 'symbol-narrow' : '1.0-2' }}</dd>
        </dl>
        <mat-divider />
        <div class="grand">
          <span>Total costo directo{{ unidad() ? ' por ' + unidad() : '' }}</span>
          <strong>{{ totales().costoDirecto | currency: moneda : 'symbol-narrow' : '1.0-2' }}</strong>
        </div>
      </mat-card-content>
    </mat-card>
  `,
  styles: `
    dl { display: grid; grid-template-columns: 1fr auto; gap: 8px 16px; margin: 8px 0 16px; }
    dt { opacity: 0.75; }
    dd { margin: 0; text-align: right; font-variant-numeric: tabular-nums; }
    .grand { display: flex; flex-direction: column; gap: 4px; padding-top: 16px; }
    .grand strong { font-size: 1.5rem; font-weight: 500; color: var(--mat-sys-primary); font-variant-numeric: tabular-nums; }
  `,
})
export class ApuResumenComponent {
  readonly totales = input.required<ApuTotales>();
  readonly unidad = input<Unidad | null>(null);

  protected readonly moneda = APU_CURRENCY;
}
