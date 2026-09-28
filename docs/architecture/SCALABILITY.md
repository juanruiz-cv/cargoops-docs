# CargoOps — Escalabilidad (SCALABILITY.md)

> Grupo W2 · Arquitectura · Fuente de verdad: `docs/MASTER-SPEC.md` §1.5 (crecimiento futuro: diseñar, NO implementar), §4.4.7 (Location como abstracción), §11.1 (monolito modular con boundaries extraíbles).
> Estado: borrador FASE 0 (documentación). Este documento explica CÓMO la arquitectura habilita el crecimiento sin reescribir y CUÁNDO extraer servicios. Ninguna de las capacidades aquí descritas se implementa en v1.

## 1. Objetivo

Documentar el camino de crecimiento de CargoOps (MASTER-SPEC §1.5): multi-warehouse/multi-site/multi-tenant, móvil, QR/barcode/lectores, IoT/cámaras/sensores, integraciones/APIs, notificaciones multi-canal, reportes custom e inteligencia operacional — mostrando qué habilitadores de la arquitectura actual los soportan y los criterios para extraer servicios del monolito modular (ADR-001) sin reescritura.

## 2. Contexto

MASTER-SPEC §1.5 lista el crecimiento futuro como requisito de **diseño**: «La arquitectura debe habilitarlo sin reescribir (ver SCALABILITY.md)». El diseño ya incorpora los habilitadores: monolito modular con puertos entre módulos (ADR-001), `Location` como abstracción única de espacio físico (§4.4.7), planos como datos estructurados con `MapElement` extensible (BR-020/ADR-006), soft delete + auditoría (ADR-010/011), RBAC con permisos granulares (ADR-009), i18n desde el inicio (OQ-012), notificaciones desacopladas (BR-019) y jobs con colas (ADR-012). El prompt original referencia una sección §37; **el MASTER-SPEC canónico v0.1 no la contiene** (24 secciones): este documento se ancla en §1.5 y §4.4.7 y en los ADR.

## 3. Restricciones

- **Nada de esto se implementa en v1** (MASTER-SPEC §1.5: «diseñar, NO implementar»).
- El crecimiento se habilita **sin reescritura**: cambio de configuración, de seeds o adición de módulo/canal — no reescritura del dominio.
- **Criterios de extracción** explícitos (§5.8): no se extrae por moda; se extrae cuando hay señal medible.
- La arquitectura de datos no cambia de motor: PostgreSQL sigue siendo la base transaccional (ADR-004); si el volumen lo exige, particionado (ADR-010) primero, servicios dedicados después.
- FASE 0: solo documentación.

## 4. Dependencias

- `docs/MASTER-SPEC.md` §1.5, §4.4.7, §11.1/§11.3, §12 (móvil), §18 (roadmap), §22 (repos futuros: `cargoops-mobile`).
- `architecture/ADR/ADR-001` (extracción de módulos), ADR-002 (Angular/SSR), ADR-004 (UUID/particionado), ADR-006 (elementTypes futuros), ADR-007 (REST + evolución GraphQL), ADR-008 (API keys futuras/SSO), ADR-009 (multi-tenant futuro), ADR-010/011 (datos históricos), ADR-012 (jobs/multi-instancia), ADR-013 (módulo pdf extraíble).
- Hermandos W2: `AUTHORIZATION.md` §5.1/§9 (permisos efector/multi-tenant), `NOTIFICATIONS.md` §5.6 (expansión de canales), `MAP-ENGINE.md` §5.5 (elementTypes futuros), `AUDIT.md` §5.9 (CDC/ledger futuro), `DATABASE.md` §5.1 (UUIDv7) y §5.3 (MapType futuro).
- `docs/OPEN-QUESTIONS.md`: OQ-006/007/010/011/012/016 (habilitadores pendientes de confirmar).

## 5. Decisiones

### 5.1 Habilitadores transversales (por qué no se reescribe)

