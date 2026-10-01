# CargoOps — Product Backlog (PRODUCT-BACKLOG)

> Documento de producto del grupo **W1**.
> Fuente de verdad canónica: `docs/MASTER-SPEC.md` v0.2 (dominio §4, BR §6 — incluye ampliación 0.2 BR-032…BR-040, estados §7, RBAC §8, API §10, roadmap §18, esquema de IDs §19). Pendientes centralizados: `docs/OPEN-QUESTIONS.md` (OQ-001…OQ-045).
> Idioma del contenido: español profesional/neutral. Identificadores y filenames: inglés.

---

## 0. Estado del documento

- Versión: 0.1 — 2026-09-23 · **0.2 — 2026-09-23 (ampliación §§62-70: distribución M:N — FEATURE-028…030 y US-046…053, sin renumerar lo existente)**
- Autor: Grupo W1 — Documentación de producto
- Estado: Borrador para revisión del orquestador (alineado a MASTER-SPEC v0.2)
- Regla de mantenimiento: PRD, PRODUCT-BACKLOG, USER-STORIES, USE-CASES y BUSINESS-RULES evolucionan juntos; todo cambio de alcance se refleja en los cinco.
- Numeración: secuencial canónica para PRD y backlog (`EPIC-00N` / `FEATURE-00N` / `US-00N`). Ver decisión PB-D1; la desalineación con la propuesta de `PHASES.md` quedó resuelta (PBQ-01 → ID-008, 2026-09-23: secuencial canónica ratificada).

## 1. Objetivo

Desglosar el alcance del PRD (RF-001…RF-027 y capacidades core §1.4 del MASTER-SPEC) en **epics, features y user stories** con criterios de aceptación verificables, prioridad, dependencias, notas técnicas y fase del roadmap, de modo que `roadmap/IMPLEMENTATION-PLAN.md` tenga entrada directa de planificación y QA pueda derivar casos de prueba.

## 2. Contexto

CargoOps es una plataforma web de gestión operativa de cargas y depósitos en un predio logístico/aduanero (MASTER-SPEC §1). El backlog cubre las 14 fases del roadmap (§18), desde la fundación técnica hasta QA/producción; la fase 0 (documentación) no tiene backlog de producto. Cada item hereda las decisiones canónicas: código de carga = string §4.4-1, estado separado de ubicación §4.4-2, observación como entidad §4.4-3, soft delete + auditoría + reversión §4.4-4, ubicación como abstracción única §4.4-7.

## 3. Restricciones

- No inventar reglas de negocio: solo se referencian BR-001…BR-020 y BR-032…BR-040 (canónicas, §6 — ampliación 0.2) y las propuestas marcadas `[PROPUESTA]` en `BUSINESS-RULES.md`.
- Sin placeholders vacíos: toda ambigüedad real se documenta en la sección DECISIÓN PENDIENTE con pregunta concreta.
- Los IDs de PRD se respetan 1:1 (PRD §9); los bloques FEATURE/US son la fuente de detalle de las referencias `FEATURE-xxx (US-xxx)` del PRD.
- FASE 0: solo documentación en `docs/product/`.

## 4. Dependencias

1. **Decisiones bloqueantes** (OPEN-QUESTIONS — **todas resueltas 2026-09-23/24**, ver §12): OQ-001 → BR-002 (unicidad de código → FEATURE-005), OQ-002 (carga parcial/CargoItem → FEATURE-013/BR-027), OQ-003 (camión↔carga: UN camión a la vez → FEATURE-010), OQ-004 → BR-043 (egreso → ciclo de vida/BR-028), OQ-008 → BR-014/015 (días corridos y segunda alerta → FEATURE-022), OQ-009/OQ-014 (capacidad → FEATURE-012/017/019), OQ-015 (vista estática → FEATURE-025).
2. **Decisiones de modelado W1** (a reportar): W1-Q1 (MovementKind), W1-Q2 (reversión), W1-Q5 (secuestro por rol). Ver DECISIÓN PENDIENTE.
3. **Documentos de origen:** `PRD.md` (requisitos RF), `MASTER-SPEC.md` (dominio/BR/RBAC/fases), `ROADMAP.md` y `PHASES.md` (secuenciación), `OPEN-QUESTIONS.md` (OQ).
4. **Consumidores:** `USER-STORIES.md`, `USE-CASES.md`, `BUSINESS-RULES.md`, `roadmap/IMPLEMENTATION-PLAN.md`, `qa/*`.

## 5. Decisiones de este documento

| # | Decisión |
| --- | --- |
| PB-D1 | Numeración secuencial `EPIC-001…013` / `FEATURE-001…027` / `US-001…045`, continuando la convención ya usada por el PRD (PRD §9). NO se adopta la propuesta phase-prefixed de `PHASES.md` (PHS-D1/RMP-D1) para no romper las referencias del PRD; se reporta para alineación. |
| PB-D2 | EPIC-001 = Fundación (Fase 1), coincidiendo con PHASES.md; EPIC-002 = Auth+RBAC (Fase 2) también coincide. La divergencia con PHASES.md empieza en EPIC-004 (ver PBQ-01). |
| PB-D3 | EPIC-013 = Configuración del sistema (usuarios/roles/parámetros) agrupa FEATURE-026/027 que el PRD no referencia (US-044/045); no altera ningún ID referenciado por el PRD. |
| PB-D4 | FEATURE-018 (US-030/031) completa el hueco de numeración del PRD entre FEATURE-017 y FEATURE-019 con capacidad "mapa → detalle", coherente con las consultas operacionales de §1.4. |
| PB-D5 | Prioridades según escala RMP-002: P0 (valor operativo crítico), P1 (alta), P2 (media), P3 (endurecimiento/QA). Fases canónicas §18 del MASTER-SPEC. |
| PB-D6 | Ampliación 0.2 (secciones 62-70): FEATURE-028…030 y US-046…053 agregan distribución M:N (CargoLocation), capacidad por unidad, movimientos/descarga parciales, sobreocupación administrativa (OQ-043) y alerta de capacidad, **sin renumerar nada existente** (ID-008 resuelta 2026-09-23: secuencial canónica ratificada — ver PBQ-01). |

## 6. Índice de Epics

| ID | Nombre | Fase | Prioridad | Dependencias | Objetivo |
| --- | --- | --- | --- | --- | --- |
| EPIC-001 | Fundación y plataforma base | 1 | P0 | — | Base técnica común (backend, frontend, DB, CI, seeds). |
| EPIC-002 | Autenticación + RBAC | 2 | P0 | EPIC-001 | Login JWT + refresh y 3 roles con permisos en backend (BR-009). |
| EPIC-003 | Gestión de cargas | 3 | P0 | EPIC-002 | Alta, consulta, búsqueda y notas de cargas (BR-001/002/013). |
| EPIC-004 | Camiones | 3 | P0 | EPIC-002 (OQ-003) | Registro de camiones y asociación camión↔carga. |
| EPIC-005 | Ubicaciones y capacidad | 4 | P0 | EPIC-001/002 (OQ-009/014) | CRUD de ubicaciones, capacidad por unidad y ocupación derivada; distribución M:N de cargas (BR-004/005/032…036, 040). |
| EPIC-006 | Movimientos y observaciones | 5 | P0 | EPIC-003/004/005 | Máquina de estados, descargas (incl. parcial con residual), áreas especiales, observación obligatoria, movimientos parciales, reversión (BR-003…008, 016, 037/038). |
| EPIC-007 | Mapa operativo | 6 | P1 | EPIC-005/002 | Plano SVG de solo lectura con ocupación y navegación (BR-020). |
| EPIC-008 | Dashboard | 7 | P1 | EPIC-003/004/005 | KPIs, ocupación, alertas abiertas, últimos movimientos. |
| EPIC-009 | Historial y auditoría | 8 | P1 | EPIC-006/002 | Timeline reconstructible y auditoría consultable (BR-008/012/013/017). |
| EPIC-010 | Alertas y rezago | 9 | P2 | EPIC-006/008 (OQ-008) | Alerta 30 días sin auto-movimiento y gestión del ciclo (BR-014/015). |
| EPIC-011 | Exportación PDF | 10 | P2 | EPIC-009/003/002 | PDF por rol sin exposición de datos no autorizados (BR-018, OQ-005). |
| EPIC-012 | Editor de planos | 11 | P2 | EPIC-007/005/002 (OQ-015) | Edición ADMIN del plano con datos estructurados y auditoría (BR-020, BR-011/012). |
| EPIC-013 | Configuración del sistema | 11 | P2 | EPIC-002 | Parámetros operativos y administración de usuarios/roles. |

## 7. Detalle de Features

### EPIC-001 — Fundación (Fase 1)

**FEATURE-001 — Base técnica y estándares** · P0 · US: US-001, US-002
- **Criterios de aceptación:** [ ] repos con TypeScript strict + ESLint + Prettier + Conventional Commits (§15) · [ ] CI lint→test→build verde en main · [ ] docker-compose dev levanta backend+frontend+PostgreSQL · [ ] GET /api/v1/health responde 200 con envelope estándar (§10).
- **Dependencias:** decisión de repos (RMP-D2). **Notas técnicas:** scaffolding según PHASES P1-H1/P1-H2/P1-H5; ADR-002/003/004/005 como fuentes; OQ-010 solo afecta flags PWA/SSR.

