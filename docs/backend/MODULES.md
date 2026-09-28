# MODULES.md — Módulos del backend de CargoOps

> Grupo W5 — Backend. Fuente de verdad: `docs/MASTER-SPEC.md` §11.3 (lista de módulos), §4 (entidades/enums), §8 (RBAC), §10 (API). Complemento de `BACKEND-ARCHITECTURE.md` (capas y boundaries).

---

## 1. Objetivo

Catalogar los 16 módulos NestJS del backend (15 de dominio + `health`): responsabilidad, entidades que tocan, endpoints principales, dependencias entre módulos y clasificación **v1 esencial vs diferido**. Justifica qué módulos son imprescindibles en la primera versión y cuáles pueden simplificarse, alineado a MASTER-SPEC §11.3.

## 2. Contexto

MASTER-SPEC §11.3 define la lista de módulos y establece: **"v1 esencia: todos excepto `reports` (mínimo dentro de cargo/dashboard)"**. Esto significa que en la primera versión productiva los módulos `auth`, `users`, `roles`, `permissions`, `cargo`, `trucks`, `locations`, `movements`, `maps`, `alerts`, `dashboard`, `audit`, `notifications`, `settings` y `health` son necesarios (algunos en versión mínima, ver §4), mientras `reports` se difiere: las únicas consultas/reportes v1 viven acotados en `cargo` y `dashboard`.

## 3. Restricciones

| # | Restricción | Origen |
| --- | --- | --- |
| R-01 | No crear módulos fuera de esta lista en v1; si un módulo diferido se adelanta, es decisión del orquestador. | MASTER-SPEC §11.3 |
| R-02 | Los módulos NO importan repositorios/entidades/DTOs de otros módulos; solo services públicos exportados (boundaries, ADR-001). | BACKEND-ARCHITECTURE §5.3 |
| R-03 | `reports` no se implementa en v1; su alcance se re-evalúa con el roadmap (fase 12+). | MASTER-SPEC §11.3 |
| R-04 | El grafo de dependencias entre módulos es acíclico. | ADR-001 (modular monolith) |

## 4. V1 esencial vs diferido (resumen)

| Módulo | V1 | Alcance v1 | Diferido / simplificable |
| --- | --- | --- | --- |
| auth | ✅ Esencial | login/refresh/logout, JWT + refresh token (ADR-008) | MFA, recovery, SSO (futuro) |
| users | ✅ Esencial | CRUD usuarios, activación, soft delete, asignación de roles (ADMIN) | Self-service, invitation emails |
| roles | ✅ Esencial | Crud de roles + bundle de permisos (3 roles seed: VIEWER/OPERATOR/ADMIN) | Roles custom complejos |
| permissions | ✅ Esencial | Catálogo de permisos + asignación RolePermission (solo lectura + gestión ADMIN) | Permisos granulares por entidad/fila |
| cargo | ✅ Esencial | CRUD cargas, código único (BR-001/002), estados (BR-016), export-pdf, **distribución M:N (facade sobre CargoLocation — secciones 62-70)** | CargoItem (split, OQ-002), fotos/documentos |
| trucks | ✅ Esencial | CRUD camiones, alta de camión a plazoleta (IN_TRUCK) | Asignación multi-carga avanzada (OQ-003) |
| locations | ✅ Esencial | CRUD ubicaciones, capacidad por unidad (BR-005/033/035/036), estado ACTIVE/INACTIVE/MAINTENANCE (BR-004), consultas de capacidad/ocupación y cargas por ubicación (aggregation) | Default de unidad por LocationType (OQ-041); conversión de unidades (OQ-044) |
| movements | ✅ Esencial | Movimientos con observación obligatoria (BR-006/007), historial (BR-008), reversión (ADMIN, BR-012), **transacciones de segmentos CargoLocation (crear/ajustar/egresar + observación — BR-039)** | Split/parcialidad avanzada (OQ-002) |
| maps | ✅ **Esencial (lectura)** | Obtener plano + elementos para render del front; PATCH del plano ADMIN | Editor visual completo (fase 11; OQ-015) |
| alerts | ✅ Esencial | STALE_30D (BR-014) + CAPACITY (BR-033/036 — ver JOBS.md §4.13) + estados de alerta; generación vía job (ver JOBS.md) | CUSTOM como alerta real (v1.1); umbral/severidad de capacidad (OQ-041/043) |
| dashboard | ✅ Esencial | KPIs operativos: ocupación, alertas abiertas, cargas por estado | Widgets configurables, gráficos avanzados |
| reports | ❌ **Diferido** | Solo el mínimo acotado en cargo/dashboard (listados + export-pdf) | Módulo completo de reportes/estadísticas (futuro) |
| audit | ✅ Esencial | AuditLog de acciones (ADR-010), consulta con filtros | Export/retention avanzada (futuro) |
| notifications | ✅ Esencial (mínimo) | IN_APP (BR-019, OQ-011); acuse de lectura | EMAIL/PUSH/WHATSAPP/WEBHOOK (reservados, fuera v1) |
| settings | ✅ Esencial (mínimo) | Configuración global: días alerta, unidades, defaults | Settings por predio/tenant (futuro) |
| health | ✅ Esencial (infra) | Liveness/readiness (BACKEND-ARCHITECTURE §5.6) | Métricas de negocio |

