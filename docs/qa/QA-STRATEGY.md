# CargoOps — Estrategia de Calidad (QA-STRATEGY)

> Grupo W8 (QA) · FASE 0 — solo documentación · Fuente canónica: `docs/MASTER-SPEC.md`
> Estado: borrador v0.2 · Fecha: 2026-09-23 (ampliación §§62-70: distribución M:N Cargo↔Location, BR-032..BR-040) · Autor: Grupo QA (QA lead)
> Documentos hermanos del grupo: `TEST-PLAN.md` · `TEST-CASES.md` · `E2E-SCENARIOS.md` · `ACCEPTANCE-CRITERIA.md`

---

## Objetivo

Definir la estrategia integral de aseguramiento de calidad (QA) de CargoOps: pirámide de testing, niveles y tipos de prueba (unit, integration, API, E2E, security, accessibility, performance), herramientas sugeridas con sus tradeoffs, cobertura objetivo, ambientes de prueba, datos de prueba (basados en los seeds del MASTER-SPEC §5), gestión de defectos y escalas de severidad/prioridad. Este documento es la guía rectora del resto de los artefactos QA del grupo W8.

## Contexto

CargoOps es una plataforma web profesional de gestión operativa de cargas y depósitos dentro de un predio logístico/aduanero (MASTER-SPEC §1.1). El producto opera sobre un dominio con reglas críticas de trazabilidad: observaciones obligatorias en todo movimiento (BR-006/BR-007), capacidad de ubicaciones (BR-005), máquina de estados validada en backend (BR-016), RBAC de 3 roles (BR-009/BR-010/BR-011/BR-012), soft delete + auditoría (BR-013) y alertas de rezago por permanencia > 30 días con decisión humana (BR-014/BR-015). El MASTER-SPEC 0.2 incorpora el régimen M:N de distribución (secciones 62-70, BR-032..BR-040): `CargoLocation` como relación Cargo↔Location, capacidad por unidad, movimientos parciales y descarga parcial; esto amplía las invariantes de datos y los asserts del QA.

MASTER-SPEC §14 establece que la estrategia QA cubre: **unit + integration + E2E + API + security + accessibility + performance**, con ambientes development / staging / production e integración CI/CD (lint, test, build, security scan, deploy). Los casos críticos a cubrir obligatoriamente son: crear carga; mover carga; movimiento sin observación (falla); exceder capacidad (falla); permisos; reversión; alerta 30 días; PDF; edición de plano. Todos están mapeados en `TEST-CASES.md`.

## Restricciones

- **FASE 0**: únicamente documentación. Ningún archivo de pruebas de producción (`.spec.ts`, `.e2e.ts`, configs de CI) se escribe en esta fase.
- No redefinir decisiones canónicas del MASTER-SPEC (BR, enums, roles, estados, seeds §5, API §10, stack §11).
- No inventar reglas de negocio: toda ambigüedad real se documenta como `DECISIÓN PENDIENTE` (sección al final) y se reporta al orquestador para su centralización en `docs/OPEN-QUESTIONS.md`.
- Idioma del contenido: español profesional/neutral. Filenames e IDs técnicos en inglés.
- La UI objetivo debe cumplir WCAG 2.2 AA (MASTER-SPEC §12); los movimientos críticos no son offline sin estrategia transaccional explícita.

## Dependencias

| Dependencia | Motivo |
| --- | --- |
| `docs/MASTER-SPEC.md` | Fuente canónica: BR-001..020, seeds §5, RBAC §8, estados §7, API §10, roadmap §18 |
| `docs/OPEN-QUESTIONS.md` | OQ-005 (PDF), OQ-007 (Redis/BullMQ), OQ-008 (alerta días), OQ-009 (capacidad), OQ-011 (notificaciones), OQ-015 (editor de planos) y OQ-041..045 (distribución: unidad por defecto, camión como Location, rol de sobreocupación, conversión, percentage) — **todas resueltas 2026-09-23/24** (ver resoluciones en `DECISIONES PENDIENTES` §final) |
| `docs/product/USER-STORIES.md` (W1, ⏳) | Vínculo de casos y criterios de aceptación a US-XXX |
| `docs/backend/API.md` · `ERROR-HANDLING.md` (W5, ⏳) | Contratos REST y códigos HTTP exactos para asserts de API |
| `docs/architecture/SECURITY.md` · `AUTHORIZATION.md` (W2, ⏳) | Alcance de pruebas de seguridad y matriz de permisos |
| `docs/architecture/ADR/ADR-008` (auth) · `ADR-013` (PDF) | Estrategias que condicionan tests de sesión y de exportación |
| `docs/devops/CI-CD.md` · `ENVIRONMENTS.md` (W9, ⏳) | Gates de CI y características de ambientes |
| `docs/DEFINITION-OF-DONE.md` (W10, ⏳) | DoD global que este grupo refiere por funcionalidad |
| `docs/TEAM-ROLES.md` (W10, ⏳) | Definición formal del rol QA Engineer |

