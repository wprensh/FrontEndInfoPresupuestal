import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  afterNextRender,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { Gantt } from 'dhtmlx-gantt';
import type { GanttStatic, Link } from 'dhtmlx-gantt';

import { aDia, ajustarPorDependencias, avancePonderado, deDia, rutaCritica, Holgura } from '../../models/programacion.calc';
import { EscalaProgramacion, Programacion, Tarea, TIPOS_VINCULO, TipoTarea, TipoVinculo, Vinculo } from '../../models/programacion.model';
import { TareaGantt, atrasada, configurarGantt } from './gantt-config';

/** Filtros de la grilla. */
export type FiltroTareas = 'todas' | 'criticas' | 'atrasadas' | 'en-curso' | 'sin-iniciar' | 'terminadas';

export interface IndicadoresGantt {
  inicio: string | null;
  fin: string | null;
  duracion: number;
  avance: number | null;
  actividades: number;
  atrasadas: number;
  criticas: number;
}

export type FormatoExportacion = 'pdf' | 'png' | 'excel' | 'msproject';

const MAX_HISTORIAL = 60;
const ESTILOS_GANTT = 'dhtmlxgantt.css';

/**
 * Diagrama de Gantt con DHTMLX Gantt Community. Envuelve una instancia propia (no la global), la
 * configura en español con los colores de la aplicación y agrega lo que la edición gratuita no trae:
 * deshacer/rehacer, ruta crítica, ajuste de fechas por dependencias, avance ponderado y línea base.
 */
@Component({
  selector: 'app-gantt-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div #host class="gantt-host" [class.con-critica]="rutaCriticaVisible()"></div>`,
  styles: `
    :host { display: block; min-height: 0; }
    .gantt-host { width: 100%; height: 100%; }
  `,
})
export class GanttChartComponent implements OnDestroy {
  private readonly zone = inject(NgZone);
  private readonly document = inject(DOCUMENT);
  private readonly host = viewChild.required<ElementRef<HTMLDivElement>>('host');

  readonly soloLectura = input(false);
  /** Nombre de los archivos exportados. */
  readonly nombre = input('programacion');

  /** Se emite con cada cambio del usuario en el diagrama. */
  readonly cambio = output<void>();

  readonly indicadores = signal<IndicadoresGantt>({ inicio: null, fin: null, duracion: 0, avance: null, actividades: 0, atrasadas: 0, criticas: 0 });
  readonly puedeDeshacer = signal(false);
  readonly puedeRehacer = signal(false);
  readonly rutaCriticaVisible = signal(false);
  readonly listo = signal(false);

  private gantt: GanttStatic | null = null;
  private holguras = new Map<string, Holgura>();
  private vinculosCriticos = new Set<string>();
  private historial: string[] = [];
  private posicion = -1;
  private restaurando = false;
  private pendiente: ReturnType<typeof setTimeout> | null = null;
  private filtroTexto = '';
  private filtro: FiltroTareas = 'todas';
  private datosIniciales: { programacion: Programacion } | null = null;

  constructor() {
    afterNextRender(() => void this.iniciar());
  }

  ngOnDestroy(): void {
    if (this.pendiente) clearTimeout(this.pendiente);
    this.gantt?.destructor();
    this.gantt = null;
  }

  /** Carga la programación y reinicia el historial. */
  cargar(programacion: Programacion): void {
    if (!this.gantt) {
      this.datosIniciales = { programacion };
      return;
    }
    const g = this.gantt;
    this.restaurando = true;
    g.clearAll();
    g.parse({
      data: programacion.tareas.map((t) => ({
        id: t.id,
        text: t.texto,
        start_date: t.fechaInicio,
        duration: t.tipo === 'milestone' ? 0 : t.duracion,
        progress: t.progreso,
        parent: t.parentId ?? 0,
        type: t.tipo,
        open: t.abierta,
        referencia: t.referencia,
        responsable: t.responsable,
        color: t.color ?? undefined,
        notas: t.notas,
        valor: t.valor,
        linea_base_inicio: t.lineaBaseInicio ? g.date.str_to_date('%Y-%m-%d')(t.lineaBaseInicio) : null,
        linea_base_fin: t.lineaBaseFin ? g.date.str_to_date('%Y-%m-%d')(t.lineaBaseFin) : null,
      })),
      links: programacion.vinculos.map((v) => ({ id: v.id, source: v.origen, target: v.destino, type: String(v.tipo), lag: v.desfase })),
    });
    this.setEscala(programacion.escala);
    this.restaurando = false;
    this.historial = [this.snapshot()];
    this.posicion = 0;
    this.actualizarHistorial();
    this.recalcular();
  }

