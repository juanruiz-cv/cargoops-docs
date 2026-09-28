# CargoOps — Inventario de Componentes

> Grupo W4 (frontend). Fuente de verdad canónica: `docs/MASTER-SPEC.md` §11.4 (catálogo canónico) y §12 (UX/UI).
> Fase 0: documentación; los fragmentos fenced son ilustrativos.

## 1. Objetivo

Catálogo completo de los componentes del frontend de CargoOps: propósito, contrato de inputs/outputs, estados visuales, accesibilidad, reutilización y feature dueño. Es la referencia que consume `DESIGN-SYSTEM.md` (apariencia) y cada feature (composición de pantallas).

## 2. Contexto

MASTER-SPEC §11.4 propone 18 componentes canónicos; este inventario los especifica y agrega componentes transversales propuestos. El catálogo canónico incorpora `LocationOccupancyCard` y `DistributionPanel`, requeridos por la distribución MANY-TO-MANY Cargo↔Location (secciones 62-70, BR-032/040). Regla del grupo: componentes pequeños y reutilizables; ninguna pantalla se construye como un único componente gigante ("no God component", refrendada en `FRONTEND-ARCHITECTURE.md` §5.8).

## 3. Restricciones

- R1: Nombres y contratos en inglés; textos visibles en español es-AR vía i18n (`I18N.md`).
- R2: Los componentes de UI son presentacionales: solo inputs/outputs; los containers (páginas) orquestan estado (`FRONTEND-ARCHITECTURE.md` §5.8).
- R3: Ninguna mutación de movimiento/estado se confirma sin respuesta del backend (BR-006/007; `STATE-MANAGEMENT.md`).
- R4: Todo componente con datos define `loading / empty / error`, salvo primitivas justificadas.
- R5: Accesibilidad WCAG 2.2 AA (`ACCESSIBILITY.md`).

## 4. Dependencias

| Dependencia | Uso |
| --- | --- |
| MASTER-SPEC §4 (enums `CargoStatus`, `LocationType`, `CargoLocationStatus`, `QuantityUnit`, `CapacityType`) | Datos y estados de los componentes (los 18 canónicos incluyen distribución M:N y capacidad por unidad) |
| MASTER-SPEC §10 (envelope API) | Estados de error/empty derivados de respuestas |
| MASTER-SPEC §13 (tokens) + `frontend/DESIGN-SYSTEM.md` | Apariencia de cada estado |
| `frontend/ROUTING.md` | Navegación desde componentes (breadcrumbs, links) |
| `frontend/I18N.md` | Textos y formatos de fecha es-AR |
| `frontend/STATE-MANAGEMENT.md` | Interacción con stores (listas, mutaciones) |

## 5. Inventario

### 5.1 Catálogo canónico (MASTER-SPEC §11.4)

| # | Componente | Feature dueño | Uso transversal |
| --- | --- | --- | --- |
| 1 | CargoTable | cargas | cargas, dashboard, historial, alertas |
| 2 | CargoStatusBadge | cargas | cargas, mapa-operativo, alertas, historial, dashboard |
| 3 | CargoDetail | cargas | cargas (página detalle) |
| 4 | CargoSearch | cargas | cargas, dashboard |
| 5 | CargoFilters | cargas | cargas |
| 6 | OperationalMap | mapa-operativo | mapa-operativo (una instancia por sesión) |
| 7 | MapLocation | mapa-operativo | operational-map, planos (preview) |
| 8 | MapToolbar | mapa-operativo | operational-map |
| 9 | MapLegend | mapa-operativo | operational-map, planos |
| 10 | LocationCard | mapa-operativo | mapa-operativo (panel lateral), planos |
| 11 | MovementTimeline | cargas | cargas (detalle), historial |
| 12 | CapacityIndicator | cargas | cargas, mapa-operativo, dashboard, planos |
| 13 | AlertCard | alertas | alertas, dashboard |
| 14 | ConfirmDialog | shared | cualquier acción destructiva |
| 15 | ObservationDialog | shared | movimientos y cambios de estado (BR-006/007) |
| 16 | PdfExportButton | shared | cargas (detalle), historial |
| 17 | DistributionPanel | cargas / ubicaciones | cargas (detalle), ubicaciones (detalle), mapa-operativo (panel) |
| 18 | LocationOccupancyCard | ubicaciones | ubicaciones (detalle), mapa-operativo (panel lateral), dashboard |

