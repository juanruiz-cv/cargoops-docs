# CargoOps — Logging (Estructura y Correlación)

> Grupo: DevOps/Plataforma (W9) · FASE 0 — documentación.
> Estado: borrador alineado con `MASTER-SPEC.md` v0.1. Los ejemplos JSON son **ilustrativos/referenciales**.
> Fuente de verdad canónica: `MASTER-SPEC.md` §10 (`requestId` en envelope de error), §4.1/§4.3 (`AuditLog`, `AuditAction`), §6 (BR-017 privacidad), §14 (logs), `ADR-010` (auditoría en DB, no en logs), `docs/backend/BACKEND-ARCHITECTURE.md` (middleware de requestId en `main.ts`).

---

## 1. Objetivo

Definir el estándar de logging de CargoOps: niveles y formato (JSON estructurado), campos obligatorios y recomendados, correlación de registros mediante `requestId` (y `userId`/`action`), separación clara entre **logs operacionales** (efímeros, rotados) y **auditoría** (`AuditLog` en DB, ADR-010 — sin duplicación), saneamiento de datos sensibles (BR-017) y política de retención/rotación por ambiente.

## 2. Contexto

El dominio canónico exige trazabilidad total: los **movimientos y cambios de estado** se registran en la tabla `AuditLog` (append-only, ADR-010) dentro de la misma transacción de negocio; eso es **auditoría**, no logging. Los logs de aplicación existen aparte con otro propósito: diagnóstico operativo, errores de runtime, métricas de comportamiento y correlación con los errores que el usuario reporta (el envelope de error de la API devuelve `requestId`, `MASTER-SPEC.md` §10).

El backend NestJS (`main.ts`, `BACKEND-ARCHITECTURE.md`) ya define un **middleware de requestId/correlation ID** y un interceptor/logging global; este documento fija el contenido, formato y ciclo de vida de esos registros. `ERROR-HANDLING.md` (W5) define el catálogo de errores; los logs lo referencian por `error.code` sin duplicar su contenido.

Flujo de los registros y consumidores:

```
app (api/web/job-worker) --stdout (JSON por línea)--> aggregador (Loki/ELK, MONITORING.md §5.7)
        ├─> DevOps / on-call: diagnóstico y alertas (Grafana, MONITORING.md §5.4)
        ├─> Backend (W5): debugging con requestId
        └─> QA: evidencia de defectos vía requestId reportado por el usuario
AuditLog (PostgreSQL, ADR-010) ──> única fuente de trazabilidad (consulta GET /api/v1/audit)
```

Consumidores esperados: DevOps Engineer (operación, alertas), backend on-call (diagnóstico), QA (reproducción de defectos con `requestId`); ningún consumidor usa los logs para reconstruir historia de negocio (eso es `AuditLog`).

## 3. Restricciones

- **FASE 0 = documentación**; los ejemplos JSON son referenciales. La implementación (logger, serializers, middleware) la decide el grupo backend (W5) dentro de este estándar.
- **Los logs NO son fuente de auditoría** (ADR-010, alternativa 3 rechazada): los logs rotan y se descartan; `AuditLog` es la única fuente de verdad de trazabilidad. Prohibido loguear eventos de auditoría como sustituto o duplicado sistemático.
- **Nunca registrar** passwords, tokens JWT/refresh, headers `Authorization`/`Cookie`, DSNs con credenciales (`DATABASE_URL`, `REDIS_URL`), claves S3, datos personales (BR-017), contenido de observaciones ni payloads completos de PATCH/POST.
- `NODE_ENV=production` en staging/producción (`ENVIRONMENTS.md` §5.2): `debug` solo en development; `LOG_FORMAT=pretty` solo local.
- El `requestId` es generado por el backend y **propagado, no inventado por el frontend**; el frontend lo reenvía para correlación, pero es el backend quien lo asigna como fuente de verdad.

## 4. Dependencias

