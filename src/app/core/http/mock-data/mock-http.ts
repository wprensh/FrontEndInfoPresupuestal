import { HttpRequest } from '@angular/common/http';

/** Respuestas y paginación comunes de los backends simulados. */

export interface MockResult {
  status: number;
  body: unknown;
}

export type Body = Record<string, unknown>;

export const now = () => new Date().toISOString();
export const problem = (status: number, title: string, detail: string): MockResult => ({ status, body: { status, title, detail } });
export const ok = (body: unknown, status = 200): MockResult => ({ status, body });
export const noContent = (): MockResult => ({ status: 204, body: null });
export const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function page<T>(req: HttpRequest<unknown>, rows: T[], text: (row: T) => string): MockResult {
  const p = Math.max(1, Number(req.params.get('page') ?? 1));
  const size = Math.min(100, Math.max(1, Number(req.params.get('pageSize') ?? 20)));
  const search = norm(req.params.get('search') ?? '');
  const filtered = search ? rows.filter((r) => norm(text(r)).includes(search)) : rows;
  return ok({ items: filtered.slice((p - 1) * size, p * size), page: p, pageSize: size, total: filtered.length });
}
