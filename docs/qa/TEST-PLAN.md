# CargoOps — Plan de Pruebas (TEST-PLAN)

> Grupo W8 (QA) · FASE 0 — solo documentación · Fuente canónica: `docs/MASTER-SPEC.md`
> Estado: borrador v0.2 · Fecha: 2026-09-23 (ampliación §§62-70: distribución M:N Cargo↔Location, BR-032..BR-040) · Autor: Grupo QA (QA lead)
> Documentos hermanos: `QA-STRATEGY.md` (estrategia) · `TEST-CASES.md` (matriz) · `E2E-SCENARIOS.md` · `ACCEPTANCE-CRITERIA.md`

---

## Objetivo

Planificar la actividad de pruebas de CargoOps fase por fase, alineada al roadmap del MASTER-SPEC §18 (PHASE 1 Foundation → 14 Mobile): qué se prueba en cada fase (auth, RBAC, cargas, movimientos, mapa, dashboard, alertas, PDF, editor de planos), criterios de entrada y salida, cronograma sugerido sin fechas reales, riesgos y responsables. Este plan hace ejecutable la estrategia de `QA-STRATEGY.md` y consume la matriz de casos de `TEST-CASES.md`. La ampliación 0.2 (§§62-70: distribución M:N vía `CargoLocation`, capacidad por unidad, movimientos parciales y descarga parcial — BR-032..BR-040) se incorpora a las fases 4 (Locations), 5 (Movements) y 9 (Alerts), y entra como regresión permanente en PHASE 12.

## Contexto

CargoOps se construye por fases incrementales sobre un **Modular Monolith** NestJS + Angular 20+ + PostgreSQL/Prisma (MASTER-SPEC §11). Cada fase entrega módulos con reglas de negocio canónicas (BR-001..BR-040; la ampliación §§62-70 incorpora la distribución M:N de cargas y ubicaciones, capacidad por unidad y movimientos parciales) y permisos por rol (§8). El QA acompaña **desde la fase 1** —no solo en PHASE 12 QA— con un enfoque shift-left: cada módulo se prueba en la capa más baja posible en el momento en que se implementa, y la caja completa de calidad (security/performance/a11y integral) se ejecuta en PHASE 12 antes de producción.

El plan distingue tres paquetes de trabajo QA que conviven a lo largo del roadmap:
1. **QA continuo por fase** (unit/integration/API del módulo, casos P0/P1 del `TEST-CASES.md`).
2. **E2E incremental** (`E2E-SCENARIOS.md`) que se enriquece a medida que maduran los flujos.
3. **Cajas dedicadas** (PHASE 12 y PHASE 13): security, performance, a11y integral, regresión completa, smoke de producción.

## Restricciones

- FASE 0: solo documentación; ningún artefacto de pruebas ejecutable se produce ahora.
- No redefinir decisiones canónicas (BR, roles, estados, seeds §5, API §10, roadmap §18).
- No inventar reglas: toda ambigüedad se registra como `DECISIÓN PENDIENTE` y se reporta al orquestador.
- Cronograma expresado en **orden y ventanas relativas** (p. ej. "al cierre de la fase"), nunca con fechas calendario.
- Las pruebas de las BR se ejecutan sobre la **capa más baja que pueda ejercitarlas** (unit/integration/API antes que E2E).

## Dependencias

| Dependencia | Impacto en este plan |
| --- | --- |
| `docs/MASTER-SPEC.md` §18 (fases), §6 (BR), §8 (roles), §5 (seeds) | Estructura de fases y casos a probar |
| `docs/qa/QA-STRATEGY.md` | Herramientas, cobertura, ambientes, defectos (rectora) |
| `docs/qa/TEST-CASES.md` | Casos TC-XXX citados por fase |
| `docs/qa/E2E-SCENARIOS.md` · `ACCEPTANCE-CRITERIA.md` | Escenarios y criterios por funcionalidad |
| `docs/backend/API.md` · `ERROR-HANDLING.md` (W5, ⏳) | Contratos y códigos HTTP para asserts |
| `docs/architecture/SECURITY.md` · `AUTHORIZATION.md` (W2, ⏳) | Seguridad y matriz RBAC |
| `docs/architecture/ADR/ADR-008` (auth) · `ADR-013` (PDF) | Sesión y exportación |
| `docs/devops/CI-CD.md` · `ENVIRONMENTS.md` (W9, ⏳) | Gates de CI y ambientes |
| `docs/product/USER-STORIES.md` (W1, ⏳) | Aceptación por historia de usuario |
| OPEN-QUESTIONS OQ-004/005/008/009/015 (resueltas 2026-09-23/24 → BR-043/ADR-013/BR-014-015/BR-041/OQ-015) | Alcance de ciertas pruebas — cerrado |
| OPEN-QUESTIONS OQ-041..045 (resueltas 2026-09-23/24 → BR-041/042/048/049 y BR-036 ampliada) | Asserts de distribución M:N y movimientos parciales — cerrado |

