# CargoOps — PHASES: desglose por fase (hitos y tareas)

> Fuente: `docs/roadmap/ROADMAP.md` (criterios de salida, dependencias, solapamientos) y `docs/MASTER-SPEC.md` §18/§19 (orden de fases y esquema de IDs de backlog).
> Convención de IDs: **Hito** `P<N>-H<k>` · **Tarea** `P<N>-T<k>` · **Epic** `EPIC-NNN` · **Feature** `FEATURE-00N` (secuencial canónica — ID-008 resuelta) · **User Story** `US-00N`.
> ⚠️ Numeración EPIC canónica: la **secuencial** de `product/PRODUCT-BACKLOG.md` (ID-008, 2026-09-23 — ver PHS-D1 en la sección 17). Los EPIC de las cabeceras de fase siguen esa asignación; la divergencia arranca en EPIC-004 (Camiones es epic propio dentro de PHASE 3) y corre hasta EPIC-013 (Configuración, en PHASE 11). Las fases 12/13/14 son transversales/futura: **no tienen EPIC** (el backlog llega hasta `EPIC-001…013`).

---

## 1. Objetivo

Descomponer cada fase del roadmap en hitos y tareas de alto nivel, con repos/archivos afectados, módulos backend/frontend intervinientes, criterios de aceptación por hito y notas técnicas. Estas tareas de alto nivel son la entrada de `IMPLEMENTATION-PLAN.md`, que las convierte en Tasks de tamaño ejecutable para agentes de código.

## 2. Contexto

- Repos futuros (MASTER-SPEC §22): `cargoops-backend`, `cargoops-frontend`, `cargoops-mobile`, `cargoops-infrastructure`, `cargoops-docs`. En esta columna los repos se nombran así aunque su creación es decisión posterior (RMP-D2).
- Módulos backend (MASTER-SPEC §11.3): auth, users, roles, permissions, cargo, trucks, locations, movements, maps, alerts, dashboard, reports, audit, notifications, settings, health. **v1 esencia: todos excepto `reports`.**
- Estructura frontend (MASTER-SPEC §11.4): core/, shared/, features/, layouts/, pages/, services/, models/, guards/, interceptors/, state/, ui/, utils/.
- Componentes canónicos (MASTER-SPEC §11.4): CargoTable, CargoStatusBadge, CargoDetail, CargoSearch, CargoFilters, OperationalMap, MapLocation, MapToolbar, MapLegend, LocationCard, LocationOccupancyCard, DistributionPanel (distribución de una carga / cargas de una ubicación), MovementTimeline, CapacityIndicator, AlertCard, ConfirmDialog, ObservationDialog, PdfExportButton.

## 3. Restricciones

- No modificar el orden de fases (canónico §18). No inventar reglas de negocio.
- ~~Las tareas marcadas con 🔴 no se planifican para ejecución hasta resolver su OQ; las 🟡 se ejecutan con el supuesto documentado y se revisan al resolver la OQ.~~ → **Sin bloqueos vigentes (v0.5)**: `OPEN-QUESTIONS.md` declara resueltas todas las OQ. Las marcas que quedan en las descripciones son **traza histórica**, no condiciones de ejecución.
- El DoF de cada fase (criterio de salida) está en `ROADMAP.md` §7 y aplica aquí por integración.

## 4. PHASE 0 — Documentation (EPIC: —, grupo W0/W10)

> Fase de documentación pura; sin EPIC (no hay backlog de producto). Sus "tareas" son los grupos del manifest (MASTER-SPEC §17).

| Hito | Tareas | Descripción | Criterios de aceptación |
| --- | --- | --- | --- |
| P0-H1 | P0-T1 | Base canónica: MASTER-SPEC, OPEN-QUESTIONS, README final. | Documentos sin secciones vacías, versionados, decisiones canónicas consolidadas. |
| P0-H2 | P0-T2 | Grupos de documentos W1–W10 (product, architecture+ADRs, frontend, backend, ux, brand, qa, devops, roadmap + DoD/roles/estándares). | Cada archivo del manifest existe y cumple DoD de documentación (`DEFINITION-OF-DONE.md` §3). |
| P0-H3 | P0-T3 | Consolidar OPEN-QUESTIONS con los pendientes reportados por cada grupo. | Toda DECISIÓN PENDIENTE reportada tiene entrada con ID (OQ-NNN) en OPEN-QUESTIONS.md. |
| P0-H4 | P0-T4 | Verificación de coherencia cruzada + reporte final del orquestador (gate PHASE 1). | Cero referencias rotas entre documentos; manifest completo. |