| Capacidad futura | Habilitador de la arquitectura v1 | Referencia |
| --- | --- | --- |
| Nuevos servicios/microservicios | Monolito modular: puertos/servicios públicos entre módulos, sin acceso a tablas ajenas | ADR-001, ARCHITECTURE.md §5.1 |
| Nuevos espacios/predios | `Location` como abstracción única (§4.4.7); `MapType` futuro SECTOR/GALPON; `Map` por predio | MASTER-SPEC §4.4.7, DATABASE.md §5.3, MAP-ENGINE.md §5.5 |
| Nuevos tipos de piezas del plano | `MapElement.elementType` extensible (RUTA/ZONA/PUERTA/CAMARA/SENSOR/TRUCK_POS) | MAP-ENGINE.md §5.5, ADR-006 |
| Permisos más finos o por tenant | Modelo `Permission`/`RolePermission` granular + posible scope por tenant; evolución ABAC documentada | ADR-009, AUTHORIZATION.md §5.1 |
| Multi-instancia del backend | Jobs idempotentes con dedupe en DB (alertas), despliegue multi-instancia previsto | ADR-012, ARCHITECTURE.md §5.10 |
| Códigos de carga heterogéneos (nuevos clientes) | Código como string + unicidad normalizable (OQ-001); búsqueda `pg_trgm` | MASTER-SPEC §4.4.1, ADR-004 |
| Historial sin pérdida | Soft delete + audit + revert; particionado por rango para volumen | ADR-010/011, AUDIT.md §5.8 |
| UI en otros idiomas | i18n desde el inicio (es-AR default, claves externas) | ADR-002, OQ-012 |
| Canales de notificación nuevos | `NotificationProvider` (BR-019) + canales reservados; enums aditivos | NOTIFICATIONS.md §5.6, ADR-012 |

### 5.2 Multi-warehouse / multi-site / multi-tenant

- **Qué NO cambia**: el dominio (cargas, movimientos, ubicaciones como abstracción, RBAC, audit) es neutral al predio: una `Location` pertenece a un plano de un predio; un `Map` describe un predio (`MapType.PREDIO`). Agregar un predio = agregar locations + maps + seeds, sin tocar servicios de dominio.
- **Opciones de tenancy (a decidir CUANDO se presente el requerimiento, no ahora)**:
  1. **Fila con `tenant_id`** (multi-tenant lógico): todos los predios en una base; filtraje por tenant en repositorios; más barato, exige disciplina de filtros. Habilitado hoy por: UUIDv7 como PK (DATABASE.md §5.1, §11 D1 — evita colisiones de consolidación), permisos por rol + scope futuro por tenant (ADR-009).
  2. **Base por predio** (físico): aislamiento total, más operación; corresponde si hay requisitos regulatorios de separación de datos del ente aduanero.
  3. **Schema-per-tenant en la misma instancia**: punto medio; costo de migraciones multi-schema.
- **RBAC multi-tenant**: el motor (Role/Permission/RolePermission) no cambia; el alcance del permiso se restringe por tenant (permiso + scope). Es la evolución ABAC documentada en ADR-009 (atributo «predio» como condición) — el punto de inserción ya existe (permiso de feature en guard + reglas de dominio en service).
- **CRITERIO de activación**: multi-tenant real (predios de clientes distintos) es el único caso que puede tensionar la columna de unicidad global y la operación de `settings` por predio — en ese momento se elige la opción de tenancy con el negocio (no antes). Mientras sea «más sucursales del mismo operador», una base única + datos por predio alcanza (opción 1).
- **Identidad de datos**: `Location.code`, `Map.code`, `Truck.plate`, `Cargo.code` son únicos globales hoy; con multi-predio la unicidad pasa a ser por predio — OQ-001 (normalización de código) debe contemplar el scope (DECISIÓN PENDIENTE, §7).

### 5.3 Móvil

- El frontend web ya es responsive (desktop-first, correcto en notebook/tablet/móvil — MASTER-SPEC §12) y PWA instalable (OQ-010). El roadmap contempla `cargoops-mobile` futuro (§22) — posibilidad nativa o PWA avanzada.
- **Habilitadores**: API REST `/api/v1` completa y versionada (ADR-007), auth JWT + refresh (ADR-008: el cliente móvil usa el mismo refresh cookie-free — el contrato Bearer ya está), mapa con drawer inferior (MASTER-SPEC §12), SSR/pwa según OQ-010.
- Sin cambios de backend para móvil: operaciones de lectura + movimientos con observación (BR-006/007) son las mismas transacciones; el móvil en el predio (lectores de mano) consume los mismos endpoints.
- Offline transaccional: sigue siendo NO en movimientos críticos salvo estrategia explícita (MASTER-SPEC §12).

### 5.4 QR / barcode / lectores

