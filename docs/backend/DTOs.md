# DTOs.md — Catálogo de DTOs del backend de CargoOps

> Grupo W5 — Backend. Definición de contratos de entrada/salida con validación class-validator + class-transformer. Complementa `API.md` (contratos HTTP) y `VALIDATION.md` (dónde se valida cada regla). Fuente de verdad: MASTER-SPEC §4 (entidades/enums) y §6 (BR).

---

## 1. Objetivo

Catalogar los DTOs de CargoOps con sus campos, tipos y reglas de validación (class-validator + mensajes), estableciendo las reglas de **reutilización** (no duplicar contratos, MASTER-SPEC §10) y mostrando el shape de request/response con ejemplos. Los DTOs son la fuente del schema OpenAPI (BACKEND-ARCHITECTURE §5.7).

## 2. Contexto

En NestJS los DTOs son clases con decoradores de class-validator, transformadas por class-transformer en el `ValidationPipe` global (`whitelist`, `forbidNonWhitelisted`, `transform` — ver `BACKEND-ARCHITECTURE` §5.1). Los enums se referencian de `MASTER-SPEC` §4.3: CargoStatus, LocationType, CapacityType, MovementKind, AlertType, AlertStatus, AuditAction, NotificationChannel. Las validaciones de **negocio** (BR) no viven en los DTOs: viven en services/validators de dominio (ver `VALIDATION.md`). Los DTOs validan **shape y formato**.

**Convención de mensajes**: mensajes de validación en español neutral (UI inicial es-AR, MASTER-SPEC §16), parametrizables vía i18n futura; los códigos de error son estables en inglés (ver `API-CONVENTIONS.md` §5).

## 3. Restricciones

| # | Restricción | Origen |
| --- | --- | --- |
| R-01 | Un DTO de entrada documenta el mismo campo una sola vez; se reutiliza por herencia/composición (ver §6). | MASTER-SPEC §10 ("los DTOs se reutilizan, no se duplican contratos") |
| R-02 | Los DTOs NO validan reglas de negocio (BR); solo shape/formato. | VALIDATION.md §3 |
| R-03 | Identificadores de campo en JSON: camelCase (decisión `API-CONVENTIONS.md` §4). | API-CONVENTIONS §4 |
| R-04 | Timestamps en ISO 8601 UTC; IDs UUID. | API-CONVENTIONS §3 |
| R-05 | `patch` (PATCH) usa campos parciales; `create`/`update` (POST/PUT) completos. | API-CONVENTIONS §2 |

## 4. Catálogo de DTOs

### 4.1 auth

**LoginDto** — `POST /api/v1/auth/login`
| Campo | Tipo | Validación | Mensaje (es) |
| --- | --- | --- | --- |
| username | string | `@IsString()` `@IsNotEmpty()` max 100 | "El nombre de usuario es obligatorio" |
| password | string | `@IsString()` `@IsNotEmpty()` min 8 max 128 | "La contraseña es obligatoria" |

**RefreshDto** — `POST /api/v1/auth/refresh`
| Campo | Tipo | Validación | Mensaje |
| --- | --- | --- | --- |
| refreshToken | string | `@IsString()` `@IsNotEmpty()` | "El token de refresco es obligatorio" |

**LogoutDto** — `POST /api/v1/auth/logout` (igual que RefreshDto: refreshToken obligatorio para invalidar la sesión).

### 4.2 users (módulo users)

**CreateUserDto**
| Campo | Tipo | Validación | Mensaje |
| --- | --- | --- | --- |
| username | string | `@IsString()` `@IsNotEmpty()` `@MaxLength(100)` `@Matches(/^[a-zA-Z0-9_.-]+$/)` | "El usuario no puede contener espacios ni caracteres especiales" |
| email | string | `@IsEmail()` `@MaxLength(255)` | "El email debe ser válido" |
| password | string | `@IsString()` `@MinLength(8)` `@MaxLength(128)` | "La contraseña debe tener entre 8 y 128 caracteres" |
| name | string | `@IsString()` `@IsNotEmpty()` `@MaxLength(160)` | "El nombre es obligatorio" |
| roleIds | string[] (UUID) | `@IsArray()` `@IsUUID('4', { each: true })` | "Cada rol debe ser un UUID válido" |

**UpdateUserDto** — `PartialType(CreateUserDto)` con campos opcionales; password opcional (cambio de contraseña); `active: boolean` con `@IsBoolean()` (activar/desactivar).

**AssignRolesDto** — `POST /api/v1/users/:id/roles`: `{ roleIds: string[] }` (mismas reglas que CreateUserDto.roleIds).

### 4.3 roles (módulo roles)

**CreateRoleDto** — `{ code: ROLE_CODE, name: string, description?: string }`
- code: enum candidato `VIEWER | OPERATOR | ADMIN` (v1) pero extensible: `@IsString()` `@IsNotEmpty()` `@MaxLength(50)` `@Matches(/^[A-Z][A-Z0-9_]*$/)`, mensaje "El código de rol debe ser mayúsculas, números y guión bajo".
- name: `@IsString()` `@IsNotEmpty()` `@MaxLength(100)`.
- description: `@IsOptional()` `@IsString()` `@MaxLength(255)`.

**UpdateRoleDto** — `PartialType(CreateRoleDto)`.