| Dependencia | Documento |
| --- | --- |
| Middleware de requestId y filtro de excepciones | `docs/backend/BACKEND-ARCHITECTURE.md` §main.ts · `docs/backend/ERROR-HANDLING.md` (W5) |
| Envelope de error con `requestId` | `docs/MASTER-SPEC.md` §10 |
| Auditoría en DB (modelo, acciones, retención) | `ADR-010` · `docs/MASTER-SPEC.md` §4.1/§4.3 |
| Variables `LOG_LEVEL`, `LOG_FORMAT` | `devops/ENVIRONMENTS.md` §5.1/§5.2 |
| Stack de agregación de logs y alertas | `devops/MONITORING.md` §5.4 · `devops/DEVOPS.md` §5.6 |
| Privacidad (BR-017) | `docs/MASTER-SPEC.md` §6 · `docs/architecture/SECURITY.md` |
| Jobs y correlación de colas (OQ-007 resuelta: en v1) | `docs/architecture/ADR/ADR-012` · `FEATURES_JOBS` (`ENVIRONMENTS.md`) |

## 5. Decisiones

### 5.1 Niveles y configuración por ambiente

| Nivel | Uso | `LOG_LEVEL` por ambiente (`ENVIRONMENTS.md` §5.2) |
| --- | --- | --- |
| `error` | Fallos de runtime, excepciones no controladas, dependencias caídas (DB/Redis/S3) | `production`: `info` (baja a `warn` en picos para reducir ruido, propuesta) |
| `warn` | Degradaciones recuperables, reintentos, rate limiting, jobs fallidos recuperables | `staging`: `info` |
| `info` | Eventos operativos de flujo: login exitoso? NO — eso es auditoría; aquí: inicio de app, migraciones, jobs completados, deploys | `development`: `debug` |
| `debug` | Detalle de trazado interno (sin datos sensibles) | Solo development; jamás en staging/producción |
| `trace` | Reservado para troubleshooting puntual sobre pedido on-call | No activar por defecto |

Regla: **los logs de éxito de operaciones de negocio se evitan por diseño** — "carga creada", "movimiento registrado" viven en `AuditLog` (auditoría), no en el log operacional (evita duplicación y ruido; ver §5.4).

### 5.2 Formato: JSON estructurado en una línea

Un solo objeto JSON por línea, a **stdout** (el agente de logs lo captura; nunca escribir a archivos dentro del contenedor salvo retención local puntual). Campos:

**Obligatorios** (contrato mínimo de `DEVOPS.md` §5.6 para correlación y filtrado):

| Campo | Tipo | Descripción |
| --- | --- | --- |
| `timestamp` | string | ISO 8601 **en UTC** (`2026-09-23T17:05:12.123Z`); la zona local del predio (`TZ`, `ENVIRONMENTS.md`) es responsabilidad de la presentación, no del log |
| `level` | string | `trace \| debug \| info \| warn \| error` |
| `service` | string | `api` \| `web` (SSR) \| `migrate` \| `job-worker` |
| `requestId` | string | UUID generado por el middleware (ver §5.3) |
| `userId` | string \| null | ID del usuario autenticado (rol/sesión), `null` en anónimo (login) |
| `action` | string | Verbo semántico corto: `http.request`, `job.start`, `job.done`, `db.migration`, `auth.login_failed`, `app.startup` (NO reemplaza `AuditAction`) |

**Recomendados** (alto valor de diagnóstico): `message`, `method`, `path` (normalizado con `:id`), `statusCode`, `durationMs`, `env`, `version` (tag SemVer), `commit`, `error.code` (catálogo de `ERROR-HANDLING.md` §5), `err.message`/`err.stack` (solo error), `jobId` (BullMQ — OQ-007 resuelta), `traceId` (reservado para tracing distribuido futuro).

Ejemplo referencial:

```json
{ "timestamp": "2026-09-23T17:05:12.123Z", "level": "error", "service": "api",
  "requestId": "9f1c2b3a-6d4e-4f8a-9c2b-1a2b3c4d5e6f", "userId": "u_42",
  "action": "http.request", "method": "POST", "path": "/api/v1/cargos/:id/movements",
  "statusCode": 422, "durationMs": 89, "env": "production", "version": "1.4.2",
  "error": { "code": "OBSERVATION_REQUIRED", "message": "Observación obligatoria (BR-006)" } }
```

