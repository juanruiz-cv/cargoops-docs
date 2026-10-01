# CargoOps — Flujos de Usuario (USER-FLOWS)

## Objetivo
Documentar los **user journeys completos** de los 21 flujos operativos definidos para CargoOps (15 originales + 6 de distribución M:N — secciones 62-70), más el flujo de login y el de dashboard. Cada flujo especifica actor, trigger, pasos de UI, puntos de decisión, validaciones (BR), estados de pantalla, errores con recovery y criterios de éxito. Este documento es la fuente para diseñar pantallas (`ux/SCREENS.md`), el mapa operativo (`ux/MAP-UX.md`), los casos de prueba (`qa/`) y las stories de implementación (`product/`).

## Contexto
CargoOps es una plataforma web **desktop-first** (correcta en notebook/tablet/móvil) de gestión operativa de cargas y depósitos en un predio logístico/aduanero. Fuente de verdad canónica: `docs/MASTER-SPEC.md` (§1.4 capacidades, §7 máquina de estados, §8 RBAC, §9 alertas/rezago, §10 API, §12 UX/UI). Los flujos respetan la decisión canónica de que **estado (CargoStatus) y ubicación son independientes** (MASTER-SPEC §4.4.2 / §7) y que **todo movimiento o cambio de estado exige observación obligatoria** (BR-006/007). Con la ampliación §§62-70 (MASTER-SPEC v0.3), la relación Cargo↔Location es MANY-TO-MANY vía `CargoLocation` y los flujos 16–21 documentan distribución, ocupación, movimientos parciales y descarga parcial (BR-032…BR-042), incluyendo la alerta de capacidad (§9): la unidad de capacidad por defecto depende del `LocationType` con override por ubicación (BR-041) y el residual "en camión" es un valor derivado del backend (`inTruckAmount`/`inTruckUnit`), no una ubicación (BR-042).

## Restricciones
- No se definen reglas de negocio nuevas; toda ambigüedad real → `DECISIÓN PENDIENTE` (centralizada en `OPEN-QUESTIONS.md`).
- El frontend NUNCA es la capa de autorización (BR-009): los botones se habilitan por rol en la UI solo como experiencia, la validación real ocurre en backend.
- Las transiciones de estado se validan en backend (state machine, BR-016); la UI solo ofrece transiciones válidas.
- Movimientos críticos NO offline en v1 (MASTER-SPEC §12).
- Filenames en inglés; contenido en español profesional/neutral.

## Dependencias
- `docs/MASTER-SPEC.md` (decisiones canónicas: roles, BR, enums, máquina de estados, ubicaciones).
- `docs/OPEN-QUESTIONS.md` (OQ-001…OQ-047 — todas resueltas 2026-09-23/24; residuales locales citados en cada flujo).
- `frontend/FRONTEND-ARCHITECTURE.md`, `frontend/COMPONENTS.md`, `frontend/ROUTING.md` (grupo W4, futuros): componentes citados (`CargoTable`, `CargoStatusBadge`, `ConfirmDialog`, `ObservationDialog`, `PdfExportButton`, …) se detallan allí.
- `backend/API.md`, `backend/VALIDATION.md` (W5, futuros): contratos de los endpoints citados.
- `architecture/MAP-ENGINE.md`, `architecture/PDF-EXPORT.md` (W2, futuros).
- `ux/SCREENS.md`, `ux/MAP-UX.md` (este grupo, coherencia garantizada por IDs compartidos).

## Convenciones transversales (aplican a todos los flujos)
| Convención | Regla |
| --- | --- |
| Roles | `VIEWER`, `OPERATOR`, `ADMIN` (MASTER-SPEC §8). Viewer: solo consulta. Operator: operación. Admin: + reversión, planos, configuración. |
| Observación | Todo movimiento/estado requiere `ObservationDialog` con texto no vacío (BR-006/007). El diálogo se abre ANTES de confirmar; el botón de confirmar queda deshabilitado si el texto está vacío. |
| Confirmación | Acciones destructivas o irreversibles usan `ConfirmDialog` (reversión, secuestro, edición de plano). |
| Estados de UI | Toda pantalla define: loading (skeleton), empty (estado vacío con acción sugerida), error (mensaje claro + retry), y éxito (feedback visible en contexto). |
| Errores | Envelope `{ error: { code, message, requestId } }` (MASTER-SPEC §10): el mensaje de UI usa `message` del backend, nunca texto genérico inventado en frontend. |
| Historial | Todo movimiento genera historial (BR-008); el flujo 12 lo consulta. |
| Permisos de UI | Menús y botones se ocultan/deshabilitan según rol (UX), pero el backend rechaza (403) si no corresponde (BR-009). |
| Mapa | El mapa operativo es el atajo preferido para ubicar/mover; el listado es la alternativa accesible (MASTER-SPEC §12). |

## Resumen de flujos (mapeo operativo)
| # | Flujo | Actor(es) | MovementKind / Acción | CargoStatus resultante |
| --- | --- | --- | --- | --- |
| 0 | Login | todos | auth.login | — |
| 0.1 | Dashboard | todos | dashboard.load | — |
| 1 | Registrar carga | OPERATOR, ADMIN | cargo.create | REGISTERED (sin ubicación) |
| 2 | Registrar camión | OPERATOR, ADMIN | truck.create | — |
| 3 | Ingresar carga a plazoleta | OPERATOR, ADMIN | INGRESS | IN_TRUCK |
| 4 | Descargar carga | OPERATOR, ADMIN | UNLOAD | PARTIALLY_UNLOADED \| STORED |
| 5 | Mover carga al sector | OPERATOR, ADMIN | MOVE | STORED |
| 6 | Llevar a scanner | OPERATOR, ADMIN | TO_SCANNER (\*) | IN_REVIEW |
| 7 | Llevar a balanza | OPERATOR, ADMIN | TO_BALANZA (\*) | IN_REVIEW |
| 8 | Detectar carga >30 días | sistema (job) | alert.create | sin cambio (REZAGO solo humano) |
| 9 | Pasar a rezago | OPERATOR, ADMIN | TO_REZAGO | REZAGO |
| 10 | Pasar a secuestro | ADMIN (\*) | TO_SECUESTRO | SECUESTRO |
| 11 | Buscar carga | VIEWER, OPERATOR, ADMIN | cargo.search | — |
| 12 | Consultar historial | VIEWER, OPERATOR, ADMIN | movement.list | — |
| 13 | Exportar PDF | VIEWER, OPERATOR, ADMIN | EXPORT | — |
| 14 | Editar plano | ADMIN | MAP_EDIT | — |
| 15 | Revertir movimiento | ADMIN | REVERSION | depende del movimiento revertido |
| 16 | Ver distribución de una carga | VIEWER, OPERATOR, ADMIN | cargo.locations.read | — (consulta) |
| 17 | Ver ocupación de una ubicación | VIEWER, OPERATOR, ADMIN | location.capacity.read + cargo.list | — (consulta) |
| 18 | Movimiento parcial entre ubicaciones | OPERATOR, ADMIN | MOVE (parcial, cantidad/%) | según residual resultante |
| 19 | Descarga parcial desde camión | OPERATOR, ADMIN | UNLOAD (parcial) | PARTIALLY_UNLOADED \| STORED |
| 20 | Alta/ajuste/egreso de segmento CargoLocation | OPERATOR, ADMIN | CargoLocation create/update/exit | según operación (BR-039) |
| 21 | Manejo de alerta de capacidad | sistema + OPERATOR/ADMIN (sobreocupación: ADMIN) | alert.capacity / CAPACITY_CHANGE | sin cambio (BR-036) |

(\*) Decisión pendiente: ver sección `DECISIÓN PENDIENTE` (DP-UF-03 residual local; DP-UF-04 **resuelta**: Secuestro solo ADMIN — OQ-030 → BR-046).

---

## Flujo 0 — Login

