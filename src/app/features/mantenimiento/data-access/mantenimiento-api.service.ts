import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../../../core/config/api.config';
import { PageQuery, Paged, toParams } from '../../../shared/data/paged-list';
import {
  CatalogoItem,
  Clasificacion,
  CreateInsumoDto,
  Insumo,
  InsumoFiltro,
  PrecioInsumo,
  PrecioInsumoDto,
  TipoInsumo,
  UnidadMedida,
  UpdateInsumoDto,
} from '../models/mantenimiento.model';

/** Acceso HTTP a `/mantenimiento/*`. */
@Injectable()
export class MantenimientoApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${inject(API_BASE_URL)}/mantenimiento`;

  // Catálogos simples (clasificaciones, unidades, tipos)
  listCatalogo(endpoint: string, query: PageQuery): Observable<Paged<CatalogoItem>> {
    return this.http.get<Paged<CatalogoItem>>(`${this.baseUrl}/${endpoint}`, { params: toParams(query) });
  }

  createCatalogo(endpoint: string, dto: Record<string, unknown>): Observable<CatalogoItem> {
    return this.http.post<CatalogoItem>(`${this.baseUrl}/${endpoint}`, dto);
  }

  updateCatalogo(endpoint: string, id: number, dto: Record<string, unknown>): Observable<CatalogoItem> {
    return this.http.put<CatalogoItem>(`${this.baseUrl}/${endpoint}/${id}`, dto);
  }

  deleteCatalogo(endpoint: string, id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${endpoint}/${id}`);
  }

  // Listas completas para los selectores del formulario de insumos
  tipos(): Observable<Paged<TipoInsumo>> {
    return this.http.get<Paged<TipoInsumo>>(`${this.baseUrl}/tipos-insumo`, { params: { pageSize: '100' } });
  }

  unidades(): Observable<Paged<UnidadMedida>> {
    return this.http.get<Paged<UnidadMedida>>(`${this.baseUrl}/unidades-medida`, { params: { pageSize: '100' } });
  }

  clasificaciones(): Observable<Paged<Clasificacion>> {
    return this.http.get<Paged<Clasificacion>>(`${this.baseUrl}/clasificaciones`, { params: { pageSize: '100', activo: 'true' } });
  }

  // Insumos
  listInsumos(query: PageQuery, filtro: InsumoFiltro): Observable<Paged<Insumo>> {
    return this.http.get<Paged<Insumo>>(`${this.baseUrl}/insumos`, { params: toParams(query, { ...filtro }) });
  }

  createInsumo(dto: CreateInsumoDto): Observable<Insumo> {
    return this.http.post<Insumo>(`${this.baseUrl}/insumos`, dto);
  }

  updateInsumo(id: string, dto: UpdateInsumoDto): Observable<Insumo> {
    return this.http.put<Insumo>(`${this.baseUrl}/insumos/${id}`, dto);
  }

  deleteInsumo(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/insumos/${id}`);
  }

  // Historial de precios
  listPrecios(insumoId: string): Observable<PrecioInsumo[]> {
    return this.http.get<PrecioInsumo[]>(`${this.baseUrl}/insumos/${insumoId}/precios`);
  }

  createPrecio(insumoId: string, dto: PrecioInsumoDto): Observable<PrecioInsumo> {
    return this.http.post<PrecioInsumo>(`${this.baseUrl}/insumos/${insumoId}/precios`, dto);
  }

  updatePrecio(insumoId: string, id: number, dto: PrecioInsumoDto): Observable<PrecioInsumo> {
    return this.http.put<PrecioInsumo>(`${this.baseUrl}/insumos/${insumoId}/precios/${id}`, dto);
  }

  deletePrecio(insumoId: string, id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/insumos/${insumoId}/precios/${id}`);
  }
}
