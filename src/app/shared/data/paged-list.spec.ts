import { of, throwError } from 'rxjs';

import { PageQuery, PagedList, toParams } from './paged-list';

describe('PagedList', () => {
  it('resets to the first page when searching', async () => {
    const queries: PageQuery[] = [];
    const list = new PagedList<number>((q) => {
      queries.push(q);
      return of({ items: [1, 2], page: q.page, pageSize: q.pageSize, total: 42 });
    });

    await list.setPage(3, 10);
    await list.setSearch('tubo');

    expect(queries.at(-1)).toEqual({ page: 1, pageSize: 10, search: 'tubo' });
    expect(list.total()).toBe(42);
    expect(list.items()).toEqual([1, 2]);
  });

  it('exposes the error and stops loading', async () => {
    const list = new PagedList<number>(() => throwError(() => new Error('Error 500')));

    await list.load();

    expect(list.error()).toBe('Error 500');
    expect(list.loading()).toBeFalse();
  });

  it('builds query params without empty filters', () => {
    expect(toParams({ page: 2, pageSize: 20, search: ' ' }, { tipoInsumoId: 1, clasificacionId: null })).toEqual({ page: '2', pageSize: '20', tipoInsumoId: '1' });
  });
});