## Decisiones

1. **Pirámide invertida equilibrada**: mayoría de pruebas en capas bajas (unit/integration/API) por velocidad y determinismo; E2E acotado a flujos críticos de negocio (BR y trazabilidad). Proporciones objetivo en §1.
2. **Runner de unit/integration backend: Jest** (estándar del ecosistema NestJS, soporte nativo de e2e con Supertest). Frontend Angular 20+: **Vitest como opción preferida** (Vite/ESM, velocidad) con **Jest + Testing Library como respaldo** si el soporte del builder no se valida — DECISIÓN PENDIENTE (confirmación del equipo de frontend).
3. **E2E: Playwright recomendado** sobre Cypress (tradeoffs en §3.4). Los tests E2E se ejecutan sobre staging contra datos controlados.
4. **API: Supertest** sobre la aplicación NestJS levantada en modo test (sin exponer puerto en red) + pruebas de contrato con OpenAPI/Swagger como fuente.
5. **Seguridad**: tests automatizados en API (authN/authZ, validación, rate limiting) en cada fase + caja completa (SAST/DAST/OAuth flows) en PHASE 12 QA antes de producción.
6. **Datos de prueba**: se usan como base los seeds del MASTER-SPEC §5 (17 ubicaciones + cargas de ejemplo) replicados por ambiente — incluidos los segmentos de distribución M:N (`029TERRA26` 20+35 m²; Sector 4 80/100 m²; `036TERRA26` camión→60/40) —; fixture factories para datos dinámicos (fechas para la alerta de 30 días) y para segmentos `CargoLocation` con invariantes válidas (ver §6).
7. **Defectos**: gestión en issue tracker con ciclo de vida, campos obligatorios y escalas S/P definidas en §7-§8.
8. **Cobertura por regla**: toda BR de severidad CRÍTICA/ALTA — incluidas BR-032..BR-040 (ampliación 0.2) — tiene al menos un caso de prueba automatizado de capa API o inferior (mapa en `TEST-CASES.md`), más un E2E para los flujos completos (`E2E-SCENARIOS.md`).

---

## 1. Pirámide de testing

```
             /\            E2E (5%)        — flujos críticos completos, Playwright
            /  \           A11y · Perf · Security (5%) — cajas dedicadas + continuas
           /----\
          /      \         API (15%)       — Supertest sobre NestJS, contratos REST
         /--------\
        /          \       Integration (15%) — módulos con DB real (PostgreSQL test) y Redis fake/local
       /------------\
      /              \     Unit (60%)      — services, guards, validators, utils, componentes aislados
```

Principio operativo: **cada capa de la pirámide es una red de seguridad, no la única**; un defecto que solo detecta el E2E es una señal de que la capa baja correspondiente está sub-cubierta. Las reglas de negocio (BR) se prueban primero en la capa más baja posible que pueda ejercitarlas (por ejemplo, validaciones de movimiento en unit/integration del service; autorización en guards/API; flujos completos en E2E).

| Nivel | Proporción objetivo | Función principal |
| --- | --- | --- |
| Unit | 60% | Lógica pura: validadores de BR, máquina de estados, cálculos de capacidad, helpers de mapa, componentes aislados |
| Integration | 15% | Módulos con dependencias reales: repository+DB, service+repository, jobs de alertas, exportación PDF |
| API | 15% | Contratos REST, RBAC, envelopes de error, paginación, validación de DTOs |
| E2E | 5% | Flujos de valor completos (ver `E2E-SCENARIOS.md`) |
| Security / A11y / Perf | 5% | Cajas dedicadas + chequeos continuos en CI (escaneo de dependencias, axe, métricas de rendimiento) |

Límites de tiempo objetivo por suite: unit+integration < 5 min; API < 5 min; E2E < 15 min con paralelización de workers.

## 2. Niveles de prueba

### 2.1 Unit
- **Qué se prueba**: reglas de negocio puras, validaciones de DTO (BR-001..BR-008), transiciones de la máquina de estados (BR-016), cálculo de capacidad/ocupación (BR-005) y por unidad compatible (BR-033/BR-035/BR-036), invariantes de distribución (Σ distribuido ≤ total de la carga — BR-034), generación de observaciones, componentes Angular aislados (estado visible, loading, vacío), pipes/helpers (formato de códigos de carga, colores de estado).
- **Dónde**: `cargoops-backend` (specs junto al código por módulo) y `cargoops-frontend` (specs de componentes/services).
- **Regla de aceptación**: los servicios de dominio no requieren red ni DB (mocks de repositorios); las BR críticas se prueban al nivel de unidad sin depender de infraestructura.