- **Archivos**: todos los de `cargoops-docs/` · **Repos**: `cargoops-docs` (local).

## 5. PHASE 1 — Foundation (EPIC-001)

| Hito | Tareas | Descripción | Criterios de aceptación del hito |
| --- | --- | --- | --- |
| P1-H1 | P1-T1 | Tooling y estándares en los repos: TypeScript strict, ESLint, Prettier, husky, configs de `STANDARDS.md`. | `npm run lint` y `format --check` verdes; strict mode activo en ambos repos. |
| P1-H2 | P1-T2 | Skeleton backend NestJS modular (estructura de módulos §11.3, health, error/logging, envelopes §10). | `GET /api/v1/health` 200; error envelope estándar en una ruta de prueba. |
| P1-H3 | P1-T3 | Prisma + PostgreSQL: schema base (entidades §4.1 canónicas), migraciones, seed de 17 ubicaciones (§5). | Migración aplicable y seed reproducible en dev; tipos estrictos generados. |
| P1-H4 | P1-T4 | Skeleton frontend Angular (standalone, core/shared/features, design tokens iniciales, enrutado base). | App compila, tokens aplicados, layout base desktop-first. |
| P1-H5 | P1-T5 | CI base (lint→test→build) y entorno dev docker-compose (postgres, backend, frontend). | Pipeline verde en `main`; entorno local levanta con un comando. |

- **Archivos**: repos `cargoops-backend`/`cargoops-frontend` (raíz, configs, prisma/, docker-compose) · **BE**: health, common (envelope/logging) · **FE**: core, shared, layouts.
- **Notas técnicas**: pendiente OQ-010 (PWA/SSR) solo afecta flags de scaffolding; ADR-002/003/004/005 citados como fuentes.
- **Bloqueos**: ninguno (OQ-010 **resuelta v0.5**: PWA mínima en v1).

## 6. PHASE 2 — Authentication + RBAC (EPIC-002)

| Hito | Tareas | Descripción | Criterios de aceptación del hito |
| --- | --- | --- | --- |
| P2-H1 | P2-T1 | Módulo auth: login (JWT access+refresh, ADR-008), refresh, logout, hashing y rate limit. | Login/refresh/logout con tests; refresh rota tokens; intentos fallidos limitados. |
| P2-H2 | P2-T2 | Seed de roles/permisos: Viewer, Operator, Admin + bundles de Permission (§8). | Matriz §8 aplicada 1:1; tests de BR-010/011/012. |
| P2-H3 | P2-T3 | Guards backend (JwtAuthGuard, PermissionsGuard) aplicados a rutas de prueba. | Backend rechaza sin token y sin permiso (BR-009): 401/403 correctos. |
| P2-H4 | P2-T4 | Frontend auth: login screen, guard de UX, interceptor con refresh, logout. | Solo UX: sin token no hay rutas; interceptor renueva sesión. |
| P2-H5 | P2-T5 | Auditoría LOGIN/LOGOUT + seguridad base (helmet, CORS, sanitización). | AuditLog registra sesiones; headers de seguridad presentes. |

- **Archivos**: `cargoops-backend/src/{auth,users,roles,permissions,audit}` · `cargoops-frontend/src/{pages/login, guards, interceptors, services/auth, state}` · **BE**: auth, users, roles, permissions, audit · **FE**: guards, interceptors, services.
- **Notas técnicas**: ADR-008 (JWT+refresh) y ADR-009 (RBAC). Los guards frontend NO autorizan; solo mejoran UX (BR-009). Usar `Permission` codes tipo `cargo.create` (§4.1).
- **Bloqueos**: ninguno.

## 7. PHASE 3 — Cargo Management (EPIC-003/004)

