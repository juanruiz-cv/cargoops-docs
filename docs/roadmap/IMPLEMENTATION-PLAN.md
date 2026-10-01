# CargoOps — Plan de implementación por tareas (IMPLEMENTATION-PLAN)

> Fuente canónica: `docs/MASTER-SPEC.md` (§14 testing, §15 estándares, §17 manifest, §18 fases, §19 backlog, §20 DoD). Convenciones de fases/hitos/tareas: `docs/roadmap/PHASES.md` (P<N>-H<k> / P<N>-T<k>). Dependencias y solapamientos: `docs/roadmap/ROADMAP.md` (W-1…W-6, RMP-004/005). DoD aplicable: `docs/DEFINITION-OF-DONE.md` (§7 por tarea, §6 por funcionalidad).
> Este documento NO redefine decisiones canónicas: describe cómo transformar el trabajo de cada fase en Tasks pequeñas y verificables para agentes de código (OpenCode + Gentle-Orchestrator), en qué orden ejecutarlas y con qué criterios cerrarlas.

---

## 1. Objetivo

Definir el método concreto con el que el equipo (orquestador + agentes de código) convierte cada fase del roadmap en **Tasks pequeñas, verificables y con finitud**: estructura estándar de Task (10 campos), reglas de tamaño y granularidad, orden de ejecución recomendado, ciclo de vida orquestado y bloqueos por OQ. El destino de este documento es ser **leído y ejecutado por agentes**: cada Task debe poder tomarse, implementarse y cerrarse sin leer el universo completo de la documentación.

## 2. Contexto

- CargoOps se implementará por etapas (PHASE 1 Foundation → PHASE 14 Mobile) sobre **Modular Monolith** (ADR-001): backend NestJS + frontend Angular + PostgreSQL/Prisma (MASTER-SPEC §11). No hay código todavía: la FASE 0 produce la documentación que consumen los agentes (MASTER-SPEC §1.2/§1.3).
- MASTER-SPEC v0.2 (ampliación §§62-70) fija la **distribución M:N Cargo↔Location** vía `CargoLocation` (BR-032…040): capacidad por unidad (`occupiedCapacity`/`availableCapacity` derivados), consultas de distribución, movimientos parciales y descarga parcial. Las Tasks de fases 4/5 se diseñan sobre **segmentos** (quantity/quantityUnit/percentage) y nunca sobre un `cargo.locationId` único.
- Los repos futuros están definidos en nombre (`cargoops-frontend`, `cargoops-backend`, `cargoops-mobile`, `cargoops-infrastructure`, `cargoops-docs`), pero su creación es una decisión posterior (ROADMAP RMP-D2, MASTER-SPEC §22).
- `PHASES.md` ya descompone cada fase en hitos y tareas de alto nivel (`P<N>-T<k>`); este documento refina ese desglose a Tasks ejecutables y define el **formato y proceso** para producirlas, no la lista cerrada de Tasks (la lista se genera al abrir cada fase).
- La numeración EPIC/FEATURE/US está en proceso de alineación: W1 consolidó `product/PRODUCT-BACKLOG.md` con numeración **secuencial** `EPIC-001…013` / `FEATURE-001…027` / `US-001…045` (decisión PB-D1), que difiere de la propuesta phase-prefixed de `PHASES.md` (PHS-D1/RMP-D1 → PBQ-01). Hasta que el orquestador alinee `PHASES.md`, **el ID primario de planificación es la tarea `P<N>-T<k>`** y las referencias EPIC/FEATURE/US se citan contra el backlog de W1 con la advertencia de la sección DECISIÓN PENDIENTE (IMP-D1).

## 3. Restricciones

- No alterar el orden canónico de fases ni los nombres (MASTER-SPEC §18); no crear Tasks que crucen el DoF de una fase sin integrarlo (ROADMAP §3).
- No inventar reglas de negocio: toda ambigüedad detectada durante el desglose o la implementación se registra como DECISIÓN PENDIENTE y se reporta al orquestador para `OPEN-QUESTIONS.md` (MASTER-SPEC §6/§16).
- Una Task nunca debe decir «construye toda la aplicación», «implementa la fase completa» ni agrupar UI + API + jobs + tests de varios módulos en una sola unidad.
- Las Tasks marcadas 🔴 por OQ no se planifican para ejecución hasta resolver la OQ; las 🟡 se ejecutan con el supuesto documentado y se revisan al resolver (RMP-004, PHASES §3). → **Vigente solo como regla de contingente**: en v0.5 no quedan OQ abiertas, así que ninguna Task lleva marca de bloqueo.
- Toda Task se cierra con su **Definition of Done** (§7 de `DEFINITION-OF-DONE.md`) y sus **Acceptance Criteria** cumplidos; nada se cierra «por aproximación».
- FASE 0: solo documentación; este plan describe la implementación futura sin crear código.

## 4. Dependencias

| Dependencia | Rol en este plan |
| --- | --- |
| `docs/MASTER-SPEC.md` | Fuente de verdad: dominio, BR, RBAC, API, arquitectura, fases, backlog, DoD |
| `docs/roadmap/PHASES.md` | Desglose de fases en hitos/tareas P<N>-H<k>/P<N>-T<k> (insumo directo del §9) |
| `docs/roadmap/ROADMAP.md` | Dependencias de fases (W-1…W-6), prioridades, DoF por fase, RMP-004/005 |
| `docs/product/PRD.md` | Requisitos MoSCoW y mapeo de capacidades a EPIC/FEATURE/US (W1) |
| `docs/product/PRODUCT-BACKLOG.md` | **Creado (W1)** — numeración secuencial EPIC/FEATURE/US (PB-D1); alineación con PHASES pendiente (PBQ-01 / IMP-D1) |
| `docs/DEFINITION-OF-DONE.md` | DoD por tarea (§7), por funcionalidad (§6), por fase (§4) |
| `docs/STANDARDS.md` | Estándares de código, commits, branch strategy, PR/Code Review, seguridad |
| `docs/OPEN-QUESTIONS.md` | OQ-001…047: condiciones de bloqueo de Task (🔴/🟡) — **v0.5: sin OQ abiertas, ningún bloqueo vigente** |
| `docs/backend/API.md`, `backend/MODULES.md`, `architecture/ARCHITECTURE.md`, `frontend/FRONTEND-ARCHITECTURE.md`, `qa/TEST-PLAN.md` | Contratos y estructura que acotan el alcance de cada Task |

