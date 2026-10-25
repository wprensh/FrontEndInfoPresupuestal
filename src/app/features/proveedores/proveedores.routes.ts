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

/** Sección Proveedores de las constructoras (`/proveedores`): catálogos e importación, y el directorio. */
export const DIRECTORIO_ROUTES: Routes = [
  {
    path: '',
    providers: [ProveedoresApiService],
    loadComponent: () => import('./pages/proveedores-layout/proveedores-layout.component').then((m) => m.ProveedoresLayoutComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'catalogos' },
      {
        path: 'catalogos',
        title: 'Catálogos de proveedores | InfoPresupuestal',
        loadComponent: () => import('./pages/catalogos-page/catalogos-page.component').then((m) => m.CatalogosPageComponent),
      },
      {
        path: 'directorio',
        title: 'Proveedores | InfoPresupuestal',
        loadComponent: () => import('./pages/directorio-page/directorio-page.component').then((m) => m.DirectorioPageComponent),
      },
    ],
  },
];
