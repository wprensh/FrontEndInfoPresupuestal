import { Routes } from '@angular/router';
import { provideNativeDateAdapter } from '@angular/material/core';

import { PresupuestosApiService } from './data-access/presupuestos-api.service';

const formPage = () => import('./pages/presupuesto-form-page/presupuesto-form-page.component').then((m) => m.PresupuestoFormPageComponent);

export const PRESUPUESTOS_ROUTES: Routes = [
  {
    path: '',
    providers: [PresupuestosApiService, provideNativeDateAdapter()],
    children: [
      {
        path: '',
        title: 'Presupuestos de obra | InfoPresupuestal',
        loadComponent: () => import('./pages/presupuestos-list-page/presupuestos-list-page.component').then((m) => m.PresupuestosListPageComponent),
      },
      { path: 'nuevo', title: 'Nuevo presupuesto | InfoPresupuestal', loadComponent: formPage },
      { path: ':id', title: 'Presupuesto | InfoPresupuestal', loadComponent: formPage },
    ],
  },
];
