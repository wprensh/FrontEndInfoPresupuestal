import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { API_BASE_URL } from '../config/api.config';
import { Accion, LoginRequest, LoginResponse, Modulo, permiso } from './auth.model';

const STORAGE_KEY = 'ip.session';
const TENANT_KEY = 'ip.acting-tenant';

/**
 * Sesión del usuario (singleton). Guarda el JWT y los permisos que devuelve el login.
 * Los permisos solo deciden qué se muestra: la API vuelve a validarlos en cada solicitud.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly baseUrl = `${inject(API_BASE_URL)}/auth`;

  private readonly session = signal<LoginResponse | null>(this.restore());
  private readonly actingTenantState = signal<string | null>(this.read(TENANT_KEY));

  readonly user = computed(() => this.session()?.usuario ?? null);
  readonly token = computed(() => this.session()?.token ?? null);
  readonly isAuthenticated = computed(() => this.session() !== null);
  readonly isSuperAdmin = computed(() => this.user()?.esSuperAdmin === true);
  private readonly permisos = computed(() => new Set(this.session()?.permisos ?? []));

  /** Empresa sobre la que actúa el superadministrador (header `X-Tenant-Id`); null = la propia. */
  readonly actingTenant = computed(() => (this.isSuperAdmin() ? this.actingTenantState() : null));

  async login(request: LoginRequest): Promise<void> {
    const response = await firstValueFrom(this.http.post<LoginResponse>(`${this.baseUrl}/login`, request));
    this.session.set(response);
    this.setActingTenant(null);
    this.write(STORAGE_KEY, JSON.stringify(response));
  }

  logout(): void {
    this.session.set(null);
    this.setActingTenant(null);
    this.write(STORAGE_KEY, null);
    void this.router.navigate(['/login']);
  }

  can(modulo: Modulo, accion: Accion = 'ver'): boolean {
    return this.isSuperAdmin() || this.permisos().has(permiso(modulo, accion));
  }

  canAny(modulos: readonly Modulo[]): boolean {
    return modulos.some((m) => this.can(m));
  }

  setActingTenant(tenantId: string | null): void {
    this.actingTenantState.set(tenantId);
    this.write(TENANT_KEY, tenantId);
  }

  private restore(): LoginResponse | null {
    const raw = this.read(STORAGE_KEY);
    if (!raw) return null;
    try {
      const session = JSON.parse(raw) as LoginResponse;
      return new Date(session.expiraEn).getTime() > Date.now() ? session : null;
    } catch {
      return null;
    }
  }

  private read(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  private write(key: string, value: string | null): void {
    try {
      if (value === null) localStorage.removeItem(key);
      else localStorage.setItem(key, value);
    } catch {
      // Sin almacenamiento (modo privado): la sesión dura lo que la pestaña.
    }
  }
}
