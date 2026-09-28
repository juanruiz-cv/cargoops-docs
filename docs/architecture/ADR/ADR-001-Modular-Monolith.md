# ADR-001 — Modular Monolith

- Estado: Accepted
- Fecha: 2026-09-23
- Decisores: Equipo CargoOps / Software Architect

## Contexto

CargoOps es una plataforma web de gestión operativa de cargas y depósitos en un predio logístico/aduanero: registro de cargas y camiones, ubicación física, movimientos con historial completo, alertas de rezago y un plano configurable del predio (MASTER-SPEC §1, §2). El equipo es pequeño (backend/frontend íntegros de 2–5 personas en la práctica), el dominio es acotado y centralizado en una sola organización, y el perfil de operación es transaccional (crear, mover, observar, auditar) con fuerte dependencia de integridad de datos.

La FASE 0 exige documentar decisiones, no implementar (MASTER-SPEC §1.3). El stack objetivo ya está fijado en MASTER-SPEC §11 y §11.2: un solo servicio backend NestJS. Este ADR consolida y justifica la forma de ese servicio.

## Decisión

Adoptar un **monolito modular**: un único servicio backend desplegable (NestJS, ver ADR-003) dividido en módulos fuertemente cohesionados alrededor de capacidades de negocio, con boundaries explícitos entre ellos. Es la decisión canónica del MASTER-SPEC §11.1.

Concretamente:

- Módulos v1: `auth`, `users`, `roles`, `permissions`, `cargo`, `trucks`, `locations`, `movements`, `maps`, `alerts`, `dashboard`, `audit`, `notifications`, `settings`, `health` (MASTER-SPEC §11.3; `reports` queda mínimo, absorbido por `cargo`/`dashboard` en v1).
- Cada módulo expone «puertos» (interfaces de servicio) consumibles por otros módulos. Un módulo no accede a los repositorios ni a las entidades internas de otro módulo directamente: solo a través de su interfaz.
- Transacciones ACID entre módulos vía una única base de datos PostgreSQL (ADR-004). No hay llamadas HTTP internas ni colas entre módulos en v1.
- La estructura `controller → service → repository` es interna de cada módulo (MASTER-SPEC §11.3); la regla del monolito es sobre el *acoplamiento entre módulos*, no sobre las capas internas.
- El criterio de extracción futura está documentado: si un módulo (p. ej. `alerts` o `pdf`) crece en carga, puede extraerse a un servicio propio porque ya expone una interfaz.

El estado de decisión es **Accepted**: es la decisión canónica del MASTER-SPEC §11.1 y no depende de preguntas abiertas.

## Alternativas consideradas

1. **Microservicios desde el inicio.** Rechazada: complejidad distribuida prematura (descubrimiento, retries, consistencia eventual, observabilidad distribuida), equipo pequeño, dominio acotado y despliegue simple requerido (MASTER-SPEC §11.1: KISS/YAGNI). Además, movimientos + auditoría + capacidad exigen transacciones ACID que en microservicios obligarían a patrones (Saga, Outbox) sin beneficio en v1.
2. **Monolito clásico por capas (controllers/services/repositories globales).** Rechazada: sin boundaries de módulo se acumula deuda de acoplamiento (un cambio en Cargo rompe Locations o Maps) y la extracción futura a microservicios sería una reescritura, contradiciendo la visión de crecimiento de MASTER-SPEC §1.5.
3. **Serverless/FaaS por función de negocio.** Rechazada: estado compartido y transacciones forzadas a servicios externos, latencia y complejidad operativa para un dominio transaccional síncrono; tampoco aporta en un despliegue on-premise/intranet previsible.

## Consecuencias

**Positivas:**

- Despliegue y puesta en marcha simples: un artefacto, una base de datos, un health check (MASTER-SPEC §14).
- Transacciones ACID entre módulos (movimiento + observación + auditoría en la misma transacción) sin sagas.
- Tiempo de onboarding bajo para el equipo; testing más simple (unit + integración en proceso único).
- Los boundaries de módulo dejan la puerta abierta a extraer servicios cuando el dominio crezca (multi-predio, sincronización, API externa, MASTER-SPEC §1.5) sin reescribir.

**Negativas:**

- Disciplina requerida: los boundaries se erosionan con el tiempo; se mitiga con revisión de arquitectura en code review y con el manifiesto de módulos (`backend/MODULES.md`).
- Escalamiento vertical del proceso único: aceptable en v1 (predio único, decenas de usuarios), revisar en v1.1+ si hay multi-tenant.
- Un fallo de memoria/CPU afecta a todo el servicio; mitigado por procesos separados para jobs pesados si ADR-012 se resuelve con workers.
- Riesgo de «monolito gigante» si los límites no se hacen cumplir; la decisión incluye el mecanismo (puertos) para evitarlo.

## Referencias

- MASTER-SPEC §1.5 (crecimiento futuro), §11.1 (decisión central), §11.3 (módulos backend), §11.2 (stack objetivo).
- ADR-003 (NestJS), ADR-004 (PostgreSQL), ADR-007 (REST API), ADR-012 (jobs: workers separados si aplica).
- `backend/MODULES.md` (detalle de módulos, pendiente de creación por grupo W5).