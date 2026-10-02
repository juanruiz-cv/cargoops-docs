# API.md — Contratos REST del backend de CargoOps

> Grupo W5 — Backend. Contratos completos de la API REST bajo `/api/v1` (MASTER-SPEC §10). Convenciones de formato: `API-CONVENTIONS.md`. DTOs: `DTOs.md`. Errores: `ERROR-HANDLING.md`.

---

## 1. Objetivo

Definir el contrato REST completo de los endpoints de CargoOps (los listados en MASTER-SPEC §10 más los derivados de los módulos §11.3): método, path, query/body, respuestas 200/201, errores posibles (400/401/403/404/409/422) y ejemplos JSON. Documento de referencia para implementación y para QA (W8).

## 2. Contexto

Base URL: `https://<host>/api/v1`. Formato JSON. Success envelope `{ data }` (+ `meta` en paginados); error envelope `{ error: { code, message, details?, requestId } }` (MASTER-SPEC §10). Autenticación: `Authorization: Bearer <accessToken>` salvo `auth/login` y `auth/refresh`. Paginación: `?page=&limit=` (+ `sort`, `filter`) — ver `API-CONVENTIONS.md`.

Convención de errores por endpoint: se listan los HTTP posibles con sus códigos de aplicación (catálogo en `ERROR-HANDLING.md` §4.9). `422` indica validación semántica de negocio (ej. BR-006 observación vacía, BR-035 unidades incompatibles → `UNIT_INCOMPATIBLE`, BR-042 total declarado faltante → `CARGO_TOTAL_REQUIRED`), `409` conflicto de estado (ej. BR-004/005/034/036 → `LOCATION_INACTIVE`, `CAPACITY_EXCEEDED`, `DISTRIBUTION_EXCEEDS_TOTAL`), `400` shape inválido, `401/403` autenticación/autorización, `404` recurso inexistente (BR-003; incluye `CARGO_LOCATION_NOT_FOUND`).

## 3. Errores comunes a todos los endpoints

| HTTP | Código de aplicación | Cuándo |
| --- | --- | --- |
| 400 | `VALIDATION_ERROR` | Body/query malformado, campos no permitidos (whitelist), tipos incorrectos |
| 401 | `UNAUTHORIZED` | Token ausente, expirado o inválido |
| 403 | `FORBIDDEN` | Token válido pero sin permiso (BR-009/010/011) |
| 404 | `NOT_FOUND` | Recurso inexistente (sobre entidad correspondiente; incluye `CARGO_LOCATION_NOT_FOUND`) |
| 409 | `CONFLICT` | Conflicto de estado/unicidad (capacidad `CAPACITY_EXCEEDED` BR-005/036, suma distribuida `DISTRIBUTION_EXCEEDS_TOTAL` BR-034, inactiva, transición, código duplicado) |
| 422 | `BUSINESS_RULE_VIOLATION` / `UNIT_INCOMPATIBLE` / `CARGO_TOTAL_REQUIRED` | Regla de negocio incumplida con detail `{ rule: 'BR-006', ... }`; unidades incompatibles sin conversión (BR-035, OQ-044); **distribución parcial sin `totalQuantity`/`totalUnit` declarados (BR-042 → `CARGO_TOTAL_REQUIRED`)** |
| 429 | `RATE_LIMITED` | Rate limit superado (protección login/brute force — ver SECURITY W2) |
| 500/503/504 | `INTERNAL_ERROR` / `SERVICE_UNAVAILABLE` / `DB_TIMEOUT` | Fallo no tipado / dependencia caída / timeout |

---

## 4. Auth

Transporte de tokens (ADR-008; SECURITY.md S1 resuelta 2026-09-25 → cookie):
- **Access token** (15 min): header `Authorization: Bearer <accessToken>`.
- **Refresh token** (7 días, rotativo): cookie `refresh_token` con `HttpOnly; SameSite=Strict; Path=/api/v1/auth; Max-Age=604800` (`Secure` solo en producción). El refresh **no viaja en el body JSON ni en localStorage** del frontend. Reuso de un token rotado → se revoca TODA la sesión del usuario (`REFRESH_TOKEN_REVOKED`).

### 4.1 POST /auth/login
- **Body** (LoginDto): `{ username: string, password: string }` (username O email).
- **200 OK**: `Set-Cookie refresh_token` + body:

```json
{ "data": { "accessToken": "eyJ...", "expiresIn": 900, "tokenType": "Bearer",
            "user": { "id": "uuid", "username": "jperez", "email": "jperez@cargoops.local", "name": "Juan Pérez", "active": true, "roles": ["OPERATOR"], "permissions": ["cargo.read", "cargo.create"] } } }
```

- `roles`/`permissions` = snapshot del token (unión de bundles; AUTHORIZATION.md §5).
- **Errores**: 400 `VALIDATION_ERROR`; 401 `INVALID_CREDENTIALS` (usuario o contraseña incorrectos; mensaje genérico por seguridad); 403 `USER_INACTIVE` (usuario desactivado); 429 `RATE_LIMITED`.

### 4.2 POST /auth/refresh
- **Sin body**: el refresh token se lee de la cookie `refresh_token`. Rota (revoca el usado) y emite nuevo par + cookie nueva.
- **200 OK**: mismo shape que login (sin refreshToken en body).
- **Errores**: 401 `INVALID_REFRESH_TOKEN` (ausente/desconocido/expirado); 401 `REFRESH_TOKEN_REVOKED` (reuso → sesión revocada); 403 `USER_INACTIVE`; 429 `RATE_LIMITED`.

### 4.3 POST /auth/logout
- **Sin body**: lee la cookie `refresh_token`, revoca la sesión y limpia la cookie.
- **200 OK**: `{ "data": { "success": true, "revoked": true|false } }` (idempotente: token ya revocado → 200 con `revoked: false`).
- **Errores**: 401 `INVALID_REFRESH_TOKEN` (ausente o desconocido).

