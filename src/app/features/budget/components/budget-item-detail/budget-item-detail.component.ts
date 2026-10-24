import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CurrencyPipe } from '@angular/common';

import { BUDGET_MATERIAL } from '../../material/budget-material';
import { BUDGET_CURRENCY, BudgetInput, BudgetItemView, INPUT_ICONS, INPUT_LABELS, STATUS_LABELS } from '../../models/budget.model';

/** Panel de detalle de una partida con desglose por insumo. Presentacional. */
@Component({
  selector: 'app-budget-item-detail',
  imports: [CurrencyPipe, ...BUDGET_MATERIAL],
  templateUrl: './budget-item-detail.component.html',
  styleUrl: './budget-item-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BudgetItemDetailComponent {
  readonly item = input.required<BudgetItemView>();
  readonly history = output<BudgetItemView>();
  readonly adjust = output<BudgetItemView>();

  protected readonly currency = BUDGET_CURRENCY;
  protected readonly statusLabels = STATUS_LABELS;
  protected readonly inputLabels = INPUT_LABELS;
  protected readonly inputIcons = INPUT_ICONS;

  protected usage(input: BudgetInput): number {
    return input.budget ? Math.min(100, (input.executed / input.budget) * 100) : 0;
  }
}
