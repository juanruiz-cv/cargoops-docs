# CargoOps — Backup y Recuperación ante Desastres (DR)

> Grupo: DevOps/Plataforma (W9) · FASE 0 — documentación.
> Estado: borrador alineado con `MASTER-SPEC.md` v0.1. Los comandos/guión son **referenciales/ilustrativos**: NO se ejecutan en FASE 0.
> Fuente de verdad canónica: `MASTER-SPEC.md` §11.2 (stack), §14 (backups y DR), §4.1 (AuditLog), `ADR-004` (PostgreSQL), `ADR-010` (auditoría), `ADR-011` (soft delete, retención total en v1) y `ADR-012` (Redis/jobs).

---

## 1. Objetivo

Definir la estrategia de **backup y recuperación ante desastres (DR)** de CargoOps: qué datos son críticos, con qué mecanismo y frecuencia se respaldan (PostgreSQL con WAL/PITR, Redis, objetos S3), políticas de retención y cifrado, **pruebas de restore periódicas obligatorias**, runbooks de restauración y de failover, y los objetivos RPO/RTO **adoptados en MASTER-SPEC v0.5 (OQ-016 resuelta)** — RPO ≤ 15 min, RTO ≤ 4 h (BD) / ≤ 24 h (restauración completa) — parametrizables por entorno y declarados como AC a validar en FASE 1.

## 2. Contexto

CargoOps persiste tres categorías de datos:

| Categoría | Componente | Contenido | Criticidad |
| --- | --- | --- | --- |
| Datos transaccionales + dominio | PostgreSQL 16+ (ADR-004) | Cargas, camiones, ubicaciones, movimientos, observaciones, planos, alertas, usuarios, permisos, `AuditLog` (ADR-010) | **Crítica** — sin esto no hay operación ni trazabilidad |
| Auditoría y retención legal/operativa | Tabla `audit_logs` (ADR-010) | Diff de cambios, reversiones, exportaciones | Crítica (retención a definir con negocio, ADR-010) |
| Cache / colas de jobs | Redis 7 (si OQ-007 = v1, ADR-012) | Cache de sesión/consulta, colas BullMQ, datos transitorios | Media — reconstruible |
| Objetos | Storage S3-compatible (OQ-006) | PDFs exportados y futuros documentos/fotografías | Alta — documentos operativos |

El resto de la infraestructura (imágenes OCI, pipelines, config) se regenera desde código y `cargoops-infrastructure` (IaC); **no requiere backup de datos**, solo replicabilidad. El esquema de base se versiona y migra con Prisma (`CI-CD.md` §5.2 stage `migrate`), lo que implica que un restore debe coordinarse con la versión de esquema (ver §5.9).

`MASTER-SPEC.md` §14 exige explícitamente "backups, monitoring, logs, health checks, rollback, DR"; `DEVOPS.md` §5.4 exige verificación de backup previo a cada migración de esquema, y §5.6 define PostgreSQL de producción "con backups WAL + PITR".

## 3. Restricciones

- **FASE 0 = documentación**: no se implementan jobs de backup, scripts ni infraestructura; los fragmentos son ilustrativos y están marcados como tales.
- **Prohibido restaurar datos reales de producción en development/staging** (regla canónica `DEVOPS.md` §5.1, complementa BR-017): las pruebas de restore se hacen con datos sintéticos/anonimizados o en un ambiente de recuperación aislado.
- Los **backups deben residir fuera del host/aZona donde vive el dato** (otra máquina, otra zona o bucket secundario); un backup en el mismo disco no protege contra fallo de hardware ni destrucción del entorno.
- **Cifrado en repositorio de backup** (AES-256 o equivalente); credenciales del repositorio en el gestor de secretos (`ENVIRONMENTS.md` §5.3), nunca en scripts versionados.
- Los objetivos RPO/RTO quedaron **adoptados en v0.5 (OQ-016 resuelta)**: RPO ≤ 15 min, RTO ≤ 4 h (BD) / ≤ 24 h (restauración completa), backups diarios + WAL continuo, retención 35 días; se conservan **parametrizables por variable de entorno por ambiente** (AC a validar en FASE 1) para ajustes sin tocar código.
- Backups de propósitos diferentes se mantienen separados: **recuperación operativa** (Postgres WAL) vs **retención legal/audit** (ADR-010: 3 años operativos + archivado, cifra a confirmar — ver §9).

