# CargoOps — Roles del equipo

> Fuente canónica: `docs/MASTER-SPEC.md` §21 (equipo) y §17 (manifest de documentos). Estándares de trabajo: `docs/STANDARDS.md`. Cierre de trabajo: `docs/DEFINITION-OF-DONE.md`. Enfoque de equipo pequeño (2–5 personas en la práctica, ADR-001): los roles se pueden acumular en una misma persona, pero **las responsabilidades no desaparecen** — se asignan explícitamente.
> Propósito de este documento: que cada rol sepa qué produce, con qué documentación trabaja, de quién depende y con qué criterio se considera que su trabajo está terminado (fase 0 = documentación; fases 1+ = implementación por tareas de `IMPLEMENTATION-PLAN.md`).

---

## 1. Objetivo

Definir los roles del equipo CargoOps (PO, Scrum Master/PM, Software Architect, UI/UX Designer, Backend Developer, Frontend Developer, Mobile Developer, QA Engineer, DevOps Engineer): responsabilidades, entregables, documentos del manifest que utilizan, dependencias entre roles y criterios de finalización de su trabajo.

## 2. Contexto

- CargoOps se documenta en FASE 0 (~60 documentos, MASTER-SPEC §17) y se implementará por fases con agentes de código (OpenCode + Gentle-Orchestrator) bajo el plan de `IMPLEMENTATION-PLAN.md`.
- Cada rol consume un subconjunto distinto del manifest; este documento es el mapa rol → documentos.
- En FASE 0 los «entregables» de todos los roles son documentos; en fases 1+ son código, configuraciones, pruebas y despliegues, siempre con su documentación adjunta (DoD, DEFINITION-OF-DONE §6.5).
- En un equipo pequeño los roles se combinan típicamente: Software Architect + Backend Developer, o UI/UX Designer + Frontend Developer, o QA + DevOps. La matriz RACI por rol/entregable (sección 6) ayuda a que la combinación no deje huecos.

## 3. Restricciones

- No inventar responsabilidades canónicas nuevas: lo que MASTER-SPEC ya decide (RBAC §8, arquitectura §11, roadmap §18, DoD §20) es regla para todos los roles, no sugerencia.
- Toda ambigüedad real detectada por un rol se reporta como DECISIÓN PENDIENTE al orquestador y se centraliza en `OPEN-QUESTIONS.md` (MASTER-SPEC §16).
- Los roles no se contradicen con el proceso: el PO decide «qué», el Architect decide «cómo», y el resto ejecuta dentro de ese marco; el orquestador arbitra.
- Ningún rol entrega trabajo que no cumpla el DoD del nivel correspondiente (documentación §3 / tarea §7 / funcionalidad §6 / fase §4 / release §5 de `DEFINITION-OF-DONE.md`).

## 4. Dependencias entre roles

| Rol | Depende de | Le depende |
| --- | --- | --- |
| PO | negocio/usuario (preguntas OQ), PM (priorización de agenda) | todos (alcance) |
| SM/PM | PO (backlog), orquestador (avance de fases) | todos (rituales, reportes) |
| Software Architect | PO (alcance), PM (planificación) | Backend, Frontend, Mobile, QA, DevOps |
| UI/UX Designer | PO (requisitos), Architect (estructura posible) | Frontend, QA (evidencia) |
| Backend Developer | Architect (módulos/contratos), UI/UX (contrato de UX no) | Frontend (API), QA (tests), DevOps (despliegue) |
| Frontend Developer | Backend (API), UI/UX (diseños), Architect | QA (E2E), Mobile (reuso) |
| Mobile Developer | Frontend (PWA/layout), Backend (API) | QA (móvil) |
| QA Engineer | Backend + Frontend (builds), PO (criterios) | DevOps (release gate), PO (aceptación) |
| DevOps Engineer | Architect (despliegue), Backend/Frontend (builds) | todos (ambientes) |

## 5. Roles

Para cada rol: **Responsabilidades** · **Entregables** · **Documentos del manifest que utiliza** · **Dependencias** · **Criterios de finalización**.