## 5. Detalle por módulo

### 5.1 auth
- **Responsabilidad**: autenticación con JWT + refresh token (ADR-008), login/logout/refresh, session management.
- **Entidades**: User (lectura), RefreshToken/Session (entidad técnica).
- **Endpoints**: `POST /api/v1/auth/login`, `POST /api/v1/auth/refresh`, `POST /api/v1/auth/logout` (contratos en `API.md`).
- **Dependencias (imports)**: `users` (validar credenciales y estado), `audit` (LOGIN/LOGOUT).
- **V1**: esencial — nadie opera sin auth.

### 5.2 users
- **Responsabilidad**: administración de usuarios: alta, edición, activación/desactivación, cambio de contraseña, soft delete (ADR-011), asignación de roles.
- **Entidades**: User, UserRole.
- **Endpoints**: `GET/POST /api/v1/users`, `GET/PATCH /api/v1/users/:id`, `POST /api/v1/users/:id/roles` (propuesto; ver `API.md` §4).
- **Dependencias**: `roles` (validar roles existentes), `audit` (CREATE/UPDATE/DELETE de usuarios).
- **V1**: esencial (RBAC exige administrar usuarios); gestor es ADMIN (BR-010/011/012).

### 5.3 roles
- **Responsabilidad**: catálogo de roles y su bundle de permisos (RBAC, ADR-009). Seeds: VIEWER, OPERATOR, ADMIN (MASTER-SPEC §8).
- **Entidades**: Role, RolePermission.
- **Endpoints**: `GET /api/v1/roles`, `GET /api/v1/roles/:id`, `PUT /api/v1/roles/:id/permissions` (propuesto; ADMIN).
- **Dependencias**: `permissions` (validar códigos), `audit` (PERMISSION_CHANGE).
- **V1**: esencial pero mínimo: los 3 roles fijos + permisos; sin UI compleja de edición (puede ser DTO/servicio directo v1).

### 5.4 permissions
- **Responsabilidad**: catálogo de permisos (`cargo.create`, `cargo.move`, `cargo.delete_soft`, `cargo.revert`, `map.edit`, `users.manage`, `settings.manage`, `audit.read`, etc.) y asignación a roles.
- **Entidades**: Permission, RolePermission.
- **Endpoints**: `GET /api/v1/permissions` (propuesto).
- **Dependencias**: ninguna de dominio (solo audit para el cambio).
- **V1**: esencial como catálogo inmutable en v1 (los bundles se definen en seed; la edición queda habilitada pero no es foco).