- El **código de carga es string** (`029TERRA26`, `JV028/2026CH`…) — los lectores (láser/cámara) inyectan el texto; el buscador ya normaliza y consulta por código (BR-002, OQ-001; `pg_trgm` con ADR-004/005).
- **Habilitadores**: endpoint de búsqueda existente (`GET /cargos?filter=code`/`search`, API.md §5.1), DTOs reutilizables, y un módulo futuro (`scanning`) que integre el evento de lectura como entrada del flujo de operación (una `search` + confirmación), sin tocar el core.
- QR en documentos (código de carga en PDF — PDF-EXPORT.md) y en etiquetas de ubicación (código de `Location`) son aditivos de UI/documentos.
- Decisión pendiente asociada: soporte formal de hardware (lectores con teclado-HID vs SDK) — ver §7.

### 5.5 IoT / cámaras / sensores

- **Plano**: cámaras, sensores y puertas ya están previstos como `elementType` futuros en el motor de mapa (MAP-ENGINE.md §5.5) — la posición y el estado viven en `MapElement.properties`; el motor de render no cambia.
- **Ingesta**: los eventos de sensores (ocupación de puerta, balanza, sensor de presencia) llegan por un módulo de integraciones futuro (`integrations`/`iot`), que publica eventos de negocio al dominio; las alertas `CUSTOM`/`CAPACITY` ya modelan el ciclo (MASTER-SPEC §4.1, AlertType).
- **Alertas/notificaciones**: los eventos IoT alimentan el pipeline de alertas + notificaciones existente (BR-019, NOTIFICATIONS.md §5.6) — los canales nuevos (PUSH/WHATSAPP) son reservados.
- **Analítica en streaming**: si se adopta event sourcing/CDC hacia almacén de análisis, el ADR-010 documenta la condición (revisitar Change Data Capture); no bloquea v1 (AUDIT.md §5.9).

### 5.6 Integraciones / APIs expuestas

- **API pública**: los contratos REST + OpenAPI (ADR-007) ya son consumibles por terceros; el versionado `/api/v1` → `/api/v2` protege la evolución (MASTER-SPEC §10).
- **Auth de integraciones**: API keys por servicio (cierre de sesión de terceros) es la evolución reservada del ADR-008 (alternativa 4); OAuth 2.0/OIDC queda para SSO corporativo y clientes externos (ADR-008 §Mejoras futuras).
- **Webhooks**: `NotificationChannel.WEBHOOK` reservado (NOTIFICATIONS.md §5.6) habilita eventos salientes (carga creada, movida, alerta) hacia sistemas del cliente; la entrega saldría por jobs con retry (ADR-012).
- **GraphQL**: ADR-007 fija la revisión cuando haya clientes externos con consultas ad-hoc o dashboard con agregaciones arbitrarias.

### 5.7 Notificaciones, reportes e inteligencia operacional

- **Notificaciones multi-canal**: expansión por proveedores + preferencias (D7) + jobs (ADR-012), sin tocar emisores (NOTIFICATIONS.md §5.6).
- **Reportes custom**: el módulo `reports` (diferido en v1 — MODULES.md §5.12) se materializa como módulo nuevo en el monolito o servicio extraído, usando los puertos de lectura existentes (cargo/locations/movements/audit) y el motor de export del módulo `pdf` (ADR-013 §Integración: `generatePdf(input)` es el punto de extensión para reportes programados/masivos).
- **Inteligencia operacional** (productividad, proyecciones, ocupación histórica): se basa en datos ya capturados (movimientos, audit, alertas, occupiedCapacity histórico reconstruible desde `movements`). Opciones: BI sobre réplica de lectura (vista materializada) o almacén analítico con CDC (ADR-010); ambas sin tocar el dominio transaccional. Los KPIs actuales en `dashboard` son la semilla (MODULES.md §5.11).

### 5.8 Criterios de cuándo extraer servicios (ADR-001)

**Señales medibles** (no percepción):
1. **CPU/memoria**: un módulo consume recursos desproporcionados (p. ej. workers Chromium del PDF, ADR-013) y degrada la API.
2. **Escala de equipo**: un módulo cambia con frecuencia y su ciclo de release bloquea al resto (equipo dedicado por dominio).
3. **Aislamiento de fallos**: un fallo de un módulo (p. ej. canal de notificaciones externo) no debe afectar la operación core.
4. **Escalamiento diferencial**: un módulo necesita replica horizontal distinta (procesos de jobs/workers — ADR-012 ya prevé workers separados como configuración de despliegue).
5. **Latencia crítica**: un módulo con requisitos de p95 propios (PDF, reportes) no debe competir con el request path.
6. **Política de despliegue**: releases independientes por equipo/feature.

