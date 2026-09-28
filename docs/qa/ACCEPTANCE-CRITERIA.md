# CargoOps — Criterios de Aceptación (ACCEPTANCE-CRITERIA)

> Grupo W8 (QA) · FASE 0 — solo documentación · Fuente canónica: `docs/MASTER-SPEC.md`
> Estado: borrador v0.2 · Fecha: 2026-09-23 (ampliación §§62-70: distribución M:N Cargo↔Location, BR-032..BR-040) · Autor: Grupo QA (QA lead)
> Documentos hermanos: `QA-STRATEGY.md` · `TEST-PLAN.md` · `TEST-CASES.md` · `E2E-SCENARIOS.md`

---

## Objetivo

Definir los criterios de aceptación (Given/When/Then) de las funcionalidades clave de CargoOps: creación de carga, movimiento con observación, capacidad, permisos, alerta de rezago, exportación PDF, edición de plano, historial, mapa operativo, dashboard y auditoría. Cada criterio se vincula a su user story / requisito funcional (US-XXX / RF-XXX según `docs/product/PRD.md`; detalle formal pendiente de `docs/product/USER-STORIES.md`), a su BR del MASTER-SPEC §6 y a la Definition of Done global (MASTER-SPEC §20). Se incluyen criterios negativos y de permisos por funcionalidad. Estos criterios son el gate de entrada de cada fase del `TEST-PLAN.md` (§3) y los asserts de los escenarios `E2E-SCENARIOS.md`. La ampliación §§62-70 (distribución M:N, capacidad por unidad, movimientos parciales y descarga parcial — BR-032..BR-040) incorpora los criterios AC-050..AC-061; al no existir RF/US para la distribución en v1, sus vínculos referencian el MASTER-SPEC §4.1/§5/§6 en lugar de RF/US.

## Contexto

Los criterios de aceptación traducen el comportamiento esperado por negocio en condiciones verificables Given/When/Then, ejecutables por un QA (a mano o automatizado). Se agrupan por funcionalidad con código AC-XXX continuo y columnas: Given (precondición), When (acción), Then (resultado verificable), Vínculos (US/RF/BT/BR/DoD) y Prioridad. La prioridad de aceptación sigue la escala de casos del `QA-STRATEGY.md` §8 (P0 = bloqueante para release de la funcionalidad). La semántica de estados, roles, seeds y API es la canónica del MASTER-SPEC (estados §7, RBAC §8, seeds §5, API §10).

## Restricciones

- FASE 0: solo documentación; los criterios no son casos de prueba ejecutables (eso es `TEST-CASES.md`/`E2E-SCENARIOS.md`), sino las condiciones que esos casos verifican.
- No redefinir BR, estados, roles ni contratos API. Toda ambigüedad real → DECISIÓN PENDIENTE con reporte al orquestador.
- Vínculo a user stories: se usa el mapeo RF→US del `PRD.md` (W1 ✅); el detalle canónico de historias (`docs/product/USER-STORIES.md`, W1 ⏳) puede reajustar los IDs citados — se enlaza como dependencia, sin bloquear.
- Criterios negativos obligatorios en las funcionalidades con BR de severidad CRÍTICA/ALTA.
- Idioma: español profesional/neutral; IDs técnicos (AC-XXX) en inglés.

## Dependencias

| Dependencia | Motivo |
| --- | --- |
| `docs/MASTER-SPEC.md` | BR-001..BR-020, estados §7, roles §8, seeds §5, DoD §20 |
| `docs/product/PRD.md` | Mapeo RF-XXX → FEATURE-XXX / US-XXX |
| `docs/product/USER-STORIES.md` (W1, ⏳) | Detalle canónico de historias (reajuste de IDs US citados) |
| `docs/qa/TEST-PLAN.md` | Criterios como gate de entrada por fase (§3) |
| `docs/qa/TEST-CASES.md` | Casos TC que operacionalizan cada criterio |
| `docs/qa/E2E-SCENARIOS.md` | Escenarios que confirman criterios de extremo a extremo |
| `docs/backend/API.md` | Comportamiento HTTP esperado en los Then |
| OPEN-QUESTIONS OQ-001/005/008/009/015 (resueltas 2026-09-23/24 → BR-002/ADR-013/BR-014-015/BR-041/OQ-015) | Reglas que condicionaban Then de duplicado, PDF, alerta, capacidad, editor — cerradas |
| OPEN-QUESTIONS OQ-041..045 (resueltas 2026-09-23/24 → BR-041/042/048/049 y BR-036 ampliada) | Reglas que condicionaban Then de distribución M:N (unidad, camión, flag, conversión, percentage) — cerradas |

## Decisiones

