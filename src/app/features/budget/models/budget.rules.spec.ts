import { BudgetItem } from './budget.model';
import { countByStatus, resolveStatus, sumTotals, toView } from './budget.rules';

const base: BudgetItem = { id: '1', code: '01', name: 'Cimentación', budget: 1000, executed: 500, physicalProgress: 50, inputs: [] };

describe('budget.rules', () => {
  it('marks as overrun when executed exceeds budget', () => {
    expect(resolveStatus({ ...base, executed: 1001, physicalProgress: 100 })).toBe('overrun');
  });

  it('marks as warning when executed is slightly above earned value', () => {
    expect(resolveStatus({ ...base, executed: 520 })).toBe('warning');
  });

  it('marks as ok when executed is within earned value', () => {
    expect(resolveStatus(base)).toBe('ok');
  });

  it('computes variance, remaining and totals', () => {
    const view = toView({ ...base, executed: 600 });
    expect(view.variance).toBe(100);
    expect(view.remaining).toBe(400);
    expect(sumTotals([base, base]).executedRatio).toBe(0.5);
    expect(countByStatus([view, toView(base)])).toEqual({ all: 2, ok: 1, warning: 0, overrun: 1 });
  });
});
