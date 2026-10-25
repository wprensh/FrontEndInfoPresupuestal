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

  it('builds budgets from APUs with consecutive codes and AIU totals', () => {
    const admin = token(login('demo', 'admin@demo.local', 'Admin123*'));
    const apu = (call('GET', '/apus', null, admin).body as { items: { id: string; costos: { costoDirecto: number } }[] }).items[0];

    const created = call('POST', '/presupuestos', {
      nombreObra: 'Prueba', administracionPct: 0.1, imprevistosPct: 0.02, utilidadPct: 0.04, ivaUtilidadPct: 0.16,
      capitulos: [{ nombre: 'Obra', items: [{ apuId: apu.id, cantidad: 2 }, { apuId: null, descripcion: 'Aseo', unidadMedidaId: 1, cantidad: 1, valorUnitario: 1000 }] }],
    }, admin);
    const body = created.body as { id: string; capitulos: { items: { codigo: string; valorUnitario: number }[] }[]; totales: { costoDirecto: number } };

    expect(created.status).toBe(201);
    expect(body.capitulos[0].items.map((i) => i.codigo)).toEqual(['1.1', '1.2']);
    expect(body.capitulos[0].items[0].valorUnitario).toBe(apu.costos.costoDirecto);
    expect(call('DELETE', `/apus/${apu.id}`, null, admin).status).toBe(409);

    expect(call('PUT', `/presupuestos/${body.id}/estado`, { estado: 'APROBADO' }, admin).status).toBe(200);
    expect(call('PUT', `/presupuestos/${body.id}`, { nombreObra: 'Otra', capitulos: [] }, admin).status).toBe(409);
    expect(call('DELETE', `/presupuestos/${body.id}`, null, admin).status).toBe(409);
    expect(call('POST', `/presupuestos/${body.id}/duplicar`, {}, admin).status).toBe(201);
  });

  it('lets the read-only role see budgets but not change them', () => {
    const consulta = token(login('demo', 'consulta@demo.local', 'Consulta123'));
    const pre = (call('GET', '/presupuestos', null, consulta).body as { items: { id: string }[] }).items[0];

    expect(call('GET', `/presupuestos/${pre.id}`, null, consulta).status).toBe(200);
    expect(call('POST', `/presupuestos/${pre.id}/recalcular`, {}, consulta).status).toBe(403);
    expect(call('POST', `/presupuestos/${pre.id}/duplicar`, {}, consulta).status).toBe(403);
  });

  it('separates supplier catalogues from constructora screens', () => {
    const proveedor = login('ferreteria', 'ventas@ferreteria.local', 'Proveedor123');
    const sesion = proveedor.body as { usuario: { tipoEmpresa: string }; permisos: string[] };
    expect(sesion.usuario.tipoEmpresa).toBe('PROVEEDOR');
    expect(sesion.permisos).toContain('catalogo-proveedor:insertar');
    expect(sesion.permisos).not.toContain('insumos:ver');

    const prov = token(proveedor);
    const demo = token(login('demo', 'admin@demo.local', 'Admin123*'));
    expect(call('GET', '/proveedor/productos', null, demo).status).toBe(403);
    expect(call('GET', '/proveedores', null, prov).status).toBe(403);
    expect(total(call('GET', '/proveedores', null, demo))).toBeGreaterThan(0);

    const creado = call('POST', '/proveedor/productos', { codigo: 'ark-1', descripcion: 'Arena de río', tipoInsumoId: 1, unidadMedidaId: 4, activo: true }, prov);
    expect(creado.status).toBe(201);
    const id = (creado.body as { id: string }).id;
    expect(call('POST', '/proveedor/productos', { codigo: 'ARK-1', descripcion: 'Otra', tipoInsumoId: 1, unidadMedidaId: 4 }, prov).status).toBe(409);

    const conIva = call('POST', `/proveedor/productos/${id}/precios`, { valor: 35700, incluyeIva: true, ivaPct: 0.19, ciudad: 'bogotá', fechaVigencia: '2026-10-01' }, prov);
    expect(conIva.body).toEqual(jasmine.objectContaining({ ciudad: 'BOGOTÁ', valorSinIva: 30000, valorConIva: 35700 }));
    expect(call('POST', `/proveedor/productos/${id}/precios`, { valor: 1, ciudad: 'Bogotá', fechaVigencia: '2026-10-01' }, prov).status).toBe(409);
  });

  it('lets a constructora review and import supplier prices into its insumos', () => {
    const demo = token(login('demo', 'admin@demo.local', 'Admin123*'));
    const busqueda = call('GET', '/proveedores/productos', null, demo, { search: 'cemento', ciudad: 'Bogotá' }).body as {
      items: { descripcion: string; precios: { id: number; ciudad: string | null; valorSinIva: number }[] }[];
    };
    const cemento = busqueda.items.find((p) => p.descripcion.startsWith('CEMENTO'))!;
    const bogota = cemento.precios.find((p) => p.ciudad === 'BOGOTÁ')!;
    expect(cemento.precios.some((p) => p.ciudad === 'MEDELLÍN')).toBeFalse();

    const bloque = (call('GET', '/proveedores/productos', null, demo, { search: 'malla' }).body as { items: { precios: { id: number }[] }[] }).items[0].precios[0];
    const revision = call('POST', '/proveedores/importacion/revision', { precioIds: [bogota.id, bloque.id] }, demo).body as { accion: string; precioActual: number | null }[];
    expect(revision.map((r) => r.accion)).toEqual(['ACTUALIZAR', 'CREAR']);
    expect(revision[0].precioActual).toBe(33900);

    const consulta = token(login('demo', 'consulta@demo.local', 'Consulta123'));
    expect(call('POST', '/proveedores/importacion', { items: [{ precioId: bloque.id }] }, consulta).status).toBe(403);

    const resultado = call('POST', '/proveedores/importacion', { items: [{ precioId: bogota.id }, { precioId: bloque.id }] }, demo).body as { creados: number; actualizados: number };
    expect([resultado.creados, resultado.actualizados]).toEqual([1, 1]);
    const otraVez = call('POST', '/proveedores/importacion/revision', { precioIds: [bogota.id, bloque.id] }, demo).body as { accion: string }[];
    expect(otraVez.map((r) => r.accion)).toEqual(['SIN_CAMBIO', 'SIN_CAMBIO']);
  });
});