---

## 5. Cargos (núcleo del dominio)

### 5.1 GET /cargos
- **Query**: `page=1&limit=25&sort=-entryDate&filter=status:STORED,locationId:<uuid>` + filtros específicos (`code`, `search`, `truckId`, `createdById`, `alert=stale|none`, `from`/`to`) — ver DTOs §4.11.
- **200 OK**:

```json
{ "data": { "items": [
    { "id": "uuid", "code": "029TERRA26", "name": "Terrazzo 26", "status": "STORED",
      "entryDate": "2026-08-01T09:00:00Z",
      "totalQuantity": 120, "totalUnit": "PALLETS",
      "inTruckAmount": 0, "inTruckUnit": "PALLETS", "openAlerts": 1,
      "createdAt": "2026-08-01T09:05:00Z" } ],
  "meta": { "page": 1, "limit": 25, "totalItems": 431, "totalPages": 18, "hasNext": true } } }
```

- `inTruckAmount`/`inTruckUnit` (BR-042) son **derivados**: residual en camión = `totalQuantity − Σ segmentos activos` (unidades compatibles). En este ejemplo la carga está `STORED` completa → residual `0`. `inTruckUnit` es la unidad del total (`totalUnit`); si la carga no declara total ni tiene `truckId`, ambos van `null` (no `0`): sin total no hay residual del que derivar — el «en camión» es un valor **derivado**, no un default (OQ-042 → BR-042, §13 fila 6).

- **Errores**: 400 (filtros inválidos); 401; 403 (viewer sin permiso de exportación NO aplica aquí; lectura permitida a los 3 roles).

### 5.2 POST /cargos
- **Body** (CreateCargoDto, DTOs §4.4). Permiso `cargo.create` (OPERATOR+). `totalQuantity`/`totalUnit` son **OPCIONALES en el alta simple** (BR-042): la carga puede registrarse sin total declarado, pero el total se vuelve **obligatorio antes de la primera distribución parcial** (`CARGO_TOTAL_REQUIRED` 422). También pueden declararse después vía `PATCH /cargos/:id` (§5.4).
- **201 Created**: `{ "data": { ...CargoResponseDto } }` (ejemplos en DTOs §5.1).

- **Alta directa a sector (FASE 5 — `locationId` opcional)**: el body admite un `locationId` **opcional** que hace el ingreso **directo a un sector**, sin pasar por camión ni por distribución posterior. La carga se persiste `STORED` con **un único segmento `CargoLocation` ACTIVE** (cantidad = `totalQuantity`, `percentage` derivado = 100 salvo unidad `PERCENT`) y **SIN fila `Movement`**: el estado inicial es parte de la fila `Cargo`, no una transición, y BR-008 (historial reconstruible) queda intacto. El alta directa **no** escribe columnas de ubicación en `cargo` (BR-032): la distribución sigue siendo M:N y el segmento inicial se lee en `GET /cargos/:id/locations` (§5.9); la respuesta `CargoResponseDto` **no** lleva `locationId`.
  - **Tres reglas del body**: (a) `locationId` es **excluyente con `truckId`** (un ingreso es directo a sector o vía camión); (b) con `locationId`, `totalQuantity`/`totalUnit` pasan a ser **obligatorios** (BR-042) porque son la cantidad del segmento inicial; (c) sin `locationId`, el comportamiento es el previo e intacto (`REGISTERED`, o `IN_TRUCK` con `truckId`).
  - **Validaciones de la ubicación de alta**, en orden: existencia y no soft-deleted (BR-003) → `ACTIVE` (BR-004) → tipo que admite el estado inicial (BR-044) → unidad compatible (BR-035) → capacidad para el total declarado (BR-005/036, con el techo de sobreocupación de §4.5 de VALIDATION.md).
- **Errores**: 400 `VALIDATION_ERROR`; 401; 403 `FORBIDDEN` (BR-010); 409 `CARGO_CODE_DUPLICATE` (BR-002, traducción P2002); 404 `LOCATION_NOT_FOUND` / `TRUCK_NOT_FOUND` (si `locationId`/`truckId` apuntan a inexistente o soft-deleted); 422 `BUSINESS_RULE_VIOLATION` con `details.exclusiveFields: ['locationId','truckId']` (**solo `POST /cargos`**: intake directo a sector y camión a la vez); 422 `CARGO_TOTAL_REQUIRED` (BR-042: `locationId` sin `totalQuantity`/`totalUnit`); 422 `UNIT_INCOMPATIBLE` (BR-035: `totalUnit` incompatible con la unidad efectiva de la ubicación); 422 si la ubicación provista no admite el estado inicial (BR-044: `STORED` solo admite `GALPON`/`SECTOR`, luego una `PLAZOLETA` se rechaza; `details: { rule: 'BR-044', locationId, locationType, allowedLocationTypes }`); 409 `LOCATION_INACTIVE` (BR-004: ubicación no `ACTIVE`); 409 `CAPACITY_EXCEEDED` (BR-005/036: la ocupación + el total declarado excede la capacidad, o el techo de sobreocupación con `allowOverOccupation` activo — VALIDATION.md §4.5).

> **Nota de_endpoint — el mismo rechazo responde distinto según el endpoint**: una ubicación cuyo tipo no admite el estado pedido responde **422** en `POST /cargos` (alta directa, contrato de este §5.2) y **409 `INVALID_TRANSITION`** en `POST /cargos/:id/movements` (§5.6, convención canónica ID-002). Es una divergencia deliberada por contrato de endpoint: el predicado es el mismo (`STATUS_LOCATION_TYPES` de la máquina de estados), solo cambia la forma HTTP según lo que cada § especifica.

