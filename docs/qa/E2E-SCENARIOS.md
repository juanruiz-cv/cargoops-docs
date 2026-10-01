# CargoOps — Escenarios E2E (E2E-SCENARIOS)

> Grupo W8 (QA) · FASE 0 — solo documentación · Fuente canónica: `docs/MASTER-SPEC.md`
> Estado: borrador v0.2 · Fecha: 2026-09-23 (ampliación §§62-70: distribución M:N Cargo↔Location, BR-032..BR-040) · Autor: Grupo QA (QA lead)
> Documentos hermanos: `QA-STRATEGY.md` · `TEST-PLAN.md` · `TEST-CASES.md` · `ACCEPTANCE-CRITERIA.md`

---

## Objetivo

Definir los escenarios de pruebas de extremo a extremo (ESC-001..ESC-011) que ejercitan los flujos de valor completos de CargoOps sobre un navegador real en staging, con pasos numerados y asserts explícitos: trazabilidad completa (login → crear → mover → observar → historial → PDF), alerta de 30 días con decisión humana, mapa interactivo (hover/click), edición de plano persistida, reversión con auditoría, negativos de regla (movimiento sin observación, RBAC Viewer) y búsqueda/filtros/paginación. La ampliación §§62-70 agrega los escenarios de distribución M:N (ESC-008..ESC-011): distribución en 2 sectores con movimiento parcial, descarga parcial con camión, sobreocupación con flag administrativo y alerta de capacidad (BR-032..BR-040). Cada escenario referencia los casos TC del `TEST-CASES.md` y las BR que verifica.

## Contexto

La suite E2E es la capa superior de la pirámide del `QA-STRATEGY.md` §1 (5% de la cobertura): valida flujos completos que las capas bajas no pueden garantizar por sí solas (integración UI + API + persistencia). Se ejecuta con **Playwright** (recomendado, DP-QA-2) sobre **staging** con datos descartables; nunca contra producción (QA-STRATEGY §5). Los asserts validan estado del DOM, llamadas API y persistencia (recarga de página incluida). Junto al flujo principal, los escenarios P0 se recorren con **axe-core** (a11y) y dejan **trace/video** ante fallo.

## Restricciones

- FASE 0: solo documentación; los escenarios se materializan como suite Playwright cuando exista código (PHASE 1+).
- Ejecución exclusiva en staging con DB reseteada antes de cada corrida completa (criterio de entrada obligatorio, QA-STRATEGY §5); prohibido ejecutar contra producción (solo smoke de solo lectura, PHASE 13).
- Datos: seeds del MASTER-SPEC §5 + fixtures dinámicos de fechas (alerta 30 días) y usuarios `viewer.test`, `operator.test`, `admin.test` (QA-STRATEGY §6); los seeds incluyen los segmentos de distribución §5 (`029TERRA26` 20+35 m²; Sector 4 80/100 m²; `036TERRA26` descarga parcial).
- No redefinir BR ni contratos; ambigüedades → DECISIÓN PENDIENTE con reporte al orquestador.
- Los movimientos críticos NO operan offline (MASTER-SPEC §12): los escenarios asumen conexión estable.

## Dependencias

| Dependencia | Motivo |
| --- | --- |
| `docs/qa/QA-STRATEGY.md` | Herramienta (Playwright), ambientes, reset de staging, a11y con axe |
| `docs/qa/TEST-PLAN.md` | Fases que habilitan cada escenario (E2E incremental) |
| `docs/qa/TEST-CASES.md` | Casos TC ejercitados por cada escenario |
| `docs/qa/ACCEPTANCE-CRITERIA.md` | Criterios que los asserts deben confirmar |
| `docs/backend/API.md` | Contratos y códigos HTTP interceptados/mockeados en asserts de red |
| `docs/MASTER-SPEC.md` | BR, seeds §5, rol §8, estados §7, mapa §11.5 |
| OPEN-QUESTIONS OQ-005/007/008/015 (resueltas 2026-09-23/24 → ADR-013/BR-014-015/BR-041/OQ-015) | PDF, job de alertas, días de permanencia, editor de planos — cerrado |
| OPEN-QUESTIONS OQ-041..045 (resueltas 2026-09-23/24 → BR-041/042/048/049 y BR-036 ampliada) | Distribución M:N: unidad efectiva, camión residual, sobreocupación solo ADMIN +10%, sin conversión, percentage derivado |

## Decisiones

