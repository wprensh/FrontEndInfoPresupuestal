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
