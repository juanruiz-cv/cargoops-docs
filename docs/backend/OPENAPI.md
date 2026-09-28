# OPENAPI.md — OpenAPI / Swagger: estrategia oficial de documentación de la API REST

> Grupo W5 — Backend. Este documento fija **cómo se documenta el contrato OpenAPI de CargoOps** y cómo se mantiene sincronizado con `API.md`, `DTOs.md` y `ERROR-HANDLING.md`. No reemplaza esos documentos: define la forma en que su contenido se expresa como especificación OpenAPI 3.x.

---

## 1. Objetivo

Definir el estándar único de documentación de la API REST de CargoOps: estructura del documento OpenAPI, tags, esquemas de seguridad, descripción de cada endpoint (path, parámetros, cuerpos, respuestas y errores), reglas de DTOs y schemas, el contrato de paginación/filtros/orden, los ejemplos de referencia por dominio, la política de sincronización con el código y el gate de CI que impide que el contrato publicado se desvíe del implementado.

## 2. Contexto

El contrato de la API ya está definido en tres documentos canónicos del grupo W5: `API.md` describe método, path, query/body, respuestas y errores por endpoint; `DTOs.md` define el shape de request/response y las validaciones de `class-validator`; `ERROR-HANDLING.md` fija el envelope de error y el catálogo de códigos de aplicación. `API-CONVENTIONS.md` §4.14 establece que **el contrato vivo se genera desde el código con `@nestjs/swagger`** y que nunca se mantiene un spec duplicado a mano; `BACKEND-ARCHITECTURE.md` §5.7 define los tags por módulo y la exposición en `/api/v1/docs`; ADR-007 (Accepted) confirma OpenAPI como contrato vivo consumible por el frontend y por los tests de API.

Estado verificado del repositorio `cargoops-backend` a la fecha de este documento: **`@nestjs/swagger` no está declarado en `package.json` y `src/app.setup.ts` no monta `SwaggerModule`**. La especificación documentada aquí gobierna la implementación futura; el contrato de negocio que debe producir es el de `API.md`, sin diferencias.

`QA-STRATEGY.md` §5 (líneas 46 y 130) ya define el consumidor: Supertest sobre la app NestJS en modo e2e, con validación de contratos contra el OpenAPI generado como fuente de verdad. `FRONTEND-ARCHITECTURE.md` R-04 y `STANDARDS.md` (línea 34) fijan el segundo consumidor: los modelos de `models/` en el frontend se generan desde el contrato OpenAPI, nunca se escriben a mano.

## 3. Restricciones

| # | Restricción | Origen |
| --- | --- | --- |
| R-01 | El documento OpenAPI se **genera** desde DTOs y decoradores; el archivo `.yaml`/`.json` es un artefacto de build, nunca una fuente editada a mano. | API-CONVENTIONS §4.14, ADR-007 |
| R-02 | La especificación no introduce reglas de contrato nuevas: si un schema contradice `API.md`, `DTOs.md` o `ERROR-HANDLING.md`, el que se corrige es el schema. | MASTER-SPEC §16 |
| R-03 | Descripciones, `summary` y ejemplos en español neutral; identificadores, nombres de schema, códigos de error y rutas en inglés. | MASTER-SPEC §16, API-CONVENTIONS §4.14 |
| R-04 | Todo endpoint de `API.md` queda declarado en el documento; todo endpoint implementado y no declarado es un defecto de contrato. | API.md §10 CA-1 |
| R-05 | Los errores se documentan con el envelope `{ error: { code, message, details?, requestId } }` del proyecto; **no** se introduce RFC 7807 ni `ProblemDetails`. | MASTER-SPEC §10, ERROR-HANDLING §4.1 |
| R-06 | Solo se usan los códigos HTTP de la tabla canónica; `204` no se documenta porque no se usa en v1. | API-CONVENTIONS §4.4 |
| R-07 | Swagger se expone únicamente en dev/staging o con `SWAGGER_ENABLED=true` explícito. | BACKEND-ARCHITECTURE §5.1/§5.7, API-CONVENTIONS §4.14 |
| R-08 | Todo ejemplo del documento usa datos de referencia de MASTER-SPEC §5 (`029TERRA26`, `032TERRA26`, `050TERRA26`, `054TERRA26`, Sectores 3/4/5). | MASTER-SPEC §5 |
| R-09 | Los strings de enum del documento son los valores canónicos de MASTER-SPEC §4.3, sin literales redefinidos. | DTOs §7 #4, VALIDATION §4.2 |
| R-10 | Ningún schema expone `stack`, `internalMessage`, `password`, `refreshToken` ni `Authorization`. | ERROR-HANDLING §4.7, BACKEND-ARCHITECTURE R-06 |

## 4. Dependencias

| Tipo | Dependencia | Qué aporta |
| --- | --- | --- |
| Canónico | `MASTER-SPEC.md` §4.3, §4.4, §5, §10, §11.2, §16 | Enums, distribución M:N, seeds, marco de la API, convención documental |
| Grupo W5 | `API.md` | Método, path, query/body, respuestas y errores por endpoint |
| Grupo W5 | `DTOs.md` §4, §4.11, §4.12 | Campos, tipos, validaciones y schemas de respuesta |
| Grupo W5 | `API-CONVENTIONS.md` §4.1–§4.15 | Base URL, envelopes, HTTP, paginación, naming, headers, idempotencia, unidades |
| Grupo W5 | `ERROR-HANDLING.md` §4.3, §4.9 | Mapeo HTTP y catálogo de códigos de aplicación |
| Grupo W5 | `VALIDATION.md` §4.1–§4.3.1, §4.5 | Capas de validación y qué error produce cada BR |
| Grupo W5 | `BACKEND-ARCHITECTURE.md` §5.1, §5.7 | Bootstrap, tags, exposición de Swagger |
| W2 | `architecture/ADR/ADR-007-REST-API.md`, `ADR-003-NestJS.md`, `ADR-008-Authentication.md` | Contrato vivo, generación desde código, autenticación |
| W8 | `qa/QA-STRATEGY.md` (líneas 46, 130) | Consumo del contrato en tests de API |
| Código | `cargoops-backend/package.json`, `src/app.setup.ts` | Estado real de la implementación (ver §2) |

