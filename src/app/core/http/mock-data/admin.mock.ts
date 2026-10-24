import { HttpRequest } from '@angular/common/http';

/**
 * Backend simulado de autenticación, administración y mantenimiento (solo demo y desarrollo).
 * Imita las reglas de la API real: datos aislados por empresa, catálogos globales,
 * roles del sistema, códigos de insumo automáticos y errores ProblemDetails.
 */

type Accion = 'ver' | 'insertar' | 'editar' | 'eliminar';

interface ModuloDef {
  codigo: string;
  nombre: string;
  grupo: string;
  alcance: 'Tenant' | 'Global' | 'Plataforma';
}

interface PermisoRow {
  modulo: string;
  ver: boolean;
  insertar: boolean;
  editar: boolean;
  eliminar: boolean;
}

interface EmpresaRow {
  id: string;
  tenantId: string;
  razonSocial: string;
  nit: string | null;
  email: string | null;
  telefono: string | null;
  activo: boolean;
  creadoEn: string;
}

interface RolRow {
  id: string;
  tenantId: string;
  nombre: string;
  descripcion: string | null;
  esSistema: boolean;
  permisos: PermisoRow[];
}

interface UsuarioRow {
  id: string;
  tenantId: string;
  email: string;
  nombre: string;
  rolId: string;
  password: string;
  activo: boolean;
  esSuperAdmin: boolean;
  ultimoAcceso: string | null;
  creadoEn: string;
}

interface ClasificacionRow {
  id: number;
  tenantId: string;
  nombre: string;
  activo: boolean;
}

interface InsumoRow {
  id: string;
  tenantId: string;
  codigo: string;
  tipoInsumoId: number;
  clasificacionId: number | null;
  unidadMedidaId: number;
  descripcion: string;
  activo: boolean;
  actualizadoEn: string;
}

interface PrecioRow {
  id: number;
  tenantId: string;
  insumoId: string;
  valorUnitario: number;
  moneda: string;
  fechaVigencia: string;
  fuente: string | null;
}

export interface MockResult {
  status: number;
  body: unknown;
}

const MODULOS: ModuloDef[] = [
  { codigo: 'empresas', nombre: 'Empresas', grupo: 'Administración', alcance: 'Plataforma' },
  { codigo: 'usuarios', nombre: 'Usuarios', grupo: 'Administración', alcance: 'Tenant' },
  { codigo: 'roles', nombre: 'Roles y permisos', grupo: 'Administración', alcance: 'Tenant' },
  { codigo: 'clasificaciones', nombre: 'Clasificaciones', grupo: 'Mantenimiento', alcance: 'Tenant' },
  { codigo: 'unidades-medida', nombre: 'Unidades de medida', grupo: 'Mantenimiento', alcance: 'Global' },
  { codigo: 'tipos-insumo', nombre: 'Tipos de insumo', grupo: 'Mantenimiento', alcance: 'Global' },
  { codigo: 'insumos', nombre: 'Insumos', grupo: 'Mantenimiento', alcance: 'Tenant' },
  { codigo: 'precios-insumo', nombre: 'Precios de insumos', grupo: 'Mantenimiento', alcance: 'Tenant' },
  { codigo: 'productos', nombre: 'Productos', grupo: 'Catálogo', alcance: 'Tenant' },
];
const ACCIONES: Accion[] = ['ver', 'insertar', 'editar', 'eliminar'];
const asignables = (m: ModuloDef): Accion[] => (m.alcance === 'Tenant' ? ACCIONES : m.alcance === 'Global' ? ['ver'] : []);

const now = () => new Date().toISOString();
// Los datos sembrados usan ids fijos: así un token guardado sigue sirviendo después de recargar la página.
let seeding = true;
let seedSeq = 0;
const uuid = () => (seeding ? `00000000-0000-4000-8000-${String(++seedSeq).padStart(12, '0')}` : crypto.randomUUID());

const permisosCompletos = (): PermisoRow[] =>
  MODULOS.filter((m) => m.alcance !== 'Plataforma').map((m) => {
    const a = asignables(m);
    return { modulo: m.codigo, ver: true, insertar: a.includes('insertar'), editar: a.includes('editar'), eliminar: a.includes('eliminar') };
  });
const permisosLectura = (): PermisoRow[] =>
  MODULOS.filter((m) => m.alcance !== 'Plataforma').map((m) => ({ modulo: m.codigo, ver: true, insertar: false, editar: false, eliminar: false }));