## 5. Decisions de este plan

| # | Decisión |
| --- | --- |
| IMP-001 | El ID primario de planificación es la tarea `P<N>-T<k>` de `PHASES.md`; EPIC/FEATURE/US son metadatos de trazabilidad (candidatos a re-numeración, IMP-D1). |
| IMP-002 | Una fase se abre generando la lista de Tasks a partir de sus hitos (PHASES.md), nunca «la fase en una sola Task». |
| IMP-003 | Toda Task usa el formato de 10 campos del §6; un campo vacío es motivo de rechazo del desglose. |
| IMP-004 | Tamaño objetivo: 0,5–1,5 días de implementación, un solo módulo/feature, diff revisable en ≤ 30 min (detalle §7). |
| IMP-005 | Orden de ejecución: respetar el orden topológico de fases y las ventanas W-1…W-6; dentro de una fase, construir base → validaciones → UI → endurecimiento (detalle §9). |
| IMP-006 | Las Tasks bloqueadas por OQ quedan en cola «bloqueadas» con el ID de OQ; el orquestador las desbloquea solo cuando la OQ se resuelve (RMP-004). → **Inactivo en v0.5** (no quedan OQ abiertas); se reactiva si se reabre alguna OQ. |
| IMP-007 | Ningún agente ejecuta en paralelo dos Tasks que toquen los mismos archivos o el mismo módulo; el orquestador serializa por módulo. |
| IMP-008 | Cada Task cierra con evidencia observable: tests verdes, CI, y checklist de DoD marcada — no con un mensaje de «listo». |

## 6. Formato estándar de una Task

Cada Task se escribe con EXACTAMENTE estos 10 campos, en este orden:

| # | Campo | Qué contiene | Obligatorio |
| --- | --- | --- | --- |
| 1 | **Task** | ID `P<N>-T<k>` (o `P<N>-T<k>-S<j>` para subtarea) + título imperativo y acotado | Sí |
| 2 | **Contexto** | Por qué existe, a qué hito/fase pertenece, qué BR/requisito satisface (BR-XXX, FEATURE-XXX/US-XXX) | Sí |
| 3 | **Inputs** | Documentos del manifest y contratos que el agente DEBE leer antes de tocar código (p. ej. `backend/API.md` contrato X) | Sí |
| 4 | **Dependencies** | Tasks `P<N>-T<k>` que deben estar cerradas, OQ que la bloquean (🔴/🟡 — ninguna en v0.5) y módulos cuyo contrato ya no puede cambiar | Sí |
| 5 | **Files** | Archivos/directorios a crear o modificar — **lista cerrada, sin genéricos** («todo el repo») | Sí |
| 6 | **Implementation** | Pasos concretos de implementación, decisiones de diseño incompatibles con el plan (p. ej. dónde va la lógica, qué patrón usar) | Sí |
| 7 | **Tests** | Unit / integration / E2E / API que la Task debe incluir; casos borde obligatorios (errores, vacíos, permisos) | Sí |
| 8 | **Validation** | Comandos y criterios de verificación local + CI (lint, test, build, typecheck) | Sí |
| 9 | **Acceptance Criteria** | Resultados observables que definen el fin de la Task; verificables por el orquestador o un revisor | Sí |
| 10 | **Definition of Done** | Checklist de `DEFINITION-OF-DONE.md` §7 aplicada a esta Task (marcada, no presumida) | Sí |

**Regla de cierre**: una Task está «Done» solo cuando 7 + 8 + 9 + 10 están completos y verificados. Si al implementar se descubre una ambigüedad real (regla de negocio, contrato, comportamiento), la Task se **pausa** y se reporta DECISIÓN PENDIENTE; no se inventa la respuesta.

### 6.1 Ejemplo completo (Task model)