### 5.2 Componentes propuestos (adicionales)

`PageHeader` · `Breadcrumbs` · `EmptyState` · `ErrorState` · `LoadingIndicator` · `PaginationBar` · `StatusFilterDropdown` · `PermanenceBadge` · `ToastHost` · `CapacityUnitBadge` (label corto de unidad efectiva — BR-041) · `FormField` (primitiva `ui/`). Especificación resumida en §7.

## 6. Detalle de componentes canónicos

### 6.1 CargoTable
- **Propósito**: tabla operativa de cargas con columnas configurables (código, estado, ubicación, permanencia, camión, última actualización), orden por columna y selección (una o varias filas). Paginación server-side (`?page&limit`, MASTER-SPEC §10).
- **Inputs**: `cargos: Cargo[]`, `columns: CargoTableColumn[]`, `isLoading: boolean`, `selectedCargoIds: string[]`, `totalItems: number`, `page: number`, `pageSize: number`, `emptyMessage: string`, `ariaLabel: string`.
- **Outputs**: `sortChange(SortChange)`, `pageChange(number)`, `pageSizeChange(number)`, `selectionChange(string[])`, `rowActivate(Cargo)` (navega a detalle).
- **Estados visuales**: loading (esqueleto de filas + `aria-busy`), empty (con `EmptyState`: "Sin cargas para los filtros aplicados"), error (fila de error con reintento), normal (hover en filas, selección resaltada, indicadores de orden).
- **Accesibilidad**: `<table>` real con `caption`, `th scope="col"`, botones de orden con `aria-sort`, checkboxes con label, `aria-live="polite"` en cambios de página.
- **Reutilización**: alta. Feature dueño: `features/cargas`.

### 6.2 CargoStatusBadge
- **Propósito**: badge tipado por estado operativo (`CargoStatus`) con color, ícono y label i18n; comunica el estado sin depender solo del color (MASTER-SPEC §13).
- **Inputs**: `status: CargoStatus`, `size?: 'sm' | 'md'`, `showLabel?: boolean` (default true).
- **Outputs**: ninguno.
- **Estados visuales**: uno por valor del enum — `REGISTERED`, `IN_TRUCK`, `PARTIALLY_UNLOADED`, `STORED`, `IN_REVIEW`, `REZAGO`, `SECUESTRO`, `IN_TRANSIT`, `EXITED`, `DELETED` (soft). Mapa color+ícono en `DESIGN-SYSTEM.md` §6.4.
- **Accesibilidad**: color nunca es el único canal (label + ícono); sin tooltip como único medio.
- **Reutilización**: alta. Feature dueño: `features/cargas` (exportado vía `shared/`).

### 6.3 CargoDetail
- **Propósito**: panel de detalle de una carga: datos maestros (código, descripción, estado, camión), permanencia (`PermanenceBadge`), alertas activas, movimientos (`MovementTimeline`), **sección de distribución** (`DistributionPanel`, §6.17: segmentos por ubicación con cantidad, unidad, porcentaje, estado del segmento y fechas de ingreso/salida — BR-040) y acciones autorizadas por permiso.
- **Inputs**: `cargo: Cargo | null`, `movements: Movement[]`, `segments?: CargoLocation[]`, `isLoadingSegments?: boolean`, `segmentsError?: string | null` (errores de la consulta de distribución, §6.17), `permissions: PermissionCode[]`, `isLoading: boolean`, `errorMessage?: string`.
- **Outputs**: `viewMovements(cargoId)`, `requestMove(cargo)`, `requestStateChange(cargo)`, `exportPdf(cargo)` (via `PdfExportButton`), `reload()`.
- **Estados visuales**: loading (skeleton), empty (carga soft-deleted, solo lectura), error (bloque con reintento), normal; la sección de distribución declara sus propios estados loading/vacío/error (§6.17), independientes del resto del detalle.
- **Accesibilidad**: encabezado jerárquico correcto (h2), pares label/valor con `<dl>`, acciones con labels explícitos; la sección de distribución usa una tabla semántica (§6.17).
- **Reutilización**: media (sirve a la página detalle). Feature dueño: `features/cargas`.