### 5.3 GET /cargos/:id
- **200 OK**: `{ "data": { ...CargoResponseDto, movementsCount: 12, observations: [ ... ] } }` — el detalle de distribución (segmentos M:N) se consulta en `GET /cargos/:id/locations` (§5.9); `CargoResponseDto` NO lleva `locationId` único (BR-032) e incluye el residual derivado `inTruckAmount`/`inTruckUnit` (BR-042).

```json
{ "data": { "id": "uuid-c", "code": "036TERRA26", "name": "Terrazzo 26 — Lote C", "status": "PARTIALLY_UNLOADED",
    "truckId": "uuid-t", "entryDate": "2026-09-20T08:00:00Z",
    "totalQuantity": 100, "totalUnit": "UNITS",
    "inTruckAmount": 40, "inTruckUnit": "UNITS",
    "movementsCount": 3, "observations": [], "createdAt": "2026-09-20T08:05:00Z" } }
```

Nota: el camión NO es una Location (BR-042); `inTruckAmount = totalQuantity − Σ segmentos ACTIVE` (40 = 100 − 60) y la fila "En camión" de la UI es este residual, nunca un nodo del plano.

- **Errores**: 401; 404 `CARGO_NOT_FOUND` (BR-003 también aplica a consulta: carga inexistente o soft-deleted).

### 5.4 PATCH /cargos/:id
- **Body** (UpdateCargoDto — parcial). Permiso `cargo.update`. **SÍ permite fijar `totalQuantity`/`totalUnit`** (declaración del total de la carga — BR-042; ambos se exigen juntos; editar el total con segmentos ya distribuidos se valida contra la suma vigente, BR-034). NO permite `truckId` ni campos que impliquen movimiento/distribución: eso va por movements o por los endpoints de distribución §5.9-5.12.
- **200 OK**: `{ "data": { ...CargoResponseDto } }`
- **Errores**: 400; 401; 403; 404 `CARGO_NOT_FOUND`; 409 `CARGO_CODE_DUPLICATE` (si se edita code), `INVALID_TRANSITION` (si el cambio de campos de estado viola la máquina de estados — convención canónica **ID-002**: 409, ver ERROR-HANDLING.md §4.3) y `DISTRIBUTION_EXCEEDS_TOTAL` (BR-034: nuevo total < suma distribuida vigente); 422 `UNIT_INCOMPATIBLE` (BR-035: totalUnit incompatible con segmentos activos).

### 5.5 GET /cargos/:id/movements
- **Query**: `page/limit/sort` + `kind`, `userId`, `from`, `to` (MovementListQueryDto).
- **200 OK**:

```json
{ "data": { "items": [
    { "id": "uuid-m1", "cargoId": "uuid", "kind": "UNLOAD", "fromLocationId": "uuid-plazoleta",
      "toLocationId": "uuid-s4", "fromStatus": "IN_TRUCK", "toStatus": "STORED",
      "reason": "UNLOAD", "userId": "uuid-u", "movedAt": "2026-09-23T09:20:00Z",
      "observation": { "id": "uuid-o", "text": "Descarga en sector 4.", "userId": "uuid-u" } } ],
  "meta": { "page": 1, "limit": 25, "totalItems": 12, "totalPages": 1, "hasNext": false } } }
```

- **Errores**: 400; 401; 404 `CARGO_NOT_FOUND`.

### 5.6 POST /cargos/:id/movements
- **Body** (MoveCargoDto, DTOs §4.4 — el ENDPOINT CRÍTICO del dominio). Permiso `cargo.move`. Cabecera opcional `Idempotency-Key` (API-CONVENTIONS §4.8).
- **Movimiento total vs parcial (BR-037/038/042)**: sin `quantity`/`percentage` el movimiento es del 100% del segmento origen. Para movimiento PARCIAL se envía `quantity` + `quantityUnit` (o `percentage` 0-100): el origen descuenta la cantidad y el destino la recibe (se actualiza/crea el `CargoLocation` destino en la misma transacción). Unidades compatibles o `PERCENT` (BR-035); conversión NO soportada en v1 (OQ-044). **Todo movimiento parcial exige la carga con `totalQuantity`/`totalUnit` declarados (BR-042); si faltan → `CARGO_TOTAL_REQUIRED` 422.** El residual "en camión" es derivado `totalQuantity − Σ segmentos activos` (BR-042, OQ-042 resuelta): el camión NO es una Location y el residual nunca se materializa como segmento ni nodo de plano.
- **Unidad efectiva del destino (BR-041)**: la validación de capacidad del destino usa `capacityUnit` de la ubicación si hay override, o el **default por LocationType** (SECTOR → AREA, PLAZOLETA/SCANNER/BALANZA → UNITS, otros → configurable).
- **201 Created**: `{ "data": { ...MovementResponseDto } }` con `observation` embebida y, en parciales, `quantity`/`quantityUnit`/`percentage`; además recalcula la ocupación derivada de origen/destino (BR-033) y audita (BR-008).
- **Errores**: 400 `VALIDATION_ERROR` (observación vacía detectada en DTO); 401; 403 (BR-010 viewer); 404 `CARGO_NOT_FOUND` (BR-003) / `LOCATION_NOT_FOUND` / `CARGO_LOCATION_NOT_FOUND` (segmento origen inexistente, BR-032); **409 `LOCATION_INACTIVE` (BR-004), `CAPACITY_EXCEEDED` (BR-005/036), `DISTRIBUTION_EXCEEDS_TOTAL` (BR-034), `INVALID_TRANSITION` (BR-016 — canónico 409, ver ID-002)**; **422 `BUSINESS_RULE_VIOLATION` (BR-006/007: observación obligatoria — si llegó vacía por otra vía, detalle `{ rule: 'BR-006' }`), `UNIT_INCOMPATIBLE` (BR-035: unidades no compatibles y sin conversión — OQ-044) y `CARGO_TOTAL_REQUIRED` (BR-042: movimiento parcial sin total declarado)**; 409 `DUPLICATE_OPERATION` (Idempotency-Key repetida con body distinto).

