# ADR-006 — SVG Map Engine

- Estado: Accepted
- Fecha: 2026-09-23
- Decisores: Equipo CargoOps / Software Architect

## Contexto

CargoOps opera sobre un **predio logístico/aduanero** cuyas zonas son: Plazoleta (zona gris, carga en camión), Galpón con Sectores 1–12, y áreas especiales Scanner, Balanza, Rezago, Secuestro (MASTER-SPEC §3). El plano NO es una imagen estática: el layout es **configurable y editable**, cada espacio tiene nombre, código, tipo, posición, ancho/alto, superficie, capacidad, unidad, color, estado y propiedades (MASTER-SPEC §3, BR-020). El mapa es un componente operativo central: mostrar estado de ocupación, permitir mover cargas visualmente, y ser administrable por ADMIN (editor en fase 11, MASTER-SPEC §18; OQ-015).

El modelo canónico ya define los datos estructurados: `Map`, `MapElement { x, y, width, height, rotation, zIndex, fill, stroke, labelPosition, properties }` y `Location { x, y, width, height, ... }` (MASTER-SPEC §4.1, §11.5). El mapa debe ser accesible (WCAG 2.2 AA, alternativa en listado) y veloz en hardware de oficina.

## Decisión

Construir el **motor de mapa sobre SVG**, renderizado en el frontend Angular (ADR-002), alimentado por **datos estructurados de coordenadas** persistidos en PostgreSQL (MASTER-SPEC §4.1, BR-020):

- **Representación**: cada ubicación es un objeto `LocationVisual { id, x, y, width, height, rotation, zIndex, fill, stroke, labelPosition }` (+ `properties`, MASTER-SPEC §11.5), persistido vía `Map`/`MapElement` y servido por la API REST (ADR-007). El SVG se genera declarativamente en Angular desde esos datos (atributos `viewBox`, transform con rotación; grid y snap del editor).
- **Interacciones v1** (MASTER-SPEC §11.5): zoom, pan, selección, hover con tooltip de estado/capacidad, drag de cargas entre ubicaciones (movimiento con observación obligatoria — BR-006), leyenda obligatoria y no depender solo del color (iconos/patrones/labels, MASTER-SPEC §13).
- **Editor de plano (ADMIN, fase 11)**: drag/resize de ubicaciones, snap a grid, edición de propiedades; si OQ-015 se resuelve «solo vista en v1», el motor igualmente implementa las primitivas (el editor es una capa de interacción sobre las mismas primitivas).
- **Rendimiento** (MASTER-SPEC §11.5): render por capas (fondo, ubicaciones, contenedores/etiquetas, cargas), memoización con Signals/computed de Angular, lazy-map (el mapa se carga cuando el dashboard lo solicita), y **no** virtualización premature: el predio v1 tiene ~17 ubicaciones + cientos de cargas como máximo, dentro de presupuesto de SVG; si crece a miles de nodos, se evalúa tileado/virtualización por piezas.
- **Accesibilidad**: el SVG se acompaña de una alternativa textual operacional (listado de ubicaciones con ocupación), navegación por teclado para selección/movimiento y roles ARIA en elementos interactivos — el mapa nunca es la única vía de operación (MASTER-SPEC §12).
- **Coordenadas relativas al `viewBox`** (no absolutas a píxel): el mapa responde a distintos tamaños de pantalla (desktop-first, tablet, móvil con drawer, MASTER-SPEC §12) sin recalcular datos.

El estado de decisión es **Accepted**: el enfoque SVG + datos estructurados es canónico (MASTER-SPEC §3, §4.4.7, BR-020, §11.5); OQ-015 solo afecta el alcance del editor, no el motor.

## Alternativas consideradas

1. **Imagen estática (PNG/SVG exportado) del plano.** Rechazada: viola BR-020 y MASTER-SPEC §3 — el layout es configurable; sin datos estructurados no hay ocupación por ubicación, ni drag de cargas, ni editor, ni históricos de layout (Map.version, MASTER-SPEC §4.1).
2. **Canvas/WebGL (p. ej. PixiJS).** Rechazada para v1: mayor complejidad de interacción (hit-testing manual, accesibilidad casi nula) y solo se justifica con miles de nodos animados; el dominio es de decenas a cientos de elementos con interacción editorial (drag/resize/snap) donde SVG + DOM rinden y son accesibles.
3. **Librerías de mapas geográficos (Leaflet/MapLibre).** Rechazada: modelan coordenadas geográficas y tiles; el predio es un *floor plan* con ejes cartesianos y edición de geometría propia; forzar el modelo de mapa mundial agregaría fricción sin beneficio.
4. **Librerías de diagramas comerciales (GoJS/JointJS).** Rechazada: licencias comerciales y curva de aprendizaje alta para un motor que el equipo controla fácilmente con SVG; el roadmap (rutas, zonas, cámaras, sensores — MASTER-SPEC §11.5) se cubre con primitivas SVG propias.
5. **Servidor de mapas (MapServer/GeoServer + WMS).** Rechazada: overkill; sin capa de edición simple y sin necesidad de proyección geográfica.

## Consecuencias

**Positivas:**

- Datos estructurados → edición, versionado y consultas (ocupación, capacidad, estado) sin procesar imágenes (BR-020).
- SVG es accesible, escalable (vector) y editable; el equipo lo domina con estándares web sin dependencias pesadas.
- El editor de plano (fase 11) reutiliza las mismas primitivas del render (una sola representación en memoria).
- Preparado para el roadmap: rutas, puertas, caminos, cámaras, sensores y posiciones de camiones se agregan como nuevos `elementType`s (MASTER-SPEC §11.5).

**Negativas:**

- El motor es código propio a mantener (más que una librería de diagramas): se mitiga con `architecture/MAP-ENGINE.md` y componentes canónicos (`OperationalMap`, `MapLocation`, `MapToolbar`, `MapLegend`, MASTER-SPEC §11.4).
- Rendimiento en DOM grande: se controla con capas y memoización; presupuesto v1 documentado.
- Accesibilidad SVG requiere trabajo explícito (roles, leyenda, alternativa en listado): es criterio de aceptación en QA (MASTER-SPEC §12, §14).

## Referencias

- MASTER-SPEC §3 (referencia visual), §4.1 (Map/MapElement/Location), §4.4 (decisión 7: Location como abstracción), §6 BR-020, §11.5 (motor de mapa), §12 (accesibilidad), §13 (colores/leyenda).
- ADR-002 (Angular/Signals), ADR-004 (datos estructurados en PostgreSQL), ADR-007 (API de map/plano), ADR-011 (cargas borradas no se dibujan).
- OQ-015 (editor en v1), `architecture/MAP-ENGINE.md`, `ux/MAP-UX.md`, `brand/MAP-VISUAL-GUIDELINES.md` (grupos W2/W6/W7).