### 5.5 cargo
- **Responsabilidad**: núcleo del dominio — registro y ciclo de vida de cargas: CRUD, código único (BR-001/002), máquina de estados (BR-016), notas/observaciones de carga, exportación PDF (BR-018, ADR-013), consulta de historial de movimientos, y **distribución M:N (secciones 62-70)**: el módulo es la **facade sobre `CargoLocation`** — expone los endpoints de segmentos (alta/ajuste/egreso/consulta) y orquesta hacia `movements`, que ejecuta la transacción (Movement + Observation + CargoLocation); no duplica contratos (R-02) ni implementa lógica transaccional propia.
- **Entidades**: Cargo, CargoLocation (facade/lectura), Observation (notas), Movement (consulta), Alert (consulta), Location (consulta actual y capacidad).
- **Endpoints**: `GET/POST /api/v1/cargos`, `GET/PATCH /api/v1/cargos/:id`, `GET /api/v1/cargos/:id/movements`, `POST /api/v1/cargos/:id/movements`, `POST /api/v1/cargos/:id/export-pdf` (MASTER-SPEC §10), **`GET /api/v1/cargos/:id/locations` y `POST /api/v1/cargos/:id/locations`**, **`PATCH/DELETE /api/v1/cargos/:id/locations/:cargoLocationId`** (MASTER-SPEC §10 — distribución).
- **Dependencias**: `movements` (ejecutar movimientos y transacciones de segmentos), `locations` (validar destino/capacidad), `audit` (registrar), `notifications` (eventos si aplica).
- **V1**: esencial e imprescindible; simplificación: DTOs de creación sin split/parcialidad avanzada (OQ-002) — `totalQuantity`/`totalUnit` opcionales según MASTER-SPEC v0.2.

### 5.6 trucks
- **Responsabilidad**: registro y gestión de camiones; vínculo a cargas (Cargo.truckId) y operaciones de plazoleta (IN_TRUCK).
- **Entidades**: Truck.
- **Endpoints**: `GET/POST /api/v1/trucks`, `GET/PATCH /api/v1/trucks/:id` (propuestos; ver `API.md` §9).
- **Dependencias**: `audit`; `cargo` (consulta de cargas asignadas).
- **V1**: esencial pero simple (CRUD + soft delete). La división de cargas en varios camiones queda fuera (OQ-003).

### 5.7 locations
- **Responsabilidad**: ubicaciones del predio (abstracción única, MASTER-SPEC §4.4.7): plazoleta, sectores 1–12, Scanner, Balanza, Rezago, Secuestro (17 seeds §5); capacidad por unidad `capacity`/`capacityUnit` (BR-005/035/036), estado (BR-004), ocupación derivada (BR-033) y **consultas de capacidad/ocupación (aggregation)** sobre los segmentos `CargoLocation` ACTIVOS de la ubicación. Expone, sin duplicar contratos de `cargo`/`movements`, la vista "cargas de una ubicación" y el desglose de capacidad.
- **Entidades**: Location (capacity, capacityUnit, occupiedCapacity/availableCapacity derivados, allowOverOccupation), CargoLocation (lectura agregada para ocupación).
- **Endpoints**: `GET /api/v1/locations`, `GET /api/v1/locations/:id`, `PATCH /api/v1/locations/:id` (capacidad/estado/campos visuales; ADMIN), `POST /api/v1/locations` (propuesto), **`GET /api/v1/locations/:id/cargos`** (cargas de la ubicación con cantidad/porcentaje/estado de segmento/alertas — BR-040), **`GET /api/v1/locations/:id/capacity`** (capacidad, ocupada, disponible, desglose por unidad — BR-033/040).
- **Dependencias**: `audit` (CAPACITY_CHANGE); es consultada por `cargo`, `movements`, `maps`, `dashboard`.
- **V1**: esencial. Default de `capacityUnit` por tipo de ubicación → OQ-041; conversión de unidades → OQ-044.

### 5.8 movements
- **Responsabilidad**: todo cambio de ubicación/estado de una carga: validación de transiciones (BR-016), observación obligatoria (BR-006/007), historial (BR-008), reversión (BR-012), actualización de ocupación (BR-005) y **transacciones de segmentos `CargoLocation` (secciones 62-70)**: crear/ajustar/egresar segmentos con observación obligatoria (BR-039) y validación de suma distribuida/capacidad (BR-034/036) en la MISMA transacción. Es el módulo con la transacción crítica (BACKEND-ARCHITECTURE §5.5).
- **Entidades**: Movement, Observation, CargoLocation (escritura), Cargo (escritura), Location (capacidad), AuditLog.
- **Endpoints**: `POST /api/v1/cargos/:id/movements`, `GET /api/v1/cargos/:id/movements` (expuestos por `cargo` y orquestados hacia `movements`), `POST /api/v1/movements/:id/revert` (propuesto; ADMIN), y las transacciones de segmentos **`POST /api/v1/cargos/:id/locations`, `PATCH/DELETE /api/v1/cargos/:id/locations/:cargoLocationId`** — HTTP expuesto por `cargo` (facade), ejecución transaccional en `movements` (sin duplicar contratos).
- **Dependencias**: `cargo` (estado actual), `locations` (capacidad/estado), `audit`. No expone HTTP propio en v1 salvo revert/consultas puntuales (ver `API.md`).
- **V1**: esencial e imprescindible; corazón del dominio.