**FEATURE-002 — Skeleton de aplicación y datos de referencia** · P0 · US: US-003
- **Criterios de aceptación:** [ ] schema Prisma base (§4.1) con migración aplicable · [ ] seed reproducible con las 17 ubicaciones de §5 (Plazoleta, Sectores 1–12, Scanner, Balanza, Rezago, Secuestro) · [ ] frontend Angular standalone con estructura core/shared/features (§11.4) y design tokens iniciales.
- **Dependencias:** FEATURE-001. **Notas técnicas:** seed de cargas de ejemplo §5 solo para documentación/pruebas (PRD R-08); estructura modular backend §11.3.

### EPIC-002 — Autenticación + RBAC (Fase 2)

**FEATURE-003 — Autenticación JWT + refresh** · P0 · US: US-004, US-005
- **Criterios de aceptación:** [ ] login/refresh/logout funcionan (ADR-008) · [ ] refresh rota tokens y la sesión expira · [ ] rate limiting en login · [ ] auditoría LOGIN/LOGOUT (AuditAction).
- **Dependencias:** EPIC-001. **Notas técnicas:** módulo `auth`; passwords con hash; almacenamiento seguro de tokens en frontend; guards backend (JwtAuthGuard) + interceptor frontend.

**FEATURE-004 — RBAC por permisos** · P0 · US: US-006, US-007
- **Criterios de aceptación:** [ ] matriz de roles §8 aplicada 1:1 en seeds y tests (BR-010/011/012) · [ ] backend rechaza sin permiso con 403 (BR-009) · [ ] guards de frontend solo ocultan UX, nunca autorizan.
- **Dependencias:** FEATURE-003. **Notas técnicas:** Permissions con codes tipo `cargo.create` (§4.1); módulos `users`, `roles`, `permissions`; ADR-009; PermissionsGuard.

### EPIC-003 — Gestión de cargas (Fase 3)

**FEATURE-005 — Registro de cargas** · P0 · US: US-008, US-009
- **Criterios de aceptación:** [ ] carga sin código rechazada 422 (BR-001) · [ ] código duplicado rechazado según OQ-001 → BR-002 (resuelta 2026-09-23, 409) · [ ] estado inicial REGISTERED + entryDate persistidas · [ ] auditoría CREATE con createdById · [ ] soft delete desde el alta (BR-013, ADR-011).
- **Dependencias:** EPIC-002, OQ-001 (**resuelta → BR-002**). **Notas técnicas:** código = string nunca entero (§4.4-1); estado separado de ubicación (§4.4-2); `POST /api/v1/cargos` (§10); observación obligatoria en el alta (BR-006/OQ-022; la "observación inicial opcional" de PHASES queda descartada).

**FEATURE-006 — Consulta y detalle de cargas** · P0 · US: US-010, US-011
- **Criterios de aceptación:** [ ] listado con filtros básicos (code, status, locationId, truckId) y paginación §10 · [ ] detalle con estado, ubicación, fechas y observaciones · [ ] Viewer consulta, Operator crea (BR-010) · [ ] estados loading/empty correctos.
- **Dependencias:** FEATURE-005. **Notas técnicas:** endpoints `GET /api/v1/cargos`, `GET /api/v1/cargos/:id`; componentes CargoTable/CargoSearch/CargoDetail (§11.4).

**FEATURE-007 — Búsqueda avanzada** · P1 (SHOULD, RF-019) · US: US-012
- **Criterios de aceptación:** [ ] filtros combinados estado+ubicación+fechas · [ ] ordenamiento y paginación · [ ] resultados consistentes con los datos operativos.
- **Dependencias:** FEATURE-006. **Notas técnicas:** `sort`/`filter` según §10; CargoFilters.

**FEATURE-008 — Notas de carga sin movimiento** · P1 (SHOULD, RF-020) · US: US-013
- **Criterios de aceptación:** [ ] nota opcional vinculada a cargoId sin generar movimiento (Observation) · [ ] visible en detalle e historial de observaciones · [ ] permisos por rol (solo Operator+ crean).
- **Dependencias:** FEATURE-006. **Notas técnicas:** Observation con movementId NULL (§4.1/§4.4-3).

### EPIC-004 — Camiones (Fase 3)

**FEATURE-009 — Registro de camiones** · P0 · US: US-014
- **Criterios de aceptación:** [ ] alta con patente obligatoria y única · [ ] CRUD con soft delete (BR-013) · [ ] no se elimina un camión con cargas activas (BR-024 [PROPUESTA]) · [ ] auditoría CREATE/UPDATE/DELETE.
- **Dependencias:** EPIC-002, OQ-003. **Notas técnicas:** módulo `trucks`; entidad Truck §4.1 (plate, brand, model, driverName?).

**FEATURE-010 — Asociación camión↔carga** · P0 · US: US-015
- **Criterios de aceptación:** [ ] 1 camión puede transportar N cargas (relación §4.2) · [ ] una carga asociada a un único camión a la vez · [ ] validación de estados permitidos para la asociación (flujo de ingreso) · [ ] consulta de ocupación del camión.
- **Dependencias:** FEATURE-009, OQ-003 (**resuelta**). **Notas técnicas:** v1 sin split de una carga en varios camiones (§4.4-6); OQ-003 resuelta (2026-09-24): una carga = UN camión a la vez — sin multi-camión por carga.

### EPIC-005 — Ubicaciones y capacidad (Fase 4)

**FEATURE-011 — Administración de ubicaciones** · P0 · US: US-016
- **Criterios de aceptación:** [ ] CRUD de Location solo ADMIN (BR-011/012) · [ ] estados ACTIVE/INACTIVE/MAINTENANCE · [ ] cambios auditados · [ ] Operator/Viewer consultan sin modificar · [ ] LocationType canónico §4.3.
- **Dependencias:** EPIC-002. **Notas técnicas:** Location = abstracción única (§4.4-7); módulo `locations`; BR-004 validado por el servicio de dominio para uso de movements (PHASES P4-H3).

**FEATURE-012 — Capacidad y ocupación** · P0 · US: US-017, US-018
- **Criterios de aceptación:** [ ] `capacity`/`capacityUnit` configurable por ubicación (OQ-041) · [ ] CapacityCalculator con occupiedCapacity derivado (Σ segmentos activos en unidad compatible, BR-033/035) · [ ] 0 movimientos que excedan `capacity` (BR-005) · [ ] UNLIMITED sin tope · [ ] auditoría CAPACITY_CHANGE.
- **Dependencias:** FEATURE-011, OQ-009, OQ-014. **Notas técnicas:** CapacityIndicator (§11.4); cálculo transaccional con el movimiento (BR-030 [PROPUESTA]); la Plazoleta y su tope de camiones: OQ-014 resuelta (2026-09-24) — limitada en **UNITS/camiones**.

### EPIC-006 — Movimientos y observaciones (Fase 5)

**FEATURE-013 — Mover y descargar cargas** · P0 · US: US-019, US-020, US-021
- **Criterios de aceptación:** [ ] transiciones de estado validadas por máquina de estados §7 en backend (BR-016) · [ ] carga inexistente rechazada (BR-003) · [ ] destino inactivo rechazado (BR-004) · [ ] capacidad no excedida (BR-005) · [ ] observación obligatoria (BR-006/007) · [ ] historial insertado en todo movimiento (BR-008) · [ ] IN_TRANSIT transitorio · [ ] descarga parcial con quantity/quantityMoved (BR-027 [PROPUESTA], OQ-002).
- **Dependencias:** EPIC-003, EPIC-005, OQ-002, OQ-004. **Notas técnicas:** `POST /api/v1/cargos/:id/movements` (§10); MovementKind §4.3 — v1 puede reducirse a MOVE + razones tipadas (W1-Q1); módulos `movements`, `observations`.

**FEATURE-014 — Áreas especiales (Scanner, Balanza, Rezago, Secuestro)** · P0 · US: US-022, US-023, US-024
- **Criterios de aceptación:** [ ] transiciones tipadas TO_SCANNER/TO_BALANZA/TO_REZAGO/TO_SECUESTRO (§4.3) · [ ] cada transición con observación e historial · [ ] permisos por rol (secuestro según W1-Q5) · [ ] estado IN_REVIEW coherente con scanner/balanza (§7).
- **Dependencias:** FEATURE-013, W1-Q5. **Notas técnicas:** Rezago y Secuestro como ubicaciones + estados; W1-Q5: si Operator no mueve a Secuestro, FEATURE-024 queda exclusiva de ADMIN.

**FEATURE-015 — Observación obligatoria** · P0 · US: US-025, US-026
- **Criterios de aceptación:** [ ] movimiento/estado sin observación rechazado 422 (BR-006/007) · [ ] observación no vacía ni solo espacios (BR-031 [PROPUESTA]) · [ ] relación Movement 1:1 Observation (§4.2) · [ ] texto visible en el historial.
- **Dependencias:** FEATURE-013. **Notas técnicas:** ObservationDialog con preselección de motivos comunes (mitiga R-04 del PRD); observación = entidad propia (§4.4-3); búsqueda por observaciones en el futuro.

