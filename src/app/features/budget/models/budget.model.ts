export type InputType = 'materials' | 'labor' | 'equipment' | 'indirect';
export type BudgetStatus = 'ok' | 'warning' | 'overrun';
export type BudgetFilter = 'all' | BudgetStatus;

/** Insumo de una partida (materiales, mano de obra, etc.). */
export interface BudgetInput {
  type: InputType;
  budget: number;
  executed: number;
}

/** Partida tal como la entrega la API. */
export interface BudgetItem {
  id: string;
  code: string;
  name: string;
  budget: number;
  executed: number;
  /** Avance físico 0–100. */
  physicalProgress: number;
  inputs: BudgetInput[];
}

/** Partida enriquecida con indicadores calculados en el cliente. */
export interface BudgetItemView extends BudgetItem {
  earnedValue: number;
  /** Ejercido − valor ganado. Positivo = sobrecosto. */
  variance: number;
  remaining: number;
  /** Ejercido / presupuesto (0–1+). */
  executedRatio: number;
  status: BudgetStatus;
}

export interface BudgetTotals {
  budget: number;
  executed: number;
  remaining: number;
  executedRatio: number;
}

export const BUDGET_CURRENCY = 'PEN';

export const STATUS_LABELS: Record<BudgetStatus, string> = {
  ok: 'En rango',
  warning: 'Atención',
  overrun: 'Sobrecosto',
};

export const FILTER_OPTIONS: readonly { value: BudgetFilter; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'overrun', label: STATUS_LABELS.overrun },
  { value: 'warning', label: STATUS_LABELS.warning },
  { value: 'ok', label: STATUS_LABELS.ok },
];

export const INPUT_LABELS: Record<InputType, string> = {
  materials: 'Materiales',
  labor: 'Mano de obra',
  equipment: 'Maquinaria y equipo',
  indirect: 'Indirectos',
};

export const INPUT_ICONS: Record<InputType, string> = {
  materials: 'construction',
  labor: 'engineering',
  equipment: 'precision_manufacturing',
  indirect: 'request_page',
};
