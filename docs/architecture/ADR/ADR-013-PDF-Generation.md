# ADR-013 — PDF Generation

- Estado: **Accepted (decisión completa: servicio backend especializado + herramienta Puppeteer/Chromium + modo síncrono/asíncrono)**
- Fecha: 2026-09-23 (decisión de servicio) · **2026-09-24 (OQ-005 resuelta — herramienta decidida)**
- Decisores: Equipo CargoOps / Software Architect

> ✅ **Herramienta resuelta (OQ-005, 2026-09-24)**: la herramienta concreta de generación es **Puppeteer/Chromium (HTML→PDF)** en el módulo backend `pdf`, según la opción 4 del análisis de alternativas. La decisión queda completa: **servicio backend especializado + Puppeteer/Chromium + modo síncrono (livianos) / asíncrono (grandes, cola `pdf-exports` + URL firmada)**.

## Contexto

CargoOps exporta PDF desde v1: la exportación de **cargas, detalle e historial** figura en las capacidades core del producto (MASTER-SPEC §1.4) y en la fase 10 del roadmap (§18), con el endpoint `POST /api/v1/cargos/:id/export-pdf` (§10, OQ-017: generación con efectos → POST) y el componente `PdfExportButton` (§11.4). El documento típico contiene los datos de la carga (código —string único, BR-002—, descripción, estado, ubicación actual, fechas), la línea temporal de movimientos (fecha, origen/destino, cambios de estado, usuario, observación obligatoria — BR-006/007) y las alertas activas. Es una salida operativa sensible de un predio logístico/aduanero, y su contenido debe ser reconstruible a partir del historial (BR-008).

Tres condicionantes enmarcan la decisión:

- **Permisos y seguridad (BR-018)**: la exportación respeta los permisos por rol (RBAC, ADR-009): no expone datos de cargas no autorizadas, y la validación ocurre **siempre** en backend (BR-009, el frontend nunca es la única capa de autorización). Toda exportación queda registrada como `AuditAction.EXPORT` en el audit log (MASTER-SPEC §4.3, ADR-010). Además, un PDF generado sale del sistema (impresión, reenvío) y deja de estar bajo el control de la plataforma: la descarga debe ser acotada en el tiempo.
- **Tamaños de documento variables**: el rango va del detalle liviano de una carga (una página) al historial completo con decenas de movimientos (documento extenso), más futuros reportes del módulo `reports` (§11.3) potencialmente mayores. Esa variabilidad condiciona el modo de generación: síncrono para documentos livianos, asíncrono para documentos pesados.
- **Estrategia concreta sin resolver (OQ-005)**: el MASTER-SPEC §11.2 fija «PDF | Servicio backend especializado (estrategia DECISIÓN PENDIENTE: ver ADR-013)» y §11.6 mantiene la estrategia de generación como DECISIÓN PENDIENTE. Lo ya decidido por la especificación maestra es el **dónde y cómo** (servicio backend especializado, contrato de exportación, permisos por rol); lo pendiente es el **con qué** (herramienta/servicio concreto).

## Decisión

Adoptar un **servicio backend especializado de generación de PDF**, dentro del monolito modular (ADR-001), como única vía de generación de documentos de exportación de la plataforma. Es la decisión canónica del MASTER-SPEC §11.2 y §11.6 y se consolida aquí con su alcance:

- **Ubicación**: un módulo `pdf` dentro del monolito modular —ADR-001 ya lo cita como módulo extraíble— que expone un puerto `generatePdf(input)` hacia el resto de los módulos. La implementación v1 puede ser mínima, siguiendo la nota de MASTER-SPEC §11.3 sobre `reports` (módulo absorbido por `cargo`/`dashboard` en v1), pero el boundary queda explícito desde el inicio para poder extraerlo a servicio propio si el volumen crece (ADR-001, MASTER-SPEC §11.1).
- **Contrato**: el endpoint de exportación (`POST /api/v1/cargos/:id/export-pdf`, ADR-007) valida RBAC (BR-018, ADR-009) y delega la generación en el módulo `pdf`. El frontend (`PdfExportButton`) solo dispara la solicitud de descarga y presenta el resultado: **jamás genera ni transforma el documento** (BR-009).
- **Sincrónico vs asíncrono según el tamaño del documento**:
  - Documentos **livianos** (detalle de carga, una página): generación **síncrona**, respuesta directa (stream) con timeout acotado.
  - Documentos **grandes** (historial completo, reportes futuros): generación **asíncrona** — job en la cola `pdf-exports` (ADR-012, Accepted v1), el PDF se almacena (S3 MinIO — OQ-006) y el cliente recibe una **URL firmada de descarga con expiración corta** (p. ej. 15 minutos) en lugar del binario por la API.
  - Un umbral configurable (páginas/movimientos estimados) decide el modo; ambos modos comparten el mismo generador Puppeteer.
