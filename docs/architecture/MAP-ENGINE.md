# CargoOps — Motor de Mapa (MAP-ENGINE.md)

> Grupo W2 · Arquitectura · Fuente de verdad: `docs/MASTER-SPEC.md` §3 (layout configurable), §4.1 (Map/MapElement/Location), §6 (BR-020), §11.5 (motor de mapa SVG), §12 (accesibilidad), §13 (colores/leyenda).
> Estado: borrador FASE 0 (documentación). Implementa el ADR-006 (SVG Map Engine) sobre el modelo de `DATABASE.md` §5.3 (maps/map_elements).

## 1. Objetivo

Definir el motor visual del mapa de CargoOps: el modelo de datos del plano (datos estructurados, BR-020), la derivación del objeto `LocationVisual`, la estrategia de render SVG (capas, memoización, presupuestos), las interacciones de operación y edición, la arquitectura de componentes frontend y la preparación para el roadmap (rutas, zonas, puertas, cámaras, sensores, posiciones de camiones). Es la especificación que consumen `frontend/COMPONENTS.md` (OperationalMap, MapLocation, MapToolbar, MapLegend, LocationCard) y `ux/MAP-UX.md` (W6).

## 2. Contexto

El plano del predio logístico/aduanero (Plazoleta, Galpón con Sectores 1–12, áreas especiales Scanner/Balanza/Rezago/Secuestro — MASTER-SPEC §3) NO es una imagen estática: el layout es configurable y editable, cada espacio tiene nombre, código, tipo, posición, tamaño, superficie, capacidad, color, estado y propiedades (MASTER-SPEC §3). BR-020 exige que los planos/coordenadas se guarden como **datos estructurados**, y el ADR-006 decide renderizarlos en **SVG** en el frontend Angular (ADR-002) con datos servidos por la API (`GET /api/v1/maps`, ADR-007). El mapa es pantalla operativa central: estado de ocupación, ubicación de cargas y (en fase 11) editor ADMIN — **sin editor visual en v1** (OQ-015 resuelta: mapa estático; ADMIN edita propiedades por formularios — OQ-028).

## 3. Restricciones

- **SVG + datos estructurados** (ADR-006): el backend persiste `Map`/`MapElement`; el SVG se genera declarativamente en Angular desde esos datos. Sin imágenes estáticas como fuente (BR-020) y sin Canvas/WebGL en v1 (ADR-006 alternativas).
- **Presupuesto de nodos**: v1 opera con ~17 ubicaciones + cientos de cargas (ADR-006 §Rendimiento); el diseño evita renderizar miles de nodos y define el umbral de virtualización si el volumen crece (§5.2).
- **Accesibilidad WCAG 2.2 AA**: el mapa nunca es la única vía de operación; alternativa accesible = listado por ubicación (LocationCard), navegación por teclado, ARIA (MASTER-SPEC §12, COMPONENTS.md §6.6).
- **Leyenda obligatoria** y no depender solo del color: iconos, patrones, labels, estados (MASTER-SPEC §13).
- **Coordenadas relativas al `viewBox`** (no absolutas a píxel): responsive desktop/tablet/móvil sin recalcular datos (ADR-006).
- FASE 0: solo documentación. Los bloques fenced son ilustrativos.

## 4. Dependencias

- `docs/MASTER-SPEC.md` §3, §4.1 (Map/MapElement/Location), §6 BR-020, §11.5, §12, §13.
- `architecture/ADR/ADR-006` (SVG Map Engine), ADR-002 (Angular/Signals), ADR-004 (datos estructurados en PostgreSQL), ADR-007 (API maps), ADR-011 (cargas soft-deleted no se dibujan).
- Hermandos W2: `DATABASE.md` §5.3 (maps/map_elements; D6 unidades pendiente), `ARCHITECTURE.md` §5.8 (interacción mapa/SVG), `PERFORMANCE.md` §5 (presupuestos de render).
- Downstream: `frontend/COMPONENTS.md` §6.6–6.10 (componentes canónicos), `frontend/FRONTEND-ARCHITECTURE.md` (signals/state), `backend/API.md` §7 (Maps), `ux/MAP-UX.md` y `brand/MAP-VISUAL-GUIDELINES.md` (W6/W7).
- `docs/OPEN-QUESTIONS.md`: OQ-015 (editor en v1 — **resuelta**: mapa estático v1), OQ-041 (unidad por defecto por LocationType y % de ocupación mostrado — **resuelta**, BR-041), OQ-042 (camión como Location vs residual en el mapa — **resuelta**, BR-042), OQ-045 (semántica de `percentage` para el display de segmentos — **resuelta**, BR-049), OQ-012 (idioma — **resuelta**: es-AR v1, sin conmutador runtime).

