# CargoOps — Arquitectura General (ARCHITECTURE.md)

> Grupo W2 · Arquitectura · Fuente de verdad: `docs/MASTER-SPEC.md` §11 y §4.
> Estado: borrador FASE 0 (documentación). Sin código de producción.

## 1. Objetivo

Definir la arquitectura de referencia de CargoOps: el estilo arquitectónico (modular monolith), las vistas C4 de nivel 1 y 2, las capas lógicas, la estructura de módulos del backend, la organización del frontend, la interacción con el motor de mapa SVG y los flujos de datos principales. Este documento es la columna vertebral que los demás documentos de este grupo (DATABASE, SECURITY, AUTHORIZATION, AUDIT, MAP-ENGINE, PDF-EXPORT, NOTIFICATIONS, PERFORMANCE, SCALABILITY) detallan por dominio.

## 2. Contexto

CargoOps es una plataforma web profesional de gestión operativa de cargas y depósitos dentro de un **predio logístico/aduanero** (MASTER-SPEC §1.1). El sistema debe garantizar **trazabilidad total** de cada carga (registro, ingreso por camión, descarga, ubicación física, movimientos, egreso) con **observaciones obligatorias**, **alertas operativas** (rezago > 30 días) y un **plano editable** del predio donde cada espacio físico es un objeto estructurado (BR-020).

La FASE 0 produce únicamente documentación; este documento describe la arquitectura objetivo que guiará la implementación por fases (MASTER-SPEC §18, roadmap PHASE 1–14), sin escribir código.

## 3. Restricciones

- **Un solo servicio backend** en v1: modular monolith (MASTER-SPEC §11.1, ADR-001). Sin microservicios iniciales.
- **Stack objetivo canónico** (MASTER-SPEC §11.2): Angular 20+ (standalone components, signals) · NestJS + TypeScript · PostgreSQL 16+ · Prisma · Redis + BullMQ (requeridos en v1 — OQ-007; ADR-012 Accepted) · Storage S3 compatible (MinIO — OQ-006) · JWT + refresh tokens (ADR-008).
- **REST** bajo `/api/v1` con envelopes de éxito/error y paginación definidos (MASTER-SPEC §10).
- **Reglas de negocio canónicas** (MASTER-SPEC §6): no se redefinen ni se inventan. En particular BR-008 (todo movimiento genera historial), BR-009 (autorización SIEMPRE en backend), BR-013 (soft delete + audit, nunca borrado silencioso), BR-016 (transiciones de estado validadas en backend), BR-019 (notificaciones desacopladas de proveedores), BR-020 (plano como datos estructurados).
- **FASE 0**: solo archivos Markdown; no se crean configs, Dockerfiles, pipelines ni código.
- No se crean ADR en este grupo (responsabilidad del grupo W3); aquí solo se referencian.

## 4. Dependencias

- `docs/MASTER-SPEC.md` — decisiones canónicas (fuente de verdad).
- `docs/OPEN-QUESTIONS.md` — decisiones centralizadas, **todas resueltas** en MASTER-SPEC v0.5 (OQ-001…OQ-047; no quedan OQ abiertas).
- `architecture/ADR/ADR-001` (Modular Monolith), ADR-002 (Angular), ADR-003 (NestJS), ADR-004 (PostgreSQL), ADR-005 (Prisma), ADR-006 (SVG Map Engine), ADR-007 (REST), ADR-008 (Auth), ADR-012 (Background Jobs).
- Documentos hermanos de este grupo: `DATABASE.md`, `SECURITY.md`, `AUTHORIZATION.md`, `AUDIT.md`, `MAP-ENGINE.md`, `PDF-EXPORT.md`, `NOTIFICATIONS.md`, `PERFORMANCE.md`, `SCALABILITY.md`.
- Documentos de otros grupos consumidos en fases de implementación: `backend/MODULES.md`, `backend/API.md`, `frontend/FRONTEND-ARCHITECTURE.md`, `ux/MAP-UX.md`.