- **Actor**: cualquier usuario con credencial activa (cualquier rol).
- **Trigger**: acceso a la plataforma sin sesión válida.
- **Pasos**:
  1. La app redirige a `/login` (o muestra la pantalla Login si no hay JWT válido).
  2. El usuario ingresa username y contraseña.
  3. Valida el formulario (campos obligatorios, formato de username).
  4. Envía `POST /api/v1/auth/login` (MASTER-SPEC §10).
  5. El backend devuelve JWT + refresh token (ADR-008); la app guarda los tokens en storage seguro.
  6. Se cargan el perfil del usuario, sus roles y permisos (RBAC).
  7. Se redirige a `/dashboard` (o a la ruta que intentaba acceder, si existe).
  8. Se registra `LOGIN` en audit log (AuditAction, MASTER-SPEC §4.3).
- **Puntos de decisión**: mantener sesión (recordarme → refresh persistente) vs sesión de trabajo (caduca).
- **Validaciones**: credenciales correctas; usuario `active = true`; rol habilitado; BR-009 (backend).
- **Estados de pantalla**: `loading` (spinner en botón), `error` (mensaje de credenciales inválidas o cuenta inactiva), `success` (redirección).
- **Errores y recovery**:
  - 401 credenciales inválidas → mensaje "Usuario o contraseña incorrectos" (sin revelar cuál es cuál) + foco en campo usuario.
  - 403 cuenta inactiva → "Tu cuenta está inactiva. Contactá al administrador."
  - Red caída → mensaje de conexión + retry.
  - JWT expirado en sesión → refresh automático; si falla → logout silencioso a `/login`.
- **Criterios de éxito**: el usuario accede con sus permisos correctos; el menú muestra únicamente las secciones habilitadas por rol; hay registro de auditoría `LOGIN`.
- **DECISIÓN PENDIENTE relacionada**: recuperación de contraseña no definida en MASTER-SPEC (la UI solo muestra enlace "¿Olvidaste tu contraseña?" como futuro) → DP-UF-01 🔶 residual local.

## Flujo 0.1 — Dashboard

- **Actor**: todos los roles (contenido varía por permiso).
- **Trigger**: login exitoso o click en "Dashboard" del menú.
- **Pasos**:
  1. `GET /api/v1/dashboard` devuelve: resumen de cargas por estado, alertas OPEN, ocupación por ubicación, permanencia máxima, actividad reciente.
  2. Render: cards de KPI (cargas totales, alertas abiertas, ocupación general, permanencia máxima en días), tabla de alertas activas, mini-resumen de ocupación por sector, mapa resumen o acceso directo, actividad reciente.
  3. Cada KPI/card es clickeable → navega al listado correspondiente con el filtro precargado (p. ej. alertas → `/alerts`, cargas por estado → `/cargas?status=...`).
  4. Las alertas abiertas se muestran con severidad y antigüedad; el operador puede ir directo a resolver (flujo 9/10).
- **Puntos de decisión**: revisar alertas primero (recomendado) vs continuar con operación.
- **Validaciones**: BR-009 (los datos del dashboard respetan los permisos del rol).
- **Estados de pantalla**: `loading` (skeletons por card), `empty` (sin datos: "No hay operaciones que mostrar"), `error` (fallback con retry y requestId).
- **Errores y recovery**: 401/403 → redirect a login o mensaje de permisos; timeout → retry.
- **Criterios de éxito**: el usuario ve en una pantalla el estado operativo del predio y puede navegar a la sección de detalle con un click.
- **DECISIÓN PENDIENTE relacionada**: cálculo de ocupación y umbrales visuales (OQ-044/046 **resueltas** → DP-UF-02: Σ ACTIVE en unidad compatible; <70/70–90/>90 sin conversión en v1) (la unidad por defecto por tipo de ubicación quedó resuelta en BR-041).

## Flujo 1 — Registrar carga

- **Actor**: OPERATOR, ADMIN.
- **Trigger**: llega carga nueva al predio con documentación (sin camión aún, o con camión vinculado).
- **Pasos**:
  1. Navegar a "Cargas" → botón "Registrar carga".
  2. Completar formulario (ver `SCREENS.md` → Registro/Edición de carga): código obligatorio, descripción, fecha de ingreso (default hoy, editable), camión opcional (o crear luego, flujo 2).
  3. Validación en vivo del código (unicidad consultada al backend).
  4. Guardar → `POST /api/v1/cargos`.
  5. Feedback de éxito + redirección al detalle de la carga (status `REGISTERED`, sin ubicación aún).
- **Puntos de decisión**: fecha de ingreso retroactiva (admite corrección de registros) — la permanencia se calcula desde `entryDate` (BR-015); si se registra una carga ya en el predio, el operador debe decidir si ingresa directo (flujo 3) o completa el circuito normal.
- **Validaciones**: BR-001 (código obligatorio), BR-002 (unicidad — regex `^[A-Z0-9][A-Z0-9./-]{2,31}$`, OQ-001 resuelta), BR-007 (si se cambia estado en el mismo paso), BR-009.
- **Estados de pantalla**: `editing` (formulario con validación en vivo), `saving` (botón guardar con spinner), `duplicate-error` (mensaje sobre el campo código), `success` (redirección).
- **Errores y recovery**:
  - Código duplicado (409) → mensaje "El código X ya está registrado" + sugerencia de consultar el existente (flujo 11); el formulario conserva el resto de los datos.
  - Campos inválidos → mensajes por campo con foco en el primero.
  - Pérdida de red → el formulario conserva el estado; retry guarda.
- **Criterios de éxito**: la carga queda con status `REGISTERED`, visible en el listado y buscable; hay audit `CREATE`.
- **DECISIÓN PENDIENTE relacionada**: formato/validación exacta del código (OQ-001 → BR-002 resuelta; DP-UF-05) — regex, normalización a mayúsculas, unicidad case-insensitive.

## Flujo 2 — Registrar camión

- **Actor**: OPERATOR, ADMIN.
- **Trigger**: llega un camión al predio que no está registrado.
- **Pasos**:
  1. Desde "Camiones" o desde el flujo de ingreso (botón contextual "Registrar camión").
  2. Completar formulario: patente (obligatoria), marca, modelo, conductor (opcional).
  3. Guardar → `POST /api/v1/trucks`.
  4. El camión queda disponible para vincular cargas (flujo 3).
- **Puntos de decisión**: vincular cargas existentes al camión en el mismo paso (conveniente) vs dejar la vinculación para el ingreso (flujo 3).
- **Validaciones**: BR-009; unicidad de patente (formato MERCOSUR `^[A-Z]{2,3}\d{2}[A-Z0-9]$` — DP-UF-06 resuelta: ID-009/OQ-003).
- **Estados de pantalla**: `editing`, `saving`, `error` (patente duplicada), `success`.
- **Errores y recovery**: patente duplicada → mensaje + posibilidad de abrir el camión existente; formato de patente inválido → mensaje por campo.
- **Criterios de éxito**: el camión se registra y puede asociarse a una o más cargas (relación 1 camión ↔ N cargas, MASTER-SPEC §4.4.6).
- **DECISIÓN PENDIENTE relacionada**: división de cargas en varios camiones y multi-cliente (OQ-003 **resuelta**: UN camión a la vez; N cargas multi-cliente por camión) → DP-UF-06 (resuelta: ID-009/OQ-003).

## Flujo 3 — Ingresar carga a plazoleta

- **Actor**: OPERATOR, ADMIN.
- **Trigger**: el camión con carga ingresa al predio y se ubica en la plazoleta (zona gris, MASTER-SPEC §3).
- **Pasos**:
  1. Desde el detalle de la carga (o desde el listado del camión): acción "Ingresar a plazoleta".
  2. Seleccionar ubicación destino `Plazoleta` (default si hay una sola activa).
  3. Abrir `ObservationDialog`: motivo/descripción obligatoria (BR-006).
  4. Confirmar → `POST /api/v1/cargos/:id/movements` con `MovementKind = INGRESS`.
  5. La carga pasa a `IN_TRUCK`; el mapa muestra la carga en la plazoleta; el camión queda vinculado.
