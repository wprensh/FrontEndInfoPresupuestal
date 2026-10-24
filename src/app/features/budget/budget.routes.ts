import { Routes } from '@angular/router';

import { BudgetApiService } from './data-access/budget-api.service';
import { BudgetStore } from './data-access/budget.store';

/** Punto de entrada público del slice de control presupuestal. */
export const BUDGET_ROUTES: Routes = [
  {
    path: '',
    providers: [BudgetApiService, BudgetStore],
    children: [
      {
        path: '',
        title: 'Partidas | InfoPresupuestal',
        loadComponent: () => import('./pages/budget-page/budget-page.component').then((m) => m.BudgetPageComponent),
      },
    ],
  },
];
