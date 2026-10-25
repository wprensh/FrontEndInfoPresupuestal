import { HttpRequest } from '@angular/common/http';

import { Body, MockResult, noContent, now, ok, page, problem } from './mock-http';

/**
 * Catálogo propio de los proveedores simulado (solo demo y desarrollo). Imita la API:
 * código único por proveedor, precio por ciudad (null = nacional) y fecha, con o sin IVA,
 * y en el listado solo el precio vigente de cada ciudad.
 */

interface ProductoRow {
  id: string;
  tenantId: string;
  codigo: string;
  descripcion: string;
  tipoInsumoId: number;
  unidadMedidaId: number;
  marca: string | null;
  categoria: string | null;
  activo: boolean;
  creadoEn: string;
  actualizadoEn: string;
}

interface PrecioRow {
  id: number;
  tenantId: string;
  productoId: string;
  ciudad: string | null;
  valor: number;
  incluyeIva: boolean;
  ivaPct: number;
  moneda: string;
  fechaVigencia: string;
}

type Catalogo = { id: number; codigo: string; nombre: string }[];

const productos: ProductoRow[] = [];
const precios: PrecioRow[] = [];
let precioSeq = 0;
let productoSeq = 0;

const redondear = (v: number) => Math.round(v * 100) / 100;
const normCiudad = (c: unknown) => (typeof c === 'string' && c.trim() ? c.trim().replace(/\s+/g, ' ').toUpperCase() : null);
const normCodigo = (c: unknown) => String(c ?? '').trim().toUpperCase();

function precioDto(p: PrecioRow) {
  const { tenantId: _tenant, ...rest } = p;
  return {
    ...rest,
    valorSinIva: p.incluyeIva ? redondear(p.valor / (1 + p.ivaPct)) : p.valor,
    valorConIva: p.incluyeIva ? p.valor : redondear(p.valor * (1 + p.ivaPct)),
  };
}

/** Más reciente primero; con `soloVigentes`, uno por ciudad. */
function preciosDe(productoId: string, soloVigentes: boolean) {
  const lista = precios.filter((p) => p.productoId === productoId).sort((a, b) => b.fechaVigencia.localeCompare(a.fechaVigencia));
  if (!soloVigentes) return lista.map(precioDto);
  const vistos = new Set<string>();
  return lista
    .filter((p) => !vistos.has(p.ciudad ?? '') && vistos.add(p.ciudad ?? ''))
    .sort((a, b) => (a.ciudad ?? '').localeCompare(b.ciudad ?? ''))
    .map(precioDto);
}

function productoDto(p: ProductoRow, tipos: Catalogo, unidades: Catalogo, soloVigentes: boolean) {
  const { tenantId: _tenant, creadoEn: _creado, ...rest } = p;
  return {
    ...rest,
    tipo: tipos.find((t) => t.id === p.tipoInsumoId)?.nombre ?? '',
    unidad: unidades.find((u) => u.id === p.unidadMedidaId)?.codigo ?? '',
    precios: preciosDe(p.id, soloVigentes),
  };
}

export const contarProductos = (tenantId: string): number => productos.filter((p) => p.tenantId === tenantId && p.activo).length;

// ---------------- Datos iniciales: un proveedor de ejemplo ----------------

function seed(codigo: string, descripcion: string, unidad: number, marca: string, categoria: string, lista: [string | null, number, boolean][]): void {
  const id = `00000000-0000-4000-9000-${String(++productoSeq).padStart(12, '0')}`;
  productos.push({ id, tenantId: 'ferreteria', codigo, descripcion, tipoInsumoId: 1, unidadMedidaId: unidad, marca, categoria, activo: true, creadoEn: now(), actualizadoEn: now() });
  for (const [ciudad, valor, incluyeIva] of lista) {
    precios.push({ id: ++precioSeq, tenantId: 'ferreteria', productoId: id, ciudad, valor, incluyeIva, ivaPct: 0.19, moneda: 'COP', fechaVigencia: '2026-10-01' });
  }
}