**FEATURE-016 — Reversión de movimientos** · P0 · US: US-027
- **Criterios de aceptación:** [ ] solo ADMIN (BR-012) · [ ] el historial original se conserva (REVERSION + AuditAction.REVERT) · [ ] observación obligatoria en la reversión · [ ] alcance según W1-Q2 (último movimiento o cualquiera) · [ ] nunca hard delete (BR-013).
- **Dependencias:** FEATURE-013, W1-Q2. **Notas técnicas:** reversionOfId/reversedById/reversedAt (§4.1); ADR-010/011; PHASES P5-H5 y P8-H3.

### EPIC-007 — Mapa operativo (Fase 6)

**FEATURE-017 — Mapa operativo SVG (solo lectura)** · P1 · US: US-028, US-029
- **Criterios de aceptación:** [ ] render de las 17 ubicaciones desde datos estructurados (BR-020, ADR-006) · [ ] zoom, pan, hover y selección · [ ] ocupación visible (CapacityIndicator) · [ ] accesibilidad: teclado, ARIA, alternativa listado (WCAG 2.2 AA, §12) · [ ] sin degradación perceptible con ~50 ubicaciones (PHASE 12).
- **Dependencias:** EPIC-005, EPIC-002, OQ-041 (ocupación). **Notas técnicas:** `GET /api/v1/maps` + `GET /api/v1/locations` (§10); mapa NO depende solo del color (§13); capas/memoización/lazy (§11.5).

**FEATURE-018 — Mapa → detalle (ubicación y carga)** · P1 · US: US-030, US-031
- **Criterios de aceptación:** [ ] selección de ubicación muestra ocupación y estado · [ ] clic en carga navega a CargoDetail · [ ] listado alternativo accesible permite el mismo drill-down.
- **Dependencias:** FEATURE-017, FEATURE-006. **Notas técnicas:** completa las consultas operacionales de §1.4 (PRD §8: EPIC-007); reutiliza enrutamiento de Angular.

### EPIC-008 — Dashboard (Fase 7)

**FEATURE-019 — Dashboard operativo** · P1 · US: US-032, US-033
- **Criterios de aceptación:** [ ] `GET /api/v1/dashboard` con agregaciones correctas contra datos reales · [ ] KPIs: cargas por estado, ocupación por ubicación, alertas OPEN, últimos movimientos · [ ] refresh manual · [ ] Viewer consulta sin acciones (BR-010) · [ ] loading/empty correctos.
- **Dependencias:** EPIC-003, EPIC-005, EPIC-006, OQ-009. **Notas técnicas:** los cálculos viven en backend (no lógica crítica en UI, PHASES P7-H1); reutiliza CapacityCalculator.

### EPIC-009 — Historial y auditoría (Fase 8)

**FEATURE-020 — Historial de movimientos** · P1 · US: US-034
- **Criterios de aceptación:** [ ] timeline reconstruible al 100 % desde movements (BR-008) · [ ] orden cronológico (reverso) con estados y observaciones · [ ] `GET /api/v1/cargos/:id/movements` (§10) · [ ] visible por rol Viewer+.
- **Dependencias:** EPIC-006. **Notas técnicas:** MovementTimeline (§11.4); incluye reversiones (REVERSION) y egreso futuro (OQ-004).

**FEATURE-021 — Auditoría** · P1 · US: US-035, US-036
- **Criterios de aceptación:** [ ] acciones sensibles auditadas (AuditAction §4.3, BR-013) · [ ] `GET /api/v1/audit` con filtros entidad/acción/usuario/fecha y paginación · [ ] solo ADMIN consulta · [ ] sin datos sensibles innecesarios: IP/userAgent equilibrados con privacidad (BR-017).
- **Dependencias:** EPIC-002, EPIC-006. **Notas técnicas:** ADR-010; AuditLog polimórfico entityName+entityId (§4.2); interceptor/servicio de captura (PHASES P8-H1).

### EPIC-010 — Alertas y rezago (Fase 9)

**FEATURE-022 — Alerta de permanencia > 30 días** · P2 · US: US-037, US-038
- **Criterios de aceptación:** [ ] job periódico detecta permanencia > 30 días desde entryDate (BR-014/015) · [ ] genera alerta STALE_30D OPEN sin mover la carga (BR-014) · [ ] job idempotente (BR-026 [PROPUESTA]) · [ ] umbral y fecha base configurables (futuro, BR-015) · [ ] visible en dashboard y en la carga (§9).
- **Dependencias:** EPIC-006, EPIC-008, OQ-008, OQ-007. **Notas técnicas:** módulo `alerts` + `notifications` in-app (OQ-011); jobs con BullMQ según OQ-007 (ADR-012); flujo humano a Rezago integrado con movements (UC-010).

**FEATURE-023 — Gestión del ciclo de vida de alertas** · P2 · US: US-039
- **Criterios de aceptación:** [ ] transiciones OPEN→ACKNOWLEDGED→RESOLVED/DISMISSED (§4.3) por rol · [ ] notificación in-app al crear la alerta (OQ-011) · [ ] AlertCard navega a la carga · [ ] auditoría de cambios de estado de alerta.
- **Dependencias:** FEATURE-022. **Notas técnicas:** solo in-app en v1 mientras OQ-011 no resuelva canales externos; AlertCard (§11.4).

### EPIC-011 — Exportación PDF (Fase 10)

**FEATURE-024 — Exportación PDF de carga** · P2 · US: US-040, US-041
- **Criterios de aceptación:** [ ] `POST /api/v1/cargos/:id/export-pdf` (§10, OQ-017) genera PDF en backend · [ ] solo datos autorizados por rol (BR-018) · [ ] exportación denegada sin permiso (403) · [ ] errores tipados con envelope §10 · [ ] PdfExportButton con estados de descarga/retry.
- **Dependencias:** EPIC-009, EPIC-003, EPIC-002, OQ-005. **Notas técnicas:** servicio backend especializado (ADR-013); alcance del PDF según W1-Q8 (detalle vs listados); PDF nunca generado en cliente (PHASES P10-H1).

### EPIC-012 — Editor de planos (Fase 11)

**FEATURE-025 — Editor de planos (ADMIN)** · P2 · US: US-042, US-043
- **Criterios de aceptación:** [ ] solo ADMIN (BR-011/012) · [ ] drag/resize/snap/grid sobre el motor SVG (ADR-006) · [ ] panel de propiedades (nombre, código, tipo, capacidad, color, estado) · [ ] `PATCH /api/v1/maps/:id` con versionado · [ ] preview antes de persistir · [ ] auditoría MAP_EDIT · [ ] estructura de datos BR-020 intacta.
- **Dependencias:** EPIC-007, EPIC-005, EPIC-002, OQ-015. **Notas técnicas:** Map/MapElement (zIndex, rotation, properties JSONB §4.1); OQ-015 resuelta (2026-09-24): **editor fuera de v1** — vista estática + edición asistida (PRD R-06 cerrado).

### EPIC-013 — Configuración del sistema (Fase 11)

**FEATURE-026 — Parámetros del sistema** · P2 · US: US-044
- **Criterios de aceptación:** [ ] solo ADMIN modifica (BR-011) · [ ] parámetros: días hasta alerta de rezago, fecha base de permanencia, unidades por defecto · [ ] cambios auditados y con historial · [ ] defaults canónicos aplicados (30 días, entryDate — BR-014/015).
- **Dependencias:** EPIC-002, OQ-008. **Notas técnicas:** módulo `settings` (§11.3); deja preparada la configuración de "segunda alerta" (OQ-008).

**FEATURE-027 — Administración de usuarios y roles** · P2 · US: US-045
- **Criterios de aceptación:** [ ] ADMIN crea/edita/desactiva usuarios y asigna rol (§8) · [ ] usuario inactivo no inicia sesión · [ ] cambios auditados (PERMISSION_CHANGE) · [ ] soft delete (BR-013).
- **Dependencias:** EPIC-002. **Notas técnicas:** módulos `users`, `roles`, `permissions`; fuera de alcance: gestión avanzada de usuarios/multi-tenant (PRD §7.2).

### Ampliación 0.2 — Distribución M:N (secciones 62-70): FEATURE-028…030

**FEATURE-028 — Distribución multi-ubicación de carga (CargoLocation)** · EPIC-005 · P0 · US: US-046, US-047, US-048
- **Criterios de aceptación:** [ ] una carga se distribuye en N ubicaciones vía `CargoLocation` sin `cargo.locationId` único (BR-032) · [ ] consulta de todas las ubicaciones de una carga con cantidad/porcentaje/estado/enteredAt/exitedAt e historial (BR-040; `GET /api/v1/cargos/:id/locations`) · [ ] consulta de todas las cargas de una ubicación con ocupación total, disponible, cantidad, alertas y próximas a 30 días (BR-033/040; `GET /api/v1/locations/:id/cargos` y `/capacity`) · [ ] panel de distribución en detalle de carga y de ubicación (DistributionPanel, §11.4) · [ ] semántica de `percentage` según OQ-045 → BR-049 (resuelta: derivado de UI).
- **Dependencias:** FEATURE-006, FEATURE-011, OQ-045. **Notas técnicas:** entidad CargoLocation §4.1; una fila `ACTIVE` por (cargo, location) (§4.2); endpoints §10; seed §5: 029TERRA26 → Sector 3 20 m² + Sector 4 35 m² (total 55 m²).