**SetRolePermissionsDto** — `PUT /api/v1/roles/:id/permissions`:
| Campo | Tipo | Validación |
| --- | --- | --- |
| permissions | PermissionGrant[] | `@IsArray()` `@ArrayMinSize(0)`; elemento: `{ permissionCode: string, granted: boolean }` |

### 4.4 cargo (módulo cargo)

**CreateCargoDto** — `POST /api/v1/cargos`
| Campo | Tipo | Validación | Mensaje |
| --- | --- | --- | --- |
| code | string | `@IsString()` `@IsNotEmpty()` `@MaxLength(64)` (BR-001: código obligatorio; BR-002 unicidad en service/DB) | "El código de carga es obligatorio" |
| name | string | `@IsOptional()` `@IsString()` `@MaxLength(200)` | — |
| description | string | `@IsOptional()` `@IsString()` `@MaxLength(1000)` | — |
| totalQuantity | number | `@IsOptional()` `@IsNumber()` `@Min(0.0001)` (total de la carga; base de validación de la distribución — BR-034). **Opcional en el ALTA pero requerido condicional (BR-042)**: obligatorio antes de la primera distribución parcial y **obligatorio sin excepción en el alta directa** (`locationId`, porque es la cantidad del segmento inicial); sin total declarado → `CARGO_TOTAL_REQUIRED` 422 en el movimiento/segmento o en el alta directa | "La cantidad total debe ser mayor a cero" |
| totalUnit | string | `@IsOptional()` `@IsEnum(QuantityUnit)` (UNITS/PALLETS/TONS/CUBIC_METERS/AREA; si viene totalQuantity, totalUnit es requerido; **ambos se exigen juntos** — BR-042, y ambos son **obligatorios** con `locationId`; `totalUnit` define la unidad del residual derivado `inTruckUnit`) | "La unidad de la cantidad total es inválida" |
| truckId | string UUID | `@IsOptional()` `@IsUUID()` | — |
| locationId | string UUID | `@IsOptional()` `@IsUUID()` — **ALTA DIRECTA A SECTOR** (FASE 5): la carga nace `STORED` con un único segmento `CargoLocation` ACTIVE y **sin** fila `Movement`; excluye `truckId` y vuelve obligatorios `totalQuantity`/`totalUnit` (BR-042). Contrato de errores: API.md §5.2 | — |
| entryDate | string (ISO 8601) | `@IsOptional()` `@IsISO8601()` | "La fecha de ingreso debe ser ISO 8601" |
| metadata | object | `@IsOptional()` `@IsObject()` (JSONB) | — |
| observation | string | `@IsOptional()` `@IsString()` `@MaxLength(2000)` — **obligatoria en el service** (BR-006/OQ-022, decisión 24): declarada opcional para que el `ValidationPipe` no responda 400 antes de que el service pueda responder 422 `BUSINESS_RULE_VIOLATION` (`details.rule: 'BR-006'`, decisión 31) | — |

Nota: **la relación Cargo↔Location es M:N vía `CargoLocation`** (secciones 62-70, BR-032): **no existe `location_id` en `cargo`** ni un `locationId` único en la respuesta. El alta **sí** admite `locationId` **opcional** como **ALTA DIRECTA A SECTOR** (FASE 5; transición `REGISTERED → STORED` confirmada — VALIDATION.md §4.4.1 "alta directa con `locationId` de depósito | alta (sin movimiento)"): la carga se persiste `STORED` junto al segmento inicial ACTIVE, en la misma transacción y **sin** fila `Movement` — el estado inicial es parte de la fila `Cargo`, no una transición, y BR-008 (historial reconstruible) queda intacto. Sin `locationId`, la ubicación inicial (o cualquier otra) se asigna con `POST /cargos/:id/locations` (§4.4.1). `quantity`/`unit` se renombran a `totalQuantity`/`totalUnit` (MASTER-SPEC §4.1). **ID-003 (resuelta, 2026-09-23)**: `DATABASE.md` §5.3 alineado en FASE 0 (sin `location_id` en `cargo`; `CargoLocation` modelado con `quantity`/`quantity_unit`) — la alineación sigue vigente: el alta directa **no** agrega columna a `cargo`. Los DTOs siguen MASTER-SPEC v0.3.

Reglas del `locationId` de alta (validadas por el service, no por el DTO):
- **Excluyente con `truckId`**: un ingreso es directo a sector (`STORED`) o vía camión (`IN_TRUCK`); enviar ambos → 422 `BUSINESS_RULE_VIOLATION` con `details.exclusiveFields: ['locationId','truckId']`. El camión no es una `Location` (BR-042) y `STORED` no admite camión en la matriz BR-044.
- **`totalQuantity`/`totalUnit` obligatorios** (BR-042): son la cantidad del segmento inicial (`cargo_locations.quantity` es NOT NULL); si faltan → 422 `CARGO_TOTAL_REQUIRED` (`details.rule: 'BR-042'`). Enviar solo uno de los dos sigue siendo 400 `VALIDATION_ERROR` (payload shape).
- **Ubicación de depósito y su capacidad**: debe existir y no estar soft-deleted (404 `LOCATION_NOT_FOUND`), estar `ACTIVE` (409 `LOCATION_INACTIVE`, BR-004), admitir `STORED` — `GALPON`/`SECTOR` (BR-044), admitir la `totalUnit` (422 `UNIT_INCOMPATIBLE`, BR-035) y tener capacidad para el total declarado (409 `CAPACITY_EXCEEDED`, BR-005/036, techo de sobreocupación §4.5). Detalle completo en API.md §5.2.

