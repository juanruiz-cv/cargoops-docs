# CargoOps — UX del Mapa Operativo y del Editor de Planos (MAP-UX)

## Objetivo
Especificar la experiencia de usuario del **mapa operativo** (visualización y operación de cargas sobre el plano del predio) y del **editor de planos** (creación y modificación del layout). Define la metáfora visual del predio, la jerarquía visual, la leyenda, los estados de carga/ubicación en el mapa (sin depender solo del color), las interacciones (hover, click, drag, resize, zoom, pan, snap, grid, selección), el panel derecho con buscador/filtros/lista y resaltado cruzado, la estrategia de densidad para muchas cargas, la alternativa accesible (WCAG 2.2 AA) y la separación **modo visualización vs modo editor**. Es el documento QUÉ/UX del mapa; el CÓMO técnico queda en `architecture/MAP-ENGINE.md` (W2) y el CÓMO visual en `brand/MAP-VISUAL-GUIDELINES.md` (W7).

## Contexto
CargoOps opera sobre un predio logístico/aduanero con: **Plazoleta** (zona gris, izquierda; carga permanece en el camión), **Galpón/Depósito** (zona amarilla, derecha; contiene los **Sectores 1–12**) y **áreas especiales** (Scanner, Balanza, Rezago, Secuestro) dentro o adyacentes al layout (MASTER-SPEC §3). El plano NO es una imagen estática: es **configurable y editable**, cada espacio tiene nombre, código, tipo, posición, ancho, alto, superficie, capacidad, unidad, color, estado y propiedades (MASTER-SPEC §3, BR-020). El mapa es un componente operativo central: muestra ocupación y estado, permite localizar y mover cargas visualmente, y es administrable por ADMIN (editor, roadmap fase 11). Fuentes canónicas: MASTER-SPEC §3 / §4.1 (`Map`, `MapElement`, `Location`, `LocationVisual`) / §5 (17 ubicaciones) / §6 (BR) / §7 (máquina de estados) / §8 (RBAC) / §11.5 (motor SVG) / §12 (accesibilidad) / §13 (no color solo), ADR-006 (SVG Map Engine) y ARCHITECTURE §5.8 (interacción mapa/SVG). La referencia visual del predio no está en el workspace: la descripción textual es la fuente (MASTER-SPEC §3).

## Restricciones
- No se definen reglas de negocio nuevas; toda ambigüedad real → `DECISIÓN PENDIENTE` (centralizada en `OPEN-QUESTIONS.md`).
- El frontend NUNCA es la capa de autorización (BR-009): las interacciones se habilitan por rol solo como UX; el backend valida (BR-004, BR-005, BR-006/007, BR-016).
- Estado (CargoStatus) y ubicación son independientes (MASTER-SPEC §4.4.2): el mapa muestra ambos, nunca los fusiona.
- Todo movimiento iniciado desde el mapa exige **observación obligatoria** (BR-006/007) y genera historial (BR-008, estado transitorio `IN_TRANSIT`, D-UF-05).
- **Distribución M:N** (BR-032…BR-042, MASTER-SPEC v0.3 §11.5/§69): una ubicación muestra N cargas y su ocupación acumulada; una carga con N ubicaciones se visualiza con sus segmentos/porcentajes. Zoom/pan/selección existentes se mantienen; el drag & drop **no se implementa en v1** (OQ-024 resuelta: movimiento por formulario/diálogo — DP-MX-03) y su mecánica no se modifica.
- El mapa **nunca es la única vía de operación**: la alternativa accesible (listado por ubicación) es obligatoria y equivalente (MASTER-SPEC §12, ADR-006).
- Ningún estado se comunica solo con color (WCAG 1.4.1, MASTER-SPEC §13): siempre ícono/patrón + label/texto, leyenda obligatoria.
- Movimientos críticos NO offline en v1 (MASTER-SPEC §12); el mapa opera con datos frescos de API.
- Filenames en inglés; contenido en español profesional/neutral.

## Dependencias
- `docs/MASTER-SPEC.md` — §3 (layout), §4.1 (Map/MapElement/Location), §5 (17 ubicaciones seed), §6 (BR-004..009, BR-020), §7 (CargoStatus máquina), §8 (RBAC), §11.5 (motor SVG), §12 (accesibilidad), §13 (leyenda/colores).
- `docs/OPEN-QUESTIONS.md` — OQ-009, OQ-014, OQ-015 y OQ-041…OQ-047, **todas resueltas 2026-09-23/24** (unidad por defecto por LocationType y residual "en camión" → BR-041/042; sobreocupación → BR-036 ampliada; conversión → BR-048; percentage → BR-049; umbrales visuales → <70/70–90/>90; drag & drop: NO en v1; editor: fuera de v1).
- `docs/architecture/ADR/ADR-006-SVG-Map-Engine.md` — motor SVG, rendimiento por capas v1, accesibilidad obligatoria.
- `docs/architecture/ARCHITECTURE.md` §5.8 — render por capas, memoización, virtualización de overlays de carga, lazy map.
- `docs/ux/USER-FLOWS.md` — flujos 3/5/6/7 (ingreso/descarga/mover/scanner/balanza), 8 (alerta en mapa), 9/10 (rezago/secuestro), 14 (editar plano) · `docs/ux/SCREENS.md` §7 (Mapa Operativo) y §8 (Planos).
- `docs/frontend/COMPONENTS.md` — `OperationalMap`, `MapLocation`, `MapToolbar`, `MapLegend`, `LocationCard`, `CapacityIndicator` (§6.6–6.10).
- `docs/brand/DESIGN-TOKENS.md` §11 — namespace `--map-*` (fills, strokes, patrones, umbral de zoom de labels).
- Futuros (W2/W4/W5/W7): `architecture/MAP-ENGINE.md`, `architecture/PERFORMANCE.md`, `frontend/DESIGN-SYSTEM.md`, `frontend/ACCESSIBILITY.md`, `frontend/ROUTING.md`, `backend/API.md`, `brand/MAP-VISUAL-GUIDELINES.md`, `qa/TEST-CASES.md`.

---

## 1. Metáfora visual del layout (MASTER-SPEC §3)