### 5.9 maps
- **Responsabilidad**: planos del predio: datos estructurados de layout (BR-020), elementos (MapElement), versionado; lectura para el render (motor SVG, ADR-006) y edición (PATCH) por ADMIN.
- **Entidades**: Map, MapElement, Location (vínculo visual).
- **Endpoints**: `GET /api/v1/maps`, `GET /api/v1/maps/:id`, `PATCH /api/v1/maps/:id` (editar elementos; ADMIN), propuesto `PUT /api/v1/maps/:id/elements/:elementId`.
- **Dependencias**: `locations` (vincular elementos a ubicaciones), `audit` (MAP_EDIT), `settings` (gridSize/defaults).
- **V1**: esencial en modo LECTURA (rendering del plano); el editor completo es fase 11 (OQ-015). PATCH del plano puede simplificarse a operaciones por elemento.

### 5.10 alerts
- **Responsabilidad**: generación y gestión de alertas: STALE_30D (BR-014), estados OPEN/ACKNOWLEDGED/RESOLVED/DISMISSED, severidad, vínculo a carga.
- **Entidades**: Alert.
- **Endpoints**: `GET /api/v1/alerts` (filtros), `PATCH /api/v1/alerts/:id` (acknowledge/resolve/dismiss; propuesto).
- **Dependencias**: `cargo` (permanencia), `movements` (revisión), job de detección (ver `JOBS.md`).
- **V1**: esencial; la generación corre por job diario/cron (JOBS.md §5), sin mover cargas automáticamente (BR-014).

### 5.11 dashboard
- **Responsabilidad**: KPIs operativos para la pantalla principal: cargas por estado, ocupación por ubicación, alertas abiertas, actividad reciente.
- **Entidades**: Cargo, Location, Alert, Movement (agregaciones de lectura).
- **Endpoints**: `GET /api/v1/dashboard` (MASTER-SPEC §10).
- **Dependencias**: `cargo`, `locations`, `alerts` (agregaciones).
- **V1**: esencial, mínimo (un endpoint agregado); no es BI.

### 5.12 reports
- **Responsabilidad (diferido)**: reportes/estadísticas avanzadas (exportaciones masivas, histórico de ocupación, productividad, etc.).
- **Entidades**: agregaciones sobre Cargo/Movement/Alert/Location.
- **Endpoints**: diferidos (re-evaluar en roadmap fase 12+).
- **V1**: **NO se implementa**. MASTER-SPEC §11.3: "mínimo dentro de cargo/dashboard". El export-pdf de una carga vive en `cargo`, el resumen de ocupación en `dashboard`. Justificación: el dominio operativo no requiere BI para operar; evita sobre-ingeniería (YAGNI) y cae tras las fases 1–11 del roadmap.

### 5.13 audit
- **Responsabilidad**: registro y consulta de Auditoría (ADR-010): cada mutación, login/logout, permisos, mapas, reversiones (AuditAction §4.3) con previous/new values.
- **Entidades**: AuditLog.
- **Endpoints**: `GET /api/v1/audit` (filtros: entidad, acción, usuario, rango de fechas; propuesto).
- **Dependencias**: consumido por todos los módulos de escritura (service público `AuditService.record(...)`).
- **V1**: esencial e imprescindible (BR-008/013, ADR-010); se escribe en la misma transacción (BACKEND-ARCHITECTURE §5.5).

### 5.14 notifications
- **Responsabilidad**: notificaciones in-app (BR-019, OQ-011): creación, listado, lectura; desacoplada de proveedores (abstracción `NotificationChannel`).
- **Entidades**: Notification.
- **Endpoints**: `GET /api/v1/notifications`, `PATCH /api/v1/notifications/:id/read` (propuestos).
- **Dependencias**: `users` (destinatarios), `cargo`/`alerts` (eventos emisores).
- **V1**: esencial en forma MÍNIMA: solo IN_APP y canal desacoplado. EMAIL/PUSH/etc. son enums reservados, no implementados (OQ-011).

