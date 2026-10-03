# CargoOps — Arquitectura del Frontend (Angular 20+)

> Documento del grupo W4 (frontend). Fuente de verdad canónica: `docs/MASTER-SPEC.md` (§11.2, §11.4, §12, §14, §16).
> Fase 0: documentación. Los bloques fenced son ilustrativos; no se genera código de producción.

## 1. Objetivo

Definir la arquitectura del frontend de CargoOps: Angular 20+ con standalone components y signals, responsabilidad de cada carpeta del esquema canónico, flujo de datos, lazy loading, manejo global de errores, separación servicios REST / state stores y la justificación de la capa de estado. Es el punto de entrada del grupo frontend y referencia a los documentos hermanos (`COMPONENTS.md`, `DESIGN-SYSTEM.md`, `STATE-MANAGEMENT.md`, `ROUTING.md`, `I18N.md`, `ACCESSIBILITY.md`, `SEO.md`, `PWA.md`).

## 2. Contexto

CargoOps es una plataforma web de gestión operativa de cargas y depósitos en un predio logístico/aduanero: trazabilidad total de movimientos, alertas de rezago, mapa operativo configurable y exportación PDF (MASTER-SPEC §1). El frontend es la única superficie de operación en v1; desktop-first, correcto en notebook, tablet y móvil (MASTER-SPEC §12).

Stack objetivo canónico (MASTER-SPEC §11.2): **Angular 20+, TypeScript, Standalone Components, Signals, Router, Reactive Forms, SSR cuando aporte, PWA**.

## 3. Restricciones

- R1: No redefinir decisiones canónicas del MASTER-SPEC; toda ambigüedad real → DECISIÓN PENDIENTE y reporte al orquestador (`OPEN-QUESTIONS.md`).
- R2: FASE 0 documenta únicamente; no hay código de producción.
- R3: Autorización real siempre en backend (BR-009); los guards de ruta del frontend son UX, no capa de seguridad.
- R4: Mutaciones de movimiento/estado nunca se confirman sin respuesta del backend (BR-006/007/008); ver `STATE-MANAGEMENT.md` y `PWA.md`.
- R5: Identificadores y nombres de artefactos en inglés; textos visibles en español es-AR (ver `I18N.md`).
- R6: TypeScript strict, ESLint + Prettier, Conventional Commits, sin atribución IA en commits (MASTER-SPEC §15).
- R7: Accesibilidad objetivo WCAG 2.2 AA (MASTER-SPEC §12; detalle en `ACCESSIBILITY.md`).

## 4. Dependencias

| Dependencia | Documento | Uso |
| --- | --- | --- |
| Decisiones canónicas | `docs/MASTER-SPEC.md` | Dominio (§4), BR (§6), RBAC (§8), API (§10), frontend (§11), UX (§12), tokens (§13) |
| ADR-002 (Angular) · ADR-006 (Mapa SVG) · ADR-008 (Auth) · ADR-009 (RBAC) | `docs/architecture/ADR/` | Justificación de framework, mapa, auth y permisos |
| Contrato API | `docs/backend/API.md` (W5) | Endpoints REST `/api/v1` y envelopes |
| Envelope de error | `docs/backend/ERROR-HANDLING.md` (W5) | `{ error: { code, message, details?, requestId } }` |
| Design tokens | `docs/brand/DESIGN-TOKENS.md` (W7) | Token visual consumido por `DESIGN-SYSTEM.md` |
| UX | `docs/ux/SCREENS.md`, `docs/ux/MAP-UX.md` (W6) | Pantallas y comportamiento del mapa |

## 5. Decisiones de arquitectura

### 5.1 Stack concreto (derivación, no redefinición)

