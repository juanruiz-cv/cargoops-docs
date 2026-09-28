# API-CONVENTIONS.md — Convenciones de la API REST de CargoOps

> Grupo W5 — Backend. Convenciones transversales de la API REST bajo `/api/v1` (MASTER-SPEC §10, ADR-007). Complementa `API.md` (contratos por endpoint), `DTOs.md` (shape de datos) y `ERROR-HANDLING.md` (envelope de error y catálogo de códigos).

---

## 1. Objetivo

Definir las convenciones únicas que aplican a TODOS los endpoints de CargoOps: envelopes de respuesta, códigos HTTP, paginación/filtros/orden, versionado de contrato, naming de endpoints, idempotencia, formato de fechas, Content-Type, headers de trazabilidad, rate limiting, CORS y el rol de OpenAPI/Swagger como fuente de contratos. Todo endpoint documentado en `API.md` debe cumplir estas convenciones sin excepciones locales.

## 2. Contexto

MASTER-SPEC §10 fija el marco canónico: **REST bajo `/api/v1`, JSON, OpenAPI/Swagger**; success envelope `{ "data": ... }` con `meta` opcional; error envelope `{ "error": { "code", "message", "details?", "requestId" } }`; paginación `?page=&limit=` (+ `sort`, `filter`) con límites por defecto 25/100; versionado de contrato `/api/v1` y breaking changes → `/api/v2`. ADR-007 (Accepted) formaliza: sin HATEOAS, contrato OpenAPI generado desde código como fuente única, verbos semánticos (`DELETE` = soft delete, nunca borrado físico), sin GraphQL en v1. `BACKEND-ARCHITECTURE.md` §5.1 materializa el bootstrap: `app.setGlobalPrefix('api/v1')`, ValidationPipe global, Swagger en `/api/v1/docs` (solo dev/staging o `SWAGGER_ENABLED=true`).

## 3. Restricciones

| # | Restricción | Origen |
| --- | --- | --- |
| R-01 | Toda respuesta (éxito o error) usa el envelope correspondiente; nunca respuestas "desnudas" ni errores HTML. | MASTER-SPEC §10 |
| R-02 | Un endpoint NO redefine paginación, fechas, headers o naming por su cuenta; hereda estas convenciones. | Este documento |
| R-03 | Los códigos de aplicación (error) son estables en inglés y versionados con el contrato; los mensajes son español neutral (UI es-AR, i18n futura — OQ-012). | DTOs.md §2, MASTER-SPEC §16 |
| R-04 | Campos JSON en `camelCase`; paths en minúsculas; IDs de recurso UUID; timestamps ISO 8601 UTC. | DTOs.md §3 (R-03/R-04), DATABASE.md §5.1 |
| R-05 | No exponer stack traces, secretos ni datos de terceros en las respuestas (ni en errores). | BACKEND-ARCHITECTURE §3 R-06, ERROR-HANDLING.md |
| R-06 | Breaking changes del contrato requieren `/api/v2`; v1 nunca se rompe en caliente. | MASTER-SPEC §10, ADR-007 |

## 4. Decisiones

### 4.1 Base URL y transporte

- Base URL: `https://<host>/api/v1`. El prefijo se configura una sola vez en `main.ts` (`setGlobalPrefix('api/v1')`, BACKEND-ARCHITECTURE §5.1); ningún controller repite el prefijo.
- Formato único: **JSON** (UTF-8). Sin HATEOAS ni XML. Los clientes son conocidos y el contrato OpenAPI es la fuente (ADR-007).
- Transporte: HTTPS obligatorio en staging/production (ver SECURITY.md de W2). WebSockets quedan fuera de REST (reservados para notificaciones in-app futuras, OQ-011 — ADR-007).

### 4.2 Envelope de éxito

Toda respuesta exitosa se envuelve en `{ "data": ... }`. Listados paginados agregan `meta` (forma canónica en DTOs.md §4.12):

