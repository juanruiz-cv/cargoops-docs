# CargoOps — Product Requirements Document (PRD)

> Documento de producto del grupo **W1**.
> Fuente de verdad canónica: `docs/MASTER-SPEC.md` v0.2 (ampliación §§62-70: distribución M:N de cargas y ubicaciones). Pendientes centralizados: `docs/OPEN-QUESTIONS.md` (OQ-001…OQ-045).
> Idioma del contenido: español profesional/neutral. Identificadores y filenames: inglés.

---

## 0. Estado del documento

- Versión: 0.1 — 2026-09-23 · **0.2 — 2026-09-23 (ampliación §§62-70: distribución multi-ubicación, capacidad por unidad, movimientos y descarga parciales)**
- Autor: Grupo W1 — Documentación de producto
- Estado: Borrador para revisión del orquestador (alineado a MASTER-SPEC v0.2)
- Regla de mantenimiento: PRD, PRODUCT-BACKLOG, USER-STORIES, USE-CASES y BUSINESS-RULES evolucionan juntos; todo cambio de alcance se refleja en los cinco.

---

## 1. Objetivo

Este PRD define el **qué** y el **por qué** de CargoOps para la FASE 0:

- Formaliza el problema que resuelve, la visión (§1.1 del MASTER-SPEC) y los objetivos medibles del producto.
- Fija el alcance (in/out) de la versión 1 contra las capacidades core §1.4 del MASTER-SPEC.
- Prioriza requisitos funcionales y no funcionales con **MoSCoW**, vinculados a los IDs del backlog (EPIC-xxx / FEATURE-xxx / US-xxx, esquema §19 del MASTER-SPEC).
- Declara métricas de éxito, dependencias, riesgos de producto y las DECISIONES PENDIENTE que bloquean decisiones de alcance.

Este documento **no** define: arquitectura, contratos API, diseño UX detallado, estrategia QA ni infraestructura (responsabilidad de los grupos W2–W10). Tampoco redefine decisiones canónicas: cuando un tema está resuelto en el MASTER-SPEC, aquí solo se referencia.

## 2. Contexto

CargoOps opera en un **predio logístico/aduanero** donde la mercadería ingresa en camiones, permanece en la plazoleta o se descarga hacia un galpón con 12 sectores, y pasa por áreas especiales (Scanner, Balanza, Rezago, Secuestro) (§3 y §5 del MASTER-SPEC).

El contexto operativo actual (relevado en el prompt maestro) es de **control manual disperso**: registros en planillas, ubicación de mercadería basada en conocimiento individual de operadores, movimientos sin motivo documentado y sin historial reconstruible, y rezagos que se detectan tarde o nunca. La referencia visual del predio no está presente en el workspace; la descripción textual (§3) es la fuente canónica.

CargoOps digitaliza la operación con **trazabilidad total**: cada movimiento de una carga queda registrado con su observación obligatoria, y el sistema genera alertas operativas (p. ej. permanencia > 30 días, BR-014) sin reemplazar la decisión humana.

## 3. Problema

1. **Registro y localización**: la carga se identifica por códigos alfanuméricos heterogéneos (§4.4.1) y hoy no existe un registro único confiable de qué carga está dónde.
2. **Trazabilidad**: los movimientos no se documentan ni se pueden reconstruir; no hay respuesta confiable a "¿qué pasó con esta carga y por qué?".
3. **Rezagos**: las cargas con permanencia excesiva (> 30 días) no se detectan a tiempo (BR-014); el área de Rezago existe pero su gestión es manual.
4. **Capacidad**: los sectores tienen capacidad propia, pero no hay control de ocupación que impida excederla (BR-005).
5. **Auditoría**: no existe registro de quién hizo qué; los errores se corrigen sin dejar rastro (viola el espíritu de BR-012/013).
6. **Visibilidad**: no hay una vista operativa del predio; el plano existe en papel o en la cabeza de los operadores.
7. **Control de acceso**: no hay roles; cualquier persona con acceso puede modificar datos operativos críticos.