```markdown
## Task: P5-T2 — Permitir mover carga entre ubicaciones con observación obligatoria

### Contexto
Hito P5-H2 (Movements, fase 5). Satisfacen BR-003/BR-006/BR-008 y FEATURE-013 (US-019).
Base de trazabilidad: todo movimiento inserta Movement + Observation 1:1 y registra el segmento CargoLocation destino (BR-039; la distribución M:N reemplaza `cargo.locationId` — MASTER-SPEC v0.2 §4.4-8).

### Inputs
- `docs/backend/API.md` → contrato `POST /api/v1/cargos/:id/movements`
- `docs/backend/VALIDATION.md` → reglas de validación de movimiento
- `docs/architecture/ARCHITECTURE.md` §máquina de estados (transición destino permitida)
- `docs/backend/MODULES.md` §movements (estructura del módulo)

### Dependencies
- P5-T1 (máquina de estados base) — cerrada
- P4-T2 (CapacityCalculator) — cerrada
- P3-T2 (alta de cargas) — cerrada
- Bloqueos OQ: ninguno (OQ-044/OQ-045 **resueltas v0.5**: unidades compatibles o `PERCENT`, sin conversión; `quantity` es la fuente de verdad y `percentage` derivado)

### Files
- `cargoops-backend/src/movements/movements.controller.ts`
- `cargoops-backend/src/movements/movements.service.ts`
- `cargoops-backend/src/movements/dto/create-movement.dto.ts`
- `cargoops-backend/src/movements/observations/` (crear)
- `cargoops-backend/test/movements/move.spec.ts` (integration)

### Implementation
1. DTO `toLocationId` + `observation.text` (no vacía, trim).
2. Service: validar carga existe (BR-003), ubicación ACTIVE (BR-004), capacidad (BR-005), transición válida (BR-016).
3. Transacción Prisma: crear Movement + Observation + crear/actualizar el segmento CargoLocation destino (BR-008/039, ADR-010).
4. Envelope de respuesta `{ data: movement }` (§10 MASTER-SPEC).
5. Errores tipados: `MOVEMENT_EMPTY_OBSERVATION`, `LOCATION_INACTIVE`, `CAPACITY_EXCEEDED`.

### Tests
- Unit (service): movimiento sin observación rechazado (BR-006); observación solo espacios rechazada.
- Unit: carga inexistente → 404 (BR-003); ubicación inactiva → 422 (BR-004); capacidad excedida → 422 (BR-005).
- Integration: movimiento válido crea Movement + Observation y actualiza locationId (BR-008).

### Validation
`npm run lint && npm run test && npm run build` en `cargoops-backend`; tests del módulo movements verdes.

### Acceptance Criteria
- [ ] `POST /api/v1/cargos/:id/movements` devuelve 201 con el movimiento creado y observación persistida.
- [ ] Movimiento sin observación devuelve 422 con código `MOVEMENT_EMPTY_OBSERVATION`.
- [ ] El historial de la carga es reconstruible con este movimiento (BR-008).
- [ ] 0 cambios fuera de `cargoops-backend/src/movements` (+ tests).

### Definition of Done
- [ ] DoD §7 de `DEFINITION-OF-DONE.md` completo (tests, docs, validaciones, errores, permisos, logs).
- [ ] Todos los Acceptance Criteria marcados y verificados en CI.
```

### 6.2 Tasks de referencia — distribución M:N y capacidad por unidad (BR-032…040)

Estas Tasks modelan el trabajo de las fases 4/5 asociado a la ampliación §§62-70 (MASTER-SPEC v0.2). Se escriben con el formato del §6 para que los agentes las tomen tal cual al abrir las fases 4 y 5. En v0.5 no quedan OQ abiertas (ningún bloqueo vigente). Se conserva RMP-004/IMP-006 como regla de contingente.

**Estrategia de datos sugerida**: usar los seeds de MASTER-SPEC §5 como fixtures de tests de capacidad/ocupación — **029TERRA26** → Sector 3 (20 m², ACTIVE) + Sector 4 (35 m², ACTIVE) con total 55 m²; **Sector 4** (capacity 100 m²) = 029TERRA26 35 m² + 032TERRA26 25 m² + 050TERRA26 20 m² → occupied 80 m² / available 20 m².

```markdown
## Task: P4-T5 — Modelar entidad CargoLocation (distribución M:N) con migración y seed

### Contexto
Hito P4-H5 (Locations, fase 4). Satisface BR-032/BR-033/BR-040 y MASTER-SPEC §4.1 (CargoLocation), §4.2 y §5 (seeds de distribución). Prohibido reintroducir `cargo.locationId` único (v0.2).

### Inputs
- `docs/MASTER-SPEC.md` §4.1/§4.2/§4.4-8 y §5 (seeds 029TERRA26, Sector 4)
- `docs/architecture/DATABASE.md` (convenciones Prisma)
- `docs/OPEN-QUESTIONS.md` OQ-045 (semántica de percentage)

### Dependencies
- P4-T1 (módulo locations + entidad Location) — cerrada
- P1-T3 (schema base Prisma) — cerrada
- Bloqueo OQ: ninguno — OQ-045 **resuelta v0.5** (`quantity` es la fuente de verdad; `percentage` derivado de UI)

### Files
- `cargoops-backend/prisma/schema.prisma` (modelo CargoLocation)
- `cargoops-backend/prisma/migrations/<n>_cargo_location/`
- `cargoops-backend/prisma/seed.ts` (segmentos §5)

### Implementation
1. Modelo Prisma: id, cargoId (N:1), locationId (N:1), quantity, quantityUnit, percentage? (nullable), occupiedArea?, enteredAt, exitedAt?, status (ACTIVE|EXITED), notes?, timestamps.
2. Índice único parcial (cargoId, locationId) WHERE status = ACTIVE (una fila activa por par — §4.2).
3. Migración + seed con 029TERRA26 → Sector 3 20 m² + Sector 4 35 m²; 032TERRA26 → Sector 4 25 m²; 050TERRA26 → Sector 4 20 m² (§5).
4. Sin columna `Cargo.locationId` (BR-032).

### Tests
- Seed aplicado: Sector 4 = 80 m² ocupados / 20 m² disponibles (BR-033/035).
- Unit (repositorio): no existen dos segmentos ACTIVE para el mismo (cargo, location).

### Validation
`npm run lint && npm run test && npm run build` en `cargoops-backend`; `prisma migrate dev` + `prisma db seed` reproducibles.

### Acceptance Criteria
- [ ] Migración CargoLocation aplicable y seed reproducible (BR-032).
- [ ] Cargo sin `locationId` único; la relación M:N solo se consulta vía CargoLocation.
- [ ] Sector 4 con `occupiedCapacity` 80 m² y `availableCapacity` 20 m² (fixture §5).

### Definition of Done
- [ ] DoD §7 de `DEFINITION-OF-DONE.md` completo; AC verificados en CI.
```