El predio se representa como un **plano de planta (floor plan)** en coordenadas cartesianas relativas al `viewBox` del SVG (ADR-006), leído como un flujo operativo de izquierda a derecha: **entrada/operación con camiones (izquierda) → almacenamiento (derecha) → áreas de control/retención** (adyacentes o integradas).

| Zona | Ubicación en canvas | Token (`DESIGN-TOKENS.md` §11) | Rol en la metáfora |
| --- | --- | --- | --- |
| PLAZOLETA | Izquierda, zona gris | `--map-zone-plazoleta-fill` `#E2E8F0` | Ingreso: cargas `IN_TRUCK` sobre camiones |
| GALPÓN / DEPÓSITO | Derecha, zona amarilla | `--map-zone-galpon-fill` `#FEF3C7` | Almacenamiento: contiene los Sectores 1–12 |
| Sectores 1–12 | Dentro del galpón (grid de celdas) | `--map-sector-*-fill` (disponible/parcial/lleno) | Unidad de almacenamiento con capacidad propia |
| Scanner | Área especial (azul) | `--map-scanner-fill` `#E0F2FE` | Control documental (`IN_REVIEW`) |
| Balanza | Área especial (teal) | `--map-balance-fill` `#CCFBF1` | Pesaje (`IN_REVIEW`) |
| Rezago | Área especial (naranja) | `--map-rezago-fill` `#FFEDD5` | Permanencia excesiva / revisión (`REZAGO`) |
| Secuestro | Área especial (rojo) | `--map-secuestro-fill` `#FEE2E2` | Retención legal/administrativa (`SECUESTRO`) |

Reglas de la metáfora:
- La posición y el tamaño de cada zona NO son fijos en código: los define el editor (BR-020) y se persisten como datos estructurados (`x, y, width, height, rotation, zIndex` — MASTER-SPEC §4.1/§11.5). Los colores de zona sí están tokenizados.
- El canvas parte de las **17 ubicaciones seed** (Plazoleta, Sectores 1–12, Scanner, Balanza, Rezago, Secuestro; MASTER-SPEC §5) como layout por defecto, editable por ADMIN.
- Los labels usan **nombre real** ("Sector 4", "Plazoleta"), nunca coordenadas; la posición del label dentro de la ubicación la define `labelPosition` (MASTER-SPEC §11.5).
- El diseño debe permitir reconocer el predio "de un vistazo" incluso al 60 % del tamaño de pantalla, y desglosarlo progresivamente con el zoom (ver §5 Densidad).

## 2. Jerarquía visual y leyenda

Orden de capas de render (de atrás hacia adelante; coherente con `zIndex` de MapElement y ADR-006):

1. **Fondo del predio** — rectángulo base del `viewBox`; grid opcional solo en modo editor.
2. **Zonas** — Plazoleta y Galpón: fills de zona de alto contraste entre sí (gris vs amarillo) que fijan la lectura del plano sin necesidad de leer labels.
3. **Ubicaciones** — sectores y áreas especiales: fill por estado de ocupación + patrón de textura (no solo color, WCAG 1.4.1).
4. **Labels de ubicación** — código/nombre en `labelPosition`, mínimo `--map-label-visible-min` (12px) en pantalla.
5. **Marcadores de carga** — ícono + código; contraste AA verificado contra el fill de zona (`--map-cargo-default` 4.64:1 vs galpón, DESIGN-TOKENS §11).
6. **Overlays operativos** — anillo de selección, anillo de alerta, marcador en tránsito, tooltip; siempre por encima de todo lo demás.

Principio: **el color estructura, el texto informa, el patrón confirma**. Toda diferencia de estado expresada con color se refuerza con ícono/patrón y label textual.

**Leyenda** (componente `MapLegend`, obligatoria — MASTER-SPEC §13):
- Contenido: significado de colores de zona y de ocupación, patrones (hatch parcial/lleno), íconos de áreas especiales y de estados de carga (alerta, tránsito, rezago, secuestro), estado de ubicación (activa/inactiva/mantenimiento), **% de segmento de carga (distribución M:N, §3.3)** e insignia de alerta de capacidad.
- Interacción: toggle desde `MapToolbar`; por defecto visible en desktop, colapsable en tablet/móvil; al cerrarse, un botón "Leyenda" con `aria-expanded` mantiene el acceso.
- La leyenda es estática respecto del layout vigente y **dinámica** respecto de los estados presentes: si ningún sector está "lleno", el ítem se muestra igualmente (consistencia de aprendizaje), nunca se oculta.
- Contraste: los ítems de la leyenda cumplen contraste AA de texto (referencia: pares verificados en DESIGN-TOKENS §11, `--map-zone-plazoleta-text` 8.40:1, `--map-zone-galpon-text` 6.36:1).

## 3. Estados en el mapa (ubicaciones y cargas)

### 3.1 Estados de ubicación (ocupación y disponibilidad)

| Estado de ubicación | Relleno | Patrón | Borde | Label | Semántica no visual (ARIA) |
| --- | --- | --- | --- | --- | --- |
| Disponible | `--map-sector-available-fill` (blanco) | — | `--map-sector-available-stroke` | "Sector N — 3 de 10" | "Disponible: 3 de 10 unidades" |
| Parcial (1–99 %) | `--map-sector-partial-fill` | `--map-pattern-hatch-light` (trama leve) | `--map-sector-partial-stroke` | "Sector N — 7 de 10" | "Ocupación parcial: 7 de 10" |
| Lleno (≥ 100 %) | `--map-sector-full-fill` | `--map-pattern-hatch` (trama densa 45°) | `--map-sector-full-stroke` | "Sector N — 10 de 10" | "Lleno: 10 de 10" |
| Inactiva (`ACTIVE=false`) | gris neutro | — | borde discontinuo | nombre + "inactiva" | "Ubicación inactiva — no admite movimientos" (BR-004) |
| Mantenimiento (`MAINTENANCE`) | gris con franjas diagonales | patrón propio | borde grueso | nombre + "mantenimiento" | "Ubicación en mantenimiento" |
| Seleccionada (en foco) | conserva su fill | conserva su patrón | anillo `--map-cargo-selected-ring` (2px, offset 2px) + `zIndex` elevado | como siempre | "Seleccionada" |