### 5.1 PRODUCT OWNER (PO)

- **Responsabilidades**:
  - Es dueño del producto y del backlog: prioriza requisitos (MoSCoW de `PRD.md`), valida reglas de negocio y resuelve las preguntas OQ que bloquean fases (OQ-001…OQ-047 — todas resueltas en FASE 0 v0.5 — y las que se agreguen).
  - Decide «qué» se construye: alcance en/out (PRD §7), prioridades P0–P4 (RMP-002) y aceptación de funcionalidades contra criterios del backlog.
  - Representa al negocio operativo del predio (operadores, supervisión aduanera, gerencia).
- **Entregables**: backlog priorizado y desglosado (`PRODUCT-BACKLOG.md`, W1), respuestas a OQ, criterios de aceptación de EPIC/FEATURE/US, decisiones de alcance documentadas en PRD, aceptación de demos de fases (DOD-D3).
- **Documentos que utiliza**: `MASTER-SPEC.md` (§6 reglas, §8 roles, §18 fases), `product/PRD.md`, `product/PRODUCT-BACKLOG.md`, `product/USER-STORIES.md` (pendiente W1), `product/USE-CASES.md` (pendiente W1), `product/BUSINESS-RULES.md` (pendiente W1), `OPEN-QUESTIONS.md`, `roadmap/ROADMAP.md` (prioridades).
- **Dependencias**: respuestas del negocio/usuario final; agenda del SM/PM.
- **Criterios de finalización** (de su trabajo en una iteración): backlog desglosado hasta US con criterios verificables; OQ que bloquean fases próximas respondidas o con plan de respuesta antes del gate correspondiente (RMP-004); alcance cerrado coherente con el PRD.

### 5.2 SCRUM MASTER / PROJECT MANAGER (SM/PM)

- **Responsabilidades**: facilita el proceso (sprints/hitos por fase), remueve impedimentos, coordina al orquestador y a los roles, mantiene el flujo de reportes y la transparencia del roadmap; en CargoOps actúa como puente entre el orquestador (ejecución por agentes) y el equipo humano.
- **Entregables**: plan de iteración por fase, reportes de avance, gestión de riesgos del roadmap (ROADMAP §9), actas de cierre de fase (DoF, ROADMAP §4 RMP-005), escalamiento de bloqueos OQ al PO.
- **Documentos que utiliza**: `roadmap/ROADMAP.md`, `roadmap/PHASES.md`, `roadmap/IMPLEMENTATION-PLAN.md` (colas de Tasks, IMP-006/IMP-007), `DEFINITION-OF-DONE.md` (gates), `OPEN-QUESTIONS.md`.
- **Dependencias**: PO (prioridad), orquestador (avance técnico), todos los roles (estado).
- **Criterios de finalización**: fase cerrada con DoF + DoD de fase (§4 de DEFINITION-OF-DONE) + cero bloqueos OQ sin resolver/mitigación; Tasks planificadas sin dependencias invisibles (IMPLEMENTATION-PLAN §8).

### 5.3 SOFTWARE ARCHITECT