## 5. Decisiones

### 5.1 Estilo arquitectónico: Modular Monolith (ADR-001)

Se adopta un **modular monolith** como decisión central, alineado al ADR-001:

- **Un solo deployable NestJS** que contiene todos los módulos de negocio, fuertemente cohesionados y con **boundaries explícitos** (cada módulo solo accede a los demás vía interfaz de servicio pública / eventos, nunca a tablas ajenas directamente).
- **Justificación** (coherente con MASTER-SPEC §11.1): equipo pequeño, dominio acotado (cargas, ubicaciones, movimientos), despliegue y operación simples, **transacciones ACID entre módulos** (crítico para BR-006/007/008: movimiento + observación + historial en una sola transacción), evita complejidad distribuida prematura (KISS/YAGNI).
- Los boundaries están diseñados desde el inicio para permitir **extraer servicios después** sin reescribir: los módulos con mayor probabilidad de extracción futura son `jobs`/`notifications`, `pdf` y `reports` (ver SCALABILITY.md §5.4).
- El accionar no es una "orgánica de carpetas": cada módulo posee sus entidades, DTOs y servicios; el **dominio no se acopla a infraestructura** (repositorios tras interfaces, storage tras abstracción, notificaciones tras `NotificationProvider` — BR-019).

**Tradeoff aceptado**: un monolith crece en complejidad de build y de equipo concurrente; se mitiga con módulos estrictos, tests por módulo y convenciones de dependencia (las capas miran hacia adentro: controller → service → repository).

### 5.2 Stack tecnológico (resumen de decisiones)

| Capa | Decisión | Referencia |
| --- | --- | --- |
| Frontend | Angular 20+, TypeScript strict, Standalone Components, Signals, Router, Reactive Forms | ADR-002 |
| Backend | NestJS, TypeScript, REST `/api/v1`, OpenAPI/Swagger generado desde DTOs | ADR-003 / ADR-007 |
| Base de datos | PostgreSQL 16+ | ADR-004 |
| ORM | Prisma (migraciones + type-safe client) | ADR-005 |
| Cache / colas | Redis + BullMQ en v1 (alertas 30d, PDF asíncrono) — OQ-007 | ADR-012 |
| Storage | S3 compatible — MinIO self-hosted en producción (OQ-006) | — |
| PDF | HTML→PDF con Chromium (Puppeteer) en servicio backend especializado | ADR-013 / OQ-005 |
| Autenticación | JWT access + refresh token | ADR-008 |
| Observabilidad | Logs estructurados, health checks (`/api/v1/health`), requestId | §14 MASTER-SPEC |

SSR y alcance PWA siguen la OQ-010 (PWA mínima en v1; SSR diferido a v1.1+); i18n según OQ-012 (UI es-AR con arquitectura i18n lista; sin conmutador runtime — OQ-034).

### 5.3 Vistas C4 — Nivel 1 (Contexto del sistema)

```
                        ┌──────────────────────────────────────────┐
                        │              Predio logístico            │
                        │            (operación diaria)            │
                        └──────────────────────────────────────────┘
   ┌──────────┐   ┌──────────┐   ┌──────────┐
   │ VIEWER   │   │ OPERATOR │   │  ADMIN   │       Actores externos
   │ (consulta)│  │ (opera)  │   │(supervisa)│
   └────┬─────┘   └────┬─────┘   └────┬─────┘
        │              │              │
        │       HTTPS (SPA + API REST /api/v1)
        ▼              ▼              ▼
   ┌───────────────────────────────────────────────────────────────┐
   │                    CargoOps Web Platform                        │
   │  [Angular SPA — operación, mapa SVG, dashboards]                │
   │  [NestJS Modular Monolith — reglas de negocio, RBAC, audit]     │
   └───────┬───────────────────────┬───────────────────┬────────────┘
           │                       │                   │
      ┌────▼─────┐           ┌─────▼─────┐       ┌─────▼─────┐
      │PostgreSQL│           │  Redis    │       │ S3 (MinIO)│
      │ 16+      │           │ (cache/jobs│      │ self-host │
      │ (ACID)   │           │  v1)      │       │ (OQ-006)  │
      └──────────┘           └───────────┘       └───────────┘
```

