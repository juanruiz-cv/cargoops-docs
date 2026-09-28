# CargoOps — Auditoría (AUDIT.md)

> Grupo W2 · Arquitectura · Fuente de verdad: `docs/MASTER-SPEC.md` §4.1 (AuditLog), §4.3 (AuditAction), §6 (BR-008/012/013/017), §10 (`GET /api/v1/audit`).
> Estado: borrador FASE 0 (documentación). Implementa el ADR-010 (append-only) sobre el modelo de `DATABASE.md` §5.3 (audit_logs).

## 1. Objetivo

Definir el modelo de auditoría de CargoOps: la entidad `AuditLog`, el catálogo de acciones `AuditAction`, qué operaciones se auditan y con qué contenido, la estrategia de escritura (misma transacción, append-only), el manejo de `previousValue`/`newValue` y `metadata`, la política de privacidad de `ip`/`userAgent` (BR-017), la retención/purga, y la consulta con sus permisos de lectura. El objetivo de negocio es la **trazabilidad total** (MASTER-SPEC §1.1): toda mutación es reconstruible, nada se borra silenciosamente (BR-013).

## 2. Contexto

CargoOps debe reconstruir la línea temporal de cada carga (BR-008), auditar borrados/restauraciones/reversiones (BR-012, ADR-011), auditar login/logout y cambios de permisos (ADR-008/009), y registrar exportaciones (BR-018, ADR-013). El ADR-010 fija el mecanismo: tabla **append-only**, escritura en la **misma transacción** de negocio, registro desde la capa de aplicación (sin triggers como mecanismo principal), acciones del catálogo canónico, y lectura con permiso `audit.read` y paginación por cursor. El MASTER-SPEC define el modelo: `AuditLog { id, userId, action, entity, entityId, timestamp, previousValue, newValue, metadata, ip, userAgent }`.

## 3. Restricciones

- **Append-only**: la tabla solo recibe INSERT. `REVOKE UPDATE, DELETE` sobre `audit_logs` para el rol de aplicación usado por Prisma (ADR-010, ADR-004/005). La limpieza solo por política de retención (jobs, ADR-012), nunca por delete ad-hoc.
- **Escritura en la misma transacción** de la operación de negocio (Prisma `$transaction`, ADR-005): si el negocio falla, no queda audit huérfano ni operación sin audit (BR-008/013).
- **Sin hard delete** en operaciones; la retención por defecto en v1 es **total** (no existe purge — ADR-011, DATABASE.md §5.3).
- **Privacidad (BR-017)**: `ip`/`userAgent` minimizados; nunca credenciales, tokens ni datos sensibles en `metadata`.
- **Lectura restringida**: `GET /api/v1/audit` con permiso `audit.read` — ADMIN ve todo; OPERATOR ve solo sus propios eventos (OQ-019); Viewer sin acceso (AUTHORIZATION.md §9 A2).
- FASE 0: solo documentación. Los bloques fenced son ilustrativos.

## 4. Dependencias

- `docs/MASTER-SPEC.md` §4.1, §4.3, §6 (BR-008/012/013/017), §9 (alertas), §10 (`GET /audit`).
- `architecture/ADR/ADR-010` (Audit Log), ADR-011 (Soft Delete), ADR-007 (cursor pagination), ADR-004 (particionado), ADR-012 (jobs de retención).
- Hermandos W2: `DATABASE.md` §5.3 (audit_logs, índices) y §11 (D8/D9 pendientes), `SECURITY.md` §5.1/5.6 (LOGIN/LOGOUT, IP privacidad), `AUTHORIZATION.md` §5.2 (`audit.read`), `ARCHITECTURE.md` §5.4 (AuditInterceptor) y §5.9 (flujos F1–F5), `PDF-EXPORT.md` §5.5 (EXPORT).
- Downstream: `backend/API.md` §8.4 (GET /audit), `backend/MODULES.md` §5.13 (módulo audit).

## 5. Decisiones

### 5.1 Entidad `AuditLog` (coherente con MASTER-SPEC §4.1 y DATABASE.md §5.3)