Las cifras de mejora (§11) son aspiraciones a validar con el negocio en el pilotaje; no hay métricas baseline verificadas en el workspace.

## 4. Visión del producto

> CargoOps es una **plataforma web profesional de gestión operativa de cargas y depósitos** dentro de un **predio logístico/aduanero**. Permite registrar y controlar carga, camiones, descargas, ubicación física de mercadería, plazoleta, sectores de depósito, áreas especiales y el historial completo de movimientos, con **trazabilidad total** y **alertas operativas**. (MASTER-SPEC §1.1)

Propuesta de valor en tres pilares:

- **Saber dónde está todo**: ubicación y estado de cada carga en todo momento, sobre un plano configurable.
- **Saber qué pasó y por qué**: historial completo y reconstruible con observación obligatoria en cada movimiento.
- **Actuar antes de que sea tarde**: alertas de rezago y control de capacidad sin automatismos peligrosos (nunca mover carga automáticamente, BR-014).

## 5. Objetivos del producto

Objetivos de negocio (a validar en pilotaje, vinculados a §11):

| ID | Objetivo | Métrica asociada |
| --- | --- | --- |
| OBJ-01 | Eliminar la localización manual de cargas | Tiempo medio de localización de una carga |
| OBJ-02 | Garantizar trazabilidad total de movimientos | 100 % de movimientos con historial + observación (BR-006/007/008) |
| OBJ-03 | Detectar y gestionar rezagos > 30 días | Días entre el vencimiento de 30 días y la acción operativa |
| OBJ-04 | Evitar exceder capacidad de ubicaciones (por unidad) | 0 movimientos/segmentos que excedan `capacity` (occupiedCapacity derivado, BR-005/033/035/036) |
| OBJ-05 | Auditar toda acción sensible | 100 % de acciones sensibles con AuditLog (BR-013) |
| OBJ-06 | Separar responsabilidades por rol | 0 operaciones denegadas a Viewer/Operator fuera de su rol (BR-010/011) |

## 6. Audiencia objetivo

**Usuarios finales** (RBAC, MASTER-SPEC §8):

- **Viewer**: consulta y monitoreo (dashboard, cargas, mapa, historial, exportaciones autorizadas). Lectura pura.
- **Operator**: operación diaria (registrar cargas/camiones, mover, descargar, cambiar estados, observar).
- **Admin / Supervisor**: administración (soft delete, restauración, reversión, planos, configuración, usuarios y permisos).

**Stakeholders**: gerencia del predio (visión operativa y rezagos), supervisión aduanera/logística (trazabilidad y auditoría), operadores de graneles (uso diario).

**Consumidores técnicos**: equipos de desarrollo (backend/frontend/mobile), QA (criterios de aceptación), UX (flujos), DevOps (despliegue), PO (priorización).

## 7. Alcance

### 7.1 Dentro de alcance (v1)

El conjunto completo de capacidades core del §1.4 del MASTER-SPEC (ver §8 de este documento): registro y control de cargas y camiones, descargas (parcial/total), plazoleta, sectores, áreas especiales, movimientos con observación obligatoria, historial, plano operativo, alertas de rezago, exportación PDF, administración de planos/ubicaciones y trazabilidad. Incluye autenticación + RBAC (Fase 2) y auditoría (Fase 8) como habilitadores obligatorios.

### 7.2 Fuera de alcance (v1, diseñar sin implementar — MASTER-SPEC §1.5)

- Más depósitos, predios o sucursales; multi-tenant.
- Usuarios/permisos ya cubiertos por RBAC v1 (la extensión de gestión de usuarios avanzada queda fuera).
- Vehículos más allá de `Truck` (flota, mantenimiento, GPS).
- Documentación/fotografías/escaneo de carga.
- QR/barcodes/lectores físicos.
- Reportes/estadísticas avanzadas (módulo `reports` diferido; mínimo dentro de cargo/dashboard, §11.3).
- Aplicación móvil nativa (Fase 14 del roadmap).
- Integraciones/APIs externas y notificaciones por email/push/WhatsApp/webhook (reservadas, §4.3).
- Inteligencia operacional.

### 7.3 Restricciones de FASE 0