1. **Formato único**: tablas por funcionalidad con Given/When/Then explícitos; un criterio por fila (AC-XXX continuo en todo el documento).
2. **Cobertura mínima**: cada funcionalidad clave de este documento tiene al menos un criterio positivo, uno negativo y uno de permisos cuando aplica (RBAC).
3. **Vínculos**: por fila se cita RF/US (PRD), BR, DoD (ítems del §20 que aplican: validaciones, manejo de errores, permisos, loading/estados vacíos, responsive, a11y básica, logs) y TC/ESC de verificación.
4. **Relación con pruebas**: un criterio de aceptación puede ser verificado por varios TC y/o ESCs; la matriz lo indica sin duplicar contenido.
5. **Prioridad de aceptación**: P0 = condición bloqueante de release; P1 = requerida en la iteración; P2 = diferible con plan. Los criterios de BR CRÍTICA son P0 por defecto.

---

## AC-001 Creación de carga

| ID | Given | When | Then | Vínculos | Prio |
| --- | --- | --- | --- | --- | --- |
| AC-001 | Un usuario OPERATOR autenticado y un código único válido | crea una carga con código, nombre, ubicación inicial y fecha de ingreso | la carga se crea (201), queda con estado `REGISTERED`, es visible en el listado y se registra el audit `CREATE` | RF-003 / US-008 (FEATURE-005) · BR-001, BR-002 · DoD: validaciones, logs | P0 |
| AC-002 | Un usuario OPERATOR autenticado | envía la creación sin código (o código vacío) | la API responde error de validación (400 `VALIDATION_ERROR`) y la carga NO se crea (BR-001) | RF-003 / US-009 · BR-001 · DoD: validaciones, manejo de errores · TC-012 | P0 |
| AC-003 | Un usuario OPERATOR autenticado | envía un código ya existente (seed `029TERRA26`) | la API responde 409 `CARGO_CODE_DUPLICATE` y no hay segundo registro; normalización según OQ-001 → BR-002 (resuelta: regex `^[A-Z0-9][A-Z0-9./-]{2,31}$`, mayúsculas, case-insensitive) | RF-003 / US-009 · BR-002 · TC-013 | P0 |
| AC-004 | Un usuario VIEWER autenticado | intenta crear una carga (UI u API) | la UI no ofrece la acción y la API responde 403 `FORBIDDEN` (BR-010); sin registro creado | RF-002 / US-006 · BR-009, BR-010 · TC-006, ESC-006 | P0 |
| AC-005 | Un usuario OPERATOR autenticado | crea una carga con éxito | la UI muestra confirmación, estado de carga y estados vacíos correctos; el detalle es accesible (labels/foco) | RF-003 · DoD: loading, estados vacíos, a11y básica · TC-011, TC-051, TC-052 | P0 |

## AC-006 Movimiento con observación

| ID | Given | When | Then | Vínculos | Prio |
| --- | --- | --- | --- | --- | --- |
| AC-006 | Una carga `STORED` en Sector 4 (`029TERRA26`) y un OPERATOR autenticado | mueve la carga a Sector 3 con observación no vacía | el movimiento se registra (201) con observación vinculada 1:1, la ubicación del cargo se actualiza, el historial crece y se audita `MOVE` (BR-006/BR-008) | RF-008 / US-019 (FEATURE-013) · BR-003, BR-006, BR-008 · TC-018, ESC-001 | P0 |
| AC-007 | La misma carga y operador | mueve la carga sin observación | la API responde 422 `BUSINESS_RULE_VIOLATION` (`rule: BR-006`) o 400, y NO hay movimiento, cambio de ubicación ni historial nuevo (BR-006) | RF-011 / US-025 (FEATURE-015) · BR-006 · TC-019, ESC-006 | P0 |
| AC-008 | La misma carga y operador | mueve la carga con observación de solo espacios | el movimiento se rechaza (observación no vacía tras trim; regla exacta DP-QA-14 🔶 residual local sin OQ) sin efectos colaterales | RF-011 / US-025 · BR-006 · TC-020 | P0 |
| AC-009 | Una carga y un operador | intenta una transición de estado no permitida por la máquina de estados (BR-016) | la API responde 409 `INVALID_TRANSITION`; estado y ubicación sin alteración | RF-008 / US-019 · BR-016 · TC-025 | P0 |
| AC-010 | Un OPERATOR autenticado | mueve una carga inexistente | la API responde 404 `CARGO_NOT_FOUND` (BR-003) | RF-008 / US-019 · BR-003 · TC-023 | P0 |

## AC-011 Capacidad de ubicaciones