## Decisiones

1. **Shift-left por fase**: cada fase cierra solo cuando su suite de capa baja (unit/integration/API) está verde y los casos P0/P1 del módulo están ejecutados. El E2E no es el único gate.
2. **Paquetes de trabajo QA** (continuo / E2E incremental / cajas dedicadas) definidos arriba.
3. **Matriz de casos vinculada**: cada fase referencia explícitamente los IDs TC-XXX de `TEST-CASES.md` que le corresponden.
4. **Resetting de staging** antes de cada corrida E2E completa (datos deterministas basados en seeds §5).
5. **Criterios de salida uniformes por fase** en §6, con firma de QA para avanzar de fase.
6. **Seguridad continua**: los tests RBAC/validación se ejecutan en cada fase que toca endpoints; la caja SAST/DAST completa en PHASE 12.

---

## 1. Modelo de fases y qué se prueba

Referencia: roadmap MASTER-SPEC §18. Para cada fase: objetivo de uso, casos TC vinculados y tipos de prueba.

### PHASE 1 — Foundation
- **Qué se prueba**: scaffolding, lint/format (MASTER-SPEC §15), health checks, base de CI (gates del `QA-STRATEGY.md` §9), configuración de ambientes de test, seed §5 aplicado en DB de test.
- **Casos**: TC-001 (base auth), TC-052/TC-053 (smoke a11y/perf de arranque).
- **Tipos**: unit (build infraestructura), integration (conexión DB + seed), smoke.
- **Entregable QA**: pipeline base verde, suite vacía pero configurada, coverage tooling activo.

### PHASE 2 — Authentication + RBAC
- **Qué se prueba**: login, refresh, expiración, logout (TC-001..TC-005); RBAC por rol: Viewer no crea/mueve (TC-006/TC-007), Operator sin acciones administrativas (TC-008), Admin completo (TC-009); endpoints sin token → 401 (TC-010); BR-009/BR-010/BR-011/BR-012/BR-016.
- **Casos**: TC-001..TC-010.
- **Tipos**: API (principal), security, unit (guards/state machine auth), E2E inicial (login).
- **Riesgo específico**: decisión del modelo de refresh token (ADR-008) puede diferir el test de expiración exacta.

### PHASE 3 — Cargo Management
- **Qué se prueba**: crear carga (BR-001, TC-011); código vacío/duplicado (BR-001/BR-002, TC-012/TC-013); carga con ubicación inexistente (BR-003, TC-014); listado, búsqueda, filtros, paginación y detalle (TC-015/TC-016/TC-017); estados al crear (REGISTERED).
- **Casos**: TC-011..TC-017 (+ TC-050 SQL injection en filtros).
- **Tipos**: API, integration, unit (validadores de código y DTOs), security (filtros).