- **Responsabilidades**: decide y documenta el «cómo» de alto nivel: arquitectura (Modular Monolith, ADR-001…013), stack (§11.2), módulos backend (§11.3), estructura frontend (§11.4), motor de mapa (§11.5), seguridad §8/BR-009, rendimiento/escalabilidad (§1.5). Vela por los principios de §10 de `STANDARDS.md` (SOLID, DRY, KISS, YAGNI, Clean Architecture donde aporte, separación de concerns, inversión de dependencias, alta cohesión/bajo acoplamiento, sin lógica crítica en UI, sin acceso directo frontend→DB).
- **Entregables**: `architecture/ARCHITECTURE.md`, `architecture/DATABASE.md`, `architecture/SECURITY.md`, `architecture/AUTHORIZATION.md`, `architecture/AUDIT.md`, `architecture/MAP-ENGINE.md`, `architecture/PDF-EXPORT.md`, `architecture/NOTIFICATIONS.md`, `architecture/PERFORMANCE.md`, `architecture/SCALABILITY.md`, ADR-001…013; decisiones de diseño ad-hoc en `IMPLEMENTATION-PLAN.md` (campo Implementation de las Tasks).
- **Documentos que utiliza**: `MASTER-SPEC.md` (§4 dominio, §10 API, §11 arquitectura, §14 QA/DevOps), `product/PRD.md` (requisitos), `roadmap/PHASES.md` (módulos por fase), `roadmap/IMPLEMENTATION-PLAN.md` (Tasks), `backend/MODULES.md`, `frontend/FRONTEND-ARCHITECTURE.md`.
- **Dependencias**: PO (alcance estable), PM (planificación); resolución de OQ de arquitectura que impactan ADR (OQ-005/006/007/010 — resueltas 2026-09-24).
- **Criterios de finalización**: ADR redactados y aceptados (formato Context/Decision/Alternatives/Consequences); arquitectura consistente con MASTER-SPEC sin decisiones canónicas redefinidas; las Tasks de cada fase respetan boundaries de módulo (fracasos de acoplamiento se rechazan en revisión de PR).

### 5.4 UI/UX DESIGNER

- **Responsabilidades**: define la experiencia del predio: flujos de usuario (15 flujos), pantallas, mapa UX, diseño responsive (desktop-first + móvil con drawer), accesibilidad WCAG 2.2 AA (objetivo §12 del MASTER-SPEC), design tokens y pauta visual.
- **Entregables**: `ux/USER-FLOWS.md`, `ux/SCREENS.md`, `ux/MAP-UX.md`, `brand/BRAND-BOOK.md`, `brand/DESIGN-TOKENS.md`, `brand/UI-GUIDELINES.md`, `brand/MAP-VISUAL-GUIDELINES.md`; prototipos de baja/alta fidelidad si aplica (fuera del manifest, opcional).
- **Documentos que utiliza**: `MASTER-SPEC.md` (§12 UX/UI, §13 marca y tokens), `product/PRD.md` (requisitos MoSCoW), `product/USER-FLOWS.md`→ (propio), `frontend/COMPONENTS.md` (componentes canónicos que la UI consume).
- **Dependencias**: PO (requisitos y OQ de UI), Architect (mapa SVG y límites de interacción), Frontend (viabilidad técnica).
- **Criterios de finalización**: cada pantalla/flujo documentado sin placeholders, con estados (loading/empty/error) y alternativa accesible del mapa (listado); pendientes de UI registrados como DECISIÓN PENDIENTE (DP-UF-xx, DP-SC-xx) y reportados.

### 5.5 BACKEND DEVELOPER

- **Responsabilidades**: implementa los módulos NestJS (auth, users, roles, permissions, cargo, trucks, locations, movements, maps, alerts, dashboard, audit, notifications, settings, health — v1 sin reports, §11.3), reglas de negocio BR-001…020, máquina de estados (§7), RBAC validado en backend siempre (BR-009), API REST versionada (§10) y jobs (BullMQ reales v1 — OQ-007 → ADR-012 resuelta).
- **Entregables**: módulos en `cargoops-backend/` (controller, service, repository, DTOs, entities, guards, validators, exceptions), schema Prisma + migraciones + seeds (§5), contratos OpenAPI, tests unit/integration/API, actualizaciones a `backend/*.md`.
- **Documentos que utiliza**: `MASTER-SPEC.md` (§4 dominio, §6 BR, §7 estados, §10 API, §11 arquitectura), `backend/BACKEND-ARCHITECTURE.md`, `backend/MODULES.md`, `backend/DTOs.md`, `backend/API.md`, `backend/API-CONVENTIONS.md`, `backend/ERROR-HANDLING.md`, `backend/VALIDATION.md`, `backend/JOBS.md`, `architecture/ARCHITECTURE.md`, ADR-003/004/005/007/008/009/010/011/012.
- **Dependencias**: Architect (contratos de módulo), Tasks precedentes de su fase (IMPLEMENTATION-PLAN §6 campo 4), OQ que bloquean su dominio (p. ej. OQ-001/002/004 — resueltas en FASE 0: BR-002 / CargoLocation / BR-043).
- **Criterios de finalización**: su(s) Task(s) cierran DoD de tarea (§7 de DEFINITION-OF-DONE): CI verde, BR cubiertas con tests, envelope de errores estándar, permisos backend, auditoría de acciones sensibles, contrato API documentado sin divergencias.

