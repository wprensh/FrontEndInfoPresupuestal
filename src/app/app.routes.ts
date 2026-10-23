import { Routes } from '@angular/router';

import { ShellComponent } from './core/layout/shell/shell.component';

/** Cada feature se carga en diferido a través de su archivo `*.routes.ts`. */
export const routes: Routes = [
  {
    path: '',
    component: ShellComponent,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      { path: 'dashboard', loadChildren: () => import('./features/dashboard/dashboard.routes').then((m) => m.DASHBOARD_ROUTES) },
      { path: 'users', loadChildren: () => import('./features/users/users.routes').then((m) => m.USERS_ROUTES) },
    ],
  },
  { path: '**', redirectTo: '' },
];