## 5. Decisiones

### 5.1 El mapa como datos: `Map` + `MapElement` → `LocationVisual`

El plano se modela según MASTER-SPEC §4.1 (DATABASE.md §5.3):

- **`Map`**: lienzo con `id, name, code (PREDIO), type, width, height, gridSize, status (DRAFT|ACTIVE|ARCHIVED), version, createdBy, updatedAt`. `version` incrementa con cada edición publicada (API.md §7.3).
- **`MapElement`**: cada pieza del plano — `id, mapId, locationId? (0..1, UNIQUE), elementType, x, y, width, height, rotation, zIndex, fill, stroke, labelPosition, properties JSONB, deletedAt (soft)`.
- **`LocationVisual`** (MASTER-SPEC §11.5): **proyección de render** del `MapElement` (cuando `elementType = LOCATION`) combinada con la `Location` vinculada. El frontend lo construye declarativamente; el backend no almacena una entidad `LocationVisual` separada (el MAP-SPEC §11.5 lo define como objeto del motor; DATABASE.md §5.3 documenta que su `id` = `map_elements.id`).

Mapeo entre el modelo persistido y el visual:

| `LocationVisual` (render) | Fuente de datos | Detalle |
| --- | --- | --- |
| `id` | `MapElement.id` | Identificador del elemento del plano |
| `x, y, width, height, rotation` | `MapElement` | Coordenadas del lienzo (unidades de `Map` — pendiente, §8) |
| `zIndex` | `MapElement.zIndex` | Orden de capas dentro del SVG |
| `fill`, `stroke` | `MapElement` | Colores (o reemplazados por tokens de estado en modo operativo) |
| `labelPosition` | `MapElement.labelPosition` | TOP \| BOTTOM \| LEFT \| RIGHT \| CENTER |
| `properties` | `MapElement.properties` (JSONB) | Propiedades adicionales del elemento (MASTER-SPEC §11.5) |
| (datos de negocio) | `Location` vinculada (`locationId`) | `name`, `code`, `type`, `status`, `capacity`/`capacity_unit`/`occupied_capacity`/`available_capacity` → ocupación, color por estado (BR-033) |
| `elementType` | `MapElement.elementType` | `LOCATION` \| `LABEL` \| `SHAPE` \| `ZONE` (futuro: RUTA, PUERTA, CAMARA, SENSOR, TRUCK_POS — §7) |

Ejemplo ilustrativo del contrato servido (API.md §7.2) - en una pieza `LOCATION` el `zIndex` es 3, la capa de ubicaciones (§5.2, §5.7):

```json
{ "id": "el-uuid", "locationId": "uuid-s4", "elementType": "LOCATION",
  "x": 120, "y": 80, "width": 60, "height": 40, "rotation": 0,
  "zIndex": 3, "fill": "#F59E0B", "stroke": "#0F172A",
  "labelPosition": "TOP" }
```

**Coherencia con el dominio**:
- El vínculo ubicación ↔ plano vive en `MapElement.locationId` (UNIQUE: una ubicación se dibuja una sola vez por plano), no en `Location` (DATABASE.md §5.3).
- **Cargas borradas (soft)** no se dibujan: `CargoStatus.DELETED` queda excluido del overlay de ocupación (ADR-006/011).
- **Ubicaciones INACTIVE/MAINTENANCE**: se renderizan con estado visual propio (patrón + opacidad + ícono; nunca solo color) y **no aceptan cargas** (BR-004; el drag a una inactiva se rechaza en backend).
- **Distribución M:N (BR-032/033, secciones 62-70)**: la relación Cargo↔Location es MANY-TO-MANY vía `cargo_locations` (DATABASE.md §5.3). Una ubicación agrupa N cargas y su ocupación acumulada; una carga se reparte en N ubicaciones con segmentos. El overlay de ocupación consume la agregación documentada en DATABASE.md §5.9 (query-time sobre índice `(location_id, status, quantity_unit)`). Detalle visual en §5.8.

