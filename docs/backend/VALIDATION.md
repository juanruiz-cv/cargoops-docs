# VALIDATION.md — Validación de datos y reglas de negocio del backend de CargoOps

> Grupo W5 — Backend. Dónde y cómo se valida cada regla: shape de DTOs (class-validator), reglas de negocio BR-001..BR-020 en services/validators, máquina de estados de CargoStatus (MASTER-SPEC §7), capacidad (BR-005/036 — defaults de unidad por LocationType resueltos en BR-041; sobreocupación OQ-043; conversión OQ-044), distribución parcial con total declarado obligatorio (BR-042), observación obligatoria (BR-006/007) y transacciones atómicas (movimiento + observación + auditoría). Complementa `DTOs.md` (qué campos) y `ERROR-HANDLING.md` (qué error devolver).

---

## 1. Objetivo

Definir el modelo de validación integral del backend CargoOps: responsabilidad de cada capa (DTO → validators de dominio → guards → DB), la expansión operativa de las BR-001..BR-020 con regla concreta y código de error, la tabla de transiciones válidas de CargoStatus, las reglas de capacidad y ocupación, y la garantía transaccional de los movimientos. Todo validador de negocio se implementa en `src/**/validators/` y reutilizables entre módulos (BACKEND-ARCHITECTURE §5.2).

## 2. Contexto

MASTER-SPEC §6 define las 20 BR canónicas con severidad; §7 define la máquina de estados de `CargoStatus` (transiciones validadas en backend — BR-016); §4.3 define los enums (incluidos `QuantityUnit`/`CapacityType` y `CargoStatus`); §4.4 fija: código de carga = string único (BR-002/OQ-001), estado separado de ubicación, Observation como entidad propia (1:1 en movimientos), soft delete + audit + revert. BACKEND-ARCHITECTURE §5.5 define la transacción crítica del movimiento (locks, advisory locks por cargoLocationId/locationId, timeout 10 s). DTOs.md §2 establece la separación: DTOs validan **shape/formato**; las BR viven en **services/validators**. DATABASE.md materializa constraints (unicidad, `observation_id NOT NULL UNIQUE`, CHECK de observación no vacía, `occupiedCapacity` derivado).

## 3. Restricciones

| # | Restricción | Origen |
| --- | --- | --- |
| R-01 | Los DTOs NO validan reglas de negocio (BR); solo shape/formato/enums. | DTOs.md §2, ADR-003 |
| R-02 | Toda BR se valida SIEMPRE en backend (BR-009) — incluso si el frontend ya la validó para UX. | BR-009 |
| R-03 | Toda transición de estado pasa por la máquina de estados en el service (BR-016); el DTO solo valida que `toStatus` sea un `CargoStatus`. | BR-016, DTOs.md §10 |
| R-04 | Toda escritura sensible es transaccional: o se persiste todo (movimiento + observación + auditoría + capacidad), o nada. | BR-008, BACKEND-ARCHITECTURE §5.5 |
| R-05 | Los mensajes de validación son español neutral; los códigos de error, inglés estable. | DTOs.md §2, ERROR-HANDLING.md §4.8 |
| R-06 | Validaciones costosas de la DB (capacidad) se hacen en la transacción de aplicación, no como constraint DB. | DATABASE.md §3, BR-005 |

## 4. Decisiones

### 4.1 Capas de validación (responsabilidad)

| Capa | Valida | Devuelve | Implementación |
| --- | --- | --- | --- |
| 1. DTO (boundary HTTP) | Shape/formato: tipos, requeridos, longitud, enums, UUID, ISO 8601, whitelist de campos | `400 VALIDATION_ERROR` con `details.fields[]` | `ValidationPipe` global (whitelist, forbidNonWhitelisted, transform) + class-validator |
| 2. Validators de dominio | Reglas BR reutilizables: `CapacityValidator`, `StateMachineValidator`, `ObservationValidator`, `CargoCodeValidator` | Excepciones de dominio (409/422) | `src/modules/**/validators/` — sin I/O, puros y testeables |
| 3. Service (orquestación) | BR contextuales + transaccionalidad + locks | Excepciones de dominio | Dentro de `prisma.$transaction` (BACKEND-ARCHITECTURE §5.5) |
| 4. Guards | Autenticación (JWT) y autorización (permisos RBAC) | `401`/`403` | `JwtAuthGuard` + `PermissionsGuard` (ADR-008/009) |
| 5. Repository / DB | Integridad: unicidad, FK, observación 1:1, CHECK text no vacío, soft delete scope | Traducción de errores Prisma (ERROR-HANDLING §4.5) | Constraints de DATABASE.md §5.3 |

Regla de fall-through: el DTO captura errores de shape; lo que escapa al service se revalida (BR-006 revalidado en service aunque el DTO lo exija: API.md §5.6 documenta ambos caminos).

### 4.2 Validación de DTOs (class-validator + pipes)

Configuración global (BACKEND-ARCHITECTURE §5.1):

```typescript
// main.ts — ilustrativo (FASE 0)
app.useGlobalPipes(new ValidationPipe({
  whitelist: true,               // elimina campos no declarados
  forbidNonWhitelisted: true,    // campos no declarados → 400 (no silencioso)
  transform: true,
  transformOptions: { enableImplicitConversion: false },
}));
```