  /** Programación en el formato de la API, en el orden del árbol. */
  serializar(): { tareas: Tarea[]; vinculos: Vinculo[] } {
    const g = this.gantt!;
    const iso = g.date.date_to_str('%Y-%m-%d');
    const tareas: Tarea[] = [];
    g.eachTask((t: TareaGantt) => {
      tareas.push({
        id: String(t.id),
        parentId: t.parent && t.parent !== g.config.root_id ? String(t.parent) : null,
        tipo: (t.type as TipoTarea) ?? 'task',
        texto: (t.text ?? '').trim() || 'Sin nombre',
        referencia: t.referencia ?? null,
        fechaInicio: iso(t.start_date!),
        duracion: t.type === 'milestone' ? 0 : Math.max(0, Math.round(t.duration ?? 0)),
        progreso: Math.min(1, Math.max(0, Number(t.progress ?? 0))),
        responsable: t.responsable?.trim() || null,
        color: t.color || null,
        notas: t.notas?.trim() || null,
        valor: t.valor ?? null,
        lineaBaseInicio: t.linea_base_inicio ? iso(t.linea_base_inicio) : null,
        lineaBaseFin: t.linea_base_inicio && t.linea_base_fin ? iso(t.linea_base_fin) : null,
        abierta: t.$open !== false,
      });
    });
    const vinculos: Vinculo[] = g.getLinks().map((l: Link) => ({
      id: String(l.id),
      origen: String(l.source),
      destino: String(l.target),
      tipo: Number(l.type) as TipoVinculo,
      desfase: Math.round(Number(l.lag ?? 0)),
    }));
    return { tareas, vinculos };
  }

  setEscala(escala: EscalaProgramacion): void {
    this.gantt?.ext.zoom.setLevel(escala);
  }

  escalaActual(): EscalaProgramacion {
    return (this.gantt?.ext.zoom.getCurrentLevel() !== undefined
      ? (['dia', 'semana', 'mes', 'trimestre', 'anio'] as const)[this.gantt.ext.zoom.getCurrentLevel()]
      : 'semana') as EscalaProgramacion;
  }

  acercar(): void {
    this.gantt?.ext.zoom.zoomIn();
  }

  alejar(): void {
    this.gantt?.ext.zoom.zoomOut();
  }

  deshacer(): void {
    if (this.posicion <= 0) return;
    this.restaurar(this.historial[--this.posicion]);
  }

  rehacer(): void {
    if (this.posicion >= this.historial.length - 1) return;
    this.restaurar(this.historial[++this.posicion]);
  }

  mostrarRutaCritica(visible: boolean): void {
    this.rutaCriticaVisible.set(visible);
    this.recalcular();
  }

  /** Mueve hacia adelante las actividades que no cumplen sus dependencias. Devuelve cuántas movió. */
  ajustarPorDependencias(): number {
    const g = this.gantt!;
    const cambios = ajustarPorDependencias(this.nodos(), this.arcos());
    if (cambios.size === 0) return 0;
    g.batchUpdate(() => {
      for (const [id, dia] of cambios) {
        const t = g.getTask(id);
        t.start_date = g.date.str_to_date('%Y-%m-%d')(deDia(dia));
        t.end_date = g.calculateEndDate({ start_date: t.start_date, duration: t.duration ?? 0, task: t } as never);
        g.updateTask(id);
      }
    });
    return cambios.size;
  }

  /** Guarda las fechas actuales como línea base de todas las actividades. */
  fijarLineaBase(): void {
    const g = this.gantt!;
    g.batchUpdate(() => {
      g.eachTask((t: TareaGantt) => {
        t.linea_base_inicio = new Date(t.start_date!);
        t.linea_base_fin = new Date(t.end_date!);
        g.updateTask(t.id);
      });
    });
  }

  quitarLineaBase(): void {
    const g = this.gantt!;
    g.batchUpdate(() => {
      g.eachTask((t: TareaGantt) => {
        t.linea_base_inicio = null;
        t.linea_base_fin = null;
        g.updateTask(t.id);
      });
    });
  }

