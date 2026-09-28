# ADR-007 — REST API

- Estado: Accepted
- Fecha: 2026-09-23
- Decisores: Equipo CargoOps / Software Architect

## Contexto

El frontend Angular (ADR-002) y el backend NestJS (ADR-003) necesitan un contrato de integración estable, versionado y autodocumentado. El MASTER-SPEC fija en §10 y §11.2 la convención: **REST bajo `/api/v1`, JSON, OpenAPI/Swagger**, envelope `{ data }` / `{ error }`, paginación `?page=&limit=`, y endpoints canónicos (login/refresh, cargos CRUD + movements, locations, maps, dashboard, alerts, audit, export-pdf). El dominio es CRUD-pesado y de consulta acotada (listados paginados, detalle, timeline, ocupación), con operaciones de escritura transaccionales (movimiento + observación + auditoría) y una máquina de estados validada en backend (BR-016).

## Decisión

Adoptar **REST** como estilo de API para v1, con estas convenciones canónicas (MASTER-SPEC §10):

- Base URL: `/api/v1`. **Versionado de contrato por URL**; breaking changes de v1 → v2 (nunca romper v1 en caliente). Deprecación documentada con ventana de migración.
- **JSON** como formato único; UTF-8; Content-Type/HATEOAS no requerido (los clientes son conocidos y el contrato OpenAPI es la fuente).
- **Envelope de éxito**: `{ "data": ... }` con `meta` opcional para paginación (`page`, `limit`, `total`). **Envelope de error**: `{ "error": { "code", "message", "details?", "requestId" } }` con HTTP status correcto y `requestId` trazable en logs (MASTER-SPEC §10; detalle en `backend/ERROR-HANDLING.md`).
- **Paginación** `?page=&limit=` (defaults 25, máximo 100) + `sort` y `filter` explícitos por endpoint; nunca paginación offset en tablas append-only de alto volumen (AuditLog: cursor — ver ADR-010).
- **OpenAPI/Swagger** generado desde el código (`@nestjs/swagger`, ADR-003) como contrato vivo; los DTOs se reutilizan entre capas y no se duplican contratos (MASTER-SPEC §10).
- **Verbos semánticos**: `GET` lectura, `POST` creación/acciones (login, movements), `PATCH` actualización parcial, `DELETE` = soft delete (ADR-011; nunca borrado físico desde la API).
- **Endpoints canónicos v1**: los listados en MASTER-SPEC §10 (auth/login, auth/refresh, cargos, cargos/:id/movements, locations, maps, dashboard, alerts, audit, cargos/:id/export-pdf), documentados en `backend/API.md`.
- **Sin GraphQL en v1**: el contrato REST + OpenAPI cubre el 100% de los casos de consumo (frontend propio, futuro API externa acotada); GraphQL agregaría costos de resolución, plan de tipos y overfetch/underfetch sin beneficio para listados paginados ni para el mapa (que consume datos estructurados completos de Map/MapElement, MASTER-SPEC §4.1). Además, la validación de reglas de negocio y permisos se centraliza más simple en el middleware REST de NestJS (guards, ADR-008/009). Se **revisitará** GraphQL si: clientes externos con consultas ad-hoc (multi-predio, §1.5), o el dashboard/mapa necesitan agregaciones arbitrarias por cliente.

El estado de decisión es **Accepted** (canónico en MASTER-SPEC §10).

## Alternativas consideradas

1. **GraphQL (Apollo/NestJS).** Rechazada para v1 (justificación en Decisión): complejidad de tipos/resolvers y de caché/costos para un consumo 100% interno con listados predecibles; el timeline de movimientos y el detalle de carga se cubren con endpoints dedicados. Queda como evolución si los clientes se heterogeneizan.
2. **tRPC / RPC tipado.** Rechazada: acopla cliente y servidor al mismo servidor TS (frontend y backend son repos separados, MASTER-SPEC §22) y no produce un contrato consumible por terceros; REST + OpenAPI mantiene el contrato desacoplado del lenguaje.
3. **WebSockets como transporte principal.** Rechazada: la operación es request/response (CRUD + consultas); WebSockets quedan reservados para notificaciones in-app futuras (MASTER-SPEC §4.1 Notification, OQ-011) sin reemplazar REST.
4. **REST sin versionar (solo `/api`) con evolución aditiva.** Rechazada: el MASTER-SPEC exige versionado `/api/v1`; sin él, cambios de contrato rompen clientes sin rutas de migración claras.

## Consecuencias

**Positivas:**

- Contrato simple, cacheable y auditable (cada endpoint mapea a una acción de negocio; los `AuditAction` del MASTER-SPEC §4.3 se corresponden con operaciones de API — ADR-010).
- OpenAPI vivo → generación de clientes, tests de API y documentación sin drift (MASTER-SPEC §14).
- Versionado explícito da confianza para evolucionar el contrato en el roadmap (v2 bajo demanda).

**Negativas:**

- Endpoints múltiples pueden provocar N+1 en el frontend (detalle de carga + timeline + alertas en llamadas separadas): se mitiga con endpoints agregados (`/cargos/:id` con include opcional, `filter`/`sort` server-side).
- GraphQL no está disponible para consultas ad-hoc si aparecen antes de lo previsto: la revisión está fechada en el roadmap (revisitar en v1.1).
- Overhead de convenciones (envelopes, paginación, requestId) que deben aplicarse consistentemente: managers/interceptors de NestJS lo garantizan (ADR-003).

## Referencias

- MASTER-SPEC §10 (convención API completa), §11.2 (stack), §4.3 (AuditAction), §6 (BR-016), §18 (fases).
- ADR-003 (NestJS + OpenAPI), ADR-008/009 (guards auth/RBAC en el middleware), ADR-006 (API de mapa), ADR-013 (export-pdf).
- `backend/API.md`, `backend/API-CONVENTIONS.md`, `backend/ERROR-HANDLING.md` (grupo W5).