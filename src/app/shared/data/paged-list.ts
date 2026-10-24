import { computed, signal } from '@angular/core';
import { Observable, firstValueFrom } from 'rxjs';

/** Respuesta paginada de la API (`PagedResponse<T>`). */
export interface Paged<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

export interface PageQuery {
  page: number;
  pageSize: number;
  search: string;
}

/**
 * Estado de una tabla paginada en el servidor: página, búsqueda, carga y error.
 * Recibe la función que pide la página, así sirve para cualquier listado.
 */
export class PagedList<T> {
  private readonly state = signal<{ data: Paged<T>; loading: boolean; error: string | null }>({
    data: { items: [], page: 1, pageSize: 20, total: 0 },
    loading: false,
    error: null,
  });
  private readonly query = signal<PageQuery>({ page: 1, pageSize: 20, search: '' });

  readonly items = computed(() => this.state().data.items);
  readonly total = computed(() => this.state().data.total);
  readonly loading = computed(() => this.state().loading);
  readonly error = computed(() => this.state().error);
  readonly page = computed(() => this.query().page);
  readonly pageSize = computed(() => this.query().pageSize);
  readonly search = computed(() => this.query().search);

  constructor(private readonly fetch: (query: PageQuery) => Observable<Paged<T>>) {}

  setSearch(search: string): Promise<void> {
    this.query.update((q) => ({ ...q, search, page: 1 }));
    return this.load();
  }

  setPage(page: number, pageSize: number): Promise<void> {
    this.query.update((q) => ({ ...q, page, pageSize }));
    return this.load();
  }

  async load(): Promise<void> {
    this.state.update((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await firstValueFrom(this.fetch(this.query()));
      this.state.set({ data, loading: false, error: null });
    } catch (e) {
      this.state.update((s) => ({ ...s, loading: false, error: e instanceof Error ? e.message : 'Error inesperado' }));
    }
  }
}

/** Parámetros `?page=&pageSize=&search=` más filtros opcionales, sin los vacíos. */
export function toParams(query: PageQuery, extra: Record<string, string | number | boolean | null | undefined> = {}): Record<string, string> {
  const params: Record<string, string> = { page: String(query.page), pageSize: String(query.pageSize) };
  if (query.search.trim()) params['search'] = query.search.trim();
  for (const [key, value] of Object.entries(extra)) {
    if (value !== null && value !== undefined && value !== '') params[key] = String(value);
  }
  return params;
}
