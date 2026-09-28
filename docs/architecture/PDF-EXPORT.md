# CargoOps — Exportación PDF (PDF-EXPORT.md)

> Grupo W2 · Arquitectura · Fuente de verdad: `docs/MASTER-SPEC.md` §10 (`POST /api/v1/cargos/:id/export-pdf`), §11.6 (servicio backend especializado), §6 BR-018 (permisos de exportación), §4.3 (`AuditAction.EXPORT`), §13 (design tokens).
> Estado: borrador FASE 0 (documentación), **alineado a MASTER-SPEC v0.5 (2026-09-24)**: OQ-005 resuelta (Puppeteer/Chromium HTML→PDF) y ADR-013 en **Accepted**; OQ-006 (MinIO self-hosted) y OQ-007 (BullMQ en v1) también resueltas. Este documento detalla el contrato y el pipeline según esas decisiones.

## 1. Objetivo

Definir el servicio backend especializado de exportación PDF de CargoOps: el contrato de API, la estrategia de generación (HTML→PDF vs alternativas, coherente con ADR-013/OQ-005), el pipeline síncrono vs asíncrono (cola + S3 + URL firmada), la seguridad (BR-018, datos no autorizados, filigrana, expiración) y la retención/borrado de los archivos generados. El componente de UI `PdfExportButton` (COMPONENTS.md §6.16) es el único cliente en v1.

## 2. Contexto

La exportación cubre «cargas, detalle e historial» desde v1 (MASTER-SPEC §1.4; fase 10 del roadmap §18). El documento típico contiene: datos de la carga (código —string único pues BR-002—, descripción, estado, ubicación actual, fechas), la línea temporal de movimientos (fecha, origen/destino, estados, usuario, observación obligatoria BR-006/007) y las alertas activas (ADR-013 §Contexto). Es información operativa sensible de un predio logístico/aduanero: la generación ocurre **siempre en backend** (SECURITY.md §5.7; el cliente jamás recibe datos crudos para «armar» el PDF — BR-018), toda exportación queda auditada (`AuditAction.EXPORT`, ADR-010) y las descargas se acotan en el tiempo (URL firmada).

## 3. Restricciones

- **Generación server-side obligatoria** (SECURITY.md §5.7): el frontend solo solicita y descarga.
- **Permisos por rol** (BR-018): permiso `cargo.export_pdf` en el endpoint (AUTHORIZATION.md §5.2); sin exposición de datos de cargas no autorizadas; revalidación en el momento de firmar la URL.
- **Auditoría**: cada exportación genera `AuditAction.EXPORT` con `exportId` y `cargoId` (AUDIT.md §5.2) en la misma operación.
- **Estrategia de generación (OQ-005 resuelta 2026-09-24)**: **HTML→PDF con Puppeteer/Chromium** en el módulo backend `pdf` (ADR-013 Accepted); este documento detalla contrato y pipeline para esa decisión, con la variante síncrona para documentos livianos.
- **Dependencias de infraestructura (resueltas)**: storage S3 con **MinIO self-hosted** (OQ-006 — el contrato de URL firmada no cambia) y cola de jobs **BullMQ en v1** (OQ-007 / ADR-012 Accepted).
- **Sin datos sensibles en logs ni access logs de S3** (SECURITY.md §5.7); `Cache-Control: private`.
- FASE 0: solo documentación. Los bloques fenced son ilustrativos.

## 4. Dependencias

- `docs/MASTER-SPEC.md` §10, §11.2 (PDF | servicio backend especializado), §11.6, §6 BR-008/018, §4.3 (EXPORT), §13 (design tokens).
- `architecture/ADR/ADR-013` (PDF Generation — **Accepted**, OQ-005 resuelta), ADR-012 (Background Jobs — **Accepted**, OQ-007 resuelta), ADR-001 (módulo pdf dentro del monolito), ADR-007 (contrato REST), ADR-009 (RBAC/BR-018), ADR-010 (auditoría EXPORT).
- Hermandos W2: `AUTHORIZATION.md` §5.2/§5.5 (`cargo.export_pdf`), `AUDIT.md` §5.2/§5.3 (EXPORT), `SECURITY.md` §5.7 (PDF y archivos), `ARCHITECTURE.md` §5.9 (flujo F4).
- Downstream: `backend/API.md` §5.7 (export-pdf, contrato documentado por W5), `frontend/COMPONENTS.md` §6.16 (PdfExportButton), `backend/JOBS.md` (W5).
- `docs/OPEN-QUESTIONS.md`: OQ-005 (estrategia — **resuelta**, Puppeteer/Chromium), OQ-006 (S3 — **resuelta**, MinIO self-hosted), OQ-007 (jobs v1 — **resuelta**, BullMQ).