```markdown
## Task: P4-T6 — Endpoints de distribución y consultas de capacidad por unidad

### Contexto
Hito P4-H6 (Locations, fase 4). Satisface BR-040 (consultas de distribución) y BR-033/BR-035 (ocupación agregada por unidad). Contratos en MASTER-SPEC §10.

### Inputs
- `docs/MASTER-SPEC.md` §10 (endpoints de distribución) y §4.1 (Location: capacity/capacityUnit, occupiedCapacity/availableCapacity)
- `docs/backend/API.md` (convenciones de contrato) · `docs/backend/DTOs.md`

### Dependencies
- P4-T5 (entidad CargoLocation) — cerrada
- P4-T2 (CapacityCalculator por unidad) — cerrada
- Bloqueos OQ: ninguno — OQ-041/OQ-045 **resueltas v0.5** (unidad por defecto por LocationType; `percentage` derivado) fijan el shape exacto de la respuesta

### Files
- `cargoops-backend/src/locations/locations.controller.ts` (+ DTOs)
- `cargoops-backend/src/locations/locations.service.ts` (o cargo.service para el lado carga)
- `cargoops-backend/test/locations/distribution.spec.ts`

### Implementation
1. `GET /api/v1/cargos/:id/locations` → segmentos activos/históricos con cantidad, unidad, porcentaje, enteredAt/exitedAt (BR-040).
2. `GET /api/v1/locations/:id/cargos` → cargas con ocupación y alertas (30 días).
3. `GET /api/v1/locations/:id/capacity` → capacity, occupiedCapacity, availableCapacity, % ocupado, por unidad (BR-033/035).
4. Envelope `{ data }` + paginación §10.

### Tests
- Unit: ocupación agregada correcta con 029TERRA26 35 + 032TERRA26 25 + 050TERRA26 20 = 80/100 m² (BR-033).
- Unit: unidades incompatibles NO se suman (BR-035).
- API: 404 para cargo/location inexistentes; 403 sin permiso de consulta.

### Validation
`npm run lint && npm run test && npm run build` en `cargoops-backend`.

### Acceptance Criteria
- [ ] Los 3 endpoints responden con los campos de BR-040 y capacidad por unidad (BR-033/035).
- [ ] Consulta de distribución reconstruible (ubicaciones, cantidades, porcentajes, fechas).
- [ ] 0 cambios fuera de `src/locations` (+ tests).

### Definition of Done
- [ ] DoD §7 completo; AC verificados en CI.
```

```markdown
## Task: P5-T6 — Servicio de transacciones de segmentos CargoLocation (crear/actualizar/egresar)

### Contexto
Hito P5-H6 (Movements, fase 5). Satisface BR-039 (toda operación de segmento genera Movement + Observation), BR-006/BR-008 y MASTER-SPEC §10 (POST/PATCH/DELETE `/api/v1/cargos/:id/locations`).

### Inputs
- `docs/MASTER-SPEC.md` §10 (endpoints de distribución) y §7 (PARTIALLY_UNLOADED, residual en camión)
- `docs/backend/VALIDATION.md` · `docs/backend/API.md`

### Dependencies
- P5-T2 (movimiento + observación) — cerrada · P4-T5 (CargoLocation) — cerrada
- Bloqueos OQ: ninguno — OQ-042/OQ-043/OQ-045 **resueltas v0.5** (residual derivado BR-042; sobreocupación con flag +10% solo ADMIN; `percentage` derivado)

### Files
- `cargoops-backend/src/cargo/distribution/` (controller + service + DTOs)
- `cargoops-backend/src/movements/` (reuso del motor de movimiento/observación)
- `cargoops-backend/test/distribution/segments.spec.ts`

### Implementation
1. POST: crear segmento ACTIVE (validar BR-034: Σ distribuida ≤ total; BR-035: unidad compatible) + insertar Movement + Observation.
2. PATCH: ajustar quantity/percentage (BR-037) con movimiento + observación.
3. DELETE: egreso (status EXITED, exitedAt) + movimiento + observación (BR-039).
4. Todo en transacción Prisma; errores tipados (`DISTRIBUTION_EXCEEDS_TOTAL`, `CAPACITY_EXCEEDED`, `SEGMENT_NOT_FOUND`).

### Tests
- Unit: suma distribuida > total rechazada (BR-034); capacidad excedida sin flag rechazada (BR-036/OQ-043); observación vacía rechazada (BR-006).
- Integration: POST/PATCH/DELETE generan Movement + Observation y actualizan el residual (BR-038/039).

### Validation
`npm run lint && npm run test && npm run build` en `cargoops-backend`.

### Acceptance Criteria
- [ ] POST crea segmento + movimiento + observación (201, BR-039).
- [ ] DELETE egresa el segmento (EXITED + exitedAt) y registra movimiento (BR-039).
- [ ] Historial reconstruible tras cada operación (BR-008).

### Definition of Done
- [ ] DoD §7 completo; AC verificados en CI.
```

