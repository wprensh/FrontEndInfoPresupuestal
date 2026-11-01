import { TipoTarea, TipoVinculo } from './programacion.model';

/**
 * Cálculos de programación que DHTMLX Gantt Community no trae (son de la edición PRO):
 * ruta crítica con holgura total, ajuste de fechas según dependencias y avance ponderado.
 * Trabajan con días enteros (`inicio` en días desde una fecha cualquiera) para no depender del diagrama.
 */

export interface Nodo {
  id: string;
  parentId: string | null;
  tipo: TipoTarea;
  /** Día de inicio. */
  inicio: number;
  /** Días; 0 en hitos. */
  duracion: number;
}

export interface Arco {
  origen: string;
  destino: string;
  tipo: TipoVinculo;
  desfase: number;
}

const fin = (n: Nodo) => n.inicio + n.duracion;

/** Fecha local (yyyy-MM-dd o Date) → número de día, sin efectos de zona horaria. */
export function aDia(fecha: string | Date): number {
  const d = typeof fecha === 'string' ? new Date(`${fecha.slice(0, 10)}T00:00:00Z`) : new Date(Date.UTC(fecha.getFullYear(), fecha.getMonth(), fecha.getDate()));
  return Math.round(d.getTime() / 86_400_000);
}

/** Número de día → yyyy-MM-dd. */
export function deDia(dia: number): string {
  return new Date(dia * 86_400_000).toISOString().slice(0, 10);
}

/**
 * Inicio mínimo que un vínculo exige a su destino, según las fechas del origen:
 * FC: inicio ≥ fin(origen)+desfase · CC: inicio ≥ inicio(origen)+desfase ·
 * FF: fin ≥ fin(origen)+desfase · CF: fin ≥ inicio(origen)+desfase.
 */
export function inicioExigido(origen: Nodo, destinoDuracion: number, arco: Pick<Arco, 'tipo' | 'desfase'>): number {
  switch (arco.tipo) {
    case 0:
      return fin(origen) + arco.desfase;
    case 1:
      return origen.inicio + arco.desfase;
    case 2:
      return fin(origen) + arco.desfase - destinoDuracion;
    case 3:
      return origen.inicio + arco.desfase - destinoDuracion;
  }
}

function hijosPorPadre(nodos: Nodo[]): Map<string, Nodo[]> {
  const mapa = new Map<string, Nodo[]>();
  for (const n of nodos) {
    if (n.parentId) mapa.set(n.parentId, [...(mapa.get(n.parentId) ?? []), n]);
  }
  return mapa;
}

/** Ancestros de un nodo, del padre hacia la raíz. */
function ancestros(id: string, porId: Map<string, Nodo>): string[] {
  const lista: string[] = [];
  let actual = porId.get(id)?.parentId;
  while (actual && !lista.includes(actual)) {
    lista.push(actual);
    actual = porId.get(actual)?.parentId;
  }
  return lista;
}

/**
 * Programación hacia adelante: mueve (solo hacia adelante) cada actividad que no cumple sus vínculos
 * de entrada ni los de sus capítulos. Los capítulos no se mueven: su rango sale de sus actividades.
 * Devuelve los nuevos inicios de las actividades que cambiaron.
 */
export function ajustarPorDependencias(nodos: Nodo[], arcos: Arco[]): Map<string, number> {
  const porId = new Map(nodos.map((n) => [n.id, { ...n }]));
  const hijos = hijosPorPadre([...porId.values()]);
  const entrantes = new Map<string, Arco[]>();
  for (const a of arcos) entrantes.set(a.destino, [...(entrantes.get(a.destino) ?? []), a]);

  // Rango de un capítulo = mínimo inicio y máximo fin de sus descendientes.
  const rango = (n: Nodo): Nodo => {
    const desc = hijos.get(n.id);
    if (n.tipo !== 'project' || !desc?.length) return n;
    const partes = desc.map(rango);
    const inicio = Math.min(...partes.map((p) => p.inicio));
    return { ...n, inicio, duracion: Math.max(...partes.map(fin)) - inicio };
  };

  const cambios = new Map<string, number>();
  for (let pasada = 0; pasada <= nodos.length; pasada++) {
    let movido = false;
    for (const n of porId.values()) {
      if (n.tipo === 'project' && hijos.get(n.id)?.length) continue;
      const arcosAplicables = [n.id, ...ancestros(n.id, porId)].flatMap((id) => (entrantes.get(id) ?? []).map((a) => ({ a, destino: id })));
      let minimo = -Infinity;
      for (const { a, destino } of arcosAplicables) {
        const origen = porId.get(a.origen);
        if (!origen) continue;
        const d = destino === n.id ? n.duracion : rango(porId.get(destino)!).duracion;
        const exigido = inicioExigido(rango(origen), d, a);
        // Si el vínculo es de un capítulo, la actividad no puede empezar antes que lo exigido al capítulo.
        minimo = Math.max(minimo, exigido);
      }
      if (minimo > n.inicio) {
        n.inicio = minimo;
        cambios.set(n.id, minimo);
        movido = true;
      }
    }
    if (!movido) break;
  }
  return cambios;
}