1. **Identificación y numeración**: ESC-001..ESC-011, coherentes con la referencia del `TEST-PLAN.md` §8 ("ESC-001..ESC-011").
2. **Una sola suite, fases incrementales**: cada escenario se habilita cuando su fase del roadmap existe (PHASE 2 para login, PHASE 10 para PDF, etc.) y se mantiene como regresión.
3. **Asserts en tres niveles**: DOM (UI visible), red (requests/responses API vía Playwright route) y persistencia (recarga de página). Los asserts de red usan los códigos de `API.md`.
4. **Prerrequisito global**: reset de DB de staging con seeds §5 + fixtures; usuarios de fixture por rol; fechas de permanencia según DP-QA-5/OQ-008 resuelta (2026-09-23: días **corridos**, base `entryDate`).
5. **Datasets propios por escenario**: códigos de prueba con prefijo `E2E-` para no colisionar con los seeds y facilitar el reset (la unicidad exacta queda sujeta a OQ-001 → BR-002 resuelta: regex `^[A-Z0-9][A-Z0-9./-]{2,31}$`, mayúsculas, case-insensitive).
6. **Al final de cada escenario**: estado limpio o limpieza explícita (ej. soft delete de cargas de prueba), salvo cuando el escenario exige dejar datos (ESC-004 persiste un mapa editado — ver Nota).

---

## ESC-001 — Trazabilidad completa: login → crear carga → mover → observar → historial → PDF

**Objetivo**: validar el flujo de valor central de CargoOps — registro, movimiento con observación, historial reconstruible y exportación PDF — con trazabilidad en cada paso (BR-001/002/006/008/018).
**Roles y datos**: `operator.test`; destino Sector 4 (occupiedCapacity < capacity); código de prueba `E2E-ESC01/26`. `TC-011, TC-015, TC-018, TC-026, TC-037`.
**Ambiente**: staging reseteado.

**Pasos**
1. Abrir la URL de staging y `POST /auth/login` en la UI con `operator.test` (o realizar login por UI).
2. Crear carga: `code: "E2E-ESC01/26"`, name, `entryDate: hoy`, ubicación inicial Plazoleta.
3. Confirmar la creación y abrir el detalle de la carga.
4. Mover la carga de Plazoleta a Sector 4 ingresando una observación no vacía ("Ingreso a depósito, sector 4.").
5. Abrir la pestaña de historial de la carga.
6. Exportar el PDF de la carga y descargarlo.

**Asserts**
1. Login: se muestra el dashboard y el nombre del usuario; no hay pantalla de login residual.
2. Creación: `POST /cargos` responde `201`; la UI confirma y el listado muestra `E2E-ESC01/26` con status `REGISTERED`.
3. Detalle: el cargo muestra Plazoleta como ubicación y 0 movimientos (o el de ingreso según modelo de ingreso).
4. Movimiento: `POST /cargos/:id/movements` responde `201`; el detalle muestra Sector 4; la observación aparece asociada al movimiento.
5. Historial: la línea temporal lista los movimientos en orden cronológico, cada uno con usuario, fecha, origen/destino y observación; tras **recargar la página** el historial se mantiene (BR-008).
6. PDF: la descarga devuelve un archivo `application/pdf`; su contenido incluye el código `E2E-ESC01/26`, la ubicación actual y los movimientos (estrategia ADR-013/OQ-005 resuelta: HTML→PDF; detalle del assert de contenido 🔶 residual local — DP-QA-11).
7. Red: no hay respuestas `4xx/5xx` inesperadas durante el flujo; cada request de movimiento lleva la observación en el body.

---

## ESC-002 — Alerta de 30 días: revisión → decisión humana → Rezago → dashboard

**Objetivo**: validar el ciclo completo de rezago — generación de la alerta por permanencia > 30 días, ausencia de auto-movimiento, revisión humana, movimiento a Rezago con observación y reflejo en dashboard (BR-014/015/006).
**Roles y datos**: `operator.test`; fixture de carga `E2E-ESC02/26` con `entryDate = hoy − 31 días` (OQ-008 resuelta 2026-09-23: días corridos, base `entryDate` — DP-QA-5 cerrada). `TC-031, TC-033, TC-034, TC-035, TC-048`.
**Ambiente**: staging reseteado; job real de alertas ejecutado (OQ-007 resuelta → ADR-012: BullMQ en v1).

**Pasos**
1. Login con `operator.test`.
2. Abrir el dashboard y localizar la alerta STALE_30D de `E2E-ESC02/26` (1 alerta abierta).
3. Abrir la alerta → ir al detalle de la carga y verificar su ubicación actual.
4. Verificar que la carga NO cambió de ubicación por sí sola: revisar historial (sin movimientos nuevos) y mapa.
5. Reconocer la alerta (ACKNOWLEDGED) con observación.
6. Decidir mover la carga a Rezago ingresando observación ("Rezago por permanencia > 30 días, revisión de cliente.").
7. Volver al dashboard y verificar el estado de la alerta y el resumen.