```jsonc
// Recurso simple (detalle)
{ "data": { "id": "uuid", "code": "029TERRA26", "status": "STORED" } }

// Listado paginado
{ "data": { "items": [ /* ... */ ],
  "meta": { "page": 2, "limit": 25, "totalItems": 431, "totalPages": 18, "hasNext": true } } }
```

Reglas:
- Un recurso simple va directamente en `data` (objeto), no anidado en `items`.
- Los listados SIEMPRE son `{ items, meta }`; nunca un array directo.
- `meta` se genera con un helper/type compartido (`PaginatedDto<T>`, DTOs.md §4.12); no se compone campo a campo por endpoint.
- Operaciones de acción sin representación (ej. `logout`) devuelven `{ "data": { "success": true } }` (API.md §4.3).

### 4.3 Envelope de error

```jsonc
{ "error": { "code": "CAPACITY_EXCEEDED", "message": "La ubicación no tiene capacidad disponible",
             "details": { "locationId": "uuid", "capacity": 200, "capacityUnit": "AREA", "occupiedCapacity": 200 },
             "requestId": "7b8f1c2e-..." } }
```

- `code`: código de aplicación estable, en inglés (catálogo completo en `ERROR-HANDLING.md` §4.9). Nunca cambia de texto sin versar el contrato.
- `message`: español neutral, apto para mostrar al usuario final (UI es-AR). Sin detalles técnicos.
- `details?`: opcional; datos estructurados del error (errores de campo, regla BR violada, contexto).
- `requestId`: id de trazabilidad, siempre presente y correlacionable con logs (ver §4.11).
- Detalle completo (jerarquía de excepciones, filtros, mapeo) en `ERROR-HANDLING.md`.

### 4.4 Códigos HTTP

Tabla canónica común a todos los endpoints (coherente con API.md §3):

| HTTP | Uso | Ejemplos en CargoOps |
| --- | --- | --- |
| 200 OK | Lectura, PATCH/PUT exitosos, operaciones síncronas | `GET /cargos`, `PATCH /cargos/:id` |
| 201 Created | Creación de recursos | `POST /cargos`, `POST /cargos/:id/movements` |
| 202 Accepted | Procesamiento asíncrono aceptado | `POST /cargos/:id/export-pdf` (si PDF asíncrono, OQ-005) |
| 400 Bad Request | Body/query malformado, campos no permitidos, tipos inválidos | `VALIDATION_ERROR` |
| 401 Unauthorized | Token ausente, expirado o inválido | `UNAUTHORIZED`, `INVALID_CREDENTIALS` |
| 403 Forbidden | Token válido pero sin permiso | `FORBIDDEN` (BR-009/010/011) |
| 404 Not Found | Recurso inexistente (o soft-deleted) | `CARGO_NOT_FOUND`, `LOCATION_NOT_FOUND` |
| 409 Conflict | Conflicto de estado/unicidad | `CAPACITY_EXCEEDED`, `DISTRIBUTION_EXCEEDS_TOTAL`, `LOCATION_INACTIVE`, `INVALID_TRANSITION`, códigos duplicados |
| 415 Unsupported Media Type | `Content-Type` distinto de `application/json` (convención W5 — ver §4.10) | `UNSUPPORTED_MEDIA_TYPE` |
| 422 Unprocessable Entity | Regla de negocio incumplida (validación semántica) | `BUSINESS_RULE_VIOLATION` (detalle `{ rule: 'BR-006' }`), `LOCATION_HAS_CARGO`, `UNIT_INCOMPATIBLE` (BR-035) |
| 429 Too Many Requests | Rate limit superado | `RATE_LIMITED` (ver §4.12) |
| 500/503/504 | Fallo interno / dependencia caída / timeout de DB | `INTERNAL_ERROR`, `SERVICE_UNAVAILABLE`, `DB_TIMEOUT` |

