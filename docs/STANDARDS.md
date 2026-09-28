# CargoOps — Estándares de código y colaboración (STANDARDS)

> Fuente canónica: `docs/MASTER-SPEC.md` §15 (estándares de código y colaboración). Este documento amplía §15 con detalle operativo y consolida los **principios de ingeniería** que el MASTER-SPEC aún no tiene como sección propia (el §57 del prompt original; ver DECISIÓN PENDIENTE STD-D1 y `ROADMAP.md` RMP-D3).
> Ámbito: repos futuros `cargoops-frontend`, `cargoops-backend`, `cargoops-mobile`, `cargoops-infrastructure` (MASTER-SPEC §22). Aplican desde PHASE 1 (P1-T1 activa el tooling) y a toda la documentación técnica producida en FASE 0 (`docs/`).

---

## 1. Objetivo

Fijar los estándares únicos y obligatorios de CargoOps: calidad de código (TypeScript strict, ESLint, Prettier), control de cambios (Conventional Commits, SemVer, branch strategy), colaboración (PR + Code Review, Security Review), y los principios de ingeniería que guían las decisiones de diseño (SOLID, DRY, KISS, YAGNI, Clean Architecture, separación de concerns, inversión de dependencias, cohesión/acoplamiento, sin overengineering, sin lógica crítica en UI, sin acceso directo frontend→DB). Su cumplimiento se verifica en cada tarea mediante el DoD (DEFINITION-OF-DONE §6/§7) y en cada PR mediante el checklist de §8.

## 2. Contexto

- Stack: Angular 20+ (frontend), NestJS (backend), TypeScript en ambos lados, PostgreSQL/Prisma (MASTER-SPEC §11.2). Todo el backend y frontend son TypeScript → los estándares de tipado son transversales.
- La arquitectura es **Modular Monolith** (ADR-001): los estándares de acoplamiento protegen los boundaries de módulo (ningún módulo accede a repositorios/entidades de otro módulo directamente).
- Los repos y su CI se crean en fases posteriores (RMP-D2); este documento define lo que los pipelines P1-T5 y P13-T4 deben verificar.
- El equipo es pequeño (2–5 personas, ADR-001): los estándares existen para mantener calidad con rotación de roles y agentes de código (IMPLEMENTATION-PLAN §8).

## 3. Restricciones

- Todo lo que este documento fija es obligatorio en los repos de implementación; los agentes de código lo aplican tal cual (IMPLEMENTATION-PLAN campo Implementation/Validation).
- No se relajan estándares de seguridad para acelerar una fase (BR-009/BR-016 son CRÍTICAS; la autorización y las transiciones de estado SIEMPRE en backend).
- Nunca se atribuye trabajo a IA en commits ni se agrega «Co-Authored-By» autogenerado (MASTER-SPEC §15; detalle §5.3).
- En FASE 0, este documento aplica a la forma de los artefactos de `cargoops-docs/` (estructura, idioma, filenames — MASTER-SPEC §16); el tooling de código se activa en PHASE 1.

## 4. Calidad de código (TypeScript, ESLint, Prettier)

### 4.1 TypeScript strict

- `strict: true` (incluye `strictNullChecks`, `noImplicitAny`, `noUncheckedIndexedAccess` recomendado) en `tsconfig.json` de backend y frontend.
- Sin `any` explícito ni implícito en código de producción; usar `unknown` + narrowing para datos externos (API, JSONB, env).
- DTOs y contratos tipados con zod/nestjs (validación en runtime) además del tipo estático; el tipado estático nunca es la única validación (BR-006/BR-016 requieren validación en backend).
- `!` (non-null assertion) prohibido en la medida de lo posible; justificar por PR. `as` casting solo en fronteras (API/JSON) y con narrowing previo.
- Tipos de dominio (CargoStatus, LocationType, CapacityType, MovementKind, AlertStatus, AuditAction, §4.3 del MASTER-SPEC) declarados como uniones o enums canónicos únicos, nunca duplicados entre repos: el backend los exporta y el frontend los consume vía DTOs/OpenAPI.

