# CargoOps — Entornos y Variables de Entorno

> Grupo: DevOps/Plataforma (W9) · FASE 0 — documentación.
> Estado: borrador alineado con `MASTER-SPEC.md` v0.1. El `.env.example` es la referencia de nombres; los valores son ilustrativos.

---

## 1. Objetivo

Inventariar por ambiente (development, staging, production — `DEVOPS.md` §5.1) las variables de entorno de CargoOps, definir la gestión de secretos (recomendación: nunca en git; gestor de secretos) y proveer el `.env.example` canónico que consumirán los repos de backend/frontend en FASE 2+.

## 2. Contexto

CargoOps es un monolith modular NestJS + Angular (PWA mínima en v1 — OQ-010 resuelta: manifest + service worker; **SSR diferido**) con PostgreSQL 16+, Redis/BullMQ (OQ-007 resuelta: sí en v1, ADR-012 Accepted) y storage S3-compatible (OQ-006 resuelta: **MinIO self-hosted**). Las variables se consumen en construcción (variables públicas del frontend compiladas) y en runtime (secretos y conexiones). Confusión entre ambas es fuente clásica de leaks: **lo que se compila en el bundle Angular es público por definición**.

## 3. Restricciones

- No versionar secretos: `.env*` en `.gitignore`; sólo `.env.example` con valores de ejemplo no usables.
- Variables públicas del frontend (Angular) NO contienen secretos; el backend valida siempre (BR-009).
- Los valores de ejemplo de este documento son inválidos/usables-solo-local; producción usa el gestor de secretos.
- Convención de nombres: UPPER_SNAKE_CASE con prefijo por dominio (`S3_*`, `JWT_*`, `SMTP_*` futuro).
- `NODE_ENV=production` en staging y production (nunca `development` fuera del entorno local).
- FASE 0: las variables se documentan; su implementación en `config` de NestJS es decisión del equipo backend (W5).

## 4. Dependencias

| Dependencia | Documento |
| --- | --- |
| Contenedores que consumen las variables | `devops/DOCKER.md` §5.4 |
| Pipeline de despliegue | `devops/CI-CD.md` §5.6 |
| Secretos de autenticación (JWT) | `docs/architecture/ADR/ADR-008-Authentication.md` (W3, pendiente) |
| SMTP futuro (notificaciones EMAIL) | OQ-011 / `MASTER-SPEC.md` §4.1 NotificationChannel |
| Config del backend | `docs/backend/BACKEND-ARCHITECTURE.md` (W5, pendiente) |

## 5. Decisiones

### 5.1 Inventario de variables

