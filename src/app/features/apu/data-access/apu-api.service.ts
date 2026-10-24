import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { API_BASE_URL } from '../../../core/config/api.config';
import { PageQuery, Paged, toParams } from '../../../shared/data/paged-list';
import { Apu, ApuDto, ApuResumen, InsumoCatalogo, UnidadMedida } from '../models/apu.model';

/** Acceso HTTP a `/apus` y a los catálogos de mantenimiento que usa el formulario. */
@Injectable()
export class ApuApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  list(query: PageQuery, activo: boolean | null = null): Observable<Paged<ApuResumen>> {
    return this.http.get<Paged<ApuResumen>>(`${this.baseUrl}/apus`, { params: toParams(query, { activo }) });
  }

  get(id: string): Observable<Apu> {
    return this.http.get<Apu>(`${this.baseUrl}/apus/${id}`);
  }

  create(dto: ApuDto): Observable<Apu> {
    return this.http.post<Apu>(`${this.baseUrl}/apus`, dto);
  }

  update(id: string, dto: ApuDto): Observable<Apu> {
    return this.http.put<Apu>(`${this.baseUrl}/apus/${id}`, dto);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/apus/${id}`);
  }

  duplicar(id: string): Observable<Apu> {
    return this.http.post<Apu>(`${this.baseUrl}/apus/${id}/duplicar`, {});
  }

  unidades(): Observable<UnidadMedida[]> {
    return this.http
      .get<Paged<UnidadMedida>>(`${this.baseUrl}/mantenimiento/unidades-medida`, { params: { pageSize: '100' } })
      .pipe(map((p) => p.items));
  }

  /** Insumos activos de un tipo cuya descripción o código contiene el texto. */
  buscarInsumos(tipoInsumoId: number, texto: string): Observable<InsumoCatalogo[]> {
    return this.http
      .get<Paged<InsumoCatalogo>>(`${this.baseUrl}/mantenimiento/insumos`, {
        params: toParams({ page: 1, pageSize: 15, search: texto }, { tipoInsumoId, activo: true }),
      })
      .pipe(map((p) => p.items));
  }
}