export interface Holgura {
  /** Días que la actividad puede atrasarse sin mover el fin de la obra. */
  total: number;
  critica: boolean;
}

/**
 * Holgura total con un recorrido hacia atrás desde el fin de la obra: el fin más tardío de cada
 * actividad es el menor que permiten sus sucesores, su capítulo y el fin del proyecto.
 * Crítica = holgura ≤ 0. Los vínculos de un capítulo valen para todas sus actividades.
 */
export function rutaCritica(nodos: Nodo[], arcos: Arco[]): Map<string, Holgura> {
  const porId = new Map(nodos.map((n) => [n.id, n]));
  const hijos = hijosPorPadre(nodos);
  const salientes = new Map<string, Arco[]>();
  for (const a of arcos) if (porId.has(a.origen) && porId.has(a.destino)) salientes.set(a.origen, [...(salientes.get(a.origen) ?? []), a]);
  const finObra = nodos.length ? Math.max(...nodos.map(fin)) : 0;

  const lfMemo = new Map<string, number>();
  const lsMemo = new Map<string, number>();
  const visitando = new Set<string>();

  /** Inicio más tardío: el de un capítulo es el menor de sus actividades. */
  const ls = (id: string): number => {
    const memo = lsMemo.get(id);
    if (memo !== undefined) return memo;
    const n = porId.get(id)!;
    let valor = lf(id) - n.duracion;
    for (const h of hijos.get(id) ?? []) valor = Math.min(valor, ls(h.id));
    lsMemo.set(id, valor);
    return valor;
  };

  /** Fin más tardío. */
  const lf = (id: string): number => {
    const memo = lfMemo.get(id);
    if (memo !== undefined) return memo;
    if (visitando.has(id)) return finObra; // ciclo: se corta sin bloquear
    visitando.add(id);
    const n = porId.get(id)!;
    let valor = finObra;
    if (n.parentId && porId.has(n.parentId)) valor = Math.min(valor, lf(n.parentId));
    for (const a of salientes.get(id) ?? []) {
      switch (a.tipo) {
        case 0:
          valor = Math.min(valor, ls(a.destino) - a.desfase);
          break;
        case 1:
          valor = Math.min(valor, ls(a.destino) - a.desfase + n.duracion);
          break;
        case 2:
          valor = Math.min(valor, lf(a.destino) - a.desfase);
          break;
        case 3:
          valor = Math.min(valor, lf(a.destino) - a.desfase + n.duracion);
          break;
      }
    }
    visitando.delete(id);
    lfMemo.set(id, valor);
    return valor;
  };

  const resultado = new Map<string, Holgura>();
  for (const n of nodos) {
    const total = ls(n.id) - n.inicio;
    resultado.set(n.id, { total, critica: total <= 0 });
  }
  return resultado;
}

export interface ConAvance {
  id: string;
  parentId: string | null;
  tipo: TipoTarea;
  duracion: number;
  progreso: number;
  valor: number | null;
}

/**
 * Avance de cada capítulo ponderado por el valor de sus actividades (o por la duración si ninguna
 * tiene valor), y avance total de la obra con la misma regla sobre todas las actividades.
 */
export function avancePonderado(tareas: ConAvance[]): { porCapitulo: Map<string, number>; total: number | null } {
  const hijos = new Map<string, ConAvance[]>();
  for (const t of tareas) if (t.parentId) hijos.set(t.parentId, [...(hijos.get(t.parentId) ?? []), t]);

  const hojasDe = (id: string): ConAvance[] => (hijos.get(id) ?? []).flatMap((h) => (h.tipo === 'project' && hijos.has(h.id) ? hojasDe(h.id) : [h]));
  const ponderar = (hojas: ConAvance[]): number | null => {
    const utiles = hojas.filter((h) => h.tipo !== 'project');
    if (!utiles.length) return null;
    const porValor = utiles.some((h) => (h.valor ?? 0) > 0);
    const peso = (h: ConAvance) => (porValor ? (h.valor ?? 0) : Math.max(1, h.duracion));
    const total = utiles.reduce((s, h) => s + peso(h), 0);
    return total === 0 ? 0 : utiles.reduce((s, h) => s + peso(h) * h.progreso, 0) / total;
  };

  const porCapitulo = new Map<string, number>();
  for (const t of tareas) {
    if (t.tipo !== 'project') continue;
    const valor = ponderar(hojasDe(t.id));
    if (valor !== null) porCapitulo.set(t.id, valor);
  }
  return { porCapitulo, total: ponderar(tareas.filter((t) => t.tipo !== 'project' || !hijos.has(t.id))) };
}