| Campo canónico | Tipo/columna | Detalle |
| --- | --- | --- |
| `id` | PK | Secuencial o UUID — decisión pendiente (DATABASE.md §11 D8; si se exige integridad de orden estricta, secuencial) |
| `userId` | FK → users.id, NULL | Autor de la acción; NULL = sistema/job/usuarios soft-deleted (FK `ON DELETE SET NULL`) |
| `action` | `AuditAction` | Enum canónico §4.3 |
| `entity` | varchar(60) | Nombre de entidad: `cargo`, `movement`, `location`, `map`, `mapElement`, `truck`, `user`, `role`, `permission`, `rolePermission`, `alert`, `notification`, `observation`, `settings`, `export` |
| `entityId` | uuid | Referencia polimórfica del objeto afectado |
| `timestamp` | timestamptz, default now() | Momento exacto (línea de seguridad; distinta de `movements.moved_at` — línea operacional, DATABASE.md §5.3) |
| `previousValue` | jsonb | Estado previo (diff); snapshot completo en CREATE/DELETE (ADR-010) |
| `newValue` | jsonb | Estado posterior (diff); snapshot completo en CREATE/DELETE |
| `metadata` | jsonb, default `{}` | `requestId`, contexto adicional (p. ej. `movementId` asociado, `exportId`) |
| `ip` | varchar(45), NULL | IPv4/IPv6 minimizado (BR-017; política §5.6) |
| `userAgent` | varchar(255), NULL | User-Agent truncado (BR-017) |

- **Índices** (DATABASE.md §5.3): `ix_audit_entity_entity_id` (historial por objeto), `ix_audit_user_id_timestamp`, `ix_audit_action_timestamp`, `ix_audit_timestamp` (poda por rango).
- **Particionado**: por rango de fecha (mensual/trimestral) desde el inicio (ADR-004 §Decisión); los índices soportan poda por rango.
- **Volumen**: es la tabla de mayor escritura (toda mutación = 1 fila, y login/logout). Presupuesto operativo v1 del predio (decenas de usuarios) y crecimiento documentados en `PERFORMANCE.md` §5.

### 5.2 Acciones `AuditAction` (catálogo canónico MASTER-SPEC §4.3)

| Acción | Cuándo se emite | Entidad típica | Contenido de previous/new |
| --- | --- | --- | --- |
| `CREATE` | Alta de entidad operacional (carga, camión, ubicación, movement…) | cargo, truck, location, movement | new = snapshot inicial completo |
| `UPDATE` | Modificación de datos maestros (carga, truck, ubicación-campos, alerta, settings puntuales) | cargo, truck, location, alert | diff de campos cambiados |
| `MOVE` | Movimiento de ubicación (con o sin cambio de estado) | cargo (movement) | prev: `{ locationId }` → new: `{ locationId }` + `movementId` en metadata |
| `STATUS_CHANGE` | Cambio de estado del cargo (máquina de estados BR-016) | cargo | prev: `{ status }` → new: `{ status }` + `movementId` |
| `DELETE` | Soft delete (BR-013, ADR-011) | cargo, truck, user… | new = snapshot (borrado); `deletedAt` |
| `RESTORE` | Restauración de soft-deleted (BR-012, ADR-011) | cargo… | prev = borrado, new = restaurado |
| `REVERT` | Reversión de un movimiento (BR-012, ADR-011) | movement | diff del movimiento original revertido + `reversionOfId`/`reversedById` |
| `MAP_EDIT` | Edición de plano (PATCH maps, BR-020) | map / mapElement | diff de elementos editados; versionado de `Map.version` |
| `CAPACITY_CHANGE` | Cambio de `capacity`/`capacityUnit` (o `allowOverOccupation`) de una ubicación | location | prev/new de los campos de capacidad |
| `PERMISSION_CHANGE` | Cambio de roles/permisos/asignaciones (BR-012, ADR-009) | role, permission, rolePermission, user (roles) | diff de la matriz o de asignación |
| `LOGIN` | Login exitoso **y** fallido (con motivo, sin credenciales) | auth | éxito: `{ method: 'password' }`; fallo: `{ reason: 'bad_credentials' \| 'user_inactive' }` — sin exponer contraseña |
| `LOGOUT` | Logout / revocación de refresh | auth | `{}` |
| `EXPORT` | Exportación PDF (BR-018/ADR-013) y exportación de consultas de auditoría (ADR-010) | export | `{ exportId, cargoId }` (o filtros de la consulta exportada), `format: 'pdf'` |