Solo documentación: no se escribe código de producción, HTML/CSS/TS/configs, ni se tocan archivos fuera del grupo W1 (`docs/product/`).

## 8. Funcionalidades core

Mapeo de las capacidades core del §1.4 del MASTER-SPEC a epics del backlog:

| Capacidad core (§1.4) | Epic de backlog | Fase roadmap |
| --- | --- | --- |
| Registrar cargas / controlar carga en camión | EPIC-003 | 3 |
| Registrar camiones | EPIC-004 | 3 |
| Registrar descargas (parcial/total) | EPIC-006 (FEATURE-013) | 5 |
| Ubicar cargas en el predio (plazoleta, sectores, áreas) | EPIC-005, EPIC-006 | 4–5 |
| Gestionar plazoleta / sectores / áreas especiales | EPIC-005 (FEATURE-011) | 4 |
| Visualizar estado operativo sobre plano configurable | EPIC-007 | 6 |
| Mover cargas entre ubicaciones | EPIC-006 | 5 |
| Historial completo de movimientos | EPIC-009 (FEATURE-020) | 8 |
| Observaciones obligatorias | EPIC-006 (FEATURE-015) | 5 |
| Permanencia y alertas de rezago (30 días) | EPIC-010 | 9 |
| Administrar planos y sectores | EPIC-012 | 11 |
| Consultas operacionales | EPIC-003, EPIC-007, EPIC-008 | 3–7 |
| Exportación PDF | EPIC-011 | 10 |
| Trazabilidad | Transversal (EPIC-006/009/010) | 5–9 |
| Autenticación + RBAC + auditoría (habilitadores) | EPIC-002, EPIC-009 | 2, 8 |
| Distribuir una carga en N ubicaciones (CargoLocation) | EPIC-005 (FEATURE-028) | 4–5 |
| Consultar cargas de una ubicación y ocupación por unidad | EPIC-005 (FEATURE-028/030) | 4–5 |
| Mover y descargar parcialmente (residual en camión) | EPIC-006 (FEATURE-029) | 5 |
| Sobreocupación administrativa (flag) y alerta de capacidad derivada | EPIC-005 (FEATURE-030) | 4–9 |

## 9. Requisitos funcionales (MoSCoW)

Prioridad vinculada a las fases del roadmap (§18 del MASTER-SPEC). Los IDs referencian `PRODUCT-BACKLOG.md`.

### MUST (v1 obligatorio)

| Requisito | Backlog | Fase |
| --- | --- | --- |
| RF-001 Autenticación JWT + refresh token | FEATURE-003 (US-004, US-005) | 2 |
| RF-002 RBAC con permisos validados en backend siempre (BR-009) | FEATURE-004 (US-006, US-007) | 2 |
| RF-003 Registrar carga con código único (BR-001/002) y fecha de ingreso | FEATURE-005 (US-008, US-009) | 3 |
| RF-004 Consultar y buscar cargas por código | FEATURE-006 (US-010, US-011) | 3 |
| RF-005 Registrar camiones y asociarlos a cargas | FEATURE-009/010 (US-014, US-015) | 3 |
| RF-006 Administrar ubicaciones y sus estados | FEATURE-011 (US-016) | 4 |
| RF-007 Configurar capacidad y controlar ocupación (BR-005) | FEATURE-012 (US-017, US-018) | 4 |
| RF-008 Mover cargas entre ubicaciones (BR-003/004/005/006/008) | FEATURE-013 (US-019) | 5 |
| RF-009 Descargas parcial y total (PARTIALLY_UNLOADED / STORED) | FEATURE-013 (US-020, US-021) | 5 |
| RF-010 Operar áreas especiales: Scanner, Balanza, Rezago, Secuestro | FEATURE-014 (US-022..024) | 5 |
| RF-011 Observación obligatoria en movimientos/estados (BR-006/007) | FEATURE-015 (US-025, US-026) | 5 |
| RF-012 Historial completo de movimientos por carga (BR-008) | FEATURE-020 (US-034) | 8 |
| RF-013 Auditoría de acciones sensibles (BR-013/017) | FEATURE-021 (US-035, US-036) | 8 |
| RF-014 Mapa operativo del predio con cargas y ocupación | FEATURE-017 (US-028, US-029) | 6 |
| RF-015 Dashboard con KPIs y resumen de alertas | FEATURE-019 (US-032, US-033) | 7 |
| RF-016 Alerta de permanencia > 30 días sin movimiento automático (BR-014/015) | FEATURE-022 (US-037, US-038) | 9 |
| RF-017 Exportación PDF de carga con restricción por rol (BR-018) | FEATURE-024 (US-040, US-041) | 10 |
| RF-018 Reversión de movimientos por ADMIN con historial y auditoría (BR-012) | FEATURE-016 (US-027) | 5 |
| RF-028 Distribución multi-ubicación de cargas y consultas de distribución (BR-032/033/040) | FEATURE-028 (US-046…048) | 4–5 |
| RF-029 Movimiento parcial y descarga parcial con residual en camión (BR-037/038) | FEATURE-029 (US-049, US-050) | 5 |
| RF-030 Capacidad por unidad (occupied/available), rechazo de sobreocupación y alerta de capacidad derivada (BR-033/035/036) | FEATURE-030 (US-051…053) | 4–9 |

