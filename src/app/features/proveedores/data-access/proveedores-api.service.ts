import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../../../core/config/api.config';
import { PageQuery, Paged, toParams } from '../../../shared/data/paged-list';
import { TipoInsumo, UnidadMedida } from '../../mantenimiento/models/mantenimiento.model';
import {
  CreateProveedorDto,
  PrecioProveedor,
  PrecioProveedorDto,
  ProductoFiltro,
  ProductoProveedor,
  ProductoProveedorDto,
  Proveedor,
} from '../models/proveedores.model';

/** Acceso HTTP al catálogo propio (`/proveedor/productos`) y al directorio de proveedores (`/proveedores`). */
@Injectable()
export class ProveedoresApiService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(API_BASE_URL);
  private readonly catalogoUrl = `${this.apiUrl}/proveedor/productos`;

  // Catálogos globales para el formulario de productos
  tipos(): Observable<Paged<TipoInsumo>> {
    return this.http.get<Paged<TipoInsumo>>(`${this.apiUrl}/mantenimiento/tipos-insumo`, { params: { pageSize: '100' } });
  }

  unidades(): Observable<Paged<UnidadMedida>> {
    return this.http.get<Paged<UnidadMedida>>(`${this.apiUrl}/mantenimiento/unidades-medida`, { params: { pageSize: '100' } });
  }

  // Productos
  listProductos(query: PageQuery, filtro: ProductoFiltro): Observable<Paged<ProductoProveedor>> {
    return this.http.get<Paged<ProductoProveedor>>(this.catalogoUrl, { params: toParams(query, { ...filtro }) });
  }

  getProducto(id: string): Observable<ProductoProveedor> {
    return this.http.get<ProductoProveedor>(`${this.catalogoUrl}/${id}`);
  }

  createProducto(dto: ProductoProveedorDto): Observable<ProductoProveedor> {
    return this.http.post<ProductoProveedor>(this.catalogoUrl, dto);
  }

  updateProducto(id: string, dto: ProductoProveedorDto): Observable<ProductoProveedor> {
    return this.http.put<ProductoProveedor>(`${this.catalogoUrl}/${id}`, dto);
  }

  deleteProducto(id: string): Observable<void> {
    return this.http.delete<void>(`${this.catalogoUrl}/${id}`);
  }

  // Lista de precios
  createPrecio(productoId: string, dto: PrecioProveedorDto): Observable<PrecioProveedor> {
    return this.http.post<PrecioProveedor>(`${this.catalogoUrl}/${productoId}/precios`, dto);
  }

  updatePrecio(productoId: string, id: number, dto: PrecioProveedorDto): Observable<PrecioProveedor> {
    return this.http.put<PrecioProveedor>(`${this.catalogoUrl}/${productoId}/precios/${id}`, dto);
  }

  deletePrecio(productoId: string, id: number): Observable<void> {
    return this.http.delete<void>(`${this.catalogoUrl}/${productoId}/precios/${id}`);
  }

  // Directorio (constructoras)
  listProveedores(query: PageQuery): Observable<Paged<Proveedor>> {
    return this.http.get<Paged<Proveedor>>(`${this.apiUrl}/proveedores`, { params: toParams(query) });
  }

  createProveedor(dto: CreateProveedorDto): Observable<Proveedor> {
    return this.http.post<Proveedor>(`${this.apiUrl}/proveedores`, dto);
  }
}
