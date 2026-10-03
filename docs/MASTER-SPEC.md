# CargoOps — Especificación Maestra (MASTER-SPEC)

> **Fuente de verdad canónica** para la FASE 0 (documentación) del proyecto CargoOps.
> Todo documento del repositorio `cargoops-docs` debe ser coherente con este archivo.
> Origen: "PROMPT MAESTRO — FASE 1: DOCUMENTATION FIRST" (61 secciones), descripción textual de la referencia visual del predio, y decisiones de diseño adoptadas/acumuladas en este documento.
> Regla de oro: **no inventar reglas de negocio**. Toda ambigüedad real se documenta como DECISIÓN PENDIENTE y se centraliza en `OPEN-QUESTIONS.md`.

---

## 0. Estado del documento
- Versión: 0.1 — 2026-09-23 · **0.2 — 2026-09-23 (ampliación §§62-70: distribución M:N de cargas y ubicaciones)** · **0.3 — 2026-09-23 (resolución OQ-041/OQ-042: unidades por defecto + camión como residual)** · **0.4 — 2026-09-23 (resolución OQ 🔴: OQ-001/004/008/017/018/022/025/029/030 + ID-009)** · **0.5 — 2026-09-24 (resolución completa de OQ 🟡/🟢: OQ-003/005/006/007/009/010/011/012/013/014/015/016/019/020/021/023/024/026/027/028/031/032/033/034/035/036/043/044/045/046/047 — no quedan OQ abiertas)**
- Autor: Orquestador CargoOps (sesión OpenCode — Big Pickle / Gentle Orchestrator)
- Estado: Borrador canónico + ampliación de modelo (CargoLocation, capacidad por unidad, movimientos parciales) + **decisiones completas de negocio/técnica para FASE 1**. Los ADR consolidan decisiones. `OPEN-QUESTIONS.md` registra el cierre de todas las OQ.
- Proceso: la documentación de detalle se genera por grupos independientes, todos leen este archivo como fuente de verdad y reportan pendientes que el orquestador agrega.
- Cambio 0.2: las secciones 62-70 del prompt maestro establecen que la relación Cargo↔Location es **MANY-TO-MANY** (entidad intermedia `CargoLocation`), capacidad de ubicaciones por unidad (no booleano ocupado), distribución de una carga entre N ubicaciones, movimientos parciales, descarga parcial y reglas de consistencia. Este documento y todos los grupos se actualizan en consecuencia.
- Cambio 0.3 (decisiones del negocio): **OQ-041** — unidad de capacidad por defecto por LocationType + override por ubicación (gobernanza ADMIN); **OQ-042** — el camión NO es una Location, "en camión" es residual derivado (`totalQuantity − Σ CargoLocation activos`). Se formalizan como BR-041 y BR-042.
- Cambio 0.4 (resolución de OQ bloqueantes, 2026-09-23): **OQ-001** — código de carga canónico `^[A-Z0-9][A-Z0-9./-]{2,31}$`, normalizado a mayúsculas, único case-insensitive (formalizado en BR-002); **OQ-004** — egreso/retiro completo en v1 (BR-043); **OQ-008** — alertas de permanencia: 30 días corridos desde `entryDate` + segunda alerta a los 40 (BR-014/015); **OQ-017** — exportación PDF por **POST** (BR-018/API §10); **OQ-018** — catálogo de permisos canónico = ADR-009 (BR-009); **OQ-022** — observación obligatoria siempre, incluso en el alta (BR-006); **OQ-025** — matriz estricta estado × tipo de ubicación (BR-044); **OQ-029** — matriz de transiciones §4.4.3 confirmada íntegramente (BR-045); **OQ-030** — TO_REZAGO ADMIN+OPERATOR, TO_SECUESTRO solo ADMIN (BR-046); **ID-009** — BR-029 (patente obligatoria con formato MERCOSUR) promovida a canónica.
- Cambio 0.5 (resolución completa de OQ, 2026-09-24): **OQ-005** — PDF con Puppeteer/Chromium HTML→PDF (ADR-013 Accepted); **OQ-006** — S3 MinIO self-hosted; **OQ-007** — Redis + BullMQ en v1 (ADR-012 Accepted); **OQ-010** — PWA mínima + SSR diferido; **OQ-011/023** — notificaciones in-app v1 (triggers/roles/plantillas); **OQ-012/034** — UI es-AR con i18n listo, sin conmutador runtime; **OQ-013** — flujos núcleo primero; **OQ-014** — sectores m² + Plazoleta en camiones (BR-041/BR-048); **OQ-015/028** — mapa estático v1 + propiedades editables por formularios ADMIN; **OQ-016** — RPO ≤15 min / RTO ≤4 h; **OQ-019** — OPERATOR ve solo sus propios eventos de auditoría; **OQ-020** — presupuestos de performance provisionales a validar; **OQ-021** — AuditAction UPDATE genérico para alertas; **OQ-024** — sin drag&drop en v1; **OQ-026** — AlertStatus: OPEN→ACK y ACK→RESOLVED ADMIN+OPERATOR, DISMISSED solo ADMIN; **OQ-027** — código inmutable post-registro (BR-047); **OQ-031** — dashboard en vivo con fórmulas (BR-051); **OQ-032** — movimientos online con Idempotency-Key (BR-052); **OQ-033** — sin landing pública; **OQ-035** — detalle de movimiento por ruta hija; **OQ-036** — polling TTL ~30 s; **OQ-043** — sobreocupación solo ADMIN +10% (BR-036 ampliada); **OQ-044** — sin conversión de unidades en v1; **OQ-045** — `percentage` derivado salvo PERCENT (BR-049); **OQ-046** — umbrales mapa 70/90 canónicos; **OQ-047** — listado de ubicaciones en v1; **OQ-003/009** — 1 carga → 1 camión (BR-050) y capacidad/ocupación cerradas.

---

## 1. Propósito, visión y alcance

### 1.1 Visión
CargoOps es una **plataforma web profesional de gestión operativa de cargas y depósitos** dentro de un **predio logístico/aduanero**. Permite registrar y controlar carga, camiones, descargas, ubicación física de mercadería, plazoleta, sectores de depósito, áreas especiales y el historial completo de movimientos, con **trazabilidad total** y **alertas operativas**.

### 1.2 Alcance de la FASE 0
- Producir documentación técnica, funcional, arquitectónica, UX/UI, de infraestructura, seguridad, QA y producto, **extremadamente detallada**.
- Crear la estructura `cargoops-docs/` con ~60+ documentos Markdown.
- Definir decisiones canónicas, ADRs, dominio, API, roadmap, backlog y Definition of Done.
- La documentación será consumida por agentes de código (OpenCode + Big Pickle + Gentle-Orchestrator) para implementar por etapas.

### 1.3 Fuera de alcance de la FASE 0
- Implementación del frontend o backend.
- Código de producción, modelos, migraciones, Dockerfiles reales, pipelines reales.
- Instalación de dependencias, creación de repositorios git o despliegues.
- Funcionalidades completas.

### 1.4 Capacidades del producto (core)
Registrar cargas · registrar camiones · controlar carga en camión · registrar descargas · ubicar cargas en el predio · gestionar plazoleta · gestionar sectores · gestionar áreas especiales (Scanner, Balanza, Rezago, Secuestro) · visualizar estado operativo sobre un plano configurable · mover cargas entre ubicaciones · historial completo de movimientos · observaciones obligatorias · permanencia y alertas de rezago (30 días) · administrar planos y sectores · consultas operacionales · exportación PDF · trazabilidad.

### 1.5 Crecimiento futuro (diseñar, NO implementar)
Más depósitos, predios, sucursales; usuarios/permisos; vehículos; documentación/fotografías/escaneo; QR/barcodes/lectores; reportes/estadísticas; móvil; integraciones/APIs; notificaciones; inteligencia operacional; multi-tenant. La arquitectura debe habilitarlo sin reescribir (ver `SCALABILITY.md`).

---

