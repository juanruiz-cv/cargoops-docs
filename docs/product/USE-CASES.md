# CargoOps — Use Cases (USE-CASES)

> Documento de producto del grupo **W1**.
> Fuente de verdad canónica: `docs/MASTER-SPEC.md` v0.2 (roles §8, estados §7, BR §6 — incluye ampliación 0.2 BR-032…BR-040, enums §4.3, API §10). Códigos de error y capas de validación: `docs/backend/ERROR-HANDLING.md` y `docs/backend/VALIDATION.md` (W5).
> Pendientes centralizados: `docs/OPEN-QUESTIONS.md` (OQ-001…OQ-045) + reportes en curso.
> Idioma del contenido: español profesional/neutral. Identificadores y filenames: inglés.

---

## 1. Purpose

Formalizar los **casos de uso** de CargoOps: actores (roles §8), precondiciones, flujo principal paso a paso, flujos alternativos, postcondiciones y excepciones (cumplimiento de BR). Cada UC mapea a las reglas BR-001…BR-020 y BR-032…BR-040 (MASTER-SPEC §6, incl. ampliación 0.2) y a las user stories de `PRODUCT-BACKLOG.md`/`USER-STORIES.md`. El documento cubre los 15 user journeys core más los flujos de roles, autenticación, auditoría, notificaciones in-app y la **ampliación 0.2 (secciones 62-70): UC-027…UC-032** de distribución M:N, ocupación por unidad, movimientos/descarga parciales, egreso de segmento y sobreocupación administrativa.

Convenciones: los flujos alternativos se numeran FA-<n>; las excepciones se expresan con el código de aplicación estable del catálogo de W5 (ERROR-HANDLING §4.9) y su HTTP. Los códigos se leen como contrato: el frontend depende del código, no del mensaje.

## 2. Actors

| Actor | Rol (MASTER-SPEC §8) | Alcance |
| --- | --- | --- |
| Viewer | `VIEWER` | Lectura pura: dashboard, cargas, detalle, mapa, historial, exportaciones autorizadas (BR-010/018). |
| Operator | `OPERATOR` | Operación diaria: cargas, camiones, movimientos, estados, observaciones (BR-011). |
| Admin | `ADMIN` | Todo Operator + soft delete/restaurar/revertir, planos, configuración, usuarios y permisos (BR-012). |
| Sistema | (job/backend) | Detección de permanencia > 30 días, notificaciones, auditoría automática. |

## 3. Use Cases

### UC-001 — Iniciar sesión

| Campo | Detalle |
| --- | --- |
| **Actores** | Viewer, Operator, Admin (usuario registrado y activo) |
| **Precondiciones** | Usuario existe y está activo; no hay sesión previa válida. |
| **Flujo principal** | 1. El usuario ingresa usuario y contraseña. 2. El backend valida credenciales (hash) y actividad. 3. El sistema emite JWT access + refresh (ADR-008). 4. El frontend redirige según rol. 5. Se registra AuditLog `LOGIN`. |
| **Flujos alternativos** | FA-1 Credenciales inválidas: mensaje genérico (sin filtrado de existencia de usuario). FA-2 Intentos fallidos en límite: bloqueo temporal + `RATE_LIMITED`. FA-3 Usuario desactivado: `USER_INACTIVE`. |
| **Postcondiciones** | Sesión activa; acceso por rol según bundles de permiso. |
| **BR** | BR-009, BR-017 (log minimizado) | 
| **US** | US-004, US-005 (FEATURE-003, Fase 2) |
| **Notas** | Endpoint `POST /api/v1/auth/login` (§10). La UI es-AR muestra el `message` del backend. |

### UC-002 — Cerrar sesión y renovar sesión (refresh)

| Campo | Detalle |
| --- | --- |
| **Actores** | Viewer, Operator, Admin |
| **Precondiciones** | Sesión activa. |
| **Flujo principal** | 1. El frontend invoca refresh con token vigente → rota access+refresh sin re-login. 2. (Cierre) El usuario cierra sesión → se revoca el refresh y se registra `LOGOUT`. |
| **Flujos alternativos** | FA-1 Refresh inválido/revocado: `401 INVALID_REFRESH_TOKEN / REFRESH_TOKEN_REVOKED` → login obligatorio. |
| **Postcondiciones** | Tokens rotados o sesión terminada sin datos residuales en UI. |
| **BR** | BR-009, BR-017 |
| **US** | US-004, US-005 (FEATURE-003, Fase 2) |
| **Notas** | `POST /api/v1/auth/refresh` (§10); interceptor 401 en frontend. |

### UC-003 — Registrar carga

| Campo | Detalle |
| --- | --- |
| **Actores** | Operator (permiso `cargo.create`); Admin |
| **Precondiciones** | Sesión activa con permiso; ubicaciones de referencia cargadas (FEATURE-002); reglas de unicidad definidas o default temporal (OQ-001, BR-025 `[PROP]`). |
| **Flujo principal** | 1. El operador completa código (y opcionalmente descripción, camión, datos). 2. El backend valida: código no vacío (BR-001), unicidad (BR-002), permisos (BR-009). 3. Se crea la carga en estado `REGISTERED` con `entryDate`, `createdById`. 4. Se audita `CREATE`. 5. La carga queda visible en listado/detalle. |
| **Flujos alternativos** | FA-1 Alta con ingreso a plazoleta en camión → véase UC-007 (estado `IN_TRUCK`, kind INGRESS). FA-2 Alta con camión registrado previamente → asocia `truckId` (UC-006). FA-3 Observación inicial → **obligatoria** (BR-006, OQ-022; la opcionalidad de PHASES quedó descartada). |
| **Postcondiciones** | Carga persistida y auditada; sin registros parciales si falla la validación. |
| **Excepciones** | Código vacío → 400 `VALIDATION_ERROR` · código duplicado → 409 `CARGO_CODE_DUPLICATE` (BR-002) · sin permiso → 403 `FORBIDDEN` (BR-009/010). |
| **BR** | BR-001, BR-002, BR-009, BR-010, BR-013, BR-016 (estado inicial) |
| **US** | US-008, US-009 (FEATURE-005, Fase 3) |
| **Notas** | `POST /api/v1/cargos` (§10); caso crítico QA §14. |

### UC-004 — Buscar y consultar cargas

| Campo | Detalle |
| --- | --- |
| **Actores** | Viewer, Operator, Admin |
| **Precondiciones** | Sesión activa; permiso de lectura. |
| **Flujo principal** | 1. El usuario busca por código (parcial/exacto según OQ-001). 2. Listado paginado con estado/ubicación. 3. Abre el detalle: estado (separado de ubicación, §4.4-2), fechas, camión, alertas activas, observaciones. |
| **Flujos alternativos** | FA-1 Búsqueda sin resultados → estado vacío con mensaje accionable. FA-2 Filtros avanzados combinados (estado/ubicación/fechas) → US-012. |
| **Postcondiciones** | Resultados consistentes con los datos operativos; ninguna mutación. |
| **Excepciones** | Carga inexistente → 404 `CARGO_NOT_FOUND` · sin permiso de lectura → 403 `FORBIDDEN` (BR-009). |
| **BR** | BR-001/002 (normalización, OQ-001), BR-009, BR-010, BR-025 `[PROP]` |
| **US** | US-010, US-011, US-012 (FEATURE-006/007, Fase 3) |
| **Notas** | `GET /api/v1/cargos` y `GET /api/v1/cargos/:id` (§10); paginación con `meta`. |

