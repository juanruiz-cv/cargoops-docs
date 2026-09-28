# ADR-011 — Soft Delete

- Estado: Accepted
- Fecha: 2026-09-23
- Decisores: Equipo CargoOps / Software Architect

## Contexto

La información operacional de CargoOps es crítica y con trazabilidad total (MASTER-SPEC §1.1): BR-013 exige **nunca borrar silenciosamente una operación** (soft delete + audit), BR-012 faculta a ADMIN a eliminar (soft), restaurar y revertir, y el modelo canónico lleva `deletedAt` en User, Truck, Cargo, Location (MASTER-SPEC §4.1) e incluye `CargoStatus.DELETED` (soft) en la máquina de estados (MASTER-SPEC §4.3). Además, el movimiento puede revertirse conservando el historial original (`Movement.reversionOfId`, `reversedById`, `reversedAt` — MASTER-SPEC §4.1). El dominio exige que el historial de una carga nunca desaparezca: borrar una carga no puede romper movimientos, alertas ni auditoría que la referencian.

## Decisión

Adoptar **soft delete + auditoría + revert como política de eliminación única en v1**, sin hard delete operacional:

- **Mecanismo**: columna `deletedAt` (timestamp nullable) en las entidades operacionales (User, Truck, Cargo y, cuando aplique, Location/Map versionable). Un registro borrado = `deletedAt` set; nunca se emite `DELETE` SQL desde la API para entidades de dominio (ADR-007: `DELETE /cargos/:id` = soft delete).
- **Lecturas por defecto**: todas las consultas de la aplicación excluyen `deletedAt IS NOT NULL` automáticamente (middleware global de Prisma, ADR-005); solo la administración (ADMIN) consulta con `includeDeleted: true` explícito para restaurar o auditar.
- **CargoStatus.DELETED (soft)**: eliminar una carga la pasa a estado DELETED con movimiento correspondiente y observación obligatoria (BR-006/007), manteniendo su historial íntegro; el `code` queda «liberado» para reuso según resolución de unicidad de OQ-001 (índice parcial único sobre `deletedAt` nulo, ADR-004).
- **Restauración (RESTORE)**: solo ADMIN (BR-012) restaura el registro (deletedAt = null) y registra `AuditAction.RESTORE` (ADR-010); al restaurar una carga vuelve a un estado operativo válido de la máquina de estados (p. ej. al estado previo al borrado, validando la transición, BR-016).
- **Reversión (REVERT) de movimientos**: solo ADMIN (BR-012) revierte un movimiento creando un movimiento `REVERSION` que referencia `reversionOfId`, con observación obligatoria; el movimiento original se conserva intacto y el audit registra `AuditAction.REVERT` con diff previo/nuevo (ADR-010). Los derivados (ubicación actual de la carga, capacidad usada BR-005) se recalculan desde el último movimiento no revertido — nunca se mutan los registros históricos.
- **Relaciones e integridad**: las FK hacia entidades con soft delete permanecen (nunca `ON DELETE CASCADE` para historial); los movimientos y la auditoría de una carga borrada siguen existiendo y consultándose (el timeline muestra el estado DELETED y su motivo). El mapa no dibuja cargas en estado DELETED (ADR-006).
- **Purge físico**: solo mediante política de retención/regulatoria explícita y escrita (jobs de archivado, ADR-012), nunca automática desde el runtime ni por una acción de UI; el purge quedará documentado en `architecture/DATABASE.md` con aprobación del negocio. En v1 **no existe purge**: la retención total es la postura por defecto (mapear a OQ-016/backups).

El estado de decisión es **Accepted**: soft delete + audit + revert es la decisión canónica 4 del MASTER-SPEC §4.4 y BR-012/013.

## Alternativas consideradas

1. **Hard delete (borrado físico).** Rechazada: viola BR-013 (borrar silenciosamente), rompe historial/movimientos/auditoría y deja la trazabilidad total del producto sin sentido; además, desde lo operativo, un operador puede borrar por error y no hay restauración simple.
2. **Papelera de borrados separada (tabla/backup de registros borrados).** Rechazada: duplica estado (el registro vive en dos lugares), complica las relaciones y consultas, y agrega un mecanismo sin beneficio frente al patrón `deletedAt` + audit estándar; la diferencia visible (UI de «papelera») se cubre con `includeDeleted` + filtro por estado.
3. **Borrado físico + restauración desde backup/respaldo.** Rechazada: la restauración operativa sería lenta (restaurar toda la base o diffs), fuera de línea y sin observación/historial; no cumple la operación de restaurar/revertir en vivo que exige BR-012.
4. **Estado `DELETED` sin `deletedAt` (solo máquina de estados).** Rechazada como mecanismo único: no cubre User/Truck/Location (que no tienen máquina de estados de negocio) y complica filtros; la columna `deletedAt` + CargoStatus.DELETED se combinan: estado visible en UI + flag para exclusión de consultas.

## Consecuencias

**Positivas:**

- Trazabilidad total preservada y historial siempre reconstruible (BR-008/013).
- Restauración y reversión operativas en vivo, con observación y auditoría (BR-012, ADR-010).
- Unicidad manejable con índices parciales (solo filas activas), clave para el código de carga heterogéneo real (MASTER-SPEC §4.4, OQ-001).

**Negativas:**

- Acumulación de datos (cantidad crece con borrados): aceptable en v1; la purga/postura de retención se define con negocio (ADR-010/012).
- Complejidad de consultas (filtro global de deleted) resuelta con middleware, pero exige disciplina de testing para no filtrar de más o de menos.
- La lógica de reversión (estado anterior recalculado) es delicada: se cubre con casos de prueba específicos en QA (MASTER-SPEC §14: «casos críticos: …reversión…»).

## Referencias

- MASTER-SPEC §4.1 (deletedAt, Movement.reversionOfId), §4.3 (CargoStatus.DELETED, AuditAction DELETE/RESTORE/REVERT), §4.4 (decisión 4), §6 BR-012/013, §7 (reversiones ADMIN).
- ADR-004 (índices parciales), ADR-005 (middleware soft delete), ADR-010 (auditoría de delete/restore/revert), ADR-009 (Admin como único con DELETE/RESTORE/REVERT).