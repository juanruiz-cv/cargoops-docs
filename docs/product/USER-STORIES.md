# CargoOps — User Stories (USER-STORIES)

> Documento de producto del grupo **W1**.
> Fuente de verdad canónica: `docs/MASTER-SPEC.md` v0.2 (roles §8, estados §7, BR §6 — incluye ampliación 0.2 BR-032…BR-040, enums §4.3). Pendientes centralizados: `docs/OPEN-QUESTIONS.md` (OQ-001…OQ-045).
> Idioma del contenido: español profesional/neutral. Identificadores y filenames: inglés.

---

## 0. Estado del documento

- Versión: 0.1 — 2026-09-23 · **0.2 — 2026-09-23 (ampliación §§62-70: US-046…053 de distribución M:N, capacidad por unidad, movimientos y descarga parciales)**
- Autor: Grupo W1 — Documentación de producto
- Estado: Borrador para revisión del orquestador (alineado a MASTER-SPEC v0.2)
- Regla de mantenimiento: las historias referencian IDs del `PRODUCT-BACKLOG.md` (US-xxx) y se verifican con los criterios de `QA-STRATEGY.md`/`TEST-PLAN.md` (W8).

## 1. Objetivo

Detallar las user stories de CargoOps con **criterios de aceptación verificables en formato Given/When/Then**, organizadas por rol (Viewer/Operator/Admin, MASTER-SPEC §8). Cubre los casos críticos de QA del §14 del MASTER-SPEC: crear carga, mover carga, movimiento sin observación, exceder capacidad, permisos, reversión, alerta 30 días, PDF y edición de plano.

## 2. Contexto

Las historias son la capa "cómo lo percibe el usuario" del backlog: cada una refiere una US del `PRODUCT-BACKLOG.md` y las reglas BR canónicas que aplican. Los roles son los tres del §8:

- **Viewer**: consulta y monitoreo (dashboard, cargas, mapa, historial, exportaciones autorizadas). Lectura pura.
- **Operator**: operación diaria (registrar cargas/camiones, mover, descargar, cambiar estados, observar).
- **Admin/Supervisor**: todo Operator + eliminar (soft), restaurar, revertir, planos, configuración, usuarios y permisos.

## 3. Restricciones

- Los criterios son **verificables por backend en primera instancia** (BR-009): los Given/When/Then describen comportamiento observable del sistema, no implementación.
- No se inventan reglas: solo BR canónicas (§6) y propuestas marcadas `[PROPUESTA]` en `BUSINESS-RULES.md`.
- Los supuestos que condicionaban estas historias (OQ-001, OQ-008, OQ-009, OQ-041…OQ-045 — **todas resueltas 2026-09-23/24**, ver tabla §9) y los residuales locales W1-Q1/Q2/Q8 se declaran en cada historia afectada y en la sección DECISIÓN PENDIENTE.

## 4. Dependencias

- `PRODUCT-BACKLOG.md` (IDs y prioridades) · `MASTER-SPEC.md` §7/§8/§6 (estados, roles, reglas) · `OPEN-QUESTIONS.md` (OQ) · `USE-CASES.md` (flujos UC) · `ux/USER-FLOWS.md` (flujos W6).

## 5. Historias por rol

### 5.1 Viewer (lectura pura, BR-010)

**US-004 — Iniciar sesión y mantener sesión activa**
_Como Viewer, quiero iniciar sesión y conservarla sin reingresar credenciales, para consultar la operación cuando lo necesito._
- **Given** un Viewer con credenciales válidas, **when** envía login, **then** el sistema le entrega JWT access+refresh y lo lleva al dashboard.
- **Given** una sesión activa con access token próximo a expirar, **when** el frontend invoca refresh, **then** el sistema rota tokens sin exigir re-login.
- **Given** credenciales inválidas repetidas, **when** supera el límite de intentos, **then** el sistema bloquea temporalmente el login y lo audita (AuditAction.LOGIN fallido).
- **Notas:** FEATURE-003, Fase 2 · ADR-008 · sin roles: todos los roles comparten este flujo.

**US-006 — Viewer consulta sin modificar (BR-010)**
_Como Viewer, quiero consultar dashboard, cargas, mapa e historial, para monitorear sin riesgo de alterar datos._
- **Given** un Viewer autenticado, **when** abre el listado de cargas, **then** ve datos con paginación y sin acciones de escritura.
- **Given** un Viewer, **when** intenta crear/mover/editar una carga vía API, **then** el backend responde 403 (BR-009) aunque la UI oculte las acciones.
- **Given** un Viewer, **when** abre el detalle de una carga, **then** ve estado, ubicación, fechas, observaciones y timeline (Fase 8).
- **Notas:** FEATURE-004, FEATURE-006, FEATURE-020 · matriz §8.

**US-011 — Listar cargas con filtros básicos**
_Como Viewer, quiero filtrar el listado por código/estado/ubicación y paginar, para encontrar información sin conocer el código exacto._
- **Given** un listado con más de 25 cargas, **when** aplico un filtro por estado, **then** el sistema devuelve solo las coincidencias con meta de paginación (§10).
- **Given** un filtro sin resultados, **when** consulto, **then** el sistema muestra el estado vacío con mensaje accionable.
- **Notas:** FEATURE-006, Fase 3 · CargoTable/CargoSearch (§11.4).