### SHOULD (v1 deseable, fases tardías o post-v1)

| Requisito | Backlog | Fase |
| --- | --- | --- |
| RF-019 Búsqueda avanzada con filtros combinados (estado/ubicación/fecha) | FEATURE-007 (US-012) | 3 |
| RF-020 Notas de carga sin movimiento | FEATURE-008 (US-013) | 3 |
| RF-021 Gestión de estado de alertas (ACKNOWLEDGED / RESOLVED / DISMISSED) | FEATURE-023 (US-039) | 9 |
| RF-022 Editor visual de planos para ADMIN (BR-020) | FEATURE-025 (US-042, US-043) | 11 |
| RF-023 Configuración de parámetros del sistema (días de alerta, capacidad) | FEATURE-026 (US-044) | 11 |

### COULD (post-v1 o dependiente de OQ)

| Requisito | Nota |
| --- | --- |
| RF-024 Alertas de capacidad (CAPACITY) y alertas CUSTOM | Cálculo sobre `occupiedCapacity` derivado (BR-033/035) y umbral configurable (§9); la alerta de capacidad derivada pasa a MUST con RF-030 (FEATURE-030); alertas CUSTOM siguen dependiendo de la decisión sobre alertas en v1 (W1-Q4/OQ-041/OQ-043) |
| RF-025 Notificaciones fuera de la app (EMAIL/PUSH/WHATSAPP/WEBHOOK) | Reservadas en §4.3; OQ-011 |
| RF-026 Reportes/estadísticas avanzadas | Módulo `reports` diferido (§11.3) |
| RF-027 Split de cargas (CargoItem) | **OQ-002 resuelta (secciones 62-70)**: CargoItem NO se introduce en v1; la distribución se modela vía `CargoLocation`; el modelo queda compatible a futuro (§4.4-5) |

### WON'T (esta versión)

- Multi-tenant / multi-predio (§1.5).
- QR/barcodes/lectores físicos.
- Fotografías/escaneo de documentación.
- App móvil nativa (Fase 14).
- Integraciones externas y APIs de terceros.
- Inteligencia operacional / machine learning.

## 10. Requisitos no funcionales (MoSCoW)

### MUST