```markdown
## Task: P5-T7 — Movimientos parciales y descarga parcial (BR-037/BR-038)

### Contexto
Hito P5-H7 (Movements, fase 5). Satisface BR-037 (mover cantidad/porcentaje ≠ 100%) y BR-038 (descarga parcial con residual en camión = totalQuantity − Σ CargoLocation activos).

### Inputs
- `docs/MASTER-SPEC.md` §7 (PARTIALLY_UNLOADED, IN_TRUCK con distribución) y ejemplos §5
- `docs/backend/VALIDATION.md` (unidades compatibles, OQ-044)

### Dependencies
- P5-T6 (transacciones de segmentos) — cerrada
- Bloqueos OQ: ninguno — OQ-042/OQ-044 **resueltas v0.5** (camión no es Location, residual derivado BR-042; sin conversión, unidades compatibles o `PERCENT`)

### Files
- `cargoops-backend/src/cargo/distribution/partial-movement.service.ts`
- `cargoops-backend/test/distribution/partial.spec.ts`

### Implementation
1. DTO de movimiento parcial: quantity y/o percentage (BR-037; OQ-045).
2. Validar unidad compatible con el segmento origen y el destino (BR-035, OQ-044): misma unidad o PERCENT; sin conversión en v1.
3. Descarga parcial: mover N de camión → ubicación; residual = totalQuantity − Σ CargoLocation activos (BR-038); si residual = 0 y sin IN_TRUCK → STORED.
4. Todo con Movement + Observation (BR-006/008).

### Tests
- Unit: mover 20 m² de Sector 3 → Sector 5 actualiza segmentos y deja historial (BR-037; ejemplo §5: Sector 3 30 m², Sector 4 30 m², Sector 5 20 m²).
- Unit: descarga parcial 036TERRA26 (60% a Sector 4 → luego 40% a Sector 5) recalcula residual (BR-038).
- Unit: unidades incompatibles (m³ vs m²) rechazadas según OQ-044.

### Validation
`npm run lint && npm run test && npm run build` en `cargoops-backend`.

### Acceptance Criteria
- [ ] Movimiento parcial con cantidad/porcentaje documentado en historial (BR-037).
- [ ] Residual en camión siempre = totalQuantity − Σ CargoLocation activos (BR-038).
- [ ] Los casos del ejemplo §5 (029TERRA26/036TERRA26) cubiertos por tests.

### Definition of Done
- [ ] DoD §7 completo; AC verificados en CI.
```

```markdown
## Task: P5-T8 — Alerta de capacidad (AlertType.CAPACITY)

### Contexto
Hito P5-H8 (Movements, fase 5). Satisface BR-036 y MASTER-SPEC §9 (alerta CAPACITY sobre occupiedCapacity derivado; umbral configurable, p. ej. 90%). Insumo del módulo alerts de PHASE 9.

### Inputs
- `docs/MASTER-SPEC.md` §9 (alertas) y §4.1 (Alert)
- `docs/backend/JOBS.md` (cuando OQ-007 defina jobs)

### Dependencies
- P4-T6 (consultas de capacidad) — cerrada · P5-T6 (segmentos) — cerrada
- Bloqueos OQ: ninguno — OQ-041/OQ-043 **resueltas v0.5** (defaults por LocationType BR-041; sobreocupación con flag +10% solo ADMIN)

### Files
- `cargoops-backend/src/alerts/capacity-alert.service.ts` (detección)
- `cargoops-backend/test/alerts/capacity.spec.ts`

### Implementation
1. Detección: para cada ubicación, occupiedCapacity ≥ umbral × capacity (unidad compatible; BR-035).
2. Regla de sobreocupación según OQ-043 (flag allowOverOccupation + auditoría + observación); jamás auto-movimiento de carga.
3. Crear Alert CAPACITY OPEN (dedupe: una OPEN por ubicación) + notificación in-app (P9).

### Tests
- Unit: Sector 4 con 80/100 m² y umbral 90% → sin alerta; con 95 m² → alerta OPEN.
- Unit: sobreocupación sin flag → sin alerta silenciosa; evento auditado.

### Validation
`npm run lint && npm run test && npm run build` en `cargoops-backend`.

### Acceptance Criteria
- [ ] Alerta CAPACITY generada al superar el umbral, sin mover carga (análogo BR-014: decisión humana).
- [ ] Sin duplicados OPEN por ubicación.
- [ ] Regla de sobreocupación documentada según OQ-043.

### Definition of Done
- [ ] DoD §7 completo; AC verificados en CI.
```

```markdown
## Task: P4-T7 — UI de distribución y ocupación (DistributionPanel + LocationOccupancyCard)

### Contexto
Hito P4-H7 (Locations, fase 4). Consume los endpoints BR-040 de P4-T6. Componentes canónicos MASTER-SPEC §11.4.

### Inputs
- `docs/MASTER-SPEC.md` §11.4 (componentes) y §10 (endpoints)
- `docs/frontend/COMPONENTS.md` · `docs/ux/SCREENS.md`

### Dependencies
- P4-T6 (consultas BR-040) — cerrada
- P1-T4 (skeleton frontend) — cerrada
- Bloqueo OQ: ninguno — OQ-045 **resuelta v0.5** (`quantity` fuente de verdad; `percentage` derivado de UI)

### Files
- `cargoops-frontend/src/features/locations/distribution-panel/` (crear)
- `cargoops-frontend/src/features/locations/location-occupancy-card/` (crear)
- `cargoops-frontend/src/services/distribution.service.ts`

### Implementation
1. DistributionPanel: al seleccionar carga → todas sus ubicaciones con cantidad/porcentaje/estado/fechas; al seleccionar ubicación → cargas con ocupación y alertas (BR-040).
2. LocationOccupancyCard: capacity, occupiedCapacity, availableCapacity, % ocupado (BR-033), estados visuales (token success/warning/danger).
3. Sin lógica de negocio en UI (BR-009/BR-016); estados loading/empty/error.

### Tests
- Component: panel renderiza la distribución M:N con datos seed §5; card refleja 80/20 m² de Sector 4.
- E2E (fase 12): navegación carga↔ubicación desde el panel.

### Validation
`npm run lint && npm run test && npm run build` en `cargoops-frontend`.

### Acceptance Criteria
- [ ] DistributionPanel muestra la distribución M:N de una carga y las cargas de una ubicación (BR-040).
- [ ] LocationOccupancyCard muestra capacidad/ocupada/disponible por unidad con estados visuales.
- [ ] 0 cambios fuera de `src/features/locations` (+ services).

### Definition of Done
- [ ] DoD §7 completo (incluye accesibilidad básica y responsive); AC verificados en CI.
```

