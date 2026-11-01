import { HttpRequest } from '@angular/common/http';

import { Body, MockResult, noContent, now, ok, page, problem } from './mock-http';
import { presupuestoMock, presupuestosActivos } from './presupuestos.mock';

/**
 * Backend simulado del formato de impresión (`/impresion/configuracion`, `/presupuestos/:id/impresion`)
 * y de la programación de obra (`/programaciones`, `/presupuestos/:id/programacion[/generar]`).
 * Repite las reglas de la API: membrete con valores de la empresa por defecto, guardado completo del
 * diagrama con validación de padres y vínculos, y generación desde capítulos e ítems.
 */

type Unidad = { id: number; codigo: string } | undefined;

export interface EmpresaMock {
  razonSocial: string;
  nit: string | null;
  email: string | null;
  telefono: string | null;
}

interface ConfigRow {
  razonSocial: string | null;
  nit: string | null;
  direccion: string | null;
  ciudad: string | null;
  telefono: string | null;
  email: string | null;
  sitioWeb: string | null;
  logo: string | null;
  colorPrimario: string;
  encabezado: string | null;
  piePagina: string | null;
  firmaNombre: string | null;
  firmaCargo: string | null;
  firmaMatricula: string | null;
  mostrarApu: boolean;
  mostrarParticipacion: boolean;
  mostrarValorLetras: boolean;
  actualizadoEn: string;
}

interface TareaRow {
  id: string;
  parentId: string | null;
  tipo: 'task' | 'project' | 'milestone';
  texto: string;
  referencia: string | null;
  fechaInicio: string;
  duracion: number;
  progreso: number;
  responsable: string | null;
  color: string | null;
  notas: string | null;
  valor: number | null;
  lineaBaseInicio: string | null;
  lineaBaseFin: string | null;
  abierta: boolean;
}

interface VinculoRow {
  id: string;
  origen: string;
  destino: string;
  tipo: number;
  desfase: number;
}

interface ProgramacionRow {
  fechaInicio: string;
  escala: string;
  tareas: TareaRow[];
  vinculos: VinculoRow[];
  actualizadoEn: string;
}

const COLOR = '#006a6a';
const configs = new Map<string, ConfigRow>();
const programaciones = new Map<string, ProgramacionRow>();

const texto = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null);
const sumarDias = (iso: string, dias: number) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
};

// ---------------- Formato de impresión ----------------

function configDto(tenant: string, empresa: EmpresaMock) {
  const c = configs.get(tenant);
  return {
    razonSocial: c?.razonSocial ?? empresa.razonSocial,
    nit: c?.nit ?? empresa.nit,
    direccion: c?.direccion ?? null,
    ciudad: c?.ciudad ?? null,
    telefono: c?.telefono ?? empresa.telefono,
    email: c?.email ?? empresa.email,
    sitioWeb: c?.sitioWeb ?? null,
    logo: c?.logo ?? null,
    colorPrimario: c?.colorPrimario ?? COLOR,
    encabezado: c?.encabezado ?? null,
    piePagina: c?.piePagina ?? null,
    firmaNombre: c?.firmaNombre ?? null,
    firmaCargo: c?.firmaCargo ?? null,
    firmaMatricula: c?.firmaMatricula ?? null,
    mostrarApu: c?.mostrarApu ?? true,
    mostrarParticipacion: c?.mostrarParticipacion ?? true,
    mostrarValorLetras: c?.mostrarValorLetras ?? true,
    personalizada: !!c,
    actualizadoEn: c?.actualizadoEn ?? null,
  };
}

