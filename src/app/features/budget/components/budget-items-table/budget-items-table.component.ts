import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CurrencyPipe, PercentPipe } from '@angular/common';

import { BUDGET_MATERIAL } from '../../material/budget-material';
import { BUDGET_CURRENCY, BudgetItemView, BudgetTotals, STATUS_LABELS } from '../../models/budget.model';

/** Grid de partidas con fila de totales. No conoce el store ni la API. */
@Component({
  selector: 'app-budget-items-table',
  imports: [CurrencyPipe, PercentPipe, ...BUDGET_MATERIAL],
  templateUrl: './budget-items-table.component.html',
  styleUrl: './budget-items-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BudgetItemsTableComponent {
  readonly items = input.required<BudgetItemView[]>();
  readonly totals = input.required<BudgetTotals>();
  readonly selectedId = input<string | null>(null);
  readonly itemSelected = output<BudgetItemView>();

  protected readonly currency = BUDGET_CURRENCY;
  protected readonly columns = ['code', 'name', 'budget', 'executed', 'remaining', 'executedRatio', 'physicalProgress'];

  /** Las filas de mat-table llegan sin tipo (`let item`), así que el índice se tipa aquí. */
  protected statusLabel(item: BudgetItemView): string {
    return STATUS_LABELS[item.status];
  }
}
