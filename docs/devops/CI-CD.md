# CargoOps — CI/CD

> Grupo: DevOps/Plataforma (W9) · FASE 0 — documentación.
> Estado: borrador alineado con `MASTER-SPEC.md` v0.1. Los fragmentos YAML son **ilustrativos/referenciales**: NO son pipelines ejecutables.

---

## 1. Objetivo

Definir el pipeline de integración continua y despliegue continuo de CargoOps: stages, triggers por rama/tag, puertas de calidad, artefactos, versionado SemVer, rollback automático y estrategia por ambiente (development → staging → production, según `DEVOPS.md` §5.1).

## 2. Contexto

CargoOps es un monolith modular (ADR-001) con dos artefactos de aplicación: **backend NestJS** (`api`) y **frontend Angular** (`web`, PWA mínima en v1 — OQ-010 resuelta: SSR diferido), más infraestructura (PostgreSQL 16+, Redis + BullMQ en v1 — OQ-007 resuelta, storage S3-compatible MinIO self-hosted — OQ-006 resuelta). El pipeline debe cubrir los 5 pasos canónicos de `MASTER-SPEC.md` §14: **lint, test, build, security scan, deploy**, con Docker como formato de artefacto (ver `DOCKER.md`) y migraciones de DB coordinadas (Prisma).

## 3. Restricciones

- FASE 0: ningún pipeline real; fragmentos YAML marcados como referenciales.
- Conventional Commits (§15 MASTER-SPEC); el pipeline puede derivar versiones de los tags, no de mensajes arbitrarios.
- SemVer obligatorio; tags `vX.Y.Z` como único trigger de deploy a producción.
- No exponer secretos en logs del pipeline; secretos desde gestor (`ENVIRONMENTS.md` §Gestión de secretos).
- El pipeline NO ejecuta pruebas que requieran datos reales de producción.
- Sin atribución IA en commits (regla global; el pipeline o la config de repo no la agrega).

## 4. Dependencias

| Dependencia | Documento |
| --- | --- |
| Modelo de ambientes y despliegue | `devops/DEVOPS.md` §5 |
| Estrategia Docker e imágenes | `devops/DOCKER.md` |
| Variables y secretos por ambiente | `devops/ENVIRONMENTS.md` |
| Estrategia de testing (unit/integration/E2E) | `qa/QA-STRATEGY.md` (W8, pendiente), `docs/DEFINITION-OF-DONE.md` (W10) |
| Stack canónico | `docs/MASTER-SPEC.md` §11.2 |
| ADR-012 (jobs) | `docs/architecture/ADR/ADR-012-Background-Jobs.md` (W3, pendiente) |

## 5. Decisiones

### 5.1 Trigger por evento

| Evento | Pipeline | Deploy |
| --- | --- | --- |
| PR a `main` | CI: lint, unit, integration, build, security | No |
| Push a `main` | CI completo + build imágenes | **staging** (automático) |
| Tag `vX.Y.Z` en `main` | CI completo + security + build release | **production** (gate de aprobación manual) |
| Push a rama feature | CI liviano (lint + unit) | No |

Principio trunk-based (§15): ramas cortas, PR obligatorio con al menos 1 review de un par + review de seguridad cuando el diff toca auth/permisos/auditoría.

### 5.2 Stages del pipeline

| Stage | Contenido | Puerta de salida |
| --- | --- | --- |
| 1. `lint` | ESLint + Prettier (check), TypeScript strict en ambos repos | Sin errores |
| 2. `unit-test` | Jest (`api` y `web`), coverage al menos 80% líneas (objetivo, ver `qa/`) | Coverage ≥ umbral |
| 3. `integration-test` | Suites contra Postgres/Redis reales (contenedores efímeros del pipeline); incluye migraciones Prisma y casos críticos (movimiento sin observación, exceder capacidad, permisos — §14 MASTER-SPEC) | Todos verdes |
| 4. `build` | Imágenes multi-stage (`DOCKER.md`); `docker build` con tag de commit corto; cache layers | Imagen construida + escaneada |
| 5. `security-scan` | SAST + SCA + dependency-check (ver §5.5) + escaneo de imagen (Trivy) | Sin vulnerabilidades críticas/altas sin excepción aprobada |
| 6. `migrate` | `prisma migrate deploy` contra el ambiente destino, previo backup (`BACKUP-RECOVERY.md`) | Migración OK o aborted → rollback |
| 7. `deploy` | Despliegue según ambiente (§5.6) | Smoke tests post-deploy verdes |
| 8. `smoke` | `/health` + `/ready` + happy path mínimo (login+consulta) | Verdes; si falla → rollback automático |