- **Puntos de decisión**: ¿el camión se registra antes (flujo 2) o se registra en línea dentro de este flujo? (UI ofrece ambas).
- **Validaciones**: BR-003 (carga existe), BR-004 (Plazoleta ACTIVE), BR-005 (capacidad de la plazoleta — unidad por defecto UNITS por BR-041; sin conversión de unidades, OQ-044 resuelta), BR-006, BR-008, BR-016 (REGISTERED → IN_TRUCK válido).
- **Estados de pantalla**: `loading-locations`, `observing` (diálogo), `moving` (confirmación), `success` (badge de estado y mapa actualizados), `error`.
- **Errores y recovery**:
  - Plazoleta sin capacidad (BR-005) → mensaje "Plazoleta sin disponibilidad" + sugerencia de esperar descargas; la carga permanece `IN_TRUCK` en estado registrado.
  - Observación vacía → botón confirmar deshabilitado.
  - 403 por rol → botón oculto en UI (Viewer no ve la acción).
- **Criterios de éxito**: la carga figura `IN_TRUCK` en Plazoleta, el historial registra el movimiento con observación, y el mapa refleja la ocupación.

## Flujo 4 — Descargar carga

- **Actor**: OPERATOR, ADMIN.
- **Trigger**: el camión está en la plazoleta y la carga está lista para descarga.
- **Pasos**:
  1. Desde el detalle de la carga (o click en la carga dentro del mapa): acción "Descargar".
  2. Indicar cantidad/movimiento: **descarga total** o **parcial** (quantityMoved, MASTER-SPEC §4.4.5).
  3. Observación obligatoria.
  4. Confirmar → `UNLOAD`.
  5. Si se descarga todo → `STORED`; si parcial → `PARTIALLY_UNLOADED`.
- **Puntos de decisión**: total vs parcial (semántica de "parcial" **resuelta en OQ-002**: vía `CargoLocation`, sin CargoItem en v1); hacia qué ubicación intermedia se mueve la mercadería descargada (suele quedar en sector/pulmón antes del acomodo final — flujo 5).
- **Validaciones**: BR-003, BR-004, BR-005 (destino), BR-006, BR-008, BR-016 (IN_TRUCK → PARTIALLY_UNLOADED/STORED), BR-042 (descarga parcial exige `totalQuantity`/`totalUnit` de la carga; `CARGO_TOTAL_REQUIRED` 422 si faltan).
- **Estados de pantalla**: `observing`, `confirming`, `success`, `error`.
- **Errores y recovery**: destino inválido o sin capacidad → mismo recovery del flujo 5; cantidad inválida (mayor a la disponible) → mensaje de validación; 422 `CARGO_TOTAL_REQUIRED` → "registrá la cantidad total de la carga antes de descargar parcialmente" + CTA al campo total del detalle.
- **Criterios de éxito**: la carga queda `PARTIALLY_UNLOADED` o `STORED` con su movimiento `UNLOAD` historizado y el camión liberado para otras cargas.

## Flujo 5 — Mover carga al sector

- **Actor**: OPERATOR, ADMIN.
- **Trigger**: la carga descargada debe ubicarse en su sector definitivo (Sectores 1–12).
- **Pasos**:
  1. Desde el detalle de la carga, el listado o el mapa: acción "Mover a…".
  2. Elegir ubicación destino (mapa con resaltado, o selector de ubicaciones activas).
  3. El sistema valida en vivo: destino activo, capacidad disponible, solapamiento de reglas.
  4. Observación obligatoria.
  5. Confirmar → `MOVE`.
- **Puntos de decisión**: mover desde mapa (drag de la carga a un sector, si está habilitado) vs desde formulario; ambas permitidas, misma validación.
- **Validaciones**: BR-003, BR-004, BR-005, BR-006, BR-008, BR-016 (IN_TRUCK/STORED → STORED).
- **Estados de pantalla**: `loading-destinations`, `map-selection`, `validating`, `success`, `error`.
- **Errores y recovery**:
  - Capacidad excedida (BR-005) → mensaje con ocupación actual del destino ("Sector 4: 8/10") y sugerencia de otro sector.
  - Ubicación en mantenimiento (BR-004) → se omite del selector y se explica si el usuario la buscó por nombre.
  - 403 → acción oculta.
- **Criterios de éxito**: la carga queda `STORED` en el sector correcto, el mapa actualiza ocupación/estado y el historial registra origen→destino con observación.

## Flujo 6 — Llevar a scanner

- **Actor**: OPERATOR, ADMIN.
- **Trigger**: la carga requiere control documental/escaneo en el área Scanner.
- **Pasos**:
  1. Acción "Mover a Scanner" (equivalente a MOVE con destino Scanner; la UI lo presenta como operación específica).
  2. Observación obligatoria.
  3. Confirmar → `TO_SCANNER` (o `MOVE` con razón tipada — ver DP-UF-03).
  4. La carga pasa a `IN_REVIEW` (estado operativo de revisión) en la ubicación Scanner.
- **Puntos de decisión**: al terminar la revisión, ¿se vuelve a su sector (MOVE normal) o se define otro destino? La UI ofrece el mismo flujo 5 desde la ubicación actual.
- **Validaciones**: BR-003/004/005 (capacidad del scanner si aplica), BR-006, BR-008, BR-016.
- **Estados de pantalla**: estándar de movimiento (`observing` → `confirming` → `success`).
- **Errores y recovery**: estándar; el historial permite rastrear el motivo de la revisión.
- **Criterios de éxito**: la carga queda `IN_REVIEW` en Scanner con movimiento historizado.
- **DECISIÓN PENDIENTE relacionada**: `MovementKind` propio vs `MOVE` tipado (MASTER-SPEC §4.3) → DP-UF-03.

## Flujo 7 — Llevar a balanza

- **Actor**: OPERATOR, ADMIN.
- **Trigger**: se requiere pesaje de la carga en el área Balanza.
- **Pasos**:
  1. Acción "Mover a Balanza" desde detalle/mapa/listado.
  2. Ingresar o confirmar peso en el formulario (campo opcional de metadata del movimiento).
  3. Observación obligatoria.
  4. Confirmar → `TO_BALANZA`.
  5. La carga pasa a `IN_REVIEW` en Balanza.
- **Puntos de decisión**: la capacidad de Balanza se mide en UNITS por defecto (BR-041), no en toneladas; el pesaje del camión se registra como metadata del movimiento y participa de la validación según la unidad efectiva de la ubicación (BR-005).
- **Validaciones**: BR-003/004/005, BR-006, BR-008, BR-016.
- **Errores y recovery**: peso inválido (negativo/cero) → validación de campo; balanza sin disponibilidad → mensaje + alternativa.
- **Criterios de éxito**: la carga queda `IN_REVIEW` en Balanza con el peso registrado en el movimiento (metadata) y su historial completo.
- **DECISIÓN PENDIENTE relacionada**: umbrales de ocupación visual (OQ-046 **resuelta**: <70/70–90/>90) → DP-UF-02 (la unidad por defecto quedó resuelta en BR-041).

## Flujo 8 — Detectar carga >30 días

- **Actor**: sistema (job de alertas) + OPERATOR/ADMIN (revisión). El usuario no "ejecuta" la detección.
- **Trigger**: job periódico que compara `entryDate` + 30 días contra la fecha actual (BR-014, BR-015).
- **Pasos**:
  1. El job recorre cargas activas (no `EXITED`/`DELETED`) con permanencia > 30 días.
  2. Para cada una, genera alerta `STALE_30D` `OPEN` (AlertType/AlertStatus, MASTER-SPEC §4.3).
  3. La alerta aparece en: Dashboard (tabla de alertas), badge en el detalle de la carga, y estado `alerta` en el mapa (ver `MAP-UX.md`).
  4. El operador/admin abre la alerta, revisa la carga (historial, observaciones) y decide.
  5. **NO se mueve automáticamente a Rezago** (BR-014): la decisión es humana y requiere observación.
  6. Si decide pasar a rezago → flujo 9; si no → la alerta puede quedar `ACKNOWLEDGED` con nota.