### 5.6 FRONTEND DEVELOPER

- **Responsabilidades**: implementa la SPA Angular standalone: estructura core/shared/features (§11.4), componentes canónicos (CargoTable, OperationalMap, MovementTimeline, AlertCard, diálogos…), estado y servicios, guards de UX (que no autorizan, BR-009), interceptor con refresh, mapa SVG (con el motor de ARCHITECTURE/MAP-ENGINE), estados loading/empty, responsive y accesibilidad básica, PWA mínima según OQ-010 (resuelta: mínima en v1, SSR diferido).
- **Entregables**: features/páginas/componentes en `cargoops-frontend/`, servicios de API tipados (DTOs del backend), tests de componente/unit, actualizaciones a `frontend/*.md` y `qa/` cuando cambien flujos.
- **Documentos que utiliza**: `frontend/FRONTEND-ARCHITECTURE.md`, `frontend/COMPONENTS.md`, `frontend/DESIGN-SYSTEM.md`, `frontend/STATE-MANAGEMENT.md`, `frontend/ROUTING.md`, `frontend/I18N.md`, `frontend/ACCESSIBILITY.md`, `frontend/SEO.md`, `frontend/PWA.md`, `ux/*`, `brand/DESIGN-TOKENS.md`, `architecture/MAP-ENGINE.md`, `backend/API.md` (contratos).
- **Dependencias**: Backend (API estable de su fase), UI/UX (diseños/tokens), Tasks precedentes frontend.
- **Criterios de finalización**: DoD de tarea (§7): componentes con estados loading/empty/error, responsive probado en 4 breakpoints, navegación por teclado + foco en lo nuevo, sin lógica de negocio crítica (BR-016/BR-009: el frontend no decide transiciones ni autoriza), UI es-AR.

### 5.7 MOBILE DEVELOPER

- **Responsabilidades**: prepara la base para PHASE 14 (futuro, RMP-007) desde FASE 0: diseña para que el mapa + detalle de carga funcionen en móvil (drawer/panel inferior, §12), evalúa PWA avanzada vs nativo (OQ-010 resuelta: **PWA mínima v1**, avanzado/SSR diferido) y garantiza offline solo de consultas, nunca de movimientos (§12).
- **Entregables (FASE 0)**: estrategia móvil documentada (en `roadmap/PHASES.md` P14-T1 y `frontend/PWA.md`), requisitos móviles incorporados a la arquitectura; (fases 1+) layout móvil del mapa y pantallas, notificaciones según OQ-011 (resuelta: solo in-app v1), mejoras de ergonomía.
- **Documentos que utiliza**: `MASTER-SPEC.md` (§1.5 futuro, §12 UX mobile), `frontend/FRONTEND-ARCHITECTURE.md`, `frontend/PWA.md`, `ux/MAP-UX.md`, `frontend/ROUTING.md`, `backend/API.md` (reuso), `DEVICE/TESTING` del equipo (QA móvil).
- **Dependencias**: Frontend (PWA/layout), Backend (API estable y versionada §10), QA (pruebas en dispositivos).
- **Criterios de finalización**: estrategia móvil con decisión y justificación (sin reescritura, §1.5); en fase 14: app usable en móvil, movimientos críticos NO offline bloqueados explícitamente, sin regresión desktop (ROADMAP PHASE 14 DoF).

### 5.8 QA ENGINEER