Notas:
- `Alert` (acknowledge/resolve/dismiss) y `Notification` (lectura) **no tienen acción propia** en el catálogo canónico: se registran como `UPDATE` con `entity=alert` + metadata (`from`/`to` status) — **OQ-021 resuelta (2026-09-24)**: no se extiende el enum; la evolución aditiva al final del enum queda disponible si el negocio lo exige (DATABASE.md §5.6).
- Los **escaneos de lectura (GET)** no se auditan: la lectura masiva operativa (listados, detalle, dashboard) no genera audit para no duplicar volumen; solo las **exportaciones** de datos se auditan (`EXPORT`).
- Los **jobs del sistema** (alerta 30 días, mantenimiento, PDF) auditan con `userId = NULL` y `metadata.source = 'job'` cuando la acción lo amerita (p. ej. CREATE de alerta lo registra el dominio de alertas; la auditoría de negocio la escribe el módulo correspondiente).

### 5.3 Qué operaciones se auditan (cobertura por flujo)

**Obligatorio — toda mutación transaccional de dominio** (BR-008/013, ADR-010):
- Registro/edición/soft-delete/restauración de **cargas** (CREATE, UPDATE, DELETE, RESTORE).
- **Movimientos** de ubicación/estado (MOVE, STATUS_CHANGE) — una transacción que inserta Movement + Observation + audit (ARCHITECTURE.md §5.9 F2).
- **Reversiones** (REVERT) — con historial original conservado (ADR-011).
- **Camiones** (CREATE, UPDATE, DELETE); **ubicaciones** (CREATE/UPDATE campos, CAPACITY_CHANGE).
- **Planos** (MAP_EDIT) con `Map.version++` (API.md §7.3).
- **Alertas** como UPDATE (acknowledge/resolve/dismiss) — histórico de ciclo de vida.
- **Autenticación** (LOGIN exitoso/fallido, LOGOUT) — ADR-008.
- **Permisos y usuarios** (PERMISSION_CHANGE al tocar roles/permisos/asignaciones; UPDATE/CREATE/DELETE de usuarios) — BR-012.
- **Settings** globales con efecto operativo (días de alerta, unidad de capacidad): `UPDATE` de settings; si el cambio afecta capacidad, `CAPACITY_CHANGE` en la ubicación correspondiente (o `UPDATE` de settings + detalle en metadata) — coherencia operativa a definir en W5.
- **Exportaciones PDF** (EXPORT) — BR-018/ADR-013.

**No se audita en v1** (documentado para evitar expectativas):
- Lecturas GET (salvo exportaciones), health checks, refresh de token individual (el LOGIN ya registra la sesión; el refresh rotativo se registra en la tabla de refresh tokens, no en audit — ADR-008).
- Cambios de estado internos sin relevancia de negocio (p. ej. flags de caché).

### 5.4 Escritura y transaccionalidad

- **Service transversal**: módulo `audit` expone el puerto público `AuditService.record(entry)` (MODULES.md §5.13); ningún módulo escribe SQL directo sobre `audit_logs`.
- **AuditInterceptor** (ARCHITECTURE.md §5.4): captura contexto (usuario autenticado, requestId, IP/UA del request) y lo pasa al service; la instantánea de `previousValue`/`newValue` la provee el servicio de dominio en la misma transacción (el interceptor no puede conocer el diff de negocio).
- **Patrón de uso en transacción**:

```
// Ilustrativo (documentación): movimiento + observación + audit en una sola transacción
await prisma.$transaction(async (tx) => {
  const movement = await tx.movement.create({ data: { ... } });
  const obs = await tx.observation.create({ data: { movementId: movement.id, ... } });
  await tx.cargo.update({ where: { id }, data: { locationId, status } });
  await auditService.record(tx, {
    action: 'MOVE', entity: 'cargo', entityId: cargoId,
    previousValue: { locationId: from }, newValue: { locationId: to },
    metadata: { requestId, movementId: movement.id },
  });
});
```

