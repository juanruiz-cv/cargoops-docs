# CargoOps — Modelo de Datos (DATABASE.md)

> Grupo W2 · Arquitectura · Fuente de verdad: `docs/MASTER-SPEC.md` §4 (modelo de dominio canónico).
> Estado: borrador FASE 0 (documentación). Sin migraciones reales (se crearán con Prisma en la fase de implementación).

## 1. Objetivo

Definir el modelo relacional completo de CargoOps sobre PostgreSQL 16+ con Prisma: entidades, columnas, tipos, claves, constraints, índices, enums, estrategia de migraciones y justificaciones de diseño. Es la especificación que el grupo W5 (backend) traducirá a esquema Prisma y los equipos de QA usarán para diseñar pruebas.

## 2. Contexto

MASTER-SPEC §4 define el modelo de dominio canónico: 15 entidades (User, Role, Permission, RolePermission, UserRole, Truck, Cargo, **CargoLocation**, Location, Movement, Observation, Alert, Notification, Map, MapElement, AuditLog) con campos clave, relaciones y enums. Este documento lo materializa como modelo relacional concreto, preservando todas las decisiones canónicas:

- Cargo.code es **string único** (nunca entero) — §4.4.1 / BR-002 (reglas exactas: OQ-001).
- **CargoStatus separado de la ubicación** — §4.4.2.
- **Observation como entidad propia** — §4.4.3 (justificación en §9).
- **Soft delete + audit log + revert**; sin hard delete operacional — §4.4.4 / ADR-011 / BR-013.
- Carga parcial / distribución M:N modelada vía `CargoLocation` (segmentos con cantidad, unidad, porcentaje opcional, ingreso/salida por ubicación — secciones 62-67); el estado `PARTIALLY_UNLOADED` y el residual en camión derivan de la suma de segmentos activos (BR-038). El camión **NO es una Location** (OQ-042 resuelta → BR-042): el residual "en camión" es derivado (`total_quantity − Σ CargoLocation activos`, unidades compatibles) y nunca se materializa como CargoLocation ni como nodo del plano. La antigua opción A de OQ-002 (`quantity`/`quantityMoved` en Cargo como única representación de carga parcial) queda **superada** por este modelo; `CargoItem` sigue descartado en v1.
- Location es la **abstracción única** de espacio físico — §4.4.7.

## 3. Restricciones

- PostgreSQL 16+ (ADR-004) y Prisma como ORM (ADR-005): enums de Prisma mapean a enums nativos de PostgreSQL; JSONB para datos semiestructurados (`properties`, `metadata`).
- Naming: tablas/columnas en `snake_case` (con `@@map`/`@map` en Prisma); modelo Prisma en `PascalCase`/`camelCase`. Timestamps en `timestamptz` (`created_at`, `updated_at`).
- Todas las entidades operacionales (Cargo, Truck, Location?, Map, etc.) soportan **soft delete** (`deleted_at`) — MASTER-SPEC §4.1 marca `deletedAt (soft)` donde corresponde; ADR-011.
- No se aplican **constraints de negocio costosos en la DB** cuando la regla se valida mejor en servicio (p. ej. suma distribuida ≤ total BR-034 y capacidad BR-035/036 se validan en transacción de aplicación porque `occupiedCapacity` es derivado); la DB valida integridad referencial y unicidad, el servicio valida reglas de negocio. BR-034 se complementa con una vista de control documentada (§5.8).
- La unicidad de `cargo.code` depende de las reglas de normalización (OQ-001): el índice único preliminar asume exact-match; puede pasar a expresión/normalizado cuando se defina.

## 4. Dependencias

- `docs/MASTER-SPEC.md` §4 (entidades y enums), §5 (seeds), §6 (BR), §10 (API paginación).
- `docs/OPEN-QUESTIONS.md`: **todas resueltas en v0.5** — OQ-001 (código → BR-002), OQ-003 (camión-carga → BR-050), OQ-043 (sobreocupación → BR-036 ampliada), OQ-044 (conversión de unidades → BR-048), OQ-045 (semántica de `percentage` → BR-049), OQ-015 (plano → mapa estático v1), OQ-002 y OQ-009 (secciones 62-70, `CargoLocation`), **OQ-041 → BR-041** (unidad de capacidad por defecto por LocationType + override por ubicación) y **OQ-042 → BR-042** (camión NO es Location; residual derivado `total_quantity − Σ activos`; `CARGO_TOTAL_REQUIRED` 422).
- `architecture/ADR/ADR-004` (PostgreSQL), ADR-005 (Prisma), ADR-010 (AuditLog), ADR-011 (Soft Delete).
- Hermano: `ARCHITECTURE.md` (módulos que poseen cada entidad), `AUDIT.md` (uso de AuditLog), `MAP-ENGINE.md` (Map/MapElement), `PERFORMANCE.md` (índices y consultas).

## 5. Decisiones

### 5.1 Estrategia de claves primarias — DECISIÓN PENDIENTE con recomendación

**Recomendación**: `UUID` (v7, ordenable por tiempo) como PK de todas las tablas, generado en la aplicación (Prisma `@default(uuid(7))`).

- Ventajas: no expone volumen de datos en URLs/APIs, unifica claves entre entidades, habilita futura consolidación multi-sitio/multi-tenant sin colisiones (SCALABILITY.md), útiles los IDs tipo v7 por monoticidad aproximada para particionado futuro.
- Costo: +16 bytes por índice vs `bigserial`; fragmentación menor con v7 que v4.

**Detalle**: la decisión final se confirma con el orquestador (ver §12). Las FKs de este documento se documentan como `uuid`.

### 5.2 Convenciones transversales

- **Timestamps**: `created_at`, `updated_at` (`timestamptz`, default `now()`; `updated_at` on-update). **Soft delete**: `deleted_at` nullable (`timestamptz`).
- **JSONB**: `properties`, `metadata`, `previous_value`, `new_value`, `data` sin esquema rígido; validación de contenido en DTOs/servicios (no en DB).
- **Enums**: nativos PostgreSQL via Prisma (`@pgEnum`); los valores son los canónicos de MASTER-SPEC §4.3.
- **Soft delete en consultas**: todas las queries de aplicación filtran `deleted_at IS NULL` salvo administración/restauración (patrón en repositorios; BR-013). Adicionalmente se indica **partial index** en tablas grandes.
- **Naming de columna por entidad**: FK = `{entidad}_id` (p. ej. `cargo_id`, `location_id`, `created_by_id`).

### 5.3 Modelo por entidad

#### users (`User`)

| Columna | Tipo | Constraints | Descripción |
| --- | --- | --- | --- |
| id | uuid | PK | Identificador |
| username | varchar(50) | UNIQUE, NOT NULL | Usuario de acceso |
| email | varchar(255) | UNIQUE, NOT NULL | Correo (login alternativo futuro) |
| password_hash | varchar(255) | NOT NULL | Hash Argon2id/bcrypt (SECURITY.md §5.2) |
| name | varchar(150) | NOT NULL | Nombre visible |
| active | boolean | NOT NULL default true | Deshabilitar sin borrar |
| last_login_at | timestamptz | NULL | Último acceso (dashboard/admin) |
| created_at / updated_at | timestamptz | NOT NULL | Auditoría temporal |
| deleted_at | timestamptz | NULL (soft) | ADR-011 |

Índices: `uq_users_username` (único), `uq_users_email` (único). Relaciones: N:M con `roles` vía `user_roles`; 1:N a `audit_logs`, `observations`, `notifications`; autores en `cargo.created_by_id` / `last_moved_by_id`.