Reglas:
- `404` se devuelve también para recursos **soft-deleted** (un cargo eliminado es indistinguible de inexistente para clientes no privilegiados) — ADR-011.
- `204 No Content` NO se usa en v1: el envelope `{ data }` es consistente en todas las respuestas (incluidos DELETE soft, que devuelven el recurso marcado).
- `405 Method Not Allowed` y otros errores de infraestructura del framework se normalizan al envelope (ver ERROR-HANDLING.md §4.4).

### 4.5 Paginación, filtros y sort

- **Paginación offset** (por defecto): `?page=` (≥ 1) y `?limit=` (1–100, default 25). MASTER-SPEC §10; validado en `ListQueryDto` (DTOs.md §4.11).
- **Paginación cursor**: obligatoria para tablas append-only de alto volumen (`audit_logs`; `movements` si el historial crece) — ADR-007 / DATABASE.md §5.7. Cursor por `(id, moved_at)`; los endpoints que la usen la documentan explícitamente en `API.md` (no se mezclan estilos en un mismo endpoint).
- **Sort**: `?sort=campo` (ascendente) o `?sort=-campo` (descendente), lista separada por comas (`?sort=-entryDate,code`). Default `-createdAt`. Formato validado por regex en `ListQueryDto`.
- **Filter**: formato string `campo:valor` separado por comas: `?filter=status:STORED,locationId:<uuid>`. Endpoints con filtros específicos (`code`, `search`, `truckId`, `alert`, `from`/`to`) se documentan en sus query DTOs (DTOs.md §4.11). Solo se permiten campos declarados en el query DTO del endpoint (whitelist); campos desconocidos → 400 `VALIDATION_ERROR`.
- `meta` del listado: `{ page, limit, totalItems, totalPages, hasNext }` (para cursor: `{ nextCursor, hasNext }`).
- Los filtros se aplican SIEMPRE server-side; nunca se trae una página completa para filtrar en cliente.

### 4.6 Naming de endpoints

- **Recursos en plural, minúsculas**: `cargos`, `locations`, `maps`, `users`, `trucks`, `roles`, `alerts`, `notifications`, `settings`, `movements`.
- **Sub-recursos** para relaciones: `GET/POST /cargos/:id/movements`, `POST /users/:id/roles`, `PUT /maps/:id/elements/:elementId`.
- **Acciones** (verbos) solo cuando no existe un sustantivo de recurso natural y la acción no es CRUD: `auth/login`, `auth/refresh`, `auth/logout`, `cargos/:id/export-pdf`, `movements/:id/revert`. En paths compuestos de acción se usa guion: `export-pdf`. Nunca camelCase ni snake_case en paths.
- **Verbos semánticos** (ADR-007): `GET` lectura · `POST` creación/acciones · `PATCH` actualización parcial · `PUT` reemplazo (solo usado en `roles/:id/permissions`) · `DELETE` soft delete (nunca borrado físico desde la API).
- Respuesta a `POST` que crea recurso: `201` + `Location` header con la URL del recurso creado.
- Un endpoint NO mezcla nombre de recurso y verbo (`/cargos/move` está prohibido; es `POST /cargos/:id/movements`).

### 4.7 Versionado y evolución de contrato

- Contrato actual: **v1** bajo `/api/v1` (ADR-007). El versionado es por URL, no por header.
- **Cambios aditivos** (nuevo campo opcional en response, nuevo endpoint, nuevo valor de enum aditivo) NO rompen el contrato → se entregan en v1.
- **Breaking changes** (renombrar/eliminar campos, cambiar tipo o semántica de un valor, cambiar status codes, cambiar reglas de validación existentes) → **`/api/v2`**. Nunca se rompe v1 en caliente.
- Deprecación: se documenta con ventana de migración (header `Deprecation` + `Sunset` recomendados, fecha de retiro explícita en `API.md` y en Swagger); v1 se mantiene al menos hasta el retiro anunciado.
- La coexistencia v1/v2 en el mismo despliegue es responsabilidad de configuración de rutas del monolito (ADR-001), no duplicación de módulos de dominio: los controllers versionan el contrato, los services se comparten.