**Candidatos priorizados** (según ADR-001/012/013):

| Módulo | Señal típica de extracción | Libre de reescritura porque… |
| --- | --- | --- |
| `pdf` | Memoria de Chromium, volumen creciente | Expone puerto `generatePdf(input)`; el endpoint solo encola (PDF-EXPORT.md §5.3) |
| `notifications` + jobs | Multi-canal con volúmenes y proveedores externos | `NotificationService` + `NotificationProvider` (BR-019); cola de dispatch prevista |
| `reports` | Reportes pesados/programados | Módulo nuevo con puertos de lectura; nunca toca tablas ajenas (ADR-001) |
| `alerts` | Barridos pesados + reglas custom | Job idempotente con dedupe (ADR-012); el dominio emite vía servicios públicos |
| `dashboard` (lectura) | Consultas analíticas sobre réplica | Lectura pura; puede migrar a BI/vista materializada sin tocar escrituras |

**Precondiciones para extracción sin reescritura** (las garantiza la arquitectura v1):
- Acceso entre módulos solo vía servicios públicos (ADR-001) — ya normado.
- Contrato de despliegue indiferente al transporte interno (si se separa, el puerto pasa a ser HTTP/cola/evento — el dominio no cambia).
- Firma de tokens compatible con servicios separados: RS256/ES256 si hay expectativa real (SECURITY.md §5.10 S2 — pendiente de confirmar).
- Transacciones ACID entre módulos que NO se pueden repartir (movimiento+observación+audit) permanecen juntas: la extracción se decide por módulo, no por capa.

### 5.9 Cómo se vería una extracción completa (walkthrough: módulo `pdf`)

Ejemplo concreto del criterio §5.8 aplicado al candidato priorizado `pdf` (ADR-001/013):

1. **Señal**: memoria y p95 del endpoint degradan por los workers Chromium (400–800 ms por documento, PDF-EXPORT.md §5.3) compitiendo con el request path; MONITORING.md registra el dato durante N semanas (señal medida, no percepción).
2. **Decisión**: el orquestador/arquitecto evalúa extraer `pdf` como servicio independiente; la API externa no cambia (el endpoint sigue en el monolito y **solo encola** — PDF-EXPORT.md §5.3).
3. **Puerto**: `generatePdf(input)` (ADR-013 §Integración) pasa de llamada in-process a contrato HTTP/cola con el mismo input/output; el módulo `pdf` en el monolito queda como adaptador de encolado; el dominio y los DTOs no cambian.
4. **Transición por fases** (evita big-bang): primero workers separados con la misma red (despliegue multi-instancia, ADR-012/ENVIRONMENTS.md); luego el servicio dedicado; el monolito no se reescribe.
5. **Verificación**: los criterios de salida son los del DoD (DEFINITION-OF-DONE.md): tests de contrato, monitoreo de latencia/errores, sin regresión en export (BR-018).

### 5.10 Escenarios operativos de crecimiento (datos y equipos)

- **Crecimiento de datos sin extraer**: volumen alto de `audit_logs`/`movements` se maneja primero con particionado por rango y cursor (ADR-004/010, AUDIT.md §5.8, PERFORMANCE.md §5.2) — sin servicios nuevos. El límite de la base transaccional única se evalúa con métricas (tamaño por partición, tiempos de poda), no por percepción.
- **Crecimiento de usuarios**: el monolito NestJS escala verticalmente primero (pool, workers, caching v1.1 — ADR-012); la réplica horizontal del backend es indiferente al transporte (tokens stateless ADR-008, jobs idempotentes ADR-012). Los workers de jobs se despliegan como proceso separado ANTES de extraer servicios (§5.8 señal 4).
- **Crecimiento de equipo**: un módulo con ciclo de release propio (p. ej. `reports` futuro o `pdf`) habilita equipo dedicado — el boundary ya existe (ADR-001). Un módulo que cambia con frecuencia y bloquea releases del resto es la señal 2 del §5.8.
- **Multi-instancia desde v1 (configuración, no código)**: dos instancias tras un load balancer con la misma DB y Redis compartido (si OQ-007 cierra a favor) funcionan desde el día uno porque los jobs son idempotentes y las alertas tienen dedupe en DB (ADR-012) — señal 4 cubierta sin refactor.

### 5.11 Resumen: habilitador → señal de activación → trabajo requerido