| Área | Decisión |
| --- | --- |
| Framework | Angular 20+, 100% standalone components (sin NgModules) |
| Reactividad | Signals: `signal` (estado), `computed` (derivados), `effect` (side effects) |
| Formularios | Reactive Forms tipados |
| HTTP | Angular `HttpClient` + interceptors propios |
| Router | Router oficial; lazy loading por feature |
| PWA | Service worker de Angular (detalle en `PWA.md`) |
| SSR | Diferido a v1.1+ (OQ-010 resuelta 2026-09-24: PWA mínima, sin SSR en v1) |
| i18n | Estrategia en `I18N.md` (librería: 🔶 residual local — OQ-012/OQ-034 resueltas: es-AR fijo en v1) |

### 5.2 Standalone components y signals

- Todo componente es standalone y declara imports explícitos.
- `ChangeDetectionStrategy.OnPush` por defecto; con signals la detección se acota a los consumidores de cada signal.
- `computed` para derivados (porcentaje de ocupación, filas filtradas, permisos efectivos). Nunca mutar estado dentro de un computed.
- `effect` solo para side effects (persistencia en localStorage, anuncios a11y, flags de loading), nunca para propagar estado entre signals — eso es responsabilidad de la capa de estado (§5.7).

### 5.3 Estructura de carpetas

Esquema canónico (MASTER-SPEC §11.4): `core/ shared/ features/ layouts/ pages/ services/ models/ guards/ interceptors/ state/ ui/ utils/`.

```
src/
├── core/            # Infraestructura singleton: HTTP base, sesión, config, logs, ErrorHandler
├── shared/          # Componentes/directivas/pipes reutilizables de nivel medio
├── features/        # Módulos de dominio lazy: cargas, mapa-operativo, planos, alertas, ...
├── layouts/         # Shells de página (app shell, layout de auth)
├── pages/           # Páginas raíz globales (login, dashboard, 404, 403)
├── services/        # Servicios de aplicación compartidos entre features
├── models/          # Tipos/DTOs canónicos del dominio (espejo del contrato API)
├── guards/          # Route guards funcionales reutilizables (UX únicamente, BR-009)
├── interceptors/    # HTTP interceptors transversales (token, refresh, error, requestId)
├── state/           # Stores globales con signals (auth, settings, notifications, alerts)
├── ui/              # Primitivas de bajo nivel del design system (sin lógica de dominio)
└── utils/           # Funciones puras (fechas es-AR, códigos, capacidad, debounce)
```