**US-028 — Mapa operativo del predio**
_Como Viewer, quiero ver ubicaciones y ocupación sobre el plano, para ubicar mercadería sin depender de consultas a colegas._
- **Given** datos estructurados de mapa y ubicaciones (BR-020), **when** abro el mapa, **then** se renderizan las 17 ubicaciones con su ocupación y leyenda.
- **Given** el mapa renderizado, **when** hago hover/zoom/pan, **then** el sistema responde de forma fluida sin degradación perceptible (~50 ubicaciones).
- **Given** un Viewer usando lector de pantalla, **when** accede al mapa, **then** encuentra la alternativa de listado navegable (WCAG 2.2 AA, §12).
- **Notas:** FEATURE-017, Fase 6 · ADR-006 · ocupación según OQ-009 (resuelta 2026-09-24: unidad efectiva por tipo/override BR-041, umbrales <70/70–90/>90 OQ-046).

**US-031 — Del mapa al detalle de carga**
_Como Viewer, quiero navegar del mapa al detalle de una carga, para investigar sin cambiar de pantalla._
- **Given** el mapa operativo, **when** hago clic en una carga, **then** el sistema navega a su detalle conservando el contexto de zoom al volver.
- **Given** el listado accesible alternativo, **when** selecciono una carga, **then** obtengo el mismo detalle que desde el mapa.
- **Notas:** FEATURE-018, Fase 6.

**US-032 — Resumen operativo (dashboard)**
_Como Viewer, quiero un dashboard con KPIs al ingresar, para priorizar consultas y detectar anomalías._
- **Given** datos operativos reales, **when** ingreso al dashboard, **then** ve cargas por estado, ocupación por ubicación y últimos movimientos consistentes con el backend.
- **Given** el dashboard cargado, **when** no hay alertas ni movimientos, **then** se muestran estados vacíos correctos (no pantallas rotas).
- **Notas:** FEATURE-019, Fase 7 · `GET /api/v1/dashboard` (§10).

**US-040 — Exportar carga a PDF (BR-018)**
_Como Viewer autorizado, quiero exportar el detalle de una carga a PDF, para compartir evidencia con supervisión y aduana._
- **Given** un Viewer con permiso de exportación (según W1-Q8), **when** solicita el PDF de una carga, **then** el backend genera el documento con los datos autorizados y el navegador lo descarga.
- **Given** un Viewer sin permiso, **when** solicita el PDF, **then** el backend responde 403 sin exponer datos (BR-018).
- **Given** una falla del servicio PDF, **when** ocurre el error, **then** la UI muestra error tipado con opción de reintentar (envelope §10).
- **Notas:** FEATURE-024, Fase 10 · caso crítico QA §14 · ADR-013/OQ-005.

**US-046 — Consultar las ubicaciones de una carga (BR-032/040)**
_Como Viewer, quiero ver todas las ubicaciones donde está distribuida una carga (cantidad, porcentaje, fechas, historial), para saber dónde está cada parte de la mercadería._
- **Given** una carga distribuida en N ubicaciones vía `CargoLocation`, **when** consulto su distribución, **then** el sistema lista cada segmento activo con cantidad/unidad, porcentaje, estado, `enteredAt`/`exitedAt` (BR-040).
- **Given** un segmento, **when** consulto su historial, **then** veo los movimientos del segmento (alta/ajustes/egreso, BR-008/039).
- **Given** una ubicación inexistente o segmento inexistente, **when** consulto, **then** el backend responde 404 `CARGO_LOCATION_NOT_FOUND`.
- **Notas:** FEATURE-028, Fase 4–5 · `GET /api/v1/cargos/:id/locations` (§10) · semántica de `percentage` según OQ-045.

**US-047 — Consultar cargas y ocupación de una ubicación (BR-033/035/040)**
_Como Viewer, quiero ver las cargas de una ubicación con ocupación total, disponible y alertas, para saber si hay espacio para nuevas descargas._
- **Given** una ubicación con N cargas, **when** consulto sus cargas, **then** veo cantidad por unidad, `occupiedCapacity`/`availableCapacity` derivados (BR-033/035) y alertas de la ubicación.
- **Given** cargas con permanencia cercana a 30 días, **when** consulto, **then** el listado las marca como próximas a 30 días (BR-040/014).
- **Notas:** FEATURE-028, Fase 4–5 · `GET /api/v1/locations/:id/cargos` y `/capacity` (§10) · seed Sector 4: 80/100 m².

**US-048 — Panel de distribución en detalle de carga y de ubicación (BR-032/033/040)**
_Como Viewer, quiero un panel de distribución en el detalle de la carga y de la ubicación, para ver la foto completa sin cambiar de pantalla._
- **Given** el detalle de una carga, **when** abro su panel de distribución, **then** veo segmentos, porcentajes, fechas e historial (BR-040).
- **Given** el detalle de una ubicación, **when** abro su panel, **then** veo cargas, ocupación, residual y alertas (BR-033/040).
- **Given** los datos del backend, **when** el panel se carga, **then** los valores son coherentes con la API (sin cálculo local divergente).
- **Notas:** FEATURE-028, Fase 4–5 · DistributionPanel (§11.4).

### 5.2 Operator (operación diaria)

