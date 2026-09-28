# ERROR-HANDLING.md — Manejo de errores del backend de CargoOps

> Grupo W5 — Backend. Jerarquía de excepciones, mapeo a HTTP, envelope de error, filtros globales NestJS, logging y catálogo de códigos de aplicación. Complementa `API-CONVENTIONS.md` (§4.3/§4.4) y `API.md` (§3). Fuente de verdad: MASTER-SPEC §10 (envelope) y §6 (BR).

---

## 1. Objetivo

Definir cómo se modelan, detectan, serializan y registran los errores en el backend CargoOps: una jerarquía de excepciones de dominio con código de aplicación estable, un mapeo uniforme a HTTP, filtros globales de NestJS que garantizan el envelope `{ error: { code, message, details?, requestId } }` en el 100% de los caminos (incluidos errores de Prisma y del framework), logging estructurado sin datos sensibles (BR-017) y la distinción entre errores de negocio e infraestructura.

## 2. Contexto

MASTER-SPEC §10 fija el envelope de error `{ "error": { "code", "message", "details?", "requestId" } }` con HTTP correcto. API.md §3 define los errores comunes (400/401/403/404/409/422/429/500/503/504) y códigos de aplicación por endpoint. BACKEND-ARCHITECTURE §3 R-06 exige no exponer stack traces ni secretos en producción, y §5.1 registra un filtro global de excepciones en `main.ts`. Las reglas BR-001..BR-020 (MASTER-SPEC §6) son la fuente de los errores de negocio; cada BR mapea a un código (detalle en `VALIDATION.md`). BR-017 exige equilibrar privacidad en auditoría/logs (IP/userAgent minimizados). La UI es es-AR (OQ-012): mensajes en español neutral, códigos estables en inglés.

## 3. Restricciones

| # | Restricción | Origen |
| --- | --- | --- |
| R-01 | Ningún error sale de la API sin el envelope `{ error: {...} }` y `requestId`. | MASTER-SPEC §10 |
| R-02 | No exponer stack traces, secretos, datos personales ni código interno en respuestas de error (producción). | BACKEND-ARCHITECTURE §3 R-06 |
| R-03 | Los códigos de aplicación son estables en inglés y parte del contrato versionado; los mensajes son español neutral. | DTOs.md §2, API-CONVENTIONS §3 |
| R-04 | Los errores de negocio se lanzan desde services/validators de dominio, nunca desde controllers ni repositories. | BACKEND-ARCHITECTURE §5.2 |
| R-05 | Los logs de error NO contienen datos sensibles (contraseñas, hashes, tokens, bodies completos); IP/userAgent minimizados. | BR-017, ADR-010 |
| R-06 | Toda mutación que falla a mitad de transacción se revierte íntegra; el error resultante es el del root cause, no un estado parcial. | BACKEND-ARCHITECTURE §5.5 |

## 4. Decisiones

### 4.1 Envelope de error (forma canónica)

```jsonc
{ "error": {
    "code": "<APP_CODE>",
    "message": "<mensaje en español neutral>",
    "details": { /* opcional: estructura libre, tipada en el DTO de error */ },
    "requestId": "uuid" } }
```

- `code`: catálogo §4.9. Único, estable, versionado.
- `message`: final para usuario; español neutral v1; futuro: clave i18n (ver §4.8).
- `details`: contexto estructurado del error (campos fallados, regla BR, IDs involucrados, valores límite). Nunca stack traces ni datos sensibles.
- `requestId`: igual al header `X-Request-Id` de la response (API-CONVENTIONS §4.11); en logs para correlación. También se persiste en `AuditLog.metadata.requestId` cuando el error acompaña una mutación.
- Ejemplos de details por tipo:
  - Validación de shape: `{ "fields": [ { "field": "quantity", "message": "La cantidad debe ser mayor a cero", "code": "IS_POSITIVE" } ] }`
  - Regla de negocio: `{ "rule": "BR-005", "locationId": "uuid", "capacity": 200, "capacityUnit": "AREA", "occupiedCapacity": 200 }`

