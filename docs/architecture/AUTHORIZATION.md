# CargoOps — Modelo de Autorización (AUTHORIZATION.md)

> Grupo W2 · Arquitectura · Fuente de verdad: `docs/MASTER-SPEC.md` §4.1 (Role/Permission/RolePermission), §6 (BR-009…BR-012, BR-018), §8 (RBAC 3 roles).
> Estado: borrador FASE 0 (documentación). Define el modelo RBAC que implementará el grupo W5 (backend) y que el grupo W4 (frontend) consumirá solo como UX.

## 1. Objetivo

Definir el modelo de autorización de CargoOps: el catálogo canónico de permisos (`Permission.code`), el mapeo rol → permisos (bundles de seed), la matriz de permisos por rol y por operación, la estrategia de guards en el backend NestJS (ADR-003/009), la verificación de permisos dentro de los servicios de dominio y el rol de los guards del frontend (UX únicamente, BR-009). El principio rector es el BR-009: **la validación de permisos ocurre SIEMPRE en backend; el frontend nunca es la única capa**.

## 2. Contexto

MASTER-SPEC §8 define tres roles operativos — **Viewer** (consulta), **Operator** (operación diaria) y **Admin/Supervisor** (gestión global) — con autorización «RBAC por permisos, bundles por rol, guardias en backend + guards en frontend (UX únicamente)». El modelo de datos canónico (MASTER-SPEC §4.1) ya incluye `Role (VIEWER | OPERATOR | ADMIN)`, `Permission (cargo.create, …)` y `RolePermission (roleId, permissionId, granted)`, materializado en `DATABASE.md` §5.3. Las reglas BR-009…BR-012 y BR-018 acotan los alcances por rol: Viewer no escribe, Operator no administra, Admin puede eliminar (soft)/restaurar/revertir con auditoría, y la exportación PDF respeta permisos por rol sin exponer datos no autorizados. El ADR-009 consolida el diseño: permisos granulares con convención `recurso.acción`, bundles como seeds, guards NestJS y snapshot de permisos en el JWT (ADR-008).

## 3. Restricciones

- **Deny-by-default**: sin permiso declarado en un handler → 403. No hay acceso implícito salvo endpoints públicos (auth/login, auth/refresh, health).
- **El backend es la capa autoritativa** (BR-009); el frontend replica la matriz solo para UX (ocultar/deshabilitar acciones, redirección 403).
- **BR-010**: Viewer no crea/mueve/modifica/elimina. **BR-011**: Operator no hace operaciones administrativas (eliminar definitivo, revertir, plano, configuración). **BR-012**: Admin puede eliminar (soft), restaurar, revertir; toda reversión genera historial y auditoría.
- **BR-018**: la exportación PDF respeta RBAC y no expone datos de cargas no autorizadas.
- Los permisos son **datos fijos en seed v1** (catálogo + bundles versionados); la edición de matrices es funcionalidad ADMIN con auditoría `PERMISSION_CHANGE` (ADR-009/010), pero no es foco de la UI v1 (MODULES.md §5.4).
- FASE 0: solo documentación. Los bloques fenced son ilustrativos.

## 4. Dependencias

- `docs/MASTER-SPEC.md` §4.1, §6 (BR-009…012, BR-018), §8, §10 (endpoints por permiso).
- `architecture/ADR/ADR-008` (claims del JWT), ADR-009 (RBAC), ADR-010 (PERMISSION_CHANGE), ADR-011 (solo ADMIN revierte/restaura).
- Hermandos W2: `SECURITY.md` §5.3 (guards), `DATABASE.md` §5.3 (tablas roles/permissions/user_roles/role_permissions), `ARCHITECTURE.md` §5.6 (módulos permissions/roles/users), `AUDIT.md` (auditoría de cambios de permisos).
- Downstream: `backend/MODULES.md` (módulos roles/permissions), `backend/API.md` (permisos por endpoint), `frontend/FRONTEND-ARCHITECTURE.md` (§5.3 guards UX), `docs/OPEN-QUESTIONS.md`.

## 5. Decisiones

### 5.1 Modelo RBAC