**US-008 — Crear carga (caso crítico)**
_Como Operator, quiero registrar una carga con su código alfanumérico y fecha de ingreso, para tener trazabilidad desde el ingreso._
- **Given** un Operator autenticado con permiso `cargo.create`, **when** completa alta con código válido y fecha de ingreso, **then** la carga se crea en `REGISTERED` con `entryDate` y se muestra su detalle con auditoría CREATE.
- **Given** un formulario de alta, **when** el código está vacío, **then** el sistema rechaza con 422 y mensaje claro (BR-001).
- **Given** un código ya registrado según las reglas de unicidad (OQ-001), **when** intento el alta, **then** el sistema rechaza con 409 sin crear duplicados (BR-002).
- **Given** el alta exitosa, **when** consulto el listado, **then** la carga aparece con estado inicial y sin ubicación/`IN_TRUCK` según el flujo elegido.
- **Notas:** FEATURE-005, Fase 3 · código = string §4.4-1 · caso crítico QA §14.

**US-009 — Rechazo de carga duplicada o sin código**
_Como Operator, quiero errores claros al registrar cargas inválidas, para no generar registros corruptos._
- **Given** un código repetido, **when** se valida el alta, **then** el backend rechaza con 409 y el error llega tipado al formulario (BR-002).
- **Given** un alta sin observación, **when** intento registrarla, **then** el sistema la exige con 422 (BR-006: observación **obligatoria siempre**, incluido el alta — OQ-022).
- **Notas:** FEATURE-005, Fase 3 · OQ-001 resuelta (2026-09-23 → BR-002): códigos con regex canónica; la edición del código post-registro queda como residual local W1-Q14.

**US-010 — Consultar detalle de carga**
_Como Operator, quiero ver estado, ubicación, fechas y observaciones de una carga, para tomar decisiones operativas informadas._
- **Given** una carga con movimientos, **when** abro su detalle, **then** veo estado actual, ubicación actual, `entryDate`, camión asociado y observaciones (timeline en Fase 8).
- **Given** una carga en `IN_TRUCK` en Plazoleta, **when** reviso el detalle, **then** el estado y la ubicación se muestran por separado (§4.4-2).
- **Notas:** FEATURE-006, Fase 3 · CargoDetail.

**US-013 — Nota de carga sin movimiento**
_Como Operator, quiero documentar novedades menores en una carga sin generar movimiento, para mantener el contexto sin contaminar el historial de ubicaciones._
- **Given** una carga existente, **when** agrego una observación sin elegir destino, **then** la nota se persiste vinculada a `cargoId` y aparece en el detalle sin crear un Movement.
- **Given** mi rol es Viewer, **when** intento agregar una nota, **then** el backend responde 403 (BR-009).
- **Notas:** FEATURE-008, Fase 3 · Observation.movementId NULL (§4.1).

**US-014 — Registrar camión**
_Como Operator, quiero registrar un camión con patente y datos básicos, para vincularlo a las cargas que ingresan._
- **Given** un Operator, **when** registra un camión con patente y datos opcionales, **then** el camión queda activo y auditado (CREATE).
- **Given** una patente ya registrada, **when** intento duplicar, **then** el sistema rechaza con 409.
- **Given** un camión con cargas activas asociadas, **when** un Admin intenta eliminarlo, **then** el sistema lo rechaza (BR-024 [PROPUESTA]) o exige desasociar antes.
- **Notas:** FEATURE-009, Fase 3 · Truck §4.1 · OQ-003.

**US-015 — Asociar cargas a un camión**
_Como Operator, quiero asociar una o varias cargas a un camión, para saber qué transporta cada vehículo en el ingreso._
- **Given** un camión registrado y una carga en estado válido para transporte, **when** la asocio, **then** la carga queda vinculada (`truckId`) sin cambiar de ubicación física.
- **Given** una carga ya asociada a otro camión, **when** intento asociarla a un segundo, **then** el sistema rechaza (una carga en un solo camión, §4.4-6).
- **Given** la asociación, **when** consulto el camión, **then** veo la lista de cargas que transporta.
- **Notas:** FEATURE-010, Fase 3 · OQ-003 (resuelta 2026-09-24: un camión transporta N cargas, de clientes distintos o iguales).

**US-018 — Ver ocupación antes de mover (capacidad, caso crítico)**
_Como Operator, quiero conocer la ocupación de cada ubicación antes de mover, para elegir destinos con espacio disponible._
- **Given** una ubicación con capacidad configurada (unidad por OQ-041), **when** la consulto, **then** veo ocupación derivada `occupiedCapacity`/`availableCapacity` en el indicador (CapacityIndicator).
- **Given** una ubicación con `capacityUnit = UNLIMITED` o `capacity = 0`, **when** consulto su ocupación, **then** el indicador no aplica tope.
- **Given** un destino a capacidad completa, **when** intento mover una carga, **then** el backend rechaza (BR-005) y la UI justifica el rechazo (caso crítico QA §14).
- **Notas:** FEATURE-012, Fase 4 · OQ-009/OQ-014 (resueltas 2026-09-24: la Plazoleta cuenta camiones — UNITS; Sector/Galpón AREA, BR-041).

**US-019 — Mover carga entre ubicaciones (caso crítico)**
_Como Operator, quiero mover una carga registrando el motivo, para que el mapa y el historial reflejen la operación real._
- **Given** una carga existente y una transición válida (§7), **when** muevo la carga con observación, **then** el backend valida (BR-003/004/005/006/008/016), persiste el movimiento y actualiza ubicación/ocupación.
- **Given** una carga inexistente, **when** intento moverla, **then** el sistema responde 404/422 (BR-003).
- **Given** un destino en `INACTIVE`/`MAINTENANCE`, **when** intento mover, **then** el sistema rechaza (BR-004).
- **Given** un destino a capacidad completa, **when** intento mover, **then** el sistema rechaza sin exceder la capacidad (BR-005, caso crítico QA §14).
- **Given** un movimiento sin observación, **when** confirmo, **then** el sistema rechaza con 422 (BR-006, caso crítico QA §14).
- **Notas:** FEATURE-013, Fase 5 · máquina de estados §7 · `POST /api/v1/cargos/:id/movements`.