**FEATURE-029 — Movimiento y descarga parciales** · EPIC-006 · P0 · US: US-049, US-050
- **Criterios de aceptación:** [ ] movimiento parcial por cantidad o porcentaje sin mover el 100 % (BR-037) · [ ] ajuste de segmentos CargoLocation origen/destino con historial y observación (BR-006/008/039) · [ ] descarga parcial con residual en camión = `totalQuantity − Σ CargoLocation` activos (BR-038) · [ ] exceso sobre el total rechazado con `DISTRIBUTION_EXCEEDS_TOTAL` (BR-034) y unidades incompatibles con `UNIT_INCOMPATIBLE` (BR-035) · [ ] estados coherentes `PARTIALLY_UNLOADED`/`STORED` (§7).
- **Dependencias:** FEATURE-013, FEATURE-028, OQ-042, OQ-044. **Notas técnicas:** el movimiento parcial vincula CargoLocation de origen/destino (§4.2); seeds §5: MOVE 20 m² de 029TERRA26 (Sector 3 → Sector 5) y descarga escalonada de 036TERRA26 (camión 40 % → Sector 4 60 % → Sector 5 40 %); ¿camión como Location o residual derivado? **OQ-042 → resuelta (BR-042: residual derivado)**.

**FEATURE-030 — Capacidad por unidad, sobreocupación y alerta de capacidad** · EPIC-005 · P0 · US: US-051, US-052, US-053
- **Criterios de aceptación:** [ ] capacidad de ubicación por unidad con `occupiedCapacity`/`availableCapacity` derivados de Σ CargoLocation activos en unidad compatible (BR-033/035) · [ ] rechazo de sobreocupación al mover/distribuir (`CAPACITY_EXCEEDED`, BR-005/036) · [ ] sobreocupación administrativa con flag `allowOverOccupation` + auditoría + observación, según OQ-043 → BR-036 ampliada (resuelta 2026-09-24) · [ ] alerta de capacidad derivada (`CAPACITY`, umbral configurable §9) sobre `occupiedCapacity` · [ ] CapacityIndicator refleja unidad (ocupado/disponible).
- **Dependencias:** FEATURE-012, FEATURE-028, OQ-041, OQ-043 (**resueltas → BR-041 / BR-036 ampliada**). **Notas técnicas:** unidad por defecto por LocationType según OQ-041 → BR-041 (Sector/Galpón AREA, Plazoleta UNITS); seed §5: Sector 4 (capacity 100 m²) → ocupado 80 m², disponible 20 m²; flag `allowOverOccupation` en Location §4.1; la alerta integra EPIC-010 (FEATURE-022/023).

## 8. Detalle de User Stories

### EPIC-001 — Fundación (Fase 1)

**US-001 — Entorno de desarrollo reproducible**
_Como desarrollador, quiero un entorno local reproducible (docker-compose + migraciones Prisma aplicables), para arrancar sin sorpresas de configuración._
- **AC:** [ ] `docker-compose up` levanta postgres+backend+frontend · [ ] `npx prisma migrate deploy` aplica el schema §4.1 · [ ] documentación de arranque en cada repo.
- **Prioridad:** P0 · **Dependencias:** FEATURE-001 · **Fase:** 1 · **Notas técnicas:** PHASES P1-T3/P1-T5.

**US-002 — Estándares y CI base**
_Como desarrollador, quiero lint/format/strict y CI verdes desde el primer commit, para mantener calidad sostenible._
- **AC:** [ ] `npm run lint` y `format --check` verdes · [ ] pipeline CI lint→test→build verde en main · [ ] TypeScript strict en ambos repos.
- **Prioridad:** P0 · **Dependencias:** FEATURE-001 · **Fase:** 1 · **Notas técnicas:** §15 + STANDARDS (W10).

**US-003 — Datos de referencia precargados**
_Como Admin, quiero el sistema con las 17 ubicaciones del predio precargadas, para operar sin configuración manual previa._
- **AC:** [ ] seed reproduce Plazoleta, Sectores 1–12, Scanner, Balanza, Rezago, Secuestro (§5) · [ ] cada ubicación con tipo y estado ACTIVE · [ ] cargas de ejemplo marcadas como no operativas (PRD R-08).
- **Prioridad:** P0 · **Dependencias:** FEATURE-002 · **Fase:** 1 · **Notas técnicas:** LocationType §4.3; unidad de capacidad canónica (OQ-041 resuelta → BR-041: Sector/Galpón AREA, Plazoleta UNITS).

### EPIC-002 — Autenticación + RBAC (Fase 2)

**US-004 — Iniciar sesión**
_Como usuario del predio, quiero iniciar sesión de forma segura y mantenerla activa, para operar sin reingresar credenciales continuamente._
- **AC:** [ ] login con usuario/contraseña devuelve JWT access+refresh (ADR-008) · [ ] refresh rota tokens sin re-login · [ ] intentos fallidos limitados (rate limit) · [ ] auditoría LOGIN.
- **Prioridad:** P0 · **Dependencias:** FEATURE-003 · **Fase:** 2 · **Notas técnicas:** `POST /api/v1/auth/login` y `/refresh` (§10).

**US-005 — Cierre de sesión y expiración**
_Como usuario, quiero cerrar sesión y que la sesión expire, para proteger el acceso a datos operativos._
- **AC:** [ ] logout invalida la sesión · [ ] refresh expirado fuerza nuevo login · [ ] auditoría LOGOUT · [ ] UI sin datos residuales de la sesión anterior.
- **Prioridad:** P0 · **Dependencias:** FEATURE-003 · **Fase:** 2 · **Notas técnicas:** almacenamiento seguro de tokens; interceptor de 401.

**US-006 — Viewer de solo lectura**
_Como Viewer, quiero consultar dashboard, cargas, mapa e historial sin poder crear/mover/editar, para ejercer un rol de monitoreo._
- **AC:** [ ] todas las consultas disponibles (BR-010) · [ ] acciones de escritura ocultas en UI y rechazadas en backend (403, BR-009) · [ ] exportaciones autorizadas disponibles.
- **Prioridad:** P0 · **Dependencias:** FEATURE-004 · **Fase:** 2 · **Notas técnicas:** matriz §8; guards frontend solo UX.

**US-007 — Operator sin acciones administrativas**
_Como Operator, quiero operar el día a día sin acceso a acciones administrativas, para no alterar configuración crítica._
- **AC:** [ ] crear/mover/cambiar estados/observar habilitados · [ ] eliminar definitivo, restaurar, revertir, planos y configuración denegados (BR-011).
- **Prioridad:** P0 · **Dependencias:** FEATURE-004 · **Fase:** 2 · **Notas técnicas:** permisos granulares tipo `cargo.create`, `movement.create`, `map.edit` (§4.1).

### EPIC-003 — Gestión de cargas (Fase 3)

**US-008 — Crear carga con código**
_Como Operator, quiero registrar una carga con su código alfanumérico y fecha de ingreso, para tener trazabilidad desde el ingreso._
- **AC:** [ ] carga creada en estado REGISTERED con entryDate · [ ] código string con formato heterogéneo aceptado (§4.4-1) · [ ] auditoría CREATE · [ ] visible en listado/detalle.
- **Prioridad:** P0 · **Dependencias:** FEATURE-005, OQ-001 · **Fase:** 3 · **Notas técnicas:** BR-001/002; `POST /api/v1/cargos` (§10).

**US-009 — Rechazo de carga inválida**
_Como Operator, quiero recibir errores claros al registrar una carga sin código o duplicada, para no crear registros inválidos._
- **AC:** [ ] código vacío → 422 con mensaje accionable (BR-001) · [ ] duplicado según OQ-001 → 409 (BR-002) · [ ] sin registros parciales en la base.
- **Prioridad:** P0 · **Dependencias:** FEATURE-005, OQ-001 · **Fase:** 3 · **Notas técnicas:** envelope de error §10.

**US-010 — Consultar detalle de carga**
_Como Viewer/Operator, quiero ver el detalle de una carga (estado, ubicación, fechas, observaciones), para conocer su situación al instante._
- **AC:** [ ] detalle con CargoStatus, ubicación actual, entryDate, truckId? , observaciones · [ ] acceso por rol Viewer+ · [ ] timeline disponible (Fase 8).
- **Prioridad:** P0 · **Dependencias:** FEATURE-006 · **Fase:** 3 · **Notas técnicas:** CargoDetail (§11.4); estado separado de ubicación (§4.4-2).