### 4.2 ESLint

- Configuración base compartida (eslint.config.js) en cada repo con `typescript-eslint` recomendado + reglas de estilo del equipo.
- Reglas clave: prohibir `any` (`@typescript-eslint/no-explicit-any: error`), prohíbir `console.log` en producción (usar logger estructurado; `console.debug` permitido en dev), prohíbir promesas sin handle (`no-floating-promises`), orden de imports consistente.
- `npm run lint` es parte del CI (P1-T5) y del gate de PR; cero warnings en CI (warnings solo locales).

### 4.3 Prettier

- Formato único: `printWidth: 100`, `singleQuote: true`, `trailingComma: "all"`, `semi: true`.
- `format --check` en CI; sin discusión de estilo en code review (el formateo lo resuelve la herramienta).
- Pre-commit con husky + lint-staged (P1-T1) para lint + format de los archivos staged.

## 5. Conventional Commits

### 5.1 Formato

`<type>(<scope>): <descripcion corta imperativa>`

- **types**: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `perf`, `build`, `ci`, `security`, `style`, `revert`.
- **scope**: módulo backend (`cargo`, `movements`, `locations`, `auth`, `maps`, `alerts`, `audit`, `pdf`, `dashboard`, `trucks`, `notifications`, `users`, `roles`, `permissions`, `settings`, `health`) o area frontend (`map`, `cargo-ui`, `auth-ui`, `dashboard-ui`, `planos`, `pwa`, `i18n`, `ui-core`) o repo transversal (`docs`, `devops`, `infra`, `deps`).
- Sin MAYÚSCULAS iniciales, sin punto final, ≤ ~72 caracteres; el cuerpo explica el POR QUÉ (no repetir el diff).
- Un commit = una unidad de cambio lógica (una Task o parte coherente de ella, ver §5.2).

### 5.2 Ejemplos CargoOps

```
feat(cargo): validar unicidad de codigo al crear carga        # BR-002 (normalización canónica — OQ-001 resuelta)
fix(movements): rechazar movimiento sin observacion           # BR-006: 422 MOVEMENT_EMPTY_OBSERVATION
feat(movements): registrar movement + observation en una transaccion   # BR-008 / ADR-010
fix(alerts): calcular permanencia desde entryDate por defecto  # BR-015 (OQ-008 resuelta: corridos, entryDate)
feat(auth): rotar refresh token detectando reuso               # ADR-008
perf(map): memoizar MapLocation en el motor SVG                # PHASE 6 / performance
security(auth): hashear contrasenas con argon2                 # ADR-008 / Security Review
docs(api): documentar contrato POST /cargos/:id/movements      # backend/API.md
test(maps): cubrir validacion de rango de coordenadas          # PHASE 11 / MapEditor
refactor(locations): extraer CapacityCalculator al dominio     # alta cohesion / DRY
chore(deps): actualizar prisma a la version pinneada           # tooling
ci: incluir format --check y lint en el gate de PR             # P1-T5 / STANDARDS
revert(movements): revertir P5-T2 por capacidad no validada    # solo en emergencias
```

Regla de trazabilidad: cuando un commit implementa una regla de negocio, se indica el BR en el cuerpo o el pie (`BR-006`, `OQ-001`); los IDs de tarea (`P<N>-T<k>`) se citan en el cuerpo cuando aplica (IMPL-IMPLEMENTATION-PLAN §8.6).

### 5.3 Sin atribución IA

- **PROHIBIDO**: agregar `Co-Authored-By: <IA>`, `Generated with <herramienta>`, ni ningún pie/firma de autoría autogenerado por herramientas de IA en commits o PR de CargoOps (MASTER-SPEC §15).
- El autor del commit es la persona responsable del cambio, siempre. Las herramientas de IA se mencionan (si el repo lo pide) solo en documentación interna, nunca en el historial git.
- Aplica a todos los repos y a toda la FASE 0: los documentos de `cargoops-docs/` no llevan atribución IA.

