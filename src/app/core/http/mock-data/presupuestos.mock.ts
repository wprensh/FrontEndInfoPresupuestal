import { HttpRequest } from '@angular/common/http';

import { Body, MockResult, noContent, norm, now, ok, page, problem } from './mock-http';

/**
 * Backend simulado de `/apus` y `/presupuestos` (solo demo y desarrollo). Repite las
 * fórmulas y reglas de la API: costo del APU por líneas, ítems con copia del costo del
 * APU, consecutivos "capítulo.ítem", AIU con IVA sobre la utilidad y estados.
 */

const MATERIAL = 1;
const EQUIPO = 2;
const MANO_OBRA = 3;

type Estado = 'BORRADOR' | 'APROBADO' | 'ANULADO';
type Unidad = { id: number; codigo: string } | undefined;

interface LineaRow {
  tipo: number;
  insumoId: string | null;
  descripcion: string;
  unidadMedidaId: number | null;
  cantidad: number;
  precioUnitario: number;
  desperdicio: number;
  factorPrestacional: number;
  rendimiento: number;
}

interface ApuRow {
  id: string;
  tenantId: string;
  codigo: string;
  descripcion: string;
  unidadMedidaId: number;
  fecha: string;
  observaciones: string | null;
  activo: boolean;
  lineas: LineaRow[];
  actualizadoEn: string;
}

interface ItemRow {
  apuId: string | null;
  descripcion: string;
  unidadMedidaId: number;
  cantidad: number;
  valorUnitario: number;
}

interface PresupuestoRow {
  id: string;
  tenantId: string;
  codigo: string;
  nombreObra: string;
  cliente: string | null;
  ubicacion: string | null;
  fecha: string;
  propuestaNumero: string | null;
  estado: Estado;
  administracionPct: number;
  imprevistosPct: number;
  utilidadPct: number;
  ivaUtilidadPct: number;
  duracionDias: number | null;
  anticipoPct: number | null;
  observaciones: string | null;
  capitulos: { nombre: string; items: ItemRow[] }[];
  actualizadoEn: string;
}

const centavos = (v: number) => Math.round((v + Number.EPSILON) * 100) / 100;
const hoy = () => now().slice(0, 10);
const texto = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim().replace(/\s+/g, ' ') : null);
const numero = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

// Ids fijos para los datos sembrados, como en admin.mock.ts.
let seq = 0;
const seedId = (prefijo: string) => `00000000-0000-4000-${prefijo}-${String(++seq).padStart(12, '0')}`;
let lineaSeq = 0;

function valorParcial(l: LineaRow): number {
  if (l.tipo === MATERIAL) return l.cantidad * l.precioUnitario * (1 + l.desperdicio);
  if (l.tipo === EQUIPO) return l.cantidad * l.precioUnitario;
  return l.rendimiento > 0 ? (l.precioUnitario * l.factorPrestacional) / l.rendimiento : 0;
}

function costos(a: ApuRow) {
  const suma = (tipo: number) => centavos(a.lineas.filter((l) => l.tipo === tipo).reduce((s, l) => s + centavos(valorParcial(l)), 0));
  const materiales = suma(MATERIAL);
  const equipo = suma(EQUIPO);
  const manoObra = suma(MANO_OBRA);
  return { materiales, equipo, manoObra, costoDirecto: centavos(materiales + equipo + manoObra) };
}

function totales(cd: number, p: PresupuestoRow) {
  const administracion = centavos(cd * p.administracionPct);
  const imprevistos = centavos(cd * p.imprevistosPct);
  const utilidad = centavos(cd * p.utilidadPct);
  const ivaUtilidad = centavos(utilidad * p.ivaUtilidadPct);
  const costosIndirectos = centavos(administracion + imprevistos + utilidad + ivaUtilidad);
  const valorTotal = Math.trunc(centavos(cd + costosIndirectos));
  return {
    costoDirecto: cd,
    administracion,
    imprevistos,
    utilidad,
    totalAiu: centavos(administracion + imprevistos + utilidad),
    ivaUtilidad,
    costosIndirectos,
    valorTotal,
    anticipo: p.anticipoPct === null ? null : centavos(valorTotal * p.anticipoPct),
  };
}

const valorItem = (i: ItemRow) => centavos(i.cantidad * i.valorUnitario);
const costoDirecto = (p: PresupuestoRow) => centavos(p.capitulos.flatMap((c) => c.items).reduce((s, i) => s + valorItem(i), 0));

// ---------------- Datos iniciales ----------------