- `whitelist` + `forbidNonWhitelisted`: el contrato es estricto; campos desconocidos dan `400 VALIDATION_ERROR` (evita "tolerancia" que rompe contratos y evita inyección de campos no previstos).
- `transform: true` sin conversión implícita: `?page=2&limit=25` se transforma con `@Type(() => Number)` explícito en `ListQueryDto` (DTOs.md §4.11); los tipos JSON se respetan.
- Reglas por DTO: catálogo completo en `DTOs.md` §4 (código de carga, patente, UUIDs, enums canónicos, ISO 8601, longitudes máx., cantidades).
- El error de validación se serializa como `400 VALIDATION_ERROR` con `details.fields` `[{ field, message, code }]` (ERROR-HANDLING §4.4).
- Los enums usados son SIEMPRE los canónicos (MASTER-SPEC §4.3); prohibido redefinir literales en los DTOs (DTOs.md §7 #4).

### 4.3 Reglas de negocio: BR-001..BR-020 expandidas

| BR | Regla concreta de validación | Capa | Error (code / HTTP) |
| --- | --- | --- | --- |
| BR-001 | `CreateCargoDto.code`: obligatorio, string, ≤ 64, sin vacíos tras trim. Sin código no hay INSERT posible (NOT NULL DB). | DTO + DB | `VALIDATION_ERROR` / 400 |
| BR-002 | Unicidad del código: chequeo en service (`CargoCodeValidator` + constraint `uq_cargo_code`) y en PATCH si se edita `code` (DTOs.md §4.4). Reglas de normalización exactas: regex `^[A-Z0-9][A-Z0-9./-]{2,31}$`, trim, normalización a mayúsculas, unicidad case-insensitive (BR-002/OQ-001 resuelta). | Service + DB | `CARGO_CODE_DUPLICATE` / 409 (P2002) |
| BR-003 | Antes de mover: la carga existe y no está soft-deleted (`lockForUpdate` dentro de la transacción); lo mismo en `GET /cargos/:id`. | Service (tx) + Repository | `CARGO_NOT_FOUND` / 404 |
| BR-004 | Destino del movimiento: `location.status === 'ACTIVE'`. También aplica al alta si se provee `locationId`. Regla espejo: PATCH de ubicación a INACTIVE/MAINTENANCE rechazado si tiene cargas (API.md §6.3). | Validators + Service | `LOCATION_INACTIVE` / 409; `LOCATION_HAS_CARGO` / 422 |
| BR-005 | `occupiedCapacity + Δ <= capacity` con unidades compatibles: `capacity`/`capacityUnit` de la ubicación vs `occupiedCapacity` derivado (BR-035; ver §4.5); sobreocupación solo con flag administrativo `allowOverOccupation` (BR-036, OQ-043). `UNLIMITED` no valida. Validación DENTRO de la transacción con advisory lock por `locationId`. | `CapacityValidator` + Service (tx) | `CAPACITY_EXCEEDED` / 409 |
| BR-006 | Todo movimiento (ubicación y/o estado) con observación no vacía: DTO `@IsNotEmpty @MaxLength(2000)`; revalidación en service con `trim()`; DB: `observations.text CHECK (length(trim(text)) > 0)` + `movements.observation_id NOT NULL UNIQUE`. | DTO + Service + DB | `400` en DTO; `BUSINESS_RULE_VIOLATION` (rule `BR-006`) / 422 en service |
| BR-007 | Todo cambio de ESTADO requiere observación: aplica cuando `toStatus != fromStatus` (movimientos, REVERSION, RESTORE, soft delete). Misma cadena de validación que BR-006. | DTO + Service + DB | `400` en DTO; `BUSINESS_RULE_VIOLATION` (rule `BR-007`) / 422 en service |
| BR-008 | Todo movimiento inserta `Movement` + `Observation` (1:1) en la misma transacción; historial reconstruible por `movedAt`. Falla a mitad → rollback total; imposible "movimiento sin historial". | Service (tx) | Ningún código específico (garantía); fallo de infra → 500/503/504 |
| BR-009 | Guards SIEMPRE en backend: `JwtAuthGuard` global + `PermissionsGuard` por endpoint; el frontend solo replica estado para UX. | Guards | `401 UNAUTHORIZED`; `403 FORBIDDEN` |
| BR-010 | Viewer: sin permisos de escritura (`cargo.create`, `cargo.move`, `cargo.update`, `cargo.delete_soft`, `truck.create`...). Chequeo por permiso, no por rol hardcodeado (RBAC, ADR-009). | Guards | `FORBIDDEN` / 403 |
| BR-011 | Operator: sin permisos administrativos (`users.manage`, `settings.manage`, `map.edit`, `cargo.revert`, `location.manage`, `audit.read` salvo definición contraria). | Guards | `FORBIDDEN` / 403 |
| BR-012 | Admin: soft delete, restaurar y revertir. Reversión: `kind=REVERSION`, permiso `cargo.revert`, observación obligatoria, `reversionOfId` apunta al movimiento original; la restauración devuelve al estado previo. Revertir una reversión queda prohibido (ver pendientes). | Guards + Service (tx) | `FORBIDDEN` / 403; `INVALID_TRANSITION` / 409; `BUSINESS_RULE_VIOLATION` (BR-012) / 422 |
| BR-013 | No hay borrado silencioso: toda "eliminación" es soft delete (`deletedAt`) + `AuditAction.DELETE` en la misma transacción. No existe endpoint de hard delete. | Service (tx) + Repository scopes | Sin código propio (garantía); `404` si se consulta un recurso soft-deleted |
| BR-014 | Alerta de rezago: solo se GENERA la alerta (`STALE_30D` OPEN, job diario); NO existe movimiento automático a REZAGO. Pasar a REZAGO exige: usuario autorizado + `reason=TO_REZAGO` + observación (movimiento humano). | Job (JOBS.md) + Service | `BUSINESS_RULE_VIOLATION` (rule `BR-014`) / 422 si se intenta un "auto-movimiento" |
| BR-015 | Cálculo de permanencia: `permanence = now() - entryDate` (default); configurables vía `settings` (`staleAlert.days`, fecha base) — OQ-008. La regla se evalúa en el job y se expone en la carga (permanenceDays). | Settings + Job | Sin código (no es validación de entrada) |
| BR-016 | `toStatus` validado contra la matriz de transiciones §4.4 en `StateMachineValidator` (service), no solo contra el enum. `fromStatus` real se lee con lock, nunca del request. | `StateMachineValidator` + Service (tx) | `INVALID_TRANSITION` / 409 |
| BR-017 | Privacidad en auditoría/logs: `AuditLog.ip`/`user_agent` minimizados; sin datos sensibles en logs (ERROR-HANDLING §4.7). | Audit service + logging | Sin código (convención de escritura) |
| BR-018 | Export PDF: guard `cargo.export_pdf`; el worker genera solo datos autorizados del solicitante (RBAC aplicado al snapshot); toda exportación registra `AuditAction.EXPORT`. | Guards + Worker (JOBS.md) | `FORBIDDEN` / 403; `CARGO_NOT_FOUND` / 404 |
| BR-019 | Notificaciones desacopladas de proveedores: service opera contra la interfaz `NotificationChannelProvider`; en v1 solo `IN_APP` (OQ-011). | Service (interfaz) | Sin código (diseño) |
| BR-020 | Planos como datos estructurados: `PATCH /maps/:id` con `UpdateMapDto` (elementos `MapElementUpsertDto[]`, ≤ 500, coordenadas numéricas, vínculos `locationId` válidos); validación geométrica (superposición) pendiente — OQ-015. | Service | `VALIDATION_ERROR` / 400; `MAP_NOT_FOUND`, `LOCATION_NOT_FOUND` / 404; `MAP_ELEMENT_CONFLICT` / 409 (si OQ-015 la adopta) |

Detalles por regla crítica (BR-002, BR-005, BR-006/007, BR-016) en §4.4–§4.7.

#### 4.3.1 Distribución M:N — BR-032..BR-040 (ampliación 0.2, secciones 62-70)

| BR | Regla concreta de validación | Capa | Error (code / HTTP) |
| --- | --- | --- | --- |
| BR-032 | Alta/edición de carga SIN `locationId` único: la distribución se modela vía `CargoLocation`. `POST /cargos/:id/locations` valida: cargo existe y no soft-deleted (BR-003), ubicación `ACTIVE` (BR-004), y que no exista segmento `ACTIVE` para el mismo par (cargo, location) (MASTER-SPEC §4.2: la fila se actualiza, no se duplica). | Service (tx) | `CARGO_NOT_FOUND` / `LOCATION_NOT_FOUND` / 404; `CONFLICT` / 409 si ya existe segmento ACTIVE del par |
| BR-033 | Ocupación de una ubicación = Σ de segmentos `CargoLocation` ACTIVE en unidad compatible (BR-035); `occupiedCapacity`/`availableCapacity` derivados. Se recalcula en la transacción y se expone en `GET /locations/:id/capacity` y `GET /locations/:id/cargos` (BR-040). | Service (tx) + agregación | Garantía de consistencia; mismatch de unidades en la suma → `UNIT_INCOMPATIBLE` / 422 |
| BR-034 | Σ de cantidades distribuidas (segmentos ACTIVE) ≤ `totalQuantity` de la carga, con unidades compatibles o `PERCENT`. Alta (POST) y ajuste (PATCH) de segmento revalidan la suma DENTRO de la transacción. | `DistributionConsistencyValidator` + Service (tx) | `DISTRIBUTION_EXCEEDS_TOTAL` / 409 |
| BR-035 | Capacidad y ocupación se computan en una unidad compatible: misma `QuantityUnit` o `PERCENT`. No se suman m² + toneladas + pallets sin conversión (NO soportada en v1 — OQ-044). Mismatch → rechazo. | `QuantityUnitValidator` + Service | `UNIT_INCOMPATIBLE` / 422 |
| BR-036 | `occupiedCapacity + Δ ≤ techo`; el techo es `capacity` sin flag y `capacity × (1 + overOccupationLimitPercent/100)` (default +10 %) con `allowOverOccupation = true` (flag administrativo por ubicación, solo ADMIN; OQ-043 resuelta 2026-09-24, implementada en FASE 5 — detalle en §4.5). Sin flag → rechazo (`details.rule: 'BR-005'`). Con flag → permitido hasta el techo, con **auditoría** `CAPACITY_CHANGE` sobre la ubicación (`metadata.overOccupation: true`); pasado el techo → rechazo (`details.rule: 'BR-036'`, `details.ceiling` = techo real). `capacity = 0` = UNBOUNDED, sin validación. | Guard compartido de capacidad + Service (tx, advisory lock por locationId) | `CAPACITY_EXCEEDED` / 409 |
| BR-037 | Movimientos parciales: `quantity` + `quantityUnit` (o `percentage`) en `MoveCargoDto`/`CreateDistributionDto`; el origen descuenta, el destino suma, el resto permanece. Mover NO equivale a mover el 100%. | DTO (shape) + Service (tx) | `400 VALIDATION_ERROR` (shape); semántica → 409/422 según filas previas |
| BR-038 | Descarga parcial: residual en camión = `totalQuantity − Σ CargoLocation activos` (unidades compatibles). El residual NO es un segmento `CargoLocation` ni una Location (BR-042, OQ-042 resuelta); al mover el residual a destino, la carga pasa a `STORED` si queda en cero (MASTER-SPEC §7). El residual se expone en respuestas como `inTruckAmount`/`inTruckUnit` (derivado, no persistido — DTOs.md §4.12). | Service (cálculo, tx) | Inconsistencia → `DISTRIBUTION_EXCEEDS_TOTAL` / 409 |
| BR-039 | Alta/ajuste/egreso de segmento generan `Movement` + `Observation` en la MISMA transacción (BR-006/008); `enteredAt` al activar, `exitedAt` al egresar (BR-040 expone ambos). | Service (tx) | `BUSINESS_RULE_VIOLATION` (rule `BR-006`/`BR-039`) / 422 si la observación llega vacía al service |
| BR-040 | Consultas de distribución (`GET /cargos/:id/locations`, `GET /locations/:id/cargos`, `GET /locations/:id/capacity`) exponen ubicaciones, cantidad, porcentaje, fechas de ingreso/salida e historial de movimientos. | Repository (lectura) | Sin código (lectura) |
| BR-041 | Unidad efectiva de capacidad = `capacityUnit` de la ubicación si hay **override** explícito, o el **default por LocationType** (SECTOR → AREA, PLAZOLETA/SCANNER/BALANZA → UNITS, otros → configurable). El alta/edición de ubicación sin override resuelve la unidad desde el default del tipo; el override y los defaults son solo ADMIN (`location.manage`/`settings.manage`) y auditan `CAPACITY_CHANGE`. | `CapacityValidator` + SettingsService + Service (tx) | `FORBIDDEN` / 403; `VALIDATION_ERROR` / 400 si la unidad del override es inválida |
| BR-042 | Distribución parcial exige **total declarado**: cualquier movimiento o descarga parcial sobre una carga sin `totalQuantity` + `totalUnit` → `CARGO_TOTAL_REQUIRED` / 422. Con total declarado, la suma de segmentos ACTIVE se valida ≤ total (BR-034) y el residual "en camión" es derivado (`totalQuantity − Σ activos`, unidades compatibles), nunca un segmento validable. | DTO (shape opcional) + Service (tx, condicional) | `CARGO_TOTAL_REQUIRED` / 422 |

### 4.4 Máquina de estados (CargoStatus)

Principios (MASTER-SPEC §7): estado y ubicación son independientes; toda transición requiere observación (BR-006/007), historial (BR-008) y validación de permisos; `IN_TRANSIT` es transitorio; la reversión restaura el estado previo conservando el historial.

#### 4.4.1 Transiciones confirmadas (canónicas)

| Transición | Origen | MovementKind / motivo típico | Fuente |
| --- | --- | --- | --- |
| REGISTERED → IN_TRUCK | Alta con `truckId` + Plazoleta, o ingreso vía camión | `INGRESS` | MASTER-SPEC §7 |
| REGISTERED → STORED | Alta directa con `locationId` de depósito | alta (sin movimiento) — **implementada en FASE 5** | Ejemplo DTOs.md §5.1 |
| IN_TRUCK → PARTIALLY_UNLOADED | Descarga parcial | `UNLOAD` | §7 (↔) |
| IN_TRUCK → STORED | Descarga completa directa | `UNLOAD` | Ejemplo DTOs.md §5.2 |
| PARTIALLY_UNLOADED → IN_TRUCK | Re-carga al camión | `MOVE`/`UNLOAD` inverso | §7 (↔) |
| PARTIALLY_UNLOADED → STORED | Fin de descarga | `UNLOAD`/`MOVE` | §7 (↔) |
| STORED → PARTIALLY_UNLOADED | Descarga diferida/reacomodo | `UNLOAD`/`MOVE` | §7 (↔) |
| STORED → IN_REVIEW | Paso por Scanner o Balanza | `TO_SCANNER`/`TO_BALANZA` | §7 (↔) |
| IN_REVIEW → STORED | Salida de revisión | `MOVE` | §7 (↔) |
| IN_REVIEW → REZAGO | Decisión humana + observación (BR-014) | `TO_REZAGO` | §7 (→) |
| IN_REVIEW → SECUESTRO | Medida administrativa | `TO_SECUESTRO` | §7 (→) |
| IN_REVIEW → EXITED | Egreso (BR-043, OQ-004 resuelta) | `EXIT` | §7 (→) |
| IN_REVIEW → DELETED | Soft delete (ADMIN) | soft delete | §7 (→), BR-012 |
| STORED → STORED · PARTIALLY_UNLOADED → PARTIALLY_UNLOADED · IN_REVIEW → IN_REVIEW · IN_TRUCK → IN_TRUCK | Movimiento entre ubicaciones del mismo estado (sectores, scanner↔balanza, plazoleta) | `MOVE` | Independencia estado/ubicación (§4.4.2) |
| Cualquier estado → DELETED | Soft delete (ADMIN; BR-012) | soft delete | BR-012 (interpretación; ver pendientes) |
| DELETED → estado previo | Restauración (ADMIN; BR-012) | `RESTORE` | BR-012 |
| Estado A → estado previo | Reversión de un movimiento (ADMIN) | `REVERSION` (reversión del último movimiento reversible) | BR-012, §7 |

Reglas de ejecución:
- `fromStatus` se lee con `FOR UPDATE`/lock del registro actual; el cliente NO informa `fromStatus` (no confiable). `toStatus` + `reason` + `observation` vienen del DTO.
- Toda transición de la tabla requiere observación no vacía (BR-006/007) y registra movimiento + auditoría (`STATUS_CHANGE`/`MOVE`).
- `IN_TRANSIT` NO es seleccionable por el usuario en v1 (ver 4.4.2).
- La validación de la transición ocurre dentro de la misma transacción que la aplica (consistencia bajo concurrencia).

#### 4.4.2 IN_TRANSIT (transitorio)

MASTER-SPEC §7: "`IN_TRANSIT` es transitorio entre ubicaciones". En v1 los movimientos son atómicos (una sola transacción, BACKEND-ARCHITECTURE §5.5): no existe un estado intermedio persistido entre origen y destino. Interpretación W5: `IN_TRANSIT` permanece en el enum (canónico §4.3) y describe el cargo durante el movimiento, pero **no es un `toStatus` válido para acciones de usuario** en v1; el registro `Movement` con `fromStatus`/`toStatus` es la evidencia de la transición. Si el negocio requiere movimientos no atómicos (origen → IN_TRANSIT → destino con pickup separado), se documenta como DECISIÓN PENDIENTE.

#### 4.4.3 Transiciones confirmadas (OQ-029 → BR-045, 2026-09-23)

| Transición | Motivo operativo | Estado |
| --- | --- | --- |
| STORED → REZAGO (sin pasar por IN_REVIEW) | Carga almacenada con permanencia excesiva; BR-014 no exige pasar por Scanner | Confirmada (OQ-029) |
| PARTIALLY_UNLOADED → REZAGO | Ídem | Confirmada (OQ-029) |
| REZAGO → STORED | Carga revisada y reintegrada al depósito | Confirmada (OQ-029) |
| REZAGO → IN_TRUCK / REZAGO → EXITED | Retiro/egreso desde rezago | Confirmada (OQ-029; egreso BR-043) |
| SECUESTRO → STORED (liberación) · SECUESTRO → EXITED | Fin de medida / retiro | Confirmada (OQ-029; egreso BR-043) |
| EXITED desde cualquier estado operativo | Egreso sin pasar por IN_REVIEW | Confirmada (OQ-029, BR-043) |
| PARTIALLY_UNLOADED → IN_REVIEW | Revisión de carga parcialmente descargada | Confirmada (OQ-029) |
| Saltos directos entre estados NO adyacentes (ej. IN_TRUCK → IN_REVIEW) | — | PROHIBIDO en v1 (rechazo `INVALID_TRANSITION` 409; BR-045) |

> **Transiciones confirmadas (OQ-029, 2026-09-23 → BR-045)**: la matriz efectiva es §4.4.1 + §4.4.3; toda transición fuera de ellas responde `409 INVALID_TRANSITION` con `details` indicando la transición intentada.

### 4.5 Validación de capacidad (BR-005, BR-033..BR-036 — modelo M:N, secciones 62-70)

Modelo (MASTER-SPEC §4.1, v0.2 + v0.3): `Location.capacity` (decimal) + `capacityUnit` (`QuantityUnit`) + `occupiedCapacity`/`availableCapacity` **derivados** = Σ de segmentos `CargoLocation` ACTIVE en unidad compatible de la ubicación (BR-033), recalculados en transacción, nunca editables manualmente. Flag administrativo `allowOverOccupation` (bool) para sobreocupación (BR-036). `Cargo.totalQuantity`/`totalUnit` (total de la carga para validar distribución — BR-034; **obligatorios antes de cualquier distribución parcial** — BR-042). Unidad efectiva de la ubicación (BR-041): override `capacityUnit` si se declaró, o default por LocationType.

Regla v1 (unidad compatible o PERCENT; conversión NO soportada — OQ-044):

| `capacityUnit` de la ubicación | Cálculo de `occupiedCapacity` | Regla de validación del segmento/movimiento |
| --- | --- | --- |
| `UNITS` / `PALLETS` / `TONS` / `CUBIC_METERS` / `AREA` | Σ `quantity` de `CargoLocation` ACTIVE con `quantityUnit` = `capacityUnit` | `occupiedCapacity + Δ <= capacity` (BR-036); unidad distinta → `UNIT_INCOMPATIBLE` / 422 (BR-035) |
| `PERCENT` | Σ de porcentajes de segmentos ACTIVOS (relativo al total de la ubicación) | `occupiedCapacity + Δ <= capacity`; `100` = lleno |
| `UNLIMITED` (CapacityType conservado, MASTER-SPEC §4.3) | Sin cómputo | Sin validación (capacity ignorado) |

Reglas de implementación:
- La validación corre DENTRO de `prisma.$transaction` con `pg_advisory_xact_lock(hash(locationId))` y revalidación tras el lock; recalcular `occupiedCapacity` de origen (−Δ) y destino (+Δ) en la MISMA transacción; divergencia = bug crítico (tests de integridad W8).
- **Sobreocupación (BR-036 — OQ-043 resuelta 2026-09-24, IMPLEMENTADA en FASE 5)**: la comparación es `ocupada + Δ <= techo`, donde el **techo** depende del flag administrativo por ubicación (`allowOverOccupation`, gobernado por ADMIN vía `PATCH /locations/:id`, auditado `CAPACITY_CHANGE`):
  - `allowOverOccupation = false` → techo = `capacity` declarada; superarla → `CAPACITY_EXCEEDED` / 409 con `details.rule: 'BR-005'` (comportamiento previo, sin cambios).
  - `allowOverOccupation = true` → techo = `capacity × (1 + overOccupationLimitPercent/100)`, con **default +10%** (BR-036 ampliada). La escritura se **acepta** mientras no exceda ese techo; al excederlo → `CAPACITY_EXCEEDED` / 409 con `details.rule: 'BR-036'` y `details` nombrando el **techo real** (`overOccupation: true`, `ceiling`) — no la capacidad declarada, que es el dato del registro.
  - `capacity = 0` = **UNBOUNDED**: sin techo, sin validación (sin cambios).
  - Toda escritura **aceptada que queda por encima de la capacidad declarada** (aunque por debajo del techo) se registra en **auditoría** como una fila `CAPACITY_CHANGE` de tipo excepción, sobre la **ubicación** como entidad — no sobre la carga — con `metadata.overOccupation: true` (AUDIT.md §5.1). Sin esa fila, la excepción administrativa no es trazable.
  - El flag lo habilita **solo ADMIN** (`location.manage`, BR-011); la distribución que agota el margen la ejecuta un **OPERATOR** autorizado (política de flag persistente por ubicación — OQ-043 → BR-036 ampliada). El alta/ajuste mantiene la **observación obligatoria** (BR-006) en todos los casos.
  - Alcance de aplicación: la verificación es **compartida por todos los caminos de escritura de segmentos** — movimientos (total/parcial), alta/ajuste de distribución y **alta directa a sector** (`POST /cargos` con `locationId`, §4.4.1) — porque todos ellos escriben ocupación.
- **Unidades incompatibles**: rechazo con `UNIT_INCOMPATIBLE` / 422 (BR-035) con `details` indicando unidad del segmento vs unidad efectiva de la ubicación. Conversión entre unidades (m³↔m², tons↔pallets) NO se implementa en v1 — **OQ-044**.
- **Unidad efectiva por ubicación (BR-041, OQ-041 resuelta)**: `effectiveUnit(location) = location.capacityUnit` (override explícito, solo ADMIN) **o** el **default por LocationType** — SECTOR → `AREA`, PLAZOLETA/SCANNER/BALANZA → `UNITS`, otros → configurable (tabla de configuración, gobernanza ADMIN, auditado `CAPACITY_CHANGE`). El service centraliza esta resolución (`resolveEffectiveUnit`; ver §4.7) para que la validación de capacidad y la agregación de ocupación usen siempre la misma unidad; en el alta de ubicación sin override, el DTO no exige `capacityUnit` y el default se aplica (DTOs.md §4.6). Módulo dueño de la tabla de defaults: pendiente de definir (DTOs.md §10).
- `PATCH /locations/:id` con `capacity` menor al `occupiedCapacity` actual: permitido con advertencia (no se "expulsa" carga); reducción operativa se audita `CAPACITY_CHANGE` (ADR-010); si se prefiere bloquear, DECISIÓN PENDIENTE.

Reglas heredadas (modelo previo, a migrar): la tabla anterior de `capacityUsed` por regla UNITS/PALLETS/… queda reemplazada por la de arriba; `settings.capacity.defaultUnit` queda bajo gobernanza de **BR-041** (defaults por LocationType; módulo dueño pendiente — DTOs.md §10).

### 4.6 Observación obligatoria (BR-006/007)

- **Qué exige**: movimiento de ubicación (BR-006), cambio de estado (BR-007), y por extensión toda transición de la máquina de estados, reversiones y restauración (BR-012: "toda reversión genera historial y auditoría"; DATABASE.md: toda reversión requiere observación).
- **Cadena de validación triple**:
  1. DTO: `MoveCargoDto.observation` `@IsString @IsNotEmpty @MaxLength(2000)` → `400 VALIDATION_ERROR`;
  2. Service: revalidación con `trim()` (la observación no puede ser solo espacios) → `422 BUSINESS_RULE_VIOLATION` con `details.rule: 'BR-006' | 'BR-007'`;
  3. DB: `observations.text NOT NULL` + `CHECK (length(trim(text)) > 0)` y `movements.observation_id NOT NULL UNIQUE` (1:1, DATABASE.md §5.3) — integridad a nivel de datos, no solo de servicio.
- Notas de carga SIN movimiento (`POST /cargos/:id/notes`): `Observation.cargoId`, texto no vacío, sin relación 1:1 (BR-006/007 no aplican).
- La observación pertenece a la misma transacción que el movimiento (nunca se inserta después: rompería BR-008 si el movimiento falla).

### 4.7 Transacciones atómicas (movimiento + observación + auditoría)

Flujo dentro de UNA `prisma.$transaction` (BACKEND-ARCHITECTURE §5.5):

```typescript
// src/modules/movements/services/movement.service.ts — ilustrativo (FASE 0)
async moveCargo(dto: MoveCargoDto, actor: AuthUser): Promise<Movement> {
  return this.prisma.$transaction(async (tx) => {
    const cargo  = await this.cargoRepo.lockForUpdate(tx, dto.cargoId);     // BR-003
    if (isPartialMove(dto)) {
      this.assertTotalDeclaredForPartial(cargo);  // BR-042 → CargoTotalRequiredException (422)
    }
    const effectiveUnit = await this.resolveEffectiveUnit(tx, dto.toLocationId); // BR-041 (override ?? default por LocationType)
    const target = await this.locationRepo.lockForUpdate(tx, dto.toLocationId); // BR-004 + advisory lock
    this.stateMachineValidator.assertTransition(cargo.status, dto.toStatus);   // BR-016
    this.observationValidator.assertNotEmpty(dto.observation);                 // BR-006/007 (revalidación)
    this.capacityValidator.assertFits(target, cargo, effectiveUnit, tx);       // BR-005/036 (CAPACITY_EXCEEDED)
    // 1) Insert Movement + Observation (1:1)
    // 2) Update Cargo (truckId, status, lastMovedById) — el residual "en camión" NO se persiste (BR-042)
    // 3) Recalcular occupiedCapacity derivado de origen/destino (Σ segmentos activos en unidad compatible)
    // 4) AuditLog (action: MOVE, previous/new values, metadata.requestId)
  }, { timeout: 10_000 });
}

// BR-041: unidad efectiva = override de la ubicación ?? default por LocationType
private async resolveEffectiveUnit(tx: Prisma.TransactionClient, locationId: string): Promise<QuantityUnit> {
  const location = await tx.location.findUniqueOrThrow({ where: { id: locationId } });
  return location.capacityUnit ?? (await this.settingsService.getLocationTypeDefaultUnit(tx, location.type));
}
```

Garantías:
- **Todo o nada**: si cualquier validación o escritura falla, `rollback` integral — no queda "cargo movido sin observación", "capacidad inconsistente" ni "auditoría faltante" (criterio QA crítico, BACKEND-ARCHITECTURE §6 #4).
- **Locking**: `FOR UPDATE` sobre filas `cargo` y `location` (origen y destino si cambian capacidad) + `pg_advisory_xact_lock(hash(locationId))` para serializar updates de capacidad (evita deadlocks y carreras).
- **Timeout**: 10 s por transacción; excedido → `504 DB_TIMEOUT` (ERROR-HANDLING §4.5). Sin transacciones de larga duración; lotes ≤ 500 filas.
- **Auditoría dentro de la transacción** (BR-013/ADR-010): el desacople asíncrono de auditoría rompería la garantía "toda mutación queda auditada" — no se adopta en v1.
- **Movimientos parciales y segmentos (BR-037/039)**: la transacción del movimiento actualiza el `CargoLocation` origen (−Δ, o egreso si llega a 0) y crea/actualiza el destino (+Δ) junto con `Movement` + `Observation`; la revalidación de suma (BR-034) y capacidad (BR-036) ocurre dentro de la misma transacción con locks. El egreso de segmento (`DELETE /cargos/:id/locations/:cargoLocationId`) usa la misma plantilla.
- **Idempotencia**: cabecera `Idempotency-Key` opcional (API-CONVENTIONS §4.8) evita duplicados en retries de red.
- Reversión: misma plantilla transaccional con `kind=REVERSION`, validando que el movimiento objetivo sea reversible (no REVERSION sobre REVERSION) y conservando el historial original (`reversionOfId`, ADR-011).

## 5. Criterios de aceptación

1. Todo DTO valida shape con las reglas de `DTOs.md` (whitelist estricta, enums canónicos, mensajes es-neutral, códigos estables).
2. Cada BR-001..BR-020 tiene una regla concreta implementada en la capa indicada §4.3 y devuelve el código de error asignado (verificable con tests por BR en W8).
3. La matriz de transiciones efectiva es la de §4.4.1; toda transición fuera devuelve `409 INVALID_TRANSITION`.
4. Un movimiento NUNCA deja consistencia parcial (test de fallo a mitad de transacción, BACKEND-ARCHITECTURE §6 #4).
5. Observación obligatoria imposible de eludir en 3 capas (DTO, service, DB) — incluye espacios en blanco.
6. La validación de capacidad corre bajo advisory lock y recalcula `occupiedCapacity` de origen y destino (Σ segmentos activos en unidad compatible) en la misma transacción.

## 6. Archivos involucrados

- `docs/backend/VALIDATION.md` (este), `DTOs.md`, `API.md`, `ERROR-HANDLING.md`, `BACKEND-ARCHITECTURE.md` (§5.1/§5.2/§5.5), `MODULES.md`
- `docs/MASTER-SPEC.md` (§4.3 enums, §6 BR, §7 máquina de estados, §10), `docs/OPEN-QUESTIONS.md` (OQ-001/002/004/008/009/014/015)
- `docs/architecture/DATABASE.md` (constraints, `observation_id`, `occupiedCapacity`), `docs/architecture/ADR/ADR-003`, ADR-008, ADR-009, ADR-011

## 7. Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Matriz de transiciones incompleta (saltos no contemplados) bloquea operación real | §4.4.3 lista las transiciones y las centraliza en OQ-029 (resuelta → BR-045); el rechazo es explícito (`INVALID_TRANSITION` con detalle), no silencioso |
| Cómputo de ocupación derivada (OQ-044) cambia tras implementar | Validación aislada en `CapacityValidator` + regla por `settings` (defaults BR-041); el cambio no toca la transacción (MODULES.md §10) |
| Cargas sin `quantity`/`unit` o unidades mixtas en una ubicación | Sin total declarado, la primera distribución parcial se rechaza con `CARGO_TOTAL_REQUIRED` (BR-042); unidad efectiva por ubicación sigue BR-041; mismatch de unidades → 422 hasta OQ-044 |
| DTOs que "filtran" reglas BR por comodidad | R-01 + code review + tests por BR |
| Concurrencia de movimientos sobre la misma ubicación | Advisory locks + revalidación en transacción + tests de carrera (W8) |
| `IN_TRANSIT` malinterpretado como estado persistido | Documentado §4.4.2; pendiente de confirmación |

## 8. DECISIÓN PENDIENTE

> Las OQ referenciadas quedaron **resueltas en FASE 0** (MASTER-SPEC v0.5 / OPEN-QUESTIONS, 2026-09-23/24): las filas tachadas con `→ RESUELTA` ya tienen decisión canónica; las marcadas **🔶** son **residuales locales** sin resolver (decisión de implementación/equipo, no de negocio).

| # | Pregunta | Impacto | Referencia |
| --- | --- | --- | --- |
| 1 | ~~Matriz exacta de transiciones: ¿se confirman las propuestas §4.4.3 (REZAGO/SECUESTRO/EXITED desde más estados, retorno de REZAGO, saltos)?~~ → **RESUELTA (OQ-029 → BR-045, 2026-09-23)**: todas las propuestas §4.4.3 confirmadas; saltos NO adyacentes prohibidos (`INVALID_TRANSITION` 409) | §4.4 (máquina de estados) | OQ-029 (resuelta 2026-09-23) |
| 2 | ¿`IN_TRANSIT` como estado seleccionable o solo transitorio no persistido? | §4.4.2 | 🔶 Residual local (anexo de OQ-029, ya resuelta la matriz) |
| 3 | ~~¿Permisos específicos para `TO_REZAGO` y `TO_SECUESTRO` (¿SECUESTRO solo ADMIN? ¿REZAGO OPERATOR+ con observación?)~~ → **RESUELTA (OQ-030 → BR-046, 2026-09-23)**: `TO_REZAGO` → ADMIN **y** OPERATOR (`cargo.to_rezago`); `TO_SECUESTRO` → **solo ADMIN** (`cargo.to_secuestro`); ambas con observación obligatoria | §4.4, BR-011 | OQ-030 (resuelta 2026-09-23) |
| 4 | ~~¿Unidad de capacidad por defecto por `LocationType` y conversión entre unidades para el cómputo de ocupación?~~ → **RESUELTA (OQ-041 → BR-041, y OQ-044 → BR-048, 2026-09-23/24)**: SECTOR → AREA, PLAZOLETA/SCANNER/BALANZA → UNITS, otros → configurable, override por ubicación; **conversión entre unidades NO soportada en v1** (unidades compatibles o `PERCENT`; `INCOMPATIBLE_UNIT` 422) | §4.5 (BR-005) | OQ-041 / OQ-044 (resueltas) |
| 5 | ¿`PATCH /locations/:id` con `capacity` menor a `occupiedCapacity` se bloquea o se permite con auditoría? | §4.5 | 🔶 Residual local W5 (anexo de OQ-041, ya resuelta la unidad) |
| 6 | ~~Reglas de unicidad/normalización de `cargo.code` (regex, case, trim)~~ → **RESUELTA (OQ-001 → BR-002, 2026-09-23)**: regex `^[A-Z0-9][A-Z0-9./-]{2,31}$`, normalizado a mayúsculas, único case-insensitive, longitud 3–32 | BR-002 | OQ-001 (resuelta 2026-09-23) |
| 7 | ¿Carga parcial: opción A (unidad + quantity) u opción B (CargoItem)? | Campos `quantity`/`quantityMoved` | 🔶 Residual local (OQ-002 resuelta: sin CargoItem en v1 — MASTER-SPEC §62-70; resto de semántica de split) |
| 8 | ~~¿Egreso (EXITED) definido con alta de salida y remito?~~ → **RESUELTA (OQ-004 → BR-043, 2026-09-23)**: egreso completo: movimiento `EXIT` con observación obligatoria, remito/documentación opcionales (`exitDocumentRef?`), auditoría; `EXITED` terminal | Transición EXITED y endpoints | OQ-004 (resuelta 2026-09-23) |
| 9 | ~~¿Validación geométrica de elementos del plano (superposición) en PATCH maps?~~ → **RESUELTA (OQ-015, 2026-09-24)**: mapa es **vista estática** en v1 (lectura + selección + hover); **sin editor visual** ni validación geométrica de superposición en v1 (`MAP_ELEMENT_CONFLICT` queda como previsión para PATCH maps futuros) | `MAP_ELEMENT_CONFLICT` | OQ-015 (resuelta 2026-09-24) |
| 10 | ~~Derechos de estado inicial en el alta: DTOs.md §4.4 fija REGISTERED/IN_TRUCK pero §5.1 ejemplifica STORED directo; ¿se confirman los 3?~~ → **RESUELTA e IMPLEMENTADA (FASE 5, BR-016 + BR-045)**: se confirman los **tres** estados iniciales y los tres los **deriva el service**, nunca el DTO — `STORED` con `locationId` (**alta directa a sector**), `IN_TRUCK` con `truckId`, `REGISTERED` en cualquier otro caso. El alta directa es `POST /cargos` con `locationId` opcional: crea la carga `STORED` + un único `CargoLocation` ACTIVE y **sin** fila `Movement` (API.md §5.2, DTOs.md §4.4/§5.1); `locationId` excluye `truckId` y exige `totalQuantity`/`totalUnit` (BR-042). La arista `REGISTERED → STORED` de §4.4.1 conserva `kinds: []` a propósito — un ALTA no es un movimiento, así que `move()` la sigue rechazando y el intake nunca la recorre | Alta de cargas · transición `REGISTERED → STORED` | BR-016/BR-045 · API.md §5.2 · DTOs.md §4.4 |
| 11 | ~~Unidad de capacidad por defecto por `LocationType` (¿Sector m²? ¿Plazoleta? ¿Scanner?) y gobernanza (por ubicación/tipo/tabla)~~ → **RESUELTA** (OQ-041 → **BR-041**): SECTOR → AREA, PLAZOLETA/SCANNER/BALANZA → UNITS, otros → configurable; override por ubicación; gobernanza ADMIN, auditado. Queda por definir el módulo dueño de la tabla de defaults (ver DTOs.md §10) | §4.5 (BR-035/036) | OQ-041 (resuelta 2026-09-23) |
| 12 | ~~¿El camión se modela como Location (LocationType CAMION) o el "en camión" es residual derivado = totalQuantity − Σ CargoLocation activos?~~ → **RESUELTA** (OQ-042 → **BR-042**): el camión NO es Location; residual derivado y expuesto como `inTruckAmount`/`inTruckUnit`; `CARGO_TOTAL_REQUIRED` 422 sin total declarado | BR-038, §4.5 | OQ-042 (resuelta 2026-09-23) |
| 13 | ~~Regla administrativa de sobreocupación (BR-036): rol autorizante (¿solo ADMIN?), límite de % extra, observación y auditoría exigidas~~ → **RESUELTA (OQ-043 → BR-036 ampliada, 2026-09-24)**: flag `allowOverOccupation` por ubicación + límite de % extra configurable (**default +10%**) + autorización **solo ADMIN** + observación obligatoria + auditoría (CAPACITY_CHANGE, tipo excepción) | BR-036, §4.5 | OQ-043 (resuelta 2026-09-24) |
| 14 | ~~¿Conversión de unidades entre cargas/ubicaciones en v1? Recomendado: NO — unidades compatibles o PERCENT~~ → **RESUELTA (OQ-044 → BR-048, 2026-09-24)**: **NO se convierten unidades en v1** — unidades compatibles (misma unidad base) o `PERCENT`; conversión (m³↔m², ton↔pallets) requiere altura/densidad → fuera de v1 (`INCOMPATIBLE_UNIT` 422) | §4.3.1 BR-035, §4.5 | OQ-044 (resuelta 2026-09-24) |
| 15 | ~~Semántica de `percentage` en CargoLocation: ¿informativo/derivado o autoritativo? ¿Coexiste con quantity o es excluyente?~~ → **RESUELTA (OQ-045 → BR-049, 2026-09-24)**: `quantity`/`quantityUnit` son la **fuente de verdad**; `percentage` es **derivado de UI** (quantity/totalQuantity) e informativo, y solo se acepta como input cuando la unidad es **PERCENT** (donde es la cantidad misma); no coexisten dos fuentes | BR-032..040, §4.3.1 | OQ-045 (resuelta 2026-09-24) |