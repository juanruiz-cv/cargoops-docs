# CargoOps — Rendimiento (PERFORMANCE.md)

> Grupo W2 · Arquitectura · Fuente de verdad: `docs/MASTER-SPEC.md` §10 (paginación/limits), §11.5 (render eficiente del mapa), §12 (velocidad como principio de UX), §14 (QA/testabilidad).
> Estado: borrador FASE 0 (documentación). Los presupuestos numéricos (p95) son **referencia propuesta por W2, marcada «a validar»** — no son regla canónica (ver §9 P1; OQ-020 resuelta: números provisionales como AC derivados a validar en FASE 1).

## 1. Objetivo

Definir los objetivos y estrategias de performance de CargoOps: presupuestos prácticos de tiempos (carga inicial, API, paginación, historial, mapa, PDF), técnicas por capa (índices, paginación, debouncing, memoización, signals, lazy loading, caché Redis, virtualización) y los criterios para validarlos en QA (fase 12, MASTER-SPEC §18). El principio: rendimiento adecuado para la **operación diaria del predio** (decenas de usuarios, hardware de oficina), sin optimización prematura (KISS/YAGNI, ADR-001).

## 2. Contexto

El perfil de uso es transaccional y de consulta acotada: listados paginados de cargas, detalle + timeline de movimientos, dashboard de KPIs, mapa SVG con ~17 ubicaciones y cientos de cargas (ADR-006), exportación PDF y bandeja de alertas/notificaciones. Los puntos calientes documentados: la tabla append-only `audit_logs` y `movements` (volumen creciente), la **agregación de ocupación por ubicación** (BR-033/036 — Σ de segmentos `CargoLocation` activos en unidad compatible) en cada mutación/lectura de distribución, y el render del mapa (ADR-006). La referencia del prompt original citaba una sección §36 (presupuestos); **el MASTER-SPEC canónico (v0.1/0.2) no la contiene** (tiene 24 secciones): los presupuestos de este documento se derivan de las secciones existentes y se proponen como referencia a validar, sin inventar reglas.

## 3. Restricciones

- **Presupuestos p95 = referencia a validar** con QA (fase 12) y con el negocio; no son compromisos contractuales hasta su aprobación.
- **Paginación canónica** (MASTER-SPEC §10): `?page=&limit=` con default 25 y máximo 100; cursor en tablas append-only de alto volumen (audit_logs — ADR-007/010; movimientos según DATABASE.md §5.7).
- **Sin optimización prematura**: el volumen v1 es bajo (predio único, decenas de usuarios, cientos de cargas — ADR-001 §Contexto); las técnicas costosas (virtualización, particionado, caché distribuida) entran cuando el dato real lo justifica.
- **El mapa no renderiza miles de nodos** (ADR-006/MASTER-SPEC §11.5): capas, memoización, lazy map; virtualización solo sobre umbral (§5.4).
- **Redis/BullMQ en v1 según OQ-007** (ADR-012 Accepted): la caché Redis de dashboard/mapa es v1.1 no bloqueante (ADR-012 §Decisión).
- FASE 0: solo documentación.

## 4. Dependencias

- `docs/MASTER-SPEC.md` §10, §11.5, §12, §14, §18 (fase 12 QA).
- `architecture/ADR/ADR-002` (Signals/zoneless/memoización), ADR-004 (índices parciales/particionado/pg_trgm), ADR-005 ($queryRaw acotado, pool), ADR-006 (presupuesto de render SVG), ADR-007 (paginación/cursor), ADR-010 (particionado de audit), ADR-012 (jobs + caché Redis).
- Hermandos W2: `DATABASE.md` §5.7 (catálogo de índices) y §5.2 (partial indexes), §5.9 (agregación de `occupiedCapacity`), `ARCHITECTURE.md` §5.10 (transaccionalidad y consistencia BR-034/035), `MAP-ENGINE.md` §5.2 (render) y §5.8 (overlay M:N), `PDF-EXPORT.md` §5.3 (pipeline asíncrono).
- Downstream: `backend/API.md` (paginación), `backend/DTOs.md` (query DTOs), `frontend/FRONTEND-ARCHITECTURE.md` (signals/state), `qa/QA-STRATEGY.md` (performance tests), `devops/MONITORING.md` (métricas).
- `docs/OPEN-QUESTIONS.md`: OQ-007 (Redis/BullMQ v1 — **resuelta**), OQ-020 (presupuestos p95 provisionales a validar — **resuelta**), OQ-041/OQ-044 (unidad de capacidad por defecto y conversión entre unidades en la agregación — **resueltas**, BR-041/BR-048).