## 5. Decisiones

### 5.1 Contrato de API

**Endpoint canónico (MASTER-SPEC §10)**: `POST /api/v1/cargos/:id/export-pdf`.

- **Autenticación**: Bearer access token (ADR-008).
- **Autorización**: `cargo.export_pdf` — concedido a Viewer, Operator y Admin (AUTHORIZATION.md §5.7; BR-018: viewer exporta autorizado, sin datos no autorizados).
- **Respuesta síncrona vs asíncrona** (OQ-005/OQ-007 resueltas 2026-09-24):
  - **Síncrono** (documentos livianos): `200 OK` con `application/pdf` (binario), con timeout (ADR-012 Accepted mantiene la variante para documentos livianos).
  - **Asíncrono** (documentos grandes, cola `pdf-exports`): `202 Accepted` con estado y enlace de descarga, sin transmitir el binario por la API:

```json
{ "data": { "exportId": "uuid", "status": "PROCESSING",
            "downloadUrl": "/api/v1/exports/uuid/file" } }
```

- **Consumo del frontend**: `PdfExportButton` solicita, muestra progreso no bloqueante y descarga (directa si 200 binario, o vía URL firmada si 202 → file). Error visible y reintentable (ADR-013 §Contexto; COMPONENTS.md §6.16 estados loading/error).
- **Errores posibles**: 401/403 (BR-018), 404 `CARGO_NOT_FOUND` (BR-003), 409 si ya existe un export en curso para esa carga (idempotencia por exportId) — API.md §5.7.
- **Verbo resuelto (OQ-017/ID-001)**: el endpoint canónico es **POST** con body opcional `{ includeMovements?: boolean }` (`MASTER-SPEC` §10 y `backend/API.md` §5.7 alineados).
- **Parámetros del documento** (OQ-005 resuelta; detalle en §5.7): inclusión de movimientos (default true) y de alertas activas; extensión futura a otros tipos de export vía el mismo servicio (módulo `reports`, ADR-013 §Integración).

### 5.2 Estrategia de generación (OQ-005 resuelta → Puppeteer/Chromium)

**Decidida (OQ-005, 2026-09-24)**: **HTML → PDF server-side con Chromium headless vía Puppeteer**, plantillas HTML propias del módulo, render sin JavaScript (ADR-013 Accepted).

- Plantillas Handlebars propias alineadas a los design tokens (MASTER-SPEC §13), CSS embebido en el HTML (sin hojas externas); formato A4; encabezado/pie con marca, número de página y timestamp de generación (ADR-013).
- Chromium con sandbox y **sin acceso a red saliente** (carga remota deshabilitada — SSRF y exfiltración); todo texto de usuario (códigos heterogéneos tipo `029TERRA26`, observaciones) **escapado** en la plantilla (ADR-013 §Decisión).
- Fidelidad: la alternativa (librerías nativas PDFKit/pdfmake) queda descartada por fidelidad visual y layout manual; wkhtmltopdf/WeasyPrint y servicios externos tienen limitaciones de mantenimiento/seguridad de datos (ADR-013 §Alternativas). El servicio externo queda rechazado para v1 (OQ-006 resuelta a favor de MinIO self-hosted: los datos no salen del predio — ADR-013 alternativa 4).
- **Snapshot en el momento del encolado/solicitud**: los datos (estado, ubicación, movimientos, alertas) se congelan al generar; el PDF estampa el timestamp para trazabilidad (BR-008) y evita ambigüedad si la carga cambia durante la generación (ADR-013 §Negativas).

### 5.3 Pipeline: asíncrono (cola) vs síncrono

**Flujo asíncrono (cola `pdf-exports` con BullMQ en v1 — OQ-007 resuelta, ADR-012 Accepted)**:

1. `POST /cargos/:id/export-pdf` → AuthGuard + PermissionsGuard (`cargo.export_pdf`, BR-018) → valida carga existente (BR-003) → registra `AuditAction.EXPORT` (misma transacción/contexto) → encola job con `cargoId` + snapshot.
2. Worker (ADR-012: en proceso en v1, proceso separado si se extrae) consume → renderiza con el motor de §5.2 → sube a S3 (OQ-006) con clave inmutable.
3. Endpoint de estado/descarga: el frontend consulta `downloadUrl` → el backend **revalida permisos** sobre el recurso (BR-018; S3 no conoce roles de CargoOps — SECURITY.md §5.7) → emite **URL firmada con expiración corta** (recomendada: 15 min) → descarga única o TTL corto.
4. **Retry/backoff** y **dead-letter** con alerta operativa (ADR-012); concurrencia de workers limitada (recomendado 1–2 renders simultáneos por instancia en v1, según memoria — ADR-013); timeout y límite de tamaño por job; documentos muy grandes se mitigan con paginación del HTML y límite por job (ADR-013 §Negativas).

**Flujo síncrono (documentos livianos, variante de la decisión OQ-007)**:
- Generación directa con timeout (documentos livianos) y respuesta `application/pdf`; sin caché S3 ni retry robusto; el usuario reintenta manualmente (ADR-012 opción alternativa, ADR-013 §Negativas). El módulo `pdf` se invoca igual vía el mismo puerto `generatePdf(input)` — el cambio de modo es de orquestación, no de código del módulo (ADR-012).

**Desacople del módulo `pdf`** (ADR-001): servicio dentro del monolito con puerto `generatePdf(input)`; si el volumen crece, se extrae a servicio propio sin reescribir la interfaz (SCALABILITY.md §5.8).

### 5.4 Almacenamiento y URLs de descarga

- **Bucket privado** (políticas de acceso mínimas); nunca archivos estáticos públicos (SECURITY.md §5.7).
- **Clave inmutable** derivada de `cargoId` + hash del snapshot: `exports/cargos/:id/<hash>.pdf` (ADR-013) — regenerable y con caché natural: el mismo estado no se regenera dos veces (si el hash coincide, se reutiliza la URL firmada).
- **URL firmada con expiración corta** (15 min recomendado; firmada por **MinIO self-hosted** — OQ-006 resuelta).
- **Revalidación de permisos al firmar** (BR-018): el backend emite la URL solo si el solicitante tiene `cargo.export_pdf` y el recurso sigue existiendo; si la carga fue soft-deleted tras encolar, la descarga se bloquea.
- `Cache-Control: private`; sin query params sensibles en access logs (SECURITY.md §5.7).

### 5.5 Seguridad (BR-018, filigrana, expiración)

- **Permisos**: `cargo.export_pdf` en el guard; revalidación de recurso en el service (carga autorizada); **filtrado de datos**: el PDF de una carga solo contiene datos de ESA carga (movimientos/observaciones/alertas de la misma); los datos de otras cargas nunca se incluyen.
- **Filigrana (watermark)**: el documento lleva filigrana con el **usuario exportador**, **fecha/hora** y `requestId` (coherente con el pie de página del ADR-013); contenido definido en §5.7 (OQ-005 resuelta). Objetivo: desalentar y rastrear reenvíos de documentos fuera de la plataforma.
- **Expiración**: descargas solo vía URL firmada corta; un PDF ya descargado no es revocable (riesgo residual inherente, documentado — ADR-013 §Negativas).
- **Auditoría**: `AuditAction.EXPORT` con `metadata: { exportId, cargoId }` en cada solicitud (AUDIT.md §5.2); los intentos sin permiso reciben 403 sin exponer datos.
- **Ambiente de render aislado**: sin red saliente, sin carga remota, tiempo y memoria acotados (ADR-013).

### 5.6 Retención y borrado de archivos