- **Responsabilidades**: define la estrategia y plan de pruebas (unit + integration + E2E + API + security + accessibility + performance, §14), genera casos de prueba desde BR y criterios de aceptación, ejecuta oleadas de QA (W-6), audita accesibilidad desde PHASE 6 y es el gate de PHASE 12 hacia producción.
- **Entregables**: `qa/QA-STRATEGY.md`, `qa/TEST-PLAN.md`, `qa/TEST-CASES.md`, `qa/E2E-SCENARIOS.md`, `qa/ACCEPTANCE-CRITERIA.md`; suites E2E, reportes de a11y/perf/seguridad, backlog de defectos (cerrado a cero bloqueantes antes de PHASE 13).
- **Documentos que utiliza**: `MASTER-SPEC.md` (§6 BR, §14 QA, §20 DoD), `product/USER-STORIES.md` (criterios de aceptación por rol), `product/USE-CASES.md`, `roadmap/PHASES.md` (tareas por fase que verificar), `DEFINITION-OF-DONE.md`, `frontend/ACCESSIBILITY.md`, `architecture/SECURITY.md`.
- **Dependencias**: Backend/Frontend (builds e hitos), PO (definición de «aceptable»), DevOps (ambientes para E2E).
- **Criterios de finalización**: E2E de casos críticos verdes (crear carga, mover, sin observación, exceder capacidad, permisos, reversión, alerta 30d, PDF, plano — §14); reporte de accesibilidad sin bloqueantes; defectos con severidad clasificada y protocolo de ambigüedad BR → DECISIÓN PENDIENTE (TEST-PLAN); sugerencia formal de aprobación/rechazo del release (§5 de DEFINITION-OF-DONE).

### 5.9 DEVOPS ENGINEER

- **Responsabilidades**: infraestructura y liberación: docker-compose de dev/prod, CI/CD (lint→test→build→security→deploy), ambientes development/staging/production, secretos, backups/DR con RPO/RTO (OQ-016 resuelta: RPO ≤ 15 min · RTO ≤ 4 h), monitoreo/alertas/rollback, deploy de release v1.0.0.
- **Entregables**: `devops/DEVOPS.md`, `devops/CI-CD.md`, `devops/DOCKER.md`, `devops/ENVIRONMENTS.md`, `devops/BACKUP-RECOVERY.md`, `devops/MONITORING.md`, `devops/LOGGING.md`; pipelines reales en fases 1/13, runbooks, dashboard de monitoreo.
- **Documentos que utiliza**: `MASTER-SPEC.md` (§14 QA/DevOps, §22 repos), `architecture/ARCHITECTURE.md`, `architecture/PERFORMANCE.md`, `roadmap/ROADMAP.md` (PHASE 13), `roadmap/IMPLEMENTATION-PLAN.md` (P1-T5, P13-T1..T4), `STANDARDS.md` (branch/PR/security).
- **Dependencias**: Architect (topología/stack), Backend/Frontend (artefactos de build), QA (gate de release), PO/PM (fechas).
- **Criterios de finalización**: pipeline verde en `main`; deploy reproducible a staging/prod con secretos externos al repo; backup restaurado y probado; monitoreo con alertas activas; release semver tag + changelog (STANDARDS §6); sin hallazgos de security review bloqueantes.

## 6. Matriz de participación por fase (resumen)

| Fase | PO | SM/PM | Architect | UI/UX | Backend | Frontend | Mobile | QA | DevOps |
| --- | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: |
| 0 Documentación | R | R | R | R | R | R | R | R | R |
| 1 Foundation | C | A | A/R | C | R | R | C | C | R |
| 2 Auth + RBAC | C | A | A | C | R | R | — | R | C |
| 3–5 Dominio (cargo/locations/movements) | R | A | A | C | R | R | C | R | C |
| 6–7 Mapa + Dashboard | C | A | A | R | C | R | C | R | C |
| 8–11 Historial/Alertas/PDF/Editor | C | A | A | C | R | R | C | R | C |
| 12 QA (endurecimiento) | C | A | C | C | C | C | C | R | C |
| 13 Production | C | A | C | C | C | C | C | R | R |
| 14 Mobile (futuro) | C | C | A | R | C | R | R | R | C |

> R = Responsable · A = Aprobador · C = Consultado (RACI simplificado; roles combinables en equipo pequeño, sección 4 de contexto).