**US-011 — Listar cargas con filtros básicos**
_Como Viewer, quiero listar cargas con filtros y paginación, para encontrar información sin conocer el código exacto._
- **AC:** [ ] filtros code/status/locationId/truckId · [ ] paginación con meta §10 · [ ] estados loading/empty.
- **Prioridad:** P0 · **Dependencias:** FEATURE-006 · **Fase:** 3 · **Notas técnicas:** CargoTable/CargoSearch.

**US-012 — Búsqueda avanzada combinada**
_Como Operator/Viewer, quiero combinar estado, ubicación y fechas en una búsqueda, para acotar listados operativos grandes._
- **AC:** [ ] combinación de filtros correcta · [ ] orden y paginación · [ ] resultados consistentes con datos reales.
- **Prioridad:** P1 · **Dependencias:** FEATURE-007 · **Fase:** 3 · **Notas técnicas:** RF-019; `filter`/`sort` §10.

**US-013 — Nota de carga sin movimiento**
_Como Operator, quiero agregar una observación a una carga sin generar movimiento, para documentar novedades menores._
- **AC:** [ ] nota persistida vinculada a cargoId · [ ] no inserta historial de movimiento · [ ] visible en detalle · [ ] solo Operator+ crean.
- **Prioridad:** P1 · **Dependencias:** FEATURE-008 · **Fase:** 3 · **Notas técnicas:** Observation.movementId NULL (§4.1).

### EPIC-004 — Camiones (Fase 3)

**US-014 — Registrar camión**
_Como Operator, quiero registrar un camión con patente y datos básicos, para vincular las cargas que ingresan al predio._
- **AC:** [ ] patente obligatoria y única · [ ] brand/model/driverName opcionales · [ ] soft delete sin cargas activas (BR-024 [PROPUESTA]) · [ ] auditoría.
- **Prioridad:** P0 · **Dependencias:** FEATURE-009, OQ-003 · **Fase:** 3 · **Notas técnicas:** Truck §4.1; módulo `trucks`.

**US-015 — Asociar cargas a un camión**
_Como Operator, quiero asociar una o varias cargas a un camión, para saber qué transporta cada vehículo._
- **AC:** [ ] N cargas por camión (§4.4-6) · [ ] una carga en un solo camión a la vez · [ ] validación de estados (solo ingreso/permanencia en camión) · [ ] ocupación del camión consultable.
- **Prioridad:** P0 · **Dependencias:** FEATURE-010, OQ-003 · **Fase:** 3 · **Notas técnicas:** split multi-camión fuera de v1 (§4.4-6, OQ-003).

### EPIC-005 — Ubicaciones y capacidad (Fase 4)

**US-016 — Gestionar ubicaciones**
_Como Admin, quiero crear/editar/desactivar ubicaciones del predio, para reflejar la configuración real del depósito._
- **AC:** [ ] CRUD solo ADMIN (BR-011/012) · [ ] estados ACTIVE/INACTIVE/MAINTENANCE · [ ] cambios auditados · [ ] consulta abierta a Viewer/Operator.
- **Prioridad:** P0 · **Dependencias:** FEATURE-011 · **Fase:** 4 · **Notas técnicas:** BR-004 protege el uso; x/y/width/height ya en el modelo para el mapa (PHASES P4-H1).

**US-017 — Configurar capacidad**
_Como Admin, quiero configurar la capacidad de cada ubicación (unidades/pallets/ton/m³/superficie), para que el sistema controle la ocupación._
- **AC:** [ ] Capacidad por unidad configurable por ubicación (§4.3 · OQ-041 → BR-041 resuelta) · [ ] valores validados (positivos, consistencia con tipo) · [ ] auditoría CAPACITY_CHANGE · [ ] fórmula de ocupación derivada según OQ-041/OQ-044 (resueltas → BR-041/BR-048).
- **Prioridad:** P0 · **Dependencias:** FEATURE-012, OQ-009, OQ-014 · **Fase:** 4 · **Notas técnicas:** CapacityCalculator (PHASES P4-T2).

**US-018 — Ver ocupación antes de mover**
_Como Operator, quiero ver la ocupación actual de cada ubicación antes de mover carga, para elegir destinos con espacio disponible._
- **AC:** [ ] indicador de ocupación por ubicación (CapacityIndicator) · [ ] destinos a capacidad completa rechazados al mover (BR-005) · [ ] actualización en tiempo real tras cada movimiento.
- **Prioridad:** P0 · **Dependencias:** FEATURE-012 · **Fase:** 4 · **Notas técnicas:** `occupiedCapacity` derivado (§4.1); BR-030 [PROPUESTA] transaccional.

### EPIC-006 — Movimientos y observaciones (Fase 5)

**US-019 — Mover carga entre ubicaciones**
_Como Operator, quiero mover una carga registrando el motivo, para mantener el mapa operativo actualizado._
- **AC:** [ ] transición válida según máquina de estados §7 (BR-016) · [ ] destino ACTIVE (BR-004) y con capacidad (BR-005) · [ ] observación obligatoria (BR-006) · [ ] historial insertado (BR-008) · [ ] IN_TRANSIT transitorio.
- **Prioridad:** P0 · **Dependencias:** FEATURE-013 · **Fase:** 5 · **Notas técnicas:** `POST /api/v1/cargos/:id/movements`; MovementKind MOVE / W1-Q1.

**US-020 — Descarga parcial**
_Como Operator, quiero registrar una descarga parcial indicando cantidad, para reflejar el progreso de descarga._
- **AC:** [ ] estado PARTIALLY_UNLOADED (§7) · [ ] quantityMoved válido (≤ quantity, BR-027 [PROPUESTA]) · [ ] observación obligatoria · [ ] historial.
- **Prioridad:** P0 · **Dependencias:** FEATURE-013, OQ-002 · **Fase:** 5 · **Notas técnicas:** modelo unidad simple + quantity/quantityMoved (§4.4-5); CargoItem si OQ-002 resuelve opción B.

**US-021 — Descarga total y almacenamiento**
_Como Operator, quiero registrar una descarga total y almacenar la carga en un sector, para que pase a estado STORED._
- **AC:** [ ] estado STORED con ubicación destino · [ ] cantidad completada · [ ] observación obligatoria · [ ] ocupación del sector actualizada (BR-005).
- **Prioridad:** P0 · **Dependencias:** FEATURE-013 · **Fase:** 5 · **Notas técnicas:** MovementKind UNLOAD (§4.3).

**US-022 — Llevar carga a Scanner**
_Como Operator, quiero llevar una carga al Scanner, para que pase por el control documental/técnico._
- **AC:** [ ] transición TO_SCANNER con estado IN_REVIEW (§7) · [ ] observación obligatoria · [ ] retorno del scanner = movimiento válido (IN_REVIEW → STORED o similar).
- **Prioridad:** P0 · **Dependencias:** FEATURE-014 · **Fase:** 5 · **Notas técnicas:** Move a SCANNER de LocationType; permiso `movement.create`.

**US-023 — Llevar carga a Balanza**
_Como Operator, quiero llevar una carga a la Balanza, para registrar su peso en el proceso de control._
- **AC:** [ ] transición TO_BALANZA con IN_REVIEW · [ ] observación obligatoria · [ ] peso registrado en metadata JSONB (§4.1).
- **Prioridad:** P0 · **Dependencias:** FEATURE-014 · **Fase:** 5 · **Notas técnicas:** metadata del Movement para el peso (sin entidad nueva en v1).

**US-024 — Pasar carga a Secuestro**
_Como Admin (según W1-Q5), quiero mover una carga a Secuestro, para acotar mercadería bajo restricción._
- **AC:** [ ] transición TO_SECUESTRO con estado SECUESTRO (§7) · [ ] observación obligatoria con motivo · [ ] rol según W1-Q5 (Admin o Admin+Operator) · [ ] historial.
- **Prioridad:** P0 · **Dependencias:** FEATURE-014, W1-Q5 · **Fase:** 5 · **Notas técnicas:** si W1-Q5 resuelve Operator, el permiso se agrega al bundle Operator.

**US-025 — Observación exigida en movimientos**
_Como Operator, quiero que el sistema exija una observación en cada movimiento, para que el historial explique los porqués._
- **AC:** [ ] movimiento sin observación → 422 (BR-006/007) · [ ] observación no vacía ni solo espacios (BR-031 [PROPUESTA]) · [ ] relación 1:1 persistida.
- **Prioridad:** P0 · **Dependencias:** FEATURE-015 · **Fase:** 5 · **Notas técnicas:** ObservationDialog; mitigación de fricción R-04 (PRD).

**US-026 — Motivos reutilizables en observaciones**
_Como Operator, quiero motivos tipados o preseleccionados al observar, para documentar más rápido._
- **AC:** [ ] catálogo de motivos comunes preseleccionado · [ ] texto libre adicional opcional · [ ] el motivo se persiste en la observación (razones tipadas, W1-Q1).
- **Prioridad:** P1 · **Dependencias:** FEATURE-015, W1-Q1 · **Fase:** 5 · **Notas técnicas:** depende del outcome de W1-Q1 (enum completo vs MOVE + razones).

