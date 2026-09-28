# CargoOps — Especificación de Pantallas (SCREENS)

## Objetivo
Especificar pantalla por pantalla la interfaz de CargoOps: propósito, layout (ASCII), elementos, estados (loading/empty/error), interacciones clave, accesibilidad y notas de UX. Este documento define QUÉ muestra cada pantalla; el CÓMO visual (paleta, tipografía, tokens) queda en `brand/` (W7) y el CÓMO técnico en `frontend/` (W4). Coherente con `ux/USER-FLOWS.md` y `ux/MAP-UX.md`.

## Contexto
Plataforma web **desktop-first** (correcta en desktop/notebook/tablet/móvil; MASTER-SPEC §12), para operación diaria de un predio logístico/aduanero. Paleta base propuesta (MASTER-SPEC §13, a validar): primary `#2563EB`, secondary `#0F172A`, background `#F8FAFC`, surface `#FFFFFF`, text `#0F172A`, muted `#64748B`, success `#16A34A`, warning `#F59E0B`, danger `#DC2626`, info `#0EA5E9`. Accesibilidad objetivo **WCAG 2.2 AA**: navegación por teclado, focus visible, contraste AA, labels, ARIA, screen readers.

## Restricciones
- No se define implementación (Angular 20+, señales, standalone — ver `frontend/`).
- El backend es la única capa de autorización (BR-009); los elementos de UI se ocultan/deshabilitan por rol como UX.
- Los mensajes de error provienen del envelope `{ error: { code, message, requestId } }` (MASTER-SPEC §10) y se muestran tal cual, con contexto de acción.
- Toda pantalla cumple Definition of Done global (§20): loading, empty, error, validaciones, permisos, responsive, accesibilidad básica.
- Filenames en inglés; contenido en español profesional/neutral.

## Dependencias
- `docs/MASTER-SPEC.md` (§4.1 campos, §4.3 enums, §8 RBAC, §12 UX, §13 tokens).
- `ux/USER-FLOWS.md` (flujos que cada pantalla sirve), `ux/MAP-UX.md` (mapa, editor).
- Futuros: `frontend/COMPONENTS.md`, `frontend/DESIGN-SYSTEM.md`, `frontend/ROUTING.md` (W4); `brand/BRAND-BOOK.md`, `brand/DESIGN-TOKENS.md` (W7); `backend/API.md` (W5).

## Shell de aplicación (aplica a todas las pantallas autenticadas)
```
┌───────────┬────────────────────────────────────────────────┐
│ Sidebar   │ Topbar                                         │
│ (nav)     │ [Buscar carga…]          [⏰ Alertas] [👤 Usr] │
│           ├────────────────────────────────────────────────┤
│ Dashboard │                                                │
│ Cargas    │   CONTENIDO DE LA PANTALLA                     │
│ Camiones  │                                                │
│ Mapa      │                                                │
│ Planos    │                                                │
│ Alertas   │                                                │
│ Historial │                                                │
│ Auditoría │                                                │
│ Configuración                                             │
│ Usuarios  │                                                │
└───────────┴────────────────────────────────────────────────┘
```
- **Sidebar**: navegación principal, colapsable; secciones visibles según rol (Viewer no ve Usuarios/Roles ni Configuración ni Planos-edición).
- **Topbar**: buscador global de cargas (código, flujo 11), icono de alertas con contador, menú de usuario (perfil, cerrar sesión).
- En **móvil**: sidebar se convierte en drawer; mapa usa panel inferior/drawer (MASTER-SPEC §12, no clonar desktop).

---

## 1. Login
- **Propósito**: autenticar al usuario (flujo 0) contra `POST /api/v1/auth/login`.
- **Layout**:
```
┌──────────────────────────────────────────┐
│   [logo CargoOps]                        │
│   Iniciar sesión                         │
│   Usuario  [________________________]    │
│   Contraseña [_______________________]   │
│   [ Iniciar sesión ]          (loading)  │
│   ¿Olvidaste tu contraseña? (futuro)     │
└──────────────────────────────────────────┘
```
- **Elementos**: logo, título, campos usuario/contraseña (labels visibles), botón submit, enlace de recuperación (placeholder futuro, DP-SC-01), mensaje de error global.
- **Estados**: `loading` (spinner en botón, campos deshabilitados); `error` (banner: credenciales inválidas o cuenta inactiva); `success` (redirección a dashboard).
- **Interacciones**: submit con Enter; autofocus en usuario; tab ordenado; "recordarme" (persistencia del refresh token).
- **Accesibilidad**: labels asociados (aria), error con `role="alert"`, contraste AA, no revelar si fue usuario o contraseña el error.
- **Nota estados vacíos/mensajes**: error claro y accionable; nunca revelar existencia de usuario.

