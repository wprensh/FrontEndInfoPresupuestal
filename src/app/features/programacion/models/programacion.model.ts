/** Programación de obra (diagrama de Gantt) y contrato de `/api/presupuestos/:id/programacion`. */

export type TipoTarea = 'task' | 'project' | 'milestone';

export type EscalaProgramacion = 'dia' | 'semana' | 'mes' | 'trimestre' | 'anio';

/** 0 fin-inicio, 1 inicio-inicio, 2 fin-fin, 3 inicio-fin (igual que DHTMLX Gantt). */
export type TipoVinculo = 0 | 1 | 2 | 3;

export const TIPOS_VINCULO: Record<TipoVinculo, { corto: string; nombre: string }> = {
  0: { corto: 'FC', nombre: 'Fin a comienzo' },
  1: { corto: 'CC', nombre: 'Comienzo a comienzo' },
  2: { corto: 'FF', nombre: 'Fin a fin' },
  3: { corto: 'CF', nombre: 'Comienzo a fin' },
};

export const ESCALAS: { valor: EscalaProgramacion; nombre: string }[] = [
  { valor: 'dia', nombre: 'Día' },
  { valor: 'semana', nombre: 'Semana' },
  { valor: 'mes', nombre: 'Mes' },
  { valor: 'trimestre', nombre: 'Trimestre' },
  { valor: 'anio', nombre: 'Año' },
];

export interface Tarea {
  id: string;
  parentId: string | null;
  orden?: number;
  tipo: TipoTarea;
  texto: string;
  /** Consecutivo del presupuesto ("2" o "2.3") del que salió la actividad. */
  referencia: string | null;
  /** yyyy-MM-dd */
  fechaInicio: string;
  /** Días calendario; 0 en los hitos. */
  duracion: number;
  fechaFin?: string;
  /** Fracción 0–1. */
  progreso: number;
  responsable: string | null;
  /** #rrggbb o null para el color del tipo. */
  color: string | null;
  notas: string | null;
  /** Valor del capítulo o ítem; pondera el avance. */
  valor: number | null;
  lineaBaseInicio: string | null;
  lineaBaseFin: string | null;
  abierta: boolean;
}

export interface Vinculo {
  id: string;
  origen: string;
  destino: string;
  tipo: TipoVinculo;
  /** Días de espera (positivo) o adelanto (negativo). */
  desfase: number;
}

export interface Programacion {
  presupuestoId: string;
  codigo: string;
  nombreObra: string;
  estado: string;
  duracionPresupuesto: number | null;
  costoDirecto: number;
  existe: boolean;
  fechaInicio: string;
  escala: EscalaProgramacion;
  tareas: Tarea[];
  vinculos: Vinculo[];
  actualizadoEn: string | null;
}

export interface ProgramacionDto {
  fechaInicio: string;
  escala: EscalaProgramacion;
  tareas: Tarea[];
  vinculos: Vinculo[];
}

export interface GenerarProgramacionDto {
  fechaInicio: string | null;
  duracionDias: number | null;
  reemplazar: boolean;
}

export interface ProgramacionResumen {
  presupuestoId: string;
  codigo: string;
  nombreObra: string;
  cliente: string | null;
  estado: string;
  existe: boolean;
  fechaInicio: string | null;
  fechaFin: string | null;
  actividades: number;
  /** Fracción 0–1 ponderada por valor. */
  avance: number | null;
  actualizadoEn: string | null;
}
