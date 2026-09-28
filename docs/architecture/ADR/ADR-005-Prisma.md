# ADR-005 — Prisma

- Estado: Accepted
- Fecha: 2026-09-23
- Decisores: Equipo CargoOps / Software Architect

## Contexto

El backend NestJS (ADR-003) necesita una capa de acceso a datos sobre PostgreSQL (ADR-004) que: (a) garantice **tipado end-to-end** entre el schema de base y los services (el 90% del dominio es CRUD transaccional), (b) gestione **migraciones versionadas** reproducibles en dev/staging/prod, (c) soporte los patrones del dominio —soft delete (ADR-011), auditoría (ADR-010), JSONB, enums canónicos (MASTER-SPEC §4.3)— y (d) deje escape a SQL crudo para consultas complejas del dashboard y del motor de mapa (ADR-006). El MASTER-SPEC fija el ORM en §11.2: **Prisma**.

## Decisión

Adoptar **Prisma** (versión estable vigente, Prisma 6 o superior al momento de implementar) como ORM del backend:

- **Schema declarativo como fuente de verdad** del modelo relacional (MASTER-SPEC §4): entidades, enums nativos de Prisma, relaciones; los types-enum de PostgreSQL se mapean con los enums de Prisma y se sincronizan vía migración.
- **Prisma Migrate** como única vía de cambios de schema: cada cambio de dominio genera una migración SQL versionada y revisable; prohibido alterar la base a mano en ambientes compartidos (se documenta en `architecture/DATABASE.md`).
- **Cliente generado y tipado** (`PrismaClient`) inyectado vía un `PrismaService` único en NestJS (lifecycle `OnModuleInit` → `$connect`, `OnModuleDestroy` → `$disconnect`); se exponen los repositorios por módulo (ADR-001) sobre este cliente, sin exponer PrismaClient a través de los puertos entre módulos.
- **Soft delete por defecto**: middleware global que inyecta filtro `deletedAt: null` en queries de lectura de entidades con `deletedAt`, y flag `includeDeleted: true` explícito para administración (ADR-011). El middleware se registra una sola vez y se documenta para no repetir filtros a mano.
- **JSONB**: campos `Json` de Prisma mapeados a `jsonb` en PostgreSQL (MASTER-SPEC §4.1: `properties`, `metadata`, `previousValue/newValue`).
- **Transacciones**: `prisma.$transaction` para los flujos atómicos (movimiento + observación + auditoría; soft delete + auditoría) — ADR-001/010/011. En flujos con múltiples aggregates se evalúa el patrón interactive transaction.
- **SQL crudo acotado** (`$queryRaw`/`$executeRaw` con `Prisma.sql` template) SOLO para: búsquedas con `pg_trgm`, agregaciones de capacidad/ocupación del dashboard (BR-005, OQ-009) y consultas espaciales del mapa/plano. Cada uso crudo se aísla en un repository y se revisa en code review.
- **Retries de conexión** y pool sizing documentados en `backend/BACKEND-ARCHITECTURE.md` (conexión bajo carga de operación diurna del predio).

El estado de decisión es **Accepted**: es la decisión canónica de MASTER-SPEC §11.2.

## Alternativas consideradas

1. **TypeORM.** Rechazada: entidades con decoradores acoplan el modelo de dominio al ORM (contradice los puertos del ADR-001), historial conocido de inconsistencias de migraciones y de comportamiento con `jsonb`/índices parciales; el tipado generado es más débil que el de Prisma.
2. **Drizzle ORM.** Evaluada seriamente: SQL-first, tipado fino y sin magia de generación. Rechazada para v1 por: ecosistema de migraciones y tooling menos maduro que Prisma Migrate al momento de la decisión, mayor boilerplate manual en NestJS (sin service/repository convencional equivalente) y porque el equipo/agentes de implementación tienen más material operativo con Prisma. **Se reabre** si el equipo prefiere SQL-first y el costo del schema declarativo pesa (decisión documentada para revisión en v1.1).
3. **Knex (query builder).** Rechazada: sin tipado de resultados ni migraciones declarativas; obligaría a escribir el mapeo objeto-relacional a mano para ~20 entidades, inflando el código de repositorios.
4. **SQL crudo + capa propia.** Rechazada: duplicaría el trabajo de migraciones, tipado y mapeo; el costo de mantener un mini-ORM propio no se justifica en un dominio CRUD-pesado.

## Consecuencias

**Positivas:**

- Tipado end-to-end schema→service: errores de query en compile-time, no en runtime del predio.
- Migraciones versionadas y revisables (ADR-004), alineadas con el flujo de CI/CD (MASTER-SPEC §14).
- Middleware centraliza soft delete y evita olvidos de filtro `deletedAt` (ADR-011).
- Prisma Studio como herramienta de inspección en dev (útil para seeds de MASTER-SPEC §5).

**Negativas:**

- El generador agrega un paso al build/CI (regenerar cliente tras cada migración).
- Consultas complejas (dashboard/filtros combinados) pierden expresividad: se resuelve con `$queryRaw` acotado, que requiere disciplina de revisión para no esparcir SQL.
- Dependencia de release del ORM (migraciones de Prisma a veces requieren pasos manuales en upgrades); se mitiga con pins de versión y PR de actualización dedicados.
- Los enums de Prisma no se sincronizan solos con types-enum PostgreSQL creativos: se definen solo en un lado (Prisma como fuente) y la migración genera el type-enum; documentado en `DATABASE.md`.

## Referencias

- MASTER-SPEC §4 (modelo de dominio), §11.2 (stack), §6 (BR-005/008/013).
- ADR-004 (PostgreSQL 16+, JSONB, índices parciales), ADR-001 (puertos entre módulos), ADR-003 (NestJS + DI), ADR-011 (soft delete), ADR-010 (auditoría).
- `architecture/DATABASE.md`, `backend/BACKEND-ARCHITECTURE.md` (grupos W2/W5).