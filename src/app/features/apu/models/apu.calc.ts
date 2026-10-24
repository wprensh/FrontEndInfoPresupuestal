import { ApuTotales, EquipoLinea, ManoObraLinea, MaterialLinea } from './apu.model';

const num = (v: number | null | undefined): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0);

/** Fórmulas de la hoja APU's. Puras para poder probarlas sin el formulario. */

/** `=E*G*F+E*G`: cantidad × precio, más el desperdicio. */
export function totalMaterial(l: Partial<MaterialLinea>): number {
  const base = num(l.cantidad) * num(l.precioUnitario);
  return base + (base * num(l.desperdicio)) / 100;
}

/** `=D*E`: jornal con prestaciones. */
export function totalJornal(l: Partial<ManoObraLinea>): number {
  return num(l.jornal) * num(l.prestaciones);
}

/** `=IF(G<>0, F/G, "")`: costo de mano de obra por unidad; sin rendimiento no aporta. */
export function totalManoObra(l: Partial<ManoObraLinea>): number {
  const rendimiento = num(l.rendimiento);
  return rendimiento > 0 ? totalJornal(l) / rendimiento : 0;
}

/** `=E*G`: incidencia × precio. */
export function totalEquipo(l: Partial<EquipoLinea>): number {
  return num(l.incidencia) * num(l.precioUnitario);
}

const sum = <T>(rows: readonly T[] | undefined, fn: (r: T) => number): number => (rows ?? []).reduce((acc, r) => acc + fn(r), 0);

export function calcularTotales(apu: Partial<{ materiales: Partial<MaterialLinea>[]; manoObra: Partial<ManoObraLinea>[]; equipo: Partial<EquipoLinea>[] }>): ApuTotales {
  const materiales = sum(apu.materiales, totalMaterial);
  const manoObra = sum(apu.manoObra, totalManoObra);
  const equipo = sum(apu.equipo, totalEquipo);
  return { materiales, manoObra, equipo, costoDirecto: materiales + manoObra + equipo };
}