// ---------------- Datos iniciales ----------------

const empresas: EmpresaRow[] = [];
const roles: RolRow[] = [];
const usuarios: UsuarioRow[] = [];

function provision(tenantId: string, razonSocial: string, admin: { nombre: string; email: string; password: string; superAdmin?: boolean }): void {
  empresas.push({ id: uuid(), tenantId, razonSocial, nit: null, email: null, telefono: null, activo: true, creadoEn: now() });
  const administrador: RolRow = { id: uuid(), tenantId, nombre: 'Administrador', descripcion: 'Acceso completo a la empresa.', esSistema: true, permisos: permisosCompletos() };
  const consulta: RolRow = { id: uuid(), tenantId, nombre: 'Consulta', descripcion: 'Solo lectura.', esSistema: true, permisos: permisosLectura() };
  roles.push(administrador, consulta);
  usuarios.push({
    id: uuid(),
    tenantId,
    email: admin.email,
    nombre: admin.nombre,
    rolId: administrador.id,
    password: admin.password,
    activo: true,
    esSuperAdmin: admin.superAdmin ?? false,
    ultimoAcceso: null,
    creadoEn: now(),
  });
}

provision('sistema', 'InfoPresupuestal (plataforma)', { nombre: 'Superadministrador', email: 'superadmin@infopresupuestal.local', password: 'Admin123*', superAdmin: true });
provision('demo', 'Empresa Demo S.A.S.', { nombre: 'Administrador Demo', email: 'admin@demo.local', password: 'Admin123*' });
provision('acme', 'Acme Construcciones S.A.S.', { nombre: 'Administrador Acme', email: 'admin@acme.local', password: 'Admin123*' });
usuarios.push({
  id: uuid(),
  tenantId: 'demo',
  email: 'consulta@demo.local',
  nombre: 'Usuario de consulta',
  rolId: roles.find((r) => r.tenantId === 'demo' && r.nombre === 'Consulta')!.id,
  password: 'Consulta123',
  activo: true,
  esSuperAdmin: false,
  ultimoAcceso: null,
  creadoEn: now(),
});

const tipos = [
  { id: 1, codigo: 'MAT', nombre: 'Material', prefijo: 'MAT' },
  { id: 2, codigo: 'EQU', nombre: 'Equipo', prefijo: 'EQU' },
  { id: 3, codigo: 'MO', nombre: 'Mano de obra', prefijo: 'MO' },
];
const unidades = [
  { id: 1, codigo: 'UN', nombre: 'Unidad' },
  { id: 2, codigo: 'ML', nombre: 'Metro lineal' },
  { id: 3, codigo: 'M2', nombre: 'Metro cuadrado' },
  { id: 4, codigo: 'M3', nombre: 'Metro cúbico' },
  { id: 5, codigo: 'KG', nombre: 'Kilogramo' },
  { id: 6, codigo: 'BTO', nombre: 'Bulto' },
  { id: 7, codigo: 'GL', nombre: 'Galón' },
  { id: 8, codigo: 'HR', nombre: 'Hora' },
  { id: 9, codigo: 'DIA', nombre: 'Día' },
  { id: 10, codigo: 'JOR', nombre: 'Jornal' },
];

let clasificacionSeq = 0;
const clasificaciones: ClasificacionRow[] = ['ACABADOS', 'AGREGADOS', 'CEMENTOS', 'ELECTRICOS', 'HIERROS', 'HIDRAULICOS', 'MADERAS', 'PINTURAS', 'EQUIPOS', 'MANO DE OBRA'].map(
  (nombre) => ({ id: ++clasificacionSeq, tenantId: 'demo', nombre, activo: true }),
);
const clasif = (nombre: string) => clasificaciones.find((c) => c.nombre === nombre)!.id;

const insumos: InsumoRow[] = [];
const precios: PrecioRow[] = [];
let precioSeq = 0;
const seq: Record<string, number> = {};

function addInsumo(tipo: number, clasificacion: string, unidad: string, descripcion: string, valores: [string, number][]): void {
  const prefijo = tipos.find((t) => t.id === tipo)!.prefijo;
  seq[prefijo] = (seq[prefijo] ?? 0) + 1;
  const id = uuid();
  insumos.push({
    id,
    tenantId: 'demo',
    codigo: `${prefijo}-${String(seq[prefijo]).padStart(4, '0')}`,
    tipoInsumoId: tipo,
    clasificacionId: clasif(clasificacion),
    unidadMedidaId: unidades.find((u) => u.codigo === unidad)!.id,
    descripcion,
    activo: true,
    actualizadoEn: now(),
  });
  for (const [fecha, valor] of valores) {
    precios.push({ id: ++precioSeq, tenantId: 'demo', insumoId: id, valorUnitario: valor, moneda: 'COP', fechaVigencia: fecha, fuente: 'Lista de precios 2026' });
  }
}

