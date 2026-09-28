# CargoOps — Notificaciones (NOTIFICATIONS.md)

> Grupo W2 · Arquitectura · Fuente de verdad: `docs/MASTER-SPEC.md` §4.1 (Notification), §4.3 (NotificationChannel), §6 BR-019 (desacople de proveedores), §9 (alertas → notificaciones).
> Estado: borrador FASE 0 (documentación). Define la abstracción de notificaciones que implementará el módulo `notifications` (MODULES.md §5.14).

## 1. Objetivo

Definir la abstracción de notificaciones de CargoOps: la interfaz `NotificationProvider` (canal `IN_APP` en v1; canales reservados EMAIL/PUSH/WHATSAPP/WEBHOOK), la entidad `Notification`, los casos v1 (alerta de rezago, capacidad), las reglas de generación y lectura, el desacople del proveedor (BR-019) y el modelo de expansión a canales múltiples sin reescritura.

## 2. Contexto

MASTER-SPEC §9 define el ciclo de alertas: detección de permanencia > 30 días → alerta `STALE_30D` → visualización en Dashboard y en la carga → revisión y decisión humana (nunca movimiento automático, BR-014). La notificación es el **aviso operativo** de esas alertas (y de otros eventos futuros). El modelo canónico define `Notification { id, userId, type, channel (IN_APP | futuro EMAIL/PUSH/WHATSAPP/WEBHOOK), title, body, data JSONB, readAt, createdAt }` (MASTER-SPEC §4.1) y BR-019 exige que las notificaciones estén **desacopladas de proveedores** (una abstracción, no SDKs hardcodeados). El alcance v1 es solo `IN_APP` (OQ-011): la entidad vive en `notifications` (módulo esencial mínimo, MODULES.md §5.14) con endpoints `GET /notifications` y `PATCH /notifications/:id/read` (API.md §9.4).

## 3. Restricciones

- **v1 = canal IN_APP únicamente** (OQ-011): EMAIL/PUSH/WHATSAPP/WEBHOOK son **reservados**, no implementados y **no son valores de enum de DB en v1** (se agregan al enum cuando exista proveedor real; DATABASE.md §5.5 — no acoplar el esquema).
- **BR-019**: el dominio no conoce proveedores concretos; se comunica con la interfaz `NotificationProvider`. Agregar un canal no toca los módulos emisores.
- **No bloqueante transaccional**: la escritura de `Notification` es parte del flujo que la genera (misma transacción si es IN_APP — barato); el dispatch a canales externos (futuro) corresponde a jobs (ADR-012), nunca dentro de la transacción crítica de movimiento.
- **Sin preferencias en v1**: la tabla `notification_preferences` es futura (DATABASE.md §11 D7 pendiente); en v1 no hay configuración de canales por usuario.
- **Los movimientos críticos no dependen de notificaciones**: son avisos operativos, no mecanismo de confirmación (MASTER-SPEC §12; PWA offline no aplica a notificaciones v1).
- FASE 0: solo documentación. Los bloques fenced son ilustrativos.

## 4. Dependencias

- `docs/MASTER-SPEC.md` §4.1 (Notification), §4.3 (NotificationChannel), §6 BR-014/019, §9 (alertas), §10 (endpoints), §18 (fase 9).
- `architecture/ADR/ADR-001` (boundaries: `alerts → notifications` vía servicio público), ADR-012 (jobs para canales futuros — Accepted; OQ-007 resuelta: BullMQ en v1), ADR-007 (REST), ADR-008 (usuarios/roles para destinatarios).
- Hermandos W2: `DATABASE.md` §5.3 (notifications, D7 preferencias), `ARCHITECTURE.md` §5.6 (módulo notifications), `AUTHORIZATION.md` §5.2 (`notification.read`).
- Downstream: `backend/MODULES.md` §5.14 (notifications esencial mínimo), `backend/API.md` §9.4 (contratos), `frontend/COMPONENTS.md` (ToastHost/AlertCard) y `frontend/FRONTEND-ARCHITECTURE.md` §5.3 (notifications.store, toasts + in-app).
- `docs/OPEN-QUESTIONS.md`: OQ-011 (notificaciones in-app v1 — **resuelta**), OQ-007 (jobs — **resuelta**: BullMQ/Redis en v1), OQ-008 (días de alerta — **resuelta**: 30/40 corridos, base `entryDate`), OQ-023 (destinatarios por rol — **resuelta**: ADMIN + OPERATOR).

## 5. Decisiones

### 5.1 Abstracción `NotificationProvider` (BR-019)