### 5.7 POST /cargos/:id/export-pdf
- **Body**: `{}` opcional con `{ includeMovements?: boolean }` (default true). Permiso `cargo.export_pdf` (BR-018: viewer puede exportar autorizado; sin datos no autorizados).
- **202 Accepted** (procesamiento asíncrono si PDF vía job — OQ-005) **o 200 con el PDF** (decisión final según estrategia PDF; se documenta la opción 202 + campo `downloadUrl`):

```json
{ "data": { "exportId": "uuid", "status": "PROCESSING",
            "downloadUrl": "/api/v1/exports/uuid/file" } }
```

- **Errores**: 401; 403 (BR-018); 404 `CARGO_NOT_FOUND`; 409 si ya existe export en curso (idempotencia por exportId).

### 5.8 POST /cargos/:id/notes
- **Body**: `{ text: string (obligatoria, ≤2000), metadata? }` — nota SIN movimiento.
- **201 Created**: `{ "data": { "id": "uuid", "cargoId": "uuid", "text": "...", "userId": "uuid", "createdAt": "..." } }`
- **Errores**: 400; 401; 403; 404 `CARGO_NOT_FOUND`.

### 5.9 GET /cargos/:id/locations
Distribución M:N Cargo↔Location (secciones 62-70, BR-040): todos los segmentos `CargoLocation` de la carga, activos y egresados.
- **Query**: `page/limit/sort` + `filter=status:ACTIVE|EXITED` (CargoLocationStatus). Permiso `cargo.read` (lectura: 3 roles).
- **200 OK**: listado paginado de `DistributionSegmentDto` (DTOs §4.12) con `percentage` informativo (OQ-045):

```json
{ "data": { "items": [
    { "id": "uuid-cl3", "cargoId": "uuid-c", "locationId": "uuid-s3",
      "location": { "id": "uuid-s3", "name": "Sector 3", "code": "S3" },
      "quantity": 20, "quantityUnit": "AREA", "percentage": 36.4,
      "status": "ACTIVE", "enteredAt": "2026-09-21T09:10:00Z", "exitedAt": null },
    { "id": "uuid-cl4", "cargoId": "uuid-c", "locationId": "uuid-s4",
      "location": { "id": "uuid-s4", "name": "Sector 4", "code": "S4" },
      "quantity": 35, "quantityUnit": "AREA", "percentage": 63.6,
      "status": "ACTIVE", "enteredAt": "2026-09-21T09:15:00Z", "exitedAt": null } ],
  "meta": { "page": 1, "limit": 25, "totalItems": 2, "totalPages": 1, "hasNext": false } } }
```

- **Errores**: 400 (filtros); 401; 404 `CARGO_NOT_FOUND`. El historial de movimientos de la carga se consulta en `GET /cargos/:id/movements` (§5.5).

### 5.10 POST /cargos/:id/locations
Alta de un segmento de distribución (carga en una ubicación) + movimiento (BR-039). Permiso `cargo.move` (OPERATOR+). Cabecera opcional `Idempotency-Key` (API-CONVENTIONS §4.8).
- **Body** (CreateDistributionDto, DTOs §4.4.1): `{ locationId, quantity, quantityUnit, percentage?, notes (obligatoria — BR-006/039), metadata? }`.
- **201 Created**: `DistributionSegmentDto` con `status: "ACTIVE"` y `enteredAt` asignado por el service; `Location` header con la URL del segmento.

```json
{ "data": { "id": "uuid-cl4", "cargoId": "uuid-c", "locationId": "uuid-s4",
    "quantity": 35, "quantityUnit": "AREA", "percentage": 63.6,
    "status": "ACTIVE", "enteredAt": "2026-09-21T09:15:00Z", "exitedAt": null } }
```

- **Errores**: 400 `VALIDATION_ERROR` (observación vacía en DTO); 401; 403 (BR-010); 404 `CARGO_NOT_FOUND` (BR-003) / `LOCATION_NOT_FOUND`; **409 `LOCATION_INACTIVE` (BR-004), `CAPACITY_EXCEEDED` (BR-036: sin `allowOverOccupation`), `DISTRIBUTION_EXCEEDS_TOTAL` (BR-034: Σ segmentos > totalQuantity)**, `CONFLICT` (ya existe segmento ACTIVE del par cargo+ubicación — BR-032), `DUPLICATE_OPERATION` (Idempotency-Key repetida con body distinto); **422 `UNIT_INCOMPATIBLE` (BR-035: quantityUnit incompatible con la unidad efectiva de la ubicación — override o default BR-041), `BUSINESS_RULE_VIOLATION` (BR-006/039: observación vacía llegada al service) y `CARGO_TOTAL_REQUIRED` (BR-042: la carga no declara `totalQuantity`/`totalUnit` para poder distribuirla parcialmente)**.

### 5.11 PATCH /cargos/:id/locations/:cargoLocationId
Ajuste de cantidad/porcentaje de un segmento activo + movimiento (BR-039). Permiso `cargo.move`. La observación es obligatoria cuando cambia la cantidad (BR-006/039).
- **Body** (UpdateDistributionDto, DTOs §4.4.1): `{ quantity?, quantityUnit?, percentage?, notes?, metadata? }` — al menos un campo de ajuste; `locationId` NO se modifica por PATCH (cambio de ubicación = movimiento).
- **200 OK**: `DistributionSegmentDto` actualizado; el sistema genera el `Movement` de ajuste (BR-008) y revalida BR-034/036.