addInsumo(1, 'CEMENTOS', 'BTO', 'CEMENTO GRIS USO GENERAL 50 KG', [['2025-06-01', 31500], ['2026-01-15', 33900]]);
addInsumo(1, 'AGREGADOS', 'M3', 'ARENA DE PEGA', [['2026-01-15', 98000]]);
addInsumo(1, 'AGREGADOS', 'M3', 'GRAVA TRITURADA 3/4"', [['2026-01-15', 115000]]);
addInsumo(1, 'HIERROS', 'KG', 'ACERO DE REFUERZO 60000 PSI', [['2025-09-01', 4650], ['2026-02-01', 4890]]);
addInsumo(1, 'HIERROS', 'UN', 'VARILLA CORRUGADA 1/2" x 6 M', [['2026-02-01', 28900]]);
addInsumo(1, 'HIDRAULICOS', 'UN', 'TUBO PVC SANITARIO 4" x 6 M', [['2026-01-15', 89500]]);
addInsumo(1, 'HIDRAULICOS', 'UN', 'TUBO PVC PRESION 1/2" RDE 13.5', [['2026-01-15', 21400]]);
addInsumo(1, 'HIDRAULICOS', 'UN', 'CODO PVC SANITARIO 4" x 90°', [['2026-01-15', 9800]]);
addInsumo(1, 'ELECTRICOS', 'ML', 'CABLE COBRE THHN No. 12 AWG', [['2026-01-15', 3200]]);
addInsumo(1, 'ELECTRICOS', 'UN', 'TOMACORRIENTE DOBLE CON POLO A TIERRA', [['2026-01-15', 12500]]);
addInsumo(1, 'ELECTRICOS', 'UN', 'TUBO CONDUIT PVC 1/2" x 3 M', [['2026-01-15', 6900]]);
addInsumo(1, 'MADERAS', 'UN', 'TABLA BURRA 0.30 x 3 M', [['2026-01-15', 18500]]);
addInsumo(1, 'PINTURAS', 'GL', 'PINTURA VINILO TIPO 1 BLANCO', [['2026-01-15', 68900]]);
addInsumo(1, 'ACABADOS', 'M2', 'CERAMICA PISO 45 x 45 TRAFICO 4', [['2026-01-15', 42900]]);
addInsumo(1, 'ACABADOS', 'BTO', 'PEGANTE PARA CERAMICA 25 KG', [['2026-01-15', 27800]]);
addInsumo(1, 'AGREGADOS', 'UN', 'BLOQUE DE CONCRETO 15 x 20 x 40', [['2026-01-15', 2950]]);
addInsumo(2, 'EQUIPOS', 'DIA', 'MEZCLADORA DE CONCRETO 1 BULTO', [['2026-01-15', 85000]]);
addInsumo(2, 'EQUIPOS', 'DIA', 'VIBRADOR DE CONCRETO A GASOLINA', [['2026-01-15', 62000]]);
addInsumo(2, 'EQUIPOS', 'DIA', 'ANDAMIO TUBULAR (SECCIÓN)', [['2026-01-15', 4500]]);
addInsumo(2, 'EQUIPOS', 'HR', 'RETROEXCAVADORA SOBRE LLANTAS', [['2026-01-15', 165000]]);
addInsumo(2, 'EQUIPOS', 'DIA', 'HERRAMIENTA MENOR', []);
addInsumo(3, 'MANO DE OBRA', 'JOR', 'OFICIAL DE CONSTRUCCIÓN', [['2026-01-15', 120000]]);
addInsumo(3, 'MANO DE OBRA', 'JOR', 'AYUDANTE DE CONSTRUCCIÓN', [['2026-01-15', 85000]]);
addInsumo(3, 'MANO DE OBRA', 'JOR', 'ELECTRICISTA', [['2026-01-15', 135000]]);
addInsumo(3, 'MANO DE OBRA', 'JOR', 'PLOMERO', [['2026-01-15', 130000]]);

seeding = false;