#### roles (`Role`)

| Columna | Tipo | Constraints | Descripción |
| --- | --- | --- | --- |
| id | uuid | PK | |
| code | varchar(30) | UNIQUE, NOT NULL | `VIEWER` \| `OPERATOR` \| `ADMIN` (MASTER-SPEC §8) |
| name | varchar(80) | NOT NULL | Nombre legible |
| description | text | NULL | |

Índices: `uq_roles_code`. Relación: N:M con permisos vía `role_permissions`; N:M con usuarios vía `user_roles`.

#### permissions (`Permission`)

| Columna | Tipo | Constraints | Descripción |
| --- | --- | --- | --- |
| id | uuid | PK | |
| code | varchar(80) | UNIQUE, NOT NULL | p. ej. `cargo.create` (catálogo: AUTHORIZATION.md §5.2) |
| description | varchar(255) | NULL | |

Índices: `uq_permissions_code`.

#### user_roles (`UserRole` — puente User N:M Role)

| Columna | Tipo | Constraints | Descripción |
| --- | --- | --- | --- |
| user_id | uuid | FK → users.id, NOT NULL | PK compuesta (user_id, role_id) |
| role_id | uuid | FK → roles.id, NOT NULL | |
| granted_at | timestamptz | NOT NULL default now() | Trazabilidad de asignación |
| granted_by_id | uuid | FK → users.id, NULL | Quién asignó (auditoría; si el usuario fue soft-deleted queda NULL) |

Constraints: PK `(user_id, role_id)`; FK `ON DELETE RESTRICT` (roles no se borran en v1; users con soft delete, nunca hard en operaciones). Índice secundario por `role_id`.

#### role_permissions (`RolePermission` — puente Role N:M Permission)

| Columna | Tipo | Constraints | Descripción |
| --- | --- | --- | --- |
| role_id | uuid | FK → roles.id, NOT NULL | PK compuesta (role_id, permission_id) |
| permission_id | uuid | FK → permissions.id, NOT NULL | |
| granted | boolean | NOT NULL default true | `granted=false` permite **denegación explícita** (excepción de rol) — AUTHORIZATION.md §5.6 |

Constraints: PK `(role_id, permission_id)`; el catálogo de permisos es fijo (seeds); la matriz efectiva = permisos del rol ⊕ excepciones. Índice secundario por `permission_id`.

#### trucks (`Truck`)

| Columna | Tipo | Constraints | Descripción |
| --- | --- | --- | --- |
| id | uuid | PK | |
| plate | varchar(20) | UNIQUE, NOT NULL | Patente |
| brand | varchar(50) | NULL | |
| model | varchar(50) | NULL | |
| driver_name | varchar(120) | NULL | Opcional (MASTER-SPEC §4.1) |
| created_at / updated_at / deleted_at | timestamptz | soft | |

Índices: `uq_trucks_plate`; `ix_trucks_driver_name` (búsqueda). Relación: 1:N con `cargo` (`truck_id`). OQ-003 resuelta (BR-050): una carga se asocia a **UN camión a la vez** (la FK simple lo refleja); un camión puede transportar N cargas.

#### cargo (`Cargo`)

| Columna | Tipo | Constraints | Descripción |
| --- | --- | --- | --- |
| id | uuid | PK | |
| code | varchar(120) | UNIQUE, NOT NULL | Código alfanumérico (BR-001/002; normalización OQ-001) |
| name | varchar(255) | NULL | Descripción corta |
| status | CargoStatus | NOT NULL | Enum §6.1 (BR-016: transiciones vía state machine) |
| truck_id | uuid | FK → trucks.id, NULL | Camión actual (opcional) |
| total_quantity | numeric(14,2) | NULL — requerido condicional | Total declarado de la carga para validar distribución (BR-034). Opcional en el ALTA, pero **obligatorio antes de cualquier movimiento o descarga parcial** (BR-042): sin total declarado, la primera distribución parcial se rechaza con `CARGO_TOTAL_REQUIRED` (422). La condición es temporal (depende de operaciones posteriores), por lo que se valida en la transacción de aplicación (movimientos/segmentos), no con un CHECK en DB (coherente con §3) |
| total_unit | QuantityUnit | NULL — requerido condicional | Unidad de `total_quantity`; debe ser compatible con los segmentos (BR-035). Misma condición que `total_quantity` (BR-042): ambos se exigen juntos; `total_unit` define la unidad del residual derivado "en camión" (`in_truck_unit`) |
| entry_date | timestamptz | NOT NULL | Fecha ingreso al predio; base de permanencia (BR-015 / OQ-008) |
| estimated_expiry_date | timestamptz | NULL | Estimación opcional |
| metadata | jsonb | NOT NULL default '{}' | Extensible (origen, documento, cliente…) |
| created_by_id | uuid | FK → users.id, NOT NULL | Autor del registro (soft delete de usuario → FK nullable por pragmática: ver AUDIT.md §5.4) |
| last_moved_by_id | uuid | FK → users.id, NULL | Último operador que movió |
| created_at / updated_at / deleted_at | timestamptz | soft | |

- **PK/FK**: **NO existe `location_id`** en v1: la relación Cargo↔Location es MANY-TO-MANY vía `cargo_locations` (BR-032, secciones 62-70); una carga puede estar en N ubicaciones y una ubicación en N cargas. El egreso (OQ-004) se materializa con `cargo_locations.status = EXITED` + movimiento, no con una columna en `cargo`.
- **Camión NO es Location (BR-042, OQ-042 resuelta)**: no existe `LocationType CAMION`; "en camión" es residual derivado = `total_quantity − Σ cargo_locations activos` (unidades compatibles), con `truck_id` como vínculo. El residual no se materializa como fila `cargo_locations` ni como nodo del plano; se expone en respuestas de carga como `inTruckAmount`/`inTruckUnit` (derivados, ver `backend/DTOs.md` §4.12).
- Índices:
  - `uq_cargo_code` (único; si OQ-001 define normalización, se reemplaza por índice funcional sobre la forma normalizada).
  - `ix_cargo_status` (parcial) — conteos por estado.
  - `ix_cargo_entry_date` — scan de permanencia/rezago (job 30 días, BR-014).
  - `ix_cargo_created_at` — listados recientes.
- Relaciones: N:M Location (vía `cargo_locations`), N:1 Truck, 1:N Movement, 1:N Alert, 1:N Observation (notas), 1:N CargoLocation, 1:N AuditLog (polimórfica).

#### cargo_locations (`CargoLocation` — segmento de distribución M:N, BR-032…040)

| Columna | Tipo | Constraints | Descripción |
| --- | --- | --- | --- |
| id | uuid | PK | |
| cargo_id | uuid | FK → cargo.id, NOT NULL | Carga distribuida (BR-032) |
| location_id | uuid | FK → locations.id, NOT NULL | Ubicación ocupada por el segmento |
| quantity | numeric(14,2) | NOT NULL, CHECK (quantity > 0) | Cantidad en esta ubicación; > 0 siempre |
| quantity_unit | QuantityUnit | NOT NULL | Unidad de `quantity` (UNITS \| PALLETS \| TONS \| CUBIC_METERS \| AREA \| PERCENT — MASTER-SPEC §4.3); debe ser compatible con `cargo.total_unit` (BR-035) |
| percentage | numeric(5,2) | NULL | Porcentaje de la carga en este segmento (0-100; semántica resuelta por OQ-045 → BR-049: derivado de UI salvo unidad PERCENT, donde es la cantidad misma) |
| entered_at | timestamptz | NOT NULL default now() | Ingreso efectivo del segmento (BR-039) |
| exited_at | timestamptz | NULL | Egreso efectivo; NOT NULL cuando `status = EXITED` (validación de aplicación) |
| status | CargoLocationStatus | NOT NULL default ACTIVE | ACTIVE \| EXITED (enum §5.5) |
| notes | text | NULL | Nota opcional del segmento (no reemplaza la observación obligatoria del movimiento, BR-006) |
| created_at / updated_at | timestamptz | NOT NULL | |