| Hito | Tareas | Descripción | Criterios de aceptación del hito |
| --- | --- | --- | --- |
| P3-H1 | P3-T1 | Módulo cargo: entidad (Cargo, CargoStatus §7), repository Prisma, DTOs. | Migración de Cargo lista; tipos generados; soft delete (ADR-011). |
| P3-H2 | P3-T2 | Crear carga `POST /api/v1/cargos` con validaciones BR-001/BR-002 (OQ-001 resuelta v0.5) y observación obligatoria (BR-006/OQ-022). | Carga sin código rechazada (422); duplicados rechazados; observación obligatoria en el alta (OQ-022) persistida con la carga. |
| P3-H3 | P3-T3 | Consultas: listado con filtros (code, status, ubicación vía segmentos CargoLocation — BR-032, truckId) + paginación/envelope §10; detalle. | Filtros/paginación testeados; Viewer consulta, Operator crea (BR-010). |
| P3-H4 | P3-T4 | Actualizar carga (campos permitidos por rol), soft delete/restore (BR-013, ADMIN), notas/observaciones sin movimiento (Observation.cargoId). | Update con validaciones; delete→auditoría→restore conserva historial. |
| P3-H5 | P3-T5 | Módulo trucks: CRUD + asignación de cargas a camión (relación §4.2, OQ-003 resuelta v0.5). | Truck único por patente; asignación testeada; ocupación de camión consultable. |
| P3-H6 | P3-T6 | Seeds/fixtures: cargas de ejemplo §5 + CargoTable/CargoSearch/CargoFilters/CargoDetail básicos. | UI lista con datos seed; estado vacío y loading correctos. |

- **Archivos**: `cargoops-backend/src/{cargo,trucks}` · `cargoops-frontend/src/{features/cargo, pages/cargos, ui}` · **BE**: cargo, trucks · **FE**: features/cargo, ui.
- **Notas técnicas**: código = string (nunca entero, §4.4-1). Estados separados de ubicación (§4.4-2). Observación como entidad propia (§4.4-3).
- **Bloqueos**: ninguno — OQ-001 (**resuelta v0.5** → BR-002), OQ-003 (**resuelta v0.5**), OQ-004 (**resuelta v0.5** → BR-043, `EXITED` terminal) y OQ-002 (resuelta v0.2: la parcialidad se modela vía CargoLocation (BR-032), sin `cargo.locationId` único).

## 8. PHASE 4 — Locations (EPIC-005)

| Hito | Tareas | Descripción | Criterios de aceptación del hito |
| --- | --- | --- | --- |
| P4-H1 | P4-T1 | Módulo locations: entidad Location (LocationType, status), CRUD por ADMIN, listado. | CRUD con permisos (ADMIN gestiona, Operator/Viewer consultan); auditoría de cambios. |
| P4-H2 | P4-T2 | Capacidad por unidad: CapacityCalculator con `occupiedCapacity`/`availableCapacity` derivados (suma de CargoLocation activos en unidad compatible, BR-033/035); flag `allowOverOccupation` (BR-036, OQ-043 resuelta v0.5). | Cálculo de ocupación por unidad unit-testado (BR-005/033/035); sin sumar unidades incompatibles; sobreocupación solo con flag + auditoría + observación (BR-036). |
| P4-H3 | P4-T3 | Validaciones de negocio: mover a inactiva rechazado (BR-004) — integrado en PHASE 5. | Tests de BR-004 listos en el servicio de dominio (consumidos por movements). |
| P4-H4 | P4-T4 | Seed formal de 17 ubicaciones (§5), LocationCard, CapacityIndicator (ocupada/disponible). | Seed reproducible; UI muestra estado y capacidad por unidad. |
| P4-H5 | P4-T5 | Entidad CargoLocation (relación M:N Cargo↔Location, BR-032): migración Prisma (cargoId, locationId, quantity, quantityUnit, percentage?, occupiedArea?, enteredAt, exitedAt, status CargoLocationStatus) + seed de distribución §5 (029TERRA26 → Sector 3 20 m² + Sector 4 35 m²; 032TERRA26 25 m²; 050TERRA26 20 m²). | Migración + seed reproducibles; una fila ACTIVE por (cargo, location); sin `cargo.locationId` único (BR-032); `percentage` derivado según OQ-045 (resuelta v0.5). |
| P4-H6 | P4-T6 | Consultas de distribución (BR-040): `GET /api/v1/cargos/:id/locations`, `GET /api/v1/locations/:id/cargos`, `GET /api/v1/locations/:id/capacity`; ocupación agregada por ubicación (BR-033) y por unidad compatible (BR-035). | Consultas exponen ubicaciones, cantidad, porcentaje, fechas de ingreso/salida e historial; capacidad/ocupada/disponible por unidad. |
| P4-H7 | P4-T7 | UI de distribución y ocupación: DistributionPanel (distribución de una carga / cargas de una ubicación) + LocationOccupancyCard (capacidad, ocupada, disponible, %). | Panel refleja la distribución M:N (BR-040); occupancy card muestra occupied/available; estados loading/empty. |

