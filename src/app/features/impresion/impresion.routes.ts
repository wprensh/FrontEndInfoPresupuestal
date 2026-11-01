import { Routes } from '@angular/router';

import { ImpresionApiService } from './data-access/impresion-api.service';

/** Hoja impresa de un presupuesto: `/impresion/presupuesto/:id`. */
export const IMPRESION_ROUTES: Routes = [
  {
    path: 'presupuesto/:id',
    title: 'Imprimir presupuesto | InfoPresupuestal',
    providers: [ImpresionApiService],
    loadComponent: () => import('./pages/presupuesto-impresion-page/presupuesto-impresion-page.component').then((m) => m.PresupuestoImpresionPageComponent),
  },
];

/** Formato de impresión dentro de Administración. */
export const FORMATO_IMPRESION_ROUTE = {
  path: 'formato-impresion',
  title: 'Formato de impresión | InfoPresupuestal',
  providers: [ImpresionApiService],
  loadComponent: () => import('./pages/formato-impresion-page/formato-impresion-page.component').then((m) => m.FormatoImpresionPageComponent),
};
