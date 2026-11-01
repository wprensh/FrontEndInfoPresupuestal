import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../../../core/config/api.config';
import { PageQuery, Paged, toParams } from '../../../shared/data/paged-list';
import { GenerarProgramacionDto, Programacion, ProgramacionDto, ProgramacionResumen } from '../models/programacion.model';

/** Acceso HTTP a `/programaciones` y `/presupuestos/:id/programacion`. */
@Injectable()
export class ProgramacionApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  list(query: PageQuery): Observable<Paged<ProgramacionResumen>> {
    return this.http.get<Paged<ProgramacionResumen>>(`${this.baseUrl}/programaciones`, { params: toParams(query) });
  }

  get(presupuestoId: string): Observable<Programacion> {
    return this.http.get<Programacion>(this.url(presupuestoId));
  }

  guardar(presupuestoId: string, dto: ProgramacionDto): Observable<Programacion> {
    return this.http.put<Programacion>(this.url(presupuestoId), dto);
  }

  generar(presupuestoId: string, dto: GenerarProgramacionDto): Observable<Programacion> {
    return this.http.post<Programacion>(`${this.url(presupuestoId)}/generar`, dto);
  }

  eliminar(presupuestoId: string): Observable<void> {
    return this.http.delete<void>(this.url(presupuestoId));
  }

  private url(presupuestoId: string): string {
    return `${this.baseUrl}/presupuestos/${presupuestoId}/programacion`;
  }
}