- **Puntos de decisión**: días corridos para el umbral, fecha base `entryDate`, alerta 30 + segunda 40 (OQ-008 → BR-014/015 resuelta); notificación al operador **in-app** (OQ-011 → BR-019 resuelta).
- **Validaciones**: BR-014, BR-015; la generación de alerta no altera estado ni ubicación.
- **Estados de pantalla**: la alerta se muestra en `OPEN`; si el usuario la reconoce → `ACKNOWLEDGED`; si se mueve a rezago → `RESOLVED` (mensaje de resolución).
- **Errores y recovery**: alerta duplicada (mismo cargo + misma condición) → deduplicación por job; job caído → la detección corre en el siguiente ciclo (no bloquea operación).
- **Criterios de éxito**: toda carga con permanencia > 30 días tiene alerta OPEN visible en dashboard/detalle/mapa; ninguna se mueve a Rezago sin decisión humana.

## Flujo 9 — Pasar a rezago

- **Actor**: OPERATOR, ADMIN (decisión humana, BR-014).
- **Trigger**: alerta STALE_30D revisada y decisión de pasar la carga a Rezago.
- **Pasos**:
  1. Desde la alerta (Dashboard) o desde el detalle de la carga: acción "Mover a Rezago".
  2. `ConfirmDialog` con advertencia ("la carga quedará en el área de rezago; esta decisión queda historiada").
  3. Observación obligatoria explicando el motivo.
  4. Confirmar → `TO_REZAGO`.
  5. La carga pasa a `REZAGO` en la ubicación Rezago; la alerta STALE_30D se cierra (`RESOLVED`).
- **Puntos de decisión**: ¿Operator puede o solo ADMIN? (BR-014 dice "usuario autorizado"; los movimientos son de Operator; para Secuestro → DP-UF-04 resuelta: **solo ADMIN** — OQ-030 → BR-046).
- **Validaciones**: BR-003/004/005, BR-006, BR-008, BR-014, BR-016 (IN_REVIEW/STORED → REZAGO).
- **Estados de pantalla**: `confirming` → `success`; en caso de alerta asociada, transición de la alerta a `RESOLVED`.
- **Errores y recovery**: carga ya en rezago → acción oculta; observación vacía → confirmación deshabilitada.
- **Criterios de éxito**: la carga queda `REZAGO` en el área Rezago, con movimiento historizado, observación y alerta resuelta.

## Flujo 10 — Pasar a secuestro

- **Actor**: ADMIN (propuesta; ver DP-UF-04).
- **Trigger**: disposición legal/administrativa de retener la carga en el área Secuestro.
- **Pasos**:
  1. Desde el detalle de la carga: acción "Mover a Secuestro" (solo ADMIN).
  2. `ConfirmDialog` reforzado (doble confirmación) con advertencia explícita de implicancia legal.
  3. Observación obligatoria (motivo/disposición que lo origina).
  4. Confirmar → `TO_SECUESTRO`.
  5. La carga pasa a `SECUESTRO`; el historial y auditoría registran el movimiento; sin hard delete (BR-013).
- **Puntos de decisión**: requerimiento de doble confirmación; restricción de otros roles.
- **Validaciones**: BR-003/004/005, BR-006, BR-008, BR-011/012 (solo ADMIN en operación sensible), BR-016 (→ SECUESTRO).
- **Estados de pantalla**: `confirming-1` → `confirming-2` → `success`; `error` (403 si rol insuficiente, aunque la UI ya lo oculta).
- **Errores y recovery**: 403 → mensaje de permisos (defensa en profundidad, BR-009); reversión posterior vía flujo 15 (solo ADMIN).
- **Criterios de éxito**: la carga queda `SECUESTRO` con movimiento, observación y auditoría; ningún rol puede borrarla silenciosamente.
- **DECISIÓN PENDIENTE relacionada**: paso a Secuestro = **solo ADMIN** (OQ-030 → BR-046 resuelta) → DP-UF-04.

## Flujo 11 — Buscar carga

- **Actor**: VIEWER, OPERATOR, ADMIN (consulta permitida a todos, MASTER-SPEC §8).
- **Trigger**: necesidad de localizar una carga por código, cliente, estado, ubicación, camión o alerta.
- **Pasos**:
  1. Dos entradas posibles: buscador global del topbar (código exacto/parcial, rápido) o el listado de Cargas con filtros avanzados.
  2. Aplicar filtros: código, descripción, estado (CargoStatus), ubicación, camión (patente), rango de fechas (entryDate), con/sin alertas.
  3. Ordenar por columna (código, fecha, estado, ubicación, permanencia) y paginar (25/100 por defecto, MASTER-SPEC §10).
  4. Click en una fila → detalle de la carga.
- **Puntos de decisión**: búsqueda exacta vs parcial (decisión en `backend/API.md` para `filter`); el buscador global prioriza código y muestra coincidencias parciales.
- **Validaciones**: BR-009; los resultados respetan permisos (un Viewer no ve datos que no le correspondan por rol — BR-018 para exportación desde resultados).
- **Estados de pantalla**: `loading` (skeleton en tabla), `empty` ("No se encontraron cargas con esos criterios" + botones: limpiar filtros / registrar carga si hay permiso), `error` (retry con requestId), `results` (tabla paginada).
- **Errores y recovery**: timeout de búsqueda → retry; filtros incompatibles → se corrigen en vivo.
- **Criterios de éxito**: el usuario encuentra la carga en ≤ 2 interacciones y accede al detalle con todos sus datos.

## Flujo 12 — Consultar historial

- **Actor**: VIEWER, OPERATOR, ADMIN.
- **Trigger**: necesidad de reconstruir la línea temporal de una carga (trazabilidad total, BR-008).
- **Pasos**:
  1. Desde el detalle de la carga: pestaña "Historial" (timeline).
  2. Se listan los movimientos cronológicos (desc): fecha/hora, tipo (INGRESS/UNLOAD/MOVE/TO_SCANNER/TO_BALANZA/TO_REZAGO/TO_SECUESTRO/REVERSION/EXIT), origen → destino (o estado → estado), usuario, observación.
  3. Filtrar por tipo de movimiento o por rango de fechas.
  4. Si el movimiento fue revertido, se muestra la marca de reversión con enlace al movimiento original y viceversa (reversionOfId, MASTER-SPEC §4.1).
  5. (ADMIN) cada movimiento ofrece la acción "Revertir" → flujo 15.
- **Puntos de decisión**: ver solo movimientos vs incluir notas sin movimiento (Observation con cargoId).
- **Validaciones**: BR-008; BR-009.
- **Estados de pantalla**: `loading` (timeline skeleton), `empty` ("Sin movimientos registrados" — solo ocurre si la carga se creó y nunca se movió), `error`, `results`.
- **Errores y recovery**: movimiento inexistente en deep-link → mensaje y vuelta al historial.
- **Criterios de éxito**: la línea temporal es completa, legible y reconstruible; cada movimiento muestra observación y autor; las reversiones están explícitamente marcadas.

## Flujo 13 — Exportar PDF

- **Actor**: VIEWER (exportaciones autorizadas), OPERATOR, ADMIN — según permisos por rol (BR-018).
- **Trigger**: necesidad de documento oficial del estado de una carga (informe de trazabilidad).
- **Pasos**:
  1. Desde el detalle de la carga: botón "Exportar PDF" (en el encabezado, visible según permiso).
  2. Opcional: seleccionar alcance (datos generales + movimientos completos + alertas, o resumen).
  3. `POST /api/v1/cargos/:id/export-pdf` (MASTER-SPEC §10).
  4. El backend genera el PDF (estrategia resuelta — OQ-005 → ADR-013: HTML→PDF server-side) y la app descarga el archivo.
  5. Se registra audit `EXPORT` (AuditAction, §4.3).