### 5.2 Estrategia de render (SVG, capas, memoización)

- **Layers (capas)**: el SVG se compone por capas con `zIndex` canónico — (1) fondo/grid, (2) zonas y estructura (galpón, plazoleta), (3) ubicaciones (rects con label), (4) overlays de ocupación/estado, (5) selección/hover (feedback), (6) cargas como puntos/íconos cuando aplique. Cada capa es un grupo `<g>` con key estable para no re-renderizar lo que no cambió.
- **SVG declarativo en Angular** con `viewBox` del `Map` (coordenadas relativas, ADR-006); transform con `rotate(rotation, cx, cy)` para elementos rotados.
- **Memoización con Signals/computed** (ADR-002): derivados estables (`locationVisuals`, colores por estado, ocupación agregada) como `computed`; el re-render solo alcanza a los consumidores de la señal que cambió (OnPush + signals; zoneless opcional). Prohibido recrear la colección completa en cada hover/zoom.
- **Interacciones dirigidas**: zoom/pan modifican SOLO el transform del contenedor (no reconstruyen nodos); hover/selección solo actualizan la pieza afectada.
- **No renderizar miles de nodos**: presupuesto v1 = ~17 ubicaciones + cientos de cargas (ADR-006). Estrategia de crecimiento:
  - **Lazy map**: el mapa se carga/instancia solo cuando la feature mapa se navega (lazy loading por ruta, ADR-002/PWA).
  - **Debouncing** de viewport: los cambios de zoom/pan no disparan recálculos costosos en cada frame (requestAnimationFrame + umbral de cambio).
  - **Umbral de virtualización**: si las piezas visuales superan ~500 elementos activos (referencia, a validar con QA), se evalúa virtualización por piezas visibles o tileado de overlays de carga (ADR-006 §Rendimiento). El overlay de cargas (puntos/íconos) es el primer candidato a virtualizar; el layout de ubicaciones NO es candidato (bajo volumen, estático salvo edición).
- **Énfasis de carga**: los overlays de millones de cargas no aplican en v1 (predio único); la ocupación se comunica por ubicación (CapacityIndicator en LocationCard, COMPONENTS.md §6.12) y por conteo/label en el sector.

### 5.3 Interacciones

**Modo operativo (todos los roles con `map.read`)**:
- **Zoom**: botones de `MapToolbar`, rueda del mouse (con `Ctrl`/gesto), `+`/`-` del teclado; límites mín/máx y botón reset view.
- **Pan**: arrastre sobre fondo del mapa (grab), teclado (flechas) y desplazamiento con barras si aplica; móvil: gesto táctil.
- **Selección**: click en una `MapLocation` → panel lateral con `LocationCard` (detalle + cargas presentes); navegación por teclado (tab + enter sobre piezas focusables) con alternativa de listado.
- **Hover**: tooltip con estado/capacidad/ocupación de la ubicación; `focus-visible` análogo para teclado (WCAG 2.2 AA).
- **Sin drag de cargas en v1** (OQ-024 resuelta): el movimiento se hace por formulario/diálogo transaccional con **observación obligatoria** (BR-006/007) — el backend valida siempre (BR-004/005/016); simplifica accesibilidad (WCAG). Alternativa sin drag: selección de carga + acción "mover" con selector de destino (definir en MAP-UX — §8).

