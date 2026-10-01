# CargoOps — Matriz de Casos de Prueba (TEST-CASES)

> Grupo W8 (QA) · FASE 0 — solo documentación · Fuente canónica: `docs/MASTER-SPEC.md`
> Estado: borrador v0.2 · Fecha: 2026-09-23 (ampliación §§62-70: distribución M:N Cargo↔Location, BR-032..BR-040) · Autor: Grupo QA (QA lead)
> Documentos hermanos: `QA-STRATEGY.md` (estrategia) · `TEST-PLAN.md` (plan por fases) · `E2E-SCENARIOS.md` · `ACCEPTANCE-CRITERIA.md`

---

## Objetivo

Definir la matriz de casos de prueba de CargoOps (TC-001..TC-076) con precondiciones, pasos, resultados esperados, prioridad y tipo, cubriendo obligatoriamente: crear carga, mover carga, movimiento sin observación (falla, BR-006), exceder capacidad (falla, BR-005), ubicación inactiva (falla, BR-004), permisos (Viewer no mueve, BR-010/016), reversión Admin con historial (BR-012), alerta de 30 días (generación, no auto-movimiento, decisión humana, BR-014/015), exportación PDF (BR-018), edición de plano (BR-020), búsqueda/filtros/paginación, y login/refresh/expiración. Cada caso es trazable a una BR del MASTER-SPEC §6 y a la fase del `TEST-PLAN.md` que lo ejecuta. La ampliación 0.2 (§§62-70) agrega la cobertura de distribución M:N: CargoLocation (BR-032/033), suma distribuida ≤ total (BR-034), capacidad por unidad (BR-035), sobreocupación (BR-036), movimientos parciales (BR-037), descarga parcial (BR-038), alta/egreso de segmentos (BR-039) y consultas de distribución (BR-040) — casos TC-065..TC-076.

## Contexto

CargoOps implementa reglas críticas de trazabilidad y permisos: observación obligatoria en todo movimiento/estado (BR-006/BR-007), capacidad de ubicaciones (BR-005), máquina de estados validada en backend (BR-016), RBAC de 3 roles (BR-009..BR-012), soft delete + auditoría (BR-013) y alertas de rezago con decisión humana (BR-014/BR-015). El régimen M:N de distribución (BR-032..BR-040, secciones 62-70) agrega invariantes de datos nuevas: suma distribuida ≤ total de la carga, ocupación de ubicación = Σ de segmentos activos en unidad compatible y movimientos parciales con cantidad/porcentaje. Los assays de HTTP y códigos de aplicación se alinean con `docs/backend/API.md` (W5): envelopes `{ data }` / `{ error }`, `400 VALIDATION_ERROR`, `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404`, `409 CONFLICT` (con variantes `CARGO_CODE_DUPLICATE`, `CAPACITY_EXCEEDED`, `LOCATION_INACTIVE`, `INVALID_TRANSITION`, `DUPLICATE_OPERATION`), `422 BUSINESS_RULE_VIOLATION` (con `detail.rule`), `429 RATE_LIMITED`. Las variantes de la ampliación §§62-70 son `DISTRIBUTION_EXCEEDS_TOTAL` (BR-034) y `UNIT_INCOMPATIBLE` (BR-035); su código HTTP fino se alinea con `ERROR-HANDLING.md` (W5, ⏳) y aquí se aserta a nivel de código de aplicación. Cuando el código HTTP fina depende de `backend/ERROR-HANDLING.md` (W5, ⏳), el assert se escribe a nivel funcional más el código estándar (401/403/UNAUTHORIZED/FORBIDDEN fijos).

## Restricciones

- FASE 0: solo documentación; ningún `.spec.ts`/`.e2e.ts`/config de CI se produce ahora.
- No redefinir decisiones canónicas del MASTER-SPEC (BR, enums, roles, estados §7, seeds §5, API §10, roadmap §18) ni de `QA-STRATEGY.md`/`TEST-PLAN.md`.
- Cada BR CRÍTICA/ALTA tiene al menos un caso de capa API/integration (mapa de cobertura más abajo); los flujos completos se prueban en `E2E-SCENARIOS.md`.
- Operación de egreso (EXITED): OQ-004 → **BR-043 resuelta (2026-09-23)** — el egreso SÍ está en la línea base v1; se diseñan casos de EXIT (movimiento con observación obligatoria, `EXITED` terminal; DP-QA-9 cerrada).
- Idioma del contenido: español profesional/neutral; IDs técnicos en inglés (TC-XXX). UI objetivo WCAG 2.2 AA (MASTER-SPEC §12).
- Sin placeholders vacíos: toda ambigüedad real se registra en la sección `DECISIONES PENDIENTES` y se reporta al orquestador.

## Dependencias

| Dependencia | Motivo |
| --- | --- |
| `docs/MASTER-SPEC.md` | BR-001..BR-020, seeds §5, estados §7, RBAC §8, API §10 |
| `docs/backend/API.md` (W5, ✅) | Códigos HTTP, códigos de aplicación, envelopes y shapes para asserts |
| `docs/backend/ERROR-HANDLING.md` · `VALIDATION.md` (W5, ⏳) | Catálogo de errores fina y máquina de estados de movimientos (TC-024/TC-025) |
| `docs/qa/QA-STRATEGY.md` | Pirámide, cobertura §4, escala de prioridad de casos §8, datos/fixtures §6 |
| `docs/qa/TEST-PLAN.md` | Citación de TC-XXX por fase y paquetes de trabajo |
| `docs/qa/E2E-SCENARIOS.md` | Escenarios ESC-XXX que ejercitan estos casos de punta a punta |
| `docs/product/PRD.md` (W1, ✅) | Vínculo RF-XXX / FEATURE-XXX / US-XXX por caso |
| OPEN-QUESTIONS OQ-001/005/008/009/015 (resueltas 2026-09-23/24) | Reglas que condicionan asserts (duplicado BR-002, PDF ADR-013, alerta 30d BR-014/015, capacidad BR-041, editor fuera de v1 OQ-015) |

## Decisiones

