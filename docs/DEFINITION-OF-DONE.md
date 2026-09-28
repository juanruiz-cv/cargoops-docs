# CargoOps — Definition of Done (DoD)

> Fuente canónica: `docs/MASTER-SPEC.md` §20 (Definition of Done global). Convenciones de fase: `docs/roadmap/ROADMAP.md` (§4 RMP-005, DoD de fase; PHASE 0 y fases 12/13 usan las secciones §3/§4/§5 de este documento) y `docs/roadmap/PHASES.md` (tareas P<N>-T<k>). Implementación por tareas: `docs/roadmap/IMPLEMENTATION-PLAN.md`.
> ⚠️ La numeración de secciones de este documento es **estable y referenciada por ROADMAP.md**: §3 DoD de documentación, §4 DoD de fase, §5 DoD de release. No renumerar sin actualizar las referencias cruzadas.

---

## 1. Objetivo

Definir los checklists de **Definition of Done** de CargoOps en sus cuatro niveles: documentación (FASE 0), funcionalidad (MASTER-SPEC §20 ampliado), fase (ROADMAP RMP-005) y release (fases 12/13), más el nivel de tarea para agentes de código. Cada checklist es acumulativo: una funcionalidad «Done» implica tareas «Done»; una fase «Done» implica funcionalidades «Done»; un release «Done» implica fases «Done».

## 2. Contexto

- CargoOps se implementa por fases (PHASE 1 Foundation → PHASE 14 Mobile) con DoF (criterios de salida) por fase definidos en `ROADMAP.md` §7. El DoD es la capa de calidad transversal que garantiza que nada se cierra «por aproximación» (MASTER-SPEC §20).
- Los consumidores del DoD son: el orquestador (gate de fases), los agentes de código (cierre de Tasks, IMPLEMENTATION-PLAN §8), QA (aceptación, `qa/QA-STRATEGY.md`, `qa/TEST-PLAN.md`) y DevOps (release, `devops/CI-CD.md`).
- Regla de oro: **no inventar reglas**; si una funcionalidad requiere una regla o comportamiento no definido, se registra DECISIÓN PENDIENTE y se reporta al orquestador (MASTER-SPEC §6/§16).

## 3. DoD de documentación (nivel: documento Markdown — aplica en FASE 0)

> Referenciado desde `ROADMAP.md` (criterios de salida de PHASE 0) y `PHASES.md` (P0-H2).

Un documento de `cargoops-docs/` está terminado cuando TODOS los siguientes checks son verdaderos:

### 3.1 Estructura y contenido
- [ ] Sigue el formato del manifest (MASTER-SPEC §16): `Objetivo`, `Contexto`, `Restricciones`, `Dependencias`, `Decisiones`, `Criterios de aceptación`, `Archivos involucrados`, `Riesgos`, y `DECISIÓN PENDIENTE` cuando aplique.
- [ ] Sin secciones vacías ni placeholders («TBD», «se completa luego», «…”»). Cero frases sin contenido real.
- [ ] Idioma: español profesional/neutral; filenames e identificadores en inglés (MASTER-SPEC §16).
- [ ] Longitud acorde al rol del documento (200–500 líneas salvo los que el manifest define como mayores, p. ej. IMPLEMENTATION-PLAN).

### 3.2 Coherencia
- [ ] No redefine decisiones canónicas: referencia el MASTER-SPEC y los ADR en lugar de re-derivarlos.
- [ ] Referencias cruzadas válidas: toda mención a `docs/*.md`, `§N` del MASTER-SPEC, BR-XXX, OQ-NNN, RMP-NNN, P<N>-T<k> o EPIC/FEATURE/US apunta a algo que existe o está marcado como pendiente.
- [ ] Los IDs de documentos y grupos coinciden con el manifest (MASTER-SPEC §17).

### 3.3 Ambigüedad
- [ ] Toda ambigüedad real detectada figura en la sección `DECISIÓN PENDIENTE` del documento, con pregunta, impacto y relación (OQ/DP-XXX), y fue reportada al orquestador.
- [ ] No se inventaron reglas de negocio nuevas (BR) ni decisiones de arquitectura nuevas fuera de un ADR.

### 3.4 Criterios de aceptación del documento
- [ ] La sección `Criterios de aceptación` del propio documento está marcada (checkboxes) o es verificable sin ambigüedad.
- [ ] El documento es consumible por su audiencia declarada sin leer el resto del repo (autocontenido en lo esencial).

## 4. DoD de fase (nivel: fase del roadmap)

> Referenciado desde `ROADMAP.md` §4 (RMP-005: «cada fase cierra con… DoD de fase (§4 definición-of-done)»).

Una fase está terminada cuando:

- [ ] **DoF cumplido**: todos los criterios de salida de la fase en `ROADMAP.md` §7 (`Criterios de salida (DoF)`) verificados con evidencia.
- [ ] **Funcionalidades Done**: todas las funcionalidades de la fase cumplen el DoD de funcionalidad (§6); ninguna queda «a medio cerrar».
- [ ] **Tasks Done**: todas las Tasks de la fase cerradas con DoD de tarea (§7) y CI verde (IMPLEMENTATION-PLAN §8).
- [ ] **Orden canónico**: no se salta el orden de fases (MASTER-SPEC §18) ni se abre una fase con dependencias no cerradas (ROADMAP §3/§5).
- [ ] **Pruebas**: unit + integration + API de la fase cubren las BR involucradas; casos críticos de §14 del MASTER-SPEC tienen al menos un test automatizado o clasificación explícita para PHASE 12.
- [ ] **Permisos**: las funcionalidades de la fase validan permisos en backend (BR-009) y el frontend solo oculta/UX (BR-009).
- [ ] **Documentación**: los contratos/archivos que cambiaron en la fase están actualizados en `cargoops-docs/` (API, módulos, componentes); cero referencias obsoletas introducidas por la fase.
- [ ] **Bloqueos OQ**: cero bloqueos 🔴 sin resolver o mitigación explícita del orquestador (RMP-005); los 🟡 quedan documentados.
- [ ] **Sin hard delete** en operaciones de la fase (BR-013); auditoría de acciones sensibles presente (ADR-010).
- [ ] **Estado de la rama**: la fase se integró a `main` vía PR revisado (STANDARDS §7/§8); build y tests verdes en CI (devops/CI-CD.md).
- [ ] **Accesibilidad básica** en las pantallas nuevas de la fase: navegación por teclado, focus visible, labels/ARIA en controles críticos, contraste AA (MASTER-SPEC §12).

## 5. DoD de release (nivel: entrega a producción)

> Referenciado desde `ROADMAP.md` (PHASE 12 y 13: «criterios de aceptación de release (DEFINITION-OF-DONE §5)»).

Un release (v1.0.0 y sucesivos) está terminado cuando:

- [ ] **QA completo**: suite E2E verde en CI; reporte de accesibilidad sin bloqueantes; pruebas de performance/API/seguridad sin hallazgos bloqueantes (PHASE 12 DoF).
- [ ] **Seguridad**: security review realizado (STANDARDS §9) sin hallazgos bloqueantes; secretos gestionados en secret manager, no en repo.
- [ ] **Infraestructura**: despliegue reproducible a staging/production desde CI (P13-T1); health checks funcionando; rollback probado.
- [ ] **Observabilidad**: logs correlacionados por `requestId`, métricas básicas y alertas de disponibilidad activas (MASTER-SPEC §14, devops/MONITORING.md).
- [ ] **Backups/DR**: backup restaurado y probado en staging; runbook de recuperación ejecutable (P13-T3; OQ-016 resuelta: RPO ≤ 15 min · RTO ≤ 4 h / restauración ≤ 24 h — AC a validar en FASE 1).
- [ ] **Versionado**: tag SemVer creado (`v1.0.0`), changelog actualizado (STANDARDS §6), release notes publicadas.
- [ ] **BR críticas validadas en producción-like**: BR-009 (backend autoriza), BR-013 (sin hard delete), BR-016 (transiciones en backend), BR-011/012 (matriz de roles) verificadas con pruebas de humo en staging.
- [ ] **Documentación de operación**: runbooks de deploy, backup/restore y on-call en `devops/`; env vars documentadas en `devops/ENVIRONMENTS.md`.
- [ ] **Cero bloqueos OQ sin mitigación** sobre las funcionalidades del release (RMP-005).
- [ ] **Regla dura**: PHASE 13 solo inicia con PHASE 12 cerrada (ROADMAP W-6).

## 6. DoD de funcionalidad (nivel: feature del backlog — MASTER-SPEC §20 ampliado)

> Central del MASTER-SPEC §20: «una funcionalidad no está terminada si le falta…». Aplica a cada FEATURE de `PRODUCT-BACKLOG.md`/`PRD.md` y a cada capacidad del dominio (§1.4).

### 6.1 Código y calidad
- [ ] **Tests**: unit + integration (y API cuando aplica) de la funcionalidad; casos borde (duplicados, inexistentes, vacíos, límites) cubiertos; sin tests `skip`/`only` en CI.
- [ ] **Estándares**: TypeScript strict, ESLint y Prettier verdes (STANDARDS §4); sin `any` injustificado; sin console.log en producción (logs estructurados).
- [ ] **DoD de tarea**: todas sus Tasks cumplen §7.