### 2.2 Integration
- **Qué se prueba**: repositorios Prisma contra PostgreSQL de test (seed §5 aplicado — incluidas las filas `CargoLocation` de distribución), interacción service↔repository (crear carga persiste con estado REGISTERED), job de detección de permanencia > 30 días (BR-014/BR-015), servicio de exportación PDF (si la estrategia ADR-013 lo permite), transacciones (movimiento + observación + historial en la misma transacción — BR-006/BR-008), alta/egreso de segmentos `CargoLocation` con su movimiento (BR-039), movimientos parciales (BR-037) y descarga parcial con residual en camión (BR-038), alerta `CAPACITY` por ocupación agregada (BR-036/§9).
- **Dónde**: backend, módulos que tocan DB/Cache/Jobs. El contrato posterior con `devops/DOCKER.md` definirá el compose de test.
- **Regla de aceptación**: base de datos aislada por suite (transaction rollback o schema por test), sin estado compartido entre tests.

### 2.3 API (contrato REST)
- **Qué se prueba**: endpoints del MASTER-SPEC §10 con Supertest: `auth/login`, `auth/refresh`, `cargos` (CRUD + movements + export-pdf), `locations`, `maps`, `dashboard`, `alerts`, `audit` y los endpoints de distribución (`GET/POST /cargos/:id/locations`, `PATCH/DELETE /cargos/:id/locations/:cargoLocationId`, `GET /locations/:id/cargos`, `GET /locations/:id/capacity`). Envelopes `{ data }` / `{ error }`, códigos HTTP, paginación `?page=&limit=`, validación de DTOs, RBAC por endpoint (BR-009/BR-010/BR-011/BR-012), idempotencia y errores de negocio (BR-004/BR-005/BR-006) más las variantes de distribución `DISTRIBUTION_EXCEEDS_TOTAL` (BR-034), `UNIT_INCOMPATIBLE` (BR-035) y `CAPACITY_EXCEEDED` (BR-036).
- **Dónde**: backend, carpetas de e2e por módulo (Jest + Supertest).
- **Regla de aceptación**: cada BR CRÍTICA/ALTA tiene un caso API con resultado esperado de éxito y de fallo. Los códigos HTTP exactos se alinean con `backend/ERROR-HANDLING.md` (W5); 401/403 son estándar y no requieren convención adicional.

### 2.4 E2E (flujos completos)
- **Qué se prueba**: escenarios de `E2E-SCENARIOS.md` sobre staging: login → crear carga → mover → observar → historial → PDF; alerta 30 días → decisión humana → Rezago; mapa (hover/click); edición de plano; reversión con auditoría; y negativos (movimiento sin observación, RBAC Viewer). También los flujos de distribución M:N (ESC-008..ESC-011): distribución en 2 sectores + movimiento parcial, descarga parcial con camión, sobreocupación con flag y alerta de capacidad.
- **Dónde**: `cargoops-e2e` (suite dedicada o directorio en frontend), navegador real (Chromium), API real de staging con datos controlados.
- **Regla de aceptación**: los E2E se ejecutan contra datos **descartables** (reset de DB de staging antes de la corrida); nunca contra producción. Los asserts validan estado del DOM, llamadas API y persistencia (recarga de página incluida).

### 2.5 Security
- **Qué se prueba**: autenticación (JWT + refresh, expiración — BR-016/autorización), autorización RBAC en backend (BR-009), inyección SQL/NoSQL en filtros, XSS en observaciones y nombres, rate limiting en login, headers de seguridad (CSP, CORS), brute force sobre credenciales, escaneo de dependencias vulnerables (SAST/SCA) y revisión de secrets.
- **Dónde**: casos API automatizados + caja dedicada en PHASE 12 (herramienta SAST/DAST — DECISIÓN PENDIENTE), integrada al CI según `devops/CI-CD.md`.
- **Regla de aceptación**: ningún hallazgo de severidad S1/S2 abierto al momento de release (escala en §8); BR-009 verificado con prueba que demuestre que el frontend nunca es la única capa de autorización.

### 2.6 Accessibility (a11y)
- **Qué se prueba**: WCAG 2.2 AA (MASTER-SPEC §12): navegación por teclado, foco visible y orden de foco, contraste AA, labels y ARIA, screen readers (lectura de tablas, diálogos de observación), y **mapa con alternativa accesible** (listado de ubicaciones/cargas paralelo).
- **Herramientas**: axe-core (integración en E2E de Playwright), análisis manual con lector de pantalla (NVDA/VoiceOver) en caja dedicada.
- **Dónde**: frontend, sobre componentes canónicos (CargoTable, ObservationDialog, OperationalMap, confirm dialogs — MASTER-SPEC §11.4).
- **Regla de aceptación**: zero violations de axe en flujos críticos; todo diálogo operativo operable por teclado y anunciado por ARIA.