### UC-005 — Registrar camión

| Campo | Detalle |
| --- | --- |
| **Actores** | Operator (permiso `truck.create`); Admin |
| **Precondiciones** | Sesión activa con permiso. |
| **Flujo principal** | 1. El operador registra patente (y brand/model/driverName opcionales). 2. El backend valida patente no vacía y única (BR-029 `[PROP]`, `uq_trucks_plate`). 3. Se persiste el camión activo y se audita `CREATE`. |
| **Flujos alternativos** | FA-1 Patente duplicada → 409 `TRUCK_PLATE_DUPLICATE`. FA-2 Edición de datos → `UPDATE` auditado. |
| **Postcondiciones** | Camión listo para asociar cargas. |
| **BR** | BR-009, BR-013, BR-024 `[PROP]` (bloqueo de eliminación con cargas), BR-029 `[PROP]` |
| **US** | US-014 (FEATURE-009, Fase 3) |
| **Notas** | Módulo `trucks` (§11.3); OQ-003 resuelta (2026-09-24): una carga se asocia a UN camión a la vez; un camión transporta N cargas (multi-cliente) — alcance cerrado. |

### UC-006 — Asociar / desasociar camión ↔ carga

| Campo | Detalle |
| --- | --- |
| **Actores** | Operator; Admin |
| **Precondiciones** | Camión existe y activo; carga existe y en estado compatible con transporte (ingreso). |
| **Flujo principal** | 1. El operador asigna la carga al camión (`truckId`). 2. El backend valida: una carga en un solo camión a la vez (§4.4-6), camión no eliminado. 3. Se persiste y audita `UPDATE`. 4. La ocupación del camión es consultable. |
| **Flujos alternativos** | FA-1 Desasociación al completar descarga (UC-008): la carga deja de tener `truckId`. FA-2 Asociación sobre carga ya vinculada a otro camión → rechazo 409. |
| **Postcondiciones** | Carga vinculada (o desvinculada) sin cambio de ubicación física ni de estado. |
| **BR** | BR-003 (carga inexistente), BR-009, BR-016 (compatibilidad de estados) |
| **US** | US-015 (FEATURE-010, Fase 3) |
| **Notas** | OQ-003 resuelta (2026-09-24): una carga se asocia a UN camión a la vez — división en varios camiones fuera de v1. No es un movimiento: no dispara BR-006/007. |

### UC-007 — Ingreso de carga a plazoleta

| Campo | Detalle |
| --- | --- |
| **Actores** | Operator; Admin |
| **Precondiciones** | Carga registrada (o en alta conjunta, FA de UC-003); camión opcional; Plazoleta `ACTIVE`. |
| **Flujo principal** | 1. El sistema registra el ingreso de la carga con ubicación Plazoleta y estado `IN_TRUCK` (§7). 2. Se fija `entryDate` (base de permanencia, BR-015). 3. Movimiento `kind=INGRESS` con historial (BR-008). 4. (Si aplica) camión asociado. |
| **Flujos alternativos** | FA-1 Alta directa: la carga se crea en Plazoleta sin camión. **FA-2 Alta directa a sector (`REGISTERED → STORED`, FASE 5)**: la carga se crea **STORED** en un depósito, sin camión y sin distribución posterior. Contrato: `POST /api/v1/cargos` con `locationId` **opcional** (API.md §5.2, DTOs.md §4.4), `totalQuantity`/`totalUnit` **obligatorios** (BR-042: son la cantidad del segmento inicial) y `truckId` **excluido** (enviar ambos → 422 `BUSINESS_RULE_VIOLATION` con `details.exclusiveFields`). Resultado: `201` con la carga `STORED` + **un** segmento `CargoLocation` ACTIVE y **sin** fila `Movement` (el estado inicial es parte de la carga, no una transición — BR-008); el segmento se lee en `GET /cargos/:id/locations` (§10), porque `CargoResponseDto` no lleva ubicación (BR-032). Rechazos: 404 `LOCATION_NOT_FOUND` (BR-003) · 409 `LOCATION_INACTIVE` (BR-004) · 422 `CARGO_TOTAL_REQUIRED` (BR-042, sin total declarado) · 422 `UNIT_INCOMPATIBLE` (BR-035) · 422 si el tipo de ubicación no admite `STORED` (BR-044 — solo `GALPON`/`SECTOR`) · 409 `CAPACITY_EXCEEDED` (BR-005/036). Matriz: VALIDATION.md §4.4.1 (OQ-029 resuelta 2026-09-23 → BR-045). |
| **Postcondiciones** | Carga `IN_TRUCK` en Plazoleta con `entryDate`; historial y auditoría. |
| **Excepciones** | Plazoleta inactiva → 409 `LOCATION_INACTIVE` (BR-004) · sin permiso → 403 (BR-009/010). |
| **BR** | BR-004, BR-006/007 (observación obligatoria — OQ-022 resuelta), BR-008, BR-015, BR-016 |
| **US** | US-008, US-019 (FEATURE-005/013, Fases 3–5) |
| **DECISIÓN PENDIENTE** | **W1-Q9 — resuelta (OQ-022/BR-006)**: el INGRESS generado en el alta exige observación obligatoria; la "observación inicial opcional" de PHASES queda descartada. |

### UC-008 — Descargar carga (parcial o total)

| Campo | Detalle |
| --- | --- |
| **Actores** | Operator (permiso `movement.create`) |
| **Precondiciones** | Carga `IN_TRUCK` en Plazoleta; destino elegido (sector/área) `ACTIVE`; capacidad disponible. |
| **Flujo principal** | 1. El operador elige destino y tipo de descarga. 2. (Parcial) indica cantidad y unidad. 3. Completa observación obligatoria. 4. El backend valida en transacción: BR-003/004/005/006/007/008/016/027 `[PROP]`. 5. Descarga parcial → `PARTIALLY_UNLOADED`; total → `STORED` (§7). 6. Se recalcula ocupación del origen (−Δ) y destino (+Δ), y se audita `MOVE`/`STATUS_CHANGE`. 7. Descarga total: el camión queda liberado. |
| **Flujos alternativos** | FA-1 Cancelación del formulario → sin efectos. FA-2 Cantidad acumulada que excede el total → rechazo (BR-027 `[PROP]`). FA-3 Unidades incompatibles con el destino → 422 `unit_mismatch` (BR-005). |
| **Postcondiciones** | Carga en destino con estado coherente; ocupación consistente; historial + observación 1:1. |
| **Excepciones** | Carga inexistente → 404 `CARGO_NOT_FOUND` · destino inactivo → 409 `LOCATION_INACTIVE` · capacidad → 409 `CAPACITY_EXCEEDED` · sin observación → 400/422 (`BUSINESS_RULE_VIOLATION`, rule BR-006/007) · transición inválida → 409 `INVALID_TRANSITION` · sin permiso → 403. |
| **BR** | BR-003…008, BR-009, BR-016, BR-027 `[PROP]`, BR-030 `[PROP]` |
| **US** | US-020, US-021, US-025 (FEATURE-013/015, Fase 5) |
| **Notas** | `POST /api/v1/cargos/:id/movements` (§10); caso crítico QA §14. Modelo de cantidad según OQ-002. |