| ID | Given | When | Then | Vínculos | Prio |
| --- | --- | --- | --- | --- | --- |
| AC-011 | El Sector 5 con `occupiedCapacity == capacity` (tope, unidad compatible) | se intenta mover/ingresar una carga al sector | la API responde 409 `CAPACITY_EXCEEDED` y no se supera el tope (BR-005); ni la carga ni el sector cambian | RF-007 / US-017 (FEATURE-012) · BR-005 · TC-021 | P0 |
| AC-012 | Un sector con capacidad disponible | se mueve una carga dentro del tope | el movimiento es aceptado y `occupiedCapacity` de origen/destino se recalcula (Σ segmentos activos en unidad efectiva; OQ-041 → BR-041 resuelta) | RF-007 / US-017, US-018 · BR-005 · TC-018 | P0 |
| AC-013 | Un sector con ocupación media | se consulta dashboard/mapa | la ocupación derivada (occupiedCapacity/availableCapacity) refleja el estado real y es visible en la UI | RF-007 / US-018 · BR-005 · TC-047, TC-043 | P0 |
| AC-014 | Una ubicación con carga presente | un ADMIN intenta pasarla a INACTIVE/MAINTENANCE | la API responde 422 `LOCATION_HAS_CARGO` (API.md §6.3); el estado no cambia | RF-006 / US-016 (FEATURE-011) · BR-004 (complemento) · — | P1 |

## AC-015 Permisos (RBAC)

| ID | Given | When | Then | Vínculos | Prio |
| --- | --- | --- | --- | --- | --- |
| AC-015 | Un token de cualquier rol | se llama a cualquier endpoint protegido | la validación ocurre SIEMPRE en backend; el frontend nunca es la capa única de autorización (BR-009) | RF-002 / US-006, US-007 (FEATURE-004) · BR-009 · TC-007, TC-064, ESC-006 | P0 |
| AC-016 | Un usuario VIEWER autenticado | consulta dashboard, cargas, detalle, mapa, historial o exportación autorizada | todas las consultas de lectura responden 200; las acciones de crear/mover/editar/eliminar responden 403 `FORBIDDEN` (BR-010) | RF-002 / US-006 · BR-009, BR-010 · TC-006, TC-007, TC-003(consulta) | P0 |
| AC-017 | Un usuario OPERATOR autenticado | intenta acciones administrativas (revertir, editar plano, eliminar definitivo, roles, configuración) | la API responde 403 `FORBIDDEN` (BR-011) y ninguna cambia estado/datos | RF-002 / US-007 · BR-011 · TC-008, TC-045, TC-064 | P0 |
| AC-018 | Un usuario ADMIN autenticado | ejecuta el set completo (crear, mover, soft delete, restore, revertir, planos, configuración) | todas las acciones responden 2xx y generan auditoría (BR-012/BR-013) | RF-002 / US-007 · BR-009, BR-011, BR-012 · TC-009 | P0 |
| AC-019 | Una sesión sin token o con token expirado | accede a cualquier endpoint protegido | la API responde 401 `UNAUTHORIZED`; la UI redirige al login y permite recuperar sesión vía refresh | RF-001 / US-004, US-005 (FEATURE-003) · BR-009 · TC-004, TC-010, TC-049 | P0 |

## AC-020 Alerta de rezago (30 días)

| ID | Given | When | Then | Vínculos | Prio |
| --- | --- | --- | --- | --- | --- |
| AC-020 | Una carga con permanencia > 30 días desde `entryDate` (fixture `hoy − 31`) | el job de detección se ejecuta | se genera una alerta `STALE_30D` status `OPEN` con `permanenceDays` correcto y es visible en dashboard | RF-016 / US-037 (FEATURE-022) · BR-014, BR-015 · TC-031, ESC-002 | P0 |
| AC-021 | Una carga con permanencia ≤ 30 días (limítrofe `hoy − 29`) | el job de detección se ejecuta | NO se genera alerta nueva para esa carga (BR-014/BR-015) | RF-016 / US-037 · BR-014, BR-015 · TC-032 | P0 |
| AC-022 | Una carga con alerta `STALE_30D` OPEN | la alerta se genera | la carga NO se mueve automáticamente: ubicación e historial intactos; solo existe el Alert (BR-014) | RF-016 / US-038 · BR-014 · TC-033, ESC-002 | P0 |
| AC-023 | Un OPERATOR autenticado con la alerta abierta | decide mover la carga a Rezago con observación | el movimiento `TO_REZAGO` se registra (201), la carga pasa a `REZAGO`, la alerta se resuelve y el historial lo refleja | RF-016 / US-038 · BR-014, BR-006 · TC-035, ESC-002 | P0 |
| AC-024 | Un OPERATOR autenticado | intenta mover a Rezago sin observación | la API responde 422/400 y la carga permanece donde está; la alerta sigue OPEN | RF-016 / US-038 · BR-006 · TC-036 | P0 |
| AC-025 | Un OPERATOR autenticado | reconoce o resuelve la alerta (ACKNOWLEDGED/RESOLVED con observación) | la alerta actualiza su status y deja de contar como abierta en el dashboard (RF-021) | RF-021 / US-039 (FEATURE-023) · BR-014 · TC-034 | P0 |

## AC-026 Exportación PDF