Nota: el estado inicial lo fija el service, NO el DTO (BR-016: el cliente no elige estados arbitrarios), y son **tres** derivaciones: `STORED` con `locationId` (alta directa), `IN_TRUCK` con `truckId`, `REGISTERED` en cualquier otro caso. La arista `REGISTERED → STORED` de la matriz conserva `kinds: []` a propósito: un ALTA no es un movimiento, así que `move()` sigue rechazando ese par y el intake nunca lo recorre.

**UpdateCargoDto** — `PartialType(CreateCargoDto)` con excepción: `code` solo editable bajo reglas de unicidad (BR-002) y con observación/auditoría; **`totalQuantity`/`totalUnit` SÍ se editan por PATCH** (declaración del total — BR-042; ambos juntos; nuevo total < suma distribuida vigente → 409 `DISTRIBUTION_EXCEEDS_TOTAL`), pero `truckId` y los campos que **implican movimiento o distribución** deben usar el flujo de movimientos (`MoveCargoDto`) o de segmentos (§4.4.1). Documentado como regla del service (ver VALIDATION.md §5 y API.md §5.4).

**MoveCargoDto** — `POST /api/v1/cargos/:id/movements`
| Campo | Tipo | Validación | Mensaje |
| --- | --- | --- | --- |
| toLocationId | string UUID | `@IsUUID('4')` requerido | "La ubicación de destino es obligatoria" (BR-003: carga existe — valida service; BR-004: ubicación ACTIVE — valida service) |
| toStatus | CargoStatus | `@IsEnum(CargoStatus)` requerido | "El estado de destino es inválido" |
| reason | MovementReason | `@IsEnum(MovementReason)` requerido (MOVE/UNLOAD/TO_SCANNER/TO_BALANZA/TO_REZAGO/TO_SECUESTRO/EXIT/…) | "El motivo es obligatorio" (alineado con DATABASE.md §5.3: `movements.reason` NOT NULL — **ID-004 resuelta**) |
| observation | string | `@IsString()` `@IsNotEmpty()` `@MaxLength(2000)` (BR-006/007; obligatoria también en movimientos parciales y egresos de segmento — BR-039) | "La observación es obligatoria y no puede estar vacía" |
| quantity | number | `@IsOptional()` `@IsNumber()` `@Min(0.0001)` (movimiento PARCIAL — BR-037; si se omite, el movimiento es del 100%) | "La cantidad movida debe ser mayor a cero" |
| quantityUnit | QuantityUnit | `@IsOptional()` `@IsEnum(QuantityUnit)` (requerido si viene `quantity`; debe ser compatible con la unidad del destino o `PERCENT` — BR-035; sin conversión en v1 — OQ-044) | "La unidad debe ser compatible con el destino" |
| percentage | number | `@IsOptional()` `@IsNumber()` `@Min(0.0001)` `@Max(100)` (alternativa relativa para parcial; semántica informativa/derivada — OQ-045) | "El porcentaje debe estar entre 0 y 100" |
| metadata | object | `@IsOptional()` `@IsObject()` | — |

**NotesDto** (notas de carga sin movimiento) — `POST /api/v1/cargos/:id/notes`: `{ text: string, @IsNotEmpty @MaxLength(2000), metadata? }`.

#### 4.4.1 Distribución Cargo↔Location (secciones 62-70, BR-032..BR-040)

DTOs de dominio compartido (definidos en `cargo`, procesados en `movements`; consultas de capacidad en `locations` — MODULES.md §6 nota 5). Alineados con MASTER-SPEC §4.1 (`CargoLocation`: quantity/quantityUnit/percentage?/enteredAt/exitedAt/status/notes). DATABASE.md §5.3 modela `CargoLocation` desde v0.2 (ID-003 resuelta — ver nota §4.4): estos DTOs son consistentes con el esquema documentado. Nota BR-042: el alta/ajuste de segmento exige la carga con `totalQuantity`/`totalUnit` declarados; el service responde `CARGO_TOTAL_REQUIRED` (422) en caso contrario.

**CreateDistributionDto** — `POST /api/v1/cargos/:id/locations` (alta de segmento + movimiento BR-039)
| Campo | Tipo | Validación | Mensaje |
| --- | --- | --- | --- |
| locationId | string UUID | `@IsUUID('4')` requerido (BR-004: ubicación ACTIVE — valida service; BR-032: sin segmento ACTIVE duplicado del par) | "La ubicación es obligatoria" |
| quantity | number | `@IsNumber()` `@Min(0.0001)` requerido (cantidad del segmento; BR-033/034) | "La cantidad del segmento es obligatoria y mayor a cero" |
| quantityUnit | QuantityUnit | `@IsEnum(QuantityUnit)` requerido; compatible con `capacityUnit` de la ubicación o `PERCENT` (BR-035; conversión NO soportada v1 — OQ-044) | "La unidad debe ser compatible con la ubicación" |
| percentage | number | `@IsOptional()` `@IsNumber()` `@Min(0.01)` `@Max(100)` (informativo/derivado — OQ-045) | "El porcentaje debe estar entre 0 y 100" |
| notes | string | `@IsString()` `@IsNotEmpty()` `@MaxLength(2000)` (observación obligatoria BR-006/039) | "La observación es obligatoria y no puede estar vacía" |
| metadata | object | `@IsOptional()` `@IsObject()` | — |