### UC-009 — Mover carga entre ubicaciones

| Campo | Detalle |
| --- | --- |
| **Actores** | Operator (permiso `movement.create`); Admin |
| **Precondiciones** | Carga existe y activa; origen y destino `ACTIVE`; transición de estado válida (§7); capacidad disponible. |
| **Flujo principal** | 1. El operador selecciona carga y destino. 2. El sistema muestra ocupación actual del destino (CapacityIndicator). 3. El operador completa la observación (motivo). 4. El backend valida en una transacción: BR-003 (lock de carga), BR-004 (lock de destino), BR-005 (advisory lock de capacidad), BR-006/007 (observación), BR-008 (historial), BR-016 (state machine). 5. Estado transitorio `IN_TRANSIT` (solo sistema) → ubicación actualizada. 6. Se persisten Movement + Observation (1:1) + auditoría `MOVE`. |
| **Flujos alternativos** | FA-1 Movimiento a área especial (Scanner/Balanza/Rezago/Secuestro) → UCs 010–013. FA-2 Rollback automático ante fallo a mitad de transacción (todo o nada). |
| **Postcondiciones** | Carga en nueva ubicación; historial reconstruible; capacidad consistente; zero movimientos huérfanos. |
| **Excepciones** | Idem UC-008 (BR-003/004/005/006/016) + `IN_TRANSIT`/`DELETED` como destino rechazados (422/409, VALIDATION §6.3). |
| **BR** | BR-003…008, BR-009, BR-016, BR-030 `[PROP]` |
| **US** | US-019, US-025 (FEATURE-013/015, Fase 5) |
| **Notas** | Caso crítico QA §14. Combos estado×tipo de ubicación: **W1-Q12**. `INVALID_TRANSITION` 409 (fijado por W5, ERROR-HANDLING §4.9). |

### UC-010 — Pasar carga a Rezago (decisión humana desde alerta)

| Campo | Detalle |
| --- | --- |
| **Actores** | Operator autorizado / Admin (decisión humana, BR-014); Sistema (detección). |
| **Precondiciones** | Alerta `STALE_30D` OPEN (o decisión operativa fundada); carga alcanzable por la máquina de estados (`STORED`/`IN_REVIEW` → `REZAGO`, VALIDATION §6.2); observación disponible. |
| **Flujo principal** | 1. El job detecta permanencia > 30 días desde `entryDate` y genera alerta OPEN (BR-014/015, sin mover nada). 2. El usuario revisa la alerta en Dashboard o en la carga (§9, pasos 1–4). 3. Decide pasar la carga a Rezago. 4. Completa observación obligatoria con motivo. 5. El backend registra movimiento `TO_REZAGO` (estado `REZAGO`, ubicación REZAGO) con historial y auditoría (BR-008/012/016). 6. La alerta se gestiona (véase UC-017). |
| **Flujos alternativos** | FA-1 El usuario decide NO mover → la alerta queda para revisión (ACKNOWLEDGED) o se resuelve/descarta con observación (UC-017). FA-2 Rezago por decisión sin alerta previa: el movimiento es válido si la transición lo permite. |
| **Postcondiciones** | Carga en Rezago con historial completo; **nunca** movimiento automático (BR-014). |
| **Excepciones** | Carga inexistente → 404 · transición inválida → 409 `INVALID_TRANSITION` · sin observación → 400/422 · sin permiso de rol → 403. |
| **BR** | BR-006/007, BR-008, BR-012, BR-014, BR-015, BR-016, BR-026 `[PROP]` |
| **US** | US-024, US-037, US-038, US-039 (FEATURE-014/022/023, Fases 5–9) |
| **Notas** | Corresponde a la referencia "UC-010 de USE-CASES" de USER-STORIES (US-038). OQ-008 (días/base, resuelta → BR-014/015), OQ-029 (matriz, resuelta → BR-045), W1-Q13 (roles de alerta, 🔶 residual local). |

### UC-011 — Pasar carga a Secuestro

| Campo | Detalle |
| --- | --- |
| **Actores** | Admin (o Operator si W1-Q5 lo habilita) |
| **Precondiciones** | Carga en estado elegible (`STORED`/`IN_REVIEW`, VALIDATION §6.2); ubicación SECUESTRO `ACTIVE`. |
| **Flujo principal** | 1. El usuario elige la carga y el destino Secuestro. 2. Completa observación con motivo explícito. 3. El backend valida permisos (BR-009/011), transición y registra `TO_SECUESTRO` (estado `SECUESTRO`). 4. Historial + auditoría. |
| **Flujos alternativos** | FA-1 Liberación de Secuestro → `SECUESTRO → STORED` (propuesta W5, OQ-029). |
| **Postcondiciones** | Carga `SECUESTRO` en ubicación Secuestro, trazable. |
| **Excepciones** | Sin permiso → 403 `FORBIDDEN` · transición inválida → 409 · sin observación → 400/422 · destino inactivo → 409 `LOCATION_INACTIVE`. |
| **BR** | BR-006/007, BR-008, BR-009, BR-011, BR-016 |
| **US** | US-024 (FEATURE-014, Fase 5) |
| **Notas** | Actor según **W1-Q5 → OQ-030 → BR-046**; OQ-018 (catálogo de permisos, ADR-009) es contexto relacionado, no el resolutor. |

### UC-012 — Operar Scanner

| Campo | Detalle |
| --- | --- |
| **Actores** | Operator; Admin |
| **Precondiciones** | Carga en estado elegible (`STORED`, VALIDATION §6.2); SCANNER `ACTIVE`. |
| **Flujo principal** | 1. El operador envía la carga al Scanner (`TO_SCANNER`). 2. Observación obligatoria. 3. El backend registra el movimiento; la carga queda `IN_REVIEW` en SCANNER. 4. Finalizado el control, el operador la retira hacia un sector (retorno válido, §7). |
| **Flujos alternativos** | FA-1 Controles que detectan novedad → la carga sale de Scanner hacia Rezago/Secuestro solo por transición válida (OQ-029). |
| **Postcondiciones** | Carga con historial Scanner→destino; estado coherente. |
| **BR** | BR-006/007, BR-008, BR-016 |
| **US** | US-022 (FEATURE-014, Fase 5) |
| **Notas** | Estado `IN_REVIEW` compartido con Balanza (§7). |

### UC-013 — Operar Balanza

| Campo | Detalle |
| --- | --- |
| **Actores** | Operator; Admin |
| **Precondiciones** | Carga en estado elegible; BALANZA `ACTIVE`. |
| **Flujo principal** | 1. El operador envía la carga a la Balanza (`TO_BALANZA`). 2. Observación obligatoria. 3. Estado `IN_REVIEW`; el peso se registra en `metadata` del movimiento (JSONB, §4.1). 4. Retiro posterior a sector (transición válida). |
| **Postcondiciones** | Peso consultable en detalle/dashboard sin entidad nueva en v1. |
| **BR** | BR-006/007, BR-008, BR-016 |
| **US** | US-023 (FEATURE-014, Fase 5) |
| **Notas** | Sin entidad nueva para el pesaje en v1 (decisión del backlog W1). |

