# ADR-010 — Audit Log

- Estado: Accepted
- Fecha: 2026-09-23
- Decisores: Equipo CargoOps / Software Architect

## Contexto

CargoOps es un sistema de **trazabilidad total** (MASTER-SPEC §1.1): cada movimiento de carga genera historial reconstruible (BR-008), nunca se borra silenciosamente una operación (BR-013), las reversiones generan historial y auditoría (BR-012), y los cambios de permisos se auditan (BR-012, ADR-009). El dominio canónico define `AuditLog { id, userId, action (AuditAction), entity, entityId, timestamp, previousValue, newValue, metadata, ip, userAgent }` (MASTER-SPEC §4.1) con `AuditAction` = CREATE, UPDATE, MOVE, STATUS_CHANGE, DELETE, RESTORE, REVERT, MAP_EDIT, CAPACITY_CHANGE, PERMISSION_CHANGE, LOGIN, LOGOUT, EXPORT (MASTER-SPEC §4.3). BR-017 exige equilibrio entre trazabilidad y privacidad (no guardar datos sensibles innecesarios).

## Decisión

Implementar un **audit log append-only** como servicio transversal del monolito:

- **Semántica append-only**: la tabla `AuditLog` solo recibe INSERT. No existen UPDATE/DELETE sobre ella (ni siquiera para ADMIN), en código Y en base: el rol de aplicación de PostgreSQL usado por Prisma recibe `REVOKE UPDATE, DELETE` sobre `audit_logs` (ADR-004/005). La limpieza/rotación se hace por política de retención (jobs de archivado, ADR-012), nunca por delete ad-hoc.
- **Conteo de inmutabilidad**: el guardado es **apéndice único por transacción**, pero la garantía fuerte de inmutabilidad se declara como **mejora futura evaluada** (ledger por hora/día con firma/hash encadenado o tabla de resumen firmada) — no se implementa en v1 salvo requerimiento regulatorio explícito; se documenta en `architecture/AUDIT.md` la condición que la activaría.
- **Escritura en la misma transacción de negocio** (Prisma `$transaction`, ADR-005): movimiento + observación + audit MOVE en una sola transacción; si el negocio falla, no queda audit huérfano ni operación sin audit (BR-008/013).
- **Registro por capa de aplicación, no por triggers**: la aplicación escribe el audit con contexto rico (userId autenticado, acción de negocio, `previousValue/newValue` de los campos cambiados, `entity`/`entityId` polimórficos, `metadata` con requestId — ADR-007). Los triggers de DB quedan descartados como mecanismo principal (ver Alternativas); se reserva un trigger complementario solo para cambios fuera de la app (consola/backoffice manual) en dev en adelante, si el despliegue lo exige.
- **Detalle de cambios**: `previousValue`/`newValue` como JSONB con los campos efectivamente modificados (no el snapshot completo, salvo CREATE/DELETE donde el snapshot completo es el valor), para permitir diff y revert informado (ADR-011).
- **Acciones cubiertas**: todas las `AuditAction` del MASTER-SPEC §4.3; EXPORT se registra para exportación PDF (ADR-013) y consultas de auditoría; LOGIN/LOGOUT con successful/failed (failed con motivo, sin exponer credenciales).
- **IP/userAgent con privacidad (BR-017)**: se guardan `ip` y `userAgent` de forma limitada (resolución corta de IP — p. ej. solo red/segmento si es posible según despliegue — o hash reversible por jornada, decisión de despliegue en `architecture/SECURITY.md`); nunca datos de sesión, tokens ni credenciales en `metadata`.
- **Consulta de auditoría**: `GET /api/v1/audit` (MASTER-SPEC §10) con filtros por entidad/acción/usuario/fecha, paginación por cursor (no offset: tabla append-only de alto volumen, ADR-007) y permiso `audit.read` (solo ADMIN, ADR-009).
- **Particionado y retención**: la tabla se particiona por rango de fecha (mensual/trimestral, ADR-004) con política de retención (p. ej. 3 años operativos + archivado) definida con el negocio (OQ-016 backup/DR abierto).

El estado de decisión es **Accepted**: modelo y acciones son canónicos (MASTER-SPEC §4.1/§4.3); no depende de preguntas abiertas de negocio.

## Alternativas consideradas

1. **Triggers de base de datos (plpgsql) como mecanismo principal.** Rechazada: capturan cambios de filas pero pierden el contexto de negocio (userId real, acción semántica MOVE vs UPDATE, observación asociada, requestId); además duplican lógica y complican migraciones. Se mantiene solo como red de seguridad opcional para ediciones fuera de la app.
2. **Change Data Capture (Debezium/CDC) hacia un almacén de eventos.** Rechazada para v1: infraestructura Kafka/CDC excesiva para un predio con decenas de usuarios; la misma información vive en `AuditLog` + tablas de dominio. Revisitar si se adopta event sourcing o analítica en streaming (futuro, MASTER-SPEC §1.5).
3. **Logging de archivos (p. ej. JSON lines en disco).** Rechazada como fuente de auditoría (inconsistente con transacciones, sin joins con entidades, difícil consulta y retención); los logs de aplicación (métricas/errores) siguen existiendo aparte (MASTER-SPEC §14), pero no son el audit.
4. **Audit por tabla espejo (tabla de historial por cada entidad).** Rechazada: explosión de esquemas y consultas heterogéneas; el modelo polimórfico `AuditLog` (entity/entityId) del MASTER-SPEC §4.1 cubre el caso con una sola tabla y filtros tipados.

## Consecuencias

**Positivas:**

- Trazabilidad total exigida por el producto (MASTER-SPEC §1.1) con un mecanismo único, consultable y de bajo costo de adopción (un service transversal + guards/interceptors en NestJS, ADR-003).
- El revert (ADR-011) se apoya en `previousValue/newValue` para reconstruir el estado anterior con audit del REVERT.
- La tabla polimórfica escala a nuevas entidades (mapa, notificaciones, settings) sin migraciones de esquema.

**Negativas:**

- Crecimiento alto (una fila por operación): se mitiga con particionado + retención + jobs de archivado (ADR-012); el rendimiento de escritura transaccional adicional se mide en QA (MASTER-SPEC §14).
- Append-only exige disciplina de acceso a DB (revoke) y de código (nadie borra filas de audit en servicios); se refuerza con code review.
- La garantía criptográfica de inmutabilidad es mejora futura; el negocio debe conocer el alcance en v1 (documentado en `AUDIT.md`).

## Referencias

- MASTER-SPEC §1.1 (trazabilidad), §4.1 (AuditLog), §4.3 (AuditAction), §6 (BR-008/012/013/017), §10 (GET /audit).
- ADR-003 (interceptors NestJS), ADR-004 (JSONB + particionado), ADR-005 (transacciones Prisma + middleware), ADR-009 (PERMISSION_CHANGE), ADR-011 (delete/restore/revert auditados), ADR-013 (EXPORT auditado), ADR-012 (jobs de retención/archivado).
- `architecture/AUDIT.md`, `backend/API.md` (grupos W2/W5).