/** `/impresion/configuracion`; el permiso ya se validó. */
export function handleImpresionMock(req: HttpRequest<unknown>, tenant: string, empresa: EmpresaMock, body: Body): MockResult {
  if (req.method === 'GET') return ok(configDto(tenant, empresa));
  const logo = texto(body['logo']);
  if (logo && (!/^data:image\/(png|jpeg|webp);base64,/.test(logo) || logo.length > 700_000)) {
    return problem(400, 'Impresion.LogoFormato', 'El logo debe ser una imagen PNG, JPG o WebP de máximo 512 KB.');
  }
  const color = texto(body['colorPrimario']) ?? COLOR;
  if (!/^#[0-9a-fA-F]{6}$/.test(color)) return problem(400, 'Validation', 'El color debe tener el formato #RRGGBB.');
  configs.set(tenant, {
    razonSocial: texto(body['razonSocial']),
    nit: texto(body['nit']),
    direccion: texto(body['direccion']),
    ciudad: texto(body['ciudad']),
    telefono: texto(body['telefono']),
    email: texto(body['email'])?.toLowerCase() ?? null,
    sitioWeb: texto(body['sitioWeb']),
    logo,
    colorPrimario: color.toLowerCase(),
    encabezado: texto(body['encabezado']),
    piePagina: texto(body['piePagina']),
    firmaNombre: texto(body['firmaNombre']),
    firmaCargo: texto(body['firmaCargo']),
    firmaMatricula: texto(body['firmaMatricula']),
    mostrarApu: body['mostrarApu'] !== false,
    mostrarParticipacion: body['mostrarParticipacion'] !== false,
    mostrarValorLetras: body['mostrarValorLetras'] !== false,
    actualizadoEn: now(),
  });
  return ok(configDto(tenant, empresa));
}

/** `GET /presupuestos/:id/impresion`. */
export function presupuestoImpresionMock(tenant: string, id: string, empresa: EmpresaMock, unidad: (id: number) => Unidad): MockResult {
  const presupuesto = presupuestoMock(tenant, id, unidad);
  return presupuesto ? ok({ empresa: configDto(tenant, empresa), presupuesto }) : problem(404, 'Presupuestos.NotFound', `No existe el presupuesto '${id}'.`);
}

// ---------------- Programación de obra ----------------

const finDe = (t: TareaRow) => sumarDias(t.fechaInicio, t.duracion);

function avance(tareas: TareaRow[]): number | null {
  const hojas = tareas.filter((t) => t.tipo !== 'project');
  if (hojas.length === 0) return null;
  const porValor = hojas.some((t) => (t.valor ?? 0) > 0);
  const peso = (t: TareaRow) => (porValor ? (t.valor ?? 0) : Math.max(1, t.duracion));
  const total = hojas.reduce((s, t) => s + peso(t), 0);
  return total === 0 ? 0 : Math.round((hojas.reduce((s, t) => s + peso(t) * t.progreso, 0) / total) * 10000) / 10000;
}

function programacionDto(tenant: string, id: string, unidad: (id: number) => Unidad) {
  const p = presupuestoMock(tenant, id, unidad)!;
  const prog = programaciones.get(id);
  return {
    presupuestoId: p.id,
    codigo: p.codigo,
    nombreObra: p.nombreObra,
    estado: p.estado,
    duracionPresupuesto: p.duracionDias,
    costoDirecto: p.totales.costoDirecto,
    existe: !!prog,
    fechaInicio: prog?.fechaInicio ?? p.fecha,
    escala: prog?.escala ?? 'semana',
    tareas: (prog?.tareas ?? []).map((t, orden) => ({ ...t, orden, fechaFin: finDe(t) })),
    vinculos: prog?.vinculos ?? [],
    actualizadoEn: prog?.actualizadoEn ?? null,
  };
}

/** Igual que ProgramacionGenerador.Repartir: días por peso, al menos uno por parte y suma exacta. */
export function repartir(pesos: number[], total: number): number[] {
  const suma = pesos.reduce((a, b) => a + b, 0);
  const exactos = pesos.map((p) => (suma === 0 ? total / pesos.length : (p / suma) * total));
  const dias = exactos.map((e) => Math.max(1, Math.floor(e)));
  let restante = total - dias.reduce((a, b) => a + b, 0);
  const orden = exactos.map((e, i) => ({ i, f: e - Math.floor(e) })).sort((a, b) => b.f - a.f || a.i - b.i);
  for (const { i } of orden) {
    if (restante <= 0) break;
    dias[i]++;
    restante--;
  }
  while (restante < 0) {
    const mayor = dias.indexOf(Math.max(...dias));
    if (dias[mayor] <= 1) break;
    dias[mayor]--;
    restante++;
  }
  return dias;
}

function generar(presupuesto: NonNullable<ReturnType<typeof presupuestoMock>>, inicio: string, duracion: number): Pick<ProgramacionRow, 'tareas' | 'vinculos'> {
  const tareas: TareaRow[] = [];
  const vinculos: VinculoRow[] = [];
  const caps = presupuesto.capitulos;
  const dias = repartir(caps.map((c) => c.subtotal), Math.max(duracion, caps.length));
  let fecha = inicio;
  let anterior: string | null = null;
  const base = { responsable: null, color: null, notas: null, lineaBaseInicio: null, lineaBaseFin: null, abierta: true, progreso: 0 };
  caps.forEach((c, ci) => {
    const d = dias[ci];
    const capId = crypto.randomUUID();
    tareas.push({ ...base, id: capId, parentId: null, tipo: 'project', texto: `${c.numero}. ${c.nombre}`, referencia: String(c.numero), fechaInicio: fecha, duracion: d, valor: c.subtotal });
    const total = c.items.reduce((s, i) => s + i.valorTotal, 0);
    let acumulado = 0;
    c.items.forEach((item, ii) => {
      const peso = total === 0 ? 1 / c.items.length : item.valorTotal / total;
      const desplazamiento = Math.min(Math.floor(acumulado * d), d - 1);
      // El último ítem termina con el capítulo, como en la API.
      const duracionItem = ii === c.items.length - 1 ? d - desplazamiento : Math.min(Math.max(Math.round(peso * d), 1), d - desplazamiento);
      acumulado += peso;
      tareas.push({ ...base, id: crypto.randomUUID(), parentId: capId, tipo: 'task', texto: item.descripcion, referencia: item.codigo, fechaInicio: sumarDias(fecha, desplazamiento), duracion: duracionItem, valor: item.valorTotal });
    });
    if (anterior) vinculos.push({ id: crypto.randomUUID(), origen: anterior, destino: capId, tipo: 0, desfase: 0 });
    anterior = capId;
    fecha = sumarDias(fecha, d);
  });
  const entrega = crypto.randomUUID();
  tareas.push({ ...base, id: entrega, parentId: null, tipo: 'milestone', texto: 'ENTREGA DE OBRA', referencia: null, fechaInicio: fecha, duracion: 0, valor: null });
  vinculos.push({ id: crypto.randomUUID(), origen: anterior!, destino: entrega, tipo: 0, desfase: 0 });
  return { tareas, vinculos };
}

function validar(tareas: TareaRow[], vinculos: VinculoRow[]): MockResult | null {
  const porId = new Map(tareas.map((t) => [t.id, t]));
  if (porId.size !== tareas.length) return problem(400, 'Programacion.TareaDuplicada', 'Hay actividades repetidas.');
  for (const t of tareas) {
    if (!t.texto?.trim()) return problem(400, 'Validation', 'Toda actividad necesita un nombre.');
    let padre = t.parentId ? porId.get(t.parentId) : undefined;
    if (t.parentId && !padre) return problem(400, 'Programacion.PadreInvalido', `La actividad '${t.texto}' pertenece a una actividad que no existe.`);
    for (let pasos = 0; padre; pasos++) {
      if (padre.id === t.id || pasos > tareas.length) return problem(400, 'Programacion.Ciclo', `La actividad '${t.texto}' no puede contenerse a sí misma.`);
      padre = padre.parentId ? porId.get(padre.parentId) : undefined;
    }
  }
  const claves = new Set<string>();
  for (const v of vinculos) {
    if (!porId.has(v.origen) || !porId.has(v.destino)) return problem(400, 'Programacion.VinculoInvalido', 'Un vínculo une actividades que no existen.');
    const clave = `${v.origen}>${v.destino}`;
    if (v.origen === v.destino || claves.has(clave)) return problem(400, 'Programacion.VinculoInvalido', 'Hay vínculos repetidos o de una actividad consigo misma.');
    claves.add(clave);
  }
  return null;
}

/** `/programaciones` y `/presupuestos/:id/programacion[/generar]`; el permiso ya se validó. */
export function handleProgramacionMock(req: HttpRequest<unknown>, tenant: string, id: string | undefined, accion: string | undefined, body: Body, unidad: (id: number) => Unidad): MockResult {
  if (!id) {
    const rows = presupuestosActivos(tenant).map((p) => {
      const prog = programaciones.get(p.id);
      const tareas = prog?.tareas ?? [];
      return {
        presupuestoId: p.id,
        codigo: p.codigo,
        nombreObra: p.nombreObra,
        cliente: p.cliente,
        estado: p.estado,
        existe: !!prog,
        fechaInicio: prog ? (tareas.map((t) => t.fechaInicio).sort()[0] ?? prog.fechaInicio) : null,
        fechaFin: tareas.length ? tareas.map(finDe).sort().at(-1)! : null,
        actividades: tareas.filter((t) => t.tipo !== 'project').length,
        avance: avance(tareas),
        actualizadoEn: prog?.actualizadoEn ?? null,
      };
    });
    return page(req, rows, (r) => `${r.codigo} ${r.nombreObra} ${r.cliente ?? ''}`);
  }

  const presupuesto = presupuestoMock(tenant, id, unidad);
  if (!presupuesto) return problem(404, 'Presupuestos.NotFound', `No existe el presupuesto '${id}'.`);

  if (req.method === 'GET') return ok(programacionDto(tenant, id, unidad));

  if (req.method === 'DELETE') {
    if (!programaciones.delete(id)) return problem(404, 'Programacion.NotFound', 'El presupuesto no tiene programación.');
    return noContent();
  }

  if (req.method === 'POST' && accion === 'generar') {
    if (presupuesto.capitulos.length === 0) return problem(400, 'Programacion.SinCapitulos', 'El presupuesto no tiene capítulos para programar.');
    if ((programaciones.get(id)?.tareas.length ?? 0) > 0 && body['reemplazar'] !== true) {
      return problem(409, 'Programacion.YaExiste', 'El presupuesto ya tiene programación.');
    }
    const inicio = texto(body['fechaInicio']) ?? presupuesto.fecha;
    const duracion = typeof body['duracionDias'] === 'number' ? body['duracionDias'] : (presupuesto.duracionDias ?? 30);
    const escala = duracion <= 21 ? 'dia' : duracion <= 240 ? 'semana' : 'mes';
    programaciones.set(id, { fechaInicio: inicio, escala, ...generar(presupuesto, inicio, duracion), actualizadoEn: now() });
    return ok(programacionDto(tenant, id, unidad));
  }

  if (req.method === 'PUT') {
    const tareas = (Array.isArray(body['tareas']) ? body['tareas'] : []) as TareaRow[];
    const vinculos = (Array.isArray(body['vinculos']) ? body['vinculos'] : []) as VinculoRow[];
    const error = validar(tareas, vinculos);
    if (error) return error;
    programaciones.set(id, {
      fechaInicio: texto(body['fechaInicio']) ?? presupuesto.fecha,
      escala: texto(body['escala']) ?? programaciones.get(id)?.escala ?? 'semana',
      tareas: tareas.map((t) => ({
        ...t,
        duracion: t.tipo === 'milestone' ? 0 : t.duracion,
        progreso: Math.min(1, Math.max(0, t.progreso)),
        lineaBaseFin: t.lineaBaseInicio ? t.lineaBaseFin : null,
      })),
      vinculos,
      actualizadoEn: now(),
    });
    return ok(programacionDto(tenant, id, unidad));
  }

  return problem(405, 'MethodNotAllowed', 'Método no permitido.');
}
