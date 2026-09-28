# JOBS.md — Background jobs del backend de CargoOps

> Grupo W5 — Backend. Trabajo asíncrono: colas BullMQ + Redis (ADR-012 **Accepted** — OQ-007 resuelta), jobs de v1 (alerta de rezago 30 días, exportaciones PDF pesadas, mantenimiento), configuración, reintentos, dead-letter, cron vs cola y criterios de cuándo un proceso pasa a job.

---

## 1. Objetivo

Definir el modelo de background jobs de CargoOps: qué procesos son asíncronos en v1 (y cuáles se difieren), cómo se ejecutan (BullMQ + Redis en v1 — OQ-007 resuelta; la alternativa `@nestjs/schedule` queda documentada como variante descartada, §4.12), configuración de colas (nombres, reintentos, backoff, dead-letter, concurrencia), la distinción cron vs cola, y los criterios objetivos para decidir cuándo un proceso pasa a job. Coherente con ADR-012 (Background Jobs), ADR-013 (PDF) y MASTER-SPEC §9 (alertas/rezago), §11.6 (PDF) y BR-014/BR-015.

## 2. Contexto

Trabajo asíncrono identificado en v1/v1.1 (ADR-012):

- **Alerta de rezago 30 días (BR-014)**: barrido diario que detecta permanencia > umbral (default 30 días desde `entryDate` — BR-015/OQ-008) y genera `Alert STALE_30D OPEN` con deduplicación. NO mueve cargas automáticamente (BR-014: decisión humana).
- **Exportación PDF (ADR-013)**: generación server-side de documentos de carga/historial (endpoint `export-pdf`); según estrategia (OQ-005 resuelta: Puppeteer/Chromium HTML→PDF) es asíncrona con cola `pdf-exports` + descarga posterior para documentos grandes (síncrona para livianos).
- **Mantenimiento**: rotación/archivado de `AuditLog` (ADR-010), limpieza de refresh tokens expirados (ADR-008), limpieza de `Idempotency-Key` vencidas (API-CONVENTIONS §4.8); potencial recálculo de `occupiedCapacity` como job solo si el volumen real lo exigiera (hoy es derivado y recalculado en la transacción de movimiento — DATABASE.md §5.3; decisión OQ-031: agregación en vivo, BR-051).
- **Futuro (v1.1+)**: notificaciones multicanal (EMAIL/PUSH/WHATSAPP/WEBHOOK, OQ-011 resuelta: solo IN_APP en v1), reportes programados, multi-predio (MASTER-SPEC §1.5).
- **Dashboard summarization**: EVALUADO y DIFERIDO en v1 — el dashboard lee agregaciones en vivo con índices (`ix_cargo_location_id`, `ix_cargo_status`, DATABASE.md §5.7) y `occupiedCapacity` se mantiene derivado y recalculado en la transacción de movimiento (no es job en v1; OQ-031 resuelta → BR-051: agregación en vivo); no hay fuente canónica que exija materializar KPIs por job (ver §4.5).

## 3. Restricciones

| # | Restricción | Origen |
| --- | --- | --- |
| R-01 | Sin workers dedicados obligatorios: BullMQ usa workers EN PROCESO del monolito (misma imagen); separar a proceso propio es configuración de despliegue, no de código. | ADR-012 |
| R-02 | Todo job es idempotente: reintentar no duplica efectos (alerta ya abierta, token ya revocado, clave ya persistida). | ADR-012, BR-014 |
| R-03 | Los jobs de mutación persisten dentro del mismo modelo transaccional (Prisma); nunca se escribe fuera de transacción. | BACKEND-ARCHITECTURE §5.5 |
| R-04 | Cron con timezone explícita del predio (configurable — OQ-008); sin crons "cada 24 h" sin zona definida. | ADR-012 (consecuencias) |
| R-05 | La variante in-process `@nestjs/schedule` (sin Redis/BullMQ) queda documentada en §4.12 como alternativa descartada para v1; si se adoptara en v1.1, los jobs se re-diseñan sin cambiar las entidades/reglas de negocio. | ADR-012, OQ-007 |
| R-06 | Bull Board (UI de colas) solo en dev/staging; en producción, métricas a monitoreo (W9). | ADR-012 |

## 4. Decisiones

### 4.1 Arquitectura de jobs