## 2. Dashboard
- **Propósito**: resumen operativo del predio (flujo 0.1); KPI + alertas + ocupación + actividad reciente.
- **Layout**:
```
┌──────────────────────────────────────────────────────────────┐
│ Dashboard                     [Refrescar]                    │
│ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐                 │
│ │Cargas  │ │Alertas │ │Ocupación│ │Perm. máx│                 │
│ │  ⟨n⟩   │ │  ⟨k⟩   │ │⟨%⟩     │ │⟨días⟩   │                 │
│ └────────┘ └────────┘ └────────┘ └────────┘                 │
│ Alertas abiertas (2)                        [Ver todas →]    │
│ ┌────────────┬───────────┬─────────┬────────────┐            │
│ │ Código     │ Ubicación │ Días    │ Acciones   │            │
│ │ 029TERRA26 │ Sector 4  │ 34      │ [Revisar]  │            │
│ └────────────┴───────────┴─────────┴────────────┘            │
│ Ocupación por sector (mini barras 1–12)                      │
│ Actividad reciente (timeline corta)                          │
└──────────────────────────────────────────────────────────────┘
```
- **Elementos**: 4 cards KPI (navegables con filtro precargado) — Cargas totales, Alertas abiertas (incluye `CAPACITY`, flujo 21), **Ocupación consolidada** (agregada por unidad compatible, BR-033/035: se muestran tantos valores como unidades en juego, p. ej. m² y pallets; no se suman unidades incompatibles) y Permanencia máxima; tabla de alertas OPEN (acción "Revisar" → flujo 9/10), mini-resumen de ocupación por sector, actividad reciente.
- **Estados**: `loading` (skeletons por card); `empty` ("Sin operaciones que mostrar" con CTA registrar carga si permiso); `error` (banner + retry, requestId).
- **Interacciones**: click en KPI navega con filtros; click en alerta → detalle de carga; "Refrescar" recarga datos.
- **Accesibilidad**: cards como enlaces (focus visible), tabla con `caption`, resumen por screen reader.
- **Nota**: los números de KPI siguen la regla canónica de unidad (OQ-009/014 → DP-SC-02 resuelta); la unidad por defecto por LocationType quedó resuelta en BR-041; el KPI de ocupación consolida por unidad compatible y su fórmula de agregación es **en vivo en v1** (OQ-031 resuelta 2026-09-24, sin job de materialización); los mensajes de empty invitan a la acción siguiente, no son texto muerto.

## 3. Cargas (listado)
- **Propósito**: buscar, filtrar, ordenar, paginar y navegar cargas (flujos 1, 11).
- **Layout**:
```
┌──────────────────────────────────────────────────────────────┐
│ Cargas                                [+ Registrar carga]    │
│ [Código][Estado ▾][Ubicación ▾][Camión][Fechas][Alertas]     │
│ [Buscar] [Limpiar]                    📄 Exportar (PDF)      │
│ ┌──────────┬────────────┬────────┬──────────┬─────┬─────┐    │
│ │ Código   │ Descripción│ Estado │ Ubicación│ Días│ ⚠  │    │
│ │029TERRA26│ …          │ STORED │ Sector 4 │ 34  │ ⚠  │    │
│ │…         │            │        │          │     │     │    │
│ └──────────┴────────────┴────────┴──────────┴─────┴─────┘    │
│ « 1 2 3 … 12 »  (25 por página)                             │
└──────────────────────────────────────────────────────────────┘
```
- **Columnas sugeridas** (coherentes con §4.1 y enums §4.3): Código (link al detalle), Descripción, Estado (badge `CargoStatusBadge`), Ubicación actual (nombre + tipo), Camión (patente, si tiene), Fecha ingreso, Permanencia (días, con semáforo de umbral 30d), Alertas (icono ⚠ si OPEN), Acciones (según rol: Mover, PDF).
- **Estados**: `loading` (skeleton de filas); `empty` (mensaje según haya filtros: "Sin resultados con estos filtros" + [Limpiar] / sin datos: "Aún no hay cargas" + [Registrar carga] si OPERATOR/ADMIN); `error` (banner + retry).
- **Interacciones**: filtros combinables en vivo (debounce en código), orden por columna (indicador), paginación server-side (25/100 por defecto, §10), selección múltiple para acciones en lote si aplica (DP-SC-03).
- **Accesibilidad**: tabla semántica (`<table>`, `th scope`, `caption`), badges con texto (no solo color, WCAG 1.4.1), paginación con aria-current, filtros con labels.
- **Nota**: el estado "permanencia" debe ser textual + numérica ("34 días"), nunca solo color; los estados de CargoStatus se muestran con badge texto+icono.

