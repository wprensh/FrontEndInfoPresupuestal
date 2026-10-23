import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';

/** Normaliza los errores HTTP a un `Error` con mensaje legible para los stores. */
export const errorInterceptor: HttpInterceptorFn = (req, next) =>
  next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      const message =
        err.error?.message ?? (err.status === 0 ? 'No hay conexión con el servidor' : `Error ${err.status}`);
      return throwError(() => new Error(message));
    }),
  );
