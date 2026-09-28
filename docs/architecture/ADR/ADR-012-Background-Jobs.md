# ADR-012 — Background Jobs

- Estado: **Accepted**
- Fecha: 2026-09-23 (Analysis) · **2026-09-24 (Accepted — OQ-007 resuelta)**
- Decisores: Equipo CargoOps / Software Architect

> ✅ **Decisión resuelta (OQ-007, 2026-09-24)**: **Redis + BullMQ en v1**, con workers en proceso (mismo despliegue que el API; la separación a proceso de workers dedicado es configuración de despliegue). Colas v1: `alerts` (job repeatable diario, permanencias > 30/40 días con deduplicación), `pdf-exports` (ADR-013: documentos grandes), `maintenance` (rotación de audit, limpieza de refresh tokens). La opción `@nestjs/schedule` (cron in-process) queda descartada para v1 y se documenta como alternativa evaluada.

## Contexto

CargoOps tiene trabajo asíncrono real identificado en v1 y v1.1 (MASTER-SPEC §5, §9, §11.6):

- **Alerta de rezago 30 días (BR-014)**: detección de permanencia > 30 días (desde `entryDate`, regla por defecto) y generación de `Alert STALE_30D`. Es un barrido de datos (no un evento): corre diariamente y marca cargas que cruzan el umbral. La fecha base/días exactos están sujetos a configuración futura (BR-015, OQ-008).
- **Exportación PDF asíncrona (ADR-013)**: generación server-side de documentos; según volumen, puede ser síncrona (respuesta directa) con timeout o asíncrona con cola y descarga posterior (`POST /api/v1/cargos/:id/export-pdf`, MASTER-SPEC §10).
- **Mantenimiento**: rotación/archivado de `AuditLog` (ADR-010) y de refresh tokens expirados (ADR-008), recálculo de `occupiedCapacity` si no es derivado en consulta (BR-005/BR-035, OQ-041), potencial limpieza de jobs fallidos.
- **Futuro (v1.1+, MASTER-SPEC §1.5)**: notificaciones multi-canal (EMAIL/PUSH/WHATSAPP/WEBHOOK), reportes programados, sincronizaciones multi-predio.

El sistema debe funcionar sin workers dedicados si el volumen es bajo, pero sin reescribir cuando aparezcan los primeros jobs con retry. La pregunta OQ-007 es: ¿se paga el costo de Redis + BullMQ en v1, o se difiere?

## Decisión (Accepted — OQ-007, 2026-09-24)

Adoptar **Redis + BullMQ** vía `@nestjs/bullmq`, con **workers en proceso** para v1 (mismo despliegue que el API, un proceso NestJS puede registrar workers; la separación a un proceso de workers dedicado es configuración de despliegue, no de código):

- Colas v1: `alerts` (job repeatable diario que barre permanencias > 30/40 días e inserta Alert OPEN con deduplicación por `cargoId+type+status` abierto), `pdf-exports` (ADR-013, documentos grandes; los livianos siguen síncronos), `maintenance` (rotación de audit, limpieza de refresh tokens).
- **Idempotencia y deduplicación**: cada job es idempotente (marcar estado procesado en la entidad: `Alert` ya abierta para ese cargo/type no se duplica; refresh token ya revocado no se toca) — fundamental para retries (BR-014 debe correr sin generar alertas duplicadas).
- Retry con backoff exponencial, dead-letter para jobs fallidos, y **observabilidad con Bull Board** (UI de colas) en ambientes no productivos; en prod, métricas a `devops/` (MASTER-SPEC §14).
- Redis se reutiliza para: caché opcional de lecturas del dashboard/mapa (v1.1, no bloqueante) y sesiones/revocación de refresh si ADR-008 evolucionara.

**Opción alternativa evaluada y descartada para v1**: usar **`@nestjs/schedule` (cron in-process)** para el barrido diario de alertas (un solo nodo ejecuta el cron; en despliegues multi-instancia se requiere flag de *leader* o se acepta el riesgo de duplicación con deduplicación en DB), y exportación PDF **síncrona con timeout** + retry manual. Esta opción cubre v1 sin Redis, pero: (a) sin retry robusto, (b) sin cola para exports pesados, (c) migrar a BullMQ después implica tocar workers/interfaces. Re-evaluable solo si el costo operativo de Redis resultara inaceptable en el piloto (trigger de re-evaluación).