### 4.2 Jerarquía de excepciones

Modelo de dominio en `src/common/exceptions/` (documentación; implementación en fase 1):

```
CargoOpsException (abstracta: appCode + httpStatus + message + details?)
├── DomainException (base de errores de negocio)
│   ├── ValidationException                     → 400 VALIDATION_ERROR
│   ├── NotFoundException (base)
│   │   ├── CargoNotFoundException              → 404 CARGO_NOT_FOUND
│   │   ├── LocationNotFoundException           → 404 LOCATION_NOT_FOUND
│   │   ├── CargoLocationNotFoundException      → 404 CARGO_LOCATION_NOT_FOUND (BR-032/039)
│   │   ├── TruckNotFoundException              → 404 TRUCK_NOT_FOUND
│   │   ├── MapNotFoundException                → 404 MAP_NOT_FOUND
│   │   ├── AlertNotFoundException              → 404 ALERT_NOT_FOUND
│   │   ├── UserNotFoundException               → 404 USER_NOT_FOUND
│   │   ├── PermissionNotFoundException         → 404 PERMISSION_NOT_FOUND
│   │   ├── NotificationNotFoundException       → 404 NOTIFICATION_NOT_FOUND
│   │   └── SettingNotFoundException            → 404 SETTING_NOT_FOUND
│   ├── ConflictException (base)
│   │   ├── CargoCodeDuplicateException         → 409 CARGO_CODE_DUPLICATE (BR-002)
│   │   ├── LocationCodeDuplicateException      → 409 LOCATION_CODE_DUPLICATE
│   │   ├── TruckPlateDuplicateException        → 409 TRUCK_PLATE_DUPLICATE
│   │   ├── UsernameDuplicateException          → 409 USERNAME_DUPLICATE
│   │   ├── EmailDuplicateException             → 409 EMAIL_DUPLICATE
│   │   ├── LocationInactiveException           → 409 LOCATION_INACTIVE (BR-004)
│   │   ├── CapacityExceededException           → 409 CAPACITY_EXCEEDED (BR-005/BR-036)
│   │   ├── DistributionExceedsTotalException   → 409 DISTRIBUTION_EXCEEDS_TOTAL (BR-034)
│   │   ├── StateTransitionException            → 409 INVALID_TRANSITION (BR-016)
│   │   ├── InvalidAlertTransitionException     → 409 INVALID_ALERT_TRANSITION
│   │   ├── DuplicateOperationException         → 409 DUPLICATE_OPERATION (idempotencia)
│   │   └── MapElementConflictException         → 409 MAP_ELEMENT_CONFLICT
│   ├── ObservationRequiredException            → 422 BUSINESS_RULE_VIOLATION (details rule BR-006/BR-007)
│   ├── UnitIncompatibleException               → 422 UNIT_INCOMPATIBLE (BR-035; sin conversión v1 — OQ-044)
│   ├── CargoTotalRequiredException             → 422 CARGO_TOTAL_REQUIRED (BR-042: distribución parcial sin totalQuantity/totalUnit declarados)
│   ├── BusinessRuleViolationException (genérica) → 422 BUSINESS_RULE_VIOLATION (details rule BR-xxx)
│   ├── LocationHasCargoException               → 422 LOCATION_HAS_CARGO
│   ├── UnauthorizedException (base)
│   │   ├── InvalidCredentialsException         → 401 INVALID_CREDENTIALS
│   │   ├── InvalidRefreshTokenException        → 401 INVALID_REFRESH_TOKEN
│   │   └── RefreshTokenRevokedException        → 401 REFRESH_TOKEN_REVOKED
│   ├── ForbiddenException (base)
│   │   └── UserInactiveException               → 403 USER_INACTIVE
│   └── RateLimitedException                    → 429 RATE_LIMITED
└── InfrastructureException (base, nunca expone detalles internos)
    ├── DatabaseUnavailableException            → 503 SERVICE_UNAVAILABLE
    ├── DbTimeoutException                      → 504 DB_TIMEOUT
    └── InternalException                       → 500 INTERNAL_ERROR
```

