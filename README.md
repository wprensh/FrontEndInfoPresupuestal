# InfoPresupuestal · FrontEnd

Aplicación Angular 19 (standalone, Signals, Angular Material 19) organizada con **Arquitectura Vertical** (Vertical Slice / Feature-Driven).

## Comandos

```bash
npm install
npm start          # http://localhost:4200 (usa backend simulado en memoria)
npm run build      # build de producción
npm test           # pruebas unitarias (Karma + Jasmine)
```

En desarrollo, `environment.development.ts` activa `useMockBackend`, que responde `/api/users` en memoria. En producción las llamadas van a `apiBaseUrl`.

## Arquitectura

```
src/app/
├── app.config.ts            # providers globales: router, HttpClient + interceptores, animaciones
├── app.routes.ts            # solo enruta a features con loadChildren (lazy)
├── core/                    # infraestructura singleton, sin UI reutilizable
│   ├── config/api.config.ts         # token API_BASE_URL
│   ├── http/                        # interceptores funcionales (errores, mock backend)
│   └── layout/shell/                # layout principal (toolbar + sidenav)
├── shared/                  # SOLO piezas puras y genéricas, sin lógica de negocio
│   ├── ui/page-header/              # componente de diseño puro (input() + ng-content)
│   ├── ui/confirm-dialog/           # diálogo genérico de confirmación
│   ├── directives/autofocus.directive.ts
│   └── utils/text.utils.ts
└── features/                # un slice vertical por funcionalidad de negocio
    ├── dashboard/
    │   ├── dashboard.routes.ts
    │   └── pages/dashboard-page/
    └── users/                       # Gestión de Usuarios
        ├── users.routes.ts                  # API pública del slice + providers de la feature
        ├── models/user.model.ts             # User, CreateUserDto, UserRole
        ├── material/users-material.ts       # módulos de Angular Material que usa la feature
        ├── data-access/
        │   ├── users-api.service.ts         # HttpClient vía inject(), sin estado
        │   ├── users.store.ts               # estado con signal() / computed()
        │   └── users.store.spec.ts
        ├── pages/user-list-page/            # contenedor (smart): store + diálogos + snackbar
        └── components/                      # presentacionales (dumb): input() / output()
            ├── user-table/                  # mat-table + MatSort + MatPaginator
            └── user-form-dialog/            # formulario reactivo tipado en MatDialog
```

### Reglas

1. **Todo es standalone.** En Angular 19 es el valor por defecto, así que no hay `NgModule` ni `standalone: true`.
2. **Una feature es autónoma.** Contiene sus modelos, servicios, estado, componentes y su propia lista de módulos de Material (`material/<feature>-material.ts`). Borrar la carpeta de una feature y su línea en `app.routes.ts` debe eliminarla por completo.
3. **Una feature no importa de otra feature.** Si dos features necesitan lo mismo y es genérico, va a `shared/`; si es infraestructura, va a `core/`.
4. **`shared/` no conoce el negocio.** Nada en `shared/` importa de `features/` ni habla con la API.
5. **Estado local a la feature.** `UsersApiService` y `UsersStore` se proveen en `users.routes.ts` (no `providedIn: 'root'`), así se crean al entrar a la ruta y se destruyen al salir.
6. **Smart vs. dumb.** Las `pages/` inyectan el store; los `components/` solo reciben `input()` y emiten `output()`.
7. **Siempre `inject()`**, `ChangeDetectionStrategy.OnPush` y control de flujo nativo (`@if`, `@for`).

### Flujo de datos en Usuarios

```
UserListPage ──inject──▶ UsersStore ──inject──▶ UsersApiService ──▶ HttpClient
     │  ▲                    │ signal<UsersState>
     │  └── filteredUsers() ─┘ computed()
     ├──[users]──▶ UserTable ──(delete)──▶ ConfirmDialog ──▶ store.remove()
     └── open ───▶ UserFormDialog ──afterClosed(dto)──▶ store.create()
```

### Agregar una nueva feature

1. Crear `features/<nombre>/` con `<nombre>.routes.ts`, `models/`, `data-access/`, `pages/`, `components/` y `material/`.
2. Proveer su store/API en el `providers` de la ruta.
3. Registrarla en `app.routes.ts` con `loadChildren`.