## 2. Glosario
| Término | Definición |
| --- | --- |
| Carga | Unidad operativa de mercadería ingresada al predio; identificada por un código alfanumérico (string). |
| Camión (Truck) | Vehículo que transporta una o varias cargas. |
| Plazoleta | Zona gris (izquierda en la referencia) donde la carga permanece en el camión. |
| Galpón / Depósito | Zona amarilla (derecha en la referencia) que contiene los sectores. |
| Sector | Subdivisión del depósito con capacidad propia (Sectores 1–12). |
| Áreas especiales | Scanner, Balanza, Rezago, Secuestro. |
| Ubicación (Location) | Abstracción de cualquier espacio físico del predio (plazoleta, sector, área especial, galpón). |
| Movimiento (Movement) | Registro temporal de todo cambio de ubicación y/o estado de una carga. |
| Observación | Texto obligatorio (motivo/descripción) asociado a un movimiento o a una carga. |
| Alerta | Señal operativa generada por reglas (p. ej. permanencia > 30 días). |
| Plano / Mapa | Representación estructurada y editable del layout del predio. |
| Predio | Complejo logístico/aduanero donde opera CargoOps. |
| Permanencia | Antigüedad de la carga dentro del predio (por defecto calculada desde la fecha de ingreso). |
| Rezago | Área/estado para cargas con permanencia excesiva o pendientes de revisión. |

---

## 3. Referencia visual del predio (conceptual)
- **Zona gris izquierda**: PLAZOLETA.
- **Zona amarilla derecha**: GALPÓN / DEPÓSITO con sectores **1 a 12**.
- **Áreas especiales**: Scanner, Balanza, Rezago, Secuestro (dentro o adyacentes al layout, a definir en el editor de planos).
- La representación NO es una imagen estática: el **layout es configurable y editable** (cada espacio tiene nombre, código, tipo, posición, ancho, alto, superficie, capacidad, unidad, color, estado, descripción, propiedades adicionales).
- Nota: la imagen de referencia no está presente en el workspace actual; la descripción textual es la fuente para la fase de documentación.

---

## 4. Modelo de dominio canónico (v1)

### 4.1 Entidades y campos clave
| Entidad | Campos clave (canónicos) |
| --- | --- |
| User | id, username, email, passwordHash, name, active, lastLoginAt, createdAt, updatedAt, deletedAt (soft), roles[] |
| Role | id, code (VIEWER \| OPERATOR \| ADMIN), name, description |
| Permission | id, code (p. ej. cargo.create), description |
| RolePermission | roleId, permissionId, granted |
| Truck | id, plate (**obligatorio, formato MERCOSUR — BR-029**, ej. AB123CD / AB1234C), brand, model, driverName?, createdAt, updatedAt, deletedAt (soft) |
| Cargo | id, code (**canónico OQ-001/BR-002**: regex `^[A-Z0-9][A-Z0-9./-]{2,31}$`, normalizado a mayúsculas, único case-insensitive), name/description, status (CargoStatus), totalQuantity? (decimal), totalUnit? (QuantityUnit — total de la carga para validar distribución), truckId?, entryDate (fecha ingreso al predio), estimatedExpiryDate?, createdById, lastMovedById, alerts[], deletedAt (soft), metadata JSONB — **sin `locationId` único: la relación de ubicación es M:N vía CargoLocation** (secciones 62-70) |
| CargoLocation | id, cargoId, locationId, quantity (decimal), quantityUnit (QuantityUnit), percentage? (0-100 — **derivado de UI salvo unidad PERCENT, ver OQ-045/BR-049**), occupiedArea? (solo cuando la unidad no sea AREA; usa quantity+quantityUnit como canónico), enteredAt, exitedAt?, status (CargoLocationStatus), notes?, createdAt, updatedAt |
| Location | id, name, code, type (LocationType), status (ACTIVE \| INACTIVE \| MAINTENANCE), capacity (decimal), capacityUnit (QuantityUnit), occupiedCapacity (derivado = suma de CargoLocation activos en unidad compatible), availableCapacity (derivado), allowOverOccupation (bool, flag administrativo **solo ADMIN, límite +10% por defecto — OQ-043/BR-036**), x, y, width, height, rotation?, color?, description, properties JSONB |
| Map | id, name, code, type (PREDIO), width, height, gridSize, status, version, createdBy, updatedAt |
| MapElement | id, mapId, locationId?, elementType, x, y, width, height, rotation, zIndex, fill, stroke, labelPosition, properties JSONB |
| Movement | id, cargoId, fromLocationId?, toLocationId, fromStatus?, toStatus, userId, movedAt, reason (motivo), observationId (observación obligatoria 1:1), metadata JSONB, reversionOfId?, reversedById?, reversedAt? |
| Observation | id, movementId? (1:1, obligatoria en movimientos), cargoId? (notas sin movimiento), text, userId, createdAt |
| Alert | id, cargoId, type (STALE_30D \| CAPACITY \| CUSTOM), status (OPEN \| ACKNOWLEDGED \| RESOLVED \| DISMISSED), severity (**AlertSeverity** — ver enums §4.3), dueAt, createdAt, resolvedAt?, metadata JSONB |
| Notification | id, userId, type, channel (IN_APP \| FUTURO: EMAIL/PUSH/WHATSAPP/WEBHOOK), title, body, data JSONB, readAt, createdAt |
| AuditLog | id, userId, action (AuditAction), entity, entityId, timestamp, previousValue JSONB, newValue JSONB, metadata JSONB, ip, userAgent |

### 4.2 Relaciones clave
- User N:M Role (via UserRole o roles[]) ; Role N:M Permission.
- **Cargo N:M Location (vía CargoLocation)** — secciones 62-70: una carga puede ocupar simultáneamente N ubicaciones (sectores, plazoleta, scanner, balanza, etc.); una ubicación puede contener N cargas. NO usar `cargo.locationId` como única relación.
- Cargo N:1 Truck (opcional; **una carga se asocia a UN camión a la vez — OQ-003/BR-050**); Cargo 1:N Movement; Cargo 1:N Alert; Cargo 1:N Observation (notas).
- CargoLocation N:1 Cargo; CargoLocation N:1 Location; una fila `ACTIVE` por (cargo, location) en operación normal (la fila se actualiza, no se duplica).
- Movement N:1 Cargo; Movement 1:1 Observation (obligatoria); Movement N:1 Location (origen/destino); Movement puede vincular CargoLocation de origen/destino para movimientos parciales.
- Location 0..1 MapElement (vínculo del plano); Map 1:N MapElement.
- AuditLog 1:1 User (opcional), entityName + entityId polimórfico.

### 4.3 Enums canónicos
- **CargoStatus** (estado operativo, separado de ubicación): `REGISTERED`, `IN_TRUCK`, `PARTIALLY_UNLOADED`, `STORED`, `IN_REVIEW`, `REZAGO`, `SECUESTRO`, `IN_TRANSIT`, `EXITED`, `DELETED` (soft). → Ver §7 máquina de estados.
- **LocationType**: `PLAZOLETA`, `GALPON`, `SECTOR`, `SCANNER`, `BALANZA`, `REZAGO`, `SECUESTRO`, `OTRO`.
- **QuantityUnit** (cantidades y capacidad): `UNITS`, `PALLETS`, `TONS`, `CUBIC_METERS` (m³), `AREA` (m²), `PERCENT` (distribución relativa). Unidades **compatibles para sumar**: misma unidad base o `PERCENT` (sección 68). `CapacityType` queda alineado: `UNITS`, `PALLETS`, `TONS`, `CUBIC_METERS`, `AREA`, `UNLIMITED`, `PERCENT`.
- **Unidad de capacidad por defecto por LocationType** (decisión OQ-041/OQ-014, 2026-09-23 → BR-041): Sector/Galpón → `AREA` (m²) · Plazoleta → `UNITS` (camiones) · Scanner → `UNITS` · Balanza → `UNITS` · otros tipos → configurable. Defaults administrables (tabla de configuración), con **override por ubicación permitido** (`Location.capacityUnit`); gobernanza ADMIN y auditado. (OQ-014 confirmada 2026-09-24: Sectores/Galpón miden superficie m²; la Plazoleta limita por cantidad de camiones.)
- **CargoLocationStatus**: `ACTIVE`, `EXITED`. (Diferido: `PLANNED` para ingreso programado — DECISIÓN PENDIENTE.)
- **MovementKind**: `INGRESS`, `UNLOAD`, `MOVE`, `TO_SCANNER`, `TO_BALANZA`, `TO_REZAGO`, `TO_SECUESTRO`, `REVERSION`, `EXIT`. (V1 puede reducirse a MOVE + razones tipadas; documentar ambas opciones.)
- **AlertType**: `STALE_30D`, `CAPACITY`, `CUSTOM`; **AlertStatus**: `OPEN`, `ACKNOWLEDGED`, `RESOLVED`, `DISMISSED`.
- **AlertSeverity** (ID-007 resuelto, 2026-09-23): `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`. Mapeo inicial: `STALE_30D` → MEDIUM (alerta) / HIGH (segunda alerta día 40); `CAPACITY` → HIGH (umbral normal) / CRITICAL (sobreocupación o umbral crítico); `CUSTOM` según regla de creación.
- **AuditAction**: `CREATE`, `UPDATE`, `MOVE`, `STATUS_CHANGE`, `DELETE`, `RESTORE`, `REVERT`, `MAP_EDIT`, `CAPACITY_CHANGE`, `PERMISSION_CHANGE`, `LOGIN`, `LOGOUT`, `EXPORT`. El ciclo de vida de alertas usa `UPDATE` genérico con `entity=alert` + metadata `from/to status` (OQ-021, 2026-09-24 — no se extiende el enum).
- **NotificationChannel**: `IN_APP` (v1); reservados: `EMAIL`, `PUSH`, `WHATSAPP`, `WEBHOOK` (futuro).