- Los PDF en S3 son **artefactos inmutables** (clave con hash) y sirven de caché; no se borran por acción de usuario en v1.
- **Política de retención/lifecycle**: NO definida (el ADR-013 no la fija). Pendiente de decisión (§9 P2): opciones en análisis — (a) lifecycle por antigüedad (p. ej. N días, con regeneración bajo demanda), (b) retención coordinada con la política de audit (AUDIT.md §9 U2), (c) borrado manual solo por operación administrativa con auditoría. En v1 se recomienda **retención por TTL largo con regeneración bajo demanda** (el artefacto es derivable), sin bloqueo de implementación.
- **Regeneración**: siempre posible desde el snapshot o estado actual (mismo endpoint); el hash de snapshot permite el caché y evita duplicados.
- La **purga** nunca es automática desde runtime sin política escrita (coherente con ADR-011/ADR-010); si se define borrado, se audita.

### 5.7 Estructura del documento y plantillas

**Contenido del PDF** (ADR-013 §Contexto; P3 pendiente de validar campos exactos):

| Bloque | Contenido | Fuente |
| --- | --- | --- |
| Encabezado | Marca CargoOps, título del documento, código de carga, fecha/hora de generación | Plantilla + snapshot (tokens §13) |
| Datos de la carga | Código (`029TERRA26`…), descripción, estado, ubicación actual, fechas (ingreso, estimada) | `Cargo` (snapshot) |
| Línea temporal de movimientos | Fecha, origen→destino, estados, usuario, observación (BR-006/007) | `Movement` + `Observation` |
| Alertas activas | Tipo, severidad, estado, `dueAt` | `Alert` abiertas de la carga |
| Pie | Número de página, timestamp, `requestId` + filigrana (usuario exportador) | Generado en render (§5.5) |

**Plantillas**: HTML propio del módulo `pdf`, Handlebars, CSS embebido (sin hojas externas ni red saliente, ADR-013). Alineadas a los design tokens (MASTER-SPEC §13: `primary #2563EB`, `surface #FFFFFF`, tipografía e íconos de `brand/`); formato A4, márgenes estándar, tabla de movimientos paginable (limite por job para historiales largos, §5.3).

```html
<!-- Ilustrativo (documentación) — esqueleto de plantilla, nada de esto se renderiza desde input de usuario -->
<div class="header">
  <span class="brand">CargoOps</span>
  <span class="doc-id">Código: {{cargo.code}} — exportado {{generatedAt}}</span>
</div>
<section class="cargo-data">…</section>
<section class="timeline">
  <table>
    {{#each movements}} <tr><td>{{movedAt}}</td><td>{{fromLabel}} → {{toLabel}}</td>…</tr> {{/each}}
  </table>
</section>
<div class="footer">Página {{page}} · request {{requestId}}</div>
```

**Escapado obligatorio**: código de carga, observaciones y `name`/`description` (texto de usuario con formatos heterogéneos) se escapan en la plantilla (Handlebars `{{ }}`); el render deshabilita JavaScript y carga remota (ADR-013 §Decisión).

### 5.8 Consumo desde el frontend (`PdfExportButton`)

- **Contrato con la UI** (COMPONENTS.md §6.16): input `permitted` (visible solo con `cargo.export_pdf`, autorización guard del frontend = UX únicamente, BR-009); estados `idle | loading | error | success`; la descarga se inicia desde el navegador (blob/download) cuando la respuesta es binaria, o con la `downloadUrl` cuando es 202.
- **Interacción**: el botón no bloquea la operación (progreso no bloqueante, ADR-013); mientras el export se genera, el usuario sigue operando el dashboard; el `ToastHost` (NOTIFICATIONS.md §5.4, COMPONENTS.md §7) informa el resultado.
- **Error visible y reintentable**: 403 (permiso denegado), 404 (`CARGO_NOT_FOUND`, BR-003), 409 (export en curso — idempotencia por `exportId`), 5xx (fallo de generación); el usuario reintenta con el mismo snapshot sin volver a cargar la pantalla.
- **Regla de oro**: el frontend NUNCA recibe los datos crudos de la carga para componer el documento (SECURITY.md §5.7, BR-018); el HTML/PDF se genera 100% en backend. Si la respuesta asíncrona vence (URL firmada expirada), el botón solicita re-firma/regeneración — no reintenta descargar una URL inválida.

### 5.9 Estado del export, reintentos y observabilidad