**Asserts**
1. Dashboard: `openAlerts` ≥ 1 y la alerta STALE_30D de la carga es visible y navegable.
2. Detalle: la carga sigue en su ubicación original (ej. Sector 3); el historial NO muestra movimientos generados automáticamente (BR-014: no auto-mover).
3. Mapa: la carga permanece marcada en su ubicación original.
4. Acknowledge: `PATCH /alerts/:id` responde `200`; la alerta deja de contar como abierta en el dashboard (si se mira antes de resolver).
5. Movimiento a Rezago: `POST movements` kind `TO_REZAGO` responde `201`; el detalle muestra status `REZAGO` y ubicación Rezago; el historial incluye el movimiento con su observación.
6. Alerta: pasa a `RESOLVED`; el dashboard ya no la muestra como abierta; `byStatus.REZAGO` incrementó.
7. Persistencia: tras recargar, la carga sigue en Rezago con su historial completo.

---

## ESC-003 — Mapa: hover sobre lista → resaltado → click → detalle

**Objetivo**: validar la interacción del mapa operativo — hover con resaltado/tooltip (no solo color), click con detalle de ubicación, y alternativa accesible (listado) (MASTER-SPEC §11.5/§12/§13).
**Roles y datos**: `viewer.test` (lectura permitida al rol más restrictivo: evidencia que Viewer consulta mapa). Seeds §5. `TC-041, TC-042, TC-043, TC-052`.
**Ambiente**: staging reseteado.

**Pasos**
1. Login con `viewer.test`.
2. Abrir el mapa operativo (17 ubicaciones: Plazoleta, Sectores 1-12, Scanner, Balanza, Rezago, Secuestro).
3. Recorrer con hover el listado lateral de ubicaciones o directamente cada ubicación del mapa.
4. Hover sobre Sector 4.
5. Click sobre Sector 4.
6. Ejecutar axe-core sobre la vista del mapa y recorrer el listado alternativo con teclado.

**Asserts**
1. Render: 17 ubicaciones visibles; leyenda presente con tipos y colores; ninguna ubicación depende solo del color para distinguirse (patrón/icono/label).
2. Hover: Sector 4 se resalta visualmente y muestra tooltip con nombre/código/ocupación.
3. Hover desde lista↔mapa: al hacer hover en la lista, la ubicación correspondiente en el mapa se resalta (y viceversa si la UI lo soporta — ver decisión de UX).
4. Click: se abre el panel detalle de Sector 4 con las cargas presentes (`029TERRA26`, `032TERRA26`) y capacidad/ocupación (capacity/occupiedCapacity/availableCapacity).
5. a11y: axe reporta 0 violations críticas; el listado de ubicaciones es operable por teclado y el focus sigue la selección; el detalle es anunciado por screen reader.
6. Red: `GET /maps/:id?includeElements=true` responde `200` con elementos estructurados (BR-020).

---

## ESC-004 — Edición de plano (ADMIN) persistida

**Objetivo**: validar que la edición del plano por Admin persiste como datos estructurados, incrementa versión y genera auditoría (BR-011/BR-020); y que Operator no puede editar (BR-011).
**Roles y datos**: `admin.test` y `operator.test`; mapa `PREDIO-01`. `TC-044, TC-045, TC-046`.
**Ambiente**: staging reseteado.

**Pasos**
1. Login con `admin.test` y abrir el editor de planos.
2. Mover Sector 7 (cambiar x/y) y redimensionarlo (cambiar width/height).
3. Guardar (PATCH `/maps/:id`) y verificar la respuesta.
4. Recargar la página y reabrir el editor.
5. Verificar en `GET /audit` la entrada MAP_EDIT.
6. Logout; login con `operator.test`; intentar abrir/editar el plano desde la UI y vía API directa.

**Asserts**
1. Guardado: `PATCH /maps/:id` responde `200` con `version` incrementada (respecto de la versión inicial del mapa).
2. Persistencia: tras recargar, Sector 7 está en la nueva posición/tamaño; `GET /maps/:id?includeElements=true` devuelve los nuevos x/y/width/height como datos estructurados (BR-020); no hay imagen regenerada como fuente.
3. Auditoría: existe un registro `MAP_EDIT` con `previousValue`/`newValue` para el mapa (BR-013).
4. Operator: la UI no ofrece la acción de edición; `PATCH /maps/:id` directo responde `403 FORBIDDEN` (BR-011) y la version no cambia.
5. Consistencia: después de editar, el mapa operativo (vista normal) refleja la nueva posición de Sector 7.