### 6.4 CargoSearch
- **Propósito**: búsqueda por código de carga con debounce y normalización; soporta códigos heterogéneos (`029TERRA26`, `JV028/2026CH`, `203/2017CL-LA` — BR-002/OQ-001).
- **Inputs**: `placeholder?: string`, `initialValue?: string`, `debounceMs?: number` (default 300), `disabled`.
- **Outputs**: `queryChange(string)` (tras debounce y normalización).
- **Estados visuales**: default, focus (ring visible), disabled, loading (spinner inline), error de normalización con mensaje.
- **Accesibilidad**: `<input>` con label visible, hint en `aria-describedby`, estados anunciados.
- **Reutilización**: alta. Feature dueño: `features/cargas`.

### 6.5 CargoFilters
- **Propósito**: panel de filtros compuestos (estado, ubicación/área, rango de ingreso, alertas activas, permanencia) combinables con la búsqueda; los filtros activos se muestran como chips removibles y forman parte de la URL (deep-link, `ROUTING.md`).
- **Inputs**: `filters: CargoFiltersState`, `availableLocations: Location[]`, `statuses: CargoStatus[]`, `isLoadingLocations: boolean`.
- **Outputs**: `filtersChange(CargoFiltersState)`, `clearAll()`.
- **Estados visuales**: collapsed/expanded; sin resultados lo indica la tabla.
- **Accesibilidad**: `fieldset` + `legend` por grupo, controles con labels, chips removibles accesibles (botón con `aria-label`).
- **Reutilización**: media (cargas; parcialmente alertas). Feature dueño: `features/cargas`.

### 6.6 OperationalMap
- **Propósito**: mapa operativo SVG del predio (ADR-006): plazoleta (zona gris), galpón con sectores 1–12 (zona amarilla) y áreas especiales (Scanner, Balanza, Rezago, Secuestro); coloreado por ocupación/estado; zoom, pan, hover, selección; panel lateral con `LocationCard`.
- **Inputs**: `map: Map`, `locations: Location[]`, `cargosByLocation: Record<string, Cargo[]>`, `selectedLocationId?: string`, `viewport: MapViewport`, `interactive?: boolean` (false en preview).
- **Outputs**: `locationSelect(Location)`, `viewportChange(MapViewport)`, `cargoSelect(Cargo)`.
- **Estados visuales**: loading (skeleton del mapa), empty (plano sin elementos), error (reintento), normal; selección/hover delegados en `MapLocation`.
- **Accesibilidad**: el mapa NO es la única vía: alternativa accesible obligatoria = listado de cargas por ubicación (`LocationCard`, §6.10; `ACCESSIBILITY.md`). Interacciones reflejadas en el listado.
- **Reutilización**: una instancia por sesión; preview opcional en planos. Feature dueño: `features/mapa-operativo`.

### 6.7 MapLocation
- **Propósito**: una ubicación dentro del SVG — `LocationVisual { id, x, y, width, height, rotation, zIndex, fill, stroke, labelPosition }` (MASTER-SPEC §11.5): forma, label, estado y ocupación; maneja hover/selección.
- **Inputs**: `locationVisual: LocationVisual`, `location: Location`, `occupancy: LocationOccupancy`, `isSelected: boolean`, `isHovered: boolean`, `disabled: boolean` (inactiva/en mantenimiento).
- **Outputs**: `select(Location)`.
- **Estados visuales**: default/hover/focus (outline), seleccionado (stroke reforzado), inactiva (patrón + opacidad + ícono, nunca solo color), sobre-capacidad (BR-005: indicador crítico; tooltip no exclusivo).
- **Accesibilidad**: `role="group"` con label asociado; acceso completo por teclado vía listado alternativo (§6.10).
- **Reutilización**: media. Feature dueño: `features/mapa-operativo`.