- **Roles de seed**: `VIEWER`, `OPERATOR`, `ADMIN` (MASTER-SPEC §8). Catálogo inmutable en v1; no se crean roles custom en v1 (MODULES.md §5.3: «roles custom complejos» diferido).
- **Asignación de roles**: N:M `User ↔ Role` vía `user_roles` (MASTER-SPEC §4.2, DATABASE.md §5.3); `POST /users/:id/roles` (API.md §9.2) con permiso `users.manage`. Un usuario puede tener más de un rol; los permisos efectivos son la **unión** de los bundles de sus roles.
- **Permisos como datos**: `Permission` (catálogo) y `RolePermission` con `granted` (booleano). `granted=false` habilita **denegación explícita** por rol (excepción de bundle; DATABASE.md §5.3). **Uso v1 recomendado**: solo concesiones positivas en los bundles de seed; la denegación explícita queda disponible y se documenta su semántica (ver §9, decisión pendiente).
- **Permisos efectivos** = unión de los bundles de los roles del usuario, menos excepciones `granted=false`. Se calculan en login/refresh y viajan como snapshot en el access token (ADR-008/009).
- **Matriz efectiva**: la única fuente de verdad es el seed versionado de `RolePermission` (§5.3); los cambios de matriz se versionan con los seeds y generan `AuditAction.PERMISSION_CHANGE` (ADR-010).

### 5.2 Catálogo canónico de permisos

Convención: `recurso.acción` (ADR-009). Los códigos de este catálogo son la referencia para los decoradores del backend, los filtros de UX del frontend y los seeds. La tabla indica el módulo dueño y el endpoint de referencia (API.md).

| Código | Descripción | Módulo dueño | Endpoint de referencia |
| --- | --- | --- | --- |
| `cargo.read` | Consultar cargas, detalle e historial | cargo | `GET /cargos` · `GET /cargos/:id` · `GET /cargos/:id/movements` |
| `cargo.create` | Registrar cargas (BR-001/002) | cargo | `POST /cargos` |
| `cargo.update` | Modificar datos maestros de carga (no ubicación/estado) | cargo | `PATCH /cargos/:id` |
| `cargo.move` | Crear movimientos de ubicación/estado (BR-006/007/016) | movements | `POST /cargos/:id/movements` |
| `cargo.delete_soft` | Eliminación soft de carga (BR-013, ADR-011) | cargo | `DELETE /cargos/:id` (soft) |
| `cargo.restore` | Restaurar carga soft-deleted (BR-012, ADR-011) | cargo | restauración ADMIN |
| `cargo.revert` | Revertir movimientos (BR-012, ADR-011) | movements | `POST /movements/:id/revert` (propuesto, MODULES.md §5.8) |
| `cargo.export_pdf` | Exportar PDF de una carga (BR-018) | cargo | `/cargos/:id/export-pdf` (MASTER-SPEC §10) |
| `truck.read` | Consultar camiones | trucks | `GET /trucks` · `GET /trucks/:id` |
| `truck.create` | Registrar camiones | trucks | `POST /trucks` |
| `truck.update` | Modificar camiones | trucks | `PATCH /trucks/:id` |
| `location.read` | Consultar ubicaciones y ocupación | locations | `GET /locations` · `GET /locations/:id` |
| `location.manage` | Crear/editar ubicaciones, estado, capacidad y su unidad (BR-004/005, BR-041); incluye el **override de unidad por ubicación** y la administración de los **defaults de unidad por LocationType** (BR-041: SECTOR → AREA, PLAZOLETA/SCANNER/BALANZA → UNITS, otros → configurable). Cambios de capacidad/unidad auditan `CAPACITY_CHANGE` | locations | `POST /locations` · `PATCH /locations/:id` · `GET/PATCH /settings` (defaults) |
| `map.read` | Consultar planos y elementos estructurados (BR-020) | maps | `GET /maps` · `GET /maps/:id` |
| `map.edit` | Editar planos (estructura crítica, BR-011) | maps | `PATCH /maps/:id` |
| `alert.read` | Consultar alertas | alerts | `GET /alerts` |
| `alert.manage` | Gestionar ciclo de vida de alertas (acknowledge/resolve; dismiss solo ADMIN) | alerts | `PATCH /alerts/:id` |
| `dashboard.read` | Consultar KPIs operativos | dashboard | `GET /dashboard` |
| `notification.read` | Consultar notificaciones propias y marcarlas leídas | notifications | `GET /notifications` · `PATCH /notifications/:id/read` |
| `audit.read` | Consultar auditoría — ADMIN ve todo; OPERATOR solo sus propios eventos (OQ-019, ver §9 A2); Viewer sin acceso | audit | `GET /audit` |
| `users.manage` | ABM de usuarios y asignación de roles | users | `GET/POST /users` · `PATCH /users/:id` · `POST /users/:id/roles` |
| `roles.manage` | Editar bundles de permisos por rol | roles | `PUT /roles/:id/permissions` |
| `settings.manage` | Configuración global | settings | `GET/PATCH /settings` |