const M2 = 3;
const M3 = 4;
const ML = 2;
const KG = 5;
const BTO = 6;
const DIA = 9;

const apus: ApuRow[] = [];
const presupuestos: PresupuestoRow[] = [];

const mat = (descripcion: string, unidad: number, cantidad: number, desperdicio: number, precio: number): LineaRow => ({
  tipo: MATERIAL, insumoId: null, descripcion, unidadMedidaId: unidad, cantidad, precioUnitario: precio, desperdicio, factorPrestacional: 1, rendimiento: 1,
});
const equ = (descripcion: string, unidad: number, incidencia: number, precio: number): LineaRow => ({
  tipo: EQUIPO, insumoId: null, descripcion, unidadMedidaId: unidad, cantidad: incidencia, precioUnitario: precio, desperdicio: 0, factorPrestacional: 1, rendimiento: 1,
});
const mo = (descripcion: string, jornal: number, rendimiento: number): LineaRow => ({
  tipo: MANO_OBRA, insumoId: null, descripcion, unidadMedidaId: null, cantidad: 1, precioUnitario: jornal, desperdicio: 0, factorPrestacional: 1.7, rendimiento,
});

function sembrarApu(descripcion: string, unidad: number, lineas: LineaRow[]): string {
  const id = seedId('8100');
  apus.push({ id, tenantId: 'demo', codigo: `APU-${String(apus.length + 1).padStart(4, '0')}`, descripcion, unidadMedidaId: unidad, fecha: '2026-10-01', observaciones: null, activo: true, lineas, actualizadoEn: now() });
  return id;
}

const replanteo = sembrarApu('LOCALIZACION Y REPLANTEO', M2, [mat('TABLA BURRA 0.30 x 3 M', 1, 0.05, 0.05, 18500), equ('HERRAMIENTA MENOR', DIA, 0.02, 15000), mo('OFICIAL DE CONSTRUCCIÓN', 120000, 120), mo('AYUDANTE DE CONSTRUCCIÓN', 85000, 120)]);
const excavacion = sembrarApu('EXCAVACION MANUAL EN MATERIAL COMUN', M3, [equ('HERRAMIENTA MENOR', DIA, 0.1, 15000), mo('AYUDANTE DE CONSTRUCCIÓN', 85000, 3)]);
const concreto = sembrarApu('CONCRETO 3000 PSI PARA ZAPATAS', M3, [
  mat('CEMENTO GRIS USO GENERAL 50 KG', BTO, 7, 0.05, 33900),
  mat('ARENA DE PEGA', M3, 0.56, 0.05, 98000),
  mat('GRAVA TRITURADA 3/4"', M3, 0.84, 0.05, 115000),
  equ('MEZCLADORA DE CONCRETO 1 BULTO', DIA, 0.1, 85000),
  equ('VIBRADOR DE CONCRETO A GASOLINA', DIA, 0.1, 62000),
  mo('OFICIAL DE CONSTRUCCIÓN', 120000, 4),
  mo('AYUDANTE DE CONSTRUCCIÓN', 85000, 2),
]);
const acero = sembrarApu('ACERO DE REFUERZO 60000 PSI FIGURADO', KG, [mat('ACERO DE REFUERZO 60000 PSI', KG, 1, 0.05, 4890), mo('OFICIAL DE CONSTRUCCIÓN', 120000, 200), mo('AYUDANTE DE CONSTRUCCIÓN', 85000, 200)]);
const muro = sembrarApu('MURO EN BLOQUE DE CONCRETO 15 CM', M2, [
  mat('BLOQUE DE CONCRETO 15 x 20 x 40', 1, 12.5, 0.05, 2950),
  mat('CEMENTO GRIS USO GENERAL 50 KG', BTO, 0.25, 0.05, 33900),
  mat('ARENA DE PEGA', M3, 0.03, 0.05, 98000),
  equ('ANDAMIO TUBULAR (SECCIÓN)', DIA, 0.5, 4500),
  mo('OFICIAL DE CONSTRUCCIÓN', 120000, 10),
  mo('AYUDANTE DE CONSTRUCCIÓN', 85000, 10),
]);
const red = sembrarApu('RED SANITARIA PVC 4"', ML, [mat('TUBO PVC SANITARIO 4" x 6 M', 1, 0.17, 0.03, 89500), mat('CODO PVC SANITARIO 4" x 90°', 1, 0.2, 0, 9800), mo('PLOMERO', 130000, 12)]);