// ---------------- Utilidades ----------------

const problem = (status: number, title: string, detail: string): MockResult => ({ status, body: { status, title, detail } });
const ok = (body: unknown, status = 200): MockResult => ({ status, body });
const noContent = (): MockResult => ({ status: 204, body: null });
const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

function page<T>(req: HttpRequest<unknown>, rows: T[], text: (row: T) => string): MockResult {
  const p = Math.max(1, Number(req.params.get('page') ?? 1));
  const size = Math.min(100, Math.max(1, Number(req.params.get('pageSize') ?? 20)));
  const search = norm(req.params.get('search') ?? '');
  const filtered = search ? rows.filter((r) => norm(text(r)).includes(search)) : rows;
  return ok({ items: filtered.slice((p - 1) * size, p * size), page: p, pageSize: size, total: filtered.length });
}

/** El token del mock es `mock.<base64 {u, t}>`; no se valida firma, solo sirve para saber quién llama. */
const makeToken = (u: UsuarioRow) => `mock.${btoa(JSON.stringify({ u: u.id, t: u.tenantId }))}`;

interface Caller {
  user: UsuarioRow;
  tenant: string;
}

function caller(req: HttpRequest<unknown>): Caller | null {
  const auth = req.headers.get('Authorization') ?? '';
  const match = /^Bearer mock\.(.+)$/.exec(auth);
  if (!match) return null;
  try {
    const { u } = JSON.parse(atob(match[1])) as { u: string };
    const user = usuarios.find((x) => x.id === u && x.activo);
    if (!user) return null;
    const requested = req.headers.get('X-Tenant-Id');
    return { user, tenant: user.esSuperAdmin && requested ? requested : user.tenantId };
  } catch {
    return null;
  }
}

function permisosDe(user: UsuarioRow): string[] {
  if (user.esSuperAdmin) return MODULOS.flatMap((m) => ACCIONES.map((a) => `${m.codigo}:${a}`));
  const rol = roles.find((r) => r.id === user.rolId);
  return (rol?.permisos ?? []).flatMap((p) => ACCIONES.filter((a) => p[a]).map((a) => `${p.modulo}:${a}`));
}

function can(c: Caller, modulo: string, accion: Accion): boolean {
  if (c.user.esSuperAdmin) return true;
  const def = MODULOS.find((m) => m.codigo === modulo);
  return !!def && asignables(def).includes(accion) && permisosDe(c.user).includes(`${modulo}:${accion}`);
}

const sesion = (u: UsuarioRow) => {
  const empresa = empresas.find((e) => e.tenantId === u.tenantId)!;
  return { id: u.id, email: u.email, nombre: u.nombre, empresa: u.tenantId, razonSocial: empresa.razonSocial, rol: roles.find((r) => r.id === u.rolId)?.nombre ?? '', esSuperAdmin: u.esSuperAdmin };
};

const usuarioDto = (u: UsuarioRow) => {
  const { password: _password, tenantId: _tenant, ...rest } = u;
  return { ...rest, rol: roles.find((r) => r.id === u.rolId)?.nombre ?? '' };
};

const insumoDto = (i: InsumoRow) => {
  const vigente = precios.filter((p) => p.insumoId === i.id).sort((a, b) => b.fechaVigencia.localeCompare(a.fechaVigencia))[0];
  return {
    id: i.id,
    codigo: i.codigo,
    tipoInsumoId: i.tipoInsumoId,
    tipo: tipos.find((t) => t.id === i.tipoInsumoId)?.nombre ?? '',
    clasificacionId: i.clasificacionId,
    clasificacion: clasificaciones.find((c) => c.id === i.clasificacionId)?.nombre ?? null,
    unidadMedidaId: i.unidadMedidaId,
    unidad: unidades.find((u) => u.id === i.unidadMedidaId)?.codigo ?? '',
    descripcion: i.descripcion,
    activo: i.activo,
    precio: vigente ? { valorUnitario: vigente.valorUnitario, moneda: vigente.moneda, fechaVigencia: vigente.fechaVigencia } : null,
    actualizadoEn: i.actualizadoEn,
  };
};

const precioDto = (p: PrecioRow) => {
  const { tenantId: _tenant, ...rest } = p;
  return rest;
};

const METHOD_ACCION: Record<string, Accion> = { GET: 'ver', POST: 'insertar', PUT: 'editar', DELETE: 'eliminar' };
type Body = Record<string, unknown>;

// ---------------- Rutas ----------------