El dominio (módulos emisores: `alerts`, `cargo`, futuros) publica eventos de interés y delega el envío al módulo `notifications`, que orquesta los proveedores registrados por canal. Ningún emisor importa un SDK de un proveedor.

```ts
// Ilustrativo (documentación) — interfaz de proveedor, firmada por BR-019
type NotificationChannel = 'IN_APP' | 'EMAIL' | 'PUSH' | 'WHATSAPP' | 'WEBHOOK'; // v1: solo IN_APP

interface NotificationInput {
  userId: string;            // destinatario
  type: NotificationType;    // catálogo §5.3
  title: string;
  body: string;
  data?: Record<string, unknown>; // cargo_id, alert_id, etc.
}

interface NotificationProvider {
  channel: NotificationChannel;
  send(input: NotificationInput): Promise<DeliveryResult>; // IN_APP: insert en Notification
}

// Registro desacoplado (DI de NestJS, ADR-003): el emisor usa NotificationService, no el proveedor
interface NotificationService {
  notify(input: NotificationInput): Promise<void>;   // persiste IN_APP (misma transacción si aplica)
  registerProvider(provider: NotificationProvider): void; // futuro: EMAIL/PUSH/...
}
```

- **v1**: un único proveedor `InAppNotificationProvider` (persistencia en `Notification`). Los canales reservados se modelan en el **código/documentación** (string) para el diseño, sin valores de enum en DB (DATABASE.md §5.5).
- **Fallos**: en v1 el fallo de persistencia IN_APP dentro de la transacción emisora aborta la operación (avisos operativos integrados al flujo transaccional); cuando existan canales externos, el dispatch va por jobs con retry/backoff y dead-letter (ADR-012) — el fallo de un canal externo NUNCA afecta la transacción de negocio ni bloquea otros canales.
- **Idempotencia**: los eventos de negocio llevan un identificador (`data.eventId` o ref. `alert_id` + única deduplicación del dominio — DATABASE.md: única alerta OPEN por cargo+tipo); el proveedor IN_APP no genera duplicados para el mismo evento (ver §5.4).

### 5.2 Entidad `Notification` (coherente con DATABASE.md §5.3)

| Campo | Tipo | Detalle |
| --- | --- | --- |
| `id` | uuid | PK |
| `user_id` | FK → users.id, NOT NULL | Destinatario (un usuario por fila; multi-canal futuro: **una fila por canal**, DATABASE.md §5.3) |
| `type` | varchar(40) | Catálogo §5.3 |
| `channel` | NotificationChannel | v1 siempre `IN_APP` (OQ-011) |
| `title` | varchar(160) | Título corto |
| `body` | text | Cuerpo (límites de longitud según canal futuro) |
| `data` | jsonb | Referencias operativas: `cargo_id`, `alert_id`, `movement_id`… |
| `read_at` | timestamptz NULL | Marcado de lectura |
| `created_at` | timestamptz | |

- Índices: `ix_notifications_user_id_read_at` (bandeja de no leídas) y `ix_notifications_user_id_created_at` (historial) — DATABASE.md §5.3.
- Relación: N:1 User; la relación `Alert → Notification` es vía `data.alert_id` (JSONB) — sin FK (DATABASE.md §5.4), coherente con que una alerta puede alimentar N notificaciones (una por destinatario).
- **Preferencias futuras**: tabla `notification_preferences` (userId, channel, type, enabled) — decisión D7 pendiente (DATABASE.md §11 D7); en v1 no existe tabla (solo el diseño).

### 5.3 Catálogo de tipos v1 (`NotificationType`)

Base coherente con DATABASE.md §5.3 (`ALERT_STALE_30D`, `ALERT_CAPACITY`, `CARGO_EVENT`, `CUSTOM`):

| Tipo | Origen | Contenido | Disponibilidad v1 |
| --- | --- | --- | --- |
| `ALERT_STALE_30D` | Alerta de rezago (BR-014) — generada por el job de detección | Carga con permanencia > 30 días; `data: { cargo_id, alert_id, permanenceDays }` | ✅ v1 (alerta STALE_30D es v1 — MODULES.md §5.10) |
| `ALERT_CAPACITY` | Alerta de capacidad (BR-005) | Ubicación sobre umbral; `data: { location_id, percent, alert_id }` | ⏳ v1.1 (la alerta CAPACITY real es v1.1 — MODULES.md §5.10); el tipo y la plantilla quedan diseñados |
| `CARGO_EVENT` | Eventos operativos de carga (movimiento, cambio de estado) sobre cargas que siguen usuarios | `data: { cargo_id, movement_id }` | 🟡 Opcional v1 (confirmar con §9 N4); no es requisito de MASTER-SPEC §9 |
| `CUSTOM` | Notificaciones administrativas/manuales (SYSTEM/AVISO) | Texto libre + data | ✅ v1 (uso interno, p. ej. avisos de mantenimiento planificado) |