Notas:
- Los umbrales de ocupación se definen en DP-MX-06/DP-TK-03 (OQ-046); la unidad de cálculo es la **unidad efectiva** de la ubicación (por defecto del tipo o override — BR-041).
- Una ubicación **llena** sigue siendo visible y consultable, pero: se excluye como destino de movimiento en la UI del flujo 5 (con explicación "Sector 4: 10/10 — sin disponibilidad") y el backend la rechaza igualmente (BR-005). Ningún mecanismo de UI habilita exceder capacidad.
- Las ubicaciones inactivas/mantenimiento se dibujan (legibilidad del plano) pero NO son interactuables como destino (BR-004) y se omiten del selector de destinos.

### 3.2 Estados de carga en el mapa

| Estado visual de la carga | Condición (CargoStatus / Alert) | Representación | Refuerzo no visual |
| --- | --- | --- | --- |
| Normal | `IN_TRUCK` / `STORED` / `PARTIALLY_UNLOADED` / `IN_REVIEW` sin alerta | Marcador `--map-cargo-default` + código de carga | `aria-label` "carga CÓDIGO en SECTOR — estado STORED" |
| **Alerta** | Alerta `STALE_30D` (u otra) `OPEN` | Anillo/ícono `--map-cargo-alert-ring` rojo + ícono ⚠ + código | `aria-label` incluye "alerta abierta"; mismo marco en el flujo 8 (USER-FLOWS) |
| **Seleccionada** | Selección de usuario (click/tablero teclado) | Anillo `--map-cargo-selected-ring` ámbar + `zIndex` elevado | `aria-selected` en el elemento del SVG |
| **En movimiento** | `IN_TRANSIT` transitorio (D-UF-05) | Marcador con borde discontinuo `--map-cargo-transit-stroke` + animación lenta de pulso; origen y destino resaltados durante la transición | `aria-label` "en tránsito desde … hacia …"; estado efímero, desaparece al aterrizar (BR-008) |
| Rezago | `REZAGO` | Ícono de reloj/exclamación + label "REZAGO" sobre el marcador | texto explícito, nunca solo naranja |
| Secuestro | `SECUESTRO` | Ícono de candado + label "SECUESTRO" | texto explícito |
| Exited / Deleted | `EXITED` / `DELETED` | **No se dibujan** en el mapa (ADR-011); solo visibles en listados/historial | — |

Reglas transversales:
- Una carga puede tener simultáneamente estado de alerta y estar seleccionada: ambos anillos coexisten (alerta rojo, selección ámbar) con `zIndex` de selección por encima.
- `REGISTERED` (sin ubicación) NO aparece en el mapa: aparece únicamente en el panel/listado con la indicación "sin ubicación" y CTA de ingreso (flujo 3). Este vacío es intencional y se explica en la UI.
- En la Plazoleta los marcadores son las cargas `IN_TRUCK`; **no existe un nodo "camión"** en el mapa: el camión no es una ubicación (BR-042).
- El badge de estado textual (`CargoStatusBadge`) acompaña a la carga en el panel derecho y en el tooltip del mapa; el mapa no es lugar para el texto largo del estado, sí para su síntesis (ícono + código + señal de alerta).

### 3.3 Distribución M:N en el mapa (§69, BR-032…BR-042)

Con la ampliación §§62-70, la relación Cargo↔Location es MANY-TO-MANY vía `CargoLocation` (BR-032/033): el mapa expresa **segmentos**, no "la ubicación de la carga".

- **Una ubicación contiene N cargas**: su ocupación es la suma de los segmentos activos en unidad compatible (BR-033/035); el fill/patrón de §3.1 expresa el % de capacidad ocupado (BR-005); el contador/`LocationCard` lista las cargas con el % de cada segmento.
- **Una carga con N ubicaciones**: al seleccionarla (y con marcadores visibles desde zoom ≥ 1.0x, §5), cada ubicación que la contiene muestra el % de su segmento junto al código (p. ej. "029TERRA26 · 36 %") y, en tooltip, cantidad/unidad y estado del segmento (ACTIVE/EXITED). El mapa NO duplica la carga: cada ubicación dibuja solo su propio segmento (D-MX-08).
- **Alerta de capacidad**: la ubicación con alerta `CAPACITY` `OPEN` (umbral configurable, MASTER-SPEC §9; flujo 21) muestra una insignia sobre el fill de ocupación; la sobreocupación administrativa (BR-036 ampliada — OQ-043 resuelta) se representa según DP-MX-12 (cerrada): fill > 100 + hatch + badge.
- **Residual en camión** (§67): OQ-042 RESUELTA → BR-042: el camión NO es una ubicación; el residual (`inTruckAmount`/`inTruckUnit`, derivado por el backend: `totalQuantity − Σ CargoLocation activos`) solo figura como fila informativa en el detalle/distribución (flujo 16/19), **nunca como marcador en el plano**.
- **Leyenda obligatoria**: documenta el % de segmento, la insignia de alerta de capacidad y la sobreocupación (si aplica) — nunca solo color (DP-MX-12).
- La alternativa accesible (listado por ubicación, §6) replica la información de segmentos 1:1; la mecánica de zoom/pan/selección no cambia (OQ-024 → DP-MX-03 resuelta: sin drag & drop en v1).

## 4. Interacciones del mapa operativo (modo visualización)

Layout base (65–70 % mapa / 30–35 % panel derecho; referencia SCREENS §7):

```
┌──────────────────────────────────────────────┬───────────────────────┐
│  MAPA (SVG)                [Zoom][Pan][⟳]    │  PANEL (30–35 %)      │
│  ┌────────────────────────────────────────┐  │  [Buscar carga…]      │
│  │  PLAZOLETA (gris)                      │  │  [Estado ▾][Ubic ▾]  │
│  │  ┌──────────────┐  ┌────────────────┐  │  │  Lista por ubicación │
│  │  │  🚚 036TERRA26│  │  GALPÓN        │  │  │  ▶ Plazoleta        │
│  │  │  🚚 055TERRA26│  │  S1 S2 S3 S4   │  │  │    ▸ 036TERRA26     │
│  │  └──────────────┘  │  S5 …  S12      │  │  │      · 2d · 🚚      │
│  │  [Leyenda ▸]       │  Sc Bal Rez Sec │  │  │  ▶ Sector 4 (8/10)  │
│  └────────────────────────────────────────┘  │    ▸ 029TERRA26 ⚠    │
│                                              │    ▸ 032TERRA26      │
│                                              │  [ N cargas ]        │
└──────────────────────────────────────────────┴───────────────────────┘
```