### UC-014 — Consultar historial de movimientos

| Campo | Detalle |
| --- | --- |
| **Actores** | Viewer, Operator, Admin |
| **Precondiciones** | Carga existe (activa o soft-deleted según permiso). |
| **Flujo principal** | 1. El usuario abre el historial de la carga. 2. Timeline cronológico reverso con movimiento, estado, ubicaciones, usuario, observación, timestamp (BR-008). 3. Las reversiones aparecen como REVERSION sin borrar el original (BR-012). |
| **Postcondiciones** | Trazabilidad 100 % reconstruible. |
| **Excepciones** | Carga inexistente → 404 · sin permiso de lectura → 403. |
| **BR** | BR-008, BR-009, BR-010, BR-012 |
| **US** | US-034 (FEATURE-020, Fase 8) |
| **Notas** | `GET /api/v1/cargos/:id/movements` (§10); MovementTimeline. |

### UC-015 — Revertir movimiento (ADMIN)

| Campo | Detalle |
| --- | --- |
| **Actores** | Admin (BR-012) |
| **Precondiciones** | Movimiento objetivo existente y reversible; alcance según W1-Q2; observación disponible. |
| **Flujo principal** | 1. El Admin abre el historial y selecciona el movimiento a revertir. 2. ConfirmDialog con advertencia de impacto. 3. Completa observación. 4. El backend valida: ADMIN (BR-012), reversibilidad (no REVERSION sobre REVERSION, BR-021 `[PROP]`), transición hacia el estado previo. 5. Se inserta `kind=REVERSION` con `reversionOfId`, restaurando estado/ubicación previos. 6. Historial original conservado + auditoría `REVERT`. |
| **Flujos alternativos** | FA-1 El estado previo ya no es alcanzable (conflicto con movimientos posteriores) → rechazo con detalle (depende de W1-Q2). FA-2 Reversión sobre movimiento de ingreso (INGRESS) → observación obligatoria (OQ-022). |
| **Postcondiciones** | Carga restaurada al estado/ubicación previos; cadena histórica completa. |
| **Excepciones** | Sin permiso → 403 `FORBIDDEN` · sin observación → 400/422 · objetivo no reversible → 409/422 `BUSINESS_RULE_VIOLATION` · carga inexistente → 404. |
| **BR** | BR-003, BR-006/007, BR-008, BR-012, BR-013, BR-016, BR-021 `[PROP]` |
| **US** | US-027 (FEATURE-016, Fase 5) |
| **Notas** | Caso crítico QA §14. `reversionOfId/reversedById/reversedAt` (§4.1); ADR-010/011. |

### UC-016 — Exportar PDF de carga

| Campo | Detalle |
| --- | --- |
| **Actores** | Viewer / Operator / Admin con permiso `cargo.export_pdf` (BR-018) |
| **Precondiciones** | Carga existente; permiso de exportación; servicio PDF disponible (OQ-005 → ADR-013 resuelta: HTML→PDF server-side). |
| **Flujo principal** | 1. El usuario pulsa PdfExportButton en el detalle. 2. El backend valida permiso (BR-009/018) y genera el PDF con los **datos visibles por rol**. 3. El navegador descarga el documento. 4. Se audita `EXPORT`. |
| **Flujos alternativos** | FA-1 Fallo del servicio PDF → error tipado con retry (envelope §10). FA-2 Export asíncrono por job (OQ-007 resuelta: BullMQ en v1, ADR-012). |
| **Postcondiciones** | Documento entregado sin datos no autorizados. |
| **Excepciones** | Sin permiso → 403 `FORBIDDEN` (nunca genera documento) · carga inexistente → 404 · servicio caído → 503 `SERVICE_UNAVAILABLE`. |
| **BR** | BR-009, BR-017, BR-018 |
| **US** | US-040, US-041 (FEATURE-024, Fase 10) |
| **Notas** | `POST /api/v1/cargos/:id/export-pdf` (§10, OQ-017); alcance del PDF según W1-Q8; ADR-013. |

### UC-017 — Gestionar ciclo de vida de alertas

| Campo | Detalle |
| --- | --- |
| **Actores** | Operator / Admin (roles según W1-Q13) |
| **Precondiciones** | Alerta existe (p. ej. `STALE_30D` OPEN). |
| **Flujo principal** | 1. El usuario revisa la alerta (AlertCard → detalle de carga). 2. Reconoce → `ACKNOWLEDGED` (usuario y fecha). 3. Al resolver la causa → `RESOLVED` o `DISMISSED`, con observación exigida (BR-022 `[PROP]`). 4. Cambios auditados. |
| **Flujos alternativos** | FA-1 La resolución implica mover la carga → deriva a UC-010. FA-2 Transición inválida → 409 `INVALID_ALERT_TRANSITION`. |
| **Postcondiciones** | Estado de alerta coherente con la operación; trazabilidad de gestión. |
| **BR** | BR-014, BR-022 `[PROP]`, BR-026 `[PROP]` |
| **US** | US-039 (FEATURE-023, Fase 9) |
| **Notas** | Solo in-app mientras OQ-011 no defina canales externos. Notificación in-app al crear la alerta: UC-026. |

### UC-018 — Visualizar dashboard

| Campo | Detalle |
| --- | --- |
| **Actores** | Viewer, Operator, Admin |
| **Precondiciones** | Sesión activa. |
| **Flujo principal** | 1. El usuario ingresa al dashboard. 2. KPIs: cargas por estado, ocupación por ubicación, alertas OPEN, últimos movimientos (`GET /api/v1/dashboard`). 3. Navegación a detalle desde cada KPI/alerta. |
| **Postcondiciones** | Vista de lectura; sin acciones de escritura para Viewer (BR-010). |
| **BR** | BR-009, BR-010 |
| **US** | US-032, US-033 (FEATURE-019, Fases 7–9) |
| **DECISIÓN PENDIENTE** | **W1-Q16**: conjunto exacto de KPIs del dashboard v1. |

### UC-019 — Visualizar mapa operativo

| Campo | Detalle |
| --- | --- |
| **Actores** | Viewer, Operator, Admin |
| **Precondiciones** | Datos estructurados de Map + Locations (BR-020); sesión activa. |
| **Flujo principal** | 1. El usuario abre el mapa: render de ubicaciones desde datos (17 seeds §5) con ocupación y leyenda. 2. Zoom/pan/hover/selección. 3. Selecciona una ubicación → ocupación y estado; clic en carga → detalle (US-031). 4. Alternativa accesible: listado navegable (WCAG 2.2 AA). |
| **Flujos alternativos** | FA-1 Ubicación sin cargas → estado vacío del elemento con su capacidad. FA-2 Cuadrícula de accesibilidad: recorrido por teclado. |
| **Postcondiciones** | Vista de solo lectura consistente con el backend. |
| **Excepciones** | Mapa no encontrado (404) · sin permiso de lectura → 403. |
| **BR** | BR-009, BR-010, BR-020 |
| **US** | US-028, US-029, US-030, US-031 (FEATURE-017/018, Fase 6) |
| **DECISIÓN PENDIENTE** | W1-Q11 → **resuelta (OQ-024, 2026-09-24): NO drag & drop en v1** — formulario/diálogo transaccional con observación obligatoria (BR-006). Ocupación según OQ-009 → resuelta (unidad efectiva BR-041 + umbrales OQ-046). |

