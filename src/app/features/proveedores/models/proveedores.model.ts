/** Precio del proveedor en una ciudad (null = todo el país) desde una fecha. El IVA va como fracción (0.19 = 19 %). */
export interface PrecioProveedor {
  id: number;
  productoId: string;
  ciudad: string | null;
  valor: number;
  incluyeIva: boolean;
  ivaPct: number;
  moneda: string;
  fechaVigencia: string;
  valorSinIva: number;
  valorConIva: number;
}

/** Producto del catálogo propio. En el listado `precios` trae el vigente de cada ciudad; en el detalle, todo el historial. */
export interface ProductoProveedor {
  id: string;
  codigo: string;
  descripcion: string;
  tipoInsumoId: number;
  tipo: string;
  unidadMedidaId: number;
  unidad: string;
  marca: string | null;
  categoria: string | null;
  activo: boolean;
  actualizadoEn: string;
  precios: PrecioProveedor[];
}

export interface ProductoProveedorDto {
  codigo: string;
  descripcion: string;
  tipoInsumoId: number;
  unidadMedidaId: number;
  marca: string | null;
  categoria: string | null;
  activo: boolean;
}

export interface PrecioProveedorDto {
  valor: number;
  fechaVigencia: string;
  ciudad: string | null;
  incluyeIva: boolean;
  ivaPct: number;
  moneda: string;
}

export interface ProductoFiltro {
  tipoInsumoId: number | null;
  activo: boolean | null;
}

/** Proveedor visible para las constructoras (sus listas de precios son públicas). */
export interface Proveedor {
  id: string;
  tenantId: string;
  razonSocial: string;
  nit: string | null;
  email: string | null;
  telefono: string | null;
  productos: number;
  creadoEn: string;
}

export interface CreateProveedorDto {
  tenantId: string;
  razonSocial: string;
  nit: string | null;
  email: string | null;
  telefono: string | null;
  adminNombre: string;
  adminEmail: string;
  adminPassword: string;
}

/** Tarifa general de IVA en Colombia. */
export const IVA_GENERAL = 0.19;

export const ciudadLabel = (ciudad: string | null): string => ciudad ?? 'Nacional';

// ----- Consulta de catálogos e importación a insumos (constructoras) -----

/** Producto de cualquier proveedor, con el precio vigente de cada ciudad. */
export interface ProductoCatalogo {
  id: string;
  proveedor: string;
  razonSocial: string;
  codigo: string;
  descripcion: string;
  tipoInsumoId: number;
  tipo: string;
  unidadMedidaId: number;
  unidad: string;
  marca: string | null;
  categoria: string | null;
  precios: PrecioProveedor[];
}

export interface CatalogoFiltro {
  proveedor: string | null;
  tipoInsumoId: number | null;
  ciudad: string | null;
}

/** Una fila por precio: es lo que se selecciona para importar. */
export interface FilaCatalogo {
  producto: ProductoCatalogo;
  precio: PrecioProveedor;
}

export type AccionImportacion = 'CREAR' | 'ACTUALIZAR' | 'SIN_CAMBIO' | 'REPETIDO';

export interface PropuestaImportacion {
  precioId: number;
  productoId: string;
  proveedor: string;
  razonSocial: string;
  codigoProveedor: string;
  descripcion: string;
  tipoInsumoId: number;
  tipo: string;
  unidadMedidaId: number;
  unidad: string;
  ciudad: string | null;
  valorSinIva: number;
  fechaProveedor: string;
  accion: AccionImportacion;
  insumoId: string | null;
  insumoCodigo: string | null;
  precioActual: number | null;
  clasificacionId: number | null;
  clasificacion: string | null;
}

export interface ImportarItem {
  precioId: number;
  clasificacionId: number | null;
}

export interface ResultadoImportacion {
  creados: number;
  actualizados: number;
  sinCambio: number;
  items: PropuestaImportacion[];
}