## 4. Dependencias

| Dependencia | Documento | Naturaleza |
| --- | --- | --- |
| Stack canónico y §14 (backups/DR) | `docs/MASTER-SPEC.md` §11.2, §14 | Canónica |
| PostgreSQL como DB canónica | `docs/architecture/ADR/ADR-004-PostgreSQL.md` | Define backups/PITR (OQ-016 abierto) |
| AuditLog append-only y retención | `docs/architecture/ADR/ADR-010-Audit-Log.md` | Retención audit no se borra por política de logs |
| Soft delete: retención total en v1 | `docs/architecture/ADR/ADR-011-Soft-Delete.md` | El backup es la defensa ante pérdida (sin purge en v1) |
| Redis y persistencia | `docs/architecture/ADR/ADR-012-Background-Jobs.md`, OQ-007 | RDB/AOF solo si Redis está en v1 |
| Storage S3 / MinIO | OQ-006 (`docs/OPEN-QUESTIONS.md`) | Versionado/replicación dependen del proveedor |
| Rollback y migraciones con backup previo | `devops/CI-CD.md` §5.7, `devops/DEVOPS.md` §5.4 | Coordinación migrate↔backup |
| Variables/secretos del repositorio de backup | `devops/ENVIRONMENTS.md` §5.3 | Cifrado y acceso |
| Alertas de "backup viejo" (stale) | `devops/MONITORING.md` §5.4 | Detección de fallo silencioso |

## 5. Decisiones

### 5.1 Matriz de respaldo por componente

| Componente | Mecanismo | Frecuencia (propuesta, parametrizable) | Retención (propuesta) | RPO efectivo |
| --- | --- | --- | --- | --- |
| PostgreSQL (full) | `pgBackRest` full (o `pg_dump` lógico como complemento mensual) | Diaria (backups diarios, OQ-016) | 35 días (OQ-016, v0.5; ajustable) | Frecuencia + ventana WAL |
| PostgreSQL (WAL) | Archiving WAL continuo → repositorio | Continua (cada segmento 16 MB) | Cobertura PITR — retención 35 días (OQ-016) | ≤ 15 min (OQ-016 adoptado) |
| Redis (si OQ-007 = v1) | RDB + AOF `everysec`; copia de snapshot | BGSAVE programado + copia diaria | 7 días | Pérdida de hasta 1 s aceptada (cache/cola reconstruible) |
| Objetos S3 | Versionado + replicación entre buckets | Continua (cada escritura versionada) | 30 versiones o 90 días (lifecycle) | Instantáneo (versionado) |
| Config/planos/seeds | Git (IaC) + export lógico mensual | Por commit / mensual | Histórico del repo | N/A (código) |

> Valores **adoptados en MASTER-SPEC v0.5 (OQ-016 resuelta)**: RPO ≤ 15 min, RTO ≤ 4 h (BD) / ≤ 24 h (restauración completa), backups diarios + WAL continuo, retención 35 días — AC a validar en FASE 1; todas las frecuencias/retenciones quedan centralizadas en variables (p. ej. `BACKUP_FULL_RETENTION_DAYS`) para ajustarlas sin tocar código.

### 5.2 PostgreSQL — estrategia base (WAL + PITR)

Base canónica: PostgreSQL 16+ (ADR-004) con **archiving WAL continuo + backups full periódicos** para point-in-time recovery (PITR), coherente con `DEVOPS.md` §5.6 y `MASTER-SPEC.md` §14.

Propuesta de implementación (FASE 2+):

