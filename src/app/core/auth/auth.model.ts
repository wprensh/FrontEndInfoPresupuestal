/** Acciones que un rol puede tener sobre un módulo. */
export type Accion = 'ver' | 'insertar' | 'editar' | 'eliminar';

export const ACCIONES: readonly Accion[] = ['ver', 'insertar', 'editar', 'eliminar'];

/** Códigos de módulo, iguales a `Common/Security/Modulos.cs` del backend. */
export type Modulo =
  | 'empresas'
  | 'usuarios'
  | 'roles'
  | 'clasificaciones'
  | 'unidades-medida'
  | 'tipos-insumo'
  | 'insumos'
  | 'precios-insumo'
  | 'productos'
  | 'apu'
  | 'presupuestos'
  | 'proveedores'
  | 'catalogo-proveedor';

/** Una constructora arma presupuestos; un proveedor publica su catálogo de precios. */
export type TipoEmpresa = 'CONSTRUCTORA' | 'PROVEEDOR';

export interface SesionUsuario {
  id: string;
  email: string;
  nombre: string;
  /** Identificador del tenant (empresa) con que inició sesión. */
  empresa: string;
  razonSocial: string;
  rol: string;
  esSuperAdmin: boolean;
  tipoEmpresa: TipoEmpresa;
}

export interface LoginRequest {
  empresa: string;
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  expiraEn: string;
  usuario: SesionUsuario;
  /** Permisos en formato `modulo:accion`. */
  permisos: string[];
}

export const permiso = (modulo: Modulo, accion: Accion): string => `${modulo}:${accion}`;