### 6.8 MapToolbar
- **Propósito**: acciones del mapa: zoom in/out, reset view, toggle leyenda, toggle listado accesible; en móvil, panel/drawer inferior (no clonar desktop — MASTER-SPEC §12); modo edición fuera de v1 (OQ-015 resuelta 2026-09-24: mapa = vista estática).
- **Inputs**: `zoomLevel: number`, `canZoomIn: boolean`, `canZoomOut: boolean`, `legendVisible: boolean`, `accessibleListVisible: boolean`.
- **Outputs**: `zoomIn()`, `zoomOut()`, `resetView()`, `toggleLegend()`, `toggleAccessibleList()`.
- **Estados visuales**: botones estándar del design system; tooltips no exclusivos.
- **Accesibilidad**: íconos con `aria-label`, `aria-pressed` en toggles.
- **Reutilización**: baja-media (mapa-operativo; planos si aplica edición). Feature dueño: `features/mapa-operativo`.

### 6.9 MapLegend
- **Propósito**: leyenda obligatoria del mapa (MASTER-SPEC §13): significado de colores, patrones, íconos y estados (activa/inactiva/mantenimiento; ocupación normal/alta/sobre capacidad; áreas especiales).
- **Inputs**: `legend: MapLegendItem[]` (derivado del plano y tipos).
- **Outputs**: ninguno.
- **Estados visuales**: colapsable; ítems con muestra visual + label (nunca solo color).
- **Accesibilidad**: lista semántica; texto legible sin zoom.
- **Reutilización**: media. Feature dueño: `features/mapa-operativo`.

### 6.10 LocationCard
- **Propósito**: tarjeta de detalle de ubicación: nombre, código, tipo, capacidad (`CapacityIndicator` + `LocationOccupancyCard`), **cargas presentes como segmentos `CargoLocation` activos** (cada carga aporta cantidad + unidad a la ocupación — BR-033: una ubicación contiene N cargas) y acciones (ver en detalle `/ubicaciones/:id`, ver en mapa). Es la base de la alternativa accesible del mapa.
- **Inputs**: `location: Location`, `occupancy: LocationOccupancy` (del backend, `GET /locations/:id/capacity`), `segments: CargoLocation[]` (segmentos activos con la carga asociada), `isLoadingSegments: boolean`, `segmentsError?: string | null`.
- **Outputs**: `cargoSelect(Cargo)` (derivado del segmento), `openLocation(locationId)` (navega a `/ubicaciones/:id`).
- **Estados visuales**: loading / empty ("Ubicación sin cargas") / error / normal; resaltada si se selecciona desde el mapa; la ocupación delega sus estados en `LocationOccupancyCard` (§6.18).
- **Accesibilidad**: navegable por teclado sin necesidad del SVG (alternativa del mapa, §6.6); lista semántica de cargas con cantidad y unidad.
- **Reutilización**: media. Feature dueño: `features/mapa-operativo`.

### 6.11 MovementTimeline
- **Propósito**: historial temporal de movimientos de una carga (BR-008, línea reconstruible): fecha es-AR, origen → destino, estado anterior → nuevo, usuario, motivo y observación (BR-006); reversiones marcadas (BR-012).
- **Inputs**: `movements: Movement[]`, `enableRevert?: boolean` (ADMIN), `isLoading: boolean`.
- **Outputs**: `revertRequested(Movement)` (dispara `ConfirmDialog` + `ObservationDialog`).
- **Estados visuales**: loading (skeleton), empty ("Sin movimientos registrados"), error, normal; reversiones marcadas visual y textualmente.
- **Accesibilidad**: `<ol>` con fechas legibles; `aria-live="polite"` al cargar.
- **Reutilización**: alta (cargas + historial). Feature dueño: `features/cargas`.

