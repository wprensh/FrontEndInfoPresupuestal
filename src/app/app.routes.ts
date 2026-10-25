import { Routes } from '@angular/router';

import { authGuard, canView, guestGuard, inicioSegunPermisos } from './core/auth/auth.guards';
import { ShellComponent } from './core/layout/shell/shell.component';

/** Cada feature se carga en diferido a través de su archivo `*.routes.ts`. */
export const routes: Routes = [
  { path: 'login', canActivate: [guestGuard], loadChildren: () => import('./features/auth/auth.routes').then((m) => m.AUTH_ROUTES) },
  {
    path: '',
    component: ShellComponent,
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: inicioSegunPermisos },
      { path: 'presupuesto', canMatch: [canView('presupuestos', 'apu')], loadChildren: () => import('./features/budget/budget.routes').then((m) => m.BUDGET_ROUTES) },
      {
        path: 'presupuestos',
        canMatch: [canView('presupuestos')],
        loadChildren: () => import('./features/presupuestos/presupuestos.routes').then((m) => m.PRESUPUESTOS_ROUTES),
      },
      { path: 'apu', canMatch: [canView('apu')], loadChildren: () => import('./features/apu/apu.routes').then((m) => m.APU_ROUTES) },
      { path: 'dashboard', loadChildren: () => import('./features/dashboard/dashboard.routes').then((m) => m.DASHBOARD_ROUTES) },
      {
        path: 'mantenimiento',
        canMatch: [canView('insumos', 'clasificaciones', 'unidades-medida', 'tipos-insumo')],
        loadChildren: () => import('./features/mantenimiento/mantenimiento.routes').then((m) => m.MANTENIMIENTO_ROUTES),
      },
      {
        path: 'administracion',
        canMatch: [canView('usuarios', 'roles')],
        loadChildren: () => import('./features/administracion/administracion.routes').then((m) => m.ADMINISTRACION_ROUTES),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