### 4.8 Idempotencia

- **Idempotencia natural**: `GET`, `PATCH` y `DELETE` (soft) son idempotentes por construcción (repetirlos no cambia el resultado semántico). `logout` de un refresh token ya revocado devuelve `200` (API.md §4.3).
- **Operación de movimiento** (`POST /cargos/:id/movements`): cabecera opcional **`Idempotency-Key`** (recomendada; BACKEND-ARCHITECTURE §5.5, API.md §5.6):

| Caso | Comportamiento |
| --- | --- |
| Primera llamada con `Idempotency-Key: K` | Se procesa, se persiste `K → movementId` (mismo dato que el `metadata` del movimiento) y se devuelve `201` |
| Misma `K` + mismo body (replay, p. ej. retry de red) | Se devuelve el movimiento original (`200`/`201` con el mismo `data`) sin crear duplicado |
| Misma `K` + body distinto | `409` `DUPLICATE_OPERATION` (mal uso de la clave) |
| Otra `K` + mismo body | Se procesa como operación nueva (dos movimientos legítimos; el cliente es responsable del dedupe si no usa la clave) |

- Almacenamiento de claves: tabla/columna técnica con TTL (24 h propuesto) y limpieza por job de mantenimiento (ver `JOBS.md` §4.6). La garantía es best-effort ante crash entre commit y persistencia de clave: el diseño no debe bloquear el negocio; el dedupe real de efecto doble se mitiga con la transacción atómica y auditoría.
- Otros endpoints de escritura repetibles (notas, PATCH) no requieren la clave; si el riesgo de doble click se confirma en QA, se extiende la convención por endpoint en `API.md`.

### 4.9 Fechas y zonas horarias

- **Formato de transporte**: ISO 8601, siempre UTC con sufijo `Z` en respuestas (`2026-09-23T09:20:00Z`). DTOs.md R-04; DATABASE.md (`timestamptz`).
- **Entrada**: ISO 8601 aceptado con offset (`2026-09-20T10:00:00-03:00`); se normaliza a UTC al persistir.
- **Fechas de negocio** (ej. `entryDate` como base de permanencia): el dato canónico se guarda en UTC; la presentación y los cálculos de negocio (permanencia, `dueAt`) usan la **zona horaria del predio**, configurable — OQ-008 resuelta (2026-09-23): base = `entryDate` (primer CargoLocation ACTIVE), días **corridos**, alertas a los 30 y 40 días (BR-014/015).
- Rangos de consulta (`from`/`to`) se interpretan en la zona del predio a menos que el cliente envíe offset explícito (documentado por endpoint en `API.md`).

### 4.10 Content-Type y serialización

- Requests con body: `Content-Type: application/json` (charset UTF-8). Otro tipo → `415` `UNSUPPORTED_MEDIA_TYPE`.
- Responses: `Content-Type: application/json; charset=utf-8`.
- `DELETE`/`GET` sin body por defecto: no se envía body; si llega, se ignora (no es error). **Excepción v1**: `DELETE /cargos/:id/locations/:cargoLocationId` (egreso de segmento de distribución) acepta body JSON con `observation` obligatoria (BR-006/039) — documentada en API.md §5.12. Ninguna otra operación `DELETE` recibe body.
- Descargas binarias (PDF síncrono si OQ-005/ADR-013 lo adoptan) se sirven con su propio `Content-Type` (`application/pdf`) y `Content-Disposition`; quedan FUERA del envelope JSON (excepción documentada; el resto de la API conserva el envelope). Si el export es asíncrono, la API devuelve JSON `202` con `exportId` + `downloadUrl` firmada (API.md §5.7).
- JSON con números: `numeric` de Postgres se serializa como número; montos/cantidades grandes sin precisión binaria se documentan por campo (no aplica a v1: `quantity`/`capacity` son `numeric(14,2)` y se tratan como números).