## 5. Decisiones

### 5.1 Principios y objetivos medibles

- **Percepción de velocidad por encima de benchmarks absolutos**: interacciones <100 ms se sienten instantáneas; <1 s con feedback; el mapa y el PDF tienen progreso visible (MASTER-SPEC §12: claridad, velocidad, estados visibles).
- **Perfil de carga de referencia (v1, predio único)**: MASTER-SPEC §5 define 17 ubicaciones y cargas de ejemplo; el modelo operativo asume **decenas de usuarios concurrentes** (operadores/administradores del predio), cientos de cargas activas y una tasa de movimientos del orden de docenas por día (ADR-001 §Contexto). Los presupuestos no son para miles de usuarios ni multi-tenant (SCALABILITY.md §5.2).
- **Objetivos p95 (referencia a validar)**:

| Operación | p95 objetivo (referencia) | Nota |
| --- | --- | --- |
| Login | < 1 s | Argon2id podrá dominar; aceptable hasta 1,5 s |
| Carga inicial de app (shell + bootstrap) | < 3 s en red local | Incluye assets del shell + datos del dashboard |
| `GET /cargos` (página 25) | < 300 ms | Índices + paginación offset (DATABASE.md §5.7) |
| `GET /cargos/:id` (detalle agregado) | < 400 ms | Evitar N+1 (include agregado, ADR-007 §Negativas) |
| `GET /cargos/:id/movements` (timeline, página 25) | < 400 ms | `ix_movements_cargo_id_moved_at` |
| `GET /dashboard` (KPIs agregados) | < 500 ms | `$queryRaw` acotado (ADR-005); caché Redis v1.1 opcional |
| `GET /maps/:id` (layout completo) | < 300 ms | Un único plano, elementos acotados |
| `GET /locations` con ocupación | < 400 ms | `ix_cargo_locations_location_id_status_unit` (BR-033; DATABASE.md §5.9) |
| `GET /audit` (cursor, filtros) | < 600 ms | Append-only + cursor; volumen gestionado por particionado |
| `GET /alerts` · `GET /notifications` | < 300 ms | Índices dedicados (DATABASE.md §5.7) |
| Render del mapa (vista operativa) | < 1,5 s desde datos cargados | ~17 ubicaciones; capas + signals (ADR-006) |
| Export PDF — acuse del enqueue (asíncrono) | < 500 ms | Cola `pdf-exports` (ADR-012/013); la generación es asíncrona |
| Export PDF — síncrono (documento liviano) | < 3 s documento liviano | Síncrono para livianos; grandes por cola `pdf-exports` (OQ-005/007); timeout y alerta (PDF-EXPORT.md §5.1) |
| Guardado de movimiento (transacción crítica) | < 600 ms | Movement + Observation + mutación de segmentos `CargoLocation` + audit + agregación de ocupación de las ubicaciones afectadas (BR-033/036) en una transacción |

### 5.2 Técnicas backend

- **Índices**: catálogo operativo de DATABASE.md §5.7 (búsqueda por código → único exacto o GIN trigram según OQ-001; ocupación por ubicación; historial por cargo; alertas abiertas parciales; auditoría por objeto; elementos de plano). Índices **parciales** (`WHERE deleted_at IS NULL`) para soft delete (ADR-004/011).
- **Mapa índice-consulta** (cómo cada consulta frecuente queda cubierta):