- **Una sola fila ACTIVE por par (cargo, location)**: índice único parcial `uq_cargo_locations_active (cargo_id, location_id) WHERE status = 'ACTIVE'` (Prisma no modela partial indexes nativamente → migración raw SQL, §5.6). La operación normal **actualiza** la fila activa (ajuste de cantidad/movimiento parcial), no la duplica (MASTER-SPEC §4.2).
- **Sin soft delete**: el ciclo de vida se representa con `status` + `exited_at` (egreso = EXITED, nunca borrado) — la fila es evidencia operativa (BR-038/039).
- **El residual "en camión" NO es un CargoLocation** (BR-042): deriva de `cargo.total_quantity − Σ segmentos ACTIVE` en unidad compatible; no se crean filas por "camión" (no existe Location de camión).
- Índices para las consultas de distribución (BR-040):
  - `ix_cargo_locations_cargo_id` (`(cargo_id, status)`) — todas las ubicaciones de una carga (`GET /api/v1/cargos/:id/locations`).
  - `ix_cargo_locations_location_id_status` (`(location_id, status)`) — cargas de una ubicación (`GET /api/v1/locations/:id/cargos`).
  - `ix_cargo_locations_location_id_status_unit` (`(location_id, status, quantity_unit)`) — agregación de ocupación por ubicación (BR-033; §5.9).
- Relaciones: N:1 Cargo, N:1 Location; 1:N Movement referencial (origen/destino de movimientos parciales — §5.3 movements).

#### locations (`Location`)

| Columna | Tipo | Constraints | Descripción |
| --- | --- | --- | --- |
| id | uuid | PK | |
| name | varchar(120) | NOT NULL | Plazoleta, Sector 4, Scanner… |
| code | varchar(50) | UNIQUE, NOT NULL | Código corto (sector-04…) |
| type | LocationType | NOT NULL | Enum §6.2 |
| status | LocationStatus | NOT NULL default ACTIVE | ACTIVE \| INACTIVE \| MAINTENANCE (BR-004: solo ACTIVE recibe cargas) |
| capacity | numeric(14,2) | NOT NULL default 0 | Tope configurable de la ubicación (MASTER-SPEC §4.1; se sustituyen los viejos `capacity_type`/`capacity_value`/`capacity_used`) |
| capacity_unit | QuantityUnit | NOT NULL | Unidad de `capacity` (QuantityUnit, MASTER-SPEC §4.3); **unidad efectiva** = override de la ubicación si se declara, o el **default por LocationType** (BR-041): SECTOR → `AREA`, PLAZOLETA/SCANNER/BALANZA → `UNITS`, otros → configurable (tabla de configuración, gobernanza ADMIN, auditado). El override se persiste en esta columna; sin override, la semántica la define el default del tipo |
| occupied_capacity | numeric(14,2) | NULL | **Derivado** = Σ CargoLocation activos en unidad compatible (BR-033/035); no se edita manualmente (§5.9) |
| available_capacity | numeric(14,2) | NULL | **Derivado** = capacity − occupied_capacity (BR-033); no se edita manualmente |
| allow_over_occupation | boolean | NOT NULL default false | Flag administrativo de sobreocupación (BR-036; regla resuelta por OQ-043: límite configurable default +10 %, autorización solo ADMIN, observación obligatoria y auditoría) |
| color | varchar(20) | NULL | Presentación mapa |
| description | varchar(255) | NULL | |
| properties | jsonb | NOT NULL default '{}' | Propiedades adicionales (MASTER-SPEC §3) |
| created_at / updated_at / deleted_at | timestamptz | soft | |

- Índices: `uq_locations_code`; `ix_locations_type_status` (filtros de mapa/dashboard).
- Relaciones: N:M Cargo (vía `cargo_locations`), 0..1 MapElement (vínculo del plano, §5.11), 1:N Movement (origen/destino).
- `occupied_capacity`/`available_capacity` derivados: no son columnas editables; representan la agregación de segmentos activos en **unidad compatible** (BR-035). Estrategia v1 y alternativas (vista SQL vs query-time) en §5.9. La unidad efectiva para la comparación es el `capacity_unit` de la ubicación: override explícito si existe, o el **default por LocationType** (BR-041 — SECTOR → AREA, PLAZOLETA/SCANNER/BALANZA → UNITS, otros → configurable).
- OQ-014: si el galpón/sector tiene capacidad de superficie y/o unidades; la tabla ya soporta uno o ambos vía `capacity_unit` por ubicación y `properties`.

#### movements (`Movement`)

| Columna | Tipo | Constraints | Descripción |
| --- | --- | --- | --- |
| id | uuid | PK | |
| cargo_id | uuid | FK → cargo.id, NOT NULL | Carga movida |
| kind | MovementKind | NOT NULL | Enum §6.4 |
| from_location_id | uuid | FK → locations.id, NULL | Origen (NULL en INGRESS) |
| to_location_id | uuid | FK → locations.id, NOT NULL | Destino |
| from_status | CargoStatus | NULL | Estado previo (historial reconstruible) |
| to_status | CargoStatus | NULL | Estado posterior |
| user_id | uuid | FK → users.id, NOT NULL | Operador |
| moved_at | timestamptz | NOT NULL default now() | Momento del movimiento |
| reason | varchar(255) | NOT NULL | Motivo libre (complementa observación) |
| observation_id | uuid | FK → observations.id, **NOT NULL UNIQUE** | Observación obligatoria 1:1 (BR-006/007) |
| quantity_moved | numeric(14,2) | NULL | Cantidad movida en movimientos parciales de distribución (BR-037); NULL = movimiento de la carga completa |
| from_cargo_location_id | uuid | FK → cargo_locations.id, NULL | Segmento de origen en movimientos parciales (MASTER-SPEC §4.2) |
| to_cargo_location_id | uuid | FK → cargo_locations.id, NULL | Segmento de destino en movimientos parciales (MASTER-SPEC §4.2) |
| metadata | jsonb | NOT NULL default '{}' | Detalles operativos adicionales |
| reversion_of_id | uuid | FK → movements.id (self), NULL | Si es una REVERSION, apunta al movimiento original |
| reversed_by_id | uuid | FK → movements.id (self), NULL | Si fue revertido, apunta al movimiento de reversión |
| reversed_at | timestamptz | NULL | Cuándo se revirtió |
| created_at / updated_at | timestamptz | NOT NULL | |

