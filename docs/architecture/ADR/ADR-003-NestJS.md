# ADR-003 — NestJS

- Estado: Accepted
- Fecha: 2026-09-23
- Decisores: Equipo CargoOps / Software Architect

## Contexto

El backend de CargoOps debe exponer una API REST bajo `/api/v1` (ADR-007), implementar reglas de negocio críticas (BR-001 a BR-020, máquina de estados de CargoStatus, validación de capacidad y permisos SIEMPRE en backend — BR-009), y materializar el monolito modular del ADR-001. El MASTER-SPEC fija el stack en §11.2: **NestJS, TypeScript, REST, OpenAPI/Swagger**. El tipo de trabajo es transaccional y CRUD-pesado (cargos, movimientos, ubicaciones, planos), con un mapa que depende de consultas estructuradas (ADR-006) y con un roadmap que agrega seguridad, auditoría y jobs.

## Decisión

Adoptar **NestJS** (última versión estable, v10 o superior al momento de implementar) sobre Node.js + TypeScript con `strict-mode` como framework del backend (MASTER-SPEC §11.2):

- **Platform `express`** (default) por madurez de ecosistema; NestJS permite swap a Fastify si el profiling lo justifica (Middlaware/adapters), sin cambiar la estructura de módulos.
- **Organización por módulos de dominio** (ADR-001, MASTER-SPEC §11.3): cada módulo con `controller, service, repository, DTOs, entities, guards, interceptors, validators, exceptions`.
- **OpenAPI/Swagger** generado con `@nestjs/swagger` desde los DTOs y decoradores: contrato `/api/v1` vivo, consumible por el frontend y por testing de API (MASTER-SPEC §10).
- **Validación** con `class-validator` + `class-transformer` en DTOs (whitelist, forbidNonWhitelisted) en cada boundary de entrada; las reglas de dominio (BR-005 capacidad, BR-006/007 observación, BR-016 máquina de estados) viven en los *services* de dominio, no en los DTOs.
- **Guards globales** de autenticación (JWT, ADR-008) y **guards por recurso** de RBAC (ADR-009), con interceptors uniformes para el envelope de respuesta `{ data }` / `{ error }` (ADR-007) y para `requestId` de trazabilidad.
- **Inyección de dependencias** nativa: los puertos entre módulos del monolito (ADR-001) se implementan como interfaces inyectadas entre módulos, no como imports transitivos a repositorios ajenos.

El estado de decisión es **Accepted**: es la decisión canónica del MASTER-SPEC §11.2.

## Alternativas consideradas

1. **Express puro + TypeScript.** Rechazada: no resuelve organización a escala de ~16 módulos (inversión de dependencias, guards, interceptors, OpenAPI); cada equipo reinventa la estructura y se erosiona el monolito modular del ADR-001.
2. **Fastify puro.** Rechazada por la misma razón de estructura; queda como opción de *platform* dentro de NestJS (swap) si la performance del HTTP layer lo exige (referencia en Decisión).
3. **AdonisJS.** Rechazada: ecosistema más pequeño, sin `@nestjs/swagger` equivalente tan directo para contrato vivo; la comunidad/agentes de implementación tienen más material en NestJS.
4. **Hono / Koa / frameworks minimalistas.** Rechazada: demasiado poco opinados para el tamaño del dominio; el proyecto necesita convención (MASTER-SPEC §15) más que minimalismo.
5. **GraphQL en el backend** (Apollo Server). Descartada por la decisión REST del ADR-007: NestJS la soportaría igual, pero el contrato v1 es REST.

## Consecuencias

**Positivas:**

- Estructura consistente por módulo → el monolito modular (ADR-001) se mantiene por convención del framework.
- OpenAPI generado desde código: contrato siempre sincronizado con la implementación (MASTER-SPEC §10).
- DI + testing integrado (unit con mocks de repositorio, e2e con `supertest`) alineado con la estrategia de QA (MASTER-SPEC §14).
- Ecossystem amplio: guards, interceptors, bullmq integración (ADR-012), Swagger, PrismaService.

**Negativas:**

- Framework opinado: curvas de aprendizaje (DI, decoradores, lifecycle hooks) para el equipo; se mitiga con documentación y guías en `backend/`.
- Acoplamiento a NestJS: el sistema de decoradores dificulta portar módulos fuera del framework; mitigado por los puertos de dominio (ADR-001) que mantienen la lógica de negocio independiente del transporte.
- Abstracción de más de una capa: el error-handling central (interceptors) debe diseñarse bien para no ocultar errores de dominio; se documenta en `backend/ERROR-HANDLING.md`.

## Referencias

- MASTER-SPEC §10 (API), §11.1/11.2/11.3 (arquitectura, stack, módulos), §15 (estándares TypeScript).
- ADR-001 (monolito modular), ADR-007 (REST /api/v1 + OpenAPI), ADR-008 (JWT guards), ADR-009 (RBAC guards), ADR-005 (Prisma + DI).
- `backend/BACKEND-ARCHITECTURE.md`, `backend/MODULES.md`, `backend/API.md` (grupo W5).