| Consulta frecuente | Índice de apoyo (DATABASE.md §5.7) | Técnica adicional |
| --- | --- | --- |
| `GET /cargos?filter=code` | único exacto (o `pg_trgm` GIN según OQ-001) | Normalización de código en búsqueda (BR-002) |
| Ocupación por ubicación | `ix_cargo_locations_location_id_status_unit` | Agregación query-time con filtro por `status = 'ACTIVE'` y unidad compatible (BR-033/035; DATABASE.md §5.9) |
| Ubicaciones de una carga (distribución, BR-040) | `ix_cargo_locations_cargo_id` | `GET /cargos/:id/locations` — N segmentos, sin N+1 |
| Cargas de una ubicación (BR-040) | `ix_cargo_locations_location_id_status` | `GET /locations/:id/cargos` — join a `cargo` en una query |
| Historial de movimientos por carga | `ix_movements_cargo_id_moved_at` | Cursor si el historial crece (§5.4) |
| Alertas abiertas | Índice parcial por `status = OPEN` | Job de alertas fuera del request path |
| Auditoría por entidad | `ix_audit_entity_entity_id` | Cursor obligatorio, sin offset (ADR-007/010) |
| Elementos de plano por mapa | `ix_map_elements_map_id` | Render una sola lectura (MAP-ENGINE.md §5.2) |
| Bandeja de notificaciones | `ix_notifications_user_id_read_at` | `unreadOnly` con count acotado |

- **Paginación**: offset (`page/limit`, default 25/máx 100) para listados de dominio; **cursor** para `audit_logs` (append-only, ADR-007/010) y evaluación de cursor en `movements` históricos largos (DATABASE.md §5.7). Filtros/orden por allowlist (SECURITY.md §5.4) evitan scans no indexados e inyección.
- **Evitar N+1**: endpoints agregados (detalle con include opcional — ADR-007 §Negativas); joins en una query; `include` explícito de Prisma o `$queryRaw` acotado para agregaciones (ADR-005).
- **`occupiedCapacity`/`availableCapacity` derivados (BR-033/035)**: agregación de `CargoLocation` activos (`status = 'ACTIVE'`) en **unidad compatible** sobre el índice `(location_id, status, quantity_unit)` (DATABASE.md §5.3/§5.9). Estrategia v1: **query-time** en lectura (SUM acotado) + recálculo de las ubicaciones afectadas dentro de la misma transacción de escritura (ARCHITECTURE.md F6); sin columna materializada ni trigger en v1 (DATABASE.md §5.9). La materialización se evalúa solo con señal medida (§5.6).
- **Caché Redis (v1.1, según OQ-007)**: lecturas estables del dashboard y del layout del mapa (el layout cambia poco — invalidation por `MAP_EDIT`); NO cachear datos transaccionales de cargas ni agregaciones de ocupación (riesgo de lectura stale en operación — BR-033).
- **Pool de conexiones** y retries documentados en `backend/BACKEND-ARCHITECTURE.md` (ADR-005); particionado de `audit_logs`/`movements` por rango de fecha (ADR-004/010) para poda e índices pequeños.
- **Jobs (OQ-007)**: alertas 30d, PDF y mantenimiento fuera del request path (ADR-012): el request solo encola; el render/scan no degrada la API.

### 5.3 Técnicas frontend

- **Debouncing**: búsqueda de código de carga (default 300 ms — COMPONENTS.md §6.4) y eventos de viewport del mapa (requestAnimationFrame + umbral).
- **Signals/computed (memoización)**: derivados estables (`locationVisuals`, colores por estado, ocupación agregada, filas filtradas) con `computed`; OnPush por defecto; re-render dirigido (ADR-002, MAP-ENGINE.md §5.2). Se evalúa ejecución zoneless para reducir detección de cambios en el mapa.
- **Lazy loading**: por feature de ruta (ADR-002): `mapa-operativo`, `planos`, `auditoria`, `configuracion` cargan bajo demanda; shell + dashboard primeros.
- **PWA (mínima v1, OQ-010)**: caching de assets y shell (service worker); sin offline transaccional (MASTER-SPEC §12).
- **Virtualización**: en tablas largas se prefiere paginación server-side; virtualización solo en el mapa cuando el overlay exceda el umbral (~500 piezas activas, referencia — MAP-ENGINE.md §9 M5) y en listados de alto volumen puntuales si QA lo exige.
- **Peticiones**: evitar re-fetch al navegar dentro de la feature (state con signals + cache en memoria por sesión); invalidación explícita tras mutaciones (FRONTEND-ARCHITECTURE.md §5.7).