| ID | Given | When | Then | Vínculos | Prio |
| --- | --- | --- | --- | --- | --- |
| AC-026 | Una carga con movimientos y un rol con permiso `cargo.export_pdf` | exporta el PDF de la carga | se obtiene un documento PDF (200 binario o 202+downloadUrl según ADR-013) con código, ubicación, fechas y movimientos de la carga (BR-018) | RF-017 / US-040 (FEATURE-024) · BR-018 · TC-037, ESC-001 | P0 |
| AC-027 | Una carga A junto a otras cargas en el sistema | exporta el PDF de A | el PDF contiene únicamente datos de A; ningún dato de otras cargas ni de usuarios (BR-018) | RF-017 / US-040 · BR-018 · TC-038 | P0 |
| AC-028 | Un rol sin permiso de exportación | intenta exportar | la API responde 403 `FORBIDDEN`; no se genera archivo (BR-018) | RF-017 / US-041 · BR-018 · TC-039 | P0 |
| AC-029 | Una carga inexistente | intenta exportar su PDF | la API responde 404 `CARGO_NOT_FOUND` | RF-017 / US-041 · BR-018, BR-003 · TC-040 | P0 |

## AC-030 Edición de plano

| ID | Given | When | Then | Vínculos | Prio |
| --- | --- | --- | --- | --- | --- |
| AC-030 | Un ADMIN autenticado y el mapa `PREDIO-01` | edita el plano (mover/redimensionar una ubicación) y guarda | `PATCH /maps/:id` responde 200 con `version` incrementada, se audita `MAP_EDIT` y tras recargar el cambio persiste como datos estructurados (BR-020) | RF-022 / US-042, US-043 (FEATURE-025) · BR-011, BR-020 · TC-044, ESC-004 | P0 |
| AC-031 | Un OPERATOR autenticado | intenta editar el plano (UI o API) | la UI no ofrece la acción y la API responde 403 `FORBIDDEN`; la version del mapa no cambia (BR-011) | RF-022 / US-043 · BR-011 · TC-045, ESC-004 | P0 |
| AC-032 | Cualquier rol autenticado | consulta el mapa | el plano se sirve como datos estructurados (elementos con posición/tamaño/color), nunca como imagen estática (BR-020) | RF-022 / US-042 · BR-020 · TC-046 | P0 |
| AC-033 | Un ADMIN autenticado | intenta una edición geométrica inválida (superposición) | comportamiento según la validación que se defina (409 `MAP_ELEMENT_CONFLICT` o aceptación) — editor fuera de v1 (OQ-015 resuelta): AC conservado para cuando se implemente (DP-QA-12 cerrada) | RF-022 · BR-020 · TC-044 | P1 |

## AC-034 Historial

| ID | Given | When | Then | Vínculos | Prio |
| --- | --- | --- | --- | --- | --- |
| AC-034 | Una carga con múltiples movimientos | se consulta su historial | se reconstruye la línea temporal completa en orden cronológico, sin huecos, con usuario, fecha, origen/destino y observación por movimiento (BR-008) | RF-012 / US-034 (FEATURE-020) · BR-008 · TC-026, ESC-001 | P0 |
| AC-035 | Un ADMIN autenticado | revierte un movimiento reciente | la carga vuelve a su ubicación/estado previo, el historial conserva el movimiento original y el nuevo `REVERSION`, y se audita `REVERT` (BR-012/BR-013) | RF-018 / US-027 (FEATURE-016) · BR-008, BR-012, BR-013 · TC-028, ESC-005 | P0 |
| AC-036 | Un OPERATOR autenticado | intenta revertir un movimiento | la API responde 403 `FORBIDDEN` y el historial queda intacto (BR-011) | RF-018 / US-027 · BR-011 · TC-064 | P0 |
| AC-037 | Una carga con historial | el historial se visualiza en la UI | la línea temporal es legible, accesible (teclado/foco) y se mantiene tras recargar | RF-012 · DoD: a11y básica, estados vacíos · TC-052, ESC-001 | P1 |

## AC-038 Mapa operativo

| ID | Given | When | Then | Vínculos | Prio |
| --- | --- | --- | --- | --- | --- |
| AC-038 | Seeds §5 aplicados y un usuario autenticado (incluye VIEWER) | abre el mapa operativo | se renderizan las 17 ubicaciones con leyenda; ninguna se distingue solo por color (icono/patrón/label) (BR-020; MASTER-SPEC §13) | RF-014 / US-028 (FEATURE-017) · BR-020 · TC-041, ESC-003 | P0 |
| AC-039 | El mapa cargado | el usuario hace hover sobre una ubicación o sobre la lista | la ubicación se resalta y muestra tooltip de nombre/código/ocupación; el foco por teclado tiene comportamiento equivalente | RF-014 / US-029 · — · TC-042, ESC-003 | P0 |
| AC-040 | Un usuario autenticado | hace click sobre una ubicación | se abre el detalle con las cargas presentes y la capacidad/ocupación de la ubicación | RF-014 / US-029 · BR-005 (visualización) · TC-043, ESC-003 | P0 |
| AC-041 | La vista del mapa | el usuario navega sin puntero (teclado/screen reader) | existe alternativa accesible (listado de ubicaciones/cargas) y el mapa cumple WCAG 2.2 AA en flujos P0 | RF-014 · DoD: a11y (MASTER-SPEC §12) · TC-052, ESC-003 | P0 |