| Carpeta | Responsabilidad | Ejemplos CargoOps |
| --- | --- | --- |
| `core/` | Servicios singleton de infraestructura | `http/api-http.service.ts`, `auth/auth-token.service.ts`, `errors/global-error-handler.ts`, `config/app-config.service.ts`, `logging/logger.service.ts` |
| `shared/` | Componentes compuestos reutilizables | `CargoStatusBadge`, `ConfirmDialog`, `ObservationDialog`, `EmptyState`, `ErrorState`, `PaginationBar`, `PdfExportButton`, pipes `esArDate`, `permanenceDays` |
| `features/` | Un módulo por dominio, lazy; agrupa pages/componentes/servicios/modelos/estado locales | `features/cargos/` (incluye `services/cargo-locations.service.ts`: consultar/crear/ajustar/egresar segmentos `CargoLocation`, endpoints `/api/v1/cargos/:id/locations` — MASTER-SPEC §10), `features/trucks/` (listado/registro de camiones y asociación camión↔carga — MASTER-SPEC §4.2/Truck, OQ-003; ver `ROUTING.md`), `features/locations/` (nuevo, para `/locations/:id`: `services/location-cargos.service.ts` → `GET /locations/:id/cargos`, `services/capacity.service.ts` → `GET /locations/:id/capacity` y `services/location-type-defaults.service.ts` → defaults de unidad por `LocationType` desde la tabla de configuración administrable, BR-041; ver `ROUTING.md`), `features/operational-map/`, `features/maps/`, `features/alerts/`, `features/history/`, `features/audit/`, `features/settings/`, `features/users/`, `features/roles/`, `features/auth/`, `features/dashboard/` |
| `layouts/` | Shells y navegación global | `app-shell/` (sidebar, header, contenido), `auth-layout/` |
| `pages/` | Páginas raíz no encasillables en un feature | `login-page`, `dashboard-page`, `not-found-page`, `forbidden-page`. Las páginas de dominio viven en `features/<dominio>/pages/` |
| `services/` | Servicios compartidos de aplicación | `export/export.service.ts`, `notifications/notification.service.ts` (OQ-011), `preferences/user-preferences.service.ts` |
| `models/` | Dominio canónico compartido | `Cargo` (SIN `locationId` único: la relación de ubicación es M:N vía `CargoLocation`, BR-032; con `totalQuantity`/`totalUnit` y los campos derivados `inTruckAmount`/`inTruckUnit` — residual «en camión» — **consumidos del backend**, BR-042), `CargoLocation` (cargoId, locationId, quantity, quantityUnit, percentage?, enteredAt, exitedAt?, status), `CargoLocationStatus`, `QuantityUnit`, `Location` (capacity, capacityUnit, occupiedCapacity/availableCapacity derivados, allowOverOccupation — BR-033/035/036; **unidad efectiva de capacidad** = `capacityUnit` override o default por `LocationType` — BR-041), `LocationOccupancy`, `LocationType`, `LocationTypeDefaults` (mapa `LocationType → QuantityUnit`, config), `Movement`, `MovementKind`, `Alert`, `Map`, `MapElement`, `LocationVisual`, `User`, `Role`, `Permission`, `AuditLogEntry`, `ApiResponse<T>`, `ApiError` |
| `guards/` | Auth y permisos de ruta (UX) | `auth.guard.ts`, `permission.guard.ts` (recibe código de permiso, p. ej. `cargo.create`), `feature-flag.guard.ts` |
| `interceptors/` | Transversales HTTP | `auth-token.interceptor.ts`, `refresh-token.interceptor.ts`, `api-error.interceptor.ts`, `request-id.interceptor.ts` |
| `state/` | Stores globales con signals | `auth.store.ts` (usuario, roles, permisos, sesión), `settings.store.ts` (idioma, preferencias), `notifications.store.ts` (toasts + in-app), `alerts.store.ts` (alertas activas del dashboard) |
| `ui/` | Primitivas del design system | `ui/button`, `ui/input`, `ui/select`, `ui/table`, `ui/badge`, `ui/dialog`, `ui/tooltip`, `ui/spinner`, `ui/form-field` |
| `utils/` | Funciones puras sin estado | `dates/es-ar-formatter.ts`, `codes/cargo-code.normalizer.ts` (BR-002/OQ-001), `capacity/occupancy.ts` (derivados display-only — p. ej. % de ocupación y formato de unidad — a partir de los valores que devuelve el backend; **nunca** suma segmentos `CargoLocation` en unidades incompatibles ni calcula ocupación autoritativa en el cliente: BR-033/035, backend autoridad por BR-009), `search/debounce.ts`, `sorting/locale-compare.ts` |

Reglas de estructura:

- Un componente que solo se usa en un feature vive en ese feature, no en `shared/` (evitar `shared/` como vertedero).
- Dirección de dependencias: `features/ → shared/ui/state/core`; `shared/ → ui/utils/models`; `core/` nunca depende de `features/`. Ciclos prohibidos (verificable con lint de arquitectura en el repo futuro).
- Modelos: compartidos en `models/`; específicos de feature en `features/<dominio>/models/`.

### 5.4 Flujo de datos (una sola dirección)

```
  Template  ←  computed signals  ←  signals de estado
     ↑                                   ↑
  evento del usuario                store/servicio de dominio (única vía de escritura)
     │                                   │
     └──► store/servicio ──► HttpClient ──► interceptors ──► API /api/v1
                                                                │
                     template ▲  states error/empty/loading ◄──┘ (envelope)
```

Pasos:

1. El usuario dispara un evento en un componente (submit de movimiento, cambio de filtro, selección en mapa).
2. El componente llama a un método del store/servicio de dominio (p. ej. `cargosStore.loadPage(filters)`); nunca muta signals directamente desde el template.
3. El store actualiza señales de estado (`isLoading.set(true)`) y ejecuta la llamada HTTP.
4. `HttpClient` pasa por los interceptors (token → refresh → error → requestId).
5. La respuesta se normaliza contra `ApiResponse<T>`; éxito escribe en signals; error se mapea a `ApiError` y alimenta señales de error locales + `GlobalErrorHandler`.
6. `computed` recalcula derivados; el template re-renderiza solo los consumidores de las señales modificadas (OnPush + signals).

Regla: el estado solo se escribe desde la capa de estado/servicios, nunca desde templates ni computed.

#### Nota distribución M:N, capacidad y residual (BR-032..042)

- La ocupación de una ubicación y la distribución de una carga son datos **derivados por el backend**: `GET /api/v1/cargos/:id/locations`, `GET /api/v1/locations/:id/cargos`, `GET /api/v1/locations/:id/capacity` (MASTER-SPEC §10). El cliente los normaliza (modelos `CargoLocation`, `LocationOccupancy`) y los presenta; no recalcula ocupación sumando segmentos.
- **El cliente jamás suma unidades incompatibles** (m² + toneladas + pallets sin conversión — BR-035; OQ-044 → BR-048 resuelta: v1 sin conversión) y no valida permisos (BR-009: backend siempre autoridad). Los formularios de distribución (crear/ajustar/egresar segmento) exigen observación (BR-006/039) y confirmación 2xx (BR-006/008; ver `STATE-MANAGEMENT.md` §5.7).
- **Unidad efectiva de capacidad (BR-041, resuelta)**: cada ubicación muestra su capacidad/ocupación en la unidad efectiva = `Location.capacityUnit` (override por ubicación, gobernanza ADMIN, auditado) o el default por `LocationType` (Sector → `AREA`; Plazoleta/Scanner/Balanza → `UNITS`; otros → configurable). El cliente la recibe en los DTOs (`GET /locations/:id/capacity`) y en `LocationTypeDefaults` (config); solo la formatea, no la decide.
- **«En camión» NO es una ubicación (BR-042, resuelta)**: es el residual derivado `totalQuantity − Σ CargoLocation activos` calculado por el backend y expuesto en las respuestas de carga como `inTruckAmount`/`inTruckUnit`. El cliente lo consume y lo presenta como **fila del panel** (`DistributionPanel`); nunca calcula el residual ni lo representa en el mapa. `totalQuantity`/`totalUnit` son obligatorios para distribución parcial (error `CARGO_TOTAL_REQUIRED` 422).

### 5.5 Lazy loading de rutas

- Cada feature expone su propio `routes.ts` y se carga con `loadChildren` (o `loadComponent` para páginas sueltas). Árbol completo en `ROUTING.md`.
- No se usa `PreloadAllModules` (paquete inicial innecesario); precarga selectiva: tras `login` se precarga `dashboard` y `cargas`; el mapa operativo se descarga solo al abrir `/operational-map` (chunk pesado, ADR-006).
- El mapa operativo se hidrata por capas y solo la vista visible (lazy map, ver `architecture/MAP-ENGINE.md`).

### 5.6 Manejo global de errores (tres capas)

1. **Interceptor `api-error`**: intercepta respuestas no-2xx, deserializa el envelope canónico `{ error: { code, message, details?, requestId } }` (MASTER-SPEC §10) y clasifica:
   - `401` → intenta refresh token (ADR-008); si falla → logout + redirect a `/login?returnUrl=…`.
   - `403` → página `/forbidden` o error contextual, según la acción.
   - `404` → estado vacío contextual o `NotFoundPage` (recurso inexistente).
   - Red/offline → señal de estado offline (ver `PWA.md`).
   - Resto → mensaje amigable con `requestId` para soporte.