- **Herramienta (OQ-005, 2026-09-24)**: **Puppeteer/Chromium HTML→PDF** — plantillas HTML propias controladas por el servidor (reusan estructura de las pantallas pero renderizan server-side), escapado de datos, sin carga remota (SSRF). Concurrencia limitada del worker y timeout configurable (PERFORMANCE.md).
- **Seguridad del documento**:
  - El snapshot se arma **server-side** con los datos autorizados al rol solicitante (BR-009/BR-018); el HTML/plantilla es controlado por el servidor, con escapado de datos y **sin carga remota** (imágenes/fuentes externas bloqueadas) para evitar SSRF y exfiltración.
  - Auditoría `EXPORT` (ADR-010) con timestamp; el PDF estampa la fecha/hora de generación para trazabilidad (BR-008) y se genera a partir de un snapshot tomado en el momento de la solicitud, evitando ambigüedad si la carga cambia durante la generación.
  - Descarga únicamente vía URL firmada de expiración corta; sin rutas públicas de archivos.
  - Los datos no salen del predio: la generación corre en infraestructura propia del sistema.

**DECLARACIÓN — herramienta decidida (OQ-005, 2026-09-24)**: la herramienta concreta de generación es **Puppeteer/Chromium HTML→PDF** (opción 4 de Alternativas, preferente del arquitecto). Justificación: fidelidad CSS casi completa (flex/grid, tablas, fuentes, design tokens MASTER-SPEC §13), plantillas HTML propias controladas por el servidor, ecosistema maduro y activo, funciona on-premise/intranet (coherente con OQ-006 MinIO self-hosted). Costos asumidos: memoria alta por worker (~200–400 MB), mantenimiento de Chromium (actualizaciones/parches), imagen Docker más pesada, primer render ~400–800 ms por documento liviano (mitigado con concurrencia limitada del worker y timeout acorde — ver `architecture/PERFORMANCE.md`).

> **Nota ID-010 (2026-09-23)**: el borrador previo de este ADR (estado *Proposed*, con el análisis comparativo de Puppeteer del grupo W3) fue reemplazado por esta versión Accepted sin conservarse; el análisis informativo de Puppeteer/Chromium queda documentado en la opción 4 de Alternativas como insumo para cerrar OQ-005.

## Alternativas consideradas

1. **Generación en frontend (print-to-PDF del navegador o librería JS en el cliente al renderizar).** Rechazada. Rompe BR-009/BR-018: la autorización debe validarse SIEMPRE en backend; si el documento nace en el cliente, el usuario puede manipular el DOM/los datos enviados y exportar cargas no autorizadas o contenido alterado, sin auditoría fiable del evento `EXPORT`. Además, la salida depende del navegador y de la configuración de impresión de cada usuario → resultados inconsistentes y fidelidad de marca incontrolada (MASTER-SPEC §13).
2. **PDF.js client-side.** Descartada para exportación: PDF.js es un *viewer* de PDFs existentes, con capacidad de generación limitada y sin control fino de layout; y al ejecutarse en el cliente hereda los problemas de seguridad de la opción 1. Uso posible futuro: *preview* en el navegador de un PDF ya generado por el backend — nunca como generador.
3. **Librería PDF directa en backend (PDFKit / pdfmake / jsPDF server-side).** Evaluada (candidata posible para OQ-005). Ventajas: liviana, rápida, sin Chromium ni dependencias de sistema. Limitaciones para este caso: el layout se programa en coordenadas/código (no CSS), lo que hace costoso el mantenimiento visual para la timeline de movimientos y los design tokens (MASTER-SPEC §13); apta para fichas simples (p. ej. remito), no para el detalle/historial rico de CargoOps.
4. **Puppeteer/Chromium HTML→PDF server-side.** **ELEGIDA (OQ-005, 2026-09-24).** Ventajas: fidelidad CSS casi completa (flex/grid, tablas, fuentes, tokens), plantillas HTML propias controladas por el servidor, ecosistema maduro y activo, funciona on-premise/intranet. Costos: memoria alta por worker (~200–400 MB), mantenimiento de Chromium (actualizaciones frecuentes, parches de seguridad), imagen Docker más pesada, primer render ~400–800 ms por documento liviano. Mitigaciones: concurrencia limitada del worker, procesos separados si el volumen crece, plantillas versionadas y tests de fidelidad (QA, MASTER-SPEC §14).
5. **Servicio externo de generación (API de pago: DocRaptor, pdfcrowd u otros).** Rechazada para v1: los datos operativos/aduaneros **saldrían del predio** (incompatible con el control de seguridad exigido y con el despliegue on-premise/intranet previsible — relacionado con OQ-006), lock-in y costo por documento, latencia de red y dependencia de la disponibilidad del tercero. Reconsiderable solo si OQ-006 cierra en nube y el negocio aprueba el marco de reenvío de datos.