### 5.4 Reglas de generación y lectura

**Generación (emisores → `NotificationService`)**:
- **Alerta de rezago (BR-014)**: el job de detección (alerts, ADR-012/OQ-007) crea la `Alert STALE_30D` (dedupe por cargo+tipo abierto) y encadena la notificación IN_APP a los destinatarios operativos (**OQ-023 resuelta**: ADMIN + OPERATOR, configuración por rol no por usuario en v1; Viewer no recibe por defecto).
- **Alerta de capacidad (BR-005)**: cuando la alerta CAPACITY exista (v1.1), el mismo patrón: creación de alerta → notificación a destinatarios correspondientes.
- **Evento de carga (si se confirma CARGO_EVENT)**: movimiento/estado de una carga seguida genera aviso; definición de «seguimiento» pendiente (no inventar: ver §9).
- **Deduplicación**: una alerta abierta genera UNA notificación por destinatario (la idempotencia del job de alertas + `data.alert_id`); re-generaciones solo al reabrirse una alerta nueva (nueva alerta, nueva notificación).
- **Regla de lectura (v1)**: la notificación IN_APP se persiste en el momento del evento; el destinatario la ve en la bandeja con estado no leída/leída (`read_at`); no existen expiración ni acciones transaccionales desde la notificación (las acciones — resolver alerta, mover carga — se ejecutan en los módulos de dominio con sus permisos y observaciones BR-006/007).

**Consultas (API.md §9.4)**:
- `GET /api/v1/notifications` (query `unreadOnly`, paginación) → `{ data: { items, meta, unreadCount } }` — permiso `notification.read` (datos propios).
- `PATCH /api/v1/notifications/:id/read` → marca `read_at`; solo sobre notificaciones propias (404 si no pertenece al usuario, por diseño de privacidad operativa). «Marcar todas como leídas» no está en el contrato de API.md — propuesta a W5, pendiente (§9).
- Las notificaciones se sirven **desde el backend** (bandeja + `unreadCount` en el header/state); la UI combina banda con toasts (ToastHost) sin duplicar estados (FRONTEND-ARCHITECTURE.md §5.3 `notifications.store`).

### 5.5 Desacople del proveedor en la arquitectura

- **Boundary del monolito (ADR-001)**: `alerts`/`cargo` importan únicamente `NotificationService` (módulo `notifications`); el registro de proveedores es interno del módulo (DI/NestJS). Matriz MODULES.md §6: `alerts → notifications`, `cargo → notifications` (lectura/eventos).
- **Persistencia canal-agnóstica**: la entidad no codifica lógica de un canal (el `channel` es solo clasificación); los datos específicos de canal futuro (template params, recipients) van en `data`.
- **Plantillas por canal**: v1 el texto (`title`/`body`) se genera en el dominio emisor o en el propio módulo; con canales externos, las plantillas por canal viven en el módulo `notifications` (no en los emisores) — punto de extensión sin tocar dominio.
- **Jobs futuros**: EMAIL/PUSH/WHATSAPP/WEBHOOK se despachan por cola (ADR-012) con retry/backoff; el emisor no espera ni conoce el resultado del canal externo.

### 5.6 Modelo de expansión a canales múltiples (diseño, NO implementación)

1. Se agrega el valor al enum `NotificationChannel` (evolución aditiva al final, DATABASE.md §5.6) cuando exista proveedor real — no antes (no acoplar esquema).
2. Se implementa `emailProvider(…): NotificationProvider` en el módulo `notifications` + job de dispatch (ADR-012) + plantillas del canal.
3. Se introduce `notification_preferences` (D7) si el negocio pide opt-in/out por canal o tipo.
4. Los emisores no cambian: siguen llamando `NotificationService.notify({ userId, type, title, body, data })`; el enrutado por canal/preferencias es interno del módulo.
5. Contenido/traducción: `title`/`body` van por i18n (OQ-012) cuando haya canales externos; en v1 la UI es-AR.

### 5.7 Ejemplos de payload y casos de uso v1

**Alerta de rezago (BR-014)**: el job de detección (ADR-012) crea la `Alert STALE_30D` y encadena la notificación a los destinatarios operativos (**OQ-023 resuelta**: ADMIN + OPERATOR; configuración por rol):