**US-020 — Descarga parcial**
_Como Operator, quiero registrar una descarga parcial con cantidad, para reflejar el progreso sin completar el almacenamiento._
- **Given** una carga en camión (ingreso/plazoleta), **when** registro descarga parcial con cantidad y observación, **then** la carga pasa a `PARTIALLY_UNLOADED` con `quantityMoved` registrado.
- **Given** `quantityMoved` acumulado, **when** la suma supera `quantity`, **then** el sistema rechaza (BR-027 [PROPUESTA]).
- **Given** el modelo de carga (OQ-002 resuelta: sin CargoItem en v1, distribución vía `CargoLocation`), **when** se implementa esa distribución, **then** estos criterios se ajustan sin cambiar la historia.
- **Notas:** FEATURE-013, Fase 5 · §4.4-5, OQ-002.

**US-021 — Descarga total y almacenamiento en sector**
_Como Operator, quiero registrar la descarga total y ubicar la carga en un sector, para que quede almacenada._
- **Given** una carga en plazoleta lista para almacenar, **when** registro descarga total hacia un sector con capacidad, **then** la carga pasa a `STORED` con ubicación final y ocupación actualizada.
- **Given** la descarga total, **when** consulto el historial, **then** el movimiento UNLOAD aparece con su observación (BR-008).
- **Notas:** FEATURE-013, Fase 5 · MovementKind.UNLOAD (§4.3).

**US-022 — Llevar carga al Scanner**
_Como Operator, quiero enviar una carga al área de Scanner, para que pase el control documental/técnico._
- **Given** una carga almacenada o en revisión elegible, **when** la muevo al Scanner con observación, **then** queda en `IN_REVIEW` en la ubicación SCANNER, con historial.
- **Given** el control terminado, **when** la retiro del Scanner hacia un sector, **then** la transición es válida según §7 y se registra otro movimiento.
- **Notas:** FEATURE-014, Fase 5 · TO_SCANNER (§4.3).

**US-023 — Llevar carga a la Balanza**
_Como Operator, quiero enviar una carga a la Balanza, para registrar su peso en el proceso de control._
- **Given** una carga elegible, **when** la muevo a la Balanza con observación, **then** queda en `IN_REVIEW` y el peso se almacena en metadata del movimiento.
- **Given** el pesaje, **when** se registra el peso, **then** el dato es consultable en el detalle/dashboard sin entidad nueva en v1.
- **Notas:** FEATURE-014, Fase 5 · TO_BALANZA (§4.3) · metadata JSONB (§4.1).

**US-024 — Pasar carga a Secuestro (rol según W1-Q5)**
_Como Operator (si W1-Q5 lo habilita) o Admin, quiero mover una carga a Secuestro, para acotar mercadería bajo restricción._
- **Given** una carga con `IN_REVIEW` u otro estado elegible, **when** la muevo a Secuestro con motivo observado, **then** pasa a `SECUESTRO` con historial y auditoría.
- **Given** un rol sin permiso, **when** intenta mover a Secuestro, **then** el backend responde 403 (BR-009).
- **Notas:** FEATURE-014, Fase 5 · W1-Q5 **resuelta** (OQ-030 → BR-046, 2026-09-23: exclusivo ADMIN).

**US-025 — Observación obligatoria (caso crítico)**
_Como Operator, quiero que cada movimiento exija motivo, para que el historial explique los porqués._
- **Given** un movimiento sin observación, **when** intento confirmarlo, **then** el backend rechaza con 422 (BR-006/007) y la UI enfoca el campo obligatorio (caso crítico QA §14).
- **Given** una observación de solo espacios, **when** intento confirmar, **then** el sistema la invalida (BR-031 [PROPUESTA]).
- **Given** una observación válida, **when** confirmo el movimiento, **then** se persiste la relación Movement 1:1 Observation (§4.2) y es visible en el historial.
- **Notas:** FEATURE-015, Fase 5 · ObservationDialog (§11.4) · mitigación de fricción R-04 del PRD.

**US-026 — Motivos reutilizables en observaciones**
_Como Operator, quiero preseleccionar motivos comunes al observar, para documentar más rápido con menos fricción._
- **Given** el diálogo de observación, **when** selecciono un motivo del catálogo, **then** se completa el texto base y puedo ajustarlo libremente.
- **Given** la decisión W1-Q1 (enum completo vs MOVE + razones tipadas), **when** se resuelve, **then** el catálogo se persiste según el modelo elegido.
- **Notas:** FEATURE-015, Fase 5 · W1-Q1.

**US-033 — Alertas en el dashboard**
_Como Operator, quiero ver las alertas abiertas en el dashboard y acceder a la carga, para atender rezagos a tiempo._
- **Given** una alerta `STALE_30D` OPEN, **when** abro el dashboard, **then** veo la alerta y puedo navegar a la carga.
- **Given** una alerta, **when** la abro, **then** veo permanencia, días transcurridos y el flujo sugerido sin acción automática (BR-014).
- **Notas:** FEATURE-019/022, Fases 7–9.