- **Sin triggers como mecanismo principal** (ADR-010): los triggers pierden contexto de negocio; se reservan solo como red de seguridad opcional para ediciones fuera de la aplicación (consola manual) si el despliegue lo exige.
- **Immutabilidad**: append-only por diseño; la garantía criptográfica (hash-chain/ledger firmado por día/hora) es **mejora futura** que se activaría ante requerimiento regulatorio explícito (ADR-010 §Decisión). No se implementa en v1.

### 5.5 `previousValue` / `newValue` y `metadata`

- **Semántica diff** (ADR-010): solo los campos efectivamente modificados; **snapshot completo** solo en CREATE y DELETE (no hay «antes» o «después» parcial útil).
- Formato: JSONB plano con nombres de campo de dominio:

```json
{ "previousValue": { "locationId": "uuid-plazoleta", "status": "IN_TRUCK" },
  "newValue":      { "locationId": "uuid-s4", "status": "STORED" },
  "metadata":      { "requestId": "req-01J...", "movementId": "uuid-m1" } }
```

- **`metadata`**: `requestId` siempre (trazabilidad transversal ADR-007); contexto adicional por acción (`movementId`, `exportId`, `source: 'job'`). **Nunca** contraseñas, tokens, refresh tokens, bodies completos sensibles ni datos personales no necesarios (SECURITY.md §5.9, BR-017).
- Los cambios sobre JSONB (`properties` de ubicación/plano, `metadata` de carga) se registran como diff del JSONB cuando el servicio puede determinarlo; si no, se registra el JSONB completo con el detalle en metadata — implementación W5, sin cambio de esquema.

### 5.6 `ip` / `userAgent` con privacidad (BR-017)

- **Minimización**: `ip` varchar(45) y `userAgent` varchar(255) truncado/pseudonimizado. Política concreta pendiente (SECURITY.md §5.9): opciones en evaluación — (a) truncar a red/segmento donde el despliegue lo permita, (b) hash reversible por jornada, (c) no almacenar en ambientes donde no aporte (intranet del predio).
- **Recomendación W2**: almacenar solo lo necesario para trazabilidad de incidentes; en un despliegue intranet con usuarios internos, el `userAgent` aporta poco y puede omitirse; la IP puede truncarse al segmento de red. El orquestador confirma con la política final (§9).
- Nunca se guardan datos de sesión, tokens ni credenciales en `metadata` (SECURITY.md §5.9).

### 5.7 Consultas y permisos de lectura

- **Endpoint**: `GET /api/v1/audit` (MASTER-SPEC §10) con filtros `action`, `entity`, `entityId`, `userId`, `from`, `to` (API.md §8.4).
- **Permiso**: `audit.read`. **OQ-019 resuelta (2026-09-24)**: ADMIN ve todo; OPERATOR ve **solo sus propios eventos** (filtro por autor); Viewer sin acceso (AUTHORIZATION.md §5.7 / §9 A2).
- **Paginación por cursor**, no offset: tabla append-only de alto volumen (ADR-007 §Decisión; DATABASE.md §5.7). Forma del cursor y contrato en `backend/API-CONVENTIONS.md` (W5).
- **Envelope de respuesta**: `{ data: { items: [...] , meta } }` (API.md §8.4); los items incluyen `username` para legibilidad (join con users; `userId` NULL cuando el autor fue purgado/soft-deleted).
- **Exportación de auditoría**: fuera de v1 (MODULES.md §5.13: «export/retention avanzada (futuro)»); cuando exista, una exportación de auditoría se registra a su vez como `AuditAction.EXPORT` (ADR-010).

### 5.8 Retención, particionado y purgado