```json
{ "userId": "uuid-operador", "type": "ALERT_STALE_30D",
  "title": "Carga en rezago: 029TERRA26",
  "body": "La carga 029TERRA26 lleva 31 días en Sector 4.",
  "data": { "cargo_id": "uuid-cargo", "alert_id": "uuid-alerta", "permanenceDays": 31 },
  "channel": "IN_APP" }
```

**Aviso administrativo (`CUSTOM`)**: uso interno (mantenimiento planificado, avisos del ADMIN):

```json
{ "userId": "uuid-admin", "type": "CUSTOM",
  "title": "Mantenimiento programado",
  "body": "El sábado 10:00–12:00 el sistema puede presentar intermitencias.",
  "data": { "source": "admin" }, "channel": "IN_APP" }
```

**Casos de uso v1 en la UI** (FRONTEND-ARCHITECTURE.md §5.3): (1) bandeja con filtro `unreadOnly` y contador `unreadCount`; (2) toasts de alerta STALE_30D al operar (ToastHost, COMPONENTS.md §7); (3) lectura marcada vía `PATCH /notifications/:id/read` con feedback inmediato (optimistic update del `notifications.store`).

### 5.8 Flujo completo del ciclo alerta → notificación

1. **Job de detección** (alerts, ADR-012): consulta cargas con permanencia > 30 días (BR-014, `entryDate` como base — OQ-008 resuelta: días corridos, segunda alerta a los 40) y crea `Alert STALE_30D OPEN` con dedupe (índice único parcial por cargo+tipo abierta, DATABASE.md §5.3).
2. **Encadenado**: el módulo `alerts` invoca `NotificationService.notify(...)` (boundary ADR-001) por cada destinatario autorizado; la persistencia IN_APP ocurre en la misma transacción del evento.
3. **Visualización**: Dashboard (alerta activa) + detalle de la carga (alertas) + bandeja de notificaciones (`unreadCount`) — MASTER-SPEC §9.
4. **Decisión humana** (BR-014): el operador resuelve la alerta con observación obligatoria (BR-006/007) y, si corresponde, mueve la carga a REZAGO con su movimiento e historial; la notificación NO ejecuta acciones (aviso, no mecanismo de confirmación — §3).
5. **Seguimiento**: re-generaciones solo ante una alerta nueva (idempotencia por `data.alert_id`; §5.4).

### 5.9 Retención de la bandeja y comportamiento PWA

- **Retención**: la tabla `Notification` crece con una fila por destinatario y evento; en v1 no hay política de purga propia (la bandeja es histórica del usuario; RESTRICCIÓN documentada en §3 y riesgo en §8). Si el volumen lo exige, la política se define junto a la de `audit_logs` (AUDIT.md §9 U2) y se implementa por job (ADR-012) — DECISIÓN PENDIENTE no bloqueante.
- **PWA (mínima v1, OQ-010)**: el service worker cachea el shell y assets (MASTER-SPEC §12); la bandeja se sirve desde el backend (`GET /notifications`), por lo que **sin conexión la bandeja muestra el último estado cacheado y marca «sin datos actualizados»** — nunca se confirma lectura offline de forma persistente (el `PATCH /read` requiere conexión; reintento del store).
- **Impacto en la operación**: las notificaciones nunca participan en confirmaciones transaccionales (mover carga continúa siendo un movimiento con observación, BR-006/007); un fallo de notificación NO bloquea la operación crítica (§5.1: el dispatch externo futuro va por jobs).

## 6. Criterios de aceptación

- [ ] Ningún módulo emisor importa un proveedor concreto; todos usan `NotificationService` (BR-019, verificado por lint de arquitectura en implementación).
- [ ] v1 persiste únicamente `channel: IN_APP`; EMAIL/PUSH/WHATSAPP/WEBHOOK figuran como reservados sin valores de enum en DB.
- [ ] La alerta de rezago (BR-014) genera su notificación sin duplicados (idempotencia por alerta) y sin mover la carga automáticamente.
- [ ] `GET /notifications` y `PATCH /notifications/:id/read` respetan `notification.read` y la propiedad de los datos (solo notificaciones propias).
- [ ] El fallo de un proveedor futuro no afecta la transacción de negocio (diseño documentado en §5.1/5.5) y el agregado de canales no toca los emisores.
- [ ] Preferencias (D7) y destinatarios por defecto declarados pendientes en §9.
- [ ] La bandeja no bloquea la operación crítica: un fallo de persistencia/de entrega de notificación no impide mover una carga (BR-006/007, §5.1/§5.9).
- [ ] Los pendientes N1–N8 tienen pregunta concreta, impacto y referencia; ninguno introduce un canal o regla nueva sin respaldo en OQ-011/DATABASE.md.