**UpdateDistributionDto** — `PATCH /api/v1/cargos/:id/locations/:cargoLocationId` (ajuste de cantidad/porcentaje; genera movimiento BR-039)
| Campo | Tipo | Validación | Mensaje |
| --- | --- | --- | --- |
| quantity | number | `@IsOptional()` `@IsNumber()` `@Min(0.0001)` | "La cantidad debe ser mayor a cero" |
| quantityUnit | QuantityUnit | `@IsOptional()` `@IsEnum(QuantityUnit)` (si cambia, debe seguir siendo compatible — BR-035) | "La unidad debe ser compatible con la ubicación" |
| percentage | number | `@IsOptional()` `@IsNumber()` `@Min(0.01)` `@Max(100)` (OQ-045) | "El porcentaje debe estar entre 0 y 100" |
| notes | string | `@IsOptional()` `@IsString()` `@IsNotEmpty()` `@MaxLength(2000)` (obligatoria SIEMPRE que cambie cantidad — BR-006/039) | "La observación es obligatoria al ajustar un segmento" |
| metadata | object | `@IsOptional()` `@IsObject()` | — |

Regla de servicio: al menos un campo de ajuste (`quantity`/`quantityUnit`/`percentage`) requerido; `locationId` NO se modifica por PATCH (cambiar de ubicación = movimiento, no ajuste).

**DeleteDistributionDto** — `DELETE /api/v1/cargos/:id/locations/:cargoLocationId` (egreso → movimiento BR-039)
| Campo | Tipo | Validación | Mensaje |
| --- | --- | --- | --- |
| notes | string | `@IsString()` `@IsNotEmpty()` `@MaxLength(2000)` (observación obligatoria BR-006/039) | "La observación es obligatoria y no puede estar vacía" |
| metadata | object | `@IsOptional()` `@IsObject()` | — |

### 4.5 trucks (módulo trucks)

**CreateTruckDto** — `POST /api/v1/trucks`
| Campo | Tipo | Validación | Mensaje |
| --- | --- | --- | --- |
| plate | string | `@IsString()` `@IsNotEmpty()` `@MaxLength(20)` `@Matches(/^[A-Z0-9-]+$/)` | "La patente solo admite letras, números y guiones" |
| brand | string | `@IsOptional()` `@MaxLength(60)` | — |
| model | string | `@IsOptional()` `@MaxLength(60)` | — |
| driverName | string | `@IsOptional()` `@MaxLength(160)` | — |

Unicidad de patente: constraint DB + traducción P2002 → 409 (ver ERROR-HANDLING.md §6).

**UpdateTruckDto** — `PartialType(CreateTruckDto)`.

### 4.6 locations (módulo locations)

**CreateLocationDto** — `POST /api/v1/locations`
| Campo | Tipo | Validación |
| --- | --- | --- |
| name | string | `@IsString()` `@IsNotEmpty()` `@MaxLength(120)` |
| code | string | `@IsString()` `@IsNotEmpty()` `@MaxLength(30)` (único, BR análogo a BR-002) |
| type | LocationType | `@IsEnum(LocationType)` |
| status | LocationStatus | `@IsEnum(['ACTIVE','INACTIVE','MAINTENANCE'])` default ACTIVE |
| capacity | number | `@IsNumber()` `@Min(0)` (tope de la ubicación; ignorado si `capacityUnit = UNLIMITED`) |
| capacityUnit | QuantityUnit | `@IsOptional()` `@IsEnum(QuantityUnit)` (UNITS/PALLETS/TONS/CUBIC_METERS/AREA/PERCENT, + UNLIMITED conservado de CapacityType — MASTER-SPEC §4.3). **Opcional (BR-041)**: si se omite, se aplica el **default por LocationType** (SECTOR → `AREA`, PLAZOLETA/SCANNER/BALANZA → `UNITS`, otros → configurable); declararlo explícito = **override por ubicación** (solo ADMIN, audita `CAPACITY_CHANGE`). La respuesta siempre expone la unidad efectiva (§4.12) |
| x, y, width, height | number | `@IsNumber()` (coordenadas/elemento visual, opcional en creación) |
| rotation | number | `@IsOptional()` `@IsNumber()` |
| color | string | `@IsOptional()` `@Matches(/^#[0-9A-Fa-f]{6}$/)` |
| description | string | `@IsOptional()` `@MaxLength(500)` |
| properties | object | `@IsOptional()` `@IsObject()` |

**UpdateLocationDto** — `PartialType(CreateLocationDto)`; cambio de `status` a INACTIVE/MAINTENANCE con reglas de negocio (no vaciar ubicaciones con carga — ver VALIDATION.md §5; puede requerirse observación). Cambio de `capacityUnit` sobre una ubicación con segmentos activos compatibles queda sujeto a revalidación de BR-035.

**LocationTypeDefaultUnitDto** — DTO de administración de los **defaults de BR-041** (exposición/edición vía `GET/PATCH /settings`, claves `locationTypeDefaultUnit.<type>`; permiso `settings.manage`, ADMIN):
| Campo | Tipo | Validación |
| --- | --- | --- |
| sector | QuantityUnit | `@IsOptional()` (default canónico: `AREA`) |
| plazoleta | QuantityUnit | `@IsOptional()` (default canónico: `UNITS`) |
| scanner | QuantityUnit | `@IsOptional()` (default canónico: `UNITS`) |
| balanza | QuantityUnit | `@IsOptional()` (default canónico: `UNITS`) |
| otros tipos (galpon, rezago, secuestro, otro) | QuantityUnit | `@IsOptional()` — **configurables** (sin default fijo; null = no configurado) |