/** Atiende la solicitud si es de auth/admin/mantenimiento; devuelve null si no le corresponde. */
export function handleAdminMock(req: HttpRequest<unknown>): MockResult | null {
  const path = new URL(req.url, 'http://mock').pathname.replace(/^.*?\/api/, '');
  const body = (req.body ?? {}) as Body;

  if (path === '/auth/login' && req.method === 'POST') {
    const empresa = empresas.find((e) => e.tenantId === String(body['empresa'] ?? '').toLowerCase() && e.activo);
    const user = empresa && usuarios.find((u) => u.tenantId === empresa.tenantId && u.email === String(body['email'] ?? '').toLowerCase());
    if (!user || !user.activo || user.password !== body['password']) {
      return problem(401, 'Auth.InvalidCredentials', 'Empresa, correo o contraseña incorrectos.');
    }
    user.ultimoAcceso = now();
    return ok({ token: makeToken(user), expiraEn: new Date(Date.now() + 8 * 3600_000).toISOString(), usuario: sesion(user), permisos: permisosDe(user) });
  }

  if (!path.startsWith('/auth') && !path.startsWith('/admin') && !path.startsWith('/mantenimiento')) return null;

  const c = caller(req);
  if (!c) return problem(401, 'Unauthorized', 'Inicia sesión de nuevo.');
  if (!empresas.some((e) => e.tenantId === c.tenant && e.activo)) return problem(403, 'Tenant.Inactive', 'La empresa no existe o está inactiva.');

  if (path === '/auth/me') return ok({ usuario: sesion(c.user), permisos: permisosDe(c.user) });

  const [, seccion, recurso, id, sub, subId] = path.split('/');
  const accion = METHOD_ACCION[req.method] ?? 'ver';
  const modulo = recurso === 'modulos' ? 'roles' : sub === 'precios' ? 'precios-insumo' : recurso === 'empresas' ? 'empresas' : recurso;
  if (!can(c, modulo, recurso === 'modulos' ? 'ver' : accion)) return problem(403, 'Forbidden', 'No tienes permiso para esta acción.');

  if (seccion === 'admin') return admin(req, c, recurso, id, sub, body);
  if (seccion === 'mantenimiento') return mantenimiento(req, c, recurso, id, sub, subId, body);
  return null;
}