- **Observación 1:1 obligatoria**: `observation_id NOT NULL UNIQUE` materializa la relación canónica (§4.1: "Observation ... movementId? (1:1, obligatoria en movimientos)"). Se crea la observación en la misma transacción que el movimiento (BR-008). Excepción futura: reversiones automáticas sin texto humano — **no adoptada**: toda reversión requiere observación (BR-006/007).
- **Claves autorreferentes** `reversion_of_id`/`reversed_by_id`: modelan reversiones preservando el historial original (MASTER-SPEC §7, ADR-011). Restricción de aplicación: `reversion_of_id` solo en movimientos `kind=REVERSION`.
- **Movimientos de distribución (BR-037/039)**: crear/actualizar/egresar un segmento `CargoLocation`, o mover una cantidad parcial entre ubicaciones, inserta un `Movement` + `Observation` en la **misma transacción** (ARCHITECTURE.md F6). `from_cargo_location_id`/`to_cargo_location_id` vinculan los segmentos de origen/destino (MASTER-SPEC §4.2); restricción de aplicación: ambos segmentos pertenecen a la misma `cargo_id` del movimiento (validación en servicio).
- Índices:
  - `ix_movements_cargo_id_moved_at` (`(cargo_id, moved_at DESC)`) — historial de carga (BR-008).
  - `ix_movements_location_id_moved_at` (`(from_location_id, moved_at)`) — histórico de ocupación de una ubicación.
  - `ix_movements_user_id_moved_at` — consultas operativas por operador.
  - `ix_movements_reversion_of_id` — búsqueda de reversiones.
- `moved_at` es la línea temporal del historial **operacional**; el `AuditLog` (con su propio timestamp) es la línea **de seguridad** — no se duplican (AUDIT.md §5.7).

#### observations (`Observation`)

| Columna | Tipo | Constraints | Descripción |
| --- | --- | --- | --- |
| id | uuid | PK | |
| movement_id | uuid | FK → movements.id, NULL, UNIQUE | 1:1 con movimiento (obligatoria en movimientos, BR-006/007) |
| cargo_id | uuid | FK → cargo.id, NULL | Notas de carga sin movimiento |
| text | text | NOT NULL, CHECK (length(trim(text)) > 0) | Texto no vacío |
| user_id | uuid | FK → users.id, NOT NULL | Autor |
| created_at | timestamptz | NOT NULL | |

- Constraint check: al menos una de `movement_id`/`cargo_id` debe estar presente (validación en servicio; un check en DB para `(movement_id IS NOT NULL OR cargo_id IS NOT NULL)` es posible si Prisma lo permite vía raw SQL en migración).
- Índices: `uq_observations_movement_id` (1:1), `ix_observations_cargo_id_created_at` (notas de carga).
- **Por qué Observation es entidad propia** (canónico §4.4.3, justificación ampliada en §9): consulta/filtrado por texto, auditoría de quién/cuándo, compatibilidad con observaciones estructuradas futuras, y notas de carga independientes de movimientos.

#### alerts (`Alert`)

| Columna | Tipo | Constraints | Descripción |
| --- | --- | --- | --- |
| id | uuid | PK | |
| cargo_id | uuid | FK → cargo.id, NOT NULL | Carga alertada |
| type | AlertType | NOT NULL | `STALE_30D` \| `CAPACITY` \| `CUSTOM` |
| status | AlertStatus | NOT NULL default OPEN | `OPEN \| ACKNOWLEDGED \| RESOLVED \| DISMISSED` |
| severity | varchar(20) | NOT NULL default 'MEDIUM' | `LOW \| MEDIUM \| HIGH \| CRITICAL` (AlertSeverity canónico, MASTER-SPEC §4.3 — ID-007 resuelta) |
| due_at | timestamptz | NOT NULL | Fecha límite que dispara la alerta (p. ej. entry_date + 30d) |
| resolved_at | timestamptz | NULL | Cierre efectivo |
| metadata | jsonb | NOT NULL default '{}' | Detalles (p. ej. días de permanencia detectados) |
| created_at / updated_at | timestamptz | NOT NULL | |

- Índices: `ix_alerts_status_due_at` (parcial `WHERE status = 'OPEN'`) — alertas abiertas a revisar; `ix_alerts_cargo_id` — detalle de carga.
- Dedupe de alerta abierta por carga+tipo: índice único parcial `(cargo_id, type) WHERE status = 'OPEN'` — evita alertas duplicadas del job diario (BR-014).
- Relación: N:1 Cargo; 1:N Notification (una alerta puede generar una notificación in-app).

#### notifications (`Notification`)

| Columna | Tipo | Constraints | Descripción |
| --- | --- | --- | --- |
| id | uuid | PK | |
| user_id | uuid | FK → users.id, NOT NULL | Destinatario |
| type | varchar(40) | NOT NULL | `ALERT_STALE_30D`, `ALERT_CAPACITY`, `CARGO_EVENT`, `CUSTOM`… (catálogo: NOTIFICATIONS.md §5.3) |
| channel | NotificationChannel | NOT NULL default IN_APP | Enum §6.7; v1 solo IN_APP (OQ-011) |
| title | varchar(160) | NOT NULL | Título |
| body | text | NOT NULL | Cuerpo |
| data | jsonb | NOT NULL default '{}' | Referencias (cargo_id, alert_id…) |
| read_at | timestamptz | NULL | Leída |
| created_at | timestamptz | NOT NULL | |

- Índices: `ix_notifications_user_id_read_at` (`(user_id, read_at)`) — bandeja no leídas; `ix_notifications_user_id_created_at` — historial.
- Relación N:1 User. Multi-canal futuro: la columna `channel` por fila (una notificación por canal) + tabla `notification_preferences` (ver NOTIFICATIONS.md §5.5) — **decisión** de este grupo (ver §12 si el orquestador prefiere otra forma).

#### maps (`Map`)

| Columna | Tipo | Constraints | Descripción |
| --- | --- | --- | --- |
| id | uuid | PK | |
| name | varchar(120) | NOT NULL | "Plano del predio" |
| code | varchar(50) | UNIQUE, NOT NULL | `PREDIO` (canónico §4.1) |
| type | MapType | NOT NULL default PREDIO | Enum `PREDIO` (futuro: `SECTOR`, `GALPON`…) |
| width / height | numeric(10,2) | NOT NULL default 100 | Dimensiones del lienzo (unidades: §12 — DECISIÓN PENDIENTE) |
| grid_size | numeric(10,2) | NOT NULL default 10 | Paso de snap del editor |
| status | MapStatus | NOT NULL default DRAFT | DRAFT \| ACTIVE \| ARCHIVED (publicación de plano) |
| version | integer | NOT NULL default 1 | Incrementa con cada edición publicada (MASTER-SPEC §4.1) |
| created_by_id | uuid | FK → users.id, NOT NULL | Autor |
| created_at / updated_at | timestamptz | NOT NULL | |

- Índices: `uq_maps_code`; `ix_maps_status_version`. Relaciones: 1:N MapElement.

#### map_elements (`MapElement`)

| Columna | Tipo | Constraints | Descripción |
| --- | --- | --- | --- |
| id | uuid | PK | |
| map_id | uuid | FK → maps.id, NOT NULL | Plano al que pertenece |
| location_id | uuid | FK → locations.id, NULL, UNIQUE | Vínculo a ubicación del predio (0..1, canónico §4.2) |
| element_type | varchar(40) | NOT NULL | `LOCATION` \| `LABEL` \| `SHAPE` \| `ZONE` (futuro: RUTA, PUERTA, CAMARA, SENSOR — MAP-ENGINE.md §7) |
| x / y | numeric(10,2) | NOT NULL | Posición en lienzo |
| width / height | numeric(10,2) | NOT NULL | Tamaño |
| rotation | numeric(6,2) | NOT NULL default 0 | Grados |
| z_index | integer | NOT NULL default 0 | Orden de capas |
| fill | varchar(20) | NULL | Color relleno |
| stroke | varchar(20) | NULL | Color borde |
| label_position | varchar(20) | NOT NULL default 'BOTTOM' | TOP \| BOTTOM \| LEFT \| RIGHT \| CENTER (MAP-ENGINE.md §5.3) |
| properties | jsonb | NOT NULL default '{}' | Propiedades adicionales (MASTER-SPEC §11.5) |
| created_at / updated_at / deleted_at | timestamptz | soft | |