| Variable | Obligatoria | Ambientes | Descripción | Secreto |
| --- | --- | --- | --- | --- |
| `NODE_ENV` | Sí | todos | `development` (dev) / `production` (staging+prod) | No |
| `PORT` | Sí | api | Puerto HTTP del backend (3000) | No |
| `DATABASE_URL` | Sí | todos | DSN PostgreSQL 16+ (Prisma) | **Sí** |
| `REDIS_URL` | Sí (OQ-007 resuelta) | todos | DSN Redis 7 (BullMQ) | **Sí** |
| `JWT_SECRET` | Sí | todos | Firma access token (corto plazo) | **Sí** |
| `REFRESH_SECRET` | Sí | todos | Firma refresh token (largo plazo, rotación) | **Sí** |
| `JWT_ACCESS_TTL` | Sí | todos | Expiración access token (p. ej. `15m`) | No |
| `JWT_REFRESH_TTL` | Sí | todos | Expiración refresh token (p. ej. `7d`; gestión de revocación en ADR-008/W5) | No |
| `S3_ENDPOINT` | Sí | todos | Endpoint S3-compatible (MinIO self-hosted; migrable a AWS S3) | Parcial (firma aparte) |
| `S3_REGION` | Sí | cloud / staging | Región (AWS) o `us-east-1` para MinIO | No |
| `S3_ACCESS_KEY_ID` | Sí | todos | Credencial S3 | **Sí** |
| `S3_SECRET_ACCESS_KEY` | Sí | todos | Credencial S3 | **Sí** |
| `S3_BUCKET` | Sí | todos | Bucket de objetos (cargas/PDFs) | No |
| `S3_FORCE_PATH_STYLE` | Sí | todos | `true` para MinIO; `false` para AWS | No |
| `PUBLIC_URL` | Sí | todos | URL pública del frontend (CORS + links) | No |
| `CORS_ORIGINS` | Sí | todos | Lista de origenes permitidos (CSV) | No |
| `API_URL` | Sí | web/SSR | URL interna del backend (SSR) | No |
| `LOG_LEVEL` | Sí | todos | `debug` dev / `info` staging / `info` prod (ver `LOGGING.md`) | No |
| `LOG_FORMAT` | No | dev | `pretty` local / `json` resto (ver `LOGGING.md`) | No |
| `SENTRY_DSN` | Sí* | staging+prod | Error tracking (`MONITORING.md`) — *si se adopta Sentry | **Sí** (DSN público en frontend) |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM` | Futuro | futuros | Notificaciones EMAIL (OQ-011 reservado; NO implementar en v1 sin OQ-011 = sí) | **Sí** |
| `FEATURES_JOBS` | Sí | todos | `bullmq` (OQ-007 resuelta: default en v1) o `cron-inline` (solo alternativa dev/diagnóstico, descartada para prod — JOBS.md §4.12) | No |
| `TZ` | Sí | todos | `America/Argentina/Buenos_Aires` (huso del predio; define alertas 30d, BR-014/015) | No |

> Los valores de expiración JWT son propuesta; la política final (rotación, revocación, refresh rotation) la define ADR-008 (W3).

### 5.2 Matriz por ambiente

| Variable de ejemplo | development | staging | production |
| --- | --- | --- | --- |
| `NODE_ENV` | `development` | `production` | `production` |
| `DATABASE_URL` | `postgresql://cargoops:cargoops_dev@localhost:5432/cargoops` | DSN del postgres staging (gestor de secretos) | DSN postgres HA producción (gestor) |
| `REDIS_URL` | `redis://localhost:6379` | DSN redis staging (OQ-007 resuelta) | DSN redis producción (OQ-007 resuelta) |
| `S3_ENDPOINT` | `http://localhost:9000` (MinIO) | MinIO staging | MinIO self-hosted (OQ-006 resuelta) |
| `S3_FORCE_PATH_STYLE` | `true` | `true` | `true` (MinIO self-hosted — OQ-006 resuelta); `false` solo si se migra a AWS S3 |
| `PUBLIC_URL` | `http://localhost:4200` | `https://staging.<dominio>` | `https://app.<dominio>` |
| `CORS_ORIGINS` | `http://localhost:4200` | `https://staging.<dominio>` | `https://app.<dominio>` |
| `LOG_LEVEL` | `debug` | `info` | `info` (warn en picos, ver `LOGGING.md`) |
| `FEATURES_JOBS` | `cron-inline` (dev rápido) | `bullmq` (OQ-007 resuelta) | `bullmq` (OQ-007 resuelta) |

### 5.3 Gestión de secretos

Regla canónica: **ningún secreto en git, en `.env` versionado, en capas Docker, en logs ni en el bundle Angular** (ver `LOGGING.md` §Saneamiento y `DOCKER.md`).

| Ambiente | Mecanismo (propuesta) |
| --- | --- |
| development | `.env` local, gitignored, generado desde `.env.example`; secretos generados localmente (`openssl rand`), NUNCA copiados de staging/prod |
| staging | Gestor de secretos del proveedor (p. ej. GitHub Actions secrets + Vault/SOPS según plataforma) |
| production | Gestor de secretos dedicado (Vault / SOPS + KMS / secret manager del proveedor) con rotación y acceso auditado |

Principio de menor privilegio: cada ambiente tiene credenciales propias (bases de datos, buckets y claves JWT separadas); rotación de `JWT_SECRET`/`REFRESH_SECRET` sin invalidar sesiones activas (doble firma en ventana de transición) y de credenciales S3 con política de rotación documentada (OQ-006 resuelta: MinIO self-hosted — credenciales dedicadas con menor privilegio).

### 5.4 .env.example canónico (referencial)

> ⚠️ ILUSTRATIVO. Los valores son de ejemplo NO usables en producción. Se comitea SIN secretos reales.

```dotenv
# .env.example — ILUSTRATIVO (sin secretos reales)
# Backend (cargoops-backend)
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://cargoops:cargoops_dev@localhost:5432/cargoops
REDIS_URL=redis://localhost:6379            # OQ-007 resuelta: activo en v1 (FEATURES_JOBS=bullmq)
FEATURES_JOBS=bullmq                         # bullmq (v1) | cron-inline (solo dev)

# Auth (ADR-008) — GENERAR localmente, nunca commitear
JWT_SECRET=changeme_local_only
REFRESH_SECRET=changeme_local_only
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=7d

# Storage S3-compatible (OQ-006 resuelta: MinIO self-hosted en prod)
S3_ENDPOINT=http://localhost:9000
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=minioadmin
S3_SECRET_ACCESS_KEY=minioadmin
S3_BUCKET=cargoops-dev
S3_FORCE_PATH_STYLE=true

# Frontend / SSR
PUBLIC_URL=http://localhost:4200
API_URL=http://localhost:3000/api/v1
CORS_ORIGINS=http://localhost:4200

# Observabilidad (MONITORING.md / LOGGING.md)
LOG_LEVEL=debug
LOG_FORMAT=pretty
SENTRY_DSN=                              # vacío en dev

# Futuro (reservado, OQ-011) — NO activar en v1 sin decisión
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=noreply@cargoops.local

# Zona horaria operativa (BR-014/015 alertas de permanencia)
TZ=America/Argentina/Buenos_Aires
```