const costoDe = (id: string) => costos(apus.find((a) => a.id === id)!).costoDirecto;
const desdeApu = (apuId: string, cantidad: number): ItemRow => {
  const a = apus.find((x) => x.id === apuId)!;
  return { apuId, descripcion: a.descripcion, unidadMedidaId: a.unidadMedidaId, cantidad, valorUnitario: costoDe(apuId) };
};

presupuestos.push({
  id: seedId('8200'),
  tenantId: 'demo',
  codigo: 'PRE-0001',
  nombreObra: 'CONSTRUCCIÓN VIVIENDA UNIFAMILIAR LOTE 12',
  cliente: 'CONSTRUCTORA EJEMPLO S.A.S.',
  ubicacion: 'BOGOTÁ D.C.',
  fecha: '2026-10-15',
  propuestaNumero: '001-2026',
  estado: 'BORRADOR',
  administracionPct: 0.09,
  imprevistosPct: 0.03,
  utilidadPct: 0.08,
  ivaUtilidadPct: 0.19,
  duracionDias: 120,
  anticipoPct: 0.3,
  observaciones: null,
  capitulos: [
    { nombre: 'PRELIMINARES', items: [desdeApu(replanteo, 96), { apuId: null, descripcion: 'CERRAMIENTO PROVISIONAL EN TELA VERDE', unidadMedidaId: ML, cantidad: 40, valorUnitario: 18500 }] },
    { nombre: 'CIMENTACIÓN', items: [desdeApu(excavacion, 18.5), desdeApu(concreto, 9.2), desdeApu(acero, 640)] },
    { nombre: 'MAMPOSTERÍA', items: [desdeApu(muro, 210)] },
    { nombre: 'INSTALACIONES SANITARIAS', items: [desdeApu(red, 36)] },
  ],
  actualizadoEn: now(),
});

// ---------------- Respuestas ----------------

function apuDto(a: ApuRow, unidad: (id: number) => Unidad) {
  const lineas = (tipo: number) =>
    a.lineas
      .filter((l) => l.tipo === tipo)
      .map((l, i) => ({
        id: ++lineaSeq,
        orden: i + 1,
        insumoId: l.insumoId,
        descripcion: l.descripcion,
        unidadMedidaId: l.unidadMedidaId,
        unidad: l.unidadMedidaId === null ? null : (unidad(l.unidadMedidaId)?.codigo ?? null),
        cantidad: l.cantidad,
        precioUnitario: l.precioUnitario,
        desperdicio: l.desperdicio,
        factorPrestacional: l.factorPrestacional,
        rendimiento: l.rendimiento,
        valorParcial: centavos(valorParcial(l)),
      }));
  return {
    ...apuResumen(a, unidad),
    observaciones: a.observaciones,
    materiales: lineas(MATERIAL),
    equipo: lineas(EQUIPO),
    manoObra: lineas(MANO_OBRA),
    usosEnPresupuestos: presupuestos.flatMap((p) => p.capitulos.flatMap((c) => c.items)).filter((i) => i.apuId === a.id).length,
  };
}

function apuResumen(a: ApuRow, unidad: (id: number) => Unidad) {
  return { id: a.id, codigo: a.codigo, descripcion: a.descripcion, unidadMedidaId: a.unidadMedidaId, unidad: unidad(a.unidadMedidaId)?.codigo ?? '', fecha: a.fecha, activo: a.activo, costos: costos(a), actualizadoEn: a.actualizadoEn };
}

function presupuestoDto(p: PresupuestoRow, unidad: (id: number) => Unidad) {
  const cd = costoDirecto(p);
  let desactualizados = 0;
  const capitulos = p.capitulos.map((c, ci) => {
    const subtotal = centavos(c.items.reduce((s, i) => s + valorItem(i), 0));
    return {
      id: ci + 1,
      numero: ci + 1,
      nombre: c.nombre,
      subtotal,
      participacion: cd > 0 ? subtotal / cd : 0,
      items: c.items.map((i, ii) => {
        const apu = i.apuId ? apus.find((a) => a.id === i.apuId) : undefined;
        const costoApuActual = apu ? costos(apu).costoDirecto : null;
        if (costoApuActual !== null && costoApuActual !== i.valorUnitario) desactualizados++;
        return {
          id: (ci + 1) * 1000 + ii + 1,
          codigo: `${ci + 1}.${ii + 1}`,
          numero: ii + 1,
          apuId: i.apuId,
          apuCodigo: apu?.codigo ?? null,
          descripcion: i.descripcion,
          unidadMedidaId: i.unidadMedidaId,
          unidad: unidad(i.unidadMedidaId)?.codigo ?? '',
          cantidad: i.cantidad,
          valorUnitario: i.valorUnitario,
          valorTotal: valorItem(i),
          costoApuActual,
        };
      }),
    };
  });
  const { tenantId: _tenant, capitulos: _capitulos, ...encabezado } = p;
  return { ...encabezado, moneda: 'COP', capitulos, totales: totales(cd, p), itemsDesactualizados: desactualizados };
}