Personas: **Viewer** (consulta), **Operator** (operación diaria), **Admin/Supervisor** (gestión global). Roles definidos en MASTER-SPEC §8 y detallados en AUTHORIZATION.md.

### 5.4 Vistas C4 — Nivel 2 (Containers / componentes)

```
┌────────────────────────── Angular 20+ (SPA, PWA) ──────────────────────────┐
│ core (auth, http, error) · shared (UI, pipes, directivas)                  │
│ features (cargo, trucks, locations, map, alerts, dashboard, pdf, settings) │
│ state (signals/services) · guards/UX · interceptors (auth, requestId)      │
└───────────────────────────────────┬────────────────────────────────────────┘
                                    │ HTTPS + JSON (envelope §10)
┌───────────────────────────────────▼─────────────────────────────────────────┐
│                     NestJS — Modular Monolith /api/v1                        │
│                                                                              │
│  auth │ users │ roles │ permissions │ cargo │ trucks │ locations │            │
│  movements │ maps │ alerts │ dashboard │ audit │ notifications │ settings     │
│  ── módulos v1 (15); reports es futuro (16.º) ──                             │
│                                                                              │
│  Capas por módulo: controller → service (dominio) → repository → Prisma      │
│  Guards globales: AuthGuard + PermissionsGuard (BR-009)                      │
│  Interceptores: AuditInterceptor, LoggingInterceptor, TransformInterceptor   │
│  Jobs (BullMQ v1 — OQ-007): alertas 30d, exports PDF, notificaciones          │
└───────┬───────────────────────┬───────────────────────┬─────────────────────┘
        │                       │                       │
   ┌────▼────┐            ┌─────▼─────┐           ┌─────▼─────┐
   │  PG 16  │            │   Redis   │           │ S3 (MinIO)│
   │ Prisma  │            │  (BullMQ) │           │ (OQ-006)  │
   └─────────┘            └───────────┘           └───────────┘
```

### 5.5 Capas lógicas dentro del monolith

Cada módulo sigue la estructura canónica (MASTER-SPEC §11.3): `controller, service, repository, DTOs, entities, guards, interceptors, validators, exceptions`. Las capas lógicas del sistema completo:

1. **Presentación (API)**: controllers REST, DTOs de entrada/salida, validación con `class-validator` (whitelist), OpenAPI. Envelope `{data}` / `{error}` (MASTER-SPEC §10).
2. **Aplicación / Orquestación**: servicios de módulo, transacciones, coordinación entre módulos vía interfaces públicas (p. ej. `MovementService` usa `LocationService.occupy()` declarativamente, nunca SQL ajeno).
3. **Dominio**: reglas de negocio puras (BR-001…BR-040), máquina de estados de `CargoStatus` (BR-016), validación de capacidad y consistencia de la distribución (BR-034/035/036, segmentos `CargoLocation` — secciones 62-70), observación obligatoria (BR-006/007). Sin dependencias de framework donde sea práctico (funciones puras, servicios de dominio NestJS como thin wrappers).
4. **Infraestructura**: repositorios Prisma, storage S3, proveedores de notificaciones (BR-019), clientes Redis/BullMQ, logging.

**Regla de dependencia**: las capas superiores dependen de las inferiores; el dominio no conoce transporte ni persistencia. Esto habilita testabilidad (unit con fakes de repositorio) y la futura extracción de servicios (SCALABILITY.md).

### 5.6 Módulos backend (v1: 15; catálogo: 16)