- Materializa `LocationVisual` del MASTER-SPEC §11.5 (`id, x, y, width, height, rotation, zIndex, fill, stroke, labelPosition` + properties): la columna `id` del visual = `map_elements.id`; el frontend lo combina con `Location` para el render (MAP-ENGINE.md §5). **Datos estructurados, no imagen** (BR-020).
- Índices: `ix_map_elements_map_id` (`(map_id, z_index)`); `uq_map_elements_location_id` (una ubicación se dibuja una sola vez por plano; el vínculo está en el MapElement y no en Location).

#### audit_logs (`AuditLog`)

| Columna | Tipo | Constraints | Descripción |
| --- | --- | --- | --- |
| id | uuid | PK (o bigserial secuencial para integridad de orden — ver §12) | |
| user_id | uuid | FK → users.id, NULL | Usuario que ejecutó (NULL = sistema/job; soft delete → NULL) |
| action | AuditAction | NOT NULL | Enum §6.5 |
| entity | varchar(60) | NOT NULL | Nombre de entidad (`cargo`, `movement`, `map`…) |
| entity_id | uuid | NOT NULL | Referencia polimórfica |
| timestamp | timestamptz | NOT NULL default now() | Momento exacto |
| previous_value | jsonb | NULL | Estado previo (diff) |
| new_value | jsonb | NULL | Estado posterior |
| metadata | jsonb | NOT NULL default '{}' | requestId, contexto |
| ip | varchar(45) | NULL | IPv4/6 (minimizado — BR-017, AUDIT.md §5.6) |
| user_agent | varchar(255) | NULL | UA truncado (BR-017) |

- **Append-only**: sin UPDATE/DELETE desde la aplicación ni desde la DB en operación normal (ADR-010, AUDIT.md §5.4). FK `user_id` con `ON DELETE SET NULL` (users son soft delete; si se purgara, el log sobrevive).
- Índices: `ix_audit_entity_entity_id` (`(entity, entity_id)`) — historial por objeto; `ix_audit_user_id_timestamp`; `ix_audit_action_timestamp` (filtros de consulta); `ix_audit_timestamp` (retención/poda futura).
- Volumen: es la tabla de mayor escritura (toda mutación = 1 fila). La retención/poda es DECISIÓN PENDIENTE (AUDIT.md §5.8); los índices planteados soportan poda por rango.

### 5.4 Relaciones y cardinalidades (resumen)

| Relación | Cardinalidad | Materialización |
| --- | --- | --- |
| User ↔ Role | N:M | `user_roles` |
| Role ↔ Permission | N:M | `role_permissions` (con excepción `granted`) |
| Truck → Cargo | 1:N | `cargo.truck_id` (OQ-003 → BR-050: 1 carga → 1 camión a la vez) |
| Cargo ↔ Location | N:M | `cargo_locations` (BR-032; sin `cargo.location_id` único) |
| CargoLocation → Cargo | N:1 | `cargo_locations.cargo_id` |
| CargoLocation → Location | N:1 | `cargo_locations.location_id` |
| Movement → CargoLocation | 0..1 (origen/destino) | `movements.from_cargo_location_id` / `to_cargo_location_id` (movimientos parciales, BR-037) |
| Cargo → Movement | 1:N | `movements.cargo_id` |
| Movement → Observation | 1:1 (obligatoria) | `movements.observation_id` UNIQUE NOT NULL |
| Cargo → Observation (notas) | 1:N | `observations.cargo_id` |
| Cargo → Alert | 1:N | `alerts.cargo_id` |
| Alert → Notification | 1:N | `notifications.data.alert_id` (JSONB) |
| User → Notification | 1:N | `notifications.user_id` |
| Map → MapElement | 1:N | `map_elements.map_id` |
| Location → MapElement | 0..1 | `map_elements.location_id` UNIQUE |
| Movement → Movement | 1:N (reversión) | `reversion_of_id` / `reversed_by_id` self-FK |

### 5.5 Enums (mapeo canónico MASTER-SPEC §4.3)

- **CargoStatus**: `REGISTERED, IN_TRUCK, PARTIALLY_UNLOADED, STORED, IN_REVIEW, REZAGO, SECUESTRO, IN_TRANSIT, EXITED, DELETED` (soft). `EXITED` cierra con el egreso completo (OQ-004 resuelta → BR-043: movimiento `EXIT` con observación obligatoria, remito/documentación opcionales).
- **LocationType**: `PLAZOLETA, GALPON, SECTOR, SCANNER, BALANZA, REZAGO, SECUESTRO, OTRO`. Defaults de unidad de capacidad por tipo (BR-041): SECTOR → `AREA`, PLAZOLETA/SCANNER/BALANZA → `UNITS`, OTRO/GALPON/REZAGO/SECUESTRO → configurable (sin default fijo); override por ubicación permitido (gobernanza ADMIN, auditado). **No existe `CAMION`** como valor (BR-042: el camión no es una Location).
- **LocationStatus** (derivado del modelo, no enumerado en §4.3 pero definido en §4.1 de `Location`): `ACTIVE, INACTIVE, MAINTENANCE`.
- **QuantityUnit** (cantidades de segmentos `cargo_locations` y capacidad de `locations`): `UNITS, PALLETS, TONS, CUBIC_METERS, AREA, PERCENT` (MASTER-SPEC §4.3). Unidades **compatibles para sumar**: misma unidad base o `PERCENT` (secciones 62-70, BR-035). El viejo `CapacityType` (que incluía `UNLIMITED`) queda superado para `Location`: la capacidad usa `QuantityUnit`; cómo expresar "capacidad ilimitada" es DECISIÓN PENDIENTE (§11 D11). Los defaults por LocationType de BR-041 usan esta enum (`AREA`, `UNITS`) y son administrables en una tabla de configuración (módulo dueño: pendiente de definir — ver `backend/DTOs.md` §10).
- **CargoLocationStatus** (canónico §4.3): `ACTIVE, EXITED`. (Diferido: `PLANNED` para ingreso programado — DECISIÓN PENDIENTE.)
- **MovementKind**: `INGRESS, UNLOAD, MOVE, TO_SCANNER, TO_BALANZA, TO_REZAGO, TO_SECUESTRO, REVERSION, EXIT`. MASTER-SPEC §4.3 permite reducir v1 a `MOVE` + razones tipadas; **decisión**: mantener el enum completo desde v1 (ya modelado, sin costo, evita migración futura) con validación de pares permitidos (kind ↔ destino) en el servicio. Si el orquestador prefiere la reducción, el cambio es local a `movements` (ver §12).
- **AlertType**: `STALE_30D, CAPACITY, CUSTOM`; **AlertStatus**: `OPEN, ACKNOWLEDGED, RESOLVED, DISMISSED`.
- **AuditAction**: `CREATE, UPDATE, MOVE, STATUS_CHANGE, DELETE, RESTORE, REVERT, MAP_EDIT, CAPACITY_CHANGE, PERMISSION_CHANGE, LOGIN, LOGOUT, EXPORT`.
- **NotificationChannel**: `IN_APP` (v1); reservados como string: `EMAIL, PUSH, WHATSAPP, WEBHOOK` (futuro, NO como valores de enum de DB en v1 para no acoplar el esquema — se agregan al enum cuando haya proveedor real; coherencia con BR-019).
- **MapType**: `PREDIO` (futuro: `SECTOR`, `GALPON`); **MapStatus**: `DRAFT, ACTIVE, ARCHIVED` (derivados del modelo §4.1: `status` en Map).