- **Particionado**: por rango de fecha (mensual/trimestral) desde el inicio (ADR-004); `ix_audit_timestamp` soporta poda por rango y consultas por rango de fechas.
- **Retención**: política **pendiente de definición con el negocio** (DATABASE.md §11 D9; ADR-010 §Decisión sugiere «p. ej. 3 años operativos + archivado» como referencia, NO adoptada). En v1 **no hay purge** (ADR-011: retención total por defecto; la purga solo por política regulatoria escrita con aprobación del negocio).
- **Jobs de mantenimiento** (ADR-012, OQ-007 resuelta — Redis + BullMQ en v1): rotación/archivado de particiones vencidas, limpieza de refresh tokens expirados, corren como jobs de colas BullMQ (JOBS.md §4.2).
- La eventual purga **nunca es DELETE sobre `audit_logs` en runtime**: se implementa por rotación/archivo de particiones (DROP de partición completa, fuera del alcance del rol de aplicación) aprobada por política legal — DECISIÓN PENDIENTE (§9).

### 5.9 Integridad y mejora futura

- **Garantías v1**: append-only + escritura transaccional + revoke de UPDATE/DELETE + acceso de lectura acotado. Los logs de aplicación (observabilidad) son complementarios, nunca sustitutos del audit (ADR-010 alternativa 3 rechazada).
- **Mejora futura documentada**: ledger firma/hash encadenado por período (ADR-010). Se activaría por: (a) requerimiento regulatorio del ente aduanero, o (b) exigencia de cliente del predio — condición de activación documentada, sin implementación en v1.

### 5.10 Ejemplos de registro y reconstrucción

Ejemplo ilustrativo de una fila `AuditLog` para un movimiento de ubicación (misma transacción que el `Movement`, §5.4):

```json
{ "id": "uuid-audit-01", "userId": "uuid-operador", "action": "MOVE",
  "entity": "cargo", "entityId": "uuid-cargo-29TERRA",
  "timestamp": "2026-09-23T14:31:07.123Z",
  "previousValue": { "locationId": "uuid-plazoleta", "status": "IN_TRUCK" },
  "newValue":      { "locationId": "uuid-s4", "status": "STORED" },
  "metadata":      { "requestId": "req-01J...", "movementId": "uuid-m1" },
  "ip": "192.168.10.0", "userAgent": "Mozilla/5.0 …" }
```

Ejemplo de una reversión (ADMIN; ADR-011 conserva el historial original):

```json
{ "userId": "uuid-admin", "action": "REVERT", "entity": "movement",
  "entityId": "uuid-m1",
  "previousValue": { "movementId": "uuid-m1", "toLocationId": "uuid-s4", "toStatus": "STORED" },
  "newValue":      { "reversionOfId": "uuid-m1", "toLocationId": "uuid-plazoleta", "toStatus": "IN_TRUCK" },
  "metadata":      { "requestId": "req-01K...", "reversedById": "uuid-m2" } }
```

**Reconstrucción**: con `entity = movement` + `entityId` y la cadena `reversionOfId`/`reversedById` (DATABASE.md §5.3) se reconstruye el historial completo de una carga, incluida la línea previa revertida (BR-008). La consulta de detalle de carga (`GET /cargos/:id/movements`) se sirve desde `movements`; el audit respalda la **evidencia de auditoría** (quién/cuándo/qué cambió), no es la fuente del timeline operativo.

## 6. Criterios de aceptación

- [ ] Toda mutación de dominio produce su fila de audit en la misma transacción (BR-008/013); verificado con tests de integración (MASTER-SPEC §14).
- [ ] `previousValue`/`newValue` siguen la semántica diff (snapshot solo en CREATE/DELETE) y permiten reconstruir el estado anterior para revert informado (ADR-011).
- [ ] `ip`/`userAgent` se almacenan minimizados y sin datos sensibles (BR-017) según política confirmada (§9).
- [ ] `GET /audit` exige `audit.read`, pagina por cursor y respeta la matriz de AUTHORIZATION.md §5.7.
- [ ] No existe camino de runtime para UPDATE/DELETE sobre `audit_logs` (revoke + revisión de código + test de seguridad).
- [ ] Retención/particionado documentados y pendientes de política (D9) sin bloqueo de implementación v1.

## 7. Archivos involucrados