**US-027 — Revertir movimiento**
_Como Admin, quiero revertir un movimiento erróneo sin borrar el historial, para corregir errores con trazabilidad._
- **AC:** [ ] solo ADMIN (BR-012) · [ ] historial original conservado (REVERSION) · [ ] observación obligatoria en la reversión · [ ] auditoría REVERT · [ ] alcance W1-Q2.
- **Prioridad:** P0 · **Dependencias:** FEATURE-016, W1-Q2 · **Fase:** 5 · **Notas técnicas:** reversionOfId (§4.1); ADR-010/011.

### EPIC-007 — Mapa operativo (Fase 6)

**US-028 — Ver el predio en un plano operativo**
_Como Viewer/Operator, quiero ver cargas y ocupación sobre el plano del predio, para ubicar mercadería sin preguntar._
- **AC:** [ ] 17 ubicaciones renderizadas desde datos (BR-020) · [ ] ocupación visible por ubicación · [ ] leyenda obligatoria (§13) · [ ] estados sin depender solo del color.
- **Prioridad:** P1 · **Dependencias:** FEATURE-017, OQ-009 · **Fase:** 6 · **Notas técnicas:** OperationalMap/MapLegend/MapToolbar (§11.4).

**US-029 — Navegar el mapa con accesibilidad**
_Como Viewer/Operator, quiero zoom/pan/hover y alternativa de listado, para usar el mapa en cualquier pantalla y con asistencia._
- **AC:** [ ] zoom/pan/hover fluido · [ ] navegación por teclado + ARIA (WCAG 2.2 AA, §12) · [ ] listado alternativo equivalente · [ ] perf sin degradación con ~50 ubicaciones.
- **Prioridad:** P1 · **Dependencias:** FEATURE-017 · **Fase:** 6 · **Notas técnicas:** ADR-006; capas/memoización (§11.5).

**US-030 — Ocupación de ubicación desde el mapa**
_Como Operator, quiero ver ocupación y estado de una ubicación al seleccionarla, para planificar descargas._
- **AC:** [ ] selección muestra ocupación/capacidad (CapacityIndicator) · [ ] estado de la ubicación visible · [ ] datos consistentes con el backend.
- **Prioridad:** P1 · **Dependencias:** FEATURE-018 · **Fase:** 6 · **Notas técnicas:** FEATURE-018 cubre el hueco del PRD entre FEATURE-017/019.

**US-031 — Navegar del mapa al detalle de carga**
_Como Viewer, quiero ir del mapa al detalle de una carga, para investigar sin cambiar de pantalla._
- **AC:** [ ] clic en carga → CargoDetail · [ ] volver al mapa conservando el contexto de zoom · [ ] funcionamiento también desde el listado accesible.
- **Prioridad:** P1 · **Dependencias:** FEATURE-018, FEATURE-006 · **Fase:** 6 · **Notas técnicas:** enrutamiento de Angular con query params.

### EPIC-008 — Dashboard (Fase 7)

**US-032 — Resumen operativo del predio**
_Como Viewer/Operator, quiero un resumen al ingresar (cargas por estado, ocupación, últimos movimientos), para priorizar tareas._
- **AC:** [ ] KPIs correctos contra datos reales (tests de agregación) · [ ] loading/empty correctos · [ ] refresh manual · [ ] sin acciones de escritura para Viewer (BR-010).
- **Prioridad:** P1 · **Dependencias:** FEATURE-019 · **Fase:** 7 · **Notas técnicas:** `GET /api/v1/dashboard` (§10).

**US-033 — Alertas en el dashboard**
_Como Admin, quiero ver alertas abiertas y navegar a la carga, para gestionar rezagos desde un solo lugar._
- **AC:** [ ] sección de alertas OPEN visible · [ ] click navega a CargoDetail · [ ] integración con EPIC-010 lista (Fase 9).
- **Prioridad:** P1 · **Dependencias:** FEATURE-019, FEATURE-022 (Fase 9) · **Fase:** 7 (integración en 9) · **Notas técnicas:** PHASES P7-H3.

### EPIC-009 — Historial y auditoría (Fase 8)

**US-034 — Historial reconstructible de una carga**
_Como Operator/Admin, quiero el historial completo de una carga en orden cronológico, para reconstruir qué pasó y por qué._
- **AC:** [ ] 100 % de movimientos visibles (BR-008) · [ ] orden reverso con estados, ubicaciones y observaciones · [ ] reversiones visibles como REVERSION · [ ] acceso Viewer+.
- **Prioridad:** P1 · **Dependencias:** FEATURE-020 · **Fase:** 8 · **Notas técnicas:** MovementTimeline (§11.4).

**US-035 — Consultar auditoría**
_Como Admin, quiero consultar el registro de auditoría con filtros, para investigar quién hizo qué y cuándo._
- **AC:** [ ] filtros entidad/acción/usuario/fecha · [ ] paginación §10 · [ ] solo ADMIN · [ ] sin datos sensibles innecesarios (BR-017).
- **Prioridad:** P1 · **Dependencias:** FEATURE-021 · **Fase:** 8 · **Notas técnicas:** `GET /api/v1/audit` (§10); ADR-010.

**US-036 — Auditoría automática de acciones sensibles**
_Como Admin, quiero que toda acción sensible quede auditada automáticamente, para tener evidencia en disputas operativas._
- **AC:** [ ] cobertura 100 % de AuditAction críticos (BR-013) · [ ] previousValue/newValue JSONB donde aplique · [ ] sin hard delete (BR-013).
- **Prioridad:** P1 · **Dependencias:** FEATURE-021 · **Fase:** 8 · **Notas técnicas:** interceptor de auditoría (PHASES P8-H1).

### EPIC-010 — Alertas y rezago (Fase 9)

**US-037 — Detección de permanencia > 30 días**
_Como Admin/Operator, quiero que el sistema detecte cargas con más de 30 días y genere una alerta, para actuar antes de que el rezago se acumule._
- **AC:** [ ] alerta STALE_30D OPEN generada por job (BR-014/015) · [ ] sin movimiento automático (BR-014) · [ ] job idempotente (BR-026 [PROPUESTA]) · [ ] visible en dashboard y en la carga (§9).
- **Prioridad:** P2 · **Dependencias:** FEATURE-022, OQ-008, OQ-007 · **Fase:** 9 · **Notas técnicas:** base = entryDate (BR-015); días corridos/hábiles según OQ-008.

**US-038 — Decisión humana de pasar a Rezago**
_Como Admin, quiero decidir manualmente si una carga alertada pasa a Rezago, con observación, para que ninguna acción sea automática._
- **AC:** [ ] movimiento TO_REZAGO solo por acción humana autorizada (BR-014) · [ ] observación obligatoria · [ ] alerta pasa a RESOLVED al resolver · [ ] historial completo.
- **Prioridad:** P2 · **Dependencias:** FEATURE-022, FEATURE-013 · **Fase:** 9 · **Notas técnicas:** UC-010 de USE-CASES; nunca auto-movimiento.

**US-039 — Gestionar ciclo de vida de alertas**
_Como Operator/Admin, quiero reconocer, resolver o descartar alertas, para dejar registro de la gestión._
- **AC:** [ ] transiciones OPEN→ACKNOWLEDGED→RESOLVED/DISMISSED por rol (§4.3) · [ ] notificación in-app al crear (OQ-011) · [ ] cambios auditados.
- **Prioridad:** P2 · **Dependencias:** FEATURE-023 · **Fase:** 9 · **Notas técnicas:** AlertCard (§11.4); canales externos fuera de v1.

### EPIC-011 — Exportación PDF (Fase 10)

**US-040 — Exportar carga a PDF**
_Como Viewer autorizado, quiero exportar el detalle de una carga a PDF, para compartir información con supervisión y aduana._
- **AC:** [ ] PDF generado en backend (ADR-013) · [ ] incluye datos de carga, ubicación, estados y movimientos si el rol lo permite (BR-018) · [ ] descarga correcta con estados de error/retry.
- **Prioridad:** P2 · **Dependencias:** FEATURE-024, OQ-005 · **Fase:** 10 · **Notas técnicas:** `POST /api/v1/cargos/:id/export-pdf` (§10, OQ-017); PdfExportButton.

**US-041 — Control de exportaciones por rol**
_Como Admin, quiero controlar qué roles exportan y qué datos se incluyen, para no filtrar información no autorizada._
- **AC:** [ ] exportación denegada sin permiso (403, BR-018) · [ ] datos no autorizados nunca presentes · [ ] auditoría EXPORT · [ ] alcance según W1-Q8.
- **Prioridad:** P2 · **Dependencias:** FEATURE-024, W1-Q8 · **Fase:** 10 · **Notas técnicas:** validación de permisos en backend (BR-009).

### EPIC-012 — Editor de planos (Fase 11)

**US-042 — Editar el plano del predio**
_Como Admin, quiero editar posición, tamaño y propiedades de las ubicaciones en el plano, para reflejar el layout real._
- **AC:** [ ] drag/resize/snap/grid funcionales (ADR-006) · [ ] panel de propiedades (nombre, código, tipo, capacidad, color, estado) · [ ] cambios persistidos vía `PATCH /api/v1/maps/:id` · [ ] solo ADMIN.
- **Prioridad:** P2 · **Dependencias:** FEATURE-025, OQ-015 (**resuelta: editor fuera de v1**) · **Fase:** 11 · **Notas técnicas:** MapElement zIndex/rotation/properties (§4.1); BR-020.