### 2.7 Performance
- **Qué se prueba**: latencia API de listados paginados (p95 < 300 ms contra staging razonable), render del mapa SVG con 17 ubicaciones (fps y tiempo de interacción), LCP < 2.5 s en equipos de referencia desktop (operación es desktop-first, §12), memoria estable en sesiones largas, comportamiento con concurrencia en dashboard/alerts.
- **Herramientas**: Playwright (tracing + tiempos), Lighthouse CI (frontend), k6 o Artillery (carga API) — elección DECISIÓN PENDIENTE.
- **Dónde**: staging y CI (smoke de performance), caja completa en PHASE 12.
- **Regla de aceptación**: métricas objetivo en §4; cualquier regresión > 15% en p95/LCP bloquea el merge.

## 3. Herramientas sugeridas y tradeoffs

### 3.1 Unit/Integration backend (NestJS)
- **Jest** (recomendado): integración nativa con `@nestjs/testing`, mocks declarativos, cobertura integrada. Sin tradeoffs relevantes para monorepo de módulos NestJS.
- Vitest descartado para backend: soporte menos maduro del `Test` module de NestJS; sin beneficio sobre Jest en Node + TypeScript.

### 3.2 Unit frontend (Angular 20+)
- **Vitest** (opción preferida): corre sobre Vite/ESM, muy rápido; el proyecto Angular 20+ ya opera con el toolchain Vite; ecosistema creciente (Testing Library compatible). Riesgo: soporte de builders de Angular en evolución — requiere spike de validación.
- **Jest + Testing Library** (respaldo): madurez máxima en Angular (jest-preset-angular), comunidad amplia; más lento en watch y con configuración ESM más trabajosa.
- Decisión final: `DECISIÓN PENDIENTE` — afecta fases de test y config CI, no a los casos de prueba (los casos son agnósticos del runner).

### 3.3 API (Supertest)
- **Supertest** sobre la app NestJS en modo e2e (in-memory, puerto efímero), con PostgreSQL de test y Redis local/embedded. Validación de contratos contra OpenAPI/Swagger (generado por NestJS) como fuente de verdad: se agrega un test que verifica que DTOs y respuestas cumplen el schema publicado.

### 3.4 E2E: Playwright vs Cypress

| Criterio | Playwright | Cypress |
| --- | --- | --- |
| Navegadores | Chromium, Firefox, WebKit (multi-engine) | Chromium y derivados (WebKit experimental) |
| Paralelismo | Nativo por workers, sin costo extra | Requiere plan pro/CI para paralelizar |
| Auto-wait / retries | Integrado, robusto | Integrado |
| Emulación (tablet/móvil, geolocalización) | Nativa (viewport, touch, redes) | Parcial |
| Tracing / vídeo / network mocking | Trace viewer, route interception avanzada | Screenshots/video limitados, stubbing HTTP |
| Comunidad / madurez | Alta, crecimiento rápido | Muy alta, mayor tiempo en mercado |
| Ejecución en CI | Workers en GitHub Actions sin plugins | Requiere el runner de Cypress / plan pago |
| DX para testing de mapas SVG (hover/click) | Precisa (coordenadas, locators robustos) | Correcta pero con menos control de precisión |

**Recomendación: Playwright** por paralelismo nativo (crítico para el límite de 15 min de suite), cobertura multi-engine (WebKit valida el objetivo mobile del §12) y trazabilidad de fallas (trace viewer) para el diagnóstico en CI. Se justifica si el equipo ya posee licencia/experiencia Cypress: evaluar antes de fijar. DECISIÓN PENDIENTE operativa.

### 3.5 A11y / Perf / Security
- A11y: **axe-core** (Playwright integration) + auditoría manual con screen reader.
- Perf: **Playwright tracing + Lighthouse CI**; carga API con **k6** (DECISIÓN PENDIENTE herramienta, k6 sugerida por coste cero y scripting TypeScript).
- Security: **eslint-plugin-security + npm audit + Snyk/GitHub Dependabot** (SCA continuo); **OWASP ZAP** para la caja DAST en PHASE 12 (DECISIÓN PENDIENTE si hay preferencia corporativa).

## 4. Cobertura objetivo

| Métrica | Objetivo | Alcance |
| --- | --- | --- |
| Statement coverage (unit) | ≥ 80% | Backend y frontend (global) |
| Branch coverage (unit) | ≥ 70% | Ídem |
| Cobertura módulos críticos | ≥ 90% | auth, rbac, movements, alerts, cargo (validación BR) |
| BR cubiertas por caso API | 100% | Todas las BR-001..BR-040 (ampliación 0.2) al menos una vez (éxito o fallo) |
| E2E flujos críticos | 100% de los definidos | `E2E-SCENARIOS.md` antes de cada release |
| a11y (axe) | 0 violations críticas | Flujos P0/P1 |
| API p95 (staging) | < 300 ms | Listados paginados, dashboard |
| LCP (desktop referencia) | < 2.5 s | Página principal de operación |