- **Seguridad**: autenticación JWT + refresh (ADR-008); autorización SIEMPRE en backend (BR-009); contraseñas con hash; soft delete (BR-013); auditoría con IP/userAgent equilibrados con privacidad (BR-017); no exponer datos no autorizados en exportaciones (BR-018).
- **Trazabilidad**: todo movimiento/estado genera historial (BR-008); coverage de auditoría en acciones críticas (BR-013).
- **Validaciones**: transiciones de estado validadas por state machine en backend (BR-016); observación obligatoria (BR-006/007); capacidad por unidad compatible (BR-005/033/035/036); consistencia de distribución Σ ≤ total (BR-034); unicidad de código (BR-002).
- **Rendimiento**: operación fluida en desktop-first; cargas de listados y mapa sin degradación perceptible con los volúmenes del predio (objetivo: respuestas de API P95 < 500 ms en operación normal; ver `architecture/PERFORMANCE.md`).
- **Accesibilidad**: objetivo WCAG 2.2 AA (§12) — navegación por teclado, focus, contraste, labels/ARIA; el mapa debe tener alternativa accesible (listado).
- **Responsive**: desktop-first; correcto en notebook/tablet/móvil (móvil: drawer para mapa, sin clonar desktop).
- **Manejo de errores**: envelopes de error consistentes (§10); estados vacíos y de loading en UI; mensajes accionables.
- **Disponibilidad/operabilidad**: health check, logs estructurados, backups; ambientes development/staging/production (§14).
- **Idioma**: UI inicial es-AR (§16, OQ-012).

### SHOULD

- **PWA**: instalable, caching, offline parcial; movimientos críticos NO offline sin estrategia transaccional (§12).
- **Observabilidad**: monitoreo y métricas básicas de infraestructura y dominio.
- **i18n**: arquitectura lista para inglés, sin traducir en v1 (OQ-012).

### COULD

- SSR (OQ-010).
- Caché/Redis + jobs BullMQ **adoptados en v1** (OQ-007 resuelta 2026-09-24 → ADR-012: jobs reales).

### WON'T

- Alta disponibilidad multi-región / failover automático en v1.
- SLA formal de 99,99 % (definir con DevOps en OQ-016).
- Offline total de operaciones críticas.

## 11. Métricas de éxito

Valores objetivo **aspiracionales** (línea base a establecer en el pilotaje con el negocio):

| Métrica | Objetivo | Dónde se mide |
| --- | --- | --- |
| Tiempo medio de localización de una carga | < 1 min por operador | Pilotaje (observación) |
| Tiempo medio de registro de carga | < 2 min | Pilotaje (observación) |
| % de movimientos con observación válida | 100 % (garantizado por regla BR-006/007) | Backend (validación) |
| % de movimientos con historial persistido | 100 % (BR-008) | Backend |
| N.° de cargas llegando a los 45 días sin acción | Reducción progresiva vs. baseline | EPIC-010, dashboard |
| Ocupación por sector | Disponible en tiempo real; 0 ingresos que excedan capacidad | FEATURE-012, mapa |
| % de operaciones sensibles auditadas | 100 % (BR-013) | AuditLog |
| Adopción | ≥ 80 % de los operadores usando la plataforma al mes 3 del pilotaje | Logs de uso |

## 12. Dependencias

1. **Decisiones bloqueantes resueltas** (OPEN-QUESTIONS, 2026-09-23/24): OQ-001 → **BR-002** (unicidad de código → FEATURE-005), OQ-004 → **BR-043** (egreso/retiro → ciclo de vida), OQ-008 → **BR-014/015** (días corridos y segunda alerta → FEATURE-022), OQ-009/OQ-041 → **BR-041** (cálculo de ocupación por unidad y unidad por defecto por LocationType → FEATURE-012/017/030), OQ-014 (capacidad de Plazoleta en camiones → FEATURE-012), OQ-015 (editor fuera de v1: vista estática → FEATURE-025), OQ-042 → **BR-042** (residual "en camión" derivado → FEATURE-029), OQ-043 → **BR-036 ampliada** (sobreocupación administrativa → FEATURE-030), OQ-044 → **BR-048** (conversión de unidades → FEATURE-029), OQ-045 → **BR-049** (semántica de `percentage` → FEATURE-028). **OQ-002 quedó resuelta (secciones 62-70)**: distribución vía `CargoLocation`; CargoItem no se introduce en v1.
2. **Decisiones habilitantes de implementación** (W3, ADR-001…013): modular monolith, stack frontend/backend/DB/ORM, mapa SVG, PDF (OQ-005 → ADR-013 resuelta: HTML→PDF server-side), storage (OQ-006 → MinIO self-hosted), jobs (OQ-007 → ADR-012: BullMQ en v1).
3. **Datos**: seeds de ubicaciones y cargas de ejemplo (§5) son de documentación/pruebas, no fuente operativa.
4. **Documentos derivados**: USER-STORIES.md (criterios por rol), USE-CASES.md (flujos), BUSINESS-RULES.md (reglas), roadmap (`docs/roadmap/`).