function presupuestoResumen(p: PresupuestoRow) {
  const cd = costoDirecto(p);
  return {
    id: p.id,
    codigo: p.codigo,
    nombreObra: p.nombreObra,
    cliente: p.cliente,
    fecha: p.fecha,
    propuestaNumero: p.propuestaNumero,
    estado: p.estado,
    capitulos: p.capitulos.length,
    items: p.capitulos.reduce((s, c) => s + c.items.length, 0),
    costoDirecto: cd,
    valorTotal: totales(cd, p).valorTotal,
    actualizadoEn: p.actualizadoEn,
  };
}

const siguiente = (prefijo: string, codigos: string[]) =>
  `${prefijo}-${String(codigos.map((c) => Number(c.split('-')[1]) || 0).reduce((a, b) => Math.max(a, b), 0) + 1).padStart(4, '0')}`;

// ---------------- Rutas ----------------

/** `/apus[/:id[/duplicar]]` y `/presupuestos[/:id[/estado|recalcular|duplicar]]`; el permiso ya se validó. */
export function handlePresupuestosMock(
  req: HttpRequest<unknown>,
  tenant: string,
  recurso: 'apus' | 'presupuestos',
  id: string | undefined,
  accion: string | undefined,
  body: Body,
  unidad: (id: number) => Unidad,
): MockResult {
  return recurso === 'apus' ? apusMock(req, tenant, id, accion, body, unidad) : presupuestosMock(req, tenant, id, accion, body, unidad);
}

function apusMock(req: HttpRequest<unknown>, tenant: string, id: string | undefined, accion: string | undefined, body: Body, unidad: (id: number) => Unidad): MockResult {
  const own = apus.filter((a) => a.tenantId === tenant);
  const apu = own.find((a) => a.id === id);
  const duplicado = (descripcion: string, unidadId: number, excepto?: string) => own.some((a) => a.id !== excepto && a.unidadMedidaId === unidadId && norm(a.descripcion) === norm(descripcion));

  if (req.method === 'GET' && !id) {
    const activo = req.params.get('activo');
    const rows = own.filter((a) => activo === null || String(a.activo) === activo).sort((a, b) => a.codigo.localeCompare(b.codigo));
    return page(req, rows.map((a) => apuResumen(a, unidad)), (a) => `${a.codigo} ${a.descripcion}`);
  }

  if (req.method === 'POST' && !id) {
    const datos = leerApu(body, unidad);
    if ('status' in datos) return datos;
    if (duplicado(datos.descripcion, datos.unidadMedidaId)) return problem(409, 'Apus.Duplicado', 'Ya existe un APU con esa descripción y unidad.');
    const nuevo: ApuRow = { id: crypto.randomUUID(), tenantId: tenant, codigo: siguiente('APU', own.map((a) => a.codigo)), ...datos, activo: true, actualizadoEn: now() };
    apus.push(nuevo);
    return ok(apuDto(nuevo, unidad), 201);
  }

  if (!apu) return problem(404, 'Apus.NotFound', `No existe el APU '${id}'.`);
  if (req.method === 'GET') return ok(apuDto(apu, unidad));

  if (req.method === 'POST' && accion === 'duplicar') {
    let n = 1;
    const sufijo = () => (n === 1 ? ' (COPIA)' : ` (COPIA ${n})`);
    while (duplicado(apu.descripcion + sufijo(), apu.unidadMedidaId)) n++;
    const copia: ApuRow = { ...structuredClone(apu), id: crypto.randomUUID(), codigo: siguiente('APU', own.map((a) => a.codigo)), descripcion: apu.descripcion + sufijo(), activo: true, actualizadoEn: now() };
    apus.push(copia);
    return ok(apuDto(copia, unidad), 201);
  }

  if (req.method === 'PUT') {
    const datos = leerApu(body, unidad);
    if ('status' in datos) return datos;
    if (duplicado(datos.descripcion, datos.unidadMedidaId, apu.id)) return problem(409, 'Apus.Duplicado', 'Ya existe un APU con esa descripción y unidad.');
    Object.assign(apu, datos, { activo: body['activo'] !== false, actualizadoEn: now() });
    return ok(apuDto(apu, unidad));
  }

  const usos = presupuestos.flatMap((p) => p.capitulos.flatMap((c) => c.items)).filter((i) => i.apuId === apu.id).length;
  if (usos > 0) return problem(409, 'Apus.EnUso', `El APU se usa en ${usos} ítem(s) de presupuestos. Desactívalo en lugar de eliminarlo.`);
  apus.splice(apus.indexOf(apu), 1);
  return noContent();
}

