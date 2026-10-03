# CargoOps — Enrutamiento del Frontend (ROUTING)

> Grupo W4 (frontend) · Fuente canónica: `docs/MASTER-SPEC.md` (§11.4 estructura, §8 RBAC, §10 API, §12 UX) y `docs/frontend/FRONTEND-ARCHITECTURE.md` (§5.3 estructura, §5.5 lazy loading).
> Fase 0: documentación. Los bloques fenced son ilustrativos; no se genera código de producción.

## 1. Objetivo

Definir el árbol de rutas de la aplicación Angular de CargoOps: mapa de rutas por feature con lazy loading, guards (auth y RBAC por rol — **UX únicamente**, BR-009), layouts (público/auth y operativo), rutas semánticas con deep-linking y manejo de 404/403 y errores.

## 2. Contexto

Aplicación corporativa de acceso restringido: el único acceso público en v1 es `/login` (SCREENS §1). Tras autenticarse, el usuario opera en un shell con sidebar/topbar (SCREENS "Shell de aplicación") con features lazy por dominio (FRONTEND-ARCHITECTURE §5.3). La autorización real siempre ocurre en backend (BR-009); los guards del frontend solo ocultan y redirigen para dar buena UX.

## 3. Restricciones

- R1: Guards = UX únicamente (BR-009); jamás sustituyen la autorización backend.
- R2: Lazy loading por feature; sin `PreloadAllModules`: precarga selectiva — tras el login se precargan `dashboard` y `cargas`; el mapa operativo se descarga solo al navegar a `/operational-map` (chunk pesado, ADR-006; FRONTEND-ARCHITECTURE §5.5).
- R3: URLs semánticas y estables (kebab-case; rutas visibles en español para el usuario) con deep-link de filtros vía query params (COMPONENTS §6.5).
- R4: Standalone components; cada feature expone su `routes.ts` (FRONTEND-ARCHITECTURE §5.5).
- R5: Los errores de red/401/403 se manejan con el flujo de interceptors (FRONTEND-ARCHITECTURE §5.6), no con rutas ad-hoc.
- R6: Los guards no modelan la máquina de estados de CargoStatus (BR-016): sin lógica de negocio en rutas.

## 4. Dependencias

| Documento | Uso |
| --- | --- |
| `frontend/FRONTEND-ARCHITECTURE.md` §5.3/§5.5/§5.6 | Estructura de carpetas, precarga, manejo de errores |
| MASTER-SPEC §8 (RBAC), §10 (API), §11.4 (estructura) | Roles, contratos, catálogo |
| `ux/SCREENS.md` | Pantallas y shell que las rutas materializan |
| `frontend/COMPONENTS.md` | `Breadcrumbs`, `PageHeader`, navegación |
| `frontend/I18N.md`, `frontend/SEO.md`, `frontend/ACCESSIBILITY.md` | Títulos de ruta, metadata, skip link |

## 5. Decisiones

### 5.1 Árbol de rutas