**Presupuesto de assets v1 (referencia a validar, derivado de ADR-002 y MASTER-SPEC §12)**:
- Shell (core + shared + dashboard): < 250 KB gzip en el primer paint crítico; el mapa y las features pesadas cargan bajo demanda (lazy, §5.3).
- Sin librerías de gráficos pesadas en el bundle crítico: el mapa SVG es declarativo (ADR-006) y el dashboard usa tablas/indicadores propios (sin chart library en v1 salvo decisión de W4/W7).
- Fuentes e íconos: subset de la tipografía de marca (brand/) servida localmente; sin dependencia de CDNs externos (velocidad y disponibilidad en intranet del predio — MASTER-SPEC §12, SECURITY.md §5.7).

### 5.4 Notas específicas: mapa, PDF y audit

- **Mapa**: render por capas con `<g>` y keys estables; zoom/pan solo transforman el contenedor; hover/selección actualizan solo la pieza; lazy map (la feature se instancia al navegar) (MAP-ENGINE.md §5.2). Presupuesto v1: ~17 ubicaciones + cientos de cargas (ADR-006); sin virtualización prematura.
- **PDF**: asíncrono por cola (ADR-012/013) — el tiempo de generación (Chromium, 400–800 ms por documento liviano + proporcional al historial) no bloquea la API; caché por hash de snapshot evita regeneraciones repetidas (PDF-EXPORT.md §5.4).
- **Audit**: escritura en la misma transacción (un INSERT adicional por mutación) — costo medible en QA; lectura con cursor y filtros indexados; particionado por rango para consultas y poda (AUDIT.md §5.8).

### 5.5 Medición y validación en QA

- **Metodología**: medición en **staging** con datos representativos del predio (17 ubicaciones, cientos de cargas, historial de movimientos simulado; MASTER-SPEC §5/§14), no en local ni con datasets vacíos. Percentiles reportados: **p50, p95 y p99** + tasa de error; cada presupuesto se mide sobre el endpoint completo (HTTP → handler → DB), no solo el service.
- **Herramientas**: tests de performance de API (k6 o similar — W8 decide) contra los endpoints críticos del §5.1; **profiling de queries** (Prisma logs / EXPLAIN) para detectar N+1 y scans no indexados; **Lighthouse/WebPageTest** para el frontend (LCP, INP, CLS — core web vitals) y para el mapa (tiempo a primer render y a interactividad).
- **Umbrales de alerta en producción** (devops/MONITORING.md): latencia p95 por endpoint, uso de conexiones del pool, tamaño de `audit_logs`/`movements` (crecimiento), duración de jobs (PDF, alertas 30d) y memoria del worker. La alerta NO es un test de aceptación: dispara revisión de presupuestos o de índices, nunca un cambio de arquitectura inmediato (KISS/YAGNI, ADR-001).
- **Gate de QA (fase 12, MASTER-SPEC §18)**: los presupuestos p95 (§5.1) se validan con un **reporte de performance** que el orquestador aprueba (P1); sin ese reporte, la fase 12 no cierra. Los resultados se comparan contra la línea base v1 y se registran para detectar regresiones en releases posteriores.
- **Regla anti-regresión**: cualquier PR que agregue una consulta nueva o cambie un endpoint de alto uso incluye su impacto de performance estimado (índice o paginación cubiertos) — convención que se verifica en code review (MASTER-SPEC §15) y en los tests de API del backend (W5).

### 5.6 Presupuestos de datos y de base de datos (referencia)

Estimación de volumen v1 (predio único, MASTER-SPEC §5; **referencia a validar** con datos reales en QA):

| Tabla | Tamaño estimado v1 | Crecimiento | Técnica aplicada |
| --- | --- | --- | --- |
| `cargo` | Cientos de filas activas | Bajo (decenas/día) | Índice de código + parcial por soft delete |
| `movements` | Miles (decenas/día) | Lineal | `ix_movements_cargo_id_moved_at`; cursor si crece (§5.2) |
| `audit_logs` | 1 fila por mutación + login/logout | La más alta | Particionado por rango + cursor (ADR-010) |
| `locations` / `maps` | Fija (17 ubicaciones, 1 plano) | Muy bajo | Sin técnica especial; caché de layout (v1.1) |
| `alerts` / `notifications` | Bandeja activa | Moderado | Índices parciales por estado abierto / por usuario |

