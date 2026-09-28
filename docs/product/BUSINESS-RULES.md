# CargoOps — Business Rules (BUSINESS-RULES)

> Documento de producto del grupo **W1**.
> Fuente de verdad canónica: `docs/MASTER-SPEC.md` v0.3 — reglas canónicas **BR-001…BR-020 y BR-032…BR-042** (§6, ampliación 0.2 por secciones 62-70 + resolución OQ-041/042 → BR-041/BR-042), enums §4.3, roles §8, alertas §9. BR-021…BR-031 siguen `[PROPUESTA]`. Capa de validación, códigos y respuestas: `docs/backend/VALIDATION.md` y `docs/backend/ERROR-HANDLING.md` (W5) — este documento las referencia, no las redefine.
> Pendientes centralizados: `docs/OPEN-QUESTIONS.md` (OQ-001…OQ-045; **OQ-041/042 resueltas en v0.3** → BR-041/BR-042) + reportes en curso.
> Idioma del contenido: español profesional/neutral. Identificadores y filenames: inglés.

---

## 1. Purpose

Expandir las reglas de negocio canónicas **BR-001…BR-020 y BR-032…BR-042** del MASTER-SPEC §6 — que allí se listan como tabla de una línea — con: descripción operativa, severidad, capa y respuesta de validación (backend/UI), mensajes de error sugeridos y notas de implementación. Las BR-032…BR-040 provienen de la **ampliación 0.2 (secciones 62-70 del prompt maestro: distribución M:N vía `CargoLocation`, capacidad por unidad, movimientos parciales, descarga parcial)**; **BR-041/BR-042** formalizan las resoluciones **OQ-041** (unidad de capacidad por defecto por LocationType + override ADMIN) y **OQ-042** (camión como residual derivado, no Location) de la v0.3. Cada una cita su fuente. El documento agrega además las reglas **derivadas** BR-021…BR-031 marcadas `[PROPUESTA]` — NO se tocan en esta ampliación —: derivan de las canónicas o de decisiones documentadas (enums §4.3, máquina de estados §7, VALIDATION.md W5) y requieren ratificación del orquestador/negocio antes de implementarse.

Reglas de oro: (1) no se inventan reglas de negocio — toda ambigüedad real va a `## DECISIÓN PENDIENTE`; (2) las reglas `[PROPUESTA]` no son canónicas hasta ratificación; (3) cada BR cita su fuente para trazabilidad.

## 2. Context

- Las reglas canónicas BR-001…BR-020 y BR-032…BR-042 (ampliación 0.2 + resoluciones OQ-041/042 de v0.3) son **obligatorias en v1** (PRD §14) y ninguna puede ser desactivada por configuración en esta versión.
- La **autorización siempre se valida en backend** (BR-009): la UI solo replica estado para UX. Los mensajes sugeridos usan los **códigos de aplicación estables** del catálogo de `ERROR-HANDLING.md` §4.9 (W5), con `message` en español neutral (v1). El frontend nunca decide el resultado: muestra el `code`/`message` del backend.
- La capa de validación sigue el modelo de `VALIDATION.md` (W5): 1 = DTO (shape), 2 = servicio/dominio (reglas BR), 3 = constraints DB (última línea), G = guards (permisos).
- Severidad (MASTER-SPEC §6): **CRÍTICA** = bloquea la operación y la integridad de datos; **ALTA** = bloquea la operación; **MEDIA** = condiciona configuración/comportamiento.

## 3. Summary table BR-001…BR-020 y BR-032…BR-042

| BR | Regla (MASTER-SPEC §6) | Severidad | Respuesta canónica (W5) |
| --- | --- | --- | --- |
| BR-001 | No crear carga sin código | CRÍTICA | 400 `VALIDATION_ERROR` |
| BR-002 | Código de carga único — reglas exactas: `^[A-Z0-9][A-Z0-9./-]{2,31}$`, mayúsculas, case-insensitive (OQ-001 resuelta) | CRÍTICA | 409 `CARGO_CODE_DUPLICATE` |
| BR-003 | No mover una carga inexistente | CRÍTICA | 404 `CARGO_NOT_FOUND` |
| BR-004 | No mover a ubicación inactiva (status != ACTIVE) | CRÍTICA | 409 `LOCATION_INACTIVE` |
| BR-005 | No superar capacidad configurable; occupiedCapacity derivado = Σ CargoLocation activos en unidad compatible (BR-033/035) | CRÍTICA | 409 `CAPACITY_EXCEEDED` · 422 `UNIT_INCOMPATIBLE` (BR-035) |
| BR-006 | Observación obligatoria en todo movimiento de ubicación/estado | CRÍTICA | 400 (DTO) / 422 `BUSINESS_RULE_VIOLATION` |
| BR-007 | Observación obligatoria en todo cambio de estado | CRÍTICA | 400 (DTO) / 422 `BUSINESS_RULE_VIOLATION` |
| BR-008 | Todo movimiento genera historial reconstruible | CRÍTICA | Garantía transaccional (sin mensaje) |
| BR-009 | Permisos siempre validados en backend | CRÍTICA | 403 `FORBIDDEN` |
| BR-010 | Viewer no puede crear/mover/modificar/eliminar | ALTA | 403 `FORBIDDEN` |
| BR-011 | Operator no puede operaciones administrativas | ALTA | 403 `FORBIDDEN` |
| BR-012 | Admin puede soft delete/restaurar/revertir con historial y auditoría | ALTA | 403/409/422 según caso |
| BR-013 | Nunca borrar silenciosamente (soft delete + audit) | CRÍTICA | Garantía estructural + auditoría |
| BR-014 | Alerta de rezago > 30 días; nunca mover automáticamente | ALTA | Comportamiento de job + decisión humana |
| BR-015 | Fecha base de permanencia configurable (default entryDate) | MEDIA | Configuración (`settings`) |
| BR-016 | Transiciones de estado validadas en backend | CRÍTICA | 409 `INVALID_TRANSITION` |
| BR-017 | IP/userAgent equilibrados con privacidad en auditoría | MEDIA | Minimización en middleware |
| BR-018 | Exportación PDF según rol; sin datos no autorizados | ALTA | 403 `FORBIDDEN` (permiso `cargo.export_pdf`) |
| BR-019 | Notificaciones desacopladas de proveedores | MEDIA | Abstracción de canal (§4.3) |
| BR-020 | Planos/coordenadas como datos estructurados | ALTA | 400/409 (DTO `MapElementUpsert`) |

Reglas canónicas de la **ampliación 0.2** (secciones 62-70 del prompt maestro — distribución M:N, MASTER-SPEC §6):