## 6. Semantic Versioning (SemVer)

- `MAJOR.MINOR.PATCH` para releases públicos (`v1.0.0`, ADR/ROADMAP PHASE 13).
- **MAJOR**: breaking changes de contrato (API `/api/v1` → `/api/v2`, MASTER-SPEC §10), cambios de dominio incompatibles, migración de datos destructiva.
- **MINOR**: funcionalidad nueva compatible (nueva fase/feature, nueva capacidad de API aditiva, nueva pantalla).
- **PATCH**: correcciones compatibles (fixes de BR, seguridad PATCH-compatible, style).
- Pre-release: `v1.0.0-rc.1` antes del release final. Changelog por release (release notes) obligatorio (P13-T4); el changelog se actualiza con cada PR (conventional commits → changelog generado o manual).
- El API versiona contrato por URL `/api/v1` (ADR-007); la versión de paquete del repo es independiente y sigue SemVer.

## 7. Branch strategy (trunk-based + feature branches)

- **Regla maestra**: `main` (trunk) siempre desplegable y verde (CI: lint + test + build del MAIN-SPEC §14). Nada se rompe en `main`.
- Cada Task (`P<N>-T<k>`, IMPLEMENTATION-PLAN) trabaja en una **feature branch** corta: `feat/P2-T1-auth-login`, `fix/P5-T2-observacion-obligatoria`, `docs/roadmap-phases`, `release/v1.0.0`.
- Naming: `<tipo>/P<N>-T<k>-<slug>` (tipo: feat|fix|docs|refactor|test|chore|ci|security|revert).
- La rama es efímera: vive mientras la Task (vida ≤ unos días; si se alarga, se rebasa con `main` y se revisa el split de la Task — IMPLEMENTATION-PLAN §7.3).
- Integración: PR → code review (§8) → merge a `main` (merge rebase o squash con mensaje convencional). **Nadie commitea directo a `main`**, salvo hotfix de producción con doble revisión (exception documentada).
- Estrategia: trunk-based con feature branches (MASTER-SPEC §15). No se usan develop/release branch permanentes; el release se corta de `main` con tag SemVer (§6).

## 8. Pull Requests + Code Review

### 8.1 Proceso

1. La PR referencia la Task (`P<N>-T<k>`) y, si aplica, el BR/FEATURE o US.
2. CI debe estar verde en la rama (lint, format --check, test, build, typecheck).
3. La PR se revisa por al menos 1 par + el dueño de dominio (Architect en módulos/UI críticas; Backend Dev + Frontend Dev en cambios full-stack) antes del merge.
4. Review autor de «approve» explícito; no se mergea con conversaciones abiertas sin resolver.
5. Squash-merge con mensaje conventional (§5) y sin atribución IA (§5.3).

### 8.2 Checklist de Code Review

- [ ] **Correctitud de negocio**: implementa exactamente lo de la Task; BR vinculadas respetadas (BR-001…020); sin reglas inventadas.
- [ ] **Permisos**: la autorización se valida en backend (BR-009); el frontend no autoriza ni decide transiciones (BR-016); guards/permisos correctos por rol (§8 MASTER-SPEC).
- [ ] **Validación**: validaciones de entrada en backend (DTO/validation), no solo en UI; errores con envelope estándar §10 (code/message/details/requestId).
- [ ] **Manejo de errores y estados**: errores esperados y no esperados cubiertos; loading/empty/error en las pantallas nuevas (DoD §6.3).
- [ ] **Tests**: la Task incluye sus tests (unit/integration/API) con casos de rechazo; CI verde.
- [ ] **Acoplamiento**: respeta boundaries de módulo (ADR-001) — sin acceso a repositorios internos de otros módulos; sin duplicación de lógica (DRY dentro de lo razonable).
- [ ] **Arquitectura**: se ajusta al ADR y a los principios de §10; si propone algo nuevo, se propone ADR, no un cambio silencioso.
- [ ] **Rendimiento**: sin N+1 en consultas, paginación en listados (límites §10), sin trabajo pesado en el hilo de UI innecesario.
- [ ] **Seguridad básica**: sin secretos, sin SQL/HTML injection, CORS/headers correctos (helmet), rate limit en auth, sanitización de entrada (integrar con §9).
- [ ] **Accesibilidad básica**: teclado/foco/labels en lo nuevo (objetivo WCAG 2.2 AA §12).
- [ ] **Logs/auditoría**: acciones sensibles generan AuditLog (ADR-010); logs estructurados sin datos sensibles (BR-017).
- [ ] **Scope**: la PR toca solo los archivos de la Task; sin refactors de paso ni cambios cosméticos no pedidos.

