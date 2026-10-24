import { Injectable, Provider } from '@angular/core';
import { MatPaginatorIntl } from '@angular/material/paginator';

/** Textos del paginador de Angular Material en español. */
@Injectable()
class SpanishPaginatorIntl extends MatPaginatorIntl {
  override itemsPerPageLabel = 'Filas por página';
  override nextPageLabel = 'Página siguiente';
  override previousPageLabel = 'Página anterior';
  override firstPageLabel = 'Primera página';
  override lastPageLabel = 'Última página';
  override getRangeLabel = (page: number, pageSize: number, length: number): string => {
    if (length === 0) return '0 de 0';
    const start = page * pageSize + 1;
    return `${start} – ${Math.min(start + pageSize - 1, length)} de ${length}`;
  };
}

export const providePaginatorIntl = (): Provider => ({ provide: MatPaginatorIntl, useClass: SpanishPaginatorIntl });
