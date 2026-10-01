# BACKEND-ARCHITECTURE.md — Arquitectura del backend de CargoOps

> Grupo W5 — Backend. Fuente de verdad canónica: `docs/MASTER-SPEC.md`. Alineado a ADR-001 (Modular Monolith), ADR-003 (NestJS), ADR-005 (Prisma), ADR-007 (REST API), ADR-008 (Auth), ADR-010 (Audit), ADR-011 (Soft Delete), ADR-012 (Background Jobs).

---

## 1. Objetivo

Definir la arquitectura de implementación del backend de CargoOps: NestJS + TypeScript + Prisma + PostgreSQL 16+, organizado como **modular monolith** con boundaries explícitos entre módulos. Este documento es la guía de referencia para el código del repositorio `cargoops-backend` (futuro): bootstrap, configuración, estructura de módulos, capas, inyección de dependencias, transacciones, arranque, health checks y documentación OpenAPI.

## 2. Contexto

CargoOps es una plataforma web de gestión operativa de cargas y depósitos en un predio logístico/aduanero. El backend debe soportar: registro de cargas y camiones, ubicaciones (plazoleta, sectores, áreas especiales), movimientos con observación obligatoria y trazabilidad total, plano configurable, alertas de rezago (30 días), RBAC de 3 roles, auditoría y exportación PDF.

Decisiones canónicas que condicionan esta arquitectura (MASTER-SPEC §11):

- **Modular Monolith** (ADR-001): un solo servicio NestJS en v1; sin microservicios. Justificación: equipo pequeño, dominio acotado, despliegue simple, transacciones ACID entre módulos, evitar complejidad distribuida prematura (KISS/YAGNI).
- **Stack**: NestJS + TypeScript strict (ADR-003), PostgreSQL 16+ (ADR-004), Prisma ORM (ADR-005), REST + OpenAPI/Swagger (ADR-007), Redis + BullMQ evaluado para jobs (ADR-012), generación de PDF vía servicio backend (ADR-013 Accepted, 2026-09-24 — OQ-005), JWT + Refresh Token (ADR-008), RBAC por permisos (ADR-009).
- **API**: REST bajo `/api/v1`, JSON, success envelope `{ data }` con `meta` opcional, error envelope `{ error: { code, message, details?, requestId } }` (MASTER-SPEC §10).
- **Dominio**: 15 entidades canónicas (MASTER-SPEC §4.1), enums canónicos (§4.3), máquina de estados de CargoStatus (§7), reglas BR-001..BR-020 (§6).
- **Módulos backend**: `auth`, `users`, `roles`, `permissions`, `cargo`, `trucks`, `locations`, `movements`, `maps`, `alerts`, `dashboard`, `reports`, `audit`, `notifications`, `settings`, `health` (MASTER-SPEC §11.3). v1 esencial: todos excepto `reports` (ver `MODULES.md`).

## 3. Restricciones

| # | Restricción | Origen |
| --- | --- | --- |
| R-01 | Un solo proceso/servicio en v1; sin microservicios ni colas externas obligatorias (BullMQ — OQ-007 resuelta: jobs reales con BullMQ en v1, ADR-012). | ADR-001, OQ-007 (resuelta) |
| R-02 | TypeScript strict mode; sin `any` implícito; ESLint + Prettier según `docs/STANDARDS.md`. | MASTER-SPEC §15 |
| R-03 | Toda validación de permisos ocurre SIEMPRE en backend (BR-009); el frontend solo replica estado para UX. | BR-009 |
| R-04 | Toda transición de estado se valida server-side con la máquina de estados (BR-016). | BR-016 |
| R-05 | Toda operación de escritura sensible genera historial y auditoría; sin hard delete en operaciones (soft delete + audit, BR-013). | ADR-010, ADR-011, BR-013 |
| R-06 | No exponer stack traces ni secretos en respuestas de error en producción. | §6 de este grupo (ERROR-HANDLING) |
| R-07 | FASE 0: solo documentación; este documento no genera código. | MASTER-SPEC §1.3 |

## 4. Dependencias