## Consecuencias

**Positivas:**

- Seguridad por diseño: permisos siempre en backend (BR-009/BR-018), auditoría `EXPORT` (ADR-010), snapshot trazable (BR-008), sin contenido no controlado ni carga remota; los datos no salen del predio.
- Consistencia: un único generador canónico → mismo layout, marca (MASTER-SPEC §13) y fidelidad para todos los roles y navegadores.
- Desacople del API: el modo asíncrono (ADR-012) evita timeouts en documentos grandes; el síncrono cubre los livianos sin infraestructura adicional.
- Boundaries del monolito respetados (ADR-001): el módulo `pdf` con puerto propio es extraíble a servicio dedicado sin reescribir la interfaz si el volumen crece (MASTER-SPEC §11.1, §1.5).
- Artefacto regenerable: con storage S3 (OQ-006), el PDF queda cacheable por (carga, hash del snapshot) y descargable por URL firmada.

**Negativas / riesgos:**

- **Performance**: el render server-side con Chromium consume memoria/CPU del backend; mitigaciones: concurrencia limitada del worker, proceso separado si el volumen crece (ADR-012), timeout acorde al tamaño del documento (documentado en `architecture/PERFORMANCE.md`).
- **Costos**: memoria de Chromium por worker, imagen Docker más pesada, actualizaciones de Chromium; en la variante asíncrona, storage adicional (S3 MinIO — OQ-006) y Redis/cola (OQ-007, ADR-012 Accepted).
- **Mantenimiento**: actualizaciones de Chromium, versionado de plantillas y tests de fidelidad; la exportación PDF es caso crítico de QA (MASTER-SPEC §14).
- **Dependencias abiertas**: este ADR queda vinculado a OQ-005 (herramienta), OQ-006 (storage) y OQ-007 (cola); si alguna cierra en dirección distinta, las subdecisiones síncrono/asíncrono y de artefacto se re-evalúan (mecanismo de actualización declarado en la Decisión).
- Un PDF ya descargado no puede revocarse (reenvío manual del archivo): riesgo residual inherente a la función; se mitiga con URL firmada de expiración corta y registro de auditoría.

## Referencias

- MASTER-SPEC §1.4 (capacidad exportación PDF), §6 BR-008 (historial reconstruible), BR-009 (autorización siempre en backend), BR-018 (permisos de exportación), §4.3 (`AuditAction.EXPORT`), §10 (endpoint `export-pdf`), §11.2 (stack: PDF servicio backend especializado), §11.3 (módulos backend), §11.6 (PDF), §13 (design tokens), §18 (fase 10 PDF).
- ADR-001 (módulo `pdf` dentro del monolito modular; extracción futura), ADR-007 (contrato REST del export), ADR-008 (autenticación del request de descarga), ADR-009 (RBAC / BR-018), ADR-010 (auditoría de exportaciones), ADR-012 (cola `pdf-exports`, síncrono vs asíncrono).
- OQ-005 (herramienta concreta — **resuelta 2026-09-24: Puppeteer/Chromium**), OQ-006 (storage S3 MinIO self-hosted), OQ-007 (Redis + BullMQ en v1 — ADR-012 Accepted).
- `architecture/PERFORMANCE.md` (impacto del render, pendiente de creación por grupo W2), `architecture/PDF-EXPORT.md` (detalle funcional del export, pendiente de creación por grupo W2).