## 4. Detalle de carga
- **Propósito**: información completa de una carga + acciones operativas (flujos 3–7, 9–15, 12, 13).
- **Layout** (dos columnas: info + timeline):
```
┌──────────────────────────────────────────────────────────────┐
│ ← Volver  029TERRA26            [Estado: STORED] [⚠ alerta]  │
│ Descripción: …          [Mover a…][Exportar PDF][Editar]     │
│ ┌ Info general ────┐  ┌ Distribución (2 segm.) ──────────┐   │
│ │ Código           │  │ ▸ Sector 3 · 20 m² · 36% ACTIVE │   │
│ │ Estado           │  │ ▸ Sector 4 · 35 m² · 64% ACTIVE │   │
│ │ Ubicación actual │  │ Total 55/55 m² · En camión: 0   │   │
│ │ Camión           │  │ [Asignar][Ajustar][Egresar][>]  │   │
│ │ Fecha ingreso    │  └─────────────────────────────────┘   │
│ │ Permanencia 34d  │  ┌ Historial (timeline) ──────────┐    │
│ │ Observaciones    │  │ ▸ 2026-09-20 MOVE → Sector 4   │    │
│ └──────────────────┘  │ ▸ 2026-09-19 UNLOAD Plazoleta  │    │
│                       │ ▸ 2026-09-19 INGRESS → Plazoleta│   │
│                       └────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────┘
```
- **Elementos**: header (código, badges estado/alerta), acciones según rol (Mover/Observar/Rezago/Secuestro/Revertir-ADMIN/PDF), info general (ubicación actual, camión, fechas, permanencia), observaciones de la carga (notas sin movimiento), timeline de movimientos (flujo 12) y **sección Distribución (flujo 16)**: segmentos `CargoLocation` con ubicación, cantidad/unidad, porcentaje, estado (ACTIVE/EXITED), `enteredAt`/`exitedAt`, total distribuido vs total de la carga y residual en camión (`inTruckAmount`/`inTruckUnit` del backend — BR-038/042; fila informativa "En camión", el camión no es una ubicación y la UI no lo calcula); enlace a movimientos del segmento (flujo 12 filtrado por segmento/ubicación).
- **Estados**: `loading` (skeleton); `error` (carga inexistente o sin permiso → mensaje + volver); `empty` (sin movimientos aún: solo se ve si la carga nunca se movió; nota explicativa).
- **Interacciones**: acciones abren los diálogos del flujo correspondiente (`ObservationDialog` siempre, `ConfirmDialog` en 9/10/15); click en movimiento → detalle del movimiento (deep-link); badge de alerta → pestaña alertas. En Distribución, según rol: asignar/ajustar/egresar segmento (flujo 20), mover parcial (flujo 18), descargar parcial (flujo 19); click en un segmento → movimientos del segmento; click en la ubicación de un segmento → detalle de ubicación (pantalla 14).
- **Accesibilidad**: timeline como lista semántica con fechas completas, no solo "hace 3 días"; iconos con `aria-label`; el estado nunca se comunica solo por color; la tabla de distribución usa `<table>` semántica con `caption`.
- **Nota**: las observaciones pendientes de la carga se muestran antes de los movimientos (prioriza lo que hay que revisar); si la carga tiene alerta STALE_30D, el banner sugiere "Revisar → Mover a Rezago" (flujo 9) sin automatizar. Los porcentajes de la Distribución son informativos/derivados (OQ-045 → BR-049 resuelta; DP-SC-10 cerrada); el residual "En camión" lo provee el backend (OQ-042 RESUELTA → BR-042): fila informativa del panel, nunca nodo de mapa ni dato derivado en el cliente.

