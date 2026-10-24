import { HttpErrorResponse, HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { delay, dematerialize, materialize, of, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { handleAdminMock } from './mock-data/admin.mock';
import { BUDGET_ITEMS_MOCK } from './mock-data/budget-items.mock';

/**
 * Backend en memoria para desarrollo y la demo pública. Atiende `/budget/items` y, con
 * `admin.mock.ts`, el login, la administración y el mantenimiento de tablas. El resto
 * de peticiones pasa al servidor real. Se desactiva con `useMockBackend: false`.
 */
export const mockBackendInterceptor: HttpInterceptorFn = (req, next) => {
  if (!environment.useMockBackend) {
    return next(req);
  }

  if (req.url.includes('/budget/items') && req.method === 'GET') {
    return of(new HttpResponse({ status: 200, body: structuredClone(BUDGET_ITEMS_MOCK) })).pipe(delay(300));
  }

  const result = handleAdminMock(req);
  if (!result) {
    return next(req);
  }

  // materialize/dematerialize hace que el error también espere el retraso simulado.
  const response =
    result.status >= 400
      ? throwError(() => new HttpErrorResponse({ status: result.status, error: result.body, url: req.url }))
      : of(new HttpResponse({ status: result.status, body: structuredClone(result.body) }));
  return response.pipe(materialize(), delay(250), dematerialize());
};