## 13. Riesgos de producto

| # | Riesgo | Impacto | Mitigación | Estado |
| --- | --- | --- | --- | --- |
| R-01 | ~~OQ-001 (unicidad de código) sin resolver bloquea el alta masiva de cargas~~ → **cerrado (BR-002, 2026-09-23)** | Alto — FEATURE-005 | Resuelto: regex `^[A-Z0-9][A-Z0-9./-]{2,31}$` + normalización a mayúsculas + unicidad case-insensitive | ✅ Cerrado |
| R-02 | ~~OQ-004 (egreso/retiro) no definido deja el ciclo de vida incompleto~~ → **cerrado (BR-043, 2026-09-23)** | Alto — vida de la carga | Resuelto: flujo de egreso `EXIT` + observación obligatoria, `EXITED` terminal | ✅ Cerrado |
| R-03 | ~~Cálculo de capacidad ambiguo (OQ-041/044)~~ → **cerrado (BR-041/048, 2026-09-23/24)** | Alto — FEATURE-012 | Resuelto: unidad efectiva por LocationType/override; sin conversión en v1 | ✅ Cerrado |
| R-04 | Observación obligatoria percibida como fricción → movimientos fuera del sistema | Medio — adopción | UX minimalista (dialog rápido), preselección de motivos comunes | Mitigable en W6 |
| R-05 | Rezagos: confusión entre "alerta" y "estado Rezago" | Medio — operación | BR-014 (nunca mover automáticamente); flujo explícito en USE-CASES (UC-010) | Controlado |
| R-06 | ~~Editor de planos (Fase 11) demasiado ambicioso para v1~~ → **cerrado (OQ-015, 2026-09-24)** | Medio — scope | Resuelto: vista estática en v1 + edición asistida de sectores diferida | ✅ Cerrado |
| R-07 | Adopción: dependencia previa del conocimiento individual de operadores | Medio | Mapa operativo + búsqueda por código; capacitación en pilotaje | - |
| R-08 | Datos de prueba irreales (códigos de §5) confundidos con datos operativos | Bajo | Marcar seeds como no operativos; ambientes separados | - |

## 14. Restricciones

- FASE 0: solo documentos Markdown en `docs/product/` (este grupo); no modificar archivos ajenos.
- v1: arquitectura modular monolith (ADR-001), stack §11.2, una sola base de datos, sin microservicios.
- Reglas de negocio canónicas obligatorias en v1 (detalle en `BUSINESS-RULES.md`): **BR-001…BR-020 y BR-032…BR-040** (ampliación §§62-70); BR-021…BR-031 siguen `[PROPUESTA]`.
- Sin hard delete en operaciones (BR-013): soft delete + auditoría.
- UI inicial es-AR; arquitectura i18n lista (OQ-012).
- Permanencia por defecto desde `entryDate` (BR-014/015); OQ-008 resuelta 2026-09-23: días **corridos**, alerta a los 30 y segunda a los 40.
- No se puede mover una carga automáticamente a Rezago (BR-014).

## 15. Decisiones

Decisiones de producto adoptadas (heredadas del MASTER-SPEC, se referencian, no se redefinen):