**Modo edición (ADMIN, fase 11 — diferido; OQ-015 resuelta: v1 sin editor visual)**:
- **Drag/resize** de elementos (ubicaciones, shapes) con handles; **snap a grid** (`Map.gridSize`); selección múltiple si aporta (MASTER-SPEC §11.5).
- **Edición de propiedades** (color, label, dimensions, `properties`) y alta de nuevos elementos (`elementType`).
- Persistencia: `PATCH /api/v1/maps/:id` con upsert de elementos (API.md §7.3); genera `AuditAction.MAP_EDIT` y `version++`; validación geométrica (superposición) pendiente (API.md §13.4).
- Con OQ-015 resuelta («solo vista en v1»), el motor igualmente implementa las primitivas de edición (ADR-006: el editor es una capa de interacción sobre las mismas primitivas), pero la edición visual NO se expone en v1: ADMIN edita propiedades por formularios (OQ-028).

### 5.4 Arquitectura de componentes frontend

Referencia canónica: `frontend/COMPONENTS.md` §6.6–6.10 (contratos de inputs/outputs y accesibilidad). Responsabilidades:

| Componente | Responsabilidad en el motor |
| --- | --- |
| `OperationalMap` | Contenedor del SVG: recibe `map`, `locations`, `cargosByLocation`; orquesta capas, viewport (zoom/pan), selección y delegación a `MapLocation`; estado `loading/empty/error`; alternativa accesible (listado). |
| `MapLocation` | Una pieza del SVG: `LocationVisual` + `Location` + ocupación; hover/selección/focus; visual de estado (activa/inactiva/mantenimiento, sobre-capacidad — BR-005). |
| `MapToolbar` | Zoom in/out, reset view, toggle leyenda, toggle listado accesible; en móvil drawer inferior (MASTER-SPEC §12); modo edición según OQ-015 (diferido: sin editor visual en v1). |
| `MapLegend` | Leyenda obligatoria (MASTER-SPEC §13): colores/patrones/íconos/estados, nunca solo color. |
| `LocationCard` | Panel lateral al seleccionar una ubicación: nombre, capacidad, ocupación, % ocupado, cargas presentes, alertas y movimientos recientes (§5.8); base de la alternativa accesible del mapa. |

**Flujo de datos** (FRONTEND-ARCHITECTURE.md §5.4): `features/operational-map/` (state con signals) → `GET /api/v1/maps/:id` (layout, datos estructurados) + `GET /api/v1/locations` con `includeCapacity` (ocupación) → derivados `computed` (`locationVisuals`, colores por estado, percent de capacidad) → template SVG. Mutaciones de carga (drag → movimiento) pasan SIEMPRE por el store → HTTP → backend (BR-009; el SVG nunca muta dominio).

**Estado y versionado**: si el plano cambia (`Map.version` mayor que la versión cacheada), el store re-sincroniza y lo comunica (evita operar sobre un layout obsoleto — decisión de UX en MAP-UX).

### 5.5 Preparación para el futuro (MASTER-SPEC §11.5)

Sin implementar en v1, el motor queda preparado para:
- **Rutas/caminos**: `elementType: RUTA` (path en SVG con puntos intermedios en `properties`).
- **Zonas**: `elementType: ZONE` (polígonos de área con semántica propia, p. ej. zonas de espera).
- **Puertas**: `elementType: PUERTA` (vínculo galpón/plazoleta; puede tener estado abierto/cerrado).
- **Cámaras/sensores**: `elementType: CAMARA | SENSOR` (posición + properties con referencia al dispositivo; estado/stream futuro en overlay).
- **Posiciones de camiones**: `elementType: TRUCK_POS` (slot de estacionamiento) o overlay dinámico de camiones sobre la Plazoleta desde `Truck` (no persistido en el plano — dato operativo en vivo).
- **Mapas por zona**: `MapType` futuro `SECTOR`/`GALPON` (DATABASE.md §5.3) para planos de detalle por área; el motor ya no asume un único plano.
- Los nuevos `elementType` no requieren migración del motor de render: se agregan como tipo + plantilla de render propia (switch por tipo), conservando `MapElement` como contenedor (ADR-006 §Consecuencias).

### 5.6 Estructura del SVG y estados del motor