```json
{ "data": { "id": "uuid-cl3", "cargoId": "uuid-c", "locationId": "uuid-s3",
    "quantity": 15, "quantityUnit": "AREA", "percentage": 27.3,
    "status": "ACTIVE", "enteredAt": "2026-09-21T09:10:00Z", "exitedAt": null,
    "updatedAt": "2026-09-23T10:05:00Z" } }
```

- **Errores**: 400; 401; 403; 404 `CARGO_NOT_FOUND` / `CARGO_LOCATION_NOT_FOUND` (segmento inexistente o de otra carga); **409 `CAPACITY_EXCEEDED` (BR-036), `DISTRIBUTION_EXCEEDS_TOTAL` (BR-034)**; **422 `UNIT_INCOMPATIBLE` (BR-035), `BUSINESS_RULE_VIOLATION` (BR-006/039) y `CARGO_TOTAL_REQUIRED` (BR-042: la carga no declara `totalQuantity`/`totalUnit` para ajustes parciales)**.

### 5.12 DELETE /cargos/:id/locations/:cargoLocationId
Egreso de la carga de una ubicación → movimiento `EXIT`/`MOVE` + observación (BR-039). Permiso `cargo.move`.
- **Body** (DeleteDistributionDto, DTOs §4.4.1): `{ notes (obligatoria — BR-006), metadata? }` — excepción v1 documentada en API-CONVENTIONS §4.10 (solo esta DELETE recibe body).
- **200 OK**: `DistributionSegmentDto` con `status: "EXITED"` y `exitedAt`; el segmento queda histórico (BR-040). Idempotente: repetir el DELETE sobre un segmento ya `EXITED` devuelve 200 con el estado actual, sin nuevo movimiento (API-CONVENTIONS §4.8).

```json
{ "data": { "id": "uuid-cl3", "cargoId": "uuid-c", "locationId": "uuid-s3",
    "quantity": 15, "quantityUnit": "AREA", "percentage": null,
    "status": "EXITED", "enteredAt": "2026-09-21T09:10:00Z",
    "exitedAt": "2026-09-23T11:00:00Z" } }
```

- **Errores**: 400 (observación vacía en DTO); 401; 403; 404 `CARGO_NOT_FOUND` / `CARGO_LOCATION_NOT_FOUND`; 422 `BUSINESS_RULE_VIOLATION` (BR-006/039: observación vacía llegada al service).

---

## 6. Locations

### 6.1 GET /locations
- **Query**: `type`, `status`, `includeCapacity=true`, paginación (LocationQueryDto).
- **200 OK**:

```json
{ "data": { "items": [
    { "id": "uuid-s4", "name": "Sector 4", "code": "S4", "type": "SECTOR", "status": "ACTIVE",
      "capacity": 200, "capacityUnit": "PALLETS", "occupiedCapacity": 145, "availableCapacity": 55, "capacityPercent": 72.5,
      "x": 120, "y": 80, "width": 60, "height": 40, "color": "#F59E0B" } ],
  "meta": { "page": 1, "limit": 100, "totalItems": 17, "totalPages": 1, "hasNext": false } } }
```

- **Errores**: 400 (filtros); 401.

### 6.2 GET /locations/:id
- **200 OK**: `{ "data": { ...LocationResponseDto, cargos: [ { id, code, status } ] } }` (cargas presentes).
- **Errores**: 401; 404 `LOCATION_NOT_FOUND`.

### 6.3 POST /locations y PATCH /locations/:id (ADMIN)
- **Body**: CreateLocationDto / UpdateLocationDto. Permiso `location.manage` (ADMIN, BR-011). **`capacityUnit` es OPCIONAL** si el LocationType tiene default (BR-041): SECTOR → `AREA`, PLAZOLETA/SCANNER/BALANZA → `UNITS`, otros → configurable. Sin `capacityUnit` en el body, se aplica el default del tipo (la respuesta siempre expone la **unidad efectiva**); declararlo explícitamente es el **override por ubicación** (solo ADMIN, audita `CAPACITY_CHANGE`).
- **201/200**: `{ "data": { ...LocationResponseDto } }`
- **Errores**: 400 (incluye `VALIDATION_ERROR` si el override de unidad no es válido); 401; 403; 404 (PATCH); 409 `LOCATION_CODE_DUPLICATE`; **422 `LOCATION_HAS_CARGO`** (PATCH a INACTIVE/MAINTENANCE con carga presente — regla de negocio: ver VALIDATION.md §5).

### 6.4 GET /locations/:id/cargos
Cargas presentes en la ubicación con su segmento activo y ocupación (BR-040; secciones 62-70). Lectura: 3 roles.
- **Query**: `page/limit/sort` + `onlyActive=true` (default) para listar solo segmentos ACTIVE.
- **200 OK**:

```json
{ "data": { "items": [
    { "cargoId": "uuid-c", "code": "029TERRA26", "name": "Terrazzo 26 — Lote A", "status": "PARTIALLY_UNLOADED",
      "cargoLocationId": "uuid-cl4", "quantity": 35, "quantityUnit": "AREA", "percentage": 63.6,
      "enteredAt": "2026-09-21T09:15:00Z", "openAlerts": 0, "permanenceDays": 3 },
    { "cargoId": "uuid-c2", "code": "032TERRA26", "name": "Terrazzo 26 — Lote B", "status": "STORED",
      "cargoLocationId": "uuid-cl5", "quantity": 25, "quantityUnit": "AREA", "percentage": 100,
      "enteredAt": "2026-09-22T08:30:00Z", "openAlerts": 0, "permanenceDays": 2 },
    { "cargoId": "uuid-c3", "code": "050TERRA26", "name": "Terrazzo 50", "status": "STORED",
      "cargoLocationId": "uuid-cl6", "quantity": 20, "quantityUnit": "AREA", "percentage": 100,
      "enteredAt": "2026-09-22T09:00:00Z", "openAlerts": 0, "permanenceDays": 2 } ],
  "meta": { "page": 1, "limit": 25, "totalItems": 3, "totalPages": 1, "hasNext": false } } }
```

