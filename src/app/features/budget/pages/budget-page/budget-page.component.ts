import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { MatSnackBar } from '@angular/material/snack-bar';

import { PageHeaderComponent } from '../../../../shared/ui/page-header/page-header.component';
import { BudgetFilterChipsComponent } from '../../components/budget-filter-chips/budget-filter-chips.component';
import { BudgetItemDetailComponent } from '../../components/budget-item-detail/budget-item-detail.component';
import { BudgetItemsTableComponent } from '../../components/budget-items-table/budget-items-table.component';
import { BudgetStore } from '../../data-access/budget.store';
import { BUDGET_MATERIAL } from '../../material/budget-material';
import { BUDGET_CURRENCY, BudgetItemView, FILTER_OPTIONS } from '../../models/budget.model';

/** Página contenedora (smart): conecta el store con filtros, tabla y panel de detalle. */
@Component({
  selector: 'app-budget-page',
  imports: [CurrencyPipe, PageHeaderComponent, BudgetFilterChipsComponent, BudgetItemsTableComponent, BudgetItemDetailComponent, ...BUDGET_MATERIAL],
  templateUrl: './budget-page.component.html',
  styleUrl: './budget-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BudgetPageComponent implements OnInit {
  protected readonly store = inject(BudgetStore);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly currency = BUDGET_CURRENCY;
  protected readonly filterOptions = FILTER_OPTIONS;

  ngOnInit(): void {
    this.store.load();
  }

  protected onHistory(item: BudgetItemView): void {
    this.notify(`Movimientos de ${item.code} · ${item.name}: próximamente`);
  }

  protected onAdjust(item: BudgetItemView): void {
    this.notify(`Ajuste de ${item.code} · ${item.name}: próximamente`);
  }

  private notify(message: string): void {
    this.snackBar.open(message, 'Cerrar', { duration: 3000 });
  }
}