MASTER-SPEC §11.3 define 16 módulos; **v1 implementa 15** (todos excepto `reports`; lo mínimo de reportes vive en `cargo`/`dashboard`). Coherencia con DATABASE.md: cada módulo es dueño de sus entidades persistentes.

| Módulo | Responsabilidad principal | Entidades que posee |
| --- | --- | --- |
| `auth` | Login, refresh, logout, emisión/rotación de tokens | (no persistente propia; usa users + audit) |
| `users` | ABM de usuarios, soft delete, activación | User, UserRole |
| `roles` | Catálogo de roles (VIEWER/OPERATOR/ADMIN) | Role |
| `permissions` | Catálogo de permisos y bundles por rol | Permission, RolePermission |
| `cargo` | Registro, consulta, búsqueda, estados, notas y **distribución: segmentos `CargoLocation` + totales (BR-034/038)** | Cargo, CargoLocation, Observation (notas) |
| `trucks` | Registro y consulta de camiones | Truck |
| `locations` | Ubicaciones, **capacidad y ocupación derivada — `occupiedCapacity`/`availableCapacity` (BR-033/035/036)** | Location |
| `movements` | Historial, **movimientos de segmentos: crear/actualizar/egresar `CargoLocation` → Movement + Observation, reversión** | Movement, Observation (movimiento 1:1) |
| `maps` | Planos estructurados y elementos (BR-020), editor | Map, MapElement |
| `alerts` | Reglas (rezago 30d, capacidad), ciclo de vida de alertas | Alert |
| `dashboard` | KPIs operativos (ocupación, rezago, alertas abiertas) | (lectura) |
| `audit` | Escritura/consulta de auditoría (ADR-010) | AuditLog |
| `notifications` | Abstracción de canales (BR-019), preferencias | Notification |
| `settings` | Configuración global (alertas, capacidades por defecto) | (config) |
| `health` | Health checks, readiness, métricas base | — |
| `reports` (futuro) | Reportes/estadísticas avanzadas — fuera de v1 | — |

Notas:
- `cargo`, `locations` y `movements` comparten el dominio de estado/ubicación con boundaries claros: `cargo` gestiona la entidad, su ciclo y la distribución (segmentos `CargoLocation`, totales y residual — BR-034/038); `locations` aporta capacidad y ocupación derivada (BR-033/035/036); `movements` crea líneas de historial y reversiones para **toda** mutación de segmento (BR-006/008). El flujo "mover/distribuir carga" orquesta los tres en una única transacción (F6); el punto de entrada del flujo según API se define en backend/API.md.
- `alerts` escribe `Alert` y delega la generación de notificaciones al módulo `notifications` (desacoplado, BR-019).

### 5.7 Estructura frontend (MASTER-SPEC §11.4)

`core/` (auth guard, http client, interceptores, requestId, errores) · `shared/` (UI, directivas, pipes, badges) · `features/` (cargo, trucks, locations, map, alerts, dashboard, pdf, settings) · `layouts/` (shell, sidebar, header) · `pages/` (rutas por feature) · `services/` (API) · `models/` (DTOs tipados) · `guards/` (UX) · `interceptors/` · `state/` (signals por feature) · `ui/` · `utils/`.

Principios: standalone components + signals (sin NgModules salvo bootstrap), lazy loading por ruta de feature, **los guards del frontend son UX únicamente** (BR-009), i18n desde el inicio (es-AR default, OQ-012).

Componentes canónicos propuestos (listados en §11.4): CargoTable, CargoStatusBadge, CargoDetail, CargoSearch, CargoFilters, OperationalMap, MapLocation, MapToolbar, MapLegend, LocationCard, MovementTimeline, CapacityIndicator, AlertCard, ConfirmDialog, ObservationDialog, PdfExportButton — detallados en `frontend/COMPONENTS.md`.

### 5.8 Interacción mapa / SVG (resumen; detalle en MAP-ENGINE.md)