- **Archivos**: `cargoops-backend/src/locations` · `cargoops-frontend/src/{features/locations, ui}` · **BE**: locations · **FE**: features/locations.
- **Notas técnicas**: Location es la abstracción para todo espacio (§4.4-7); ningún módulo se acopla a sectores específicos. Coordenadas x/y/w/h ya definidas en el modelo para el mapa (fase 6). La ocupación es **derivada** (`occupiedCapacity` = Σ CargoLocation activos en unidad compatible, BR-033/035): nunca se almacena como contador manual.
- **Bloqueos**: ninguno — OQ-009/OQ-041 (**resuelta v0.5** → BR-041), OQ-014, OQ-043 y OQ-045 (todas **resueltas v0.5**).

## 9. PHASE 5 — Movements (EPIC-006)

| Hito | Tareas | Descripción | Criterios de aceptación del hito |
| --- | --- | --- | --- |
| P5-H1 | P5-T1 | Máquina de estados: servicio de dominio con transiciones válidas (§7, incluido PARTIALLY_UNLOADED) y validación en backend (BR-016). | Cada transición §7 testeada; transiciones inválidas rechazadas (400/422 + código de error). |
| P5-H2 | P5-T2 | Movimiento `POST /api/v1/cargos/:id/movements`: observación obligatoria (BR-006/007), historial (BR-008), estado transitorio IN_TRANSIT. | Movimiento sin observación rechazado; historial reconstruible; carga inexistente rechazada (BR-003). |
| P5-H3 | P5-T3 | Validaciones de ubicación/capacidad (BR-004/005/033/035) integradas, por unidad compatible. | Mover a inactiva o a capacidad completa rechazado con tests; unidades incompatibles rechazadas (BR-035). |
| P5-H4 | P5-T4 | UI del flujo: ObservationDialog + ConfirmDialog + MovementTimeline básico (captura de cantidad/porcentaje en movimientos parciales, BR-037). | El operador completa un movimiento con observación y cantidad/porcentaje en ≤3 pasos; estados visibles. |
| P5-H5 | P5-T5 | Reversión (ADMIN): REVERSION conserva historial original + auditoría (BR-012, ADR-010/011). | Reversión auditada y consultable; el historial original no se borra. |
| P5-H6 | P5-T6 | Transacciones de segmentos CargoLocation (BR-039): `POST /api/v1/cargos/:id/locations` (crear segmento), `PATCH /api/v1/cargos/:id/locations/:cargoLocationId` (cantidad/unidad), `DELETE` (egreso) — cada operación inserta Movement + Observation obligatoria (BR-006/008/039). | Crear/actualizar/egresar segmento con movimiento e historial; observación vacía rechazada; residual en camión = totalQuantity − Σ CargoLocation activos (BR-038). |
| P5-H7 | P5-T7 | Movimientos parciales y descarga parcial (BR-037/038): mover cantidad/porcentaje entre ubicaciones; descarga parcial desde camión (OQ-042 resuelta v0.5: el camión no es Location, residual derivado BR-042); unidades compatibles o PERCENT (BR-034/035, OQ-044 resuelta v0.5: sin conversión). | Movimiento parcial NO mueve el 100% (BR-037); descarga parcial registra movimiento y recalcula residual (BR-038); suma distribuida ≤ total (BR-034). |
| P5-H8 | P5-T8 | Alerta de capacidad (AlertType.CAPACITY, §9 MASTER-SPEC): detección sobre `occupiedCapacity` ≥ umbral configurable (OQ-041/043), sin auto-movimiento. | Alerta generada al superar el umbral por unidad; no mueve carga; umbral parametrizable por ubicación. |