1. **Numeración**: TC-001..TC-076 continuos. TC-001..TC-054 coinciden 1:1 con las citas del `TEST-PLAN.md` (fases 1-13); TC-055..TC-064 extienden la cobertura (notas, XSS, rate limit, rotación de refresh, idempotencia, descargas, camiones, reversión no autorizada) sin alterar las citas ya publicadas; TC-065..TC-076 cubren la distribución M:N (secciones 62-70, BR-032..BR-040: CargoLocation, capacidad por unidad, movimientos parciales, descarga parcial).
2. **Fuente de asserts**: `API.md` (W5) para códigos y nombres de error; donde el catálogo aún no existe (W5 ⏳), el assert es funcional (comportamiento observado) más 401/403 estándar.
3. **Datos**: seeds del MASTER-SPEC §5 replicados por ambiente — incluidos los segmentos de distribución M:N (`029TERRA26` → Sector 3 20 m² + Sector 4 35 m²; Sector 4 con 3 cargas = 80/100 m²; `036TERRA26` camión → 60/40); fixtures dinámicos para fechas de permanencia (`entryDate = hoy − 31/29 días`) según `QA-STRATEGY.md` §6 (OQ-008 resuelta 2026-09-23: días **corridos**, base `entryDate` → fixtures definitivos; DP-QA-5 cerrada); usuarios de fixture `viewer.test`, `operator.test`, `admin.test`.
4. **Prioridad de caso (P0/P1/P2)**: criticidad para la cobertura obligatoria de BR; es independiente de la escala de defectos S/P del `QA-STRATEGY.md` §8. Los casos citados como P0 en el `TEST-PLAN.md` se mantienen P0 aquí.
5. **Tipo multietiqueta permitido** (ej. `API / integration`): indica las capas donde el caso debe ejecutarse (una sola implementación puede satisfacer varias).
6. **Cadena de fallo**: cuando un caso valida que "nada se persiste", el assert incluye verificación de ausencia de efectos colaterales (sin Movement, sin cambio de locationId, sin Alert nueva, occupiedCapacity intacto).

---

## Matriz de casos

### A. Autenticación y sesión (TC-001..TC-005) — PHASE 2

| ID | Descripción | Precondición | Pasos | Resultado esperado | Prio | Tipo |
| --- | --- | --- | --- | --- | --- | --- |
| TC-001 | Login exitoso entrega tokens y roles | Usuario `operator.test` activo en DB fixture | 1) `POST /api/v1/auth/login` con credenciales válidas | `200` con `{ data: { accessToken, refreshToken, expiresIn: 900, tokenType, user.roles } }`; accessToken autoriza `GET /cargos` | P0 | API / security |
| TC-002 | Login con credenciales inválidas | Usuario inexistente y usuario con password incorrecto | 1) `POST /auth/login` con password errónea 2) con username inexistente | `401 INVALID_CREDENTIALS` en ambos, mismo mensaje genérico; no revela existencia del usuario; sin token emitido | P0 | API / security |
| TC-003 | Refresh token válido renueva sesión | Sesión activa vía login | 1) `POST /auth/refresh` con `refreshToken` vigente | `200` con nuevo par de tokens; sesión continuable sin re-login (rotación según ADR-008) | P0 | API / security |
| TC-004 | Access token expirado fuerza refresh | Access token con exp corto (fixture/manipulación de reloj) | 1) `GET /cargos` con token expirado 2) `POST /auth/refresh` 3) reintentar `GET /cargos` con token nuevo | Paso 1 → `401 UNAUTHORIZED`; paso 2 → `200`; paso 3 → `200` (recuperación sin re-login) | P0 | API / security |
| TC-005 | Logout revoca el refresh token | Sesión activa | 1) `POST /auth/logout` 2) reutilizar el refreshToken revocado | Paso 1 → `200 { data: { success: true } }`; paso 2 → `401 REFRESH_TOKEN_REVOKED`; acceso con accessToken remanente sigue negado tras expiry | P0 | API / security |

### B. RBAC y autorización (TC-006..TC-010) — PHASE 2

| ID | Descripción | Precondición | Pasos | Resultado esperado | Prio | Tipo |
| --- | --- | --- | --- | --- | --- | --- |
| TC-006 | Viewer no puede crear carga | Sesión `viewer.test` | 1) `POST /cargos` con body válido | `403 FORBIDDEN` (BR-010); sin registro creado (GET no lo muestra) | P0 | API / security |
| TC-007 | Viewer no puede mover carga | Sesión `viewer.test`; cargo seed `029TERRA26` (Sector 4) | 1) `POST /cargos/:id/movements` con observación válida | `403 FORBIDDEN` (BR-010/BR-016); locationId y occupiedCapacity intactos | P0 | API / security |
| TC-008 | Operator no ejecuta acciones administrativas | Sesión `operator.test` | 1) `PATCH /maps/:id` 2) `PUT /roles/:id/permissions` 3) `PATCH /settings` 4) revocar un movimiento | `403 FORBIDDEN` en los 4 (BR-011); sin cambios ni auditaría admin | P0 | API / security |
| TC-009 | Admin ejecuta el set completo | Sesión `admin.test` | 1) crear carga 2) mover con observación 3) revertir 4) editar plano 5) soft delete + restore | Todas `2xx` (BR-012/BR-013/BR-020); auditoría presente en cada acción | P0 | API / integration |
| TC-010 | Endpoints protegidos sin token | Sin sesión | 1) `GET /cargos`, `/locations`, `/maps`, `/dashboard`, `/alerts`, `/audit` y `POST /cargos/:id/movements` sin `Authorization` | `401 UNAUTHORIZED` en todos; ningún dato expuesto | P0 | API / security |

### C. Gestión de cargas y consultas (TC-011..TC-017) — PHASE 3

| ID | Descripción | Precondición | Pasos | Resultado esperado | Prio | Tipo |
| --- | --- | --- | --- | --- | --- | --- |
| TC-011 | Crear carga válida | Sesión `operator.test`; `locationId` de Sector 3 | 1) `POST /cargos` con code único, name, entryDate, locationId | `201`; cargo con status `REGISTERED`; código persistido; audit `CREATE`; visible en `GET /cargos` | P0 | API / integration |
| TC-012 | Crear carga sin código | Sesión `operator.test` | 1) `POST /cargos` sin `code` (o vacío) | `400 VALIDATION_ERROR` (BR-001); cargo no creado | P0 | API / unit |
| TC-013 | Código de carga duplicado | Seed `029TERRA26` existente | 1) `POST /cargos` con `code: "029TERRA26"` | `409 CARGO_CODE_DUPLICATE` (BR-002); sin segundo registro (regla exacta de normalización según OQ-001 → BR-002 resuelta: regex `^[A-Z0-9][A-Z0-9./-]{2,31}$`, mayúsculas, case-insensitive) | P0 | API / integration |
| TC-014 | Crear carga con ubicación inexistente | Sesión `operator.test`; uuid aleatorio de location | 1) `POST /cargos` con `locationId` inexistente | `404 LOCATION_NOT_FOUND` (BR-003); cargo no creado | P0 | API |
| TC-015 | Listado paginado de cargas | Seeds §5 aplicados | 1) `GET /cargos?page=1&limit=25` | `200` con `items` (≤ 25), `meta { page, limit, totalItems, totalPages, hasNext }`; orden por defecto `-entryDate` | P0 | API |
| TC-016 | Búsqueda por código heterogéneo | Seeds `JV028/2026CH`, `JV028/2026`, `203/2017CL-LA` | 1) `GET /cargos?search=JV028` 2) `search=203/2017` | Resultados exactos según el término; caracteres especiales (`/`, `-`, `.`) no rompen la búsqueda (BR-002 formato string) | P0 | API |
| TC-017 | Filtros combinados y paginación | Seeds §5; `Sector 4` con 2 cargas | 1) `GET /cargos?filter=status:STORED,locationId:<s4>&page=1&limit=25` 2) filtro inválido (`status:XXX`) | Paso 1 → `200` con meta coherente y solo cargas STORED del sector; paso 2 → `400` | P0 | API |