Notas de coherencia:
- Los códigos coinciden con el catálogo canónico del ADR-009/OQ-018 (`cargo.create`, `cargo.move`, `cargo.delete_soft`, `cargo.restore`, `cargo.revert`, `map.edit`, `users.manage`, `audit.read`, `cargo.export_pdf`). **Normalización RESUELTA (OQ-018, 2026-09-23)**: las variantes heredadas (`cargo.delete`, `cargo.export`, `movement.revert`, `user.manage`) se alinearon en MODULES.md/API.md/VALIDATION.md/ROUTING.md — ver §9 (A1 resuelta).
- La lectura de datos propios de un usuario (notificaciones) requiere `notification.read` aunque el recurso sea del propio solicitante; no hay acceso implícito por propiedad en v1 (ABAC fuera de alcance, ADR-009).
- **OQ-019 resuelta (2026-09-24)**: el alcance del `GET /audit` es ADMIN (ve todo) y OPERATOR con `audit.read` **parcial** (solo sus propios eventos: login, movimientos y cambios que él hizo); Viewer sin acceso a auditoría (ver §9 A2).

### 5.3 Mapeo rol → permisos (bundles de seed)

**VIEWER** — consulta y exportación autorizada (BR-018):
`cargo.read`, `truck.read`, `location.read`, `map.read`, `alert.read`, `dashboard.read`, `notification.read`, `cargo.export_pdf`.

**OPERATOR** — todo Viewer + operación diaria (MASTER-SPEC §8):
+ `cargo.create`, `cargo.update`, `cargo.move`, `truck.create`, `truck.update`, `alert.manage`.
SIN operaciones administrativas (BR-011): ni `cargo.delete_soft`, `cargo.restore`, `cargo.revert`, `map.edit`, `location.manage`, `users.manage`, `roles.manage`, `settings.manage`, `audit.read`.

**ADMIN** — todo Operator + administración (BR-012):
+ `cargo.delete_soft`, `cargo.restore`, `cargo.revert`, `map.edit`, `location.manage`, `users.manage`, `roles.manage`, `settings.manage`, `audit.read`.

Restricciones de granularidad dentro de un permiso (aplicadas en el servicio de dominio, no en el guard — ADR-009 §«Permisos por recurso en data»):
- `alert.manage`: acknowledge/resolve para OPERATOR y ADMIN; **dismiss solo ADMIN** (API.md §8.3).
- `location.manage` (ADMIN): cambiar una ubicación a INACTIVE/MAINTENANCE con cargas presentes queda bloqueado por regla de negocio (API.md §6.3, `LOCATION_HAS_CARGO`). **BR-041**: el override de `capacityUnit` por ubicación y la edición de los defaults por LocationType son **solo ADMIN** (gobernanza ADMIN), auditan `CAPACITY_CHANGE` y van vía `location.manage`/`settings.manage` respectivamente; Viewer/Operator no los exponen ni en UX.
- `map.edit` (ADMIN): el mapa es **vista estática** en v1 (OQ-015) y las propiedades de ubicación se editan por **formularios ADMIN** (OQ-028); el editor visual — y con él la definición de «estructura crítica del plano» que BR-011 reserva a ADMIN — se difiere a fase 11 (ver §9 A4 / MAP-ENGINE.md §9 M4).

### 5.4 Guards y estrategia en backend (NestJS, ADR-003/009)

Orden de evaluación por request:

1. **`AuthGuard` global**: valida JWT (ADR-008), carga el usuario, verifica `active=true` y `deleted_at IS NULL` en cada request (usuarios desactivados pierden acceso).
2. **Endpoints públicos**: `@Public()` explícito solo en `POST /auth/login`, `POST /auth/refresh`, `GET /health*`.
3. **`PermissionsGuard` global**: lee el decorador `@RequirePermissions('cargo.move')` del handler; compara contra los permisos efectivos del usuario (snapshot de claims del JWT, ADR-008/009). **Deny-by-default**: handler sin `@RequirePermissions()` → 403. Múltiples códigos en un decorador = semántica AND (todos requeridos); para alternativas se declara un segundo decorador (OR) — decisión de implementación del grupo W5, coherente con el catálogo.
4. **Servicio de dominio**: re-valida reglas de negocio del recurso (BR-004/005/016, dueño/estado del recurso) — nunca solo en el guard (ADR-009). En operaciones administrativas sensibles (reversión, restauración, edición de permisos) el servicio puede re-consultar la matriz en DB en lugar de confiar solo en el snapshot.