- **Regla de entrada para optimización**: aplicar una técnica costosa (particionado, virtualización, caché distribuida) solo cuando QA o producción muestren la señal medida (p95 fuera de presupuesto o volumen real documentado) — nunca por precaución (KISS/YAGNI, ADR-001; regla de entrada en §8).
- **Límite de tamaño por respuesta**: listados paginados (máx 100, MASTER-SPEC §10); el detalle de carga usa `include` opcional (ADR-007); los aggregates del dashboard se acotan a los KPIs definidos (MODULES.md §5.11) para evitar respuestas pesadas.
- **Timeouts**: la API define timeouts por capa (HTTP/DB/worker) documentados en `backend/ERROR-HANDLING.md`; el PDF síncrono (si se difiere la cola) tiene timeout propio con respuesta accionable (PDF-EXPORT.md §5.10).

### 5.7 Costo por flujo transaccional (referencia)

Cada mutación crítica es UNA transacción ACID (ARCHITECTURE.md §5.10, ADR-005) — el costo es la suma de sus escrituras, no round-trips separados:

| Flujo | Escrituras en la misma transacción | Presupuesto (referencia) |
| --- | --- | --- |
| Crear carga | `cargo` INSERT + audit CREATE | < 300 ms |
| Mover/distribuir carga (ubicación/estado, BR-032…040) | `movement` INSERT + `observation` INSERT + UPDATE/INSERT de segmentos `cargo_locations` (origen/destino; egreso = EXITED) + `cargo` UPDATE (status) + audit MOVE/STATUS_CHANGE + agregación de ocupación de las ubicaciones afectadas (BR-033) | < 600 ms (§5.1) |
| Cambiar estado sin mover | `movement` INSERT + `observation` INSERT + `cargo` UPDATE + audit STATUS_CHANGE | < 400 ms |
| Revertir movimiento (ADMIN) | `movement` INSERT (REVERSION) + `observation` + `cargo` UPDATE + audit REVERT | < 600 ms |
| Soft delete / restaurar | `cargo` UPDATE (deletedAt) + audit DELETE/RESTORE | < 300 ms |
| Registrar camión | `truck` INSERT + audit CREATE | < 250 ms |
| Editar plano | `map` UPDATE (version++) + upsert `map_element` + audit MAP_EDIT | < 500 ms |

**Notas**:
- La ocupación por ubicación (`occupiedCapacity`, BR-033) se agrega en la misma transacción con el índice `(location_id, status, quantity_unit)` (DATABASE.md §5.9); el costo es una agregación SUM acotada a las ubicaciones afectadas, no un UPDATE de columna materializada.
- Otros flujos (estado, reversión, soft delete, camión, plano) no agregan segmentos: su costo no cambia respecto de la base anterior. La distribución no suma transitividad extra a la transacción más allá de los segmentos tocados.
- El presupuesto incluye la escritura de audit (1 fila append-only) — costo medible y diseñado, no una sorpresa (ADR-010).
- La lectura del detalle agregado (`GET /cargos/:id`) usa joins/include en UNA query; el timeline se pagina (cursor si crece) y no viaja completo en el detalle (ADR-007 §Negativas).
- Estos números son **referencia W2 a validar** en QA fase 12 (P1); un fallo del presupuesto en staging dispara revisión de índices/queries, no cambio de arquitectura (§5.5).

### 5.8 Presupuestos de interacción y runtime (referencia)

| Interacción | Presupuesto (referencia) | Técnica que lo sostiene |
| --- | --- | --- |
| Búsqueda de carga por código (debounce 300 ms) | Feedback < 150 ms tras el debounce | `pg_trgm`/índice (OQ-001) + signals |
| Navegación entre features (lazy) | Shell visible en < 1 s; feature bajo demanda | Lazy loading por ruta (ADR-002, §5.3) |
| Zoom/pan del mapa | Sin jank perceptible (60 fps / rAF) | Transform dirigido, memoización por capas (MAP-ENGINE.md §5.2) |
| Hover/selección de ubicación | < 100 ms (feedback instantáneo) | Actualización solo de la pieza (signal local) |
| Marcar notificación leída | < 200 ms con optimistic update | `notifications.store` + rollback en error (FRONTEND-ARCHITECTURE.md §5.3) |
| Abrir detalle de carga | < 400 ms (datos agregados) | Endpoint agregado una query (ADR-007 §Negativas) |
| Export PDF (clic → acuse) | < 500 ms (asíncrono) | Enqueue por cola (PDF-EXPORT.md §5.3) |
| Render del mapa completo | < 1,5 s desde datos cargados | Capas + signals + lazy map (ADR-006) |