### 8.3 Métricas de revisión (soft)

PR < ~400 líneas de diff para revisión fluida; tiempo de review < 1 día hábil; máximo 2 devoluciones por PR antes de escalar (IMPLEMENTATION-PLAN §8.7).

## 9. Security Review

### 9.1 Cuándo se aplica

- Obligatorio en: cambios en auth (módulo `auth`, guards, tokens — ADR-008), RBAC/permisos (BR-009/010/011/012), manejo de datos sensibles o exportaciones (PDF BR-018), jobs/procesos batch (ADR-012), infraestructura/Docker/secrets (P13), y cambios de schema que expongan datos.
- Rutinario (checklist rápido) en el resto de PRs (§8.2 seguridad básica).

### 9.2 Checklist de Security Review (dedicado)

- [ ] Autenticación: JWT access corto + refresh rotación (ADR-008); logout invalida; rate limiting en login; sin tokens en logs.
- [ ] Autorización: matriz §8 aplicada 1:1; permisos por rol en backend; IDs de recurso validados (IDOR); transiciones de estado backend (BR-016).
- [ ] Datos: soft delete + auditoría (BR-013/ADR-010/011); sin datos sensibles innecesarios (BR-017); export PDF solo con datos autorizados (BR-018).
- [ ] Input: validación de DTOs backend; sanitización; sin SQL injection (Prisma parametrizado); límites de paginación.
- [ ] Config: secretos fuera del repo (env/secret manager); CORS restringido; headers de seguridad (helmet); TLS en staging/prod.
- [ ] Auditoría de la review: hallazgos registrados y resueltos antes del merge; los «bloqueantes» se reportan al orquestador (DEFINITION-OF-DONE §5).

## 10. Principios de ingeniería (§57 propuesto — pendiente de incorporar al MASTER-SPEC, ver STD-D1)

> Estos principios guían diseño y revisiones. Orden de precedencia ante conflicto: reglas de negocio canónicas (BR) > arquitectura canónica (ADR) > estos principios.