  /** Agrega una actividad (dentro del capítulo seleccionado, si lo hay) y abre su formulario. */
  agregar(tipo: TipoTarea): void {
    const g = this.gantt!;
    const seleccion = g.getSelectedId();
    const seleccionada = seleccion && g.isTaskExists(seleccion) ? (g.getTask(seleccion) as TareaGantt) : null;
    const padre = seleccionada ? (seleccionada.type === 'project' ? seleccionada.id : seleccionada.parent) : g.config.root_id;
    const inicio = seleccionada?.end_date ? new Date(seleccionada.type === 'project' ? seleccionada.start_date! : seleccionada.end_date) : new Date(g.getState().min_date);
    const id = g.addTask(
      { text: tipo === 'milestone' ? 'Nuevo hito' : tipo === 'project' ? 'Nuevo capítulo' : 'Nueva actividad', start_date: inicio, duration: tipo === 'milestone' ? 0 : 1, type: tipo, progress: 0 } as never,
      padre ?? g.config.root_id,
    );
    g.showLightbox(id);
  }

  expandirTodo(abrir: boolean): void {
    const g = this.gantt!;
    g.batchUpdate(() => g.eachTask((t) => (abrir ? g.open(t.id) : g.close(t.id))));
  }

  pantallaCompleta(): void {
    this.gantt?.ext.fullscreen.toggle();
  }

  /** Exporta con el servicio en línea de DHTMLX (export.dhtmlx.com). */
  exportar(formato: FormatoExportacion): void {
    const g = this.gantt!;
    const name = this.nombre();
    switch (formato) {
      case 'pdf':
        g.exportToPDF({ name: `${name}.pdf`, header: `<h3 style="font-family:Roboto,sans-serif">${name}</h3>`, raw: false } as never);
        break;
      case 'png':
        g.exportToPNG({ name: `${name}.png` } as never);
        break;
      case 'excel':
        g.exportToExcel({ name: `${name}.xlsx`, visual: 'base-colors', cellColors: true } as never);
        break;
      case 'msproject':
        g.exportToMSProject({ name: `${name}.xml` } as never);
        break;
    }
  }

  filtrar(texto: string, filtro: FiltroTareas): void {
    this.filtroTexto = texto.trim().toLocaleLowerCase('es');
    this.filtro = filtro;
    this.gantt?.render();
  }

  private async iniciar(): Promise<void> {
    await this.cargarEstilos();
    this.zone.runOutsideAngular(() => {
      const g = Gantt.getGanttInstance();
      this.gantt = g;
      configurarGantt(g, this.soloLectura(), {
        critica: (id) => this.rutaCriticaVisible() && !!this.holguras.get(String(id))?.critica,
        holgura: (id) => this.holguras.get(String(id))?.total ?? null,
        vinculoCritico: (id) => this.rutaCriticaVisible() && this.vinculosCriticos.has(String(id)),
        codigo: (t) => this.codigo(t),
        predecesoras: (t) => this.predecesoras(t),
      });
      this.registrarEventos(g);
      g.init(this.host().nativeElement);
    });
    this.listo.set(true);
    if (this.datosIniciales) {
      this.cargar(this.datosIniciales.programacion);
      this.datosIniciales = null;
    }
  }

  /** La hoja de estilos de DHTMLX es un bundle aparte (angular.json) para no cargarla en el resto de la app. */
  private cargarEstilos(): Promise<void> {
    if (this.document.querySelector(`link[data-gantt-css]`)) return Promise.resolve();
    return new Promise((resolve) => {
      const link = this.document.createElement('link');
      link.rel = 'stylesheet';
      link.href = ESTILOS_GANTT;
      link.dataset['ganttCss'] = '';
      link.onload = () => resolve();
      link.onerror = () => resolve();
      this.document.head.appendChild(link);
    });
  }