### D. Movimientos y reglas críticas (TC-018..TC-025) — PHASE 5

| ID | Descripción | Precondición | Pasos | Resultado esperado | Prio | Tipo |
| --- | --- | --- | --- | --- | --- | --- |
| TC-018 | Mover carga con observación | `operator.test`; `029TERRA26` STORED en Sector 4; destino Sector 3 | 1) `POST /cargos/:id/movements` con toLocationId Sector 3 y observation no vacía | `201`; Movement kind `MOVE` con Observation 1:1; segmentos CargoLocation de origen/destino actualizados; occupiedCapacity derivado (Σ unidad compatible); audit `MOVE`; historial con el nuevo registro (BR-006/BR-008) | P0 | API / integration |
| TC-019 | Movimiento sin observación rechazado | `029TERRA26` en Sector 4 | 1) `POST movements` sin campo observation | `422 BUSINESS_RULE_VIOLATION` con `detail.rule: 'BR-006'` (o `400` si lo detecta el DTO); sin Movement, sin cambio de ubicación, occupiedCapacity intacto (BR-006) | P0 | API / unit |
| TC-020 | Observación solo espacios en blanco | `029TERRA26` en Sector 4 | 1) `POST movements` con `observation: "   "` | Rechazada (BR-006: observación no vacía tras trim; regla exacta ver DP-QA-14); sin efectos colaterales | P0 | API / unit |
| TC-021 | Exceder capacidad de ubicación | Sector 5 con `occupiedCapacity == capacity` (tope, unidad compatible; fixtures, QA-STRATEGY §6) | 1) `POST movements` hacia Sector 5 | `409 CAPACITY_EXCEEDED` (BR-005); carga permanece en origen; occupiedCapacity de Sector 5 sin cambios | P0 | API / integration |
| TC-022 | Mover a ubicación inactiva | Ubicación vacía con status `INACTIVE` (seteada por Admin) | 1) `POST movements` hacia la ubicación inactiva | `409 LOCATION_INACTIVE` (BR-004); sin cambio de ubicación ni historial nuevo | P0 | API / integration |
| TC-023 | Mover carga inexistente | uuid inexistente de cargo | 1) `POST /cargos/:uuid/movements` | `404 CARGO_NOT_FOUND` (BR-003) | P0 | API |
| TC-024 | Estado IN_TRANSIT transitorio | `050TERRA26` STORED en Sector 5 | 1) `POST movements` Sector 5 → Sector 3 con observación 2) leer cargo | Al finalizar, el estado es el del destino (`STORED`); `IN_TRANSIT` no queda persistido como estado final (BR-016; detalle de validación en `backend/VALIDATION.md`, W5 ⏳) | P1 | API / integration |
| TC-025 | Transición de estado inválida | Cargo `STORED`; transición no permitida por máquina de estados §7 | 1) `POST movements`/PATCH que intente `STORED → IN_TRUCK` directo | `409 INVALID_TRANSITION` (BR-016); estado y ubicación sin alteración | P0 | API / unit |

### E. Historial, auditoría y reversión (TC-026..TC-030, TC-064) — PHASE 8

| ID | Descripción | Precondición | Pasos | Resultado esperado | Prio | Tipo |
| --- | --- | --- | --- | --- | --- | --- |
| TC-026 | Historial completo y reconstruible | Carga con 3+ movimientos (ingreso, MOVE, descarga) | 1) `GET /cargos/:id/movements` paginado | Línea temporal completa en orden cronológico, sin huecos; cada ítem con `movedAt`, `userId`, `from/to`, `observation` (BR-008) | P0 | API / integration |
| TC-027 | Auditoría con previous/new values | Sesión `operator.test` | 1) `PATCH /cargos/:id` (name) 2) MOVE 3) `GET /audit?entity=Cargo` | Entradas `UPDATE` y `MOVE` con `previousValue`/`newValue` y timestamp (BR-013); visibles para rol autorizado (alcance lectura según API.md §8.4 — DP-QA-15 resuelta: OPERATOR solo eventos propios, ADMIN todo, Viewer sin acceso) | P0 | API / integration |
| TC-028 | Reversión Admin con conservación del historial | Movimiento reciente de `029TERRA26` (Sector 4 → 3) | 1) Admin revierte vía endpoint de reversión | Movement kind `REVERSION` con `reversionOfId`; historial original conservado (BR-012); ubicación/estado restituidos a pre-movimiento; audit `REVERT` con previous/new | P0 | API / integration |
| TC-029 | Soft delete y restore | Sesión `admin.test`; carga sin movimientos críticos | 1) Soft delete 2) `GET /cargos` 3) restore | Eliminada: `deletedAt` seteado y ausente del listado; restore: recuperada y operativa; nunca hard delete físico (BR-013) | P0 | API / integration |
| TC-030 | Auditoría sin datos sensibles | Sesión `admin.test` | 1) ejecutar login, MOVE, PATCH 2) inspeccionar `GET /audit` | Ninguna entrada contiene passwordHash, tokens, datos personales ni PHI (BR-017); IP/userAgent acotados a lo necesario | P0 | API / security |
| TC-064 | Operator no puede revertir | Sesión `operator.test`; movimiento reciente | 1) intentar reversión del movimiento | `403 FORBIDDEN` (BR-011); movimiento original y historial intactos | P1 | API / security |

### F. Alertas de rezago (TC-031..TC-036) — PHASE 9