| Ruta | Feature / Página | Carga | Guards | Layout | Visibilidad |
| --- | --- | --- | --- | --- | --- |
| `/login` | `pages/login-page` | `loadComponent` | redirect a `/dashboard` si ya hay sesión | `auth-layout` | pública |
| `/dashboard` | `pages/dashboard-page` | `loadComponent` (precargada tras login) | `auth` | `app-shell` | VIEWER+ |
| `/cargos` | `features/cargos` — listado | `loadChildren` (precargada tras login) | `auth` | `app-shell` | VIEWER+ |
| `/cargos/new` | registro de carga | lazy | `auth` + `cargo.create` | `app-shell` | OPERATOR+ |
| `/cargos/:id` | detalle de carga (incluye tab/panel de distribución `DistributionPanel` modo cargo: segmentos por ubicación con cantidad, unidad, porcentaje, estado y fechas — BR-040) | lazy | `auth` | `app-shell` | VIEWER+ |
| `/cargos/:id/edit` | edición de carga | lazy | `auth` + `cargo.update` (`cargo.update` propuesto — ver DP-ROU-04) | `app-shell` | OPERATOR+ |
| `/trucks` | `features/trucks` — listado/registro | lazy | `auth`; `truck.create` propuesto para registrar | `app-shell` | VIEWER+ lectura; OPERATOR+ escritura |
| `/operational-map` | `features/operational-map` | `loadChildren` bajo demanda (chunk pesado) | `auth` | `app-shell` (mapa a ancho completo + panel) | VIEWER+ |
| `/locations/:id` | detalle de ubicación: cabecera con datos de la ubicación, `LocationOccupancyCard` (capacidad/ocupación/disponible con unidad — BR-033/035/040) y cargas presentes vía `DistributionPanel` modo location / `LocationCard` | lazy | `auth` | `app-shell` | VIEWER+ |
| `/maps` | `features/maps` — vista | lazy | `auth` | `app-shell` | VIEWER+ |
| `/maps/edit` | editor de planos | lazy | `auth` + `map.edit` + `feature-flag` (OQ-015 resuelta: editor fuera de v1) | `app-shell` | ADMIN |
| `/history` | `features/history` | lazy | `auth` | `app-shell` | VIEWER+ |
| `/alerts` | `features/alerts` | lazy | `auth` | `app-shell` | VIEWER+ |
| `/auditoria` | `features/auditoria` | lazy | `auth` + `audit.read` | `app-shell` | ADMIN |
| `/configuracion` | `features/configuracion` | lazy | `auth` + permiso de configuración (código por definir — DP-ROU-04) | `app-shell` | ADMIN |
| `/usuarios` | `features/usuarios` | lazy | `auth` + `users.manage` | `app-shell` | ADMIN |
| `/roles` | `features/roles` | lazy | `auth` + `users.manage` (o permiso de permisos, por definir — DP-ROU-04) | `app-shell` | ADMIN |
| `/not-found` | `pages/not-found-page` | raíz | — | según sesión (auth-layout o app-shell) | pública/autenticado |
| `/forbidden` | `pages/forbidden-page` | raíz | — | `app-shell` | autenticado sin permiso |
| `**` | wildcard → redirige a `/not-found` | — | — | — | — |

Notas:
- Orden de declaración: rutas estáticas antes que paramétricas (`/cargos/new` antes de `/cargos/:id`).
- `returnUrl`: el guard de auth redirige a `/login?returnUrl=…` y restaura la navegación tras autenticar (FRONTEND-ARCHITECTURE §5.6).
- El detalle de movimiento (deep-link desde `MovementTimeline`, SCREENS §4): ruta hija `/cargos/:id/movimientos/:movId` vs diálogo con URL — **OQ-035 resuelta (2026-09-24): ruta hija deep-link** `/cargos/:id/movimientos/:movId` (permalink accesible y compartible).

### 5.2 Layouts

- **`auth-layout`**: centrado, sin sidebar; contiene login y 404/403 públicos. Fondo `--color-background`, tarjeta surface `--radius-xl`.
- **`app-shell`**: sidebar colapsable + topbar (búsqueda global de cargas, contador de alertas con link a `/alerts`, menú de usuario) + `<main id="main">` con skip link (ACCESSIBILITY §5.2). La sidebar se filtra por permisos: Viewer no ve Usuarios/Roles/Configuración ni la entrada de edición de planos (SCREENS shell); en móvil, la sidebar pasa a drawer.
- Una sola instancia de `app-shell` por sesión; el título de documento se setea por ruta desde `data` (ROUTING §5.6, SEO.md).

### 5.3 Guards (UX únicamente)

- **`auth.guard`**: consulta `auth.store`; sin sesión → `/login?returnUrl=…`; con sesión expirada, deja que el interceptor de refresh resuelva antes de navegar (ADR-008; FRONTEND-ARCHITECTURE §5.6).
- **`permission.guard(codigo)`**: evalúa los permisos del usuario (claims del token, ADR-008/009); si falta → `/forbidden` (o error contextual 403 según la acción). Uso declarativo:
  `canActivate: [authGuard, permissionGuard('cargo.create')]`.