  private registrarEventos(g: GanttStatic): void {
    const modificado = () => this.modificado();
    for (const evento of ['onAfterTaskAdd', 'onAfterTaskUpdate', 'onAfterTaskDelete', 'onAfterLinkAdd', 'onAfterLinkUpdate', 'onAfterLinkDelete', 'onRowDragEnd', 'onAfterTaskMove'] as const) {
      g.attachEvent(evento, modificado);
    }
    // Los ids nuevos son uuid, igual que los que genera la API.
    g.attachEvent('onTaskCreated', (task: TareaGantt) => {
      task.progress ??= 0;
      return true;
    });
    g.attachEvent('onAfterTaskAdd', (id: string | number) => {
      if (!this.esUuid(id)) g.changeTaskId(id, crypto.randomUUID());
    });
    g.attachEvent('onAfterLinkAdd', (id: string | number) => {
      if (!this.esUuid(id)) g.changeLinkId(id, crypto.randomUUID());
    });
    // Un capítulo no puede volverse hito ni un hito tener actividades dentro.
    g.attachEvent('onBeforeTaskMove', (_id: string | number, parent: string | number) => !parent || parent === g.config.root_id || g.getTask(parent).type !== 'milestone');
    g.attachEvent('onBeforeLinkAdd', (_id: string | number, link: Link) => link.source !== link.target);
    g.attachEvent('onTaskOpened', () => this.modificado(false));
    g.attachEvent('onTaskClosed', () => this.modificado(false));
    g.attachEvent('onBeforeTaskDisplay', (id: string | number, task: TareaGantt) => this.visible(g, id, task));
    g.ext.zoom.attachEvent('onAfterZoom', () => this.modificado(false));
    // Con click_drag: arrastrar sobre la fila de una actividad le asigna esas fechas.
    g.config.click_drag = {
      callback: (_p: unknown, _q: unknown, startDate: Date, endDate: Date, _between: unknown, tasksInRow: TareaGantt[]) => {
        if (this.soloLectura() || tasksInRow.length !== 1) return;
        const t = tasksInRow[0];
        if (t.type === 'project') return;
        t.start_date = g.roundDate(startDate);
        t.end_date = t.type === 'milestone' ? t.start_date : g.roundDate(endDate);
        t.duration = t.type === 'milestone' ? 0 : Math.max(1, g.calculateDuration({ start_date: t.start_date!, end_date: t.end_date!, task: t }));
        g.updateTask(t.id);
      },
      singleRow: true,
      ignore: '.gantt_task_line, .gantt_task_link',
    } as never;
  }

