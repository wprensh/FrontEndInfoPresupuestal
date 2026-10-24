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
  () =>
    inject(AuthService).canAny(modulos) || inject(Router).createUrlTree(['/']);

export const superAdminGuard: CanMatchFn = () => inject(AuthService).isSuperAdmin() || inject(Router).createUrlTree(['/']);

/** El login solo se ve sin sesión. */
export const guestGuard: CanActivateFn = () => !inject(AuthService).isAuthenticated() || inject(Router).createUrlTree(['/']);
