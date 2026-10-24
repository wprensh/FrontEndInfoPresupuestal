# InfoPresupuestal · FrontEnd

Aplicación Angular 19 (standalone, Signals, Angular Material 19) organizada con **Arquitectura Vertical** (Vertical Slice / Feature-Driven).

## Comandos

```bash
npm install
npm start          # http://localhost:4200 con backend simulado en memoria
npm run start:api  # http://localhost:4200 contra la API real en http://localhost:5080 (proxy.conf.json)
npm run build      # build de producción
npm run build:demo # build de la demo pública (Render), con el backend simulado
npm test           # pruebas unitarias (Karma + Jasmine)
```

Con `useMockBackend` (desarrollo y demo), `core/http/mock-data/admin.mock.ts` simula el login, la administración y el mantenimiento con las mismas reglas de la API. Usuarios de la demo (los datos que crees se pierden al recargar):

| Empresa | Correo | Contraseña | Rol |
|---|---|---|---|
| `demo` | `admin@demo.local` | `Admin123*` | Administrador |
| `demo` | `consulta@demo.local` | `Consulta123` | Consulta (solo lectura) |
| `sistema` | `superadmin@infopresupuestal.local` | `Admin123*` | Superadministrador |

## Arquitectura

```
src/app/
├── app.config.ts            # providers globales: router, HttpClient + interceptores, animaciones
├── app.routes.ts            # solo enruta a features con loadChildren (lazy)
├── core/                    # infraestructura singleton, sin UI reutilizable
│   ├── auth/                        # sesión y control de acceso
│   │   ├── auth.service.ts                  # JWT, permisos (can), empresa elegida por el superadmin
│   │   ├── auth.interceptor.ts              # Authorization: Bearer + X-Tenant-Id; 401 cierra sesión
│   │   ├── auth.guards.ts                   # authGuard, canView(...modulos), superAdminGuard
│   │   └── if-can.directive.ts              # *appIfCan="['insumos', 'insertar']"
│   ├── config/                      # API_BASE_URL, íconos, paginador en español
│   ├── http/                        # interceptores (errores ProblemDetails, backend simulado)
│   └── layout/shell/                # barra superior + pestañas según permisos
├── shared/                  # SOLO piezas puras y genéricas, sin lógica de negocio
│   ├── data/paged-list.ts           # estado de una tabla paginada en el servidor
│   ├── data/attempt.ts              # llamada + snackbar de éxito o error
│   ├── ui/                          # page-header, confirm-dialog, search-box, section-nav
│   ├── directives/autofocus.directive.ts
│   └── utils/text.utils.ts
└── features/                # un slice vertical por funcionalidad de negocio
    ├── auth/                        # página de login
    ├── budget/ · dashboard/
    ├── administracion/              # usuarios, roles (matriz Ver/Insertar/Editar/Eliminar), empresas
    │   ├── administracion.routes.ts         # rutas hijas con guardas por permiso
    │   ├── models/ · data-access/admin-api.service.ts · material/
    │   ├── pages/                           # admin-layout, usuarios, roles, empresas
    │   └── components/                      # diálogos de usuario, contraseña, rol, empresa
    └── mantenimiento/               # insumos y precios + catálogos
        ├── mantenimiento.routes.ts          # clasificaciones, unidades y tipos usan una página genérica
        ├── models/mantenimiento.model.ts    # CATALOGOS: columnas y campos de cada catálogo simple
        ├── pages/                           # mantenimiento-layout, catalogo-page, insumos-page
        └── components/                      # catalogo-form, insumo-form, precios (historial)
```

### Reglas

1. **Todo es standalone.** En Angular 19 es el valor por defecto, así que no hay `NgModule` ni `standalone: true`.
2. **Una feature es autónoma.** Contiene sus modelos, servicios, estado, componentes y su propia lista de módulos de Material (`material/<feature>-material.ts`). Borrar la carpeta de una feature y su línea en `app.routes.ts` debe eliminarla por completo.
3. **Una feature no importa de otra feature.** Si dos features necesitan lo mismo y es genérico, va a `shared/`; si es infraestructura, va a `core/`.
4. **`shared/` no conoce el negocio.** Nada en `shared/` importa de `features/` ni habla con la API.
5. **Estado local a la feature.** Los servicios de API se proveen en el `<feature>.routes.ts` (no `providedIn: 'root'`). Las tablas guardan su estado en un `PagedList` de la página. La única excepción es `AuthService`, que es la sesión de toda la app.
8. **Los permisos solo deciden qué se ve.** Pestañas, menús y botones salen de `AuthService.can(modulo, accion)`; la API vuelve a validar cada solicitud.
6. **Smart vs. dumb.** Las `pages/` inyectan el store; los `components/` solo reciben `input()` y emiten `output()`.
7. **Siempre `inject()`**, `ChangeDetectionStrategy.OnPush` y control de flujo nativo (`@if`, `@for`).

### Sesión y permisos

```
LoginPage ──▶ AuthService.login() ──▶ POST /api/auth/login ──▶ { token, usuario, permisos: ['insumos:ver', …] }
                    │ signal (y localStorage)
                    ├─▶ authInterceptor: Authorization: Bearer <token> (+ X-Tenant-Id si el superadmin eligió otra empresa)
                    ├─▶ guardas: canView('usuarios', 'roles') en /administracion
                    └─▶ *appIfCan="['insumos', 'eliminar']" muestra u oculta cada botón
```

### Agregar una nueva feature

1. Crear `features/<nombre>/` con `<nombre>.routes.ts`, `models/`, `data-access/`, `pages/`, `components/` y `material/`.
2. Proveer su store/API en el `providers` de la ruta.
3. Registrarla en `app.routes.ts` con `loadChildren`.
