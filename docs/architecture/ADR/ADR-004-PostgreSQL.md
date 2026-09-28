# ADR-004 — PostgreSQL

- Estado: Accepted
- Fecha: 2026-09-23
- Decisores: Equipo CargoOps / Software Architect

## Contexto

El dominio de CargoOps es fuertemente relacional y de integridad crítica (MASTER-SPEC §2, §4): Cargo → Location, Movement con Observation 1:1 obligatoria, Track de historial reconstruible (BR-008), soft delete con auditoría (ADR-010/011), control de capacidad (BR-005) y un mapa con datos geométricos estructurados (ADR-006). El MASTER-SPEC fija la base de datos en §11.2: **PostgreSQL 16+**. Las transacciones ACID entre módulos son un requisito explícito del monolito modular (ADR-001): un movimiento + su observación + su auditoría deben confirmarse o revertirse juntos.

## Decisión

Adoptar **PostgreSQL 16+** (la versión estable más reciente al momento de implementar) como única base de datos transaccional del sistema (MASTER-SPEC §11.2):

- **Una sola base por ambiente** (dev/staging/prod), un schema por disposición; sin split por módulo: los módulos del monolito comparten la base y su integridad transaccional (ADR-001).
- **JSONB** para los metadatos no relacionales del modelo: `Cargo.metadata`, `Location.properties`, `MapElement.properties`, `Movement.metadata`, `Alert.metadata`, `AuditLog.previousValue/newValue` (MASTER-SPEC §4.1). JSONB permite índices GIN si en el futuro se consulta por propiedades.
- **Enums canónicos** del MASTER-SPEC §4.3 modelados como tipos nativos PostgreSQL (`CargoStatus`, `LocationType`, `MovementKind`, `AlertType`, `AlertStatus`, `AuditAction`, `NotificationChannel`, `CapacityType`, `QuantityUnit`) con check de consistencia y dominio tipado, o como tablas de referencia si se requiere catalogarlos; decisión operativa documentada en `architecture/DATABASE.md`.
- **Soft delete** (`deletedAt` timestamp nullable) sobre las tablas operacionales (ADR-011) con **índices parciales** para unicidad activa (p. ej. `Cargo.code` único solo entre filas no borradas, mitigando la regla BR-002 hasta la definición exacta de unicidad — OQ-001).
- **UUID (`pgcrypto`/`gen_random_uuid()`)** como PK de las entidades principales (evita enumeración de ids expuestos en `/api/v1`); códigos de negocio (código de carga, código de ubicación) como campos únicos de dominio, no como PK.
- **Particionado por rango (fecha)** aplicado desde el inicio para `AuditLog` y planificado para `Movement` (tablas append-only de alto volumen — ver ADR-010), mediante partición por mes/trimestre.
- **Extensiones** mínimas: `pgcrypto` (UUID), `pg_trgm` (búsqueda tolerante en códigos de carga y placas, útil para el buscador de cargas de MASTER-SPEC §1.4), y evaluación de `citext` según resolución de OQ-001 (case-sensitivity del código).
- **Migraciones versionadas** vía Prisma Migrate (ADR-005); backups, RPO/RTO y alta disponibilidad según `devops/` (OQ-016 aún abierto).

El estado de decisión es **Accepted**: el motor es fijo; permanecen abiertas preguntas de *uso* (OQ-001 unicidad, OQ-009 capacidad, OQ-016 RPO/RTO), no de motor.

## Alternativas consideradas

1. **MySQL 8.x.** Rechazada: soporte de JSONB menos maduro (JSON con menos operadores de indexación), los types-enum y los índices parciales son más limitados; integridad transaccional comparable, pero PostgreSQL cubre mejor los requisitos de JSONB + particionado + `pg_trgm` para códigos heterogéneos reales (`029TERRA26`, `JV028/2026CH`, `005/2026SFCH` — MASTER-SPEC §4.4).
2. **MongoDB (documental).** Rechazada: el corazón del dominio (Movement → Observation, historial reconstruible, auditoría append-only, capacidad agregada por Location) exige joins y transacciones ACID multi-documento que un documental fuerza a emular; los queries de dashboard (permanencia > 30 días, ocupación por sector) serían agregaciones complejas. El JSONB de Postgres cubre la necesidad de documentos flexibles sin sacrificar relacional.
3. **SQL Server / Oracle.** Rechazada: costo de licencia y operación sin beneficio funcional sobre PostgreSQL para este dominio; el predio adquiere con PostgreSQL una base open-source auditable y desplegable en on-premise/mini-cloud sin restricciones.
4. **SQLite (embedded).** Rechazada: sin concurrencia de escritura adecuada para operación multi-usuario y sin particionado/backup robusto; solo útil en demos o testing.

## Consecuencias

**Positivas:**

- Integridad transaccional ACID para el flujo crítico (movimiento + observación + auditoría) en una sola base (ADR-001, BR-007/008/013).
- JSONB da flexibilidad evolutiva (metadata de carga, propiedades de ubicaciones/plano) sin migraciones rígidas — MASTER-SPEC §3 (layout configurable).
- Características maduras para los patrones elegidos: índices parciales (soft delete), particionado (AuditLog), tipos enum, `pg_trgm`.
- Sin costo de licencia; desplegable en Docker local e infra del predio.

**Negativas:**

- Requiere disciplina de operación: backups, vacuum, monitoreo de particiones y tamaño de tablas append-only (AuditLog/Movement); mitigado con `devops/` y jobs de mantenimiento (ADR-012).
- JSONB mal usado degrada consultas: se documenta cuándo usarlo (solo `properties`/`metadata`, no campos de búsqueda frecuente).
- El SQL nativo de PostgreSQL aparece en el límite de Prisma (queries complejas del dashboard); se acepta con `$queryRaw` acotado (ADR-005).

## Referencias

- MASTER-SPEC §4 (modelo de dominio, JSONB, índices), §11.2 (stack), §6 (BR-005, BR-008, BR-013), §4.1 (AuditLog, Movement).
- ADR-001 (una base por monolito), ADR-005 (Prisma como ORM + migraciones), ADR-010 (append-only/particionado), ADR-011 (soft delete + índices parciales).
- `architecture/DATABASE.md` (grupo W2), `devops/` (grupo W9), OQ-001, OQ-009, OQ-016.