### 4.11 Headers

| Header | Dirección | Uso |
| --- | --- | --- |
| `Authorization: Bearer <accessToken>` | Request | Autenticación (todos los endpoints salvo `auth/login`, `auth/refresh` y `health`). JWT — ADR-008 |
| `X-Request-Id` | Request/Response | **El servidor** genera un UUID si el cliente no lo envía; se devuelve SIEMPRE en la response y en `requestId` del envelope de error; correlaciona logs y auditoría (AuditLog.metadata.requestId — DATABASE.md §5.3) |
| `X-Correlation-Id` | Request (opcional) | Id del cliente para correlacionar una transacción de negocio entre llamadas; el servidor lo propaga a jobs/asincronía y logs |
| `Idempotency-Key` | Request (opcional) | Operaciones idempotentes (ver §4.8) |
| `X-RateLimit-Limit` / `X-RateLimit-Remaining` / `X-RateLimit-Reset` | Response | Cuando el endpoint aplica rate limit (ver §4.12; formato estándar) |
| `Location` | Response | URL del recurso creado en `POST` (201) |
| `Deprecation` / `Sunset` | Response | Endpoints deprecados (ver §4.7) |

- `X-Request-Id` se implementa con middleware (BACKEND-ARCHITECTURE §5.1); `requestId` del envelope de error DEBE ser el mismo valor.
- Autenticación v1 = header Bearer para el access token + **cookie httpOnly** `refresh_token` para el refresh (ADR-008; SECURITY.md S1 resuelta 2026-09-25). No hay cookies de sesión clásicas; `COOKIE_SECURE` controla el flag `Secure` de la cookie refresh (solo producción) — BACKEND-ARCHITECTURE §5.1.

### 4.12 Rate limiting