## 5. Decisiones

### 5.1 Estructura del documento, tags y bloque de seguridad

- El documento se genera con `SwaggerModule.createDocument(app, config, { deepScanRoutes: true })` y se expone con `SwaggerModule.setup('api/v1/docs', app, document)`, respetando el prefijo global ya configurado (BACKEND-ARCHITECTURE §5.1).
- La raíz declara `openapi: '3.x'` (**decisión del estándar**: se adopta OpenAPI 3.1, el que emite `@nestjs/swagger` con la versión de Nest vigente), `info.title = 'CargoOps API'`, `info.version = '1.0.0'` y `info.description` en español neutral que declara base URL `https://<host>/api/v1` y el envelope canónico.
- `servers` declara únicamente `/api/v1` en dev/staging; en producción la URL completa por entorno. Nunca se declara un `servers` con `/api` sin versión.
- **Tags (14, exactos y en este orden)**: `Auth`, `Cargos`, `Locations`, `Maps`, `Movements`, `Trucks`, `Users`, `Roles`, `Alerts`, `Audit`, `Dashboard`, `Notifications`, `Settings`, `Health` (API-CONVENTIONS §4.14, BACKEND-ARCHITECTURE §5.7). Cada tag lleva `description` de una línea en español. Ningún endpoint queda fuera de un tag.
- **Seguridad**: un único scheme `bearerAuth` (`type: http`, `scheme: bearer`, `bearerFormat: JWT`) declarado a nivel raíz. Los endpoints públicos se marcan con `@Public()` y se excluyen con `addBearerAuth({ ignore: true })` o equivalente (**decisión del estándar**: la exclusión es explícita por decorador, no por una lista manual de paths).
- Cada endpoint declara además, como `parameters` comunes, `X-Request-Id` y `X-Correlation-Id` opcionales y `Idempotency-Key` opcional en las operaciones de movimiento y de segmentos (API-CONVENTIONS §4.8, §4.11). Los headers de respuesta `X-Request-Id`, `Location`, `Deprecation` y `Sunset` se documentan en la respuesta de los endpoints correspondientes.

### 5.2 Convenciones por endpoint

- Recursos en plural y minúsculas; sub-recursos para relaciones; acciones con verbo solo cuando no existe un sustantivo natural y la acción no es CRUD (`auth/login`, `auth/refresh`, `auth/logout`, `cargos/:id/export-pdf`, `movements/:id/revert`). En paths compuestos de acción se usa guion (`export-pdf`), nunca `camelCase` ni `snake_case`. Nunca se mezclan recurso y verbo (`/cargos/move` está prohibido) (API-CONVENTIONS §4.6).
- `summary` en una línea imperativa en español; `description` en párrafos breves que indiquen la regla de negocio aplicable citando el identificador BR cuando exista.
- `operationId` en `camelCase` estable y único (`listCargos`, `createCargoLocation`, `moveCargo`); se usa como nombre de la operación generada en el cliente del frontend, por lo que cambiarlo es breaking change de cliente (API-CONVENTIONS §4.7).
- El `tags` de una operación es **uno solo**, el del módulo dueño del recurso; los sub-recursos de otro módulo se exponen en el controller del dueño y heredan su tag (`POST /cargos/:id/movements` → tag `Cargos`; `GET /cargos/:id/locations` → tag `Cargos`) (**decisión del estándar**: evita duplicar contratos entre módulos, coherente con DTOs §6 nota 4 y MODULES.md §6 nota 5).
- `deprecated: true` más `Deprecation`/`Sunset` cuando un endpoint entre en la ventana de migración de §5.13.

### 5.3 Métodos, parámetros y cuerpos