## 5. Registro / Edición de carga
- **Propósito**: crear carga (flujo 1) o editar datos permitidos (OPERATOR/ADMIN).
- **Layout**:
```
┌──────────────────────────────────────────────┐
│ Registrar carga                              │
│ Código*      [___________________]  (unique) │
│ Descripción* [___________________]           │
│ Fecha ingreso [dd/mm/aaaa] (default hoy)     │
│ Camión       [Seleccionar ▾]  [+ registrar]  │
│ Ubicación inicial [Ninguna ▾] (opcional)     │
│ Cantidad total [________] [u ▾] (BR-042)     │
│ [Cancelar]                [ Guardar ]        │
└──────────────────────────────────────────────┘
```
- **Elementos**: campos del formulario (validación en vivo), selector de camión (o acceso al registro de camión, flujo 2), ubicación inicial opcional (DP-SC-04: ¿asignar ubicación en registro o solo por ingreso?), **cantidad total + unidad** (`totalQuantity`/`totalUnit`, opcional si la carga se distribuye completa; obligatorios para distribución/descarga parcial — BR-042, error `CARGO_TOTAL_REQUIRED` 422 en backend).
- **Estados**: `editing` (errores inline por campo); `saving` (botón spinner); `duplicate` (409: mensaje sobre el código + link al existente); `success` (redirección al detalle).
- **Interacciones**: validación de unicidad con debounce (consulta al backend), Guardar deshabilitado si inválido, edición solo de campos permitidos (READ-ONLY los que dependen de movimientos).
- **Accesibilidad**: errores inline con `aria-describedby` y `role="alert"`, focus al primer error, labels visibles.
- **Nota**: la edición de "estado/ubicación" NO se hace aquí (violaría BR-016/B-008): se hace vía movimientos con observación; el formulario deja eso explícito en la UI (campo no editable con tooltip explicativo). Si la carga ya tiene segmentos distribuidos, `totalQuantity`/`totalUnit` se muestra en modo edición con la validación BR-042 (`CARGO_TOTAL_REQUIRED` 422 si se intenta una distribución parcial sin total).

## 6. Registro de camión
- **Propósito**: alta de camión (flujo 2) y gestión básica.
- **Layout**:
```
┌──────────────────────────────────────────────┐
│ Registrar camión                             │
│ Patente*    [________]                       │
│ Marca       [________]                       │
│ Modelo      [________]                       │
│ Conductor   [________] (opcional)            │
│ [Cancelar]                [ Guardar ]        │
└──────────────────────────────────────────────┘
```
- **Elementos**: formulario + al guardar, opción "Registrar cargas para este camión" (encadena flujo 1/3).
- **Estados**: `editing`, `saving`, `duplicate` (patente), `success`.
- **Interacciones**: búsqueda de camiones por patente; detalle de camión con cargas vinculadas (read-only para Viewer).
- **Accesibilidad**: estándar (labels, errores inline).
- **Nota**: formato de patente MERCOSUR `^[A-Z]{2,3}\d{2}[A-Z0-9]$` (DP-SC-05 resuelta — ID-009, relacionada OQ-003); el mensaje de patente duplicada ofrece "abrir camión existente".

## 7. Mapa Operativo
- **Propósito**: visualizar y operar la ubicación de cargas sobre el plano del predio (flujos 3/5/6/7, 8 visualización, 11); 65–70% mapa + panel derecho.
- **Layout**:
```
┌──────────────────────────────────────────────┬────────────────┐
│ Mapa (65–70%)               [Zoom][Pan][⟳]   │ Panel (30–35%) │
│ ┌────────────────────────┐  ┌───────────────┐ │ Buscar [____] │
│ │ PLAZOLETA (gris)       │  │ GALPÓN (amb.) │ │ [Estado ▾][Ub..]│
│ │  🚚 036TERRA26         │  │ ┌─┐ ┌─┐ ┌─┐  │ │ Lista:         │
│ │  🚚 055TERRA26         │  │ │1│ │2│ │3│  │ │ ▸ 029TERRA26   │
│ │                        │  │ └─┘ └─┘ └─┘  │ │   S4 · 34d · ⚠ │
│ │ [Áreas especiales]     │  │ …Sectores 12… │ │ ▸ 036TERRA26   │
│ │ Scanner Balanza        │  │               │ │   Plaz · 2d   │
│ │ Rezago Secuestro       │  └───────────────┘ │               │
│ └────────────────────────┘  [Leyenda ▾]      │ [count: 5]     │
└──────────────────────────────────────────────┴────────────────┘
```
- **Elementos**: canvas SVG (motor `architecture/MAP-ENGINE.md`), toolbar (zoom, pan, leyenda toggle), leyenda obligatoria, panel derecho (buscador, filtros por estado/ubicación, lista de cargas con resaltado cruzado).
- **Estados**: `loading` (skeleton del mapa); `empty` (predio sin cargas: mensaje + mapa limpio); `error` (mapa falló → retry); selección y hover siempre visibles.
- **Interacciones**: hover sobre ubicación/carga → tooltip + resaltado; click carga → detalle (panel de tarjeta `LocationCard`); hover en lista → resaltado en mapa (cross-highlight); drag de carga a sector si habilitado (DP-SC-06); zoom/pan por rueda/gestos y botones.
- **Accesibilidad**: alternativa accesible = listado del panel derecho (navegable por teclado); el mapa NO es el único canal; estados con icono+patrón+label (nunca solo color); todo el contenido del mapa alcanzable desde el listado.
- **Nota (estados vacíos/mensajes)**: el estado vacío del mapa explica que el predio está sin cargas y sugiere registrar/ingresar; los tooltips usan nombre real ("Sector 4", no coordenadas). Detalle completo en `MAP-UX.md`.

