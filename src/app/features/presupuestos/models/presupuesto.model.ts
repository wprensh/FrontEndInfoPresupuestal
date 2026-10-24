/** Presupuesto de obra (hoja PRESUPUESTO del formato Excel) y contrato de `/api/presupuestos`. */

export const PRESUPUESTO_CURRENCY = 'COP';

export type EstadoPresupuesto = 'BORRADOR' | 'APROBADO' | 'ANULADO';

export const ESTADO_LABELS: Record<EstadoPresupuesto, string> = {
  BORRADOR: 'Borrador',
  APROBADO: 'Aprobado',
  ANULADO: 'Anulado',
};

/** Porcentajes de la plantilla FORMATOS, con el IVA vigente (19 %). Igual que la API. */
export const AIU_POR_DEFECTO = { administracion: 9, imprevistos: 3, utilidad: 8, ivaUtilidad: 19 } as const;

export interface UnidadMedida {
  id: number;
  codigo: string;
  nombre: string;
}

/** APU que se ofrece para agregar como ítem. */
export interface ApuOpcion {
  id: string;
  codigo: string;
  descripcion: string;
  unidadMedidaId: number;
  unidad: string;
  costos: { costoDirecto: number };
}

export interface PresupuestoTotales {
  costoDirecto: number;
  administracion: number;
  imprevistos: number;
  utilidad: number;
  totalAiu: number;
  ivaUtilidad: number;
  costosIndirectos: number;
  valorTotal: number;
  anticipo: number | null;
}

export interface PresupuestoItem {
  id: number;
  codigo: string;
  numero: number;
  apuId: string | null;
  apuCodigo: string | null;
  descripcion: string;
  unidadMedidaId: number;
  unidad: string;
  cantidad: number;
  valorUnitario: number;
  valorTotal: number;
  /** Costo directo actual del APU; distinto de `valorUnitario` si el APU cambió. */
  costoApuActual: number | null;
}

export interface PresupuestoCapitulo {
  id: number;
  numero: number;
  nombre: string;
  subtotal: number;
  /** Fracción del costo directo (0–1). */
  participacion: number;
  items: PresupuestoItem[];
}

export interface Presupuesto {
  id: string;
  codigo: string;
  nombreObra: string;
  cliente: string | null;
  ubicacion: string | null;
  fecha: string;
  propuestaNumero: string | null;
  estado: EstadoPresupuesto;
  moneda: string;
  administracionPct: number;
  imprevistosPct: number;
  utilidadPct: number;
  ivaUtilidadPct: number;
  duracionDias: number | null;
  anticipoPct: number | null;
  observaciones: string | null;
  capitulos: PresupuestoCapitulo[];
  totales: PresupuestoTotales;
  itemsDesactualizados: number;
  actualizadoEn: string;
}

export interface PresupuestoResumen {
  id: string;
  codigo: string;
  nombreObra: string;
  cliente: string | null;
  fecha: string;
  propuestaNumero: string | null;
  estado: EstadoPresupuesto;
  capitulos: number;
  items: number;
  costoDirecto: number;
  valorTotal: number;
  actualizadoEn: string;
}

export interface PresupuestoDto {
  nombreObra: string;
  cliente: string | null;
  ubicacion: string | null;
  fecha: string | null;
  propuestaNumero: string | null;
  administracionPct: number;
  imprevistosPct: number;
  utilidadPct: number;
  ivaUtilidadPct: number;
  duracionDias: number | null;
  anticipoPct: number | null;
  observaciones: string | null;
  capitulos: {
    nombre: string;
    items: { apuId: string | null; descripcion: string; unidadMedidaId: number; cantidad: number; valorUnitario: number }[];
  }[];
}
