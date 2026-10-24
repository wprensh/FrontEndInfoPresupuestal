import { BudgetFilter, BudgetItem, BudgetItemView, BudgetStatus, BudgetTotals } from './budget.model';

/** Ejercido / valor ganado por encima del cual la partida se considera en sobrecosto. */
export const OVERRUN_RATIO = 1.06;

/** Reglas de negocio puras (sin Angular) para poder probarlas de forma aislada. */
export function earnedValue(item: BudgetItem): number {
  return (item.budget * item.physicalProgress) / 100;
}

export function resolveStatus(item: BudgetItem): BudgetStatus {
  if (item.executed > item.budget) return 'overrun';
  const ev = earnedValue(item);
  if (ev === 0) return item.executed > 0 ? 'warning' : 'ok';
  const ratio = item.executed / ev;
  if (ratio > OVERRUN_RATIO) return 'overrun';
  return ratio > 1 ? 'warning' : 'ok';
}

export function toView(item: BudgetItem): BudgetItemView {
  const ev = earnedValue(item);
  return {
    ...item,
    earnedValue: ev,
    variance: item.executed - ev,
    remaining: item.budget - item.executed,
    executedRatio: item.budget ? item.executed / item.budget : 0,
    status: resolveStatus(item),
  };
}

export function sumTotals(items: readonly BudgetItem[]): BudgetTotals {
  const budget = items.reduce((acc, i) => acc + i.budget, 0);
  const executed = items.reduce((acc, i) => acc + i.executed, 0);
  return { budget, executed, remaining: budget - executed, executedRatio: budget ? executed / budget : 0 };
}

export function countByStatus(items: readonly BudgetItemView[]): Record<BudgetFilter, number> {
  const counts: Record<BudgetFilter, number> = { all: items.length, ok: 0, warning: 0, overrun: 0 };
  for (const i of items) counts[i.status]++;
  return counts;
}