- **Archivos**: `cargoops-backend/src/{movements, observations}` · `cargoops-frontend/src/{features/cargo, ui}` · **BE**: movements, observations (payload mínimo en cargo) · **FE**: features/cargo (timeline, diálogos).
- **Notas técnicas**: Movement 1:1 Observation (§4.2). MovementKind v1 puede reducirse a MOVE + razones tipadas (§4.3 — DECISIÓN PENDIENTE de modelado documentada en el ADR de dominio; ver MASTER-SPEC §4.3). La distribución es M:N (BR-032): los movimientos ya no actualizan un `cargo.locationId` único; el segmento destino se registra vía CargoLocation (P5-H6). El estado PARTIALLY_UNLOADED (§7) y el residual en camión se derivan de `totalQuantity − Σ CargoLocation activos` (BR-038, OQ-042). Reversión nunca hard-delete (BR-013).
- **Bloqueos**: ninguno — OQ-041/042/004/003/043/044/045 todas **resueltas v0.5** (BR-041, BR-042, BR-043, sin conversión de unidades, `percentage` derivado). OQ-002 resuelta (v0.2): parcialidad vía CargoLocation.

## 10. PHASE 6 — Operational Map (EPIC-007)

| Hito | Tareas | Descripción | Criterios de aceptación del hito |
| --- | --- | --- | --- |
| P6-H1 | P6-T1 | Datos del mapa: lectura de Map + Locations con coordenadas (BR-020). | `GET /api/v1/maps` y locations devuelven estructura editable-ready. |
| P6-H2 | P6-T2 | Motor SVG: OperationalMap, MapLocation, MapLegend, MapToolbar (ADR-006) — solo lectura. | Render correcto de las 17 ubicaciones desde datos reales; leyenda presente. |
| P6-H3 | P6-T3 | Interacciones: zoom, pan, hover, selección (+ ocupación vía CapacityIndicator). | Navegación fluida; selección muestra detalle/capacidad. |
| P6-H4 | P6-T4 | Accesibilidad: navegación por teclado, ARIA, alternativa accesible (listado). | WCAG 2.2 AA core en el mapa (focus visible, contraste, screen reader). |
| P6-H5 | P6-T5 | Performance: capas, memoización, lazy render del mapa. | Sin degradación perceptible con ~50 ubicaciones (métrica en PHASE 12). |

- **Archivos**: `cargoops-frontend/src/{features/map, ui}` · `cargoops-backend/src/{maps, locations}` (solo lectura) · **BE**: maps, locations · **FE**: features/map.
- **Notas técnicas**: Motor preparado para futuro (rutas, zonas, cámaras, sensores — §11.5). Mapa NO depende solo del color (§13): iconos, patrones, labels.
- **Bloqueos**: ninguno (OQ-015 **resuelta v0.5**: mapa estático, sin interacción de edición).

## 11. PHASE 7 — Dashboard (EPIC-008)

| Hito | Tareas | Descripción | Criterios de aceptación del hito |
| --- | --- | --- | --- |
| P7-H1 | P7-T1 | API de agregación `GET /api/v1/dashboard`: ocupación por ubicación, capacidad usada, cargas por estado, últimos movimientos. | Agregaciones correctas sobre datos reales (tests); paginación/meta donde aplique. |
| P7-H2 | P7-T2 | UI del dashboard: stat cards, listas de alertas/movimientos, refresh. | Estados loading/empty correctos; refresh manual; por rol (BR-010 Viewer consulta). |
| P7-H3 | P7-T3 | Integración con alertas (fase 9) y navegación a detalle de carga. | Click a carga → detalle; sección alertas muestra OPEN. |

- **Archivos**: `cargoops-backend/src/dashboard` · `cargoops-frontend/src/{features/dashboard, pages}` · **BE**: dashboard · **FE**: features/dashboard.
- **Notas técnicas**: Sin cálculos en frontend: el backend agrega (no lógica crítica en UI). Reusa CapacityCalculator (P4-T2).
- **Bloqueos**: ninguno (OQ-009 y OQ-014 **resueltas v0.5**).