- El plano se renderiza en **SVG** en el frontend; el backend persiste **datos estructurados** (`Map`, `MapElement` + propiedades JSONB) — BR-020, ADR-006.
- Cada ubicación del predio es un objeto `LocationVisual { id, x, y, width, height, rotation, zIndex, fill, stroke, labelPosition }` (+ properties) derivado de `Location` + `MapElement` (MASTER-SPEC §11.5).
- El frontend consulta `GET /api/v1/maps` (layout) y superpone la **ocupación en vivo** (cargas por ubicación) desde `GET /api/v1/locations` / dashboard, sin duplicar el layout ni bloquear la edición.
- **Distribución M:N (secciones 62-70, §69)**: una ubicación visualiza N cargas y su ocupación acumulada (capacidad, ocupada, disponible, % ocupado); una carga con N ubicaciones muestra sus segmentos (cantidades/porcentajes). Al seleccionar se muestra el detalle (nombre, capacidad, ocupación, %, cargas, alertas, movimientos recientes) — ver MAP-ENGINE.md §5.8.
- **Interacciones**: zoom, pan, selección, hover, drag, resize, snap/grid, selección múltiple (editor, ADMIN); leyenda obligatoria; accesibilidad con listado alternativo (MASTER-SPEC §12).
- **Rendimiento**: render por capas, memoización de shapes, virtualización de overlays de carga, lazy map — ver PERFORMANCE.md y MAP-ENGINE.md.

### 5.9 Flujos de datos principales

**F1 — Registro de carga (crear + ubicar).**
`POST /api/v1/cargos` → AuthGuard + PermissionsGuard (cargo.create; BR-010) → `CargoService` valida código (BR-001/BR-002) y, si el alta incluye ubicación inicial (`locationId` opcional, alta directa a sector — API.md §5.2), toma el **lock consultivo de esa ubicación** y valida existencia (BR-003), que esté activa (BR-004), que su tipo admita el estado inicial `STORED` (BR-044), consistencia de unidades (BR-035) y capacidad (BR-005/036, con el techo de sobreocupación del flag administrativo — VALIDATION.md §4.5) → transacción: insert `Cargo` (con `totalQuantity`/`totalUnit` si aplica; estado derivado: `STORED` con `locationId`, `IN_TRUCK` con `truckId`, `REGISTERED` en otro caso — BR-016) + `Observation` de alta (BR-006) + insert del segmento inicial `CargoLocation` (status ACTIVE; BR-032) si corresponde, **sin fila `Movement`** (el estado inicial es parte de la fila `Cargo`, no una transición; la arista `REGISTERED → STORED` conserva `kinds: []` y `move()` la sigue rechazando) + `AuditLog CREATE` (y `CAPACITY_CHANGE` sobre la **ubicación** si el ingreso se aceptó por encima de la capacidad declarada con el flag activo — BR-036) → respuesta envelope. El frontend refresca tabla y mapa.

**F2 — Movimiento de carga (ubicación y/o estado).**
`POST /api/v1/cargos/:id/movements` → guards → validación de estado según máquina (BR-016) → ubicación destino activa (BR-004) → verificación de consistencia y capacidad (BR-034/035/036) → **observación obligatoria** (BR-006/007) → una única transacción: insert `Movement` + `Observation` (1:1) + mutación de segmentos `CargoLocation` (alta/egreso/ajuste; si el movimiento es parcial, el segmento origen y el destino se actualizan con la cantidad movida — BR-037/038) + `cargo` UPDATE (status si corresponde) + `AuditLog MOVE|STATUS_CHANGE` → el historial queda reconstruible (BR-008). El detalle del flujo de distribución por segmentos (API dedicada) está en F6.

**F3 — Alerta de rezago (job diario).**
Job diario (BullMQ — OQ-007, requerido en v1) → detecta cargas con permanencia > 30 días (BR-014/015) y sin alerta `STALE_30D` OPEN → crea `Alert` → notificación in-app (BR-019) → Dashboard y detalle de carga muestran la alerta → **no se mueve la carga automáticamente** (BR-014); un usuario autorizado decide mediante un movimiento con observación.