Regla de servicio: cambiar un default NO modifica `capacityUnit` de ubicaciones existentes con override explícito; solo afecta la **unidad efectiva** de las que no declaran override. Módulo dueño de la tabla/de las claves: pendiente de definir (§10 fila 12).

**LocationQueryDto** — `?type=`, `?status=`, `?includeCapacity=true`, `?page=&limit=` (hereda ListQueryDto, §4.11).

### 4.7 maps (módulo maps)

**UpdateMapDto** — `PATCH /api/v1/maps/:id`
| Campo | Tipo | Validación |
| --- | --- | --- |
| name | string | `@IsOptional()` `@MaxLength(120)` |
| width / height / gridSize | number | `@IsOptional()` `@IsNumber()` `@Min(1)` |
| status | string | `@IsOptional()` `@IsIn(['DRAFT','ACTIVE','ARCHIVED'])` |
| elements | MapElementUpsertDto[] | `@IsOptional()` `@IsArray()` `@ArrayMaxSize(500)` |

**MapElementUpsertDto** — por elemento:
| Campo | Tipo | Validación |
| --- | --- | --- |
| id | string UUID | `@IsOptional()` `@IsUUID('4')` (si viene: update; si no: create) |
| locationId | string UUID | `@IsUUID('4')` |
| elementType | string | `@IsIn(['LOCATION','LABEL','POLYGON','PATH'])` default LOCATION |
| x, y, width, height, rotation, zIndex | number | `@IsNumber()` (x/y requeridos; resto con default) |
| fill, stroke | string | `@IsOptional()` `@Matches(/^#[0-9A-Fa-f]{6}$/)` |
| labelPosition | string | `@IsOptional()` `@IsIn(['TOP','BOTTOM','LEFT','RIGHT','CENTER'])` |
| properties | object | `@IsOptional()` `@IsObject()` |

### 4.8 alerts (módulo alerts)

**UpdateAlertDto** — `PATCH /api/v1/alerts/:id`
| Campo | Tipo | Validación | Mensaje |
| --- | --- | --- | --- |
| status | AlertStatus | `@IsEnum(AlertStatus)` (OPEN→ACKNOWLEDGED→RESOLVED/DISMISSED, transición validada en service) | "El estado de alerta es inválido" |
| observation | string | `@IsOptional()` `@MaxLength(2000)` (obligatoria para RESOLVED/DISMISSED — ver VALIDATION.md §5) | — |

**AlertQueryDto** — `?status=`, `?type=`, `?cargoId=`, `?severity=`, `?from=&to=`, + paginación.

### 4.9 audit (módulo audit)

**AuditQueryDto** — `?action=` (AuditAction), `?entity=`, `?entityId=`, `?userId=`, `?from=&to=`, `?ip=` + paginación. Sin DTO de body (solo lectura).

### 4.10 notifications / settings

**NotificationsQueryDto** — `?unreadOnly=true&page=&limit=`.
**MarkNotificationReadDto** — `PATCH /api/v1/notifications/:id/read`: sin body (o `{}`).
**UpdateSettingsDto** — pares clave-valor tipados: `{ key: string @Matches(/^[a-z]+\.[a-z0-9_.]+$/), value: string|number|boolean|object }`.
**SettingsQueryDto** — `?keys=coma,separadas` (filtro opcional).

### 4.11 Queries base (paginación / filtros / orden)

**ListQueryDto** (base, reutilizable por herencia — §6):
| Campo | Tipo | Default | Validación | Mensaje |
| --- | --- | --- | --- | --- |
| page | number | 1 | `@IsOptional()` `@Type(() => Number)` `@IsInt()` `@Min(1)` | "page debe ser un entero ≥ 1" |
| limit | number | 25 | `@IsOptional()` `@Type(() => Number)` `@IsInt()` `@Min(1)` `@Max(100)` | "limit debe estar entre 1 y 100" |
| sort | string | `-createdAt` | `@IsOptional()` `@IsString()` `@Matches(/^-?[a-zA-Z]+(,-?[a-zA-Z]+)*$/)` | "sort: lista de campos con prefijo - para descendente" |
| filter | string | — | `@IsOptional()` `@IsString()` `@MaxLength(500)` | Formato `campo:valor,campo2:valor2` (§5 de API-CONVENTIONS) |

**CargoListQueryDto** — extiende ListQueryDto: `code?`, `status?` (CargoStatus), `locationId?`, `truckId?`, `createdById?`, `alert?` (`stale`/`none`), `search?` (texto libre sobre code/name/description), `from?/to?` (rango entryDate). Validaciones: `@IsEnum` para status; `@IsUUID` para IDs; `@IsISO8601` para fechas.
**MovementListQueryDto** — extiende ListQueryDto: `kind?` (MovementKind), `userId?`, `from?/to?`.
**TruckListQueryDto** — extiende ListQueryDto: `plate?`, `withCargo?` (boolean).
**LocationQueryDto**, **AlertQueryDto**, **AuditQueryDto**, **NotificationsQueryDto**, **SettingsQueryDto**: antes referenciados.

### 4.12 Response DTOs (shape de salida)