**Cobertura BR-032…040 en estas Tasks de referencia:**

| BR | Task de referencia que la cubre |
| --- | --- |
| BR-032 (M:N vía CargoLocation) | P4-T5 |
| BR-033 (ocupación agregada por ubicación) | P4-T2 / P4-T6 |
| BR-034 (Σ distribuida ≤ total) | P5-T6 |
| BR-035 (unidades compatibles) | P4-T6 / P5-T7 |
| BR-036 (sobreocupación) | P4-T2 / P5-T8 |
| BR-037 (movimientos parciales) | P5-T7 |
| BR-038 (descarga parcial / residual) | P5-T7 |
| BR-039 (segmento → movimiento + observación) | P5-T6 |
| BR-040 (consultas de distribución) | P4-T6 / P4-T7 |

## 7. Tamaño y granularidad de las Tasks

### 7.1 Objetivo de tamaño («chico»)

| Atributo | Objetivo | Límite duro |
| --- | --- | --- |
| Esfuerzo de implementación | 0,5–1,5 días | ≤ 3 días (si supera → split, IMP-D7) |
| Alcance | Un módulo / una feature / una regla | Máximo un módulo backend O un feature frontend, nunca ambos |
| Diff | ≤ ~400 líneas (sin tests) | Revisable en ≤ 30 min |
| Cambio de contrato público | Ninguno fuera de la Task (Inputs/Dependencies lo fijan) | Sin excepción dentro de la misma fase |
| Tests | Incluidos en la misma Task | Sin tests → Task rechazada |

### 7.2 Anti-patrones de Tasks gigantes (prohibidos)

- ❌ «Implementar la aplicación completa de CargoOps»
- ❌ «Fase 3 completa» o «todos los movimientos»
- ❌ «CRUD + UI + PDF + jobs del módulo X»
- ❌ «Refactor general de la estructura» sin alcance medible
- ❌ Tareas sin Files (lista cerrada) o con Acceptance Criteria no verificables
- ❌ Tareas con lógica de negocio crítica en la UI (viola BR-009/BR-016 y STANDARDS §10)

### 7.3 Regla de split

Si al desglosar o implementar una tarea se supera el límite, se divide en subtareas `P<N>-T<k>-S<j>` (sufijo) que conservan: misma fase, misma OQ de bloqueo, dependencias entre sí, y cierre parcial verificable de cada parte (p. ej. `P10-T1-S1` servicio PDF aislado → `P10-T1-S2` contrato + tests → `P10-T1-S3` endpoint + permisos).

## 8. Ciclo de vida de una Task (orquestación)

1. **PLAN**: al abrir una fase, el orquestador genera las Tasks a partir de los hitos de `PHASES.md` (formato §6), marcando OQ de bloqueo.
2. **QUEUE**: orden topológico dentro de la fase + ventanas W-1…W-6; si existieran Tasks bloqueadas 🔴 irían a cola «bloqueadas por OQ» (IMP-006) — sin OQ abiertas en v0.5, no aplica.
3. **ASSIGN**: el orquestador asigna UNA Task por agente; sin solapamiento de archivos entre agentes (IMP-007).
4. **IMPLEMENT**: el agente lee Inputs, implementa Files, escribe Tests, valida localmente.
5. **VERIFY**: CI (lint → test → build) + revisión de Acceptance Criteria + DoD checklist (§8 de DEFINITION-OF-DONE como guía de revisión).
6. **CLOSE**: merge en la rama de feature → rama `main` (trunk-based, STANDARDS §7), changelog y actualización de documentación si el contrato cambió.
7. **Rechazo**: si falla cualquier verificación, la Task vuelve a ASSIGN con el motivo explícito; máximo 2 devoluciones antes de escalar al orquestador.

## 9. Orden de ejecución recomendado

### 9.1 Por fases (orden topológico)

1. **PHASE 1 — Foundation** (abre tras el gate de FASE 0, RMP-003): P1-T1 (tooling) → P1-T2 (skeleton backend) → P1-T3 (Prisma + seed) → P1-T4 (skeleton frontend) → P1-T5 (CI + docker-compose). Ventana W-1: PHASE 2 puede iniciar tras P1-T2/P1-T3.
2. **PHASE 2 — Auth + RBAC**: P2-T1 (auth) → P2-T2 (roles/permisos seed) → P2-T3 (guards) → P2-T4 (frontend auth) → P2-T5 (auditoría + seguridad base). No se solapa con PHASE 3 (W no: regla dura RBAC antes de operaciones).
3. **PHASE 3 ∥ PHASE 4**: paralelas (W-2). Ninguna Task tiene bloqueo por OQ (v0.5). P3: P3-T1 → P3-T2 (alta, OQ-001 resuelta → BR-002) → P3-T3 → P3-T4 → P3-T5 (trucks, OQ-003 resuelta) → P3-T6. P4: P4-T1 → P4-T2 (capacidad por unidad, OQ-009/OQ-041 resueltas → BR-041) → P4-T3 → P4-T4 (seed + UI) → P4-T5 (entidad CargoLocation + seed distribución §5, OQ-045 resuelta) → P4-T6 (consultas BR-040) → P4-T7 (DistributionPanel/LocationOccupancyCard).
4. **PHASE 5 — Movements**: P5-T1 (máquina de estados) → P5-T2 (movimiento básico) → P5-T3 (validaciones BR-004/005/035) → P5-T4 (UI parcial) → P5-T5 (reversión) → P5-T6 (transacciones de segmentos, OQ-043/OQ-045 resueltas) → P5-T7 (movimientos parciales y descarga parcial, OQ-042/OQ-044 resueltas → BR-042) → P5-T8 (alerta de capacidad, OQ-041/OQ-043 resueltas). Confirma la base de 6/7/8 (W-3).
5. **PHASE 6 ∥ 7 ∥ 8** (W-3/W-4 intercalados): P6-T1→T5 (mapa lectura, OQ-015 resuelta: estático), P7-T1→T3 (dashboard, OQ-009 resuelta), P8-T1→T3 (historial/auditoría).
6. **PHASE 9 — Alerts**: P9-T1→T4 (job de alertas, OQ-008 resuelta: días corridos 30/40; notificaciones in-app; flujo humano a Rezago).
7. **PHASE 10 ∥ 11** (W-5): P10-T1→T3 (PDF, OQ-005 resuelta: Puppeteer) y P11-T1→T4 (editor de planos, OQ-015 resuelta: **fuera de v1** → la fase se difiere).
8. **PHASE 12 — QA** (oleadas W-6: QA de 2..6 durante 7..11, QA final en 12): P12-T1→T3.
9. **PHASE 13 — Production** (regla dura 12→13): P13-T1→T4.
10. **PHASE 14 — Mobile** (futuro, RMP-007): P14-T1→T3.