```
// Ilustrativo — capa de presentación (documentación, no código de producción)
@Controller('cargos')
export class CargoController {
  @Post()
  @RequirePermissions('cargo.create')
  create(@Body() dto: CreateCargoDto) { /* → CargoService.create */ }

  @Post(':id/movements')
  @RequirePermissions('cargo.move')
  move(@Param('id') id: string, @Body() dto: MoveCargoDto) { /* → MovementService */ }
}
```

**Snapshot en JWT** (ADR-008): los claims llevan `roles[]` y `permissions[]` efectivos. Ventana de desactualización aceptada (≤15 min de TTL del access token; ADR-009). Mitigaciones: users `active=false` invalidados por request (AuthGuard), y revocación de refresh al cambiar permisos/roles de un usuario (revocación de sesión a demanda, ADMIN).

**Fallos de autorización**: HTTP 403 con envelope `{ error: { code: 'FORBIDDEN', message, requestId } }` (API.md §3). Los intentos no autorizados no se auditan como acción propia (no hay AuditAction dedicado); el acceso denegado puede registrarse en logs de aplicación (SECURITY.md §5.9) sin exponer internos.

### 5.5 Verificación de permisos en los servicios de dominio

Regla del ADR-009: **permiso de feature en el guard, reglas de estado en el dominio**. El guard responde «¿puede esta persona ejecutar este tipo de operación?»; el service responde «¿puede esta operación ejecutarse sobre ESTE recurso en ESTE estado?».

| Operación | Guard (permiso) | Validación adicional en service (BR / estado) |
| --- | --- | --- |
| Crear carga | `cargo.create` | BR-001/002 (código), BR-004 (ubicación activa), BR-005 (capacidad) |
| Mover carga | `cargo.move` | BR-016 (máquina de estados), BR-004 (destino activo), BR-005 (capacidad), BR-006/007 (observación obligatoria) |
| Cambiar estado | `cargo.move` | BR-016 (transición válida), BR-007 (observación) |
| Revertir movimiento | `cargo.revert` | BR-012 (solo ADMIN, historial + auditoría), BR-006/007 (observación de la reversión), integridad de `reversionOfId` (DATABASE.md §5.3) |
| Soft delete / restaurar | `cargo.delete_soft` / `cargo.restore` | BR-013 (audit + historial), ADR-011 (restauración a estado válido de la state machine) |
| Editar plano | `map.edit` | BR-020 (datos estructurados, no imagen), vínculo de `MapElement.locationId` existente, versionado de `Map` (MAP-ENGINE.md §5) |
| Editar capacidad/estado de ubicación | `location.manage` | BR-004 (no recibir cargas si INACTIVE), BR-005 (consistencia de `occupiedCapacity` en la misma transacción), bloqueo si tiene cargas (API.md §6.3); **BR-041** (unidad efectiva = override `capacityUnit` o default por LocationType; solo ADMIN; `CAPACITY_CHANGE` al cambiar capacidad/unidad o defaults) |
| Gestionar alertas | `alert.manage` | dismiss solo ADMIN; resolución no mueve la carga (BR-014: decisión humana + observación) |
| Exportar PDF | `cargo.export_pdf` | BR-018 (solo datos de cargas autorizadas), `AuditAction.EXPORT` (ADR-010/013, PDF-EXPORT.md §5.5) |
| Usuarios / roles / settings | `users.manage` / `roles.manage` / `settings.manage` | solo ADMIN por bundle; `PERMISSION_CHANGE` en cada cambio (BR-012, ADR-010) |

### 5.6 Guards de frontend como UX únicamente (BR-009)

El frontend Angular replica la matriz efectiva para **mejorar la experiencia** (no ocultar por seguridad), según `FRONTEND-ARCHITECTURE.md` §5.3 y `COMPONENTS.md`:

- **Route guards** (`guards/permission.guard.ts`): bloquean la navegación a rutas cuyo permiso falta y redirigen a 403 (página `forbidden-page`) — solo UX: una ruta protegida en frontend no protege la API.
- **Ocultamiento/deshabilitado de acciones**: menús, botones (p. ej. `PdfExportButton` con `permitted` input, COMPONENTS.md §6.16) y columnas según permisos efectivos del `auth.store`.
- **Manejo de 403**: interceptor global de errores muestra el estado y permite navegar a la página 403; el backend es la fuente de verdad del rechazo (envelope `FORBIDDEN`, API.md §3).
- **Fuente de permisos en el cliente**: `auth.store` (usuario, roles, permisos del login/refresh, ADR-008); nunca se decide autorización con datos cacheados de una sesión anterior sin refrescar el snapshot.
- **Caso de prueba obligatorio** (MASTER-SPEC §14): cliente modificado que invoca la API sin permiso recibe 403 — la UI invisible no basta.

### 5.7 Matriz de permisos por rol y operación

Resumen operacional (✓ = permitido; ✗ = denegado; nota si hay restricción fina):

| Operación | Viewer | Operator | Admin |
| --- | --- | --- | --- |
| Dashboard y KPIs | ✓ | ✓ | ✓ |
| Ver cargas, detalle, historial, ubicaciones, mapa, camiones | ✓ | ✓ | ✓ |
| Exportar PDF de carga (BR-018) | ✓ | ✓ | ✓ |
| Registrar carga | ✗ | ✓ | ✓ |
| Modificar datos maestros de carga | ✗ | ✓ | ✓ |
| Registrar camión / modificarlo | ✗ | ✓ | ✓ |
| Mover carga / cambiar estado (BR-006/007/016) | ✗ | ✓ | ✓ |
| Registrar observación (movimiento o nota) | ✗ | ✓ | ✓ |
| Reconocer/resolver alerta | ✗ | ✓ | ✓ |
| Descartar alerta (dismiss) | ✗ | ✗ | ✓ |
| Eliminar carga (soft, BR-013) | ✗ | ✗ | ✓ |
| Restaurar carga (BR-012, ADR-011) | ✗ | ✗ | ✓ |
| Revertir movimiento (BR-012, ADR-011) | ✗ | ✗ | ✓ |
| Editar plano (BR-011/020) | ✗ | ✗ | ✓ |
| Crear/editar ubicaciones, capacidades, estados de ubicación | ✗ | ✗ | ✓ |
| Editar unidad por defecto por LocationType (BR-041, defaults) | ✗ | ✗ | ✓ |
| Administrar usuarios, roles y permisos (BR-012) | ✗ | ✗ | ✓ |
| Configuración global (settings) | ✗ | ✗ | ✓ |
| Consultar auditoría (`GET /audit`) | ✗ | ✓* | ✓ |

*OPERATOR consulta **solo sus propios eventos** (OQ-019 resuelta, filtro por autor); ADMIN ve todo; Viewer sin acceso — §9 A2.

## 6. Criterios de aceptación

- [ ] El catálogo de permisos (§5.2) cubre todos los endpoints mutacionales y las lecturas acotadas de `backend/API.md`; ningún handler sin permiso declarado (deny-by-default).
- [ ] La matriz (§5.7) es coherente con MASTER-SPEC §8 y con BR-009…BR-012 y BR-018: Viewer solo consulta, Operator opera sin administrar, Admin administra con auditoría.
- [ ] Los bundles de seed (§5.3) son versionables, idempotentes y generan `PERMISSION_CHANGE` al modificarse (ADR-010).
- [ ] Los guards del frontend se documentan como UX únicamente (BR-009); prueba de 403 sobre cliente modificado definida en QA (MASTER-SPEC §14).
- [ ] Las divergencias de códigos de permiso entre ADR/W5 están declaradas en §9 para normalización única.

## 7. Archivos involucrados

- `docs/MASTER-SPEC.md` §4.1, §6, §8, §10 · `docs/OPEN-QUESTIONS.md`
- `architecture/ADR/ADR-008`, ADR-009, ADR-010, ADR-011
- Hermandos W2: `SECURITY.md` §5.3, `DATABASE.md` §5.3, `AUDIT.md`, `ARCHITECTURE.md` §5.6
- Downstream: `backend/MODULES.md` (módulos roles/permissions/users), `backend/API.md` (permisos por endpoint), `frontend/FRONTEND-ARCHITECTURE.md` §5.3, `frontend/COMPONENTS.md` §6