| Aspecto | Decisión propuesta |
| --- | --- |
| Herramienta | **pgBackRest** (backups incrementales/diferenciales, cifrado, retención y validación integradas) o `pg_basebackup` + WAL archiving si se prefiere menos dependencias. Decisión de herramienta pendiente (ver §9). |
| Full | **Diaria** (backups diarios, OQ-016 resuelta); `pg_dump` lógico mensual como red de seguridad contra corrupción física |
| WAL | `archive_mode=on`, `archive_command` a repositorio local/remoto; los segmentos maduran a archivo con timeout corto (p. ej. `archive_timeout=60`) para acotar el RPO |
| PITR | Restore a un timestamp/transacción específica (`pg_restore --target` en pgBackRest) |
| Cifrado | Repositorio con `repo1-cipher-type=aes-256-cbc` (pgBackRest) o equivalente |
| Verificación | `pgbackrest check` diario + `restore --type=standby` periódico (ver §5.7) |

Esquema referencial de la configuración (ILUSTRATIVO, NO se aplica en FASE 0):

```ini
# pgBackRest.conf — ILUSTRATIVO/REFERENCIAL
[global]
repo1-path=/var/lib/pgbackrest
repo1-cipher-type=aes-256-cbc        # cifrado en repositorio
repo1-cipher-pass=<desde gestor de secretos, nunca versionado>
retention-full=2                      # 2 fulls conservados
retention-diff=4                      # diferenciales entre fulls
process-max=3

[pg1]
pg1-path=/var/lib/postgresql/16/main
pg1-socket-path=/var/run/postgresql

# postgresql.conf (fragmento)
archive_mode=on
archive_command=pgbackrest --stanza=main archive-push %p
archive_timeout=60                    # acota RPO a ~1 min de WAL
```

### 5.3 Redis — persistencia y backup (OQ-007 resuelta: sí en v1)

Redis es **reconstruible** (cache + colas BullMQ; los jobs deben ser idempotentes o re-encolables — ADR-012), por lo que el backup es defensa secundaria:

- `save 900 1` (RDB) + **AOF activado** con `appendfsync everysec` (pérdida máxima aceptable ~1 s; `always` tiene costo de I/O que se mide en QA).
- Backup: `BGSAVE` programado + copia del `dump.rdb` / AOF al mismo repositorio que Postgres (rotación 7 días). Restaurar Redis NO restaura trabajos a medio procesar: se valida la cola y se re-encola lo pendiente por la app (`JOBS.md`, W5).
- **OQ-007 resuelta (2026-09-24)**: Redis + BullMQ **están en v1** (ADR-012 Accepted); las alertas de permanencia (BR-014/015) y el PDF asíncrono (OQ-005) son jobs reales, por lo que este apartado está **activo**. La variante sin Redis quedó documentada como alternativa descartada (JOBS.md §4.12).

### 5.4 Objetos S3 — versionado y replicación (OQ-006)

Con **MinIO self-hosted en producción (OQ-006 resuelta)** — API S3-compatible, sin dependencia cloud, migrable a AWS S3 sin reescribir — la estrategia es **agnóstica a la interfaz S3-compatible** y exige:

| Mecanismo | Regla propuesta |
| --- | --- |
| Versionado | ON en el bucket de producción; cada overwrite/delete genera una versión recuperable (protege contra borrado accidental y ransomware) |
| Replicación | Replicar el bucket a una segunda zona/región (S3 Replication o bucket mirror en MinIO) — condicionado al residual local §9.4 (destino de backups secundario) |
| Lifecycle | Transición de versiones antiguas a storage frío/archivo (IA/Glacier) tras 90 días; expiración a los 180 días (parametrizable) |
| MFA/borrado protegido | El borrado de versiones se restringe (MFA delete en cloud; política equivalente en MinIO) |
| Bucket de backups | Los repositorios de backup propios viven en un bucket SEPARADO del de objetos de negocio, con sus propias credenciales (menor privilegio) |