### 6.2 Reglas y validaciones
- [ ] **Validaciones** de negocio (BR involucradas) implementadas en backend; mensajes de error accionables y tipados (envelope de error §10 del MASTER-SPEC).
- [ ] **Manejo de errores**: errores esperados (404/400/401/403/409/422) y no esperados (500) responden con envelope consistente y `requestId`; el frontend los presenta sin crashear.
- [ ] **Permisos RBAC**: autorización siempre en backend (BR-009); matrices por rol de MASTER-SPEC §8 aplicadas; el frontend solo refleja UX tras validación backend.
- [ ] **Transiciones de estado** validadas por la máquina de estados en backend (BR-016); observación obligatoria en movimientos/cambios de estado (BR-006/007).

### 6.3 UX/responsive/accesibilidad
- [ ] **Loading states**: todo estado asíncrono tiene loading (skeleton/spinner) y bloqueo de doble submit.
- [ ] **Empty states**: listados vacíos, búsquedas sin resultados y paneles sin datos tienen estado explícito con acción sugerida.
- [ ] **Responsive**: correcto en desktop (objetivo principal), notebook, tablet y móvil; el mapa en móvil usa drawer/panel inferior sin clonar desktop (MASTER-SPEC §12).
- [ ] **Accesibilidad básica**: operación completa por teclado, focus visible, contraste AA, labels/ARIA en controles, diálogos con manejo de foco correcto; el mapa tiene alternativa accesible (listado).
- [ ] **UI en es-AR** inicial; sin textos hardcodeados inconsistentes con i18n (OQ-012 resuelta: es-AR fijo v1).

### 6.4 Datos, traza y operación
- [ ] **Logs** donde corresponda: acciones sensibles auditadas (AuditLog, ADR-010); errores logueados con contexto; sin datos sensibles innecesarios (BR-017).
- [ ] **Trazabilidad**: todo cambio de ubicación/estado generó historial reconstruible (BR-008).
- [ ] **Sin hard delete** (BR-013); soft delete + auditoría.
- [ ] **Performance** básica: sin degradación perceptible en los volúmenes del predio; listados paginados (límites §10 del MASTER-SPEC).

### 6.5 Documentación
- [ ] Contratos API/DTOs actualizados en `docs/backend/`; componentes y flujos actualizados en `docs/frontend/` y `docs/ux/`; si aplica, casos de QA actualizados en `docs/qa/`.

### 6.6 Cierre
- [ ] **Criterios de aceptación cumplidos**: los de la FEATURE/US (backlog) y los de las Tasks (IMPLEMENTATION-PLAN §6 campo 9), verificados por el revisor, no solo por quien implementó.
- [ ] Cero DECISIONES PENDIENTE abiertas sobre la funcionalidad sin registro en OPEN-QUESTIONS.

## 7. DoD de tarea (nivel: Task de agente — IMPLEMENTATION-PLAN)

> Referenciado desde `IMPLEMENTATION-PLAN.md` (§6 campo 10, §8 ciclo de vida) y `PHASES.md` (criterios por hito).

Una Task `P<N>-T<k>` está terminada cuando:

- [ ] **Acceptance Criteria** de la Task (campo 9) cumplidos y verificables con evidencia (salida de tests, capturas, logs).
- [ ] **Validación local + CI**: lint, tests (unit/integration/API de la Task) y build verdes; typecheck sin errores (campo 8).
- [ ] **Scope respetado**: solo los archivos de `Files` (campo 5) fueron tocados; sin refactors de paso.
- [ ] **Tests incluidos** en la misma entrega (IMPLEMENTATION-PLAN §7.1); casos de rechazo/error de la regla cubiertos.
- [ ] **Manejo de errores y permisos** de su alcance cumplen §6.2 (sin esperar a la funcionalidad completa).
- [ ] **Logs/auditoría** de lo que la Task toque (si es una acción sensible).
- [ ] **Sin OQ nueva abierta sin reporte**: si apareció una ambigüedad, la Task se pausó y reportó (IMPLEMENTATION-PLAN §6 regla de cierre).
- [ ] **Commit**: conventional commit de una sola unidad (STANDARDS §5); sin atribución IA (STANDARDS §5.3); sin cambios fuera del scope de la Task en el mismo commit.
- [ ] **DoD de documentación** solo si la Task produjo o modificó documentos (contratos, módulos, componentes).

## 8. Checklist de revisión (uso del orquestador/revisor)

Al revisar el cierre de cualquier nivel, el revisor usa:

| Nivel | Pregunta de gate |
| --- | --- |
| Documento | ¿Estructura completa, sin placeholders, referencias válidas, pendientes reportados? (§3) |
| Tarea | ¿Acceptance Criteria + CI + scope + DoD §7? |
| Funcionalidad | ¿Checklist §6 completo: tests, validaciones, errores, permisos, loading/empty, responsive, a11y, logs, criterios? |
| Fase | ¿DoF + funcionalidades + tareas + documentación + OQ gestionadas? (§4) |
| Release | ¿QA + seguridad + infra + backups + versionado + operación? (§5) |

Si el revisor responde «no» a cualquier check, el ítem vuelve a su estado anterior con el motivo explícito (máximo 2 devoluciones por ítem antes de escalar al orquestador, IMPLEMENTATION-PLAN §8).

## 9. Criterios de aceptación de este documento

- [ ] Los cuatro niveles (documentación/funcionalidad/fase/release) + tarea están definidos y son acumulativos.
- [ ] Coherente con MASTER-SPEC §20 y con las referencias de ROADMAP (§3/§4/§5) y PHASES.
- [ ] Cada checklist es verificable por un revisor sin interpretación subjetiva («bien hecho» no es un check).
- [ ] No se inventaron reglas: toda ambigüedad está en DECISIÓN PENDIENTE (§10).

## 10. Archivos involucrados

| Archivo | Rol |
| --- | --- |
| `docs/DEFINITION-OF-DONE.md` (este) | Checklists DoD por nivel |
| `docs/MASTER-SPEC.md` §20, §14, §8, §10, §12, §16, §17 | Fuente de los requisitos que el DoD verifica |
| `docs/roadmap/ROADMAP.md` §4/§5/§7 | DoF por fase y referencias a §3/§4/§5 de este documento |
| `docs/roadmap/PHASES.md` | Criterios de aceptación por hito (entrada de §7) |
| `docs/roadmap/IMPLEMENTATION-PLAN.md` | Ciclo de vida de Tasks (usa §7 y §8) |
| `docs/STANDARDS.md` | Estándares que los checklists de código referencian (§4–§9) |
| `docs/qa/QA-STRATEGY.md` · `docs/qa/TEST-PLAN.md` | Cómo se verifica lo que el DoD exige |
| `docs/devops/CI-CD.md` · `docs/devops/ENVIRONMENTS.md` | Evidencia de CI y despliegues (§4/§5) |

## 11. Riesgos

| # | Riesgo | Impacto | Mitigación |
| --- | --- | --- | --- |
| DOD-R1 | DoD visto como burocracia → cierre «de palabra» | Defectos en producción | Checklist corto y verificable (§8 gate) + CI como evidencia objetiva |
| DOD-R2 | Checklist de §6 demasiado amplio para features chicas | Fricción en tareas | §7 (tarea) es la unidad de cierre; §6 se aplica consolidando features |
| DOD-R3 | Referencias rotas si se renumera este documento | ROADMAP/PHASES dejan de apuntar bien | Numeración estable declarada en el encabezado + revisión cruzada |
| DOD-R4 | Accesibilidad «básica» interpretada de forma laxa | Bloqueo en PHASE 12 | QA audita a11y desde PHASE 6 (RSK-006 de ROADMAP); §12 de MASTER-SPEC fija el objetivo |
| DOD-R5 | E2E de casos críticos recién en PHASE 12 | Errores tempranos se propagan | Oleadas de QA (W-6): QA de fases 2..6 durante 7..11 |

## 12. DECISIÓN PENDIENTE

| ID | Pregunta | Impacto | Relación |
| --- | --- | --- | --- |
| DOD-D1 | ¿El DoD de funcionalidad (§6) se aplica por FEATURE del backlog (que puede abarcar varias fases) o por capacidad del dominio (§1.4)? El backlog W1 ya definió el set FEATURE-001…027 (PB-D1), pendiente de alinear con `PHASES.md` (IMP-D1/PBQ-01) | Alcance de revisión por funcionalidad | MASTER-SPEC §19/§20 · IMP-D1 · PB-D1 |
| DOD-D2 | ¿Se incluye en el DoD de release un criterio de cobertura de código mínima (p. ej. ≥ 80 % backend) o se deja como meta de QA sin umbral duro? | Gate de PHASE 13 | PHS-D5 · 🔶 residual local (sin OQ) |
| DOD-D3 | ¿El DoD de fase exige demo al PO (criterio humano) además de los checks objetivos, o el PO solo firma en hitos de fase 3/5/6 (mayores)? | Ritual de cierre de fases | MASTER-SPEC §21 (rol PO) · TEAM-ROLES.md |
| DOD-D4 | Para tareas con migraciones de datos (Prisma en fases 3/4), ¿el rollback de la migración es parte del DoD de tarea (añadir a §7) o solo de fase/release? | Seguridad de los cambi os de esquema | IMP-D3 |