### 4.1 Tabla de interacciones por dispositivo

| Interacción | Desktop / Notebook | Tablet | Móvil (drawer inferior, MASTER-SPEC §12) | Teclado |
| --- | --- | --- | --- | --- |
| Hover sobre ubicación/carga | Tooltip (nombre real, capacidad/ocupación/%, cargas resumidas con % de segmento y alertas; si la carga tiene N ubicaciones, síntesis de sus segmentos) + resaltado de borde | equivalente (touch: tap sostenido abre tooltip) | — (no hay hover) | focus = hover (mismo efecto visual) |
| Click en ubicación | Selecciona ubicación → `LocationCard` (§69): nombre, código, tipo, capacidad (ocupada/disponible/%, en la **unidad efectiva** — BR-041), cargas contenidas con % de segmento, alertas (cargas con alerta y próximas a 30 días) y movimientos recientes; enlace "Ver detalle" → pantalla 14 (SCREENS) | igual | igual (drawer) | Enter con la ubicación enfocada |
| Click en carga | Selecciona carga → tarjeta (§69): todas sus ubicaciones, distribución por segmento (%/cantidad, en la unidad efectiva de cada ubicación — BR-041), estado, alertas y movimientos recientes; deep-link al detalle | igual | igual | Enter |
| Click en lista (panel) | Selecciona y resalta en mapa (cross-highlight) | igual | igual | Enter |
| Drag de carga a sector | Flujo de movimiento, si se confirma en v1 (DP-SC-06) | igual | no (usar selector) | no aplica |
| Zoom | Rueda del mouse sobre canvas; botones `MapToolbar` (+/−); doble click centra y acerca | Pinch (2 dedos) + botones | Pinch + botones + "expandir mapa" | Ctrl++ / Ctrl+- / 0 (reset) |
| Pan | Arrastre con cursor tipo mano; barras de desplazamiento si aplica | Arrastre 1 dedo | Arrastre 1 dedo (dentro del mapa a pantalla completa) | Flechas con pan activado |
| Reset view | Botón ⟳ (vuelve a zoom 1x, centra predio) | igual | igual | 0 (cero) |
| Leyenda toggle | Botón "Leyenda" | igual | igual | L (con foco en toolbar) |
| Listado accesible | Toggle desde `MapToolbar` (muestra/oculta panel como lista) | igual | igual | A |

Reglas:
- Zoom permitido: rango 0.4x–3.0x (propuesta, validar con PERFORMANCE.md → DP-MX-01); reset en 1x. El zoom nunca esconde la leyenda ni el acceso al panel.
- **Redundancia de gestos**: toda interacción por gesto (pinch, drag, rueda) tiene equivalente por botón/teclado (WCAG 2.5.1/2.1.1).
- **Hover en el mapa → reflejo en lista**: al hover/focus sobre una ubicación, el grupo de esa ubicación en el panel derecho se resalta (borde + fondo); la lista hace scroll suave si está fuera de vista. La lista en hover es una operación de solo lectura (nunca dispara movimientos).
- **Selección desde el mapa → panel**: al seleccionar una ubicación en el canvas, el panel muestra su `LocationCard` (ocupación `CapacityIndicator` en la unidad efectiva de la ubicación — BR-041 — + cargas con % de segmento + alertas/próximas a 30 días + movimientos recientes — §69) y la fila queda resaltada; al seleccionar una carga, el panel muestra su distribución completa (ubicaciones, cantidades/%, estado, movimientos) con acciones de los flujos 16/18/19/20.

### 4.2 Movimiento de carga iniciado desde el mapa

El mapa es el atajo preferido para los flujos 3/5/6/7 (D-UF-03). Independientemente del gesto (**sin drag en v1** — OQ-024 resuelta; solo "Mover a…" desde la tarjeta), el circuito es el mismo:
1. Origen: la carga seleccionada; destino: ubicación activa con disponibilidad (BR-004/005).
2. **Siempre se abre `ObservationDialog` antes de confirmar** (BR-006/007); el botón de confirmar queda deshabilitado con texto vacío. El drag NO confirma por sí solo: termina en un "soltar = proponer", nunca en movimiento efectivo.
3. Confirmado → la carga entra en `IN_TRANSIT` (D-UF-05): marcador discontinuo animado origen→destino hasta el aterrizaje; luego el destino actualiza ocupación.
4. Si el backend rechaza (capacidad, ubicación inactiva, transición inválida BR-016), el mapa **revierte la propuesta visual** y muestra el mensaje del envelope `{ error }` con el contexto de la ubicación ("Sector 4: 10/10").
5. La animación de tránsito es funcional, breve y desactivable por preferencia de accesibilidad (movimiento reducido: `prefers-reduced-motion`); en ese caso se muestra solo el badge estático "en tránsito" → DP-MX-07.

### 4.3 Estados de pantalla del mapa

- `loading`: skeleton del canvas + panel (las ubicaciones se dibujan al llegar los datos estructurados de `GET /api/v1/maps` + locations).
- `empty`: predio sin cargas → mapa limpio con las 17 ubicaciones y mensaje "Predio sin cargas" + CTA "Registrar carga" (según rol).
- `error` (mapa o locations fallaron): mensaje con `requestId` + retry; el panel derecho sigue operativo si la lista pudo cargarse.
- `normal`: mapa + panel sincronizados; selección y hover siempre visibles.
- Condición crítica: **sin datos estructurados no hay mapa** — nunca se muestra una imagen estática como fallback (BR-020).

## 5. Densidad: cómo mostrar muchas cargas sin caos (alineado a PERFORMANCE.md, W2)

Presupuesto v1 (ADR-006, ARCHITECTURE §5.8): ~17 ubicaciones y **cientos de cargas**; el SVG los soporta con capas y memoización sin virtualización prematura. Si la operación real supera ese presupuesto (miles), se evalúa tileado/virtualización de overlays; los límites y KPIs los fija `architecture/PERFORMANCE.md` (W2) → DP-MX-02.