**US-037 — Detección de permanencia > 30 días (caso crítico)**
_Como Operator, quiero que el sistema detecte cargas con más de 30 días, para actuar antes de que el rezago se acumule._
- **Given** una carga con `entryDate` hace más de 30 días (OQ-008 resuelta 2026-09-23: días **corridos**), **when** corre el job de alertas, **then** se genera una alerta `STALE_30D` OPEN sin mover la carga (BR-014).
- **Given** el job corriendo varias veces, **when** la alerta ya existe, **then** no se duplica (idempotencia, BR-026 [PROPUESTA]).
- **Given** la alerta generada, **when** consulto el dashboard o la carga, **then** la alerta es visible (§9).
- **Notas:** FEATURE-022, Fase 9 · caso crítico QA §14 · OQ-008 (base y días) · OQ-007 (job).

**US-039 — Gestionar ciclo de vida de alertas**
_Como Operator, quiero reconocer, resolver o descartar alertas, para dejar registro de la gestión._
- **Given** una alerta OPEN, **when** la reconozco, **then** pasa a ACKNOWLEDGED con usuario y fecha.
- **Given** una alerta gestionada, **when** se resuelve la causa, **then** puedo pasarla a RESOLVED o DISMISSED según corresponda (§4.3).
- **Given** un rol sin permiso para resolver, **when** intenta cambiar el estado, **then** el backend responde 403.
- **Notas:** FEATURE-023, Fase 9 · AlertCard (§11.4).

**US-034 — Historial reconstructible de una carga**
_Como Operator, quiero ver el timeline completo de una carga, para explicar qué pasó y por qué a supervisión._
- **Given** una carga con N movimientos, **when** abro el historial, **then** veo los N movimientos en orden cronológico reverso con estado, ubicación, usuario y observación (BR-008).
- **Given** una reversión registrada, **when** reviso el timeline, **then** aparece como movimiento REVERSION sin borrar el original (BR-012).
- **Given** un Viewer, **when** consulta el historial, **then** puede leerlo sin modificar nada (BR-010).
- **Notas:** FEATURE-020, Fase 8 · MovementTimeline.

**US-049 — Movimiento parcial de una carga entre ubicaciones (BR-037)**
_Como Operator, quiero mover parte de una carga (cantidad o porcentaje) entre ubicaciones, para reflejar distribuciones parciales reales._
- **Given** un segmento origen con residual disponible, **when** muevo una cantidad (o porcentaje) a un destino con capacidad, **then** se ajustan los segmentos origen/destino y se registra el movimiento con observación e historial (BR-037/006/008/039).
- **Given** una cantidad mayor al residual del segmento origen, **when** intento mover, **then** el backend rechaza con `BUSINESS_RULE_VIOLATION` (rule BR-037).
- **Given** unidades incompatibles con el destino, **when** intento mover, **then** el backend rechaza con 422 `UNIT_INCOMPATIBLE` (BR-035).
- **Given** un movimiento que superaría el total de la carga, **when** confirmo, **then** el backend rechaza con 409 `DISTRIBUTION_EXCEEDS_TOTAL` (BR-034).
- **Notas:** FEATURE-029, Fase 5 · §4.2 (Movement vincula CargoLocation origen/destino) · seed 029TERRA26 MOVE 20 m² · unidades según OQ-044.

**US-050 — Descarga parcial con residual en camión (BR-038)**
_Como Operator, quiero registrar descargas parciales que dejen mercadería en el camión, para reflejar el progreso real de descarga._
- **Given** una carga `IN_TRUCK` con residual en camión, **when** descargo parcialmente hacia una o más ubicaciones, **then** el residual en camión queda = `totalQuantity − Σ CargoLocation` activos y se registra el movimiento (BR-038).
- **Given** una descarga que excede el residual, **when** confirmo, **then** el backend rechaza con 409 `DISTRIBUTION_EXCEEDS_TOTAL` (BR-034).
- **Given** residual mayor a cero, **when** consulto la carga, **then** el estado es `PARTIALLY_UNLOADED`; al llegar a cero pasa a `STORED` (§7).
- **Notas:** FEATURE-029, Fase 5 · DECISIÓN PENDIENTE OQ-042 → **resuelta (BR-042, MASTER-SPEC v0.3: residual derivado; el camión NO es Location)** · seed 036TERRA26 (camión 40 % → Sector 4 60 % → Sector 5 40 %).

**US-051 — Capacidad por unidad y rechazo de sobreocupación (BR-005/033/035/036)**
_Como Operator, quiero que la capacidad se mida por unidad (ocupado/disponible) y que el sistema rechace superarla, para no comprometer la operación del depósito._
- **Given** una ubicación con capacidad y unidad configuradas, **when** consulto su ocupación, **then** veo `occupiedCapacity`/`availableCapacity` con su unidad (BR-033/035).
- **Given** un destino a capacidad completa y sin flag de sobreocupación, **when** intento mover o distribuir, **then** el backend rechaza con 409 `CAPACITY_EXCEEDED` (BR-005/036).
- **Given** unidades incompatibles con la capacidad de la ubicación, **when** intento distribuir, **then** el backend rechaza con 422 `UNIT_INCOMPATIBLE` (BR-035).
- **Notas:** FEATURE-030, Fase 4–5 · unidad por defecto por LocationType según OQ-041 · seed Sector 4: 80/100 m².