**F4 — Exportación PDF de una carga.**
`POST /api/v1/cargos/:id/export-pdf` → guard (cargo.export_pdf, BR-018) → si la generación es síncrona corta: genera; si es pesada: encola job (OQ-007) y responde estado/descarga (S3 signed URL, OQ-006). Detalle en PDF-EXPORT.md.

**F5 — Edición de plano (ADMIN).**
`PATCH /api/v1/maps/:id` (o elemento) → guard (map.edit) → transacción: update `MapElement` (+ versionado de `Map`) + `AuditLog MAP_EDIT` → el frontend re-renderiza el SVG con los datos estructurados (BR-020).

**F6 — Distribución de una carga en N ubicaciones (segmentos `CargoLocation`, BR-032…040).**
Endpoints de distribución según MASTER-SPEC §10 / backend/API.md. Toda mutación de segmento exige observación y genera historial en la **misma transacción** (BR-006/008): no existe operación de distribución sin registro.

- `POST /api/v1/cargos/:id/locations` (crear segmento): guards → validaciones de aplicación — carga existente (BR-003), ubicación activa (BR-004), suma distribuida ≤ total en unidad compatible (BR-034/035), capacidad de la ubicación (BR-036) → transacción: INSERT `cargo_locations` (status ACTIVE, `enteredAt` = now) + INSERT `Movement` (y su `Observation` 1:1 obligatoria) + UPDATE `cargo` (status si corresponde) + `AuditLog` → recálculo de ocupación de la ubicación (BR-033).
- `PATCH /api/v1/cargos/:id/locations/:cargoLocationId` (actualizar segmento, p. ej. ajuste de cantidad/porcentaje): valida BR-034/035 → transacción: UPDATE `cargo_locations` + `Movement` (ajuste) + `Observation` + `AuditLog`.
- `DELETE /api/v1/cargos/:id/locations/:cargoLocationId` (egreso de la carga en una ubicación): transacción: UPDATE `cargo_locations` SET `status = EXITED`, `exitedAt` = now + `Movement` + `Observation` + `AuditLog`.
- **Movimiento parcial (BR-037/038)**: mover una cantidad `q` del origen al destino ejecuta en una única transacción: UPDATE del segmento origen (`quantity − q`; si llega a 0 → `EXITED` con `exitedAt`) + UPDATE/INSERT del segmento destino (`quantity + q`) + INSERT `Movement` vinculando los `CargoLocation` de origen/destino (MASTER-SPEC §4.2) + `Observation` + `AuditLog`. El residual en camión = `totalQuantity − Σ CargoLocation activos` (BR-038/BR-042; vínculo camión `Cargo.truckId` — OQ-042).

### 5.10 Transaccionalidad y consistencia

- Las operaciones de escritura críticas (crear/mover/estado/revertir/plano) ejecutan **una transacción ACID por operación** mediante `prisma.$transaction` — requisito de BR-006/007/008/013.
- `occupiedCapacity` y `availableCapacity` de cada ubicación son **derivados** (MASTER-SPEC §4.1): ocupada = Σ de `CargoLocation` activos en **unidad compatible** (BR-033/035); disponible = `capacity` − ocupada. Se recalculan dentro de la misma transacción al mutar segmentos (BR-036) y el dashboard/mapa los sirven desde la misma fuente (estrategia de agregación: DATABASE.md §5.9).
- **Consistencia de la distribución (BR-034/035)**: la suma de cantidades de los segmentos activos de una carga no puede superar su `totalQuantity` en unidad compatible (BR-034); la capacidad de cada ubicación se calcula en unidad compatible con sus segmentos (BR-035). Ambas se validan en la capa de aplicación (servicio) dentro de la transacción; DATABASE.md §5.8 documenta en qué capa se aplica cada regla y la vista/trigger de control propuesta. Totales y ocupación son derivados, nunca campos editados a mano.
- No hay eventual consistency en v1: sin colas bloqueantes para operaciones transaccionales. Las colas (OQ-007) se reservan para trabajo no transaccional (alertas, PDF, notificaciones).
- Para flujos síncronos que atraviesan módulos se usa llamada directa al servicio público dentro del mismo proceso (no HTTP interno; no mensajes asíncronos) — simplicidad del monolith, sin perder los boundaries.

