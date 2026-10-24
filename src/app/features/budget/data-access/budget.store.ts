import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { BudgetFilter, BudgetItem } from '../models/budget.model';
import { countByStatus, sumTotals, toView } from '../models/budget.rules';
import { BudgetApiService } from './budget-api.service';

interface BudgetState {
  items: BudgetItem[];
  loading: boolean;
  error: string | null;
  filter: BudgetFilter;
  selectedId: string | null;
}

const initialState: BudgetState = {
  items: [],
  loading: false,
  error: null,
  filter: 'all',
  selectedId: null,
};

/**
 * Estado de la feature de control presupuestal basado en Signals.
 * Se provee en `budget.routes.ts` para que su ciclo de vida quede ligado a la ruta.
 */
@Injectable()
export class BudgetStore {
  private readonly api = inject(BudgetApiService);
  private readonly state = signal<BudgetState>(initialState);

  // Selectores de solo lectura
  readonly loading = computed(() => this.state().loading);
  readonly error = computed(() => this.state().error);
  readonly filter = computed(() => this.state().filter);
  readonly selectedId = computed(() => this.state().selectedId);

  readonly items = computed(() => this.state().items.map(toView));
  readonly filteredItems = computed(() => {
    const filter = this.filter();
    return filter === 'all' ? this.items() : this.items().filter((i) => i.status === filter);
  });
  readonly selectedItem = computed(() => this.items().find((i) => i.id === this.selectedId()) ?? null);
  readonly totals = computed(() => sumTotals(this.state().items));
  readonly statusCounts = computed(() => countByStatus(this.items()));

  setFilter(filter: BudgetFilter): void {
    this.patch({ filter });
  }

  select(id: string): void {
    this.patch({ selectedId: id });
  }

  async load(): Promise<void> {
    this.patch({ loading: true, error: null });
    try {
      const items = await firstValueFrom(this.api.getItems());
      this.patch({ items, loading: false });
      if (!this.selectedItem()) this.selectFirstAttention();
    } catch (e) {
      this.fail(e);
    }
  }

  /** Por defecto se enfoca la primera partida que requiere atención. */
  private selectFirstAttention(): void {
    const items = this.items();
    const target = items.find((i) => i.status === 'overrun') ?? items.find((i) => i.status === 'warning') ?? items[0];
    this.patch({ selectedId: target?.id ?? null });
  }

  private patch(partial: Partial<BudgetState>): void {
    this.state.update((s) => ({ ...s, ...partial }));
  }

  private fail(e: unknown): void {
    this.patch({ loading: false, error: e instanceof Error ? e.message : 'Error inesperado' });
  }
}