- **Documentos**: `MASTER-SPEC.md` (canónico), `OPEN-QUESTIONS.md` (OQ-001..OQ-016), `architecture/ADR/ADR-001..013` (grupo W3, aún no creados; referenciados por su índice §23 y títulos), `architecture/DATABASE.md` (grupo W2, aún no creado; las entidades de este documento se basan directamente en MASTER-SPEC §4 y deben permanecer coherentes cuando W2 lo publique).
- **Documentos del grupo**: `MODULES.md`, `DTOs.md`, `API.md`, `API-CONVENTIONS.md`, `ERROR-HANDLING.md`, `VALIDATION.md`, `JOBS.md` (mismo grupo W5).
- **Stack**: NestJS 10+ (LTS), TypeScript 5.x strict, Prisma 5.x/6.x, PostgreSQL 16+, Redis 7+ (solo si v1 adopta BullMQ — OQ-007), pino (logging), class-validator + class-transformer, @nestjs/swagger, passport-jwt o @nestjs/jwt.

## 5. Decisiones

### 5.1 Bootstrap y configuración

- **main.ts**: crea la app Nest, habilita `app.setGlobalPrefix('api/v1')` (ADR-007), `ValidationPipe` global con `whitelist: true`, `forbidNonWhitelisted: true`, `transform: true` (ver `VALIDATION.md`), registra filtro global de excepciones (ver `ERROR-HANDLING.md`), interceptores (transform + logging), middleware de requestId/correlation ID, cookieParser() (cookie httpOnly del refresh — ADR-008/SECURITY.md S1), habilita CORS para los orígenes configurados y arranca Swagger en `/api/v1/docs` (solo en dev/staging; en producción se puede exponer tras revisión de seguridad, ver `SECURITY.md` de W2).
- **ConfigModule** (global, `@nestjs/config`): carga `.env` por entorno (`.env.development`, `.env.staging`, `.env.production` — ver `devops/ENVIRONMENTS.md` de W9). Toda variable se valida al arranque contra un `validationSchema` (Joi o zod) y el arranque FALLA si falta una variable obligatoria (fail-fast). Variables principales: `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `JWT_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN`, `PORT`, `NODE_ENV`, `CORS_ORIGINS`, `REDIS_URL` (si BullMQ v1), `PDF_*` (según OQ-005), `S3_*` (según OQ-006), `LOG_LEVEL`, `COOKIE_SECURE`.
- **Enfoque fail-fast**: validar configuración y conectividad (DB, Redis si aplica) antes de aceptar tráfico.

```typescript
// src/main.ts — ilustrativo (FASE 0, no es código de producción)
async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: false },
  }));
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useLogger(app.get(Logger));
  // Swagger
  if (config.get('NODE_ENV') !== 'production' || config.get('SWAGGER_ENABLED') === 'true') {
    SwaggerModule.setup('api/v1/docs', app, document);
  }
  await app.listen(config.get<number>('PORT', 3000));
}
```

### 5.2 Estructura por módulos y capas

Cada módulo de dominio vive en `src/modules/<modulo>/` y expone públicamente SOLO su módulo NestJS (declaraciones, exports). Estructura interna: `controllers/`, `services/`, `repositories/`, `dto/`, `entities/` (o `prisma` types), `guards/`, `interceptors/`, `validators/`, `exceptions/`. Capas y responsabilidades:

| Capa | Responsabilidad | Reglas |
| --- | --- | --- |
| Controller | Parseo HTTP, DTOs, status codes, enrutado | Sin lógica de negocio; delega en service |
| Service | Orquestación, reglas de negocio, transacciones, máquina de estados | Contiene reglas BR; lanza excepciones de dominio |
| Repository | Acceso a datos vía PrismaService, queries específicas | Sin reglas de negocio; mapea a tipos de entidad |
| DTO | Contratos de entrada/salida, validación de shape | class-validator; ver `DTOs.md` |
| Guards | Autenticación y autorización (RBAC/permisos) | BR-009; ver `VALIDATION.md` |
| Interceptors | Transformación de respuesta, logging, timing | Envelope `{ data }`; ver `API-CONVENTIONS.md` |
| Validators | Validaciones de dominio reutilizables (ej. transiciones) | Ver `VALIDATION.md` |
| Exceptions | Excepciones de dominio con código de aplicación | Ver `ERROR-HANDLING.md` |

El repository NO expone `PrismaClient` crudo fuera del módulo: cada módulo define su interfaz de acceso. Esto protege los boundaries del modular monolith (los repos de un módulo no se importan desde otro módulo; la comunicación inter-módulos ocurre vía services públicos exportados).

### 5.3 Inyección de dependencias y boundaries

- DI estándar de Nest (singleton por defecto). Se evita request-scoped excepto donde sea estrictamente necesario (ej. un interceptor de requestId usa request scope ligero o middleware).
- **Regla de boundaries**: el grafo de imports entre módulos es acíclico y explícito. Se prohíbe importar `repositories`, `entities` o `dto` de otros módulos; se permite importar services exportados por el módulo dueño. La matriz de dependencias se documenta en `MODULES.md` §6.
- Para flujos que cruzan módulos (ej. `movements` necesita leer capacidad de `locations`), el módulo consumidor usa el service público del productor (ej. `LocationsService.getCapacitySnapshot(locationId)`), nunca el repo.
- **Opción evaluada**: eventos internos (EventEmitter/Nest Events) para desacoplar `movements` → `audit`/`alerts`. Decisión v1: llamadas directas a services dentro de la misma transacción (simplicidad + ACID); se habilita el uso de eventos SOLO cuando el desacople lo justifique (ej. notificaciones in-app post-movimiento, que además toleran consistencia eventual). Documentado como tradeoff: menos indirección, boundary más simple.

### 5.4 Prisma Client

- `PrismaModule` global: instancia `PrismaClient` una vez y la provee como `PrismaService` (injectable que wrappea `PrismaClient`). Logging de queries solo en development.
- Retry de conexión inicial con backoff exponencial (fail-fast en arranque si la DB está caída, pero reintento manual posterior para recuperación sin reinicio en dev; en producción el orquestador de contenedores reintenta el arranque).
- Se usan `Prisma.TransactionClient` en las transacciones (ver 5.5). Sin raw SQL excepto migraciones/casos documentados.
- `soft delete` implementado vía `deletedAt` en queries del repository (scopes base `where: { deletedAt: null }`) — ADR-011; ver `architecture/DATABASE.md` (W2).

### 5.5 Manejo de transacciones (crítico para movimientos)

Los movimientos son la operación de mayor criticidad de consistencia (modelo M:N v0.2, secciones 62-70): un movimiento puede ser **total o parcial** (BR-037 — `quantity`/`quantityUnit`/`percentage` opcionales en el DTO; sin ellos equivale al 100% del segmento origen), actualiza los segmentos `CargoLocation` de origen/destino (descuenta el origen; crea/actualiza el destino; egresa el origen si llega a 0 — BR-039), actualiza `occupiedCapacity` **derivado** de origen/destino (Σ de segmentos ACTIVE en unidad compatible de la ubicación — BR-033), inserta `Movement` + `Observation` (1:1 obligatoria, BR-006/008) y escribe auditoría (BR-008, ADR-010).

**Regla canónica: cada operación de movimiento se ejecuta dentro de UNA transacción Prisma (`prisma.$transaction`) con aislamiento `Serializable` o `RepeatableRead` (evaluar bajo carga; default de Postgres 16 es ReadCommitted, suficiente para las validaciones de capacidad si se usan locks/advisory en el orden documentado).**

Reglas adicionales derivadas de BR-041/BR-042 (OQ-041/OQ-042 resueltas):

- **Distribución parcial exige total declarado (BR-042)**: antes de aceptar un movimiento/descarga **parcial**, la carga debe tener `totalQuantity` + `totalUnit`; si faltan → `CargoTotalRequiredException` → `CARGO_TOTAL_REQUIRED` (422). El movimento 100% de un segmento NO lo exige (no hay residual que calcular); el servicio valida condicionalmente (ver pseudocódigo).
- **Residual "en camión" derivado, nunca persistido**: el camión NO es una Location; no existe `CargoLocation` de camión ni entrada de plano. El residual se calcula como `cargo.totalQuantity − Σ cargo_locations ACTIVE` (unidades compatibles) y se expone en respuestas como `inTruckAmount`/`inTruckUnit` (derivados, `DTOs.md` §4.12). Un movimiento parcial puede **reducir el residual** (se descuenta del origen/segmento o directamente "desde el camión") sin crear filas.
- **Unidad efectiva de capacidad (BR-041)**: la comparación de capacidad usa la **unidad efectiva** de la ubicación destino = `capacityUnit` (override) si está declarado en la ubicación; si no, el **default por LocationType** (SECTOR → AREA, PLAZOLETA/SCANNER/BALANZA → UNITS, otros → configurable). `resolveEffectiveUnit(location)` es la función central; el override y los defaults se administran con permisos ADMIN (`location.manage`, ver `architecture/AUTHORIZATION.md`) y se auditan (`CAPACITY_CHANGE`).

Flujo transaccional del movimiento (parcial):

```typescript
// src/modules/movements/services/movement.service.ts — ilustrativo (FASE 0)
async moveCargo(dto: MoveCargoDto, actor: AuthUser): Promise<Movement> {
  return this.prisma.$transaction(async (tx) => {
    // 1. Lectura con lock de la carga (tx.cargo.findUnique + FOR UPDATE)
    const cargo = await this.cargoRepo.lockForUpdate(tx, dto.cargoId);
    // 2. Reglas de negocio: existencia (BR-003), transición (BR-016),
    //    observación no vacía (BR-006 — validada ya en DTO y revalidada aquí),
    //    capacidad del destino (BR-005/036) y estado ACTIVE del destino (BR-004)
    if (isPartialMove(dto)) {
      this.assertTotalDeclaredForPartial(cargo); // BR-042 → CargoTotalRequiredException (422)
    }
    const effectiveTargetUnit = await this.resolveEffectiveUnit(tx, dto.toLocationId); // BR-041
    const source = await this.cargoLocationRepo.lockForUpdate(tx, dto.fromCargoLocationId); // segmento origen (parcial, BR-037)
    const target = await this.locationRepo.lockForUpdate(tx, dto.toLocationId);
    this.assertCapacity(target, cargo, effectiveTargetUnit, tx); // BR-005/036 → ConflictError(CAPACITY_EXCEEDED)
    // 3. Actualizar segmentos CargoLocation: origen (−Δ, egreso si llega a 0) y
    //    destino (+Δ o creación) según quantity/quantityUnit/percentage (BR-037/039).
    //    El residual "en camión" NO se materializa (BR-042): solo se recalcula al
    //    leer la carga (inTruckAmount/inTruckUnit) o se ajusta vía descarga parcial.
    // 4. Actualizar occupiedCapacity derivado de origen/destino (Σ segmentos ACTIVE
    //    en unidad compatible de la ubicación — BR-033/035)
    // 5. Insertar Movement + Observation (1:1 obligatoria — BR-006/008)
    // 6. AuditLog (ACTION: MOVE)
  }, { timeout: 10_000 });
}