Notas:
- Las clases de conflicto/not-found/unauthorized/forbidden **extienden las built-ins de NestJS** (`NotFoundException`, `ConflictException`, `UnauthorizedException`, `ForbiddenException`) cuando el HTTP coincide, para que el framework las serialice correctamente; el filtro global las complementa con `appCode` y `details`.
- Toda excepción de dominio lleva: `appCode` (catálogo §4.9), `httpStatus`, `message` (user-facing), `details?`, y opcionalmente `internalMessage`/`cause` (solo log, nunca response).
- Los services lanzan excepciones de dominio; los repositories traducen errores de persistencia a `InfrastructureException` o excepciones de dominio (unicidad → `*DuplicateException`); los controllers NO crean excepciones de dominio (R-04).

### 4.3 Mapeo a HTTP

| HTTP | Código(s) de aplicación | Origen típico |
| --- | --- | --- |
| 400 | `VALIDATION_ERROR` | ValidationPipe global (shape), filtros/query malformados |
| 401 | `UNAUTHORIZED`, `INVALID_CREDENTIALS`, `INVALID_REFRESH_TOKEN`, `REFRESH_TOKEN_REVOKED` | JWT guard (ADR-008), auth service |
| 403 | `FORBIDDEN`, `USER_INACTIVE` | PermissionsGuard (BR-009/010/011), usuario desactivado |
| 404 | `NOT_FOUND` + códigos por entidad (`CARGO_NOT_FOUND`, `LOCATION_NOT_FOUND`, `CARGO_LOCATION_NOT_FOUND`, …) | Repositorio/queries; incluye soft-deleted (ADR-011) |
| 409 | `CONFLICT` + `*_DUPLICATE`, `LOCATION_INACTIVE`, `CAPACITY_EXCEEDED`, `DISTRIBUTION_EXCEEDS_TOTAL`, `INVALID_TRANSITION`, `INVALID_ALERT_TRANSITION`, `DUPLICATE_OPERATION`, `MAP_ELEMENT_CONFLICT` | Reglas BR-002/004/005/016/034/036, idempotencia, unicidad |
| 415 | `UNSUPPORTED_MEDIA_TYPE` | Content-Type inválido (API-CONVENTIONS §4.10) |
| 422 | `BUSINESS_RULE_VIOLATION` (details `rule`), `LOCATION_HAS_CARGO`, `UNIT_INCOMPATIBLE` (BR-035), `CARGO_TOTAL_REQUIRED` (BR-042) | Reglas BR-006/007/035/042 y validación semántica de negocio |
| 429 | `RATE_LIMITED` | Rate limiting (API-CONVENTIONS §4.12) |
| 500 | `INTERNAL_ERROR` | Excepción no tipada / bug |
| 503 | `SERVICE_UNAVAILABLE` | Dependencia caída (DB, Redis si BullMQ, S3) — readiness |
| 504 | `DB_TIMEOUT` | Timeout de transacción/query Prisma (BACKEND-ARCHITECTURE §5.5) |

Convención de partición (coherente con API.md §2): `400` = shape inválido; `422` = regla de negocio semántica (BR); `409` = conflicto de estado/unicidad. Un DTO vacío de observación es `400`; una observación que llega vacía al service por una vía no-DTO es `422` con `rule: 'BR-006'` (API.md §5.6).

### 4.4 Filtros globales NestJS

Pipeline (un solo filtro registrado en `main.ts` — BACKEND-ARCHITECTURE §5.1) que normaliza TODO a `{ error }`:

1. **`AllExceptionsFilter`** — catch-all final:
   - Excepciones `CargoOpsException` → serializa `{ code, message, details?, requestId }` con su `httpStatus`.
   - Excepciones HTTP built-in de Nest (`HttpException`) → mapea a código por defecto del status (tabla §4.3; `BadRequestException` → `VALIDATION_ERROR` con details de campos si los trae).
   - Cualquier otra (`Error`) → `500 INTERNAL_ERROR`, sin detalles en producción (R-02), con log `error` completo.