### 5.5 Datos que NO se respaldan por copia

- Imágenes OCI (`api`, `web`): se reconstruyen del tag SemVer del registry (`CI-CD.md` §5.4) — retención de imágenes ≥ ventana de rollback (últimas 10 releases + vigentes).
- Código, config, seeds: viven en git (`cargoops-infrastructure`) — el backup de git se delega al hosting del repo (fuera de alcance).
- Variables y secretos: en el gestor de secretos (`ENVIRONMENTS.md` §5.3), con export/recuperación propia del proveedor (documentada en el runbook de DR).

### 5.6 RPO/RTO objetivo — adoptados (OQ-016 resuelta)

> **OQ-016 RESUELTA (2026-09-24, MASTER-SPEC v0.5)**: RPO ≤ 15 min (WAL/PITR), RTO ≤ 4 h (BD) y ≤ 24 h (restauración completa); backups diarios + WAL continuo, retención 35 días. Adoptados como **AC a validar en la prueba de DR de FASE 1** y parametrizables por variable de entorno:

```text
# Valores adoptados (OQ-016; AC a validar en FASE 1):
RPO_DEFAULT    = 15 min     # pérdida máxima aceptada de transacciones (cubierto por WAL)
RTO_DEFAULT    = 4 h        # BD; hasta 24 h para restauración completa
BACKUP_FULL    = diario     # backups diarios + WAL continuo
RETENTION_DAYS = 35         # retención de backups (v0.5/OQ-016)
BACKUP_RETRY   = 3          # reintentos del job de backup antes de alertar
```

| Escenario de pérdida | RPO alcanzable con la estrategia |
| --- | --- |
| Fallo de disco/host de Postgres | ≤ 15 min (WAL) con repositorio fuera del host |
| Borrado/error lógico (UPDATE sin WHERE, migration rota) | PITR a timestamp previo al incidente (ventana WAL) |
| Pérdida total de la zona (incendio, corte) | Depende de replicación cruzada de Postgres y del bucket S3 (ver §9) |
| Corrupción silenciosa de datos | Limitado al último full + WAL validados (mitigado por `check` y pruebas de restore) |

Los valores de `RPO/RTO` se ajustan por variable de entorno; el diseño (WAL + PITR + versionado S3) cubre holgadamente incluso un RPO de 5 minutos. Los valores adoptados quedan como **AC a validar en la prueba de DR de FASE 1** (MASTER-SPEC §14).

### 5.7 Pruebas de restore (obligatorias)

Regla: **un backup que nunca se restauró no es un backup**. Frecuencia mínima propuesta:

| Prueba | Frecuencia | Alcance |
| --- | --- | --- |
| `pgbackrest check` (o equivalente) | Diaria (en el job de backup) | Config, repositorio y archiving OK |
| Restore full + WAL a timestamp | **Trimestral** | Ambiente de recuperación aislado (nunca staging con datos reales restore, ver Restricciones); datos sintéticos |
| Restore de objetos S3 | Trimestral | Recuperar una versión histórica de un PDF y validar integridad |
| Restore Redis | Semestral | levantar desde snapshot + validar cola |
| Simulación de DR completo | Anual | desde cero: infra + datos + smoke tests (`/health`, `/ready`) |

Checklist de cada prueba (se registra en el ticket/informe de la prueba): fecha, fuente (stanza/backup id), entorno destino aislado, resultado de smoke, tiempo total (RTO medido), firmas/obs. La alerta de "backup sin verificar" alimenta `MONITORING.md` §5.4.

### 5.8 Runbook — Restore PostgreSQL con PITR (referencial)

> ⚠️ GUION ILUSTRATIVO/REFERENCIAL — los pasos reales se fijan en FASE 2+ y dependen de la herramienta elegida (pgBackRest propuesto).

