import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { delay, of } from 'rxjs';

import { environment } from '../../../environments/environment';
import { BUDGET_ITEMS_MOCK } from './mock-data/budget-items.mock';

/**
 * Backend en memoria para desarrollo. Atiende `/users` y `/budget/items`; el resto
 * de peticiones pasa al servidor real. Se desactiva con `useMockBackend: false`.
 */
const users = [
  { id: '1', firstName: 'Ana', lastName: 'Torres', email: 'ana.torres@infopresupuestal.pe', role: 'admin', active: true, createdAt: '2026-01-15T10:00:00Z' },
  { id: '2', firstName: 'Luis', lastName: 'Ramírez', email: 'luis.ramirez@infopresupuestal.pe', role: 'analyst', active: true, createdAt: '2026-02-03T14:30:00Z' },
  { id: '3', firstName: 'Carmen', lastName: 'Quispe', email: 'carmen.quispe@infopresupuestal.pe', role: 'viewer', active: false, createdAt: '2026-03-21T09:15:00Z' },
];

export const mockBackendInterceptor: HttpInterceptorFn = (req, next) => {
  if (!environment.useMockBackend) {
    return next(req);
  }

  const respond = (body: unknown, status = 200) => of(new HttpResponse({ status, body })).pipe(delay(300));

  if (req.url.includes('/budget/items') && req.method === 'GET') {
    return respond(structuredClone(BUDGET_ITEMS_MOCK));
  }

  if (!req.url.includes('/users')) {
    return next(req);
  }

  const id = req.url.split('/users/')[1];

  switch (req.method) {
    case 'GET':
      return respond([...users]);
    case 'POST': {
      const user = { ...(req.body as object), id: crypto.randomUUID(), createdAt: new Date().toISOString() };
      users.push(user as (typeof users)[number]);
      return respond(user, 201);
    }
    case 'DELETE': {
      const index = users.findIndex((u) => u.id === id);
      if (index >= 0) users.splice(index, 1);
      return respond(null, 204);
    }
    default:
      return next(req);
  }
};
