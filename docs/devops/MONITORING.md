# CargoOps — Monitoreo y Observabilidad

> Grupo: DevOps/Plataforma (W9) · FASE 0 — documentación.
> Estado: borrador alineado con `MASTER-SPEC.md` v0.1. Los fragmentos YAML son **ilustrativos/referenciales**: NO son configs ejecutables.
> Fuente de verdad canónica: `MASTER-SPEC.md` §14 (monitoring, health checks), §4.1/§6 (BR-017 privacidad), §10 (`requestId`), `devops/DEVOPS.md` §5.6 (matriz de observabilidad por ambiente), `devops/CI-CD.md` §5.2/§5.7 (smoke y rollback por SLO).

---

## 1. Objetivo

Definir la observabilidad de CargoOps en producción (y staging): endpoints de salud (`/health`, `/ready`), métricas de aplicación e infraestructura (Prometheus + Grafana propuestos), logs estructurados con correlación (detalle en `LOGGING.md`), error tracking (Sentry propuesto con tradeoffs), alertas de infraestructura/DB/rendimiento, red de alertas y uptime externo — **sin exponer datos sensibles** (BR-017).

## 2. Contexto

CargoOps es un modular monolith (ADR-001) con backend NestJS (`api`), frontend Angular PWA mínima (`web`, OQ-010 resuelta: SSR diferido), PostgreSQL 16+, Redis/BullMQ (OQ-007 resuelta: sí en v1) y storage S3-compatible (OQ-006 resuelta: MinIO self-hosted). La matriz objetivo de `DEVOPS.md` §5.6 define:

| Ambiente | Observabilidad |
| --- | --- |
| development | Sin stack central (logs en consola — `LOGGING.md`) |
| staging | Prometheus + Grafana + Loki/Sentry; alertas en canal de desarrollo |
| production | Mismo stack con **alertas activas y uptime externo** |

Los endpoints `/health` y `/ready` ya son contratados por el pipeline (`CI-CD.md` §5.2 stage `smoke`, §5.7 rollback) y por los healthchecks de contenedores (`DOCKER.md` §5.5, puertos 3000/4000). La observabilidad alimenta el **rollback automático**: "SLO de error rate (5xx) superado 5 min post-deploy" y "healthcheck `/ready` rojo" son disparadores (`CI-CD.md` §5.7).

## 3. Restricciones

- **FASE 0 = documentación**: fragmentos YAML referenciales; ninguna métrica/regla se instala en FASE 0.
- **Sin datos sensibles**: las métricas y los logs no contienen códigos de carga como dimensión, observaciones, usuarios ni payloads; las labels se limitan a dimensiones técnicas (endpoint, status, método, servicio) — complementa BR-017 y `LOGGING.md` §Saneamiento.
- **Cardinalidad controlada**: labels con valores limitados (nunca `path` crudo con IDs de recurso — `path: /api/v1/cargos/:id` normalizado); métricas por endpoint se agregan con el patrón con ID sustituido.
- Los instrumentos de monitoreo **no deben estar expuestos públicamente**: `/metrics` y paneles de Grafana detrás de autenticación/VPN; acceso auditado.
- `SENTRY_DSN` del frontend es público por definición (bundle Angular, `ENVIRONMENTS.md` §5.1) — no filtrar datos de negocio igualmente.

## 4. Dependencias

| Dependencia | Documento |
| --- | --- |
| Endpoints de salud y healthchecks | `devops/CI-CD.md` §5.2/§5.7, `devops/DOCKER.md` §5.5 |
| Variables de observabilidad (`LOG_LEVEL`, `LOG_FORMAT`, `SENTRY_DSN`) | `devops/ENVIRONMENTS.md` §5.1 |
| Formato y correlación de logs (`requestId`) | `devops/LOGGING.md` · `docs/backend/ERROR-HANDLING.md` (W5) |
| Envelope de error con `requestId` | `docs/MASTER-SPEC.md` §10 · `docs/backend/BACKEND-ARCHITECTURE.md` §main.ts |
| Alertas de backup (stale) y DR | `devops/BACKUP-RECOVERY.md` §5.4/§5.7 |
| Jobs y colas (métricas BullMQ) | `docs/architecture/ADR/ADR-012-Background-Jobs.md` · OQ-007 (resuelta) |
| SLOs de disponibilidad/rendimiento | OQ-020 resuelta: provisionales a validar en FASE 1 (ver §9.1) — hoy parametrizados |