## AC-042 Dashboard

| ID | Given | When | Then | Vínculos | Prio |
| --- | --- | --- | --- | --- | --- |
| AC-042 | Datos de seeds + alertas cargadas y un usuario autenticado | abre el dashboard | los KPIs son coherentes con los datos: totalCargos, byStatus, openAlerts, totalLocations, occupancyByLocation y recentMovements (200) | RF-015 / US-032 (FEATURE-019) · — · TC-047 | P0 |
| AC-043 | Al menos una alerta OPEN | mira el dashboard | la alerta es visible y navegable; el conteo de alertas abiertas es correcto | RF-015 / US-033 · BR-014 (exposición) · TC-048, ESC-002 | P0 |
| AC-044 | Una sesión autenticada de cualquier rol (lectura) | consulta el dashboard | responde 200 para los 3 roles; el dashboard no expone datos que el rol no pueda ver (BR-018/BR-017 coherentes) | RF-015 · BR-009 · TC-049, TC-047 | P0 |
| AC-045 | Una consulta al dashboard | el usuario navega/consulta en horario de operación | p95 < 300 ms en staging (QA-STRATEGY §4); regresión > 15% bloquea merge | RF-015 · DoD: performance · TC-054 | P1 |

## AC-046 Auditoría

| ID | Given | When | Then | Vínculos | Prio |
| --- | --- | --- | --- | --- | --- |
| AC-046 | Acciones sensibles ejecutadas (CREATE, MOVE, PATCH, REVERT, MAP_EDIT, PERMISSION_CHANGE) | se consulta `GET /audit` con rol autorizado | cada acción registra entradas con usuario, timestamp y previousValue/newValue (BR-013) | RF-013 / US-035 (FEATURE-021) · BR-012, BR-013 · TC-027, ESC-005 | P0 |
| AC-047 | Un ADMIN autenticado | inspecciona el log de auditoría | ninguna entrada contiene passwordHash, tokens, datos personales ni PHI; IP/userAgent acotados (BR-017) | RF-013 / US-036 · BR-017 · TC-030 | P0 |
| AC-048 | Un OPERATOR autenticado | consulta auditoría | OPERATOR ve **solo eventos propios**; ADMIN todo; Viewer sin acceso (OQ-019 → §8 RBAC decisión 19 — DP-QA-15 cerrada) | RF-013 · BR-011, BR-013 · TC-027 | P1 |
| AC-049 | Un movimiento revertido por ADMIN | se audita la reversión | la entrada `REVERT` contiene previous/new values de ubicación/estado y referencia al movimiento original (BR-012) | RF-018 / US-027 · BR-012, BR-013 · TC-028, ESC-005 | P0 |

## AC-050 Distribución M:N (CargoLocation) — secciones 62-70

| ID | Given | When | Then | Vínculos | Prio |
| --- | --- | --- | --- | --- | --- |
| AC-050 | Una carga con distribución registrada (seed §5: `029TERRA26` → Sector 3 20 m² + Sector 4 35 m²) | se consulta su distribución (`GET /cargos/:id/locations`) | el endpoint devuelve todos los segmentos con ubicación, cantidad, unidad, `percentage` (informativo — OQ-045 → BR-049 resuelta), `enteredAt`/`exitedAt` y estado, y la suma distribuida no supera el total (BR-032/BR-034/BR-040) | secciones 62-70 · BR-032, BR-034, BR-040 · TC-069, ESC-008 | P0 |
| AC-051 | Una carga con todo su total distribuido (029TERRA26: 20 + 35 = 55 m² de 55) y un OPERATOR | intenta agregar un segmento que supera el total (65 > 55) | la API responde `DISTRIBUTION_EXCEEDS_TOTAL` (BR-034) y no se crea segmento, movimiento ni alteración de ocupación | secciones 62-70 · BR-034 · TC-065 | P0 |
| AC-052 | Sector 4 con 3 segmentos activos en m² (80 de 100 m², `capacityUnit` AREA) | se consulta su capacidad/ocupación | `occupiedCapacity` = Σ de segmentos ACTIVE en unidad compatible (80 m²) y `availableCapacity` = 20 m²; los segmentos EXITED no cuentan (BR-033/BR-035) | secciones 62-70 · BR-033, BR-035 · TC-070, ESC-008 | P0 |
| AC-053 | Un OPERATOR autenticado | intenta distribuir una cantidad en unidad incompatible con la de la ubicación (p. ej. pallets en un sector en m²) | la API rechaza con `UNIT_INCOMPATIBLE` (BR-035); **sin conversión en v1** (OQ-044 → BR-048 resuelta) | secciones 62-70 · BR-035 · TC-066 | P0 |
| AC-054 | Un OPERATOR autenticado | da de alta o de egreso un segmento de una ubicación | el alta/egreso genera movimiento con observación obligatoria (BR-006), inserta historial (BR-008) y el segmento pasa a ACTIVE/EXITED con `enteredAt`/`exitedAt` (BR-039) | secciones 62-70 · BR-006, BR-008, BR-039 · TC-071, TC-072, ESC-008 | P0 |
| AC-055 | Una carga con segmento en Sector 3 (30 m²) | mueve parcialmente 10 m² a Sector 5 con observación (`quantity`) | se actualiza el segmento origen (20 m²), se crea el destino (10 m²), la suma distribuida total no cambia y se registra el movimiento (BR-037: mover ≠ mover el 100%) | secciones 62-70 · BR-037 · ESC-008 | P0 |
| AC-056 | Una carga distribuida | mueve parcialmente indicando `percentage` en vez de `quantity` | `percentage` es **derivado de UI**: como input solo válido con unidad `PERCENT`; con otra unidad y sin `quantity` → se exige `quantity` (rechazo 422) (OQ-045 → BR-049; DP-QA-21 cerrada) | secciones 62-70 · BR-037 · TC-075 | P1 |
| AC-057 | La carga `036TERRA26` IN_TRUCK (100% en camión, Plazoleta) | descarga parcialmente 60% a Sector 4 y luego el residual 40% a Sector 5 | tras cada descarga, el residual en camión = `totalQuantity − Σ segmentos activos` (100−60 = 40%; luego 0%) y los movimientos quedan registrados (BR-038); modelado: **residual derivado** — el camión NO genera filas (OQ-042 → BR-042 resuelta) | secciones 62-70 · BR-038 · TC-073, ESC-009 | P0 |
| AC-058 | Un usuario autenticado | consulta la capacidad de una ubicación en una unidad distinta a la de sus segmentos | la API responde en la unidad canónica **sin convertir** (sin conversión en v1 — OQ-041/044 → BR-041/048; DP-QA-24 cerrada) | secciones 62-70 · BR-035 · TC-076 | P2 |