### PHASE 4 — Locations
- **Qué se prueba**: CRUD/gestión de ubicaciones, estados ACTIVE/INACTIVE/MAINTENANCE, capacidad configurable (BR-005) — la verificación de movimientos a ubicaciones inactivas y sobrecapacidad se ejecuta cuando existe Movements (fase 5), pero aquí se prueban el catálogo y los seeds §5 (17 ubicaciones). **Régimen de distribución M:N (secciones 62-70)**: seeds de distribución §5 (`029TERRA26` → Sector 3 20 m² + Sector 4 35 m²; Sector 4 con 3 cargas = 80 m² ocupados / 20 libres), capacidad por unidad compatible (BR-033/BR-035) y consultas de distribución/capacidad (TC-069/TC-070/TC-076 — resuelto: respuesta en unidad canónica, OQ-041/044 → BR-041/048).
- **Casos**: TC-041 (mapa con 17 ubicaciones), TC-069, TC-070, TC-076 (resuelto — BR-041/048); TC-021/TC-022 se ejecutan aquí si el endpoint de movimientos ya existe; si no, en fase 5.
- **Tipos**: integration, API, unit (cálculo de capacidad — OQ-041 → BR-041 resuelta; invariantes de ocupación por unidad — DP-QA-24 cerrada: BR-041/048, sin conversión).
- **Riesgo específico**: ~~OQ-041/OQ-044 (unidad por defecto y conversión)~~ y ~~OQ-045 (percentage)~~ → **resueltas (BR-041/048/049)** — asserts definidos en unidad efectiva, riego cerrado.

### PHASE 5 — Movements
- **Qué se prueba — núcleo crítico**: mover carga (TC-018, BR-008); movimiento sin observación rechazado (TC-019/TC-020, BR-006); exceder capacidad rechazado (TC-021, BR-005); ubicación inactiva rechazada (TC-022, BR-004); carga inexistente (TC-023, BR-003); IN_TRANSIT transitorio (TC-024); transición de estado inválida rechazada (TC-025, BR-016). **Movimientos parciales y distribución (secciones 62-70, BR-032..BR-040)**: movimientos parciales con cantidad/porcentaje (BR-037); alta/egreso de segmentos `CargoLocation` con observación obligatoria e historial (BR-006/008/039); suma distribuida ≤ total (`DISTRIBUTION_EXCEEDS_TOTAL`, BR-034); unidades incompatibles (`UNIT_INCOMPATIBLE`, BR-035); sobreocupación sin/con flag administrativo (BR-036, TC-067/TC-068 — rol **solo ADMIN**, límite default **+10%**: OQ-043 → BR-036 ampliada resuelta); descarga parcial con residual en camión (BR-038, TC-073 — modelado del camión: **residual derivado**, OQ-042 → BR-042 resuelta).
- **Casos**: TC-018..TC-025, TC-065..TC-068, TC-071..TC-073, TC-075 (OQ-045 → BR-049 resuelta), más TC-054 (perf del listado de movimientos).
- **Tipos**: API (heavy), integration (transacción movimiento+observación+historial; segmento+movimiento), unit (state machine; invariantes de suma), E2E inicial (mover con observación; ESC-008/ESC-009/ESC-010).
- **Criterio especial**: es la fase con mayor densidad de BR CRÍTICAS; la suite API de movements es gate de cierre obligatorio. La distribución M:N agrega invariantes nuevas (Σ distribuido ≤ total; Σ por ubicación ≤ capacidad) que se prueban como asserts concretos (OQ-041..045 resueltas 2026-09-23/24 → BR-041/042/048/049 y BR-036 ampliada; DP-QA-21..25 cerradas).

### PHASE 6 — Operational Map
- **Qué se prueba**: render SVG de las 17 ubicaciones desde seeds (TC-041), hover sobre ubicación → resaltado/tooltip (TC-042), click → detalle con cargas y capacidad (TC-043), alternativa accesible al mapa (listado — TC-052).
- **Casos**: TC-041..TC-043, TC-052 (a11y mapa).
- **Tipos**: E2E (interacción real sobre SVG), a11y, perf (render 17 ubicaciones).
- **Riesgo específico**: OQ-015 resuelta (2026-09-24): el editor queda **fuera de v1** — el testing interactivo del editor no arranca en v1 (backlog QA).

### PHASE 7 — Dashboard
- **Qué se prueba**: KPIs (total cargas, por estado, ocupación por ubicación — TC-047), alertas activas visibles (TC-048), acceso con sesión (TC-049); perf p95 del endpoint (TC-054).
- **Casos**: TC-047..TC-049, TC-054.
- **Tipos**: API, E2E, perf.