## 8. Planos (visualización y editor)
- **Propósito**: ver (todos los roles) y editar (ADMIN) el layout del predio (flujo 14).
- **Layout**:
```
┌──────────────────────────────────────────────────────────────┐
│ Planos   [Visualización ▾ / Edición 🔒]  [Snap][Grid][Undo]  │
│ ┌──────────────────────────────────────┐ ┌ Propiedades ──┐  │
│ │         CANVAS (SVG)                 │ │ Nombre: S4    │  │
│ │  [crear][mover][resize][borrar]      │ │ Tipo: SECTOR  │  │
│ │  (sectores, áreas especiales,        │ │ Cap.: 10 unid │  │
│ │   plazoleta)                         │ │ Color: …      │  │
│ └──────────────────────────────────────┘ └───────────────┘  │
│ [Leyenda]  [Cancelar cambios]                    [Guardar]   │
└──────────────────────────────────────────────────────────────┘
```
- **Elementos**: toolbar de modos (seleccionar/crear/mover/redimensionar/rotar/borrar), canvas SVG con grid y snap, panel de propiedades, controles zoom/pan, leyenda, guardar/cancelar.
- **Estados**: `viewing` (read-only); `editing` (solo ADMIN); `validation-error` (solapamientos resaltados en rojo, guardado bloqueado); `saving`; `error` (403 o fallo de API).
- **Interacciones**: crear ubicación → elegir tipo (PLAZOLETA/GALPON/SECTOR/SCANNER/BALANZA/REZAGO/SECUESTRO/OTRO), drag para posicionar/tamaño, snap a grid (`gridSize` del Map §4.1), editar propiedades (nombre, código, capacidad, unidad, color, estado ACTIVE/INACTIVE/MAINTENANCE): al cambiar de tipo, la unidad se precarga por defecto (Sector → m², Plazoleta/Scanner/Balanza → u, otros → configurable) con override por ubicación (BR-041; gobernanza ADMIN, auditoría `CAPACITY_CHANGE`), undo/redo (alcance DP-SC-07), guardar con confirmación.
- **Accesibilidad**: paneles de propiedades navegables por teclado; en modo visualización, misma alternativa accesible de listado que el mapa operativo; las barras de herramientas con tooltips y atajos documentados.
- **Nota**: borrar ubicación con cargas se bloquea ("movela antes"); el editor queda fuera de v1 (OQ-015 resuelta → DP-SC-08 cerrada: vista estática).

## 9. Alertas
- **Propósito**: listar y gestionar alertas (STALE_30D principalmente, flujo 8/9/10).
- **Layout**: tabla de alertas: Tipo (badge), Carga (código → detalle), Severidad, Permanencia/días, Estado (OPEN/ACKNOWLEDGED/RESOLVED/DISMISSED), Creada, Acciones ([Revisar] → detalle · [Reconocer] · [Mover a Rezago] si corresponde).
- **Estados**: `loading`; `empty` ("Sin alertas activas ✅" — estado positivo); `error` retry.
- **Interacciones**: filtrar por tipo/estado/severidad; "Reconocer" pasa a ACKNOWLEDGED con nota; "Mover a Rezago" abre el flujo 9 (observación obligatoria); resolución automática al mover a rezago.
- **Accesibilidad**: badge tipo/estado con icono+texto; tabla semántica.
- **Nota**: reconocer ≠ resolver: la UI diferencia "vi la alerta" de "resolví la causa" (mensajes claros en la acción correspondiente).

## 10. Historial (global)
- **Propósito**: actividad de movimientos de todo el predio (sondeo/consulta; flujo 12 a nivel carga).
- **Layout**: tabla: Fecha/hora, Carga (código), Tipo de movimiento, Origen → Destino, Usuario, Observación (expandible), Marcas de reversión.
- **Estados**: `loading`; `empty` ("Sin movimientos en el período"); `error`; `filtered-empty` (sin coincidencias + limpiar filtros).
- **Interacciones**: filtros por fecha/tipo/carga/usuario; expandir fila para ver observación completa; link a detalle de carga.
- **Accesibilidad**: tabla con `caption` y resumen; observaciones expandibles con aria-expanded.
- **Nota**: en móvil, la tabla pasa a cards apiladas (patrón de reflujo, no clonar desktop).