function admin(req: HttpRequest<unknown>, c: Caller, recurso: string, id: string | undefined, sub: string | undefined, body: Body): MockResult | null {
  switch (recurso) {
    case 'modulos':
      return ok(MODULOS.filter((m) => m.alcance !== 'Plataforma').map((m) => ({ ...m, accionesAsignables: asignables(m) })));

    case 'empresas': {
      const empresa = empresas.find((e) => e.id === id);
      if (req.method === 'GET') return page(req, empresas, (e) => `${e.tenantId} ${e.razonSocial} ${e.nit ?? ''}`);
      if (req.method === 'POST') {
        const tenantId = String(body['tenantId']);
        if (empresas.some((e) => e.tenantId === tenantId)) return problem(409, 'Empresas.Duplicada', `Ya existe la empresa '${tenantId}'.`);
        provision(tenantId, String(body['razonSocial']), { nombre: String(body['adminNombre']), email: String(body['adminEmail']).toLowerCase(), password: String(body['adminPassword']) });
        const nueva = empresas.at(-1)!;
        Object.assign(nueva, { nit: body['nit'], email: body['email'], telefono: body['telefono'] });
        return ok(nueva, 201);
      }
      if (!empresa) return problem(404, 'Empresas.NotFound', 'No existe la empresa.');
      if (req.method === 'PUT') {
        Object.assign(empresa, body, { activo: empresa.tenantId === 'sistema' ? true : body['activo'] });
        return ok(empresa);
      }
      if (empresa.tenantId === 'sistema') return problem(409, 'Empresas.Plataforma', 'La empresa de plataforma no se desactiva.');
      empresa.activo = false;
      return noContent();
    }

    case 'roles': {
      const own = roles.filter((r) => r.tenantId === c.tenant);
      const rol = own.find((r) => r.id === id);
      if (req.method === 'GET' && !id) {
        return page(req, [...own].sort((a, b) => Number(b.esSistema) - Number(a.esSistema) || a.nombre.localeCompare(b.nombre)), (r) => r.nombre);
      }
      const nombre = String(body['nombre'] ?? '').trim();
      const dup = () => own.some((r) => r.id !== id && norm(r.nombre) === norm(nombre));
      if (req.method === 'POST') {
        if (dup()) return problem(409, 'Roles.NombreDuplicado', `Ya existe el rol '${nombre}'.`);
        const nuevo: RolRow = { id: uuid(), tenantId: c.tenant, nombre, descripcion: (body['descripcion'] as string) ?? null, esSistema: false, permisos: body['permisos'] as PermisoRow[] };
        roles.push(nuevo);
        return ok(nuevo, 201);
      }
      if (!rol) return problem(404, 'Roles.NotFound', 'No existe el rol.');
      if (req.method === 'GET') return ok({ ...rol, usuarios: undefined });
      if (rol.esSistema) return problem(409, 'Roles.EsSistema', 'Los roles del sistema no se editan ni se eliminan.');
      if (req.method === 'PUT') {
        if (dup()) return problem(409, 'Roles.NombreDuplicado', `Ya existe el rol '${nombre}'.`);
        Object.assign(rol, { nombre, descripcion: body['descripcion'] ?? null, permisos: body['permisos'] });
        return ok(rol);
      }
      if (usuarios.some((u) => u.rolId === rol.id)) return problem(409, 'Roles.EnUso', 'El rol tiene usuarios asignados. Cámbialos de rol antes de eliminarlo.');
      roles.splice(roles.indexOf(rol), 1);
      return noContent();
    }

    case 'usuarios': {
      const own = usuarios.filter((u) => u.tenantId === c.tenant);
      const usuario = own.find((u) => u.id === id);
      if (req.method === 'GET' && !id) return page(req, [...own].sort((a, b) => a.nombre.localeCompare(b.nombre)).map(usuarioDto), (u) => `${u.nombre} ${u.email}`);
      const rolValido = (rolId: unknown) => roles.some((r) => r.id === rolId && r.tenantId === c.tenant);
      if (req.method === 'POST') {
        const email = String(body['email']).toLowerCase();
        if (own.some((u) => u.email === email)) return problem(409, 'Usuarios.EmailDuplicado', `Ya existe un usuario con el correo '${email}' en la empresa.`);
        if (!rolValido(body['rolId'])) return problem(400, 'Usuarios.RolInvalido', 'El rol no existe en la empresa.');
        const nuevo: UsuarioRow = {
          id: uuid(),
          tenantId: c.tenant,
          email,
          nombre: String(body['nombre']),
          rolId: String(body['rolId']),
          password: String(body['password']),
          activo: true,
          esSuperAdmin: false,
          ultimoAcceso: null,
          creadoEn: now(),
        };
        usuarios.push(nuevo);
        return ok(usuarioDto(nuevo), 201);
      }
      if (!usuario) return problem(404, 'Usuarios.NotFound', 'No existe el usuario.');
      if (req.method === 'GET') return ok(usuarioDto(usuario));
      if (req.method === 'PUT' && sub === 'password') {
        usuario.password = String(body['password']);
        return noContent();
      }
      if (req.method === 'PUT') {
        if (usuario.id === c.user.id && (!body['activo'] || body['rolId'] !== usuario.rolId)) return problem(409, 'Usuarios.Propio', 'No puedes desactivarte ni cambiar tu propio rol.');
        if (!rolValido(body['rolId'])) return problem(400, 'Usuarios.RolInvalido', 'El rol no existe en la empresa.');
        Object.assign(usuario, { nombre: body['nombre'], rolId: body['rolId'], activo: body['activo'] });
        return ok(usuarioDto(usuario));
      }
      if (usuario.id === c.user.id || usuario.esSuperAdmin) return problem(409, 'Usuarios.NoEliminable', 'Este usuario no se puede eliminar.');
      usuarios.splice(usuarios.indexOf(usuario), 1);
      return noContent();
    }
  }
  return null;
}