### 4.4 Decisiones de diseño canónicas
1. **Código de carga = string**, nunca entero (formatos heterogéneos reales: `029TERRA26`, `JV028/2026CH`, `005/2026SFCH`, `CHAR227.287`, `203/2017CL-LA`, `ARG-109`, …). **Regla canónica (OQ-001, 2026-09-23 → BR-002)**: regex `^[A-Z0-9][A-Z0-9./-]{2,31}$`, normalizado a MAYÚSCULAS en el backend (trim + uppercase), sin espacios ni caracteres especiales fuera de `/ . -`, único case-insensitive (índice único sobre `upper(code)`), longitud 3–32. El alta rechaza códigos que no cumplan (`VALIDATION_ERROR` / 400 con detalle).
2. **CargoStatus separado de CargoLocation**: no mezclar estado operativo con posición física.
3. **Observation como entidad propia** (v1): un movimiento exige una observación (relación 1:1), y el cargo admite notas sin movimiento. Permite auditoría, búsqueda y futuras observaciones estructuradas. Alternativa evaluada: Observation embebido en Movement (rechazada por límites de consulta y notas de carga).
4. **Soft delete + audit log + revert** para información operacional crítica; sin hard delete en operaciones.
5. **Cargas parciales / distribución**: v1 modela la distribución de una carga vía `CargoLocation` (cantidad, unidad, porcentaje opcional, ingreso/salida por ubicación — secciones 62-67). El estado `PARTIALLY_UNLOADED` refleja carga parcialmente en camión; el residual en camión = `totalQuantity − Σ CargoLocation activos` (unidades compatibles). El modelo es compatible con una futura entidad `CargoItem` (split de carga) que NO se introduce en v1.
6. **Relación camión↔carga (OQ-003, resuelto 2026-09-24 → BR-050)**: 1 camión puede transportar N cargas; **una carga se asocia a UN camión a la vez** (`Cargo.truckId`) en v1 — no se divide en varios camiones. Un camión puede llevar cargas de clientes distintos o iguales (sin restricción de cliente).
7. **Location es la abstracción para todo espacio**; ningún módulo se acopla a sectores específicos.
8. **Distribución M:N (secciones 62-70, decisión adoptada)**: relación Cargo↔Location MANY-TO-MANY mediante `CargoLocation`. NO existe `cargo.locationId` único. Capacidad por `capacity` + `capacityUnit` + `occupiedCapacity`/`availableCapacity` derivados (suma de CargoLocation activos en unidad compatible de la ubicación). Consistencia: suma de cantidades distribuidas ≤ total de la carga; no superar capacidad salvo regla administrativa explícita (flag `allowOverOccupation` + auditoría + observación); movimientos parciales y descarga parcial soportados (cantidad/porcentaje). Reglas canónicas BR-032…BR-042 (§6).
9. **Camión como residual (OQ-042, resuelto 2026-09-23 → BR-042)**: el camión NO es una Location; "en camión" = `totalQuantity − Σ CargoLocation activos` (unidades compatibles), con `Cargo.truckId` como vínculo. `totalQuantity`/`totalUnit` son **obligatorios** para cargas que admiten distribución parcial (movimiento o descarga parcial); error `CARGO_TOTAL_REQUIRED` (422) si falta. La UI muestra la fila "En camión" como residual, nunca como nodo del mapa.
10. **Unidad por defecto (OQ-041, resuelto 2026-09-23 → BR-041)**: defaults por LocationType (Sector → AREA; Plazoleta/Scanner/Balanza → UNITS; otros → configurable) con override por ubicación permitido y gobernanza ADMIN.
11. **Egreso/retiro completo en v1 (OQ-004, resuelto 2026-09-23 → BR-043)**: existe el flujo de egreso de carga del predio: movimiento `EXIT` con observación obligatoria, remito/documentación como campos opcionales en v1 (`Cargo.exitDocumentRef?`, `Movement.metadata`), auditoría (`AuditAction.EXIT`). Una carga `EXITED` queda terminal: no admite más movimientos ni transiciones (excepto restauración/reversión ADMIN). `EXITED` puede alcanzarse desde cualquier estado operativo (OQ-029).
12. **Código de carga inmutable post-registro (OQ-027, resuelto 2026-09-24 → BR-047)**: el código es **INMUTABLE** tras el alta (trazabilidad pura, BR-002). Si se registró mal → soft-delete + re-alta. No existe edición de código en v1.
13. **Sobreocupación administrativa (OQ-043, resuelto 2026-09-24 → BR-036 ampliada)**: `allowOverOccupation` por ubicación + límite de % extra configurable (default +10%) + autorización **solo ADMIN** + observación obligatoria + auditoría (`CAPACITY_CHANGE`, tipo excepción).
14. **Sin conversión de unidades en v1 (OQ-044, resuelto 2026-09-24)**: los segmentos/movimientos exigen unidades compatibles (misma unidad base o PERCENT — BR-035); conversión m³↔m²↔ton↔pallets requiere altura/densidad → fuera de v1.
15. **`percentage` derivado salvo PERCENT (OQ-045, resuelto 2026-09-24 → BR-049)**: `quantity`+`quantityUnit` son la fuente de verdad del segmento; `percentage` es derivado de UI (`quantity/totalQuantity`) e informativo cuando la unidad es física; solo se acepta como input cuando la unidad es `PERCENT` (donde es la cantidad misma). No coexisten dos fuentes de verdad.
16. **Mapa estático en v1 (OQ-015/OQ-028, resueltos 2026-09-24)**: el mapa es **vista estática** (lectura + selección + hover); el editor visual de planos (drag/resize/snap) se difiere. Las propiedades de ubicaciones (nombre, capacidad, unidad, allowOverOccupation, color, x/y/w/h/rotation, status) se editan por **formularios ADMIN**, no visualmente sobre el mapa. Sin drag & drop de cargas en v1 (OQ-024: el movimiento se hace por formulario/diálogo con observación obligatoria — BR-006).
17. **Frontend v1 (OQ-010/012/033/034/035/036/047, resueltos 2026-09-24)**: PWA mínima (manifest + SW + offline parcial de assets) y **SSR diferido**; UI **es-AR** con arquitectura i18n lista (sin conmutador runtime en v1); **sin landing pública**; detalle de movimiento por **ruta hija** `/cargos/:id/movimientos/:movId`; refresco por **polling TTL ~30 s** (dashboard/alertas; detalle/mapa manual; pausa en interacción — WCAG 2.2.2); **listado de ubicaciones** `/locations` en v1.
18. **Notificaciones in-app v1 (OQ-011/023, resueltos 2026-09-24)**: canal `IN_APP`; triggers: alerta `STALE_30D` al abrirse (día 30) y segunda (día 40), alerta `CAPACITY` al superar umbral (90% y sobreocupación); destinatarios ADMIN + OPERATOR; plantillas básicas título+body por tipo; configuración por rol (no por usuario en v1). AlertStatus: OPEN→ACK y ACK→RESOLVED ADMIN+OPERATOR; DISMISSED **solo ADMIN** (OQ-026).
19. **Auditoría OPERATOR (OQ-019, resuelto 2026-09-24)**: OPERATOR ve **solo sus propios eventos** (login, movimientos, cambios realizados por él); ADMIN ve todo; Viewer sin acceso a auditoría.
20. **Dashboard en vivo (OQ-031, resuelto 2026-09-24 → BR-051)**: agregación en vivo (sin job de materialización en v1), KPIs con fórmulas canónicas (ver BR-051).
21. **Movimientos online con Idempotency-Key (OQ-032, resuelto 2026-09-24 → BR-052)**: los movimientos NO son offline en v1 (requieren conexión); los endpoints de escritura (alta, movimientos, segmentos) reciben `Idempotency-Key` y soportan retries con backoff.
22. **Stack infraestructura v1 (OQ-005/006/007, resueltos 2026-09-24)**: PDF HTML→PDF con **Puppeteer/Chromium** en módulo backend (ADR-013 Accepted); storage **S3 compatible MinIO self-hosted**; **Redis + BullMQ en v1** para jobs de alertas/PDF/mantenimiento (ADR-012 Accepted).
23. **Prioridad de flujos (OQ-013, resuelto 2026-09-24)**: primera entrega = flujos operativos núcleo (autenticación, alta de carga, registro de camión, movimiento/descarga, mapa + listados, detalle de carga, alertas, egreso); flujos avanzados (planos, config, auditoría) en slices posteriores.