### 5.15 settings
- **Responsabilidad**: configuración global del sistema (días para alerta de rezago BR-015, unidad de capacidad por defecto OQ-009, defaults operativos).
- **Entidades**: Settings/SettingItem (pares clave-valor tipados) — entidad técnica.
- **Endpoints**: `GET /api/v1/settings`, `PATCH /api/v1/settings` (ADMIN; propuestos).
- **Dependencias**: `audit`; consumido por `alerts`, `locations`, `maps`.
- **V1**: esencial en forma MÍNIMA (pocas claves con defaults en seed). Adminitración solo por ADMIN (BR-011).

### 5.16 health
- **Responsabilidad (infraestructura)**: liveness/readiness, checks de dependencias (DB, Redis si aplica), métricas de arranque.
- **Entidades**: ninguna.
- **Endpoints**: `GET /api/v1/health`, `GET /api/v1/health/ready` (BACKEND-ARCHITECTURE §5.6).
- **V1**: esencial para orquestación (kubernetes/Docker healthchecks, W9 devops).

## 6. Matriz de dependencias entre módulos

`→` significa "importa servicio público de". Lectura: fila depende de columnas.

| Módulo | auth | users | roles | perms | cargo | trucks | locs | movs | maps | alerts | dash | audit | notif | settings |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| auth | — | ✅ | | | | | | | | | | ✅ | | |
| users | | — | ✅ | | | | | | | | | ✅ | | |
| roles | | | — | ✅ | | | | | | | | ✅ | | |
| permissions | | | | — | | | | | | | | ✅ | | |
| cargo | | | | | — | | ✅ | ✅ | | ✅(lect) | | ✅ | ✅ | |
| trucks | | | | | ✅(lect) | — | | | | | | ✅ | | |
| locations | | | | | | | — | | ✅(vínculo) | | | ✅ | | |
| movements | | | | | ✅ | | ✅ | — | | | | ✅ | | |
| maps | | | | | | | ✅ | | — | | | ✅ | | ✅ |
| alerts | | | | | ✅ | | | | | — | | ✅ | ✅ | ✅ |
| dashboard | | | | | ✅ | | ✅ | ✅ | | ✅ | — | | | |
| reports (diferido) | | | | | ✅ | | ✅ | ✅ | | ✅ | ✅ | | | |
| audit | | | | | | | | | | | | — | | |
| notifications | | ✅ | | | ✅ | | | | | ✅ | | | — | |
| settings | | | | | | | | | ✅ | ✅ | | ✅ | | — |
| health | | | | | | | | | | | | | | |

Notas: (1) el grafo es acíclico; (2) `cargo → movements` es la orquestación de movimientos (el endpoint vive en cargo); (3) `alerts → movements` solo para la decisión humana documentada (BR-014 es manual, no automático); (4) `reports` se lista solo para el diseño futuro; (5) **distribución M:N (secciones 62-70)**: `cargo` es la facade sobre `CargoLocation` (expone `GET/POST /cargos/:id/locations` y `PATCH/DELETE /cargos/:id/locations/:cargoLocationId`, API.md §5.9-5.12), `movements` ejecuta las transacciones de segmentos (crear/ajustar/egresar + observación, BR-039) y `locations` provee las agregaciones de ocupación/capacidad (`GET /locations/:id/cargos`, `GET /locations/:id/capacity`, API.md §6.4-6.5) — los contratos HTTP se exponen UNA sola vez, sin duplicar (R-02).

## 7. Justificación de v1 esencia

- **Imprescindibles hoy**: `auth`+`users`+`roles`+`permissions` (nadie opera sin RBAC, BR-009/010/011/012), `cargo`+`locations`+`movements` (núcleo operativo: registrar, ubicar, mover, trazabilidad BR-008), `audit` (BR-013/ADR-010), `alerts` (BR-014 es una regla CRÍTICA de negocio), `dashboard` (consulta principal del viewer), `maps` en lectura (el plano es la pantalla central de operación, MASTER-SPEC §11.5), `health` (operabilidad del servicio vía DevOps/kubernetes).
- **Simplificables en v1**: `notifications` (solo IN_APP, OQ-011), `settings` (pocas claves), `trucks` (CRUD simple), `maps` (editor diferido, OQ-015), `permissions` (catálogo fijo + seeds).
- **Diferidos**: `reports` (MASTER-SPEC §11.3; YAGNI, se cubre con cargo/dashboard) y roles avanzados/MFA/notificaciones multicanal (enums reservados).

## 8. Criterios de aceptación