## AC-059 Sobreocupación y alerta de capacidad

| ID | Given | When | Then | Vínculos | Prio |
| --- | --- | --- | --- | --- | --- |
| AC-059 | Sector 4 ocupado 80/100 m² (seeds §5) sin `allowOverOccupation` | se intenta distribuir 30 m² adicionales (110 > 100) | la API responde 409 `CAPACITY_EXCEEDED` (BR-036); sin segmento creado y ocupación intacta (BR-033) | secciones 62-70 · BR-036 · TC-067, ESC-010 | P0 |
| AC-060 | Sector 4 con `allowOverOccupation: true` (seteado por Admin) | se distribuyen 30 m² adicionales con observación | el segmento se acepta (201), la ocupación supera la capacidad y la sobreocupación queda auditada con observación (BR-036); rol habilitante: **solo ADMIN**; límite default **+10%**; observación obligatoria (OQ-043 → BR-036 ampliada resuelta; DP-QA-23 cerrada) | secciones 62-70 · BR-036 · TC-068, ESC-010 | P0 |
| AC-061 | Una ubicación cuya ocupación agregada (Σ segmentos activos) supera el umbral configurable (**danger >90%**, §9) | se ejecuta la detección de alertas (o cálculo en vivo) | se genera una alerta `CAPACITY` OPEN visible en Dashboard y en el detalle de la ubicación; la alerta no mueve cargas automáticamente (BR-036/§9; umbral **>90%** y unidad efectiva: OQ-046 resuelta + BR-041 — DP-QA-25 cerrada) | secciones 62-70 / §9 · BR-036, BR-033 · TC-074, ESC-011 | P0 |

---

## Matriz funcionalidad → vínculos principales

| Funcionalidad | RF (PRD) | US | BR | Verificación (TC / ESC) |
| --- | --- | --- | --- | --- |
| Creación de carga | RF-003 | US-008, US-009 | BR-001, BR-002, BR-010 | TC-006, TC-011..013 / ESC-001 |
| Movimiento con observación | RF-008, RF-011 | US-019, US-025 | BR-003..BR-006, BR-008, BR-016 | TC-018..020, TC-023..025 / ESC-001, ESC-006 |
| Capacidad | RF-007 | US-017, US-018 | BR-005 | TC-018, TC-021 / — |
| Permisos | RF-002 | US-006, US-007 | BR-009..BR-012 | TC-006..010, TC-064 / ESC-006 |
| Alerta de rezago | RF-016, RF-021 | US-037..US-039 | BR-014, BR-015 | TC-031..036 / ESC-002 |
| PDF | RF-017 | US-040, US-041 | BR-018 | TC-037..040 / ESC-001 |
| Edición de plano | RF-022 | US-042, US-043 | BR-011, BR-020 | TC-044..046 / ESC-004 |
| Historial | RF-012, RF-018 | US-027, US-034 | BR-008, BR-012 | TC-026..028, TC-064 / ESC-001, ESC-005 |
| Mapa | RF-014 | US-028, US-029 | BR-020 | TC-041..043 / ESC-003 |
| Dashboard | RF-015 | US-032, US-033 | BR-009, BR-014 | TC-047..049 / ESC-002 |
| Auditoría | RF-013 | US-035, US-036 | BR-012, BR-013, BR-017 | TC-027..030 / ESC-005 |
| Distribución M:N | — (secciones 62-70; sin RF/US en v1) | — | BR-032..BR-040 | TC-065..076 / ESC-008..011 |