## 11. Auditoría
- **Propósito**: trazabilidad de acciones administrativas y de sistema (AuditLog §4.1; flujos 14/15 principalmente), consulta (ADMIN).
- **Layout**: tabla: Fecha/hora, Usuario, Acción (AuditAction: CREATE/UPDATE/MOVE/STATUS_CHANGE/DELETE/RESTORE/REVERT/MAP_EDIT/CAPACITY_CHANGE/PERMISSION_CHANGE/LOGIN/LOGOUT/EXPORT), Entidad, ID, Detalle (diff JSON previo/nuevo, expandible), IP/UserAgent (equilibrado con privacidad, BR-017).
- **Estados**: `loading`; `empty` ("Sin eventos de auditoría en el rango"); `error`; paginado.
- **Interacciones**: filtros por acción/usuario/fecha; expandir diff de cambios; deep-link a la entidad si está activa (p. ej. carga).
- **Accesibilidad**: diffs legibles por screen reader (lista de cambios, no blob JSON crudo — presentación en UI, los datos crudos quedan en API).
- **Nota**: visible solo para ADMIN (BR-011/012); los mensajes de "sin datos" explican el rango consultado.

## 12. Configuración
- **Propósito**: parámetros globales del predio (ADMIN): umbral de alerta (días), fecha base de permanencia (BR-015), unidades de capacidad, notificaciones (in-app v1, OQ-011), idioma (es-AR v1, OQ-012).
- **Layout**: secciones por tema con formularios simples y guardado por sección (evita guardado masivo).
- **Estados**: `loading`; `empty` (no aplica — siempre hay valores por defecto); `save-success` (toast); `save-error` (banner con requestId).
- **Interacciones**: cada sección guarda independiente; ediciones con confirmación si tienen impacto operativo (cambio de umbral 30d → panel de aviso).
- **Accesibilidad**: estándar; valores por defecto siempre visibles.
- **Nota**: los campos configurables (umbral de alerta 30/40 — OQ-008 → BR-014/015; unidad de capacidad por LocationType/override — BR-041) se muestran con el default canónico y etiqueta "configurable" — DP-SC-09 cerrada.

## 13. Usuarios / Roles
- **Propósito**: administrar usuarios, roles y permisos (ADMIN; futuro según §1.5 y RBAC §8).
- **Layout**: lista de usuarios (username, nombre, email, roles, activo, último login) + detalle/edición (asignar roles) + gestión de permisos por rol.
- **Estados**: `loading`; `empty` ("Sin usuarios" + CTA); `error`; guardados por sección.
- **Interacciones**: crear/activar/desactivar usuario (soft, auditado — PERMISSION_CHANGE), asignar roles (VIEWER/OPERATOR/ADMIN), editar permisos finos por rol.
- **Accesibilidad**: tabla semántica; toggles con labels y estados claros.
- **Nota**: sin hard delete: desactivar se explica como "el usuario no podrá ingresar, su historial se conserva" (BR-013).

## 14. Detalle de ubicación
- **Propósito**: ver la ocupación de una ubicación del predio: capacidad, ocupada, disponible, %, cargas contenidas con sus segmentos, señales de alerta y movimientos recientes (flujos 16/17/21).
- **Layout**:
```
┌──────────────────────────────────────────────────────────────┐
│ ← Volver  Sector 4 — S4    [Tipo: SECTOR] [ACTIVE]          │
│ ┌ Ocupación ──────────────┐  ┌ Cargas (3) ────────────────┐ │
│ │ ▓▓▓▓▓▓▓▓░░  80/100 m²   │  │ 029TERRA26 · 35 m² · 35% ⚠│ │
│ │ Ocupado 80 · Disp. 20   │  │ 032TERRA26 · 25 m² · 25%  │ │
│ │ (80 %)                  │  │ 050TERRA26 · 20 m² · 20%  │ │
│ │ [Alerta de capacidad ▸] │  │ 1 próx. a 30 días [Ver]   │ │
│ └─────────────────────────┘  └────────────────────────────┘ │
│ Movimientos recientes (timeline corta — flujo 12)           │
└──────────────────────────────────────────────────────────────┘
```
- **Elementos**: header (nombre, código, tipo, estado), `CapacityIndicator` (capacidad, ocupada, disponible, % — siempre con texto numérico, en la **unidad efectiva** de la ubicación: por defecto según `LocationType` o override — BR-041), tabla de cargas con el segmento de cada una (cantidad, %, estado del segmento, alerta), señal **"próximas a 30 días"** (ventana previa al umbral 🔶 residual local — DP-UF-14; DP-SC-12 cerrada; OQ-008 → BR-014/015), enlace a la alerta de capacidad si está OPEN (flujo 21), movimientos recientes de la ubicación.
- **Estados**: `loading` (skeleton); `empty` ("Ubicación sin cargas" + capacidad disponible); `error` (404 o sin permiso → mensaje + volver).
- **Interacciones**: click en carga → detalle de carga con su distribución (flujo 16); click en movimiento reciente → detalle del movimiento; acciones según rol: mover desde la ubicación (flujos 5/18), asignar carga (flujo 20); sobreocupación solo vía flujo 21 (ADMIN). Acceso: desde el mapa (`LocationCard` → "Ver detalle"), desde el detalle de carga (click en segmento) o desde Dashboard.
- **Accesibilidad**: `CapacityIndicator` con texto numérico (nunca solo barra/color), tabla semántica con `caption`, señal de alerta con ícono+texto (WCAG 1.4.1).
- **Nota**: la ocupación deriva de Σ de segmentos activos en unidad compatible (BR-033/035); la unidad mostrada es la efectiva de la ubicación (por defecto del tipo salvo override — BR-041, ex OQ-041 resuelta); la sobreocupación administrativa (BR-036/OQ-043) se representa según DP-SC-11.