### PHASE 8 — History + Audit
- **Qué se prueba**: historial reconstruible y completo (BR-008, TC-026), auditoría con previous/new values (TC-027), reversión Admin con conservación del historial original (BR-012, TC-028), soft delete + restore (BR-013, TC-029), privacidad del audit (BR-017, TC-030).
- **Casos**: TC-026..TC-030 (+ ESC-005 en E2E).
- **Tipos**: integration (transacciones), API, unit, E2E (reversión).

### PHASE 9 — Alerts
- **Qué se prueba**: generación STALE_30D con permanencia > 30 días (BR-014/BR-015, TC-031), no generación antes de 30 (TC-032), **no auto-movimiento** a Rezago (TC-033 — decisión humana, BR-014), revisión/acknowledge (TC-034), mover a Rezago con observación (TC-035), mover a Rezago sin observación rechazado (TC-036, BR-006). **Alerta de capacidad (`CAPACITY`)**: derivada de la ocupación agregada de la ubicación (Σ segmentos activos ≥ umbral configurable **danger >90%** — BR-036/§9, TC-074; OQ-046 resuelta + unidad efectiva BR-041).
- **Casos**: TC-031..TC-036, TC-074 (+ ESC-002, ESC-011).
- **Tipos**: integration (job de detección), API, E2E (flujo completo).
- **Riesgo específico**: OQ-008 resuelta (2026-09-23: días **corridos**, base `entryDate` — fixtures definitivos); OQ-007 resuelta (2026-09-24: **job real** BullMQ en v1, ADR-012 — se prueba el job); OQ-041/OQ-046 resueltas (umbral **>90%** configurable, unidad efectiva) — fixture de TC-074 cerrado (DP-QA-25 resuelta).

### PHASE 10 — PDF
- **Qué se prueba**: exportación con formato/códigos correctos (TC-037, BR-018), contenido completo sin datos no autorizados (TC-038), permisos por rol (TC-039), carga inexistente → 404 (TC-040).
- **Casos**: TC-037..TC-040 (+ ESC-001 paso final).
- **Tipos**: API, integration (servicio de generación), E2E (descarga del file).
- **Riesgo específico — DP-QA-4**: la estrategia de generación quedó fijada (OQ-005 → **ADR-013 resuelta: HTML→PDF server-side**); los casos están a nivel funcional y el montaje del test se completa con la herramienta fijada (detalle del assert de contenido 🔶 residual local).

### PHASE 11 — Map Editor
- **Qué se prueba**: edición de plano por ADMIN (mover/redimensionar ubicaciones, TC-044), persistencia vía `PATCH /api/v1/maps/:id` (TC-044), datos estructurados con coordenadas/capacidad (BR-020, TC-046), Operator rechazado (BR-011, TC-045).
- **Casos**: TC-044..TC-046 (+ ESC-004).
- **Tipos**: API, integration (persistencia + versionado de mapa), E2E.
- **Riesgo específico**: OQ-015 resuelta (2026-09-24): el editor se difiere a v2 — las pruebas del editor salen de la línea base v1 y quedan en backlog QA.

### PHASE 12 — QA (caja completa)
- **Qué se prueba**: regresión integral sobre las 17 ubicaciones y todos los BR — incluida la distribución M:N y los movimientos parciales (BR-032..BR-040) con los seeds de distribución §5; security completo (SAST/DAST, ZAP o herramienta elegida — DP-QA-3); performance con carga (k6 o similar, p95 < 300 ms); a11y integral WCAG 2.2 AA (axe + screen reader manual); prueba de que el frontend no es la única capa de autorización (BR-009, demostración con API directa).
- **Casos**: 100% de P0/P1 del `TEST-CASES.md`; 100% de `E2E-SCENARIOS.md`.
- **Tipos**: todos.
- **Criterio especial**: liberación del reporte de calidad integral (KPIs del `QA-STRATEGY.md` §11) que habilita la decisión de pasar a PHASE 13.

### PHASE 13 — Production
- **Qué se prueba**: smoke mínimos post-deploy (login, listado, health), monitoreo sintético, drill de rollback, validación de que ningún dato de prueba quedó en producción.
- **Casos**: smoke set dedicado (solo lectura), TC-001/TC-015 adaptados.
- **Tipos**: E2E smoke, operativo.
- **Restricción dura**: sin E2E destructivos en producción (QA-STRATEGY §5).