## Plantilla de criterio y ejemplo de expansión

Cada fila AC-XXX se lee como una condición mínima verificable; para la automatización los QA la expanden a Gherkin narrativo sin cambiar su semántica. Ejemplos de expansión:

**AC-006 — Movimiento con observación (expansión)**
```
Given una carga "029TERRA26" con estado STORED en el Sector 4
And un usuario OPERATOR autenticado con permiso cargo.move
When el usuario mueve la carga al Sector 3
And completa la observación "Traslado a depósito norte."
Then la API responde 201 con un Movement de tipo MOVE
And el cargo queda en el Sector 3 con estado STORED
And el historial del cargo contiene el nuevo movimiento con su observación
And la auditoría registra una entrada MOVE con previousValue/newValue
```

**AC-020 — Alerta por permanencia (expansión)**
```
Given una carga con entryDate = hoy − 31 días (fixture controlado)
When el job de detección de permanencia se ejecuta
Then se crea una alerta STALE_30D en estado OPEN con permanenceDays = 31
And la carga NO cambia de ubicación
And no se genera ningún Movement nuevo
```

**AC-030 — Edición de plano (expansión)**
```
Given un usuario ADMIN autenticado
And el mapa "PREDIO-01" con version = 3
When el usuario mueve el Sector 7 y guarda el plano
Then el PATCH /maps/:id responde 200 con version = 4
And la auditoría contiene una entrada MAP_EDIT
And al recargar la página, el Sector 7 mantiene su nueva posición
```

Regla: las expansiones no pueden introducir reglas ausentes del criterio fila ni del MASTER-SPEC; si lo requieren, se registra la ambigüedad como DECISIÓN PENDIENTE.

## Definition of Done por funcionalidad

Los ítems del DoD global (MASTER-SPEC §20) que aplican a cada funcionalidad. Una funcionalidad se considera aceptada cuando cumple sus AC-XXX (tablas anteriores) y estos ítems:

| Funcionalidad | Tests | Docs | Validaciones | Manejo de errores | Permisos | Loading/vacíos | Responsive | A11y | Logs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Creación de carga | TC-011..013 | API/UI | ✓ (BR-001/002) | ✓ (400/409) | ✓ | ✓ | ✓ | ✓ | ✓ |
| Movimiento con observación | TC-018..020, TC-023..025 | API/UI | ✓ (BR-003..006/016) | ✓ (409/422) | ✓ | ✓ | ✓ | ✓ | ✓ |
| Capacidad | TC-021 | API/UI | ✓ (BR-005) | ✓ (409) | ✓ | ✓ (indicador) | ✓ | ✓ (status) | ✓ |
| Permisos | TC-006..010, TC-064 | SECURITY/AUTH | ✓ (BR-009..012) | ✓ (401/403) | ✓ | ✓ (ocultar acciones) | — | ✓ | ✓ |
| Alerta de rezago | TC-031..036 | API/UI | ✓ (BR-014/015) | ✓ (422) | ✓ | ✓ (estado vacío sin alertas) | ✓ | ✓ (AlertCard) | ✓ |
| PDF | TC-037..040 | API/PDF | ✓ (BR-018) | ✓ (403/404) | ✓ | ✓ (estado exportando) | ✓ | ✓ (botón) | ✓ |
| Edición de plano | TC-044..046 | API/MAP | ✓ (BR-011/020) | ✓ (403/409) | ✓ | ✓ (editor loading) | ✓ | ✓ (teclado) | ✓ |
| Historial | TC-026..028, TC-064 | API/UI | ✓ (BR-008/012) | ✓ (403) | ✓ | ✓ (timeline vacía) | ✓ | ✓ | ✓ |
| Mapa | TC-041..043 | API/UX | ✓ (BR-020) | ✓ | + (lectura Viewer) | ✓ (lazy map) | ✓ (drawer móvil) | ✓✓ (alternativa accesible) | — |
| Dashboard | TC-047..049 | API/UI | ✓ | ✓ | ✓ | ✓ (estados) | ✓ | ✓ | — |
| Auditoría | TC-027..030 | API/AUDIT | ✓ (BR-013/017) | ✓ (403) | ✓ (ADMIN/OPERATOR — DP-QA-15 resuelta: OPERATOR solo propios) | ✓ (tabla vacía) | ✓ | ✓ | — |
| Distribución M:N | TC-065..TC-076 | API/UI | ✓ (BR-032..040) | ✓ (409/422) | ✓ | ✓ (DistributionPanel) | ✓ | ✓ | ✓ |