### 6.12 CapacityIndicator
- **Propósito**: barra de capacidad de una ubicación **unit-aware** (BR-033/035): usado vs configurado en la misma unidad compatible (m², m³, pallets, t, %, u), % ocupado y umbrales de color. Los valores provienen del backend (`GET /locations/:id/capacity`); **el cliente nunca suma unidades incompatibles** (BR-035; sin conversión en v1 — OQ-044 → BR-048 resuelta). La unidad mostrada es la **unidad efectiva** de la ubicación: `Location.capacityUnit` (override por ubicación, ADMIN) o el default por `LocationType` (BR-041).
- **Inputs**: `used: number | null`, `capacity: number | null`, `capacityUnit: QuantityUnit` (unidad efectiva — BR-041: AREA, CUBIC_METERS, PALLETS, TONS, PERCENT, UNITS — `CapacityType` alineado, MASTER-SPEC §4.3), `unlimited?: boolean` (CapacityType UNLIMITED), `showLabel?: boolean`, `compact?: boolean`.
- **Outputs**: ninguno.
- **Estados visuales**: normal (success), **70–90 % → warning**, **>90 % → danger** (umbrales canónicos — OQ-046 resuelta), sobre capacidad (danger: la impide el backend salvo `allowOverOccupation` administrativa — BR-036 ampliada/OQ-043 resuelta), unlimited (texto "Ilimitado" sin barra), loading (skeleton), error (ocupación no disponible, con reintento).
- **Accesibilidad**: `role="meter"` con `aria-valuenow/min/max` y `aria-valuetext` con unidad (p. ej. "80 de 100 m²"); label textual + barra (color nunca único canal, R5 de DESIGN-SYSTEM).
- **Reutilización**: alta. Feature dueño: `features/cargas`.

### 6.13 AlertCard
- **Propósito**: alerta operativa (tipo, severidad, carga asociada, permanencia, acciones según `AlertStatus`: OPEN / ACKNOWLEDGED / RESOLVED / DISMISSED — MASTER-SPEC §9): revisar, reconocer, resolver, mover a Rezago (decisión humana obligatoria, BR-014).
- **Inputs**: `alert: Alert`, `cargo: Cargo | null`, `permissions: PermissionCode[]`, `isLoading: boolean`.
- **Outputs**: `acknowledge(alert)`, `resolve(alert)`, `requestMoveToRezago(alert)`, `openCargo(cargoId)`.
- **Estados visuales**: por severidad (tokens warning/danger/info de `DESIGN-SYSTEM.md`), por estado de alerta (OPEN/ACKNOWLEDGED/DISMISSED/RESOLVED), loading/empty ("Sin alertas activas")/error.
- **Accesibilidad**: `article` con encabezado; ancla al detalle de la carga; botones con labels.
- **Reutilización**: alta (alertas + dashboard). Feature dueño: `features/alertas`.

### 6.14 ConfirmDialog
- **Propósito**: confirmación de acciones destructivas o importantes (soft delete — BR-013, revertir — BR-012, mover, resolver alerta) con tono de riesgo y botón acorde.
- **Inputs**: `title: string`, `message: string`, `confirmLabel: string`, `cancelLabel: string`, `tone: 'default' | 'danger'`, `isLoading: boolean`, `errorMessage?: string`.
- **Outputs**: `confirm()`, `cancel()`.
- **Estados visuales**: overlay modal, loading en botón de confirmación, error inline si la mutación falla.
- **Accesibilidad**: focus trap, `role="dialog" aria-modal="true"`, retorno de foco al invocador, Esc cancela (`ACCESSIBILITY.md`).
- **Reutilización**: alta. Feature dueño: compartido (`shared/`).

### 6.15 ObservationDialog
- **Propósito**: captura de la observación obligatoria para movimientos y cambios de estado (BR-006/007: no vacía, longitud mínima; persiste 1:1 con el movimiento). Paso final antes de confirmar cualquier mutación crítica.
- **Inputs**: `context: ObservationContext` (acción, carga, origen/destino), `isSubmitting: boolean`, `backendError?: ApiError | null`, `minLength?: number`.
- **Outputs**: `submit(ObservationDraft)`, `cancel()`.
- **Estados visuales**: formulario con contador, error de validación (vacío/corto), error de backend (envelope), loading de envío; no se cierra con dato pendiente sin aviso.
- **Accesibilidad**: labels explícitos, errores con `aria-describedby`, foco inicial en el textarea.
- **Reutilización**: crítica (toda mutación de movimiento/estado la usa). Feature dueño: compartido (`shared/`).

