import { HttpHeaders, HttpParams, HttpRequest } from '@angular/common/http';

import { MockResult, handleAdminMock } from './admin.mock';

const call = (method: string, url: string, body: unknown = null, token?: string, params: Record<string, string> = {}): MockResult => {
  let headers = new HttpHeaders();
  if (token) headers = headers.set('Authorization', `Bearer ${token}`);
  const req = new HttpRequest(method, `/api${url}`, body, { headers, params: new HttpParams({ fromObject: params }) });
  return handleAdminMock(req)!;
};

const login = (empresa: string, email: string, password: string) => call('POST', '/auth/login', { empresa, email, password });
const token = (r: MockResult) => (r.body as { token: string }).token;
const total = (r: MockResult) => (r.body as { total: number }).total;

describe('admin mock backend', () => {
  it('logs in with the demo users and rejects bad credentials', () => {
    expect(login('demo', 'admin@demo.local', 'Admin123*').status).toBe(200);
    expect(login('demo', 'admin@demo.local', 'otra').status).toBe(401);
    expect(login('acme', 'consulta@demo.local', 'Consulta123').status).toBe(401);
  });

  it('keeps each company data apart', () => {
    const demo = token(login('demo', 'admin@demo.local', 'Admin123*'));
    const acme = token(login('acme', 'admin@acme.local', 'Admin123*'));

    expect(total(call('GET', '/mantenimiento/insumos', null, demo))).toBeGreaterThan(0);
    expect(total(call('GET', '/mantenimiento/insumos', null, acme))).toBe(0);
  });

  it('enforces read-only roles and global catalogs', () => {
    const consulta = token(login('demo', 'consulta@demo.local', 'Consulta123'));
    const admin = token(login('demo', 'admin@demo.local', 'Admin123*'));

    expect(call('GET', '/mantenimiento/clasificaciones', null, consulta).status).toBe(200);
    expect(call('POST', '/mantenimiento/clasificaciones', { nombre: 'nueva' }, consulta).status).toBe(403);
    expect(call('POST', '/mantenimiento/unidades-medida', { codigo: 'X', nombre: 'X' }, admin).status).toBe(403);
    expect(call('GET', '/admin/empresas', null, admin).status).toBe(403);
  });

  it('assigns the next insumo code of the type', () => {
    const admin = token(login('demo', 'admin@demo.local', 'Admin123*'));
    const created = call('POST', '/mantenimiento/insumos', { tipoInsumoId: 3, clasificacionId: null, unidadMedidaId: 10, descripcion: '  Soldador   certificado ' }, admin);

    expect(created.status).toBe(201);
    expect((created.body as { codigo: string; descripcion: string }).codigo).toMatch(/^MO-\d{4}$/);
    expect((created.body as { descripcion: string }).descripcion).toBe('Soldador certificado');
  });
});