seed('CEM-50', 'CEMENTO GRIS USO GENERAL 50 KG', 6, 'Argos', 'Cementos', [[null, 32000, false], ['BOGOTÁ', 35700, true], ['MEDELLÍN', 31500, false]]);
seed('VAR-12', 'VARILLA CORRUGADA 1/2" X 6 M', 1, 'Diaco', 'Aceros', [[null, 28500, false], ['BOGOTÁ', 34000, true]]);
seed('BLK-15', 'BLOQUE DE CONCRETO 15 X 20 X 40', 1, 'Ladrillera Santa Fe', 'Mampostería', [[null, 2900, false]]);
seed('PVC-4', 'TUBO PVC SANITARIO 4" X 6 M', 1, 'Pavco', 'Hidráulicos', [[null, 98000, true], ['CALI', 81000, false]]);
seed('MAL-15', 'MALLA ELECTROSOLDADA 15 X 15 CM 4 MM', 1, 'Gerdau', 'Aceros', [[null, 185000, false]]);
seed('PIN-T1', 'PINTURA VINILO TIPO 1 BLANCO', 7, 'Pintuco', 'Pinturas', [[null, 78000, false]]);
precios.push({ id: ++precioSeq, tenantId: 'ferreteria', productoId: productos[0].id, ciudad: null, valor: 30500, incluyeIva: false, ivaPct: 0.19, moneda: 'COP', fechaVigencia: '2026-06-01' });

// ---------------- Rutas: /proveedor/productos[/:id[/precios[/:precioId]]] ----------------

export function handleProveedoresMock(
  req: HttpRequest<unknown>,
  tenant: string,
  id: string | undefined,
  sub: string | undefined,
  subId: string | undefined,
  body: Body,
  tipos: Catalogo,
  unidades: Catalogo,
): MockResult {
  const propios = productos.filter((p) => p.tenantId === tenant);
  const producto = propios.find((p) => p.id === id);

  if (!id && req.method === 'GET') {
    const tipo = req.params.get('tipoInsumoId');
    const activo = req.params.get('activo');
    const filtrados = propios
      .filter((p) => (!tipo || p.tipoInsumoId === Number(tipo)) && (activo === null || String(p.activo) === activo))
      .sort((a, b) => a.descripcion.localeCompare(b.descripcion));
    return page(req, filtrados.map((p) => productoDto(p, tipos, unidades, true)), (p) => `${p.codigo} ${p.descripcion} ${p.marca ?? ''}`);
  }

  if (sub === 'precios') {
    if (!producto) return problem(404, 'CatalogoProveedor.ProductoNotFound', 'No existe el producto.');
    const precio = precios.find((p) => p.productoId === producto.id && p.id === Number(subId));
    if (req.method === 'DELETE') {
      if (!precio) return problem(404, 'CatalogoProveedor.PrecioNotFound', 'No existe el precio.');
      precios.splice(precios.indexOf(precio), 1);
      return noContent();
    }
    const datos = {
      ciudad: normCiudad(body['ciudad']),
      valor: Number(body['valor']),
      incluyeIva: body['incluyeIva'] === true,
      ivaPct: Number(body['ivaPct'] ?? 0.19),
      moneda: String(body['moneda'] ?? 'COP'),
      fechaVigencia: String(body['fechaVigencia']),
    };
    if (!(datos.valor > 0)) return problem(400, 'Validation', 'El valor debe ser mayor que cero.');
    const repetido = precios.some((p) => p.productoId === producto.id && p.id !== precio?.id && p.ciudad === datos.ciudad && p.fechaVigencia === datos.fechaVigencia);
    if (repetido) return problem(409, 'CatalogoProveedor.PrecioDuplicado', 'Ya hay un precio para esa ciudad con esa fecha de vigencia. Corrígelo en lugar de agregar otro.');
    if (req.method === 'POST') {
      const nuevo: PrecioRow = { id: ++precioSeq, tenantId: tenant, productoId: producto.id, ...datos };
      precios.push(nuevo);
      return ok(precioDto(nuevo), 201);
    }
    if (!precio) return problem(404, 'CatalogoProveedor.PrecioNotFound', 'No existe el precio.');
    return ok(precioDto(Object.assign(precio, datos)));
  }

  if (req.method === 'POST' || req.method === 'PUT') {
    if (req.method === 'PUT' && !producto) return problem(404, 'CatalogoProveedor.ProductoNotFound', 'No existe el producto.');
    const codigo = normCodigo(body['codigo']);
    if (propios.some((p) => p.id !== producto?.id && p.codigo === codigo)) return problem(409, 'CatalogoProveedor.CodigoDuplicado', `Ya tienes un producto con el código '${codigo}'.`);
    const datos = {
      codigo,
      descripcion: String(body['descripcion'] ?? '').trim().replace(/\s+/g, ' ').toUpperCase(),
      tipoInsumoId: Number(body['tipoInsumoId']),
      unidadMedidaId: Number(body['unidadMedidaId']),
      marca: (body['marca'] as string | null) ?? null,
      categoria: (body['categoria'] as string | null) ?? null,
      activo: body['activo'] !== false,
      actualizadoEn: now(),
    };
    if (producto) return ok(productoDto(Object.assign(producto, datos), tipos, unidades, true));
    const nuevo: ProductoRow = { id: crypto.randomUUID(), tenantId: tenant, creadoEn: now(), ...datos };
    productos.push(nuevo);
    return ok(productoDto(nuevo, tipos, unidades, true), 201);
  }

  if (!producto) return problem(404, 'CatalogoProveedor.ProductoNotFound', 'No existe el producto.');
  if (req.method === 'GET') return ok(productoDto(producto, tipos, unidades, false));
  productos.splice(productos.indexOf(producto), 1);
  for (let i = precios.length - 1; i >= 0; i--) if (precios[i].productoId === producto.id) precios.splice(i, 1);
  return noContent();
}