// BR-041: unidad efectiva = override de la ubicación ?? default por LocationType (tabla de configuración)
private async resolveEffectiveUnit(tx: Prisma.TransactionClient, locationId: string): Promise<QuantityUnit> {
  const location = await tx.location.findUniqueOrThrow({ where: { id: locationId } });
  return location.capacityUnit // override explícito (se persiste en alta/update)
    ?? (await this.settingsService.getLocationTypeDefaultUnit(tx, location.type)); // default BR-041
}
```

Reglas concretas:

- **Locking**: `SELECT ... FOR UPDATE` sobre filas `cargo`, `location` de origen/destino y los segmentos `CargoLocation` a afectar dentro de la transacción, para evitar carreras en `occupiedCapacity` derivado (BR-005/033). Prisma no expone `FOR UPDATE` nativo: se usa `tx.$queryRaw` de lectura puntual con lock, o advisory locks (`pg_advisory_xact_lock(hash)`) por `cargoLocationId` a afectar y por `locationId` de origen/destino para serializar actualizaciones de ocupación. **Decisión**: advisory lock transaccional por `cargoLocationId` + `locationId` de origen/destino + revalidación de capacidad dentro de la transacción (simple, portable, evita deadlocks entre cargas distintas).
- **Tiempo límite**: timeout explícito por transacción (10 s); timeouts de Prisma se traducen a `503/504` (ver `ERROR-HANDLING.md`).
- **Auditoría dentro o fuera de la transacción**: dentro de la misma `$transaction`. Tradeoff evaluado: auditoría en cola asíncrona daría menor latencia pero rompe la garantía "toda mutación queda auditada" (BR-013, ADR-010). V1: misma transacción. Si QA de rendimiento (W8) muestra cuello de botella, se evalúa tabla de auditoría particionada.
- **Idempotencia**: ver `API-CONVENTIONS.md` §7 (cabecera `Idempotency-Key` en operaciones de movimiento; recomendada, con tradeoffs documentados).
- **Límite de operaciones por transacción**: se evitan transacciones de larga duración; las operaciones por lotes (seed, recalculos) se procesan en lotes de ≤ 500 filas con transacciones cortas.

### 5.6 Arranque y health checks

- `GET /api/v1/health` — **liveness**: responde `200` si el proceso está vivo (sin dependencias). `GET /api/v1/health/ready` — **readiness**: verifica PostgreSQL (`SELECT 1`), Redis (si BullMQ en v1) y conectividad S3 (si aplica); responde `503` con el detalle de dependencias fallidas si alguna cae.
- En arranque: validar esquema de configuración, conectar DB y ejecutar `prisma migrate deploy` (en CI/CD, no en runtime), luego escuchar. El módulo `health` expone estos endpoints (ver `MODULES.md` §5).
- `shutdown hooks` habilitados (`app.enableShutdownHooks()`) para cierre limpio: cerrar conexiones Prisma/Redis, drenar jobs en curso (ver `JOBS.md`).

### 5.7 OpenAPI / Swagger

- `@nestjs/swagger` con tags por módulo (`Auth`, `Cargos`, `Locations`, `Maps`, `Movements`, `Trucks`, `Users`, `Roles`, `Alerts`, `Audit`, `Dashboard`, `Notifications`, `Settings`, `Health`).
- Los DTOs son la fuente del schema (`@ApiProperty` con descripciones, `enum`, `required`); las respuestas se tipan con `@ApiResponse` y el envelope `{ data }` se documenta con el interceptor/helper correspondiente.
- Los códigos de error por endpoint se documentan en `API.md` y se reflejan en Swagger via `@ApiResponse` para 400/401/403/404/409/422.
- Contrato versionado: `/api/v1` (ADR-007); breaking change → `/api/v2` (MASTER-SPEC §10).

## 6. Criterios de aceptación

1. Se puede levantar el backend con `npm run start:dev` a partir de la documentación (configuración por variables de entorno, fail-fast si falta alguna).
2. El arranque valida DB y dependencias; `/health` y `/health/ready` responden correctamente (200/503 según estado).
3. Cada módulo de la lista §5.2 existe con su estructura de capas; el grafo de imports entre módulos respeta los boundaries (verificable con `dependency-cruiser` o equivalente).
4. Un movimiento de carga se ejecuta en una transacción: fallo a mitad de camino NO deja cargo movido sin observación, ni capacidad inconsistente, ni auditoría faltante (criterio de QA crítico).
5. La doc OpenAPI/Swagger se genera en `/api/v1/docs` con tags por módulo y refleja los contratos de `API.md`.
6. Los errores de todas las capas salen en el envelope estandarizado con `requestId` (ver `ERROR-HANDLING.md`).

## 7. Archivos involucrados

| Ruta | Rol |
| --- | --- |
| `docs/backend/BACKEND-ARCHITECTURE.md` | Este documento |
| `docs/backend/MODULES.md` · `DTOs.md` · `API.md` · `API-CONVENTIONS.md` · `ERROR-HANDLING.md` · `VALIDATION.md` · `JOBS.md` | Documentos del grupo W5 (dependencias directas) |
| `docs/MASTER-SPEC.md` · `docs/OPEN-QUESTIONS.md` | Fuente de verdad canónica y pendientes |
| `architecture/ADR/ADR-001..013` (W3, futuro) | Decide formalmente y confirma este documento |
| `architecture/DATABASE.md` (W2, futuro) | Entidades/esquema DB; este documento debe permanecer coherente (misma base: MASTER-SPEC §4) |
| `devops/ENVIRONMENTS.md`, `devops/MONITORING.md`, `devops/LOGGING.md` (W9, futuro) | Variables de entorno, métricas y logging operativo |

## 8. Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Carreras de concurrencia en `occupiedCapacity` (BR-005/033) al mover cargas simultáneas | Advisory locks transaccionales por `cargoLocationId` + `locationId` de origen/destino + revalidación dentro de la transacción (5.5); casos de QA en W8 |
| Transacciones largas degradando la DB | Timeout por transacción, límite de filas por lote, advisory locks cortos |
| Boundaries entre módulos se erosionan (imports cruzados de repos/entidades) | Regla documentada + verificación automática (dependency-cruiser) en CI |
| BullMQ/Redis en v1 (OQ-007) obliga infraestructura extra sin beneficio claro | El diseño 5.6/`JOBS.md` mantiene los jobs detrás de una interfaz; arranque sin Redis si v1 difiere jobs (ver `JOBS.md` §9) |
| Swagger expone contratos en producción | Swagger habilitado solo por configuración explícita o entorno no productivo (5.1/5.7) |
| Desalineación con `architecture/DATABASE.md` cuando W2 lo publique | Base común MASTER-SPEC §4; revisión cruzada al publicarse W2 |

## 9. DECISIÓN PENDIENTE

> Las OQ referenciadas quedaron **resueltas en FASE 0** (MASTER-SPEC v0.5 / OPEN-QUESTIONS, 2026-09-23/24): las filas tachadas con `→ RESUELTA` ya tienen decisión canónica; las marcadas **🔶** son **residuales locales** sin resolver (decisión de QA/implementación, no de negocio).

| # | Pregunta | Impacto | Referencia |
| --- | --- | --- | --- |
| 1 | ~~¿Redis + BullMQ en v1 para jobs reales (alertas 30d, PDF, limpieza de tokens) o se difiere a v1.1 con scheduler in-process?~~ → **RESUELTA (OQ-007 → ADR-012 Accepted, 2026-09-24)**: **Sí en v1**: alertas de permanencia (BR-014/015) y generación asíncrona de PDF (OQ-005) son jobs reales | Infraestructura (5.6), JOBS.md | OQ-007, ADR-012 (resuelta 2026-09-24) |
| 2 | ~~¿Estrategia concreta de generación de PDF (HTML→PDF, Puppeteer/Chromium, otro)?~~ → **RESUELTA (OQ-005 → ADR-013 Accepted, 2026-09-24)**: **HTML→PDF con Chromium (Puppeteer)** en un servicio backend especializado; reutiliza estilos del frontend | 5.2, API.md (export-pdf) | OQ-005, ADR-013 (resuelta 2026-09-24) |
| 3 | ~~¿Storage S3: MinIO self-hosted o servicio cloud en producción?~~ → **RESUELTA (OQ-006, 2026-09-24)**: **MinIO self-hosted** en producción (API S3 compatible, sin dependencia cloud, migrable a AWS S3 sin reescribir) | Config (5.1) | OQ-006 (resuelta 2026-09-24) |
| 4 | ~~¿Unidad de capacidad por defecto por `LocationType` y conversión entre unidades para el cómputo de `occupiedCapacity` derivado?~~ → **RESUELTA (OQ-041 → BR-041, y OQ-044 → BR-048, 2026-09-23/24)**: SECTOR → AREA, PLAZOLETA/SCANNER/BALANZA → UNITS, otros → configurable, con override por ubicación y gobernanza ADMIN; **conversión entre unidades NO soportada en v1** (unidades compatibles o `PERCENT`; `UNIT_INCOMPATIBLE` 422) | Transacciones de movimiento (5.5) | OQ-041 / OQ-044 (resueltas) |
| 5 | ¿Aislamiento de transacciones específico (`RepeatableRead` vs `Serializable`) según pruebas de carga? | 5.5 | 🔶 Residual local QA (W8) + PROD |