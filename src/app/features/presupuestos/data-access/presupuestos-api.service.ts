import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { API_BASE_URL } from '../../../core/config/api.config';
import { PageQuery, Paged, toParams } from '../../../shared/data/paged-list';
import { ApuOpcion, EstadoPresupuesto, Presupuesto, PresupuestoDto, PresupuestoResumen, UnidadMedida } from '../models/presupuesto.model';

/** Acceso HTTP a `/presupuestos`, a la búsqueda de APU y a las unidades de medida. */
@Injectable()
export class PresupuestosApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);
  private readonly url = `${this.baseUrl}/presupuestos`;

  list(query: PageQuery, estado: EstadoPresupuesto | null): Observable<Paged<PresupuestoResumen>> {
    return this.http.get<Paged<PresupuestoResumen>>(this.url, { params: toParams(query, { estado }) });
  }

  get(id: string): Observable<Presupuesto> {
    return this.http.get<Presupuesto>(`${this.url}/${id}`);
  }

  create(dto: PresupuestoDto): Observable<Presupuesto> {
    return this.http.post<Presupuesto>(this.url, dto);
  }

  update(id: string, dto: PresupuestoDto): Observable<Presupuesto> {
    return this.http.put<Presupuesto>(`${this.url}/${id}`, dto);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }

  cambiarEstado(id: string, estado: EstadoPresupuesto): Observable<Presupuesto> {
    return this.http.put<Presupuesto>(`${this.url}/${id}/estado`, { estado });
  }

  recalcular(id: string): Observable<Presupuesto> {
    return this.http.post<Presupuesto>(`${this.url}/${id}/recalcular`, {});
  }

  duplicar(id: string): Observable<Presupuesto> {
    return this.http.post<Presupuesto>(`${this.url}/${id}/duplicar`, {});
  }

  /** APU activos para agregar como ítems. */
  buscarApus(texto: string): Observable<ApuOpcion[]> {
    return this.http
      .get<Paged<ApuOpcion>>(`${this.baseUrl}/apus`, { params: toParams({ page: 1, pageSize: 15, search: texto }, { activo: true }) })
      .pipe(map((p) => p.items));
  }

  unidades(): Observable<UnidadMedida[]> {
    return this.http
      .get<Paged<UnidadMedida>>(`${this.baseUrl}/mantenimiento/unidades-medida`, { params: { pageSize: '100' } })
      .pipe(map((p) => p.items));
  }
}