## 12. PHASE 8 — History + Audit (EPIC-009)

| Hito | Tareas | Descripción | Criterios de aceptación del hito |
| --- | --- | --- | --- |
| P8-H1 | P8-T1 | Módulo audit: captura de eventos (interceptor/servicio), filtros (entidad, acción, usuario, fecha), paginación, `GET /api/v1/audit`. | Consulta auditada por Admin; filtros testeados; sin datos sensibles (BR-017). |
| P8-H2 | P8-T2 | MovementTimeline completo en detalle de carga (reverso cronológico, estados). | Timeline 100% reconstruible desde movements (BR-008). |
| P8-H3 | P8-T3 | Reversión desde UI (ADMIN): ConfirmDialog + observación obligatoria + historial conservado. | Revert visto en timeline; observación requerida (BR-012). |

- **Archivos**: `cargoops-backend/src/audit` · `cargoops-frontend/src/{features/cargo, ui}` · **BE**: audit · **FE**: features/cargo.
- **Notas técnicas**: ADR-010 (audit log) y ADR-011 (soft delete). Reversión usa MovementKind.REVERSION (no borra).
- **Bloqueos**: ninguno.

## 13. PHASE 9 — Alerts (EPIC-010)

| Hito | Tareas | Descripción | Criterios de aceptación del hito |
| --- | --- | --- | --- |
| P9-H1 | P9-T1 | Motor de alertas: job periódico que detecta permanencia > umbral (BR-014/015, OQ-008 resuelta v0.5: días corridos desde `entryDate`, alerta día 30 y segunda día 40). | Alerta STALE_30D generada sin mover carga (BR-014); job idempotente. |
| P9-H2 | P9-T2 | API de alertas: listado, ack/resolve/dismiss por rol. | Ciclo de vida OPEN→… testeado; permisos por rol. |
| P9-H3 | P9-T3 | Notificaciones in-app (módulo notifications, OQ-011) + AlertCard + sección dashboard. | Notificación visible al crear alerta; AlertCard navega a la carga. |
| P9-H4 | P9-T4 | Flujo humano "mover a Rezago" integrado con movements (REZAGO) + observación. | Movimiento a REZAGO solo por acción humana autorizada (BR-014). |

- **Archivos**: `cargoops-backend/src/{alerts, notifications, jobs}` · `cargoops-frontend/src/{features/alerts, features/dashboard}` · **BE**: alerts, notifications, jobs (BullMQ si OQ-007) · **FE**: features/alerts.
- **Notas técnicas**: ADR-012 (background jobs) condicionado a OQ-007. El cálculo de permanencia usa entryDate por defecto (BR-015).
- **Bloqueos**: ninguno — OQ-008, OQ-007 y OQ-011 **resueltas v0.5**.

## 14. PHASE 10 — PDF (EPIC-011)

| Hito | Tareas | Descripción | Criterios de aceptación del hito |
| --- | --- | --- | --- |
| P10-H1 | P10-T1 | Servicio backend de PDF: estrategia (ADR-013/OQ-005), contrato de exportación. | Servicio aislado con contrato definido; unit tests del generador. |
| P10-H2 | P10-T2 | Endpoint `POST /api/v1/cargos/:id/export-pdf` + permisos BR-018 (`cargo.export_pdf`). | Export autorizado por rol; datos no autorizados nunca expuestos; errores tipados. |
| P10-H3 | P10-T3 | PdfExportButton en UI con estados de descarga y manejo de errores. | Descarga OK; errores visibles sin crashear; retry. |

- **Archivos**: `cargoops-backend/src/{pdf, cargo}` · `cargoops-frontend/src/{features/cargo, ui}` · **BE**: pdf (servicio especializado) · **FE**: features/cargo.
- **Notas técnicas**: PDF siempre generado en backend (nunca en cliente) — no lógica crítica en UI. Envelope de error según §10.
- **Bloqueos**: ninguno (OQ-005 **resuelta v0.5**: HTML→PDF con Chromium/Puppeteer).

## 15. PHASE 11 — Map Editor (EPIC-012/013)

