# CargoOps — Gestión de Estado del Frontend (STATE-MANAGEMENT)

> Grupo W4 (frontend) · Fuente canónica: `docs/MASTER-SPEC.md` (§11.2, §11.4) y `docs/frontend/FRONTEND-ARCHITECTURE.md` (§5.2, §5.4, §5.7).
> Fase 0: documentación. Los bloques fenced son ilustrativos; no se genera código de producción.

## 1. Objetivo

Definir la estrategia de estado del frontend de CargoOps: Angular Signals como mecanismo principal, capa de servicios "thin API client" vs stores, caché de consultas e invalidación (cargos, locations, **distribución M:N y capacidad**), estado del mapa (selección, hover, zoom/pan), sincronización con la API y la regla de **optimistic updates solo cuando el backend lo garantiza** (movimientos críticos NUNCA).

## 2. Contexto

El frontend opera un dominio acotado: listados paginados de cargas, ~17 ubicaciones de referencia (MASTER-SPEC §5), mapa SVG interactivo, formularios con observación obligatoria (BR-006/007) y permisos por rol (RBAC, BR-009). FRONTEND-ARCHITECTURE adopta "servicios + signals" para v1 (§5.7) con flujo unidireccional (§5.4) y deja NgRx como evolución con criterios de entrada explícitos (DP-FE-03). Este documento es el detalle de esa capa.

## 3. Restricciones

- R1: Signals como mecanismo principal: `signal` (estado), `computed` (derivados), `effect` solo para side effects (FRONTEND-ARCHITECTURE §5.2). Nunca usar `effect` para propagar estado entre signals.
- R2: El estado solo se escribe desde la capa de estado/servicios, nunca desde templates ni `computed` (§5.4).
- R3: Las mutaciones de movimiento/estado solo se confirman con respuesta 2xx del backend (BR-006/007/008; MASTER-SPEC §12): **sin optimistic updates en operaciones críticas**.
- R4: El frontend nunca es capa de seguridad: permisos reflejados para UX únicamente (BR-009).
- R5: Los servicios HTTP son thin clients del contrato `/api/v1` (envelope `{ data }` / `{ error: { code, message, details?, requestId } }`, MASTER-SPEC §10): transporte y normalización de DTOs; no guardan estado de negocio.
- R6: No persistir datos sensibles ni tokens: sesión en memoria (ADR-008); caché de sesión solo en memoria/`signal`.
- R7: Toda vista con datos define `loading / empty / error` (COMPONENTS R4).
- R8: Offline (PWA.md): lecturas desde caché permitidas; escrituras bloqueadas en v1.

## 4. Dependencias

| Documento | Uso |
| --- | --- |
| `frontend/FRONTEND-ARCHITECTURE.md` §5.2/§5.4/§5.7 | Bases de signals, flujo unidireccional, decisión servicios + signals, criterios NgRx |
| MASTER-SPEC §6/§7/§10 | BR-006/007/008, máquina de estados, contrato API |
| `frontend/COMPONENTS.md` §6 | Contratos de componentes que consumen estado |
| `backend/API.md` (W5) | Endpoints y DTOs exactos |
| `frontend/PWA.md` (hermano W4) | Comportamiento offline y bloqueo de escrituras |
| `ux/MAP-UX.md` (W6) | Interacciones de mapa que el estado refleja |

## 5. Decisiones

### 5.1 Mecanismo principal: Angular Signals

- Estado mutable privado en `signal()`, expuesto read-only (`.asReadonly()`); derivados en `computed()`; side effects en `effect()`.
- `computed` para: filas filtradas, ocupación/capacidad, permisos efectivos, VM de página (view-model). Nunca mutar estado dentro de un `computed`.
- `effect` para: persistencia de preferencias, anuncios a11y, flags de loading/refreshing, sincronización URL ↔ estado. Con `allowSignalWrites` deshabilitado por convención (solo la capa de estado escribe).
- OnPush por defecto; con signals la detección de cambios se acota a los consumidores de cada signal (ADR-002).

```ts
// Ilustración (no producción): store de listado de cargas
@Injectable({ providedIn: 'root' })
export class CargosStore {
  private readonly cargos = signal<Cargo[]>([]);
  private readonly totalItems = signal(0);
  private readonly filters = signal<CargoFiltersState>({});
  private readonly page = signal(1);
  private readonly isLoading = signal(false);
  private readonly isRefreshing = signal(false);
  private readonly error = signal<ApiError | null>(null);

  readonly vm = computed(() => ({
    cargos: this.cargos(),
    totalItems: this.totalItems(),
    filters: this.filters(),
    page: this.page(),
    isLoading: this.isLoading(),
    isRefreshing: this.isRefreshing(),
    error: this.error(),
  }));

  loadPage(filters: CargoFiltersState, page: number): void { /* única vía de escritura */ }
}
```