| BR | Regla (MASTER-SPEC §6, ampliación 0.2) | Severidad | Respuesta canónica (W5) |
| --- | --- | --- | --- |
| BR-032 | Carga ↔ ubicaciones M:N vía `CargoLocation` (no `cargo.locationId` único) | CRÍTICA | 422 `BUSINESS_RULE_VIOLATION` (rule BR-032) |
| BR-033 | Ocupación de ubicación = Σ segmentos `CargoLocation` ACTIVOS en unidad compatible | CRÍTICA | Derivación (sin mensaje; violaciones en BR-005/035) |
| BR-034 | Σ de cantidades distribuidas ≤ total de la carga | CRÍTICA | 409 `DISTRIBUTION_EXCEEDS_TOTAL` (NUEVO — registrar en W5) |
| BR-035 | Capacidad calculada en unidad compatible; no sumar unidades incompatibles | CRÍTICA | 422 `UNIT_INCOMPATIBLE` (NUEVO — registrar en W5) |
| BR-036 | Sobreocupación solo con excepción administrativa (flag + auditoría + observación) | ALTA | 409 `CAPACITY_EXCEEDED` (sin flag) |
| BR-037 | Movimientos parciales soportados (cantidad/porcentaje); mover ≠ mover el 100 % | ALTA | 422 `BUSINESS_RULE_VIOLATION` (rule BR-037) |
| BR-038 | Descarga parcial; residual en camión = totalQuantity − Σ CargoLocation activos | ALTA | 409 `DISTRIBUTION_EXCEEDS_TOTAL` · 422 `UNIT_INCOMPATIBLE` |
| BR-039 | enteredAt en segmentos; alta/egreso de segmento generan movimiento e historial | CRÍTICA | 422 `BUSINESS_RULE_VIOLATION` (rule BR-039) · 404 `CARGO_LOCATION_NOT_FOUND` (NUEVO — registrar en W5) |
| BR-040 | Consultas de distribución: ubicaciones, cantidad, porcentaje, fechas, historial | MEDIA | 404 `CARGO_LOCATION_NOT_FOUND` · 403 `FORBIDDEN` |
| BR-041 | Unidad de capacidad por defecto por LocationType (Sector → AREA, Plazoleta/Scanner/Balanza → UNITS, otros → configurable), con override por ubicación permitido; gobernanza ADMIN y auditada (OQ-041 resuelta en v0.3) | MEDIA | 422 `BUSINESS_RULE_VIOLATION` (rule BR-041, si corresponde) · 403 `FORBIDDEN` (no-ADMIN) |
| BR-042 | El camión NO es una Location: "en camión" es residual derivado = totalQuantity − Σ CargoLocation activos (unidades compatibles); totalQuantity/totalUnit obligatorios para cargas con distribución parcial; UI muestra "En camión" como residual, nunca como nodo del mapa | CRÍTICA | 422 `CARGO_TOTAL_REQUIRED` (NUEVO — registrar en W5) · 409 `DISTRIBUTION_EXCEEDS_TOTAL` · 422 `UNIT_INCOMPATIBLE` |

> `CAPACITY_EXCEEDED` ya está en el catálogo ERROR-HANDLING.md §4.9 (W5). `DISTRIBUTION_EXCEEDS_TOTAL`, `UNIT_INCOMPATIBLE`, `CARGO_LOCATION_NOT_FOUND` y `CARGO_TOTAL_REQUIRED` son códigos requeridos por BR-032…BR-042 que **W5 debe registrar** en el catálogo (reportado como riesgo de este grupo).

---

## 4. Reglas canónicas expandidas (BR-001…BR-020)

### BR-001 — No crear carga sin código

| Campo | Valor |
| --- | --- |
| **Severidad** | CRÍTICA |
| **Descripción** | Toda carga debe crearse con un `code` (string, formatos heterogéneos §4.4-1) no vacío. Un alta sin código es inválida y no persiste ningún registro parcial. |
| **Validación** | Backend: DTO `@IsNotEmpty` (capa 1) + revalidación en el servicio (capa 2) · UI: campo obligatorio con validación inmediata, solo orientativa. |
| **Mensajes** | `VALIDATION_ERROR` (400) — "El código de carga es obligatorio." · `details.fields[].field = "code"`. |
| **Notas** | El código es string, NUNCA entero (§4.4-1). La regla no define el formato: eso es OQ-001 (véase BR-025 `[PROPUESTA]`). |

### BR-002 — Código de carga único

| Campo | Valor |
| --- | --- |
| **Severidad** | CRÍTICA |
| **Descripción** | No pueden existir dos cargas activas con el mismo código. La unicidad se garantiza en backend + índice único en DB (`uq_cargo_code`). Las reglas **exactas** quedan formalizadas en BR-002 (OQ-001 resuelta 2026-09-23): regex `^[A-Z0-9][A-Z0-9./-]{2,31}$`, normalización a mayúsculas, unicidad case-insensitive; definen qué se considera "duplicado". |
| **Validación** | Backend: verificación en el servicio (capa 2) + unique constraint (capa 3, `P2002`) · UI: mensaje de duplicado mostrado al fallar el alta. |
| **Mensajes** | `CARGO_CODE_DUPLICATE` (409) — "Ya existe una carga con el código {code}." |
| **Notas** | Mapeo de `P2002` a `CARGO_CODE_DUPLICATE` por `meta.target` (ERROR-HANDLING §4.5). La edición del código post-registro es decisión de negocio pendiente (W1-Q14). |

### BR-003 — No mover una carga inexistente

| Campo | Valor |
| --- | --- |
| **Severidad** | CRÍTICA |
| **Descripción** | Todo movimiento (o cambio de estado) referencia una carga existente y no eliminada (soft). Una carga no encontrada o soft-deleted no admite movimientos. |
| **Validación** | Backend: lectura con lock dentro de la transacción (capa 2; BR-003 en `moveCargo()`) · UI: navegación solo desde cargas listadas. |
| **Mensajes** | `CARGO_NOT_FOUND` (404) — "La carga {code} no existe o fue eliminada." |
| **Notas** | Incluye soft-deleted (ADR-011: los scopes usan `deletedAt IS NULL`). |

### BR-004 — No mover carga a una ubicación inactiva

| Campo | Valor |
| --- | --- |
| **Severidad** | CRÍTICA |
| **Descripción** | El destino de un movimiento debe tener `status ACTIVE`. Ubicaciones `INACTIVE` o `MAINTENANCE` no pueden recibir carga. |
| **Validación** | Backend: validación en el servicio con lock del destino (capa 2, `LOCATION_INACTIVE`) · UI: destinos inactivos no seleccionables o advertidos. |
| **Mensajes** | `LOCATION_INACTIVE` (409) — "La ubicación {name} no está activa y no puede recibir carga." |
| **Notas** | La regla cubre el **destino**. La desactivación de una ubicación con carga presente está cubierta por BR-023 `[PROPUESTA]` (422 `LOCATION_HAS_CARGO`, W5). |

### BR-005 — No superar la capacidad configurable de una ubicación (por unidad)