  private esUuid(id: string | number): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(id));
  }

  /** Agrupa los eventos de un mismo gesto en un solo paso del historial. */
  private modificado(historial = true): void {
    if (this.restaurando) return;
    if (this.pendiente) clearTimeout(this.pendiente);
    this.pendiente = setTimeout(() => {
      this.pendiente = null;
      this.zone.run(() => {
        this.recalcular();
        if (!historial) return;
        const actual = this.snapshot();
        if (actual === this.historial[this.posicion]) return;
        this.historial = [...this.historial.slice(0, this.posicion + 1), actual].slice(-MAX_HISTORIAL);
        this.posicion = this.historial.length - 1;
        this.actualizarHistorial();
        this.cambio.emit();
      });
    }, 30);
  }

  private snapshot(): string {
    return JSON.stringify(this.serializar());
  }

  private restaurar(estado: string): void {
    const g = this.gantt!;
    const { tareas, vinculos } = JSON.parse(estado) as { tareas: Tarea[]; vinculos: Vinculo[] };
    const posicion = this.posicion;
    const historial = this.historial;
    const escala = this.escalaActual();
    this.cargar({ tareas, vinculos, escala } as Programacion);
    this.historial = historial;
    this.posicion = posicion;
    this.actualizarHistorial();
    this.cambio.emit();
    g.render();
  }

  private actualizarHistorial(): void {
    this.puedeDeshacer.set(this.posicion > 0);
    this.puedeRehacer.set(this.posicion < this.historial.length - 1);
  }

  private nodos() {
    const g = this.gantt!;
    const nodos: { id: string; parentId: string | null; tipo: TipoTarea; inicio: number; duracion: number }[] = [];
    g.eachTask((t: TareaGantt) => {
      const inicio = aDia(t.start_date!);
      nodos.push({
        id: String(t.id),
        parentId: t.parent && t.parent !== g.config.root_id ? String(t.parent) : null,
        tipo: (t.type as TipoTarea) ?? 'task',
        inicio,
        duracion: t.type === 'milestone' ? 0 : aDia(t.end_date!) - inicio,
      });
    });
    return nodos;
  }

  private arcos() {
    return this.gantt!.getLinks().map((l: Link) => ({
      id: String(l.id),
      origen: String(l.source),
      destino: String(l.target),
      tipo: Number(l.type) as TipoVinculo,
      desfase: Math.round(Number(l.lag ?? 0)),
    }));
  }

  /** Avance de capítulos, ruta crítica e indicadores después de cada cambio. */
  private recalcular(): void {
    const g = this.gantt;
    if (!g) return;
    const tareas: TareaGantt[] = [];
    g.eachTask((t: TareaGantt) => tareas.push(t));

    // Avance ponderado de los capítulos (DHTMLX Community no lo calcula).
    const { porCapitulo, total } = avancePonderado(
      tareas.map((t) => ({ id: String(t.id), parentId: t.parent && t.parent !== g.config.root_id ? String(t.parent) : null, tipo: (t.type as TipoTarea) ?? 'task', duracion: t.duration ?? 0, progreso: t.progress ?? 0, valor: t.valor ?? null })),
    );
    this.restaurando = true;
    for (const t of tareas) {
      const avance = porCapitulo.get(String(t.id));
      if (avance !== undefined && Math.abs((t.progress ?? 0) - avance) > 0.0001) {
        t.progress = avance;
        g.refreshTask(t.id);
      }
    }
    this.restaurando = false;

    const nodos = this.nodos();
    const arcos = this.arcos();
    this.holguras = rutaCritica(nodos, arcos);
    this.vinculosCriticos = new Set(
      arcos.filter((a) => this.holguras.get(a.origen)?.critica && this.holguras.get(a.destino)?.critica).map((a) => a.id),
    );

    // El fin de una actividad es exclusivo; un hito marca su propio día.
    const inicio = nodos.length ? Math.min(...nodos.map((n) => n.inicio)) : null;
    const finExclusivo = nodos.length ? Math.max(...nodos.map((n) => n.inicio + n.duracion)) : null;
    const ultimoDia = nodos.length ? Math.max(...nodos.map((n) => (n.duracion > 0 ? n.inicio + n.duracion - 1 : n.inicio))) : null;
    const hojas = tareas.filter((t) => t.type !== 'project');
    this.indicadores.set({
      inicio: inicio === null ? null : deDia(inicio),
      fin: ultimoDia === null ? null : deDia(ultimoDia),
      duracion: inicio === null || finExclusivo === null ? 0 : finExclusivo - inicio,
      avance: total,
      actividades: hojas.length,
      atrasadas: hojas.filter(atrasada).length,
      criticas: hojas.filter((t) => this.holguras.get(String(t.id))?.critica).length,
    });
    g.render();
  }

  private codigo(t: TareaGantt): string {
    if (t.referencia) return t.referencia;
    const g = this.gantt!;
    const partes: number[] = [];
    let actual: TareaGantt | null = t;
    while (actual) {
      partes.unshift(g.getTaskIndex(actual.id) + 1);
      actual = actual.parent && actual.parent !== g.config.root_id && g.isTaskExists(actual.parent) ? (g.getTask(actual.parent) as TareaGantt) : null;
    }
    return partes.join('.');
  }

  private predecesoras(t: TareaGantt): string {
    const g = this.gantt!;
    return (t.$target ?? [])
      .map((id: string | number) => {
        const l = g.getLink(id);
        if (!g.isTaskExists(l.source)) return '';
        const lag = Number(l.lag ?? 0);
        return `${this.codigo(g.getTask(l.source) as TareaGantt)}${TIPOS_VINCULO[Number(l.type) as TipoVinculo].corto}${lag ? (lag > 0 ? `+${lag}` : lag) : ''}`;
      })
      .filter(Boolean)
      .join(', ');
  }

  /** Filtro por texto y estado; un capítulo se muestra si alguna de sus actividades coincide. */
  private visible(g: GanttStatic, id: string | number, task: TareaGantt): boolean {
    if (!this.filtroTexto && this.filtro === 'todas') return true;
    const coincide = (t: TareaGantt): boolean => {
      const texto = `${this.codigo(t)} ${t.text} ${t.responsable ?? ''}`.toLocaleLowerCase('es');
      if (this.filtroTexto && !texto.includes(this.filtroTexto)) return false;
      const p = t.progress ?? 0;
      switch (this.filtro) {
        case 'criticas':
          return !!this.holguras.get(String(t.id))?.critica;
        case 'atrasadas':
          return atrasada(t);
        case 'en-curso':
          return p > 0 && p < 1;
        case 'sin-iniciar':
          return p === 0;
        case 'terminadas':
          return p >= 1;
        default:
          return true;
      }
    };
    if (task.type !== 'project') return coincide(task);
    let alguno = coincide(task);
    g.eachTask((hijo: TareaGantt) => {
      if (!alguno && hijo.type !== 'project' && coincide(hijo)) alguno = true;
    }, id);
    return alguno;
  }
}