- **Errores**: 400; 401; 404 `LOCATION_NOT_FOUND`. Nota: `permanenceDays` expone la regla de rezago 30 días (BR-015) por carga.

### 6.5 GET /locations/:id/capacity
Capacidad, ocupación y disponibilidad de la ubicación (BR-033/040; secciones 62-70). Lectura: 3 roles.
- **200 OK**:

```json
{ "data": { "id": "uuid-s4", "name": "Sector 4", "code": "S4",
    "capacity": 100, "capacityUnit": "AREA",
    "occupiedCapacity": 80, "availableCapacity": 20, "occupancyPercent": 80,
    "allowOverOccupation": false,
    "segmentsByUnit": [ { "quantityUnit": "AREA", "occupied": 80 } ] } }
```

- `occupiedCapacity` = Σ de segmentos ACTIVE en unidad compatible (BR-033); `segmentsByUnit` desglosa ocupación por `quantityUnit` cuando hay más de una unidad (BR-035: no se suman unidades incompatibles). `allowOverOccupation` indica la regla BR-036 (rol y límites → OQ-043). Nota de unidad efectiva (BR-041): `capacityUnit` en la respuesta es el override declarado en la ubicación o el **default por LocationType** (SECTOR → AREA, PLAZOLETA/SCANNER/BALANZA → UNITS, otros → configurable); la agregación y la comparación de capacidad usan SIEMPRE esa unidad efectiva.
- **Errores**: 401; 404 `LOCATION_NOT_FOUND`.

---

## 7. Maps

### 7.1 GET /maps
- **200 OK**: `{ "data": { "items": [ { "id": "uuid", "name": "Predio Principal", "code": "PREDIO-01", "type": "PREDIO", "width": 1600, "height": 900, "gridSize": 20, "status": "ACTIVE", "version": 3, "updatedAt": "..." } ], "meta": {...} } }`
- **Errores**: 401.

### 7.2 GET /maps/:id
- **Query**: `includeElements=true` (default).
- **200 OK**: `{ "data": { "id": "...", "name": "Predio Principal", "elements": [ { "id": "el-uuid", "locationId": "uuid-s4", "elementType": "LOCATION", "x": 120, "y": 80, "width": 60, "height": 40, "rotation": 0, "zIndex": 1, "fill": "#F59E0B", "stroke": "#0F172A", "labelPosition": "TOP" } ] } }` (dato estructurado, BR-020).
- **Errores**: 401; 404 `MAP_NOT_FOUND`.

### 7.3 PATCH /maps/:id (ADMIN — edición de plano)
- **Body**: UpdateMapDto (DTOs §4.7; lista upsert de `elements`). Permiso `map.edit` (ADMIN, BR-011). Genera `MAP_EDIT` audit y version++ (MASTER-SPEC §4.1 Map.version).
- **200 OK**: `{ "data": { ...Map } }` con version incrementada.
- **Errores**: 400; 401; 403; 404 `MAP_NOT_FOUND` / `LOCATION_NOT_FOUND` (elemento con locationId inexistente); 409 `MAP_ELEMENT_CONFLICT` (elemento superpuesto/duplicado si se valida; ver VALIDATION.md §5 — decisión de validación geométrica pendiente con OQ-015).

---

## 8. Dashboard, Alerts, Audit

### 8.1 GET /dashboard
- **200 OK**:

```json
{ "data": { "summary": { "totalCargos": 431, "byStatus": { "STORED": 300, "IN_TRUCK": 40, "IN_REVIEW": 12, "REZAGO": 3, "SECUESTRO": 1, "PARTIALLY_UNLOADED": 75 },
    "openAlerts": 7, "totalLocations": 17, "occupancyByLocation": [ { "locationId": "uuid-s4", "name": "Sector 4", "percent": 72.5 } ],
    "recentMovements": [ { "id": "uuid-m", "cargoCode": "029TERRA26", "kind": "UNLOAD", "movedAt": "..." } ] } } }
```

- **Errores**: 401. Lectura permitida a los 3 roles (§8 RBAC: viewer consulta dashboard).

### 8.2 GET /alerts
- **Query**: `status`, `type`, `cargoId`, `severity`, `from`, `to`, paginación (AlertQueryDto).
- **200 OK**:

```json
{ "data": { "items": [
    { "id": "uuid-a", "cargoId": "uuid", "cargoCode": "029TERRA26", "type": "STALE_30D",
      "status": "OPEN", "severity": "HIGH", "dueAt": "2026-09-01T00:00:00Z",
      "createdAt": "2026-09-01T01:00:00Z", "permanenceDays": 53 } ],
  "meta": { "page": 1, "limit": 25, "totalItems": 7, "totalPages": 1, "hasNext": false } } }
```

- **Errores**: 400; 401.

### 8.3 PATCH /alerts/:id
- **Body** (UpdateAlertDto): `{ status: "ACKNOWLEDGED" | "RESOLVED" | "DISMISSED", observation? }` — permiso `alert.manage` (OPERATOR+ para acknowledge/resolve; ADMIN para dismiss). La resolución NO mueve carga (BR-014: decisión humana + observación → movimiento aparte).
- **200 OK**: `{ "data": { ...AlertResponseDto } }`
- **Errores**: 400; 401; 403; 404 `ALERT_NOT_FOUND`; 409 `INVALID_ALERT_TRANSITION` (ej. OPEN→DISMISSED directo según regla); 422 si falta observación donde es obligatoria.

