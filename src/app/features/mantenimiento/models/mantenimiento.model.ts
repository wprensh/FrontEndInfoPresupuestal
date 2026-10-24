import { Modulo } from '../../../core/auth/auth.model';

export interface Clasificacion {
  id: number;
  nombre: string;
  activo: boolean;
  insumos: number;
}

export interface UnidadMedida {
  id: number;
  codigo: string;
  nombre: string;
}

export interface TipoInsumo {
  id: number;
  codigo: string;
  nombre: string;
  prefijo: string;
}

export interface PrecioVigente {
  valorUnitario: number;
  moneda: string;
  fechaVigencia: string;
}

export interface Insumo {
  id: string;
  codigo: string;
  tipoInsumoId: number;
  tipo: string;
  clasificacionId: number | null;
  clasificacion: string | null;
  unidadMedidaId: number;
  unidad: string;
  descripcion: string;
  activo: boolean;
  precio: PrecioVigente | null;
  actualizadoEn: string;
}

export interface CreateInsumoDto {
  tipoInsumoId: number;
  clasificacionId: number | null;
  unidadMedidaId: number;
  descripcion: string;
}

export interface UpdateInsumoDto {
  clasificacionId: number | null;
  unidadMedidaId: number;
  descripcion: string;
  activo: boolean;
}

export interface PrecioInsumo {
  id: number;
  insumoId: string;
  valorUnitario: number;
  moneda: string;
  fechaVigencia: string;
  fuente: string | null;
}

export interface PrecioInsumoDto {
  valorUnitario: number;
  fechaVigencia: string;
  moneda: string | null;
  fuente: string | null;
}

export interface InsumoFiltro {
  tipoInsumoId: number | null;
  clasificacionId: number | null;
  activo: boolean | null;
}

/** Moneda por defecto del catálogo (pesos colombianos). */
export const MONEDA = 'COP';

// ----- Catálogos simples: una pantalla genérica configurada por ruta -----

export interface CampoCatalogo {
  key: string;
  label: string;
  maxLength: number;
  tipo?: 'texto' | 'activo';
  /** Solo al crear (por ejemplo el prefijo de un tipo de insumo). */
  soloCrear?: boolean;
  /** Solo al editar (por ejemplo Activo). */
  soloEditar?: boolean;
  mayusculas?: boolean;
  hint?: string;
}

export interface ColumnaCatalogo {
  key: string;
  label: string;
  tipo?: 'texto' | 'codigo' | 'numero' | 'activo';
}

export interface CatalogoConfig {
  titulo: string;
  subtitulo: string;
  singular: string;
  modulo: Modulo;
  /** Ruta bajo /mantenimiento en la API. */
  endpoint: string;
  columnas: ColumnaCatalogo[];
  campos: CampoCatalogo[];
}

export type CatalogoItem = { id: number } & Record<string, unknown>;

export const CATALOGOS: Record<'clasificaciones' | 'unidades' | 'tipos', CatalogoConfig> = {
  clasificaciones: {
    titulo: 'Clasificaciones',
    subtitulo: 'Agrupación de los insumos de la empresa',
    singular: 'clasificación',
    modulo: 'clasificaciones',
    endpoint: 'clasificaciones',
    columnas: [
      { key: 'nombre', label: 'Nombre' },
      { key: 'insumos', label: 'Insumos', tipo: 'numero' },
      { key: 'activo', label: 'Estado', tipo: 'activo' },
    ],
    campos: [
      { key: 'nombre', label: 'Nombre', maxLength: 60, mayusculas: true },
      { key: 'activo', label: 'Activa', maxLength: 0, tipo: 'activo', soloEditar: true },
    ],
  },
  unidades: {
    titulo: 'Unidades de medida',
    subtitulo: 'Catálogo compartido por todas las empresas',
    singular: 'unidad de medida',
    modulo: 'unidades-medida',
    endpoint: 'unidades-medida',
    columnas: [
      { key: 'codigo', label: 'Código', tipo: 'codigo' },
      { key: 'nombre', label: 'Nombre' },
    ],
    campos: [
      { key: 'codigo', label: 'Código', maxLength: 10, mayusculas: true, hint: 'Por ejemplo UN, ML, M2' },
      { key: 'nombre', label: 'Nombre', maxLength: 50 },
    ],
  },
  tipos: {
    titulo: 'Tipos de insumo',
    subtitulo: 'Catálogo compartido por todas las empresas',
    singular: 'tipo de insumo',
    modulo: 'tipos-insumo',
    endpoint: 'tipos-insumo',
    columnas: [
      { key: 'codigo', label: 'Código', tipo: 'codigo' },
      { key: 'nombre', label: 'Nombre' },
      { key: 'prefijo', label: 'Prefijo', tipo: 'codigo' },
    ],
    campos: [
      { key: 'codigo', label: 'Código', maxLength: 10, mayusculas: true },
      { key: 'nombre', label: 'Nombre', maxLength: 50 },
      { key: 'prefijo', label: 'Prefijo del código', maxLength: 5, mayusculas: true, soloCrear: true, hint: 'Arma el código de los insumos (MAT-0001); no se cambia después' },
    ],
  },
};