**Template por capas** (ADR-006, §5.2): el componente `OperationalMap` renderiza un `<svg>` con `viewBox = "0 0 {map.width} {map.height}"` y un `<g>` por capa, en orden canónico por `zIndex`:

```html
<!-- Ilustrativo (documentación) — esqueleto declarativo del render SVG -->
<svg [attr.viewBox]="'0 0 ' + map.width + ' ' + map.height" role="group"
     [attr.aria-label]="map.name">
  <g class="layer-grid">        <!-- fondo / gridSize -->
  <g class="layer-structure">   <!-- zonas: galpón, plazoleta, áreas especiales -->
  <g class="layer-locations">   <!-- MapLocation por elemento con elementType=LOCATION -->
  <g class="layer-overlay">     <!-- ocupación / estado / cargas -->
  <g class="layer-selection">   <!-- hover / selección (feedback) -->
</svg>
```

Cada `<g>` es un `computed` propio (signals, ADR-002): si una capa no cambió, Angular no la re-evalúa. Las transformaciones de zoom/pan se aplican en un `<g class="viewport">` contenedor (transform = translate + scale), nunca reconstruyendo los nodos internos (§5.2).

**Estados del motor** (devuelve `OperationalMap`; alineados a los estados de carga del componente, COMPONENTS.md §6.6):
- `loading`: skeleton del mapa (grid + cajas placeholder) mientras `GET /maps/:id` + `GET /locations` responden; no bloquear la navegación (lazy map, §5.2).
- `error`: tarjeta de error con retry (envelope `{ error: { code, message } }`, API.md §3) y navegación a la alternativa de listado.
- `empty`: layout sin ubicaciones (predio sin configurar) con accionable «configurar plano» (ADMIN, vía formularios — OQ-015/028 resueltas) o aviso informativo para los demás roles; el listado alternativo sigue disponible.
- `ready`: mapa operativo con overlays; `Map.version` comunicado para detectar planos obsoletos (§5.4).

**Accesibilidad del SVG** (MASTER-SPEC §12, WCAG 2.2 AA): piezas con `role="button"` y `tabindex` solo cuando son focusables (selección por teclado); `aria-label` por pieza (`"Sector 4 — 3 de 40 unidades"`); los estados nunca dependen solo del color (patrones + íconos + label, §3); la leyenda (`MapLegend`) lista cada estado presente en el plano; los colores son tokens de `brand/DESIGN-TOKENS.md` (contraste AA sobre `surface`).

### 5.7 Coordenadas, grid y unidades

- **Sistema de coordenadas**: el lienzo usa coordenadas relativas al `viewBox` (`0..width × 0..height` del `Map`, ADR-006); las piezas (`x, y, w, h, rotation`) son relativas al plano, no a píxeles de pantalla — el mismo contrato sirve desktop y móvil (rescaling del SVG, §3).
- **Grid**: `Map.gridSize` define la rejilla de alineación del modo edición (snap). En v1 las posiciones vienen del seed de `map_elements` (MASTER-SPEC §5: 17 ubicaciones); el editor (diferido a fase 11 — OQ-015) la usa para snap y para validar que ninguna pieza quede fuera del lienzo.
- **Unidades físicas vs abstractas**: `Map.width/height/gridSize` no tienen unidad comprometida en el modelo de datos — la superficie/medidas reales (m², m) viven en `Location.surface`/`MapElement.properties`. La unidad canónica del lienzo es la DECISIÓN PENDIENTE D6 (DATABASE.md §11): mientras tanto el motor trata las coordenadas como unidades abstractas normalizadas (1 unidad = 1 paso de grid), sin conversión a metros en v1.
- **Superposición de capas**: los elementos con `elementType = ZONE`/`SHAPE` se dibujan bajo las `LOCATION` (zIndex 2 vs 3, §5.2); los `LABEL` flotan sobre la pieza vinculada por proximidad/`properties`, sin lógica de colisión en v1 (validación geométrica pendiente, §9 M3).
- **Rotación**: `rotation` (grados) se aplica con `transform="rotate(rotation, cx, cy)"` sobre el centro del elemento; los `MapLocation` mantienen su hitbox rect sin rotar en v1 (interacción estable por teclado — MASTER-SPEC §12).