2. **Módulo de validación (`ValidationPipe` global + filtro de errores de validación)**: transforma el array de errores de class-validator en `details.fields` `[{ field, message, code }]` → `400 VALIDATION_ERROR`.
3. **`PrismaExceptionFilter`** — traducción de errores de persistencia (tabla §4.5).
4. **Rate limiting middleware** — `429 RATE_LIMITED` (API-CONVENTIONS §4.12).

Reglas del pipeline:
- El orden es single-filter-delegación: un `AllExceptionsFilter` que clasifica y delega evita filtros encadenados que se pisen.
- Producción: `details` solo con datos ya autorizados por contrato; `internalMessage`/`cause`/stack VAN solo al log (nunca a la response).
- El filtro agrega `requestId` desde el middleware `X-Request-Id` (API-CONVENTIONS §4.11); si el error ocurre antes del middleware, se genera uno nuevo.
- Errores de async (jobs) NO pasan por la API: se manejan en `JOBS.md` (retry/dead-letter) y se loguean con el mismo formato y `correlationId` cuando el job deriva de una request.

### 4.5 Traducción de errores Prisma (persistencia)

| Error Prisma | Traducción | HTTP / código |
| --- | --- | --- |
| `P2002` (unique constraint) | Según constraint: `uq_cargo_code` → `CARGO_CODE_DUPLICATE` (BR-002); `uq_trucks_plate` → `TRUCK_PLATE_DUPLICATE`; `uq_locations_code` → `LOCATION_CODE_DUPLICATE`; `uq_users_username`/`uq_users_email` → `USERNAME_DUPLICATE`/`EMAIL_DUPLICATE` | 409 `*_DUPLICATE` |
| `P2025` (record not found) | `NotFound` de la entidad en juego | 404 `*_NOT_FOUND` |
| `P2003`/`P2018` (FK inválida) | `*_NOT_FOUND` de la entidad referenciada | 404 |
| `P2034` (conflicto de transacción/escritura) | Reintentar una vez (política global); si persiste → `INTERNAL_ERROR` con log | 500 |
| Timeout de query/transacción | `DB_TIMEOUT` | 504 |
| Conexión rechazada/perdida | `SERVICE_UNAVAILABLE` | 503 |
| Cualquier otro | `INTERNAL_ERROR` + log | 500 |

El mapeo de `P2002` a entidad se hace por el nombre del constraint (`meta.target`), nunca por heurística de mensaje. La traducción vive en el `PrismaExceptionFilter` (común) o en los repositorios para casos de dominio (unicidad con detalle).

### 4.6 Errores de negocio vs infraestructura

| Dimensión | Negocio (`DomainException`) | Infraestructura (`InfrastructureException`) |
| --- | --- | --- |
| Qué indica | El cliente/operador hizo algo inválido según BR | El sistema no pudo cumplir (dependencia, recurso, bug) |
| HTTP esperado | 400/401/403/404/409/415/422/429 | 500/503/504 |
| ¿Reintentable por el cliente? | Corrigiendo la entrada | Sí, con backoff (aguardando recuperación) |
| ¿Detalles en response? | Según contrato (fields, rule, contexto) | Mínimos (nunca stack/secretos) |
| Log level | `warn` (esperado, no es anomalía); `info` si el flujo lo requiere | `error` siempre |
| Métricas | Contadores por `appCode` (CSI/BI de dominio) | Alertas operativas (W9 MONITORING) |
| Ejemplos | `CAPACITY_EXCEEDED`, `DISTRIBUTION_EXCEEDS_TOTAL`, `UNIT_INCOMPATIBLE`, `CARGO_TOTAL_REQUIRED`, `CARGO_LOCATION_NOT_FOUND`, `INVALID_TRANSITION`, `OBSERVACION REQUERIDA` | `DB_TIMEOUT`, `SERVICE_UNAVAILABLE`, `INTERNAL_ERROR` |