Regla: la cobertura es un **mínimo**, no una meta; las BR CRÍTICAS requieren su caso explícito aunque el porcentaje global no lo demande.

## 5. Ambientes de prueba

| Ambiente | Propósito QA | Datos | Herramientas | Notas |
| --- | --- | --- | --- | --- |
| Development | Desarrollo local; unit/integration; primer smoke manual | Seeds §5 + fixtures locales | Jest, Vitest, Supertest local | Docker compose local (PostgreSQL test, Redis) |
| Staging | API/E2E/security/a11y/perf; aceptación de releases; UAT | Espejo de prod **anonimizado** + seeds §5 versionados | Playwright, axe, Lighthouse, k6, ZAP | Único ambiente permitido para E2E destructivos; reset determinista entre corridas |
| Production | Smoke mínimos post-deploy; monitoreo sintético | Datos reales (jamás seeds de prueba) | Playwright (smoke), monitoreo | No ejecutar E2E completos; solo verificación de salud y flujos de solo lectura |

Detalle operativo de cada ambiente en `devops/ENVIRONMENTS.md` (W9, ⏳). El reset de staging entre corridas E2E es un **criterio de entrada obligatorio** de la suite.

## 6. Datos de prueba y seeds (§5)

Base canónica: los seeds del MASTER-SPEC §5 (17 ubicaciones + cargas de ejemplo). Se replican idénticos en development y staging para que los casos de prueba sean deterministas.

| Ubicación | Cargas seed | Uso en pruebas |
| --- | --- | --- |
| Sector 1 | 433MANCH26 | Búsqueda por código, detalle |
| Sector 3 | 052TERRA26, 037TERRA26 | Movimientos entre sectores |
| Sector 4 | 029TERRA26 (35 m²), 032TERRA26 (25 m²), 050TERRA26 (20 m²) — segmentos de distribución §5 | Ocupación agregada 80/100 m², sobreocupación, consultas de capacidad (BR-033/BR-035/BR-036) |
| Sector 5 | 050TERRA26, 054TERRA26 (050TERRA26 también tiene segmento en Sector 4 según §5) | Capacidad (completar hasta el tope), destino de movimientos parciales |
| Sector 8 | JV028/2026CH | Códigos con formato heterogéneo (BR-002) |
| Sector 10 | JV028/2026, TTOR111/26 | Búsqueda/filtros, códigos sin sufijo |
| Sector 12 | 005/2026SFCH | Código numérico inicial |
| Plazoleta | 036TERRA26 | Ingreso vía camión, estado IN_TRUCK |
| Rezago | CHAR227.287, 203/2017CL-LA, ARG-109 | Flujo de alerta 30 días → Rezago |
| Scanner / Balanza | (vacías) | Movimientos TO_SCANNER / TO_BALANZA |
| Secuestro | (vacía) | Movimientos TO_SECUESTRO (solo Admin/roles autorizados) |

**Datos de distribución (secciones 62-70 — BR-032..BR-040)**: la ampliación §5 agrega filas `CargoLocation` de distribución:

| Segmento seed | Datos | Uso en pruebas |
| --- | --- | --- |
| 029TERRA26 → Sector 3 | 20 m² (ACTIVE) | Distribución M:N: carga en N ubicaciones (BR-032/040) |
| 029TERRA26 → Sector 4 | 35 m² (ACTIVE) | Suma distribuida = total 55 m² (BR-034) |
| 032TERRA26 → Sector 4 | 25 m² (ACTIVE) | Ocupación agregada (BR-033) |
| 050TERRA26 → Sector 4 | 20 m² (ACTIVE) | Σ Sector 4 = 80/100 m² (BR-033/BR-036) |
| 036TERRA26 (camión ABC123, Plazoleta) | 100% → 60% Sector 4 + 40% Sector 5 | Descarga parcial y residual en camión (BR-038) |
| Movimiento parcial 029TERRA26 | Sector 3 50 m² + Sector 4 30 m² → MOVE 20 m² a Sector 5 → 30/30/20 | Movimientos parciales (BR-037) |