- **`feature-flag.guard`**: gates de alcance por fase (editor de planos fuera de v1 — OQ-015 resuelta; usuarios/roles según el roadmap, MASTER-SPEC §18) → redirige a la vista base con mensaje i18n.
- Regla: sin lógica de negocio en guards (R6; BR-016). Los guards no cambian estado; solo deciden navegación por UX.
- **Consulta de distribución y ocupación en rutas (BR-040/RBAC §8)**: `/cargos/:id` y `/locations/:id` son VIEWER+ (solo `auth`): Viewer puede VER distribución, capacidad y ocupación. Las mutaciones de segmentos (crear/ajustar/egresar `CargoLocation`) son acciones OPERATOR+ protegidas por permisos en el punto de acción (`DistributionPanel` + `ObservationDialog`, BR-006/010), NO por rutas nuevas — mismas reglas que mover/cambiar estado (BR-009: backend autoridad).

```ts
// Ilustración (no producción): routes.ts de features/cargos
export const CARGAS_ROUTES: Routes = [
  { path: '', component: CargasListPage, canActivate: [authGuard] },
  { path: 'nueva', component: CargasNewPage, canActivate: [authGuard, permissionGuard('cargo.create')] },
  { path: ':id', component: CargasDetailPage, canActivate: [authGuard] },
  { path: ':id/editar', component: CargasEditPage, canActivate: [authGuard, permissionGuard('cargo.update')] },
];

// Ilustración (no producción): routes.ts de features/locations
export const UBICACIONES_ROUTES: Routes = [
  { path: ':id', component: UbicacionesDetailPage, canActivate: [authGuard] },
];
```

### 5.4 Rutas semánticas y deep-linking

- URLs legibles y estables: `/operational-map`, `/cargos/029TERRA26`. Los códigos de carga son alfanuméricos heterogéneos (MASTER-SPEC §4.4: `JV028/2026CH`) → **encoding** (`encodeURIComponent`) al armar el path porque contienen `/`; des-encoding al leer el parámetro.
- **Filtros del listado en query params** (`?estado=STORED&ubicacion=S4&pagina=2&q=…` → `CargoFiltersState`, COMPONENTS §6.5): deep-linkeables, compartibles, navegación atrás/adelante funcionando. La URL es la fuente del estado inicial del store de cargas y el store la actualiza con `pushState`/`replaceState` sin recargar (STATE-MANAGEMENT §5.4) — un solo dueño evita races.
- Breadcrumbs derivados de `data.breadcrumb` o del mapa de rutas (COMPONENTS `Breadcrumbs`, `PageHeader`).
- **Deep-link de ubicaciones**: `/locations/:id` es enlazable desde el mapa operativo (`LocationCard` → "Ver detalle"), desde los segmentos de `DistributionPanel` (modo cargo) y desde el Dashboard (SCREENS §4 — Detalle de ubicación); **sí existe el listado `/locations` en v1** (OQ-047 resuelta 2026-09-24) con búsqueda/filtros. Los IDs de `Location` son UUIDs (sin caracteres que exijan encoding, a diferencia de los códigos de carga). Breadcrumbs: `Mapa > Sector 4` (desde el mapa) o `Cargas > … > Sector 4` (desde segmentos) (`data.breadcrumb`, §5.5).

### 5.5 Metadata por ruta (títulos)

- `data: { title: $localize(...), description?, breadcrumb?, permission? }` en cada ruta; un `meta.service` central (rooteado a eventos del Router) aplica `<title>`/descripción — requisito conjunto de SEO.md y ACCESSIBILITY (títulos anunciados por lectores de pantalla).

### 5.6 404, 403 y errores

- **404**: wildcard `**` → `/not-found`; si hay sesión se muestra dentro del shell (con navegación), si no en `auth-layout`; mensaje i18n + link al dashboard.
- **403**: `/forbidden` para intentos de ruta sin permiso (guard); errores 403 en acciones dentro de una vista → error contextual en el punto de acción (interceptor, FRONTEND-ARCHITECTURE §5.6).
- **Fallo de carga de chunk** (lazy load error): `ErrorState` con reintento en el contenedor; sin navegación destructiva.
- **401**: interceptor intenta refresh; si falla → logout + `/login?returnUrl=…` (ADR-008).