## 5. Decisiones

### 5.1 Endpoints de salud

| Endpoint | Semántica | Comportamiento |
| --- | --- | --- |
| `GET /health` | **Liveness** — la app está viva | 200 sin dependencias (no contacta DB/Redis/S3); usado por orquestación/healthcheck de contenedor |
| `GET /ready` | **Readiness** — la app puede recibir tráfico | Chequea PostgreSQL (connection test), Redis (OQ-007 resuelta), S3 (head al bucket) y jobs (BullMQ conectado); 503 con detalle de la dependencia fallida |

Rutas: el prefijo global `/api/v1` (ADR-007) hace que las rutas públicas sean `/api/v1/health` y `/api/v1/ready`; los healthchecks de contenedores y orquestación usan la ruta **local sin prefijo** (`http://127.0.0.1:3000/health`, `DOCKER.md` §5.2/§5.3) para evitar depender del router. Respuesta `200` en JSON mínimo:

```json
{ "status": "ok", "version": "1.4.2", "commit": "a1b2c3d", "uptime": 86400, "env": "production" }
```

> Incluir versión + commit en `/health` es contrato de `CI-CD.md` §5.4 (metadatos de build) y habilita verificar qué release está activa en cada réplica.

### 5.2 Métricas de aplicación e infraestructura

Stack propuesto (coherente con `DEVOPS.md` §5.6): **Prometheus + Grafana + node/postgres/redis exporters + client de métricas en la app**. Endpoint `GET /metrics` (formato Prometheus, protegido por red interna).

| Fuente | Exporter / vía | Métricas clave |
| --- | --- | --- |
| Backend NestJS | `prom-client` (o middleware NestJS equivalente) en `/metrics` | `http_requests_total` (status, method, route normalizada), `http_request_duration_seconds` (histograma), tasa de 5xx, errores de app |
| Frontend SSR | Métricas del proceso Node + web vitals agregadas (opcional v1) | memoria RSS, tiempo de respuesta SSR (si OQ-010 = SSR) |
| PostgreSQL | `postgres_exporter` | up, conexiones vs `max_connections`, deadlocks, `pg_replication_lag` (si HA), tamaño por DB, WAL archiving OK (alerta de backup, `BACKUP-RECOVERY.md` §5.4) |
| Redis (OQ-007 resuelta) | `redis_exporter` | up, memoria, `connected_clients`, `rejected_connections`, persistencia RDB/AOF ok |
| Host/VM | `node_exporter` | CPU, memoria, disco (%), I/O, red |
| Jobs BullMQ (OQ-007 resuelta) | Métricas de cola expuestas por la app | profundidad de cola, jobs fallidos (tasa), edad del job más viejo, workers activos |

Regla de labels: `route` SIEMPRE normalizada (`/api/v1/cargos/:id`, nunca el valor real), `status_class` (2xx/4xx/5xx) en vez de cada código salvo donde aporte, sin query strings. Métricas de negocio (cargas por sector, capacidad) NO van a Prometheus en v1: pertenecen al dashboard operativo (módulo `dashboard`, `MASTER-SPEC.md` §11.3), no a la observabilidad.

### 5.3 Error tracking — Sentry (recomendación con tradeoffs)

| Opción | Pros | Contras |
| --- | --- | --- |
| **Sentry SaaS** (recomendado) | Setup rápido, grouping/issue tracking, source maps, integración NestJS (`@sentry/node`) y Angular, releases conectadas al ciclo SemVer, alertas por regla | Costo por evento (free tier limitado), datos salen del predio (verificar disposición operativa/legal) |
| Sentry self-hosted | Datos en infra propia, sin costo por evento | Mantenimiento (update, Postgres/ClickHouse del propio Sentry), esfuerzo op-ops en un equipo chico |
| GlitchTip / Highlight.io / otros OSS | Alternativa open source ligera | Menos integraciones nativas, comunidad más chica |
| Solo logs (Loki/ELK + alertas) | Cero dependencias extra, todo en un stack | Menos ergonomía para encontrar/agrupar errores, sin source maps de frontend correlacionados |