Estrategia de densidad de UI (clustering natural y thresholds de zoom):

| Nivel de zoom | Qué se dibuja | Qué se oculta | Notas |
| --- | --- | --- | --- |
| < 0.75x (vista general) | Zonas, ubicaciones, **contadores agregados por ubicación** ("12" en Sector 4) | Marcadores individuales, códigos | El clustering es **por ubicación**: la ubicación Ya es el agrupador natural del dominio; no hay agrupación geográfica arbitraria. |
| 0.75x – 1.0x | Ubicaciones con contador + fill de ocupación | Códigos de carga | Los contadores muestran "N cargas · X/Y capacidad" en tooltip. |
| ≥ 1.0x | **Marcadores individuales + códigos** (umbral `--map-cargo-label-zoom` = 1.0) | Contadores (se resuelven en marcadores) | El usuario decide a qué nivel opera; el zoom mínimo para operar individualmente es 1.0x. |
| ≥ 1.5x (acercamiento fino) | Marcador + tooltip con detalle (estado, permanencia, alerta; si la carga tiene N segmentos, su distribución %/cantidad por ubicación) al hover/focus | — | Umbral de confort para detalle, sin degradar el plano. |

Reglas de densidad:
- **El contador de ubicación es clickeable**: abre el `LocationCard` con la lista completa de cargas de esa ubicación (misma información que el panel). En móvil, abre el drawer.
- **Una carga con N ubicaciones**: desde zoom ≥ 1.0x cada ubicación que la contiene muestra el marcador de la carga con el % de su segmento (§69); la vista general solo muestra contadores de cargas por ubicación (sin %). El % es informativo/derivado (OQ-045 → BR-049 resuelta; DP-MX-10 cerrada).
- **Overflow visual de una ubicación** con muchas cargas: los marcadores individuales de una ubicación se alinean en un mini-grid interno (no se superponen aleatoriamente); si exceden el área visible de la ubicación a zoom 1x, el último marcador visible muestra "+N" hasta acercar más.
- **Rendimiento**: render por capas (fondo → zonas → ubicaciones → marcadores → overlays), memoización con Signals/computed de Angular, lazy map (se monta al navegar a la ruta del mapa o al solicitarlo el dashboard; ARCHITECTURE §5.8). Los contadores agrupados reducen nodos DOM: la vista general nunca dibuja un nodo por carga.
- **Sin degradación perceptible** a ~50 ubicaciones + ~500 cargas: objetivo de métrica de la fase 12 (P6-T5 / P12-T3) — validación junto a PERFORMANCE.md.
- La carga de datos es **por vista**: al cambiar de nivel de zoom no se re-fetcha (los datos de ocupación vienen agregados en una sola respuesta); el backend agrega, el frontend NO calcula capacidad (ARCHITECTURE §5.8, PHASES P7).

## 6. Panel derecho y alternativa accesible (WCAG 2.2 AA)

### 6.1 Panel derecho (30–35 %)
- **Buscador**: código de carga con debounce (flujo 11); resultados resaltados en mapa con mapas de ambos canales en sincronía.
- **Filtros**: estado (CargoStatus), ubicación, con/sin alertas; combinables, con contador de resultados ("N cargas") y limpiar filtros.
- **Lista agrupada por ubicación** (`LocationCard` por grupo): cada ubicación muestra nombre, ocupación (`CapacityIndicator` con texto según la **unidad efectiva** de la ubicación — BR-041, "8/10 m²" en sector o "8/10 u" en plazoleta — nunca solo barra de color), y sus cargas con código, permanencia, % de segmento (OQ-045 → BR-049 resuelta; DP-MX-10 cerrada) y señal de alerta; si hay cargas próximas a 30 días se indica ("1 próxima") — ventana previa al umbral 🔶 residual local (DP-UF-14; OQ-008 → BR-014/015 resuelta).
- **Resaltado cruzado (cross-highlight) bidireccional**:
  - hover/focus en fila de la lista → resaltar ubicación en el mapa (borde grueso + `zIndex` elevado + scroll suave del canvas si está fuera de vista);
  - click en fila → seleccionar ubicación/carga (detalle en panel);
  - selección desde el mapa → resaltar la fila/group en la lista y mostrar su `LocationCard`.
- El panel es operable **sin el SVG** (teclado y lector de pantalla): es la alternativa accesible del mapa (MASTER-SPEC §12). Su contenido replica 1:1 la información del canvas: nada existe solo en el mapa.

### 6.2 Accesibilidad del mapa (WCAG 2.2 AA)
- **WCAG 1.4.1 (no color solo)**: todos los estados de §3 tienen ícono/patrón + texto; la leyenda documenta cada combinación.
- **WCAG 1.3.1 / 1.3.2**: el SVG expone estructura semántica (grupos `<g>` con `role="group"` y `aria-label` descriptivo: "Sector 4 — 8 de 10 unidades — 2 cargas"); el orden de tabulación sigue el orden de lectura del plano (izquierda→derecha, arriba→abajo).
- **WCAG 2.1.1 (teclado)**: todas las ubicaciones y marcadores son focables (`tabindex` implícito por rol interactivo); Enter selecciona; las acciones de movimiento se completan por formulario/diálogo (nunca por gesto exclusivo).
- **WCAG 2.4.7 (focus visible)**: anillo de foco de 2px con contraste ≥ 3:1 sobre cualquier fondo (usar `--map-cargo-selected-ring` para foco y selección coherentes).
- **Contraste AA** (1.4.3/1.4.11): los fill/stroke del mapa están verificados contra sus labels (DESIGN-TOKENS §11); nuevos colores del editor deben pasar la misma verificación antes de guardarse (validación en panel de propiedades).
- **Movimiento reducido**: la animación de tránsito y los resaltados animados respetan `prefers-reduced-motion` (→ DP-MX-07).
- **Screen reader**: los elementos no textuales (patrones hatch, íconos de alerta/rezago/secuestro) se anuncian por `aria-label`; la leyenda es una lista semántica navegable.
- El listado (panel) cumple los criterios de tabla/lista: items navegables, `aria-current` en selección, group headings por ubicación.

