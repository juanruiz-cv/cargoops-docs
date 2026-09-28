# CargoOps — Estrategia Docker

> Grupo: DevOps/Plataforma (W9) · FASE 0 — documentación.
> Estado: borrador alineado con `MASTER-SPEC.md` v0.1. Los Dockerfiles/compose son **referenciales/ilustrativos**: NO se crean en FASE 0.

---

## 1. Objetivo

Definir la estrategia de contenedores de CargoOps: imágenes multi-stage para backend NestJS y frontend Angular (SSR condicionado a OQ-010), `docker-compose` para desarrollo (postgres, redis, minio, api, web), volúmenes, redes, healthchecks, `.dockerignore`, usuario no-root, imágenes base con tag fijo, y consideraciones de tamaño/cache de capas.

## 2. Contexto

El stack canónico (§11.2 MASTER-SPEC) es NestJS (backend), Angular 20+ (frontend, PWA mínima en v1 — OQ-010 resuelta: SSR diferido), PostgreSQL 16+, Redis (OQ-007 resuelta: sí en v1) y storage S3-compatible (MinIO self-hosted — OQ-006 resuelta). La arquitectura modular monolith (ADR-001) produce **dos imágenes de aplicación** (`api`, `web`) más los servicios de soporte. Docker es la unidad de despliegue y de desarrollo local (ver `DEVOPS.md` §5.6 y `CI-CD.md` §5.4).

## 3. Restricciones

- FASE 0: Dockerfiles y compose son **ilustrativos** (comentados como tales); no se ejecutan.
- Imágenes base con **tag fijo** (inmutabilidad y reproducibilidad), nunca `latest`.
- Contenedores como **usuario no-root**; mínimo de privilegios.
- No instalar herramientas de desarrollo en imágenes de producción (multi-stage).
- Secretos NUNCA en capas Docker ni en `ENV` de imagen; sólo en runtime vía gestor de secretos (`ENVIRONMENTS.md`).
- DLLs/binarios compilados dependientes de la arquitectura del host: las imágenes se construyen con `--platform` explícito si hay builders ARM/x86.

## 4. Dependencias

| Dependencia | Documento |
| --- | --- |
| Variables de entorno consumidas por los contenedores | `devops/ENVIRONMENTS.md` |
| Healthchecks y endpoints | `devops/MONITORING.md` (/health, /ready) |
| Construcción e integración en pipeline | `devops/CI-CD.md` §5.4 |
| Modelo de ambientes | `devops/DEVOPS.md` §5.1 |
| SSR/PWA en v1 | OQ-010 (abierta) |

## 5. Decisiones

### 5.1 Imágenes base (tag fijo, propuesta)

| Imagen | Base propuesta | Justificación |
| --- | --- | --- |
| `api` (NestJS) | `node:22-alpine` (o `node:22-bookworm-slim` si se necesitan binarios nativos) | Runtime Node LTS; tag fijo por mayor.minor (p. ej. `22-alpine`) y digest registrado |
| `api-builder` (stage build) | `node:22-alpine` | Multi-stage; devDeps no llegan a runtime |
| `web` (Angular SSR) | Multi-stage: builder `node:22-alpine` → runtime `node:22-alpine` (SSR) | SSR ejecuta Node; si OQ-010 = sin SSR → runtime `nginx:1.27-alpine` |
| `postgres` (dev) | `postgres:16-alpine` | PostgreSQL 16 canónico; tag fijo |
| `redis` (dev) | `redis:7-alpine` | OQ-007 resuelta: en v1 |
| `minio` (dev) | `minio/minio:RELEASE.2024-xx` (tag fijo) | S3-compatible local (OQ-006 resuelta: MinIO self-hosted) |

Regla: cada imagen base se referencia con tag fijo y se pinnea el digest en el registry; actualizaciones por PR de dependencias (Dependabot/Renovate) revisado, no automático silencioso.

### 5.2 Imagen `api` — multi-stage (referencial)

> ⚠️ Dockerfile ILUSTRATIVO/REFERENCIAL. NO ejecutable en FASE 0.

```dockerfile
# Dockerfile.api — ILUSTRATIVO, NO EJECUTABLE
# Stage 1: dependencias + build
FROM node:22-alpine AS builder        # tag fijo
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci                            # devDeps incluidas aquí (build-time)
COPY . .
RUN npm run build                     # tsc → dist/

# Stage 2: dependencias de producción (prune)
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Stage 3: runtime — sólo lo necesario
FROM node:22-alpine AS runtime
ENV NODE_ENV=production
RUN addgroup -S app && adduser -S app -G app   # usuario no-root
WORKDIR /app
COPY --from=deps --chown=app:app /app/node_modules ./node_modules
COPY --from=builder --chown=app:app /app/dist ./dist
COPY prisma ./prisma
USER app                                    # nunca ejecutar como root
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/health || exit 1
CMD ["node", "dist/main.js"]
```