### 5.11 Máquina de estados (resumen; MASTER-SPEC §7)

`REGISTERED → IN_TRUCK ↔ PARTIALLY_UNLOADED ↔ STORED ↔ IN_REVIEW → REZAGO | SECUESTRO | EXITED | DELETED(soft)`; `IN_TRANSIT` transitorio. Toda transición: validada en backend (BR-016), con observación (BR-007) e insertando historial (BR-008). Estado y ubicación son independientes (§7). La distribución M:N coexiste con cualquier estado: residual en camión = `totalQuantity − Σ CargoLocation activos` (BR-038/BR-042, unidades compatibles; vínculo camión `Cargo.truckId` — OQ-042) y `PARTIALLY_UNLOADED` refleja carga parcialmente en camión y parcialmente en ubicaciones. Detalle de transiciones válidas en `backend/VALIDATION.md` y `ux/USER-FLOWS.md`.

## 6. Criterios de aceptación

- [ ] La arquitectura documentada es coherente con MASTER-SPEC §11 y con los demás documentos del grupo W2 (módulos = entidades de DATABASE.md; RBAC = AUTHORIZATION.md; mapa = MAP-ENGINE.md).
- [ ] Todo flujo crítico (F1–F6) referencia sus BR, sus endpoints (`backend/API.md`) y sus transacciones.
- [ ] No se inventaron reglas de negocio; toda ambigüedad real está declarada en §9 o referenciada a OPEN-QUESTIONS.md.
- [ ] Un lector puede derivar de este documento las vistas C4 nivel 1 y 2 sin consultar otras fuentes.

## 7. Archivos involucrados

- `docs/MASTER-SPEC.md` (canónico) · `docs/OPEN-QUESTIONS.md`
- `architecture/ADR/ADR-001..008, 012` (grupo W3)
- Hermandos W2: `DATABASE.md`, `SECURITY.md`, `AUTHORIZATION.md`, `AUDIT.md`, `MAP-ENGINE.md`, `PDF-EXPORT.md`, `NOTIFICATIONS.md`, `PERFORMANCE.md`, `SCALABILITY.md`
- Downstream: `backend/MODULES.md`, `backend/API.md`, `backend/VALIDATION.md`, `frontend/FRONTEND-ARCHITECTURE.md`, `ux/MAP-UX.md`

## 8. Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Boundaries difusos entre `cargo`/`movements`/`locations` → acoplamiento silencioso | Regla de dependencia explícita: acceso solo vía servicio público; revisión en code review y tests de arquitectura |
| Modular monolith crece sin control → monolith "de hecho" | Módulos con dueño de tablas; documento de convenciones; límites de tamaño por módulo |
| El mapa se vuelve cuello de botella al crecer la carga operativa | Estrategia por capas + virtualización + lazy (PERFORMANCE/PERFORMANCE KPI §5) |
| Decisions futuras (tenancy, móvil) tensionan el modelo | Boundaries ya contemplados; camino documentado en SCALABILITY.md |
| OQ pendientes bloquean diseño de detalle | No quedan OQ abiertas en v0.5; los residuales locales quedan documentados en su documento (p. ej. MovementKind en DATABASE.md) |
| Ocupación M:N divergente (unidades incompatibles sumadas, segmentos EXITED mal contados, doble conteo de cargas) | Agregación sobre índice `(location_id, status, quantity_unit)` + BR-033/035 + BR-041/BR-049 (OQ-041/044 resueltas); vista de control documentada en DATABASE.md §5.8/§5.9 |