### PHASE 14 — Mobile (futuro)
- **Qué se prueba**: responsive (viewports tablet/móvil), PWA (instalación, caching), drawer del mapa en móvil (MASTER-SPEC §12), operación de solo lectura en offline parcial (los movimientos críticos NO son offline).
- **Casos**: a definir en el detalle de la fase; se reutiliza el conjunto de E2E con emulación de viewports (Playwright).

## 2. Matriz resumen fase → tipos de prueba → casos críticos

| Fase | Unit | Integration | API | E2E | Security | A11y | Perf | Casos P0 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 Foundation | ✓ | ✓ | — | smoke | — | smoke | smoke | TC-001 |
| 2 Auth + RBAC | ✓ | — | ✓✓ | ✓ (login) | ✓✓ | — | — | TC-001..TC-010 |
| 3 Cargo Mgmt | ✓✓ | ✓ | ✓✓ | — | ✓ | — | TC-053 | TC-011..TC-017 |
| 4 Locations | ✓✓ | ✓✓ | ✓ | — | — | — | — | TC-021, TC-022, TC-041, TC-069, TC-070, TC-076 |
| 5 Movements | ✓✓ | ✓✓ | ✓✓✓ | ✓ | ✓ | — | TC-054 | TC-018..TC-025, TC-065..TC-068, TC-071..TC-073, TC-075 |
| 6 Map | ✓ | — | ✓ | ✓✓ | — | ✓✓ | ✓ | TC-041..TC-043 |
| 7 Dashboard | ✓ | ✓ | ✓ | ✓ | — | — | ✓✓ | TC-047..TC-049 |
| 8 History + Audit | ✓ | ✓✓ | ✓✓ | ✓ | ✓ | — | — | TC-026..TC-030 |
| 9 Alerts | ✓✓ | ✓✓ | ✓✓ | ✓✓ | — | — | — | TC-031..TC-036, TC-074 |
| 10 PDF | ✓ | ✓✓ | ✓✓ | ✓ | ✓ | — | — | TC-037..TC-040 |
| 11 Map Editor | ✓ | ✓✓ | ✓✓ | ✓✓ | ✓ | ✓ | — | TC-044..TC-046 |
| 12 QA | ✓ | ✓ | ✓ | ✓✓✓ | ✓✓✓ | ✓✓✓ | ✓✓✓ | 100% P0/P1 |
| 13 Production | — | — | — | smoke | ✓ (scan) | — | ✓ (sintético) | smoke set |

✓ = presente · ✓✓ = foco principal · ✓✓✓ = caja integral.

## 3. Criterios generales de entrada (por fase)

- Los criterios de aceptación de las funcionalidades de la fase (de `ACCEPTANCE-CRITERIA.md`) están definidos y aprobados por el PO.
- El contrato API de los endpoints de la fase existe (OpenAPI/Swagger) — fuente de asserts.
- Seeds §5 aplicados y verificados en el ambiente de test correspondiente.
- Los casos TC de la fase están identificados y tienen precondiciones disponibles (factories/fixtures).
- Los defectos S1/S2 abiertos de fases anteriores están resueltos o tienen plan de mitigación aprobado (no arrastrar deuda S1/S2 entre fases sin aprobación del orquestador).

## 4. Criterios generales de salida (por fase)

- Suite de capa baja (unit + integration) del módulo: 100% verde, cobertura ≥ objetivo del `QA-STRATEGY.md` §4.
- Casos API P0 de la fase: 100% verdes (y P1 ≥ 95% o con defectos documentados y priorizados).
- E2E que tocan la fase (si corresponden): verdes en staging con DB reseteada.
- Sin defectos S1 abiertos; S2 con plan de corrección dentro de la iteración.
- a11y básica de los componentes nuevos (axe sin violations críticas).
- Reporte QA de la fase entregado al orquestador (pendientes, riesgos, defectos, KPIs).

## 5. Cronograma sugerido (orden y ventanas relativas, sin fechas)