| Principio | Regla en CargoOps |
| --- | --- |
| **SOLID** | Single Responsibility por clase/servicio (un service de dominio hace una cosa); Open/Closed vía interfaces de módulo (ADR-001 puertos); Liskov y Segregación de Interfaces en contratos de módulo; Dependency Inversion vía inversion de dependencias (abajo). |
| **DRY** | La lógica de negocio se define UNA vez en el backend (validaciones, cálculos de capacidad, máquina de estados). No duplicar DTOs entre repos: backend los exporta (OpenAPI) y frontend los genera/consume. Duplicación deliberada (p. ej. constantes de UI) se comenta y justifica. |
| **KISS** | Solución más simple que cumple los criterios; sin abstracciones especulativas (ver YAGNI). Se prefiere un servicio claro a una jerarquía de clases vacía. |
| **YAGNI** | No construir para un futuro no confirmado: multi-depósito, QR, integraciones, microservicios están en §1.5 «diseñar, NO implementar». La arquitectura los habilita (boundaries), no los implementa. |
| **Clean Architecture donde aporte** | Dependencias dirigidas hacia el dominio: los módulos expresan reglas de negocio independientes de framework/DB; los frameworks (Nest/Prisma/Angular) son detalles de implementación dentro de cada módulo. No se aplica dogmáticamente: un monolito modular pequeño no exige capas hexagonales completas en cada CRUD trivial (KISS prevalece). |
| **Separation of Concerns (SoC)** | Controller (HTTP) / Service (negocio) / Repository (datos) separados por módulo (MASTER-SPEC §11.3); UI, lógica de presentación y estado separados en frontend (core/shared/features §11.4). |
| **Dependency Inversion** | Los módulos dependen de interfaces (puertos) del módulo que consumen, no de repositorios/entidades internas ajenas (ADR-001). Inyección de dependencias (Nest DI/Angular DI) para inyectar, no para acoplar. |
| **Alta cohesión / bajo acoplamiento** | Un módulo agrupa lo que cambia por la misma razón (cargo, movements, maps…); entre módulos, comunicación explícita y mínima. Medida de alarma: si un cambio en A obliga a tocar B y C sin contrato, el boundary se erosionó. |
| **No overengineering** | Prohibido: microservicios, colas, cachés, multi-tenant o abstracciones para necesidades que no existen (§1.5). Cada complejidad nueva requiere justificación en el ADR/PR (la regla de RMP-006 de fases 12/13 aplica también al diseño). |
| **No lógica crítica en UI** | El frontend NO valida reglas de negocio (BR), no decide transiciones de estado (BR-016), no autoriza (BR-009) y no calcula capacidad/permanencia (agregaciones y capacidad → backend, PHASES P7-T1 nota técnica). El frontend solo refleja: oculta botones por UX, muestra estados, valida formato de input (never como única capa). PDF siempre generado en backend (no lógica crítica en cliente) — PHASES P10 nota técnica. |
| **No acceso directo frontend→DB** | El frontend jamás se conecta a PostgreSQL, Redis ni ejecuta SQL/Prisma (solo vía API REST versionada `/api/v1`, §10). La DB solo es accesible por el backend (y, en operación, por el equipo DevOps con acceso controlado). |

### 10.1 Consecuencias operativas de los principios

- Dashboard: el backend agrega (`GET /api/v1/dashboard`); el frontend solo consume DTOs (PHASES P7-T1).
- Mapa: los datos del plano viven en el backend (Map/MapElement, BR-020); el motor SVG renderiza sin lógica de negocio.
- Movimientos: la máquina de estados vive en un servicio de dominio backend (P5-T1); la UI del flujo solo orquesta llamadas y muestra estados.
- Jobs (alertas 30d): proceso backend (job real BullMQ — OQ-007 resuelta, ADR-012); nunca en el cliente.

## 11. Criterios de aceptación de este documento

- [ ] Cubre los estándares de MASTER-SPEC §15 con detalle operativo (configuración, ejemplos, checklists).
- [ ] Los principios del §57 propuesto están enumerados con regla concreta por principio.
- [ ] Los ejemplos de Conventional Commits usan el dominio y los módulos reales de CargoOps (cargo, movements, alerts, auth…).
- [ ] Coherente con `DEFINITION-OF-DONE.md` (checklists de §6/§7 referencian estos estándares), `IMPLEMENTATION-PLAN.md` (campo Validation) y `devops/CI-CD.md` (pipelines que ejecutan estas reglas).
- [ ] Sin placeholders; pendientes reales en DECISIÓN PENDIENTE (§13).

## 12. Archivos involucrados

| Archivo | Rol |
| --- | --- |
| `docs/STANDARDS.md` (este) | Estándares únicos de código, commits, branches, PR y principios |
| `docs/MASTER-SPEC.md` §15, §10, §14, §22 | Fuente canónica (estándares, API, QA/DevOps, repos) |
| `docs/DEFINITION-OF-DONE.md` §6/§7 | Verificación de estos estándares en tareas y funcionalidades |
| `docs/roadmap/IMPLEMENTATION-PLAN.md` | Campo Validation de las Tasks (usa §4 de este documento) |
| `docs/devops/CI-CD.md` · `docs/devops/DOCKER.md` · `docs/devops/ENVIRONMENTS.md` | Pipelines que ejecutan lint/format/test/build/security |
| `docs/architecture/ARCHITECTURE.md` y ADR-001…013 | Marco arquitectónico que los principios de §10 protegen |
| `docs/backend/MODULES.md` · `docs/frontend/FRONTEND-ARCHITECTURE.md` | Estructura donde aplican SoC/cohesión/boundaries |
| `docs/TEAM-ROLES.md` | Quién aplica y revisa estos estándares (roles) |

