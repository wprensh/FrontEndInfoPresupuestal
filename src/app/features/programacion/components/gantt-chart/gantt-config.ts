import { escapeHTML } from 'dhtmlx-gantt';
import type { GanttStatic, Task } from 'dhtmlx-gantt';

import { EscalaProgramacion, TIPOS_VINCULO, TipoVinculo } from '../../models/programacion.model';

/**
 * Configuración de DHTMLX Gantt Community en español con las funciones de la edición gratuita:
 * grilla con edición en línea, lightbox, zoom, tooltips, información rápida, teclado, pantalla completa,
 * arrastre de la línea de tiempo y selección por arrastre.
 */

/** Campos propios que viajan en cada tarea del diagrama. */
export interface TareaGantt extends Task {
  referencia?: string | null;
  responsable?: string | null;
  color?: string;
  notas?: string | null;
  valor?: number | null;
  linea_base_inicio?: Date | null;
  linea_base_fin?: Date | null;
}

const COP = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
export const formatoCop = (v: number) => COP.format(v);
const texto = (v: unknown) => escapeHTML(String(v ?? ''));

/** Colores para las actividades: el primero es el institucional (se guarda como null). */
export const COLORES_TAREA: { key: string; label: string }[] = [
  { key: '', label: 'Según el tipo' },
  { key: '#00838f', label: 'Cian' },
  { key: '#2e7d32', label: 'Verde' },
  { key: '#f2b84b', label: 'Ámbar' },
  { key: '#ef6c00', label: 'Naranja' },
  { key: '#c62828', label: 'Rojo' },
  { key: '#6a1b9a', label: 'Morado' },
  { key: '#455a64', label: 'Gris' },
];

// Claves de texto: el select de DHTMLX trata el 0 numérico como vacío.
const PORCENTAJES = Array.from({ length: 11 }, (_, i) => ({ key: String(i / 10), label: `${i * 10} %` }));

/** Niveles del zoom (Ctrl + rueda del mouse o los botones de escala). */
export const NIVELES_ZOOM: { name: EscalaProgramacion; scale_height: number; min_column_width: number; scales: { unit: string; step: number; format: string | ((d: Date) => string) }[] }[] = [
  {
    name: 'dia',
    scale_height: 50,
    min_column_width: 34,
    scales: [
      { unit: 'month', step: 1, format: '%F %Y' },
      { unit: 'day', step: 1, format: '%d' },
    ],
  },
  {
    name: 'semana',
    scale_height: 50,
    min_column_width: 60,
    scales: [
      { unit: 'month', step: 1, format: '%F %Y' },
      { unit: 'week', step: 1, format: (d: Date) => `Sem ${semanaIso(d)}` },
    ],
  },
  {
    name: 'mes',
    scale_height: 50,
    min_column_width: 80,
    scales: [
      { unit: 'year', step: 1, format: '%Y' },
      { unit: 'month', step: 1, format: '%M' },
    ],
  },
  {
    name: 'trimestre',
    scale_height: 50,
    min_column_width: 90,
    scales: [
      { unit: 'year', step: 1, format: '%Y' },
      { unit: 'quarter', step: 1, format: (d: Date) => `T${Math.floor(d.getMonth() / 3) + 1}` },
    ],
  },
  {
    name: 'anio',
    scale_height: 50,
    min_column_width: 90,
    scales: [{ unit: 'year', step: 1, format: '%Y' }],
  },
];

function semanaIso(d: Date): number {
  const fecha = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dia = fecha.getUTCDay() || 7;
  fecha.setUTCDate(fecha.getUTCDate() + 4 - dia);
  const inicioAnio = new Date(Date.UTC(fecha.getUTCFullYear(), 0, 1));
  return Math.ceil(((fecha.getTime() - inicioAnio.getTime()) / 86_400_000 + 1) / 7);
}

export interface EstadoVisual {
  critica: (id: string | number) => boolean;
  holgura: (id: string | number) => number | null;
  vinculoCritico: (id: string | number) => boolean;
  /** Código visible (referencia o posición en el árbol). */
  codigo: (task: TareaGantt) => string;
  predecesoras: (task: TareaGantt) => string;
}