**Principles**:
- **Feedback inmediato, datos async**: toda acción visible responde < 100 ms en UI (estado optimista); el dato crítico llega del backend sin bloqueo visual (MASTER-SPEC §12: estados visibles).
- **Sin jank en scroll/tablas**: virtualización solo sobre umbral (§5.3/§9 M5); paginación server-side por defecto.
- **Medición en QA**: estas interacciones se instrumentan en el gate de performance (fase 12, §5.5) con Lighthouse + métricas manuales de mapa; los valores son referencia W2 a validar (P1).

## 6. Criterios de aceptación

- [ ] Los presupuestos p95 (§5.1) se validaron en QA (fase 12) contra ambientes de staging con datos representativos del predio (MASTER-SPEC §14) y quedaron aprobados por el orquestador (P1).
- [ ] Ningún listado usa offset en `audit_logs`; los históricos largos de movimientos definen cursor (DATABASE.md §5.7) — verificado por tests de API.
- [ ] El mapa no re-renderiza globalmente en hover/zoom (memoización por signals) y cumple el presupuesto v1 (ADR-006).
- [ ] `occupiedCapacity`/`availableCapacity` (BR-033) se agregan por índice `(location_id, status, quantity_unit)` en unidad compatible; las lecturas usan la estrategia documentada de DATABASE.md §5.9 sin agregaciones repetidas no indexadas.
- [ ] El render de PDF no bloquea el request path: síncrono para documentos livianos, asíncrono por cola `pdf-exports` para grandes (OQ-005/OQ-007).
- [ ] Las técnicas de este documento se referencian desde DATABASE.md (índices), MAP-ENGINE.md (render) y FRONTEND-ARCHITECTURE.md (signals) sin contradicción.
- [ ] El mapa de índice-consulta (§5.2) cubre todas las consultas frecuentes de DATABASE.md §5.7, sin índices inventados fuera del catálogo.
- [ ] Los presupuestos de assets del frontend (shell < 250 KB gzip, lazy loading por feature, sin CDNs externos) se validan en QA fase 12 (§5.3).
- [ ] El costo por flujo transaccional (§5.7) se mide en staging con las transacciones críticas listadas y se compara contra los presupuestos p95.
- [ ] El presupuesto de interacción y runtime (§5.8) se valida con métricas de Lighthouse/mapa en QA fase 12, sin fijar valores canónicos antes de la aprobación (P1).
- [ ] Toda técnica costosa (particionado, virtualización, caché distribuida) cumple la regla de entrada: señal medida real, no precaución (§5.6/§8).

## 7. Archivos involucrados

- `docs/MASTER-SPEC.md` §10, §11.5, §12, §14, §18 · `docs/OPEN-QUESTIONS.md` (OQ-007, OQ-020, OQ-041, OQ-044)
- `architecture/ADR/ADR-002`, ADR-004, ADR-005, ADR-006, ADR-007, ADR-010, ADR-012
- Hermandos W2: `DATABASE.md` §5.2/§5.7, `ARCHITECTURE.md` §5.10, `MAP-ENGINE.md` §5.2, `PDF-EXPORT.md` §5.3, `AUDIT.md` §5.8
- Downstream: `backend/API.md`, `backend/DTOs.md`, `frontend/FRONTEND-ARCHITECTURE.md`, `qa/QA-STRATEGY.md`, `devops/MONITORING.md`