### UC-020 — Editar plano (ADMIN)

| Campo | Detalle |
| --- | --- |
| **Actores** | Admin (BR-011/012) |
| **Precondiciones** | Editor habilitado (OQ-015); sesión ADMIN. |
| **Flujo principal** | 1. El Admin abre el editor. 2. Arrastra/redimensiona elementos con snap/grid (ADR-006). 3. Edita propiedades (nombre, código, tipo, capacidad, color, estado — según W1-Q15). 4. Preview antes de persistir. 5. Guarda vía `PATCH /api/v1/maps/:id` con versión incrementada. 6. Auditoría `MAP_EDIT`. |
| **Flujos alternativos** | FA-1 Cancelación → descarta el borrador sin efectos. FA-2 Conflicto de versión/geometría → 409 `MAP_ELEMENT_CONFLICT` (si se adopta validación geométrica, OQ-015). |
| **Postcondiciones** | Plano versionado; datos estructurados intactos (BR-020); el mapa de vista refleja el cambio. |
| **Excepciones** | Sin permiso → 403 `FORBIDDEN` · elemento superpuesto/duplicado → 409 · datos inválidos → 400 `VALIDATION_ERROR`. |
| **BR** | BR-009, BR-011, BR-012, BR-020 |
| **US** | US-042, US-043 (FEATURE-025, Fase 11) |
| **Notas** | Map/MapElement §4.1; caso crítico QA §14. Propiedades editables: **W1-Q15**. |

### UC-021 — Administrar ubicaciones y capacidad (ADMIN)

| Campo | Detalle |
| --- | --- |
| **Actores** | Admin |
| **Precondiciones** | Sesión ADMIN. |
| **Flujo principal** | 1. El Admin crea/edita ubicaciones (LocationType §4.3, status ACTIVE/INACTIVE/MAINTENANCE). 2. Configura `capacity`/`capacityUnit` (OQ-041). 3. Cambios auditados (`CAPACITY_CHANGE`). 4. Operator/Viewer consultan sin modificar. |
| **Flujos alternativos** | FA-1 Desactivar ubicación con cargas → rechazo 422 `LOCATION_HAS_CARGO` (BR-023 `[PROP]`): exige reubicar (BR-004). FA-2 `capacity` menor al `occupiedCapacity` actual → permite con advertencia + auditoría (decisión W5, VALIDATION §4.5; alternativa de bloqueo pendiente). |
| **Postcondiciones** | Ubicaciones y capacidad coherentes; mapa y dashboard reflejan cambios. |
| **BR** | BR-004, BR-005, BR-009, BR-011, BR-012, BR-023 `[PROP]`, BR-030 `[PROP]` |
| **US** | US-016, US-017, US-018 (FEATURE-011/012, Fase 4) |
| **Notas** | Location = abstracción única (§4.4-7). |

### UC-022 — Eliminar (soft) y restaurar carga (ADMIN)

| Campo | Detalle |
| --- | --- |
| **Actores** | Admin |
| **Precondiciones** | Carga existente; permiso ADMIN. |
| **Flujo principal** | 1. El Admin elimina la carga con confirmación. 2. Soft delete (`deletedAt`) + Auditoría `DELETE` en la misma transacción (BR-013; ADR-011). 3. Restauración posterior → se limpia `deletedAt` + Auditoría `RESTORE`, historial intacto (BR-008). |
| **Flujos alternativos** | FA-1 Restaurar con historial completísimo (movimientos previos conservados). FA-2 Eliminación de carga con alertas abiertas → se mantienen (histórico, ya resueltas o descartadas). |
| **Postcondiciones** | Carga oculta de la operación o restaurada; jamás hard delete. |
| **BR** | BR-008, BR-009, BR-012, BR-013 |
| **US** | US-007 (RBAC, Fase 8 con FEATURE-021); complementa US-036 |
| **Notas** | La eliminación nunca borra el historial: solo cambia la visibilidad operativa. |

### UC-023 — Administrar usuarios, roles y permisos (ADMIN)

| Campo | Detalle |
| --- | --- |
| **Actores** | Admin |
| **Precondiciones** | Sesión ADMIN. |
| **Flujo principal** | 1. El Admin crea/edita/desactiva usuarios y asigna rol (Viewer/Operator/Admin §8). 2. El bundle de permisos del rol aplica de inmediato en backend (BR-009). 3. Auditoría `PERMISSION_CHANGE`. 4. Usuario desactivado no inicia sesión (`USER_INACTIVE`). |
| **Flujos alternativos** | FA-1 Usuario duplicado → 409 `USERNAME_DUPLICATE`/`EMAIL_DUPLICATE`. |
| **Postcondiciones** | Accesos por rol efectivos; trazabilidad de cambios. |
| **BR** | BR-009, BR-010, BR-011, BR-012, BR-013 |
| **US** | US-045 (FEATURE-027, Fase 11) |
| **Notas** | Sin multi-tenant ni gestión avanzada (PRD §7.2). |

### UC-024 — Agregar nota/observación sin movimiento

| Campo | Detalle |
| --- | --- |
| **Actores** | Operator; Admin |
| **Precondiciones** | Carga existente. |
| **Flujo principal** | 1. El operador agrega una observación vinculada a `cargoId` (sin destino ni estado). 2. La nota se persiste como Observation con `movementId` NULL. 3. Visible en detalle e historial de notas. |
| **Postcondiciones** | Contexto documentado sin contaminar el historial de movimientos (BR-008 no aplica). |
| **Excepciones** | Sin permiso → 403 · texto vacío → 400 `VALIDATION_ERROR` (BR-031 `[PROP]`). |
| **BR** | BR-009, BR-031 `[PROP]` (texto no vacío) — BR-006/007 NO aplican |
| **US** | US-013 (FEATURE-008, Fase 3) |

### UC-025 — Consultar auditoría (ADMIN)