Los shapes de salida se tipan con interfaces/classes `@ApiProperty` reutilizadas como respuesta del interceptor `{ data }`:
- **CargoResponseDto**: id, code, name?, description?, status, truckId?, entryDate, estimatedExpiryDate?, totalQuantity?, totalUnit?, **inTruckAmount?, inTruckUnit?** (residual derivado "en camión" = `totalQuantity − Σ segmentos ACTIVE`, unidades compatibles — **BR-042**; `null` si la carga no declara total; sin `truckId` ni total declarado no hay residual que exponer → `null` (no `0`) — OQ-042 → BR-042, API.md §13), createdById, lastMovedById?, createdAt, updatedAt, alertsSummary? (openAlerts count), metadata?. **Sin `locationId` único** (relación M:N vía segmentos — MASTER-SPEC §4.1/§4.2; BR-032); el detalle de ubicaciones se expone vía `GET /cargos/:id/locations` (DistributionSegmentDto).
- **MovementResponseDto**: id, cargoId, fromLocationId?, toLocationId, fromStatus?, toStatus, kind, reason, userId, movedAt, observation (objeto anidado o texto), quantity?/quantityUnit?/percentage? (parciales, BR-037), metadata?, reversionOfId?.
- **DistributionSegmentDto** (respuesta de segmento CargoLocation — API.md §5.9/5.10): id (cargoLocationId), cargoId, locationId, location? (LocationSummaryDto), quantity, quantityUnit, percentage?, occupiedArea?, status (CargoLocationStatus: ACTIVE | EXITED), enteredAt, exitedAt?, notes?, createdAt, updatedAt.
- **LocationCapacityDto** (respuesta de `GET /locations/:id/capacity`): id, name?, code?, capacity, capacityUnit, occupiedCapacity (derivado — BR-033), availableCapacity, occupancyPercent? (derivado), allowOverOccupation (BR-036), segmentsByUnit? (`[{ quantityUnit, occupied }]` — desglose por unidad, BR-040).
- **LocationCargosItemDto** (item de `GET /locations/:id/cargos`): cargoId, code, name?, status, cargoLocationId, quantity, quantityUnit, percentage?, enteredAt, openAlerts, permanenceDays? (BR-040/BR-015).
- **LocationResponseDto**: id, name, code, type, status, capacity, capacityUnit, occupiedCapacity (derivado — BR-033), availableCapacity (derivado), capacityPercent (derivado), allowOverOccupation (BR-036), x/y/width/height/rotation/color?, description, properties?. → Modelo v0.3 canónico (MASTER-SPEC §4.1; DATABASE.md alineado): `capacity`/`capacityUnit` + `occupiedCapacity`/`availableCapacity` derivados; sin campos legacy. `capacityUnit` expuesto es la **unidad efectiva** (BR-041): override de la ubicación si se declaró en el alta/edición, o el **default por LocationType** (SECTOR → AREA, PLAZOLETA/SCANNER/BALANZA → UNITS, otros → configurable).
- **AlertResponseDto**: id, cargoId, cargoCode, type, status, severity, dueAt, createdAt, resolvedAt?, metadata?.
- **AuthResponseDto**: `{ accessToken, refreshToken, expiresIn, user: UserSummaryDto }`.
- **PaginatedDto<T>**: `{ items: T[], meta: { page, limit, totalItems, totalPages, hasNext } }` (ver API-CONVENTIONS §5).

## 5. Ejemplos de shape request/response

### 5.1 Crear cargo

```jsonc
// POST /api/v1/cargos
// Request — alta simple (sin ubicación inicial): la ubicación se asigna vía POST /cargos/:id/locations (§4.4.1)
{ "code": "029TERRA26", "name": "Terrazzo 26 — Lote A", "totalQuantity": 120, "totalUnit": "PALLETS",
  "entryDate": "2026-09-20T10:00:00Z", "observation": "Alta en oficina; pendiente de ubicación." }

// 201 Created
{ "data": {
    "id": "7c0f3a4e-...uuid", "code": "029TERRA26", "status": "REGISTERED",
    "entryDate": "2026-09-20T10:00:00Z",
    "totalQuantity": 120, "totalUnit": "PALLETS", "createdAt": "2026-09-23T09:15:00Z" } }

// POST /api/v1/cargos — ALTA DIRECTA A SECTOR (FASE 5): con `locationId` la carga nace STORED
// con un único segmento ACTIVE y SIN movimiento; `totalQuantity`/`totalUnit` son obligatorios y
// `truckId` está excluido (BR-042, BR-044)
{ "code": "029TERRA26", "name": "Terrazzo 26 — Lote A", "totalQuantity": 120, "totalUnit": "PALLETS",
  "locationId": "b2d1...uuid", "observation": "Ingreso directo a Sector 4 por muelle 3." }

// 201 Created — la respuesta NO lleva la ubicación (BR-032: la distribución es M:N); el segmento
// inicial se lee en GET /cargos/:id/locations (§4.4.1)
{ "data": {
    "id": "7c0f3a4e-...uuid", "code": "029TERRA26", "status": "STORED",
    "entryDate": "2026-09-20T10:00:00Z",
    "totalQuantity": 120, "totalUnit": "PALLETS", "createdAt": "2026-09-23T09:15:00Z" } }
```

### 5.2 Mover cargo