**Generación sintética coherente**: los factories de segmentos `CargoLocation` validan las invariantes antes de persistir — (1) Σ quantities ≤ `totalQuantity` de la carga (BR-034); (2) Σ por ubicación ≤ capacidad (BR-036) salvo flag de sobreocupación — rol **solo ADMIN**, límite default **+10%**, observación obligatoria (OQ-043 → BR-036 ampliada; DP-QA-23 cerrada); (3) `quantityUnit` compatible con el `capacityUnit` de la ubicación, sin conversión (BR-035 / OQ-044 → BR-048; DP-QA-24 cerrada); (4) una sola fila ACTIVE por (cargo, ubicación) (MASTER-SPEC §4.2); (5) `percentage` **derivado de UI** (OQ-045 → BR-049; DP-QA-21 cerrada). Los casos negativos (TC-065/TC-066/TC-067) rompen la invariante de forma **explícita y documentada** en el fixture (override marcado como "inválido a propósito"), nunca con data incoherente silenciosa.

Estrategia de datos de prueba:
- **Fixtures estáticos**: los seeds §5 (17 ubicaciones + cargas + segmentos de distribución M:N), congelados por versión (cada release regenera el fixture si el dominio cambia; el fixture v0.2 incorpora las filas `CargoLocation` de la subsección anterior).
- **Factories**: generadores de cargas/observaciones/usuario por rol (viewer.test, operator.test, admin.test).
- **Datos dinámicos**: para la alerta STALE_30D se crean cargas con `entryDate = hoy − 31 días` y `hoy − 29 días` (limítrofe no-disparador) — OQ-008 resuelta (2026-09-23: días **corridos**, base `entryDate`); fixtures definitivos.
- **Aislamiento**: cada suite corre contra DB desechable; los E2E de staging resetean la DB antes de la corrida completa.
- **Nunca** usar datos reales de producción en pruebas (privacidad BR-017); staging trabaja con datos anonimizados.

## 7. Gestión de defectos

Ciclo de vida por defecto (issue tracker):
`New → Triaged → Assigned → In Progress → Fixed → Verified → Closed` con transiciones `Reopened` (verificación fallida) y `Won't Fix / Deferred` (requieren aprobación de PO/Admin).

Campos obligatorios del reporte de defecto: título descriptivo (módulo + acción), ambiente, severidad, prioridad, pasos de reproducción, resultado esperado vs actual, evidencia (screenshot/trace/vídeo preferido de Playwright), vínculo a TC del `TEST-CASES.md` que lo disparó, y versión/build afectada.

Acuerdos:
- **Triaje en 1 día hábil** por parte del QA lead en conjunto con el dev asignado.
- Todo defecto S1/S2 se reporta de inmediato (same-day) al orquestador y bloquea el cierre de la fase afectada si no tiene plan de mitigación.
- Los defectos de BR (reglas canónicas) que revelen una ambigüedad de especificación se convierten en `DECISIÓN PENDIENTE` antes que en parche de código.

## 8. Severidad y prioridad

**Severidad (impacto técnico/funcional del defecto):**

| Nivel | Definición | Ejemplo CargoOps |
| --- | --- | --- |
| S1 — Blocker | Pérdida/alteración de datos, brecha de seguridad, bloqueo total del flujo | Movimiento sin observación aceptado (BR-006), bypass de RBAC (BR-009), alerta 30d no generada (BR-014) |
| S2 — Major | Funcionalidad principal degradada con workaround parcial o nulo | PDF con datos incorrectos (BR-018), mapa sin resaltar ubicación, historial incompleto (BR-008) |
| S3 — Minor | Funcionalidad con workaround aceptable, impacto periférico | Orden de columnas en tabla, copy confuso, filtro con defecto menor |
| S4 — Trivial | Cosmético, sin impacto funcional | Contraste leve fuera de spec, iconografía inconsistente |

**Prioridad (urgencia de resolución según negocio):**

| Nivel | Definición | Ventana |
| --- | --- | --- |
| P0 | Bloquea release/operación; corrige de inmediato | Mismo día / bloquea merge |
| P1 | Alta: debe resolverse en la iteración actual | Durante el sprint |
| P2 | Normal: se planifica en iteración próxima | Próximo sprint |
| P3 | Baja: backlog, se agenda cuando el equipo lo permita | Sin fecha |

Regla de combinación: la severidad la fija el QA (técnica); la prioridad la confirma el PO (negocio). Matriz guía: S1→P0, S2→P1 (salvo excepción del PO), S3→P2/P3, S4→P3. La prioridad P0/P1/P2 usada en los casos de prueba de `TEST-CASES.md` es **independiente** de esta escala de defectos: allí indica la criticidad del caso para la cobertura obligatoria de BR.

## 9. Integración con CI/CD