### 6.16 PdfExportButton
- **Propósito**: exportación PDF de una carga (historial + observaciones) vía `POST /api/v1/cargos/:id/export-pdf` (MASTER-SPEC §10; verbo POST — OQ-017); permisos por rol (BR-018, `cargo.export_pdf`); delegación al servicio backend de PDF (MASTER-SPEC §11.6; OQ-005).
- **Inputs**: `cargoId: string`, `permitted: boolean`, `isExporting: boolean`, `errorMessage?: string`.
- **Outputs**: `exportRequested(cargoId)`.
- **Estados visuales**: default/hover/focus/disabled (sin permiso o en progreso), loading (spinner), error (toast con reintento).
- **Accesibilidad**: label textual "Exportar PDF" + ícono; resultado de descarga anunciado.
- **Reutilización**: media (detalle de cargas, historial). Feature dueño: compartido (`shared/`).

### 6.17 DistributionPanel
- **Propósito**: panel de distribución MANY-TO-MANY Cargo↔Location (BR-032/040) con dos modos según contexto: `mode='cargo'` — segmentos de una carga (`GET /cargos/:id/locations`): ubicación, cantidad, unidad, porcentaje, estado (ACTIVE/EXITED), enteredAt/exitedAt, total distribuido vs total de la carga (BR-034) y **fila residual «En camión»** (BR-042); `mode='location'` — cargas de una ubicación (`GET /locations/:id/cargos`): carga, cantidad aportada, porcentaje y ocupación. La fila «En camión» es un **residual no-location**: la consume del backend (`inTruckAmount`/`inTruckUnit`, BR-042), **nunca la calcula**, y no es una ubicación ni se representa en el mapa. Las mutaciones de segmentos (crear/ajustar/egresar, OPERATOR+ — BR-010) exigen `ObservationDialog` (BR-006/039) y confirmación 2xx: **sin optimistic update** (STATE-MANAGEMENT §5.7). El panel presenta los totales que devuelve el backend; jamás suma segmentos con unidades incompatibles (BR-035; OQ-044).
- **Inputs**: `mode: 'cargo' | 'location'`, `segments: CargoLocation[]`, `totalQuantity?: number | null`, `totalUnit?: QuantityUnit | null` (modo cargo), `inTruckAmount?: number | null`, `inTruckUnit?: QuantityUnit | null` (residual «en camión» provisto por el backend — BR-042), `permissions: PermissionCode[]`, `isLoading: boolean`, `errorMessage?: string`.
- **Outputs**: `createSegment(segmentDraft)` (crear segmento + movimiento), `adjustSegment(cargoLocationId, newQuantity)` (ajuste de cantidad/porcentaje — OQ-045), `exitSegment(cargoLocationId)` (egreso de la ubicación → movimiento), `reload()`.
- **Estados visuales**: loading (skeleton de filas), empty (modo cargo: "Sin distribución registrada" / modo location: "Ubicación sin cargas"), error (bloque con reintento GET), normal; formulario de segmento con validación de unidad compatible con la ubicación (BR-035) y de suma ≤ total de la carga (BR-034). La fila «En camión» (residual) se muestra **solo cuando `totalQuantity` está definido y el residual > 0**; si `totalQuantity`/`totalUnit` faltan y se intenta crear/ajustar un segmento o descarga parcial, el backend responde `CARGO_TOTAL_REQUIRED` (422, BR-042) y el panel muestra la acción de definir el total; la fila residual se oculta en los estados loading/empty/error del resto del panel para no mezclar datos no disponibles con datos cargados.
- **Accesibilidad**: tabla semántica (`caption`, `th scope="col"`, `aria-sort` en cantidad), cantidad con unidad legible, total de la carga anunciado, acciones con labels explícitos, `aria-live="polite"` al egresar/ajustar; la fila «En camión» es texto informativo (`aria-label` "Residual en camión: 40 de 100 u"), sin semántica de alerta (BR-042).
- **Reutilización**: alta (detalle de carga, detalle de ubicación, panel del mapa). Feature dueño: `features/cargas` — promovible a `shared/` si lo usan 3+ features (regla §7).