- **Puntos de decisión**: ¿el PDF se genera en el acto (síncrono) o se encola y notifica? (depende de ADR-013; la UI debe soportar ambos estados).
- **Validaciones**: BR-009, BR-018 (no expone datos no autorizados por rol).
- **Estados de pantalla**: `generating` (spinner en el botón), `ready` (descarga iniciada), `error` (fallo de generación → retry), `denied` (403 → botón oculto en UI).
- **Errores y recovery**: generación fallida → mensaje con requestId + retry; PDF pesado → recomendado encolar (ADR-013/OQ-005 resueltas: jobs reales BullMQ).
- **Criterios de éxito**: el usuario descarga un PDF con los datos autorizados de la carga y su historial; la exportación queda auditada.
- **DECISIÓN PENDIENTE relacionada**: estrategia/generación PDF (OQ-005 → ADR-013 resuelta: HTML→PDF asíncrono por job) → DP-UF-07.

## Flujo 14 — Editar plano

- **Actor**: ADMIN (BR-011/012 prohíben a Operator; OQ-015 resuelta: editor fuera de v1 — mapa = vista estática).
- **Trigger**: necesidad de ajustar el layout del predio (nueva ubicación, cambio de capacidad, redimensionar sector).
- **Pasos**:
  1. Navegar a "Planos" → activar "Modo edición" (solo ADMIN).
  2. Toolbar del editor: seleccionar, crear (PLAZOLETA/GALPON/SECTOR/SCANNER/BALANZA/REZAGO/SECUESTRO/OTRO), mover, redimensionar, rotar, borrar, propiedades.
  3. Seleccionar una ubicación → panel de propiedades (nombre, código, tipo, capacidad, unidad, color, estado). Al crear/editar, la unidad se precarga según el `LocationType` (Sector → m², Plazoleta/Scanner/Balanza → u, otros → configurable) con override por ubicación (BR-041; gobernanza ADMIN, auditoría `CAPACITY_CHANGE`).
  4. El editor valida en vivo: solapamientos, límites del mapa, tamaño mínimo, snap a grid (gridSize del Map, MASTER-SPEC §4.1).
  5. Guardar cambios → `PATCH /api/v1/maps/:id` con `ConfirmDialog` ("los cambios afectan la vista operativa").
  6. Audit log `MAP_EDIT` con diff (previous/newValue, BR-020, §4.1 AuditLog).
  7. Salir del modo edición → el mapa operativo muestra la nueva configuración.
- **Puntos de decisión**: editar borrador (guardar sin publicar) vs publicar directo (versión de mapa, Map.version) — DP-UF-08 resuelta (OQ-015: editor fuera de v1; borrador/publicación sin efecto en v1).
- **Validaciones**: BR-009, BR-011/012, BR-020 (datos estructurados, no imagen), validaciones geométricas del editor.
- **Estados de pantalla**: `viewing` (visualización), `editing` (canvas + propiedades), `saving`, `validation-error` (solapamiento resaltado), `success`, `error`.
- **Errores y recovery**:
  - Solapamiento → la ubicación en conflicto se resalta en rojo con mensaje ("El sector 5 se superpone con el sector 6"); el guardado se bloquea.
  - Fuera de límites / tamaño mínimo → validaciones inline.
  - Borrar una ubicación con cargas → bloqueado con mensaje ("La ubicación tiene N cargas; movelas antes").
  - 403 → modo oculto para no-ADMIN.
- **Criterios de éxito**: el plano se actualiza de forma estructurada y versionada, el mapa operativo refleja el cambio y la auditoría documenta la edición.
- **DECISIÓN PENDIENTE relacionada**: disponibilidad del editor en v1 vs vista estática (OQ-015 **resuelta**: vista estática, editor diferido) → DP-UF-08.

## Flujo 15 — Revertir movimiento

- **Actor**: ADMIN (BR-012; Operator no revierte).
- **Trigger**: un movimiento se registró por error y debe revertirse (ubicación/estado incorrectos).
- **Pasos**:
  1. Desde el historial de la carga (flujo 12): click en "Revertir" de un movimiento determinado.
  2. `ConfirmDialog`: se explica qué se deshace (ubicación/estado previo al movimiento) y que NO se elimina el historial.
  3. Observación obligatoria explicando el motivo de la reversión.
  4. Confirmar → `POST /api/v1/cargos/:id/movements` con `MovementKind = REVERSION` y `reversionOfId` apuntando al movimiento original.
  5. La carga vuelve a su ubicación/estado previo; el movimiento original queda marcado como revertido (reversedById/reversedAt); ambos permanecen en el historial (BR-012/013).
  6. Audit `REVERT`.
- **Puntos de decisión**: revertir movimientos encadenados (varios movimientos posteriores derivados del erróneo) — 🔶 residual local (DP-UF-09: sin OQ).
- **Validaciones**: BR-006 (observación de la reversión), BR-008, BR-012, BR-016 (la reversión respeta la máquina de estados), estado reversible (no se revierte otro REVERSION ni movimientos ya revertidos).
- **Estados de pantalla**: `confirming` → `success` (timeline actualizada con la marca de reversión); `invalid` (movimiento no reversible → acción oculta).
- **Errores y recovery**: movimiento ya revertido → acción deshabilitada con tooltip; carga movida después del movimiento a revertir → advertencia de efecto encadenado (a validar — DP-UF-09 🔶 residual local).
- **Criterios de éxito**: la carga recupera su ubicación/estado previo, el historial muestra el movimiento original + la reversión (nunca se borra), y la auditoría registra la operación.

---

## Flujo 16 — Ver distribución de una carga

- **Actor**: VIEWER, OPERATOR, ADMIN (consulta; BR-040).
- **Trigger**: una carga ocupa N ubicaciones (relación M:N, BR-032) y se necesitan ubicaciones, cantidades, porcentajes e ingreso/salida por segmento.
- **Pasos**:
  1. Desde el detalle de la carga: sección "Distribución" (o desde el mapa, click en la carga → "Ver distribución").
  2. Se consulta `GET /api/v1/cargos/:id/locations` (MASTER-SPEC §10); responde los segmentos `CargoLocation`: ubicación, cantidad, unidad, porcentaje, estado (ACTIVE/EXITED), `enteredAt`/`exitedAt`.
  3. La UI muestra: tabla de segmentos (ubicación, cantidad/unidad, %, estado, ingreso/salida), total distribuido vs total de la carga y residual en camión si existe (`inTruckAmount`/`inTruckUnit`, provisto por el backend: `totalQuantity − Σ CargoLocation activos` — BR-038/042; el camión NO es una ubicación, la fila es informativa, nunca un nodo de mapa).
  4. Orden/filtros por ubicación, estado o fechas; click en un segmento → movimientos de ese segmento (flujo 12 filtrado); click en una ubicación → detalle de ubicación (flujo 17 / SCREENS pantalla 14).
- **Puntos de decisión**: mostrar `percentage` (OQ-045 → BR-049 resuelta: derivado de UI, input solo si PERCENT) → DP-UF-10; presentación del residual (resuelto: fila "En camión" informativa — BR-042).
- **Validaciones**: BR-009 (permisos), BR-034 (suma de segmentos ≤ total), BR-035 (comparación solo en unidad compatible), BR-040, BR-042 (el residual lo expone el backend; la UI no lo calcula).
- **Estados de pantalla**: `loading` (skeleton de tabla), `empty` ("La carga no está distribuida" + CTA asignar/descargar según rol), `error` (retry con requestId), `results`.
- **Errores y recovery**: 404 carga inexistente → mensaje + volver; unidades mezcladas en la vista → nota "no comparable en una sola unidad" (BR-035).
- **Criterios de éxito**: el usuario ve todas las ubicaciones de la carga con cantidad, %, estado y fechas de ingreso/salida, y navega al historial o al detalle de ubicación desde cualquier segmento.

## Flujo 17 — Ver ocupación de una ubicación