| Capacidad futura | Habilitador v1 (ya diseñado) | Señal/condición de activación | Trabajo al activarse |
| --- | --- | --- | --- |
| Segundo predio del mismo operador | `Location`/`Map` por predio, datos neutrales | Necesidad operativa real | Seeds + datos; sin cambio de dominio (§5.2) |
| Multi-tenant (clientes distintos) | RBAC granular + scope futuro (ADR-009) | Requerimiento de negocio documentado | Elegir opción de tenancy (§5.2) + normalizar unicidad (S2) |
| Móvil | API REST completa + JWT (ADR-007/008) | Roadmap fase 14 | App `cargoops-mobile` (§22), sin cambios de backend (§5.3) |
| Lectores/QR | Código string + búsqueda (BR-002, OQ-001) | Pedido de hardware concreto | Módulo `scanning` (teclado-HID vs SDK — S3) |
| IoT/cámaras | `elementType` extensible + alertas (MAP-ENGINE §5.5) | Sensores en el predio | Módulo `iot` + plantillas de render por tipo |
| Integraciones/API pública | Contratos REST versionados (ADR-007) | Primer consumidor externo | API keys/webhooks (ADR-008, §5.6) |
| Reportes custom | Puertos de lectura + `generatePdf` (ADR-013) | Demanda de reportes programados | Módulo `reports` (MODULES.md §5.12) |
| Inteligencia operacional | Datos capturados (movimientos/audit) | Proyecto de analítica aprobado | Replica de lectura o CDC (ADR-010) |
| Notificaciones multi-canal | `NotificationProvider` (BR-019) | Proveedor/exigencia real | Enums aditivos + jobs (NOTIFICATIONS §5.6) |

Esta tabla es el **mapa de decisión futuro**: cada fila define QUIÉN decide y CON QUÉ dato activa el trabajo — ninguna se implementa en v1 (MASTER-SPEC §1.5).

### 5.12 Guarda contra el sobre-dimensionamiento

- **Regla de oro** (ADR-001, MASTER-SPEC §11.1): el crecimiento NO se implementa por anticipado; este documento existe para que la arquitectura **lo habilite**, no para adelantarlo. Toda capacidad futura exige su señal de activación (§5.11).
- **Contrapeso a la extracción**: extraer un servicio tiene costos reales (operación, latencia, fallos distribuidos, observabilidad); si no hay señal medible (§5.8), la respuesta correcta es **no extraer**. El monolito modular es la posición por defecto mientras el volumen lo permita (KISS/YAGNI).
- **Qué SÍ se construye en v1** (habilitadores, no features futuras): puertos entre módulos (ADR-001), enums aditivos (DATABASE.md §5.6), UUIDv7 (DATABASE.md §5.1), jobs idempotentes (ADR-012), `generatePdf(input)` como puerto (ADR-013), `NotificationProvider` (BR-019), `MapElement.elementType` extensible (ADR-006) y contracts REST versionados (ADR-007). Son decisiones de **diseño**, ya tomadas y documentadas en los ADR — no trabajo diferido.
- **Checklist de revisión**: al evaluar una capacidad futura, responder en orden: (1) ¿existe señal real? (2) ¿hay habilitador v1? (3) ¿el trabajo es configuración/seeds/canal o reescritura? Si la respuesta a (3) es «reescritura», el diseño v1 falló y se corrige antes de crecer — es la razón de existencia de este documento.

## 6. Criterios de aceptación

- [ ] Cada capacidad futura de §1.5 mapea a al menos un habilitador existente (§5.1) con referencia a ADR/doc — sin diseñar modelos nuevos.
- [ ] Los criterios de extracción son medibles (señales, no opinión) y los candidatos priorizados con su motivo.
- [ ] No se implementa ninguna capacidad aquí descrita en v1; todo queda documentado como camino (MASTER-SPEC §1.5).
- [ ] Multi-tenant, móvil, IoT, integraciones y reportes tienen su «CRITERIO de activación / condición futura» explícito.
- [ ] El walkthrough de extracción (§5.9) es ejecutable contra el criterio §5.8: cada paso referencia una señal medible y un contrato existente (ADR-001/012/013).
- [ ] El resumen habilitador→señal→trabajo (§5.11) no introduce modelos ni reglas nuevas: cada fila referencia ADR/doc existente.
- [ ] Los pendientes reales (unicidad por predio, hardware de lectores, firma RS256) están en §7, sin inventar decisiones.
- [ ] Cada pendiente S1–S7 tiene pregunta concreta, impacto y referencia; ninguno introduce una regla de negocio nueva.
- [ ] Ninguna capacidad futura aparece como «requisito v1» en este documento; todo está marcado como camino/condición de activación (MASTER-SPEC §1.5).
- [ ] Las señales de extracción (§5.8) quedan medibles vía MONITORING.md (p95, memoria, CPU por módulo) y los umbrales numéricos, si se fijan, se aprueban explícitamente (S7).
- [ ] La capacidad «multi-instancia desde v1» (§5.10) queda documentada como configuración de despliegue, no como código nuevo (ADR-012).