## 6. Criterios de aceptación

- CA-1: Cada feature se navega por su ruta lazy con chunk propio (verificable en el build).
- CA-2: Guards aplicados por ruta, declarados como UX (BR-009) y sin lógica de negocio.
- CA-3: `returnUrl` restaura la navegación tras el login.
- CA-4: Filtros del listado deep-linkeables por query params en ambas direcciones (URL → estado y estado → URL).
- CA-5: 404/403 con páginas propias y textos i18n; chunk errors con reintento.

## 7. Archivos involucrados

- Consumidores: `frontend/COMPONENTS.md` (Breadcrumbs/navegación), `frontend/SEO.md` (metadata), `frontend/ACCESSIBILITY.md` (skip link, títulos), `frontend/I18N.md` (títulos), `frontend/STATE-MANAGEMENT.md` (estado desde URL).
- Fuentes: `frontend/FRONTEND-ARCHITECTURE.md` §5.3/§5.5/§5.6, `ux/SCREENS.md`, ADR-002/008/009.

## 8. Riesgos

- R-01: IDs con caracteres especiales en la URL (códigos de carga) → encoding sistemático + tests de rutas.
- R-02: Desincronización filtros en URL ↔ store (races) → URL como fuente de estado inicial + clave de caché completa (STATE §5.4).
- R-03: Guards que intentan autorizar (BR-009) → regla R1 + revisión de seguridad en PR (MASTER-SPEC §15).
- R-04: Ruta de editor de planos **no expuesta en v1** (OQ-015 resuelta 2026-09-24: mapa = vista estática) → `/maps/edit` detrás de `feature-flag.guard` (DP-ROU-02 resuelta).

## 9. DECISIÓN PENDIENTE

| ID | Pregunta | Relación |
| --- | --- | --- |
| DP-ROU-01 | ~~Deep-link a detalle de movimiento: ruta hija `/cargos/:id/movimientos/:movId` vs diálogo con URL opcional~~ → **RESUELTA (OQ-035, 2026-09-24)**: **ruta hija deep-link** `/cargos/:id/movimientos/:movId` (SCREENS exige permalink accesible y compartible) | SCREENS §4 / OQ-035 (resuelta 2026-09-24) |
| DP-ROU-02 | ~~Ruta y guards del editor de planos según alcance de OQ-015~~ → **RESUELTA (OQ-015, 2026-09-24)**: mapa es **vista estática** en v1 (lectura + selección + hover); **sin editor visual** en v1 → ruta `/maps/edit` detrás de `feature-flag` (fuera de v1) | OQ-015 (resuelta 2026-09-24) |
| DP-ROU-03 | ~~`features/trucks` no está listado en FRONTEND-ARCHITECTURE §5.3 pero SCREENS/MASTER-SPEC lo requieren → este documento asume feature propia (`/trucks`)~~ → **RESUELTA (2026-09-23, ID-005)**: `features/trucks/` incorporado a FRONTEND-ARCHITECTURE §5.3 | FRONTEND-ARCHITECTURE §5.3 / SCREENS |
| DP-ROU-04 | Códigos de permiso exactos para `/configuracion`, `/roles` y `cargo.update`/`truck.create` (la matriz de seeds de ADR-009 la fija el grupo W2/W5) | 🔶 Residual local (ADR-009 / W2-W5; ID-006 resuelta) |
| DP-ROU-05 | ~~¿Alcance SSR afecta rutas (login pre-renderizado)?~~ → **RESUELTA (OQ-010, 2026-09-24)**: **sin SSR en v1** (PWA mínima, rama A) → login sin pre-render en v1 | OQ-010 / SEO.md (resuelta 2026-09-24) |
| DP-ROU-06 | ~~El listado `/locations` no está definido en SCREENS.md… ¿se define un listado propio o se mantiene solo el deep-link?~~ → **RESUELTA (OQ-047, 2026-09-24)**: **sí, listado en v1** (`/locations`) con búsqueda/filtros + deep-link `/locations/:id` desde el mapa y listados | SCREENS (W6) / OQ-047 (resuelta 2026-09-24) |