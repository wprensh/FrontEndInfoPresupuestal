import { inject } from '@angular/core';
import { Routes } from '@angular/router';

import { canView, superAdminGuard } from '../../core/auth/auth.guards';
import { AuthService } from '../../core/auth/auth.service';
import { AdminApiService } from './data-access/admin-api.service';

export const ADMINISTRACION_ROUTES: Routes = [
  {
    path: '',
    providers: [AdminApiService],
    loadComponent: () => import('./pages/admin-layout/admin-layout.component').then((m) => m.AdminLayoutComponent),
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: () => {
          const auth = inject(AuthService);
          return auth.can('usuarios') ? 'usuarios' : auth.can('roles') ? 'roles' : 'empresas';
        },
      },
      {
        path: 'usuarios',
        title: 'Usuarios | InfoPresupuestal',
        canMatch: [canView('usuarios')],
        loadComponent: () => import('./pages/usuarios-page/usuarios-page.component').then((m) => m.UsuariosPageComponent),
      },
      {
        path: 'roles',
        title: 'Roles y permisos | InfoPresupuestal',
        canMatch: [canView('roles')],
        loadComponent: () => import('./pages/roles-page/roles-page.component').then((m) => m.RolesPageComponent),
      },
      {
        path: 'empresas',
        title: 'Empresas | InfoPresupuestal',
        canMatch: [superAdminGuard],
        loadComponent: () => import('./pages/empresas-page/empresas-page.component').then((m) => m.EmpresasPageComponent),
      },
    ],
  },
];