```bash
# 1) Detener el tráfico hacia la app (mantenimiento) y confirmar el incidente
# 2) Elegir el punto de restauración (timestamp o transaction id del incidente)
#    p.ej. "2026-09-23 14:30:00 ART" para reconstruir hasta antes del error lógico
# 3) Restaurar en el MISMO host destino (o nuevo host como parte del DR)
pgbackrest restore --stanza=main --type=time \
  --target="2026-09-23 14:30:00" --target-action=promote
# 4) Recuperar WAL pendiente y arrancar PostgreSQL
pgbackrest archive-get --stanza=main ...   # (gestionado por restore automático)
# 5) Verificar integridad: counts por tabla crítica vs informe previo
#    (cargas, movimientos, audit_logs) y correr smoke tests /health + /ready
# 6) Si el incidente fue lógico en la APLICACIÓN (no en la BD):
#    coordinar con el runbook de rollback de CI-CD §5.7 (migración inversa)
#    — restaurar esquema viejo con datos restaurados o re-aplicar migraciones según caso
# 7) Reanudar tráfico y verificar réplica de lectura si existe
```

Punto clave de coordinación: **el backup es de datos, el esquema lo versiona Prisma**. Si la release actual aplicó migraciones post-backup, restaurar datos viejos con esquema nuevo puede fallar: el runbook de cada release declara si su rollback necesita "migración inversa" o "restore de backup" (`CI-CD.md` §5.7, regla 4).

### 5.9 Runbook — DR (fallo total del entorno)