### 5.2 Cuándo: signal global, de feature o componente

| Necesidad | Dónde vive | Ejemplo CargoOps |
| --- | --- | --- |
| Sesión/identidad global | `state/auth.store` (global) | usuario, roles, permisos, sesión activa |
| Preferencias/config de UI | `state/settings.store` | idioma (OQ-012), preferencias personales |
| Notificaciones/toasts globales | `state/notifications.store` | `ToastHost`, toasts, contador |
| Alertas activas (multifeature) | `state/alerts.store` | dashboard + alertas + contador del topbar |
| Listado de cargas + filtros + paginación | `features/cargas/state/cargos.store` | `CargoTable`, `CargoSearch`, `CargoFilters` |
| Detalle de una carga + movimientos | `features/cargas/state/cargo-detail.store` (o signals de página) | `CargoDetail`, `MovementTimeline` |
| Distribución de una carga (segmentos M:N) | `features/cargas/state/cargo-locations.store` (entidad normalizada `CargoLocation`) | `DistributionPanel` (modo cargo) |
| Cargas de una ubicación | `features/ubicaciones/state/location-cargos.store` (entidad normalizada `CargoLocation` agrupada por ubicación) | `LocationCard`, `DistributionPanel` (modo location) |
| Estado del mapa | `features/mapa-operativo/state/map.store` | selección, hover, viewport, cross-highlight |
| Ocupación/capacidad por ubicación | `features/ubicaciones/state/occupancy.store` (o signals de página) — valores del backend `GET /locations/:id/capacity`; **no se deriva en el cliente** (BR-033/035) | `LocationOccupancyCard`, `CapacityIndicator`, mapa |
| Unidad por defecto por tipo de ubicación + override (config BR-041) | `features/ubicaciones/state/location-type-defaults.store` — caché de sesión (fresca como maestros, §5.3); se invalida con `CAPACITY_CHANGE` | `CapacityIndicator`, `DistributionPanel`, formularios de ubicación (unidad efectiva: m² por defecto en Sector, u en Plazoleta/Scanner/Balanza, override por ubicación) |
| Editor de planos (OQ-015 resuelta: editor fuera de v1) | `features/planos/state/plano-editor.store` | cambios sin guardar, tool activa, snap (undo/redo: DP-SC-07) |
| Estado efímero de UI | signal local del componente | dropdown abierto, tooltip, tab activa, acordeón |

Reglas:
- Uso en 3+ features sin ser sesión/prefs/notificaciones/alertas → evaluar promoción a `state/` (análoga a la regla de promoción a `shared/` de COMPONENTS §7).
- Lo que solo usa un feature vive en `features/<dominio>/state/`; nunca en `state/`.
- Servicios `features/<dominio>/services/*.service.ts`: solo transporte; stores `features/<dominio>/state/`: caché + derivados.

### 5.3 Cuándo NO usar signals (sujetos, componentes)

- `Subject`/`BehaviorSubject`: solo para **streams de eventos multi-productor** o integración con canales push/websocket (futuro, no definido en v1 — DP-ST-01). En v1 no hay caso que los exija.
- Datos que no cambian en la sesión (config estática, seeds de referencia) → constantes de servicio, no signals.
- Formularios: Reactive Forms tipados con su propio sistema de estado + señal local `isSubmitting`; el valor del form NO se replica en signals (evita doble fuente de verdad).
- El estado de navegación (ruta actual) lo gestiona el Router; las señales se inicializan/sincronizan desde la URL (ROUTING §5.4), no al revés.

### 5.4 Caché de consultas (listados: cargos, locations)

Patrón "query key + invalidación" (mental model TanStack Query respetado sin librería en v1 — FRONTEND-ARCHITECTURE §5.7):