---

## 5. Data de referencia (seeds para documentación y pruebas)
Ubicaciones iniciales (17): Plazoleta, Sectores 1–12, Scanner, Balanza, Rezago, Secuestro.

Cargas de ejemplo (por ubicación):
| Ubicación | Códigos |
| --- | --- |
| Sector 4 | 029TERRA26, 032TERRA26, 050TERRA26 |
| Sector 5 | 054TERRA26 |
| Sector 3 | 052TERRA26, 037TERRA26 |
| Sector 1 | 433MANCH26 |
| Sector 8 | JV028/2026CH |
| Sector 12 | 005/2026SFCH |
| Sector 10 | JV028/2026, TTOR111/26 |
| Plazoleta | 036TERRA26 |
| Rezago | CHAR227.287, 203/2017CL-LA, ARG-109 |

Estos datos son de ejemplo/documentación, no fuente de verdad operativa.

Ejemplos de distribución (secciones 62-67, usados en tests y pantallas):
- **029TERRA26** → Sector 3: 20 m² (ACTIVE) · Sector 4: 35 m² (ACTIVE) · total 55 m².
- **Sector 4** (capacity 100 m²): 029TERRA26 35 m² + 032TERRA26 25 m² + 050TERRA26 20 m² → occupied 80 m², available 20 m².
- **032TERRA26** → Sector 4: 25 m² (ACTIVE). **050TERRA26** → Sector 4: 20 m² (ACTIVE).
- **Movimiento parcial**: 029TERRA26 con Sector 3 50 m² + Sector 4 30 m² → MOVE 20 m² de Sector 3 → Sector 5 → resultado Sector 3 30 m², Sector 4 30 m², Sector 5 20 m² (historial registrado).
- **Descarga parcial**: 036TERRA26 camión ABC123 → 40% en camión / Sector 4 → 60%; luego Camión → Sector 5 → Sector 4 60% + Sector 5 40% (movimiento registrado).

---

## 6. Reglas de negocio canónicas (BR)
| ID | Regla | Severidad |
| --- | --- | --- |
| BR-001 | No crear carga sin código. | CRÍTICA |
| BR-002 | El código de carga es **único** y cumple la regla canónica (OQ-001): regex `^[A-Z0-9][A-Z0-9./-]{2,31}$`, normalizado a mayúsculas, case-insensitive (índice único `upper(code)`); longitud 3–32. | CRÍTICA |
| BR-003 | No mover una carga inexistente. | CRÍTICA |
| BR-004 | No mover carga a una ubicación inactiva (status != ACTIVE). | CRÍTICA |
| BR-005 | No superar la capacidad configurable de una ubicación (`capacity`/`capacityUnit` vs `occupiedCapacity` derivado; unidades compatibles — ver BR-035/036). | CRÍTICA |
| BR-006 | Todo movimiento de ubicación/estado requiere observación obligatoria (no vacía), **incluido el alta de carga** (OQ-022: obligatoria siempre; la "observación inicial opcional" de PHASES queda descartada). | CRÍTICA |
| BR-007 | Todo cambio de estado requiere observación obligatoria. | CRÍTICA |
| BR-008 | Todo movimiento genera historial (línea temporal reconstruible). | CRÍTICA |
| BR-009 | La validación de permisos ocurre SIEMPRE en backend; el frontend nunca es la única capa de autorización. | CRÍTICA |
| BR-010 | Viewer no puede crear/mover/modificar/eliminar. | ALTA |
| BR-011 | Operator no puede operaciones administrativas (eliminar definitivo, revertir, plano, configuración). | ALTA |
| BR-012 | Admin puede eliminar (soft), restaurar, revertir; toda reversión genera historial y auditoría. | ALTA |
| BR-013 | Nunca borrar silenciosamente una operación (soft delete + audit). | CRÍTICA |
| BR-014 | Alerta de rezago: permanencia > 30 días **corridos** genera alerta (OQ-008); segunda alerta a los 40 días corridos; NO mover automáticamente a Rezago; decisión humana + observación. | ALTA |
| BR-015 | Fecha base para permanencia: fecha de ingreso al predio (`entryDate`, primer CargoLocation ACTIVE); días corridos (OQ-008); segunda alerta a los 40 días; configurable en el futuro (días, fecha base). | MEDIA |
| BR-016 | El frontend no puede cambiar estados arbitrariamente: transiciones validadas en backend (state machine). | CRÍTICA |
| BR-017 | IP/userAgent en auditoría equilibrados con privacidad (no guardar datos sensibles innecesarios). | MEDIA |
| BR-018 | Exportación PDF: **verbo `POST /api/v1/cargos/:id/export-pdf`** (OQ-017: generación con efectos → POST, no GET); permisos según rol; no expone datos de carga no autorizados. | ALTA |
| BR-019 | Notificaciones desacopladas de proveedores (abstracción). | MEDIA |
| BR-020 | Los planos/coordenadas se guardan como datos estructurados (no solo imagen). | ALTA |

> Ampliación 0.2 — secciones 62-70 (distribución M:N de cargas y ubicaciones). Estas reglas son canónicas. Las BR-021…BR-031 de `BUSINESS-RULES.md` siguen `[PROPUESTA]` **excepto BR-029** (promovida a canónica por ID-009, 2026-09-23, ver abajo); la numeración BR-032…BR-040 evita colisionar con ellas.

| BR-029 | La patente del camión es **obligatoria** para todo camión registrado y cumple formato MERCOSUR (`^[A-Z]{2,3}\d{2}[A-Z0-9]$` a validar, ej. AB123CD / AB1234C); exigida en el alta de carga con `truckId` (US-014/US-008). (ID-009 — confirmada 2026-09-23.) | ALTA |