Regla: nunca se trata un error de negocio como fallo de infraestructura ni viceversa. Un `409 CAPACITY_EXCEEDED` NO dispara alarmas; un `504 DB_TIMEOUT` SÍ.

### 4.7 Logging de errores sin datos sensibles (BR-017)

- Logger: **pino** (estructurado, JSON) — BACKEND-ARCHITECTURE §4; nivel por entorno (`LOG_LEVEL`).
- Campos obligatorios en todo log de error: `level`, `time`, `requestId` (o `correlationId`), `appCode`, `httpStatus`, `method`, `path`, `userId` (si hay sesión), `message`. Opcional: `details` (no sensibles), `durationMs`, `stack` (solo `error` server-side).
- **NUNCA loguear**: `password`, `passwordHash`, `refreshToken`/tokens, header `Authorization`, cookies, bodies completos de request con datos personales (en dev se permite body de validación acotado y desactivable), claves secretas, datos de terceros.
- **IP/userAgent minimizados** (BR-017, ADR-010): IP truncada/anonimizada (p. ej. últimos octetos) en logs y `AuditLog.ip`; userAgent limitado a longitud y campos no identificatorios.
- Observaciones de negocio (texto de movimientos): son datos operativos, no secretos; se loguean solo si aportan a diagnósticos y con el mismo criterio de minimización.
- Todo error de infraestructura incluye `cause`/stack en el log (server-side) para debugging; la response solo lleva `message` genérico + código.

### 4.8 Mensajes i18n en respuesta

- v1: `message` en **español neutral** (UI es-AR; MASTER-SPEC §16), incluidos los mensajes de validación de `details.fields` (DTOs.md §2).
- `code` es INMUTABLE y en inglés: los clientes NO dependen de `message` para lógica, solo de `code`/`httpStatus`.
- Estructura lista para i18n (OQ-012): catálogo de mensajes `error.<code>` (y `validation.<field-rule>` para DTOs) gestionado por el módulo `settings`/i18n service; el filtro resuelve `message` desde el catálogo con la locale vigente (default `es`). Los códigos nunca se traducen ni se versionan por idioma.
- Mensajes genéricos de seguridad: `INVALID_CREDENTIALS` usa mensaje idéntico para "usuario no existe" y "contraseña incorrecta" (no filtrar existencia — API.md §4.1, SECURITY W2).

### 4.9 Catálogo de códigos de aplicación