| Campo | Detalle |
| --- | --- |
| **Actores** | Admin |
| **Precondiciones** | Sesión ADMIN; eventos auditados existentes. |
| **Flujo principal** | 1. El Admin consulta `GET /api/v1/audit` con filtros (entidad, acción, usuario, fecha) y paginación. 2. Ve actor, entidad, timestamp, valores previos/nuevos; IP/userAgent minimizados (BR-017). |
| **Postcondiciones** | Evidencia investigable para disputas operativas. |
| **Excepciones** | Rol distinto de ADMIN → 403 (BR-011). |
| **BR** | BR-009, BR-011, BR-013, BR-017 |
| **US** | US-035, US-036 (FEATURE-021, Fase 8) |
| **Notas** | Recordatorio W5 (ERROR-HANDLING §8 #6): ¿Operator puede leer auditoría de operaciones propias o solo ADMIN? — pendiente a proponer como OQ. |

### UC-026 — Gestionar notificaciones in-app

| Campo | Detalle |
| --- | --- |
| **Actores** | Viewer, Operator, Admin (canal IN_APP, §4.3) |
| **Precondiciones** | Notificación generada por alerta `STALE_30D` (v1); OQ-011 (solo in-app). |
| **Flujo principal** | 1. Al generarse una alerta, el sistema crea una notificación in-app para los usuarios del rol operativo. 2. El usuario ve el badge de no leídas y la lista. 3. Abre la notificación → navega al origen (carga/alerta); `readAt` se actualiza. |
| **Postcondiciones** | Notificaciones visibles y trazables; sin dependencia de proveedores externos (BR-019). |
| **BR** | BR-019, BR-022 `[PROP]` |
| **US** | US-039 (FEATURE-023, Fase 9; notificación in-app al crear la alerta) |
| **DECISIÓN PENDIENTE** | W1-Q10 🔶 residual local: eventos generadores de notificaciones en v1 (¿solo STALE_30D o más?), roles destinatarios y plantillas. Canales: **in-app en v1** (OQ-011 resuelta: sin email/SMS). |

### UC-027 — Consultar la distribución de una carga

| Campo | Detalle |
| --- | --- |
| **Actores** | Viewer, Operator, Admin |
| **Precondiciones** | Carga existe; permiso de lectura (BR-009/010). |
| **Flujo principal** | 1. El usuario abre el detalle de la carga (o el panel de distribución). 2. El sistema lista todos los segmentos `CargoLocation` activos: ubicación, cantidad/unidad, porcentaje, estado, `enteredAt`/`exitedAt` (BR-040). 3. Por segmento, se puede abrir el historial de movimientos (BR-008/039). |
| **Flujos alternativos** | FA-1 Carga sin segmentos → estado vacío con indicación de carga no distribuida. FA-2 Consulta desde el mapa (selección de carga, §11.5). |
| **Postcondiciones** | Vista completa de la distribución sin ninguna mutación. |
| **Excepciones** | Carga inexistente → 404 `CARGO_NOT_FOUND` · segmento inexistente → 404 `CARGO_LOCATION_NOT_FOUND` · sin permiso → 403 `FORBIDDEN`. |
| **BR** | BR-009, BR-010, BR-032, BR-039, BR-040 |
| **US** | US-046, US-048 (FEATURE-028, Fase 4–5) |
| **Notas** | `GET /api/v1/cargos/:id/locations` (§10); DistributionPanel (§11.4); semántica de `percentage` según **OQ-045**. |

### UC-028 — Consultar cargas de una ubicación y su ocupación

| Campo | Detalle |
| --- | --- |
| **Actores** | Viewer, Operator, Admin |
| **Precondiciones** | Ubicación existe; permiso de lectura. |
| **Flujo principal** | 1. El usuario abre el detalle de la ubicación (o su panel en el mapa). 2. El sistema muestra `occupiedCapacity`/`availableCapacity` derivados = Σ CargoLocation activos en unidad compatible (BR-033/035). 3. Lista las cargas con cantidad por unidad, alertas y las próximas a 30 días (BR-040/014). |
| **Flujos alternativos** | FA-1 Ubicación vacía → capacidad completa disponible, sin cargas. FA-2 Desde el mapa: selección de ubicación (§11.5). |
| **Postcondiciones** | Foto de ocupación y cargas coherente con el backend; sin mutación. |
| **Excepciones** | Ubicación inexistente → 404 `LOCATION_NOT_FOUND` · sin permiso → 403 `FORBIDDEN`. |
| **BR** | BR-009, BR-010, BR-033, BR-035, BR-040 |
| **US** | US-047, US-048 (FEATURE-028, Fase 4–5) |
| **Notas** | `GET /api/v1/locations/:id/cargos` y `/capacity` (§10); seed Sector 4: 80/100 m². Unidad por defecto por LocationType: **OQ-041**. |

### UC-029 — Mover parcialmente una carga entre ubicaciones

| Campo | Detalle |
| --- | --- |
| **Actores** | Operator (permiso `movement.create`); Admin |
| **Precondiciones** | Segmento origen con residual disponible; destino `ACTIVE` y con capacidad (o flag de sobreocupación, BR-036); transición de estado válida (§7). |
| **Flujo principal** | 1. El operador selecciona la carga, el segmento origen y el destino. 2. Indica cantidad (o porcentaje) a mover. 3. Completa la observación obligatoria. 4. El backend valida en transacción: residual del origen (BR-037), Σ ≤ total (BR-034), unidad compatible (BR-035), capacidad destino (BR-005/036), observación e historial (BR-006/008), alta/egreso de segmentos (BR-039). 5. Se ajustan los segmentos origen/destino y se persiste el Movement con la cantidad en metadata. |
| **Flujos alternativos** | FA-1 Porcentaje: se aplica sobre la cantidad del segmento origen (semántica según OQ-045). FA-2 Cantidad = residual del origen → equivale a mover el segmento completo (caso particular de BR-037). |
| **Postcondiciones** | Distribución actualizada y trazable; capacidad consistente. |
| **Excepciones** | Residuo insuficiente → 422 `BUSINESS_RULE_VIOLATION` (rule BR-037) · Σ > total → 409 `DISTRIBUTION_EXCEEDS_TOTAL` (BR-034) · unidades → 422 `UNIT_INCOMPATIBLE` (BR-035) · capacidad → 409 `CAPACITY_EXCEEDED` (BR-005/036) · segmento inexistente → 404 `CARGO_LOCATION_NOT_FOUND`. |
| **BR** | BR-005, BR-006/007, BR-008, BR-009, BR-016, BR-032…BR-039 |
| **US** | US-049 (FEATURE-029, Fase 5) |
| **Notas** | El movimiento parcial vincula CargoLocation de origen/destino (§4.2); seed 029TERRA26 MOVE 20 m² (Sector 3 → Sector 5). Conversión de unidades: **OQ-044**. |

### UC-030 — Descarga parcial con residual en camión

| Campo | Detalle |
| --- | --- |
| **Actores** | Operator (permiso `movement.create`) |
| **Precondiciones** | Carga `IN_TRUCK` en Plazoleta (o con residual en camión); destino `ACTIVE` con capacidad; unidad compatible. |
| **Flujo principal** | 1. El operador registra una descarga parcial indicando cantidad y destino. 2. Observación obligatoria. 3. El backend recalcula el **residual en camión = `totalQuantity − Σ CargoLocation` activos** (BR-038) y valida unidad (BR-035), Σ ≤ total (BR-034) y capacidad (BR-005/036). 4. Crea/actualiza el segmento destino y registra el movimiento. 5. Estado: `PARTIALLY_UNLOADED` mientras haya residual; `STORED` al llegar a cero (§7). |
| **Flujos alternativos** | FA-1 Descarga escalonada a varias ubicaciones (seed 036TERRA26: camión 40 % → Sector 4 60 % → Sector 5 40 %). FA-2 Descarga total en un solo movimiento → estado `STORED`. |
| **Postcondiciones** | Residual en camión consistente con la distribución; historial y observación 1:1. |
| **Excepciones** | Exceso sobre el residual → 409 `DISTRIBUTION_EXCEEDS_TOTAL` (BR-034) · unidades → 422 `UNIT_INCOMPATIBLE` (BR-035) · capacidad → 409 `CAPACITY_EXCEEDED` (BR-005/036) · sin observación → 400/422 (BR-006/007). |
| **BR** | BR-005…008, BR-009, BR-016, BR-034, BR-035, BR-037, BR-038, BR-039 |
| **US** | US-050 (FEATURE-029, Fase 5) |
| **DECISIÓN PENDIENTE** | OQ-042 → **resuelta (BR-042, MASTER-SPEC v0.3)**: el "en camión" es residual derivado — el camión NO es Location · OQ-044 → **resuelta (BR-048)**: sin conversión en v1, unidades compatibles o `PERCENT` (`INCOMPATIBLE_UNIT` 422). |

### UC-031 — Egreso de segmento (retirar una carga de una ubicación)

| Campo | Detalle |
| --- | --- |
| **Actores** | Operator (permiso `movement.create`); Admin |
| **Precondiciones** | Segmento `CargoLocation` ACTIVO existe; la carga mantiene al menos un segmento o residual coherente. |
| **Flujo principal** | 1. El usuario selecciona el segmento a egresar en el panel de distribución. 2. Completa la observación (motivo del retiro). 3. El backend valida: segmento existente, transición permitida, observación e historial (BR-006/008/039). 4. Inserta el movimiento de salida, marca el segmento `EXITED` con `exitedAt` y recalcula la ocupación de la ubicación (BR-033). |
| **Flujos alternativos** | FA-1 Egreso del último segmento: la carga queda sin distribución (residual en camión o estado coherente según máquina de estados, §7). FA-2 Egreso con movimiento parcial previo pendiente → rechazo por inconsistencia (BR-034/037). |
| **Postcondiciones** | Segmento cerrado con `exitedAt`; historial completo; ocupación derivada actualizada. |
| **Excepciones** | Segmento inexistente → 404 `CARGO_LOCATION_NOT_FOUND` · sin observación → 400/422 · transición inválida → 409 `INVALID_TRANSITION` · sin permiso → 403. |
| **BR** | BR-006/007, BR-008, BR-009, BR-033, BR-039 |
| **US** | US-046, US-047, US-049 (FEATURE-028/029, Fase 4–5) |
| **Notas** | `DELETE /api/v1/cargos/:id/locations/:cargoLocationId` (§10). |

### UC-032 — Sobreocupación administrativa (BR-036 ampliada) — OQ-043 resuelta (2026-09-24: solo ADMIN, +10% default, observación obligatoria)

| Campo | Detalle |
| --- | --- |
| **Actores** | Admin (rol autorizante según OQ-043) |
| **Precondiciones** | Ubicación al/límite de capacidad; excepción operativa fundada; decisión de OQ-043 (límite de %, observación). |
| **Flujo principal** | 1. El Admin activa (o encuentra activo) el flag `allowOverOccupation` de la ubicación. 2. Realiza el movimiento/segmento que supera `capacity` con observación. 3. El backend acepta la operación, audita con `metadata.overOccupation = true` y registra el historial (BR-036). |
| **Flujos alternativos** | FA-1 Sin flag: la operación se rechaza con 409 `CAPACITY_EXCEEDED` (BR-005). FA-2 El flag queda activo y se reutiliza en operaciones posteriores (gobernanza según OQ-043). |
| **Postcondiciones** | Ocupación > capacidad con trazabilidad completa (quién, por qué, cuándo). |
| **Excepciones** | Rol no autorizado → 403 `FORBIDDEN` (según OQ-043) · sin observación → 400/422 · sin flag → 409 `CAPACITY_EXCEEDED`. |
| **BR** | BR-005, BR-009, BR-012, BR-036 |
| **US** | US-051, US-052 (FEATURE-030, Fase 4–5) |
| **DECISIÓN PENDIENTE** | OQ-043 → **resuelta (BR-036 ampliada, 2026-09-24)**: límite de % extra default **+10%**, rol autorizante **solo ADMIN**, observación **obligatoria** + auditoría `CAPACITY_CHANGE`. |

---

## 4. Traceability matrix UC → BR → US → Phase

| UC | Nombre | BR principales | US | Fase roadmap |
| --- | --- | --- | --- | --- |
| UC-001 | Iniciar sesión | BR-009, BR-017 | US-004/005 | 2 |
| UC-002 | Cerrar sesión / refresh | BR-009, BR-017 | US-004/005 | 2 |
| UC-003 | Registrar carga | BR-001/002/009/010/013 | US-008/009 | 3 |
| UC-004 | Buscar y consultar cargas | BR-009/010, OQ-001 | US-010/011/012 | 3 |
| UC-005 | Registrar camión | BR-009/013, BR-024/029 | US-014 | 3 |
| UC-006 | Asociar camión↔carga | BR-003/009/016 | US-015 | 3 |
| UC-007 | Ingreso a plazoleta | BR-004/006/008/015/016 | US-008/019 | 3–5 |
| UC-008 | Descargar (parcial/total) | BR-003…008/016, BR-027/030 | US-020/021/025 | 5 |
| UC-009 | Mover entre ubicaciones | BR-003…008/016, BR-030 | US-019/025 | 5 |
| UC-010 | Pasar a Rezago (humano) | BR-006/008/012/014/015/016 | US-024/037/038/039 | 5–9 |
| UC-011 | Pasar a Secuestro | BR-006/008/009/011/016 | US-024 | 5 |
| UC-012 | Operar Scanner | BR-006/007/008/016 | US-022 | 5 |
| UC-013 | Operar Balanza | BR-006/007/008/016 | US-023 | 5 |
| UC-014 | Consultar historial | BR-008/009/010/012 | US-034 | 8 |
| UC-015 | Revertir movimiento | BR-003/006/008/012/013/016, BR-021 | US-027 | 5 |
| UC-016 | Exportar PDF | BR-009/017/018 | US-040/041 | 10 |
| UC-017 | Ciclo de vida de alertas | BR-014, BR-022/026 | US-039 | 9 |
| UC-018 | Visualizar dashboard | BR-009/010 | US-032/033 | 7 |
| UC-019 | Visualizar mapa operativo | BR-009/010/020 | US-028…031 | 6 |
| UC-020 | Editar plano (ADMIN) | BR-009/011/012/020 | US-042/043 | 11 |
| UC-021 | Administrar ubicaciones y capacidad | BR-004/005/009/011/012, BR-023/030 | US-016/017/018 | 4 |
| UC-022 | Soft delete / restaurar carga | BR-008/009/012/013 | US-007/036 | 8 |
| UC-023 | Administrar usuarios y permisos | BR-009…013 | US-045 | 11 |
| UC-024 | Nota sin movimiento | BR-009, BR-031 | US-013 | 3 |
| UC-025 | Consultar auditoría | BR-009/011/013/017 | US-035/036 | 8 |
| UC-026 | Notificaciones in-app | BR-019, BR-022 | US-039 | 9 |
| UC-027 | Distribución de carga multi-ubicación | BR-009/010, BR-032, BR-039/040 | US-046/048 | 4–5 |
| UC-028 | Consultar cargas de ubicación y su ocupación | BR-009/010, BR-033/035, BR-040 | US-047/048 | 4–5 |
| UC-029 | Mover parcialmente una carga entre ubicaciones | BR-005…008/016, BR-032…039 | US-049 | 5 |
| UC-030 | Descarga parcial con residual en camión | BR-005…008/016, BR-034/035, BR-037…039 | US-050 | 5 |
| UC-031 | Egreso de segmento (retirar de ubicación) | BR-006…008/009, BR-033, BR-039 | US-046/047/049 | 4–5 |
| UC-032 | Sobreocupación administrativa (BR-036) | BR-005, BR-009, BR-012, BR-036 | US-051/052 | 4–5 |

## 5. Document Acceptance Criteria

- [ ] Cada UC tiene actor(es), precondiciones, flujo principal, flujos alternativos, postcondiciones y excepciones con códigos del catálogo de W5.
- [ ] UC-001…UC-032 existen; UC-010 es "Pasar a Rezago" (referencia de USER-STORIES US-038 y PRODUCT-BACKLOG §10) y UC-027…UC-032 cubren la ampliación 0.2 (distribución M:N, capacidad por unidad, movimientos/descarga parciales y sobreocupación).
- [ ] Toda excepción referenciada está cubierta: observación vacía (BR-006/007), capacidad excedida (BR-005), ubicación inactiva (BR-004), permiso denegado (BR-009/010/011).
- [ ] Mapeo UC→BR→US completo y coherente con `BUSINESS-RULES.md` y `PRODUCT-BACKLOG.md`.

## 6. Involved Files

| Archivo | Rol |
| --- | --- |
| `docs/MASTER-SPEC.md` | Roles §8, estados §7, BR §6, API §10 |
| `docs/product/PRODUCT-BACKLOG.md` · `USER-STORIES.md` | US vinculadas y prioridades |
| `docs/product/BUSINESS-RULES.md` | Reglas ejecutadas por cada UC |
| `docs/backend/VALIDATION.md` · `ERROR-HANDLING.md` | Matriz de transiciones y códigos de error (W5) |
| `docs/OPEN-QUESTIONS.md` | OQ-001…016 + pendientes reportados |

## 7. DECISIÓN PENDIENTE

| # | Pregunta | Impacto | Referencia |
| --- | --- | --- | --- |
| 1 | ~~Observación del INGRESS en el alta: exigible (BR-006) vs opcional (PHASES P3-H2)~~ → **RESUELTA (OQ-022)**: obligatoria siempre (BR-006) | UC-007 | ✅ Resuelta (2026-09-23) |
| 2 | Eventos generadores, destinatarios y plantillas de notificaciones in-app (canales **in-app** cerrados en OQ-011) | UC-026, FEATURE-023 | 🔶 Residual local (W1-Q10; OQ-011 resuelta: solo in-app) |
| 3 | ~~Drag & drop de cargas en el mapa operativo (BR-006)~~ → **RESUELTA (OQ-024, 2026-09-24)**: **NO en v1** — formulario/diálogo transaccional con observación obligatoria (BR-006) | UC-019 | OQ-024 (resuelta) |
| 4 | Combos válidos estado×tipo de ubicación | UC-009, máquina de estados | 🔶 Residual local (W1-Q12; sin OQ) |
| 5 | Roles para transiciones de AlertStatus | UC-017 | 🔶 Residual local (W1-Q13; sin OQ) |
| 6 | Edición del código de carga post-registro | UC-003 (extensión) | 🔶 Residual local (W1-Q14; sin OQ) |
| 7 | ~~Propiedades editables del plano/ubicaciones en v1~~ → **SIN EFECTO EN v1 (OQ-015 resuelta, 2026-09-24)**: editor fuera de v1 — sin edición de plano ni propiedades en v1 | UC-020/021 | OQ-015 (resuelta) |
| 8 | KPIs exactos del dashboard v1 | UC-018 | 🔶 Residual local (W1-Q16; sin OQ) |
| 9 | ~~Matriz de transiciones (saltos, retorno REZAGO/SECUESTRO, IN_TRANSIT, estado inicial del alta)~~ → **RESUELTA (OQ-029 → BR-045, MASTER-SPEC v0.5)** | UC-007/009/010/011/012/013 | OQ-029 (resuelta) |
| 10 | ~~Permisos de TO_REZAGO/TO_SECUESTRO (¿SECUESTRO solo ADMIN?)~~ → **RESUELTA (W1-Q5 → OQ-030 → BR-046, 2026-09-23)**: **solo ADMIN** | UC-010/011 | W1-Q5 → OQ-030 → BR-046 (resuelta) |
| 11 | Reversión: alcance (último vs cualquiera) y condiciones de reversibilidad | UC-015 | 🔶 Residual local (W1-Q2; sin OQ) |
| 12 | ~~Egreso/retiro (EXITED) en v1~~ → **RESUELTA (OQ-004 → BR-043, 2026-09-23)**: sí — `EXIT` con observación obligatoria, `EXITED` terminal; el UC se habilita | (UC reservado) | OQ-004 → BR-043 (resuelta) |
| 13 | ~~Operator ¿puede leer auditoría de operaciones propias?~~ → **RESUELTA (OQ-019 → §8 RBAC decisión 19, 2026-09-24)**: OPERATOR solo eventos propios; Viewer sin acceso | UC-025 | OQ-019 (resuelta) |
| 14 | ~~OQ-041: unidad por defecto de la capacidad según `LocationType`~~ → **RESUELTA (OQ-041 → BR-041, 2026-09-23)**: default por tipo (Sector/Galpón AREA m², Plazoleta UNITS) + override por ubicación | UC-028, FEATURE-028 | OQ-041 (resuelta) |
| 15 | ~~OQ-042: camión ¿se modela como Location o el "en camión" es residual derivado?~~ → **RESUELTA (OQ-042 → BR-042, MASTER-SPEC v0.3)**: residual derivado `inTruckAmount`/`inTruckUnit` — el camión NO es una ubicación | UC-030, FEATURE-029 | OQ-042 (resuelta) |
| 16 | ~~OQ-043: sobreocupación — límite, rol autorizante y observación~~ → **RESUELTA (OQ-043 → BR-036 ampliada, 2026-09-24)**: default **+10%**, **solo ADMIN**, observación obligatoria + auditoría `CAPACITY_CHANGE` | UC-032, FEATURE-030 | OQ-043 (resuelta) |
| 17 | ~~OQ-044: conversión de unidades en movimientos y descargas parciales~~ → **RESUELTA (OQ-044 → BR-048, 2026-09-24)**: **sin conversión en v1** — unidades compatibles o `PERCENT`; `INCOMPATIBLE_UNIT` 422 | UC-029/030, FEATURE-029 | OQ-044 (resuelta) |
| 18 | ~~OQ-045: semántica de `percentage` en la distribución~~ → **RESUELTA (OQ-045 → BR-049, 2026-09-24)**: derivado de UI (quantity/totalQuantity; input solo si unidad `PERCENT`) — no relativo al segmento origen | UC-027/029, FEATURE-028/029 | OQ-045 (resuelta) |

Los pendientes **W1-Q9…W1-Q16** se reportan al orquestador para su incorporación a `OPEN-QUESTIONS.md` (ID tentativo OQ-019…OQ-026).