**US-053 — Alerta de capacidad derivada (BR-033/036)**
_Como Operator, quiero alertas cuando una ubicación se acerca a su capacidad, para anticipar saturación._
- **Given** una ubicación cuyo `occupiedCapacity` supera el umbral configurado (p. ej. 90 %), **when** corre el cálculo de alertas, **then** se genera una alerta `CAPACITY` basada en el valor derivado (BR-033, §9).
- **Given** la alerta generada, **when** consulto el dashboard o la ubicación, **then** la alerta es visible y navega a la ubicación.
- **Given** sobreocupación sin flag (BR-036), **when** se analiza la ubicación, **then** la alerta refleja el estado sin bloquear la operación administrativa (gobernanza según OQ-043).
- **Notas:** FEATURE-030, Fase 9 (integración EPIC-010) · AlertType.CAPACITY §4.3.

### 5.3 Admin (administración y corrección)

**US-016 — Gestionar ubicaciones**
_Como Admin, quiero crear/editar/desactivar ubicaciones, para reflejar la configuración real del depósito._
- **Given** un Admin, **when** crea/edita una ubicación, **then** el cambio se persiste y audita; los demás roles solo consultan.
- **Given** una ubicación en uso o con carga adentro, **when** intento desactivarla, **then** el sistema previene el cambio o exige mover las cargas primero (BR-023 [PROPUESTA], BR-004).
- **Given** una actualización de ubicación, **when** se persiste, **then** el mapa la refleja al recargar (BR-020).
- **Notas:** FEATURE-011, Fase 4 · LocationType §4.3 · BR-011/012.

**US-017 — Configurar capacidad de ubicaciones**
_Como Admin, quiero definir el tipo y valor de capacidad de cada ubicación, para que el control de ocupación sea real._
- **Given** una ubicación, **when** configuro `capacity` y `capacityUnit` (según OQ-041), **then** el `occupiedCapacity` derivado usa esa configuración.
- **Given** un cambio de capacidad, **when** se guarda, **then** se audita (AuditAction.CAPACITY_CHANGE).
- **Given** una ubicación con `UNLIMITED`, **when** se configuran movimientos, **then** no se aplica tope de capacidad.
- **Notas:** FEATURE-012, Fase 4 · Capacidad por unidad (QuantityUnit) §4.3 · OQ-041/OQ-044.

**US-027 — Revertir un movimiento (caso crítico)**
_Como Admin, quiero revertir un movimiento erróneo conservando el historial, para corregir sin destruir evidencia._
- **Given** un movimiento erróneo, **when** un Admin lo revierte con observación, **then** se inserta un movimiento REVERSION que restaura estado/ubicación previos sin borrar el original (BR-012, caso crítico QA §14).
- **Given** una reversión, **when** se persiste, **then** queda auditada (AuditAction.REVERT) y el timeline muestra original + reversión.
- **Given** un Operator, **when** intenta revertir, **then** el backend responde 403 (BR-011).
- **Given** el alcance de reversión (W1-Q2: último movimiento o cualquiera), **when** se resuelve la decisión, **then** los criterios se ajustan sin cambiar la historia.
- **Notas:** FEATURE-016, Fase 5 · reversionOfId (§4.1) · ADR-010/011 · W1-Q2.

**US-035 — Consultar auditoría**
_Como Admin, quiero filtrar el registro de auditoría por entidad/acción/usuario/fecha, para investigar incidencias._
- **Given** eventos auditados, **when** consulto `GET /api/v1/audit` con filtros, **then** obtengo resultados paginados y ordenados.
- **Given** un rol distinto de Admin, **when** intenta consultar la auditoría, **then** el backend responde 403.
- **Given** eventos de sesión, **when** reviso la auditoría, **then** IP/userAgent aparecen acotados según privacidad (BR-017).
- **Notas:** FEATURE-021, Fase 8 · ADR-010.

**US-036 — Auditoría automática de acciones sensibles**
_Como Admin, quiero que acciones críticas (create/update/delete/move/revert/permission_change) queden auditadas solas, para tener evidencia confiable._
- **Given** cualquier acción sensible, **when** se ejecuta, **then** se registra AuditLog con actor, entidad, timestamp y valores previos/nuevos (BR-013).
- **Given** una eliminación, **when** se realiza, **then** es soft delete + auditoría, nunca borrado silencioso (BR-013).
- **Notas:** FEATURE-021, Fase 8 · AuditAction §4.3.

**US-038 — Decisión humana de pasar a Rezago (caso crítico)**
_Como Admin, quiero decidir manualmente si una carga alertada pasa a Rezago, para que ninguna acción sea automática._
- **Given** una alerta `STALE_30D` OPEN, **when** un Admin/Operator autorizado decide mover la carga a Rezago, **then** se registra un movimiento TO_REZAGO con observación obligatoria y la alerta se resuelve (BR-014).
- **Given** una carga con permanencia alta, **when** corre el job, **then** el sistema jamás la mueve automáticamente (BR-014).
- **Given** el paso a Rezago, **when** consulto el historial, **then** veo el movimiento con su motivo y actor.
- **Notas:** FEATURE-022, Fase 9 · caso crítico QA §14 · UC-010 de USE-CASES · OQ-008.

**US-042 — Editar el plano del predio (caso crítico)**
_Como Admin, quiero mover, redimensionar y configurar las ubicaciones en el plano, para reflejar el layout real._
- **Given** el modo editor (OQ-015), **when** arrastro/redimensiono una ubicación con snap a grid, **then** la posición se actualiza en el borrador sin afectar el plano publicado.
- **Given** el panel de propiedades, **when** edito nombre/código/tipo/capacidad/color/estado, **then** los cambios se validan y quedan en el borrador.
- **Given** un Operator, **when** intenta editar el plano, **then** el backend responde 403 (BR-011).
- **Notas:** FEATURE-025, Fase 11 · caso crítico QA §14 · BR-020 · ADR-006 · OQ-015.