### 5.3 Correlación por `requestId`

- El **middleware de requestId** de `main.ts` (`BACKEND-ARCHITECTURE.md`) genera un UUID por request entrante: usa el header `X-Request-Id` si el cliente lo envía (para correlar con el frontend) o genera uno nuevo — y **siempre** lo propaga en la respuesta y en el envelope de error (`MASTER-SPEC.md` §10).
- Todos los logs de una misma request llevan ese `requestId` (middleware + interceptor);
- **Frontend**: el interceptor de HTTP (`FRONTEND-ARCHITECTURE.md` §interceptors) adjunta `X-Request-Id` en las llamadas y muestra el `requestId` del error al usuario (soporte); el frontend NO genera el ID, lo reenvía.
- **Jobs (OQ-007 resuelta)**: cada job recibe el `requestId` original de la request que lo encoló (para colas se usa `jobId` como correlación del procesamiento + `requestId` del origen); `job.start`/`job.done` comparten ambos campos.
- **Logs del sistema** (app.startup, migraciones, CRON inline si `FEATURES_JOBS=cron-inline`) usan `requestId` nulo y `action` de sistema; la correlación entre ellos es `version` + `commit`.
- El `requestId` se conserva en la cadena API → jobs → errores reportados, de modo que "el usuario reporta error `9f1c2b…`" resuelve en segundos el trazado completo en el agregador de logs (`MONITORING.md`).

### 5.4 Auditoría vs operacional (sin duplicar)

| Aspecto | Auditoría (`AuditLog`) | Log operacional (este documento) |
| --- | --- | --- |
| Persistencia | PostgreSQL, tablas append-only, REVOKE UPDATE/DELETE (ADR-010) | Agregador efímero (Loki/ELK), rotación en días |
| Activación | Dentro de la transacción de negocio (movimiento + audit, ADR-010) | Interceptor/middleware global + eventos puntuales |
| Contenido | `userId`, `action` (AuditAction), `entity`/`entityId`, `previousValue`/`newValue`, `ip`, `userAgent`, `metadata` (con requestId) | Diagnóstico: errores, tiempos, dependencias, flujo técnico |
| Consulta | `GET /api/v1/audit` (permiso `audit.read`, ADMIN) | Grafana/Loki, acceso DevOps |
| Retención | 3 años operativos + archivado (a confirmar, ADR-010) | 30 días caliente + 90 archivados (propuesta §5.6) |

**Regla de no duplicación**: los logs operacionales NO registran "carga X movida a sector Y" (eso es `AuditLog`); registran el desempeño/error de esa operación. El puente entre ambos es el `requestId` que vive en `AuditLog.metadata` y en los logs — correlación sin duplicación.

### 5.5 Saneamiento (nunca passwords/tokens/datos personales)

| Fuente de riesgo | Regla |
| --- | --- |
| Headers de auth (`Authorization`, `Cookie`, `x-api-key`) | Redacción automática en serializer: `"[REDACTED]"` |
| Campos conocidos (`password`, `passwordHash`, `token`, `secret`, `apiKey`, `refreshToken`) | Redacción por patrón de nombre de campo, con y sin mayúsculas |
| DSNs con credenciales (`DATABASE_URL`, `REDIS_URL`, `S3_*`) | Loggear solo el host/name sin credenciales; nunca el DSN completo |
| Cuerpo de requests PATCH/POST | Nunca loguear el body completo; solo `bodyKeys: [...]` si es útil |
| Observaciones y datos de cargas | Los códigos de carga y textos de observación no van a logs ni métricas (mismo umbral que `MONITORING.md` §3) |
| Errores de librerías (stack traces con env vars) | `err.stack` revisado por el filtro de excepciones global (`ERROR-HANDLING.md`) |
| Errores de Prisma con DSN embebido | El error de conexión se traduce a código de app; el raw con datos de conexión se redacta |

Implementación: un **serializer único** aplicado en el middleware/interceptor (no "a mano" en cada módulo) + tests de QA que inyectan payloads con secretos y verifican redacción (`qa/`, caso de seguridad); cualquier secreto detectado en logs → alerta y revisión (`CI-CD.md` §5.5 política de secrets).