| Hito | Tareas | Descripción | Criterios de aceptación del hito |
| --- | --- | --- | --- |
| P11-H1 | P11-T1 | Modelo de edición: Map/MapElement (zIndex, rotation, properties JSONB) + `PATCH /api/v1/maps/:id` + versionado. | Estructura de datos BR-020 intacta; validaciones de rango/posición. |
| P11-H2 | P11-T2 | Interacciones de edición: drag, resize, snap, grid, selección (reuso motor P6). | Ediciones fluidas; snap a grid configurable; selección múltiple si aporta. |
| P11-H3 | P11-T3 | Panel de propiedades de ubicación (nombre, código, tipo, capacidad, color, estado). | Propiedades persistidas y reflejadas en el mapa de vista. |
| P11-H4 | P11-T4 | Guardar/preview + auditoría MAP_EDIT + confirmación de cambios. | Cambios auditados (AuditAction.MAP_EDIT); preview antes de persistir. |

- **Archivos**: `cargoops-backend/src/maps` · `cargoops-frontend/src/{features/map-editor, ui}` · **BE**: maps · **FE**: features/map-editor.
- **Notas técnicas**: Solo ADMIN (BR-011/012). Reutiliza el motor SVG de PHASE 6 (evita duplicación — DRY). El plano vive como datos estructurados, no imagen (BR-020).
- **Bloqueos**: ninguno (OQ-015 **resuelta v0.5**: mapa estático, sin interacción de edición).

## 16. PHASE 12/13/14 — QA, Production, Mobile (sin EPIC: fases transversales/futura)

| Fase | Hitos | Tareas | Descripción | Criterios de aceptación |
| --- | --- | --- | --- | --- |
| 12 QA | P12-H1 | P12-T1 | E2E de casos críticos (§14 MASTER-SPEC: crear carga, mover, sin observación, capacidad, permisos, reversión, alerta 30d, PDF, plano). | Suite E2E verde en CI. |
| | P12-H2 | P12-T2 | Accesibilidad WCAG 2.2 AA (teclado, lectores, contraste, diálogos, tablas). | Auditoría sin bloqueantes; evidencia por pantalla. |
| | P12-H3 | P12-T3 | Performance (mapa, listados), seguridad (authz, inyección, secrets) y estabilización. | Reporte de perf/security; backlog de defectos cerrado a cero bloqueantes. |
| 13 Production | P13-H1 | P13-T1 | Infraestructura en repos devops: docker prod, entornos, secretos. | Deploy reproducible; rotación de secretos documentada. |
| | P13-H2 | P13-T2 | Observabilidad: logs correlacionados (requestId), métricas, health checks. | Alertas de disponibilidad activas. |
| | P13-H3 | P13-T3 | Backups/DR con RPO/RTO acordados (OQ-016) + runbook de recuperación. | Restore probado en staging; runbook ejecutable. |
| | P13-H4 | P13-T4 | CI/CD de deploy (lint→test→build→security→deploy), security review, release v1.0.0. | Release v1.0.0 taggeada con changelog (SemVer). |
| 14 Mobile | P14-H1 | P14-T1 | Estrategia móvil (PWA avanzada vs app, OQ-010) + arquitectura preparada en FASE 0. | Decisión documentada; sin reescritura (MASTER-SPEC §1.5). |
| | P14-H2 | P14-T2 | Layout móvil: mapa + panel inferior/drawer (§12), detalle de carga. | Usable en móvil; mejoras de ergonomía. |
| | P14-H3 | P14-T3 | Offline parcial de consultas (nunca movimientos, §12) + notificaciones según OQ-011. | Movimientos críticos offline bloqueados explícitamente. |

- **Archivos**: 12: `qa/` + suites E2E · 13: `cargoops-infrastructure`, pipelines · 14: `cargoops-mobile` o PWA avanzada del frontend.
- **Notas técnicas**: 12 y 13 son transversales (ROADMAP RMP-006); 14 es futuro (RMP-007).

## 17. DECISIÓN PENDIENTE