**US-043 — Guardar cambios con preview y auditoría**
_Como Admin, quiero preview antes de guardar y auditoría de cada cambio, para no romper el mapa operativo sin rastro._
- **AC:** [ ] preview antes de persistir (PHASES P11-H4) · [ ] auditoría MAP_EDIT por cambio · [ ] el mapa de vista refleja los cambios al guardar · [ ] versión del plano incrementada.
- **Prioridad:** P2 · **Dependencias:** FEATURE-025 · **Fase:** 11 · **Notas técnicas:** versionado de Map (§4.1); confirmación de cambios.

### EPIC-013 — Configuración del sistema (Fase 11)

**US-044 — Configurar parámetros operativos**
_Como Admin, quiero ajustar parámetros (días para alerta de rezago, fecha base), para adaptar el sistema al negocio._
- **AC:** [ ] solo ADMIN modifica (BR-011) · [ ] defaults canónicos vigentes (30 días, entryDate) hasta OQ-008 · [ ] cambios auditados.
- **Prioridad:** P2 · **Dependencias:** FEATURE-026, OQ-008 · **Fase:** 11 · **Notas técnicas:** módulo `settings` (§11.3).

**US-045 — Administrar usuarios y roles**
_Como Admin, quiero crear usuarios y asignarles rol, para que cada persona acceda según su función._
- **AC:** [ ] alta/edición/desactivación de usuarios (§8) · [ ] asignación de rol con auditoría PERMISSION_CHANGE · [ ] inactivo no inicia sesión · [ ] soft delete.
- **Prioridad:** P2 · **Dependencias:** FEATURE-027 · **Fase:** 11 · **Notas técnicas:** fuera de alcance: gestión avanzada/multi-tenant (PRD §7.2).

### Ampliación 0.2 — Distribución M:N (EPIC-005/006, secciones 62-70): US-046…053

**US-046 — Consultar las ubicaciones de una carga**
_Como Viewer/Operator, quiero ver todas las ubicaciones donde está distribuida una carga (cantidad, porcentaje, fechas, historial), para saber dónde está cada parte de la mercadería._
- **AC:** [ ] listado de segmentos `CargoLocation` activos con cantidad/unidad, porcentaje, estado, enteredAt/exitedAt (BR-040) · [ ] acceso al historial de movimientos por segmento (BR-008/039) · [ ] lectura por rol Viewer+ (BR-010).
- **Prioridad:** P0 · **Dependencias:** FEATURE-028 · **Fase:** 4–5 · **Notas técnicas:** `GET /api/v1/cargos/:id/locations` (§10); DistributionPanel (§11.4); semántica de percentage según OQ-045 → BR-049 (resuelta: derivado de UI).

**US-047 — Consultar cargas y ocupación de una ubicación**
_Como Viewer/Operator, quiero ver todas las cargas de una ubicación con ocupación total, disponible, cantidad, alertas y las próximas a 30 días, para planificar descargas sin exceder capacidad._
- **AC:** [ ] listado de cargas con cantidad por unidad (BR-033) · [ ] ocupado/disponible derivados de capacidad (BR-005/035) · [ ] alertas de la ubicación y cargas con permanencia próxima a 30 días (BR-014/040) · [ ] lectura por rol Viewer+ (BR-010).
- **Prioridad:** P0 · **Dependencias:** FEATURE-028 · **Fase:** 4–5 · **Notas técnicas:** `GET /api/v1/locations/:id/cargos` y `/capacity` (§10); seed Sector 4: 80/100 m².

**US-048 — Panel de distribución en detalle de carga y de ubicación**
_Como Viewer/Operator, quiero un panel de distribución en el detalle de la carga y de la ubicación, para ver la foto completa de la distribución sin cambiar de pantalla._
- **AC:** [ ] panel en detalle de carga: segmentos, porcentajes, fechas e historial (BR-032/040) · [ ] panel en detalle de ubicación: cargas, ocupación, residual y alertas (BR-033/040) · [ ] ambos coherentes con el backend.
- **Prioridad:** P0 · **Dependencias:** FEATURE-028 · **Fase:** 4–5 · **Notas técnicas:** DistributionPanel (§11.4); selección de ubicación/carga en el mapa (US-030/031).

**US-049 — Movimiento parcial de una carga entre ubicaciones**
_Como Operator, quiero mover parte de una carga (cantidad o porcentaje) entre ubicaciones, para reflejar distribuciones parciales reales._
- **AC:** [ ] cantidad > 0 y ≤ residual del segmento origen (BR-037) · [ ] Σ distribución ≤ total de la carga (BR-034) · [ ] unidad compatible con el destino (BR-035) · [ ] capacidad destino respetada (BR-005/036) · [ ] observación e historial (BR-006/008/039) · [ ] segmentos origen/destino actualizados.
- **Prioridad:** P0 · **Dependencias:** FEATURE-029 · **Fase:** 5 · **Notas técnicas:** el movimiento parcial vincula CargoLocation origen/destino (§4.2); seed 029TERRA26 MOVE 20 m² (Sector 3 → Sector 5); unidades compatibles sin conversión (OQ-044 → BR-048 resuelta).

**US-050 — Descarga parcial con residual en camión**
_Como Operator, quiero registrar descargas parciales que dejen mercadería en el camión, para reflejar el progreso real de descarga._
- **AC:** [ ] residual en camión = `totalQuantity − Σ CargoLocation` activos (BR-038) · [ ] descarga que excede el residual rechazada con `DISTRIBUTION_EXCEEDS_TOTAL` (BR-034) · [ ] `PARTIALLY_UNLOADED` mientras haya residual; `STORED` al completar (§7) · [ ] observación e historial (BR-006/008/039).
- **Prioridad:** P0 · **Dependencias:** FEATURE-029, OQ-042 (**resuelta → BR-042**) · **Fase:** 5 · **Notas técnicas:** ¿camión como Location o residual derivado vía `truckId`? → **BR-042: residual derivado (`inTruckAmount`/`inTruckUnit`)**; seed 036TERRA26 (camión 40 % → Sector 4 60 % → Sector 5 40 %).

**US-051 — Capacidad de ubicación por unidad y rechazo de sobreocupación**
_Como Operator, quiero que la capacidad se mida por unidad (ocupado/disponible) y que el sistema rechace superarla, para no comprometer la operación del depósito._
- **AC:** [ ] indicador con unidad: ocupado/disponible (CapacityIndicator, BR-033/035) · [ ] rechazo al superar capacidad: 409 `CAPACITY_EXCEEDED` (BR-005) · [ ] destinos sobreocupados no seleccionables o advertidos · [ ] actualización en tiempo real tras cada movimiento/segmento.
- **Prioridad:** P0 · **Dependencias:** FEATURE-030 · **Fase:** 4–5 · **Notas técnicas:** `occupiedCapacity` derivado (§4.1); unidad por defecto por LocationType según OQ-041; seed Sector 4: 80/100 m².

**US-052 — Sobreocupación administrativa con flag**
_Como Admin, quiero autorizar sobreocupación puntual con flag y auditoría, para cubrir excepciones operativas sin perder trazabilidad._
- **AC:** [ ] flag `allowOverOccupation` por ubicación (BR-036) · [ ] operación sobre capacidad exige flag + auditoría + observación · [ ] sin flag, el sistema rechaza: 409 `CAPACITY_EXCEEDED` · [ ] gobernanza según OQ-043 → BR-036 ampliada (resuelta 2026-09-24: solo ADMIN, +10% default, observación obligatoria).
- **Prioridad:** P0 · **Dependencias:** FEATURE-030, OQ-043 (**resuelta → BR-036 ampliada**) · **Fase:** 4–5 · **Notas técnicas:** OQ-043 → **resuelta (BR-036 ampliada, 2026-09-24: límite default +10%, solo ADMIN, observación obligatoria, auditoría `CAPACITY_CHANGE`)**; AuditAction `CAPACITY_CHANGE`/`MOVE` con `metadata.overOccupation`.

**US-053 — Alerta de capacidad derivada**
_Como Operator/Admin, quiero alertas cuando una ubicación se acerca a su capacidad, para anticipar saturación._
- **AC:** [ ] alerta `CAPACITY` sobre `occupiedCapacity` derivado (BR-033) · [ ] umbral configurable (§9) · [ ] sobreocupación según BR-036 (OQ-043 → BR-036 ampliada resuelta) · [ ] visible en dashboard y en la ubicación.
- **Prioridad:** P1 · **Dependencias:** FEATURE-030, OQ-041 · **Fase:** 9 (integración con EPIC-010) · **Notas técnicas:** AlertType.CAPACITY §4.3; integrada a EPIC-010 (FEATURE-022/023).

## 9. Criterios de aceptación del documento