E2E (Playwright) se ejecuta sobre staging post-deploy y es gate de release, no de PR (costo/velocidad) — salvo casos críticos seleccionados en `qa/`.

### 5.3 Puertas de calidad (quality gates)

- PR: lint + unit + build OK; coverage ≥80%; sin vulns críticas/altas nuevas.
- Merge a `main`: gates de PR + integration + security scan.
- Tag release: gates de main + E2E en staging + aprobación manual + smoke en producción.
- Cualquier fallo pausa el pipeline en el stage exacto; no hay merge automático bajo gates rojos.

### 5.4 Artefactos y versionado

- Artefacto único por repo: imagen OCI taggeada `cargoops-api:v<semver>` / `cargoops-web:v<semver>` + digest inmutable registrado (registry privado: GHCR/ECR/Harbor — a decidir; ver §9.2).
- SemVer derivado del tag git; `vX.Y.Z` con `X.Y.Z` en `package.json` validado por el pipeline (consistencia).
- Metadatos de build: commit SHA, fecha, versión, ref — inyectados como labels Docker y expuestos en `/health` (versión y commit para diagnóstico).
- Retención de artefactos: últimas N releases (p. ej. 10) + todas las versiones vigentes en rollback.

### 5.5 Security scan

| Tipo | Herramienta (propuesta) | Objetivo |
| --- | --- | --- |
| SAST | Semgrep o CodeQL | Reglas por lenguaje (TS/JS), foco en auth, inyección SQL, XSS, secrets en código |
| SCA | npm audit + osv-scanner / Dependabot | Vulnerabilidades de dependencias (runtime y dev) |
| Dependency-check | OWASP Dependency-Check (alternativa defensiva a SCA) | Reporte CVE de dependencias con severidad |
| Imagen | Trivy | Capas de imagen, paquetes del SO base |

Política: vulnerabilidades CRÍTICA/ALTA de runtime bloquean el merge (excepción sólo con ticket y plazo). Secretos detectados en código → fallo inmediato del pipeline + alerta al equipo (nunca imprimir el secreto en logs).

### 5.6 Estrategia por ambiente

- **development**: sin pipeline central; `docker-compose up` local (`DOCKER.md`). OPCIONAL: hooks de pre-commit (husky) para lint.
- **staging**: deploy automático desde `main`; imagen tag `staging-<sha>`; datos sintéticos; sirve para QA/E2E/aceptación.
- **production**: deploy por tag aprobado; azul/verde o rolling con ventana (ver §5.7); migraciones Previas con verificación.

### 5.7 Rollback automático

1. Disparadores: smoke tests fallidos, `SLO` de error rate (5xx) superado 5 min post-deploy (ver `MONITORING.md`), healthcheck `/ready` rojo.
2. Estrategia: **rollback de imagen** al anterior tag estable (azul/verde: sólo se re-apunta el tráfico en el ambiente; si el deploy mutó esquema DB, primero aplicar migración inversa documentada o restaurar backup — `BACKUP-RECOVERY.md`).
3. Procedimiento: pipeline ejecuta auto-rollback, notifica a #incidentes, y el incidente queda documentado con `deploy ID`, causa y tiempo de recuperación.
4. Regla: **toda release debe declarar su runbook de rollback** (migraciones reversibles o backup previo verificado) antes de aprobarse.

### 5.8 Fragmento referencial — pipeline (GitHub Actions)

> ⚠️ FRAGMENTO ILUSTRATIVO/REFERENCIAL. No es config ejecutable; la plataforma final (GitHub Actions, GitLab CI, Jenkins, otro) es DECISIÓN PENDIENTE. Los `secrets.*` se resuelven con el gestor de secretos (ver `ENVIRONMENTS.md`).