Referencia de comportamiento del serializer (ILUSTRATIVO, no es código final):

```ts
// serializer de redacción — ILUSTRATIVO/REFERENCIAL
const SENSITIVE_KEYS = /password|token|secret|api[_-]?key|authorization|cookie|dns|url/gi
const SENSITIVE_HEADERS = ["authorization", "cookie", "x-api-key", "proxy-authorization"]

function sanitize(entry) {
  entry.headers = pick(entry.headers, SENSITIVE_HEADERS.map(() => "[REDACTED]"))
  entry.body = undefined                    // nunca loguear payloads
  entry.dsn  = redactCredentials(entry.dsn) // postgres://user:****@host/db
  return deepRedact(entry, SENSITIVE_KEYS)  // patrón de campo, con/sin mayúsculas
}
```

El serializer corre ANTES de emitir la línea; los tests de saneamiento inyectan payloads con valores conocidos (`PASS=supersecreto`, `Bearer eyJ...`) y fallan si aparecen en la salida.

### 5.6 Retención y rotación

| Ambiente | Destino | Rotación/Retención (propuesta) |
| --- | --- | --- |
| development | Consola (`LOG_FORMAT=pretty`) | Sin retención |
| staging | stdout JSON → agregador (Loki propuesto, `DEVOPS.md` §5.6) | 15 días |
| production | stdout JSON → agregador | 30 días caliente + 90 días archivados (backup en S3/object storage, `BACKUP-RECOVERY.md`) |

- Rotación: los contenedores escriben a stdout (sin archivos); la retención la gobierna el agregador (Loki/ELK) y el tamaño del índice — se monitorea en `MONITORING.md` §5.4 (disco).
- Cualquier log a archivo (solo troubleshooting puntual) usa rotación por tamaño/día (10 MB / diario, 7 archivos) en volumen efímero.
- La retención de logs **no aplica a auditoría**: `AuditLog` sigue ADR-010 con política propia; el archivado de auditoría es job de retención (ADR-012) y su backup lo cubre `BACKUP-RECOVERY.md`.
- Período de gracia: en el deploy de un cambio, los logs de la versión anterior se conservan el tiempo completo de la ventana de observación (30 min, `MONITORING.md` §5.5) para comparación; el agregador filtra por `version`/`commit`.
- Los logs archivados (90 días) se mueven al bucket de backups con la misma política de cifrado y retención de `BACKUP-RECOVERY.md` §5.1/§5.4; nunca se reutiliza el bucket de objetos de negocio.

### 5.7 Correlación en la práctica — trazado de extremo a extremo

Walkthrough ilustrativo del flujo (escenario real: un operador mueve una carga con observación y el job de alerta de rezago falla):

1. El frontend envía `POST /api/v1/cargos/:id/movements` con header `X-Request-Id: 9f1c…` (reenviado del ID que recibió del backend en la request anterior, o ausente → el backend genera uno nuevo).
2. El middleware del backend responde con el `requestId` final en la respuesta; el interceptor de logging emite `http.request` 200/422 con `requestId`, `userId`, `action`, `durationMs` (`ERROR-HANDLING.md` regula el código de error).
3. La transacción de negocio inserta el movimiento **y** el `AuditLog` con `metadata: { requestId }` (ADR-010) — misma transacción.
4. El mismo request encola el job de alerta: `job.enqueued` registra `requestId` + `jobId`; el worker emite `job.start`/`job.done` (o `job.failed`) con ambos campos (OQ-007 resuelta: en v1; la variante `cron-inline` quedó como alternativa dev descartada para prod — JOBS.md §4.12).
5. Si el job falla, el error de negocio NO está en el log (es reconstruible desde `AuditLog`), pero la alerta técnica `job.failed` dispara la regla `BullMQFailed` de `MONITORING.md` §5.4.
6. El usuario reporta un error de UI que muestra `requestId` (`MASTER-SPEC.md` §10): soporte busca `requestId` en el agregador y obtiene en segundos la cadena request → transacción → job → evento.