Decisión propuesta: **Sentry SaaS en staging + production** (DSN ya inventariado en `ENVIRONMENTS.md` §5.1), con estas reglas:

- Redacción previa: los eventos se limpian con `beforeSend` (nunca passwords, tokens `Authorization`, cookies, `DATABASE_URL`, ni payloads de observaciones) — mismo saneamiento que `LOGGING.md` §Saneamiento.
- `release` = tag SemVer del deploy (correlación directa con `/health` y rollback de `CI-CD.md`).
- Error rate alertado en Sentry se cruza con el SLO de 5xx de Prometheus para los disparadores de rollback.
- Frontend: source maps subidos solo en releases, sin fuentes embebidas en el bundle público.

### 5.4 Alertas de infraestructura y SLIs

Canal: #alertas (producción) y #alertas-staging; severidades P1 (incidente activo, on-call) / P2 (degradación) / P3 (aviso). Reglas propuestas (Alertmanager, ILUSTRATIVO):

```yaml
# prometheus/rules.yml — ILUSTRATIVO, NO EJECUTABLE
groups:
  - name: cargoops-infra
    rules:
      - alert: NodeCPUHigh
        expr: 100 - avg by(instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) > 85
        for: 10m
        labels: { severity: P2 }
      - alert: NodeDiskAlmostFull
        expr: (1 - node_filesystem_avail_bytes{fstype=~"ext4|xfs"} / node_filesystem_size_bytes{fstype=~"ext4|xfs"}) > 0.85
        for: 15m
        labels: { severity: P2 }      # disco > 85%: gatilla revisión de backups y logs
      - alert: PostgresDown
        expr: pg_up == 0
        for: 2m
        labels: { severity: P1 }
      - alert: WALArchivingStale
        expr: time() - pg_last_archived_wal_time > 600   # >10 min sin archivar
        labels: { severity: P1 }      # protege el RPO de BACKUP-RECOVERY.md §5.6
      - alert: BackupTooOld
        expr: time() - pgbackrest_last_full_success > 7*24*3600
        labels: { severity: P1 }      # ver BACKUP-RECOVERY.md §5.7
      - alert: HighErrorRate
        expr: sum(rate(http_requests_total{status_class="5xx"}[5m])) / sum(rate(http_requests_total[5m])) > 0.01
        for: 5m
        labels: { severity: P1 }      # 1% 5xx por 5 min: coincide con disparador de rollback CI-CD §5.7
      - alert: RedisHighMemory
        expr: redis_memory_used_bytes / redis_memory_max_bytes > 0.85
        for: 10m
        labels: { severity: P2 }      # OQ-007 resuelta: activo en v1
      - alert: BullMQFailedJobs
        expr: sum(increase(bullmq_jobs_failed_total[5m])) > 10
        for: 5m
        labels: { severity: P2 }      # fallos de jobs (alertas 30d/PDF/exports); si crece => P1, ADR-012
      - alert: CertExpiring
        expr: probe_ssl_earliest_cert_expiry < 14*24*3600
        labels: { severity: P2 }      # venció en 2 semanas: renovación planificada
```

SLOs propuestos (parametrizados — provisionales a validar en FASE 1, OQ-020 resuelta / §9.1): **disponibilidad 99,5% mensual** y **p95 de latencia de API < 2 s** (excluye endpoints pesados tipo export PDF). El SLI se calcula con métricas de Prometheus (`up` del endpoint público + histograma de duración) y se reporta mensualmente en el changelog/incidente.

### 5.5 Uptime externo e incidencias

- Uptime externo desde fuera del predio (servicio agnóstico: UptimeRobot/Better Stack/StatusPage del proveedor — residual local §9.3): probe `GET /api/v1/health` cada 60 s contra la URL pública, alerta P1 ante 2 fallos consecutivos.
- Proceso de incidente: template con fases (detección → diagnóstico → mitigación → resolución → post-mortem), enlace con rollback (`CI-CD.md` §5.7), DR (`BACKUP-RECOVERY.md` §5.9) y `requestId` de los errores reportados por usuarios (`MASTER-SPEC.md` §10) para correlacionar con logs (`LOGGING.md`).
- Ventana de observación post-deploy: 30 min con dashboards de error rate/latencia activos y alertas en modo "deploy" (quién dispara, quién decide).

### 5.6 Dashboards