## 8. Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Presupuestos p95 sin base canónica (sin §36 en MASTER-SPEC v0.1/0.2) | Marcados como referencia a validar; OQ-020 resuelta (los adopta como AC derivados): validación en QA fase 12 y saneo antes de fijar contrato |
| Volumen de `audit_logs`/`movements` degrada consultas | Particionado + cursor + índices por rango (ADR-004/010); retención pendiente (AUDIT.md §9 U2) |
| N+1 en detalle de carga (carga + timeline + alertas + segmentos de distribución) | Endpoints agregados (ADR-007); include dirigido; `GET /cargos/:id/locations` con un solo index scan (`ix_cargo_locations_cargo_id`); revisión en code review |
| Agregación de ocupación M:N costosa o con unidades incompatibles | Índice `(location_id, status, quantity_unit)` + agrupación única por query (DATABASE.md §5.9); BR-035; OQ-041/OQ-044 resueltas (BR-041/BR-048) |
| Render del mapa degradado con overlays grandes | Umbral de virtualización (MAP-ENGINE.md M5) + lazy map + memoización |
| PDF síncrono con timeout bloquea UX en historiales largos | Recomendación asíncrona (ADR-013); límite de tamaño y paginación del HTML |
| Optimización prematura (caché, virtualización) sin datos | Regla de entrada: solo cuando QA/volumen real lo justifique (v1.1 para caché Redis — OQ-007) |

## 9. DECISIÓN PENDIENTE (reportar al orquestador)

Las preguntas con OQ asignada quedaron **resueltas en MASTER-SPEC v0.5 (2026-09-24)**; P3/P4 no tienen OQ asignada y se conservan como residuales locales:

| # | Pregunta concreta | Impacto | Resolución |
| --- | --- | --- | --- |
| P1 | ~~Aprobar los presupuestos p95 propuestos (§5.1) como objetivos formales de QA, o ajustarlos con el equipo/negocio. (MASTER-SPEC v0.1 no contiene la sección §36 del prompt original de 61 secciones; estos valores son la propuesta W2.)~~ | Criterios de aceptación de performance | ✅ **RESUELTA (OQ-020)** — los números provisionales se adoptan como **AC derivados a validar** en QA fase 12; se sanean antes de fijar contrato |
| P2 | ~~¿Caché Redis de lecturas estables (dashboard/mapa) en v1 o diferida a v1.1 (ADR-012 recomendación)?~~ | Técnica de caché | ✅ **RESUELTA (OQ-007)** — Redis + BullMQ en v1 (jobs); la caché de lecturas estables queda como v1.1 no bloqueante (ADR-012 §Decisión) |
| P3 | ¿Cursor pagination en `movements` históricos (bajo volumen creciente) o solo en `audit_logs` en v1? | Contrato de API del timeline | 🔶 Pendiente local — sin OQ asignada; se decide con el volumen medido (DATABASE.md §5.7) |
| P4 | Umbral de virtualización del overlay de carga en el mapa (~500 piezas activas, referencia): ¿se confirma con datos reales? | Render del mapa | 🔶 Pendiente local — sin OQ asignada; se confirma con señal medida (MAP-ENGINE.md §9 M5) |
| P5 | ~~¿Sourcing síncrono o asíncrono del PDF (define el p95 del request de export)?~~ | Presupuesto PDF | ✅ **RESUELTA (OQ-005/OQ-007)** — síncrono para documentos livianos; asíncrono por cola `pdf-exports` para grandes (PDF-EXPORT.md §5.1) |
| P6 | ~~¿La agregación de `occupiedCapacity` (BR-033/035) se mantiene query-time en v1 o se materializa (columna/vista incrementada) cuando el volumen real lo justifique?~~ | Técnica de ocupación | ✅ **RESUELTA (OQ-041/OQ-009)** — query-time en v1 con índice `(location_id, status, quantity_unit)` (DATABASE.md §5.9); materialización solo con señal medida (§5.6) |
| P7 | ~~Presupuestos p95 de los **nuevos endpoints de distribución** (`GET /cargos/:id/locations`, `GET /locations/:id/cargos`, agregación de ocupación): ¿se agregan a la tabla §5.1 como referencia (misma escala que `GET /locations` < 400 ms) o quedan sujetos exclusivamente a OQ-020?~~ | Criterios de QA fase 12 | ✅ **RESUELTA (OQ-020)** — se agregan como referencia a validar (misma escala < 400 ms) y se sanean en FASE 1 |