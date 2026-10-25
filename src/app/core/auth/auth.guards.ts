import { inject } from '@angular/core';
import { CanActivateFn, CanMatchFn, Router } from '@angular/router';

import { Modulo } from './auth.model';
import { AuthService } from './auth.service';

/** Exige sesión; si no hay, lleva al login. */
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.isAuthenticated() || inject(Router).createUrlTree(['/login']);
};

/** Exige permiso de Ver en alguno de los módulos. */
export const canView =
  (...modulos: Modulo[]): CanMatchFn =>
  () => {
    const auth = inject(AuthService);
    if (!auth.isAuthenticated()) return inject(Router).createUrlTree(['/login']);
    return auth.canAny(modulos) || inject(Router).createUrlTree(['/']);
  };

/**
 * Pantalla de inicio según permisos: quien trabaja con presupuestos entra a Partidas; un perfil que
 * solo mantiene el catálogo (por ejemplo Proveedor) entra a Mantenimiento.
 */
export const inicioSegunPermisos = (): string => {
  const auth = inject(AuthService);
  if (!auth.isAuthenticated()) return 'dashboard';
  if (auth.canAny(['presupuestos', 'apu'])) return 'presupuesto';
  if (auth.canAny(['insumos', 'clasificaciones', 'unidades-medida', 'tipos-insumo'])) return 'mantenimiento';
  if (auth.canAny(['usuarios', 'roles'])) return 'administracion';
  // Sin sesión o sin permisos: el dashboard no exige permisos, así no hay redirecciones en bucle.
  return 'dashboard';
};

export const superAdminGuard: CanMatchFn = () => inject(AuthService).isSuperAdmin() || inject(Router).createUrlTree(['/']);

/** El login solo se ve sin sesión. */
export const guestGuard: CanActivateFn = () => !inject(AuthService).isAuthenticated() || inject(Router).createUrlTree(['/']);