| BR-032 | Una carga puede ocupar simultáneamente N ubicaciones; la relación Cargo↔Location es MANY-TO-MANY vía `CargoLocation` (no `cargo.locationId` único). | CRÍTICA |
| BR-033 | Una ubicación puede contener N cargas simultáneamente; su ocupación es la suma de los segmentos activos en unidad compatible. | CRÍTICA |
| BR-034 | La suma de cantidades distribuidas de una carga no puede superar su cantidad total (unidades compatibles o PERCENT). | CRÍTICA |
| BR-035 | La capacidad de una ubicación se calcula dentro de una unidad compatible; no se suman unidades incompatibles (m² + toneladas + pallets no se suman sin conversión). | CRÍTICA |
| BR-036 | No superar la capacidad configurada de una ubicación salvo regla administrativa explícita de sobreocupación (**OQ-043, ampliada 2026-09-24**): `allowOverOccupation` por ubicación + límite de % extra configurable (default **+10%**) + autorización **solo ADMIN** + observación obligatoria + auditoría (`CAPACITY_CHANGE`, tipo excepción). | ALTA |
| BR-037 | Movimientos parciales soportados (cantidad/porcentaje); mover una carga NO equivale a mover el 100%. | ALTA |
| BR-038 | Descarga parcial soportada: residual en camión = totalQuantity − Σ CargoLocation activos; registra movimiento. | ALTA |
| BR-039 | Cada segmento CargoLocation activo registra enteredAt; el alta/egreso de una carga en una ubicación genera movimiento e historial (BR-006/008). | CRÍTICA |
| BR-040 | Las consultas de distribución exponen ubicaciones, cantidad ocupada, porcentaje, fechas de ingreso/salida e historial de movimientos de la carga o ubicación. | MEDIA |
| BR-041 | La unidad de capacidad por defecto se define por LocationType (Sector → AREA, Plazoleta/Scanner/Balanza → UNITS, otros → configurable) con override por ubicación permitido; gobernanza ADMIN y auditada. | MEDIA |
| BR-042 | El camión no es una Location: "en camión" es residual derivado = totalQuantity − Σ CargoLocation activos (unidades compatibles); totalQuantity/totalUnit son obligatorios para cargas con distribución parcial (CARGO_TOTAL_REQUIRED 422). | CRÍTICA |
| BR-043 | **Egreso/retiro completo en v1 (OQ-004)**: movimiento `EXIT` con observación obligatoria + auditoría; remito/documentación opcionales en v1 (`exitDocumentRef?`); `EXITED` es terminal (no admite más movimientos; restauración/reversión solo ADMIN). | ALTA |
| BR-044 | **Matriz estricta estado × tipo de ubicación (OQ-025)**: `IN_TRUCK` solo en PLAZOLETA; `REZAGO` solo en ubicación tipo REZAGO; `IN_REVIEW` solo en SCANNER/BALANZA; `STORED` en GALPON/SECTOR; `IN_TRANSIT` solo transitorio (no estado físico persistido). Fuera de matriz → `INVALID_TRANSITION` 409. | CRÍTICA |
| BR-045 | **Matriz de transiciones confirmada (OQ-029)**: Además de §7 — `STORED`/`PARTIALLY_UNLOADED` → `REZAGO` (directo); `REZAGO` → `STORED`/`IN_TRUCK`/`EXITED`; `SECUESTRO` → `STORED`/`EXITED`; `EXITED` desde cualquier estado operativo (sin pasar por IN_REVIEW); `PARTIALLY_UNLOADED` → `IN_REVIEW`. Saltos NO adyacentes prohibidos (`INVALID_TRANSITION` 409). | CRÍTICA |
| BR-046 | **Permisos de transiciones especiales (OQ-030)**: `TO_REZAGO` → ADMIN **y** OPERATOR (permiso `cargo.to_rezago`); `TO_SECUESTRO` → **solo ADMIN** (permiso `cargo.to_secuestro`). Ambas con observación obligatoria. | ALTA |
| BR-047 | **Código de carga inmutable post-registro (OQ-027, 2026-09-24)**: el código no se puede editar tras el alta (BR-002); corrección registral → soft-delete + re-alta. Sin endpoint de cambio de código en v1. | ALTA |
| BR-048 | **Conversión de unidades NO soportada en v1 (OQ-044, 2026-09-24)**: los segmentos y movimientos exigen unidades compatibles (misma unidad base o PERCENT); conversiones m³↔m²↔ton↔pallets fuera de alcance v1 (requieren altura/densidad). Unidad incompatible → 422 `UNIT_INCOMPATIBLE`. | CRÍTICA |
| BR-049 | **Semántica de `percentage` (OQ-045, 2026-09-24)**: `quantity`/`quantityUnit` son la fuente de verdad; `percentage` es derivado de UI (quantity/totalQuantity) e informativo salvo cuando `quantityUnit = PERCENT` (donde es la cantidad misma). No se aceptan dos fuentes de verdad simultáneas. | CRÍTICA |
| BR-050 | **Una carga → un camión a la vez (OQ-003, 2026-09-24)**: una carga se asocia a UN camión (`truckId`); no se divide entre varios camiones en v1. Un camión puede transportar N cargas, de clientes distintos o iguales (sin restricción de cliente). | ALTA |
| BR-051 | **Dashboard KPIs en vivo (OQ-031, 2026-09-24)**: agregación en vivo sin job de materialización en v1; fórmulas canónicas — cargas activas = cargas en estado operativo no terminal (≠ EXITED/DELETED); ocupación por ubicación = Σ CargoLocation ACTIVE en unidad compatible de la ubicación; % ocupado = occupiedCapacity/capacity; alertas abiertas = Alert OPEN+ACKNOWLEDGED; permanencia máx = max(now − entryDate) entre cargas activas; ingresos/egresos hoy = movimientos INGRESS/EXIT del día. | MEDIA |
| BR-052 | **Escrituras online con Idempotency-Key (OQ-032, 2026-09-24)**: movimientos NO offline en v1 (requieren conexión); los endpoints de escritura (alta, movimientos, segmentos CargoLocation) aceptan `Idempotency-Key` y devuelven el resultado previo en replays; retries con backoff del cliente. | ALTA |

---

## 7. Máquina de estados (CargoStatus)
Estado inicial: `REGISTERED` (registro) → `IN_TRUCK` (ingreso vía camión a plazoleta) ↔ `PARTIALLY_UNLOADED` ↔ `STORED` ↔ `IN_REVIEW` (scanner/balanza) → `REZAGO` / `SECUESTRO` / `EXITED` / `DELETED` (soft). `IN_TRANSIT` es transitorio entre ubicaciones.

Principios:
- Las transiciones se validan en backend (service de dominio) con permisos y condiciones.
- Toda transición requiere observación (BR-006/007) e inserta historial (BR-008).
- Reversiones (ADMIN) usan el mecanismo `REVERSION` y conservan el historial original.
- Estado y ubicación son independientes: una carga puede estar `STORED` en Sector 4, o `IN_TRUCK` en Plazoleta, etc.
- `PARTIALLY_UNLOADED` + distribución: una carga puede estar parcialmente en camión y parcialmente en ubicaciones. El residual en camión = `totalQuantity − Σ CargoLocation activos` (unidades compatibles; ver §67). La distribución multi-ubicación coexiste con cualquier estado.
- `IN_TRUCK` con distribución: la carga puede permanecer en camión (40%) mientras parte está en Sector (60%); al mover el residual del camión se crea el segmento destino y el residual queda en cero (la carga pasa a `STORED` total si no queda nada en camión).

**Transiciones confirmadas (OQ-029, 2026-09-23 → BR-045; reemplaza la lista previa "pendiente de confirmación")** — además de las transiciones estándar de §4.4.1 de VALIDATION.md:
- `STORED` → `REZAGO` y `PARTIALLY_UNLOADED` → `REZAGO` (directo, sin pasar por IN_REVIEW).
- `REZAGO` → `STORED` (reintegrado), `REZAGO` → `IN_TRUCK`, `REZAGO` → `EXITED`.
- `SECUESTRO` → `STORED` (liberación) y `SECUESTRO` → `EXITED`.
- `EXITED` desde **cualquier estado operativo** (egreso sin pasar por IN_REVIEW — BR-043).
- `PARTIALLY_UNLOADED` → `IN_REVIEW`.
- Saltos directos entre estados NO adyacentes (ej. `IN_TRUCK` → `IN_REVIEW`) → `PROHIBIDO` (`INVALID_TRANSITION` 409).

**Matriz estricta estado × ubicación (OQ-025, 2026-09-23 → BR-044)**: `IN_TRUCK` solo en PLAZOLETA · `REZAGO` solo en ubicación tipo REZAGO · `IN_REVIEW` solo en SCANNER/BALANZA · `STORED` en GALPON/SECTOR · `IN_TRANSIT` solo transitorio (no persistido) · `EXITED`/`DELETED` sin ubicación física.

Detalle completo de transiciones válidas en `backend/VALIDATION.md`, `architecture/ARCHITECTURE.md` y `ux/USER-FLOWS.md`.

---

## 8. RBAC (3 roles)

### Viewer
Consultas: dashboard, cargas, detalles, mapa, historial, exportaciones autorizadas. No: crear/mover/editar/eliminar/planos/restaurar.

### Operator
Todo Viewer +: crear cargas, modificar cargas permitidas, registrar camiones, mover cargas, cambiar estados, **ejecutar TO_REZAGO** (decisión operativa con observación — BR-046), **tomar/resolver alertas (OPEN→ACK/ACK→RESOLVED — OQ-026)**, registrar observaciones, historial, **ver solo sus propios eventos de auditoría (OQ-019)**. No: eliminar definitivo, restaurar, revertir, **TO_SECUESTRO (solo ADMIN)**, **DISMISS de alertas (solo ADMIN)**, estructura crítica del plano, configuración global, auditoría ajena.

