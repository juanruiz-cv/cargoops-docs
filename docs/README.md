# CargoOps — Documentación (FASE 0 / Documentation First)

> **Fuente de verdad canónica**: [`MASTER-SPEC.md`](MASTER-SPEC.md) — leer primero.
> **Decisiones pendientes**: [`OPEN-QUESTIONS.md`](OPEN-QUESTIONS.md) — ninguna se responde por suposición.
> Estado: **COMPLETA** (2026-09-23) · 74 documentos · FASE 0 de documentación, sin código de producción.

## Qué es CargoOps

Plataforma web profesional de **gestión operativa de cargas y depósitos** dentro de un predio logístico/aduanero: registro de cargas y camiones, ubicación física sobre un plano configurable (plazoleta, galpón, sectores 1–12, scanner, balanza, rezago, secuestro), movimientos con **observación obligatoria**, historial completo, alertas de permanencia > 30 días, dashboard operativo y exportación PDF. Diseñada para crecer (multi-depósito, móvil, QR, APIs, notificaciones) sin reescribir.

## Estructura de la documentación

```
docs/
├── README.md                  ← este archivo
├── MASTER-SPEC.md             ← fuente de verdad canónica (dominio, BR, API, RBAC, fases)
├── OPEN-QUESTIONS.md          ← decisiones pendientes + inconsistencias detectadas
├── DEFINITION-OF-DONE.md      ← DoD global (documentación / funcionalidad / fase / release)
├── TEAM-ROLES.md              ← 9 roles del equipo, entregables y dependencias
├── STANDARDS.md               ← estándares de código y colaboración
├── product/                   ← PRD, backlog, user stories, casos de uso, reglas de negocio
├── architecture/              ← arquitectura, BD, seguridad, autorización, auditoría,
│   │                             mapa, PDF, notificaciones, performance, escalabilidad
│   └── ADR/                   ← ADR-001..013 (decisiones arquitectónicas)
├── frontend/                  ← arquitectura, componentes, design system, estado,
│                                 routing, i18n, accesibilidad, SEO, PWA
├── backend/                   ← arquitectura, módulos, DTOs, API, convenciones,
│                                 errores, validación, jobs, OpenAPI/Swagger
├── ux/                        ← flujos de usuario, pantallas, UX del mapa
├── brand/                     ← manual de marca, tokens, guías UI, guías visuales del mapa
├── qa/                        ← estrategia, plan, casos de prueba, E2E, criterios de aceptación
├── devops/                    ← DevOps, CI/CD, Docker, ambientes, backup/DR, monitoreo, logs
└── roadmap/                   ← roadmap, fases, plan de implementación por tareas
```

## Cómo leer este repositorio

1. **`MASTER-SPEC.md`** — la fuente de verdad: visión, dominio canónico (entidades/enums/BR), RBAC, API, arquitectura, fases. Todo lo demás debe ser coherente con ella.
2. **`OPEN-QUESTIONS.md`** — qué se decidió con el negocio y la técnica (OQ-001…OQ-047, todas resueltas en la consolidación v0.5) y las inconsistencias documentales alineadas en v0.4 (ID-001…ID-010).
3. **`roadmap/`** — fases (PHASE 0..14) y `IMPLEMENTATION-PLAN.md`: cómo convertir cada fase en Tasks pequeñas y verificables para agentes de código.
4. Documentos por disciplina, según el rol (ver `TEAM-ROLES.md`).

## Decisiones arquitectónicas principales (resumen)

| Decisión | Elección | ADR |
| --- | --- | --- |
| Estilo de aplicación | Web (Angular 20+) + API REST (NestJS) | ADR-002/003/007 |
| Estructura de servicio | **Modular Monolith** (sin microservicios en v1) | ADR-001 |
| Base de datos / ORM | PostgreSQL 16+ / Prisma | ADR-004/005 |
| Motor del mapa | **SVG + datos estructurados** (no imagen estática) | ADR-006 |
| Autenticación | JWT + Refresh Token | ADR-008 |
| Autorización | RBAC con 3 roles (Viewer/Operator/Admin) | ADR-009 |
| Auditoría | AuditLog append-only, transacción con la operación | ADR-010 |
| Borrado | Soft delete + audit + revert (sin hard delete operacional) | ADR-011 |
| Jobs | BullMQ + Redis (jobs reales v1 — OQ-007 resuelta) | ADR-012 |
| PDF | Servicio backend HTML→PDF con Chromium/Puppeteer (OQ-005 resuelta) | ADR-013 |

## Reglas de negocio críticas (ver `product/BUSINESS-RULES.md`)

- BR-001/002: código de carga string, único (reglas exactas: OQ-001 → BR-002 resuelta: regex `^[A-Z0-9][A-Z0-9./-]{2,31}$`, mayúsculas, case-insensitive).
- BR-006/007: **todo movimiento/cambio de estado exige observación obligatoria**.
- BR-008: todo movimiento genera historial.
- BR-009: la autorización se valida SIEMPRE en backend.
- BR-014: permanencia > 30 días genera alerta; **nunca mover automáticamente a Rezago** (decisión humana).
- BR-016: las transiciones de estado se validan en backend (state machine).

## Roadmap de implementación

PHASE 0 *Documentation* ✅ → PHASE 1 Foundation → 2 Auth+RBAC → 3 Cargo Management → 4 Locations → 5 Movements → 6 Operational Map → 7 Dashboard → 8 History+Audit → 9 Alerts → 10 PDF → 11 Map Editor → 12 QA → 13 Production → 14 Mobile.
Detalle: [`roadmap/ROADMAP.md`](roadmap/ROADMAP.md) · [`roadmap/PHASES.md`](roadmap/PHASES.md) · [`roadmap/IMPLEMENTATION-PLAN.md`](roadmap/IMPLEMENTATION-PLAN.md).

## Estado de FASE 0

- ✅ 74 documentos Markdown creados y verificados (todos los grupos W1–W10 + orquestador).
- ✅ Cero archivos de código en `cargoops-docs/` (solo `.md`).
- ✅ Decisiones pendientes e inconsistencias detectadas centralizadas en `OPEN-QUESTIONS.md`.
- ✅ Inconsistencias documentales ID-001…ID-010 alineadas en v0.4 (2026-09-23).
- ✅ **v0.5 (2026-09-24): no quedan OQ abiertas.** Todas las OQ e ID figuran `✅ Resuelta` en `OPEN-QUESTIONS.md`; ninguna fase tiene tareas bloqueadas por OQ. Los marcadores 🔴/🟡/🟢 que subsisten en el corpus son **severidad de riesgo**, no bloqueo por open question (ver el bloque `Riesgo` por fase en `roadmap/ROADMAP.md`).

## Repos futuros (decisión posterior)

`cargoops-frontend` · `cargoops-backend` · `cargoops-mobile` (futuro) · `cargoops-infrastructure` · `cargoops-docs` (esta carpeta). La creación de repos git es decisión del equipo; FASE 0 vive local en `cargoops-docs/`.