Grafana (paneles por ambiente, carpetas por dominio):

| Dashboard | Paneles |
| --- | --- |
| Overview | Disponibilidad, p95/p99 latencia, tasa 5xx, réplicas up, versión activa |
| API | Requests por endpoint (normalizado), status class, duration histograma, errores de app |
| PostgreSQL | Conexiones, replica lag, WAL archiving, tamaño tablas críticas (audit_logs, movements) |
| Redis (OQ-007 resuelta) | Memoria, colas BullMQ (profundidad, fallidos, edad) |
| Backup | Último full/diff/replica exitosa, edad por componente (`BACKUP-RECOVERY.md`) |

### 5.7 Stack de monitoreo: despliegue, red y seguridad

El stack (Prometheus + Grafana + exporters) corre en `cargoops-infrastructure` como parte de la orquestación elegida para staging/production (`DEVOPS.md` §5.6/§9.4), NO dentro del compose de desarrollo. Reglas de despliegue:

| Aspecto | Regla |
| --- | --- |
| Aislamiento de red | Prometheus y Grafana en red interna; `NodePorts`/ingress público SOLO para Grafana tras autenticación |
| TLS + auth | Grafana detrás de reverse proxy con TLS y SSO/OAuth (o login + MFA); `admin` inicial rotado al primer login |
| Acceso | DevOps Engineer + on-call (ver `docs/TEAM-ROLES.md`, W10); acceso de solo lectura para QA; accesos auditados |
| Retención de métricas | Prometheus TSDB local 15 días (parametrizable), luego a almacenamiento remoto opcional; los dashboards/SLO se versionan en git (IaC) |
| Alta disponibilidad | Monitoreo independiente del ambiente monitoreado: si producción cae, el stack de monitoreo debe seguir alertando (host/red separados) |
| Sin datos de negocio | Scraping solo de endpoints `/metrics` internos; nunca de la API pública con payloads (ver §3) |

Fragmento referencial del scrape (ILUSTRATIVO, NO ejecutable):

```yaml
# prometheus.yml — ILUSTRATIVO, NO EJECUTABLE
scrape_configs:
  - job_name: cargoops-api
    metrics_path: /metrics            # red interna; endpoint NO expuesto públicamente
    static_configs:
      - targets: ["api:3000"]
  - job_name: postgres
    static_configs:
      - targets: ["postgres-exporter:9187"]
  - job_name: node
    static_configs:
      - targets: ["node-exporter:9100"]
  - job_name: redis                  # OQ-007 resuelta: activo en v1
    static_configs:
      - targets: ["redis-exporter:9121"]
```

### 5.8 Escalamiento de alertas y on-call

| Severidad | Ejemplo | Canal | Receptor | Plazo de respuesta |
| --- | --- | --- | --- | --- |
| P1 | PostgresDown, WALArchivingStale, HighErrorRate (rollback), backup stale | #incidentes + llamada | DevOps on-call + backend on-call (DR: §5.9 `BACKUP-RECOVERY.md`) | 15 min |
| P2 | CPU/disco/Redis altos, CertExpiring, replica lag | #alertas | DevOps Engineer | 4 h hábiles |
| P3 | Dashboards degradados, SLO mensual cerca del límite | #alertas | Equipo platform | Siguiente sprint |

- P1 post-deploy → **rollback automático** ya está contratado (`CI-CD.md` §5.7): el alerta dispara el runbook y el humano decide si dejar el rollback automático o intervenir (ventana de observación de 30 min con alertas en modo intensivo).
- El SLO de respuesta se mide y revisa en el post-mortem; si el on-call no responde en el plazo, escala al siguiente responsable (lista de escalamiento en `cargoops-infrastructure`, fuera de este documento).

## 6. Criterios de aceptación

- [ ] `/health` (liveness) y `/ready` (readiness) definidos con semántica y rutas local/pública, coherentes con `CI-CD.md` y `DOCKER.md`.
- [ ] Stack de métricas propuesto (Prometheus + Grafana + exporters) con métricas clave por fuente y reglas de labels sin datos sensibles.
- [ ] Error tracking justificado (Sentry recomendado) con tradeoffs documentados y saneamiento definido.
- [ ] Alertas de infra cubren CPU/memoria/disco/DB/WAL/backup stale/5xx/certificados con severidades.
- [ ] SLOs de disponibilidad y latencia propuestos y marcados como parametrizables (sin inventar compromisos de negocio).
- [ ] Uptime externo y proceso de incidentes definidos; acceso a dashboards restringido.
- [ ] Fragmentos YAML identificados como referenciales y sin datos reales.