### Admin / Supervisor
Todo Operator +: eliminar (soft), restaurar, revertir operaciones, **TO_SECUESTRO**, **DISMISS de alertas**, modificar planos/capacidades/ubicaciones (formularios — OQ-028), **autorizar sobreocupación (BR-036 — OQ-043)**, administrar configuración, usuarios y permisos, **auditoría completa (OQ-019)**.

Autorización: RBAC por permisos (`Permission`), bundles por rol, guardias en backend + guards en frontend (UX únicamente). Los permisos de transiciones especiales se formalizan como `cargo.to_rezago` (ADMIN + OPERATOR) y `cargo.to_secuestro` (solo ADMIN) — OQ-030, BR-046. Auditoría: `audit.read` (ADMIN) y eventos propios para OPERATOR — OQ-019.
- **AlertStatus (OQ-026)**: `OPEN→ACKNOWLEDGED` y `ACKNOWLEDGED→RESOLVED` → ADMIN + OPERATOR; `DISMISSED` → **solo ADMIN**. Si se requiere permiso granular en v1, usar `alert.manage` (ADMIN) y `alert.ack` (OPERATOR) dentro del catálogo ADR-009.

---

## 9. Alertas y Rezago
- Regla: permanencia > 30 días **corridos** (OQ-008) desde `entryDate` (fecha de ingreso al predio, primer CargoLocation ACTIVE) → alerta `STALE_30D` OPEN. Segunda alerta a los 40 días corridos (misma alerta elevada o nueva `STALE_30D` con severity HIGH — ver AlertSeverity §4.3).
- Sistema: (1) detectar permanencia, (2) generar alerta, (3) mostrar en Dashboard y en la carga, (4) permitir revisión, (5) usuario autorizado decide mover a Rezago, (6) observación obligatoria, (7) movimiento + historial.
- NO mover automáticamente.
- Alerta de capacidad (`CAPACITY`): se calcula sobre `occupiedCapacity` derivado = Σ de CargoLocation activos en unidad compatible de la ubicación (varias cargas aportan ocupación). Umbral configurable (p. ej. 90%) y regla de sobreocupación según BR-036.
- Configuración futura: días hasta alerta, fecha base, días hasta segunda alerta, estado de alerta.
- **Notificaciones in-app (OQ-011/023, resueltos 2026-09-24)**: canal `IN_APP` en v1 (EMAIL/PUSH/WHATSAPP/WEBHOOK reservados, abstracción BR-019). Triggers: alerta `STALE_30D` al abrirse (día 30) y segunda (día 40); alerta `CAPACITY` al superar umbral (configurable, p. ej. 90%) y sobreocupación (BR-036). Destinatarios: ADMIN + OPERATOR. Plantillas básicas título+body por tipo; configuración de destinatarios por rol (no por usuario en v1).
- **Transiciones de AlertStatus (OQ-026, resuelto 2026-09-24)**: `OPEN→ACKNOWLEDGED` y `ACKNOWLEDGED→RESOLVED` → ADMIN + OPERATOR; `DISMISSED` → solo ADMIN. Toda transición genera auditoría (`AuditAction.UPDATE`, entity=alert, metadata from/to — OQ-021).

---

## 10. API
- Convención: REST bajo `/api/v1`, JSON, OpenAPI/Swagger.
- Success envelope: `{ "data": ... }` (opcional `meta` para paginación).
- Error envelope: `{ "error": { "code", "message", "details?", "requestId" } }` + HTTP correcto.
- Paginación `?page=&limit=` (+ `sort`, `filter`); límites por defecto p.ej. 25/100.
- Versionado de contrato `/api/v1`; breaking changes → `/api/v2`.
- Endpoints principales (documentar contratos en `backend/API.md`):
  `POST /api/v1/auth/login` · `POST /api/v1/auth/refresh` · `GET /api/v1/cargos` · `POST /api/v1/cargos` · `GET /api/v1/cargos/:id` · `PATCH /api/v1/cargos/:id` · `GET /api/v1/cargos/:id/movements` · `POST /api/v1/cargos/:id/movements` · `GET /api/v1/locations` · `GET /api/v1/maps` · `PATCH /api/v1/maps/:id` · `GET /api/v1/dashboard` · `GET /api/v1/alerts` · `GET /api/v1/audit` · **`POST /api/v1/cargos/:id/export-pdf`** (OQ-017: exportación con efectos → POST; no GET. Alinea ID-001 en API.md/ADR-013).
- Endpoints de distribución (secciones 62-70): `GET /api/v1/cargos/:id/locations` (todas las ubicaciones de una carga con cantidad/porcentaje/estado/enteredAt/exitedAt) · `POST /api/v1/cargos/:id/locations` (crear segmento CargoLocation + movimiento) · `PATCH /api/v1/cargos/:id/locations/:cargoLocationId` (actualizar segmento, p. ej. ajuste de cantidad) · `DELETE /api/v1/cargos/:id/locations/:cargoLocationId` (egreso de una carga de una ubicación → movimiento) · `GET /api/v1/locations/:id/cargos` (cargas de una ubicación con ocupación/alertas/30 días) · `GET /api/v1/locations/:id/capacity` (capacidad, ocupada, disponible, por unidad).
- Los DTOs se reutilizan, no se duplican contratos.

---

## 11. Arquitectura
### 11.1 Decisión central: Modular Monolith
- Un solo servicio backend modular (NestJS) en v1. Sin microservicios iniciales.
- Módulos fuertemente cohesionados, comunicación interna explícita, boundaries claros para poder extraer servicios después si el crecimiento lo exige.
- Justificación: equipo pequeño, dominio acotado, despliegue simple, transacciones ACID entre módulos, evitación de complejidad distribuida prematura (KISS/YAGNI). Ver `architecture/ADR/ADR-001-Modular-Monolith.md`.

### 11.2 Stack objetivo
| Capa | Tecnología |
| --- | --- |
| Frontend | Angular 20+, TypeScript, Standalone Components, Signals, Router, Reactive Forms, SSR cuando aporte, PWA |
| Backend | NestJS, TypeScript, REST, OpenAPI/Swagger |
| DB | PostgreSQL 16+ |
| ORM | Prisma |
| Cache/Jobs | Redis; **BullMQ en v1** (ADR-012 Accepted — OQ-007: alertas 30/40 d, exports PDF, mantenimiento) |
| Storage | S3 compatible — **MinIO self-hosted** (OQ-006; API S3, migrable a AWS S3 sin reescribir) |
| PDF | Servicio backend especializado — **Puppeteer/Chromium HTML→PDF** (OQ-005; ADR-013 Accepted) |
| Auth | JWT + Refresh Token (ver ADR-008) |

### 11.3 Módulos backend (NestJS)
`auth`, `users`, `roles`, `permissions`, `cargo`, `trucks`, `locations`, `movements`, `maps`, `alerts`, `dashboard`, `reports`, `audit`, `notifications`, `settings`, `health`.
- v1 esencia: todos excepto `reports` (mínimo dentro de cargo/dashboard) — ver `backend/MODULES.md`.
- Estructura por módulo: controller, service, repository, DTOs, entities, guards, interceptors, validators, exceptions.

### 11.4 Frontend
Estructura: `core/ shared/ features/ layouts/ pages/ services/ models/ guards/ interceptors/ state/ ui/ utils/`.
Componentes canónicos propuestos: CargoTable, CargoStatusBadge, CargoDetail, CargoSearch, CargoFilters, OperationalMap, MapLocation, MapToolbar, MapLegend, LocationCard, LocationOccupancyCard, DistributionPanel (vista de distribuciones de una carga / cargas de una ubicación), MovementTimeline, CapacityIndicator, AlertCard, ConfirmDialog, ObservationDialog, PdfExportButton. Ver `frontend/COMPONENTS.md`.

