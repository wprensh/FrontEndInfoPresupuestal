import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../../../core/config/api.config';
import { ConfiguracionImpresion, ConfiguracionImpresionDto, PresupuestoImpresion } from '../models/impresion.model';

/** Acceso HTTP al formato de impresión de la empresa y a la hoja de un presupuesto. */
@Injectable()
export class ImpresionApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  configuracion(): Observable<ConfiguracionImpresion> {
    return this.http.get<ConfiguracionImpresion>(`${this.baseUrl}/impresion/configuracion`);
  }

  guardar(dto: ConfiguracionImpresionDto): Observable<ConfiguracionImpresion> {
    return this.http.put<ConfiguracionImpresion>(`${this.baseUrl}/impresion/configuracion`, dto);
  }

  presupuesto(id: string): Observable<PresupuestoImpresion> {
    return this.http.get<PresupuestoImpresion>(`${this.baseUrl}/presupuestos/${id}/impresion`);
  }
}