## 9. DECISIÓN PENDIENTE

Todas las preguntas de esta sección quedaron **resueltas en MASTER-SPEC v0.5 (2026-09-24)**; se conservan como registro con su resolución:

| # | Pregunta | Impacto | Resolución |
| --- | --- | --- | --- |
| 1 | ~~¿Los jobs (alertas 30d, PDF, notificaciones) se implementan con Redis+BullMQ en v1 o se difieren?~~ | Diseño del módulo de jobs, transaccionalidad y arquitectura de containers | ✅ **RESUELTA (OQ-007)** — Redis + BullMQ en v1 (alertas 30d y PDF asíncrono son jobs reales); ADR-012 Accepted |
| 2 | ~~¿SSR y PWA completos en v1 o PWA mínima?~~ | Server rendering de Angular, estructura de deploy | ✅ **RESUELTA (OQ-010)** — PWA mínima en v1 (manifest + service worker + offline parcial de assets); SSR diferido a v1.1+ |
| 3 | ~~¿Storage S3 self-hosted (MinIO) o servicio cloud en producción?~~ | Abstracción de storage y firmado de URLs | ✅ **RESUELTA (OQ-006)** — MinIO self-hosted en producción (API S3 compatible, migrable a AWS S3 sin reescribir) |
| 4 | ~~¿El módulo `reports` queda 100 % fuera de v1 o entra un reporte mínimo en dashboard?~~ | Scope de v1 y carga del equipo | ✅ **RESUELTA** — `reports` fuera de v1, lo mínimo vive en `cargo`/`dashboard` (MASTER-SPEC §11.3; §5.6 de este documento) |
| 5 | ~~¿Qué se considera "estructura crítica del plano" que Operator no puede editar?~~ | Permisos de `map` (ver AUTHORIZATION.md) | ✅ **RESUELTA (OQ-015/028)** — el mapa es estático en v1 (sin editor visual); la edición de propiedades se hace por formularios ADMIN, fuera del alcance de Operator |
| 6 | ~~Distribución M:N: ¿unidad de capacidad por defecto por LocationType y cómo se expresa "ilimitado"?~~ | Esquema de capacidad, % de ocupación, seeds | ✅ **RESUELTA (OQ-041 → BR-041)** — defaults por tipo (Sector → AREA m²; Plazoleta → UNITS camiones); override por ubicación permitido; gobernanza ADMIN y auditada |
| 7 | ~~Distribución M:N: ¿el camión se modela como Location o el "en camión" es residual derivado?~~ | Descarga parcial, movimientos, mapa | ✅ **RESUELTA (OQ-042 → BR-042)** — el camión NO es Location; "en camión" = `totalQuantity − Σ CargoLocation activos` (unidades compatibles) con `Cargo.truckId` como vínculo |
| 8 | ~~Distribución M:N: ¿regla administrativa de sobreocupación (flag, límite %, rol autorizante)?~~ | BR-036 / `allowOverOccupation` | ✅ **RESUELTA (OQ-043)** — flag `allowOverOccupation` + límite configurable (default +10 %) + autorización solo ADMIN + observación obligatoria + auditoría; BR-036 ampliada |
| 9 | ~~Distribución M:N: ¿se permite conversión entre unidades en movimientos parciales?~~ | BR-034/035 y validación | ✅ **RESUELTA (OQ-044 → BR-048)** — sin conversión en v1: exige unidades compatibles (misma base o PERCENT); incompatible → 422 `INCOMPATIBLE_UNIT` |
| 10 | ~~Distribución M:N: ¿semántica de `percentage` en CargoLocation (almacenado vs derivado)?~~ | DTOs, frontend y consistencia | ✅ **RESUELTA (OQ-045 → BR-049)** — `quantity`+`quantityUnit` son la fuente de verdad; `percentage` derivado de UI salvo unidad PERCENT (donde es la cantidad misma) |