## 7. Archivos involucrados

- `docs/MASTER-SPEC.md` §4.1, §4.3, §6 BR-014/019, §9, §10, §18 · `docs/OPEN-QUESTIONS.md` (OQ-011, OQ-007, OQ-023 — resueltas en v0.5)
- `architecture/ADR/ADR-001` (boundaries), ADR-012 (jobs — Accepted), ADR-007 (REST), ADR-008 (usuarios)
- Hermandos W2: `DATABASE.md` §5.3 (notifications, D7), `ARCHITECTURE.md` §5.6 (módulo notifications), `AUTHORIZATION.md` §5.2 (`notification.read`)
- Downstream: `backend/MODULES.md` §5.14, `backend/API.md` §9.4, `frontend/FRONTEND-ARCHITECTURE.md` §5.3 (notifications.store/ToastHost), `frontend/COMPONENTS.md` §7 (ToastHost)

## 8. Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Acoplamiento silencioso de un emisor a un SDK de canal | Interfaz `NotificationProvider` + DI; revisión en code review (BR-019) |
| Duplicados de notificación por retries del job de alertas | Deduplicación de alerta abierta (índice único parcial, DATABASE.md §5.3) + `data.alert_id` |
| Volumen de notificaciones (una por alerta por destinatario) | Índices por usuario/lectura; retención natural de la bandeja (sin política propia en v1; re-evaluar con volumen real) |
| Notificación usada como confirmación de operación (mover carga) | Diseño explícito: las acciones van por movimientos con observación (BR-006/007); la notificación es solo aviso |
| Destinatarios mal definidos (¿Admin recibe todo? ¿Viewer recibe alertas?) | Regla por defecto resuelta (OQ-023): ADMIN + OPERATOR para alertas (in-app); Viewer no recibe; configuración por rol en v1 |
| Crecimiento de la bandeja sin política de purga | Retención histórica aceptada en v1 (§5.9); si el volumen lo exige se define política con AUDIT.md §9 U2 y job de mantenimiento (ADR-012) |

## 9. DECISIÓN PENDIENTE (reportar al orquestador)

Las preguntas con OQ asignada quedaron **resueltas en MASTER-SPEC v0.5 (2026-09-24)**; las restantes no tienen OQ asignada y se conservan como residuales locales:

| # | Pregunta concreta | Impacto | Referencia / Resolución |
| --- | --- | --- | --- |
| N1 | ~~¿Notificaciones solo in-app en v1 o se integra email desde el inicio?~~ | Alcance del módulo notifications | ✅ **RESUELTA (OQ-011)** — solo in-app (`IN_APP`) en v1; arquitectura desacoplada lista (BR-019) para EMAIL/PUSH en v1.1 |
| N2 | ~~¿Quiénes son los destinatarios por defecto de cada tipo? (recomendado: OPERATOR+ADMIN para alertas; ¿Viewer los recibe?)~~ | Reglas de generación | ✅ **RESUELTA (OQ-023)** — ADMIN + OPERATOR para alertas (in-app); Viewer no recibe por defecto; configuración por **rol** (no por usuario) en v1; plantillas título+body por tipo |
| N3 | ¿Se requieren `notification_preferences` (opt-in/out) ya en v1 o tabla solo en v1.1? | Esquema (D7 DATABASE.md) | DATABASE.md §11 D7 |
| N4 | ¿`CARGO_EVENT` (avisos de movimientos de cargas seguidas) es funcionalidad v1? Si sí, ¿qué define «seguir una carga» y quién puede configurarlo? | Catálogo de tipos y reglas | Nueva (W2) — no inventar la regla de seguimiento |
| N5 | ¿«Marcar todas las notificaciones como leídas» es necesario en v1 (no está en API.md §9.4)? | Contrato de API | Nueva (W2) — propuesta a W5 |
| N6 | ¿Los canales reservados se agregan al enum de DB ya en v1 (decisión contraria a DATABASE.md §5.5) o solo cuando exista proveedor? | Esquema de DB | DATABASE.md §5.5 (recomendación: NO en v1) |
| N7 | ¿La bandeja (historial de notificaciones) requiere política de retención propia en v1 o se re-evalúa con volumen real (recomendado)? | Job de mantenimiento, almacenamiento | Nueva (W2) — AUDIT.md §9 U2 (§5.9) |
| N8 | ¿«Marcar como leídas» debe soportar filtrar por tipo (solo alertas, solo avisos) en la bandeja de v1, o basta `unreadOnly`? | Contrato de API de la bandeja | API.md §9.4 (W5) — Nueva (W2) |