2. **`GlobalErrorHandler`** (extiende `ErrorHandler`): captura errores no capturados (JS, template), loguea (console + servicio de logs futuro) y muestra aviso discreto; nunca expone stack traces al usuario.
3. **Estados por vista**: toda vista con datos define `loading / empty / error` (componentes `LoadingIndicator`, `EmptyState`, `ErrorState` en `COMPONENTS.md`); reintento solo en operaciones idempotentes (GET).

Las mutaciones muestran el error en el punto de acción (toast + formulario conservando datos), nunca navegan a una pantalla genérica.

### 5.7 Servicios REST vs state stores (capa de estado en v1)

- **Servicios tipo "thin API client"** (`features/<dominio>/services/*.service.ts`): solo transporte y normalización del contrato HTTP; no guardan estado de negocio.
- **Stores con signals** (`state/` global y `features/<dominio>/state/` local): cachean, derivan y exponen estado (listas con filtros, detalle, selección del mapa, counts del dashboard). Detalle completo en `STATE-MANAGEMENT.md`.
- **Decisión v1 = servicios + signals** (canónica). Justificación: dominio acotado (16 entidades, ~17 ubicaciones de referencia, listas paginadas), equipo pequeño, y las necesidades reales son caché de queries + invalidación + estado de UI local — signals cubren eso con menos indirección.
- **NgRx (alternativa evaluada — tradeoffs)**: aporta devtools con time-travel, selectors memoizados y disciplina estricta; costos: boilerplate (actions/reducers/effects/selectors), curva de aprendizaje y más código para un dominio sin concurrencia compleja.
  - **Criterios de adopción** (se documentan para decidir sin rehacer): (a) sincronización compleja entre features (mapa ↔ cargas ↔ alertas en tiempo real), (b) undo/redo profundo sobre entidades, (c) decisión explícita del equipo. Si ocurre, migrar feature por feature empezando por mapa/alertas, sin reescritura global.
- **Alternativa tipo TanStack Query**: se respeta su patrón mental (claves de query + invalidación) dentro de los stores de signals; no se incorpora librería en v1 (evaluación futura si el backlog de queries crece).

### 5.8 Patrones de componentes

- Container/presentational: las páginas (container) orquestan estado; los componentes de UI reciben inputs y emiten outputs, no acceden a stores.
- Componentes pequeños y reutilizables; prohibido el "God component" (regla del grupo — ver `COMPONENTS.md`).
- Formularios: Reactive Forms tipados envueltos en `ui/form-field` (label + hint + error accesibles); errores del backend (p. ej. BR-006 observación vacía) se reflejan en el estado del form.

### 5.9 SSR, PWA y mapa SVG

- **SSR**: aporta a páginas públicas (login y landing futura) y a la primera carga percibida. **OQ-010 resuelta (2026-09-24): PWA mínima** — SSR **diferido a v1.1+** (consistente con OQ-033: la app es 100% autenticada en v1).
- **PWA**: manifest + service worker (ver `PWA.md`); regla crítica: mutaciones de movimiento nunca offline (BR-006/007).
- **Mapa**: motor SVG canónico (ADR-006); cada ubicación = `LocationVisual { id, x, y, width, height, rotation, zIndex, fill, stroke, labelPosition }` (MASTER-SPEC §11.5). Render por capas, memoización y virtualización; detalle visual en `DESIGN-SYSTEM.md` y UX en `ux/MAP-UX.md`.

## 6. Criterios de aceptación

- CA-1: Estructura de carpetas canónica con responsabilidades documentadas y dirección de dependencias respetada (verificable con lint de arquitectura en el repo futuro).
- CA-2: Cada feature se navega con lazy loading verificado (chunks por feature, precarga selectiva).
- CA-3: Todo error HTTP se presenta con el envelope canónico mapeado y mensaje accionable con `requestId`.
- CA-4: Ninguna mutación de movimiento/estado confirma éxito sin respuesta del backend (BR-006/007/008).
- CA-5: Los guards reflejan RBAC (§8 MASTER-SPEC) y documentan ser UX (BR-009).
- CA-6: No existe componente de dominio en `ui/` ni componente gigante en `features/` (§5.3 y §5.8).