**Nota**: este escenario deja persistido el cambio en staging (es su objetivo); se documenta en el reporte y se revierte en el siguiente reset de corrida. La validación geométrica (superposición) queda para cuando se implemente el editor (OQ-015 resuelta: fuera de v1 — DP-QA-12 cerrada; ESC-004 se conserva como backlog QA).

---

## ESC-005 — Reversión de movimiento (ADMIN) con auditoría

**Objetivo**: validar la reversión Admin — restitución de ubicación/estado, conservación del historial original y registro de auditoría (BR-012/BR-013/BR-008).
**Roles y datos**: `admin.test` y `operator.test`; carga seed `029TERRA26` movida de Sector 4 a Sector 3 por `operator.test`. `TC-028, TC-027, TC-064`.
**Ambiente**: staging reseteado.

**Pasos**
1. Login con `operator.test`.
2. Mover `029TERRA26` de Sector 4 a Sector 3 con observación.
3. Logout; login con `admin.test`.
4. Revertir el movimiento reciente desde el historial de la carga (acción de reversión).
5. Verificar el detalle y el historial de la carga.
6. Verificar `GET /audit` por la acción REVERT.
7. (Negativo) Login con `operator.test` e intentar revertir el mismo movimiento vía API.

**Asserts**
1. El movimiento original existe en historial con su observación (paso 2).
2. Reversión: `admin.test` reverte con éxito (2xx); la carga vuelve a Sector 4 con su estado previo (STORED).
3. Historial: la línea temporal conserva el movimiento original Y el nuevo movimiento kind `REVERSION` con `reversionOfId` apuntando al original (BR-012/BR-008); nada se borra.
4. Auditoría: existe entrada `REVERT` con `previousValue`/`newValue` (ubicación/estado previo y posterior).
5. occupiedCapacity: Sector 3 y Sector 4 reflejan la reversión (incremento/decremento en m² — OQ-041 → BR-041 resuelta; assert concreto).
6. Negativo: `operator.test` recibe `403 FORBIDDEN` (BR-011); el historial queda intacto (TC-064).

---

## ESC-006 — Negativos: movimiento sin observación y RBAC Viewer en la UI

**Objetivo**: validar que las reglas críticas se aplican también en el camino feliz de la UI — rechazo del movimiento sin observación con mensaje claro, y que el rol Viewer no puede crear/mover aunque la UI oculte las acciones (BR-006/BR-009/BR-010/BR-016).
**Roles y datos**: `operator.test` y `viewer.test`; carga seed `050TERRA26` (Sector 5). `TC-019, TC-006, TC-007`.
**Ambiente**: staging reseteado.

**Pasos**
1. Login con `operator.test`; abrir `050TERRA26`.
2. Intentar mover la carga sin completar la observación (dejar vacía o solo espacios).
3. Verificar el mensaje de error y que nada cambió.
4. Logout; login con `viewer.test`.
5. Verificar la ausencia de acciones de crear/mover/editar en la UI.
6. Vía API directa (desde DevTools o request autónomo), intentar `POST /cargos` y `POST /cargos/:id/movements` con el token de Viewer.

**Asserts**
1. La UI bloquea el envío o el backend rechaza con `422 BUSINESS_RULE_VIOLATION` (`rule: 'BR-006'`) / `400` — el mensaje es claro y accesible (no un error genérico).
2. La carga sigue en Sector 5; el historial no tiene movimientos nuevos; occupiedCapacity intacto.
3. Viewer: la UI no muestra botones de crear/mover/editar (UX) y el mapa no ofrece acciones de modificación.
4. API directa con token de Viewer: `POST /cargos` → `403 FORBIDDEN`; `POST /cargos/:id/movements` → `403 FORBIDDEN`; **este assert demuestra que el frontend no es la única capa de autorización (BR-009)**.
5. axe sobre el diálogo de observación: 0 violations críticas (TC-052).

---

## ESC-007 — Búsqueda avanzada, filtros y paginación

**Objetivo**: validar la experiencia de consulta — búsqueda por código heterogéneo, filtros combinados (status + ubicación) y paginación con estado en la UI (BR-002; RF-004/RF-019).
**Roles y datos**: `viewer.test` (lectura permitida); seeds §5. `TC-016, TC-017, TC-015`.
**Ambiente**: staging reseteado con volumen adicional de prueba para forzar > 1 página (fixtures, no datos reales).