## 7. Modo editor vs modo visualización

| Aspecto | Visualización (mapa operativo) | Editor de planos |
| --- | --- | --- |
| Roles | VIEWER / OPERATOR / ADMIN (operación y/o lectura) | Solo ADMIN (BR-011/012; flujo 14; disponibilidad OQ-015) |
| Acceso | Ruta "Mapa" (sidebar) | Ruta "Planos" → toggle "Modo edición 🔒" |
| Propósito | Operar cargas: ubicar, mover, revisar | Configurar el layout: crear/eliminar/mover/redimensionar ubicaciones |
| Toolbar | Zoom, pan, reset, leyenda, listado accesible (`MapToolbar`) | + Modos: seleccionar, crear, mover, redimensionar, rotar, borrar; snap/grid; undo/redo (DP-SC-07); guardar/cancelar |
| Canvas | Igual al motor SVG (ADR-006) | Igual motor, + grid visible y snaps; overlays de validación |
| Panel | Lista/filtros/detalle (`LocationCard`) | Propiedades de la ubicación seleccionada |
| Escritura | Nunca escribe geometría | Persiste `Map`/`MapElement` vía `PATCH /api/v1/maps/:id` (BR-020) |
| Auditoría | — (los movimientos auditan por separado) | `AuditAction.MAP_EDIT` con diff previous/newValue (MASTER-SPEC §4.1/§4.3) |

### 7.1 Toolbar y modos del editor
- **Seleccionar** (default): click para seleccionar una ubicación; Shift+click para selección múltiple si aporta (DP-SC-07); Enter abre propiedades.
- **Crear**: el usuario elige tipo (`PLAZOLETA | GALPON | SECTOR | SCANNER | BALANZA | REZAGO | SECUESTRO | OTRO`, MASTER-SPEC §4.3) → dibuja un rectángulo en el canvas (drag) → el panel de propiedades pide nombre, código, capacidad, unidad, color y estado antes de confirmar.
- **Mover**: drag de la ubicación seleccionada; snap a grid (`gridSize` del `Map`, MASTER-SPEC §4.1), configurable en el toolbar.
- **Redimensionar**: handles en los 4 bordes + 4 esquinas; restricción de tamaño mínimo (ver 7.3).
- **Rotar**: handle dedicado (el modelo soporta `rotation`, MASTER-SPEC §4.1); exposición en el editor v1 → DP-MX-08.
- **Borrar**: `ConfirmDialog`; bloqueado si la ubicación tiene cargas ("La ubicación tiene N cargas; movelas antes") o si es la única de su tipo esencial (p. ej. borrar la Plazoleta → advertencia crítica bloqueante hasta definir política → DP-MX-09).
- **Grid y snap**: visualización de grid solo en modo edición; snap a `gridSize` activable/desactivable; el snap nunca distorsiona la carga de datos (se persiste la coordenada final).

### 7.2 Panel de propiedades (ubicación seleccionada)
Campos (MASTER-SPEC §3/§4.1): **nombre, código, tipo (solo lectura tras crear), capacidad (`capacity` + `capacityUnit`; unidad por defecto según el tipo de ubicación con override por ubicación — BR-041, gobernanza ADMIN con auditoría `CAPACITY_CHANGE`), unidad por defecto, color (con verificación de contraste AA contra el label), estado (`ACTIVE | INACTIVE | MAINTENANCE`), descripción** y propiedades adicionales (JSONB). Cambios de capacidad/estado impactan en el mapa operativo inmediatamente al guardar → aviso previo ("Los cambios afectan la vista operativa").

### 7.3 Validaciones geométricas en vivo (guardado bloqueado si hay error)

| Validación | Comportamiento | Mensaje |
| --- | --- | --- |
| Solapamiento de ubicaciones | La pareja en conflicto se resalta en rojo; guardar deshabilitado | "El sector 5 se superpone con el sector 6" |
| Fuera de límites del mapa | La ubicación se recorta visualmente y se marca | "La ubicación supera los límites del predio" |
| Tamaño mínimo | Los handles impiden arrastrar por debajo del mínimo (dimensiones para label + contenido) | "Tamaño mínimo: ..." |
| Código/identificador duplicado | Error inline en propiedades | "El código S4 ya existe en este plano" |
| Borrado con cargas | Acción bloqueada | "La ubicación tiene N cargas; movelas antes" |
| Color sin contraste AA | El campo color muestra aviso y no acepta el valor | "Este color no cumple contraste AA con el label" |

### 7.4 Flujo de guardado
1. "Guardar" resalta cambios pendientes en el canvas (overlay de diff) y abre `ConfirmDialog` ("Los cambios afectan la vista operativa").
2. Persistir → `PATCH /api/v1/maps/:id` con los `MapElement` afectados; el backend valida de nuevo (backend siempre autoriza/valida; BR-009, BR-016 no aplica aquí pero sí la validación de dominio del mapa).
3. Auditoría `MAP_EDIT` con diff (previous/newValue) — consultable en Auditoría (SCREENS §11).
4. Después de guardar, el mapa operativo refleja la nueva configuración; el `Map.version` incrementa (MASTER-SPEC §4.1).
5. **Cancelar** descarta los cambios no persistidos con confirmación si hay ediciones sin guardar.
6. Borrador vs publicación versionada (guardar sin aplicar al operativo) → DP-UF-08 / DP-SC-08 (resueltas — OQ-015: editor fuera de v1; sin efecto en v1).
7. Undo/redo en sesión de edición → DP-SC-07.

### 7.5 Roles y visibilidad
- VIEWER: ve el mapa operativo y "Planos" en **visualización**; nunca ve el toggle de edición ni las acciones de escritura (BR-010).
- OPERATOR: igual que Viewer + operaciones de carga desde el mapa (mover, cambiar estado vía flujos); no ve edición de plano (BR-011).
- ADMIN: todo lo anterior + editor completo + reversión y auditoría (BR-012).
- Defensa en profundidad: el backend rechaza con 403 cualquier `PATCH /api/v1/maps/:id` sin permiso (BR-009), aunque la UI haya ocultado el modo.

