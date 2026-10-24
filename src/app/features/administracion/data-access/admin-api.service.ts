import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../../../core/config/api.config';
import { PageQuery, Paged, toParams } from '../../../shared/data/paged-list';
import {
  CreateEmpresaDto,
  CreateUsuarioDto,
  Empresa,
  ModuloInfo,
  Rol,
  RolDto,
  RolResumen,
  UpdateEmpresaDto,
  UpdateUsuarioDto,
  Usuario,
} from '../models/admin.model';

/** Acceso HTTP a `/admin/*`. Sin estado: las páginas guardan el suyo en `PagedList`. */
@Injectable()
export class AdminApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${inject(API_BASE_URL)}/admin`;

  // Empresas (solo superadministrador)
  listEmpresas(query: PageQuery): Observable<Paged<Empresa>> {
    return this.http.get<Paged<Empresa>>(`${this.baseUrl}/empresas`, { params: toParams(query) });
  }

  createEmpresa(dto: CreateEmpresaDto): Observable<Empresa> {
    return this.http.post<Empresa>(`${this.baseUrl}/empresas`, dto);
  }

  updateEmpresa(id: string, dto: UpdateEmpresaDto): Observable<Empresa> {
    return this.http.put<Empresa>(`${this.baseUrl}/empresas/${id}`, dto);
  }

  deactivateEmpresa(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/empresas/${id}`);
  }

  // Usuarios
  listUsuarios(query: PageQuery, rolId?: string | null): Observable<Paged<Usuario>> {
    return this.http.get<Paged<Usuario>>(`${this.baseUrl}/usuarios`, { params: toParams(query, { rolId }) });
  }

  createUsuario(dto: CreateUsuarioDto): Observable<Usuario> {
    return this.http.post<Usuario>(`${this.baseUrl}/usuarios`, dto);
  }

  updateUsuario(id: string, dto: UpdateUsuarioDto): Observable<Usuario> {
    return this.http.put<Usuario>(`${this.baseUrl}/usuarios/${id}`, dto);
  }

  changePassword(id: string, password: string): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/usuarios/${id}/password`, { password });
  }

  deleteUsuario(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/usuarios/${id}`);
  }

  // Roles
  listRoles(query: PageQuery): Observable<Paged<RolResumen>> {
    return this.http.get<Paged<RolResumen>>(`${this.baseUrl}/roles`, { params: toParams(query) });
  }

  getRol(id: string): Observable<Rol> {
    return this.http.get<Rol>(`${this.baseUrl}/roles/${id}`);
  }

  createRol(dto: RolDto): Observable<Rol> {
    return this.http.post<Rol>(`${this.baseUrl}/roles`, dto);
  }

  updateRol(id: string, dto: RolDto): Observable<Rol> {
    return this.http.put<Rol>(`${this.baseUrl}/roles/${id}`, dto);
  }

  deleteRol(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/roles/${id}`);
  }

  listModulos(): Observable<ModuloInfo[]> {
    return this.http.get<ModuloInfo[]>(`${this.baseUrl}/modulos`);
  }
}