✓ aplica y se verifica · ✓✓ refuerzo específico · — no aplica o sin dato que loguear.

## Criterios de aceptación (de este documento)

- Las 13 funcionalidades clave tienen criterios Given/When/Then verificables con vínculo explícito a US/RF (o secciones 62-70 para la distribución), BR y DoD.
- Cada funcionalidad con BR CRÍTICA/ALTA incluye criterios negativos y de permisos.
- Los IDs AC-001..AC-061 son continuos y trazables a TC/ESC de verificación sin duplicar contenido.
- La ampliación §§62-70 (BR-032..BR-040) está cubierta por AC-050..AC-061; las semánticas quedaron decididas (OQ-041..045 resueltas 2026-09-23/24 → BR-041/042/048/049 y BR-036 ampliada); no se inventan reglas.
- Los vínculos US citados provienen del mapeo del `PRD.md`; se revalidan cuando exista `USER-STORIES.md` (W1).
- Sin placeholders; ambigüedades registradas como DECISIÓN PENDIENTE.

## Archivos involucrados

| Archivo | Relación |
| --- | --- |
| `docs/qa/ACCEPTANCE-CRITERIA.md` (este) | Criterios AC-001..AC-061 |
| `docs/qa/TEST-PLAN.md` | Criterios como gate de entrada por fase (§3) |
| `docs/qa/TEST-CASES.md` | Casos que operacionalizan criterios |
| `docs/qa/E2E-SCENARIOS.md` | Escenarios que confirman criterios E2E |
| `docs/qa/QA-STRATEGY.md` | Escalas y prioridades §7-§8 |
| `docs/product/PRD.md` | Mapeo RF/FEATURE/US |
| `docs/MASTER-SPEC.md` | BR, estados, roles, DoD §20 |
| `docs/backend/API.md` | Comportamiento HTTP esperado en los Then |

## Riesgos

| Riesgo | Impacto | Mitigación |
| --- | --- | --- |
| `USER-STORIES.md` pendiente (W1) | IDs US citados no canónicos aún | Se usa el mapeo del PRD; revalidación al entregar W1 (no bloquea) |
| ~~OQ-001/005/008/009/015~~ resueltas 2026-09-23/24 (BR-002/ADR-013/BR-014-015/BR-041/OQ-015) | Riesgo cerrado | Criterios completos con las reglas canónicas |
| Alcance de lectura de auditoría (OPERATOR) | AC-048 | DP-QA-15 cerrada (OQ-019 → §8 RBAC): OPERATOR solo eventos propios — criterio completo |
| Validación geométrica del plano | AC-033 | OQ-015 resuelta: editor fuera de v1 — AC conservado para v2 (DP-QA-12 cerrada) |
| ~~OQ-041..045 (distribución: unidad por defecto, camión, flag, conversión, percentage)~~ → resueltas (BR-041/042/048/049, BR-036 ampliada) | AC-053/AC-056/AC-057/AC-058/AC-060/AC-061 completas | Criterios concretos en unidad efectiva (DP-QA-21..25 cerradas) |
| Criterios interpretados como casos de prueba | Duplicación con TEST-CASES | Los criterios definen QUÉ; TC/ESC definen CÓMO verificarlo (división explícita) |

## DECISIONES PENDIENTES

- DP-QA-12 (heredada) → **cerrada (OQ-015 resuelta, 2026-09-24): editor fuera de v1**; AC-033 conservado para v2 (ver `TEST-CASES.md`).
- DP-QA-15 (heredada) → **cerrada (OQ-019 → §8 RBAC decisión 19, 2026-09-24)**: OPERATOR solo eventos propios; ADMIN todo; Viewer sin acceso; AC-048 completa (API.md §8.4).
- **DP-QA-19 — Revalidación de vínculos US (✅ prerrequisito cumplido)**: los IDs US-XXX citados provienen del `PRD.md` (W1 ✅); `docs/product/USER-STORIES.md` ya existe (W1 ✅) — queda la revalidación puntual del mapeo por QA, sin OQ. ✔️ Impacto: trazabilidad fina, no bloquea.
- **DP-QA-20 — Criterio de notificaciones**: **resuelta (OQ-011, 2026-09-24)**: notificaciones **in-app** en v1 (BR-019; sin email/SMS) — se agrega AC cuando el módulo `notifications` entre en scope de pruebas (backlog QA inmediato). ✔️ Impacto: backlog QA.
- DP-QA-21..25 (heredadas de `QA-STRATEGY.md`) → **cerradas 2026-09-24** (OQ-041 → BR-041; OQ-042 → BR-042; OQ-043 → BR-036 ampliada; OQ-044 → BR-048; OQ-045 → BR-049): AC-053/AC-056/AC-057/AC-058/AC-060/AC-061 completas. Ver definiciones en `QA-STRATEGY.md`. ✔️ Impacto: Then de los criterios de distribución (concretos).