function mantenimiento(
  req: HttpRequest<unknown>,
  c: Caller,
  recurso: string,
  id: string | undefined,
  sub: string | undefined,
  subId: string | undefined,
  body: Body,
): MockResult | null {
  const numId = Number(id);
  switch (recurso) {
    case 'unidades-medida': {
      const unidad = unidades.find((u) => u.id === numId);
      if (req.method === 'GET') return page(req, [...unidades].sort((a, b) => a.codigo.localeCompare(b.codigo)), (u) => `${u.codigo} ${u.nombre}`);
      const codigo = String(body['codigo'] ?? '').trim().toUpperCase();
      if (req.method !== 'DELETE' && unidades.some((u) => u.id !== numId && u.codigo === codigo)) return problem(409, 'UnidadesMedida.CodigoDuplicado', `Ya existe la unidad '${codigo}'.`);
      if (req.method === 'POST') {
        const nueva = { id: Math.max(...unidades.map((u) => u.id)) + 1, codigo, nombre: String(body['nombre']) };
        unidades.push(nueva);
        return ok(nueva, 201);
      }
      if (!unidad) return problem(404, 'UnidadesMedida.NotFound', 'No existe la unidad.');
      if (req.method === 'PUT') return ok(Object.assign(unidad, { codigo, nombre: body['nombre'] }));
      if (insumos.some((i) => i.unidadMedidaId === unidad.id)) return problem(409, 'UnidadesMedida.EnUso', `La unidad '${unidad.codigo}' la usan insumos y no se puede eliminar.`);
      unidades.splice(unidades.indexOf(unidad), 1);
      return noContent();
    }

    case 'tipos-insumo': {
      const tipo = tipos.find((t) => t.id === numId);
      if (req.method === 'GET') return page(req, tipos, (t) => `${t.codigo} ${t.nombre}`);
      if (req.method === 'POST') {
        const nuevo = { id: Math.max(...tipos.map((t) => t.id)) + 1, codigo: String(body['codigo']).toUpperCase(), nombre: String(body['nombre']), prefijo: String(body['prefijo']).toUpperCase() };
        if (tipos.some((t) => t.codigo === nuevo.codigo || t.nombre === nuevo.nombre || t.prefijo === nuevo.prefijo)) return problem(409, 'TiposInsumo.Duplicado', 'Ya existe un tipo con ese código, nombre o prefijo.');
        tipos.push(nuevo);
        return ok(nuevo, 201);
      }
      if (!tipo) return problem(404, 'TiposInsumo.NotFound', 'No existe el tipo.');
      if (req.method === 'PUT') return ok(Object.assign(tipo, { codigo: String(body['codigo']).toUpperCase(), nombre: body['nombre'] }));
      if (insumos.some((i) => i.tipoInsumoId === tipo.id)) return problem(409, 'TiposInsumo.EnUso', `El tipo '${tipo.codigo}' lo usan insumos y no se puede eliminar.`);
      tipos.splice(tipos.indexOf(tipo), 1);
      return noContent();
    }

    case 'clasificaciones': {
      const own = clasificaciones.filter((x) => x.tenantId === c.tenant);
      const clasificacion = own.find((x) => x.id === numId);
      const conInsumos = (x: ClasificacionRow) => ({ id: x.id, nombre: x.nombre, activo: x.activo, insumos: insumos.filter((i) => i.clasificacionId === x.id).length });
      if (req.method === 'GET') {
        const activo = req.params.get('activo');
        const rows = own.filter((x) => activo === null || String(x.activo) === activo).sort((a, b) => a.nombre.localeCompare(b.nombre));
        return page(req, rows.map(conInsumos), (x) => x.nombre);
      }
      const nombre = String(body['nombre'] ?? '').trim().replace(/\s+/g, ' ').toUpperCase();
      if (req.method !== 'DELETE' && own.some((x) => x.id !== numId && x.nombre === nombre)) return problem(409, 'Clasificaciones.NombreDuplicado', `Ya existe la clasificación '${nombre}'.`);
      if (req.method === 'POST') {
        const nueva = { id: ++clasificacionSeq, tenantId: c.tenant, nombre, activo: true };
        clasificaciones.push(nueva);
        return ok(conInsumos(nueva), 201);
      }
      if (!clasificacion) return problem(404, 'Clasificaciones.NotFound', 'No existe la clasificación.');
      if (req.method === 'PUT') return ok(conInsumos(Object.assign(clasificacion, { nombre, activo: body['activo'] })));
      if (insumos.some((i) => i.clasificacionId === clasificacion.id)) return problem(409, 'Clasificaciones.EnUso', 'La clasificación tiene insumos. Desactívala o mueve sus insumos antes de eliminarla.');
      clasificaciones.splice(clasificaciones.indexOf(clasificacion), 1);
      return noContent();
    }

    case 'insumos': {
      const own = insumos.filter((i) => i.tenantId === c.tenant);
      const insumo = own.find((i) => i.id === id);
      if (sub === 'precios') return preciosMock(req, c, insumo, subId, body);
      if (req.method === 'GET' && !id) {
        const tipo = req.params.get('tipoInsumoId');
        const clas = req.params.get('clasificacionId');
        const rows = own.filter((i) => (!tipo || i.tipoInsumoId === Number(tipo)) && (!clas || i.clasificacionId === Number(clas))).sort((a, b) => a.codigo.localeCompare(b.codigo));
        return page(req, rows.map(insumoDto), (i) => `${i.codigo} ${i.descripcion}`);
      }
      const descripcion = String(body['descripcion'] ?? '').trim().replace(/\s+/g, ' ');
      if (req.method === 'POST') {
        const tipo = tipos.find((t) => t.id === body['tipoInsumoId']);
        if (!tipo) return problem(400, 'Insumos.TipoInvalido', 'No existe el tipo de insumo.');
        if (own.some((i) => i.tipoInsumoId === tipo.id && i.unidadMedidaId === body['unidadMedidaId'] && norm(i.descripcion) === norm(descripcion))) {
          return problem(409, 'Insumos.Duplicado', 'Ya existe un insumo del mismo tipo con esa descripción y unidad.');
        }
        const ultimo = own.filter((i) => i.codigo.startsWith(`${tipo.prefijo}-`)).map((i) => Number(i.codigo.split('-')[1])).reduce((a, b) => Math.max(a, b), 0);
        const nuevo: InsumoRow = {
          id: uuid(),
          tenantId: c.tenant,
          codigo: `${tipo.prefijo}-${String(ultimo + 1).padStart(4, '0')}`,
          tipoInsumoId: tipo.id,
          clasificacionId: (body['clasificacionId'] as number | null) ?? null,
          unidadMedidaId: Number(body['unidadMedidaId']),
          descripcion,
          activo: true,
          actualizadoEn: now(),
        };
        insumos.push(nuevo);
        return ok(insumoDto(nuevo), 201);
      }
      if (!insumo) return problem(404, 'Insumos.NotFound', 'No existe el insumo.');
      if (req.method === 'GET') return ok(insumoDto(insumo));
      if (req.method === 'PUT') {
        Object.assign(insumo, { descripcion, clasificacionId: body['clasificacionId'] ?? null, unidadMedidaId: body['unidadMedidaId'], activo: body['activo'], actualizadoEn: now() });
        return ok(insumoDto(insumo));
      }
      insumos.splice(insumos.indexOf(insumo), 1);
      for (let i = precios.length - 1; i >= 0; i--) if (precios[i].insumoId === insumo.id) precios.splice(i, 1);
      return noContent();
    }
  }
  return null;
}