- [ ] Cada capacidad core de §1.4 del MASTER-SPEC tiene al menos un epic que la cubre (mapeo 1:1 con el PRD §8).
- [ ] Todos los IDs `FEATURE-xxx`/`US-xxx` referenciados por el PRD §9 existen y son coherentes con sus requisitos RF.
- [ ] Mínimos cumplidos: 13 epics (≥10), **30 features** (≥25; FEATURE-028…030 de la ampliación 0.2), **53 user stories** (≥40; US-046…053 de la ampliación 0.2), todas con AC verificables, prioridad, dependencias, notas técnicas y fase.
- [ ] Ninguna regla de negocio inventada: solo BR canónicas y `[PROPUESTA]` de BUSINESS-RULES.md.
- [ ] Sin placeholders vacíos; toda ambigüedad está en la sección DECISIÓN PENDIENTE.

## 10. Archivos involucrados

| Archivo | Rol |
| --- | --- |
| `docs/MASTER-SPEC.md` | Fuente canónica (dominio, BR, RBAC, fases, IDs) |
| `docs/product/PRD.md` | Requisitos RF → vínculos FEATURE/US |
| `docs/product/USER-STORIES.md` | Detalle GWT por rol de las US |
| `docs/product/USE-CASES.md` | Flujos UC-001…017 por operación |
| `docs/product/BUSINESS-RULES.md` | BR canónicas + [PROPUESTA] |
| `docs/roadmap/ROADMAP.md` · `PHASES.md` | Secuenciación y DoF por fase |
| `docs/OPEN-QUESTIONS.md` | OQ-001…016 + pendientes reportados |
| `docs/qa/QA-STRATEGY.md` · `TEST-PLAN.md` | Consumo de AC para casos de prueba |

## 11. Riesgos

| # | Riesgo | Impacto | Mitigación |
| --- | --- | --- | --- |
| PBK-01 | Desalineación de numeración con PHASES.md/ROADMAP.md (PHS-D1/RMP-D1) | Vínculos EPIC/FEATURE/US contradictorios entre documentos | Adoptar la numeración del PRD (ya referenciada) y reportar para que W10 realinee; ver PBQ-01 |
| PBK-02 | ~~OQ-001/002/004 abiertas~~ → **resueltas 2026-09-23/24** (BR-002; CargoLocation sin CargoItem; BR-043 egreso) | ~~Rediseño de dominio~~ — sin retrabajo | Riesgo cerrado; tareas no bloqueadas avanzan (RMP-004) |
| PBK-03 | ~~OQ-009/014 abiertas~~ → **resueltas 2026-09-24** (BR-041 + OQ-014: Plazoleta UNITS) | ~~Retrabajo de ocupación y mapa~~ — riesgo cerrado | Probar con seeds §5 y casos borde (RSK-005) |
| PBK-04 | FEATURE-018 define un alcance no referenciado por el PRD | Doble lectura del backlog | Documentado como decisión PB-D4; revisable por el orquestador |
| PBK-05 | US-045 (usuarios/roles) roza gestión de usuarios "avanzada" (PRD §7.2) | Scope creep | Alcance acotado a alta/asignación/desactivación; sin multi-tenant |
| PBK-06 | Códigos de error nuevos requeridos por BR-032…040 (`DISTRIBUTION_EXCEEDS_TOTAL`, `UNIT_INCOMPATIBLE`, `CARGO_LOCATION_NOT_FOUND`) aún no registrados en ERROR-HANDLING.md (W5) | Contratos de error de FEATURE-028…030 | Reportar a W5 para el catálogo único (§4.9) |

## 12. DECISIÓN PENDIENTE

| # | Pregunta | Impacto | Referencia |
| --- | --- | --- | --- |
| PBQ-01 | ~~¿Se ratifica la numeración secuencial adoptada en PRD/backlog (EPIC-001…013, FEATURE-001…027, US-001…045) o se alinea a la propuesta phase-prefixed de PHASES.md (`FEATURE-<fase><seq>`)?~~ → **RESUELTA (2026-09-23, ID-008)**: secuencial canónica ratificada; PHASES alinea su convención sin renumerar el backlog | Todos los vínculos EPIC/FEATURE/US entre W1 y W10 | PHS-D1/RMP-D1 — resueltas (ID-008) |
| PBQ-02 | ~~OQ-001: reglas exactas de unicidad/validación del código de carga~~ → **RESUELTA (OQ-001 → BR-002, 2026-09-23)**: regex `^[A-Z0-9][A-Z0-9./-]{2,31}$`, mayúsculas, único case-insensitive, 3–32 | FEATURE-005 (US-009), BR-002 | OQ-001 (resuelta) |
| PBQ-03 | ~~OQ-002: carga parcial unidad simple vs CargoItem~~ → **RESUELTA (secciones 62-70)**: distribución vía `CargoLocation`; CargoItem no v1 | FEATURE-013 (US-020), BR-027 [PROPUESTA] | OQ-002 (resuelta) |
| PBQ-04 | ~~OQ-004: egreso/retiro en v1 (estado EXITED)~~ → **RESUELTA (OQ-004 → BR-043, 2026-09-23)**: sí — `EXIT` con observación obligatoria, `EXITED` terminal | Ciclo de vida completo, BR-028 [PROPUESTA] | OQ-004 (resuelta) |
| PBQ-05 | ~~OQ-008: días corridos/hábiles y segunda alerta~~ → **RESUELTA (OQ-008 → BR-014/015, 2026-09-23)**: días **corridos**, base `entryDate`, alerta 30 y segunda 40 | FEATURE-022 (US-037), FEATURE-026 (US-044) | OQ-008 (resuelta) |
| PBQ-06 | ~~OQ-041/OQ-044: unidad de capacidad por defecto por ubicación y ocupación derivada (¿la Plazoleta cuenta camiones?)~~ → **RESUELTA (OQ-041 → BR-041 + OQ-014 + OQ-044 → BR-048, 2026-09-23/24)**: unidad efectiva por tipo/override; Plazoleta cuenta **camiones (UNITS)**; sin conversión v1 | FEATURE-012, FEATURE-017, FEATURE-019 | OQ-041/OQ-044 (resueltas) |
| PBQ-07 | W1-Q2: ¿la reversión aplica solo al último movimiento o a cualquiera de la cadena? | FEATURE-016 (US-027), BR-021 [PROPUESTA] | 🔶 Residual local (W1-Q2; sin OQ) |
| PBQ-08 | ~~W1-Q5: ¿Operator puede mover a Secuestro o es exclusivo de ADMIN?~~ → **RESUELTA (OQ-030 → BR-046, 2026-09-23)**: **solo ADMIN** | FEATURE-014 (US-024) | OQ-030 → BR-046 (resuelta) |
| PBQ-09 | W1-Q1: MovementKind v1 completo vs MOVE + razones tipadas | FEATURE-013/014/016, contratos API | 🔶 Residual local (W1-Q1; §4.3) |
| PBQ-10 | ~~OQ-015: ¿editor de planos en v1 (Fase 11) o vista estática previa?~~ → **RESUELTA (2026-09-24)**: vista estática en v1; editor diferido | FEATURE-025 (US-042/043) | OQ-015 (resuelta) |
| PBQ-11 | Ratificación de las reglas `[PROPUESTA]` BR-021…BR-031 | BUSINESS-RULES.md, validaciones de backend | 🔶 Residual local (W1) |
| PBQ-12 | ~~OQ-041: unidad de capacidad por defecto por LocationType y gobernanza de configuración~~ → **RESUELTA (OQ-041 → BR-041, 2026-09-23)**: default por tipo (Sector/Galpón AREA, Plazoleta UNITS) + override | FEATURE-030 (US-051/053), BR-005/033/035 | OQ-041 (resuelta) |
| PBQ-13 | ~~OQ-042: ¿el camión es Location (`CAMION`) o el residual es derivado?~~ → **RESUELTA (OQ-042 → BR-042, MASTER-SPEC v0.3)**: residual derivado — el camión NO es una ubicación | FEATURE-029 (US-050), BR-038 | OQ-042 (resuelta) |
| PBQ-14 | ~~OQ-043: sobreocupación administrativa (flag, % extra, rol autorizante, ¿observación?)~~ → **RESUELTA (OQ-043 → BR-036 ampliada, 2026-09-24)**: default **+10%**, **solo ADMIN**, observación obligatoria + auditoría `CAPACITY_CHANGE` | FEATURE-030 (US-052), BR-036 | OQ-043 (resuelta) |
| PBQ-15 | ~~OQ-044: conversión de unidades en movimientos parciales~~ → **RESUELTA (OQ-044 → BR-048, 2026-09-24)**: **sin conversión v1** — unidades compatibles o `PERCENT`; `UNIT_INCOMPATIBLE` 422 | FEATURE-029 (US-049/050), BR-034/035 | OQ-044 (resuelta) |
| PBQ-16 | ~~OQ-045: semántica de `percentage` en CargoLocation~~ → **RESUELTA (OQ-045 → BR-049, 2026-09-24)**: derivado de UI e informativo; input solo si unidad `PERCENT` | FEATURE-028 (US-046/048), BR-040 | OQ-045 (resuelta) |

Todas fueron reportadas al orquestador para su incorporación a `OPEN-QUESTIONS.md`.