### 5.8 Distribución M:N en el mapa (MASTER-SPEC §11.5, secciones 62-70 / §69)

La relación Cargo↔Location es MANY-TO-MANY (`cargo_locations`, BR-032). El motor de render NO cambia su arquitectura (SVG por capas, `LocationVisual`, memización por signals — §5.1/§5.2): lo que cambia es el **contenido del overlay de ocupación** y los datos servidos para la selección. No se introducen nuevas primitivas de dibujo.

**Visualización de una ubicación (N cargas, ocupación acumulada)**:
- Cada `MapLocation` agrega la ocupación de sus segmentos activos: **capacidad** (`capacity`/`capacity_unit`), **ocupada** (`occupied_capacity`, Σ segmentos ACTIVE en unidad compatible — BR-033/035/041), **disponible** (`available_capacity`) y **% ocupado** (sobre la unidad compatible de la ubicación — OQ-041/BR-041).
- El overlay muestra el conteo de cargas y un indicador visual de ocupación (CapacityIndicator / patrón de llenado); el estado de **sobrecapacidad** se marca con patrón + ícono + alerta `CAPACITY` (BR-036, MASTER-SPEC §9; nunca solo color — §3).
- Fuente de datos: `GET /api/v1/locations` con agregación de ocupación y `GET /api/v1/locations/:id/cargos` para el detalle (MASTER-SPEC §10; agregación en DATABASE.md §5.9).

**Visualización de una carga (N ubicaciones, segmentos)**:
- Una carga con varios segmentos se representa mediante el `DistributionPanel` (COMPONENTS.md): lista de sus ubicaciones con **cantidad, unidad, % y estado** por segmento (BR-040), más el residual en camión si aplica (`totalQuantity − Σ ACTIVE`, BR-038).
- El mapa no duplica la distribución como geometría: los segmentos se muestran sobre la pieza de la ubicación correspondiente (tooltip/panel), sin crear shapes por segmento en v1 (volumen bajo; se virtualiza el overlay si el umbral se supera — §5.2).

**Comportamiento de selección (MASTER-SPEC §11.5)**:
- Seleccionar una **ubicación** (click o teclado en la `MapLocation`) → `LocationCard` con: nombre, capacidad, ocupación, % ocupado, cargas presentes (con su cantidad/segmento), alertas activas y movimientos recientes de la ubicación.
- Seleccionar una **carga** (desde el listado accesible, el panel o un punto del overlay si se dibuja) → `DistributionPanel`: todas sus ubicaciones, distribución (cantidades/porcentajes), estado, y movimientos recientes.
- Ambas vistas degradan al listado accesible (WCAG 2.2 AA — §5.6); la selección no muta dominio (BR-009), solo consulta.

**OQ-042 resuelta (BR-042)**: el camión NO es una Location; el "en camión" (residual, BR-038) no se dibuja como pieza del plano (se muestra en el `DistributionPanel` como fila derivada). El % de ocupación y su label dependen de la unidad compatible de la ubicación (BR-041, OQ-041).

## 6. Criterios de aceptación

- [ ] El plano se sirve como datos estructurados (`Map` + `MapElement`), nunca como imagen (BR-020); `LocationVisual` se deriva en el frontend sin duplicar persistencia.
- [ ] El render SVG respeta el presupuesto v1 (~17 ubicaciones + cientos de cargas) con capas, memoización por signals y lazy map (ADR-006, PERFORMANCE.md §5).
- [ ] Interacciones de operación (zoom, pan, selección, hover) funcionan por teclado y mouse; el mapa tiene alternativa accesible en listado (WCAG 2.2 AA, COMPONENTS.md CA-4).
- [ ] La leyenda es obligatoria y ningún estado depende solo del color (MASTER-SPEC §13).
- [ ] El drag de cargas (si se adopta) dispara el flujo de movimiento con observación obligatoria y el backend valida siempre (BR-006/007/009).
- [ ] El editor ADMIN (fase 11, OQ-015 resuelta: editor diferido) persiste vía `PATCH /maps/:id` con `MAP_EDIT` + `version++` y reutiliza las primitivas del motor; en v1 ADMIN edita propiedades por formularios (OQ-028).
- [ ] El render tolera piezas fuera de `viewBox` (recorte sin romper el SVG) mientras la validación geométrica estricta siga pendiente (M3/M7).
- [ ] Las coordenadas del lienzo se tratan como unidades abstractas normalizadas mientras D6 (DATABASE.md §11) no defina la unidad canónica (§5.7).
- [ ] Los pendientes M1–M10 tienen pregunta concreta, impacto y referencia; los resueltos (M1/M3/M6/M9/M10) quedan registrados con su resolución en §9; ninguno introduce reglas de dibujo nuevas fuera de MASTER-SPEC §11.5.
- [ ] No se inventaron reglas; los pendientes están en §8 referenciados a OPEN-QUESTIONS.