**Pasos**
1. Login con `viewer.test`; abrir el listado de cargas.
2. Buscar `JV028` (códigos `JV028/2026CH` y `JV028/2026`).
3. Limpiar búsqueda; aplicar filtro combinado `status: STORED` + `Sector 4`.
4. Con un volumen que exceda `limit` (25), paginar al siguiente set y navegar entre páginas.
5. Recargar la página y verificar el estado del listado.

**Asserts**
1. Búsqueda: solo aparecen las cargas que contienen `JV028` (ambos formatos); caracteres especiales (`/`) no rompen la query.
2. Filtros: el listado muestra únicamente cargas STORED del Sector 4; el contador/meta coincide (`totalItems`).
3. Paginación: `meta { page, limit, totalPages, hasNext }` coherente; la página 2 no repite ítems de la página 1; los controles de paginación reflejan la posición actual.
4. Recarga: el listado conserva búsqueda/filtros si la UI los persiste en la URL (según `frontend/ROUTING.md`, ⏳); en su defecto, al menos no se pierden datos ni se rompe la vista — ver decisión de UX pendiente.
5. Red: requests `GET /cargos` con los query params correctos; respuesta `200` con envelope `{ data, meta }` (API.md §5.1).

---

## ESC-008 — Distribución M:N: alta de carga → 2 sectores → movimiento parcial → verificación en mapa, detalle de carga y detalle de ubicación

**Objetivo**: validar el flujo completo de distribución M:N — alta de una carga, distribución en 2 sectores, movimiento parcial entre sectores y consistencia del resultado en el mapa, el detalle de la carga y el detalle de la ubicación (BR-032/BR-034/BR-037/BR-039/BR-040).
**Roles y datos**: `operator.test`; carga de prueba `E2E-ESC08/26` con `totalQuantity` 50 m² (unidad AREA); Sector 3 y Sector 4 con capacidad disponible. `TC-065, TC-069, TC-070, TC-072`.
**Ambiente**: staging reseteado.

**Pasos**
1. Login con `operator.test`.
2. Crear la carga `E2E-ESC08/26` (`totalQuantity: 50`, `totalUnit: AREA`).
3. Distribuir en 2 sectores: `POST /cargos/:id/locations` → Sector 3 30 m² y Sector 4 20 m², cada uno con observación.
4. Abrir el detalle de la carga: verificar los segmentos y la suma.
5. Movimiento parcial: MOVE 10 m² de Sector 3 → Sector 5 con observación.
6. Verificar en el mapa: Sector 3, Sector 4 y Sector 5 (tooltips/detalle) y el detalle de la ubicación Sector 3.
7. Recargar la página y revisar el historial.

**Asserts**
1. Creación: `POST /cargos` responde `201` con status `REGISTERED`.
2. Distribución: los 2 `POST /cargos/:id/locations` responden `201`; cada segmento queda ACTIVE con `enteredAt` y su observación persistida (BR-006/BR-039).
3. Detalle de carga: `GET /cargos/:id/locations` devuelve 2 segmentos (Sector 3 30 m², Sector 4 20 m²) con cantidad/unidad/percentage (informativo — OQ-045 → BR-049 resuelta) y estado; la suma 50 m² = total (BR-032/BR-034/BR-040).
4. Movimiento parcial: `201`; Sector 3 decrece a 20 m², Sector 5 queda con 10 m², Sector 4 intacto; la suma distribuida sigue en 50 m² (BR-037).
5. Mapa: el tooltip/detalle de Sector 3 muestra 20 m² y el de Sector 5, 10 m²; consistente con la API (BR-040).
6. Detalle de ubicación: `GET /locations/:id/cargos` y `GET /locations/:id/capacity` reflejan los segmentos actualizados (BR-033).
7. Persistencia: tras recargar, los segmentos, el historial con los 3 movimientos (2 altas + 1 parcial) y las ocupaciones se mantienen (BR-008).

---

## ESC-009 — Descarga parcial con camión: 036TERRA26 40/60 → Camión → Sector 5 → 60/40

**Objetivo**: validar la descarga parcial desde el camión con residual derivado (`totalQuantity − Σ CargoLocation activos`, BR-038) y el paso del residual del camión a una ubicación (BR-037/BR-038). Modelado del camión: **residual derivado** (OQ-042 → BR-042 resuelta; DP-QA-22 cerrada); semántica del `percentage`: **derivado de UI** (OQ-045 → BR-049; DP-QA-21 cerrada).
**Roles y datos**: `operator.test`; seed `036TERRA26` IN_TRUCK en Plazoleta (camión ABC123), `totalQuantity` 100% (unidad PERCENT), sin segmentos. `TC-073, TC-075`.
**Ambiente**: staging reseteado.

