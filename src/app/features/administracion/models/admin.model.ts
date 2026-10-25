import { Accion, Modulo, TipoEmpresa } from '../../../core/auth/auth.model';

/** La API recibe el tipo como su enum numérico (`TipoEmpresa` en C#). */
export const TIPO_EMPRESA_API: Record<TipoEmpresa, number> = { CONSTRUCTORA: 0, PROVEEDOR: 1 };

export interface Empresa {
  id: string;
  tenantId: string;
  razonSocial: string;
  tipo: TipoEmpresa;
  nit: string | null;
  email: string | null;
  telefono: string | null;
  activo: boolean;
  creadoEn: string;
}

export interface CreateEmpresaDto {
  tenantId: string;
  razonSocial: string;
  nit: string | null;
  email: string | null;
  telefono: string | null;
  adminNombre: string;
  adminEmail: string;
  adminPassword: string;
  tipo: number;
}

export type UpdateEmpresaDto = Pick<Empresa, 'razonSocial' | 'nit' | 'email' | 'telefono' | 'activo'>;

export interface Usuario {
  id: string;
  email: string;
  nombre: string;
  rolId: string;
  rol: string;
  activo: boolean;
  esSuperAdmin: boolean;
  ultimoAcceso: string | null;
  creadoEn: string;
}

export interface CreateUsuarioDto {
  email: string;
  nombre: string;
  rolId: string;
  password: string;
}

export interface UpdateUsuarioDto {
  nombre: string;
  rolId: string;
  activo: boolean;
}

export interface Permiso {
  modulo: Modulo;
  ver: boolean;
  insertar: boolean;
  editar: boolean;
  eliminar: boolean;
}

export interface RolResumen {
  id: string;
  nombre: string;
  descripcion: string | null;
  esSistema: boolean;
  usuarios: number;
}

export interface Rol {
  id: string;
  nombre: string;
  descripcion: string | null;
  esSistema: boolean;
  permisos: Permiso[];
}

export interface RolDto {
  nombre: string;
  descripcion: string | null;
  permisos: Permiso[];
}

export interface ModuloInfo {
  codigo: Modulo;
  nombre: string;
  grupo: string;
  alcance: 'Tenant' | 'Global' | 'Plataforma';
  accionesAsignables: Accion[];
}

/** Regla de la API (y de Identity): 8+ caracteres con mayúscula, minúscula y número. */
export const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,100}$/;
export const PASSWORD_HINT = 'Mínimo 8 caracteres, con mayúscula, minúscula y número';
