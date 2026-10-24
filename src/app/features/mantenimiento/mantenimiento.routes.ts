import { inject } from '@angular/core';
import { Routes } from '@angular/router';

import { canView } from '../../core/auth/auth.guards';
import { AuthService } from '../../core/auth/auth.service';
import { MantenimientoApiService } from './data-access/mantenimiento-api.service';
import { CATALOGOS } from './models/mantenimiento.model';

const catalogoPage = () => import('./pages/catalogo-page/catalogo-page.component').then((m) => m.CatalogoPageComponent);

export const MANTENIMIENTO_ROUTES: Routes = [
  {
    path: '',
    providers: [MantenimientoApiService],
    loadComponent: () => import('./pages/mantenimiento-layout/mantenimiento-layout.component').then((m) => m.MantenimientoLayoutComponent),
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: () => {
          const auth = inject(AuthService);
          return auth.can('insumos') ? 'insumos' : auth.can('clasificaciones') ? 'clasificaciones' : auth.can('unidades-medida') ? 'unidades-medida' : 'tipos-insumo';
        },
      },
      {
        path: 'insumos',
        title: 'Insumos | InfoPresupuestal',
        canMatch: [canView('insumos')],
        loadComponent: () => import('./pages/insumos-page/insumos-page.component').then((m) => m.InsumosPageComponent),
      },
      { path: 'clasificaciones', title: 'Clasificaciones | InfoPresupuestal', canMatch: [canView('clasificaciones')], data: { config: CATALOGOS.clasificaciones }, loadComponent: catalogoPage },
      { path: 'unidades-medida', title: 'Unidades de medida | InfoPresupuestal', canMatch: [canView('unidades-medida')], data: { config: CATALOGOS.unidades }, loadComponent: catalogoPage },
      { path: 'tipos-insumo', title: 'Tipos de insumo | InfoPresupuestal', canMatch: [canView('tipos-insumo')], data: { config: CATALOGOS.tipos }, loadComponent: catalogoPage },
    ],
  },
];