- **Clave de caché** = `[recurso, filtros serializados, página, sort]`; cada entrada guarda `fetchedAt` (timestamp) para políticas de frescura.
- **Dedupe de concurrencia**: requests en vuelo con la misma clave se comparten (un solo GET; todos los consumidores esperan la misma promesa/signal).
- **Frescura (v1 — OQ-036 → DP-ST-02 resuelta)**: navegación a la ruta → refetch silencioso si la caché supera el TTL; TTL v1: **dashboard/alertas ~30s**, listados/maestros 5min; detalle/mapa manual (pull-to-refresh). Refresco manual (botón "Refrescar", SCREENS §2) siempre invalida.
- **Invalidación dirigida** tras mutación exitosa:
  - Mover una carga → invalida `cargos` (listado + detalle), `occupancy` de origen/destino, `map`, KPIs de `dashboard` y `alerts` (STALE_30D).
  - Cambio de estado (p. ej. a REZAGO) → idem + `alerts`.
  - Registro de carga → listado + dashboard.
  - **Crear/ajustar/egresar un segmento `CargoLocation`** (`POST`/`PATCH`/`DELETE /cargos/:id/locations/...` — BR-037/039/040) → invalida: `cargos/:id/locations` (mismo cargo), `locations/:id/cargos` (ubicaciones del segmento), `locations/:id/capacity` (ocupación de las ubicaciones afectadas), `map` (colores/ocupación) y `dashboard` (KPIs de ocupación).
  - **Modificar cantidad total de una carga** (`PATCH /cargos/:id` con `totalQuantity`/`totalUnit` — BR-042) → invalida `cargos/:id` (detalle) y `cargos/:id/locations` (el residual "En camión" `inTruckAmount`/`inTruckUnit` lo recalcula el backend; el cliente NO lo deriva) y `dashboard` si los KPIs lo reflejan.
  - Edición de plano/capacidades (`MAP_EDIT`, `CAPACITY_CHANGE` — MASTER-SPEC §4.3) → `map`, `locations`, `occupancy`/`capacity`.
  - Reversión (ADMIN) → historial de la carga + listado.
- **Paginación server-side** (`?page&limit&sort&filter`, MASTER-SPEC §10): se cachea la página actual, no el set completo.
- `locations` (maestros de referencia) se cachean en sesión (filtros, formularios, mapa) y se invalidan con `MAP_EDIT`/`CAPACITY_CHANGE`.
- Los filtros activos viven en la URL (deep-link, ROUTING §5.4): la URL es fuente del estado inicial y el store la actualiza con `pushState` — un solo dueño evita races (COMPONENTS R-02).

### 5.4.1 Consultas de distribución y capacidad (M:N)

- **Entidad normalizada**: los segmentos `CargoLocation` se normalizan por `cargoLocationId` en el store del contexto dueño (`cargo-locations.store` para una carga; `location-cargos.store` para una ubicación); los derivados (`computed`) agrupan por carga o por ubicación según el modo de `DistributionPanel`. Sin duplicación entre el detalle de carga y el detalle de ubicación: cada contexto consulta su propio endpoint y comparte el mismo modelo `CargoLocation`.
- **La ocupación NO se deriva en el cliente**: se consume `GET /locations/:id/capacity` (BR-033/035); el cliente solo calcula presentación (p. ej. porcentaje) sobre los valores provistos. Nunca se suman segmentos con unidades incompatibles en el cliente (BR-035; sin conversión en v1 — OQ-044 → BR-048 resuelta).
- **Frescura de la distribución**: mismo patrón TTL que 5.4 (navegación → refetch silencioso); el egreso/ajuste de un segmento **invalida la cache dirigida** (ver §5.4) porque altera ocupación de origen/destino e historial (BR-039).
- **Sin optimistic updates**: crear/ajustar/egresar segmentos son operaciones transaccionales (observación BR-006, historial BR-008, validación de capacidad BR-033/036) → confirmación 2xx obligatoria (§5.7).

### 5.5 Estado del mapa (selección, hover, zoom/pan)

- `map.store` expone:
  - `selectedLocationId: signal<string | null>`, `hoveredLocationId: signal<string | null>`, `selectedCargoId: signal<string | null>`;
  - `viewport: signal<MapViewport>` (zoom/pan) — derivado el transform SVG por `computed`;
  - `cargosByLocation: computed<Record<string, Cargo[]>>` (derivado del store de cargas u occupancy);
  - `interactive: signal<boolean>` (false en preview de planos).
- **Un solo dueño del estado de selección**: el SVG y el listado del panel comparten `map.store` (cross-highlight, SCREENS §7); los componentes son presentacionales (emiten eventos, no escriben estado).
- Zoom/pan: rangos y límites definidos en MAP-UX (W6); `resetView()` del toolbar; al navegar a una ubicación desde la lista, el viewport se centra en ella.
- Viewport NO se persiste en v1 (DP-ST-03: ¿deep-link de viewport por URL?).
- **Drag de cargas** (si DP-SC-06 lo habilita): el drag arma un `MovementDraft` que se completa en `ObservationDialog`; **el estado del mapa no muta hasta confirmación 2xx** (R3; PWA.md).
- Editor de planos (OQ-015 resuelta 2026-09-24: mapa = vista estática, editor fuera de v1): el estado de edición futuro (herramienta activa, elementos en borrador, snap a grid) vivirá en `plano-editor.store` del feature planos, separado del store del mapa operativo; la persistencia solo por API (BR-020; `PATCH /api/v1/maps/:id`).