- **Actor**: VIEWER, OPERATOR, ADMIN.
- **Trigger**: necesidad de conocer la capacidad de una ubicación, su ocupación, las cargas contenidas y sus señales (alerta / próximas a 30 días).
- **Pasos**:
  1. Desde el mapa (click en ubicación → "Ver detalle" desde `LocationCard`) o desde el listado de ubicaciones.
  2. Se consultan `GET /api/v1/locations/:id/capacity` y `GET /api/v1/locations/:id/cargos` (MASTER-SPEC §10).
  3. La UI muestra: header (nombre, código, tipo, estado), `CapacityIndicator` (capacidad, ocupada, disponible, % — en la **unidad efectiva** de la ubicación: por defecto según `LocationType` con override por ubicación, BR-041), tabla de cargas con su segmento (cantidad, %, estado del segmento, alerta) y las señales: cargas con alerta OPEN y cargas **próximas a 30 días** (BR-014/015 — OQ-008 resuelta; ventana previa al umbral 🔶 residual local → DP-UF-14).
  4. Click en carga → detalle de carga/distribución (flujo 16); movimientos recientes de la ubicación (timeline corta, flujo 12 con filtro por ubicación).
  5. Acciones según rol: mover desde la ubicación (flujos 5/18), asignar carga (flujo 20) si hay disponibilidad.
- **Puntos de decisión**: qué significa "próximas a 30 días" (ventana previa al umbral → 🔶 residual local DP-UF-14; alerta 30/40 resuelta OQ-008 → BR-014/015); umbrales visuales de ocupación (OQ-046 → DP-UF-02 resuelta); sobreocupación si la hay (BR-036 → DP-UF-11 resuelta: solo ADMIN):
- **Validaciones**: BR-004 (ubicación activa para operar), BR-005, BR-009, BR-033 (ocupación = Σ de segmentos activos en unidad compatible), BR-035, BR-040.
- **Estados de pantalla**: `loading`, `empty` ("Ubicación sin cargas" + capacidad disponible completa), `error`, `results`.
- **Errores y recovery**: ubicación inactiva → banner "no admite movimientos" (BR-004) y operaciones ocultas; 404 → mensaje + volver.
- **Criterios de éxito**: el usuario ve capacidad/ocupada/disponible (%), las cargas contenidas con su segmento y las señales de alerta/próximas a 30 días; navega al detalle desde cualquier fila.

## Flujo 18 — Movimiento parcial de una carga entre ubicaciones

- **Actor**: OPERATOR, ADMIN.
- **Trigger**: solo una parte de la mercadería de una carga se traslada de una ubicación a otra (BR-037: mover NO equivale al 100 %).
- **Pasos**:
  1. Desde el detalle → "Distribución" → segmento origen → "Mover parcialmente"; o desde el mapa con la carga seleccionada (misma validación; el drag & drop NO se implementa en v1 — OQ-024 resuelta).
  2. Elegir origen (segmento `CargoLocation` ACTIVE) y destino (ubicación ACTIVE con disponibilidad).
  3. Ingresar **cantidad o porcentaje** a mover (≤ cantidad del segmento origen; BR-034); validación en vivo: capacidad del destino (BR-005), unidad compatible (BR-035; sin conversión en v1 — OQ-044 → BR-048) y `totalQuantity`/`totalUnit` de la carga presentes (BR-042; `CARGO_TOTAL_REQUIRED` 422 si faltan).
  4. `ObservationDialog` obligatorio con el motivo del movimiento parcial (BR-006).
  5. Confirmar → `POST /api/v1/cargos/:id/movements` (o el contrato de CargoLocation, §10): el backend decrementa el origen, crea/incrementa el segmento destino e inserta el `Movement` con las cantidades en metadata; la transición se valida en backend (BR-016).
  6. Historial (flujo 12) registra el movimiento parcial; mapa y capacidad de origen/destino se actualizan (BR-008/033).
- **Puntos de decisión**: cantidad vs porcentaje como entrada (OQ-045 → BR-049 resuelta: input solo si unidad PERCENT; si no, cantidad → % derivado); unidades compatibles sin conversión (OQ-044 → BR-048); si el destino no tiene segmento aún, se crea (BR-039).
- **Validaciones**: BR-004, BR-005, BR-006, BR-008, BR-016, BR-034, BR-035, BR-037, BR-039, BR-042 (la distribución parcial exige `totalQuantity`/`totalUnit`; el residual lo calcula el backend).
- **Estados de pantalla**: `selecting-segment`, `entering-quantity` (con % equivalente), `observing`, `confirming`, `success`, `error`.
- **Errores y recovery**: cantidad > disponible en origen → mensaje de validación; destino sin capacidad → "Sector 4: 8/10 unidades" (BR-005); unidades incompatibles → la UI lo bloquea con explicación (BR-035; sin conversión en v1 — OQ-044 → BR-048).
- **Criterios de éxito**: el origen decrece, el destino crece (segmento creado/actualizado), el historial muestra el movimiento con observación y cantidades, y la capacidad de ambas ubicaciones queda consistente.

## Flujo 19 — Descarga parcial desde camión hacia ubicaciones

- **Actor**: OPERATOR, ADMIN.
- **Trigger**: la carga llega en camión (`IN_TRUCK`) y solo una parte se descarga hacia una ubicación; el resto permanece en el camión (§67, BR-038).
- **Pasos**:
  1. Desde el detalle de la carga (o el mapa): acción "Descargar parcialmente".
  2. La UI muestra el total de la carga y el **residual en camión** (`inTruckAmount`/`inTruckUnit`, provisto por el backend: `totalQuantity − Σ CargoLocation activos` — BR-038/042; el camión NO es una ubicación).
  3. Elegir destino (ubicación ACTIVE) y cantidad/porcentaje a descargar (≤ residual en camión; BR-034).
  4. Validación en vivo: capacidad del destino (BR-005) y unidad compatible (BR-035; OQ-044 → BR-048: sin conversión).
  5. `ObservationDialog` obligatorio (BR-006).
  6. Confirmar → `UNLOAD` parcial: se crea/actualiza el segmento destino; el residual del camión decrece; si llega a cero → `STORED`; si queda → `PARTIALLY_UNLOADED` (MASTER-SPEC §7).
  7. Historial y mapa actualizados (BR-008/039).
- **Puntos de decisión**: presentación del residual (resuelto: fila informativa "En camión", nunca nodo de mapa — BR-042); estado resultante automático vs pedido explícito; unidades compatibles (OQ-044 → BR-048: sin conversión).
- **Validaciones**: BR-005, BR-006, BR-008, BR-016 (IN_TRUCK → PARTIALLY_UNLOADED/STORED), BR-034, BR-038, BR-039, BR-042 (residual derivado por el backend; la descarga parcial exige `totalQuantity`/`totalUnit` — `CARGO_TOTAL_REQUIRED` 422).
- **Estados de pantalla**: `residual-summary`, `entering-quantity`, `observing`, `confirming`, `success`, `error`.
- **Errores y recovery**: descargar más que el residual → mensaje con el residual disponible; destino sin capacidad → mensaje con ocupación; observación vacía → confirmación deshabilitada; 422 `CARGO_TOTAL_REQUIRED` → "registrá la cantidad total de la carga" + CTA al campo total del detalle.
- **Criterios de éxito**: el residual decrece correctamente, el segmento destino queda activo con su cantidad, el estado de la carga refleja el residual y el movimiento queda historizado con observación.

## Flujo 20 — Alta / ajuste / egreso de un segmento CargoLocation

- **Actor**: OPERATOR, ADMIN.
- **Trigger**: gestión directa de la distribución de una carga: asignarla a una ubicación (alta), corregir su cantidad (ajuste) o retirarla de la ubicación (egreso) — BR-039.
- **Pasos**:
  1. Desde el detalle de la carga → "Distribución" → acción según caso: "Asignar a ubicación" (alta), "Ajustar cantidad" (update) o "Egresar".
  2. **Alta**: elegir ubicación ACTIVE y cantidad (unidad; se sugiere la unidad por defecto del tipo de ubicación, con override — BR-041); valida capacidad del destino (BR-005), suma de segmentos ≤ total (BR-034) y presencia de `totalQuantity`/`totalUnit` si la distribución es parcial (BR-042; `CARGO_TOTAL_REQUIRED` 422).
  3. **Ajuste**: nueva cantidad (crece → valida capacidad; decrece → no menor a 0); si el ajuste no cambia nada, el botón se deshabilita.
  4. **Egreso**: `ConfirmDialog` ("la carga deja esta ubicación; la operación queda historiada"); si es el último segmento ACTIVE, se advierte la situación resultante (carga sin ubicación / egreso del predio — OQ-004 → BR-043: EXITED con observación).
  5. `ObservationDialog` obligatorio en los tres casos (BR-006/039).
  6. Confirmar → `POST | PATCH | DELETE /api/v1/cargos/:id/locations[/:cargoLocationId]` (MASTER-SPEC §10): cada operación genera `Movement` + historial (BR-008/039) y actualiza la ocupación de la ubicación.