Regla operativa: **ningún log de un flujo transaccional se emite sin `requestId`**, salvo eventos de sistema (startup, migración, cron) que llevan `version`+`commit` como correlación.

### 5.8 Checklist de revisión de logging en PRs

Se aplica en code review (se agrega a `docs/STANDARDS.md` W10 y a los criterios de QA):

| # | Pregunta | Regla |
| --- | --- | --- |
| 1 | ¿El log usa el logger estándar (serializer) en vez de `console.log` directo? | Obligatorio — `console.*` prohibido en producción |
| 2 | ¿Incluye los campos obligatorios automáticamente (no a mano)? | Sí — si el middleware/interceptor no los cubre, el caso no mergea |
| 3 | ¿Loguea éxito de operación de negocio ("carga creada")? | NO — eso es auditoría (ADR-010); corregir a no-loguear o a log técnico con `action` técnico |
| 4 | ¿Pasa el body completo, headers de auth o DSN a algún parámetro del log? | NO — sanitizar por campo o redactar (sección §5.5) |
| 5 | ¿Incluye el `error.code` del catálogo (`ERROR-HANDLING.md`) en vez de solo `message`? | Sí — para correlación con alertas de `MONITORING.md` |
| 6 | ¿Respetó `LOG_LEVEL` y no dejó `debug` en flujos calientes? | Sí — `debug` solo trazado interno, nunca payloads |
| 7 | ¿Evita loguear el mismo evento dos veces (interceptor + módulo)? | Sí — un solo registro por evento |

### 5.9 Logging del frontend (`web`)

El frontend Angular no emite logs operacionales propios a un agregador (no tiene acceso a red interna ni credenciales): el logging del frontend se limita a:

| Evento | Destino | Regla |
| --- | --- | --- |
| Errores no controlados / excepciones de app | Sentry (`MONITORING.md` §5.3) | Con `release` = tag SemVer y el `requestId` de la request asociada si existe; saneado por `beforeSend` |
| Errores de API | UI (envelope con `requestId`, `MASTER-SPEC.md` §10) | El `requestId` se muestra al usuario y se reenvía en la siguiente request como `X-Request-Id` (§5.3); NO se loguea payload de error en consola |
| Web vitals / rendimiento | Métricas agregadas (`MONITORING.md` §5.2, opcional v1) | Sin datos personales ni códigos de carga |
| Consola de desarrollo | `console.*` solo en `development` (`LOG_LEVEL=debug`) | En builds de staging/prod el bundler elimina los `console.*` de negocio (lint rule) |

El frontend nunca loguea datos de dominio (cargas, observaciones, sector) en consola ni en Sentry: ante un error de UI se envía solo contexto técnico (ruta, componente, código de error, `requestId`).

### 5.10 Campos según contexto (resumen de trazado)

| Contexto | `action` típico | Campos adicionales relevantes | `requestId` |
| --- | --- | --- | --- |
| HTTP (API) | `http.request` | `method`, `path` (normalizado), `statusCode`, `durationMs`, `error.code` | Sí (obligatorio) |
| Job BullMQ (OQ-007 resuelta) | `job.start` / `job.done` / `job.failed` | `jobId`, `queue`, `attempts`, `durationMs` | Sí (origina la cola); `jobId` como clave de correlación del proceso |
| CRON inline (`FEATURES_JOBS=cron-inline`) | `jobs.cron` | `job.name`, `durationMs`, `error.code` | Nulo — correlación por `version`+`commit` |
| Sistema (arranque, migración) | `app.startup` / `db.migration` | `version`, `commit`, `migrations` aplicadas | Nulo (system) |
| Auth (login/refresh) | `auth.login_failed` / `auth.token_refreshed` | `reason` (motivo del fallo, sin credenciales) | Sí |

## 6. Criterios de aceptación