**Análisis que sustentó la decisión (OQ-007)**:

| Criterio | BullMQ en v1 (elegido) | Diferir a v1.1 |
| --- | --- | --- |
| Costo operativo | Redis a operar (container/instancia) | cero dependencias nuevas |
| Costo de código | colas + workers + dedup | cron simple + exports síncronos |
| Retry/robustez | sí | manual |
| Riesgo de reescritura | — | medio (jobs aparecen en v1.1) |
| Complejidad dev local | Docker compose con Redis (MASTER-SPEC §14 devops) | menor |

Razón de la elección: la alerta de 30/40 días + export PDF + mantenimiento son tres jobs reales en v1; la deduplicación/idempotencia se diseña una sola vez; el costo operativo de Redis es bajo (Docker / instancia gestionada) y ya es dependencia prevista del stack.

## Alternativas consideradas

1. **`node-cron` / `@nestjs/schedule` (cron in-process).** Análisis en Decisión: cubre el barrido diario y jobs simples sin Redis; limitado en retry, visibilidad y ejecución multi-instancia. Aceptable como opción de diferimiento.
2. **RabbitMQ + workers.** Rechazada: AMQP agrega complejidad (exchanges, bindings, gestión) sin beneficio frente a BullMQ para jobs con retry/backoff que es el caso de uso; BullMQ es la opción estándar en el ecosistema NestJS (integración nativa `@nestjs/bullmq`).
3. **AWS SQS + Lambda (o equivalente cloud).** Rechazada para v1: lock-in de nube y despliegue del predio aún indefinido (on-premise/cloud, OQ-006); además la alerta de 30 días es un barrido de la propia base, más natural en el proceso del backend que en funciones externas.
4. **Cola en base de datos (tabla de jobs + polling).** Rechazada: acopla el scheduling al schema transaccional, polling ineficiente, sin retry/backoff/visibilidad; útil solo como cola de transición (outbox si el día llega a necesitarse, p. ej. notificaciones).

## Consecuencias

**Positivas (BullMQ):**

- Jobs con retry/backoff, dead-letter y visibilidad (Bull Board) desde el día uno.
- Diseño idempotente desde el inicio (alertas de 30/40 días sin duplicados, BR-014).
- La infra de jobs soporta el roadmap (notificaciones in-app v1, reportes, multi-predio, MASTER-SPEC §1.5) sin reescritura.

**Negativas / riesgos:**

- Dependencia operativa nueva (Redis): monitoreo, persistencia (AOF/RDB), backup y seguridad de red (MASTER-SPEC §14; OQ-006: MinIO self-hosted, misma red del predio).
- Workers en proceso compiten recursos con el API (limitar concurrencia por worker).
- Job de alertas despierto a medianoche requiere manejo de zona horaria del predio (configuración, OQ-008) — cron con timezone explícita.
- `@nestjs/schedule` (cron in-process) queda descartada para v1; deuda técnica documentada si el costo de Redis resultara inaceptable en el piloto (trigger de re-evaluación explícito).

## Referencias

- MASTER-SPEC §9 (alertas y rezago), §11.2 (Redis/BullMQ), §6 BR-014/015, §18 (fase 9 Alerts, fase 10 PDF), §1.5 (notificaciones futuras).
- ADR-013 (PDF export asíncrono o síncrono), ADR-010 (jobs de rotación de audit), ADR-008 (limpieza de refresh tokens), ADR-004 (Redis no reemplaza la base transaccional).
- OQ-007 (resuelta 2026-09-24 — Redis + BullMQ en v1), OQ-008 (fecha base/días), OQ-011/023 (canales y triggers de notificación), OQ-006 (MinIO self-hosted).
- `backend/JOBS.md` (detalle de colas/workers, creado por grupo W5).