```jsonc
// POST /api/v1/cargos/7c0f.../movements — movimiento PARCIAL (BR-037): 80 de 120 pallets
// Request
{ "toLocationId": "b2d1...uuid", "toStatus": "STORED", "reason": "UNLOAD",
  "observation": "Descarga parcial de camión en sector 5, 80 pallets en buen estado.",
  "quantity": 80, "quantityUnit": "PALLETS" }

// 201 Created
{ "data": {
    "id": "a91f...uuid", "cargoId": "7c0f...", "fromLocationId": "3e9f...",
    "toLocationId": "b2d1...", "fromStatus": "IN_TRUCK", "toStatus": "PARTIALLY_UNLOADED",
    "kind": "UNLOAD", "userId": "u-...", "movedAt": "2026-09-23T09:20:00Z",
    "quantity": 80, "quantityUnit": "PALLETS",
    "observation": { "id": "obs-...", "text": "Descarga parcial de camión en sector 5, 80 pallets en buen estado.", "userId": "u-..." } } }
```

### Ejemplo — crear segmento de distribución (secciones 62-70)

```jsonc
// POST /api/v1/cargos/7c0f.../locations — alta de segmento + movimiento (BR-039)
// Request
{ "locationId": "d3a1...uuid", "quantity": 35, "quantityUnit": "AREA",
  "notes": "Distribución inicial 35 m² en Sector 4." }

// 201 Created
{ "data": {
    "id": "cl-...uuid", "cargoId": "7c0f...", "locationId": "d3a1...",
    "quantity": 35, "quantityUnit": "AREA", "percentage": 31.8,
    "status": "ACTIVE", "enteredAt": "2026-09-23T10:00:00Z", "exitedAt": null } }
```

### Ejemplo — capacidad de una ubicación (Sector 4, MASTER-SPEC §5)

```jsonc
// GET /api/v1/locations/d3a1.../capacity
{ "data": { "id": "d3a1...uuid", "name": "Sector 4", "code": "S4",
    "capacity": 100, "capacityUnit": "AREA",
    "occupiedCapacity": 80, "availableCapacity": 20, "occupancyPercent": 80,
    "allowOverOccupation": false,
    "segmentsByUnit": [ { "quantityUnit": "AREA", "occupied": 80 } ] } }
```

### 5.3 Listado paginado

```jsonc
// GET /api/v1/cargos?page=2&limit=25&sort=entryDate&filter=status:STORED,locationId:b2d1...
{ "data": { "items": [ /* CargoResponseDto[] */ ], "meta": {
    "page": 2, "limit": 25, "totalItems": 431, "totalPages": 18, "hasNext": true } } }
```

## 6. Reutilización (no duplicar contratos)

1. **Herencia**: `UpdateXDto = PartialType(CreateXDto)` (mapear `@nestjs/mapped-types`); los query DTOs heredan `ListQueryDto`.
2. **Composición**: `MapElementUpsertDto` se reutiliza dentro de `UpdateMapDto`; `UserSummaryDto` dentro de `AuthResponseDto` y `CargoResponseDto.createdBy`; `LocationSummaryDto` dentro de `CargoResponseDto`.
3. **Un solo dueño por campo**: el campo se define UNA vez y se reutiliza; prohibido re-declarar el mismo campo con validaciones distintas en DTOs del mismo módulo.
4. **DTOs de dominio compartidos**: `MoveCargoDto` y `UpdateCargoStatusDto` se exponen a través de `cargo` y se procesan en `movements` (misma definición, orquestación en service; ver MODULES.md §5.5/5.8). Los DTOs de distribución (`CreateDistributionDto`, `UpdateDistributionDto`, `DeleteDistributionDto`) se definen en `cargo` (facade) y se procesan en `movements`; los de consulta de capacidad/cargas de ubicación (`LocationCapacityDto`, `LocationCargosItemDto`) pertenecen a `locations` — sin re-declarar campos (MODULES.md §6 nota 5).
5. **Respuestas**: tipos tipados en `dto/responses/` compartidos entre controllers del mismo módulo; entre módulos solo via services públicos.

## 7. Criterios de aceptación

1. Todo DTO tiene campos tipo + reglas class-validator + mensaje en español (cuando la regla tiene mensaje al usuario).
2. Los DTOs de lectura heredan `ListQueryDto`; no se duplica paginación campo a campo.
3. Los ejemplos §5 coinciden exactamente con los contratos de `API.md`.
4. Los enums usados son los canónicos (MASTER-SPEC §4.3), sin redefiniciones.
5. Ningún DTO valida reglas BR (eso vive en services — ver VALIDATION.md).

## 8. Archivos involucrados

- `docs/backend/DTOs.md` (este), `API.md`, `VALIDATION.md`, `API-CONVENTIONS.md`, `BACKEND-ARCHITECTURE.md`
- `docs/MASTER-SPEC.md` (§4, §6, §10)

## 9. Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Duplicación de contratos entre módulos (ej. cargo/movements) | Regla §6 con revisión en code review; single source por campo |
| Mensajes de validación mezclando es-AR/es-neutral | Convención: español neutral + i18n futura (MASTER-SPEC §16, OQ-012) |
| DTOs que validan negocio (observación con reglas de contexto, capacidad) | Separación estricta: shape en DTO, BR en service (VALIDATION.md §3) |
| Divergencia entre `MoveCargoDto` y la máquina de estados | `toStatus` se valida contra transiciones en service (BR-016), no solo contra el enum |

## 10. DECISIÓN PENDIENTE