### 5.6 Estrategia de migraciones (Prisma)

- **Versionado**: una migración por cambio de esquema, numerada y revisable (`prisma migrate dev` en development; `prisma migrate deploy` en staging/production).
- **Convención**: seeds idempotentes (roles, permisos, ubicaciones iniciales — MASTER-SPEC §5: 17 ubicaciones) guardados como archivos seed versionados, ejecutables en cualquier ambiente limpio.
- **Enums**: migran con los valores canónicos; **nunca reordenar** valores existentes (breaking change de PostgreSQL); agregar valores al final.
- **JSONB**: sin migraciones por cambios internos de `properties`/`metadata` (validación en aplicación); se documenta el shape en `backend/DTOs.md`.
- **Índices parciales** (p. ej. `ix_alerts_status_due_at`, `uq_cargo_locations_active`): se definen en migraciones raw SQL (Prisma no modela partial index nativamente) o se documentan para W5. **Nota**: Prisma 6+ no soporta índices parciales en schema → se agregan vía `prisma migrate dev --create-only` + edición SQL. Es responsabilidad de implementación, no de FASE 0; aquí queda especificado.
- **Naming**: `_migration_NNNN_<descripcion>`; rollback: revertir con `migrate resolve` + script manual (salidas en DEVOPS).

### 5.7 Índices para consultas frecuentes (catálogo operativo)

| Consulta frecuente | Índice | Rationale |
| --- | --- | --- |
| Búsqueda de carga por código exacto | `uq_cargo_code` | BR-001; OQ-001 puede transformarlo en índice funcional |
| Búsqueda por texto de código/name (parcial) | `ix_cargo_code_name` (GIN trigram opcional) | Listados y filtros; se evalúa con volumen real (PERFORMANCE.md) |
| Ocupación por ubicación (dashboard/mapa, BR-033) | `ix_cargo_locations_location_id_status_unit` | Agregación de `quantity` en unidad compatible; estrategia §5.9 |
| Ubicaciones de una carga (distribución) | `ix_cargo_locations_cargo_id` | `GET /api/v1/cargos/:id/locations` (BR-040) |
| Cargas de una ubicación | `ix_cargo_locations_location_id_status` | `GET /api/v1/locations/:id/cargos` (BR-040) |
| Conteo por estado | `ix_cargo_status` parcial | KPI dashboard |
| Scan de permanencia (job 30 días) | `ix_cargo_entry_date` | BR-014; barrido diario |
| Historial de una carga | `ix_movements_cargo_id_moved_at DESC` | BR-008 timeline |
| Historial de una ubicación | `ix_movements_location_id_moved_at` | Movimientos origen/destino |
| Alertas abiertas | `ix_alerts_status_due_at` parcial + unique parcial dedupe | BR-014 |
| Notificaciones no leídas | `ix_notifications_user_id_read_at` | Bandeja |
| Auditoría por objeto | `ix_audit_entity_entity_id` | Trazabilidad (AUDIT.md) |
| Elementos de plano | `ix_map_elements_map_id` | Render del mapa |

Paginación: los listados usan `?page=&limit=` con `limit` por defecto 25 (máx. 100, MASTER-SPEC §10); para históricos muy grandes se prevé **cursor pagination** por `(id, moved_at)` (PERFORMANCE.md §5.3).

### 5.8 Restricciones de consistencia de la distribución (BR-032…040) — capa de aplicación

| Regla | Capa donde se aplica | Detalle |
| --- | --- | --- |
| BR-032 (Cargo↔Location M:N, sin `cargo.location_id`) | Estructura de datos | Se elimina el `location_id` único de `cargo`; la relación vive en `cargo_locations`. La DB garantiza que un par (cargo, location) activo es único (índice parcial §5.3). |
| BR-033 (ocupación = Σ segmentos activos en unidad compatible) | Aplicación (servicio `locations`) + lectura | Derivado `occupied_capacity`; la agregación suma solo `status = 'ACTIVE'` con `quantity_unit` compatible con la **unidad efectiva** de la ubicación (`capacity_unit`: override o default por LocationType, BR-041; §5.9). Comportamiento ante unidades incompatibles resuelto (OQ-044 → BR-048): rechazo con 422 `INCOMPATIBLE_UNIT`, sin conversión en v1. |
| BR-034 (suma distribuida ≤ total de la carga) | **Aplicación** (servicio `cargo`, en la transacción de mutación de segmentos — ARCHITECTURE.md F6) + **vista de control en DB (documentada, no utilizada para validar en v1)** | CHECK por fila no alcanza (cross-row); se valida en servicio antes de escribir. Como control pasivo se documenta una vista `v_cargo_distribution_check` (§10 muestra la consulta equivalente): `SELECT cargo_id, SUM(quantity) ... WHERE status='ACTIVE' GROUP BY cargo_id HAVING SUM(quantity) > c.total_quantity`. No se implementa trigger en v1 para no duplicar lógica de negocio (consistente con DATABASE.md §5.3 previo); se evaluará en QA si la divergencia se vuelve un problema real. |
| BR-035 (unidades compatibles) | **Aplicación** (validación de DTOs/servicio) | Se exige misma unidad base o `PERCENT` entre `total_unit`, segmentos de la misma carga y `capacity_unit` de la ubicación. La DB solo persiste el enum; la conversión entre unidades distintas NO se realiza en v1 (OQ-044 → BR-048: 422 `INCOMPATIBLE_UNIT`). |
| BR-036 (no superar capacidad salvo flag) | **Aplicación** (guard compartido de capacidad, invocado dentro de la transacción por **todos** los caminos de escritura de segmentos: movimientos, alta/ajuste de distribución y alta directa a sector `POST /cargos` con `locationId`) | La comparación es `ocupada + Δ <= techo` sobre la ocupación derivada. El **techo** depende del flag administrativo por ubicación: `allow_over_occupation = false` → `capacity`; `= true` → `capacity × (1 + over_occupation_limit_percent/100)` (default +10 %, OQ-043 → BR-036 ampliada). `capacity = 0` es UNBOUNDED y salta la verificación. El flag se habilita solo por ADMIN vía `PATCH /locations/:id` y se audit (`CAPACITY_CHANGE`). Toda escritura aceptada que quede por encima de la capacidad declarada se audita como `CAPACITY_CHANGE` tipo excepción sobre la **ubicación**, con `metadata.over_occupation = true`; el rechazo por techo reporta el techo real en `details`. |
| BR-037/038 (movimientos parciales, residual en camión) | Aplicación + `movements` | Los ajustes de segmentos se registran como `Movement` con `from/to_cargo_location_id` (§5.3); el residual en camión es derivado (`total_quantity − Σ ACTIVE`, unidades compatibles), no una columna ni una Location (BR-042). |
| BR-042 (total declarado obligatorio para distribución parcial) | **Aplicación** (servicio `cargo`, en la transacción de distribución — ARCHITECTURE.md F6) | `total_quantity`/`total_unit` son **obligatorios** antes de cualquier movimiento o descarga parcial; si faltan → `CARGO_TOTAL_REQUIRED` (422). Es condicional y temporal, por eso se valida en la transacción (no CHECK en DB; coherente con §3 y con la fila de `cargo` en §5.3). |