- **Puntos de decisión**: el egreso del último segmento equivale a egreso del predio EXITED (OQ-004 → BR-043 resuelta); `percentage` al cargar cantidad (OQ-045 → BR-049 resuelta: derivado; input solo PERCENT).
- **Validaciones**: BR-003, BR-004, BR-005, BR-006, BR-008, BR-016, BR-034, BR-039, BR-041 (unidad por defecto/override al crear), BR-042 (distribución parcial exige `totalQuantity`/`totalUnit` — `CARGO_TOTAL_REQUIRED` 422).
- **Estados de pantalla**: `editing-segment`, `observing`, `confirming`, `success`, `error` (capacidad / suma de segmentos).
- **Errores y recovery**: exceder el total de la carga → "La distribución supera el total de la carga"; exceder capacidad → mensaje con ocupación (o flujo 21 si la sobreocupación administrativa está habilitada); 422 `CARGO_TOTAL_REQUIRED` → "registrá la cantidad total de la carga" + CTA; 403 → acción oculta/deshabilitada.
- **Criterios de éxito**: alta/ajuste/egreso generan movimiento e historial con observación; distribución y capacidad quedan consistentes (BR-034/039).

## Flujo 21 — Manejo de alerta de capacidad

- **Actor**: sistema (cálculo/generación) + OPERATOR/ADMIN (revisión); la autorización de sobreocupación es administrativa (BR-036 → OQ-043 → BR-036 ampliada: solo ADMIN, +10% default, observación y auditoría).
- **Trigger**: la ocupación derivada de una ubicación supera el umbral configurado (p. ej. 90 %, MASTER-SPEC §9) o una operación intenta superar la capacidad (BR-005).
- **Pasos**:
  1. El sistema calcula la ocupación = Σ de segmentos `CargoLocation` activos en unidad compatible (BR-033/035).
  2. Al superar el umbral → alerta `CAPACITY` `OPEN` (AlertType, MASTER-SPEC §4.3) visible en Dashboard y en el detalle de la ubicación (flujo 17).
  3. El usuario revisa: ocupación, cargas que aportan, movimientos recientes de la ubicación.
  4. Si la operación excede la capacidad y la ubicación corresponde: solo ADMIN puede autorizar sobreocupación (BR-036): flag `allowOverOccupation` + límite configurable **default +10%** (OQ-043 → BR-036 ampliada) + observación obligatoria + auditoría `CAPACITY_CHANGE`.
  5. Reconocer la alerta (ACKNOWLEDGED) o resolverla al liberar capacidad (RESOLVED).
- **Puntos de decisión**: umbral por defecto (90 %) y su configuración/umbrales visuales (OQ-046 resuelta: <70/70–90/>90); rol autorizante y límite extra (OQ-043 → BR-036 ampliada: solo ADMIN, +10% default); generación **en vivo** en v1 (OQ-031 resuelta).
- **Validaciones**: BR-005 (sin flag), BR-006 (observación en la autorización), BR-009, BR-011/012 (solo ADMIN para el flag), BR-033, BR-035, BR-036.
- **Estados de pantalla**: `alert-card` (Dashboard/detalle de ubicación), `reviewing` (ocupación + cargas), `authorizing` (solo ADMIN: flag + límite + observación), `resolved`.
- **Errores y recovery**: intento sin permiso → 403; sobreocupación sin observación → rechazada; la UI nunca habilita exceder capacidad sin el flag (BR-005/036).
- **Criterios de éxito**: la alerta refleja la ocupación real de la ubicación; la sobreocupación solo ocurre por regla administrativa explícita, con observación y auditoría; sin flag, el backend rechaza (BR-005).

---

## Decisiones de este documento
- D-UF-01: Los 15 flujos operativos + login + dashboard cubren la FASE 0 de UX; el egreso/retiro (`EXITED`) se modela como flujo propio (OQ-004 → BR-043 resuelta: egreso con `EXIT` + observación, `EXITED` terminal).
- D-UF-02: Todo flujo con movimiento/estado incluye la observación obligatoria como paso explícito de UI (BR-006/007). Ningún diálogo de confirmación omite este paso.
- D-UF-03: El mapa operativo es el punto de entrada preferido para los flujos 3/5/6/7 (ubicación y movimiento), y el listado es la alternativa accesible (MASTER-SPEC §12).
- D-UF-04: Los flujos 1–7 y 9, 11–13 están habilitados para OPERATOR (y ADMIN); los flujos 14–15 y 10 (propuesta) son ADMIN. Esto se alinea con BR-010/011/012 y se ajustará cuando se definan los permisos finos (`Permission`).
- D-UF-05: El estado `IN_TRANSIT` se usa para el período entre confirmación y aterrizaje del movimiento; la UI lo muestra como "en movimiento" en el mapa (`MAP-UX.md`).
- D-UF-06: Los flujos 16–21 documentan la ampliación §§62-70 (distribución M:N): toda operación sobre un segmento `CargoLocation` (alta/ajuste/egreso, movimiento parcial, descarga parcial) genera movimiento + historial con observación obligatoria (BR-006/008/039); la suma de segmentos nunca supera el total de la carga (BR-034). La unidad por defecto de capacidad es configuración por tipo de ubicación con override (BR-041) y el residual "en camión" es derivado del backend (BR-042): la UI solo formatea, nunca calcula ni modela el camión como ubicación.
- D-UF-07: La sobreocupación solo se habilita por regla administrativa explícita (BR-036): la UI nunca ofrece exceder capacidad sin el flag `allowOverOccupation`, y la autorización queda definida en OQ-043 → BR-036 ampliada (solo ADMIN, +10% default, observación y auditoría).

## Criterios de aceptación
1. Cada flujo 0–21 tiene actor, trigger, pasos, decisiones, BR, estados, errores/recovery y criterios de éxito completos (verificado arriba); los flujos 16–21 respetan BR-032…BR-042 (MASTER-SPEC v0.3).
2. Las transiciones de estado citadas son coherentes con la máquina de estados del MASTER-SPEC §7.
3. Todos los roles citados son consistentes con MASTER-SPEC §8 (VIEWER/OPERATOR/ADMIN).
4. Ninguna regla de negocio nueva se inventó; toda ambigüedad figura en `DECISIÓN PENDIENTE` y se reporta al orquestador para `OPEN-QUESTIONS.md`.
5. Los IDs y términos (MovementKind, CargoStatus, AlertType, LocationType) usan los enums canónicos del MASTER-SPEC §4.3.

## Archivos involucrados
- Este documento: `docs/ux/USER-FLOWS.md`.
- Fuente: `docs/MASTER-SPEC.md`, `docs/OPEN-QUESTIONS.md`.
- Futuros (grupos W2/W4/W5/W7): `frontend/COMPONENTS.md`, `frontend/ROUTING.md`, `backend/API.md`, `backend/VALIDATION.md`, `architecture/PDF-EXPORT.md`, `architecture/MAP-ENGINE.md`, `brand/MAP-VISUAL-GUIDELINES.md`, `qa/TEST-CASES.md`, `qa/E2E-SCENARIOS.md`.