> Las OQ referenciadas quedaron **resueltas en FASE 0** (MASTER-SPEC v0.5 / OPEN-QUESTIONS, 2026-09-23/24): las filas tachadas con `→ RESUELTA` ya tienen decisión canónica; las marcadas **🔶** son **residuales locales** sin resolver (decisión de implementación/equipo, no de negocio).

| # | Pregunta | Impacto | Referencia |
| --- | --- | --- | --- |
| 1 | ~~¿Reglas exactas de unicidad/normalización del código de carga (regex, case-sensitivity, trim)?~~ → **RESUELTA (OQ-001 → BR-002, 2026-09-23)**: regex `^[A-Z0-9][A-Z0-9./-]{2,31}$`, normalizado a mayúsculas, único case-insensitive, longitud 3–32 | Validaciones de `code` en Create/UpdateCargoDto y servicio | OQ-001 / BR-002 (resuelta 2026-09-23) |
| 2 | ¿Carga parcial: opción A (unidad simple + quantity/quantityMoved) u opción B (CargoItem)? | Campos `quantity`/`unit`/`quantityMoved` y futuros DTOs de split | 🔶 Residual local (OQ-002 resuelta: sin CargoItem en v1 — MASTER-SPEC §62-70; semántica de split restante) |
| 3 | ~~¿Operación de egreso/retiro (EXITED) en v1 con remito/documentación?~~ → **RESUELTA (OQ-004 → BR-043, 2026-09-23)**: egreso completo en v1 — `exitDocumentRef?` opcional, observación obligatoria, `EXITED` terminal | DTOs del flujo de salida | OQ-004 (resuelta 2026-09-23) |
| 4 | ¿Formato de `filter` (string `campo:valor` vs objetos estructurados)? | ListQueryDto.filter | 🔶 Residual local (OQ a proponer — ver API-CONVENTIONS §5, sugerencia de formato string) |
| 5 | ~~¿Unidad de capacidad por defecto por `LocationType` y cálculo de la ocupación derivada (conversión entre unidades)?~~ → **RESUELTA (OQ-041 → BR-041, y OQ-044 → BR-048, 2026-09-23/24)**: SECTOR → AREA, PLAZOLETA/SCANNER/BALANZA → UNITS, otros → configurable; override por ubicación; **conversión entre unidades NO soportada en v1** (unidades compatibles o `PERCENT`) | Campos `capacity`/`capacityUnit` de Location y ocupación | OQ-041 / OQ-044 (resueltas) |
| 6 | ~~Semántica de `percentage` en CargoLocation: ¿informativo/derivado o autoritativo? ¿Coexiste con quantity o es excluyente?~~ → **RESUELTA (OQ-045 → BR-049, 2026-09-24)**: `quantity`/`quantityUnit` son la fuente de verdad; `percentage` derivado de UI e informativo, solo input cuando la unidad es `PERCENT`; no coexisten dos fuentes | CreateDistributionDto / DistributionSegmentDto | OQ-045 (resuelta 2026-09-24) |
| 7 | ~~¿Conversión de unidades en movimientos parciales? Recomendado v1: NO — unidades compatibles o PERCENT~~ → **RESUELTA (OQ-044 → BR-048, 2026-09-24)**: NO se convierten unidades en v1 — compatibles o `PERCENT` (`INCOMPATIBLE_UNIT` 422) | MoveCargoDto.quantityUnit / CreateDistributionDto | OQ-044 (resuelta 2026-09-24) |
| 8 | ~~¿El "en camión" es residual derivado (`totalQuantity − Σ CargoLocation activos`) o Location de tipo CAMION?~~ → **RESUELTA** (OQ-042 → **BR-042**): residual derivado, nunca Location; expuesto como `inTruckAmount`/`inTruckUnit`; `CARGO_TOTAL_REQUIRED` 422 sin total declarado | totalQuantity / descarga parcial (BR-038) | OQ-042 (resuelta 2026-09-23) |
| 9 | ~~¿Unidad de capacidad por defecto por LocationType y desglose por unidad de ocupación?~~ → **Unidad por defecto RESUELTA** (OQ-041 → **BR-041**); el desglose `segmentsByUnit` permanece como decisión de presentación (informativo) | LocationCapacityDto.segmentsByUnit | OQ-041 (resuelta 2026-09-23) |
| 10 | **ID-003 (resuelta, 2026-09-23)**: la inconsistencia documental (DTOs v0.2 vs `DATABASE.md` con `location_id`) quedó **resuelta** en FASE 0/1 (DATABASE.md §5.3 alineado: sin `location_id` en `cargo`, `CargoLocation` modelado; ver OPEN-QUESTIONS ID-003) | CreateCargoDto / CargoResponseDto | ID-003 (✅ resuelta) |
| 11 | **ID-004 (resuelta, 2026-09-23)**: `MoveCargoDto.reason` requerido y `movements.reason` **NOT NULL** (DATABASE.md §5.3 alineado) — consistente | MoveCargoDto | ID-004 (✅ resuelta) |
| 12 | **NUEVA (W5)**: ¿qué módulo posee la tabla de configuración de los defaults por LocationType de BR-041 — `settings` (claves `locationTypeDefaultUnit.*`, recomendado) o `locations`? Impacta `LocationTypeDefaultUnitDto`, seeds y la resolución `resolveEffectiveUnit` | Settings/Locations | 🔶 Residual local (OQ nueva propuesta — ver §4.6) |