---

## Decisiones de este documento
- D-SC-01: Las 14 pantallas cubren los flujos 0–21 de `USER-FLOWS.md` (la pantalla 14 documenta el detalle de ubicación de los flujos 16/17/21); ninguna acción operativa se ejecuta sin diálogo de observación/confirmación.
- D-SC-02: El listado de Cargas usa las columnas definidas aquí (código, descripción, estado, ubicación, camión, fecha, permanencia, alertas, acciones) como estándar para `frontend/COMPONENTS.md` (CargoTable).
- D-SC-03: En móvil, tablas → cards y mapa → drawer inferior (MASTER-SPEC §12); no se clona el layout desktop.
- D-SC-04: Los estados de la UI siguen la tríada loading/empty/error + éxito contextual; los mensajes de empty siempre proponen la siguiente acción.
- D-SC-05: Ningún estado se comunica solo con color (WCAG 1.4.1): badges con texto+icono, indicadores numéricos de permanencia.

## Criterios de aceptación
1. Cada pantalla especifica propósito, layout, elementos, estados, interacciones, accesibilidad y nota de UX (verificado arriba, sin secciones vacías).
2. Todas las pantallas se mapean a flujos de `USER-FLOWS.md` y reutilizan los enums/termas del MASTER-SPEC (§4.3).
3. El detalle de carga (con sección Distribución) y el detalle de ubicación (pantalla 14) permiten realizar los flujos 1–21 sin pantallas adicionales no documentadas; la sección Distribución es coherente con BR-032…BR-042 (MASTER-SPEC v0.3).
4. Las pantallas respetan los permisos por rol (BR-009/010/011/012): los elementos prohibidos se ocultan/deshabilitan con defensa en backend.
5. Coherencia con `ux/MAP-UX.md` (mapa 65–70% + panel derecho con resaltado cruzado).

## Archivos involucrados
- Este documento: `docs/ux/SCREENS.md`.
- Fuente: `docs/MASTER-SPEC.md`, `docs/OPEN-QUESTIONS.md`.
- Futuros (W2/W4/W5/W7/W8): `frontend/COMPONENTS.md` (CargoTable, CargoStatusBadge, ObservationDialog, ConfirmDialog, LocationCard, MapLegend…), `frontend/DESIGN-SYSTEM.md`, `frontend/ROUTING.md`, `backend/API.md`, `brand/BRAND-BOOK.md`, `brand/DESIGN-TOKENS.md`, `qa/TEST-CASES.md`.

## Riesgos
- R-SC-01: ~~Unidad/cálculo de ocupación sin definir (OQ-009/014)~~ → **resuelta (2026-09-24)**: unidad efectiva por tipo/override (BR-041), Plazoleta en UNITS (OQ-014) — cards y bajadas con regla canónica (DP-SC-02 cerrada).
- R-SC-02: El detalle de carga concentra demasiadas acciones (9 botones posibles) → riesgo de sobrecarga; mitigación: agrupar por tipo de operación (movimiento vs administrativo) y confirmar siempre.
- R-SC-03: La tabla de cargas con ~10 columnas en móvil requiere el reflujo a cards; si no se especifican prioridades de campos se pierde información crítica.
- R-SC-04: Auditoría con diffs JSON crudos rompe accesibilidad → se presenta lista de cambios en UI (decisión adoptada).
- R-SC-05: Alertas: "reconocer" puede confundirse con "resolver" → la UI diferencia con texto explícito.
- R-SC-06: La semántica de `percentage` (OQ-045 → BR-049 resuelta; DP-SC-10 cerrada) afecta la columna % de la Distribución y del detalle de ubicación: **derivado de UI** → sin riesgo de inconsistencia; la suma de segmentos sigue validándose por BR-034 (nunca la calcula la UI). Riesgo cerrado.