```yaml
# .github/workflows/ci.yml — ILUSTRATIVO, NO EJECUTABLE
name: cargoops-ci
on:
  pull_request:
    branches: [main]
  push:
    branches: [main]
    tags: ["v*"]

jobs:
  lint-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm }
      - run: npm ci
      - run: npm run lint          # ESLint + Prettier check
      - run: npm run test:unit -- --coverage  # coverage >= 80%
      - run: npm run build          # type-check estricto + bundlers

  integration:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine   # tag fijo: ver DOCKER.md
        env: { POSTGRES_PASSWORD: test }
        ports: ["5432:5432"]
      redis:
        image: redis:7-alpine       # OQ-007 resuelta: en v1
        ports: ["6379:6379"]
    steps:
      - run: npm ci && npm run test:integration

  security:
    runs-on: ubuntu-latest
    steps:
      - run: npm audit --audit-level=high   # SCA
      - uses: aquasecurity/trivy-action@master  # escaneo de imagen
        with: { image-ref: cargoops-api:v-test }
      # SAST (Semgrep/CodeQL) también en este stage

  deploy-staging:
    if: github.ref == 'refs/heads/main'
    needs: [lint-test, integration, security]
    steps:
      - run: ./scripts/deploy.sh staging   # ILUSTRATIVO: despliega la imagen a staging
      - run: ./scripts/smoke.sh staging/${PUBLIC_URL}  # smoke tests

  deploy-production:
    if: startsWith(github.ref, 'refs/tags/v')
    environment: production
    needs: [lint-test, integration, security]
    steps:
      - run: ./scripts/deploy.sh production  # con aprobación manual (environment protection rules)
      - run: ./scripts/smoke.sh ${PUBLIC_URL} && ./scripts/rollback.sh --auto  # auto-rollback si falla
```

## 6. Criterios de aceptación

- [ ] Los 8 stages están definidos con sus puertas de salida.
- [ ] Triggers por PR, `main` y tags documentados; deploy a producción sólo por tag + aprobación.
- [ ] Puertas de calidad cuantificadas (coverage ≥ 80%, vulns críticas/altas).
- [ ] Artefactos y versionado SemVer definidos (imagen + digest + metadatos).
- [ ] Rollback automático con disparadores, estrategia azul/verde y runbook por release.
- [ ] Security scan cubre SAST, SCA, dependency-check e imagen, con política de severidad.
- [ ] Fragmentos YAML marcados como ilustrativos y sin datos sensibles.

## 7. Archivos involucrados

- `devops/CI-CD.md` (este documento) · `devops/DEVOPS.md` · `devops/DOCKER.md` · `devops/ENVIRONMENTS.md` · `devops/MONITORING.md` · `devops/BACKUP-RECOVERY.md`
- Futuros repos: `cargoops-backend`, `cargoops-frontend` y `cargoops-infrastructure` (`MASTER-SPEC.md` §22)
- `qa/QA-STRATEGY.md` (W8) · `docs/DEFINITION-OF-DONE.md` (W10) · `docs/architecture/ADR/ADR-012` (W3)

## 8. Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Migraciones de DB que rompen el rollback de imagen | Migración siempre con backup previo verificado; rollback de esquema documentado por release |
| Gates demasiado estrictos → merge lento | Coverage ≥80% y 2 E2E críticos; revisiones de umbral trimestrales en `qa/` |
| Falsos positivos de SCA que bloquean todo | Excepción con ticket y fecha de remediación; severidad runtime priorizada |
| Dependencia de una plataforma CI específica | Config declarativa y scripts agnósticos (`scripts/`); CI/CD como código en repo de infraestructura |
| Secretos en logs del pipeline | Redacción automática + fallo ante patrón de secreto; revisión en code review |

## 9. DECISIÓN PENDIENTE

Las preguntas con OQ asignada quedaron **resueltas en MASTER-SPEC v0.5 (2026-09-24)**; los ítems 1–2 no tienen OQ asignada y se conservan como residuales locales:

| # | Pregunta | Impacto | Resolución |
| --- | --- | --- | --- |
| 1 | ¿GitHub Actions, GitLab CI u otra plataforma? | Hosting de repos futuros (`MASTER-SPEC.md` §22), costos, familiaridad del equipo | 🔶 Pendiente local — sin OQ asignada; los fragmentos de este documento son agnósticos |
| 2 | ¿GHCR, ECR, Docker Hub privado u otro registry? | Integración con la plataforma CI, retención, seguridad del artefacto | 🔶 Pendiente local — sin OQ asignada; no bloqueante: cualquier registry OCI sirve |
| 3 | ~~¿Redis/BullMQ en v1 o diferido a v1.1?~~ | Stage `integration` (¿levanta Redis?) y mecanismo de jobs del pipeline | ✅ **RESUELTA (OQ-007)** — **Redis + BullMQ en v1** (ADR-012 Accepted): `integration` levanta Redis y `FEATURES_JOBS=bullmq`; la variante cron interno quedó descartada (JOBS.md §4.12) |
| 4 | ~~¿SSR en v1?~~ | Imagen `web` estática vs Node SSR; smoke test de SSR | ✅ **RESUELTA (OQ-010)** — **PWA mínima en v1, SSR diferido** a v1.1+: la imagen `web` v1 es estática (Nginx) y el smoke test de SSR se descarta; el pipeline soporta ambas vías por flag de build |