Notas: la migración Prisma (`prisma migrate deploy`) NO corre dentro del contenedor de aplicación: la ejecuta un job del pipeline (`CI-CD.md` stage `migrate`) para evitar carreras en deploys con múltiples réplicas.

### 5.3 Imagen `web` — multi-stage SSR (referencial)

> ⚠️ Dockerfile ILUSTRATIVO/REFERENCIAL. NO ejecutable en FASE 0.

```dockerfile
# Dockerfile.web — ILUSTRATIVO, NO EJECUTABLE
# Variante SSR (default v1); si OQ-010 = sin SSR, el stage runtime final es NGINX estático.
FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build:ssr        # compilación Angular + server

FROM node:22-alpine AS runtime
ENV NODE_ENV=production
RUN addgroup -S app && adduser -S app -G app
WORKDIR /app
COPY --from=builder --chown=app:app /app/dist ./dist
COPY --from=builder --chown=app:app /app/node_modules ./node_modules
USER app
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:4000/health || exit 1   # el server expone su propio health
CMD ["node", "dist/server/main.js"]
```

Si la decisión final es PWA/estático (OQ-010), el runtime cambia a `nginx:1.27-alpine` con archivo de configuración propio (gzip, cache de assets con hash, proxy `/api` revertido a `api` en la misma red Docker).

### 5.4 docker-compose para desarrollo (referencial)

> ⚠️ ILUSTRATIVO/REFERENCIAL. No reemplaza el setup real de FASE 2+; los servicios dev (postgres/redis/minio) sí se usarán tal cual cuando llegue la implementación.

```yaml
# docker-compose.dev.yml — ILUSTRATIVO, NO EJECUTABLE
name: cargoops-dev
services:
  postgres:
    image: postgres:16-alpine          # tag fijo
    environment:
      POSTGRES_USER: cargoops
      POSTGRES_PASSWORD: cargoops_dev  # SOLO local; secretos reales fuera de compose (ENVIRONMENTS.md)
      POSTGRES_DB: cargoops
    ports: ["5432:5432"]
    volumes:
      - pg_data:/var/lib/postgresql/data   # volumen nombrado: persistencia local
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U cargoops"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:                                   # OQ-007 resuelta: en v1
    image: redis:7-alpine
    ports: ["6379:6379"]
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s

  minio:                                   # storage S3-compatible local (OQ-006 resuelta)
    image: minio/minio:latest              # NOTA: en real se fija tag; aquí ilustrativo
    command: server /data --console-address ":9001"
    ports: ["9000:9000", "9001:9001"]
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    volumes:
      - minio_data:/data

  api:
    build: { context: ../cargoops-backend, dockerfile: Dockerfile.api }
    depends_on:
      postgres: { condition: service_healthy }
      redis:   { condition: service_healthy }   # OQ-007 resuelta: en v1
    environment:
      NODE_ENV: development
      DATABASE_URL: postgresql://cargoops:cargoops_dev@postgres:5432/cargoops
      REDIS_URL: redis://redis:6379
      S3_ENDPOINT: http://minio:9000
      JWT_SECRET: dev-only-secret           # SOLO dev; ver ENVIRONMENTS.md
    ports: ["3000:3000"]
    volumes:
      - ../cargoops-backend/src:/app/src     # hot-reload local (bind mount)

  web:
    build: { context: ../cargoops-frontend, dockerfile: Dockerfile.web }
    depends_on: [api]
    environment:
      PUBLIC_URL: http://localhost:4200
      API_URL: http://api:3000/api/v1
    ports: ["4200:4000"]

networks:
  default:
    name: cargoops-net        # red definida con nombre explícito (aislamiento)
volumes:
  pg_data:
  redis_data:
  minio_data:
```

### 5.5 Redes, volúmenes y healthchecks

- **Redes**: una red `cargoops-net` por defecto; los servicios se referencian por nombre de servicio, no por IP. En staging/production, la red la gestiona la orquestación elegida (`DEVOPS.md` §5.6).
- **Volúmenes**: nombrados (`pg_data`, `redis_data`, `minio_data`) para persistencia; bind-mounts SOLO para hot-reload en desarrollo. Nunca montar el directorio de seeds o certificados con permisos laxos.
- **Healthchecks**: `pg_isready`, `redis-cli ping`, `/health` de `api` y `web` (ver `MONITORING.md`); `depends_on` con `condition: service_healthy` evita carreras al iniciar.

### 5.6 .dockerignore (referencial)