function preciosMock(req: HttpRequest<unknown>, c: Caller, insumo: InsumoRow | undefined, subId: string | undefined, body: Body): MockResult {
  if (!insumo) return problem(404, 'Insumos.NotFound', 'No existe el insumo.');
  const propios = precios.filter((p) => p.insumoId === insumo.id);
  const precio = propios.find((p) => p.id === Number(subId));
  if (req.method === 'GET') return ok([...propios].sort((a, b) => b.fechaVigencia.localeCompare(a.fechaVigencia)).map(precioDto));
  const fecha = String(body['fechaVigencia'] ?? '');
  if (req.method !== 'DELETE' && propios.some((p) => p.id !== precio?.id && p.fechaVigencia === fecha)) {
    return problem(409, 'PreciosInsumo.FechaDuplicada', `El insumo ya tiene un precio con vigencia ${fecha}.`);
  }
  if (req.method === 'POST') {
    const nuevo: PrecioRow = {
      id: ++precioSeq,
      tenantId: c.tenant,
      insumoId: insumo.id,
      valorUnitario: Math.round(Number(body['valorUnitario']) * 100) / 100,
      moneda: String(body['moneda'] ?? 'COP'),
      fechaVigencia: fecha,
      fuente: (body['fuente'] as string | null) ?? null,
    };
    precios.push(nuevo);
    return ok(precioDto(nuevo), 201);
  }
  if (!precio) return problem(404, 'PreciosInsumo.NotFound', 'No existe el precio.');
  if (req.method === 'PUT') {
    Object.assign(precio, { valorUnitario: Number(body['valorUnitario']), moneda: body['moneda'] ?? 'COP', fechaVigencia: fecha, fuente: body['fuente'] ?? null });
    return ok(precioDto(precio));
  }
  precios.splice(precios.indexOf(precio), 1);
  return noContent();
}