// ---------------- Consulta de las constructoras: /proveedores/productos ----------------

/** Productos activos de los proveedores que `razonSocial` reconoce (activos), con precios vigentes por ciudad. */
export function buscarProductosMock(req: HttpRequest<unknown>, razonSocial: (tenant: string) => string | undefined, tipos: Catalogo, unidades: Catalogo): MockResult {
  const proveedor = req.params.get('proveedor');
  const tipo = req.params.get('tipoInsumoId');
  const ciudad = normCiudad(req.params.get('ciudad'));
  const filas = productos
    .filter((p) => p.activo && razonSocial(p.tenantId) && (!proveedor || p.tenantId === proveedor) && (!tipo || p.tipoInsumoId === Number(tipo)))
    .map((p) => {
      const dto = productoDto(p, tipos, unidades, true);
      return { ...dto, proveedor: p.tenantId, razonSocial: razonSocial(p.tenantId)!, precios: dto.precios.filter((x) => !ciudad || x.ciudad === null || x.ciudad === ciudad) };
    })
    .filter((p) => !ciudad || p.precios.length > 0)
    .sort((a, b) => a.descripcion.localeCompare(b.descripcion));
  return page(req, filas, (p) => `${p.codigo} ${p.descripcion} ${p.marca ?? ''} ${p.categoria ?? ''}`);
}

export interface PrecioImportable {
  precioId: number;
  productoId: string;
  proveedor: string;
  codigo: string;
  descripcion: string;
  tipoInsumoId: number;
  unidadMedidaId: number;
  categoria: string | null;
  ciudad: string | null;
  valorSinIva: number;
  fechaVigencia: string;
}

/** Datos de cada precio pedido, o null si alguno no existe o su producto ya no está publicado. */
export function preciosImportables(ids: number[], activo: (tenant: string) => boolean): PrecioImportable[] | null {
  const filas = ids.map((id) => {
    const precio = precios.find((p) => p.id === id);
    const producto = precio && productos.find((p) => p.id === precio.productoId && p.activo && activo(p.tenantId));
    if (!precio || !producto) return null;
    return {
      precioId: id,
      productoId: producto.id,
      proveedor: producto.tenantId,
      codigo: producto.codigo,
      descripcion: producto.descripcion,
      tipoInsumoId: producto.tipoInsumoId,
      unidadMedidaId: producto.unidadMedidaId,
      categoria: producto.categoria,
      ciudad: precio.ciudad,
      valorSinIva: precioDto(precio).valorSinIva,
      fechaVigencia: precio.fechaVigencia,
    };
  });
  return filas.every((f) => f !== null) ? (filas as PrecioImportable[]) : null;
}