| ID | Descripción | Precondición | Pasos | Resultado esperado | Prio | Tipo |
| --- | --- | --- | --- | --- | --- | --- |
| TC-031 | Alerta STALE_30D con permanencia > 30 días | Fixture cargo con `entryDate = hoy − 31 días` (OQ-008 resuelta → BR-014/015: días corridos, base `entryDate` — DP-QA-5 cerrada) | 1) ejecutar job real de detección (OQ-007 resuelta → ADR-012: BullMQ en v1) 2) `GET /alerts?type=STALE_30D` | Alerta `STALE_30D` status `OPEN` con `permanenceDays` correcto (BR-014/BR-015); visible en dashboard | P0 | integration / API |
| TC-032 | Sin alerta con permanencia ≤ 30 días | Fixture cargo con `entryDate = hoy − 29 días` (limítrofe) | 1) ejecutar job de detección 2) `GET /alerts?cargoId=...` | Sin alerta nueva para ese cargo (BR-014/BR-015); el cargo no aparece en rezago ni con alerta abierta | P0 | integration / API |
| TC-033 | La alerta NO mueve la carga automáticamente | Cargo con alerta OPEN (mismo de TC-031) | 1) refrescar cargo y movements tras la generación | `locationId` sin cambios y sin Movement nuevo; solo existe el Alert (BR-014: decisión humana) | P0 | integration / API |
| TC-034 | Reconocer alerta con observación | Cargo con alerta OPEN; sesión `operator.test` | 1) `PATCH /alerts/:id` status `ACKNOWLEDGED` con observation | `200`; alerta deja de contar como abierta (dashboard); la observación queda persistida | P0 | API |
| TC-035 | Decisión humana: mover a Rezago con observación | Alerta OPEN reconocida o no | 1) `POST movements` kind `TO_REZAGO` a ubicación Rezago con observación | `201`; cargo status `REZAGO`; alerta asociada → `RESOLVED`; historial con el movimiento (BR-014/BR-006) | P0 | API / integration |
| TC-036 | Mover a Rezago sin observación rechazado | Cargo con alerta OPEN | 1) `POST movements` TO_REZAGO sin observation | `422` (BR-006); cargo permanece en su ubicación; alerta sigue OPEN | P0 | API |

### G. Exportación PDF (TC-037..TC-040) — PHASE 10

| ID | Descripción | Precondición | Pasos | Resultado esperado | Prio | Tipo |
| --- | --- | --- | --- | --- | --- | --- |
| TC-037 | PDF con datos correctos de la carga | Carga seed con movimientos; rol con `cargo.export_pdf` | 1) `POST /cargos/:id/export-pdf` 2) obtener el archivo (200 binario o 202+downloadUrl según ADR-013) 3) parsear/inspeccionar | PDF contiene código, ubicación actual, fechas y movimientos de la carga solicitada (BR-018); formato legible; assert de contenido según DP-QA-11 (estrategia ADR-013/OQ-005 resuelta: HTML→PDF server-side; detalle del assert 🔶 residual local) | P0 | integration / API |
| TC-038 | PDF sin datos de cargas no autorizadas | Carga A en Sector 4; otras cargas en otros sectores | 1) exportar PDF de la carga A | El PDF solo contiene datos de A; ningún código/dato de otras cargas ni de usuarios (BR-018) | P0 | integration / API |
| TC-039 | PDF sin permiso del rol | Rol sin `cargo.export_pdf` (rol restringido si aplica o token Viewer si se confirma alcance) | 1) `POST export-pdf` | `403 FORBIDDEN` (BR-018); sin archivo generado ni exportId | P0 | API / security |
| TC-040 | PDF de carga inexistente | uuid inexistente | 1) `POST /cargos/:uuid/export-pdf` | `404 CARGO_NOT_FOUND` | P0 | API |

### H. Mapa operativo (TC-041..TC-043) — PHASE 6

| ID | Descripción | Precondición | Pasos | Resultado esperado | Prio | Tipo |
| --- | --- | --- | --- | --- | --- | --- |
| TC-041 | Mapa renderiza las 17 ubicaciones | Seeds §5 + `GET /maps/:id` (includeElements) | 1) abrir mapa operativo 2) `GET /maps/:id` | Render SVG con 17 ubicaciones (Plazoleta, Sectores 1-12, Scanner, Balanza, Rezago, Secuestro); elementos estructurados con coordenadas (BR-020) | P0 | E2E / integration |
| TC-042 | Hover sobre ubicación resalta | Mapa cargado | 1) hover sobre Sector 4 | Resaltado visual + tooltip con nombre/código/ocupación; no depende solo del color (MASTER-SPEC §13); focus por teclado equivalente | P0 | E2E / a11y |
| TC-043 | Click en ubicación abre detalle | Mapa cargado; Sector 4 con `029TERRA26`, `032TERRA26` | 1) click en Sector 4 | Panel detalle con cargas presentes y capacidad/ocupación (capacity/occupiedCapacity/availableCapacity) | P0 | E2E |

### I. Editor de planos (TC-044..TC-046) — PHASE 11

| ID | Descripción | Precondición | Pasos | Resultado esperado | Prio | Tipo |
| --- | --- | --- | --- | --- | --- | --- |
| TC-044 | Edición de plano ADMIN persistida | Sesión `admin.test`; mapa `PREDIO-01` | 1) mover/redimensionar Sector 7 en el editor 2) `PATCH /maps/:id` con elements 3) recargar la página | `200` con `version` incrementada; audit `MAP_EDIT`; tras recarga el cambio persiste (BR-020); validación geométrica: editor fuera de v1 (OQ-015 resuelta) — TC-044 se conserva para cuando se implemente (DP-QA-12 cerrada) | P0 | API / integration / E2E |
| TC-045 | Operator rechazado en edición de plano | Sesión `operator.test` | 1) `PATCH /maps/:id` con cualquier cambio | `403 FORBIDDEN` (BR-011); version sin cambios | P0 | API / security |
| TC-046 | Plano como datos estructurados | Mapa con elementos de seed | 1) `GET /maps/:id?includeElements=true` | `elements` con x, y, width, height, rotation, zIndex, fill, stroke, labelPosition (BR-020); no hay imagen estática como fuente | P0 | API / integration |

### J. Dashboard (TC-047..TC-049) — PHASE 7

| ID | Descripción | Precondición | Pasos | Resultado esperado | Prio | Tipo |
| --- | --- | --- | --- | --- | --- | --- |
| TC-047 | KPIs del dashboard correctos | Seeds §5 + alertas seed | 1) `GET /dashboard` | `summary` con totalCargos, byStatus, openAlerts, totalLocations, occupancyByLocation, recentMovements coherentes con los datos cargados | P0 | API / E2E |
| TC-048 | Alertas abiertas visibles en dashboard | Al menos 1 alerta OPEN (seed o fixture TC-031) | 1) abrir dashboard | openAlerts > 0 y las alertas visibles/navegables en la UI del dashboard | P0 | E2E |
| TC-049 | Dashboard requiere sesión | Sin token | 1) `GET /dashboard` | `401 UNAUTHORIZED`; lectura permitida a los 3 roles autenticados (MASTER-SPEC §8) | P0 | API / security |

### K. Seguridad (TC-050, TC-056..TC-058) — transversal