### 8.4 GET /audit
- **Query**: `action`, `entity`, `entityId`, `userId`, `from`, `to`, paginación (AuditQueryDto). Permiso `audit.read` (ADMIN ve todo; OPERATOR ve **solo sus propios eventos** — OQ-019, 2026-09-24; Viewer sin acceso).
- **200 OK**:

```json
{ "data": { "items": [
    { "id": "uuid", "userId": "uuid-u", "username": "jperez", "action": "MOVE",
      "entity": "Cargo", "entityId": "uuid", "timestamp": "2026-09-23T09:20:00Z",
      "previousValue": { "locationId": "uuid-plazoleta" }, "newValue": { "locationId": "uuid-s4" } } ],
  "meta": { "page": 1, "limit": 50, "totalItems": 1843, "totalPages": 37, "hasNext": true } } }
```

- **Errores**: 400; 401; 403.

---

## 9. Trucks, Users, Roles, Notifications, Settings, Health

> Los contratos de esta sección derivan de los módulos §11.3 (no están enumerados en MASTER-SPEC §10) y se definen aquí como propuesta formal del grupo W5.

### 9.1 Trucks
- `GET /trucks` — Query: `plate`, `withCargo`, paginación → `{ data: { items: [ { id, plate, brand, model, driverName, cargosCount, createdAt } ], meta } }`; errores 400/401.
- `POST /trucks` — Body CreateTruckDto; permiso `truck.create` (OPERATOR+) → 201; 400/401/403/409 `TRUCK_PLATE_DUPLICATE`.
- `GET /trucks/:id` → 200 con cargas asignadas; 401/404 `TRUCK_NOT_FOUND`.
- `PATCH /trucks/:id` — UpdateTruckDto → 200; 400/401/403/404/409.

### 9.2 Users
- `GET /users` — Query: `search`, `role`, `active`, paginación; permiso `users.manage` (ADMIN) → 200 `{ data: { items: [ { id, username, email, name, active, roles: ["OPERATOR"], lastLoginAt, createdAt } ], meta } }`; 401/403.
- `POST /users` — CreateUserDto; ADMIN → 201; 400/401/403/409 `USERNAME_DUPLICATE` / `EMAIL_DUPLICATE`.
- `GET /users/:id` → 200; 401/403/404 `USER_NOT_FOUND`.
- `PATCH /users/:id` — UpdateUserDto → 200; 400/401/403/404/409.
- `POST /users/:id/roles` — AssignRolesDto → 200 `{ data: { id, roles: [...] } }`; 400/401/403/404.

### 9.3 Roles
- `GET /roles` → 200 `{ data: { items: [ { id, code: "OPERATOR", name, description, permissions: ["cargo.create", ...] } ], meta } }`; 401.
- `GET /roles/:id` → 200; 401/404.
- `PUT /roles/:id/permissions` — SetRolePermissionsDto; ADMIN → 200 (audit PERMISSION_CHANGE); 400/401/403/404 `PERMISSION_NOT_FOUND` (code inexistente).

### 9.4 Notifications
- `GET /notifications` — Query: `unreadOnly`, paginación → 200 `{ data: { items: [ { id, type, channel: "IN_APP", title, body, readAt, createdAt } ], meta, unreadCount: 3 } }`; 400/401.
- `PATCH /notifications/:id/read` → 200 `{ data: { id, readAt } }`; 401/404 `NOTIFICATION_NOT_FOUND`.

### 9.5 Settings
- `GET /settings` — Query: `keys` → 200 `{ "data": { "staleAlert.days": 30, "locationTypeDefaultUnit.sector": "AREA", "locationTypeDefaultUnit.plazoleta": "UNITS", "locationTypeDefaultUnit.otros": null, "map.defaultGrid": 20 } }`; 401.
- `PATCH /settings` — UpdateSettingsDto (pares); ADMIN → 200 (audit CAPACITY_CHANGE/SETTINGS_CHANGE); 400/401/403/404 `SETTING_NOT_FOUND` (clave no registrada en catálogo). Las claves `locationTypeDefaultUnit.<type>` administran los **defaults de BR-041** (módulo dueño de la tabla: pendiente — DTOs.md §10); cambiar un default NO altera ubicaciones con override explícito ni reescribe `capacityUnit` existentes.

### 9.6 Health
- `GET /health` (liveness) → 200 `{ "data": { "status": "ok", "uptime": 3600, "timestamp": "2026-09-23T10:00:00Z" } }`; sin auth.
- `GET /health/ready` (readiness) → 200 `{ "data": { "status": "ok", "checks": { "database": "up" }, "timestamp": "2026-09-23T10:00:00Z" } }` o 503 `{ "error": { "code": "SERVICE_UNAVAILABLE", "message": "Dependencias no disponibles", "details": { "database": "down" }, "requestId": "..." } }`.

Nota — la sonda de readiness tiene un **presupuesto de 2 s**. Una base que deja de responder *sin cerrar el socket* no la cuelga: el presupuesto vence y la sonda responde 503 con el mismo envelope que una conexión rechazada. El log server-side distingue `timed out` de `failed`, porque "la base dejó de contestar" y "la base rechazó la llamada" son incidentes distintos con páginas distintas. El presupuesto acota la **respuesta**, no la statement: la consulta sigue hasta que el pool la recicla, porque cancelarla exigiría una transacción interactiva y no aportaría nada. Liveness no tiene presupuesto porque no consulta ninguna dependencia; por eso una caída de la base degrada readiness y jamás debería provocar un reinicio.

---

## 10. Criterios de aceptación

1. Todos los endpoints de MASTER-SPEC §10 están documentados con método, path, query/body, respuestas y errores — incluidos los de distribución (§5.9-5.12, §6.4-6.5) y el soporte de movimientos parciales en §5.6.
2. Cada endpoint de los módulos extra (§9) está marcado como derivado de §11.3.
3. Los ejemplos JSON son consistentes con los DTOs (`DTOs.md`) y con el envelope `{ data }`/`{ error }` (API-CONVENTIONS).
4. Los errores listados cubren 400/401/403/404/409/422 con código de aplicación (ERROR-HANDLING §5).
5. No hay ambigüedad entre estados/enums: los strings JSON usan los valores canónicos de MASTER-SPEC §4.3.