const hoy = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
};

/** Días de diferencia entre el fin actual y el de la línea base (positivo = atraso). */
export function desviacion(t: TareaGantt): number | null {
  if (!t.linea_base_fin || !t.end_date) return null;
  return Math.round((t.end_date.getTime() - t.linea_base_fin.getTime()) / 86_400_000);
}

export function atrasada(t: TareaGantt): boolean {
  return t.type !== 'project' && (t.progress ?? 0) < 1 && !!t.end_date && t.end_date < hoy();
}

export function configurarGantt(gantt: GanttStatic, soloLectura: boolean, estado: EstadoVisual): void {
  gantt.plugins({ tooltip: true, quick_info: true, keyboard_navigation: true, fullscreen: true, drag_timeline: true, click_drag: true, export_api: true });
  gantt.i18n.setLocale('es');
  Object.assign(gantt.locale.labels, {
    section_description: 'Actividad',
    section_type: 'Tipo',
    section_responsable: 'Responsable',
    section_progress: 'Avance',
    section_color: 'Color',
    section_notas: 'Notas',
    section_time: 'Fechas',
    section_parent: 'Capítulo',
    type_task: 'Actividad',
    type_project: 'Capítulo',
    type_milestone: 'Hito',
    new_task: 'Nueva actividad',
    link_start: '(inicio)',
    link_end: '(fin)',
  });

  const c = gantt.config;
  c.date_format = '%Y-%m-%d';
  c.duration_unit = 'day';
  c.work_time = false;
  c.row_height = 34;
  c.bar_height = 20;
  c.scale_height = 50;
  c.grid_width = 560;
  c.min_column_width = 60;
  c.fit_tasks = true;
  c.open_tree_initially = true;
  c.show_errors = false;
  c.sort = true;
  c.order_branch = !soloLectura;
  c.order_branch_free = !soloLectura;
  c.readonly = soloLectura;
  c.drag_links = !soloLectura;
  c.drag_progress = !soloLectura;
  c.drag_move = !soloLectura;
  c.drag_resize = !soloLectura;
  c.details_on_dblclick = true;
  c.quick_info_detached = true;
  c.show_quick_info = true;
  c.tooltip_timeout = 250;
  c.keyboard_navigation_cells = true;
  c.drag_timeline = { ignore: '.gantt_task_line, .gantt_task_link', useKey: false } as never;
  c.lightbox.sections = [
    { name: 'description', height: 52, map_to: 'text', type: 'textarea', focus: true },
    { name: 'type', type: 'typeselect', map_to: 'type' },
    { name: 'responsable', height: 32, map_to: 'responsable', type: 'textarea' },
    { name: 'progress', map_to: 'progress', type: 'select', options: PORCENTAJES },
    { name: 'color', map_to: 'color', type: 'select', options: COLORES_TAREA },
    { name: 'notas', height: 60, map_to: 'notas', type: 'textarea' },
    { name: 'time', type: 'duration', map_to: 'auto', time_format: ['%d', '%m', '%Y'] },
  ] as never;
  c.lightbox.project_sections = [
    { name: 'description', height: 52, map_to: 'text', type: 'textarea', focus: true },
    { name: 'type', type: 'typeselect', map_to: 'type' },
    { name: 'responsable', height: 32, map_to: 'responsable', type: 'textarea' },
    { name: 'color', map_to: 'color', type: 'select', options: COLORES_TAREA },
    { name: 'notas', height: 60, map_to: 'notas', type: 'textarea' },
    { name: 'time', type: 'duration', readonly: true, map_to: 'auto', time_format: ['%d', '%m', '%Y'] },
  ] as never;
  c.lightbox.milestone_sections = [
    { name: 'description', height: 52, map_to: 'text', type: 'textarea', focus: true },
    { name: 'type', type: 'typeselect', map_to: 'type' },
    { name: 'responsable', height: 32, map_to: 'responsable', type: 'textarea' },
    { name: 'notas', height: 60, map_to: 'notas', type: 'textarea' },
    { name: 'time', type: 'duration', single_date: true, map_to: 'auto', time_format: ['%d', '%m', '%Y'] },
  ] as never;

  const editorTexto = { type: 'text', map_to: 'text' };
  const editorFecha = { type: 'date', map_to: 'start_date' };
  const editorDuracion = { type: 'number', map_to: 'duration', min: 0, max: 3650 };
  const editorAvance = { type: 'select', map_to: 'progress', options: PORCENTAJES };
  const editorResponsable = { type: 'text', map_to: 'responsable' };
  const fecha = gantt.date.date_to_str('%d/%m/%Y');

  c.columns = [
    { name: 'codigo', label: 'N°', width: 46, align: 'left', template: (t: TareaGantt) => texto(estado.codigo(t)) },
    { name: 'text', label: 'Actividad', tree: true, width: 240, min_width: 160, resize: true, editor: soloLectura ? undefined : editorTexto },
    { name: 'start_date', label: 'Inicio', width: 84, align: 'center', resize: true, editor: soloLectura ? undefined : editorFecha, template: (t: Task) => fecha(t.start_date!) },
    { name: 'duration', label: 'Días', width: 50, align: 'center', editor: soloLectura ? undefined : editorDuracion },
    {
      name: 'progress',
      label: 'Avance',
      width: 62,
      align: 'center',
      editor: soloLectura ? undefined : editorAvance,
      template: (t: Task) => (t.type === 'milestone' ? '' : `${Math.round((t.progress ?? 0) * 100)} %`),
    },
    { name: 'predecesoras', label: 'Pred.', width: 70, align: 'center', template: (t: TareaGantt) => texto(estado.predecesoras(t)) },
    { name: 'responsable', label: 'Responsable', width: 110, resize: true, editor: soloLectura ? undefined : editorResponsable, template: (t: TareaGantt) => texto(t.responsable) },
    {
      name: 'desviacion',
      label: 'Desv.',
      width: 56,
      align: 'center',
      template: (t: TareaGantt) => {
        const d = desviacion(t);
        if (d === null) return '';
        return `<span class="desv ${d > 0 ? 'atraso' : d < 0 ? 'adelanto' : ''}">${d > 0 ? '+' : ''}${d} d</span>`;
      },
    },
    ...(soloLectura ? [] : [{ name: 'add', label: '', width: 40 }]),
  ] as never;

  const t = gantt.templates;
  t.task_class = (_s, _e, task: TareaGantt) =>
    [
      `tipo-${task.type ?? 'task'}`,
      estado.critica(task.id) ? 'critica' : '',
      atrasada(task) ? 'atrasada' : '',
      task.color ? 'con-color' : '',
    ].join(' ');
  t.link_class = (link) => (estado.vinculoCritico(link.id) ? 'critica' : '');
  t.grid_row_class = (_s, _e, task: TareaGantt) => (task.type === 'project' ? 'fila-capitulo' : atrasada(task) ? 'fila-atrasada' : '');
  t.progress_text = (_s, _e, task) => (task.type === 'milestone' ? '' : `${Math.round((task.progress ?? 0) * 100)} %`);
  t.rightside_text = (_s, _e, task: TareaGantt) => {
    const partes: string[] = [];
    if (task.type === 'milestone') partes.push(texto(task.text));
    if (task.responsable) partes.push(texto(task.responsable));
    const d = desviacion(task);
    if (d) partes.push(`<span class="desv ${d > 0 ? 'atraso' : 'adelanto'}">${d > 0 ? '+' : ''}${d} d</span>`);
    return partes.join(' · ');
  };
  t.timeline_cell_class = (_task, date) => {
    const unidad = gantt.getScale()?.unit;
    const clases: string[] = [];
    if (unidad === 'day' && (date.getDay() === 0 || date.getDay() === 6)) clases.push('finde');
    if (unidad) {
      const siguiente = gantt.date.add(date, 1, unidad);
      const h = new Date();
      if (h >= date && h < siguiente) clases.push('hoy');
    }
    return clases.join(' ');
  };
  t.scale_cell_class = (date) => (gantt.getScale()?.unit === 'day' && (date.getDay() === 0 || date.getDay() === 6) ? 'finde' : '');
  t.tooltip_text = (start, end, task: TareaGantt) => {
    const filas = [
      `<b>${texto(estado.codigo(task))} ${texto(task.text)}</b>`,
      `Inicio: ${fecha(start)} · Fin: ${fecha(task.type === 'milestone' ? start : gantt.date.add(end, -1, 'day'))}`,
      task.type === 'milestone' ? 'Hito' : `Duración: ${task.duration} días · Avance: ${Math.round((task.progress ?? 0) * 100)} %`,
    ];
    if (task.responsable) filas.push(`Responsable: ${texto(task.responsable)}`);
    if (task.valor) filas.push(`Valor: ${formatoCop(task.valor)}`);
    const holgura = estado.holgura(task.id);
    if (holgura !== null) filas.push(estado.critica(task.id) ? '<span class="tt-critica">Ruta crítica (sin holgura)</span>' : `Holgura: ${holgura} días`);
    if (task.linea_base_inicio && task.linea_base_fin) {
      filas.push(`Línea base: ${fecha(task.linea_base_inicio)} – ${fecha(gantt.date.add(task.linea_base_fin, -1, 'day'))}`);
    }
    if (atrasada(task)) filas.push('<span class="tt-critica">Atrasada</span>');
    if (task.notas) filas.push(`<i>${texto(task.notas)}</i>`);
    return filas.join('<br>');
  };
  const qi = t as unknown as Record<string, (start: Date, end: Date, task: TareaGantt) => string>;
  qi['quick_info_header'] = (_s, _e, task) => `${texto(estado.codigo(task))} ${texto(task.text)}`;
  qi['quick_info_content'] = (_s, _e, task) => texto(task.notas ?? '');
  qi['quick_info_date'] = (start, end, task) =>
    task.type === 'milestone' ? fecha(start) : `${fecha(start)} – ${fecha(gantt.date.add(end, -1, 'day'))} · ${task.duration} días`;
  t.link_description = (link) => {
    const origen = gantt.getTask(link.source) as TareaGantt;
    const destino = gantt.getTask(link.target) as TareaGantt;
    return `${texto(origen.text)} → ${texto(destino.text)} (${TIPOS_VINCULO[Number(link.type) as TipoVinculo].nombre})`;
  };

  // El avance llega como texto desde los selects; se guarda como número. Si el avance actual no es un
  // múltiplo de 10 % (por ejemplo, al arrastrarlo en la barra) se agrega como opción para no perderlo.
  const seccionAvance = (c.lightbox.sections as unknown as { name: string; options: { key: string; label: string }[] }[]).find((x) => x.name === 'progress')!;
  gantt.attachEvent('onBeforeLightbox', (id: string | number) => {
    const task = gantt.getTask(id);
    const clave = String(Math.round(Number(task.progress ?? 0) * 1000) / 1000);
    const opciones = PORCENTAJES.some((o) => o.key === clave)
      ? PORCENTAJES
      : [...PORCENTAJES, { key: clave, label: `${Math.round(Number(clave) * 1000) / 10} %` }].sort((a, b) => Number(a.key) - Number(b.key));
    if (opciones.map((o) => o.key).join() !== seccionAvance.options.map((o) => o.key).join()) {
      seccionAvance.options = opciones;
      gantt.resetLightbox();
    }
    task.progress = clave as never;
    return true;
  });
  gantt.attachEvent('onAfterLightbox', () => {
    gantt.eachTask((task: Task) => {
      if (typeof task.progress === 'string') task.progress = Number(task.progress);
    });
  });
  gantt.attachEvent('onLightboxSave', (_id: string | number, task: TareaGantt) => {
    task.progress = Number(task.progress ?? 0);
    task.color = task.color || undefined;
    return true;
  });
  gantt.attachEvent('onBeforeTaskUpdate', (_id: string | number, task: Task) => {
    if (typeof task.progress === 'string') task.progress = Number(task.progress);
    return true;
  });

  gantt.ext.zoom.init({
    levels: NIVELES_ZOOM as never,
    useKey: 'ctrlKey',
    trigger: 'wheel',
    element: () => gantt.$root.querySelector('.gantt_task') as HTMLElement,
  });
}