> ⚠️ ILUSTRATIVO. Sólo lo esencial entra al build context: menos transferencia, capas más chicas y menos riesgo de filtrar secretos.

```dockerignore
# ILUSTRATIVO
node_modules
dist
coverage
.git
.env*
*.log
Dockerfile*
docker-compose*.yml
docs
.vscode
.idea
```

### 5.7 Consideraciones de tamaño y cache

- Multi-stage: runtime sin devDeps ni fuentes ni `.git`; `dist/` compilado + `node_modules --omit=dev`.
- Orden de capas: `package*.json` + `npm ci` ANTES de `COPY . .` → el cache de capas sobrevive a cambios de código; invalidación sólo cuando cambia `package-lock.json`.
- `npm ci` (no `npm install`): reproducible y respeta el lockfile.
- Prisma: generar client en el stage de build y copiar `node_modules` pruned con el client ya generado (evitar regenerar en runtime).
- Capas de prerrequisitos del SO (wget/curl para healthcheck, ca-certificates) se agregan al inicio del Dockerfile.
- Meta: imagen `api` objetivo < 250 MB comprimida; `web` SSR < 300 MB. Se miden en CI y se alertan regresiones (> 10% de delta).
- Scanning de imagen (Trivy) en CI (`CI-CD.md` §5.5) antes de publicar al registry.

### 5.8 Usuario no-root y seguridad

- Usuario dedicado `app` sin shell ni HOME con secretos; `USER app` antes del CMD.
- Capas de imagen sin herramientas de debug (curl extra OK para healthcheck), sin paquetes de desarrollo.
- No exponer puertos más allá de los necesarios; `EXPOSE` documental + firewall/orquestación real.
- Los contenedores se ejecutan con `read_only_root_filesystem` donde la orquestación lo soporte y `/tmp` en tmpfs.

## 6. Criterios de aceptación

- [ ] Dockerfiles multi-stage para `api` y `web` (SSR) definidos como referencia con tag fijo.
- [ ] docker-compose de desarrollo cubre postgres, redis, minio, api y web con volúmenes, redes y healthchecks.
- [ ] `.dockerignore`, usuario no-root y orden de capas documentados.
- [ ] Imagen `web` v1 = Nginx estático (PWA mínima — OQ-010 resuelta); la vía Node SSR (v1.1+) queda documentada como futura.
- [ ] Objetivo de tamaño de imagen definido y medible en CI.
- [ ] Fragmentos marcados como ilustrativos y sin secretos reales.

## 7. Archivos involucrados

- `devops/DOCKER.md` (este documento) · `devops/CI-CD.md` · `devops/ENVIRONMENTS.md` · `devops/MONITORING.md`
- Futuros repos: `cargoops-backend` (Dockerfile.api), `cargoops-frontend` (Dockerfile.web), `cargoops-infrastructure` (compose staging/prod) — `MASTER-SPEC.md` §22

## 8. Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Imágenes base `latest` → builds no reproducibles | Tag fijo + digest pinneado; actualización por PR revisado |
| Capas con secretos (ENG de `.env` olvidado) | `.dockerignore` + scanning de imagen + políticas de registry |
| Contenedor root con binarios del host | Usuario no-root obligatorio; revisado en code review de Dockerfile |
| Bind-mounts amplios en dev que afectan rendimiento (WSL) | Volúmenes nombrados por defecto; bind sólo para src/ |
| SSR Node expuesto directo a Internet | Reverse proxy (Nginx/Traefik) en staging/prod; TLS en el proxy |

## 9. DECISIÓN PENDIENTE

Las preguntas con OQ asignada quedaron **resueltas en MASTER-SPEC v0.5 (2026-09-24)**; los ítems 2–3 no tienen OQ asignada y se conservan como residuales locales:

| # | Pregunta | Impacto | Resolución |
| --- | --- | --- | --- |
| 1 | ~~¿Imagen `web` con runtime Node (SSR) o Nginx estático (PWA)?~~ | Tamaño de imagen, memoria por instancia, cache, aislamiento (Node SSR es atacable; requiere proxy + VPC) | ✅ **RESUELTA (OQ-010)** — **PWA mínima en v1, SSR diferido** a v1.1+: la imagen `web` v1 es **Nginx estático**; la vía Node SSR queda documentada como futura |
| 2 | ¿Plataforma de orquestación en staging/production? | Unidad de despliegue (orquestador) | 🔶 Pendiente local — sin OQ asignada; compose fijo para dev; orquestador pendiente (`DEVOPS.md` §9.4) |
| 3 | ¿Tag concreto de MinIO? | Reproducibilidad de builds | 🔶 Pendiente local — sin OQ asignada; en implementación se fija un tag concreto (práctica obligatoria §5.1) a elección del equipo |