## 7. Criterios de aceptación de este documento

- [ ] Los 9 roles de MASTER-SPEC §21 están cubiertos con responsabilidades, entregables, documentos, dependencias y criterios de finalización.
- [ ] La matriz por fase identifica quién responde de cada entrega en cada fase del roadmap.
- [ ] Coherente con `ROADMAP.md`, `PHASES.md`, `IMPLEMENTATION-PLAN.md`, `DEFINITION-OF-DONE.md` y `STANDARDS.md` (referencias cruzadas válidas).
- [ ] Sin placeholders y sin reglas inventadas; pendientes en DECISIÓN PENDIENTE (§8).

## 8. Archivos involucrados

| Archivo | Rol |
| --- | --- |
| `docs/TEAM-ROLES.md` (este) | Roles, entregables y matriz por fase |
| `docs/MASTER-SPEC.md` §21, §17 | Fuente canónica del equipo y del manifest |
| `docs/roadmap/ROADMAP.md` · `roadmap/PHASES.md` · `roadmap/IMPLEMENTATION-PLAN.md` | Fases, tareas y método que cada rol ejecuta |
| `docs/DEFINITION-OF-DONE.md` | Criterios de finalización referenciados por rol |
| `docs/STANDARDS.md` | Estándares que todos los roles técnicos deben cumplir |
| `docs/OPEN-QUESTIONS.md` | OQ que bloquean trabajo de roles (PO/Architect resuelven) |

## 9. Riesgos

| # | Riesgo | Impacto | Mitigación |
| --- | --- | --- | --- |
| TR-R1 | Roles combinados en 1 persona sin asignación explícita de responsabilidades | Huecos (p. ej. nadie hace a11y ni logs) | Matriz RACI §6 + DoD por nivel; la combinación de roles se declara por fase |
| TR-R2 | PO sin disponibilidad para responder OQ (nuevas de FASE 1+) | Fases 3/5 se estancan | PM agenda rondas de OQ antes de los gates (ROADMAP RSK-001) |
| TR-R3 | Arquitecto ausente de las revisiones de PR | Erosión de boundaries del monolito (ADR-001) | Code review de arquitectura obligatorio en PRs de módulos (STANDARDS §8) |
| TR-R4 | QA «último» en el flujo | Defectos tempranos se acumulan | Oleadas de QA desde fase 2 (W-6) y casos E2E tempranos |
| TR-R5 | DevSecOps sin dueño único (DevOps + Backend + Architect) | Security review se diluye | Ownership explícito en §5.9 + checklist de STANDARDS §9 en cada PR de cambio sensible |

## 10. DECISIÓN PENDIENTE

| ID | Pregunta | Impacto | Relación |
| --- | --- | --- | --- |
| TR-D1 | ¿Se necesita un rol adicional de **Documentador técnico** (o el SM/PM lo absorbe) para mantener `cargoops-docs/` al día tras cada fase? El manifest no lo define | Mantenimiento de documentación post-FASE 0 | MASTER-SPEC §17/§21 |
| TR-D2 | ¿Se agrega un rol/referente de **Seguridad** (DevOps + Architect) o se mantiene como checklist transversal de STANDARDS §9? | Ownership del security review | MASTER-SPEC §21 · STANDARDS §9 |
| TR-D3 | ¿El PO participa en la demo/aceptación de cada fase o solo en fases 3/5/6 (dominio y mapa)? Vinculado a DOD-D3 | Ritual de cierre de fases | DEFINITION-OF-DONE DOD-D3 |
| TR-D4 | En un equipo de 1 persona (todo-en-uno), ¿los entregables de FASE 0 de roles que no se pueden ejercer (p. ej. Mobile) se delegan al orquestador para su redacción? | Completitud del manifest | MASTER-SPEC §17 |
| TR-D5 | ¿Los criterios de finalización de roles se verifican por el orquestador (gate objetivo) o requieren validación humana del rol correspondiente? | Calidad del gate | IMPLEMENTATION-PLAN §8 |