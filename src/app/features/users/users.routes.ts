import { Routes } from '@angular/router';

import { UsersApiService } from './data-access/users-api.service';
import { UsersStore } from './data-access/users.store';

/**
 * Punto de entrada público del slice. Los servicios se proveen aquí (y no en
 * root) para que vivan y mueran con la feature cargada en diferido.
 */
export const USERS_ROUTES: Routes = [
  {
    path: '',
    providers: [UsersApiService, UsersStore],
    children: [
      {
        path: '',
        title: 'Usuarios | InfoPresupuestal',
        loadComponent: () =>
          import('./pages/user-list-page/user-list-page.component').then((m) => m.UserListPageComponent),
      },
    ],
  },
];