- `docs/MASTER-SPEC.md` §4.1, §4.3, §6 (BR-008/012/013/017), §9, §10 · `docs/OPEN-QUESTIONS.md`
- `architecture/ADR/ADR-010` (Audit Log), ADR-011 (Soft Delete), ADR-007 (cursor), ADR-004 (particionado), ADR-012 (jobs)
- Hermandos W2: `DATABASE.md` §5.3 (audit_logs, índices) y §11 (D8/D9), `SECURITY.md` §5.1 (§LOGIN/LOGOUT) y §5.9 (privacidad), `AUTHORIZATION.md` §5.2/§5.7 (`audit.read`), `ARCHITECTURE.md` §5.4/§5.9, `PDF-EXPORT.md` §5.5 (EXPORT)
- Downstream: `backend/API.md` §8.4, `backend/MODULES.md` §5.13, `backend/JOBS.md` (retención)

## 8. Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Crecimiento alto (1 fila por operación + login/logout) | Particionado por rango, índices por consulta, retención pendiente de política (D9), presupuesto en PERFORMANCE.md |
| Costo transaccional del audit en flujos críticos (mover carga) | Misma transacción (sin doble round-trip); medir en QA (MASTER-SPEC §14) |
| Olvido de auditar un endpoint nuevo | Interceptor + convención de módulo (todo módulo usa `AuditService.record`); revisión de seguridad en PR |
| Offline/manual edits fuera de la app sin audit | Trigger complementario opcional documentado (ADR-010); no implementado en v1 |
| Política de retención no definida → crecimiento indefinido | Retención total v1 aceptada (ADR-011); política con negocio pendiente (D9); particionado listo |
| `entity`/`entityId` polimórfico mal tipado | Nomenclatura de entidad fija (§5.1) y validada en el service; filtros tipados en el query DTO |

## 9. DECISIÓN PENDIENTE (reportar al orquestador)

Las preguntas con OQ asignada quedaron **resueltas en MASTER-SPEC v0.5 (2026-09-24)**; U1/U2/U3/U6 no tienen OQ asignada y se conservan como residuales locales (DATABASE.md §11 D8/D9, SECURITY.md §9 S1–S4 y propuesta W5 respectivamente):

| # | Pregunta concreta | Impacto | Resolución |
| --- | --- | --- | --- |
| U1 | ¿PK de `audit_logs` secuencial (integridad de orden) o UUIDv7? ¿Se exige hash-chain de integridad en v1? | Esquema, particionado, garantías | 🔶 Pendiente local — D8/D9 (DATABASE.md §11), sin OQ asignada; hash-chain documentado como mejora futura (§5.9) |
| U2 | Política de retención y modos (meses/años, archivado externo, DROP de particiones) | Almacenamiento, jobs de mantenimiento | 🔶 Pendiente local — D9 (DATABASE.md §11), sin OQ asignada; v1 sin purge (ADR-011), retención total por defecto |
| U3 | Política concreta de `ip`/`userAgent` (BR-017): ¿truncar a segmento, hash reversible, omitir en intranet? | Columnas y stories de seguridad | 🔶 Pendiente local — SECURITY.md §9 S1–S4, sin OQ asignada; recomendación W2 documentada en §5.6 |
| U4 | ~~¿OPERATOR puede leer auditoría de sus propias operaciones?~~ | Matriz de `audit.read` | ✅ **RESUELTA (OQ-019)** — OPERATOR ve **solo sus propios eventos** (login, movimientos, cambios que él hizo) vía filtro por autor; ADMIN ve todo; Viewer sin acceso |
| U5 | ~~¿El ciclo de vida de `Alert` (acknowledge/resolve/dismiss) necesita acciones propias en `AuditAction` o basta `UPDATE`?~~ | Catálogo de acciones (evolución aditiva) | ✅ **RESUELTA (OQ-021)** — se acepta `UPDATE` genérico con `entity=alert` + metadata (`from`/`to` status); no se extiende el enum |
| U6 | ¿Los cambios de `settings` con efecto operativo se auditan como `UPDATE settings` o como `CAPACITY_CHANGE` en la ubicación afectada? | Semántica de los registros | 🔶 Pendiente local — propuesta W5 (API.md §9.5 `SETTINGS_CHANGE`), sin OQ asignada; decisión de implementación del grupo W5 |