- **Modelo de estados del job** (`pdf-exports`, ADR-012): `PROCESSING → READY | FAILED | EXPIRED`. El endpoint de estado consulta el job (cola) o el artefacto en S3 (si existe y no expiró → `READY` con `downloadUrl` firmada). `EXPIRED` se deriva del TTL de la URL firmada; el cliente puede solicitar nuevamente (regeneración bajo demanda, §5.6).
- **Reintentos**: retry con backoff para fallos transitorios del render (límite recomendado 3 intentos, ADR-012); **dead-letter** con alerta operativa (canal `notifications`, NOTIFICATIONS.md §5.6) cuando el motivo es permanente (plantilla inválida, datos corruptos). El fallo de un export nunca degrada el request path: el endpoint solo encola (§5.3).
- **Idempotencia**: si para la misma carga+snapshot ya existe un artefacto (`hash` de clave, §5.4), el encolado reutiliza la URL firmada en lugar de regenerar — evita duplicados y costos de Chromium (ADR-013).
- **Observabilidad** (devops/MONITORING.md): métricas por generación (duración render, tamaño del artefacto, tiempo en cola), contador de fallos por causa (timeout/memoria/plantilla), y alerta si la cola acumula jobs > umbral. Los logs del worker no incluyen contenido del documento ni datos de carga (SECURITY.md §5.9).
- **Trazabilidad**: cada export lleva `exportId` (UUIDv7, DATABASE.md §5.1); el `AuditAction.EXPORT` con `metadata: { exportId, cargoId }` permite correlacionar el artefacto con la solicitud y el usuario (AUDIT.md §5.2). La filigrana del PDF estampa `requestId` para trazabilidad transversal (ADR-007).

### 5.10 Errores del pipeline y códigos de aplicación

| Escenario | HTTP | Código de aplicación | Detalle |
| --- | --- | --- | --- |
| Token inválido/ausente | 401 | `UNAUTHORIZED` | AuthGuard (SECURITY.md §5.3) |
| Sin `cargo.export_pdf` | 403 | `FORBIDDEN` | PermissionsGuard (AUTHORIZATION.md §5.4; BR-018) |
| Carga inexistente | 404 | `CARGO_NOT_FOUND` | Recurso borrado o nunca existió (BR-003) |
| Export en curso | 409 | `EXPORT_IN_PROGRESS` | Idempotencia por `exportId` (API.md §5.7) |
| Job fallido (render) | 502 | `EXPORT_GENERATION_FAILED` | Reintentable; dead-letter tras límite (§5.9) |
| Artefacto expirado | 410 | `EXPORT_EXPIRED` | URL firmada vencida; regeneración bajo demanda |
| Storage no disponible | 503 | `STORAGE_UNAVAILABLE` | S3/MinIO caído (OQ-006); el endpoint de encolado sigue operando |
| Estado de export desconocido (cola perdida) | 404 | `EXPORT_NOT_FOUND` | Sin artefacto ni job: se solicita nuevamente; el `exportId` queda registrado en audit (trazabilidad) |

**Compromiso**: ningún error expone datos de la carga (SECURITY.md §5.7); los detalles técnicos van al log, el cliente recibe el código de aplicación y un mensaje genérico accionable (`"La generación falló. Intente nuevamente."`).

## 6. Criterios de aceptación

- [ ] El endpoint de exportación cumple BR-018: 403 sin `cargo.export_pdf`, PDF solo con datos de la carga solicitada, revalidación de permisos al firmar la URL.
- [ ] Toda exportación genera `AuditAction.EXPORT` con `exportId`/`cargoId` (AUDIT.md).
- [ ] La generación ocurre 100% en backend; HTML escapado, sin render de contenido de usuario ni carga remota; filigrana presente (usuario/fecha/requestId).
- [ ] El pipeline documentado cubre ambas ramas de OQ-005/OQ-007 (asíncrono con cola+S3+URL firmada y síncrono con timeout) sin cambiar el contrato externo salvo el formato de respuesta (200 binario vs 202+downloadUrl), alineado a `backend/API.md`.
- [ ] Las URLs de descarga expiran (TTL corto) y el bucket es privado; `Cache-Control: private`.
- [ ] La retención de artefactos está declarada pendiente de política (§9 P2) sin inventar reglas.
- [ ] El estado del export (PROCESSING/READY/FAILED/EXPIRED) es consultable y el cliente puede reintentar sin recargar la pantalla (§5.9).
- [ ] La tabla de errores (§5.10) es coherente con el catálogo de ERROR-HANDLING.md y no expone datos de la carga en ningún mensaje.
- [ ] El worker de generación no expone datos de carga en logs y el render no tiene acceso a red saliente (SECURITY.md §5.7, ADR-013).