| ID | Descripción | Precondición | Pasos | Resultado esperado | Prio | Tipo |
| --- | --- | --- | --- | --- | --- | --- |
| TC-050 | Inyección SQL/NoSQL en filtros | Sesión autenticada | 1) `GET /cargos?search=' OR 1=1 --` 2) filtros con comillas/`$where` | `200` sin datos extra ni error de servidor, o `400` por filtro inválido; los valores se tratan como literales; nunca `500` | P1 | security / API |
| TC-056 | XSS en observaciones y notas | Sesión `operator.test` | 1) crear movimiento/nota con texto `<script>alert(1)</script>` 2) renderizar en UI | El texto se muestra como texto plano (escapado/sanitizado); sin ejecución de scripts; persistencia intacta | P1 | security / E2E |
| TC-057 | Rate limit en login (brute force) | Sin sesión | 1) N intentos fallidos consecutivos de login (N según `architecture/SECURITY.md`, DP-QA-13) | A partir del N+1: `429 RATE_LIMITED`; ventana de bloqueo aplicada | P1 | security / API |
| TC-058 | Reuso de refresh token tras rotación | Sesión activa | 1) `POST /auth/refresh` 2) reenviar el mismo refreshToken | Primer uso `200`; reuso → `401 INVALID_REFRESH_TOKEN` (rotación/revocación según ADR-008) | P1 | security / API |

### L. Robustez, UX y performance (TC-051..TC-054, TC-059) — PHASE 1/7/12

| ID | Descripción | Precondición | Pasos | Resultado esperado | Prio | Tipo |
| --- | --- | --- | --- | --- | --- | --- |
| TC-051 | Estados de loading y vacíos en listados | DB sin cargas en un filtro específico | 1) abrir listado de cargas/movimientos/alertas con datos o sin ellos | Estados de carga y vacíos visibles y correctos; sin pantallas rotas ni doble submit (DoD §20, MASTER-SPEC) | P2 | E2E / unit |
| TC-052 | Accesibilidad WCAG 2.2 AA (axe) | Flujos P0 operativos | 1) correr axe en CargoTable, ObservationDialog, OperationalMap, ConfirmDialog 2) recorrer con teclado | 0 violations críticas; foco visible y orden correcto; labels/ARIA presentes; mapa con alternativa accesible (listado de ubicaciones/cargas) (MASTER-SPEC §12) | P1 | a11y / E2E |
| TC-053 | Performance smoke de arranque | App en staging; equipo de referencia desktop | 1) medir LCP y render del mapa con 17 ubicaciones | LCP < 2.5 s y render fluido del mapa (QA-STRATEGY §4) | P2 | perf / E2E |
| TC-054 | Performance API de listados y dashboard | Staging con dataset de referencia (seeds + volumen) | 1) `GET /cargos` paginado 2) `GET /dashboard` repetidos | p95 < 300 ms en ambos (QA-STRATEGY §4); regresión > 15% bloquea merge | P1 | perf / API |
| TC-059 | Idempotencia del movimiento | Sesión `operator.test`; `032TERRA26` en Sector 4 | 1) `POST movements` con misma `Idempotency-Key` y mismo body 2 veces 2) con key igual y body distinto | Primer POST `201`; segundo con clave/body idénticos no duplica (mismo resultado); clave con body distinto → `409 DUPLICATE_OPERATION` (API.md §5.6) | P1 | API / integration |

### M. Operaciones complementarias (TC-055, TC-060..TC-063) — PHASE 3/5

| ID | Descripción | Precondición | Pasos | Resultado esperado | Prio | Tipo |
| --- | --- | --- | --- | --- | --- | --- |
| TC-055 | Nota de carga sin movimiento | Cargo seed cualquiera | 1) `POST /cargos/:id/notes` con texto | `201`; la nota queda asociada al cargo; NO genera Movement ni cambia estado (RF-020, US-013) | P2 | API |
| TC-060 | Descarga parcial | Cargo `036TERRA26` IN_TRUCK en Plazoleta | 1) UNLOAD parcial con observación y `quantityMoved` | `201`; estado `PARTIALLY_UNLOADED`; observación obligatoria (BR-007); occupiedCapacity acorde (OQ-041 → BR-041 resuelta: unidad efectiva); modelo v1 unidad simple (OQ-002 resuelta) | P1 | API / integration |
| TC-061 | Descarga total | Cargo IN_TRUCK en Plazoleta | 1) UNLOAD total con observación | `201`; estado `STORED`; historial con el movimiento (BR-007/BR-008) | P1 | API / integration |
| TC-062 | Registrar camión | Sesión `operator.test` | 1) `POST /trucks` con plate única 2) plate duplicada | Paso 1 `201`; paso 2 `409 TRUCK_PLATE_DUPLICATE` (RF-005, US-014) | P2 | API |
| TC-063 | Listado y filtros de camiones | 2+ camiones creados (uno con carga) | 1) `GET /trucks` paginado 2) filtro `withCargo`/`plate` | `200` con items/meta correctos; filtros aplicados (RF-005, US-015) | P2 | API |

### N. Distribución M:N y movimientos parciales (TC-065..TC-076) — PHASE 4/5 (+ TC-074 en PHASE 9)

