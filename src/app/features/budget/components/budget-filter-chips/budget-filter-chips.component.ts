import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatChipListboxChange } from '@angular/material/chips';

import { BUDGET_MATERIAL } from '../../material/budget-material';
import { BudgetFilter } from '../../models/budget.model';

/** Chips de filtro por estado. Presentacional: `input()` + `output()`. */
@Component({
  selector: 'app-budget-filter-chips',
  imports: [...BUDGET_MATERIAL],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <mat-chip-listbox aria-label="Filtrar partidas por estado" [value]="value()" (change)="onChange($event)">
      @for (option of options(); track option.value) {
        <mat-chip-option [value]="option.value" [selectable]="option.value !== value()">
          {{ option.label }}
          <span class="count">{{ counts()[option.value] }}</span>
        </mat-chip-option>
      }
    </mat-chip-listbox>
  `,
  styles: `
    .count { margin-left: 6px; font: 500 12px var(--ip-font-mono); opacity: 0.7; }
  `,
})
export class BudgetFilterChipsComponent {
  readonly options = input.required<readonly { value: BudgetFilter; label: string }[]>();
  readonly counts = input.required<Record<BudgetFilter, number>>();
  readonly value = input.required<BudgetFilter>();
  readonly valueChange = output<BudgetFilter>();

  protected onChange(event: MatChipListboxChange): void {
    if (event.value) this.valueChange.emit(event.value as BudgetFilter);
  }
}