| Ventana | Actividad QA |
| --- | --- |
| Inicio de cada fase (primeros 2 días hábiles) | Preparar/actualizar fixtures y factories; revisar contratos API nuevos; ajustar casos TC afectados |
| Durante la fase (continua) | Unit/integration de devs (gate de PR); API del QA conforme se estabilizan endpoints; defectos en triaje diario |
| 20% final de la fase | Cierre: corrida completa de casos P0/P1 de la fase, E2E incrementales, a11y básica, criterios de salida §4 y firma QA |
| Post-fase (superposición ≤ 1 semana) | Regresión de humo de fases anteriores (smoke regresivo) antes de abrir la siguiente |
| PHASE 12 | Bloque dedicado completo: security + perf + a11y integral + regresión total (2-3 sprints de la fase, sin superposición) |
| PHASE 13 | Ventana de release: smoke post-deploy + monitoreo sintético + drill rollback |

Regla general: **una fase no comienza la siguiente hasta firmar los criterios de salida** (decisión QA + orquestador), salvo excepción explícita y documentada.

## 6. Gestión de riesgos del plan

| Riesgo | Prob. | Impacto | Mitigación |
| --- | --- | --- | --- |
| Deuda S1/S2 arrastrada entre fases | Media | Alta | Gate de salida firme; bloqueo de fase siguiente por orquestador si hay S1 abiertos |
| Ambigüedad de BR detectada al probar (p. ej. capacidad — OQ-009 → BR-041 resuelta; aplica a residuales W1) | Media | Media | Protocolo: el defecto de proposito con ambigüedad se registra como DECISIÓN PENDIENTE antes que como fix; reporte temprano al orquestador |
| E2E sin ambiente estable de staging | Media | Alta | Reset determinista de DB; `ENVIRONMENTS.md` fija requisitos mínimos; CI corre E2E solo contra staging |
| PDF/editor — OQ-005/OQ-015 resueltas (ADR-013; editor v2) | Baja — riesgo cerrado | Montaje de PDF con la herramienta fijada (ADR-013); editor en backlog QA |
| Cambios en el modelo de capacidad (OQ-009 → BR-041 resuelta) | Baja — riesgo cerrado | Fixtures con unidad efectiva; asserts concretos en m²/UNITS |
| ~~OQ-041..045~~ resueltas 2026-09-23/24 (BR-041/042/048/049, BR-036 ampliada) | Baja — cerrado | Marcas [PENDIENTE] removidas; asserts concretos de invariantes (DP-QA-21..25 cerradas) |
| Falta de disponibilidad del QA Engineer para todas las fases | Baja | Alta | Shift-left con unit/integration en devs; QA prioriza P0/P1 y la revisión de contratos API |
| Datos del negocio filtrados a staging | Baja | Alta | Prohibición explícita; staging anonimizado (BR-017); revisión de seeds reales en PR |
| Suites E2E > 15 min | Media | Media | Paralelización Playwright por workers; particionado por flujo; alerta de duración en CI |

## 7. Responsables (rol QA y roles relacionados)

| Actividad | Responsable (R) | Aprobador (A) | Consultados (C) | Informados (I) |
| --- | --- | --- | --- | --- |
| Estrategia y plan de pruebas | QA Engineer | Orquestador | DevOps, Backend | PO |
| Unit/integration de módulos | Backend/Frontend Dev | QA Engineer | — | QA |
| Casos API críticos (BR) | QA Engineer | Orquestador | Backend | PO |
| E2E (Playwright) | QA Engineer | DevOps | Frontend | Orquestador |
| Seguridad (SAST/DAST, RBAC) | QA Engineer + DevOps | Orquestador | Arquitecto | PO |
| A11y | QA Engineer | Diseñador UX | Frontend | — |
| Performance | QA Engineer + DevOps | Orquestador | Arquitecto | — |
| Triaje y verificación de defectos | QA Engineer | PO (prioridad) | Devs | Orquestador |
| Aceptación de funcionalidades | PO | Orquestador | QA | — |
| Cierre de fase / firma | QA Engineer | Orquestador | PO | Equipo |

Definición formal del rol en `docs/TEAM-ROLES.md` (W10, ⏳).

## 8. Tipos de pruebas que se ejecutan en cada paquete

