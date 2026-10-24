import { PresupuestoTotales } from './presupuesto.model';

/** Fórmulas de la hoja PRESUPUESTO, iguales a `PresupuestoCalculo` de la API. Porcentajes como fracción. */

const centavos = (v: number): number => Math.round((v + Number.EPSILON) * 100) / 100;
const num = (v: number | null | undefined): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0);

/** `=E*F`: cantidad × valor unitario, a centavos. */
export function valorItem(cantidad: number | null | undefined, valorUnitario: number | null | undefined): number {
  return centavos(num(cantidad) * num(valorUnitario));
}

export interface Aiu {
  administracion: number;
  imprevistos: number;
  utilidad: number;
  ivaUtilidad: number;
}

/** AIU sobre el costo directo, IVA sobre la utilidad y total truncado a pesos. */
export function calcularTotales(costoDirecto: number, aiu: Aiu, anticipo: number | null): PresupuestoTotales {
  const administracion = centavos(costoDirecto * num(aiu.administracion));
  const imprevistos = centavos(costoDirecto * num(aiu.imprevistos));
  const utilidad = centavos(costoDirecto * num(aiu.utilidad));
  const ivaUtilidad = centavos(utilidad * num(aiu.ivaUtilidad));
  const costosIndirectos = centavos(administracion + imprevistos + utilidad + ivaUtilidad);
  const valorTotal = Math.trunc(centavos(costoDirecto + costosIndirectos));
  return {
    costoDirecto: centavos(costoDirecto),
    administracion,
    imprevistos,
    utilidad,
    totalAiu: centavos(administracion + imprevistos + utilidad),
    ivaUtilidad,
    costosIndirectos,
    valorTotal,
    anticipo: anticipo === null ? null : centavos(valorTotal * anticipo),
  };
}