## 13. Riesgos

| # | Riesgo | Impacto | Mitigación |
| --- | --- | --- | --- |
| STD-R1 | `strict: true` + zero-warnings vistos como freno por agentes/desarrolladores | Fricción inicial | Tooling en P1-T1 (husky/lint-staged) + CI como guardián automático, no humano |
| STD-R2 | Frontend duplica validaciones de negocio «por comodidad» | BR-009/BR-016 erosionadas | Principio «no lógica crítica en UI» en el checklist de review (§8.2) y DoD §6.2 |
| STD-R3 | Atribución IA aparece en commits (herramientas la agregan por defecto) | Historial git con autoría falsa | §5.3 + config de las herramientas + revisión en PR (bloqueante) |
| STD-R4 | Principios de §10 sin enforcement concreto | Decisiones ad-hoc inconsistentes | Los principios alimentan el checklist de review y las notas técnicas de PHASES |
| STD-R5 | Conventional Commits mal aplicados (scope inconsistente) | Changelog/release inutilizables | Scope canónico definido en §5.1; changelog generado desde commits en P13-T4 |

## 14. DECISIÓN PENDIENTE

| ID | Pregunta | Impacto | Relación |
| --- | --- | --- | --- |
| STD-D1 | MASTER-SPEC v0.1 no tiene la sección §57 de principios (SOLID/DRY/…). ¿El orquestador incorpora §57 al MASTER-SPEC tomando el §10 de este documento como base, o los principios quedan solo en STANDARDS.md? | Fuente canónica de los principios | ROADMAP RMP-D3 · MASTER-SPEC v0.1 |
| STD-D2 | ¿Se adopta `noUncheckedIndexedAccess` y `exactOptionalPropertyTypes` en el tsconfig base, o solo el `strict` estándar? (Más strict ≠ mejor en todas las bases de código) | Config TypeScript de P1-T1 | MASTER-SPEC §15 |
| STD-D3 | ¿Los ejemplos de Conventional Commits de §5.2 quedan como convención de referencias BR/OQ en el pie del commit, o se exige solo el mensaje convencional sin metadatos? | Trazabilidad commits↔reglas | MASTER-SPEC §19, IMPLEMENTATION-PLAN §8 |
| STD-D4 | ¿El changelog se genera automáticamente desde conventional commits o se redacta manualmente por release (control editorial)? Con impacto en P13-T4 | Release notes | STANDARDS §6, ROADMAP PHASE 13 |

## 15. Referencias cruzadas principales

- MASTER-SPEC §15 (estándares), §16 (convenciones de documentación), §10 (API/envelope), §14 (QA/DevOps/CI), §22 (repos futuros).
- `docs/DEFINITION-OF-DONE.md` §6.2 (validaciones/permissions), §7 (DoD de tarea) — los gates que verifican estos estándares.
- `docs/roadmap/IMPLEMENTATION-PLAN.md` §6 (campo Validation), §8 (ciclo de vida — el review verifica §8.2).
- `docs/roadmap/ROADMAP.md` RMP-D3 (§57 pendiente), PHASE 1 (P1-T1 tooling), PHASE 13 (release/SemVer).
- `docs/architecture/ADR/ADR-001…013` (marco que §10 protege).
- `docs/devops/CI-CD.md`, `docs/devops/ENVIRONMENTS.md`, `docs/devops/DOCKER.md` (execución de estándares en pipelines).
- `docs/TEAM-ROLES.md` §5.3/§5.9 (Architect y DevOps aplican y auditan estos estándares).