## 8. Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Drift entre seeds y código (endpoint nuevo sin permiso) | Deny-by-default + revisión de seguridad obligatoria en PR (ADR-009, MASTER-SPEC §15) |
| Snapshot de permisos desactualizado dentro de la ventana del access token | TTL corto (15 min), revocación de refresh al cambiar roles/permisos, re-check en operaciones administrativas |
| Viewers con `cargo.export_pdf` acceden a datos no autorizados | BR-018: el service de export re-verifica autorización sobre el recurso concreto y audita EXPORT (PDF-EXPORT.md §5.5) |
| Denegación explícita `granted=false` mal usada | V1 recomienda solo concesiones positivas; semántica documentada (§5.1) y pendiente de confirmación (§9) |
| Multi-rol produce permisos no intuitivos (unión de bundles) | Matriz efectiva calculada en login/refresh y visible al ADMIN en la gestión de usuarios |
| Códigos de permiso divergentes entre documentos (ADR vs W5) | Normalización única **resuelta** (OQ-018, 2026-09-23): catálogo canónico ADR-009; seeds definitivos usan ese catálogo (ADR-009 §Decisión) |

## 9. DECISIÓN PENDIENTE (reportar al orquestador)

Las preguntas con OQ asignada quedaron **resueltas en MASTER-SPEC v0.5 (2026-09-24)**; A3/A4/A6 no tienen OQ asignada y se conservan como residuales locales:

| # | Pregunta concreta | Impacto | Resolución |
| --- | --- | --- | --- |
| A1 | ~~Normalizar códigos de permiso: ADR-009 usa `cargo.delete_soft`, `cargo.export_pdf`, `user.manage`, `cargo.revert`; MODULES.md/API.md usan `cargo.delete`, `cargo.export`, `users.manage`, `movement.revert`. ¿Cuál es el código canónico de cada permiso?~~ → **RESUELTA (OQ-018, 2026-09-23)**: catálogo canónico = ADR-009 (`cargo.delete_soft`, `cargo.export_pdf`, `users.manage`, `cargo.revert`, `map.edit`, `audit.read` + `cargo.to_rezago`/`cargo.to_secuestro` BR-046); documentos alineados | Seeds, decoradores, contrato frontend | OQ-018 (resuelta 2026-09-23) |
| A2 | ~~¿OPERATOR puede consultar auditoría de sus propias operaciones (`audit.read` parcial) o `GET /audit` es solo ADMIN?~~ | Alcance de `audit.read` en la matriz | ✅ **RESUELTA (OQ-019)** — OPERATOR ve **solo sus propios eventos** (login, movimientos, cambios que él hizo); ADMIN ve todo; Viewer sin acceso a auditoría. `audit.read` parcial se implementa filtrando por autor |
| A3 | ¿Se usa la denegación explícita `granted=false` en v1 o solo bundles positivos? | Semántica de RolePermission y seeds | 🔶 Pendiente local — sin OQ asignada; v1 recomienda solo concesiones positivas (§5.1); la denegación explícita queda disponible con semántica documentada |
| A4 | ¿Qué se considera «estructura crítica del plano» que Operator no puede editar (BR-011) — todo el plano, o parte editable (labels, zonas no críticas)? | Alcance de `map.edit` y del editor (OQ-015) | 🔶 Pendiente local — sin OQ asignada; el mapa es **estático** en v1 (OQ-015) y las propiedades de ubicación se editan por **formularios ADMIN** (OQ-028); el editor visual y la definición de «estructura crítica» se resuelven con el editor (fase 11) — coherente con MAP-ENGINE.md §9 M4 |
| A5 | ~~¿`alert.manage` con dismiss solo ADMIN (recomendado) se confirma, o dismiss también para OPERATOR?~~ | Regla fina dentro del permiso | ✅ **RESUELTA (OQ-026)** — OPEN→ACKNOWLEDGED y ACKNOWLEDGED→RESOLVED: ADMIN + OPERATOR (quien la toma); **DISMISSED: solo ADMIN** |
| A6 | ¿Un usuario puede tener múltiples roles (unión de bundles) en v1 o se fuerza un rol único? | Asignación de roles en `users.manage` | 🔶 Pendiente local — sin OQ asignada; MASTER-SPEC §4.2 define `roles[]` (N:M) y §5.1 documenta la **unión de bundles** como modelo v1 |