## 11. Archivos involucrados

- `docs/backend/API.md` (este), `API-CONVENTIONS.md`, `DTOs.md`, `ERROR-HANDLING.md`, `VALIDATION.md`
- `docs/MASTER-SPEC.md` (§4, §6, §7, §10, §11.3)

## 12. Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Endpoints extra (§9) no validados contra el roadmap/backlog | Se marcan como propuesta W5; el orquestador los confirma antes de implementar |
| `export-pdf` cambia de forma según estrategia PDF (OQ-005) | Se documenta la opción 202+downloadUrl y la alternativa 200 binario; decisión final en ADR-013 |
| Filtros complejos (`filter=status:X,locationId:Y`) frágiles | Formato documentado y validado por el query DTO (API-CONVENTIONS §5) |
| Idempotencia de movimientos genera superficie nueva | Cabecera opcional con reglas claras (API-CONVENTIONS §7) |

## 13. DECISIÓN PENDIENTE

| # | Pregunta | Impacto | Referencia |
| --- | --- | --- | --- |
| 1 | ~~¿Egreso/retiro (EXITED) con alta de salida y remito en v1?~~ → **RESUELTA** (OQ-004 → **BR-043**): **sí en v1** — egreso completo: movimiento `EXIT` con observación obligatoria (BR-006), remito/documentación opcionales (`exitDocumentRef?`), auditoría (BR-008/ADR-010); `EXITED` terminal | Endpoints del flujo de salida | OQ-004 (resuelta 2026-09-23) |
| 2 | ~~¿Estrategia PDF (síncrona binaria vs asíncrona 202+download)?~~ → **Estrategia de generación RESUELTA** (OQ-005 → **ADR-013 Accepted, 2026-09-24**): **HTML→PDF server-side con Chromium/Puppeteer**, plantillas propias, sin JS client-side; decisión síncrono-binario vs `202+downloadUrl` como **residual local de presentación** (PDF-EXPORT.md §5.3, API-CONVENTIONS §4.10) | 5.7 export-pdf | OQ-005 / ADR-013 (generación resuelta 2026-09-24) |
| 3 | ~~¿Operador puede leer auditoría de operaciones propias o solo ADMIN?~~ → **RESUELTA** (OQ-019 → §8 RBAC / §4.4 decisión 19, 2026-09-24): **OPERATOR ve SOLO sus propios eventos** (login, movimientos, cambios que él hizo); **ADMIN ve todo**; Viewer sin acceso a auditoría. Consistente con API-CONVENTIONS §8.4, ERROR-HANDLING §4.'), SECURITY (W2) | 8.4 GET /audit | OQ-019 (resuelta 2026-09-24) |
| 4 | ~~¿Validación geométrica de elementos del plano (superposición) en PATCH maps?~~ → **RESUELTA** (OQ-015 → §12 / §4.4 decisión 16, 2026-09-24): mapa es **vista estática** en v1 (lectura + selección + hover); **sin editor visual** ni validación geométrica de superposición en v1 (`MAP_ELEMENT_CONFLICT` queda como previsión para PATCH maps futuros) | 7.3 (409 MAP_ELEMENT_CONFLICT) | OQ-015 (resuelta 2026-09-24) |
| 5 | ¿Rate limiting global o solo en auth? | Error 429 | 🔶 Residual local de seguridad (W2 — SECURITY.md; alcance exacto es decisión de seguridad, no de contrato API) |
| 6 | ~~¿El camión se modela como Location (LocationType CAMION) o el "en camión" es residual derivado?~~ → **RESUELTA** (OQ-042 → **BR-042**): camión NO es Location; residual derivado `totalQuantity − Σ activos` expuesto como `inTruckAmount`/`inTruckUnit`; `CARGO_TOTAL_REQUIRED` 422 sin total declarado | 5.6, 5.9-5.12 | OQ-042 (resuelta 2026-09-23) |
| 7 | ~~¿Semántica de `percentage` en los segmentos (informativo/derivado vs autoritativo)?~~ → **RESUELTA** (OQ-045 → **BR-049**, 2026-09-24): `quantity`+`quantityUnit` son la **fuente de verdad**; `percentage` es **derivado de UI** (quantity/totalQuantity) con unidad física, y solo se acepta como input cuando la unidad es **PERCENT** (donde es la cantidad misma) | 5.9/5.10/5.11 (percentage) | OQ-045 (resuelta 2026-09-24) |
| 8 | ~~¿Unidad de capacidad por defecto por LocationType y desglose por unidad de la ocupación?~~ → **Unidad por defecto RESUELTA** (OQ-041 → **BR-041**): SECTOR → AREA, PLAZOLETA/SCANNER/BALANZA → UNITS, otros → configurable, override por ubicación, gobernanza ADMIN. Permanece: desglose por unidad de la ocupación como decisión de presentación | 6.5 GET capacity | OQ-041 (resuelta 2026-09-23) |
| 9 | ~~¿Conversión de unidades entre cargas y ubicaciones en v1? (recomendado: no — compatibles o PERCENT)~~ → **RESUELTA** (OQ-044 → **BR-048**, 2026-09-24): **NO se convierten unidades en v1** — se exigen unidades compatibles o `PERCENT` (`UNIT_INCOMPATIBLE` 422, BR-035); conversión (m³↔m², ton↔pallets) requiere altura/densidad → fuera de v1 | 5.6, 5.10 (`UNIT_INCOMPATIBLE`) | OQ-044 (resuelta 2026-09-24) |