**Pasos**
1. Login y abrir `036TERRA26` (IN_TRUCK, 100% en camión, sin segmentos).
2. Descarga parcial: UNLOAD 60% a Sector 4 con observación.
3. Verificar el estado, el segmento y el residual en camión (40%).
4. Descargar el residual: mover 40% del camión a Sector 5 con observación.
5. Verificar segmentos, residual en 0% y estado final.

**Asserts**
1. Paso 2: `201`; estado `PARTIALLY_UNLOADED`; segmento Sector 4 60% ACTIVE con observación (BR-006/BR-038).
2. Residual: la UI/API expone 40% = total (100%) − Σ segmentos activos (60%) (BR-038); el camión NO genera segmentos propios (OQ-042 → BR-042) — el conteo nunca incluye fila de camión.
3. Paso 4: `201`; segmento Sector 5 40%; residual 0%; estado `STORED` (carga totalmente descargada).
4. `GET /cargos/:id/locations`: 2 segmentos activos, suma 100% (BR-034/BR-040).
5. Historial: los 2 movimientos con observación; tras recargar persisten (BR-008).
6. `percentage`: derivado de UI (OQ-045 → BR-049 resuelta; DP-QA-21 cerrada).

---

## ESC-010 — Sobreocupación: intento bloqueado y flujo admin con flag

**Objetivo**: validar BR-036 — el rechazo de la sobreocupación sin flag y su aceptación con `allowOverOccupation: true` + observación + auditoría. Rol habilitante: **solo ADMIN**; límite default **+10%**; observación obligatoria (OQ-043 → BR-036 ampliada resuelta; DP-QA-23 cerrada).
**Roles y datos**: `operator.test` y `admin.test`; Sector 4 con 80/100 m² ocupados (seeds §5: 35 + 25 + 20) y `allowOverOccupation: false` por defecto. `TC-067, TC-068`.
**Ambiente**: staging reseteado.

**Pasos**
1. Login con `operator.test`; intentar distribuir 30 m² adicionales en Sector 4 con observación.
2. Verificar el rechazo y que la ocupación quedó intacta.
3. Login con `admin.test`; habilitar `allowOverOccupation: true` en Sector 4 (con observación obligatoria y auditoría `CAPACITY_CHANGE` — BR-036 ampliada).
4. Reintentar la distribución de 30 m² con observación (solo ADMIN habilita; la distribución la ejecuta un OPERATOR autorizado).
5. Verificar la aceptación y la auditoría.
6. Deshabilitar el flag y verificar que el intento vuelve a rechazarse.
7. Con el flag habilitado, intentar un delta que exceda el techo (+10%):Sector 4 con `capacity` 100 m² → techo **110 m²** → 30 m² adicionales (110 → 140) se rechazan.

**Asserts**
1. Paso 2: `409 CAPACITY_EXCEEDED` con `details.rule: 'BR-005'` (BR-005: flag off → techo = capacidad declarada); sin CargoLocation; Sector 4 sigue en 80 m².
2. Paso 3: `PATCH /locations/:id` responde `2xx`; el flag persiste; se registra auditoría (CAPACITY_CHANGE — BR-036/BR-013).
3. Pasos 4-5: `201` con observación; `occupiedCapacity` 110 m² (80 + 30), que **iguala** el techo por defecto y por eso se acepta; la acción de sobreocupación queda auditada como `CAPACITY_CHANGE` **sobre la ubicación** (entidad `location`, no la carga) con `metadata.overOccupation: true` (BR-036).
4. Paso 6: nuevamente `409 CAPACITY_EXCEEDED`: la sobreocupación requiere la acción administrativa explícita y no persiste sin el flag (política: flag persistente por ubicación — OQ-043 → BR-036 ampliada).
5. Paso 7: `409 CAPACITY_EXCEEDED` con `details.rule: 'BR-036'`, `details.overOccupation: true` y `details.ceiling: 110` — el rechazo reporta el **techo real**, no la capacidad declarada; `details.capacity` sigue siendo 100 (el dato del registro).
6. Rol habilitante: **solo ADMIN**; límite default **+10%**; observación obligatoria (OQ-043 → BR-036 ampliada resuelta).
7. Alcance: la misma verificación de techo aplica a **todos** los caminos de escritura de segmentos, incluida el **alta directa a sector** (`POST /cargos` con `locationId`) — aceptada por debajo del techo y auditada igual al superarlo (BR-036; API.md §5.2).

