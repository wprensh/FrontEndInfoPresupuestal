import { Routes } from '@angular/router';

import { ProveedoresApiService } from './data-access/proveedores-api.service';

/** Catálogo propio del proveedor (`/mi-catalogo`). */
export const MI_CATALOGO_ROUTES: Routes = [
  {
    path: '',
    title: 'Mi catálogo | InfoPresupuestal',
    providers: [ProveedoresApiService],
    loadComponent: () => import('./pages/mi-catalogo-page/mi-catalogo-page.component').then((m) => m.MiCatalogoPageComponent),
  },
];

/** Directorio de proveedores para las constructoras (`/proveedores`). */
export const DIRECTORIO_ROUTES: Routes = [
  {
    path: '',
    title: 'Proveedores | InfoPresupuestal',
    providers: [ProveedoresApiService],
    loadComponent: () => import('./pages/directorio-page/directorio-page.component').then((m) => m.DirectorioPageComponent),
  },
];