### 6.18 LocationOccupancyCard
- **Propósito**: tarjeta de capacidad/ocupación de una ubicación (BR-033/035/040): capacidad configurada, ocupada, disponible y % ocupado en la unidad compatible (m², m³, pallets, t, %, u). Valores provistos por el backend (`GET /locations/:id/capacity`); **nunca calculados en el cliente**. Incluye `CapacityIndicator` y señal de sobreocupación administrativa (BR-036, flag `allowOverOccupation` — OQ-043).
- **Inputs**: `occupancy: LocationOccupancy` (`capacity`, `capacityUnit`, `occupiedCapacity`, `availableCapacity`, `percentage`, `overOccupied?: boolean`), `isLoading: boolean`, `errorMessage?: string`.
- **Outputs**: ninguno (la edición de capacidad es ADMIN vía planos/configuración — BR-011/020).
- **Estados visuales**: loading (skeleton), empty (capacidad UNLIMITED o sin datos → texto "Ilimitado"), error (reintento), normal; variante danger con patrón cuando hay sobreocupación (BR-036/OQ-043).
- **Accesibilidad**: `role="meter"` con `aria-valuenow/min/max` y `aria-valuetext` ("80 de 100 m² · disponibles 20 m²"); texto + color (WCAG 1.4.1); contraste AA.
- **Reutilización**: alta (detalle de ubicación, mapa/panel lateral, dashboard). Feature dueño: `features/ubicaciones`.

## 7. Componentes propuestos (especificación resumida)

| Componente | Propósito | Inputs clave | Outputs | Feature |
| --- | --- | --- | --- | --- |
| PageHeader | Título, subtítulo y acciones de página | `title`, `subtitle?`, `actions?`, `breadcrumbs?` | — | shared |
| Breadcrumbs | Migas según metadata de ruta (ROUTING.md) | `items: BreadcrumbItem[]` | `navigate(BreadcrumbItem)` | shared |
| EmptyState | Estado vacío genérico | `title`, `message?`, `actionLabel?` | `action()` | shared |
| ErrorState | Error con reintento (solo idempotente) | `message`, `requestId?`, `retryLabel?` | `retry()` | shared |
| LoadingIndicator | Spinner/esqueleto estándar | `mode: 'spinner' \| 'skeleton'`, `label?` (aria) | — | shared |
| PaginationBar | Paginación server-side (`page`/`limit`/`sort`) | `page`, `pageSize`, `total`, `pageSizeOptions` | `pageChange`, `pageSizeChange` | shared |
| StatusFilterDropdown | Select tipado de estados (reusa mapping de badges) | `statuses: CargoStatus[]`, `value?` | `valueChange(CargoStatus \| null)` | cargas/alertas |
| PermanenceBadge | Días de permanencia con énfasis > 30 (BR-014) | `entryDate`, `alertThresholdDays?` | — | cargas/dashboard/alertas |
| ToastHost | Host de toasts (éxito/error/info/offline) | `toasts: Toast[]` | `dismiss(id)` | shared (state) |
| FormField (`ui/`) | Primitiva label + control + hint + error | `label`, `hint?`, `error?`, `required`, `forId` | — | ui (design system) |

Regla transversal: si un componente nuevo se necesita en 3+ features, se promueve a `shared/`; si no, vive en su feature.

## 8. Criterios de aceptación

- CA-1: Los 18 canónicos + propuestos tienen contrato, estados, accesibilidad y feature dueño documentados (sin celdas vacías).
- CA-2: `CargoStatusBadge`, `CapacityIndicator`, `AlertCard` y `MapLocation` no dependen solo del color (MASTER-SPEC §13).
- CA-3: `ObservationDialog` se usa en toda mutación de movimiento/estado (BR-006/007).
- CA-4: `OperationalMap` tiene alternativa accesible documentada (`LocationCard`/listado por ubicación).
- CA-5: Ningún componente canónico excede el scope de su propósito (§6); verificable en revisión de implementación.

## 9. Archivos involucrados