## 7. Archivos involucrados

- `docs/MASTER-SPEC.md` §10, §11.6, §6 BR-018, §4.3 (EXPORT), §13 · `docs/OPEN-QUESTIONS.md` (OQ-005, OQ-006, OQ-007)
- `architecture/ADR/ADR-013` (PDF Generation — Proposed), ADR-012 (Jobs — Proposed), ADR-001, ADR-007, ADR-009, ADR-010
- Hermandos W2: `AUTHORIZATION.md` §5.2/§5.5/§5.7, `AUDIT.md` §5.2, `SECURITY.md` §5.7, `ARCHITECTURE.md` §5.9 (F4)
- Downstream: `backend/API.md` §5.7, `backend/JOBS.md`, `frontend/COMPONENTS.md` §6.16, `devops/DOCKER.md` (dependencias de Chromium), `devops/BACKUP-RECOVERY.md` (S3)

## 8. Riesgos

| Riesgo | Mitigación |
| --- | --- |
| OQ-005 abierta (herramienta concreta) | Contrato y pipeline especificados para ambas ramas; ADR-013 en Proposed con recomendación. Nada bloqueado salvo la implementación del render |
| Chromium pesado en memoria | Concurrencia limitada (1–2 renders), timeout por job, caché por hash de snapshot; extracción de servicio si crece (ADR-001) |
| PDF descargado fuera de control de la plataforma | URL firmada corta, filigrana con usuario/fecha/requestId, auditoría EXPORT; riesgo residual inherente documentado |
| Datos no autorizados en el PDF | BR-018 en guard + service; filtrado por carga; revalidación al firmar |
| ~~Inconsistencia GET vs POST del endpoint export-pdf~~ | Resuelta (OQ-017/ID-001): verbo **POST** canónico; MASTER-SPEC §10/§11.6 y API.md §5.7 alineados |
| Retención de artefactos indefinida | Almacenamiento derivable (regenerable) y TTL con lifecycle pendiente de política (§9 P2) |

## 9. DECISIÓN PENDIENTE (reportar al orquestador)

| # | Pregunta concreta | Impacto | Referencia |
| --- | --- | --- | --- |
| P1 | ~~Normalizar el verbo del endpoint de exportación: `GET /api/v1/cargos/:id/export-pdf` (MASTER-SPEC §10, canónico) vs `POST` con body `{ includeMovements? }` (backend/API.md §5.7, W5). ¿Cuál prevalece y cómo queda el contrato?~~ → **RESUELTA (OQ-017/ID-001)**: verbo **POST** canónico; contrato alineado en MASTER-SPEC §10/§11.6 y API.md §5.7 | Contrato API y PdfExportButton | OQ-017 / ID-001 (2026-09-23) |
| P2 | Política de retención/lifecycle de los PDF en S3 (TTL con regeneración bajo demanda recomendado vs coordinado con retención de audit) | Costo de storage, purga | Nueva (W2) — cruzar con AUDIT.md §9 U2 |
| P3 | Contenido exacto del documento y de la filigrana (campos incluidos: movimientos/alertas; filigrana usuario+fecha+requestId estándar o personalizada) | Plantillas, validación visual | OQ-005 / ADR-013 |
| P4 | ¿El export es síncrono (diferir cola) o asíncrono con cola `pdf-exports`? | Respuesta del endpoint (200 binario vs 202+downloadUrl) | OQ-007 / ADR-012 |
| P5 | ¿El export se permite sobre cargas soft-deleted (solo lectura histórica) o solo sobre cargas activas? | Revalidación en el service | Nueva (W2) — BR-018/ADR-011 |
| P6 | ¿Firma de URLs por MinIO self-hosted o servicio cloud (y cómo se guardan las credenciales)? | Firma de URL, secretos | OQ-006 |