- **QA continuo**: unit (Jest/Vitest), integration (PostgreSQL test), API (Supertest), security básico (RBAC/validación) — por fase.
- **E2E incremental**: Playwright sobre staging, suite que crece con cada fase (ESC-001..ESC-011 de `E2E-SCENARIOS.md`).
- **Cajas dedicadas (PHASE 12/13)**: DAST/SAST, performance con carga, a11y integral manual + axe, regresión total, smoke de producción.

## 9. Matriz de dependencia BR-032..BR-040 (distribución M:N, secciones 62-70)

La distribución M:N (`CargoLocation`), la capacidad por unidad, los movimientos parciales y la descarga parcial agregan reglas transversales a Locations (4), Movements (5) y Alerts (9):

| BR | Regla (resumen) | Capa de prueba principal | Fases | Casos TC | OQ relacionada | Nota |
| --- | --- | --- | --- | --- | --- | --- |
| BR-032 | Carga en N ubicaciones simultáneas (M:N vía CargoLocation; no `cargo.locationId` único) | API / E2E | 4-5 | TC-069 | — | Prohíbe el modelo de location única |
| BR-033 | Ubicación con N cargas; ocupación = Σ segmentos activos en unidad compatible | integration / API | 4 | TC-070 | OQ-044 → BR-048 (resuelta) | Seeds §5: Sector 4 = 80/100 m² |
| BR-034 | Σ distribuido ≤ total de la carga | API / unit | 5 | TC-065 | OQ-045 → BR-049 (resuelta) | `DISTRIBUTION_EXCEEDS_TOTAL` |
| BR-035 | Capacidad en unidad compatible; no sumar incompatibles | unit / integration / API | 4-5 | TC-066, TC-070, TC-076 | OQ-041/044 → BR-041/048 (resueltas) | `UNIT_INCOMPATIBLE` |
| BR-036 | No superar capacidad salvo flag administrativo (+ alerta CAPACITY §9) | API / integration / E2E | 5, 9 | TC-067, TC-068, TC-074 | OQ-043 → BR-036 ampliada (resuelta) | Flag + observación + auditoría |
| BR-037 | Movimientos parciales con cantidad/porcentaje (mover ≠ 100%) | API / integration / E2E | 5 | TC-065, TC-073, TC-075 | OQ-045 → BR-049 | Derivado de UI (DP-QA-21 cerrada) |
| BR-038 | Descarga parcial; residual en camión = totalQuantity − Σ activos | integration / API / E2E | 5 | TC-073 | OQ-042/045 → BR-042/049 | Residual derivado (DP-QA-22 cerrada) |
| BR-039 | Alta/egreso de segmento genera movimiento e historial (BR-006/008) | integration / API | 5 | TC-071, TC-072 | — | Observación obligatoria |
| BR-040 | Consultas de distribución exponen segmentos y movimientos | API / E2E | 4-5 | TC-069, TC-070 | OQ-045 → BR-049 (resuelta) | Endpoints §10 |

La distribución M:N es **regresión permanente** desde PHASE 5: cualquier cambio en `CargoLocation`, movimientos parciales, capacidad por unidad o descarga parcial re-ejecuta TC-065..TC-076 y ESC-008..ESC-011 en staging; PHASE 12 los incluye en la regresión integral.

## Criterios de aceptación (de este documento)

- Cubrir todas las fases del roadmap MASTER-SPEC §18 con: qué se prueba, casos vinculados, criterios de entrada/salida.
- Incluir cronograma sin fechas reales, riesgos con mitigación y matriz de responsables (rol QA).
- Ser coherente con `QA-STRATEGY.md`, `TEST-CASES.md`, `E2E-SCENARIOS.md` y `ACCEPTANCE-CRITERIA.md`.
- No redefinir BR ni fases; pendientes señalados explícitamente.
- Incorporar la ampliación §§62-70 (BR-032..BR-040): alcance de fases 4/5/9, matriz de dependencia (§9) y regresión de PHASE 12.

## Archivos involucrados