### 5.6 Sincronización con API

- Flujo unidireccional (FRONTEND-ARCHITECTURE §5.4): evento → método del store → signals de loading → `HttpClient` → interceptors (token, refresh, error, requestId) → señal éxito/error → `computed` → template.
- Estados por query: `idle | loading | success | error` + `refreshing` (refetch silencioso que conserva datos y muestra indicador discreto, sin flicker).
- Errores: `ApiError` con código y `requestId` (MASTER-SPEC §10); error local por vista + `GlobalErrorHandler` para no capturados; 401 → refresh (ADR-008) → si falla logout + `/login?returnUrl=…`; 403 → `/forbidden` o error contextual; 404 → estado vacío contextual o not-found.
- **Sin realtime en v1** (no hay WebSocket/SSE definido): la frescura se resuelve con refetch por navegación + manual + TTL (OQ-036 → DP-ST-02 resuelta). Si una definición futura introduce push (OQ-011/021 resueltas no lo definen: notificaciones in-app, sin realtime), el canal alimenta invalidación vía un subject de eventos (único caso de sujetos en v1, §5.3).
- Offline: señal global `isOffline` (interceptor api-error / eventos de red) → banner + escrituras bloqueadas; lecturas sirven caché con timestamp de "última sincronización" (PWA.md §5.4).

### 5.7 Optimistic updates: SOLO donde el backend lo garantiza

Regla canónica del grupo:

- **NUNCA optimistas** (confirmación 2xx obligatoria):
  - Movimientos de carga (BR-006/007/008 — observación, historial, trazabilidad).
  - Cambios de estado (BR-016 — máquina de estados valida en backend).
  - Creación/registro (BR-001/002/003 — unicidad y existencia).
  - **Crear/ajustar/egresar segmentos de distribución `CargoLocation`** (BR-006/008/037/039 — observación, historial y validación de capacidad en backend; BR-033/036).
  - **Cambiar `totalQuantity`/`totalUnit` de una carga** (BR-042 — el residual `inTruckAmount`/`inTruckUnit` lo recalcula el backend; error `CARGO_TOTAL_REQUIRED` 422 si falta la cantidad total para distribución parcial).
  - Soft delete / restore / revert (BR-012/013 — auditoría y reversión).
  - Edición de plano/capacidades (BR-020).
  - Ack/resolve/dismiss de alertas (estado de negocio compartido: `AlertStatus`).
  - Ante error: el formulario conserva los datos y muestra el error inline con reintento (FRONTEND-ARCHITECTURE §5.6 último párrafo); ningún "rollback" de UI inventado que pueda mentir al usuario.
- **PERMITIDOS** (no persisten en backend o son idempotentes seguros): preferencias de UI (`settings.store` → localStorage vía `effect`), filtros/viewport del mapa, estado local de componente, marcas de lectura de toasts. Si la operación falla localmente, es indetectable o se descarta sin daño.
- **Condición formal**: "optimistic" solo si la operación es idempotente y el backend garantiza consistencia sin depender del orden (no es el caso de movimientos ni de transiciones de estado con reglas de dominio).
- Offline transaccional de movimientos en el futuro requiere estrategia explícita: idempotency keys, cola persistente, reconciliación y revert ledger — **fuera de v1** (DP-ST-04 / OQ-032 resuelta 2026-09-24: movimientos NO offline; ver PWA.md §5.6).

### 5.8 Formularios y estado

- Reactive Forms tipados como estado del formulario + signal local `isSubmitting` (inhibe doble submit, deshabilita el botón).
- Errores de backend mapeados al campo correspondiente: BR-006 (observación vacía en `ObservationDialog`), 409 (código duplicado en el campo código — SCREENS §5), BR-004/005 (ubicación inactiva / sobre capacidad) en el selector de destino.
- Al éxito: invalidación dirigida (§5.4) + reset/navegación; el diálogo nunca se cierra con pendiente (COMPONENTS §6.15).
- Validación de unicidad de código con debounce contra backend (BR-002/OQ-001; `utils/search/debounce`).

### 5.9 Persistencia local (no operativa)

