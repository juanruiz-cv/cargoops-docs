# ADR-009 — RBAC

- Estado: Accepted
- Fecha: 2026-09-23
- Decisores: Equipo CargoOps / Software Architect

## Contexto

CargoOps tiene tres perfiles operativos bien diferenciados (MASTER-SPEC §8): **Viewer** (solo consulta), **Operator** (operación diaria: crear/mover cargas, registrar camiones, cambiar estados) y **Admin/Supervisor** (operación + funciones administrativas: soft delete, restaurar, revertir, planos, configuración, usuarios). Las reglas BR-009 a BR-012 fijan: validación de permisos SIEMPRE en backend, Viewer no escribe, Operator no administra, Admin puede eliminar/restaurar/revertir con auditoría. El modelo canónico ya define `Role (VIEWER | OPERATOR | ADMIN)`, `Permission (cargo.create, …)` y `RolePermission (roleId, permissionId, granted)` (MASTER-SPEC §4.1), con autorización «RBAC por permisos, bundles por rol, guardias en backend + guards en frontend (UX únicamente)» (MASTER-SPEC §8).

## Decisión

Adoptar **RBAC con 3 roles canónicos y permisos granulares**, modelado según MASTER-SPEC §4.1/§8:

- **Modelo de datos**: tablas `User`, `Role`, `Permission`, `RolePermission` (con `granted` para habilitar/denegar puntualmente) y relación User↔Role. Los códigos de rol son `VIEWER | OPERATOR | ADMIN`; los permisos usan convención `recurso.acción` (p. ej. `cargo.create`, `cargo.move`, `cargo.delete_soft`, `cargo.restore`, `cargo.revert`, `map.edit`, `users.manage`, `audit.read`, `cargo.export_pdf`, `cargo.to_rezago`, `cargo.to_secuestro`). Catálogo canónico según OQ-018 (MASTER-SPEC §6 BR-009); las transiciones especiales TO_REZAGO/TO_SECUESTRO formalizan permisos propios (OQ-030 → **BR-046**): `cargo.to_rezago` ADMIN + OPERATOR con observación, `cargo.to_secuestro` solo ADMIN.
- **Bundles de rol como seed**: cada rol trae su conjunto de permisos granted (Viewer: lectura + export autorizado, BR-018; Operator: Viewer + operaciones de carga/camión/movimiento; Admin: todos + administrativos — MASTER-SPEC §8). El seed de permisos es la **única fuente de verdad** de la matriz; los cambios de matriz se versionan con los seeds y se documentan en `architecture/AUTHORIZATION.md`.
- **Aplicación en backend (NestJS, ADR-003)**: `RolesGuard` + `PermissionsGuard` globales evaluando los claims del JWT (ADR-008, snapshot de permisos del usuario) y/o consulta a DB en operaciones administrativas; decoradores por endpoint (`@RequirePermission('cargo.move')`). **La autorización se evalúa siempre en el backend** (BR-009); el frontend solo replica la matriz para UX/ocultamiento (BR-010/011/012 como reglas de negocio, no de UI).
- **Permisos por recurso en data**: para operaciones sobre entidades específicas (movimiento de una carga en una ubicación, reversión) la guardia combina permiso general + reglas de dominio (BR-004/005/016), en el service, no solo en el guard: permisos de *feature* en el guard, reglas de *estado* en el dominio.
- **Permisos granulares futuros sin romper**: el modelo `Permission`/`RolePermission` permite agregar permisos y rearmar bundles sin migraciones de código (un nuevo permiso se seedea y se asigna a roles); si el negocio pidiera permisos finos (un Viewer que solo ve su sector) se agregan sin cambiar arquitectura. La evolución a ABAC (atributos: ubicaciones permitidas, propietario de carga) queda diseñada pero fuera de v1 (MASTER-SPEC §1.5).
- **Auditoría de cambios de permisos**: toda modificación de roles/permisos/usuarios genera `AuditAction.PERMISSION_CHANGE` (ADR-010), solo ejecutable por ADMIN.

El estado de decisión es **Accepted**: el modelo de 3 roles y permisos es canónico (MASTER-SPEC §8, §4.1).

## Alternativas consideradas

1. **Roles hardcodeados en código (switch por rol en services).** Rechazada: los permisos no serían datos (no habría `Permission`/`RolePermission`), la matriz quedaría dispersa en el código, sin auditoría de cambios y sin camino a permisos granulares futuros; contradice el modelo del MASTER-SPEC §4.1.
2. **ABAC completo desde v1 (políticas por atributos: ubicación, estado, propietario, hora).** Rechazada por YAGNI/simplicidad: el predio maneja decenas de usuarios y roles bien definidos; ABAC agrega motor de políticas y testing complejo sin requerimiento actual. Se documenta la evolución: el permiso de feature + reglas de dominio del service son el punto de inserción natural.
3. **ACL por usuario (lista de permisos por usuario).** Rechazada: no escala la administración (cada usuario se configura individualmente) y opaca la matriz de negocio; RBAC con roles + bundles es la administración correcta para equipos operativos con rotación.
4. **Solo guard de rol (sin modelo Permission) en guardias.** Rechazada: igual fricción que (1) para granularidad futura; el modelo Permission se adopta porque ya está en el dominio canónico.

## Consecuencias

**Positivas:**

- Matriz de autorización declarativa, seedeada y auditable; cambios de permisos sin tocar código de services.
- Backend siempre autoritativo (BR-009): el frontend puede mentir en UX sin consecuencias de seguridad.
- Base clara para multi-predio/multi-tenant futuro (roles por predio, permisos por tenant) sin reescritura del motor (MASTER-SPEC §1.5).

**Negativas:**

- El snapshot de permisos en el JWT puede quedar desactualizado dentro de la ventana del access token (≤15 min, ADR-008): aceptado para v1 (cambios de matriz son poco frecuentes); los usuarios `active=false` se invalidan en cada request.
- Costo de modelar la matriz como datos (seeds, migraciones de permisos, testing de cada guard): se mitiga con testing de autorización sistemático (MASTER-SPEC §14).
- Riesgo de drift entre seeds y código si un endpoint nuevo no declara su permiso: revisión de seguridad en PR obligatoria (MASTER-SPEC §15).

## Referencias

- MASTER-SPEC §4.1 (Role/Permission/RolePermission), §6 (BR-009..012), §8 (RBAC, descriptores de rol), §1.5 (evolución multi-tenant).
- ADR-008 (JWT con claims de rol/permisos), ADR-003 (guards NestJS), ADR-010 (auditoría PERMISSION_CHANGE), ADR-011 (solo ADMIN revierte/restaura).