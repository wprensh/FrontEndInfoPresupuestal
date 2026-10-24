import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { BudgetItem } from '../models/budget.model';
import { BudgetApiService } from './budget-api.service';
import { BudgetStore } from './budget.store';

const ok: BudgetItem = { id: '1', code: '01', name: 'Preliminares', budget: 1000, executed: 400, physicalProgress: 50, inputs: [] };
const overrun: BudgetItem = { ...ok, id: '2', code: '02', name: 'Cimentación', executed: 1200, physicalProgress: 90 };

describe('BudgetStore', () => {
  let store: BudgetStore;
  let api: jasmine.SpyObj<BudgetApiService>;

  beforeEach(() => {
    api = jasmine.createSpyObj<BudgetApiService>('BudgetApiService', ['getItems']);
    TestBed.configureTestingModule({
      providers: [BudgetStore, { provide: BudgetApiService, useValue: api }],
    });
    store = TestBed.inject(BudgetStore);
  });

  it('loads items, selects the first overrun and filters by status', async () => {
    api.getItems.and.returnValue(of([ok, overrun]));

    await store.load();

    expect(store.selectedItem()?.id).toBe('2');
    store.setFilter('ok');
    expect(store.filteredItems().map((i) => i.id)).toEqual(['1']);
    expect(store.totals().budget).toBe(2000);
  });

  it('exposes the error message when the API fails', async () => {
    api.getItems.and.returnValue(throwError(() => new Error('Error 500')));

    await store.load();

    expect(store.error()).toBe('Error 500');
    expect(store.loading()).toBeFalse();
  });
});
