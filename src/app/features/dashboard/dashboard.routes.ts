import { Routes } from '@angular/router';

export const DASHBOARD_ROUTES: Routes = [
  {
    path: '',
    title: 'Dashboard | InfoPresupuestal',
    loadComponent: () =>
      import('./pages/dashboard-page/dashboard-page.component').then((m) => m.DashboardPageComponent),
  },
];