### 5.9 Estrategia de agregación de `occupiedCapacity` (derivado, BR-033)

El MASTER-SPEC lista `occupiedCapacity`/`availableCapacity` como **derivados** (de la suma de `CargoLocation` activos en unidad compatible). No son datos de entrada; la pregunta es dónde se calculan. Opciones evaluadas (documentación, sin implementar en FASE 0):

| Estrategia | Pros | Contras | Veredicto v1 |
| --- | --- | --- | --- |
| **Query-time** (SUM en la lectura con índice `(location_id, status, quantity_unit)`) | Sin estado materializado que divergir; una sola fuente de verdad; simple con Prisma `$queryRaw` acotado (ADR-005); coherente con "sin eventual consistency" | Recalcula por lectura (costo crece con N segmentos); requiere filtro por unidad compatible en cada consulta | **Recomendada v1** — el volumen es bajo (cientos de cargas); recálculo acotado a la ubicación afectada en la transacción de escritura (ARCHITECTURE.md F6) |
| Vista SQL regular `v_location_occupancy` | Centraliza la agregación; reutilizable por reportes/QA; sin trigger | Prisma no modela vistas nativamente (raw); costo por consulta igual al query-time; requiere convención de mantenimiento | Documentada como vista de consulta/reportes; la API no depende de ella |
| Trigger/incremental (columna materializada en `locations`) | Lecturas O(1); ideal a alto volumen | Duplica lógica de negocio en DB; divergencia posible en fallos a medias (mitigable solo con transacciones cuidadosas); complica testing y migraciones de Prisma | Rechazada en v1 (coherente con la evaluación previa de trigger en §5.3); reevaluar solo con señal medida de QA (PERFORMANCE.md §5.6) |

Notas:
- Unidad: `occupied_capacity` agrega solo segmentos con `quantity_unit` compatible con la **unidad efectiva** de la ubicación (BR-035): `capacity_unit` explícito si hay override, o el **default por LocationType** (BR-041 — SECTOR → AREA, PLAZOLETA/SCANNER/BALANZA → UNITS, otros → configurable). El alta de una ubicación SIN override debe resolver la unidad desde el default del tipo; la API expone la unidad efectiva en `LocationResponseDto` (backend/DTOs.md §4.12).
- La vista de control de BR-034 (§5.8) y la vista de ocupación pueden coexistir: una es pasiva de auditoría, la otra de consulta operativa.
- Impacto en performance y presupuestos: PERFORMANCE.md §5.2/§5.7.

## 6. Criterios de aceptación

- [ ] El esquema cubre las 15 entidades canónicas (§4.1, incluida `CargoLocation`) + puentes `user_roles`/`role_permissions`, sin tablas inventadas.
- [ ] Cada entidad declara PK, FKs, únicos, índices, constraints, timestamps y soft delete donde corresponde.
- [ ] Coherente con ARCHITECTURE.md (dueños por módulo) y MASTER-SPEC §4/§6/§7 (BR y máquina de estados).
- [ ] Enums idénticos a los canónicos (§4.3); los derivados (LocationStatus, MapType, MapStatus) están marcados como tales. No existe `LocationType CAMION` (BR-042) y la unidad efectiva de capacidad sigue el default por LocationType con override (BR-041).
- [ ] Cada decisión ambigua real está en §12 con pregunta concreta e impacto; nada se inventó. Las decisiones adoptadas (OQ-041 → BR-041, OQ-042 → BR-042) no permanecen como pendientes.

## 7. Archivos involucrados

- `docs/MASTER-SPEC.md` §4–§7 · `docs/OPEN-QUESTIONS.md` (todas resueltas en v0.5: OQ-041 → BR-041, OQ-042 → BR-042, OQ-043 → BR-036, OQ-044 → BR-048, OQ-045 → BR-049, OQ-001 → BR-002, OQ-003 → BR-050, OQ-004 → BR-043, OQ-008, OQ-014)
- `architecture/ADR/ADR-004`, ADR-005, ADR-010, ADR-011 (grupo W3)
- Hermandos W2: `ARCHITECTURE.md`, `AUDIT.md`, `MAP-ENGINE.md`, `PERFORMANCE.md`, `AUTHORIZATION.md`
- Downstream: `backend/BACKEND-ARCHITECTURE.md`, `backend/MODULES.md`, `backend/DTOs.md`, `backend/VALIDATION.md`, `devops/DEVOPS.md` (backups), `qa/` (datos de prueba del §5 del MASTER-SPEC)

## 8. Riesgos

| Riesgo | Mitigación |
| --- | --- |
| `cargo.code` único exacto incompatible con códigos reales que colisionan tras normalizar | OQ-001 bloqueante; diseño permite índice funcional sin migración de estructura |
| Crecimiento de `audit_logs` y `movements` (append-only) | Índices por rango, poda/retención pendiente (AUDIT.md §5.8), posible particionado futuro |
| `occupied_capacity` derivado puede divergir si una transacción falla a medias | Todo recálculo ocurre en la misma `$transaction` (ARCHITECTURE.md §5.10); será agregación query-time §5.9 con tests de integridad en QA |
| Suma distribuida > total por carga (BR-034) si una validación se omite | Validación centralizada en servicio `cargo` + vista de control documentada (§5.8); el índice único parcial evita duplicados activos |
| Unidades incompatibles sumadas por error (BR-035) | Validación de aplicación por unidad compatible; los defaults por LocationType (BR-041) reducen el caso sin override; OQ-044 resuelta (BR-048): sin conversión en v1, unidades compatibles exigidas (422 `INCOMPATIBLE_UNIT`) |
| Enum `MovementKind` completo agrega superficie de validación | Pares kind↔destino validados en servicio; catálogo documentado para W5 |
| JSONB sin schema puede volverse inmanejable | Shape documentado en DTOs; validación en capa de aplicación |
| OQ-004 (egreso) sin `location_id` en `cargo` | El egreso se modela con `cargo_locations.status = EXITED` + movimiento (BR-039); retiro completo con `EXIT` + observación obligatoria (OQ-004 resuelta → BR-043) |

## 9. Justificación: Observation como entidad propia (canónica §4.4.3)

- **Movimiento requiere observación 1:1** (BR-006/007): modelada como FK `movements.observation_id` UNIQUE NOT NULL — integridad a nivel de datos, no solo de servicio.
- **Notas de carga sin movimiento** (`cargo_id` nullable): las alternativas (embebido en Cargo, tabla separada solo-para-movimientos) fuerzan NULLs o duplican el concepto.
- **Consultas y auditoría**: búsqueda por texto de observaciones, quién las escribió y cuándo; las observaciones pueden estructurarse en el futuro (tipo, motivo catalogado) sin tocar `movements`.
- **Alternativa rechazada**: Observation embebido como columna JSONB en `movements` — pierde consultabilidad, integridad y trazabilidad de autor; contradice §4.4.3 del MASTER-SPEC.

## 10. Consultas de ejemplo (para QA y validación de índices)