| Código | HTTP | Origen / Regla |
| --- | --- | --- |
| `VALIDATION_ERROR` | 400 | ValidationPipe global (shape DTO) |
| `UNSUPPORTED_MEDIA_TYPE` | 415 | Content-Type no JSON (convención W5) |
| `UNAUTHORIZED` | 401 | Token ausente/expirado/inválido |
| `INVALID_CREDENTIALS` | 401 | Login fallido (mensaje genérico) |
| `INVALID_REFRESH_TOKEN` | 401 | Refresh token inexistente/inválido |
| `REFRESH_TOKEN_REVOKED` | 401 | Refresh token revocado (logout) |
| `FORBIDDEN` | 403 | Sin permiso para la acción (BR-009/010/011) |
| `USER_INACTIVE` | 403 | Usuario desactivado |
| `NOT_FOUND` | 404 | Genérico (defecto si no hay código por entidad) |
| `CARGO_NOT_FOUND` | 404 | BR-003 (incluye soft-deleted) |
| `LOCATION_NOT_FOUND` | 404 | Destino/origen inexistente |
| `CARGO_LOCATION_NOT_FOUND` | 404 | Segmento de distribución inexistente (BR-032/039) |
| `TRUCK_NOT_FOUND` | 404 | Camión inexistente |
| `MAP_NOT_FOUND` | 404 | Plano inexistente |
| `ALERT_NOT_FOUND` | 404 | Alerta inexistente |
| `USER_NOT_FOUND` | 404 | Usuario inexistente |
| `PERMISSION_NOT_FOUND` | 404 | Código de permiso inexistente |
| `NOTIFICATION_NOT_FOUND` | 404 | Notificación inexistente |
| `SETTING_NOT_FOUND` | 404 | Clave de configuración no registrada |
| `CONFLICT` | 409 | Genérico de conflicto de estado |
| `CARGO_CODE_DUPLICATE` | 409 | BR-002 (P2002 `uq_cargo_code`) |
| `LOCATION_CODE_DUPLICATE` | 409 | Código de ubicación duplicado |
| `TRUCK_PLATE_DUPLICATE` | 409 | Patente duplicada |
| `USERNAME_DUPLICATE` | 409 | Usuario duplicado |
| `EMAIL_DUPLICATE` | 409 | Email duplicado |
| `LOCATION_INACTIVE` | 409 | BR-004 (destino no ACTIVE) |
| `CAPACITY_EXCEEDED` | 409 | BR-005/BR-036 (capacidad superada; sobreocupación sin `allowOverOccupation`) |
| `DISTRIBUTION_EXCEEDS_TOTAL` | 409 | BR-034 (suma de segmentos distribuidos > total de la carga) |
| `INVALID_TRANSITION` | 409 | BR-016 (transición no válida en la máquina de estados) |
| `INVALID_ALERT_TRANSITION` | 409 | Transición de AlertStatus no válida |
| `DUPLICATE_OPERATION` | 409 | Idempotency-Key reutilizada con body distinto |
| `MAP_ELEMENT_CONFLICT` | 409 | Elemento de plano duplicado/superpuesto (OQ-015) |
| `BUSINESS_RULE_VIOLATION` | 422 | Regla BR incumplida; `details.rule` obligatorio (BR-006/007 y otras) |
| `UNIT_INCOMPATIBLE` | 422 | BR-035 (unidades incompatibles; conversión NO soportada v1 — OQ-044) |
| `CARGO_TOTAL_REQUIRED` | 422 | BR-042: distribución parcial sin `totalQuantity`/`totalUnit` declarados — mensaje sugerido: "La carga debe declarar cantidad total y unidad antes de distribuirse parcialmente." `details: { rule: 'BR-042', cargoId }` |
| `LOCATION_HAS_CARGO` | 422 | PATCH de ubicación a INACTIVE/MAINTENANCE con carga presente |
| `RATE_LIMITED` | 429 | Rate limit superado |
| `INTERNAL_ERROR` | 500 | Error no tipado (bug) |
| `SERVICE_UNAVAILABLE` | 503 | Dependencia caída / readiness fallido |
| `DB_TIMEOUT` | 504 | Timeout de query/transacción Prisma |

> Los códigos marcados como "convención W5" (`UNSUPPORTED_MEDIA_TYPE`) se agregan al catálogo de este documento y a `API.md` cuando el orquestador confirme el doc. El resto ya aparece en `API.md` §3/§5/§6.

## 5. Criterios de aceptación

1. El 100% de las respuestas de error tienen el envelope `{ error: { code, message, requestId } }` (verificable con tests de contrato W8; `details` opcional).
2. Ninguna response de producción contiene stack trace, secreto o dato personal (test automático de "no leak" en QA).
3. Toda excepción de dominio del catálogo §4.2 existe con su `appCode` y `httpStatus`; services que incumplen BR lanzan la excepción correspondiente con `details.rule` cuando aplica (incluida `CargoTotalRequiredException` → `CARGO_TOTAL_REQUIRED`, BR-042).
4. Los errores Prisma se traducen según §4.5 (P2002 → 409 duplicado; timeout → 504; conexión → 503).
5. Logs de error con `requestId` correlacionable con la response; sin campos sensibles (auditoría de logs en code review).
6. `BR-006`/`BR-007` (observación obligatoria) llegan como `422 BUSINESS_RULE_VIOLATION` con `details.rule` si se detectan fuera del DTO, y como `400 VALIDATION_ERROR` si el DTO los captura.

