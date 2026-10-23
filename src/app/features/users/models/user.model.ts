export type UserRole = 'admin' | 'analyst' | 'viewer';

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  active: boolean;
  createdAt: string;
}

/** Datos que envía el formulario de creación. El backend asigna `id` y `createdAt`. */
export type CreateUserDto = Omit<User, 'id' | 'createdAt'>;

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrador',
  analyst: 'Analista',
  viewer: 'Consulta',
};