Gates por etapa (detalle en `devops/CI-CD.md`, W9):
1. **Commit/PR**: lint (ESLint/Prettier), unit+integration (Jest/Vitest), coverage mínimo §4.
2. **Merge a main**: build + API tests + security scan (SCA) + smoke a11y.
3. **Release a staging**: E2E completo (Playwright) + performance snapshot (Lighthouse/k6) + DAST básico.
4. **Release a producción**: smoke mínimos post-deploy + monitoreo sintético.
5. **Política de ramas**: trunk-based + feature branches (MASTER-SPEC §15); ningún merge con suite roja o coverage por debajo del mínimo.

## 10. Roles y responsabilidades QA

| Rol | Responsabilidad en QA |
| --- | --- |
| QA Engineer (owner) | Definir/dirigir la estrategia, escribir casos E2E/API críticos, triaje y verificación de defectos, reporte de calidad por fase |
| Backend Dev | Unit/integration de módulos propios, mantener factories/fixtures de backend |
| Frontend Dev | Unit de componentes, integración de axe, pruebas a11y básicas |
| DevOps Engineer | CI/CD gates, ambientes, orquestación de suites, monitoreo sintético |
| PO | Confirmar prioridades de defectos y criterios de aceptación de negocio |
| Orquestador | Recibir decisiones pendientes y riesgos QA para OPEN-QUESTIONS |

La definición formal del rol QA se completa en `docs/TEAM-ROLES.md` (W10, ⏳).

## 11. KPIs de calidad

- Cobertura por nivel (§4) con tendencia por iteración.
- Defectos abiertos S1/S2 y su edad promedio.
- Escape rate: defectos encontrados en staging/producción vs total (objetivo < 15% en estabilización).
- Tiempos de suite (unit/API/E2E) y su tendencia (alerta si E2E > 15 min).
- % de casos P0/P1 ejecutados y verdes por release (objetivo: 100% P0, ≥ 95% P1).
- Reopened rate < 10% (indica calidad de la reproducción del reporte).
- Violaciones a11y activas (objetivo 0 en flujos P0/P1).

## Criterios de aceptación (de este documento)

- Definir los 7 niveles de prueba del §14 del MASTER-SPEC con alcance, herramientas y reglas de aceptación.
- Incluir cobertura objetivo, ambientes, datos de prueba (seeds §5), gestión de defectos y escalas S/P.
- Documentar la recomendación E2E con tradeoffs explícitos (Playwright vs Cypress) y la opción Vitest para frontend.
- No redefinir BR ni inventar reglas; toda ambigüedad señalada como DECISIÓN PENDIENTE.
- Ser la base consultable por `TEST-PLAN.md`, `TEST-CASES.md`, `E2E-SCENARIOS.md` y `ACCEPTANCE-CRITERIA.md` (coherencia cruzada verificable).
- Incorporar los seeds de distribución M:N y la generación sintética coherente de segmentos (§6) alineados a BR-032..BR-040 (OQ-041..045 resueltas 2026-09-23/24; asserts concretos, sin [PENDIENTE OQ-xxx]).

## Archivos involucrados

| Archivo | Relación |
| --- | --- |
| `docs/qa/QA-STRATEGY.md` (este) | Estrategia rectora del grupo W8 |
| `docs/qa/TEST-PLAN.md` | Planificación por fases del roadmap |
| `docs/qa/TEST-CASES.md` | Matriz de casos TC-XXX (mapea BR) |
| `docs/qa/E2E-SCENARIOS.md` | Escenarios de extremo a extremo |
| `docs/qa/ACCEPTANCE-CRITERIA.md` | Criterios Given/When/Then por funcionalidad |
| `docs/MASTER-SPEC.md` · `docs/OPEN-QUESTIONS.md` | Fuente canónica y pendientes |

## Riesgos

| Riesgo | Impacto | Mitigación |
| --- | --- | --- |
| Códigos HTTP exactos aún no fijados (W5 pendiente) | Asserts de API ambiguos | 401/403 fijos; resto alineado a `backend/ERROR-HANDLING.md`; casos escritos con aserción funcional además del código |
| ~~Estrategia PDF~~ **ADR-013/OQ-005 resueltas (2026-09-24: HTML→PDF server-side)** | Tests de exportación montables | Casos a nivel funcional (formato PDF, permisos, contenido); montaje con la herramienta fijada; detalle del assert de contenido 🔶 residual local (DP-QA-11) |
| ~~Cálculo de capacidad~~ **OQ-009 → BR-041/OQ-046 resueltas** | Asserts de ocupación (BR-005) concretos | Fórmula: Σ segmentos ACTIVE en unidad efectiva; umbrales canónicos <70 / 70–90 / >90 (§13) |
| ~~Reglas de unicidad~~ **OQ-001 → BR-002 resuelta** | BR-002 con regex canónica | Regex `^[A-Z0-9][A-Z0-9./-]{2,31}$`, mayúsculas, case-insensitive (409 `CARGO_CODE_DUPLICATE`) |
| Herramientas finales (E2E/SAST/k6) no confirmadas | Config de CI diferida | Playwright y k6 recomendados con justificación; spike de validación Vitest antes de fijar |
| Datos de staging con PHI/propios del negocio | Privacidad (BR-017) | Staging 100% anonimizado; prohibición explícita de usar datos reales |
| ~~OQ-041..045~~ resueltas 2026-09-23/24 (BR-041/042/048/049, BR-036 ampliada) | Fixtures de distribución y asserts concretos | Invariantes verificadas en unidad efectiva (Σ ≤ total, Σ por ubicación, residual); fixtures sin [PENDIENTE] (DP-QA-21..25 cerradas) |
| UA no ejecuta E2E en equipos débiles | Suites lentas | Reporte de ambientes mínimos en `devops/ENVIRONMENTS.md`; paralelización Playwright |