| ID | Descripción | Precondición | Pasos | Resultado esperado | Prio | Tipo |
| --- | --- | --- | --- | --- | --- | --- |
| TC-065 | Movimiento parcial que supera el total distribuible de la carga | Seed `029TERRA26` con `totalQuantity` 55 m² (Sector 3 20 m² + Sector 4 35 m² = 55 m², unidad AREA) | 1) `POST /cargos/:id/locations` agregando un segmento de 10 m² en Sector 5 (55 + 10 = 65 > 55) | Rechazo con código de aplicación `DISTRIBUTION_EXCEEDS_TOTAL` (BR-034); sin CargoLocation nuevo, sin Movement y con ocupaciones de origen/destino intactas | P0 | API / unit |
| TC-066 | Cantidad en unidad incompatible con la capacidad de la ubicación | Sector 4 con `capacityUnit` `AREA`; carga con distribución en m² | 1) `POST /cargos/:id/locations` a Sector 4 con `quantityUnit: PALLETS` (o `TONS`, `CUBIC_METERS`) | Rechazo con código de aplicación `UNIT_INCOMPATIBLE` (BR-035); **sin conversión en v1** (OQ-044 → BR-048 resuelta; DP-QA-24 cerrada); sin efectos colaterales | P0 | API / unit |
| TC-067 | Exceder capacidad de ubicación sin flag de sobreocupación | Sector 4 con 80 m² ocupados de 100 m² (seeds §5: `029TERRA26` 35 + `032TERRA26` 25 + `050TERRA26` 20), `allowOverOccupation: false`; cargo `037TERRA26` sin segmento | 1) `POST /cargos/:id/locations` a Sector 4 con 30 m² y observación | `409 CAPACITY_EXCEEDED` con `details.rule: 'BR-005'` (flag off → techo = capacidad declarada, sin `overOccupation`/`ceiling` en `details`); sin segmento creado; la ocupación del Sector 4 sigue en 80 m² | P0 | API / integration |
| TC-068 | Sobreocupación habilitada: flag + techo + observación + auditoría | Sector 4 con `allowOverOccupation: true` (seteado por Admin; techo = 100 × 1.10 = **110 m²**); mismo escenario de TC-067 | 1) `POST /cargos/:id/locations` a Sector 4 con 30 m² y observación 2) verificar ocupación 3) inspeccionar auditoría 4) repetir con un delta que exceda el techo (p. ej. otros 30 m²) | 1-3) `201` (110 ≤ techo 110); segmento ACTIVE con observación persistida; `occupiedCapacity` 110 m² (supera la capacidad declarada) y fila de auditoría `CAPACITY_CHANGE` **sobre la ubicación** (entidad `location`) con `metadata.overOccupation: true` (BR-036). 4) `409 CAPACITY_EXCEEDED` con `details.rule: 'BR-036'`, `details.overOccupation: true` y `details.ceiling: 110` — reporta el techo real; `details.capacity` sigue siendo 100. Rol habilitante: **solo ADMIN**; límite default **+10%**; observación obligatoria (OQ-043 → BR-036 ampliada; DP-QA-23 cerrada) | P0 | API / integration |
| TC-069 | Consulta de distribución: carga en N ubicaciones | Seed `029TERRA26` con 2 segmentos ACTIVE (Sector 3 20 m², Sector 4 35 m²) | 1) `GET /cargos/:id/locations` | `200` con los 2 segmentos: locationId, quantity 20/35 m², percentage (informativo/derivado — OQ-045 → BR-049 resuelta), enteredAt, status ACTIVE, exitedAt null; suma distribuida 55 m² = total (BR-032/BR-034/BR-040) | P0 | API / integration |
| TC-070 | Ocupación de una ubicación = Σ de segmentos activos en unidad compatible | Sector 4 con 3 segmentos ACTIVE en m² (35 + 25 + 20) y `capacity` 100 m² | 1) `GET /locations/:id/cargos` 2) `GET /locations/:id/capacity` | `occupiedCapacity` 80 m² y `availableCapacity` 20 m² (unidad AREA); las 3 cargas listadas; un segmento EXITED no aporta a la suma (BR-033/BR-035) | P0 | API / integration |
| TC-071 | Alta de segmento sin observación rechazada | Sesión `operator.test`; carga `050TERRA26` sin segmento en Sector 5 | 1) `POST /cargos/:id/locations` sin campo `observation` | Rechazo `422 BUSINESS_RULE_VIOLATION` (`detail.rule: 'BR-006'`) o `400`; sin CargoLocation creado ni Movement (BR-006/BR-039) | P0 | API / unit |
| TC-072 | Egreso de segmento genera movimiento e historial | `029TERRA26` con segmento ACTIVE en Sector 3 (20 m²) | 1) `DELETE /cargos/:id/locations/:cargoLocationId` con observación 2) consultar el segmento y el historial de la carga | `200`; el segmento pasa a status `EXITED` con `exitedAt`; Movement registrado con observación; el historial de la carga incluye el movimiento; la ocupación del Sector 3 decrementa en 20 m² (BR-008/BR-039) | P0 | API / integration |
| TC-073 | Descarga parcial: residual en camión = totalQuantity − Σ distribuido | `036TERRA26` (camión ABC123, Plazoleta) con `totalQuantity` 100% (unidad PERCENT) y sin segmentos (residual 100%) | 1) UNLOAD parcial 60% a Sector 4 con observación 2) verificar residual 3) mover el residual 40% a Sector 5 con observación 4) verificar estado y segmentos | Paso 1 → `201`, estado `PARTIALLY_UNLOADED`, segmento Sector 4 60% ACTIVE; paso 2 → residual 40% = 100 − 60 (BR-038); paso 3 → `201`, segmento Sector 5 40%, residual 0%, estado `STORED`; `GET /cargos/:id/locations` con 2 segmentos y suma 100% (BR-034/BR-038); modelado del camión: **residual derivado, el camión NO genera filas** (OQ-042 → BR-042; DP-QA-22 cerrada) | P0 | integration / API |
| TC-074 | Alerta de capacidad derivada de ocupación agregada | Sector con `capacity` 100 m² y ocupación agregada ≥ umbral (fixture 92 m²; umbral configurable, danger **>90%** — OQ-046 resuelta; unidad efectiva OQ-041 → BR-041) | 1) ejecutar el job real de detección (OQ-007 → ADR-012) o cálculo en vivo (OQ-031 resuelta) 2) `GET /alerts?type=CAPACITY` 3) verificar dashboard y detalle de ubicación | Alerta `CAPACITY` status `OPEN` referenciando la ubicación, con ocupación/umbral correctos (Σ segmentos activos — BR-033/BR-036/§9); la alerta NO mueve cargas automáticamente; visible en dashboard y detalle de ubicación; umbral exacto: **>90% configurable** (DP-QA-25 cerrada) | P1 | integration / API |
| TC-075 | Movimiento parcial con `percentage` en vez de `quantity` | Carga con distribución | 1) `POST`/`PATCH` de segmento con `percentage: 25` sin `quantity` | **RESUELTO (OQ-045 → BR-049)**: `percentage` es **derivado de UI** — como input solo válido con unidad `PERCENT` (se persiste como `quantity` en %); con otra unidad y sin `quantity` → se exige `quantity` (rechazo 422). Assert fijo (DP-QA-21 cerrada) | P2 | API / unit |
| TC-076 | Consultas de capacidad en unidad distinta a la de los segmentos | Ubicación con `capacityUnit` AREA y segmentos en m²; consulta en otra unidad (p. ej. PALLETS) | 1) `GET /locations/:id/capacity?unit=PALLETS` (o equivalente) | **RESUELTO (OQ-041 → BR-041 / OQ-044 → BR-048)**: la API responde en la unidad canónica **sin convertir** (sin conversión en v1 — BR-048); assert fijo (DP-QA-24 cerrada) | P2 | API |

---

## Mapa de cobertura BR → TC

