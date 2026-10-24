import { Routes } from '@angular/router';
import { provideNativeDateAdapter } from '@angular/material/core';

import { ApuCatalogosService } from './data-access/apu-catalogos.service';

export const APU_ROUTES: Routes = [
  {
    path: '',
    title: 'Análisis de precios unitarios | InfoPresupuestal',
    providers: [ApuCatalogosService, provideNativeDateAdapter()],
    loadComponent: () => import('./pages/apu-form-page/apu-form-page.component').then((m) => m.ApuFormPageComponent),
  },
];