### 11.5 Motor de mapa (SVG)
- Cada ubicación = objeto independiente `LocationVisual { id, x, y, width, height, rotation, zIndex, fill, stroke, labelPosition }` (+ properties).
- **Vista estática en v1 (OQ-015/028, resueltos 2026-09-24)**: interacciones de v1 = zoom, pan, selección, hover. Drag/resize/snap/edición visual quedan para el editor de planos (fase posterior; formularios ADMIN en v1 para propiedades).
- Preparado para futuro: rutas, zonas, puertas, caminos, cámaras, sensores, posiciones de camiones.
- Render eficiente (no miles de nodos innecesarios): capas, memoización, virtualización de piezas, lazy map.
- Distribución M:N en el mapa (§69): una ubicación visualiza N cargas y su ocupación acumulada (capacidad, ocupada, disponible, % ocupado); una carga con N ubicaciones se visualiza con sus segmentos/porcentajes. Al seleccionar una ubicación: nombre, capacidad, ocupación, %, cargas, alertas, movimientos recientes. Al seleccionar una carga: todas sus ubicaciones, distribución, %/cantidad, estado, movimientos.
- Sin drag & drop de cargas en el mapa operativo en v1 (OQ-024): el movimiento se inicia desde formulario/diálogo con observación obligatoria (BR-006).
- Ver `architecture/MAP-ENGINE.md`, `ux/MAP-UX.md`, `brand/MAP-VISUAL-GUIDELINES.md`.

### 11.6 PDF
Servicio backend especializado; contrato de exportación **`POST /api/v1/cargos/:id/export-pdf`** (OQ-017); permisos por rol; generación con **Puppeteer/Chromium HTML→PDF** en módulo `pdf` (OQ-005, 2026-09-24 — ADR-013 Accepted); síncrono para documentos livianos y job `pdf-exports` (ADR-012) + URL firmada de corta expiración para documentos grandes; sin carga remota en plantillas (SSRF).

---

## 12. UX/UI, responsive, accesibilidad, PWA
- Principios: claridad > decoración; velocidad; legibilidad; estados visibles; mínima fricción; trazabilidad.
- Desktop-first para operación; correcto en desktop, notebook, tablet, móvil. En móvil: mapa + panel inferior/drawer (no clonar desktop).
- Accesibilidad: objetivo WCAG 2.2 AA — navegación por teclado, focus, contraste AA, labels, ARIA, screen readers, diálogos, tablas, mapa con alternativa accesible (listado).
- **PWA mínima en v1 (OQ-010)**: instalación, manifest, service worker, caching, offline parcial de assets. **SSR diferido** a v1.1+. **Sin landing pública (OQ-033)**: app 100% autenticada, login directo; SEO/sitemap fuera de alcance.
- **Movimientos NO offline en v1 (OQ-032 → BR-052)**: escrituras online con `Idempotency-Key` y retries con backoff; sin cola offline local ni background sync transaccional.
- **Idioma (OQ-012/034)**: UI es-AR en v1; arquitectura i18n lista (claves, módulo) pero sin inglés ni conmutador runtime en v1 (se agregan en v1.1+).
- **Mapa operativo**: vista estática, sin drag & drop de cargas (OQ-015/024/OQ-028); movimiento por formulario/diálogo con observación obligatoria.
- **Refresco (OQ-036)**: polling con TTL ~30 s en dashboard y alertas; detalle/mapa manual (pull-to-refresh); sin WebSocket en v1; pausa automática del auto-refresh cuando el usuario interactúa con contenido que se mueve (WCAG 2.2.2).
- **Detalle de movimiento por ruta hija (OQ-035)**: `/cargos/:id/movimientos/:movId` (deep-link permalink desde el timeline).
- **Listado de ubicaciones (OQ-047)**: pantalla `/locations` en v1 con búsqueda/filtros; deep-link `/locations/:id` desde mapa y listados.

---

## 13. Marca y design tokens (propuesta base)
Paleta propuesta (a validar — ver `OPEN-QUESTIONS.md`):
| Token | Valor |
| --- | --- |
| primary | #2563EB |
| secondary | #0F172A |
| background | #F8FAFC |
| surface | #FFFFFF |
| text | #0F172A |
| muted | #64748B |
| success | #16A34A |
| warning | #F59E0B |
| danger | #DC2626 |
| info | #0EA5E9 |

- Tipografía, iconografía, spacing, borders, radius, shadows, status colors, charts, map colors: detalle en `brand/`.
- Mapa: no depender solo del color: iconos, patrones, labels, estados; leyenda obligatoria.
- **Umbrales de ocupación del mapa (OQ-046, resueltos 2026-09-24 — canónicos)**: por ubicación, normal **< 70%** · warning **70–90%** · danger **> 90%**; tokens `--map-occupancy-*` (ver `brand/MAP-VISUAL-GUIDELINES.md`); configurables por settings a futuro.

---

## 14. Testing / QA / DevOps
- Estrategia: unit + integration + E2E + API + security + accessibility + performance.
- Casos críticos: crear carga; mover carga; movimiento sin observación; exceder capacidad; sobreocupación ADMIN (+10%); permisos; reversión; alerta 30 días; PDF; edición de plano.
- **Performance (OQ-020, 2026-09-24 — provisionales a validar con el negocio antes de fijar contrato)**: API p95 < 300 ms; carga de página < 2 s; volúmenes de referencia 1k cargas / 10k movimientos / 50 ubicaciones.
- **Backup/DR (OQ-016, 2026-09-24 — provisionales)**: RPO ≤ 15 min (WAL/PITR); RTO ≤ 4 h (BD) y ≤ 24 h (restauración completa); backups diarios + WAL continuo, retención 35 días. Medir en prueba de DR de FASE 1.
- Ambientes: development / staging / production. CI/CD: lint, test, build, security scan, deploy. Docker, secrets, backups, monitoring, logs, health checks, rollback, DR.
- Ver `qa/` y `devops/`.

---