1. Los 16 módulos figuran en el plano con responsabilidad, entidades, endpoints y dependencias.
2. La clasificación v1/diferido es coherente con MASTER-SPEC §11.3 (reports diferido; resto esencial con simplificaciones).
3. La matriz de dependencias §6 es acíclica y coincide con los boundaries de BACKEND-ARCHITECTURE §5.3.
4. Todo endpoint listado aquí tiene contrato detallado en `API.md`.

## 9. Archivos involucrados

- `docs/backend/MODULES.md` (este), `BACKEND-ARCHITECTURE.md`, `API.md`, `DTOs.md`, `VALIDATION.md`, `JOBS.md`
- `docs/MASTER-SPEC.md` (§4, §8, §10, §11.3), `docs/OPEN-QUESTIONS.md`

## 10. Riesgos

| Riesgo | Mitigación |
| --- | --- |
| `movements` se acoplaba a reglas de capacidad no decididas (OQ-009/014 → **resueltas 2026-09-24**: BR-041 unidad efectiva; OQ-014 Plazoleta UNITS) | El service de movements consume la regla vía `LocationsService`/`settings`; el cambio de regla no altera la transacción (BACKEND-ARCHITECTURE §5.5) |
| Maps en lectura puede quedar obsoleto si el editor (fase 11) cambia el modelo | MapElement ya está canónico (MASTER-SPEC §4.1); la escritura por PATCH se define ahora y el editor completo la reutiliza |
| ~~Alertas automáticas sin job real (OQ-007)~~ → **resuelta (OQ-007 → ADR-012, 2026-09-24: jobs reales BullMQ + Redis)** | La alternativa in-process de JOBS.md queda obsoleta |
| Reports diferido genera presión de negocio temprana | El mínimo acotado en cargo/dashboard cubre operación; escalado documentado |

## 11. DECISIÓN PENDIENTE

> Las OQ referenciadas quedaron **resueltas en FASE 0** (MASTER-SPEC v0.5 / OPEN-QUESTIONS, 2026-09-23/24): las filas tachadas con `→ RESUELTA` ya tienen decisión canónica; las marcadas **🔶** son **residuales locales** sin resolver (decisión de implementación/equipo, no de negocio).

| # | Pregunta | Impacto | Referencia |
| --- | --- | --- | --- |
| 1 | ~~¿Notificaciones solo in-app en v1 o se integra email desde el inicio?~~ → **RESUELTA (OQ-011/023, 2026-09-24)**: **solo in-app (IN_APP)** en v1; arquitectura desacoplada de proveedores lista (BR-019) para EMAIL/PUSH en v1.1 | Alcance de notifications (§5.14) | OQ-011 (resuelta 2026-09-24) |
| 2 | ~~¿Editor de planos completo en v1 (fase 11) o vista estática hasta entonces?~~ → **RESUELTA (OQ-015, 2026-09-24)**: el mapa es **vista estática** en v1 (lectura + selección + hover); editor visual de planos diferido (datos por seed/configuración, OQ-028 formularios ADMIN) | Alcance de maps (§5.9) | OQ-015 (resuelta 2026-09-24) |
| 3 | ~~¿La carga parcial se modela v1 como unidad simple + quantity o se introduce CargoItem?~~ → **RESUELTA (OQ-002, secciones 62-70)**: distribución vía `CargoLocation` (cantidad, unidad, porcentaje opcional); **CargoItem NO se introduce en v1**; modelo compatible a futuro | Dominio cargo/movements (§4) | OQ-002 (resuelta) |
| 4 | ~~¿Existe operación de egreso/retiro de carga en v1?~~ → **RESUELTA (OQ-004 → BR-043, 2026-09-23)**: sí, egreso completo: movimiento `EXIT` con observación obligatoria, remito/documentación opcionales (`exitDocumentRef?`), auditoría; `EXITED` terminal | Flujo EXITED en máquina de estados y endpoints | OQ-004 (resuelta 2026-09-23) |
| 5 | ~~¿Redis + BullMQ en v1 o scheduler in-process?~~ → **RESUELTA (OQ-007 → ADR-012 Accepted, 2026-09-24)**: **Sí en v1**: alertas de permanencia (BR-014/015) y generación asíncrona de PDF (OQ-005) son jobs reales | alerts/notifications/PDF execution | OQ-007 (resuelta 2026-09-24) |