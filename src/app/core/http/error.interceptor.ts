import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';

interface ProblemDetails {
  title?: string;
  detail?: string;
  message?: string;
  errors?: Record<string, string[]>;
}

/** Normaliza los errores HTTP (ProblemDetails de la API) a un `Error` con mensaje legible para los stores. */
export const errorInterceptor: HttpInterceptorFn = (req, next) =>
  next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      const problem = (typeof err.error === 'object' ? err.error : null) as ProblemDetails | null;
      const validation = problem?.errors ? Object.values(problem.errors).flat().join(' ') : null;
      const message =
        validation ||
        problem?.detail ||
        problem?.message ||
        (err.status === 0
          ? 'No hay conexión con el servidor'
          : err.status === 403
            ? 'No tienes permiso para esta acción'
            : err.status === 429
              ? 'Demasiados intentos. Espera un minuto.'
              : `Error ${err.status}`);
      return throwError(() => Object.assign(new Error(message), { status: err.status }));
    }),
  );