### 9.2 Orden interno de una Task típica

Base/entidad → validaciones de dominio → contrato API → tests → UI consumidora → endurecimiento (loading/empty/errores/accesibilidad) → documentación de contrato si cambió. El orden interno nunca antepone UI a validaciones.

### 9.3 Prioridades

P0: fases 1–5 (operación crítica). P1: fases 6–8. P2: fases 9–11. P3: 12–13 (endurecimiento). P4: 14 (futuro). Escala RMP-002.

## 10. Estado de las OQ (impacto en Tasks)

> `docs/OPEN-QUESTIONS.md` v0.5 consolida **sin OQ abiertas**: todas las decisiones de negocio/técnicas están tomadas. Ninguna Task queda bloqueada por OQ. Esta tabla se conserva como **traza de qué OQ condicionaba cada Task** y qué regla canónica la sustituye.

| OQ | Fases afectadas | Tasks típicas afectadas | Estado / Acción |
| --- | --- | --- | --- |
| OQ-001 (unicidad de código) | 3 | P3-T2 (alta de carga) | ✅ Resuelta (v0.5) — sin bloqueo: BR-002 (`^[A-Z0-9][A-Z0-9./-]{2,31}$`, único case-insensitive) |
| OQ-002 (carga parcial) | 3, 5 | ~~P3-H2, P5-H2, P5-H4~~ | ✅ **Resuelta (v0.2)**: distribución vía CargoLocation (BR-032..040); sin CargoItem en v1 (OQ-044/045 ya resueltas — PHS-D2) |
| OQ-003 (camión↔carga) | 3, 5 | P3-T5, P5-T2 (asignación) | ✅ Resuelta (v0.5) — sin bloqueo: una carga ↔ un camión a la vez (`truckId`); N cargas por camión |
| OQ-004 (egreso/retiro) | 3, 5 | P5-H5 (hito EXIT, PHS-D3) | ✅ Resuelta (v0.5) — sin bloqueo: movimiento `EXIT` con observación obligatoria, `EXITED` terminal (BR-043) |
| OQ-005 (estrategia PDF) | 10 | P10-T1 | ✅ Resuelta (v0.5) — sin bloqueo: HTML→PDF con Chromium/Puppeteer en servicio backend (ADR-013) |
| OQ-007 (Redis/BullMQ v1) | 9, 13 | P9-T1 (job), P13-T2 | ✅ Resuelta (v0.5) — sin bloqueo: Redis + BullMQ sí en v1 (ADR-012) |
| OQ-008 (días/fecha base alerta) | 9 | P9-T1 | ✅ Resuelta (v0.5) — sin bloqueo: días corridos desde `entryDate`, alerta día 30 y segunda día 40 (BR-014/015) |
| OQ-009 (ocupación derivada `occupiedCapacity`) | 4, 7 | P4-T2, P7-T1 | ✅ Resuelta (v0.5) — sin bloqueo: pendiente OQ-041 cerrado (BR-041), umbrales 70/90 (OQ-046) |
| OQ-010 (SSR/PWA v1) | 1, 14 | P1-T4, P14-T1 | ✅ Resuelta (v0.5) — sin bloqueo: PWA mínima en v1, SSR diferido a v1.1 |
| OQ-011 (canales notificación) | 9 | P9-T3 | ✅ Resuelta (v0.5) — sin bloqueo: solo in-app en v1 (BR-019 deja EMAIL/PUSH para v1.1) |
| OQ-014 (capacidad galpón/plazoleta) | 4, 7 | P4-T2, P7-T1 | ✅ Resuelta (v0.5) — sin bloqueo: Sector/Galpón en AREA, Plazoleta en UNITS |
| OQ-015 (editor planos en v1) | 6, 11 | P6-T2, P11-T1 (RMP-D4) | ✅ Resuelta (v0.5) — sin bloqueo: mapa estático; editor fuera de v1 (RMP-D4: no hay fusión 6+11) |
| OQ-041 (unidad por defecto por LocationType) | 4, 5, 7, 9 | P4-T2, P5-T3, P5-T8, P7-T1 | ✅ Resuelta (v0.5) — sin bloqueo: defaults por tipo (BR-041) con override por ubicación |
| OQ-042 (camión como Location o residual) | 5 | P5-T7 (descarga parcial), P4-T5 (seed) | ✅ Resuelta (v0.5) — sin bloqueo: el camión NO es Location; residual = `totalQuantity − Σ segmentos` (BR-042) |
| OQ-043 (sobreocupación BR-036) | 4, 5 | P4-T2, P5-T3, P5-T6, P5-T8 | ✅ Resuelta (v0.5) — sin bloqueo: flag `allowOverOccupation`, default +10%, habilitación solo ADMIN |
| OQ-044 (conversión de unidades) | 5 | P5-T7 | ✅ Resuelta (v0.5) — sin bloqueo: sin conversión en v1; unidades compatibles o `PERCENT` |
| OQ-045 (semántica de percentage) | 4, 5 | P4-T5, P4-T6, P5-T6, P5-T7 | ✅ Resuelta (v0.5) — sin bloqueo: `quantity` es la fuente de verdad; `percentage` derivado de UI |