- Este documento; `frontend/DESIGN-SYSTEM.md` (apariencia de cada estado), `frontend/ROUTING.md` (navegación), `frontend/ACCESSIBILITY.md` (contratos ARIA completos), `frontend/I18N.md` (labels), `frontend/STATE-MANAGEMENT.md` (interacción con stores).
- Fuentes: MASTER-SPEC §4/§6/§9/§10/§11.4/§13 (incl. BR-032..040 y secciones 62-70); `backend/API.md` (W5); `ux/SCREENS.md` y `ux/MAP-UX.md` (W6).

## 10. Riesgos

- R-01: Degradación a componentes gigantes en el detalle de carga o el mapa → regla §3-R2 + code review.
- R-02: Desincronización `CargoTable` ↔ filtros (races) → patrón de listas de `STATE-MANAGEMENT.md` §5.5.
- R-03: Mapa sin alternativa accesible → bloqueado por CA-4 y a11y de `LocationCard`.
- R-04: `PdfExportButton` — estrategia PDF **resuelta (OQ-005 → ADR-013: HTML→PDF server-side)** → contrato API fijado; resta el detalle del modo de descarga (🔶 residual local — DP-COMP-02).
- R-05: ~~Severidad de alertas sin enum canónico en MASTER-SPEC~~ → **resuelta (ID-007, 2026-09-23)**: `AlertSeverity` canónico en MASTER-SPEC §4.3 (`LOW | MEDIUM | HIGH | CRITICAL`); el mapeo visual de `AlertCard` se fija contra ese enum (DESIGN-SYSTEM.md §6.5).

## 11. DECISIONES PENDIENTES

- DP-COMP-01: ~~**Editor de planos (OQ-015)**: ¿reutiliza `OperationalMap`/`MapLocation` con modo edición (drag/resize/snap — ADR-006) o exige componentes propios?~~ → **RESUELTA (OQ-015, 2026-09-24)**: editor **fuera de v1** (mapa = vista estática); la decisión de componentes de edición se difiere junto con el editor (v1.1+).
- DP-COMP-02: **Estrategia PDF concreta (OQ-005)**: `PdfExportButton` ¿descarga un blob o abre un visor previo? Impacto: estados y accesibilidad del componente. — 🔶 residual local de presentación (OQ-005/ADR-013 resuelta: HTML→PDF server-side; síncrono-binario vs 202+downloadUrl es decisión de presentación — API.md §13 #2).
- DP-COMP-03: ~~**Valores del enum de severidad de `Alert`** (MASTER-SPEC §4.1 no los define)~~ → **RESUELTA (2026-09-23, ID-007)**: `AlertSeverity` canónico en MASTER-SPEC §4.3 (`LOW | MEDIUM | HIGH | CRITICAL`). Impacto resuelto: tokens de severidad en `DESIGN-SYSTEM.md`.
- DP-COMP-04: ~~**Unidad de capacidad por defecto por tipo de ubicación** (OQ-041)~~ → **RESUELTA (OQ-041 → BR-041, 2026-09-23)**: defaults por tipo (SECTOR → AREA; PLAZOLETA/SCANNER/BALANZA → UNITS; otros → configurable) con override por ubicación; gobernanza ADMIN. Impacto en contrato: unidad inicial del formulario de capacidad según `LocationType`; seeds alineados.
- DP-COMP-05: ~~**Semántica del `percentage` de `CargoLocation`** (OQ-045)~~ → **RESUELTA (OQ-045 → BR-049, 2026-09-24)**: `percentage` es **derivado de UI** (quantity/totalQuantity), informativo; `DistributionPanel` NO lo edita como fuente (solo input cuando la unidad es `PERCENT`, donde es la cantidad misma). Impacto: inputs/outputs de creación/ajuste de segmentos.
- DP-COMP-06: ~~**Sobreocupación administrativa** (BR-036/OQ-043)~~ → **RESUELTA (OQ-043 → BR-036 ampliada, 2026-09-24)**: autorización **solo ADMIN**, límite de % extra **configurable (default +10%)**, observación obligatoria y auditoría; señal visual en `LocationOccupancyCard`/mapa sobre el umbral danger (>90% — OQ-046) con variante excepción. Impacto: variante danger + patrón de `CapacityIndicator`.