**US-043 — Guardar plano con preview y auditoría**
_Como Admin, quiero previsualizar antes de guardar y dejar auditoría, para no romper el mapa operativo sin rastro._
- **Given** cambios en el borrador del plano, **when** solicito preview, **then** veo el resultado antes de persistir.
- **Given** el preview aprobado, **when** guardo, **then** se persiste vía `PATCH /api/v1/maps/:id` con versión incrementada y auditoría MAP_EDIT.
- **Given** el guardado, **when** abro el mapa de vista, **then** refleja los cambios sin reiniciar la app (PHASES P11-H4).
- **Notas:** FEATURE-025, Fase 11 · Map/MapElement §4.1.

**US-044 — Configurar parámetros operativos**
_Como Admin, quiero ajustar parámetros como los días de la alerta de rezago, para adaptar el sistema al negocio._
- **Given** los defaults canónicos (30 días, base `entryDate`, BR-014/015), **when** se aplica la resolución de OQ-008 (2026-09-23: días corridos, segunda alerta a 40), **then** los parámetros pasan a configurables con los valores decididos.
- **Given** un cambio de parámetro, **when** se guarda, **then** queda auditado y con historial.
- **Given** un rol no ADMIN, **when** intenta modificarlos, **then** el backend responde 403.
- **Notas:** FEATURE-026, Fase 11 · módulo `settings` (§11.3) · OQ-008.

**US-045 — Administrar usuarios y roles**
_Como Admin, quiero crear usuarios y asignarles rol, para que cada persona acceda según su función._
- **Given** un Admin, **when** crea un usuario y le asigna Viewer/Operator/Admin, **then** el usuario queda activo con los permisos del bundle (§8) y el cambio se audita (PERMISSION_CHANGE).
- **Given** un usuario desactivado, **when** intenta iniciar sesión, **then** el sistema lo rechaza.
- **Given** una asignación de rol, **when** cambia de rol, **then** los permisos efectivos cambian de inmediato en backend (BR-009).
- **Notas:** FEATURE-027, Fase 11 · sin multi-tenant (PRD §7.2).

**US-052 — Sobreocupación administrativa con flag (BR-036)**
_Como Admin, quiero autorizar sobreocupación puntual con flag y auditoría, para cubrir excepciones operativas sin perder trazabilidad._
- **Given** una ubicación con flag `allowOverOccupation` activo, **when** un usuario autorizado mueve o distribuye superando la capacidad, **then** la operación procede con auditoría (`metadata.overOccupation = true`) y observación (BR-036).
- **Given** una ubicación sin flag, **when** se intenta superar la capacidad, **then** el backend rechaza con 409 `CAPACITY_EXCEEDED` (BR-005/036).
- **Given** la decisión OQ-043 (límite de %, rol autorizante, ¿observación obligatoria?), **when** se resuelve, **then** estos criterios se ajustan sin cambiar la historia.
- **Notas:** FEATURE-030, Fase 4–5 · DECISIÓN PENDIENTE OQ-043 → **resuelta (BR-036 ampliada, 2026-09-24: flag `allowOverOccupation`, +10% default, solo ADMIN, observación y auditoría)** · AuditAction `CAPACITY_CHANGE`/`MOVE`.

## 6. Criterios de aceptación del documento

- [ ] Cada historia está escrita "Como [rol], quiero [acción], para [beneficio]" con criterios Given/When/Then verificables.
- [ ] Cubre los tres roles de §8 y los casos críticos de QA §14 (crear, mover, sin observación, capacidad, permisos, reversión, 30 días, PDF, plano) más la distribución M:N (BR-032…040, US-046…053).
- [ ] Las historias referencian IDs del backlog y reglas BR sin inventar reglas nuevas.
- [ ] Las OQ/W1-Q afectadas se declaran en la sección DECISIÓN PENDIENTE.

## 7. Archivos involucrados

| Archivo | Rol |
| --- | --- |
| `docs/MASTER-SPEC.md` | Roles §8, estados §7, BR §6 |
| `docs/product/PRODUCT-BACKLOG.md` | IDs US-xxx, prioridades, fases |
| `docs/product/USE-CASES.md` | Flujos UC que implementan varias historias |
| `docs/product/BUSINESS-RULES.md` | Reglas invocadas en los criterios |
| `docs/OPEN-QUESTIONS.md` | OQ-001…016 + pendientes W1 |

## 8. Riesgos

| # | Riesgo | Impacto | Mitigación |
| --- | --- | --- | --- |
| USK-01 | Criterios que asumen defaults (30 días, capacidad por unidades, código con case-sensitive) | Historias inválidas si OQ cambia | Declaración de dependencia en cada historia afectada; revisión al resolver OQ-001/008/009 |
| USK-02 | GWT redactados contra comportamiento futuro del editor de planos (OQ-015) | US-042/043 no implementables si no hay editor en v1 | Alternativa documentada: vista estática + edición asistida (PRD R-06) |
| USK-03 | Secuestro con rol dudoso (W1-Q5) | Tests de permisos contradictorios | Criterio escrito con "según W1-Q5"; QA lo parametriza tras la decisión |
| USK-04 | Criterios de distribución (US-046…053) dependen de OQ-041…045 (unidad por defecto, camión/Location, sobreocupación, conversión, `percentage`) | Historias inválidas si cambian los defaults | Declaración de dependencia en cada historia afectada; revisar al resolver cada OQ |
| USK-05 | Códigos de error nuevos de BR-032…040 (`DISTRIBUTION_EXCEEDS_TOTAL`, `UNIT_INCOMPATIBLE`, `CARGO_LOCATION_NOT_FOUND`) no registrados aún en ERROR-HANDLING (W5) | GWT citan códigos no catalogados | Reportar a W5 antes de FASE 1 |