### 5.5 Manejo de ambigüedades y adiciones futuras

- Cualquier variable nueva se agrega con descripción y ambiente en este inventario y en `CHANGELOG.md` de release (`DEVOPS.md` §5.4).
- Si una variable cambia de semántica (p. ej. `DATABASE_URL` multitenant en el futuro — §1.5 MASTER-SPEC), se documenta la migración antes del cambio.
- Las variables `SMTP_*` NO se implementan en v1 (OQ-011); su reserva evita renombrar después.

## 6. Criterios de aceptación

- [ ] Inventario completo con obligatoriedad, ambientes, descripción y clasificación secreto/no-secreto.
- [ ] Matriz de valores por ambiente sin secretos reales.
- [ ] `.env.example` canónico commitable, gitignored `.env*` documentado.
- [ ] Gestión de secretos por ambiente definida (dev local / staging / producción).
- [ ] Rotación de JWT y S3 documentada sin invalidar sesiones.
- [ ] `SMTP_*` marcado como futuro (OQ-011) y `TZ` definida para BR-014/015.

## 7. Archivos involucrados

- `devops/ENVIRONMENTS.md` (este documento) · `devops/DEVOPS.md` · `devops/DOCKER.md` · `devops/CI-CD.md` · `devops/MONITORING.md` · `devops/LOGGING.md`
- Futuros: `cargoops-backend/` (`.env.example`, config), `cargoops-frontend/` (`.env.example`), `cargoops-infrastructure/` (secretos) — `MASTER-SPEC.md` §22
- `docs/architecture/ADR/ADR-008` (W3) · `docs/backend/BACKEND-ARCHITECTURE.md` (W5)

## 8. Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Secreto en `.env` commiteado o en bundle Angular | `.gitignore` + review de PR + escaneo SAST de secrets (`CI-CD.md` §5.5) + auditoría de bundle |
| Credenciales de staging reutilizadas en prod | Ambientes con secretos propios; rotación periódica; diffs auditados |
| DSN de DB con credenciales en logs de Prisma | Redacción en logging (`LOGGING.md`) y `LOG_LEVEL` controlado |
| Secretos en capas Docker (`ENV` heredado) | Runtime-only injection (`DOCKER.md` §5.8); nunca `ENV` con secretos en Dockerfile |
| `NODE_ENV=development` subido a staging | Validación en CI: fallo si `NODE_ENV != production` en staging/prod |

## 9. DECISIÓN PENDIENTE

Las preguntas con OQ asignada quedaron **resueltas en MASTER-SPEC v0.5 (2026-09-24)**; los ítems 1 y 4 no tienen OQ asignada y se conservan como residuales locales:

| # | Pregunta | Impacto | Resolución |
| --- | --- | --- | --- |
| 1 | ¿El gestor de secretos (Vault/SOPS/secret manager) aplica también en local o basta `.env` gitignored? | Carga operativa del equipo dev vs consistencia | 🔶 Pendiente local — sin OQ asignada; propuesta: `.env` gitignored en local (simple), gestor en staging/prod |
| 2 | ~~¿`S3_*` en producción dependen de MinIO self-hosted o cloud?~~ | §5.2 (región, `FORCE_PATH_STYLE`, credenciales) | ✅ **RESUELTA (OQ-006)** — **MinIO self-hosted** en producción (API S3-compatible, migrable a AWS S3 sin reescribir): `S3_REGION=us-east-1`, `S3_FORCE_PATH_STYLE=true`, credenciales dedicadas con menor privilegio |
| 3 | ~~¿Si BullMQ se difiere, `REDIS_URL` no aplica y `FEATURES_JOBS=cron-inline` se vuelve el default?~~ | Inventario §5.1/§5.2 | ✅ **RESUELTA (OQ-007)** — **Redis + BullMQ en v1** (ADR-012 Accepted): `REDIS_URL` aplica y `FEATURES_JOBS=bullmq` es el default; `cron-inline` queda como alternativa dev/diagnóstico descartada para prod (JOBS.md §4.12) |
| 4 | ¿Proveedor de secretos según la plataforma CI/CD? | Secretos del pipeline | 🔶 Pendiente local — sin OQ asignada; a definir con `CI-CD.md` §9 (GitHub Environments/Secrets, GitLab CI Variables o integración con Vault) |