- **Stack (v1, OQ-007 resuelta)**: `@nestjs/bullmq` (BullMQ sobre Redis 7+). Redis con persistencia (AOF/RDB), backup y seguridad de red según DEVOPS/DOCKER (W9); `REDIS_URL` como variable de entorno obligatoria (BACKEND-ARCHITECTURE §5.1).
- **Workers en proceso**: los workers se registran dentro del mismo proceso NestJS del API (un worker por cola). Concurrencia por worker acotada (ver §4.7). La separación a un proceso de workers dedicado es decisión de despliegue posterior (ADR-012).
- **Integración con el dominio**: los jobs NO reimplementan reglas de negocio; llaman a los services de dominio existentes (`AlertsService`, `PdfService`/módulo pdf, `AuditService`, `AuthService`) que ya validan y escriben en transacciones.
- **Desacople para testing**: cada job expone su lógica pura (función `process(data)` invocable sin Redis en tests unitarios) y el wrapper BullMQ solo agrega transporte/retry.
- **Alternativa de diferimiento** (OQ-007 resuelta a favor de BullMQ en v1): la variante `@nestjs/schedule` queda documentada en §4.12 como alternativa evaluada y descartada para v1.

### 4.2 Colas de v1

| Cola | Tipo | Disparo | Job | Responsable |
| --- | --- | --- | --- | --- |
| `alerts` | Cron/repeatable (diario) | Scheduler con timezone del predio | Detección de rezago (`STALE_30D`, BR-014) + detección de umbral/sobreocupación de capacidad (`CAPACITY`, BR-033/036 — §4.13) | Módulo `alerts` |
| `pdf-exports` | Cola de eventos | Request `export-pdf` (202) | Render del PDF (Puppeteer, ADR-013), upload a S3, URL firmada | Módulo `cargo`/servicio `pdf` (ADR-013) |
| `maintenance` | Cron (repetitivo) | Scheduler | Rotación de `AuditLog`, limpieza de refresh tokens e `Idempotency-Key`, checks de consistencia | `audit` + `auth` + comunes |

Naming: colas en minúsculas con guion (`pdf-exports`); dead-letter derivado `<nombre>:dead` (§4.9). No se crean colas fuera de esta lista en v1 sin revisión del orquestador (análogo a MODULES.md R-01).

### 4.3 Job — Alerta de rezago 30 días (BR-014/015)

- **Disparo**: cron diario (repeatable job) con timezone del predio; hora configurable por entorno/settings (OQ-008 resuelta 2026-09-23 → BR-014/015: días corridos, base `entryDate`, segunda alerta a los 40).
- **Detección** (barrido, no evento): cargas con `entry_date < now() - <dias>` (default 30), sin soft delete, sin estado terminal (`EXITED`/`DELETED`), y **sin alerta `STALE_30D` OPEN** ya existente (dedupe). Query de referencia (DATABASE.md §10):

```sql
SELECT c.id, c.code, c.entry_date
FROM cargo c
WHERE c.deleted_at IS NULL
  AND c.status NOT IN ('EXITED', 'DELETED')
  AND c.entry_date < now() - interval '30 days'
  AND NOT EXISTS (SELECT 1 FROM alerts a
                  WHERE a.cargo_id = c.id AND a.type = 'STALE_30D'
                    AND a.status = 'OPEN');
```

- **Creación**: por cada carga detectada, una `Alert` `{ type: 'STALE_30D', status: 'OPEN', severity: MEDIUM (30 días → MEDIUM; segunda alerta día 40 → HIGH — MASTER-SPEC §4.3), dueAt: entryDate + dias }` dentro de una transacción por carga (lotes cortos ≤ 500 — BACKEND-ARCHITECTURE §5.5). Opcional v1: notificación in-app al operador (OQ-011).
- **Deduplicación garantizada por DB**: índice único parcial `(cargo_id, type) WHERE status = 'OPEN'` (DATABASE.md §5.3) — un reintento del job o una corrida multi-instancia NO genera alertas duplicadas (R-02).
- **NO mueve cargas** (BR-014): el paso a REZAGO es SIEMPRE decisión humana con observación (VALIDATION.md §4.4).
- **Costo/performance**: usa `ix_cargo_entry_date`; `executionTime` se loguea y se alerta si degrada (W9).

### 4.4 Job — Exportaciones PDF pesadas (ADR-013, OQ-005)