## 11. Criterios de aceptación de este plan

- [ ] Al abrir una fase, de cada hito de `PHASES.md` se derivan Tasks con el formato de §6 completo (IMP-003).
- [ ] Ninguna Task del repositorio supera los límites de §7 (IMP-004).
- [ ] El orden de ejecución respeta el topológico de §9.1 y las ventanas W-1…W-6 de ROADMAP.
- [ ] Las Tasks bloqueadas por OQ quedan identificadas con su ID (🔴/🟡) y no se planifican para ejecución (IMP-006) — **no aplica en v0.5** (sin OQ abiertas).
- [ ] Toda Task cerrada tiene CI verde + DoD §7 marcada + Acceptance Criteria verificados (IMP-008).
- [ ] Referencias EPIC/FEATURE/US coherentes con el backlog de W1 (`PRODUCT-BACKLOG.md`, PB-D1) y revisadas al alinear `PHASES.md` (IMP-D1 / PBQ-01).

## 12. Archivos involucrados

| Archivo | Rol |
| --- | --- |
| `docs/roadmap/IMPLEMENTATION-PLAN.md` (este) | Método y formato de Tasks; orden de ejecución |
| `docs/roadmap/PHASES.md` | Fuente de hitos/tareas P<N>-T<k> |
| `docs/roadmap/ROADMAP.md` | Dependencias/ventanas/prioridades/DoF de fase |
| `docs/DEFINITION-OF-DONE.md` | DoD por tarea (§7), funcionalidad (§6), fase (§4), release (§5) |
| `docs/STANDARDS.md` | Estándares que las Tasks deben cumplir |
| `docs/product/PRD.md` · `docs/product/PRODUCT-BACKLOG.md` (W1, PB-D1) | Trazabilidad EPIC/FEATURE/US |
| `docs/OPEN-QUESTIONS.md` | OQ-001…047 (bloqueos de Task) — **v0.5: sin OQ abiertas** |
| Repos futuros (§22) | Destino de las Tasks al implementar |

## 13. Riesgos

| # | Riesgo | Impacto | Mitigación |
| --- | --- | --- | --- |
| IMP-R1 | Desalineación de numeración: backlog W1 secuencial (PB-D1) vs `PHASES.md` phase-prefixed (PHS-D1) | Trazabilidad mixta entre tareas y requisitos hasta alinear | Usar P<N>-T<k> como ID primario; el orquestador alinea `PHASES.md` al backlog antes de abrir fase 3 (IMP-D1) |
| IMP-R2 | ~~OQ-001/004 y OQ-041/042 abiertas al llegar a fases 3/5~~ → **cerrado en v0.5** (BR-002/043/041/042): la parálisis de tareas centrales ya no aplica | — | Ninguna: el dominio canónico está fijado; si se reabre una OQ, aplica RMP-004 |
| IMP-R3 | Numeración no alineada entre `PHASES.md` (W10) y el backlog W1 (PB-D1) | Referencias cruzadas rotas en la implementación | Decisión IMP-001 + orquestador alinea `PHASES.md` antes de abrir fase 3 (IMP-D1 / PBQ-01) |
| IMP-R4 | Tasks que tocan UI+API+jobs a la vez | Diffs gigantes, revisión lenta | Regla §7.2 + serialización por módulo (IMP-007) |
| IMP-R5 | Agent amplía alcance («de paso arreglo…») | Scope creep no planificado | Files de alcance cerrado (§6 campo 5) + revisión de diff en VERIFY |
| IMP-R6 | DoD percibido como burocracia en tasks chicas | Cierre «por confianza» | Checklist §7 corta por diseño (ver DEFINITION-OF-DONE §7) |

## 14. DECISIÓN PENDIENTE

| ID | Pregunta | Impacto | Relación |
| --- | --- | --- | --- |
| IMP-D1 | W1 definió numeración **secuencial** en `PRODUCT-BACKLOG.md` (PB-D1: EPIC-001…013 / FEATURE-001…027 / US-001…045), que difiere de la propuesta phase-prefixed de `PHASES.md` (p. ej. EPIC-006=mapa vs EPIC-007=mapa). ¿El orquestador ratifica la secuencial de W1 y W10 actualiza `PHASES.md`, o se re-numera el backlog? | Todas las Tasks con metadatos EPIC/FEATURE/US | RMP-D1 / PHS-D1 / PBQ-01 / MASTER-SPEC §19 |
| IMP-D2 | ¿Se generan las Tasks de todas las fases por adelantado (plan completo estático) o fase por fase al abrirla (plan incremental)? Se recomienda incremental para absorber OQ y hallazgos de QA | Forma de trabajo del orquestador | RMP-004 |
| IMP-D3 | ¿El formato de §6 admite un campo extra «Notas de reversión» (cómo revertir la Task) para tareas con migraciones de datos? | Migraciones Prisma en fases 3–4 | MASTER-SPEC §11.2 |
| IMP-D4 | ¿Las subtareas `P<N>-T<k>-S<j>` se incluyen en el manifesto de `PHASES.md` como nivel oficial o son internas de este plan? | Consistencia de IDs entre W10 docs | PHASES §17 (PHS-D1) |