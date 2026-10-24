import { Routes } from '@angular/router';
import { provideNativeDateAdapter } from '@angular/material/core';

import { ApuApiService } from './data-access/apu-api.service';

const formPage = () => import('./pages/apu-form-page/apu-form-page.component').then((m) => m.ApuFormPageComponent);

export const APU_ROUTES: Routes = [
  {
    path: '',
    providers: [ApuApiService, provideNativeDateAdapter()],
    children: [
      {
        path: '',
        title: 'Análisis de precios unitarios | InfoPresupuestal',
        loadComponent: () => import('./pages/apu-list-page/apu-list-page.component').then((m) => m.ApuListPageComponent),
      },
      { path: 'nuevo', title: 'Nuevo APU | InfoPresupuestal', loadComponent: formPage },
      { path: ':id', title: 'APU | InfoPresupuestal', loadComponent: formPage },
    ],
  },
];
