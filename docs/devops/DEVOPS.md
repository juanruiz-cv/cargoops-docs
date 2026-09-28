# CargoOps — DevOps: Visión General

> Grupo: DevOps/Plataforma (W9) · FASE 0 — documentación.
> Estado: borrador alineado con `MASTER-SPEC.md` v0.1 (2026-09-23).
> Fuente de verdad canónica: `docs/MASTER-SPEC.md` (§14 Testing/QA/DevOps, §11.2 Stack objetivo, §22 Repos futuros).

---

## 1. Objetivo

Definir la visión DevOps de CargoOps: el modelo de ambientes (development, staging, production), el flujo de despliegue, el ownership de la infraestructura, el proceso de releases/changelog, el inventario de entornos con sus variables clave y la matriz de infraestructura objetivo. Este documento es la puerta de entrada del grupo `docs/devops/`; los detalles operativos viven en `CI-CD.md`, `DOCKER.md`, `ENVIRONMENTS.md`, `BACKUP-RECOVERY.md`, `MONITORING.md` y `LOGGING.md`.

## 2. Contexto

CargoOps es una plataforma web de gestión operativa de cargas y depósitos en un predio logístico/aduanero (ver `MASTER-SPEC.md` §1). El stack objetivo canónico (§11.2) es:

| Capa | Tecnología canónica |
| --- | --- |
| Frontend | Angular 20+, TypeScript, Standalone Components, SSR cuando aporte, PWA |
| Backend | NestJS, TypeScript, REST, OpenAPI/Swagger |
| DB | PostgreSQL 16+ |
| ORM | Prisma |
| Cache/Jobs | Redis; BullMQ (OQ-007 resuelta: sí en v1, ADR-012 Accepted) |
| Storage | S3 compatible (MinIO self-hosted — OQ-006 resuelta) |

La arquitectura es un **modular monolith** (ADR-001): un único artefacto backend desplegable, lo que simplifica el pipeline y los despliegues en v1. La estrategia DevOps debe soportar tres ambientes (§14) con trazabilidad, rollback y recuperación, sin sobre-ingeniería (principio KISS/YAGNI del proyecto).

## 3. Restricciones