## DECISIONES PENDIENTES

- **DP-QA-1 — Runner de unit tests frontend (Vitest vs Jest)**: recomendación Vitest para Angular 20+, con Jest como respaldo. 🔶 Residual local sin OQ (decisión del equipo frontend). ✔️ Impacto: config CI y velocidad de suite; los casos de `TEST-CASES.md` son agnósticos. Requiere spike de validación del builder.
- **DP-QA-2 — Herramienta E2E definitiva**: Playwright recomendado sobre Cypress (tabla §3.4). 🔶 Residual local sin OQ. ✔️ Impacto: infraestructura de CI e insumos de evidencia (trace). Confirmar si existe licencia/experiencia corporativa previa con Cypress.
- **DP-QA-3 — Herramientas de performance (k6 vs otra) y DAST (ZAP vs otra)**: sugeridas k6 y OWASP ZAP. 🔶 Residual local sin OQ (disponibilidad corporativa). ✔️ Impacto: solo la fase 12 QA y los snapshots de CI; no bloquea fases 1-11.
- **DP-QA-4 — Tests de PDF**: **resuelta (OQ-005 → ADR-013, 2026-09-24)**: estrategia **HTML→PDF server-side** (Chromium/Puppeteer) — tests ejecutables; resta el detalle del assert de contenido 🔶 residual local de montaje. ✔️ Impacto: PHASE 10 del `TEST-PLAN.md`.
- **DP-QA-5 — Datos de la alerta de 30 días**: **resuelta (OQ-008 → BR-014/015, 2026-09-23)**: días **corridos**, base `entryDate`; alerta a los 30 + segunda a los 40 — fixtures límite (31 vs 29) definitivos. ✔️ Impacto: casos TC-031/TC-032 y ESC-002.
- **DP-QA-21 — Semántica de `percentage` en CargoLocation**: **cerrada (OQ-045 → BR-049, 2026-09-24)**: `percentage` **derivado de UI** (`quantity/totalQuantity`), informativo; como input solo válido con unidad `PERCENT` (se persiste como `quantity` en %). ✔️ Impacto: factory de segmentos, asserts de TC-069/TC-073/TC-075, ESC-008/ESC-009 y AC-056 (concretos).
- **DP-QA-22 — Modelado del camión en la descarga parcial**: **cerrada (OQ-042 → BR-042, MASTER-SPEC v0.3)**: **residual derivado** = `totalQuantity − Σ activos`; el camión NO genera filas en `GET /cargos/:id/locations` (el camión no es Location v1). ✔️ Impacto: TC-073, ESC-009 y AC-057 (concretos).
- **DP-QA-23 — Regla administrativa de sobreocupación**: **cerrada (OQ-043 → BR-036 ampliada, 2026-09-24)**: flag `allowOverOccupation` **persistente por ubicación** (estado, no one-time), rol **solo ADMIN**, límite default **+10%**, observación obligatoria + auditoría `CAPACITY_CHANGE`. ✔️ Impacto: TC-068, ESC-010 y AC-060 (concretos).
- **DP-QA-24 — Unidad de capacidad por defecto y conversión**: **cerrada (OQ-041 → BR-041 / OQ-044 → BR-048, 2026-09-23/24)**: default por LocationType (Sector/Galpón AREA m², Plazoleta UNITS) + override por ubicación; **v1 NO convierte unidades** (m² ≠ pallets ≠ m³; rechazo `INCOMPATIBLE_UNIT` 422). ✔️ Impacto: fixtures de capacidad, TC-066/TC-076, AC-053/AC-058 (concretos).
- **DP-QA-25 — Umbral de alerta CAPACITY (§9)**: **cerrada (OQ-046 resuelta + BR-041, 2026-09-24)**: umbrales canónicos **<70 (info) / 70–90 (warn) / >90 (danger)**, danger configurable; comparación en la **unidad efectiva** del LocationType. ✔️ Impacto: TC-074, ESC-011 y AC-061 (concretos).