## 7. Archivos involucrados

- `docs/MASTER-SPEC.md` §3, §4.1, §6 BR-020, §11.5, §12, §13 · `docs/OPEN-QUESTIONS.md` (OQ-015, OQ-041, OQ-042, OQ-045 — todas **resueltas** en v0.5)
- `architecture/ADR/ADR-006` (SVG Map Engine), ADR-002 (Angular/Signals), ADR-004 (estructura de datos)
- Hermandos W2: `DATABASE.md` §5.3 (maps/map_elements, D6), `ARCHITECTURE.md` §5.8, `PERFORMANCE.md` §5
- Downstream: `frontend/COMPONENTS.md` §6.6–6.10, `frontend/FRONTEND-ARCHITECTURE.md`, `backend/API.md` §7, `ux/MAP-UX.md`, `brand/MAP-VISUAL-GUIDELINES.md`, `roadmap/PHASES.md` (fase 6 mapa, fase 11 editor)
- Verificación: `qa/ACCEPTANCE-CRITERIA.md` (AC de mapa 2D y accesibilidad) y `qa/TEST-CASES.md` (render SVG, interacciones)

## 8. Riesgos

| Riesgo | Mitigación |
| --- | --- |
| El motor SVG propio se vuelve complejo de mantener | Componentes canónicos + capas de render bien acotadas; editor reutiliza primitivas (ADR-006) |
| Performance degradada por re-render global en interacciones | Signals/computed + OnPush + transform dirigido en zoom/pan + virtualización de overlays sobre umbral |
| Accesibilidad insuficiente del SVG | Alternativa en listado obligatoria (LocationCard), teclado, ARIA; criterios en QA (MASTER-SPEC §12/§14) |
| Drag de cargas genera movimientos inválidos | El backend revalida BR-004/005/016; el drag es solo UX; confirmar interacción con MAP-UX (pendiente) |
| Unidades del lienzo (`width/height/gridSize`) sin definir | DECISIÓN PENDIENTE D6 (DATABASE.md) — no bloquea el modelo de datos |
| Elementos futuros (cámaras/sensores) tensionan el render | `elementType` extensible + plantilla por tipo; sin cambios de esquema |
| Coordenadas inconsistentes entre edición y render (labels fuera del lienzo) | Snap a grid (§5.7) + validación geométrica pendiente (M3) + render tolerante (pieza fuera de viewBox se recorta, no rompe el SVG) |
| Ocupación M:N mal presentada (unidades incompatibles sumadas, segmentos EXITED contados como activos) | Agregación por índice `(location_id, status, quantity_unit)` (DATABASE.md §5.9) + BR-035 + BR-041/BR-048 (OQ-041/044 resueltas); display del % por OQ-045 (BR-049) |
| Carga con N ubicaciones: distribución confusa o desactualizada en el panel | `DistributionPanel` derivado de `GET /cargos/:id/locations` (misma fuente que el detalle); reselección/refresh sobre el estado del store (FRONTEND-ARCHITECTURE.md §5.7) |

## 9. DECISIÓN PENDIENTE (reportar al orquestador)

Las preguntas con OQ asignada quedaron **resueltas en MASTER-SPEC v0.5 (2026-09-24)**; M2/M4/M5/M7/M8 no tienen OQ asignada y se conservan como residuales locales:

| # | Pregunta concreta | Impacto | Resolución |
| --- | --- | --- | --- |
| M1 | ~~¿Editor de planos en v1 (fase 11) o vista estática hasta entonces? Si estática, ¿el drag de cargas existe o la operación usa selector de destino?~~ | Alcance del editor, interacciones del motor | ✅ **RESUELTA (OQ-015/OQ-024)** — mapa **estático** en v1 (lectura + selección + hover); editor visual diferido a fase 11; sin drag: movimiento por formulario/diálogo transaccional |
| M2 | Unidades de `Map.width/height/gridSize` (unidades abstractas normalizadas recomendadas vs metros reales del predio) | Render, snap, proporciones reales | 🔶 Pendiente local — D6 (DATABASE.md §11), sin OQ asignada; el motor trata coordenadas como unidades abstractas normalizadas (§5.7) |
| M3 | ~~Validación geométrica en el editor (superposición de elementos, elementos fuera del lienzo): ¿se valida en backend en v1?~~ | `PATCH /maps/:id` (409 MAP_ELEMENT_CONFLICT) | ✅ **RESUELTA (OQ-015)** — sin editor visual en v1 no hay alta de elementos por UI; la validación geométrica se difiere junto con el editor (fase 11). Se mantiene el render tolerante (M7) |
| M4 | ¿Qué se considera «estructura crítica del plano» que Operator no puede editar (BR-011)? ¿Todo el plano es ADMIN o hay edición parcial no crítica? | Matriz `map.edit` | 🔶 Pendiente local — sin OQ asignada; el mapa es estático en v1 (OQ-015), la matriz se resuelve con el editor (AUTHORIZATION.md §9 A4) |
| M5 | Umbral de virtualización de overlays de carga (referencia ~500 piezas activas): ¿se valida con datos reales antes de fijarlo? | Performance de render | 🔶 Pendiente local — sin OQ asignada; se confirma con señal medida (PERFORMANCE.md §9 P4) |
| M6 | ~~¿El drag de cargas es interacción v1 o solo selección + diálogo de movimiento? (UX de MAP-UX confirma)~~ | Contrato de interacción del mapa | ✅ **RESUELTA (OQ-024)** — **NO hay drag en v1**: selección + diálogo de movimiento transaccional con observación obligatoria (BR-006/007) |
| M7 | ¿El render tolerante ante piezas fuera de viewBox (recortar, no romper) se confirma como comportamiento v1, o se exige validación estricta en edición? | Robustez del render vs validación | 🔶 Pendiente local — sin OQ asignada; coherencia con §8/API.md §13.4 |
| M8 | ¿El `LABEL` flotante (sin lógica de colisión en v1) se acepta como limitación, o el editor reserva espacios mínimos entre piezas? | Layout y legibilidad de labels | 🔶 Pendiente local — sin OQ asignada; MASTER-SPEC §11.5, §5.7 |
| M9 | ~~Distribución M:N: ¿el camión se modela como Location (se dibuja como pieza con segmentos, ej. "Camión → 40%") o el "en camión" es un residual derivado sin representación en el plano (§67, BR-038)?~~ | Overlay de camiones/TRUCK_POS y panel de distribución | ✅ **RESUELTA (OQ-042 → BR-042)** — el camión **NO es Location**; "en camión" = `totalQuantity − Σ CargoLocation activos` (unidades compatibles) con `Cargo.truckId` como vínculo, sin pieza en el plano (fila derivada en el `DistributionPanel`) |
| M10 | ~~Distribución M:N: ¿qué unidad y % se muestran por ubicación, dado que la agregación es en unidad compatible (BR-035)? ¿`percentage` de CargoLocation se muestra como almacenado o derivado?~~ | Labels de ocupación y `DistributionPanel` | ✅ **RESUELTA (OQ-041/OQ-045 → BR-041/BR-049)** — % sobre la unidad compatible de la ubicación (defaults por LocationType, BR-041); `percentage` se muestra **derivado** salvo unidad PERCENT (BR-049) |