---

## ESC-011 — Alerta de capacidad en Dashboard y detalle de ubicación

**Objetivo**: validar la alerta `CAPACITY` derivada de la ocupación agregada de una ubicación (Σ segmentos activos ≥ umbral — BR-033/BR-036/§9) y su visibilidad en Dashboard y detalle de ubicación (TC-074).
**Roles y datos**: `operator.test`; Sector 7 (capacity 100 m²) completado con cargas de prueba `E2E-ESC11a/b` hasta 92 m² (92% ≥ umbral danger **>90%** configurable — OQ-046 resuelta; unidad efectiva OQ-041 → BR-041; DP-QA-25 cerrada).
**Ambiente**: staging reseteado; job real de alertas ejecutado (OQ-007 → ADR-012: BullMQ en v1) o cálculo en vivo (OQ-031 resuelta).

**Pasos**
1. Login con `operator.test`; crear/distribuir `E2E-ESC11a/b` hasta superar el umbral del Sector 7 (92 m²).
2. Abrir el Dashboard y localizar la alerta `CAPACITY` del Sector 7.
3. Abrir el detalle de la ubicación Sector 7 (mapa o listado).
4. Verificar capacidad/ocupación/disponible y la alerta asociada.
5. Egresar/mover una carga para bajar la ocupación bajo el umbral y verificar el estado de la alerta.

**Asserts**
1. La alerta `CAPACITY` se genera con la ocupación agregada ≥ umbral (BR-036/§9); el Dashboard la cuenta en `openAlerts`.
2. Detalle de ubicación: 92 m² ocupados, 8 m² disponibles y la alerta referenciada (BR-033/BR-040).
3. La alerta NO mueve cargas automáticamente (sin Movement nuevo; política §9 análoga a BR-014).
4. Al bajar la ocupación, la alerta deja de estar OPEN (o pasa a historial según la política de resolución de la implementación de alertas §9 — assert de "no abierta").
5. Umbral: **danger >90%** configurable; unidad de comparación: efectiva del LocationType (OQ-046 resuelta + BR-041; DP-QA-25 cerrada).

---

## Matriz escenario → casos → BR

| Escenario | Casos TC | BR verificadas | Fase de habilitación (TEST-PLAN) |
| --- | --- | --- | --- |
| ESC-001 | TC-011, TC-015, TC-018, TC-026, TC-037 | BR-001, BR-002, BR-006, BR-008, BR-018 | PHASE 3 → PHASE 10 (completo) |
| ESC-002 | TC-031, TC-033, TC-034, TC-035, TC-048 | BR-014, BR-015, BR-006 | PHASE 9 |
| ESC-003 | TC-041, TC-042, TC-043, TC-052 | BR-020 | PHASE 6 |
| ESC-004 | TC-044, TC-045, TC-046 | BR-011, BR-020, BR-013 | PHASE 11 |
| ESC-005 | TC-028, TC-027, TC-064 | BR-012, BR-013, BR-008, BR-011 | PHASE 8 |
| ESC-006 | TC-019, TC-006, TC-007, TC-052 | BR-006, BR-009, BR-010, BR-016 | PHASE 5 (con RBAC de PHASE 2) |
| ESC-007 | TC-016, TC-017, TC-015 | BR-002 | PHASE 3 |
| ESC-008 | TC-065, TC-069, TC-070, TC-072 | BR-032, BR-034, BR-037, BR-039, BR-040 | PHASE 4 → PHASE 5 (completo) |
| ESC-009 | TC-073, TC-075 | BR-038, BR-037 | PHASE 5 |
| ESC-010 | TC-067, TC-068 | BR-036 | PHASE 5 (flag admin — OQ-043 → BR-036 ampliada resuelta) |
| ESC-011 | TC-074 | BR-036, BR-033 | PHASE 9 |

## Criterios de aceptación (de este documento)

- Los 11 escenarios (ESC-001..ESC-011) tienen pasos numerados, asserts verificables y roles/datos deterministas (seeds §5 + fixtures).
- Cada escenario mapea a casos TC y BR, y declara la fase del `TEST-PLAN.md` que lo habilita.
- Los escenarios de distribución (ESC-008..ESC-011) verifican las invariantes M:N (suma distribuida ≤ total, ocupación agregada por unidad, residual en camión) con asserts concretos (OQ-041..045 resueltas 2026-09-23/24 → BR-041/042/048/049 y BR-036 ampliada).
- Los negativos obligatorios (movimiento sin observación; Viewer no mueve) están cubiertos en ESC-006, incluida la demostración BR-009 (API directa).
- Los flujos P0 incluyen verificación a11y (axe) y persistencia (recarga de página).
- Sin placeholders; las ambigüedades quedan como DECISIÓN PENDIENTE.

