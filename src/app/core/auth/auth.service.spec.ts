import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { LoginResponse } from './auth.model';
import { AuthService } from './auth.service';

const response = (permisos: string[], esSuperAdmin = false): LoginResponse => ({
  token: 't',
  expiraEn: new Date(Date.now() + 3600_000).toISOString(),
  usuario: { id: '1', email: 'a@b.co', nombre: 'Ana Torres', empresa: 'demo', razonSocial: 'Demo', rol: 'Compras', esSuperAdmin, tipoEmpresa: 'CONSTRUCTORA' },
  permisos,
});

describe('AuthService', () => {
  let auth: AuthService;
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([{ path: 'login', children: [] }])] });
    auth = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => localStorage.clear());

  async function login(body: LoginResponse): Promise<void> {
    const done = auth.login({ empresa: 'demo', email: 'a@b.co', password: 'x' });
    http.expectOne('/api/auth/login').flush(body);
    await done;
  }

  it('allows only the actions the role has', async () => {
    await login(response(['insumos:ver', 'insumos:editar']));

    expect(auth.isAuthenticated()).toBeTrue();
    expect(auth.can('insumos')).toBeTrue();
    expect(auth.can('insumos', 'editar')).toBeTrue();
    expect(auth.can('insumos', 'eliminar')).toBeFalse();
    expect(auth.canAny(['usuarios', 'roles'])).toBeFalse();
  });

  it('gives the superadmin every permission and lets them act on another company', async () => {
    await login(response([], true));

    auth.setActingTenant('acme');

    expect(auth.can('empresas', 'insertar')).toBeTrue();
    expect(auth.actingTenant()).toBe('acme');
  });

  it('ignores the acting company for normal users', async () => {
    await login(response(['insumos:ver']));

    auth.setActingTenant('acme');

    expect(auth.actingTenant()).toBeNull();
  });

  it('keeps the session across reloads and clears it on logout', async () => {
    await login(response(['insumos:ver']));
    expect(JSON.parse(localStorage.getItem('ip.session')!).token).toBe('t');

    auth.logout();

    expect(auth.isAuthenticated()).toBeFalse();
    expect(localStorage.getItem('ip.session')).toBeNull();
  });
});