- D-01 Código de carga como string con formatos heterogéneos (§4.4.1); unicidad según OQ-001.
- D-02 `CargoStatus` separado de la ubicación física (§4.4.2): una carga puede estar STORED en un sector o IN_TRUCK en la plazoleta.
- D-03 `Observation` como entidad propia con relación 1:1 al movimiento (§4.4.3).
- D-04 Soft delete + audit log + revert para información operacional crítica (§4.4.4).
- D-05 Cargas parciales/distribución modeladas vía `CargoLocation` (cantidad, unidad, porcentaje opcional; secciones 62-70). OQ-002 resuelta: CargoItem NO se introduce en v1 (§4.4-5).
- D-06 Relación camión↔carga N:1 (1 camión, N cargas) con §4.4.6; split en varios camiones fuera de v1 (OQ-003).
- D-07 `Location` como abstracción única para todo espacio (§4.4.7).
- D-08 RBAC de 3 roles con permisos (§8); guardias en backend + UX en frontend.
- D-09 Máquina de estados §7 con transiciones validadas en backend (BR-016).
- D-10 Mapa/planos como datos estructurados, no imagen (BR-020).
- D-11 Distribución M:N Cargo↔Location vía `CargoLocation`; no existe `cargo.locationId` único (§4.4-8, BR-032/033).
- D-12 Capacidad por unidad: `capacity` + `capacityUnit` + `occupiedCapacity`/`availableCapacity` derivados; sin conversión entre unidades incompatibles en v1 (§4.1, BR-035, OQ-044).

## 16. Criterios de aceptación del documento

- [ ] Coherente con MASTER-SPEC v0.1: dominio, BR, roles, enums, seeds, fases y roadmap referenciados con los IDs canónicos.
- [ ] Alcance in/out explícito; funcionalidades core del §1.4 mapeadas 1:1 a epics.
- [ ] Requisitos funcionales y no funcionales priorizados MoSCoW, sin requisitos sin dueño de backlog.
- [ ] Métricas de éxito medibles; riesgos con mitigación.
- [ ] Sin placeholders vacíos: toda ambigüedad real está en la sección DECISIÓN PENDIENTE (con pregunta e impacto) y se reporta al orquestador.

## 17. Archivos involucrados

| Archivo | Rol |
| --- | --- |
| `docs/MASTER-SPEC.md` | Fuente de verdad canónica |
| `docs/OPEN-QUESTIONS.md` | Centralización de DECISIONES PENDIENTE (OQ-xxx) |
| `docs/product/PRODUCT-BACKLOG.md` | Desglose EPIC/FEATURE/US con prioridades y fases |
| `docs/product/USER-STORIES.md` | Historias detalladas con criterios de aceptación por rol |
| `docs/product/USE-CASES.md` | Flujos principales/alternativos de las operaciones |
| `docs/product/BUSINESS-RULES.md` | Reglas BR-001…BR-020 + propuestas |
| `docs/roadmap/PHASES.md`, `docs/roadmap/IMPLEMENTATION-PLAN.md` | Secuenciación por fase (W10) |

## 18. DECISIÓN PENDIENTE

El PRD asume valores por defecto canónicos donde existen, pero las siguientes decisiones pueden cambiar alcance o reglas de v1:

| ID | Pregunta | Impacto si cambia el default |
| --- | --- | --- |
| OQ-001 | ~~Reglas exactas de unicidad/validación del código de carga~~ → **RESUELTA (OQ-001 → BR-002, 2026-09-23)**: regex `^[A-Z0-9][A-Z0-9./-]{2,31}$`, mayúsculas, único case-insensitive, 3–32 | FEATURE-005 y alta masiva |
| OQ-002 | ~~Carga parcial: unidad simple + quantity vs CargoItem desde v1~~ → **RESUELTA (secciones 62-70)**: distribución vía `CargoLocation`; CargoItem no se introduce en v1 | FEATURE-013/028, modelo de datos |
| OQ-004 | ~~¿Existe egreso/retiro de carga en v1?~~ → **RESUELTA (OQ-004 → BR-043, 2026-09-23)**: sí — `EXIT` con observación obligatoria, `EXITED` terminal | Ciclo de vida completo, estado EXITED |
| OQ-008 | ~~Días corridos/hábiles para los 30; ¿segunda alerta y cuándo?~~ → **RESUELTA (OQ-008 → BR-014/015, 2026-09-23)**: días **corridos**, base `entryDate`, alerta 30 y segunda 40 | FEATURE-022, regla de negocio |
| OQ-041 / OQ-044 / OQ-046 | ~~Unidad de capacidad por ubicación, conversión y umbrales de ocupación~~ → **RESUELTAS (BR-041 / BR-048 / OQ-046, 2026-09-23/24)**: unidad efectiva por tipo/override; **sin conversión en v1**; umbrales <70/70–90/>90 | FEATURE-012, FEATURE-030, mapa, dashboard |
| OQ-042 | ~~¿El camión se modela como Location (`CAMION`) o el residual en camión es derivado?~~ → **RESUELTA (OQ-042 → BR-042, MASTER-SPEC v0.3)**: residual derivado — el camión NO es una ubicación | FEATURE-029, BR-038 |
| OQ-043 | ~~Sobreocupación administrativa (BR-036): flag, límite de %, rol autorizante, ¿observación?~~ → **RESUELTA (OQ-043 → BR-036 ampliada, 2026-09-24)**: default **+10%**, **solo ADMIN**, observación obligatoria + auditoría `CAPACITY_CHANGE` | FEATURE-030, permisos |
| OQ-044 | ~~Conversión de unidades en movimientos parciales~~ → **RESUELTA (OQ-044 → BR-048, 2026-09-24)**: **sin conversión** — unidades compatibles o `PERCENT`; `INCOMPATIBLE_UNIT` 422 | FEATURE-029, BR-034/035 |
| OQ-045 | ~~Semántica de `percentage` en CargoLocation~~ → **RESUELTA (OQ-045 → BR-049, 2026-09-24)**: derivado de UI e informativo; input solo si unidad `PERCENT` | FEATURE-028, DTOs |
| OQ-011 | ~~Notificaciones solo in-app en v1~~ → **RESUELTA (2026-09-24)**: solo **in-app** (BR-019 desacoplada; sin email/SMS en v1) | EPIC-010, alcance de alertas |
| OQ-015 | ~~Editor de planos en v1 (Fase 11) vs vista estática previa~~ → **RESUELTA (2026-09-24)**: vista estática en v1; editor diferido | FEATURE-025, roadmap |
| OQ-012 | ~~¿Inglés en v1 o solo arquitectura i18n?~~ → **RESUELTA (2026-09-24)**: solo **es-AR** en v1; arquitectura i18n lista para futuro conmutador | Alcance de UI |
| OQ-005 | ~~Estrategia concreta de PDF~~ → **RESUELTA (OQ-005 → ADR-013, 2026-09-24)**: **HTML→PDF con Chromium/Puppeteer** (asíncrono por job) | FEATURE-024, ADR-013 |
| W1-Q1 | MovementKind en v1: enum completo vs reducido a MOVE + razones tipadas (§4.3) | API de movimientos y validaciones | 🔶 |
| W1-Q2 | Reversión: ¿solo el último movimiento de la cadena o cualquiera? | FEATURE-016, BR-012 | 🔶 |
| W1-Q3 | estimatedExpiryDate: ¿quién la define y para qué se usa en v1? | FEATURE-005, alertas futuras | 🔶 |
| W1-Q4 | Alertas CAPACITY/CUSTOM: ¿se generan en v1 o solo rechazo al exceder (BR-005)? | EPIC-010 | 🔶 |
| W1-Q5 | ~~¿Operator puede mover a Secuestro o es exclusivo de ADMIN?~~ → **RESUELTA (OQ-030 → BR-046, 2026-09-23)**: **solo ADMIN** | RBAC de FEATURE-014 |
| W1-Q6 | ~~¿La Plazoleta cuenta posiciones de camiones como capacidad?~~ → **RESUELTA (OQ-014, 2026-09-24)**: **sí** — la Plazoleta limita en UNITS (camiones) | FEATURE-012, mapa |
| W1-Q7 | ~~¿El egreso se registra como movimiento EXIT o queda postergado?~~ → **RESUELTA (OQ-004 → BR-043, 2026-09-23)**: se registra como `EXIT` con observación | FEATURE-013, historial |
| W1-Q8 | PDF: ¿solo detalle de carga o también listados por ubicación/estado? | FEATURE-024, BR-018 | 🔶 |

Todas fueron reportadas al orquestador para su incorporación a `OPEN-QUESTIONS.md`.