## DECISIÓN PENDIENTE
| ID | Pregunta | Impacto | Relación |
| --- | --- | --- | --- |
| DP-SC-01 | ¿Recuperación de contraseña en v1 o solo aviso "contactar al administrador"? | Login | 🔶 Residual local (DP-UF-01; sin OQ) |
| DP-SC-02 | ~~¿Qué unidad consolidan los KPI de ocupación del dashboard cuando conviven varias y qué umbrales visuales usan los indicadores?~~ → **RESUELTA (OQ-009 vía BR-041/OQ-046 + OQ-014, 2026-09-24)**: KPI consolida por **unidad efectiva** de cada ubicación (default por tipo o override — BR-041); Sector/Galpón → AREA (m²), Plazoleta → **UNITS (camiones)**; umbrales canónicos **<70 / 70–90 / >90** | Dashboard, Detalle de ubicación | OQ-009, OQ-014, OQ-046 (resueltas) |
| DP-SC-03 | ¿Acciones en lote sobre selección múltiple del listado de cargas (mover varias, exportar varias)? | Cargas | 🔶 Residual local (OQ — nueva; sin decisión de negocio) |
| DP-SC-04 | ~~¿En el registro de carga se permite asignar ubicación inicial, o la ubicación se asigna solo vía movimientos?~~ → **RESUELTA (OQ-004 + ID-003, 2026-09-23)**: **sin `locationId` en el alta** — la ubicación se asigna solo vía movimientos (ingreso/descarga/mover); egreso con `EXIT` (BR-043) | Registro/Edición | BR-008, OQ-004 → BR-043 (resuelta) |
| DP-SC-05 | ~~¿Formato de patente de camión (validación de UI)?~~ → **RESUELTA (ID-009, 2026-09-23)**: patente **obligatoria**, formato MERCOSUR `^[A-Z]{2,3}\d{2}[A-Z0-9]$` (BR-029 canónica) | Registro camión | OQ-003 / ID-009 (resueltas) |
| DP-SC-06 | ~~¿Drag-and-drop de cargas en el mapa operativo en v1, o solo mover vía formulario/diálogo?~~ → **RESUELTA (OQ-024, 2026-09-24)**: **NO en v1** — formulario/diálogo transaccional con observación obligatoria y validación backend | Mapa Operativo | OQ-024 (resuelta) |
| DP-SC-07 | ~~¿Undo/redo en el editor de planos en v1 o guardado por confirmación sin historial?~~ → **Sin efecto en v1 (OQ-015 resuelta: editor diferido)** | Planos | OQ-015 (resuelta) |
| DP-SC-08 | ~~¿Editor de planos disponible en v1 o vista estática hasta la fase 11?~~ → **RESUELTA (OQ-015, 2026-09-24)**: **vista estática en v1** (lectura + selección + hover); editor diferido | Planos | OQ-015 (resuelta) |
| DP-SC-09 | ~~¿Qué parámetros de Configuración son editables en v1 frente a OQ-008/009?~~ → **RESUELTA (OQ-008 → BR-014/015, 2026-09-23)**: editables en v1 — umbral de alerta (30 días), segunda alerta (40), fecha base (fija = `entryDate`, no configurable), unidad de capacidad por LocationType + override (BR-041) | Configuración | OQ-008 / OQ-009 (resueltas) |
| DP-SC-10 | ~~¿El porcentaje de distribución (`percentage`, CargoLocation) se almacena como valor canónico o se deriva en UI?~~ → **RESUELTA (OQ-045 → BR-049, 2026-09-24)**: **derivado de UI** e informativo (quantity/totalQuantity; input solo si unidad `PERCENT`); sin doble fuente | Distribución (detalle carga), Detalle de ubicación, mapa | OQ-045 → BR-049 (resuelta) |
| DP-SC-11 | ~~¿La sobreocupación administrativa (BR-036/OQ-043) afecta la presentación de la ubicación y qué rol la autoriza?~~ → **RESUELTA (OQ-043 → BR-036 ampliada, 2026-09-24)**: estado visual especial (fill > 100, badge "SOBRECUPACIÓN", alerta `CAPACITY`); autorización **solo ADMIN** (+10% default, observación, auditoría) | Detalle de ubicación, mapa, dashboard | OQ-043 → BR-036 (resuelta) |
| DP-SC-12 | ~~¿Qué ventana define "cargas próximas a 30 días" en el detalle de ubicación y es configurable?~~ → **RESUELTA (OQ-008 → BR-014/015, 2026-09-23)**: alerta a **30 días** y segunda a **40** (corridos, base `entryDate`); la ventana previa al umbral (p. ej. 5 días) = 🔶 residual local de UI | Detalle de ubicación | DP-UF-14, OQ-008 → BR-014/015 (resuelta) |