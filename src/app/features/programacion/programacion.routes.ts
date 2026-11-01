import { Routes } from '@angular/router';
import { provideNativeDateAdapter } from '@angular/material/core';

import { ProgramacionApiService } from './data-access/programacion-api.service';

export const PROGRAMACION_ROUTES: Routes = [
  {
    path: '',
    providers: [ProgramacionApiService, provideNativeDateAdapter()],
    children: [
      {
        path: '',
        title: 'Programación de obra | InfoPresupuestal',
        loadComponent: () => import('./pages/programacion-list-page/programacion-list-page.component').then((m) => m.ProgramacionListPageComponent),
      },
      {
        path: ':id',
        title: 'Programación | InfoPresupuestal',
        canDeactivate: [sinCambiosPendientes],
        loadComponent: () => import('./pages/programacion-page/programacion-page.component').then((m) => m.ProgramacionPageComponent),
      },
    ],
  },
];

/** Pregunta antes de salir del diagrama con cambios sin guardar. */
function sinCambiosPendientes(component: { sucio: () => boolean }): boolean {
  return !component.sucio() || window.confirm('Hay cambios sin guardar en la programación. ¿Salir sin guardar?');
}