## Riesgos
- R-UF-01: ~~OQ-004 (egreso/retiro) sin resolver~~ → **resuelta (2026-09-23, BR-043)**: el flujo de salida se documenta como flujo propio y el diseño de UI del egreso queda cerrado.
- R-UF-02: ~~OQ-001/009/014 (código, capacidad) sin resolver~~ → **resueltas (2026-09-23/24)**: validaciones de formulario y cálculo de ocupación en mapa/dashboard quedan con regla canónica (BR-002; BR-041 + OQ-014: Plazoleta en UNITS).
- R-UF-03: La doble confirmación de secuestro puede agregar fricción en operaciones legales urgentes; mitigación: confirmación única para flujo 9 y doble para 10.
- R-UF-04: El editor de planos se pospone (OQ-015 resuelta: vista estática en v1) → el flujo 14 queda como especificación de futuro sin implementación en v1 (riesgo confirmado y asumido).
- R-UF-05: La reversión encadenada (DP-UF-09) sin política definida puede dejar una carga en estado inconsistente; mitigación: validación de reversibilidad en backend antes de permitir la acción.
- R-UF-06: El residual "en camión" (BR-042, ex OQ-042) depende del contrato del backend: si los responses de carga no exponen `inTruckAmount`/`inTruckUnit`, la fila residual de los flujos 16/19 no puede renderizarse (el frontend NO lo deriva) → coordinar con W5 en la revisión del contrato.
- R-UF-07: OQ-045 **resuelta** (→ BR-049: `percentage` derivado de UI, informativo; input solo si unidad PERCENT) → los % de los flujos 16/18/20 son derivados; sin doble fuente de verdad.
- R-UF-08: OQ-043 **resuelta** (→ BR-036 ampliada: solo ADMIN, +10% default, observación y auditoría) → el flujo 21 queda implementable: la UI del detalle de ubicación habilita la autorización solo para ADMIN.

## DECISIÓN PENDIENTE
| ID | Pregunta | Impacto | Relación |
| --- | --- | --- | --- |
| DP-UF-01 | ¿Se incluye recuperación de contraseña (flow de restore) en v1, o solo enlace con mensaje "contactar al administrador"? | Login, Configuración | 🔶 Residual local (OQ — nueva; sin decisión de negocio) |
| DP-UF-02 | ~~¿Qué criterio/algoritmo de ocupación derivada y qué umbrales visuales "parcial/lleno" del mapa?~~ → **RESUELTA (OQ-046 y OQ-044, 2026-09-24)**: ocupación = Σ segmentos ACTIVE en unidad compatible (BR-033); umbrales canónicos **normal <70% · warning 70–90% · danger >90%**; sin conversión de unidades en v1 | Dashboard, flujos 5/17, mapa | OQ-044 / OQ-046 (resueltas) |
| DP-UF-03 | ¿Scanner/Balanza usan `MovementKind` propio (`TO_SCANNER`/`TO_BALANZA`) o un `MOVE` con razón tipada? | Historial, filtros, API | 🔶 Residual local (MASTER-SPEC §4.3; sin OQ asociada) |
| DP-UF-04 | ~~¿El paso a Secuestro (flujo 10) es exclusivo de ADMIN, o OPERATOR puede ejecutarlo con confirmación?~~ → **RESUELTA (OQ-030 → BR-046, 2026-09-23)**: **solo ADMIN** (`cargo.to_secuestro`); OPERATOR con confirmación NO | RBAC, UI de botones | OQ-030 → BR-046 (resuelta) |
| DP-UF-05 | ~~¿Qué validación exacta tiene el campo código de carga en UI?~~ → **RESUELTA (OQ-001 → BR-002, 2026-09-23)**: regex `^[A-Z0-9][A-Z0-9./-]{2,31}$`, normalizado a mayúsculas, único case-insensitive, longitud 3–32 (máscara + unicidad en vivo) | Formulario registro | OQ-001 → BR-002 (resuelta) |
| DP-UF-06 | ~~¿Formato/unicidad de patente de camión y política de multi-carga/multi-cliente por camión?~~ → **RESUELTA (ID-009 + OQ-003, 2026-09-23/24)**: patente **obligatoria** formato MERCOSUR (`^[A-Z]{2,3}\d{2}[A-Z0-9]$`); una carga = **UN camión a la vez**; un camión puede transportar N cargas, de clientes distintos o iguales | Flujo 2 | ID-009 / OQ-003 (resueltas) |
| DP-UF-07 | ~~¿El PDF se genera síncrono o encolado?~~ → **RESUELTA (OQ-005 → ADR-013, 2026-09-24)**: **generación asíncrona por job** (HTML→PDF con Chromium/Puppeteer); "qué alcances permite la UI" (blob vs visor) = 🔶 residual local de presentación | Flujo 13, estados del botón | OQ-005 → ADR-013 (resuelta) |
| DP-UF-08 | ~~¿Editor de planos disponible en v1 (fase 11) o el plano es estático hasta entonces?~~ → **RESUELTA (OQ-015, 2026-09-24)**: mapa = **vista estática en v1** (lectura + selección + hover); editor visual diferido — borrador vs publicación versionada queda sin efecto en v1 (datos por seed/configuración) | Flujo 14, MAP-UX | OQ-015 (resuelta) |
| DP-UF-09 | ¿Política de reversión encadenada (revertir movimientos que sucedieron después del revertido)? | Flujo 15, consistencia | 🔶 Residual local (OQ — nueva; sin decisión de negocio) |
| DP-UF-10 | ~~¿El porcentaje de distribución (`percentage`, CargoLocation) se almacena como valor canónico o se deriva en UI?~~ → **RESUELTA (OQ-045 → BR-049, 2026-09-24)**: `quantity`+`quantityUnit` = fuente de verdad; `percentage` **derivado de UI** e informativo (solo input cuando unidad `PERCENT`) | Flujos 16/18/20, DTOs | OQ-045 → BR-049 (resuelta) |
| DP-UF-11 | ~~¿Sobreocupación administrativa (BR-036): flag, límite de % extra, rol autorizante y observación/auditoría?~~ → **RESUELTA (OQ-043 → BR-036 ampliada, 2026-09-24)**: flag `allowOverOccupation` por ubicación, límite configurable **default +10%**, autorización **solo ADMIN**, observación obligatoria + auditoría `CAPACITY_CHANGE` | Flujo 21, RBAC, auditoría | OQ-043 → BR-036 (resuelta) |
| DP-UF-12 | ~~¿El camión se modela como ubicación (LocationType CAMION) o la fracción "en camión" (§67) es un residual derivado = totalQuantity − Σ segmentos activos?~~ **RESUELTA por OQ-042 → BR-042** (MASTER-SPEC v0.3): el camión NO es una ubicación; "en camión" = `inTruckAmount`/`inTruckUnit` derivado por el backend; la UI lo muestra como fila informativa del panel, nunca como nodo de mapa. | Flujos 16/19, mapa | OQ-042 → BR-042 |
| DP-UF-13 | ~~¿Conversión de unidades en movimientos parciales?~~ → **RESUELTA (OQ-044 → BR-048, 2026-09-24)**: **sin conversión en v1** — unidades compatibles (misma unidad o `PERCENT`); `UNIT_INCOMPATIBLE` 422 | Flujos 18/19, validaciones | OQ-044 → BR-048 (resuelta) |
| DP-UF-14 | ~~¿Qué ventana define "cargas próximas a 30 días" en la ocupación de una ubicación y es configurable?~~ → **RESUELTA (OQ-008 → BR-014/015, 2026-09-23)**: base = `entryDate`, días **corridos**, alerta a los **30 días** y segunda a los **40** (configurables); la ventana previa al umbral (p. ej. 5 días) = 🔶 residual local de UI | Flujo 17, SCREENS 14 | OQ-008 → BR-014/015 (resuelta) |
| DP-UF-15 | ~~¿El egreso del último segmento ACTIVE de una carga equivale a egreso del predio (EXITED)?~~ → **RESUELTA (OQ-004 → BR-043, 2026-09-23)**: **sí** — movimiento `EXIT` con observación obligatoria (remito/documentación opcionales), `EXITED` terminal | Flujo 20, máquina de estados | OQ-004 → BR-043 (resuelta) |