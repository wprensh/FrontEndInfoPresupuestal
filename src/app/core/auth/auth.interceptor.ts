import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';

import { AuthService } from './auth.service';

/** Agrega el JWT (y la empresa elegida por el superadministrador). Un 401 cierra la sesión. */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.token();
  const tenant = auth.actingTenant();

  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (tenant) headers['X-Tenant-Id'] = tenant;

  return next(Object.keys(headers).length ? req.clone({ setHeaders: headers }) : req).pipe(
    catchError((err: unknown) => {
      // errorInterceptor (más adentro) ya convirtió el error, pero conserva el status.
      if ((err as { status?: number }).status === 401 && token) {
        auth.logout();
      }
      return throwError(() => err);
    }),
  );
};