- Envelope ante límite: `429` `RATE_LIMITED` con `message` y `requestId` (ya canónico en API.md §3).
- Alcance exacto (global vs solo auth/brute-force) es decisión de seguridad de W2 (`SECURITY.md`) — DECISIÓN PENDIENTE (API.md §13 #5). Mínimo confirmado por API.md: login/refresh protegidos (`429` listado en sus errores).
- Cuando aplique, se informa en headers `X-RateLimit-*` (§4.11) y la estrategia (token bucket por IP/usuario) se documenta en W2/DEVOPS; los parámetros se configuran por entorno.

### 4.13 CORS

- Orígenes permitidos desde configuración: `CORS_ORIGINS` (lista blanca por entorno, BACKEND-ARCHITECTURE §5.1). Sin wildcard `*`: el refresh viaja en cookie, así que CORS requiere `credentials: true` y el frontend llama con `withCredentials` desde un origen whitelisted (con `SameSite=Strict` el navegador solo envía la cookie en peticiones del mismo sitio).
- Configuración de plataforma Nest/Express: métodos `GET, POST, PATCH, PUT, DELETE, OPTIONS`; headers permitidos: `Content-Type, Authorization, X-Request-Id, X-Correlation-Id, Idempotency-Key`; headers expuestos: `X-Request-Id, X-RateLimit-*, Location, Deprecation, Sunset, Content-Disposition`.
- Preflight `OPTIONS` respondido por la plataforma; no requiere manejo por controller.

### 4.14 OpenAPI/Swagger como fuente de contratos

- **Contrato vivo**: `@nestjs/swagger` genera el documento desde DTOs y decoradores (BACKEND-ARCHITECTURE §5.7); es la fuente de verdad para frontend y QA — nunca se mantiene un spec duplicado a mano.
- Por endpoint: tags por módulo (`Auth`, `Cargos`, `Locations`, `Maps`, `Movements`, `Trucks`, `Users`, `Roles`, `Alerts`, `Audit`, `Dashboard`, `Notifications`, `Settings`, `Health`), `@ApiResponse` para los HTTP posibles (400/401/403/404/409/422) con su código de aplicación, y description de cada campo.
- Documentación: descripciones en español neutral (mismo idioma que los mensajes); ejemplos reales de cargas (`029TERRA26`) en los schemas.
- Exposición: `/api/v1/docs` solo en dev/staging, o en producción únicamente con `SWAGGER_ENABLED=true` tras revisión de seguridad.
- Contrato por versión: v1 tiene su documento; v2 generaría el suyo (ver §4.7).

### 4.15 Cantidades y unidades en distribución (BR-032..040, secciones 62-70)

Convenciones que aplican a todo contrato que maneje distribución M:N Cargo↔Location (API.md §5.9-5.12, §6.4-6.5; DTOs.md §4.4.1):

| # | Convención |
| --- | --- |
| C-01 | `quantity` y `quantityUnit` van SIEMPRE juntos en payloads y respuestas de segmentos; nunca uno sin el otro. Excepción relativa: `percentage` como alternativa en movimientos parciales (BR-037). |
| C-02 | `percentage` es **informativo/derivado** en v1: el backend calcula con `quantity`/`totalQuantity`; el frontend puede mostrarlo pero NO debe usarlo como fuente autoritativa de cálculo. Semántica final → OQ-045. |
| C-03 | El frontend **NUNCA suma unidades incompatibles** (m² + toneladas + pallets): la ocupación se computa server-side en la unidad compatible de la ubicación (BR-035). Los agregados se exponen desglosados por unidad (`segmentsByUnit` en `GET /locations/:id/capacity`, API.md §6.5). |
| C-04 | El "en camión" se representa como **residual derivado** = `totalQuantity − Σ CargoLocation activos` (unidades compatibles, BR-038), NO como segmento; el frontend no crea segmentos "en camión". Modelo del camión → OQ-042. |
| C-05 | El total de la carga se expone como `totalQuantity`/`totalUnit`; `Σ segmentos ≤ total` (BR-034) se valida en backend, nunca en el cliente. |
| C-06 | Unidades compatibles o `PERCENT` para sumar; conversión entre unidades NO soportada en v1 (OQ-044) → `UNIT_INCOMPATIBLE` 422 (BR-035). |

## 5. Criterios de aceptación

1. Toda respuesta de la API del repositorio `cargoops-backend` (futuro) cumple el envelope `{ data }` / `{ error }` sin excepciones locales.
2. Todos los endpoints de `API.md` usan exactamente la tabla HTTP §4.4 y los códigos del catálogo `ERROR-HANDLING.md` §4.9.
3. Ningún endpoint define formato propio de paginación/fechas/sort/filter distinto al de este documento (verificable con code review + tests de contrato W8).
4. Swagger generado en `/api/v1/docs` refleja las convenciones (envelopes tipados, errores por endpoint, tags por módulo).
5. `X-Request-Id` se propaga a logs y al `requestId` de errores en todos los endpoints y jobs asíncronos.
6. No existe ningún endpoint con breaking change no versionado: v1 es estable mientras esté vigente.

## 6. Archivos involucrados

- `docs/backend/API-CONVENTIONS.md` (este), `API.md`, `DTOs.md`, `ERROR-HANDLING.md`, `VALIDATION.md`, `JOBS.md`, `BACKEND-ARCHITECTURE.md`, `MODULES.md`
- `docs/MASTER-SPEC.md` (§10, §16), `docs/OPEN-QUESTIONS.md`
- `docs/architecture/ADR/ADR-007-REST-API.md`, ADR-003, ADR-008, ADR-011; `docs/architecture/DATABASE.md` (W2)
- `docs/architecture/SECURITY.md` (W2 — rate limiting, CORS, HTTPS)

## 7. Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Endpoints que se desvían del envelope "por comodidad" (respuestas desnudas en casos de éxito simple) | Convención R-01 + tests de contrato y code review; interceptor global de transformación (BACKEND-ARCHITECTURE §5.2) |
| Filtros `filter=campo:valor` frágiles o inyectables | Whitelist de campos en query DTOs + validación del formato; sin interpolación SQL (Prisma parametriza) |
| Cambios "aditivos" que resultan breaking en la práctica (cambio de semántica de un valor existente) | Revisión de contrato en code review con este documento; tests de compatibilidad en QA (W8) |
| `Idempotency-Key` mal usada genera confusión operativa (misma clave, bodies distintos) | Comportamiento documentado §4.8 y `409 DUPLICATE_OPERATION` explícito |
| Descarga binaria rompe el envelope (PDF síncrono) | Excepción documentada §4.10 con su contrato; resto de la API conserva el envelope |
| Swagger expuesto en producción | Solo por `SWAGGER_ENABLED=true` explícito (BACKEND-ARCHITECTURE §5.1/§5.7) |

## 8. DECISIÓN PENDIENTE

> Las OQ referenciadas quedaron **resueltas en FASE 0** (MASTER-SPEC v0.5 / OPEN-QUESTIONS, 2026-09-23/24): las filas tachadas con `→ RESUELTA` ya tienen decisión canónica; las marcadas **🔶** son **residuales locales** sin resolver (decisión de seguridad/presentación/implementación, no de negocio).

| # | Pregunta | Impacto | Referencia |
| --- | --- | --- | --- |
| 1 | ¿Rate limiting global o solo en auth? ¿Parámetros y estrategia (por IP/usuario)? | §4.12 (429) | 🔶 Residual local de seguridad W2 — API.md §13 #5 |
| 2 | ¿Formato definitivo de `filter` (string `campo:valor` vs objetos estructurados) confirmado por el orquestador? | §4.5 / ListQueryDto | 🔶 Residual local — DTOs.md §10 #4 (OQ a proponer) |
| 3 | ~~¿PDF síncrono (binario, excepción del envelope) o asíncrono 202+downloadUrl?~~ → **Generación RESUELTA (OQ-005 → ADR-013 Accepted, 2026-09-24)**: **HTML→PDF server-side con Chromium/Puppeteer**; decisión síncrono-binario vs `202+downloadUrl` como **residual local de presentación** (PDF-EXPORT.md §5.3) | §4.10, §4.4 (202) | OQ-005 / ADR-013 (generación resuelta 2026-09-24) |
| 4 | ¿TTL de `Idempotency-Key` (24 h propuesto) y persistencia best-effort aceptados? | §4.8 | 🔶 Residual local (OQ a proponer si QA lo exige) |
| 5 | ~~¿`GET` o `POST` para `/cargos/:id/export-pdf`? MASTER-SPEC §10 y ADR-013 lo listan `GET`; API.md §5.7 lo documenta `POST`.~~ → **RESUELTA (2026-09-23, OQ-017/ID-001)**: se adopta `POST /api/v1/cargos/:id/export-pdf`; MASTER-SPEC §10/§11.6 (v0.4), API.md §5.7 y ADR-013 alineados | Contrato export-pdf | ✅ Resuelta (OQ-017) |
| 6 | ~~¿Semántica autoritativa o derivada de `percentage` en CargoLocation?~~ → **RESUELTA (OQ-045 → BR-049, 2026-09-24)**: `quantity`/`quantityUnit` son la fuente de verdad; `percentage` es derivado de UI e informativo salvo unidad `PERCENT` (donde es la cantidad misma); no coexisten dos fuentes | §4.15 (C-02) | OQ-045 (resuelta 2026-09-24) |
| 7 | ~~¿El "en camión" se modela como Location (LocationType CAMION) o como residual derivado?~~ → **RESUELTA (OQ-042 → BR-042)**: residual derivado, nunca Location; expuesto como `inTruckAmount`/`inTruckUnit`; `CARGO_TOTAL_REQUIRED` 422 sin total declarado | §4.15 (C-04) | OQ-042 (resuelta 2026-09-23) |