## Decisiones de este documento
- D-MX-01: El mapa usa anchos de columna 65–70 % / 30–35 % (coherente con SCREENS §7) y el mismo motor SVG para visualización y editor (ADR-006; DRY, PHASES P6/P11).
- D-MX-02: Los estados del mapa se expresan SIEMPRE con color + patrón/ícono + label textual + ARIA (WCAG 1.4.1); ninguna regla de UI depende del color como canal único.
- D-MX-03: El clustering es **por ubicación** (el dominio ya agrupa cargas): contadores agregados por ubicación en vista general e individualización por marcadores desde zoom ≥ 1.0x (`--map-cargo-label-zoom`), con mini-grid interno para overflow.
- D-MX-04: Toda operación de movimiento iniciada en el mapa termina en `ObservationDialog` obligatorio (BR-006/007); el drag "propone", nunca mueve por sí solo.
- D-MX-05: La alternativa accesible del mapa es el panel derecho (listado por ubicación, `LocationCard`), operativo por teclado y lector de pantalla, con resaltado cruzado bidireccional; el mapa nunca es la única vía (MASTER-SPEC §12).
- D-MX-06: El editor valida geometría en vivo (solapamiento, límites, tamaño mínimo, contraste de color, código duplicado) y bloquea el guardado con errores; la persistencia es datos estructurados (BR-020) + auditoría `MAP_EDIT`.
- D-MX-07: `REGISTERED`, `EXITED` y `DELETED` no se dibujan como marcadores en el canvas (REGISTERED sin ubicación válida; EXITED/DELETED fuera del predio, ADR-011); su información vive en listados/historial.
- D-MX-08: La distribución M:N (§69) se visualiza por segmento: cada ubicación dibuja solo el segmento de la carga que contiene (con su %/cantidad) y su ocupación acumulada (BR-032/033); el mapa nunca inventa ubicaciones ni duplica marcadores. El % se muestra como informativo/derivado (OQ-045 → BR-049 resuelta; DP-MX-10 cerrada); **el camión no es una ubicación: no existe nodo "camión" en el mapa** (BR-042).

## Criterios de aceptación
1. El mapa operativo renderiza las 17 ubicaciones seed desde datos estructurados (MASTER-SPEC §5) con la metáfora gris/amarillo y áreas especiales tokenizadas (DESIGN-TOKENS §11).
2. Todos los estados de §3 (ubicación y carga) son distinguibles sin color: patrón/ícono + label + `aria-label` (verificado por QA de accesibilidad, fase 12).
3. La leyenda es obligatoria, togglable y listada como navegable por teclado; documenta todas las combinaciones de estado presentes en el modelo.
4. Las interacciones de §4.1 funcionan por puntero, gesto y teclado con equivalencias completas; todo gesto tiene alternativa por botón/tecla.
5. El resaltado cruzado panel↔mapa funciona en ambas direcciones y toda la información del canvas existe en el panel (alternativa accesible).
6. La densidad de §5 no degrada: vista general con contadores por ubicación, marcadores individuales desde zoom 1.0x, sin nodos por carga en vista general y sin re-fetch al cambiar zoom (backend agrega).
7. En el editor, crear/eliminar/mover/redimensionar/rotar/propiedades funcionan con snap y grid; el guardado se bloquea ante solapamiento, fuera de límites, tamaño mínimo o color sin contraste; la eliminación de ubicaciones con cargas está bloqueada.
8. Los cambios del editor se persisten como datos estructurados (`PATCH /api/v1/maps/:id`), se versionan (`Map.version`) y se auditan (`MAP_EDIT`, diff); nunca se exporta/guarda una imagen del plano como fuente (BR-020).
9. Los roles se respetan en UI (BR-010/011/012) y el backend rechaza operaciones no autorizadas (BR-009): un VIEWER nunca ve el modo edición.
10. Coherencia con USER-FLOWS (flujos 3/5/6/7/8/9/10/14), SCREENS §7–8, COMPONENTS §6.6–6.10 y PHASES P6/P11 (pantallas y componentes citados existen en los documentos correspondientes).
11. La distribución M:N (§69) funciona en el mapa: una ubicación muestra sus N cargas y su ocupación acumulada por unidad compatible (BR-033/035); una carga con N ubicaciones muestra sus segmentos (%/cantidad/estado) desde la selección y desde zoom ≥ 1.0x; la leyenda documenta los % de segmento y la insignia de alerta de capacidad, y la alternativa accesible (listado) replica la misma información.

## Archivos involucrados
- Este documento: `docs/ux/MAP-UX.md`.
- Fuentes: `docs/MASTER-SPEC.md`, `docs/OPEN-QUESTIONS.md`, `docs/architecture/ADR/ADR-006-SVG-Map-Engine.md`, `docs/architecture/ARCHITECTURE.md` (§5.8), `docs/ux/USER-FLOWS.md`, `docs/ux/SCREENS.md` (§7–8), `docs/frontend/COMPONENTS.md` (§6.6–6.10), `docs/brand/DESIGN-TOKENS.md` (§11), `docs/roadmap/PHASES.md` (P6/P11).
- Futuros (W2/W4/W5/W7/W8): `architecture/MAP-ENGINE.md`, `architecture/PERFORMANCE.md`, `frontend/DESIGN-SYSTEM.md`, `frontend/ACCESSIBILITY.md`, `frontend/ROUTING.md`, `backend/API.md`, `brand/MAP-VISUAL-GUIDELINES.md`, `qa/TEST-CASES.md`, `qa/E2E-SCENARIOS.md`.