- **FASE 0 = documentación únicamente**: no se crean Dockerfiles, pipelines ni infraestructura reales. Los fragmentos YAML/Docker de este grupo son **ilustrativos/referenciales** y están marcados como tales.
- No redefinir decisiones canónicas del `MASTER-SPEC`; toda ambigüedad real se documenta como `DECISIÓN PENDIENTE` y se reporta al orquestador (centralizado en `docs/OPEN-QUESTIONS.md`).
- Convención de commits: Conventional Commits (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`) sin atribución IA ("Co-Authored-By") — `MASTER-SPEC.md` §15.
- Versionado SemVer obligatorio (§15); artefacto de release inmutable y reproducible.
- No registrar ni exponer datos sensibles innecesarios en logs, métricas ni artefactos (BR-017, `MASTER-SPEC.md` §6).
- El frontend SSR/PWA en v1 está condicionado a OQ-010; el pipeline debe soportar ambas rutas (SSR habilitado/deshabilitado por variable de entorno).

## 4. Dependencias

| Dependencia | Documento | Naturaleza |
| --- | --- | --- |
| Stack y ambientes | `docs/MASTER-SPEC.md` §11.2, §14 | Canónica |
| ADR-001 Modular Monolith | `docs/architecture/ADR/ADR-001-Modular-Monolith.md` (W3, pendiente) | Arquitectónica |
| ADR-008 Autenticación JWT | `docs/architecture/ADR/ADR-008-Authentication.md` (W3, pendiente) | Define secretos JWT |
| ADR-012 Background Jobs | `docs/architecture/ADR/ADR-012-Background-Jobs.md` (W3, pendiente) | Redis/BullMQ |
| OQ-006, OQ-007, OQ-016 | `docs/OPEN-QUESTIONS.md` | Resueltas en MASTER-SPEC v0.5 (2026-09-24) |
| Logs estructurados y correlación | `docs/backend/ERROR-HANDLING.md` (W5, pendiente) | Formato y requestId |
| Auditoría (AuditLog) | `MASTER-SPEC.md` §4, ADR-010 | Modelo de auditoría |

## 5. Decisiones

### 5.1 Modelo de ambientes

| Ambiente | Propósito | Datos | Calidad mínima | Refresh |
| --- | --- | --- | --- | --- |
| **development** | Desarrollo local diario de los equipos backend/frontend; feedback rápido; sin despliegue central. | Seeds de ejemplo (`MASTER-SPEC.md` §5) | Cualquier estado intermedio | Manual (local) |
| **staging** | Validación de integraciones, QA, pruebas E2E, seguridad y "production-like" antes de release. Espejo de configuración de producción. | Anonimizados o sintéticos; nunca datos reales del predio | Espejo de producción (gate de release) | Por despliegue automático de `main` |
| **production** | Operación real del predio; única con datos reales. Restringido a despliegues por tag + aprobación. | Reales | Gates completos + aprobación | Por tag SemVer |

Regla de columna vertebral: **lo que no pasa staging no llega a producción**. Prohibido usar datos reales de producción en development o staging (complementa BR-017).

### 5.2 Flujo de despliegue

1. PR → pipeline CI (lint, unit, integration, build, security scan); sin merge si falla (puertas de calidad, detalle en `CI-CD.md`).
2. Merge a `main` → pipeline CI completo + despliegue automático a **staging**.
3. Certificación en staging (QA + smoke tests automáticos).
4. Tag SemVer (`vX.Y.Z`) → pipeline build + security + deploy a **production** (aprobación manual de release manager).
5. Post-deploy: smoke tests de producción, monitoring activo, ventana de observación; rollback automático ante error crítico (`CI-CD.md` §Rollback).

### 5.3 Ownership

| Área | Responsable | Evidencia |
| --- | --- | --- |
| Infraestructura y despliegues | DevOps Engineer (rol en `docs/TEAM-ROLES.md`, W10) | Runbooks en este grupo |
| Repos y branches | Equipo platform + devs | `docs/STANDARDS.md` (W10) |
| Secretos y accesos | DevOps Engineer + Admin del proyecto | `ENVIRONMENTS.md` |
| Incidentes/DR | DevOps Engineer + backend on-call | `BACKUP-RECOVERY.md`, `MONITORING.md` |

### 5.4 Changelog y proceso de release

- `CHANGELOG.md` por repo (formato Keep a Changelog), alimentado en PR con Conventional Commits.
- Versionado SemVer `MAJOR.MINOR.PATCH`; breaking changes de API (contrato `/api/v1`, ver `MASTER-SPEC.md` §10) → MAJOR.
- Release = tag firmado en `main` + nota de release con: cambios, migraciones de DB (Prisma migrate en orden), variables de entorno nuevas, runbook de rollback asociado.
- Migraciones de esquema: aplicadas por el pipeline (step de migración antes de iniciar nuevas vés) con verificación de backups previos (ver `BACKUP-RECOVERY.md`).

### 5.5 Entornos y variables clave

Definición completa de cada variable en `ENVIRONMENTS.md`. Resumen (nunca versionar secretos):

| Variable | development | staging | production |
| --- | --- | --- | --- |
| `NODE_ENV` | `development` | `production` | `production` |
| `DATABASE_URL` | Postgres local (MinIO-compose) | Postgres gestionado/VM | Postgres producción |
| `REDIS_URL` | Redis local (compose) | Redis staging | Redis producción (OQ-007 resuelta: sí en v1) |
| `JWT_SECRET` / `REFRESH_SECRET` | Generados local | Gestionados | Gestionados (rotación) |
| `S3_ENDPOINT` / `S3_BUCKET` | MinIO local | MinIO/servicio staging | MinIO self-hosted (OQ-006 resuelta) |
| `PUBLIC_URL` | `http://localhost:4200` | URL staging | URL pública del dominio |
| `CORS_ORIGINS` | `http://localhost:4200` | `https://staging.cargoops…` | `https://app.cargoops…` |
| `SMTP_*` | No aplica (v1) | Reservado | Reservado (futuro EMAIL, OQ-011) |

### 5.6 Matriz de infraestructura objetivo

| Componente | development | staging | production (objetivo) |
| --- | --- | --- | --- |
| Servidor/Orquestación | WSL/VM local + docker-compose | 1 VM o clúster pequeño (Docker Compose/Swarm o K8s liviano — ver §9.4) | 2+ instancias detrás de LB (HA) o K8s gestionado |
| Contenedores | `api`, `web` (SSR), `postgres`, `redis`, `minio` | `api` ×1–2, `web` ×1–2, `postgres`, `redis`, `minio` | `api` ×2+, `web` ×2+ (SSR), `postgres` HA, `redis` (OQ-007 resuelta) |
| Base de datos | PostgreSQL 16+ (contenedor) | PostgreSQL 16+ (VM o gestionado) | PostgreSQL 16+ con backups WAL + PITR (`BACKUP-RECOVERY.md`) |
| Cache/Jobs | Redis 7 (contenedor) | Redis 7 | Redis 7 con persistencia (OQ-007 resuelta: sí en v1) |
| Storage objetos | MinIO (contenedor) | MinIO o bucket de prueba | MinIO self-hosted (OQ-006 resuelta) |
| Observabilidad | Sin stack central | Prometheus + Grafana + Loki/Sentry (ref. `MONITORING.md`) | Mismo stack con alertas activas y uptime externo |

**Principio**: comenzar con Docker Compose en staging y una VM (o clúster gestionado si el proveedor lo da "gratis"); NO adoptar Kubernetes desde el día uno para un modular monolith de equipo pequeño (KISS/YAGNI, coherente con ADR-001).

## 6. Criterios de aceptación

- [ ] El modelo de 3 ambientes y su propósito están definidos y no contradicen `MASTER-SPEC.md` §14.
- [ ] El flujo de despliegue está documentado con triggers, gates y rollback.
- [ ] La matriz de infraestructura objetivo cubre servidores, contenedores, DB, cache y storage por ambiente.
- [ ] Las variables clave por ambiente están listadas (detalle en `ENVIRONMENTS.md`).
- [ ] OQ-006/OQ-007/OQ-016 quedaron resueltas en MASTER-SPEC v0.5 (2026-09-24) y sus consecuencias están aplicadas en este documento; los residuales locales (orquestación) están declarados en §9.
- [ ] Los fragmentos YAML incluidos están identificados como referenciales.

## 7. Archivos involucrados

- `docs/devops/DEVOPS.md` (este documento)
- `docs/devops/CI-CD.md` · `docs/devops/DOCKER.md` · `docs/devops/ENVIRONMENTS.md`
- `docs/devops/BACKUP-RECOVERY.md` · `docs/devops/MONITORING.md` · `docs/devops/LOGGING.md`
- Relacionados: `docs/MASTER-SPEC.md`, `docs/OPEN-QUESTIONS.md`, `docs/architecture/ADR/*` (W3), `docs/backend/ERROR-HANDLING.md` (W5)

## 8. Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Staging divergente de producción (config, versiones) | Infraestructura como código + gates; staging se despliega desde `main` automáticamente |
| Datos reales filtrados a ambientes no productivos | Prohibición explícita + seeds anonimizados (BR-017) |
| Adopción prematura de K8s | Compose/VM primero; K8s solo si el crecimiento lo exige (alineado ADR-001) |
| Dependencia de un proveedor cloud sin decidir | OQ-006 resuelta (MinIO self-hosted); el diseño S3-compatible permite migrar a AWS S3 sin reescribir |
| Falta de pruebas de restore | Pruebas de restore periódicas obligatorias (`BACKUP-RECOVERY.md`) |

## 9. DECISIÓN PENDIENTE

Las preguntas con OQ asignada quedaron **resueltas en MASTER-SPEC v0.5 (2026-09-24)**; el ítem 4 no tiene OQ asignada y se conserva como residual local:

| # | Pregunta | Impacto | Resolución |
| --- | --- | --- | --- |
| 1 | ~~¿MinIO self-hosted o servicio cloud S3 en producción?~~ | Alta disponibilidad, costos operativos, latencia del predio, versionado/replicación | ✅ **RESUELTA (OQ-006)** — **MinIO self-hosted** en producción (API S3-compatible, sin dependencia cloud, migrable a AWS S3 sin reescribir) |
| 2 | ~~¿Qué pérdida de datos aceptable (RPO) y tiempo máximo de recuperación (RTO)?~~ | Diseño de backups (frecuencia, WAL/PITR), DR, redundancia de infraestructura | ✅ **RESUELTA (OQ-016)** — **RPO ≤ 15 min** (WAL/PITR); **RTO ≤ 4 h** (BD) y **≤ 24 h** (restauración completa); backups diarios + WAL continuo, retención 35 días; AC a validar en FASE 1 (ver `BACKUP-RECOVERY.md`) |
| 3 | ~~¿Redis+BullMQ en v1 o se difieren a v1.1?~~ | Redis en staging/production; mecanismo de jobs | ✅ **RESUELTA (OQ-007)** — **sí en v1** (ADR-012 Accepted): alertas de permanencia (BR-014/015) y PDF asíncrono (OQ-005) son jobs reales |
| 4 | ¿Compose en una VM, Docker Swarm o Kubernetes gestionado para producción? | Costo operativo vs escalabilidad | 🔶 Pendiente local — sin OQ asignada; propuesta Compose+VM inicial (baja complejidad, §5.6) a confirmar con el equipo |