- **Flujo (asíncrono para documentos grandes — OQ-005 resuelta)**: `POST /api/v1/cargos/:id/export-pdf` (verbo POST canónico — OQ-017; API-CONVENTIONS §8 #5 resuelta) → valida permiso `cargo.export_pdf` (BR-018) y audita `EXPORT` → encola en `pdf-exports` con `cargoId` + **snapshot** de datos (el estado puede cambiar entre encolado y render; el snapshot se estampa en el PDF, ADR-013) → responde `202` con `{ exportId, status: 'PROCESSING', downloadUrl }`.
- **Worker**: render HTML→PDF con Chromium headless (Puppeteer) usando plantillas propias sin JS ni carga remota (seguridad: HTML escapado, sin SSRF — ADR-013); sube el artefacto a S3 (OQ-006) con clave `exports/cargos/:id/<hash>.pdf`; devuelve URL firmada de descarga con expiración corta (15 min propuesto).
- **Concurrencia**: 1–2 renders simultáneos por instancia (memoria de Chromium) — se configura por cola/worker (ADR-013).
- **Límites**: timeout y tamaño máximo de documento por job; historiales muy largos se paginan en el HTML (ADR-013). Excedido → fail con dead-letter (ver §4.9).
- **Si PDF es síncrono** (documentos livianos, variante de la decisión OQ-005/OQ-007): el service de pdf se invoca desde el controller con timeout; sin cola ni caché S3; límites documentados en ADR-012 (§"Opción alternativa").

### 4.5 Dashboard summarization — DIFERIDO (evaluado)

- **No es un job de v1** según las fuentes canónicas: MASTER-SPEC §10 define `GET /api/v1/dashboard` como endpoint de agregación; DATABASE.md §5.3 mantiene `occupiedCapacity` **derivado y recalculado en la transacción** de movimiento (no por job) y §5.7 provee los índices para las agregaciones en vivo (ocupación, conteos por estado, alertas abiertas).
- **Es un job SOLO si el volumen real lo exige** (OQ-031 resuelta 2026-09-24 → BR-051: agregación **en vivo** en v1, sin job de materialización). Un cómputo costoso o la materialización de KPIs quedaría para v1.1, con `occupiedCapacity` como salida de la materialización (cambio de DERIVADO transaccional a derivado por job — decisión de arquitectura que tocaría DATABASE.md y los tests de BR-005).
- **Pendiente**: ninguna — la pregunta de v1 quedó resuelta como agregación en vivo (OQ-031 → BR-051).

### 4.6 Job — Maintenance

| Tarea | Frecuencia | Detalle |
| --- | --- | --- |
| Rotación/archivado de `AuditLog` | Cron (diario/semanal) | Poda/retención según política (AUDIT.md §5.8 pendiente; DATABASE.md D9); por lotes ≤ 500 |
| Limpieza de refresh tokens expirados | Cron (diario) | `AuthService.revokeExpired()` — idempotente (revocado ya no se toca) |
| Limpieza de `Idempotency-Key` vencidas | Cron (diario) | TTL 24 h (API-CONVENTIONS §4.8) |
| Checks de consistencia (opcional) | Cron | Detección de divergencias de `occupiedCapacity` (solo si QA/volumen real lo pide; hoy es transaccional — OQ-031 resuelta: en vivo) |

Todas son idempotentes y sin efectos visibles para el usuario; fallas se loguean y van a dead-letter para revisión.

### 4.7 Configuración de colas

| Parámetro | Valor v1 (propuesto) | Notas |
| --- | --- | --- |
| `REDIS_URL` | env obligatoria | Validada al arranque (fail-fast, BACKEND-ARCHITECTURE §5.1) |
| Intentos por job | `attempts: 3–5` | Según criticidad (`alerts` 3; `pdf-exports` 5 por S3/flaky) |
| Backoff | Exponencial (1s → 5s → 25s … cap 5 min) | `backoff: { type: 'exponential' }` |
| `removeOnComplete` | Retener últimos N (p. ej. 1000) o por antigüedad | Evita crecimiento infinito de Redis; visibilidad de completados |
| Concurrencia por worker | `alerts`: 1 · `pdf-exports`: 1–2 · `maintenance`: 1 | PDF limitado por memoria de Chromium (ADR-013) |
| Timezone de crons | Zona del predio (configurable) | OQ-008 |
| Stalled jobs | `maxStalledCount` default | Jobs colgados se re-procesan; la idempotencia lo hace seguro |
| Bull Board | dev/staging | UI de inspección; no expuesta en producción (R-06) |

### 4.8 Reintentos

- Fracasos **transitorios** (S3 no disponible, Redis momentáneo, timeout de DB) → reintento con backoff exponencial, respetando la idempotencia (R-02).
- Reglas de reintento: (a) el job debe ser idempotente ANTES de habilitar retries; (b) cada intento loguea `attempt`, `error.code`, `correlationId`; (c) nunca se reintenta con backoff menores a 1 s (evita thundering herd).
- Fracasos **permanentes** (dato inválido, permiso perdido, plantilla rota) → fail inmediato SIN reintento (se detecta por tipo de excepción: `DomainException` no se reintenta; `InfrastructureException` transitoria sí).
- La deduplicación en DB es la red de seguridad final (índice único parcial de alertas, tokens ya revocados, etc.).

### 4.9 Dead-letter

- Definición: job que agotó `attempts` con fallo permanente o transitorio persistente se **mueve a la cola `<nombre>:dead`** (patrón de dead-letter del worker, documentado en el módulo jobs) y NO se elimina: queda inspeccionable y re-encolable manualmente.
- Monitoreo: jobs en `:dead` y `failed` > 0 en estado no esperado → alerta operativa (W9 MONITORING); Bull Board en dev/staging; métricas `bullmq.*` en producción.
- Acciones sobre dead-letter: revisar logs (todos llevan `requestId`/`correlationId`), corregir causa raíz, re-encolar manualmente o descartar con justificación auditable.
- Los dead-letter NO reintentan solos ni generan alertas de usuario: son señal para el equipo, no para el operador del predio.

### 4.10 Cron vs cola

| Criterio | Cron (repeatable) | Cola (evento) |
| --- | --- | --- |
| Disparo | Horario programado (diario, semanal) | Evento de negocio/request (`export-pdf`, notificación) |
| Volumen | Barrido masivo de datos (todas las cargas) | Operación unitaria (el PDF de UNA carga) |
| Predictibilidad | Conocida de antemano | Depende del uso |
| Retry | Menos crítico (volverá a correr) | Crítico (desapareció la ocasión; hay un usuario esperando) |
| Prioridad | Baja | Media-alta (respuesta 202 prometida) |
| Ejemplos CargoOps | `alerts` (diario), `maintenance` (diario) | `pdf-exports` (bajo demanda) |

Regla: si el trabajo es programable → cron/repeatable; si lo dispara un evento o request → cola. Un job diario puede ENCOLAR trabajo puntual si un reintento inmediato importa (p. ej. el barrido detecta y encola avisos), pero en v1 la alerta se inserta directamente en el barrido (dedupe en DB cubre el riesgo).

### 4.11 Criterios: cuándo un proceso pasa a job

Un proceso se convierte en job si cumple **al menos uno** de estos criterios (umbrales propuestos por W5, a validar con QA W8):

| Criterio | Umbral/condición | Ejemplo CargoOps |
| --- | --- | --- |
| Duración bloqueante | Estimado > 2–3 s (o variable) en el ciclo request/response | PDF de historial largo |
| Recursos pesados | CPU/memoria alta (Chromium, renders) | PDF (Puppeteer) |
| Barrido masivo programable | Scan completo de tabla con periodo fijo | Alertas 30 días, maintenance |
| Necesidad de retry | Probabilidad real de fallo transitorio | S3, DB transitoria |
| Regularidad fija | Ejecución repetitiva por calendario | Cron diario |
| Tolerancia de latencia | El cliente acepta `202` + estado/descarga posterior | export-pdf asíncrono |
| Independencia del request | No necesita la sesión/response del usuario | Maintenance |

Si NINGUNO aplica (operación trivial < 100 ms, síncrona esperada, sin retry requerido), se mantiene **síncrono**: no se agrega infraestructura por "estética" (KISS/YAGNI, ADR-001). El dashboard en vivo §4.5 es el ejemplo de proceso que NO pasa a job hoy.

### 4.12 OQ-007: alternativa de diferimiento (evaluada y descartada para v1)

OQ-007 se resolvió 2026-09-24 a favor de **Redis + BullMQ en v1** (ADR-012 Accepted). La variante de diferimiento queda documentada como alternativa evaluada:

- **Scheduler in-process** con `@nestjs/schedule`: los crons `alerts` y `maintenance` corren en el proceso del API.
- **Líder único**: en despliegue multi-instancia se requiere flag de líder o se acepta la duplicación cubierta por el dedupe en DB (índice único parcial de alertas). En v1 (monolito, probablemente 1 réplica) el riesgo es bajo.
- **PDF síncrono con timeout**: sin cola ni caché S3; documento liviano ⇒ ok; historial pesado ⇒ timeout y error visible reintentable (ADR-012/013 documentan límites). Sin retry robusto ni dead-letter: deuda técnica asumida y documentada.
- **Sin `maintenance` automático**: se corre por cron simple (rotación, tokens) o se difiere; limpieza de `Idempotency-Key` se hace en el path de escritura (lazy).
- **Migración posterior**: los jobs v1.1 migran a BullMQ tocando workers/interfaces de cola; el costo se acepta por ser temprano (ADR-012). Se preserva el contrato: las entidades, reglas BR y endpoints NO cambian (R-05).

### 4.13 Job — Alerta de capacidad (BR-033/036, secciones 62-70)

- **Disparo**: cron diario (repeatable), cola `alerts`, timezone del predio (R-04). Umbral configurable por `settings` (p. ej. `capacity.alertThreshold = 0.90` — MASTER-SPEC §9); la regla de sobreocupación quedó resuelta (OQ-043 → BR-036 ampliada: flag `allowOverOccupation` + límite de % extra configurable, default **+10%** + autorización **solo ADMIN** + observación obligatoria + auditoría `CAPACITY_CHANGE`).
- **Detección**: por ubicación `ACTIVE` con `capacityUnit != 'UNLIMITED'`: `occupiedCapacity` **derivado** = Σ `quantity` de `CargoLocation` ACTIVE en unidad compatible de la ubicación (BR-033; unidades incompatibles NO se suman — BR-035, OQ-044). Se genera `Alert CAPACITY OPEN` cuando `occupiedCapacity ≥ umbral × capacity`, o cuando `allowOverOccupation = true` y `occupiedCapacity > capacity` (sobreocupación, BR-036). NO ejecuta acciones automáticas: la alerta es señal; la resolución es humana con observación (análogo BR-014).
- **Dedupe**: análogo a STALE_30D — índice único parcial propuesto `(location_id, type = 'CAPACITY') WHERE status = 'OPEN'` (el desglose por unidad en el índice queda descartado: OQ-041 resuelta → BR-041 con unidad efectiva por ubicación; la unidad del índice es la de la ubicación).
- **Consulta de referencia** (ilustrativa, FASE 0):

```sql
SELECT l.id, l.code, l.capacity, l.capacity_unit, l.allow_over_occupation,
       COALESCE(SUM(cl.quantity) FILTER (WHERE cl.status = 'ACTIVE'
                                         AND cl.quantity_unit = l.capacity_unit), 0) AS occupied
FROM locations l
LEFT JOIN cargo_location cl ON cl.location_id = l.id
WHERE l.status = 'ACTIVE' AND l.capacity_unit <> 'UNLIMITED'
GROUP BY l.id;
```

- **Alineación OQ-007 (resuelta 2026-09-24)**: BullMQ en v1 (ADR-012 Accepted); el cron corre como job de la cola `alerts` con la lógica pura de detección (testeable sin Redis). El cálculo usa `occupiedCapacity` derivado (modelo M:N) — no vuelve a implementar reglas de negocio.
- **Pendientes**: ninguna — unidad por defecto por `LocationType` resuelta (OQ-041 → BR-041) y semántica de `percentage` resuelta (OQ-045 → BR-049, no afecta este job: usa `quantity`).

## 5. Criterios de aceptación

1. Las colas `alerts`, `pdf-exports`, `maintenance` están definidas con disparo, job, propietario e idempotencia (tabla §4.2), implementadas con BullMQ + Redis en v1 (OQ-007 resuelta).
2. La alerta de 30 días corre sin duplicar (`STALE_30D` OPEN) aunque el job se reintente o corra en doble instancia (test QA, W8).
3. El job de alertas NO mueve cargas (BR-014) — verificable por ausencia de escrituras de Movement en su código.
4. Todo job fallido agotado termina en dead-letter inspeccionable; nada se pierde silenciosamente.
5. Los jobs NO reimplementan reglas de negocio: llaman a services de dominio (revisión de arquitectura + dependency-cruiser).
6. La variante in-process §4.12 queda descartada para v1 (OQ-007 resuelta): BullMQ es el mecanismo canónico.

## 6. Archivos involucrados

- `docs/backend/JOBS.md` (este), `BACKEND-ARCHITECTURE.md` (§5.5/§5.6), `MODULES.md` (alerts §5.10, dashboard §5.11, settings §5.15), `API.md` (§5.7 export-pdf), `API-CONVENTIONS.md` (§4.8 idempotencia)
- `docs/MASTER-SPEC.md` (§9 alertas/rezago, §11.2 Redis/BullMQ, §11.6 PDF, §6 BR-014/015), `docs/OPEN-QUESTIONS.md` (OQ-005/007/008/011)
- `docs/architecture/ADR/ADR-012-Background-Jobs.md` (Accepted — OQ-007), `ADR-013-PDF-Generation.md` (Accepted — OQ-005), ADR-008/ADR-010 (maintenance)
- `docs/architecture/DATABASE.md` (§5.3 índices/derivados, §5.7 catálogo de índices, §10 SQL de rezago); `docs/architecture/AUDIT.md` (retención, W2)

## 7. Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Redis + BullMQ en v1 (decisión OQ-007 resuelta 2026-09-24: sí, con workers en proceso) | Interfaz de jobs detrás de la que §4.12 documenta la variante sin Redis como alternativa descartada; decisión cerrada en OQ-007 |
| Alerta duplicada por reintento o multi-instancia | Índice único parcial `(cargo_id, type) WHERE status='OPEN'` + jobs idempotentes (R-02) |
| PDF pesado satura memoria (Chromium) | Concurrencia 1–2 por worker, timeout y tamaño máx. por job, dead-letter (ADR-013) |
| Cron con timezone incorrecta dispara la alerta en hora equivocada | Timezone explícita configurable (R-04); OQ-008 |
| Dead-letter ignorado (acumulación silenciosa) | Métricas + alerta operativa (W9); revisión periódica en dev |
| Dashboard degradado sin job de summarization | Decisión explícita §4.5: agregación en vivo en v1 (OQ-031 → BR-051); job de materialización solo si el volumen real lo exige (v1.1) |
| Migración cron→BullMQ costosa si se difiere | ADR-012 documenta la deuda; se migra temprano (v1.1) preservando services de dominio |

## 8. DECISIÓN PENDIENTE

Todas las preguntas de esta sección quedaron **resueltas en MASTER-SPEC v0.5 (2026-09-24)**; se conservan como registro con su resolución:

| # | Pregunta | Impacto | Resolución |
| --- | --- | --- | --- |
| 1 | ~~¿Redis + BullMQ en v1 (jobs reales) o scheduler in-process y diferir a v1.1?~~ | Todo este documento (rama §4.1 vs §4.12) | ✅ **RESUELTA (OQ-007)** — BullMQ + Redis en v1; ADR-012 Accepted |
| 2 | ~~¿Estrategia concreta de generación de PDF (Puppeteer recomendado) y modo síncrono/asíncrono?~~ | Cola `pdf-exports` (§4.4) | ✅ **RESUELTA (OQ-005)** — Puppeteer/Chromium HTML→PDF; ADR-013 Accepted; síncrono para livianos, asíncrono con cola `pdf-exports` para grandes |
| 3 | ~~¿Dashboard summarization como job de materialización de KPIs, o se mantiene agregación en vivo?~~ | Cola nueva `dashboard` o ninguna (§4.5) | ✅ **RESUELTA (OQ-031 → BR-051)** — agregación en vivo en v1, sin job de materialización |
| 4 | ~~¿Confirmar días/fecha base/segunda alerta del job de rezago (corridos vs hábiles, hora y timezone del cron)?~~ | §4.3 (alerts) | ✅ **RESUELTA (OQ-008)** — base `entryDate`, días corridos, alerta día 30 y segunda a los 40 (BR-014/015); timezone del predio configurable |
| 5 | ~~¿Notificaciones in-app al operador cuando se crea una alerta STALE_30D?~~ | §4.3 opcional | ✅ **RESUELTA (OQ-011/023)** — sí: notificaciones IN_APP en v1 (ADMIN + OPERATOR), canal desacoplado (BR-019) |
| 6 | ~~Alerta de capacidad (BR-033/036): ¿umbral por settings, dedupe por índice único parcial y severidad/rol en sobreocupación? ¿Desglose por unidad en el índice?~~ | §4.13 | ✅ **RESUELTA (OQ-041/OQ-043)** — umbral por settings (default 90 %); sobreocupación solo ADMIN con +10 % default (BR-036 ampliada); sin desglose por unidad en el índice (BR-041) |