## Riesgos
- R-MX-01: ~~OQ-046 sin resolver~~ → **resuelta (2026-09-24)**: umbrales canónicos **<70 / 70–90 / >90** sobre tokens semánticos (DP-MX-06/DP-TK-03 cerradas); la unidad de cálculo quedó resuelta en BR-041.
- R-MX-02: Densidad real de cargas desconocida (cientos vs miles): los thresholds de zoom y el clustering suponen el presupuesto de ADR-006; si la operación real lo excede, se requiere virtualización/tileado (validar con PERFORMANCE.md, W2).
- R-MX-03: Drag-and-drop de cargas sin confirmación → riesgo de movimiento accidental; mitigado con `ObservationDialog` siempre obligatorio y validaciones BR-004/005/016 en backend (el drag solo propone).
- R-MX-04: Errores geométricos del editor (solapamientos, límites) con impacto en el mapa operativo; mitigado con validaciones en vivo, preview de cambios y versionado (`Map.version`) que permite recuperar una versión previa.
- R-MX-05: Accesibilidad SVG es trabajo explícito y fácil de romper (roles, foco, orden de lectura); mitigado por la alternativa de listado obligatoria y por la auditoría WCAG de la fase 12 (P12-T2).
- R-MX-06: El mapa como "pantalla estrella" puede absorber sobrecarga de acciones; se limita a localizar/mover/revisar y delega el resto (historial, alertas, PDF) a las pantallas canónicas (SCREENS).
- R-MX-07: OQ-015 **resuelta** (2026-09-24: "plano estático en v1") → el modo editor queda como especificación futura (fase 11/v2) y el flujo 14 no se implementa; el motor igual implementa las primitivas (ADR-006). Riesgo cerrado.
- R-MX-08: El residual "en camión" quedó resuelto (BR-042: fila informativa en detalle/distribución, nunca marcador de mapa); OQ-045 → **BR-049 resuelta** (derivado de UI): el mapa muestra % informativos/derivados en el panel (DP-MX-10 cerrada). Riesgo cerrado.

## DECISIÓN PENDIENTE
| ID | Pregunta | Impacto | Relación |
| --- | --- | --- | --- |
| DP-MX-01 | ¿Se ratifican el rango de zoom (0.4x–3.0x) y los niveles de densidad propuestos (§5: contadores < 0.75x, marcadores ≥ 1.0x, detalle ≥ 1.5x)? ¿Se ajustan con datos reales de PERFORMANCE.md (W2)? | Densidad, rendimiento | 🔶 Residual local (OQ nueva · PERFORMANCE.md; sin decisión de negocio) |
| DP-MX-02 | ¿El clustering por ubicación con contador clickeable (§5) es suficiente en v1, o se requiere agrupación expandible dentro de la ubicación (mini-grid con "+N") desde el inicio? | Overlays de carga | 🔶 Residual local (ADR-006, PERFORMANCE.md) |
| DP-MX-03 | ~~¿El drag-and-drop de cargas en el mapa operativo se habilita en v1 o solo se mueve vía formulario/tarjeta con selector de destino?~~ → **RESUELTA (OQ-024, 2026-09-24)**: **NO en v1** — el movimiento se hace por formulario/diálogo transaccional con observación obligatoria (BR-006) y validación backend | Flujos 3/5, interacciones | DP-SC-06, OQ-024 (resuelta) |
| DP-MX-04 | ~~¿El editor guarda directo (publicar) o soporta borrador sin aplicar al mapa operativo?~~ → **RESUELTA (OQ-015, 2026-09-24)**: editor **fuera de v1** (mapa = vista estática); publicación versionada queda sin efecto en v1 | Flujo 14, Map.version | DP-UF-08, DP-SC-08, OQ-015 (resuelta) |
| DP-MX-05 | ~~¿Undo/redo en el editor en v1 o solo guardado por confirmación?~~ → **Sin efecto en v1 (OQ-015 resuelta: editor diferido)**; se retoma con el editor en v1.1+ | Editor | DP-SC-07, OQ-015 (resuelta) |
| DP-MX-06 | ~~¿Se confirman los umbrales de ocupación (<70/70–90/>90)?~~ → **RESUELTA (OQ-046, 2026-09-24)**: umbrales canónicos **normal <70% · warning 70–90% · danger >90%** confirmados; la unidad de cálculo quedó resuelta en BR-041 (efectiva por tipo de ubicación/override) | Colores/patrones de sectores, BR-005 | DP-TK-03, OQ-046, DP-UF-02 (resueltas) |
| DP-MX-07 | ¿El estado `IN_TRANSIT` se anima en el mapa (pulso → aterrizaje) respetando `prefers-reduced-motion`, o solo badge estático "en tránsito"? | Accesibilidad, feedback de movimiento | 🔶 Residual local (OQ nueva · D-UF-05) |
| DP-MX-08 | ¿La rotación (`rotation`, MASTER-SPEC §4.1) se expone en el editor v1 (fase 11) o se difiere (el modelo la soporta, la UI no la ofrece)? | Editor, MapElement | 🔶 Residual local (editor fuera de v1 — OQ-015; la UI no la ofrece en v1) |
| DP-MX-09 | ¿Se permite eliminar en el editor ubicaciones "esenciales" del predio (p. ej. única Plazoleta) con confirmación reforzada, o se bloquean por política? | Editor, BR-013 | 🔶 Residual local (editor fuera de v1 — OQ-015; política a definir con el editor en v1.1) |
| DP-MX-10 | ~~¿El % de segmento en el mapa se muestra siempre (derivado en UI de quantity/totalQuantity) o solo cuando `percentage` es canónico?~~ → **RESUELTA (OQ-045 → BR-049, 2026-09-24)**: `percentage` es **derivado de UI** e informativo; el mapa lo muestra siempre (físico: quantity/totalQuantity; PERCENT: el valor mismo) | Distribución M:N, tooltips | OQ-045 → BR-049 (resuelta) |
| DP-MX-11 | ~~Si OQ-042 resuelve "camión como Location" (LocationType CAMION), ¿el camión se dibuja en el mapa con su residual?~~ **RESUELTA por OQ-042 → BR-042** (MASTER-SPEC v0.3): el camión NO es una ubicación; en v1 el residual solo figura como fila informativa en el detalle/distribución (flujos 16/19), nunca como marcador en el plano. | Mapa, descarga parcial | OQ-042 → BR-042 |
| DP-MX-12 | ~~¿La sobreocupación administrativa (BR-036, OQ-043) se representa como estado visual especial de la ubicación o solo se informa en el detalle?~~ → **RESUELTA (OQ-043 → BR-036 ampliada, 2026-09-24)**: **sí, estado visual especial** — fill > 100 con tinte + hatch + label, badge "SOBRECUPACIÓN" + alerta `CAPACITY`; banda danger se mantiene (MAP-VISUAL-GUIDELINES §6) | Colores/patrones, BR-036 | OQ-043 → BR-036 (resuelta) |