| Campo | Valor |
| --- | --- |
| **Severidad** | CRÍTICA |
| **Descripción** | Ningún movimiento ni segmento de distribución puede dejar `occupiedCapacity > capacity` en la ubicación destino. `occupiedCapacity` es **derivado** = Σ de segmentos `CargoLocation` ACTIVOS en unidad compatible (BR-033/BR-035); `availableCapacity = capacity − occupiedCapacity`. `UNLIMITED` no aplica tope. La única vía para exceder es la excepción administrativa explícita de sobreocupación (BR-036, flag `allowOverOccupation` — OQ-043). |
| **Validación** | Backend: recálculo de `occupiedCapacity` dentro de la transacción con `pg_advisory_xact_lock` por locationId; origen −Δ, destino +Δ (capa 2); unidades compatibles validadas antes de sumar (BR-035) · UI: indicador de ocupación por unidad (CapacityIndicator: ocupado/disponible) antes de mover. |
| **Mensajes** | `CAPACITY_EXCEEDED` (409) — "La ubicación {name} no admite más carga (ocupado {used}/{capacity} {unit})." · Unidades incompatibles: 422 `UNIT_INCOMPATIBLE` con `details: { unitA, unitB }` (BR-035). |
| **Notas** | Alineada a la ampliación 0.2 (fuente: secciones 62-70, §4.1 y §4.4-8): `capacityValue`/`capacityUsed` quedan reemplazados por `capacity` + `capacityUnit` + `occupiedCapacity`/`availableCapacity` derivados (`Location`, §4.1). Unidad por defecto por LocationType: **resuelta (BR-041, OQ-041)** — la unidad efectiva de una ubicación es `override` (Location.capacityUnit) ?? default por tipo. Sobreocupación: BR-036/**OQ-043**. Detalle transaccional: BR-030 `[PROPUESTA]`. |

### BR-006 / BR-007 — Observación obligatoria (movimiento y cambio de estado)

| Campo | Valor |
| --- | --- |
| **Severidad** | CRÍTICA |
| **Descripción** | Todo movimiento de ubicación/estado (BR-006) y todo cambio de estado (BR-007) requiere una observación no vacía, persistida en la misma transacción con relación 1:1 (Movement ↔ Observation). Las notas de carga sin movimiento NO caen bajo esta regla (US-013). |
| **Validación** | Triple capa: 1) DTO `@IsNotEmpty @MaxLength(2000)` → 400; 2) servicio revalida con `trim()` → 422 `BUSINESS_RULE_VIOLATION { rule: 'BR-006' | 'BR-007' }`; 3) DB `observation_id NOT NULL UNIQUE` + `CHECK (length(trim(text)) > 0)` · UI: ObservationDialog con el campo obligatorio enfocado. |
| **Mensajes** | 400: "La observación es obligatoria." · 422: "Se requiere una observación no vacía para este movimiento/cambio de estado." (`details.rule`) |
| **Notas** | Expansión propuesta (no vacía ni solo espacios, longitud 2000): BR-031 `[PROPUESTA]`. La **observación inicial del alta** es **obligatoria** (BR-006, OQ-022 resuelta 2026-09-23); el INGRESS genera observación en el alta. |

### BR-008 — Todo movimiento genera historial

| Campo | Valor |
| --- | --- |
| **Severidad** | CRÍTICA |
| **Descripción** | Todo movimiento persistido permite reconstruir la línea temporal de la carga (qué, quién, cuándo, desde dónde, hacia dónde, por qué). |
| **Validación** | No es una validación con mensaje: es una garantía estructural y transaccional (movimiento + observación + auditoría en la misma transacción, VALIDATION.md §4.7). QA verifica reconstrucción (W8). |
| **Mensajes** | No aplica. |
| **Notas** | El historial incluye reversiones (REVERSION) y egresos (OQ-004 → BR-043 resuelta: EXIT con observación obligatoria, EXITED terminal). UI: MovementTimeline (US-034). |

### BR-009 — Permisos siempre en backend

| Campo | Valor |
| --- | --- |
| **Severidad** | CRÍTICA |
| **Descripción** | La autorización se valida SIEMPRE en backend (guards por endpoint). El frontend jamás es la única capa de autorización; sus guards solo ocultan UX. |
| **Validación** | Backend: `AuthGuard` + `PermissionsGuard` (capa G) → 401/403 · UI: acciones ocultas por rol, no autoritativas. |
| **Mensajes** | `UNAUTHORIZED` (401) — "Sesión inválida o expirada." · `FORBIDDEN` (403) — "No tiene permisos para realizar esta operación." |
| **Notas** | Permisos granulares tipo `cargo.create`, `cargo.move`, `cargo.export_pdf`, `map.edit`, `users.manage` (ADR-009). |

### BR-010 — Viewer no puede crear/mover/modificar/eliminar

| Campo | Valor |
| --- | --- |
| **Severidad** | ALTA |
| **Descripción** | El rol Viewer es de lectura pura: dashboard, cargas, detalle, mapa, historial y exportaciones autorizadas (BR-018). Ninguna acción de escritura. |
| **Validación** | Backend: bundle VIEWER sin permisos de escritura (capa G) → 403 · UI: sin controles de escritura. |
| **Mensajes** | `FORBIDDEN` (403) — "El rol Viewer solo permite consultas." |
| **Notas** | Matriz de roles §8 aplicada en seeds y tests (P2-H2). |

### BR-011 — Operator no puede operaciones administrativas

| Campo | Valor |
| --- | --- |
| **Severidad** | ALTA |
| **Descripción** | Operator no puede: eliminar definitivo, restaurar, revertir, editar estructura crítica del plano ni configuración global. Puede la operación diaria (crear cargas/camiones, mover, estados, observaciones). |
| **Validación** | Backend: permisos administrativos solo en ADMIN (capa G) → 403 · UI: secciones admin ocultas. |
| **Mensajes** | `FORBIDDEN` (403) — "Esta operación requiere rol Admin." |
| **Notas** | "Estructura crítica del plano" sin umbral formal → W1-Q15 (propiedades editables del plano). |

### BR-012 — Admin: soft delete, restaurar, revertir con historial y auditoría

| Campo | Valor |
| --- | --- |
| **Severidad** | ALTA |
| **Descripción** | Solo ADMIN elimina (soft), restaura y revierte. Toda reversión genera historial (REVERSION) y auditoría (AuditAction.REVERT); el historial original nunca se borra. |
| **Validación** | Backend: guard ADMIN + servicio valida reversibilidad (`kind=REVERSION`, sin REVERSION sobre REVERSION; `reversionOfId` solo en REVERSION) → 403/409/422 · UI: ConfirmDialog con advertencia. |
| **Mensajes** | `FORBIDDEN` (403) — "Solo Admin puede revertir/restaurar." · inválida: 409/422 `BUSINESS_RULE_VIOLATION`. |
| **Notas** | Alcance de reversión (último movimiento vs cualquiera): W1-Q2 · expansión detallada: BR-021 `[PROPUESTA]`. |

### BR-013 — Nunca borrar silenciosamente

| Campo | Valor |
| --- | --- |
| **Severidad** | CRÍTICA |
| **Descripción** | No existe hard delete en operaciones. Eliminar = soft delete (`deletedAt`) + AuditLog con actor y valores previos/nuevos, en la misma transacción. |
| **Validación** | Estructural (capa 2/3): ADR-011, scopes `deletedAt IS NULL`, auditoría obligatoria en la transacción. |
| **Mensajes** | No aplica (sin mensaje; el alta a DELETE simplemente no existe). |
| **Notas** | Aplica a Cargo, Truck, Location, User y demás entidades con `deletedAt` (§4.1). |

### BR-014 — Alerta de rezago: permanencia > 30 días; nunca mover automáticamente

| Campo | Valor |
| --- | --- |
| **Severidad** | ALTA |
| **Descripción** | El sistema detecta permanencia > 30 días (por defecto desde `entryDate`) y genera una alerta `STALE_30D` OPEN. **Jamás** mueve la carga automáticamente: la decisión de pasar a Rezago es humana, con observación (BR-006/007). |
| **Validación** | Backend: job periódico (no una API) + dedupe para idempotencia (JOBS.md §5.1; BR-026 `[PROPUESTA]`) · UI: alertas visibles en Dashboard y en la carga (§9). |
| **Mensajes** | No aplica mensaje de error; sí texto de alerta: "La carga {code} lleva {n} días en el predio." |
| **Notas** | Días **corridos**, fecha base `entryDate` y segunda alerta (40): OQ-008 resuelta → BR-014/015. Flujo: §9 y UC-010. |

### BR-015 — Fecha base de permanencia configurable

| Campo | Valor |
| --- | --- |
| **Severidad** | MEDIA |
| **Descripción** | La permanencia se calcula por defecto desde `entryDate` (ingreso al predio). Días umbral, fecha base y segunda alerta serán configurables en el futuro (hoy: defaults canónicos vigentes). |
| **Validación** | Backend: cálculo en el job de alertas; parámetros en `settings` cuando se habiliten (US-044) · UI: sin configuración expuesta en v1. |
| **Mensajes** | No aplica. |
| **Notas** | OQ-008 resuelta (2026-09-23): días corridos, base `entryDate` (BR-014/015). |

### BR-016 — Transiciones de estado validadas en backend

| Campo | Valor |
| --- | --- |
| **Severidad** | CRÍTICA |
| **Descripción** | El frontend no puede cambiar estados arbitrariamente. Toda transición de CargoStatus se valida contra la máquina de estados canónica (MASTER-SPEC §7) en el servicio de dominio; la matriz detallada es la de VALIDATION.md §6.2 (W5). `IN_TRANSIT` lo genera solo el sistema; `DELETED`/`EXITED` no llegan por DTO del cliente. |
| **Validación** | Backend: `assertTransition(from, to, kind)` dentro de la transacción (capa 2) → 409 `INVALID_TRANSITION` · UI: estados de destino filtrados según el estado actual. |
| **Mensajes** | `INVALID_TRANSITION` (409) — "No se puede pasar de {from} a {to}." con `details: { from, to }` |
| **Notas** | Ratificación de la matriz (RETORNO DE REZAGO/SECUESTRO, saltos, estado inicial del alta): **OQ-029 resuelta (2026-09-23 → BR-045)** — se confirman las propuestas de VALIDATION §4.4.3; saltos no adyacentes prohibidos (409). Combos estado×tipo de ubicación: 🔶 residual local W1-Q12. |

### BR-017 — IP/userAgent equilibrados con privacidad

| Campo | Valor |
| --- | --- |
| **Severidad** | MEDIA |
| **Descripción** | La auditoría/logs no guardan datos sensibles innecesarios. IP truncada/anonimizada y userAgent minimizado; nunca tokens, contraseñas ni bodies completos. |
| **Validación** | Backend: middleware de minimización previo a Auditoría y logs (capa transversal) · UI: no aplica. |
| **Mensajes** | No aplica. |
| **Notas** | ERROR-HANDLING.md §4.7 (W5) detalla la lista negra de campos. |

### BR-018 — Exportación PDF según rol; sin datos no autorizados

| Campo | Valor |
| --- | --- |
| **Severidad** | ALTA |
| **Descripción** | La exportación PDF requiere permiso (`cargo.export_pdf`); el documento contiene solo datos que el rol puede ver. Un rol sin permiso recibe 403 sin generar documento. |
| **Validación** | Backend: guard + servicio filtra campos por rol (capa G + 2) → 403 · UI: PdfExportButton solo para roles autorizados. |
| **Mensajes** | `FORBIDDEN` (403) — "No tiene permiso para exportar." |
| **Notas** | Alcance del PDF (detalle vs listados): W1-Q8 · estrategia de generación: OQ-005/ADR-013. |

### BR-019 — Notificaciones desacopladas de proveedores

| Campo | Valor |
| --- | --- |
| **Severidad** | MEDIA |
| **Descripción** | El emisor de notificaciones depende de una abstracción de canal (IN_APP en v1; EMAIL/PUSH/WHATSAPP/WEBHOOK reservados §4.3), no de un proveedor concreto. |
| **Validación** | Backend: estructural (interfaz de canal + servicio de notificaciones) · UI: listado in-app (véase UC-026). |
| **Mensajes** | No aplica. |
| **Notas** | Eventos generadores de notificaciones in v1: W1-Q10. |

### BR-020 — Planos/coordenadas como datos estructurados

| Campo | Valor |
| --- | --- |
| **Severidad** | ALTA |
| **Descripción** | El plano se guarda como datos estructurados (Map, MapElement con x/y/width/height/rotation/zIndex/properties), nunca como imagen. El mapa de vista renderiza desde esos datos. |
| **Validación** | Backend: DTO `MapElementUpsert` (capa 1) + validación de superposición/duplicados según OQ-015 (409 `MAP_ELEMENT_CONFLICT`) · UI: editor con grid/snap. |
| **Mensajes** | `MAP_ELEMENT_CONFLICT` (409) — "El elemento se superpone con {name}." (si se adopta validación geométrica, OQ-015) |
| **Notas** | Propiedades editables del plano en v1: W1-Q15 · motor SVG: ADR-006. |

---

## 4b. Reglas canónicas de distribución M:N (BR-032…BR-040) — ampliación 0.2 (secciones 62-70)

> Fuente de cada regla: secciones 62-70 del prompt maestro (modelo §4.1/§4.2, enums §4.3, decisiones §4.4, alertas §9, endpoints §10), consolidadas como canónicas en MASTER-SPEC §6 (v0.2). BR-021…BR-031 NO se modifican.

### BR-032 — Distribución M:N de cargas y ubicaciones (vía CargoLocation)

| Campo | Valor |
| --- | --- |
| **Severidad** | CRÍTICA |
| **Fuente** | Secciones 62-64 (MASTER-SPEC §4.1 `CargoLocation`, §4.2, §4.4-8). |
| **Descripción** | Una carga puede ocupar simultáneamente N ubicaciones; la relación Cargo↔Location es MANY-TO-MANY mediante la entidad intermedia `CargoLocation`. NO existe `cargo.locationId` único. En operación normal existe una única fila `ACTIVE` por par (cargo, location): los ajustes actualizan la fila, no la duplican. |
| **Validación** | Backend: el servicio de distribución opera exclusivamente vía CargoLocation (crear, actualizar, egresar segmentos; capa 2); DTOs sin `locationId` único en Cargo (capa 1); unicidad de fila ACTIVE por par (capa 3) · UI: selección de ubicaciones y cantidades por segmento. |
| **Mensajes** | Carga con `locationId` único (legacy) o fila ACTIVE duplicada para el mismo par: 422 `BUSINESS_RULE_VIOLATION { rule: 'BR-032' }` — "La distribución de una carga se gestiona por segmentos de ubicación (CargoLocation); no se admite una ubicación única ni segmentos activos duplicados." |
| **Notas** | Modelo compatible con un futuro `CargoItem` que NO se introduce en v1 (OQ-002 resuelta, §4.4-5). |

### BR-033 — Ocupación de una ubicación = Σ de segmentos activos

| Campo | Valor |
| --- | --- |
| **Severidad** | CRÍTICA |
| **Fuente** | Secciones 65-66 (MASTER-SPEC §4.1 `Location.occupiedCapacity`, §9 alerta `CAPACITY`; seed Sector 4: 35 + 25 + 20 = 80/100 m²). |
| **Descripción** | Una ubicación puede contener N cargas simultáneamente. Su ocupación (`occupiedCapacity`) es **derivada** = suma de los segmentos `CargoLocation` ACTIVOS en unidad compatible (BR-035). Varias cargas aportan ocupación a la misma ubicación. |
| **Validación** | Backend: agregación calculada en servicio/repositorio (capa 2), nunca persistida manualmente; consistencia verificada en la transacción de creación/ajuste/egreso de segmentos y movimientos · UI: CapacityIndicator y consultas de ubicación muestran ocupado/disponible por unidad. |
| **Mensajes** | No aplica mensaje propio: la violación de capacidad cae en BR-005/036 (`CAPACITY_EXCEEDED`); unidades incompatibles en BR-035 (`UNIT_INCOMPATIBLE`). |
| **Notas** | `occupiedCapacity`/`availableCapacity` alimentan mapa (§11.5), dashboard y alerta de capacidad (§9). |

### BR-034 — La suma distribuida de una carga no supera su total

| Campo | Valor |
| --- | --- |
| **Severidad** | CRÍTICA |
| **Fuente** | Secciones 66-67 (MASTER-SPEC §4.4-5, `Cargo.totalQuantity`/`totalUnit` §4.1). |
| **Descripción** | La suma de cantidades de los segmentos `CargoLocation` activos de una carga no puede superar su `totalQuantity` (misma unidad o PERCENT; OQ-044/OQ-045). El excedente permanece en camión como residual (BR-038); el residual nunca es negativo. |
| **Validación** | Backend: recalculo de Σ CargoLocation activos de la carga al crear/ajustar segmentos y en movimientos parciales, dentro de la transacción (capa 2) · UI: validación anticipada del formulario de distribución. |
| **Mensajes** | `DISTRIBUTION_EXCEEDS_TOTAL` (409) — "La distribución suma {sum} {unit}; supera el total de la carga ({total} {unit})." (`details: { sum, total, unit }`) |
| **Notas** | Código NUEVO a registrar en ERROR-HANDLING (W5). OQ-044 define la compatibilidad de unidades; OQ-045 la semántica de `percentage`. |

### BR-035 — Capacidad calculada dentro de una unidad compatible

| Campo | Valor |
| --- | --- |
| **Severidad** | CRÍTICA |
| **Fuente** | Sección 68 (MASTER-SPEC §4.3 `QuantityUnit`/`CapacityType`). |
| **Descripción** | La capacidad y la ocupación de una ubicación se calculan dentro de una unidad compatible: misma unidad base o PERCENT. No se suman unidades incompatibles (m² + toneladas + pallets) sin conversión. El sistema rechaza la operación y NO convierte en v1 (la conversión requiere altura/densidad — OQ-044). |
| **Validación** | Backend: normalización de unidad entre segmentos, ubicación y totales antes de cualquier suma (capa 2) · UI: selector de unidad coherente con la unidad de la ubicación destino. |
| **Mensajes** | `UNIT_INCOMPATIBLE` (422) — "No se puede sumar {unitA} con {unitB} en {location}: unidades incompatibles." (`details: { unitA, unitB }`) |
| **Notas** | Código NUEVO a registrar en ERROR-HANDLING (W5). OQ-044 confirma el default "no convertir en v1". |

### BR-036 — Sobreocupación solo por excepción administrativa explícita

| Campo | Valor |
| --- | --- |
| **Severidad** | ALTA |
| **Fuente** | Secciones 68-69 (MASTER-SPEC §4.1 `Location.allowOverOccupation`, §9). |
| **Descripción** | No superar la capacidad configurada de una ubicación salvo excepción administrativa explícita: flag `allowOverOccupation` en la ubicación + auditoría + observación. Pendiente: límite de % extra autorizado, rol autorizante y si exige observación obligatoria (**OQ-043**). |
| **Validación** | Backend: servicio (capa 2) valida BR-005/033; si `occupiedCapacity > capacity`, exige flag activo + AuditLog (`CAPACITY_CHANGE`/`MOVE` con `metadata.overOccupation = true`) + observación · UI: advertencia explícita de sobreocupación antes de confirmar. |
| **Mensajes** | Sin flag: 409 `CAPACITY_EXCEEDED` — "La ubicación {name} superaría su capacidad; requiere autorización administrativa de sobreocupación (BR-036)." Con flag: procede con advertencia, no bloquea. |
| **Notas** | Gobernanza completa (flag por ubicación, % extra, rol, observación): OQ-043 → **resuelta (BR-036 ampliada, 2026-09-24)**: `allowOverOccupation`, límite default **+10%**, autorización **solo ADMIN**, observación obligatoria + auditoría `CAPACITY_CHANGE`. |

### BR-037 — Movimientos parciales soportados (cantidad/porcentaje)

| Campo | Valor |
| --- | --- |
| **Severidad** | ALTA |
| **Fuente** | Secciones 66-67 (MASTER-SPEC §4.2: Movement vincula CargoLocation de origen/destino para movimientos parciales; seed MOVE 20 m² de 029TERRA26: Sector 3 → Sector 5). |
| **Descripción** | Un movimiento puede trasladar solo parte de una carga (cantidad o porcentaje): mover NO equivale a mover el 100 %. El movimiento parcial ajusta los segmentos CargoLocation de origen y destino y registra Movement con la cantidad/porcentaje en metadata. |
| **Validación** | Backend: servicio (capa 2) valida cantidad > 0 y ≤ residual del segmento origen, unidad compatible (BR-035), Σ ≤ total (BR-034), capacidad destino (BR-005/036), observación e historial (BR-006/008) · UI: formulario de movimiento con cantidad o porcentaje. |
| **Mensajes** | Residuo de origen insuficiente: 422 `BUSINESS_RULE_VIOLATION { rule: 'BR-037' }` — "El segmento de {location} tiene {available} {unit}; no puede mover {requested} {unit}." Unidades: 422 `UNIT_INCOMPATIBLE` (BR-035). |
| **Notas** | La semántica de porcentaje al mover depende de OQ-045 (resuelta 2026-09-24 → BR-049: derivado de UI; input solo con unidad `PERCENT`). |

### BR-038 — Descarga parcial: residual en camión

| Campo | Valor |
| --- | --- |
| **Severidad** | ALTA |
| **Fuente** | Sección 67 (MASTER-SPEC §7 residual; seed 036TERRA26: camión 40 % → Sector 4 60 % → luego Sector 5 40 %). |
| **Descripción** | La descarga parcial deja mercadería en el camión: **residual en camión = `totalQuantity − Σ CargoLocation activos`** (unidades compatibles, BR-035). Cada descarga parcial registra movimiento; la carga queda `PARTIALLY_UNLOADED` mientras exista residual y `STORED` cuando el residual es cero. La distribución multi-ubicación coexiste con cualquier estado (§7). |
| **Validación** | Backend: servicio (capa 2) recalcula el residual dentro de la transacción; rechaza descargas que excedan el residual (BR-034) o con unidades incompatibles (BR-035) · UI: indicador de residual en camión en detalle y panel de distribución. |
| **Mensajes** | Exceso sobre el residual: 409 `DISTRIBUTION_EXCEEDS_TOTAL` (BR-034) · unidades: 422 `UNIT_INCOMPATIBLE` (BR-035). |
| **Notas** | ¿El camión se modela como Location (`LocationType CAMION`) o el "en camión" es residual derivado vía `Cargo.truckId`? OQ-042 → **resuelta (BR-042, MASTER-SPEC v0.3)**: residual derivado `inTruckAmount`/`inTruckUnit` — el camión NO es una ubicación. |

### BR-039 — enteredAt en segmentos; alta/egreso generan movimiento e historial

| Campo | Valor |
| --- | --- |
| **Severidad** | CRÍTICA |
| **Fuente** | Secciones 66-67 (MASTER-SPEC §4.1 `CargoLocationStatus` ACTIVE/EXITED, §10 `DELETE /api/v1/cargos/:id/locations/:cargoLocationId`). |
| **Descripción** | Cada segmento `CargoLocation` ACTIVO registra `enteredAt`. El alta de un segmento (carga en una ubicación) y su egreso (retiro de la ubicación, `exitedAt` + status EXITED) generan movimiento e historial (BR-006/008): crear segmento = movimiento de ingreso; egresar = movimiento de salida con observación obligatoria. |
| **Validación** | Backend: servicio (capa 2) exige movimiento + observación en el alta y el egreso de segmentos; `enteredAt`/`exitedAt` coherentes con el timestamp del movimiento; transaccional · UI: al egresar un segmento, ObservationDialog obligatorio. |
| **Mensajes** | Sin movimiento asociado: 422 `BUSINESS_RULE_VIOLATION { rule: 'BR-039' }` — "El alta/egreso de un segmento requiere movimiento e historial." Segmento inexistente: 404 `CARGO_LOCATION_NOT_FOUND`. |
| **Notas** | Código NUEVO `CARGO_LOCATION_NOT_FOUND` a registrar en ERROR-HANDLING (W5). |

### BR-040 — Consultas de distribución expuestas (carga y ubicación)

| Campo | Valor |
| --- | --- |
| **Severidad** | MEDIA |
| **Fuente** | Secciones 69-70 (MASTER-SPEC §10 endpoints `/cargos/:id/locations` y `/locations/:id/cargos`; §11.5 selección en el mapa). |
| **Descripción** | Las consultas de distribución exponen: para una carga → todas sus ubicaciones con cantidad ocupada, porcentaje, estado del segmento, `enteredAt`/`exitedAt` e historial de movimientos; para una ubicación → todas sus cargas con ocupación total, disponible, cantidad, alertas y las próximas a 30 días. |
| **Validación** | Backend: endpoints de consulta (capa 2) con agregación derivada (BR-033) y permisos de lectura (BR-009/010) · UI: DistributionPanel en el detalle de carga y en el detalle de ubicación; alternativa de listado accesible. |
| **Mensajes** | Segmento inexistente: 404 `CARGO_LOCATION_NOT_FOUND` · sin permiso de lectura: 403 `FORBIDDEN` (BR-009). |
| **Notas** | Semántica de `percentage` expuesto (¿almacenado o derivado de UI?): OQ-045 → **resuelta (BR-049, 2026-09-24)**: derivado de UI e informativo; input solo si unidad `PERCENT`. |

---

## 5. Reglas derivadas (BR-021…BR-031) — `[PROPUESTA]`

> Derivadas de las canónicas, de la máquina de estados §7, de los enums §4.3 o de validaciones ya documentadas por W5. **Requieren ratificación** (PBQ-11 del backlog). Sin ratificación no se implementan como reglas exigibles.

### BR-021 — Reversión conserva historial original `[PROPUESTA]`

| Campo | Valor |
| --- | --- |
| **Deriva de** | BR-012, §7, VALIDATION.md §4.7 |
| **Descripción** | La reversión inserta un movimiento `kind=REVERSION` que restaura estado/ubicación previos; el movimiento original se conserva íntegro (marcado por `reversionOfId`). No se permite REVERSION sobre REVERSION. Observación obligatoria (BR-006/007). Se audita `AuditAction.REVERT`. |
| **Validación** | Servicio (capa 2): validar movimiento objetivo reversible, observación, alerta de conflictos; guard ADMIN (capa G). |
| **Mensajes** | 422 `BUSINESS_RULE_VIOLATION { rule: 'BR-021' }` — "El movimiento no es reversible." · `FORBIDDEN` (403) para no-Admin. |
| **Alcance pendiente** | ¿Último movimiento de la cadena o cualquiera? → **W1-Q2**. |

### BR-022 — Estados de alerta solo por acción humana autorizada `[PROPUESTA]`

| Campo | Valor |
| --- | --- |
| **Deriva de** | §9, FEATURE-023 (US-039), VALIDATION.md §4.8 |
| **Descripción** | Las transiciones de AlertStatus (OPEN → ACKNOWLEDGED → RESOLVED/DISMISSED, §4.3) se ejecutan solo por acción de un usuario autorizado; resolver/descartar una alerta exige observación. El sistema genera, no resuelve. |
| **Validación** | Servicio (capa 2): transición válida + observación → 409 `INVALID_ALERT_TRANSITION` / 422; auditoría del cambio. |
| **Mensajes** | `INVALID_ALERT_TRANSITION` (409) — "No se puede pasar la alerta de {from} a {to}." |
| **Pendiente** | Roles que pueden ACKNOWLEDGED/RESOLVED/DISMISSED → **W1-Q13**. |

### BR-023 — No desactivar/eliminar una ubicación con cargas asignadas `[PROPUESTA]`

| Campo | Valor |
| --- | --- |
| **Deriva de** | BR-004, BR-003, VALIDATION.md §5 (extra) |
| **Descripción** | Una ubicación con carga presente no puede pasar a `INACTIVE`/`MAINTENANCE` ni ser eliminada (soft): primero deben reubicarse las cargas (BR-004 protege el destino de esos movimientos). |
| **Validación** | Servicio `locations.update/remove` (capa 2): conteo de cargas activas → 422 `LOCATION_HAS_CARGO`. |
| **Mensajes** | `LOCATION_HAS_CARGO` (422) — "La ubicación {name} tiene {n} cargas asignadas; debe reubicarlas antes de desactivarla." |
| **Pendiente relacionado** | Cambio de tipo/código de una ubicación con cargas → **W1-Q15** (editor/propiedades). |

### BR-024 — No eliminar un camión con cargas activas `[PROPUESTA]`

| Campo | Valor |
| --- | --- |
| **Deriva de** | BR-013, US-014, §4.2 (Cargo N:1 Truck) |
| **Descripción** | Un camión con cargas activas asociadas no puede eliminarse (soft): se exige desasociar las cargas primero. Sin cargas activas, el soft delete procede con auditoría. |
| **Validación** | Servicio `trucks.remove` (capa 2): conteo de cargas con `truckId` vigente → 422 `BUSINESS_RULE_VIOLATION { rule: 'BR-024' }`. |
| **Mensajes** | "El camión {plate} tiene {n} cargas asociadas; desasócielas antes de eliminarlo." |
| **Notas** | Código no catalogado aún por W5: usa el patrón genérico 422 hasta que ERROR-HANDLING lo catalogue. Relación con OQ-003 (multi-camión). |

### BR-025 — Unicidad/normalización del código de carga `[PROPUESTA]`

| Campo | Valor |
| --- | --- |
| **Deriva de** | BR-002, OQ-001 |
| **Descripción** | Reglas formalizadas en **BR-002** (OQ-001 resuelta 2026-09-23): regex `^[A-Z0-9][A-Z0-9./-]{2,31}$`, normalización a mayúsculas, único **case-insensitive** con índice único `uq_cargo_code`; el contrato de error (`409`) no cambia. |
| **Validación** | Servicio + DB (capa 2 + 3) → 409 `CARGO_CODE_DUPLICATE`. |
| **Mensajes** | `CARGO_CODE_DUPLICATE` (409) — "Ya existe una carga con el código {code}." |
| **Notas** | También aplica a búsqueda (US-010/012): la normalización de búsqueda sigue a OQ-001 → BR-002 (resuelta). |

### BR-026 — Jobs de alertas idempotentes `[PROPUESTA]`

| Campo | Valor |
| --- | --- |
| **Deriva de** | BR-014, JOBS.md §5.1 (W5) |
| **Descripción** | El job de detección de permanencia no duplica alertas: no genera una segunda `STALE_30D` OPEN para una carga que ya tiene una abierta (dedupe/índice parcial). Retries de red no crean operaciones duplicadas (`DUPLICATE_OPERATION`). |
| **Validación** | Job (capa 2) + índice parcial de alertas abiertas (capa 3). |
| **Mensajes** | `DUPLICATE_OPERATION` (409) — "La operación ya fue registrada (Idempotency-Key reutilizada)." |
| **Notas** | OQ-007 resuelta (2026-09-24): jobs reales con BullMQ en v1 (ADR-012). |

### BR-027 — Descarga parcial: acumulado no supera el total `[PROPUESTA]`

| Campo | Valor |
| --- | --- |
| **Deriva de** | §4.4-5 (quantity/quantityMoved), OQ-002, US-020 |
| **Descripción** | La suma de `quantityMoved` de los movimientos de descarga de una carga no puede superar su `quantity`. Si la carga no declara `quantity`, el control depende de OQ-002/OQ-009 (resueltas 2026-09-23/24: sin CargoItem en v1 — distribución vía `CargoLocation`; unidad efectiva BR-041; default: sin tope hasta declarar `quantity`). |
| **Validación** | En la transacción del movimiento (capa 2) → 422 `BUSINESS_RULE_VIOLATION { rule: 'BR-027' }`. |
| **Mensajes** | "La cantidad descargada ({moved}/{total}) supera el total de la carga." |
| **Notas** | OQ-002 resuelta (2026-09-23): CargoItem NO se introduce en v1 — la regla queda vigente con `CargoLocation`. |

### BR-028 — Egreso/retiro: EXITED solo por operación autorizada `[PROPUESTA]`

| Campo | Valor |
| --- | --- |
| **Deriva de** | §7 (EXITED), OQ-004, W1-Q7 |
| **Descripción** | El estado `EXITED` solo es alcanzable por una operación de egreso/retiro autorizada, con observación e historial (BR-043, OQ-004 resuelta 2026-09-23): movimiento `EXIT` con observación obligatoria, remito/documentación opcionales y auditoría; EXITED es terminal y está habilitado en v1. |
| **Validación** | Servicio (capa 2) cuando exista la operación; hoy: fuera de alcance funcional. |
| **Mensajes** | Aplica en v1 (BR-043 vigente). |
| **Notas** | La máquina de estados de VALIDATION.md §6.2 ya reserva la transición. |

### BR-029 — Patente de camión única y obligatoria `[PROPUESTA]`

| Campo | Valor |
| --- | --- |
| **Deriva de** | US-014 (AC), PHASES P3-T5, ERROR-HANDLING (TRUCK_PLATE_DUPLICATE) |
| **Descripción** | Todo camión se registra con patente no vacía y única (`uq_trucks_plate`). Duplicado → 409. Los demás campos (brand, model, driverName) son opcionales. |
| **Validación** | DTO (`@IsNotEmpty` en plate) + servicio + índice único (capa 1+2+3). |
| **Mensajes** | `TRUCK_PLATE_DUPLICATE` (409) — "Ya existe un camión con la patente {plate}." |
| **Notas** | Ratificación cerrada: la patente **obligatoria** con formato MERCOSUR quedó formalizada (ID-009, 2026-09-23 → DP-SC-05/DP-UF-06: `^[A-Z]{2,3}\d{2}[A-Z0-9]$`). |

### BR-030 — Capacidad validada y recalculada transaccionalmente `[PROPUESTA]`

| Campo | Valor |
| --- | --- |
| **Deriva de** | BR-005, VALIDATION.md §4.5 |
| **Descripción** | La validación de capacidad corre dentro de `prisma.$transaction` con advisory lock por locationId, recalculando `occupiedCapacity` de origen/destino (Σ CargoLocation activos en unidad compatible) en la misma transacción que el movimiento. Cargas sin unidades compatibles → rechazo con `unit_mismatch`. |
| **Validación** | Servicio (capa 2, transaccional) → 409 `CAPACITY_EXCEEDED` / 422 `BUSINESS_RULE_VIOLATION`. |
| **Mensajes** | Ver BR-005. |
| **Notas** | Fórmula exacta según OQ-041/OQ-044. Divergencia de `occupiedCapacity` post movimiento = bug crítico (tests W8). |

### BR-031 — Observación no vacía ni solo espacios `[PROPUESTA]`

| Campo | Valor |
| --- | --- |
| **Deriva de** | BR-006/007, VALIDATION.md §4.6 |
| **Descripción** | La observación obligatoria debe tener texto significativo: `trim()` no vacío y longitud máxima 2000 caracteres. Aplica a movimientos, cambios de estado, reversiones y resolución de alertas. |
| **Validación** | DTO `@IsNotEmpty @MaxLength(2000)` (capa 1) + revalidación con `trim()` en servicio (capa 2) + `CHECK (length(trim(text)) > 0)` en DB (capa 3). |
| **Mensajes** | 400/422 — "La observación no puede estar vacía o contener solo espacios." |
| **Notas** | Complementa BR-006/007; no aplica a notas de carga sin movimiento (US-013), que también exigen texto no vacío pero sin relación 1:1. |

---

## 6. Traceability matrix BR → Source → US → UC

| BR | Fuente principal | US (backlog W1) | UC (USE-CASES.md) |
| --- | --- | --- | --- |
| BR-001 | MASTER-SPEC §6 | US-008/009 | UC-003 |
| BR-002 | §6 + OQ-001 | US-008/009 | UC-003 |
| BR-003 | §6 | US-019 | UC-009, UC-015 |
| BR-004 | §6 | US-016/019 | UC-008/009/021 |
| BR-005 | §6 + OQ-009 + §§62-70 (BR-033/035) | US-017/018/019/020/021/051 | UC-008/009/021/029/032 |
| BR-006/007 | §6 | US-019/020/021/024/025 | UC-007/008/009/010/011/012/013/015 |
| BR-008 | §6 | US-019/034 | UC-009/014/015 |
| BR-009 | §6 | US-006/007 | Todos (excepciones) |
| BR-010 | §6 + §8 | US-006 | UC-001/004/014/016/018/019 |
| BR-011 | §6 + §8 | US-007 | UC-020/021/022/023 |
| BR-012 | §6 + §8 | US-027 | UC-015/022 |
| BR-013 | §6 + ADR-011 | US-036 | UC-022 |
| BR-014 | §6 + §9 | US-037/038 | UC-010/017 |
| BR-015 | §6 + OQ-008 | US-037/044 | UC-010 |
| BR-016 | §6 + §7 | US-019/022/023/024 | UC-009/010/011/012/013 |
| BR-017 | §6 | US-035/036 | UC-025 |
| BR-018 | §6 + W1-Q8 | US-040/041 | UC-016 |
| BR-019 | §6 + §4.3 | US-039/045 | UC-026 |
| BR-020 | §6 + ADR-006 | US-028/042/043 | UC-019/020 |
| BR-021 `[PROP]` | BR-012 + VALIDATION §4.7 | US-027 | UC-015 |
| BR-022 `[PROP]` | §9 + VALIDATION §4.8 | US-039 | UC-017/026 |
| BR-023 `[PROP]` | BR-004 + VALIDATION extra | US-016 | UC-021 |
| BR-024 `[PROP]` | BR-013 + US-014 | US-014 | UC-005 |
| BR-025 `[PROP]` | BR-002 + OQ-001 | US-008/009/010 | UC-003/004 |
| BR-026 `[PROP]` | BR-014 + JOBS.md | US-037 | UC-010/017 |
| BR-027 `[PROP]` | §4.4-5 + OQ-002 | US-020 | UC-008 |
| BR-028 `[PROP]` | §7 + OQ-004 | — (reservado) | — (reservado) |
| BR-029 `[PROP]` | US-014 + PHASES P3-T5 | US-014 | UC-005 |
| BR-030 `[PROP]` | BR-005 + VALIDATION §4.5 | US-018/019 | UC-008/009 |
| BR-031 `[PROP]` | BR-006/007 + VALIDATION §4.6 | US-025 | UC-009/010/015 |
| BR-032 `[0.2]` | §§62-64 (§4.1/§4.2/§4.4-8) | US-046, US-048 | UC-027 |
| BR-033 `[0.2]` | §§65-66 (§4.1/§9) | US-047, US-048, US-051 | UC-028 |
| BR-034 `[0.2]` | §§66-67 (§4.4-5) | US-049, US-050 | UC-029, UC-030 |
| BR-035 `[0.2]` | §68 (§4.3) | US-047, US-049, US-051 | UC-028, UC-029, UC-030 |
| BR-036 `[0.2]` | §§68-69 (§4.1/§9) | US-051, US-052 | UC-032 |
| BR-037 `[0.2]` | §§66-67 (§4.2) | US-049 | UC-029 |
| BR-038 `[0.2]` | §67 (§7) | US-050 | UC-030 |
| BR-039 `[0.2]` | §§66-67 (§4.1/§10) | US-046, US-047, US-049 | UC-027, UC-028, UC-031 |
| BR-040 `[0.2]` | §§69-70 (§10/§11.5) | US-046, US-047, US-048 | UC-027, UC-028 |

## 7. Document Acceptance Criteria

- [ ] BR-001…BR-020 y BR-032…BR-040 expandidas sin alterar el texto canónico de MASTER-SPEC §6 (misma numeración y severidad); BR-021…BR-031 permanecen `[PROPUESTA]`.
- [ ] Cada BR-032…BR-040 cita su fuente (secciones 62-70 del prompt maestro).
- [ ] Mensajes sugeridos coherentes con el catálogo de códigos de ERROR-HANDLING.md §4.9 (W5); no se introducen códigos nuevos sin marcarlo.
- [ ] Toda regla derivada está marcada `[PROPUESTA]` con su fuente de derivación; ninguna se presenta como canónica.
- [ ] Toda ambigüedad real está en DECISIÓN PENDIENTE con pregunta concreta e impacto.

## 8. Involved Files

| Archivo | Rol |
| --- | --- |
| `docs/MASTER-SPEC.md` | BR-001…020 y BR-032…040 canónicas (§6, ampliación 0.2), enums (§4.3), estados (§7), roles (§8), alertas (§9) |
| `docs/backend/VALIDATION.md` · `ERROR-HANDLING.md` | Capa de validación y códigos de error (W5) |
| `docs/product/PRODUCT-BACKLOG.md` · `USER-STORIES.md` | US vinculadas y prioridades |
| `docs/product/USE-CASES.md` | Flujos UC que ejecutan las reglas |
| `docs/OPEN-QUESTIONS.md` | OQ-001…045 + pendientes reportados |

## 9. DECISIÓN PENDIENTE

| # | Pregunta | Impacto | Referencia |
| --- | --- | --- | --- |
| 1 | ~~Reglas exactas de unicidad/validación del código de carga~~ → **RESUELTA (OQ-001 → BR-002, 2026-09-23)**: regex `^[A-Z0-9][A-Z0-9./-]{2,31}$`, mayúsculas, único case-insensitive, 3–32 | BR-002/BR-025, FEATURE-005 | OQ-001 (resuelta) |
| 2 | ~~Carga parcial: unidad+quantity vs CargoItem~~ → **RESUELTA (OQ-002, secciones 62-70)**: distribución vía `CargoLocation`; CargoItem no v1 | BR-027, FEATURE-013 | OQ-002 (resuelta) |
| 3 | ~~Egreso/retiro en v1 (EXITED)~~ → **RESUELTA (OQ-004 → BR-043, 2026-09-23)**: sí — `EXIT` con observación obligatoria, remito opcional, `EXITED` terminal | BR-028, ciclo de vida | OQ-004 (resuelta) |
| 4 | ~~Días corridos/hábiles, fecha base, segunda alerta~~ → **RESUELTA (OQ-008 → BR-014/015, 2026-09-23)**: días **corridos**, base `entryDate`, alerta 30 y segunda 40 | BR-014/015, FEATURE-022/026 | OQ-008 (resuelta) |
| 5 | ~~Unidad de capacidad por defecto por ubicación y ocupación derivada (¿Plazoleta cuenta camiones?)~~ → **RESUELTA (OQ-041 → BR-041 + OQ-014 + OQ-044 → BR-048, 2026-09-23/24)**: unidad efectiva por tipo/override; Plazoleta cuenta **camiones (UNITS)**; ocupación Σ ACTIVE en unidad compatible (BR-033); sin conversión v1 | BR-005/030, FEATURE-012/017/019 | OQ-041/OQ-044 (resueltas) |
| 6 | ~~Editor de planos en v1 (Fase 11) vs vista estática~~ → **RESUELTA (OQ-015, 2026-09-24)**: vista estática en v1; editor diferido | BR-020, FEATURE-025 | OQ-015 (resuelta) |
| 7 | MovementKind v1: enum completo vs MOVE + razones tipadas | Máquina de estados, contratos | 🔶 Residual local (W1-Q1; §4.3) |
| 8 | Reversión: ¿solo último movimiento o cualquiera? ¿condiciones adicionales? | BR-021, FEATURE-016 | 🔶 Residual local (W1-Q2) |
| 9 | ~~Refuerzo de roles para TO_REZAGO/TO_SECUESTRO (¿SECUESTRO solo ADMIN?)~~ → **RESUELTA (W1-Q5 → OQ-030 → BR-046, 2026-09-23)**: **SECUESTRO solo ADMIN** | BR-011, FEATURE-014 (US-024) | W1-Q5 → OQ-030 → BR-046 (resuelta) |
| 10 | Ratificación de BR-021…BR-031 `[PROPUESTA]` | Todas las reglas §5 | 🔶 Residual local (W1, PBQ-11) |
| 11 | ~~Matriz de transiciones: saltos, retorno de REZAGO/SECUESTRO, IN_TRANSIT, estado inicial del alta~~ → **RESUELTA (OQ-029 → BR-045, MASTER-SPEC v0.5)** | BR-016 | OQ-029 (resuelta) |
| 12 | ~~Observación del INGRESS en el alta: exigible (BR-006) vs opcional (PHASES P3-H2)~~ → **RESUELTA (OQ-022)**: obligatoria siempre, incluido el alta (BR-006) | BR-006/007, UC-007, FEATURE-005/013 | ✅ Resuelta (2026-09-23) |
| 13 | Eventos generadores, roles y plantillas de notificaciones in-app (canales **in-app** cerrados en OQ-011) | BR-019, FEATURE-023, UC-026 | 🔶 Residual local (W1-Q10; OQ-011 resuelta) |
| 14 | Combos válidos estado×tipo de ubicación (¿IN_TRUCK solo en PLAZOLETA?) | BR-016, FEATURE-013/014 | 🔶 Residual local (W1-Q12) |
| 15 | Edición del código de carga post-registro (¿permitida en v1 con observación/auditoría o bloqueada por negocio?) | BR-002/025, FEATURE-005 (PATCH) | 🔶 Residual local (W1-Q14) |
| 16 | KPIs exactos del dashboard v1 | FEATURE-019, UC-018 | 🔶 Residual local (W1-Q16) |
| 17 | ~~Propiedades editables del plano/ubicaciones en v1 (OQ-015 decide el "sí/no" del editor; falta el "qué")~~ → **SIN EFECTO EN v1 (OQ-015 resuelta)**: editor fuera de v1 — sin edición de plano ni propiedades en v1 | BR-011/020, FEATURE-025, US-042 | OQ-015 (resuelta) |
| 18 | Roles para transiciones de AlertStatus (ACKNOWLEDGED/RESOLVED/DISMISSED) | BR-022, FEATURE-023 | 🔶 Residual local (W1-Q13) |
| 19 | ~~Drag & drop de cargas en el mapa operativo (¿movimiento sin ObservationDialog? BR-006)~~ → **RESUELTA (OQ-024, 2026-09-24)**: **NO en v1** — formulario/diálogo transaccional con observación obligatoria (BR-006) | BR-006, FEATURE-017/018, US-028 | OQ-024 (resuelta) |
| 20 | ~~`INVALID_TRANSITION` 409 vs 422 (inconsistencia interna de API.md, W5 lo fija en 409)~~ → **RESUELTA (coordinación W5, 2026-09-24)**: `INVALID_TRANSITION` **409** canónico (ERROR-HANDLING §8) | Contratos de error | Reportado por W5 (resuelto) |
| 21 | ~~Unidad de capacidad por defecto por LocationType (¿Sector m²? ¿Plazoleta camiones? gobernanza de configuración)~~ → **RESUELTA (OQ-041 → BR-041, 2026-09-23)**: default por tipo + override por ubicación; Plazoleta UNITS | BR-005/033/035, FEATURE-030 (US-051) | OQ-041 (resuelta) |
| 22 | ~~¿El camión se modela como Location (`CAMION`) o el residual en camión es derivado?~~ → **RESUELTA (OQ-042 → BR-042, MASTER-SPEC v0.3)**: residual derivado `inTruckAmount`/`inTruckUnit` — el camión NO es una ubicación | BR-038, FEATURE-029 (US-050) | OQ-042 (resuelta) |
| 23 | ~~Sobreocupación administrativa (BR-036): flag, % extra, rol autorizante, ¿observación obligatoria?~~ → **RESUELTA (OQ-043 → BR-036 ampliada, 2026-09-24)**: default **+10%**, **solo ADMIN**, observación obligatoria + auditoría `CAPACITY_CHANGE` | BR-036, FEATURE-030 (US-052) | OQ-043 (resuelta) |
| 24 | ~~Conversión de unidades en movimientos parciales~~ → **RESUELTA (OQ-044 → BR-048, 2026-09-24)**: **sin conversión v1** — unidades compatibles o `PERCENT`; `INCOMPATIBLE_UNIT` 422 | BR-034/035, FEATURE-029 (US-049/050) | OQ-044 (resuelta) |
| 25 | ~~Semántica de `percentage` en CargoLocation: ¿almacenado/autoritativo o derivado de UI?~~ → **RESUELTA (OQ-045 → BR-049, 2026-09-24)**: derivado de UI e informativo (quantity/totalQuantity; input solo si unidad `PERCENT`) | BR-040, DTOs, FEATURE-028 | OQ-045 (resuelta) |
| 26 | Registrar en ERROR-HANDLING (W5): `DISTRIBUTION_EXCEEDS_TOTAL`, `UNIT_INCOMPATIBLE`, `CARGO_LOCATION_NOT_FOUND` | BR-032…040, contratos de error | 🔶 Acción de coordinación W1→W5 (sin OQ) |

Los pendientes **W1-Q9…W1-Q16** se reportan al orquestador para su incorporación a `OPEN-QUESTIONS.md` (ID tentativo OQ-019…OQ-026).