## 7. Archivos involucrados

- Este documento y hermanos W4: `frontend/COMPONENTS.md`, `frontend/DESIGN-SYSTEM.md`, `frontend/STATE-MANAGEMENT.md`, `frontend/ROUTING.md`, `frontend/I18N.md`, `frontend/ACCESSIBILITY.md`, `frontend/SEO.md`, `frontend/PWA.md`.
- Consumidos: `docs/MASTER-SPEC.md` (incl. §§62-70 y BR-032..042), `docs/OPEN-QUESTIONS.md` (OQ-010/011/012/015 y OQ-041..047 — todas resueltas 2026-09-23/24 → BR-041/042/048/049, BR-036 ampliada, OQ-046 umbrales), `docs/architecture/ADR/ADR-002/006/008/009`, `docs/backend/API.md` y `docs/backend/ERROR-HANDLING.md` (W5), `docs/brand/DESIGN-TOKENS.md` (W7), `docs/ux/SCREENS.md` y `docs/ux/MAP-UX.md` (W6).

## 8. Riesgos

- R-01: Adoptar NgRx prematuramente o nunca a tiempo → criterios de entrada explícitos en §5.7, revisables en cada fase del roadmap (MASTER-SPEC §18).
- R-02: Chunk del mapa operativo pesado → lazy map, capas y virtualización (ADR-006).
- R-03: `effect` usado como propagación de estado (anti-patrón) → regla §5.2 + code review.
- R-04: Duplicación de modelos frontend/backend → `models/` espeja DTOs y se genera desde OpenAPI en el repo futuro.
- R-05: SSR + PWA mal coordinados (doble render, hidratación) → **OQ-010 resuelta (2026-09-24): PWA mínima, sin SSR en v1**; este grupo documenta la rama A como v1 y la coordinación con SSR queda para v1.1+.

## 9. DECISIONES PENDIENTES

- DP-FE-01: ~~**Alcance SSR/PWA en v1** (¿SSR completo, solo shell, o PWA mínima? — OQ-010)~~ → **RESUELTA (OQ-010, 2026-09-24)**: **PWA mínima** en v1 (manifest + service worker + offline parcial de assets); SSR diferido a v1.1+. Impacto actualizado: preloading, hidratación y estrategia de SW (`PWA.md`) se implementan para rama A; infraestructura de despliegue sin node server en v1.
- DP-FE-02: **Librería de i18n** (Angular i18n vs Transloco vs ngx-translate — recomendación y tradeoffs en `I18N.md`). Impacto: formato de locales, build y conmutación de idioma en runtime — 🔶 residual local de implementación (OQ-012/OQ-034 resueltas: es-AR fijo en v1, sin conmutador runtime).
- DP-FE-03: Si se adopta NgRx como evolución, ¿desde qué feature y en qué fase? (criterios §5.7). Impacto: estructura de `state/` y esfuerzo de migración.
- DP-FE-04: **Distribución M:N y capacidad (secciones 62-70, OQ-043/044/045 — resueltas 2026-09-24)**: regla de sobreocupación administrativa = **solo ADMIN, límite configurable default +10%, observación obligatoria, auditoría** (OQ-043 → BR-036 ampliada); conversión de unidades en movimientos parciales **NO en v1** — unidades compatibles o `PERCENT` (OQ-044 → BR-048, `UNIT_INCOMPATIBLE` 422); semántica del `percentage` de `CargoLocation` = **derivado de UI** (informativo; input solo si unidad `PERCENT` — OQ-045 → BR-049). OQ-041/OQ-042 quedaron **resueltas** (BR-041: unidad efectiva por tipo + override; BR-042: camión como residual `inTruckAmount`/`inTruckUnit`, no-location). Impacto: contratos de `DistributionPanel`, `LocationOccupancyCard`, `CapacityIndicator` y validación de formularios de distribución.