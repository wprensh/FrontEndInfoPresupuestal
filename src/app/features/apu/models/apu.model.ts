/**
 * Análisis de Precios Unitarios (APU), tal como lo arma la hoja "APU's" del
 * formato PRESUPUES-TEN: un encabezado y tres secciones de insumos.
 */

/** Factor de prestaciones sociales que trae el formato (columna "% PREST.SOC."). */
export const FACTOR_PRESTACIONES = 1.7;

export const APU_CURRENCY = 'COP';

/** Tipos de insumo del catálogo global (`presupuesto.tipo_insumo`). */
export const TIPO_MATERIAL = 1;
export const TIPO_EQUIPO = 2;
export const TIPO_MANO_OBRA = 3;

export interface UnidadMedida {
  id: number;
  codigo: string;
  nombre: string;
}

/** Insumo del catálogo de mantenimiento, con su precio vigente. */
export interface InsumoCatalogo {
  id: string;
  codigo: string;
  descripcion: string;
  unidadMedidaId: number;
  unidad: string;
  precio: { valorUnitario: number; moneda: string; fechaVigencia: string } | null;
}

// ---------- Valores del formulario (desperdicio en %, como se escribe) ----------

export interface MaterialLinea {
  insumoId: string | null;
  descripcion: string;
  unidadMedidaId: number | null;
  cantidad: number;
  /** Porcentaje 0–100 (la API y el Excel lo guardan como fracción). */
  desperdicio: number;
  precioUnitario: number;
}

export interface ManoObraLinea {
  insumoId: string | null;
  descripcion: string;
  jornal: number;
  prestaciones: number;
  /** Unidades de la actividad que se ejecutan en un día. */
  rendimiento: number;
}

export interface EquipoLinea {
  insumoId: string | null;
  descripcion: string;
  unidadMedidaId: number | null;
  incidencia: number;
  precioUnitario: number;
}

export interface ApuEncabezado {
  descripcion: string;
  unidadMedidaId: number | null;
  fecha: Date | null;
  observaciones: string;
  activo: boolean;
}

/** Valor completo del formulario. */
export interface ApuFormValue {
  encabezado: ApuEncabezado;
  materiales: MaterialLinea[];
  manoObra: ManoObraLinea[];
  equipo: EquipoLinea[];
}

export interface ApuTotales {
  materiales: number;
  manoObra: number;
  equipo: number;
  /** Total costo directo por unidad de la actividad. */
  costoDirecto: number;
}

// ---------- Contrato de la API (/api/apus) ----------

export interface ApuCostos {
  materiales: number;
  equipo: number;
  manoObra: number;
  costoDirecto: number;
}

export interface ApuLinea {
  id: number;
  orden: number;
  insumoId: string | null;
  descripcion: string;
  unidadMedidaId: number | null;
  unidad: string | null;
  cantidad: number;
  precioUnitario: number;
  /** Fracción 0–1. */
  desperdicio: number;
  factorPrestacional: number;
  rendimiento: number;
  valorParcial: number;
}

export interface Apu {
  id: string;
  codigo: string;
  descripcion: string;
  unidadMedidaId: number;
  unidad: string;
  fecha: string;
  observaciones: string | null;
  activo: boolean;
  costos: ApuCostos;
  materiales: ApuLinea[];
  equipo: ApuLinea[];
  manoObra: ApuLinea[];
  usosEnPresupuestos: number;
  actualizadoEn: string;
}

export interface ApuResumen {
  id: string;
  codigo: string;
  descripcion: string;
  unidadMedidaId: number;
  unidad: string;
  fecha: string;
  activo: boolean;
  costos: ApuCostos;
  actualizadoEn: string;
}

export interface ApuDto {
  descripcion: string;
  unidadMedidaId: number;
  fecha: string | null;
  observaciones: string | null;
  activo: boolean;
  materiales: { insumoId: string | null; descripcion: string; unidadMedidaId: number; cantidad: number; desperdicio: number; precioUnitario: number }[];
  equipo: { insumoId: string | null; descripcion: string; unidadMedidaId: number; incidencia: number; precioUnitario: number }[];
  manoObra: { insumoId: string | null; descripcion: string; jornal: number; factorPrestacional: number; rendimiento: number }[];
}