## 7. Archivos involucrados

- `docs/MASTER-SPEC.md` §1.5, §4.4.7, §11.1, §11.3, §12, §18, §22 · `docs/OPEN-QUESTIONS.md`
- `architecture/ADR/ADR-001`, ADR-004, ADR-006, ADR-007, ADR-008, ADR-009, ADR-010, ADR-012, ADR-013, ADR-002
- Hermandos W2: `AUTHORIZATION.md` §5.1, `NOTIFICATIONS.md` §5.6, `MAP-ENGINE.md` §5.5, `AUDIT.md` §5.9, `DATABASE.md` §5.1/§5.3, `SECURITY.md` §5.10, `ARCHITECTURE.md` §5.1
- Downstream: `roadmap/ROADMAP.md`, `roadmap/PHASES.md`, `backend/MODULES.md`, `devops/ENVIRONMENTS.md` (multi-instancia)

## 8. Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Crecimiento sin señales → extracción prematura | Criterios medibles (§5.8); monolith hasta que una señal se confirme |
| Multi-tenant llegando sin decisión de tenancy | Opciones documentadas + criterio de activación; datos neutrales al predio desde v1 |
| Limpieza de boundaries se erosiona con el tiempo | Puertos por módulo + revisión de arquitectura en PR + MODULES.md (ADR-001) |
| `Cargo.code` único global incompatible con multi-predio | OQ-001 debe contemplar scope por predio (§7 S3); diseño permite índice funcional |
| Integraciones externas (webhooks/API keys) sin marco de seguridad | Evolución documentada (ADR-008/007, NOTIFICATIONS) — se activa con el primer consumidor real |
| Firma HS256 limita servicios separados | RS256 recomendado si hay expectativa (SECURITY.md §5.10 S2) — pendiente de confirmar |
| Extracción sin señal medida (por moda o comodidad) | Criterios §5.8 + checklist §5.12; MONITORING decide, no la preferencia del equipo |
| Scoping de tenancy ausente en la normalización de códigos | OQ-001 + S2 exigen decisión explícita antes de multi-predio; diseño permite índice/unicidad por scope |

## 9. DECISIÓN PENDIENTE (reportar al orquestador)

| # | Pregunta concreta | Impacto | Referencia |
| --- | --- | --- | --- |
| S1 | ¿Se adopta RS256/ES256 (con par de claves) desde el inicio para facilitar servicios separados futuros, o HS256 mientras sea monolith aislado? | Modelo de firmas, extracción futura | SECURITY.md §5.10 S2 — Nueva (W2) |
| S2 | ¿La unicidad de `Cargo.code` (OQ-001) debe definirse ya contemplando scope multi-predio (única global vs única por predio)? | Índices y normalización | Nueva (W2) — cruza OQ-001 |
| S3 | Soporte de lectores/QR en v1.1+: ¿teclado-HID (sin SDK) o integración nativa con SDKs de hardware del predio? | Alcance del futuro módulo scanning | Nueva (W2) |
| S4 | ¿API keys para integraciones y webhooks salientes tienen requisito conocido ya (algún cliente del predio), o se activan con el primer consumidor? | Alcance de auth de integraciones | Nueva (W2) — ADR-008/007 |
| S5 | ¿El modelo multi-tenant (fila con tenant_id vs base por predio) se decide cuando haya requerimiento real o se prefiere fijar una recomendación ahora? | Esquema futuro | Nueva (W2) — MASTER-SPEC §1.5 |
| S6 | ¿La referencia «§37» del prompt original (reportes/inteligencia) se considera cubierta por §1.5 + este documento, o el orquestador quiere una sección dedicada en MASTER-SPEC? | Alineación de documentación | Nueva (W2) — MASTER-SPEC v0.1 no contiene §37 |
| S7 | ¿El coste operativo de extraer `pdf` (servicio dedicado + Chromium) se asume solo con señal de MONITORING, o se fija ya un umbral de p95/memoria como disparador? | Criterio de extracción | Nueva (W2) — MONITORING.md, ADR-013 |