## Archivos involucrados

| Archivo | Relación |
| --- | --- |
| `docs/qa/E2E-SCENARIOS.md` (este) | Escenarios ESC-001..ESC-011 |
| `docs/qa/QA-STRATEGY.md` | Playwright (DP-QA-2), ambientes §5, reset de staging |
| `docs/qa/TEST-PLAN.md` | Fases y paquetes E2E incrementales |
| `docs/qa/TEST-CASES.md` | TC ejercitados por escenario |
| `docs/qa/ACCEPTANCE-CRITERIA.md` | Criterios que los asserts confirman |
| `docs/backend/API.md` | Códigos HTTP interceptados en asserts de red |
| `docs/MASTER-SPEC.md` | BR, seeds, roles, mapa, roadmap |

## Riesgos

| Riesgo | Impacto | Mitigación |
| --- | --- | --- |
| Suites E2E largas (> 15 min) | CI lento | Paralelización Playwright por workers; particionado por escenario (QA-STRATEGY §9) |
| ~~OQ-041..045~~ resueltas 2026-09-23/24 (BR-041/042/048/049, BR-036 ampliada) | ESC-008..ESC-011 con asserts concretos | Marcas [PENDIENTE] removidas; invariantes verificadas en unidad efectiva (DP-QA-21..25 cerradas) |
| Flakiness de interacción con SVG (hover/click) | ESC-003 inestable | Locators robustos (getByRole/testId), auto-wait de Playwright, retries acotados |
| ~~PDF~~ ADR-013/OQ-005 resueltas (HTML→PDF server-side) | ESC-001 montable | Assert de descarga + contenido verificable; detalle del assert 🔶 residual local (DP-QA-11) |
| ~~Fechas de permanencia~~ OQ-008 resuelta (2026-09-23: días corridos, base `entryDate`) | ESC-002 fixtures definitivos | Fixture `hoy − 31` estándar confirmado (DP-QA-5 cerrada) |
| ~~Editor de planos~~ OQ-015 resuelta (fuera de v1) | ESC-004 → backlog QA v2 | Escenario conservado; se ejecuta cuando exista el editor (DP-QA-7 cerrada) |
| Datos de producción alcanzables desde E2E | Contaminación/privacy (BR-017) | Reset obligatorio de staging; credenciales aisladas; prohibición de apuntar a prod |

## DECISIONES PENDIENTES

- **DP-QA-11** (heredada) → **parcialmente resuelta**: la estrategia quedó fijada (OQ-005 → **ADR-013, 2026-09-24: HTML→PDF server-side**); resta el detalle del assert de contenido 🔶 residual local de montaje. Ver `TEST-CASES.md`.
- **DP-QA-12** (heredada) → **cerrada (OQ-015 resuelta, 2026-09-24)**: el editor queda **fuera de v1** — ESC-004 pasa a backlog QA v2 (DP-QA-7 cerrada).
- **DP-QA-13** (heredada): parámetros de rate limit — 🔶 residual local sin OQ; no aplica a escenarios salvo que se agregue un ESC de brute force en UI.
- **DP-QA-17 — Persistencia de búsqueda/filtros en la URL**: ESC-007 asume que los filtros se conservan al recargar si `frontend/ROUTING.md` (W4) lo define; caso contrario, el assert se limita a la estabilidad de la vista. 🔶 Residual local sin OQ. ✔️ Impacto: assert 4 de ESC-007.
- **DP-QA-18 — Hover bidireccional lista↔mapa**: ESC-003 espera resaltado desde la lista hacia el mapa; la bidireccionalidad depende de la decisión de UX del mapa (W6; `ux/MAP-UX.md`). 🔶 Residual local sin OQ. ✔️ Impacto: assert 3 de ESC-003.
- **DP-QA-21..25 (heredadas de `QA-STRATEGY.md`)** → **cerradas 2026-09-24** (OQ-041 → BR-041; OQ-042 → BR-042; OQ-043 → BR-036 ampliada; OQ-044 → BR-048; OQ-045 → BR-049): asserts de ESC-008..ESC-011 concretos. Ver definiciones en `QA-STRATEGY.md`. ✔️ Impacto: asserts de los escenarios de distribución (completos).