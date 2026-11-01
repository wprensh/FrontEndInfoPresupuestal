import { CurrencyPipe, DatePipe, DecimalPipe, PercentPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { fechaLocal } from '../../../../shared/utils/fecha.utils';
import { pesosEnLetras } from '../../../../shared/utils/numero-a-letras';
import { ESTADO_LABELS, PRESUPUESTO_CURRENCY, Presupuesto } from '../../../presupuestos/models/presupuesto.model';
import { ConfiguracionImpresion } from '../../models/impresion.model';

/**
 * Hoja impresa del presupuesto con el membrete de la empresa: encabezado con logo y razón social,
 * datos de la obra, cada capítulo con sus ítems y subtotal, resumen AIU, valor en letras y firma.
 * Es solo presentación: la usan la página de impresión y la vista previa del formato.
 */
@Component({
  selector: 'app-hoja-presupuesto',
  imports: [CurrencyPipe, DatePipe, DecimalPipe, PercentPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[style.--hoja-color]': 'empresa().colorPrimario' },
  template: `
    @let e = empresa();
    @let p = presupuesto();
    <article class="hoja" [attr.data-estado]="p.estado">
      @if (p.estado !== 'APROBADO') {
        <div class="marca" aria-hidden="true">{{ estado() }}</div>
      }

      <header class="membrete">
        @if (e.logo) {
          <img class="logo" [src]="e.logo" alt="Logo de {{ e.razonSocial }}" />
        }
        <div class="empresa">
          <h1>{{ e.razonSocial }}</h1>
          @if (e.nit) {
            <p>NIT {{ e.nit }}</p>
          }
          @if (direccion()) {
            <p>{{ direccion() }}</p>
          }
          @if (contacto()) {
            <p>{{ contacto() }}</p>
          }
        </div>
        <div class="doc">
          <span class="doc-titulo">Presupuesto de obra</span>
          <strong>{{ p.codigo }}</strong>
          <span>Fecha: {{ fecha() | date: 'dd/MM/yyyy' }}</span>
          @if (p.propuestaNumero) {
            <span>Propuesta N° {{ p.propuestaNumero }}</span>
          }
        </div>
      </header>

      @if (e.encabezado) {
        <p class="nota">{{ e.encabezado }}</p>
      }

      <section class="obra">
        <div><span>Obra</span><strong>{{ p.nombreObra }}</strong></div>
        @if (p.cliente) {
          <div><span>Cliente</span><strong>{{ p.cliente }}</strong></div>
        }
        @if (p.ubicacion) {
          <div><span>Ubicación</span><strong>{{ p.ubicacion }}</strong></div>
        }
        @if (p.duracionDias) {
          <div><span>Plazo</span><strong>{{ p.duracionDias }} días</strong></div>
        }
      </section>

      <table class="items">
        <colgroup>
          <col class="c-item" /><col /><col class="c-und" /><col class="c-cant" /><col class="c-vr" /><col class="c-vr" />
        </colgroup>
        <thead>
          <tr>
            <th>Ítem</th>
            <th>Descripción</th>
            <th>Und</th>
            <th class="num">Cantidad</th>
            <th class="num">Vr. unitario</th>
            <th class="num">Vr. total</th>
          </tr>
        </thead>
        @for (c of p.capitulos; track c.id) {
          <tbody class="capitulo">
            <tr class="cap-titulo">
              <td>{{ c.numero }}</td>
              <td colspan="5">{{ c.nombre }}</td>
            </tr>
            @for (i of c.items; track i.id) {
              <tr>
                <td class="codigo">{{ i.codigo }}</td>
                <td>
                  {{ i.descripcion }}
                  @if (e.mostrarApu && i.apuCodigo) {
                    <small class="apu">{{ i.apuCodigo }}</small>
                  }
                </td>
                <td>{{ i.unidad }}</td>
                <td class="num">{{ i.cantidad | number: '1.0-4' }}</td>
                <td class="num">{{ i.valorUnitario | currency: moneda : 'symbol-narrow' : '1.2-2' }}</td>
                <td class="num">{{ i.valorTotal | currency: moneda : 'symbol-narrow' : '1.2-2' }}</td>
              </tr>
            } @empty {
              <tr><td></td><td colspan="5" class="vacio">Sin ítems</td></tr>
            }
            <tr class="cap-subtotal">
              <td></td>
              <td colspan="4">
                Subtotal capítulo {{ c.numero }}
                @if (e.mostrarParticipacion) {
                  <small>· {{ c.participacion | percent: '1.1-1' }} del costo directo</small>
                }
              </td>
              <td class="num">{{ c.subtotal | currency: moneda : 'symbol-narrow' : '1.2-2' }}</td>
            </tr>
          </tbody>
        }
      </table>

      <section class="cierre">
        <table class="resumen">
          <tr><th>Costo directo</th><td>{{ p.totales.costoDirecto | currency: moneda : 'symbol-narrow' : '1.2-2' }}</td></tr>
          <tr><th>Administración ({{ p.administracionPct | percent: '1.0-2' }})</th><td>{{ p.totales.administracion | currency: moneda : 'symbol-narrow' : '1.2-2' }}</td></tr>
          <tr><th>Imprevistos ({{ p.imprevistosPct | percent: '1.0-2' }})</th><td>{{ p.totales.imprevistos | currency: moneda : 'symbol-narrow' : '1.2-2' }}</td></tr>
          <tr><th>Utilidad ({{ p.utilidadPct | percent: '1.0-2' }})</th><td>{{ p.totales.utilidad | currency: moneda : 'symbol-narrow' : '1.2-2' }}</td></tr>
          <tr class="sum"><th>Total AIU</th><td>{{ p.totales.totalAiu | currency: moneda : 'symbol-narrow' : '1.2-2' }}</td></tr>
          <tr><th>IVA sobre utilidad ({{ p.ivaUtilidadPct | percent: '1.0-2' }})</th><td>{{ p.totales.ivaUtilidad | currency: moneda : 'symbol-narrow' : '1.2-2' }}</td></tr>
          <tr class="total"><th>Valor total</th><td>{{ p.totales.valorTotal | currency: moneda : 'symbol-narrow' : '1.0-0' }}</td></tr>
          @if (p.totales.anticipo !== null) {
            <tr><th>Anticipo ({{ p.anticipoPct | percent: '1.0-2' }})</th><td>{{ p.totales.anticipo | currency: moneda : 'symbol-narrow' : '1.0-0' }}</td></tr>
          }
        </table>
        @if (e.mostrarValorLetras) {
          <p class="letras"><span>Son:</span> {{ letras() }}</p>
        }
        @if (p.observaciones) {
          <p class="observaciones"><span>Observaciones:</span> {{ p.observaciones }}</p>
        }
      </section>

      @if (e.firmaNombre) {
        <section class="firma">
          <div class="linea"></div>
          <strong>{{ e.firmaNombre }}</strong>
          @if (e.firmaCargo) {
            <span>{{ e.firmaCargo }}</span>
          }
          @if (e.firmaMatricula) {
            <span>{{ e.firmaMatricula }}</span>
          }
        </section>
      }

      <footer>
        @if (e.piePagina) {
          <p>{{ e.piePagina }}</p>
        }
        <p class="marca-app">{{ e.razonSocial }} · {{ p.codigo }} · Generado con InfoPresupuestal</p>
      </footer>
    </article>
  `,
  styles: `
    :host { display: block; --hoja-color: #006a6a; color: #1b1b1b; }
    .hoja {
      position: relative; background: #fff; padding: 14mm 14mm 10mm; font: 10pt/1.35 Roboto, Arial, sans-serif;
      box-sizing: border-box; overflow: hidden;
    }
    .marca {
      position: absolute; top: 40%; left: 50%; transform: translate(-50%, -50%) rotate(-30deg);
      font: 700 72pt Roboto, sans-serif; letter-spacing: 0.1em; color: color-mix(in srgb, var(--hoja-color) 9%, transparent);
      pointer-events: none; white-space: nowrap; z-index: 0;
    }
    .membrete {
      display: grid; grid-template-columns: auto 1fr auto; gap: 14px; align-items: center;
      padding-bottom: 10px; border-bottom: 3px solid var(--hoja-color);
    }
    .logo { max-height: 72px; max-width: 160px; object-fit: contain; }
    .empresa h1 { margin: 0 0 2px; font: 700 14pt/1.2 Roboto, sans-serif; color: var(--hoja-color); }
    .empresa p { margin: 0; font-size: 8.5pt; color: #444; }
    .doc { display: flex; flex-direction: column; align-items: flex-end; gap: 1px; font-size: 8.5pt; text-align: right; }
    .doc-titulo { text-transform: uppercase; letter-spacing: 0.08em; font-weight: 500; color: #555; }
    .doc strong { font-size: 13pt; color: var(--hoja-color); }
    .nota { margin: 8px 0 0; font-size: 9pt; color: #333; white-space: pre-line; }
    .obra {
      display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 4px 16px; margin: 10px 0;
      padding: 8px 10px; background: color-mix(in srgb, var(--hoja-color) 6%, #fff); border-radius: 4px;
    }
    .obra div { display: flex; gap: 6px; min-width: 0; }
    .obra span { color: #555; min-width: 64px; }
    .items { width: 100%; border-collapse: collapse; font-size: 8.5pt; position: relative; }
    .c-item { width: 44px; } .c-und { width: 44px; } .c-cant { width: 70px; } .c-vr { width: 96px; }
    thead th {
      background: var(--hoja-color); color: #fff; text-align: left; font-weight: 500; padding: 5px 6px;
      -webkit-print-color-adjust: exact; print-color-adjust: exact;
    }
    td { padding: 3px 6px; border-bottom: 1px solid #e3e3e3; vertical-align: top; }
    .num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
    .codigo { color: #555; }
    .apu { display: block; color: #777; font-size: 7.5pt; }
    .cap-titulo td {
      font-weight: 700; background: color-mix(in srgb, var(--hoja-color) 12%, #fff); color: #111; padding-top: 5px;
      -webkit-print-color-adjust: exact; print-color-adjust: exact; text-transform: uppercase;
    }
    .cap-subtotal td { font-weight: 600; border-bottom: 2px solid #cfcfcf; }
    .cap-subtotal small { font-weight: 400; color: #666; }
    .vacio { color: #888; font-style: italic; }
    tbody.capitulo { break-inside: auto; }
    .cap-titulo { break-after: avoid; }
    .cierre { display: flex; flex-direction: column; align-items: flex-end; margin-top: 12px; break-inside: avoid; }
    .resumen { border-collapse: collapse; min-width: 320px; font-size: 9pt; }
    .resumen th { text-align: left; font-weight: 400; padding: 2px 12px 2px 0; color: #333; }
    .resumen td { text-align: right; padding: 2px 0; border: 0; font-variant-numeric: tabular-nums; }
    .resumen .sum th, .resumen .sum td { border-top: 1px dashed #bbb; font-weight: 500; }
    .resumen .total th, .resumen .total td {
      font-weight: 700; font-size: 11pt; color: var(--hoja-color); border-top: 2px solid var(--hoja-color); padding-top: 4px;
    }
    .letras, .observaciones { align-self: stretch; margin: 8px 0 0; font-size: 8.5pt; }
    .letras span, .observaciones span { font-weight: 600; }
    .firma { display: flex; flex-direction: column; width: 240px; margin: 40px 0 0; font-size: 9pt; break-inside: avoid; }
    .firma .linea { border-top: 1px solid #333; margin-bottom: 4px; }
    .firma span { color: #444; }
    footer { margin-top: 18px; padding-top: 6px; border-top: 1px solid #ddd; font-size: 7.5pt; color: #666; }
    footer p { margin: 0 0 2px; white-space: pre-line; }
    .marca-app { opacity: 0.8; }
    @media print {
      .hoja { padding: 0; overflow: visible; }
      .marca { position: fixed; }
    }
  `,
})
export class HojaPresupuestoComponent {
  readonly empresa = input.required<ConfiguracionImpresion>();
  readonly presupuesto = input.required<Presupuesto>();

  protected readonly moneda = PRESUPUESTO_CURRENCY;
  protected readonly estado = computed(() => ESTADO_LABELS[this.presupuesto().estado].toUpperCase());
  protected readonly fecha = computed(() => fechaLocal(this.presupuesto().fecha));
  protected readonly letras = computed(() => pesosEnLetras(this.presupuesto().totales.valorTotal));
  protected readonly direccion = computed(() => [this.empresa().direccion, this.empresa().ciudad].filter(Boolean).join(' · '));
  protected readonly contacto = computed(() => {
    const e = this.empresa();
    return [e.telefono ? `Tel. ${e.telefono}` : null, e.email, e.sitioWeb].filter(Boolean).join(' · ');
  });
}