| # | Pregunta | Impacto | Referencia |
| --- | --- | --- | --- |
| PHS-D1 | ~~¿Se ratifica la numeración de IDs propuesta (EPIC-00N por fase; FEATURE/US con prefijo de fase) o W1 define su propia numeración en PRODUCT-BACKLOG.md y W10 alinea este documento?~~ → **RESUELTA (2026-09-23, ID-008)**: se ratifica la **secuencial canónica** de PRODUCT-BACKLOG/PRD (`EPIC-001…013`, `FEATURE-001…030`, `US-001…053`); este documento conserva `P<N>-H<k>`/`P<N>-T<k>` para hitos/tareas y **sus cabeceras de fase ya usan la asignación EPIC canónica del backlog** (PB-D2/PBQ-01) | Coherencia de vínculos EPIC/FEATURE/US en todas las tareas | MASTER-SPEC §19 / ID-008 |
| PHS-D2 | ~~OQ-002 (carga parcial)~~ → **Resuelta (v0.2)**: distribución vía CargoLocation (BR-032..040), sin CargoItem en v1. Las tareas P3-H2/P5-H2/P5-H4 ya reflejan el modelo de segmentos; la revisión prevista quedó cerrada con OQ-044/OQ-045 (**resueltas v0.5**). | P3-H2, P5-H2, P5-H4 | OQ-044, OQ-045 (resueltas v0.5) |
| PHS-D3 | ~~OQ-004 (egreso/retiro): si existe en v1, se agrega un hito P5-H6 (EXIT)~~ → **RESUELTA (2026-09-24, OQ-004 → BR-043)**: el egreso **sí existe** en v1 (movimiento `EXIT` con observación obligatoria, `exitDocumentRef?` opcional, `EXITED` terminal); el hito P5-H6 (EXIT) queda incorporado y la máquina de estados §7 revisada. | Hito/UI de egreso | OQ-004 |
| PHS-D4 | MovementKind v1: ¿se adopta el set completo (§4.3) o la reducción MOVE + razones tipadas? | Contratos API de movements | MASTER-SPEC §4.3 |
| PHS-D5 | PHASE 12/13: ¿los criterios de aceptación de release incluyen certificación de accesibilidad formal (auditoría externa) o la interna de QA es suficiente para v1? | DoD de release | 🔶 Residual local (sin OQ) |
| PHS-D6 | ~~OQ-042: si el camión se modela como Location…~~ → **RESUELTA (2026-09-23, OQ-042 → BR-042)**: el camión **NO es una Location**; queda como residual derivado (`totalQuantity − Σ CargoLocation activos`) con vínculo `Cargo.truckId`. **No se amplían P4-T1/P4-T5 ni el mapa (fase 6)**; P5-H7 usa el residual derivado (§67). | P4-T1, P4-T5, P5-H7, P6 | OQ-042 |
| PHS-D7 | ~~OQ-043: la sobreocupación (BR-036) requiere definir límite de % extra, rol autorizante y obligatoriedad de observación~~ → **Resuelta (2026-09-24, OQ-043 → BR-036 ampliada) e IMPLEMENTADA (FASE 5)**: flag `allowOverOccupation` persistente por ubicación + techo `capacity × (1 + overOccupationLimitPercent/100)` (**default +10%**) aplicado en el guard compartido de capacidad; habilitación **solo ADMIN** (`PATCH /locations/:id`, auditado `CAPACITY_CHANGE`), ejecución por OPERATOR autorizado; toda escritura aceptada por encima de la capacidad declarada se audita como excepción sobre la ubicación (`metadata.overOccupation: true`) y el rechazo por techo reporta el techo real (VALIDATION.md §4.5) | P4-T2, P5-T3, P5-T6, P5-T8 | OQ-043 · VALIDATION.md §4.5 · BR-036 |

## 18. Archivos involucrados

- `docs/roadmap/PHASES.md` (este documento) · `docs/roadmap/ROADMAP.md` · `docs/roadmap/IMPLEMENTATION-PLAN.md`
- `docs/MASTER-SPEC.md` (§5, §7, §8, §11, §17, §18, §19, §22) · `docs/OPEN-QUESTIONS.md` (OQ-001…045)
- `docs/DEFINITION-OF-DONE.md` · `docs/STANDARDS.md` · `docs/product/PRODUCT-BACKLOG.md` (W1, pendiente — fuente de consolidación de IDs)