- Solo `settings.store` persiste (efecto → localStorage): idioma/preferencias. En logout se conserva (preferencias del usuario); la caché de datos del predio (cargos, mapa, occupancy) se limpia al cerrar sesión.
- Nunca en localStorage: tokens/sesión (ADR-008), observaciones sin enviar, datos operativos ajenos al cache de sesión.
- Al recargar con sesión activa, `auth.store` se reconstruye vía `POST /api/v1/auth/refresh` (cookie HttpOnly — ADR-008); mientras tanto la UI muestra loading de bootstrap.

## 6. Criterios de aceptación

- CA-1: Ninguna mutación de movimiento/estado/distribución usa optimistic update (verificable por revisión de código).
- CA-2: Cada store tiene dueño único de escritura; sin escrituras desde templates ni `computed` (lint futuro).
- CA-3: Invalidación dirigida documentada para cada mutación (§5.4), sin invalidaciones globales indiscriminadas.
- CA-4: Toda consulta expone `loading/empty/error` + `refreshing` silencioso (COMPONENTS R4).
- CA-5: Offline: lecturas con caché + escrituras bloqueadas (PWA.md) con señal `isOffline` única.
- CA-6: Estado del mapa con dueño único y sincronizado con el listado (cross-highlight).

## 7. Archivos involucrados

- Consumidores: `frontend/COMPONENTS.md`, `frontend/ROUTING.md` (filtros en URL), `frontend/ACCESSIBILITY.md` (anuncios de estado), `frontend/PWA.md` (offline).
- Fuentes: `frontend/FRONTEND-ARCHITECTURE.md`, MASTER-SPEC §6/§7/§10, `backend/API.md` (W5), `ux/MAP-UX.md` (W6).

## 8. Riesgos

- R-01: `effect` usado como propagación de estado (anti-patrón) → regla §5.1 + code review (FRONTEND-ARCHITECTURE R-03).
- R-02: Races entre filtros/tabla y URL → clave de caché completa + URL como fuente de estado inicial (ROUTING §5.4).
- R-03: Estado de mapa duplicado (SVG vs listado) → dueño único `map.store` (CA-6).
- R-04: Caché servida como "verdad" sin red → banner + timestamp "última sincronización" (PWA.md §5.4).
- R-05: Crecimiento de queries/features → aplicar criterios NgRx/TanStack de FRONTEND-ARCHITECTURE §5.7 (DP-FE-03).
- R-06: Occupancy/capacidad/distribución — OQ-044/045/046 **resueltas 2026-09-24** (sin conversión → BR-048; percentage derivado → BR-049; umbrales <70/70–90/>90; unidad por defecto → BR-041; residual "En camión" → BR-042) → los derivados de ocupación usan SOLO valores del backend (`GET /locations/:id/capacity`). Riesgo cerrado.

## 9. DECISIÓN PENDIENTE

| ID | Pregunta | Relación |
| --- | --- | --- |
| DP-ST-01 | ~~¿Realtime/push (WebSocket o SSE) en v1 para alertas/mapa, o refetch periódico?~~ → **RESUELTA (OQ-036, 2026-09-24)**: **polling con TTL** en v1; **sin WebSocket**; pausa automática en interacción (WCAG 2.2.2) | OQ-036 (resuelta 2026-09-24) |
| DP-ST-02 | ~~TTL de refetch por recurso (dashboard/alertas 60s, listados 5min propuestos) y política de polling~~ → **RESUELTA (OQ-036, 2026-09-24)**: dashboard ~30s, alertas ~30s, detalle/mapa manual (pull-to-refresh) | OQ-036 (resuelta 2026-09-24) |
| DP-ST-03 | ¿El viewport del mapa se deep-linkea por URL o es efímero por sesión? | 🔶 Residual local (MAP-UX W6 / ROUTING — sin OQ asociada) |
| DP-ST-04 | ~~Estrategia transaccional offline para movimientos (idempotency + reconciliación)~~ → **RESUELTA (OQ-032, 2026-09-24)**: movimientos **NO offline** en v1 (requieren conexión); `Idempotency-Key` en endpoints de escritura + retries con backoff | OQ-032 (resuelta 2026-09-24) |
| DP-ST-05 | ~~Validación de unidades compatibles al crear/ajustar segmentos `CargoLocation` (¿rechazo sin conversión en v1? — BR-035) y semántica del `percentage` (¿almacenado o derivado?) para los drafts de `DistributionPanel`~~ → **RESUELTA (OQ-044 → BR-048 / OQ-045 → BR-049, 2026-09-24)**: sin conversión en v1 (unidades compatibles o `PERCENT`, `UNIT_INCOMPATIBLE` 422); `percentage` es derivado de UI e informativo salvo unidad `PERCENT` | OQ-044 / OQ-045 (resueltas 2026-09-24) |