| BR | Regla | Casos |
| --- | --- | --- |
| BR-001 | No crear carga sin código | TC-012 |
| BR-002 | Código único según reglas (OQ-001 → BR-002 resuelta) | TC-013, TC-016 |
| BR-003 | No mover carga inexistente | TC-014, TC-023 |
| BR-004 | No mover a ubicación inactiva | TC-022 |
| BR-005 | No superar capacidad | TC-021, TC-018 (actualización occupiedCapacity) |
| BR-006 | Movimiento requiere observación | TC-019, TC-020, TC-036 |
| BR-007 | Cambio de estado requiere observación | TC-060, TC-061 |
| BR-008 | Todo movimiento genera historial | TC-018, TC-024, TC-026 |
| BR-009 | Permisos siempre en backend | TC-007, TC-064, TC-010 (+ ESC-006 en E2E) |
| BR-010 | Viewer no crea/mueve/modifica/elimina | TC-006, TC-007 |
| BR-011 | Operator sin acciones administrativas | TC-008, TC-045, TC-064 |
| BR-012 | Admin revierte con historial y auditoría | TC-028, TC-029, TC-009 |
| BR-013 | Nunca borrado silencioso (soft delete + audit) | TC-029, TC-027 |
| BR-014 | Alerta 30d sin auto-movimiento, decisión humana | TC-031, TC-032, TC-033, TC-035, TC-036 |
| BR-015 | Fecha base de permanencia | TC-031, TC-032 |
| BR-016 | Transiciones validadas en backend | TC-025, TC-024, TC-007 |
| BR-017 | Privacidad en auditoría | TC-030 |
| BR-018 | PDF por rol, sin datos no autorizados | TC-037, TC-038, TC-039, TC-040 |
| BR-019 | Notificaciones desacopladas | (sin TC dedicado en v1; se agrega al implementar NotificationService) |
| BR-020 | Planos como datos estructurados | TC-041, TC-044, TC-046 |
| BR-032 | Carga ocupa simultáneamente N ubicaciones (M:N vía CargoLocation) | TC-069 |
| BR-033 | Ubicación con N cargas; ocupación = Σ segmentos activos en unidad compatible | TC-070 |
| BR-034 | Σ distribuido ≤ total de la carga | TC-065, TC-073 |
| BR-035 | Capacidad en unidad compatible; no sumar unidades incompatibles | TC-066, TC-070, TC-076 |
| BR-036 | No superar capacidad salvo flag administrativo; alerta CAPACITY (§9) | TC-067, TC-068, TC-074 |
| BR-037 | Movimientos parciales soportados (cantidad/porcentaje) | TC-065, TC-073, TC-075 |
| BR-038 | Descarga parcial: residual = totalQuantity − Σ activos | TC-073 |
| BR-039 | Alta/egreso de segmento genera movimiento e historial | TC-071, TC-072 |
| BR-040 | Consultas de distribución exponen segmentos y movimientos | TC-069, TC-070 |

## Guía de ejecución de la matriz

| Bloque de casos | Fase del TEST-PLAN | Nivel de ejecución | Ambiente | Responsable |
| --- | --- | --- | --- | --- |
| TC-001..TC-010 (auth + RBAC) | PHASE 2 | API + security | development + staging (E2E login) | QA + Backend Dev |
| TC-011..TC-017 (cargas y consultas) | PHASE 3 | API + integration + unit | development | QA + Backend Dev |
| TC-018..TC-025 (movimientos) | PHASE 5 | API + integration + unit | development; E2E en staging (ESC-001/006) | QA + Backend Dev |
| TC-026..TC-030, TC-064 (historial/auditoría) | PHASE 8 | API + integration | development | QA |
| TC-031..TC-036 (alertas) | PHASE 9 | integration + API | development (job) + staging (ESC-002) | QA + Backend Dev |
| TC-037..TC-040 (PDF) | PHASE 10 | integration + API | development; E2E en staging (ESC-001) | QA |
| TC-041..TC-043 (mapa) | PHASE 6 | E2E + a11y | staging | QA + Frontend Dev |
| TC-044..TC-046 (editor de planos) | PHASE 11 | API + integration + E2E | staging | QA |
| TC-047..TC-049 (dashboard) | PHASE 7 | API + E2E | staging | QA |
| TC-050, TC-056..TC-058 (seguridad) | transversal | security + API | staging (rate limit) + development | QA + DevOps |
| TC-051..TC-054, TC-059 (robustez/UX/perf) | PHASE 1/7/12 | perf + a11y + E2E | staging | QA + DevOps |
| TC-055, TC-060..TC-063 (complementarios) | PHASE 3/5 | API + integration | development | QA + Backend Dev |
| TC-065..TC-076 (distribución M:N) | PHASE 4/5 (+ TC-074 en PHASE 9) | integration + API (+ E2E en staging) | development; E2E en staging (ESC-008..ESC-011) | QA + Backend Dev |

Reglas de ejecución:
1. **Orden por capa**: unit → integration → API → E2E (pirámide, QA-STRATEGY §1). Un caso que falla en capa baja bloquea su corrida en capas superiores.
2. **Recorrido de P0**: los P0 se ejecutan completos en el cierre de cada fase (criterios de salida del TEST-PLAN §4); P1/P2 se ejecutan según prioridad del release.
3. **Verificación de "nada se persiste"**: tras un rechazo (422/409/403), el assert confirma con GETs posteriores que no hubo efectos colaterales (sin Movement, sin locationId cambiado, occupiedCapacity intacto, sin Alert nueva).
4. **Convención de asserts API**: códigos HTTP de `API.md` §3 y §5.6; donde el catálogo de `ERROR-HANDLING.md` (W5 ⏳) no exista aún, se valida el código estándar (401/403) y el comportamiento funcional.
5. **Datos de prueba**: los IDs de carga de los pasos usan los seeds §5 cuando existen; los casos que requieren datos nuevos declaran el fixture en la precondición (nunca datos reales de producción — BR-017).

## Criterios de aceptación (de este documento)

- La matriz cubre los 12 temas obligatorios del QA lead con resultado de éxito Y de fallo donde la BR lo exige (movimiento sin observación, capacidad, ubicación inactiva, permisos).
- Mínimo 40 casos: se entregan 76 (TC-001..TC-076), todos con precondición y pasos concretos — sin placeholders.
- Los TC-001..TC-054 citados por `TEST-PLAN.md` mantienen exactamente su semántica; TC-055..TC-064 la extienden y quedan documentados como extensión; TC-065..TC-076 cubren la distribución M:N (BR-032..BR-040) y son citados por el `TEST-PLAN.md` v0.2 en las fases 4/5/9.
- Toda BR CRÍTICA/ALTA tiene al menos un caso API/integration (mapa de cobertura), incluidas BR-032..BR-040 (ampliación 0.2).
- Asserts de HTTP alineados a `API.md`; ambigüedades reales solo como DECISIÓN PENDIENTE.

## Archivos involucrados