- [ ] Niveles y `LOG_LEVEL` por ambiente definidos, coherentes con `ENVIRONMENTS.md` §5.2.
- [ ] Formato JSON con campos obligatorios (`timestamp`, `level`, `service`, `requestId`, `userId`, `action`) y recomendados documentados.
- [ ] Correlación por `requestId` definida para API, frontend (header `X-Request-Id`), jobs y errores del envelope (`MASTER-SPEC.md` §10).
- [ ] Auditoría vs operacional separados sin duplicación (ADR-010); puente por `requestId` en `AuditLog.metadata`.
- [ ] Saneamiento por serializer único con patrones explícitos y tests de QA previstos.
- [ ] Retención/rotación por ambiente con valores propuestos y vínculo a `MONITORING.md` y `BACKUP-RECOVERY.md`.
- [ ] Ejemplos JSON identificados como referenciales y libres de datos sensibles.

## 7. Archivos involucrados

- `devops/LOGGING.md` (este documento) · `devops/MONITORING.md` · `devops/ENVIRONMENTS.md` §5.1/§5.2 · `devops/DEVOPS.md` §5.6 · `devops/BACKUP-RECOVERY.md` §5.6
- `docs/MASTER-SPEC.md` §10/§14 · `docs/backend/ERROR-HANDLING.md` y `docs/backend/BACKEND-ARCHITECTURE.md` (W5) · `docs/architecture/ADR/ADR-010` · `docs/architecture/SECURITY.md` (privacidad BR-017)
- Futuro repo: `cargoops-backend` (logger/serializer/middleware), `cargoops-infrastructure` (loki/ELK config) — `MASTER-SPEC.md` §22

## 8. Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Secretos en logs (DSN, tokens, bodies) | Serializer único + redacción por patrón + tests de QA de saneamiento (§5.5) |
| Duplicación auditoría/operacional → ruido y datos en ubicación equivocada | Regla de no-duplicación §5.4 + code review de logging |
| `requestId` ausente (nulables) rompiendo trazabilidad | Middleware obligatorio en `main.ts` (BACKEND-ARCHITECTURE), validado por tests de correlación |
| Logs sin retención controlada que llenan disco | stdout + retención en agregador + alerta de disco (`MONITORING.md` §5.4) |
| `debug` activado en producción → fuga de volumen/datos | Validación en CI: `LOG_LEVEL` incompatibles con `NODE_ENV` fallan el deploy (`ENVIRONMENTS.md` §8) |
| Dependencia de un agregador específico (Loki) | Formato estándar (JSON a stdout) es transportable a ELK/CloudWatch sin tocar la app |

## 9. DECISIÓN PENDIENTE

Las preguntas con OQ asignada quedaron **resueltas en MASTER-SPEC v0.5 (2026-09-24)**; los ítems 1–3 y 5 no tienen OQ asignada y se conservan como residuales locales:

| # | Pregunta | Impacto | Resolución |
| --- | --- | --- | --- |
| 1 | ¿Grafana Loki vs ELK vs agente del proveedor cloud? | Costo de retención, consultas, integración con alertas | 🔶 Pendiente local — sin OQ asignada; no bloquea la app: estándar JSON a stdout transportable |
| 2 | ¿Retención operacional de logs (propuesta 30 días caliente + 90 archivados)? | Presupuesto del agregador, cumplimiento regulatorio del predio | 🔶 Pendiente local — sin OQ asignada; el vínculo OQ-016 quedó resuelto (RPO/RTO adoptados) y no fija retención de logs operacionales |
| 3 | ¿Nivel por defecto en producción ante picos (`info` estable vs `warn`)? | Costo del agregador | 🔶 Pendiente local — sin OQ asignada; se parametriza con `LOG_LEVEL` y se decide con la operación |
| 4 | ~~¿Correlación de jobs con campos `jobId`/eventos de cola o cron inline?~~ | Correlación de jobs | ✅ **RESUELTA (OQ-007)** — **Redis + BullMQ en v1** (ADR-012 Accepted): `jobId` y eventos `job.start`/`job.done`/`job.failed` **activos**; el CRON inline queda como alternativa dev descartada para prod (JOBS.md §4.12) |
| 5 | ¿Idioma de los `message` de logs (español vs inglés)? | Legibilidad en herramientas/agregadores | 🔶 Pendiente local — la UI es es-AR (OQ-012/034 resuelta: idioma de UI, sin conmutador runtime); el idioma de `message` (propuesta: inglés) queda como decisión del equipo sin OQ asignada |