## 9. DECISIÓN PENDIENTE

| # | Pregunta | Impacto | Referencia |
| --- | --- | --- | --- |
| USQ-01 | ~~Reglas exactas de unicidad del código (¿case-sensitive? ¿normalización?)~~ → **RESUELTA (OQ-001 → BR-002, 2026-09-23)**: regex `^[A-Z0-9][A-Z0-9./-]{2,31}$`, normalizado a mayúsculas, único case-insensitive, longitud 3–32 | US-008/US-009 | OQ-001 (resuelta) |
| USQ-02 | Modelo de carga parcial (unidad simple vs CargoItem) → **RESUELTA (secciones 62-70)**: distribución vía `CargoLocation`; CargoItem no v1 | US-020 | OQ-002 (resuelta) |
| USQ-03 | ~~Egreso/retiro en v1 (EXITED)~~ → **RESUELTA (OQ-004 → BR-043, 2026-09-23)**: sí — movimiento `EXIT` con observación obligatoria, remito/documentación opcionales, `EXITED` terminal | Ciclo de vida (no cubierto en estas historias) | OQ-004 (resuelta) |
| USQ-04 | ~~Días corridos/hábiles y segunda alerta~~ → **RESUELTA (OQ-008 → BR-014/015, 2026-09-23)**: días **corridos**, base `entryDate`, alerta a los 30 días y segunda a los 40 | US-037/US-039/US-044 | OQ-008 (resuelta) |
| USQ-05 | ~~Tipo de capacidad y fórmula de ocupación; ¿la Plazoleta cuenta camiones?~~ → **RESUELTA (OQ-009 vía BR-041 y OQ-046 + OQ-014, 2026-09-23/24)**: unidad efectiva por LocationType/override (BR-041); Sector/Galpón → AREA, Plazoleta → **UNITS (camiones)**; ocupación = Σ segmentos ACTIVE en unidad compatible (BR-033); umbrales <70/70–90/>90 | US-018/US-028/US-032 | OQ-009/OQ-014 (resueltas) |
| USQ-06 | ¿Reversión solo del último movimiento o de cualquiera? | US-027 | 🔶 Residual local (W1-Q2; sin OQ) |
| USQ-07 | ~~¿Operator mueve a Secuestro o solo ADMIN?~~ → **RESUELTA (W1-Q5 → OQ-030 → BR-046, 2026-09-23)**: **solo ADMIN** (`cargo.to_secuestro`) | US-024 | OQ-030 → BR-046 (resuelta) |
| USQ-08 | MovementKind v1: enum completo vs MOVE + razones tipadas | US-026, contratos API | 🔶 Residual local (W1-Q1; MASTER-SPEC §4.3) |
| USQ-09 | ¿PDF solo detalle de carga o también listados? | US-040 | 🔶 Residual local (W1-Q8; sin OQ) |
| USQ-10 | Ratificación de BR-021…BR-031 [PROPUESTA] citadas en criterios | Varias historias | 🔶 Residual local (W1; BUSINESS-RULES.md) |
| USQ-11 | ~~Unidad de capacidad por defecto por LocationType y gobernanza~~ → **RESUELTA (OQ-041 → BR-041, 2026-09-23)**: default por tipo (Sector/Galpón AREA, Plazoleta UNITS) con override por ubicación | US-051, US-053 | OQ-041 (resuelta) |
| USQ-12 | ~~¿El camión se modela como Location o el residual es derivado?~~ → **RESUELTA (OQ-042 → BR-042, MASTER-SPEC v0.3)**: residual derivado `inTruckAmount`/`inTruckUnit`; fila informativa, nunca nodo de mapa | US-050 | OQ-042 (resuelta) |
| USQ-13 | ~~Sobreocupación administrativa: flag, % extra, rol, ¿observación?~~ → **RESUELTA (OQ-043 → BR-036 ampliada, 2026-09-24)**: `allowOverOccupation`, límite default **+10%**, **solo ADMIN**, observación obligatoria + auditoría `CAPACITY_CHANGE` | US-051, US-052 | OQ-043 (resuelta) |
| USQ-14 | ~~Conversión de unidades en movimientos parciales~~ → **RESUELTA (OQ-044 → BR-048, 2026-09-24)**: **sin conversión en v1** — unidades compatibles o `PERCENT`; `UNIT_INCOMPATIBLE` 422 | US-049, US-050 | OQ-044 (resuelta) |
| USQ-15 | ~~Semántica de `percentage` en CargoLocation (¿autoritativo o derivado?)~~ → **RESUELTA (OQ-045 → BR-049, 2026-09-24)**: `quantity`+`quantityUnit` autoritativas; `percentage` **derivado de UI** e informativo (input solo si unidad `PERCENT`) | US-046, US-048 | OQ-045 (resuelta) |

Todas fueron reportadas al orquestador para su incorporación a `OPEN-QUESTIONS.md`.