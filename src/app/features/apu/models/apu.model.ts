/**
 * Análisis de Precios Unitarios (APU), tal como lo arma la hoja "APU's" del
 * formato PRESUPUES-TEN: un encabezado y tres secciones de insumos.
 */

/** Unidades de la validación de datos del Excel (columna UNIDAD). */
export const UNIDADES = ['UN', 'M3', 'M2', 'ML', 'KG', 'TN', 'GLB', 'GLOBAL', 'JORNAL', 'MES', 'DIA', 'HR', 'CM3', 'CM2', 'CM', 'GAL'] as const;
export type Unidad = (typeof UNIDADES)[number];

/** Factor de prestaciones sociales que trae el formato (columna "% PREST.SOC."). */
export const FACTOR_PRESTACIONES = 1.7;

export const APU_CURRENCY = 'COP';

/** Insumo de un catálogo, con el precio que se propone al elegirlo. */
export interface MaterialCatalogo {
  readonly id: number;
  readonly descripcion: string;
  readonly unidad: Unidad;
  readonly precio: number;
}

export interface ManoObraCatalogo {
  readonly id: number;
  readonly descripcion: string;
  /** Valor del jornal sin prestaciones. */
  readonly jornal: number;
}

export type EquipoCatalogo = MaterialCatalogo;

export interface ApuCatalogos {
  readonly materiales: readonly MaterialCatalogo[];
  readonly manoObra: readonly ManoObraCatalogo[];
  readonly equipos: readonly EquipoCatalogo[];
}

export interface MaterialLinea {
  insumoId: number | null;
  descripcion: string;
  unidad: Unidad | null;
  cantidad: number;
  /** Porcentaje 0–100 (el Excel lo guarda como fracción). */
  desperdicio: number;
  precioUnitario: number;
}

export interface ManoObraLinea {
  insumoId: number | null;
  descripcion: string;
  jornal: number;
  prestaciones: number;
  /** Unidades de la actividad que se ejecutan en un día. */
  rendimiento: number;
}

export interface EquipoLinea {
  insumoId: number | null;
  descripcion: string;
  unidad: Unidad | null;
  incidencia: number;
  precioUnitario: number;
}

export interface ApuEncabezado {
  item: string;
  descripcion: string;
  unidad: Unidad | null;
  fecha: Date | null;
}

/** Valor completo del formulario. */
export interface Apu {
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