function leerApu(body: Body, unidad: (id: number) => Unidad): Pick<ApuRow, 'descripcion' | 'unidadMedidaId' | 'fecha' | 'observaciones' | 'lineas'> | MockResult {
  const descripcion = texto(body['descripcion']);
  const unidadMedidaId = numero(body['unidadMedidaId']);
  if (!descripcion || unidadMedidaId === null) return problem(400, 'Validation', 'La descripción y la unidad son obligatorias.');
  const lista = (k: string) => (Array.isArray(body[k]) ? (body[k] as Body[]) : []);
  const lineas: LineaRow[] = [
    ...lista('materiales').map((l) => mat(String(l['descripcion']), Number(l['unidadMedidaId']), Number(l['cantidad']), Number(l['desperdicio']), Number(l['precioUnitario']))),
    ...lista('equipo').map((l) => equ(String(l['descripcion']), Number(l['unidadMedidaId']), Number(l['incidencia']), Number(l['precioUnitario']))),
    ...lista('manoObra').map((l) => ({ ...mo(String(l['descripcion']), Number(l['jornal']), Number(l['rendimiento'])), factorPrestacional: Number(l['factorPrestacional']) })),
  ];
  const insumos = [...lista('materiales'), ...lista('equipo'), ...lista('manoObra')];
  lineas.forEach((l, i) => (l.insumoId = (insumos[i]['insumoId'] as string | null) ?? null));
  if (lineas.length === 0) return problem(400, 'Validation', 'El APU necesita al menos un insumo.');
  if ([unidadMedidaId, ...lineas.map((l) => l.unidadMedidaId)].some((u) => u !== null && !unidad(u))) return problem(400, 'Apus.UnidadInvalida', 'Alguna unidad de medida no existe.');
  return { descripcion: descripcion.toUpperCase(), unidadMedidaId, fecha: texto(body['fecha']) ?? hoy(), observaciones: texto(body['observaciones']), lineas };
}

function presupuestosMock(req: HttpRequest<unknown>, tenant: string, id: string | undefined, accion: string | undefined, body: Body, unidad: (id: number) => Unidad): MockResult {
  const own = presupuestos.filter((p) => p.tenantId === tenant);
  const presupuesto = own.find((p) => p.id === id);

  if (req.method === 'GET' && !id) {
    const estado = req.params.get('estado');
    const rows = own.filter((p) => !estado || p.estado === estado).sort((a, b) => b.codigo.localeCompare(a.codigo));
    return page(req, rows.map(presupuestoResumen), (p) => `${p.codigo} ${p.nombreObra} ${p.cliente ?? ''}`);
  }

  if (req.method === 'POST' && !id) {
    const datos = leerPresupuesto(tenant, body, unidad);
    if ('status' in datos) return datos;
    const nuevo: PresupuestoRow = { id: crypto.randomUUID(), tenantId: tenant, codigo: siguiente('PRE', own.map((p) => p.codigo)), estado: 'BORRADOR', ...datos, actualizadoEn: now() };
    presupuestos.push(nuevo);
    return ok(presupuestoDto(nuevo, unidad), 201);
  }

  if (!presupuesto) return problem(404, 'Presupuestos.NotFound', `No existe el presupuesto '${id}'.`);
  if (req.method === 'GET') return ok(presupuestoDto(presupuesto, unidad));
  const noEditable = () => problem(409, 'Presupuestos.NoEditable', `El presupuesto está ${presupuesto.estado.toLowerCase()}. Vuelve a borrador para modificarlo.`);

  if (req.method === 'POST' && accion === 'duplicar') {
    const copia: PresupuestoRow = {
      ...structuredClone(presupuesto),
      id: crypto.randomUUID(),
      codigo: siguiente('PRE', own.map((p) => p.codigo)),
      nombreObra: `${presupuesto.nombreObra} (COPIA)`.slice(0, 200),
      estado: 'BORRADOR',
      actualizadoEn: now(),
    };
    presupuestos.push(copia);
    return ok(presupuestoDto(copia, unidad), 201);
  }

  if (req.method === 'POST' && accion === 'recalcular') {
    if (presupuesto.estado !== 'BORRADOR') return noEditable();
    for (const i of presupuesto.capitulos.flatMap((c) => c.items)) {
      const apu = i.apuId ? apus.find((a) => a.id === i.apuId) : undefined;
      if (apu) i.valorUnitario = costos(apu).costoDirecto;
    }
    presupuesto.actualizadoEn = now();
    return ok(presupuestoDto(presupuesto, unidad));
  }

  if (req.method === 'PUT' && accion === 'estado') {
    const estado = body['estado'] as Estado;
    if (!['BORRADOR', 'APROBADO', 'ANULADO'].includes(estado)) return problem(400, 'Validation', 'Estado no válido.');
    if (estado === 'APROBADO' && !presupuesto.capitulos.some((c) => c.items.length > 0)) return problem(400, 'Presupuestos.Vacio', 'No se puede aprobar un presupuesto sin ítems.');
    Object.assign(presupuesto, { estado, actualizadoEn: now() });
    return ok(presupuestoDto(presupuesto, unidad));
  }

  if (req.method === 'PUT') {
    if (presupuesto.estado !== 'BORRADOR') return noEditable();
    const datos = leerPresupuesto(tenant, body, unidad);
    if ('status' in datos) return datos;
    Object.assign(presupuesto, datos, { actualizadoEn: now() });
    return ok(presupuestoDto(presupuesto, unidad));
  }

  if (presupuesto.estado === 'APROBADO') return problem(409, 'Presupuestos.Aprobado', 'Un presupuesto aprobado no se puede eliminar.');
  presupuestos.splice(presupuestos.indexOf(presupuesto), 1);
  return noContent();
}