1. **Declarar el incidente** (canal #incidentes, `MONITORING.md` §5.5) y congelar despliegues (regla de release: sin deploys durante DR activo).
2. **Decidir estrategia**: (a) failover a réplica de PostgreSQL + apuntar el LB (RTO corto, si hay réplica HA — `DEVOPS.md` §5.6) o (b) restore completo desde backups en infraestructura nueva (RTO según prueba anual §5.7).
3. Ejecutar el runbook elegido con el equipo on-call; **cronometrar** (el tiempo medido alimenta el RTO real).
4. Validar smoke: `/health`, `/ready`, login + consulta de una carga reciente + auditoría (`GET /api/v1/audit`).
5. Restaurar secretos desde el gestor (rotación de credenciales afectadas por el incidente).
6. Post-incidente: informe con causa raíz, tiempo real de recuperación vs RTO declarado, y acciones correctivas (se agrega al backlog `qa/`).

### 5.10 Monitoreo y alertas de backup

Los backups fallan en silencio con más frecuencia que la operación; por eso el monitoreo los vigila con SLO propio:

| Alerta | Condición (`MONITORING.md` §5.4) | Severidad |
| --- | --- | --- |
| `WALArchivingStale` | > 10 min sin archivar WAL | P1 — el RPO de §5.6 se degrada |
| `BackupTooOld` | > 7 días sin full exitoso (o mayor que la retención configurada) | P1 |
| `BackupCheckFailed` | `pgbackrest check` (o equivalente) falla | P1 |
| `RestoreStale` | > 95 días sin prueba de restore exitosa registrada (§5.7) | P2 |
| `BucketVersioningOff` | Versionado desactivado en el bucket de objetos | P1 |

- Los jobs de backup exponen métricas (`last_success_timestamp`, `last_duration_seconds`, `bytes`) en `/metrics` del agente o exporter del repositorio (`MONITORING.md` §5.2).
- Toda alerta de backup se asocia al runbook correspondiente (§5.8/§5.9) y queda visible en el dashboard "Backup" de Grafana (`MONITORING.md` §5.6).
- Regla de release: **ningún deploy de producción se realiza con una alerta P1 de backup activa** (gate manual del release manager, `DEVOPS.md` §5.4).

### 5.11 Escenarios de pérdida y acciones

| # | Escenario | Ejemplo | Acción | RTO esperado (con propuesta §5.6) |
| --- | --- | --- | --- | --- |
| E1 | Error lógico de aplicación (migración rota, UPDATE masivo) | Deploy con migración destructiva | Restore PITR a timestamp previo + runbook de rollback de la release (`CI-CD.md` §5.7) | 1–2 h |
| E2 | Falla de disco/host de PostgreSQL | Host sin respuesta, filesystem corrupto | Restore full + WAL en host nuevo (§5.8) o failover a réplica si existe | 1–4 h |
| E3 | Borrado accidental/ransomware de objetos | PDFs borrados o cifrados | Restaurar versión anterior desde versionado S3 (§5.4) | Minutos–1 h |
| E4 | Pérdida total de la zona/proveedor | Incendio, caída del cloud region | DR completo (§5.9): infra nueva + restore desde repositorio secundario | 4 h – 1 día (según OQ-016 y OQ-006) |
| E5 | Corrupción silenciosa detectada por `check`/QA | Backups corruptos sin PITR posible | Restaurar el último full CORRUPTO detectado → usar `pg_dump` lógico mensual como red de seguridad | Variable — mitigado por pruebas §5.7 |
| E6 | Pérdida de secretos (gestor caído) | Vault/KMS inaccesible | Procedimiento de recuperación del gestor de secretos (propio del proveedor) + rotación post-restauración | 1 h |

Decisión E1 vs E2: **si el incidente es lógico en datos, NO re-desplegar la release**; primero restaurar datos a un punto sano y luego evaluar la app. **Si el incidente es de infraestructura**, restaurar datos y validar contra el esquema actual; si las migraciones posteriores al backup lo impiden, aplicar el runbook de rollback del deploy (coordinación de §5.8 paso 6).

### 5.12 Organización del DR (roles y comunicación)

| Rol | Responsabilidad en incidente |
| --- | --- |
| DevOps Engineer (on-call) | Ejecuta runbooks de restore/failover; cronometra RTO real |
| Backend on-call (W5) | Diagnostica incidentes lógicos; autoriza PITR a timestamp; valida smoke de datos |
| Release Manager | Congela deploys durante el DR; coordina rollback si la causa es una release |
| PO/negocio | Decide umbrales (OQ-016) y comunica al predio; autoriza archivado/descarte de datos parciales si el PITR no cubre (solo bajo OQ-016 formalizado) |

Comunicación: canal #incidentes (incidente declarado → post-mortem), actualización cada 30 min durante el DR, y el informe final con tiempos medidos pasa a `qa/` como insumo de mejora continua. Los runbooks se prueban en la simulación anual (§5.7) exactamente con estos roles, para que el tiempo de la primera ejecución real no sea una sorpresa.

## 6. Criterios de aceptación

- [ ] Estrategia definida para los 4 componentes de datos (Postgres WAL/PITR, Redis condicional, S3 versionado/replicado, código/IaC en git).
- [ ] Frecuencias y retenciones **parametrizadas** y coherentes con `DEVOPS.md` §5.6 (WAL + PITR en producción).
- [ ] RPO/RTO **adoptados (OQ-016 resuelta)**: RPO ≤ 15 min, RTO ≤ 4 h (BD) / ≤ 24 h (restauración completa), backups diarios + WAL continuo, retención 35 días — parametrizables y declarados como AC a validar en FASE 1.
- [ ] Pruebas de restore con frecuencia mínima y checklist; prohibición de restaurar datos reales fuera de producción documentada.
- [ ] Runbooks de restore PITR y de DR con pasos y coordinación con migraciones Prisma / rollback (`CI-CD.md` §5.7).
- [ ] Cifrado de repositorio, backups fuera del host y bucket de backups separado documentados.
- [ ] Fragmentos marcados como referenciales y sin secretos ni datos reales.

## 7. Archivos involucrados

- `devops/BACKUP-RECOVERY.md` (este documento) · `devops/DEVOPS.md` §5.4/§5.6/§9 · `devops/CI-CD.md` §5.7 · `devops/ENVIRONMENTS.md` §5.3 · `devops/MONITORING.md` (alertas de backup stale)
- `docs/MASTER-SPEC.md` §14 · `docs/architecture/ADR/ADR-004` · `ADR-010` · `ADR-011` · `ADR-012` · `docs/OPEN-QUESTIONS.md` (OQ-006, OQ-007, OQ-016)
- Futuro repo: `cargoops-infrastructure` (jobs de backup, pgBackRest config, buckets) — `MASTER-SPEC.md` §22

## 8. Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Backup nunca probado (restore roto descubierto en el desastre) | Pruebas de restore trimestrales obligatorias + `check` diario (§5.7) |
| Backup en el mismo disco/host que el dato | Repositorio fuera del host + bucket de backups separado (§5.1) |
| WAL archiving silenciosamente caído → RPO real ilimitado | Alerta de "backup/WAL stale" en `MONITORING.md` §5.4 |
| Restaurar datos viejos contra esquema nuevo (migraciones Prisma) | Runbook por release declara estrategia de rollback (`CI-CD.md` §5.7) |
| Datos reales de producción filtrados a staging vía restore | Prohibición explícita + ambiente de recuperación aislado (§3) |
| Backup en claro → fuga de datos de cargas/usuarios | Cifrado AES-256 en repositorio; credenciales en gestor de secretos |
| Borrado accidental/ransomware de objetos | Versionado + retención de versiones + borrado protegido (MFA) en S3 (§5.4) |
| Retención de AuditLog sin definir (ADR-010: 3 años propuesta) | Se parametriza; la retención legal NO la gobierna la rotación de logs operacionales (`LOGGING.md`) |

## 9. DECISIÓN PENDIENTE

Las preguntas con OQ asignada quedaron **resueltas en MASTER-SPEC v0.5 (2026-09-24)**; los ítems 4–6 no tienen OQ asignada y se conservan como residuales locales:

| # | Pregunta | Impacto | Resolución |
| --- | --- | --- | --- |
| 1 | ~~¿Pérdida de datos aceptable (RPO) y tiempo máximo de recuperación (RTO)?~~ | Frecuencias/retenciones definitivas, réplica en zona secundaria, presupuesto | ✅ **RESUELTA (OQ-016)** — **RPO ≤ 15 min** (WAL/PITR); **RTO ≤ 4 h** (BD) y **≤ 24 h** (restauración completa); backups diarios + WAL continuo, retención 35 días; AC a validar en FASE 1 |
| 2 | ~~¿MinIO self-hosted o servicio cloud S3?~~ | Replicación entre regiones, versionado gestionado, MFA delete, lifecycle, ubicación de repositorios de backup | ✅ **RESUELTA (OQ-006)** — **MinIO self-hosted** en producción (API S3-compatible, sin dependencia cloud, migrable a AWS S3 sin reescribir) |
| 3 | ~~¿Redis en v1?~~ | Backup de Redis y dependencia AOF/RDB en la estrategia activa | ✅ **RESUELTA (OQ-007)** — **sí en v1** (ADR-012 Accepted): las alertas de permanencia (BR-014/015) y el PDF asíncrono (OQ-005) son jobs reales |
| 4 | ¿Los backups replican a un segundo proveedor/zona (defensa ante fallo del proveedor principal) o basta una zona distinta del mismo? | Resiliencia del repositorio | 🔶 Pendiente local — sin OQ asignada; se recomienda al menos zona distinta (§5.4); reportado al orquestador para centralización en `OPEN-QUESTIONS.md` |
| 5 | ¿pgBackRest vs `pg_basebackup` + WAL manual vs servicio gestionado del proveedor? | Herramienta de backup de PostgreSQL | 🔶 Pendiente local — sin OQ asignada; no bloqueante: los runbooks de §5.8 son agnósticos al mecanismo |
| 6 | Retención de `audit_logs` (ADR-010: propuesta «3 años operativos + archivado») | Tamaño de backups y plan de archivado | 🔶 Pendiente local — AUDIT.md §9 U2 / DATABASE.md §11 D9, sin OQ asignada; v1 sin purge (ADR-011, retención total) |