| Archivo | Relación |
| --- | --- |
| `docs/qa/TEST-PLAN.md` (este) | Planificación por fases |
| `docs/qa/QA-STRATEGY.md` | Estrategia rectora (herramientas, cobertura, defectos) |
| `docs/qa/TEST-CASES.md` | Casos citados (TC-XXX) |
| `docs/qa/E2E-SCENARIOS.md` | Escenarios citados (ESC-XXX) |
| `docs/qa/ACCEPTANCE-CRITERIA.md` | Criterios por funcionalidad (gate de entrada de fase) |
| `docs/MASTER-SPEC.md` §18 | Roadmap de fases |
| `docs/OPEN-QUESTIONS.md` | Pendientes OQ que condicionan fases |

## Riesgos

Ver tabla §6 (es el bloque de riesgos propio de este documento, con mitigaciones accionables). Adicional: la co-dependencia con W1/W5/W9 (USER-STORIES, API/ERROR-HANDLING, CI-CD/ENVIRONMENTS) puede retrasar la definición fina de asserts; se mitiga escribiendo los casos a nivel funcional y alineando códigos HTTP solo donde son estándar (401/403).

## DECISIONES PENDIENTES

- **DP-QA-6 — Herramientas de la caja PHASE 12 (SAST/DAST y performance)**: ZAP + k6 sugeridas; confirmar disponible corporativo. 🔶 Residual local sin OQ. ✔️ Impacto: solo prepara el bloque 12; no bloquea fases 1-11.
- **DP-QA-7 — Alcance del editor de planos en v1**: **cerrada (OQ-015 resuelta, 2026-09-24)**: el editor se difiere — PHASE 11 del plan queda como backlog QA (los casos TC-044..TC-046 y ESC-004 se conservan para cuando se implemente). ✔️ Impacto: cronograma relativo de la fase 11 (diferida).
- **DP-QA-8 — Modelo de capacidad**: **cerrada (OQ-041 → BR-041, 2026-09-23)**: unidad por defecto por LocationType (Sector/Galpón AREA, Plazoleta UNITS) + override por ubicación — asserts de TC-021 concretos. ✔️ Impacto: detalles de asserts de la fase 4/5.
- **DP-QA-9 — Operación de egreso**: **cerrada (OQ-004 → BR-043, 2026-09-23)**: el egreso **existe en v1** (movimiento `EXIT` con observación obligatoria, `EXITED` terminal) — se planifican pruebas de EXIT; EXITED entra a la línea base de testing v1. ✔️ Impacto: alcance de movements/estados a probar.
- **DP-QA-10 — Job de alertas**: **cerrada (OQ-007 → ADR-012, 2026-09-24)**: jobs reales con **BullMQ en v1** — la prueba de integración del detección 30d se ejecuta con el job real. ✔️ Impacto: montaje de TC-031/TC-032.
- **DP-QA-21 — Semántica de `percentage`**: **cerrada (OQ-045 → BR-049, 2026-09-24)**: derivado de UI; input solo con unidad `PERCENT`. ✔️ Impacto: asserts de distribución en fases 4/5 (TC-069/TC-073/TC-075, ESC-008/ESC-009). Ver `QA-STRATEGY.md`.
- **DP-QA-22 — Camión como Location vs residual**: **cerrada (OQ-042 → BR-042, MASTER-SPEC v0.3)**: residual derivado — el camión NO genera filas en `GET /cargos/:id/locations`. ✔️ Impacto: TC-073/ESC-009 (fase 5).
- **DP-QA-23 — Flag de sobreocupación**: **cerrada (OQ-043 → BR-036 ampliada, 2026-09-24)**: flag persistente, rol **solo ADMIN**, límite default **+10%**, observación obligatoria. ✔️ Impacto: TC-068/ESC-010 (fase 5).
- **DP-QA-24 — Unidad de capacidad por defecto y conversión**: **cerrada (OQ-041 → BR-041 / OQ-044 → BR-048, 2026-09-23/24)**: default por LocationType + override; **sin conversión en v1**. ✔️ Impacto: fixtures de capacidad y TC-066/TC-076.
- **DP-QA-25 — Umbral de alerta CAPACITY**: **cerrada (OQ-046 resuelta + BR-041, 2026-09-24)**: umbral **danger >90%** configurable; comparación en la unidad efectiva del LocationType. ✔️ Impacto: TC-074/ESC-011 (fase 9).