function leerPresupuesto(tenant: string, body: Body, unidad: (id: number) => Unidad): Omit<PresupuestoRow, 'id' | 'tenantId' | 'codigo' | 'estado' | 'actualizadoEn'> | MockResult {
  const nombreObra = texto(body['nombreObra']);
  if (!nombreObra) return problem(400, 'Validation', 'El nombre de la obra es obligatorio.');
  const capitulos: PresupuestoRow['capitulos'] = [];
  for (const c of (body['capitulos'] as Body[] | undefined) ?? []) {
    const items: ItemRow[] = [];
    for (const i of (c['items'] as Body[] | undefined) ?? []) {
      const apuId = (i['apuId'] as string | null) ?? null;
      const apu = apuId ? apus.find((a) => a.id === apuId && a.tenantId === tenant) : undefined;
      if (apuId && !apu) return problem(400, 'Presupuestos.ApuInvalido', 'Algún APU no existe en la empresa.');
      const descripcion = texto(i['descripcion']) ?? apu?.descripcion ?? null;
      const unidadMedidaId = numero(i['unidadMedidaId']) ?? apu?.unidadMedidaId ?? null;
      const valorUnitario = numero(i['valorUnitario']) ?? (apu ? costos(apu).costoDirecto : null);
      if (!descripcion || unidadMedidaId === null || valorUnitario === null) {
        return problem(400, 'Presupuestos.ItemIncompleto', 'Un ítem sin APU necesita descripción, unidad y valor unitario.');
      }
      if (!unidad(unidadMedidaId)) return problem(400, 'Presupuestos.UnidadInvalida', 'Alguna unidad de medida no existe.');
      items.push({ apuId, descripcion, unidadMedidaId, cantidad: Number(i['cantidad']), valorUnitario: centavos(valorUnitario) });
    }
    capitulos.push({ nombre: texto(c['nombre']) ?? 'SIN NOMBRE', items });
  }
  const pct = (k: string, defecto: number) => numero(body[k]) ?? defecto;
  return {
    nombreObra,
    cliente: texto(body['cliente']),
    ubicacion: texto(body['ubicacion']),
    fecha: texto(body['fecha']) ?? hoy(),
    propuestaNumero: texto(body['propuestaNumero']),
    administracionPct: pct('administracionPct', 0.09),
    imprevistosPct: pct('imprevistosPct', 0.03),
    utilidadPct: pct('utilidadPct', 0.08),
    ivaUtilidadPct: pct('ivaUtilidadPct', 0.19),
    duracionDias: numero(body['duracionDias']),
    anticipoPct: numero(body['anticipoPct']),
    observaciones: texto(body['observaciones']),
    capitulos,
  };
}