## 7. Archivos involucrados

- `devops/MONITORING.md` (este documento) · `devops/CI-CD.md` §5.2/§5.7 · `devops/DOCKER.md` §5.5 · `devops/ENVIRONMENTS.md` §5.1 · `devops/LOGGING.md` · `devops/BACKUP-RECOVERY.md` §5.4/§5.7
- `docs/MASTER-SPEC.md` §10/§14 · `docs/backend/ERROR-HANDLING.md` (W5) · `docs/architecture/ADR/ADR-012` (jobs) · `docs/OPEN-QUESTIONS.md` (OQ-006, OQ-007, OQ-010, OQ-016 — todas resueltas v0.5)
- Futuro repo: `cargoops-infrastructure` (prometheus/grafana config, reglas, dashboards) — `MASTER-SPEC.md` §22

## 8. Riesgos

| Riesgo | Mitigación |
| --- | --- |
| `/metrics` público exponiendo rutas/volúmenes | Endpoint solo en red interna; proxy bloquea acceso externo |
| Cardinalidad alta de labels (paths con IDs) | Rutas normalizadas con `:id`; revisión en code review de instrumentación |
| Alertas ruidosas → alert fatigue y desactivación | Severidades P1/P2/P3, `for` con duración, revisión trimestral de reglas |
| Datos de negocio en métricas o Sentry | Regla de labels + `beforeSend` con saneamiento; revisión en QA/seguridad |
| Rollback dependiente de métrica mal instrumentada | `/ready` rojo es disparador independiente del SLO de 5xx (`CI-CD.md` §5.7) |
| Observabilidad de staging divergente de producción | Mismo stack y nomenclatura en ambos; solo cambian credenciales y carga |

## 9. DECISIÓN PENDIENTE

Las preguntas con OQ asignada quedaron **resueltas en MASTER-SPEC v0.5 (2026-09-24)**; los ítems 2–3 no tienen OQ asignada y se conservan como residuales locales:

| # | Pregunta | Impacto | Resolución |
| --- | --- | --- | --- |
| 1 | ¿Disponibilidad 99,5 % y p95 < 2 s son los objetivos de negocio? | Presupuesto de réplicas/HA (`DEVOPS.md` §5.6), ventanas de mantenimiento, alertas de error rate | ✅ **RESUELTA (OQ-020)** — presupuestos provisionales adoptados como **AC a validar en FASE 1** (~p95 API < 300 ms, página < 2 s); los SLOs 99,5 %/p95 < 2 s se conservan parametrizados hasta sanear con el negocio |
| 2 | ¿Sentry SaaS vs self-hosted vs alternativas? | Política de datos del predio, presupuesto por evento | 🔶 Pendiente local — sin OQ asignada; recomendación SaaS; no bloquea: `SENTRY_DSN` ya inventariado y el diseño es intercambiable |
| 3 | ¿Servicio de uptime externo concreto? | Costo y capacidad de alertar por SMS/whatsapp/email al on-call | 🔶 Pendiente local — sin OQ asignada; agnóstico en §5.5 |
| 4 | ~~¿Redis/BullMQ en v1 o diferido?~~ | Métricas y alertas de Redis/colas | ✅ **RESUELTA (OQ-007)** — **sí en v1** (ADR-012 Accepted): métricas y alertas de Redis/colas **activas** (reglas con `FEATURES_JOBS=bullmq`) |
| 5 | ~~¿Frontend con SSR o PWA estática?~~ | Métricas de proceso Node SSR vs Nginx | ✅ **RESUELTA (OQ-010)** — **PWA mínima en v1, SSR diferido** a v1.1+: el monitoreo del frontend se limita a uptime/health de Nginx y web vitals |
| 6 | ~~¿Qué RTO declarado define las alertas P1?~~ | Severidad y ventana de reacción del on-call | ✅ **RESUELTA (OQ-016)** — **RTO ≤ 4 h (BD)** adoptado: backup stale sigue P1; la ventana de reacción del on-call se ajusta al RTO |