## 15. Estándares de código y colaboración
TypeScript strict mode · ESLint · Prettier · Conventional Commits (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`) · Semantic Versioning · branch strategy (trunk-based + feature branches) · Pull Requests + Code Review · Security Review · sin "Co-Authored-By" ni atribución IA en commits.

---

## 16. Convenciones de documentación
- **Idioma de contenido**: español profesional/neutral (dominio hispanohablante; UI inicial es-AR).
- **Filenames**: en inglés (según especificación).
- Formato de cada documento: `Objetivo`, `Contexto`, `Restricciones`, `Dependencias`, `Decisiones`, `Criterios de aceptación`, `Archivos involucrados`, `Riesgos`, y sección `DECISIÓN PENDIENTE` cuando aplique.
- No inventar reglas; toda ambigüedad → DECISIÓN PENDIENTE + reporte al orquestador (centralizado en `OPEN-QUESTIONS.md`).

---

## 17. Mapa de documentos (manifest)
| Archivo | Grupo | Estado |
| --- | --- | --- |
| docs/MASTER-SPEC.md | orquestador | ✅ creado |
| docs/OPEN-QUESTIONS.md | orquestador | ✅ creado + consolidado (OQ-001..036, ID-001..010) |
| docs/README.md | orquestador | ✅ creado |
| docs/DEFINITION-OF-DONE.md | W10 | ✅ creado |
| docs/TEAM-ROLES.md | W10 | ✅ creado |
| docs/STANDARDS.md | W10 | ✅ creado |
| docs/product/PRD.md · PRODUCT-BACKLOG.md · USER-STORIES.md · USE-CASES.md · BUSINESS-RULES.md | W1 | ✅ creados |
| docs/architecture/ARCHITECTURE.md · DATABASE.md · SECURITY.md · AUTHORIZATION.md · AUDIT.md · MAP-ENGINE.md · PDF-EXPORT.md · NOTIFICATIONS.md · PERFORMANCE.md · SCALABILITY.md | W2 | ✅ creados |
| docs/architecture/ADR/ADR-001..013 | W3 | ✅ creados (13) |
| docs/frontend/FRONTEND-ARCHITECTURE.md · COMPONENTS.md · DESIGN-SYSTEM.md · STATE-MANAGEMENT.md · ROUTING.md · I18N.md · ACCESSIBILITY.md · SEO.md · PWA.md | W4 | ✅ creados |
| docs/backend/BACKEND-ARCHITECTURE.md · MODULES.md · DTOs.md · API.md · API-CONVENTIONS.md · ERROR-HANDLING.md · VALIDATION.md · JOBS.md · OPENAPI.md | W5 | ✅ creados |
| docs/ux/USER-FLOWS.md · SCREENS.md · MAP-UX.md | W6 | ✅ creados |
| docs/brand/BRAND-BOOK.md · DESIGN-TOKENS.md · UI-GUIDELINES.md · MAP-VISUAL-GUIDELINES.md | W7 | ✅ creados |
| docs/qa/QA-STRATEGY.md · TEST-PLAN.md · TEST-CASES.md · E2E-SCENARIOS.md · ACCEPTANCE-CRITERIA.md | W8 | ✅ creados |
| docs/devops/DEVOPS.md · CI-CD.md · DOCKER.md · ENVIRONMENTS.md · BACKUP-RECOVERY.md · MONITORING.md · LOGGING.md | W9 | ✅ creados |
| docs/roadmap/ROADMAP.md · PHASES.md · IMPLEMENTATION-PLAN.md | W10 | ✅ creados |

Estado FASE 0: **completa** (74 documentos Markdown, cero archivos de código). **OQ cerradas al 100% (v0.5, 2026-09-24)**: no quedan decisiones de negocio/técnicas abiertas; ID-001…010 alineadas en v0.4. Solo residuales documentados no bloqueantes (p. ej. propuestas `cargo.update`/`truck.create` fuera del catálogo ADR-009 — DP-ROU-04).
2026-09-23: ampliación de modelo por secciones 62-70 (distribución M:N Cargo↔Location vía CargoLocation, capacidad por unidad, movimientos parciales) aplicada a MASTER-SPEC y replicada en los grupos documentales.
2026-09-24: **v0.5 — resolución completa de OQ** (OQ-003/005/006/007/009/010/011/012/013/014/015/016/019/020/021/023/024/026/027/028/031/032/033/034/035/036/043/044/045/046/047): PDF Puppeteer (ADR-013), MinIO (S3), Redis+BullMQ v1 (ADR-012), PWA mínima, es-AR+i18n, flujos núcleo, mapa estático, formularios ADMIN, RPO/RTO, auditoría OPERATOR, presupuestos, UPDATE audit alertas, sin DnD, roles AlertStatus, código inmutable (BR-047), sin conversión (BR-048), percentage derivado (BR-049), 1 carga→1 camión (BR-050), dashboard en vivo (BR-051), Idempotency-Key (BR-052), sin landing, ruta hija movimiento, polling 30 s, sobreocupación ADMIN+10% (BR-036), umbrales 70/90, listado ubicaciones, notificaciones in-app v1.
2026-09-28: estándares de documentación de tooling agregados al mapa (§17): `backend/OPENAPI.md` (W5) — estrategia oficial de OpenAPI/Swagger, tags, schemas por DTO, gate de sincronización con el código; `frontend/STORYBOOK.md` (W4) — estándar de Storybook (addons, args, fixtures con datos §5, matriz de estados por componente, a11y, responsive, regresión visual). No altera dominio, BR, enums, contratos de API ni el roadmap.
2026-09-30: `frontend/STORYBOOK.md` eliminado del mapa (§17) y del índice (README). El frontend no adopta Storybook: la documentación viva de componentes es `COMPONENTS.md` (contrato canónico, §6.x por componente) + specs unitarias `*.spec.ts`, y la verificación va por tests y accesibilidad directa, no por catálogo de stories. La entrada del 2026-09-28 queda como registro histórico; el estándar dejó de aplicarse. No altera dominio, BR, enums, contratos de API ni el roadmap.

---

## 18. Roadmap (fases)
PHASE 0 Documentation → 1 Foundation → 2 Authentication + RBAC → 3 Cargo Management → 4 Locations → 5 Movements → 6 Operational Map → 7 Dashboard → 8 History + Audit → 9 Alerts → 10 PDF → 11 Map Editor → 12 QA → 13 Production → 14 Mobile.
Detalle por fase (objetivo, entregables, dependencias, criterios de salida) en `roadmap/`.

---

## 19. Backlog — esquema de IDs
Epics: `EPIC-001`… · Features: `FEATURE-001`… · User Stories: `US-001`… con Epic, Feature, Acceptance Criteria, Priority, Dependencies, Technical Notes. Detalle en `product/PRODUCT-BACKLOG.md` y `roadmap/IMPLEMENTATION-PLAN.md`.

---

## 20. Definition of Done (global)
Una funcionalidad no está terminada si le falta: tests, documentación, validaciones, manejo de errores, permisos, estados de loading, estados vacíos, responsive, accesibilidad básica, logs cuando corresponda, criterios de aceptación cumplidos. Detalle en `docs/DEFINITION-OF-DONE.md`.

---

## 21. Roles del equipo
PO, Scrum Master/PM, Software Architect, UI/UX Designer, Backend Dev, Frontend Dev, Mobile Dev, QA Engineer, DevOps Engineer — responsabilidades, entregables, documentos que usan, dependencias, criterios de finalización. Detalle en `docs/TEAM-ROLES.md`.

---

## 22. Repos futuros
`cargoops-frontend` · `cargoops-backend` · `cargoops-mobile` (futuro) · `cargoops-infrastructure` · `cargoops-docs` (actual, local `cargoops-docs/`). Cada uno con README/CONTRIBUTING/ARCHITECTURE/SECURITY/CHANGELOG/docs según corresponda. FASE 0 vive en esta carpeta local; la creación de repos git es decisión posterior.

---

## 23. ADRs (índice)
ADR-001 Modular Monolith · ADR-002 Angular · ADR-003 NestJS · ADR-004 PostgreSQL · ADR-005 Prisma · ADR-006 SVG Map Engine · ADR-007 REST API · ADR-008 Authentication · ADR-009 RBAC · ADR-010 Audit Log · ADR-011 Soft Delete · ADR-012 Background Jobs · ADR-013 PDF Generation.
Formato por ADR: Context, Decision, Alternatives, Consequences.

---

## 24. Decisiones pendientes (resumen)
Ver `OPEN-QUESTIONS.md` (live). **Resueltas 2026-09-23 (v0.4)**: reglas de unicidad de código (OQ-001 · BR-002) · egreso/retiro completo (OQ-004 · BR-043) · fecha base y días de alerta 30/40 corridos (OQ-008) · verbo export-pdf POST (OQ-017) · catálogo de permisos ADR-009 (OQ-018) · observación obligatoria siempre (OQ-022) · matriz estricta estado×ubicación (OQ-025 · BR-044) · matriz de transiciones (§4.4.3 completa · OQ-029 · BR-045) · permisos TO_REZAGO/TO_SECUESTRO (OQ-030 · BR-046) · patente MERCOSUR obligatoria (ID-009 · BR-029). Relación camión-carga (OQ-042 **resuelta**: residual derivado). Sobreocupación/unidad por defecto (OQ-041 **resueltas**). UMBRALES de ocupación (OQ-046) · notificaciones in-app en v1 · idioma de UI.

**Resueltas 2026-09-24 (v0.5) — NO quedan OQ abiertas**: PDF Puppeteer/Chromium (OQ-005 · ADR-013) · S3 MinIO self-hosted (OQ-006) · Redis + BullMQ en v1 (OQ-007 · ADR-012) · PWA mínima + SSR diferido (OQ-010) · notificaciones in-app v1 (OQ-011/023) · es-AR + i18n listo, sin conmutador runtime (OQ-012/034) · flujos núcleo primero (OQ-013) · sectores m² + Plazoleta camiones (OQ-014) · mapa estático + formularios ADMIN (OQ-015/028) · RPO ≤15 min / RTO ≤4 h (OQ-016) · auditoría OPERATOR propios eventos (OQ-019) · presupuestos provisionales a validar (OQ-020) · UPDATE genérico para alertas (OQ-021) · sin drag & drop (OQ-024) · AlertStatus roles (OQ-026) · código inmutable (OQ-027 · BR-047) · dashboard en vivo + fórmulas (OQ-031 · BR-051) · movimientos online + Idempotency-Key (OQ-032 · BR-052) · sin landing (OQ-033) · detalle movimiento ruta hija (OQ-035) · polling TTL ~30 s (OQ-036) · sobreocupación solo ADMIN +10% (OQ-043 · BR-036) · sin conversión de unidades (OQ-044 · BR-048) · percentage derivado salvo PERCENT (OQ-045 · BR-049) · umbrales mapa 70/90 (OQ-046) · listado de ubicaciones en v1 (OQ-047) · 1 carga → 1 camión (OQ-003 · BR-050) · capacidad/ocupación cerradas (OQ-009 → OQ-041/046).

**Pendientes NO bloqueantes para FASE 1** (residuales documentados): propuestas `cargo.update`/`truck.create` fuera del catálogo ADR-009 (ID-006 residual — DP-ROU-04); validar presupuestos de performance (OQ-020) y RPO/RTO (OQ-016) con el negocio antes de fijar contrato final.