```sql
-- Ocupación por ubicación (dashboard) — agregación query-time sobre segmentos activos (BR-033, §5.9)
-- Nota: el filtro de unidad compatible usa la unidad efectiva de cada ubicación (capacity_unit:
-- override explícito o default por LocationType, BR-041).
SELECT l.id, l.name, l.capacity, l.capacity_unit,
       COALESCE(SUM(cl.quantity) FILTER (WHERE cl.status = 'ACTIVE'), 0) AS occupied_capacity,
       l.capacity - COALESCE(SUM(cl.quantity) FILTER (WHERE cl.status = 'ACTIVE'), 0) AS available_capacity,
       COUNT(DISTINCT cl.cargo_id) FILTER (WHERE cl.status = 'ACTIVE') AS cargas
FROM locations l
LEFT JOIN cargo_locations cl ON cl.location_id = l.id
WHERE l.deleted_at IS NULL
GROUP BY l.id;

-- Todas las ubicaciones de una carga (distribución, BR-040)
SELECT cl.location_id, cl.quantity, cl.quantity_unit, cl.percentage,
       cl.status, cl.entered_at, cl.exited_at
FROM cargo_locations cl
WHERE cl.cargo_id = $1
  AND cl.status = 'ACTIVE'
ORDER BY cl.entered_at;

-- Cargas de una ubicación con ocupación por segmento (BR-040)
SELECT cl.cargo_id, c.code, cl.quantity, cl.quantity_unit, cl.percentage, cl.entered_at
FROM cargo_locations cl
JOIN cargo c ON c.id = cl.cargo_id AND c.deleted_at IS NULL
WHERE cl.location_id = $1 AND cl.status = 'ACTIVE';

-- Control pasivo de BR-034 (suma distribuida ≤ total, §5.8)
SELECT cl.cargo_id, c.code, c.total_quantity, SUM(cl.quantity) AS distributed
FROM cargo_locations cl
JOIN cargo c ON c.id = cl.cargo_id
WHERE cl.status = 'ACTIVE'
GROUP BY cl.cargo_id, c.code, c.total_quantity
HAVING c.total_quantity IS NOT NULL AND SUM(cl.quantity) > c.total_quantity;

-- Cargas con permanencia > 30 días, sin alerta STALE_30D OPEN (job BR-014)
SELECT c.id, c.code, c.entry_date
FROM cargo c
WHERE c.deleted_at IS NULL
  AND c.status NOT IN ('EXITED', 'DELETED')
  AND c.entry_date < now() - interval '30 days'
  AND NOT EXISTS (SELECT 1 FROM alerts a
                  WHERE a.cargo_id = c.id AND a.type = 'STALE_30D'
                    AND a.status = 'OPEN');

-- Historial de una carga (BR-008)
SELECT m.*, o.text FROM movements m
JOIN observations o ON o.id = m.observation_id
WHERE m.cargo_id = $1 ORDER BY m.moved_at DESC;
```

## 11. DECISIÓN PENDIENTE

Las preguntas con OQ asignada quedaron **resueltas en MASTER-SPEC v0.5 (2026-09-24)**; las restantes (D1, D5, D6, D7, D8, D9, D11, D12) son residuales locales sin OQ asignada:

| # | Pregunta concreta | Impacto | Referencia / Resolución |
| --- | --- | --- | --- |
| D1 | ¿PKs UUIDv7 (recomendado) o BIGSERIAL? | Claves, tamaños de índice, URLs de API, tenancy futuro | Nueva (W2) — recomendación §5.1 |
| D2 | ~~Reglas de unicidad/normalización de `cargo.code` (regex, case, trim)~~ | Índice único exacto vs funcional | ✅ **RESUELTA (OQ-001 → BR-002)** — regex `^[A-Z0-9][A-Z0-9./-]{2,31}$`, normalizado a mayúsculas, único case-insensitive, longitud 3-32; el índice único preliminar pasa a expresión sobre la forma normalizada |
| D3 | ~~¿`cargo.location_id` nullable si se adopta egreso (OQ-004)?~~ → **SUPERADA**: `location_id` se elimina de `cargo` (BR-032); el egreso se modela con `cargo_locations.status = EXITED` + movimiento | Modelo de egreso | OQ-004 (flujo de retiro) — sección 62-70 |
| D4 | ~~Unidad de capacidad por defecto por LocationType…~~ → **SUPERADA** (OQ-041 → **BR-041**): SECTOR → AREA, PLAZOLETA/SCANNER/BALANZA → UNITS, otros → configurable; override por ubicación permitido, gobernanza ADMIN y auditado | `capacity`/`capacity_unit`/`total_unit`, seeds y tabla de configuración de defaults | OQ-041 (resuelta 2026-09-23) |
| D5 | ¿MovementKind completo (recomendado) o reducción a MOVE + razones tipadas en v1? | Enum y validación de `movements` | 🔶 Pendiente local — sin OQ asignada; MASTER-SPEC §4.3 (residual documentado) |
| D6 | Unidades de `maps.width/height/grid_size` (unidades abstractas normalizadas recomendadas) | Render del plano y editor | 🔶 Pendiente local — Nueva (W2); ver MAP-ENGINE.md §8 |
| D7 | ¿Preferencias de notificación en tabla propia (recomendado) o JSONB en `users`? | Esquema de notificaciones | 🔶 Pendiente local — Nueva (W2); ver NOTIFICATIONS.md §8 |
| D8 | ¿`audit_logs.id` secuencial (integridad de orden) o UUID? ¿hash-chain de integridad? | Auditoría y retención | 🔶 Pendiente local — Nueva (W2); ver AUDIT.md §8 |
| D9 | Retención/poda de `audit_logs` y `movements` (meses/años y modo legal) | Particionado y almacenamiento | 🔶 Pendiente local — Nueva (W2); AUDIT.md §8 |
| D10 | ~~Fecha base y días de permanencia confirmados (corridos/hábiles, segunda alerta)~~ | Job de alertas y `due_at` | ✅ **RESUELTA (OQ-008)** — base `entryDate`, días **corridos**, alerta a los 30 días y segunda a los 40 (BR-014/015); timezone del predio configurable |
| D11 | ¿Cómo se expresa "capacidad ilimitada"? El viejo `capacity_type = UNLIMITED` desaparece; `capacity` es NUMERIC NOT NULL default 0. (El default de unidad por tipo ya está resuelto — BR-041; queda abierta solo la semántica "ilimitado") | Esquema de `locations` (seeds de Plazoleta/áreas) | 🔶 Pendiente local — Nueva (W2); ver §5.3 y BR-041 |
| D12 | ¿Movimientos de distribución referencian SIEMPRE `from/to_cargo_location_id` o es suficiente la referencia opcional? | Contrato de `movements` y trazabilidad de segmentos | 🔶 Pendiente local — Nueva (W2); MASTER-SPEC §4.2 "puede vincular" |
| D13 | ~~Semántica de `percentage` en `cargo_locations` (¿valor almacenado/autoritativo o derivado de quantity/total_quantity?; ¿coexiste con quantity?)~~ | Consistencia, DTOs y cálculos de UI | ✅ **RESUELTA (OQ-045 → BR-049)** — `quantity`+`quantityUnit` son la fuente de verdad; `percentage` es **derivado de UI** (`quantity/totalQuantity`) salvo unidad `PERCENT` (donde es la cantidad misma); no coexisten dos fuentes |
| D14 | ~~Conversión de unidades: ¿se exige siempre unidad compatible (misma unidad o PERCENT) sin conversión en v1?~~ | BR-034/035, validación de movimientos parciales | ✅ **RESUELTA (OQ-044 → BR-048)** — sin conversión en v1: unidades compatibles (misma base o `PERCENT`); incompatible → 422 `INCOMPATIBLE_UNIT` |