| Elemento | Regla |
| --- | --- |
| Path params | Siempre `required: true`, `schema.type: 'string', format: 'uuid'` (API-CONVENTIONS R-04). El `name` del path y el del parámetro coinciden exactamente. |
| Body | `required: true` salvo opcionalidad explícita del DTO; `content['application/json']` únicamente. Un body que acepte otro `Content-Type` se documenta con su media type y su error `415` (API-CONVENTIONS §4.10). |
| `415` | Todo endpoint con body documenta `415` `UNSUPPORTED_MEDIA_TYPE` (ERROR-HANDLING §4.3). |
| `Location` | Todo `POST` que crea recurso documenta el header `Location` con la URL del recurso (API-CONVENTIONS §4.6). |
| Excepción v1 | `DELETE /cargos/{id}/locations/{cargoLocationId}` acepta body con `observation` obligatoria; es la única `DELETE` con body y su schema se documenta explícitamente (API-CONVENTIONS §4.10, API.md §5.12). |
| Binarios | `POST /cargos/{id}/export-pdf` documenta la respuesta JSON `202` con `exportId`/`downloadUrl` y, si se adopta la variante binaria, el `content-type: application/pdf` con `Content-Disposition` fuera del envelope (API-CONVENTIONS §4.10, API.md §13 #2). |
| Fechas | `type: 'string', format: 'date-time'`, `example` en UTC con sufijo `Z` (API-CONVENTIONS §4.9). |
| Números | `quantity`, `capacity`, `occupiedCapacity`, `availableCapacity` y porcentajes como `type: 'number'`; `numeric(14,2)` de Postgres se serializa como número (API-CONVENTIONS §4.10). |
| Enums | `enum` generado desde el enum canónico de MASTER-SPEC §4.3; sin listas parciales o literales propios. |

### 5.4 DTOs y schemas

- **Los DTOs son la fuente de los schemas** (DTOs §1, BACKEND-ARCHITECTURE §5.7). Cada campo se documenta con `@ApiProperty({ description, example, required, enum, minimum, maximum })`; la descripción va en español neutral y el mensaje de validación de `class-validator` es el mismo texto que viaja al usuario (DTOs §2).
- Un DTO de entrada se declara con `additionalProperties: false` porque el `ValidationPipe` corre con `whitelist` y `forbidNonWhitelisted` (VALIDATION §4.2). Esto hace visible en el contrato que un campo desconocido es `400 VALIDATION_ERROR`.
- Nombres de schema: `<DtoName>` para entrada y salida, sin sufijos `Request`/`Response` salvo que existan ambos con campos distintos (**decisión del estándar**: una misma clase cubre request y response cuando el shape coincide, evitando duplicación prohibida por DTOs §6).
- Herencia `PartialType(CreateXDto)` se materializa en el schema como un objeto con todas las propiedades `required` ausentes; no se declara un `allOf` que sugiera opcionalidad parcial implícita (**decisión del estándar**).
- Schemas de respuesta reutilizables y registrados: `CargoResponseDto`, `MovementResponseDto`, `DistributionSegmentDto`, `LocationCapacityDto`, `LocationCargosItemDto`, `LocationResponseDto`, `AlertResponseDto`, `UserSummaryDto`, `LocationSummaryDto`, `AuthResponseDto`, `PaginatedDto` (DTOs §4.12).
- El envelope se tipa con schemas explícitos, no con un `additionalProperties` libre: `SuccessResponse<T>` (`{ data: T }`), `PaginatedResponse<T>` (`{ data: { items: T[], meta: PaginationMeta } }`) y `ErrorResponse` (`{ error: { code, message, details?, requestId } }`).
- `details` se declara como objeto libre con `nullable: true`, porque su forma depende del código de error; los casos frecuentes (`fields[]` en `VALIDATION_ERROR`, `rule` en `BUSINESS_RULE_VIOLATION`, `locationId`/`capacity` en `CAPACITY_EXCEEDED`) se ilustran en el `example` de la respuesta.
- Campos derivados se marcan como tales en la descripción: `inTruckAmount`/`inTruckUnit` son el residual `totalQuantity − Σ segmentos ACTIVE` (BR-042), `occupiedCapacity`/`availableCapacity`/`capacityPercent` son derivados (BR-033) y `percentage` del segmento es informativo/derivado salvo `PERCENT` (BR-049).

### 5.5 Códigos de estado

El documento solo puede declarar los códigos de la tabla canónica (API-CONVENTIONS §4.4, ERROR-HANDLING §4.3):

| HTTP | Uso | `code` de ejemplo | ¿Obligatorio en el documento? |
| --- | --- | --- | --- |
| 200 | Lectura, `PATCH`/`PUT` exitosos, acciones síncronas | — | Sí |
| 201 | Creación de recursos | — | Sí, en `POST` que crea |
| 202 | Procesamiento asíncrono aceptado | — | Sí, en export-pdf si aplica |
| 400 | Body/query malformado, campo no permitido | `VALIDATION_ERROR` | Sí en todo endpoint con body o query |
| 401 | Token ausente, expirado o inválido | `UNAUTHORIZED` | Sí en todo endpoint protegido |
| 403 | Token válido sin permiso | `FORBIDDEN` | Sí en todo endpoint protegido |
| 404 | Recurso inexistente o soft-deleted | `CARGO_NOT_FOUND` | Sí en endpoints con `:id` |
| 409 | Conflicto de estado/unicidad | `CAPACITY_EXCEEDED`, `DISTRIBUTION_EXCEEDS_TOTAL`, `INVALID_TRANSITION`, `*_DUPLICATE` | Sí cuando aplica |
| 415 | `Content-Type` distinto de `application/json` | `UNSUPPORTED_MEDIA_TYPE` | Sí en todo endpoint con body |
| 422 | Regla de negocio incumplida | `BUSINESS_RULE_VIOLATION`, `UNIT_INCOMPATIBLE`, `CARGO_TOTAL_REQUIRED`, `LOCATION_HAS_CARGO` | Sí cuando aplica |
| 429 | Rate limit superado | `RATE_LIMITED` | Sí en `auth/login` y `auth/refresh` |
| 500/503/504 | Fallo interno, dependencia caída, timeout | `INTERNAL_ERROR`, `SERVICE_UNAVAILABLE`, `DB_TIMEOUT` | Sí en `health/ready` y en endpoints con dependencia externa |

Reglas:

- `204` **no se declara** en ningún endpoint de v1: el envelope `{ data }` es consistente y los `DELETE` de soft delete devuelven el recurso afectado (API-CONVENTIONS §4.4).
- `405` y otros códigos de infraestructura del framework no se declaran: se normalizan al envelope de error (ERROR-HANDLING §4.4). **Decisión del estándar**: no documentar respuestas que el filtro global absorbe.
- El `code` de aplicación se documenta como `example` dentro del schema de error de cada respuesta, y el `description` nombra la regla (`BR-006` observación obligatoria, `BR-034` suma distribuida, `BR-035` unidades incompatibles, `BR-042` total declarado).
- `GET /audit` documenta `403` con la nota de alcance: OPERATOR solo ve sus propios eventos, VIEWER sin acceso (API.md §8.4, OQ-019).

### 5.6 Envelope de error

- Un único schema `ErrorResponse` reutilizado por todas las respuestas de error:

```jsonc
{
  "error": {
    "code": "CAPACITY_EXCEEDED",
    "message": "La ubicación no tiene capacidad disponible",
    "details": { "locationId": "d3a1...", "capacity": 100, "capacityUnit": "AREA", "occupiedCapacity": 80 },
    "requestId": "7b8f1c2e-4d5a-4f6b-9c8d-2e1f0a3b5c7d"
  }
}
```

- `code` es estable, en inglés e inmutable; `message` es español neutral apto para el usuario (**decisión del estándar**: el schema declara ambos como `string`, sin `enum` global, para que agregar un código no rompa clientes; el catálogo de ERROR-HANDLING §4.9 es la lista cerrada, y el documento la referencia explícitamente en la descripción del schema).
- `requestId` es obligatorio (`required: true`) y documenta su correlación con `X-Request-Id` y los logs (API-CONVENTIONS §4.11).
- `details` es opcional y variable por código; se documenta con `additionalProperties: true` y un ejemplo representativo por respuesta.
- Cuando el error es de validación, el `example` muestra `details.fields` como array de `{ field, message, code }` (ERROR-HANDLING §4.4 punto 2).
- El documento **no** declara `application/problem+json` ni campos RFC 7807 (`type`, `title`, `status`): el contrato de CargoOps es el envelope propio (R-05).

### 5.7 Autenticación y autorización

- Esquema único `bearerAuth` con `Authorization: Bearer <accessToken>`; el refresh viaja en cookie httpOnly `refresh_token` y **no se documenta como parámetro de ningún endpoint** (ADR-008, API.md §4.2).
- Endpoints públicos documentados con `security: []`: `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout` (operan con la cookie), `GET /health` y `GET /health/ready` (API.md §4, §9.6).
- Cada endpoint protegido documenta `401` y `403` con su código (`UNAUTHORIZED`, `FORBIDDEN`, `USER_INACTIVE` en auth).
- El permiso requerido se declara en la `description` del endpoint con su código canónico (`cargo.create`, `cargo.move`, `cargo.update`, `cargo.delete_soft`, `cargo.revert`, `cargo.export_pdf`, `cargo.to_rezago`, `cargo.to_secuestro`, `truck.create`, `location.manage`, `map.edit`, `users.manage`, `settings.manage`, `audit.read`) y su nivel de rol (BR-010/BR-011). La fuente es `architecture/AUTHORIZATION.md` y la verificación es el `PermissionsGuard` global del backend, no el documento.
- El documento se genera con la misma instancia de guards que el servidor, de modo que `@Public()` y `@RequirePermissions()` son la única fuente de verdad (**decisión del estándar**: está prohibido derivar la seguridad de un array declarado en `main.ts`).
- `409 CAPACITY_EXCEEDED` por sobreocupación administrativa se documenta solo cuando la ubicación tiene `allowOverOccupation`; el requisito de autorización es ADMIN y el límite por defecto es +10 % (BR-036 ampliada, OQ-043).

### 5.8 Paginación, filtros y orden

- Todo listado declara sus parámetros reutilizando el schema `ListQuery`: `page` (integer, mínimo 1, default 1), `limit` (integer, 1–100, default 25), `sort` (string, default `-createdAt`) y `filter` (string, máximo 500) (API-CONVENTIONS §4.5, DTOs §4.11).
- Los filtros específicos del endpoint (`code`, `search`, `truckId`, `createdById`, `alert`, `from`/`to`, `status`, `type`, `severity`, `action`, `entity`, `plate`, `kind`, `userId`, `includeCapacity`, `onlyActive`, `keys`, `unreadOnly`, `role`, `active`, `withCargo`) se declaran como parámetros simples, no dentro de `filter` (**decisión del estándar**: el parámetro dedicado es autodescriptivo y valida su formato; `filter=campo:valor` queda disponible para combinaciones libres, con whitelist de campos).
- Las respuestas de listado referencian `PaginatedResponse<T>` y el schema `PaginationMeta` con `{ page, limit, totalItems, totalPages, hasNext }` (`required` en los cinco).
- `GET /audit` y, cuando el volumen lo justifique, `GET /cargos/{id}/movements` declaran paginación por cursor con `nextCursor` y `hasNext` en `meta` (**decisión del estándar**: cursor reservado a tablas append-only de alto volumen, como establece API-CONVENTIONS §4.5; los dos estilos no se mezclan en un mismo endpoint).
- Ningún endpoint declara parámetros de filtro que el query DTO no acepte: un filtro desconocido produce `400 VALIDATION_ERROR` y eso debe ser legible en el contrato (API-CONVENTIONS §4.5, VALIDATION §4.2).

### 5.9 Validaciones

- La documentación refleja la separación de capas de VALIDATION §4.1: el schema OpenAPI describe **solo lo que el DTO valida** (shape, formato, required, longitudes, enums, rangos). Las reglas de negocio BR no se expresan como restricciones de schema sino como respuestas de error documentadas con su código y su identificador de regla.
- `minimum`, `maximum`, `minLength` y `maxLength` provienen de los decoradores de `class-validator` de `DTOs.md` §4 y se replican en `@ApiProperty`; no se endurecen ni se relajan respecto del DTO.
- La observación obligatoria se documenta con `minLength: 1` en `MoveCargoDto.observation`, `CreateDistributionDto.notes` y `DeleteDistributionDto.notes`, más un `description` que cita BR-006/BR-039 (BR-007 aplica al cambio de estado).
- `totalQuantity` y `totalUnit` se documentan como opcionales en `CreateCargoDto` con la nota de requisito condicional BR-042: obligatorios antes de la primera distribución parcial, y `422 CARGO_TOTAL_REQUIRED` si se intenta sin ellos (API.md §5.2, VALIDATION §4.3.1).
- El par `quantity`/`quantityUnit` se documenta con la regla de co-ocurrencia y compatibilidad: misma unidad base o `PERCENT`, sin conversión en v1 (BR-035, OQ-044 → BR-048). La dependencia entre campos se expresa en el `description` del schema (**decisión del estándar**: OpenAPI 3.1 no expresa condicionales entre propiedades sin `oneOf`, y un `oneOf` para este par agregaría ambigüedad al cliente sin ganar precisión).
- `percentage` se documenta con `minimum`/`maximum` y la aclaración de que es derivado salvo `PERCENT` (BR-049, OQ-045).
- Los códigos de carga se documentan con el `pattern` canónico `^[A-Z0-9][A-Z0-9./-]{2,31}$` y la normalización a mayúsculas en backend (BR-002, OQ-001), coherente con `CargoCodeValidator` (VALIDATION §4.3).
- Un campo no declarado no se envía: el `ValidationPipe` con `whitelist` y `forbidNonWhitelisted` responde `400` y el schema lo hace explícito con `additionalProperties: false` (§5.4).

### 5.10 Ejemplo de contrato por dominio

Cada dominio tiene un endpoint de referencia cuyo fragmento de OpenAPI sirve de plantilla para el resto de sus endpoints. Los ejemplos usan los datos de MASTER-SPEC §5 (R-08).

| Dominio | Endpoint de referencia | Schemas de referencia | Regla de negocio que el ejemplo hace visible |
| --- | --- | --- | --- |
| Auth | `POST /auth/login` | `LoginDto`, `AuthResponse`, `UserSummary` | Refresh en cookie httpOnly; `roles`/`permissions` son snapshot del token (API.md §4.1) |
| Cargas | `GET /cargos` | `ListQuery`, `PaginatedResponse<CargoResponse>`, `CargoListQuery` | Residual `inTruckAmount`/`inTruckUnit` derivado (BR-042); `openAlerts` |
| Ubicaciones | `GET /locations` | `LocationQuery`, `PaginatedResponse<LocationResponse>` | `capacityUnit` es la unidad efectiva (BR-041); ocupación derivada (BR-033) |
| CargoLocation | `POST /cargos/{id}/locations` | `CreateDistributionDto`, `DistributionSegment` | Un segmento `ACTIVE` por par carga/ubicación (BR-032); observación obligatoria (BR-006/039) |
| Movimientos parciales | `POST /cargos/{id}/movements` | `MoveCargoDto`, `MovementResponse` | Parcial vs 100 % (BR-037); `CARGO_TOTAL_REQUIRED` (BR-042) |
| Historial | `GET /cargos/{id}/movements` | `MovementListQuery`, `PaginatedResponse<MovementResponse>` | `observation` embebida 1:1 (BR-006/008); `reversionOfId` en reversiones (BR-012) |
| Alertas | `GET /alerts` | `AlertQuery`, `PaginatedResponse<AlertResponse>` | `permanenceDays` expone BR-015; severidad canónica `LOW\|MEDIUM\|HIGH\|CRITICAL` |
| Dashboard | `GET /dashboard` | `DashboardSummary` | Agregación en vivo sin materialización (BR-051, OQ-031) |
| Planos | `GET /maps/{id}` | `MapResponse`, `MapElement` | Datos estructurados, no imagen (ADR-006, BR-020); mapa estático en v1 (OQ-015) |
| Usuarios | `GET /users` | `UserListQuery`, `PaginatedResponse<UserSummary>` | ADMIN-only (`users.manage`); `active` desactiva (API.md §9.2) |
| Roles | `PUT /roles/{id}/permissions` | `SetRolePermissionsDto` | Reemplazo total de permisos con auditoría `PERMISSION_CHANGE` (API.md §9.3) |

Fragmento de referencia del dominio de distribución, el más sensible del contrato:

```yaml
/api/v1/cargos/{id}/locations:
  post:
    tags: [Cargos]
    operationId: createCargoLocation
    summary: Registra un segmento de distribución de la carga en una ubicación
    description: >-
      Alta de segmento CargoLocation + movimiento (BR-039). Exige observación no vacía
      (BR-006) y total declarado de la carga para distribución parcial (BR-042).
      No se admiten unidades incompatibles con la unidad efectiva de la ubicación
      (BR-035, sin conversión en v1). Un solo segmento ACTIVE por par carga/ubicación (BR-032).
    security: [{ bearerAuth: [] }]
    parameters:
      - $ref: '#/components/parameters/CargoId'
      - $ref: '#/components/parameters/IdempotencyKey'
    requestBody:
      required: true
      content:
        application/json:
          schema: { $ref: '#/components/schemas/CreateDistributionDto' }
          example:
            locationId: d3a1b7c4-5d6e-4f80-9a1b-2c3d4e5f6a7b
            quantity: 35
            quantityUnit: AREA
            notes: Distribución inicial de 35 m² en Sector 4.
    responses:
      '201':
        description: Segmento creado
        headers:
          Location: { description: URL del segmento creado, schema: { type: string } }
        content:
          application/json:
            schema: { $ref: '#/components/schemas/SuccessResponse' }
            example:
              data:
                id: cl-7a2b-3c4d-5e6f-7a8b-9c0d1e2f3a4b
                cargoId: 7c0f3a4e-5b6c-4d7e-8f90-1a2b3c4d5e6f
                locationId: d3a1b7c4-5d6e-4f80-9a1b-2c3d4e5f6a7b
                quantity: 35
                quantityUnit: AREA
                percentage: 63.6
                status: ACTIVE
                enteredAt: '2026-09-21T09:15:00Z'
                exitedAt: null
      '400': { description: Body malformado o campo no permitido, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
      '401': { description: Token ausente, expirado o inválido, ... }
      '403': { description: Sin permiso cargo.move, ... }
      '404': { description: CARGO_NOT_FOUND / LOCATION_NOT_FOUND, ... }
      '409': { description: LOCATION_INACTIVE, CAPACITY_EXCEEDED, DISTRIBUTION_EXCEEDS_TOTAL, CONFLICT, DUPLICATE_OPERATION, ... }
      '415': { description: UNSUPPORTED_MEDIA_TYPE, ... }
      '422': { description: UNIT_INCOMPATIBLE, BUSINESS_RULE_VIOLATION (BR-006/039), CARGO_TOTAL_REQUIRED (BR-042), ... }
```

Fragmento del parámetro de ruta y del esquema de entrada:

```yaml
components:
  parameters:
    CargoId:
      name: id
      in: path
      required: true
      description: Identificador de la carga
      schema: { type: string, format: uuid }
    IdempotencyKey:
      name: Idempotency-Key
      in: header
      required: false
      description: >-
        Clave de idempotencia del movimiento (BR-052). Repetir la misma clave con el mismo
        body devuelve el movimiento original; con un body distinto, 409 DUPLICATE_OPERATION.
      schema: { type: string, maxLength: 128 }
  schemas:
    CreateDistributionDto:
      type: object
      additionalProperties: false
      required: [locationId, quantity, quantityUnit, notes]
      properties:
        locationId: { type: string, format: uuid, description: Ubicación destino del segmento (BR-004) }
        quantity: { type: number, minimum: 0.0001, description: Cantidad del segmento, en unidad compatible con la ubicación (BR-033) }
        quantityUnit: { type: string, enum: [UNITS, PALLETS, TONS, CUBIC_METERS, AREA, PERCENT], description: Unidad de la cantidad; debe ser compatible con la unidad efectiva de la ubicación (BR-035/BR-041) }
        percentage: { type: number, minimum: 0.01, maximum: 100, description: Porcentaje informativo derivado de quantity/totalQuantity; solo es cantidad autoritativa si quantityUnit es PERCENT (BR-049) }
        notes: { type: string, minLength: 1, maxLength: 2000, description: Observación obligatoria del movimiento (BR-006/BR-039) }
        metadata: { type: object, additionalProperties: true, description: Metadatos libres del movimiento }
```

Ejemplo de error de negocio en el documento, reutilizado en todos los endpoints con validación de distribución:

```jsonc
// 422 — total de la carga no declarado (BR-042)
{ "error": { "code": "CARGO_TOTAL_REQUIRED",
             "message": "La carga debe declarar cantidad total y unidad antes de distribuirse parcialmente.",
             "details": { "rule": "BR-042", "cargoId": "7c0f3a4e-5b6c-4d7e-8f90-1a2b3c4d5e6f" },
             "requestId": "7b8f1c2e-4d5a-4f6b-9c8d-2e1f0a3b5c7d" } }

// 409 — la suma de segmentos superaría el total declarado (BR-034)
{ "error": { "code": "DISTRIBUTION_EXCEEDS_TOTAL",
             "message": "La suma de los segmentos supera la cantidad total de la carga.",
             "details": { "rule": "BR-034", "totalQuantity": 55, "distributed": 60, "quantityUnit": "AREA" },
             "requestId": "7b8f1c2e-4d5a-4f6b-9c8d-2e1f0a3b5c7d" } }
```

### 5.11 Relaciones N:N, capacidades y unidades

- El documento refleja la distribución M:N tal como está modelada: `CargoResponse` **no** declara `locationId` único, y los segmentos se exponen en `GET /cargos/{id}/locations` como `PaginatedResponse<DistributionSegment>` (BR-032, MASTER-SPEC §4.2).
- `DistributionSegment` declara `status` con el enum `CargoLocationStatus` (`ACTIVE`, `EXITED`), `enteredAt` y `exitedAt` (`nullable: true`), y documenta que el segmento egresado permanece como histórico (BR-040).
- El residual "en camión" se documenta en `CargoResponse` como `inTruckAmount`/`inTruckUnit`, `nullable: true`, con la fórmula en la descripción y la aclaración de que `null` significa "sin total declarado" y no cero (API.md §5.1, BR-042).
- `LocationCapacity` expone `capacity`, `capacityUnit`, `occupiedCapacity`, `availableCapacity`, `occupancyPercent`, `allowOverOccupation` y `segmentsByUnit[]`; los tres primeros derivados se marcan como tales y `segmentsByUnit` se describe como el desglose que impide sumar unidades incompatibles (BR-033/BR-035, API.md §6.5).
- La unidad efectiva se documenta con la tabla de defaults por `LocationType` (SECTOR/GALPON → `AREA`; PLAZOLETA/SCANNER/BALANZA → `UNITS`; otros → configurable) y la existencia del override por ubicación gobernado por ADMIN (BR-041, OQ-041).
- `CapacityType` incluye `UNLIMITED`, que en el schema se documenta como "sin barra, texto *Ilimitado*" y sin validación de capacidad (API-CONVENTIONS §4.15, COMPONENTS §6.12).
- Ningún schema declara capacidad autoritativa calculada en el cliente: los agregados de ocupación provienen del backend (BR-009, FRONTEND-ARCHITECTURE §5.4).

### 5.12 Sincronización con el código y gate de CI

**Regla de sincronización**: el documento OpenAPI es un artefacto generado y versionado. El flujo obligatorio es: (1) el contrato se define en `DTOs.md`/`API.md`; (2) los DTOs y decoradores lo materializan; (3) el documento se genera; (4) se versiona en el repositorio backend como artefacto de build y se publica en `/api/v1/docs`. Un cambio de contrato que no viene acompañado de un cambio de DTO, o un DTO que no coincide con `API.md`, es un defecto en cualquiera de los dos lados (R-01, R-02).

Pipeline de verificación requerido (**decisión del estándar** para el repositorio `cargoops-backend`, hoy inexistente en `package.json`):

| Paso | Comando/acción | Condición de falla |
| --- | --- | --- |
| 1. Generar | `nest build` y materializar el documento OpenAPI a `openapi.json` en el build | El build falla si un schema no se puede generar |
| 2. Snapshot | Comparar el `openapi.json` generado contra el versionado | Diff no vacío → falla el pipeline |
| 3. Cobertura de endpoints | Test que recorre el documento y verifica que cada `operationId` de `API.md` existe con su tag | Falta una operación → falla |
| 4. Envelopes | Test que valida el schema de toda respuesta de éxito contra `{ data }` y de todo error contra `{ error }` | Envelope divergente → falla |
| 5. Contrato en e2e | Supertest valida la respuesta real contra el schema publicado (QA-STRATEGY líneas 46, 130) | Respuesta que no valida → falla |
| 6. Ejemplos | Test que valida que cada `example` del documento es serializable y respeta su `schema` | Ejemplo inválido → falla |

El paso 2 es el **gate de sync**: obliga a que cualquier cambio de contrato sea un cambio explícito y revisado, no un efecto secundario de un refactor. Los pasos 3 a 6 se integran en el job de pruebas existente del backend, que ya separa unit/e2e (`.github/workflows/ci.yml` del repositorio backend: `test` y `test:e2e` con servicio `postgres:16-alpine`).

Reglas adicionales:

- El documento publicado en `/api/v1/docs` es la versión de desarrollo del artefacto versionado; en staging se regenera en el pipeline de despliegue.
- Un cambio de contrato solo es aceptable si es **aditivo** (campo opcional, endpoint nuevo, valor de enum nuevo) o si abre una versión nueva (API-CONVENTIONS §4.7, §5.13).
- Un PR que toca DTOs, controllers o `ERROR-HANDLING` sin actualizar el `openapi.json` versionado no pasa el gate.

### 5.13 Versionado del contrato

- El versionado es por URL: el documento vigente describe `/api/v1` y su `info.version` sigue a la versión de la API, no a la versión del paquete (API-CONVENTIONS §4.7, MASTER-SPEC §10).
- Un breaking change (renombrar o eliminar un campo, cambiar el tipo o la semántica de un valor, cambiar un código de estado, endurecer una validación existente) exige `/api/v2` con su propio documento; v1 no se modifica en caliente.
- Cambio aditivo dentro de v1: campo opcional en respuesta, endpoint nuevo, valor de enum nuevo. Se acepta sin cambio de versión y el pipeline lo permite porque el gate compara contra el artefacto versionado, no contra una whitelist.
- Deprecación: el endpoint marcado `deprecated: true` documenta los headers de respuesta `Deprecation` (motivo) y `Sunset` (fecha ISO de retiro) y su `description` indica el reemplazo. v1 se mantiene vigente hasta la fecha de retiro anunciada.
- La coexistencia v1/v2 es configuración de rutas del monolito (ADR-001); los services de dominio se comparten y solo los controllers replican el contrato versionado (API-CONVENTIONS §4.7).

### 5.14 Uso de Swagger UI

- Ruta: `/api/v1/docs`, montada con `SwaggerModule.setup('api/v1/docs', app, document)` (BACKEND-ARCHITECTURE §5.1).
- Condición de exposición: `NODE_ENV !== 'production' || SWAGGER_ENABLED === 'true'`. En producción la habilitación es una decisión explícita revisada por seguridad (API-CONVENTIONS §4.14, BACKEND-ARCHITECTURE riesgo "Swagger expone contratos en producción").
- `customSiteTitle` en español; la UI se lee en español, y los nombres de tag y operación permanecen en inglés (contrato técnico).
- Orden de los tags en la UI: el declarado en §5.1, mediante `customOptions.tagsSorter` o el orden natural del documento; de este modo la navegación refleja la secuencia de uso operativo (Auth → Cargos → Locations → Maps → Movements → …).
- Swagger UI **no** sustituye los tests de contrato: sirve para exploración manual; la verificación automática es la de §5.12 y la de `QA-STRATEGY.md`.
- Autenticación en la UI: botón *Authorize* con el access token de un usuario de prueba del entorno. Los endpoints públicos quedan probables sin credencial, lo que permite verificar el comportamiento de `401` documentado.
- En entornos con datos sensibles, la UI no se expone (R-07); el documento sigue disponible como artefacto versionado para el frontend y para QA.

## 6. Criterios de aceptación

1. El documento OpenAPI generado expone los 14 tags de §5.1, en ese orden, y cada operación tiene exactamente un tag.
2. Cada endpoint de `API.md` tiene su operación declarada, con `operationId` único, parámetros, cuerpo cuando aplica y todas las respuestas de la tabla de §5.5 con su código de aplicación.
3. Todo esquema de entrada declara `additionalProperties: false` y replica exactamente los campos, tipos y límites de `DTOs.md` §4.
4. Toda respuesta de éxito referencia el envelope `{ data }`; toda respuesta de error referencia `ErrorResponse` con `code`, `message` y `requestId` requeridos. Ningún schema usa RFC 7807.
5. No se declara `204` en ningún endpoint, ni códigos fuera de la tabla canónica.
6. Los strings de enum del documento coinciden con MASTER-SPEC §4.3; `CargoStatus` no contiene valores ajenos al enum canónico.
7. Todo ejemplo usa datos de MASTER-SPEC §5 y valida contra su propio schema.
8. El gate de CI falla ante un diff entre el `openapi.json` generado y el versionado, y ante un endpoint implementado no declarado.
9. `GET /api/v1/docs` responde en dev y en staging, y no responde en producción con `SWAGGER_ENABLED` distinto de `true`.
10. El documento incluye el error `422 CARGO_TOTAL_REQUIRED` con `details.rule = 'BR-042'` en los endpoints de distribución y movimiento parcial.

## 7. Archivos involucrados

| Ruta | Rol |
| --- | --- |
| `docs/backend/OPENAPI.md` | Este documento |
| `docs/backend/API.md` | Contratos por endpoint (fuente de verdad del contrato) |
| `docs/backend/DTOs.md` | Campos, validaciones y schemas (`@ApiProperty`) |
| `docs/backend/API-CONVENTIONS.md` | Envelopes, HTTP, paginación, naming, headers, idempotencia, unidades |
| `docs/backend/ERROR-HANDLING.md` | Envelope de error y catálogo de códigos |
| `docs/backend/VALIDATION.md` | Capas de validación y BR que debe(names) aparecer en las respuestas |
| `docs/backend/BACKEND-ARCHITECTURE.md` | Bootstrap (§5.1) y OpenAPI/Swagger (§5.7) |
| `docs/backend/MODULES.md` | Módulos del backend cuyos nombres originan los tags |
| `docs/MASTER-SPEC.md` | §4.3 enums, §4.4 decisiones, §5 seeds, §10 API, §16 convenciones |
| `docs/architecture/ADR/ADR-007-REST-API.md`, `ADR-003-NestJS.md`, `ADR-008-Authentication.md`, `ADR-009-RBAC.md` | Base arquitectónica del contrato |
| `docs/architecture/AUTHORIZATION.md` | Permisos canónicos y denegación por defecto |
| `docs/qa/QA-STRATEGY.md` | Consumo del contrato en Supertest y validación de contrato |
| `cargoops-backend/src/app.setup.ts`, `src/**/dto/*.ts`, `src/**/**.controller.ts` | Implementación que genera el documento |

## 8. Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Deriva entre el documento y el código (contrato publicado que ya no existe) | Gate de sync §5.12 paso 2 + pasos 3–6; el documento no se edita a mano (R-01) |
| Documento inflado con respuestas que el filtro global nunca emite | Solo se documentan los códigos de la tabla canónica (§5.5) |
| Fuga de información por ejemplos o descripciones | Ejemplos con datos de referencia (R-08); prohibido documentar `stack`, tokens o `password` (R-10) |
| Contrato que contradice `API.md` y el equipo implementa el equivocado | R-02: el schema se corrige contra el documento canónico; el gate de CI lo detecta |
| Documento generado demasiado grande para el cliente del frontend | Un solo `components.schemas` compartido; DTOs reutilizados (DTOs §6); sin duplicar schemas de request/response idénticos |
| Swagger expuesto en producción | Condición de entorno + `SWAGGER_ENABLED` explícito (§5.14) |
| Adopción de convenciones ajenas (RFC 7807, HATEOAS, `/api/v2` improvisado) | R-05 y §5.13: envelope propio y versionado por URL |
| Seguridad declarada en el documento pero no aplicada por el código | La fuente es el decorador (`@Public`, `@RequirePermissions`); el documento refleja, no decide (§5.7) |

## 9. DECISIÓN PENDIENTE

| # | Pregunta | Impacto | Referencia |
| --- | --- | --- | --- |
| DP-OPENAPI-01 | ¿Qué herramienta ejecuta la verificación de contrato en CI: `schemathesis` (property-based sobre el documento), validación de respuestas con un validador OpenAPI dentro del suite Supertest existente, o validación E2E con Playwright? | Elección del gate de sync y de su costo en tiempo de pipeline | QA-STRATEGY.md §5 (líneas 46, 130) fija Supertest + validación contra OpenAPI, pero no la herramienta concreta; decisión de tooling de implementación, no de contrato |
| DP-OPENAPI-02 | ¿El documento se versiona en el repositorio backend como `openapi.json` y se publica como artefacto de release, o solo se expone en runtime en dev/staging? | Define si el paso 2 del gate (comparación contra snapshot) tiene contra qué comparar | Decisión del estándar: se recomienda versionar; sin confirmación del orquestador queda como convención local |