| Archivo | Relación |
| --- | --- |
| `docs/qa/TEST-CASES.md` (este) | Matriz TC-001..TC-076 |
| `docs/qa/TEST-PLAN.md` | Citación de TC por fase (TC-001..TC-076) |
| `docs/qa/QA-STRATEGY.md` | Prioridades, cobertura, fixtures §6 |
| `docs/qa/E2E-SCENARIOS.md` | Escenarios ESC-001..ESC-007 que ejercitan estos casos |
| `docs/qa/ACCEPTANCE-CRITERIA.md` | Criterios Given/When/Then por funcionalidad |
| `docs/backend/API.md` | Códigos HTTP y de aplicación usados en asserts |
| `docs/MASTER-SPEC.md` | BR, seeds, estados, roles, API |
| `docs/product/PRD.md` | RF/US citados en casos complementarios |

## Riesgos

| Riesgo | Impacto | Mitigación |
| --- | --- | --- |
| `ERROR-HANDLING.md`/`VALIDATION.md` pendientes (W5) | Códigos finos de 409/422 y transiciones | Asserts funcionales + estándar 401/403; se ajustan cuando W5 entregue el catálogo |
| ~~OQ-008 (días corridos vs hábiles)~~ → resuelta (BR-014/015: corridos, base `entryDate`) | Riesgo cerrado | Fixtures límite 31/29 definitivos (DP-QA-5 cerrada) |
| ~~OQ-041/OQ-044 (unidad por defecto y conversión)~~ → resueltas (BR-041/048) | Detalle de asserts de ocupación cerrado | Asserts concretos en unidad efectiva; sin conversión (DP-QA-8/24 cerradas) |
| ~~OQ-001 (unicidad de código)~~ → resuelta (BR-002) | TC-013 con regex exacta | Normalización canónica verificada (mayúsculas, case-insensitive) |
| ~~OQ-005/ADR-013 (PDF)~~ → resuelta (HTML→PDF server-side) | TC-037/038 montables | Montaje con la herramienta fijada; detalle del assert de contenido 🔶 residual local (DP-QA-11) |
| ~~OQ-015 (editor de planos v1)~~ → resuelta (editor fuera de v1) | TC-044/046 y ESC-004 → backlog QA | Casos conservados para v2 (DP-QA-7 cerrada) |
| Extensión TC-055..064 no citada en TEST-PLAN | Desalineación de fases | Se documenta como extensión explícita; TEST-PLAN las incorpora en revisión posterior |
| ~~OQ-041..045 (distribución: unidad por defecto, camión, rol de sobreocupación, conversión, percentage)~~ → resueltas 2026-09-23/24 (BR-041/042/048/049 y BR-036 ampliada) | Riesgo cerrado | Marcas [PENDIENTE] removidas; asserts de invariantes concretos (Σ ≤ total, Σ por ubicación en unidad efectiva) (DP-QA-21..25 cerradas) |

## DECISIONES PENDIENTES

- **DP-QA-11 — Contenido verificable del PDF**: la estrategia quedó fijada (OQ-005 → **ADR-013, resuelta 2026-09-24: HTML→PDF server-side con Chromium/Puppeteer**); el detalle del assert de TC-037/TC-038 (parseo del binario, golden file o verificación del texto extraído) queda 🔶 residual local de montaje. ✔️ Impacto: montaje de PHASE 10 (habilitado).
- **DP-QA-12 — Validación geométrica del plano**: **cerrada (OQ-015 resuelta, 2026-09-24)**: el editor queda **fuera de v1** — TC-044 asume `PATCH /maps/:id` sin `409 MAP_ELEMENT_CONFLICT` para cuando se implemente (backlog QA, v2). ✔️ Impacto: asserts de PHASE 11 (diferidos a v2).
- **DP-QA-13 — Parámetros de rate limit**: TC-057 necesita el número de intentos y ventana (definidos por `architecture/SECURITY.md`, W2 ⏳; API.md ya fija `429 RATE_LIMITED`). 🔶 Residual local sin OQ. ✔️ Impacto: assert exacto de TC-057.
- **DP-QA-14 — Regla exacta de "observación no vacía"**: BR-006 exige texto no vacío tras trim; TC-020 verifica whitespace-only. El mínimo de caracteres/trim exacto no está canónico. 🔶 Residual local sin OQ. ✔️ Impacto: TC-020/TC-036.
- **DP-QA-15 — Lectura de auditoría por OPERATOR**: **cerrada (OQ-019 → §8 RBAC decisión 19, 2026-09-24)**: OPERATOR lee **solo eventos propios**; ADMIN todo; Viewer sin acceso. ✔️ Impacto: precondición de TC-027 y alcance de pruebas de PHASE 8 (definido).
- **DP-QA-16 — Persistencia de IN_TRANSIT**: TC-024 asume que IN_TRANSIT es transitorio y no queda persistido (MASTER-SPEC §7); el detalle de validación lo fija `backend/VALIDATION.md`. 🔶 Residual local sin OQ. ✔️ Impacto: asserts de TC-024/TC-025.
- **DP-QA-21 — Semántica de `percentage` en CargoLocation**: **cerrada (OQ-045 → BR-049, 2026-09-24)**: `percentage` **derivado de UI** (`quantity/totalQuantity`), informativo; input solo con unidad `PERCENT`. Condiciona TC-075, el `percentage` informativo de TC-069/TC-073 y el factory de segmentos (asserts concretos). ✔️ Impacto: asserts de distribución (fases 4/5).
- **DP-QA-22 — Modelado del camión en la descarga parcial**: **cerrada (OQ-042 → BR-042, MASTER-SPEC v0.3)**: **residual derivado** = `totalQuantity − Σ activos`; el camión NO genera filas en `GET /cargos/:id/locations`. Condiciona asserts de TC-073 y ESC-009 (concretos). ✔️ Impacto: fase 5.
- **DP-QA-23 — Regla administrativa de sobreocupación**: **cerrada (OQ-043 → BR-036 ampliada, 2026-09-24)**: flag `allowOverOccupation` persistente por ubicación, **solo ADMIN**, límite default **+10%**, observación obligatoria + auditoría `CAPACITY_CHANGE`. Condiciona TC-068 y ESC-010 (concretos). ✔️ Impacto: asserts de BR-036 (fase 5).
- **DP-QA-24 — Unidad de capacidad por defecto y conversión**: **cerrada (OQ-041 → BR-041 y OQ-044 → BR-048, 2026-09-23/24)**: default por LocationType (Sector/Galpón AREA, Plazoleta UNITS) + override; **sin conversión en v1**. Condiciona TC-066/TC-076 y los fixtures de capacidad (concretos). ✔️ Impacto: fase 4/5.
- **DP-QA-25 — Umbral de alerta CAPACITY (§9)**: **cerrada (OQ-046 resuelta + BR-041, 2026-09-24)**: umbral **danger >90%** configurable; comparación en la unidad efectiva del LocationType. Condiciona TC-074 y ESC-011 (concretos). ✔️ Impacto: fase 9.