## 6. Archivos involucrados

- `docs/backend/ERROR-HANDLING.md` (este), `API.md` (§3 y errores por endpoint), `API-CONVENTIONS.md` (§4.3/§4.4/§4.11), `VALIDATION.md` (mapeo BR → error), `DTOs.md`, `BACKEND-ARCHITECTURE.md` (§5.1/§5.5)
- `docs/MASTER-SPEC.md` (§6 BR, §10 envelope, §15 estándares), `docs/OPEN-QUESTIONS.md` (OQ-012 idioma)
- `docs/architecture/ADR/ADR-003-NestJS.md` (filtros/interceptores), ADR-007, ADR-010 (auditoría), ADR-011 (soft delete); `docs/architecture/SECURITY.md` (W2)

## 7. Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Filtro catch-all que "traga" errores de dominio (los convierte en 500 genéricos) | Jerarquía §4.2 + tests que verifican el mapeo de cada excepción (W8) |
| Fuga de detalles de infraestructura por un filtro mal configurado | R-02/R-06 + test de no-leak en producción |
| Códigos duplicados o colisiones entre módulos | Catálogo único §4.9; agregar códigos solo con revisión de contrato |
| P2002 mal mapeado (confunde constraints) | Mapeo por `meta.target` del constraint, tabla §4.5 |
| Logs con datos sensibles por descuido (bodies, tokens) | Lista negra §4.7, revisión en code review y política de logs (W9 LOGGING) |
| Mensajes i18n futuros cambian el texto y rompen expectativas de QA | QA depende de `code`/`httpStatus`, nunca de `message` (documentado en W8) |

## 8. DECISIÓN PENDIENTE

> Las OQ referenciadas quedaron **resueltas en FASE 0** (MASTER-SPEC v0.5 / OPEN-QUESTIONS, 2026-09-23/24): las filas tachadas con `→ RESUELTA` ya tienen decisión canónica; las marcadas **🔶** son **residuales locales** sin resolver (decisión de seguridad/implementación, no de negocio).

| # | Pregunta | Impacto | Referencia |
| --- | --- | --- | --- |
| 1 | ~~¿`INVALID_TRANSITION` es 409 o 422? API.md §5.6 lo lista 409 y §5.4 lo lista 422. Este documento fija **409** (conflicto de estado, §4.3)~~ → **RESUELTA (2026-09-23, ID-002)**: **409 canónico**; API.md §5.4/§5.6 y VALIDATION.md BR-016 ya coinciden | Error contract movimientos/cargos | ID-002 (resuelta 2026-09-23) |
| 2 | ¿`INVALID_CREDENTIALS` con mensaje genérico aceptado como única estrategia anti-enumeración? | auth | 🔶 Residual local de seguridad W2 (SECURITY.md) |
| 3 | ~~¿Catálogo i18n de mensajes en v1 (es) o solo infraestructura lista?~~ → **RESUELTA (OQ-012, 2026-09-24)**: solo **es-AR** en v1 con arquitectura i18n lista (módulo de traducciones/tokens); sin conmutador runtime (OQ-034) | §4.8 | OQ-012 (resuelta 2026-09-24) |
| 4 | ¿Retry automático en `P2034` (conflicto transaccional) o solo documentado? | §4.5 | 🔶 Residual local QA W8 + decisión de implementación |
| 5 | ¿`UNSUPPORTED_MEDIA_TYPE` (415) se agrega a `API.md` §3? | Catálogo común | 🔶 Residual local — confirmación del orquestador al publicar este documento |
| 6 | ~~¿Operador puede leer auditoría de operaciones propias o solo ADMIN?~~ → **RESUELTA (OQ-019 → §8 RBAC / §4.4 decisión 19, 2026-09-24)**: **OPERATOR ve SOLO sus propios eventos** (login, movimientos, cambios que él hizo); **ADMIN ve todo**; Viewer sin acceso a auditoría | 403 en `GET /audit` | OQ-019 (resuelta 2026-09-24) |