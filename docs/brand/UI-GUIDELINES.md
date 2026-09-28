# CargoOps — Guías de UI (UI-GUIDELINES)

> Grupo: W7 (brand) · Fuente canónica: `docs/MASTER-SPEC.md` (v0.3) · Estado FASE 0: especificación textual.
> Reglas de aplicación de los tokens (`DESIGN-TOKENS.md`) en componentes y patrones de interfaz. Complementa a `BRAND-BOOK.md` (identidad, voz y tono) y es consumida por `frontend/DESIGN-SYSTEM.md` (W4).
> Todas las referencias a color/tipografía/spacing usan tokens (`--color-*`, `--space-*`, …); está prohibido el hex suelto en código.

---

## 1. Objetivo

Definir el comportamiento visual e interacción de los patrones de UI de CargoOps — botones, formularios, tablas, badges, alertas, diálogos, tarjetas, indicadores de capacidad, navegación, estados vacíos y skeletons — para que cualquier implementador produzca interfaces **coherentes, accesibles (WCAG 2.2 AA) y operativamente sobrias** sin ambigüedad. Cada patrón incluye estados, reglas de uso y ejemplos hacer/no-hacer.

## 2. Contexto

- CargoOps es una plataforma **desktop-first** de uso profesional de alta frecuencia (MASTER-SPEC §12): el operador vive en la pantalla; la UI debe maximizar densidad de información útil sin sacrificar legibilidad.
- Principios canónicos (MASTER-SPEC §12): **claridad > decoración**, velocidad, legibilidad, **estados visibles**, mínima fricción, trazabilidad.
- Voz y tono definidos en BRAND-BOOK §5.6: copy corto, directo, con formato `Qué pasó + Por qué + Qué hacer` en errores; sin jerga marketinera.
- Toda pantalla define los cuatro estados base: `loading` (skeleton), `empty` (estado vacío con acción sugerida), `error` (mensaje claro + retry) y `normal`/`success` (feedback contextual) — convención heredada de `ux/USER-FLOWS.md`.
- Los errores de API usan el envelope `{ error: { code, message, requestId } }` (MASTER-SPEC §10): la UI muestra `message` del backend, nunca texto genérico inventado en frontend.
- El frontend **nunca es la capa de autorización** (BR-009): los controles se ocultan/deshabilitan según rol solo como experiencia; el backend valida.

## 3. Restricciones

- No introducir colores, tamaños ni duraciones fuera de `DESIGN-TOKENS.md`. Ningún hex en código.
- No inventar reglas de negocio: los umbrales no definidos (capacidad, permanencia) se marcan DECISIÓN PENDIENTE y se centralizan en `OPEN-QUESTIONS.md`.
- Animación mínima y funcional: solo transiciones de `transform`/`opacity` con tokens `--motion-*`; sin bounce, sin loop decorativo, sin animación de logo (BRAND-BOOK §5.8); respetar `prefers-reduced-motion` (`--motion-reduce`).
- **No usar color como único canal de información** (WCAG 1.4.1): todo estado semántico lleva ícono y/o texto (MASTER-SPEC §13; DESIGN-TOKENS §6.3).
- No exceso de color: como máximo un color semántico + los neutros por contexto de vista; los badges usan siempre el patrón `soft` + `-text`.
- Names y contratos de componentes en inglés; textos visibles en es-AR neutro (MASTER-SPEC §16, OQ-012).

## 4. Dependencias

| Documento | Relación |
| --- | --- |
| `docs/MASTER-SPEC.md` | §12 (UX/AA/responsive), §10 (envelope API), §8 (RBAC), §7 (máquina de estados), §9 (alertas) |
| `docs/brand/DESIGN-TOKENS.md` | Todos los valores que estas guías aplican (color, tipografía, spacing, motion, z-index) |
| `docs/brand/BRAND-BOOK.md` | Voz y tono (§5.6), usos incorrectos (§5.8), sistemas de apoyo (§5.9) |
| `docs/ux/USER-FLOWS.md` | Convenciones transversales: observación obligatoria, confirmación, estados de pantalla |
| `docs/frontend/COMPONENTS.md` | Inventario y contratos de los 16 componentes canónicos + propuestos |
| `docs/brand/MAP-VISUAL-GUIDELINES.md` | El mapa operativo consume estas mismas reglas de badges/indicadores |

## 5. Principios de aplicación

| Principio | Regla operativa |
| --- | --- |
| Claridad > decoración | Cada elemento tiene una función; si un adorno no aporta información, se elimina. Sin ilustraciones decorativas, sin degradados, sin sombras en tarjetas de página (solo borde 1px, `--border-color-default`). |
| Estados visibles | Hover, active, focus, disabled, loading y error son **siempre distinguibles**: cambio de color + no depender solo de opacidad. El feedback de éxito aparece en contexto de la acción. |
| Mínimas animaciones | Solo feedback funcional (hover/active 100ms, micro-interacciones 150ms, diálogos 200ms). Nunca animar contenido de datos (tablas, listas) al cargar: usar skeleton. |
| No exceso de color | Neutros de base (`background`/`surface`/`text`/`muted`); el color semántico se reserva para estados significativos. En una tabla de cargas, el estado se comunica por badge, no pintando filas. |
| Foco visible | `--color-focus-ring` (2px, offset 2px) en todo elemento interactivo; sobre superficies oscuras `--color-focus-ring-on-dark`. Nunca ocultar el foco ni reemplazarlo solo por color de borde de error. |
| Jerarquía tipográfica | `--font-size-md` base (16px); `xs` (12px) solo para metadatos no esenciales y código de carga en celdas; `muted` solo ≥14px y no esencial → si no, `muted-strong` (DESIGN-TOKENS §5.2). |

## 6. Decisiones

### 6.1 Botones

Cuatro variantes: `primary`, `secondary`, `danger`, `ghost`. Estados comunes: `default`, `hover`, `active`, `focus`, `disabled`, `loading`.

| Variante | Default | Hover | Active | Uso |
| --- | --- | --- | --- | --- |
| Primary | Fill `--color-primary` + texto `--color-text-inverse` | `--color-primary-hover` | `--color-primary-active` | Acción principal de la pantalla (una por vista): Guardar, Mover carga, Registrar |
| Secondary | Fill `--color-surface` + borde `--border-color-strong` + texto `--color-text` | `--color-surface-muted` | Borde `--border-color-strong` + fondo active overlay | Acciones alternativas: Cancelar, Exportar, Aplicar filtros |
| Danger | Fill `--color-danger` + texto blanco | `--color-danger-hover` | `--color-danger-hover` + overlay active | Acciones destructivas/irreversibles: Revertir, Eliminar, Pasar a secuestro |
| Ghost | Fondo transparente + texto `--color-text` (ícono acompañante) | `--color-surface-muted` | Overlay active | Acciones de baja prominencia: toolbar del mapa, ver detalle, quitar filtro |

Reglas:
- **Sizing**: altura 36px en `md` y 32px en `sm` (ambas múltiplos de la grilla de 4px, DESIGN-TOKENS §8); ancho según contenido con padding `--space-3`/`--space-4`; en diálogos y formularios el botón primario puede ser `full-width` solo en móvil. Radio `--radius-md`.
- **Loading**: spinner inline (ícono de 16px rotando con `--motion-base`) + label **sin reemplazar** el texto (evita saltos de layout); el control queda `disabled`; el formulario conserva los datos. Ejemplo:
  - ✅ `[spinner] Guardar…` (label presente, ancho estable)
  - ❌ reemplazar el texto por un spinner solitario que cambia el ancho y pierde contexto.
- **Disabled**: fondo `--color-primary-disabled-bg` + texto `--color-primary-disabled-text` (exento AA pero visiblemente apagado, con `--opacity-disabled` en íconos); sin hover, sin tooltip que explique el porqué salvo icono de candado + tooltip opcional para permisos (BR-009 UX).
- **Accesibilidad**: focus ring visible; `aria-disabled` cuando el botón es "disabled lógico" por permisos; no botones anidados; en íconos solos, `aria-label` siempre.

Ejemplos hacer/no-hacer:
```
✅ Vista de detalle de carga: [Mover carga] (primary), [Exportar PDF] (secondary), [Historial] (ghost)
❌ Dos botones primarios compitiendo por la acción principal de la pantalla.
✅ Error 403 en botón "Revertir" (Admin): botón visible con candado + tooltip "Requiere rol Admin"
❌ Ocultar silenciosamente acciones no permitidas sin explicación (dificulta el descubrimiento, BR-009 UX).
```

### 6.2 Formularios

- **Labels**: siempre visibles, asociados al control (`for`/`aria-labelledby`), `--font-size-sm` + `--font-weight-medium`; obligatorios marcados con `*` (no solo color: asterisco + texto de ayuda). El placeholder **nunca** actúa como label.
- **Help/hint**: texto secundario (`--color-muted-strong`, ≥14px) vía `aria-describedby` (formato esperado, ejemplo de código: "Usá el código impreso en el remito").
- **Validación**: en vivo por campo (blur + cambio para unicidad con debounce 300ms, flujo 1 de `USER-FLOWS.md`) + validación completa al submit. No bloquear la escritura mientras valida; indicar `checking` (spinner inline) en campos con verificación remota.
- **Errores por campo**: borde `--border-color-danger` + texto `--color-danger-text` con ícono ⚠ + mensaje `Qué pasó + Por qué + Qué hacer`; `aria-invalid="true"` y el mensaje en `aria-describedby`. El foco (ring) nunca se pierde por el borde de error: en foco, ring `--color-focus-ring` y borde danger conviven.
- **Error global de formulario**: banner `danger` arriba del form (sección §6.5) con resumen breve; el detalle va por campo; tras submit fallido (409/422), el foco se mueve al primer campo inválido.
- **Loading de submit**: botón primario en estado `loading` (§6.1); campos no críticos quedan `disabled` para evitar ediciones concurrentes; el estado se conserva ante pérdida de red (retry sin perder datos).
- **Mensajes de éxito**: feedback en contexto (banner `success` o navegación con confirmación en destino), nunca toasts como único canal (ver DP-UI-04).

Ejemplo (ASCII) de campo con error:
```
Observación (obligatoria) *
[________________________________________]
⚠ La observación es obligatoria para mover la carga. Escribí el motivo en este campo.
```

### 6.3 Tablas (CargoTable y derivadas)

- `<table>` real con `caption`, `thead` con `th scope="col"` y `--color-surface-muted` en el header; header **sticky** (`--z-sticky`) en listados largos.
- **Densidad**: default 44px de alto de fila; variante compacta 36px (opt-in, p. ej. pantallas de operador con mucha fila). Padding de celda `--space-3`. Sin zebra por defecto: separación con borde inferior `--border-color-default` y hover `--color-surface-muted` en fila entera.
- **Tipografía de datos**: códigos de carga, patentes e IDs en `--font-family-mono` (`xs`/`sm`); columnas numéricas (capacidad, permanencia en días) alineadas a la derecha con `tnum`; estados en `CargoStatusBadge` (§6.4).
- **Ordenamiento**: header clickeable con ícono ↑/↓ y `aria-sort` en el `th`; un solo criterio activo por defecto (multi-criterio opt-in); click alterna asc/desc/ninguno. Nunca cambiar el orden visual sin indicador.
- **Selección**: checkbox con label accesible; fila seleccionada con fondo `--color-primary-soft` + borde izquierdo `--color-primary` (2px); la selección se conserva al ordenar/paginar (id, no índice).
- **Paginación**: server-side (`?page&limit`, MASTER-SPEC §10); `PaginationBar` con total, página actual y `aria-live="polite"` al cambiar de página; en móvil: "mostrando 1–10 de 340" + anterior/siguiente.
- **Estados**: `loading` → skeleton de filas (§6.9); `empty` → `EmptyState` dentro de la tabla ("Sin cargas para los filtros aplicados"); `error` → fila de error con botón Reintentar que re-ejecuta la última consulta.

Ejemplos:
```
✅ Header: [Código ⇅] [Estado ▾] [Ubicación ⇅] [Permanencia ⇅]
❌ Indicar ordenamiento solo con un color de celda o una flecha casi invisible (1px).
✅ 029TERRA26 → celda en mono, sin cortar el código jamás (scroll horizontal si falta espacio)
❌ Cortar con ellipsis un código de carga: rompe la trazabilidad visual (BR-008).
```

### 6.4 Badges de estado (CargoStatusBadge, severity, PermanenceBadge)

Patrón obligatorio: **ícono + label + fondo `-soft` + contenido `-text`** (DESIGN-TOKENS §6.3). El color nunca es el único canal (WCAG 1.4.1).

| Estado (CargoStatus) | Fondo / contenido | Ícono | Nota |
| --- | --- | --- | --- |
| REGISTERED | neutro (`--color-surface-muted` / `--color-muted-strong`) | cuadro | sin ubicación aún |
| IN_TRUCK | `--color-info-soft` / `--color-info-text` | camión | en camión (plazoleta) |
| PARTIALLY_UNLOADED | `--color-warning-soft` / `--color-warning-text` | caja a medio llenar | descarga en curso |
| STORED | `--color-success-soft` / `--color-success-text` | caja | en depósito |
| IN_REVIEW | `--color-info-soft` / `--color-info-text` | lupa | scanner/balanza |
| REZAGO | `--color-warning-soft` / `--color-warning-text` | reloj | permanencia excesiva; decisión humana (BR-014) |
| SECUESTRO | `--color-danger-soft` / `--color-danger-text` | candado | solo ADMIN |
| IN_TRANSIT | `--color-info-soft` / `--color-info-text` | flecha/mover | transitorio, no editar |
| EXITED | neutro `muted` | salida | fuera del predio |
| DELETED | neutro `muted` + tachado | papelera | oculto por defecto en listados |

Badge de severidad de alerta (AlertStatus/severity): `OPEN` → `danger-soft`/`danger-text` con campana; `ACKNOWLEDGED` → `warning`; `RESOLVED`/`DISMISSED` → neutro `muted`. Severidad `CRITICAL` siempre `danger`.

PermanenceBadge: `0–25` días neutro; `26–30` `warning`; `>30` `danger` + ícono reloj. **Los umbrales son configurables (OQ-008) → DP-UI-06.**

Regla de contraste: texto de badge `sm` ≥14px siempre con variante `-text` (mínimo 4.5:1 verificado en DESIGN-TOKENS §5.2). Sin tooltip como único medio para conocer el estado.

### 6.5 Alertas / banners (info · success · warning · danger)

| Tipo | Fondo / contenido | Rol ARIA | Uso |
| --- | --- | --- | --- |
| Info | `--color-info-soft` / `--color-info-text` | `role="status"` | avisos no críticos (mantenimiento, sincronización) |
| Success | `--color-success-soft` / `--color-success-text` | `role="status"` | confirmación de operación en contexto |
| Warning | `--color-warning-soft` / `--color-warning-text` | `role="alert"` | advertencias: capacidad ≥ umbral, permanencia próxima a 30d |
| Danger | `--color-danger-soft` / `--color-danger-text` | `role="alert"` | errores (API/envío) y consecuencias destructivas |

Estructura: ícono + título (`semibold`, `sm`/`md`) + cuerpo (`sm`) + acción opcional (link/botón ghost) + cierre (×) si es dismissible. En errores de sistema se muestra el `requestId` (MASTER-SPEC §10) con formato del BRAND-BOOK §5.6: "No se pudo guardar el movimiento (ref. a3f2…). La carga no fue modificada. Intentá de nuevo o contactá al administrador." El banner de error de formulario se ubica arriba del form; los banners transitorios de confirmación duran hasta la siguiente navegación (sin auto-dismiss en acciones críticas).

AlertCard (dashboard/alertas): mismo patrón + severidad + metadatos (código de carga, días de permanencia) + acción primaria ("Revisar", "Pasar a rezago").

### 6.6 Diálogos

**ConfirmDialog** (acciones de alto impacto sin observación: editar plano, restaurar, eliminar soft de camión):
- Título (`--font-size-2xl`, `semibold`) + mensaje con la **consecuencia explícita** (tono serio, BRAND-BOOK §5.6) + botones `Cancelar` (secondary) / `Confirmar` (danger si destructivo).
- Scrim `--color-scrim` + `--z-dialog`; foco atrapado (focus trap) al abrir y restaurado al cerrar; cierre con `Esc`; sin cierre accidental (click fuera no cierra diálogos destructivos sin confirmación previa explícita — DP-UI-05 🔶 residual local adoptado).
- Tamaño: 400–480px; animación `--motion-slow` fade + scale 0.98→1 con `--motion-enter`; salida `--motion-exit`.

**ObservationDialog** (todo movimiento o cambio de estado, BR-006/007):
- Contexto visible: `Carga 029TERRA26 · Sector 4 → Sector 5` + estado resultante.
- `textarea` con label "Observación (obligatoria)" + hint de formato (motivo del movimiento); el botón **Confirmar queda deshabilitado mientras el texto esté vacío o solo con espacios** (BR-006/007 exigido por USER-FLOWS convenciones).
- Máximo de caracteres: 500 con contador (DP-UI-02 🔶 residual local adoptado); nunca truncar silenciosamente.
- Si la acción es además de alto impacto (reversión, secuestro), el diálogo muestra un banner `warning`/`danger` con la consecuencia explícita **dentro del mismo diálogo** (patrón combinado, DP-UI-03): no hay dos diálogos encadenados.
- El envío muestra estado `loading` en el botón; el error de backend (409/422) se muestra dentro del diálogo y **no cierra el diálogo**: el texto de la observación se conserva.

```
✅ ObservationDialog (movimiento a secuestro):
   ┌─ Pasar a secuestro ───────────────────────────┐
   │ ⚠ Esta acción marca la carga como SECUESTRO   │
   │   y queda registrada en el historial.         │
   │ Carga 433MANCH26 · Sector 1 → Área Secuestro  │
   │ Observación (obligatoria)*                    │
   │ [____________________________________] 120/500│
   │                              [Cancelar] [Confirmar] (disabled si vacío) │
   └───────────────────────────────────────────────┘
❌ Diálogo que confirma primero y recién después pide el motivo (dos pasos, pierde contexto y fricción doble).
```

**Regla de oro**: ningún movimiento/estado se confirma sin `ObservationDialog` (BR-006/007); ningún diálogo anida otro diálogo; los diálogos nunca muestran publicidad ni contenido decorativo.

### 6.7 Tarjetas

- Superficie `--color-surface`, borde 1px `--border-color-default`, radio `--radius-lg`, padding `--space-4`/`--space-5`; **sin sombra en página** (las sombras reservan jerarquía de overlay, DESIGN-TOKENS §10.1).
- Estructura: header (título `lg`/`md semibold` + acciones a la derecha), cuerpo, footer opcional. KPI del dashboard: label `sm` `--color-muted-strong` + valor `xl` `semibold` con `tnum`.
- Clickable: todo el card es un link/botón con focus ring visible, hover con borde `--border-color-strong` y elevación `--shadow-xs`; nunca un card "clickeable" sin `role`/cursor/keyboard support.
- Ubicación inactiva/en mantenimiento: el `LocationCard` muestra badge neutro "Inactiva"/"Mantenimiento" (patrón §6.4) y deshabilita acciones de movimiento (BR-004).

### 6.8 CapacityIndicator

- Barra de progreso + **texto siempre visible**: `"12 / 20 pallets (60%)"` para capacidad finita, o `"Sin límite"` para `CapacityType=UNLIMITED` (BR-041). Las unidades según `QuantityUnit` (UNITS/PALLETS/TONS/CUBIC_METERS/AREA/PERCENT) y el label refleja la **unidad efectiva** de la ubicación: por defecto según `LocationType` (Sector → m²; Plazoleta/Scanner/Balanza → u; otros → configurable) con override por ubicación ("Sector (m² por defecto)" / "override: pallets") — BR-041, gobernanza ADMIN.
- **Fila residual "En camión"** (BR-042): en el panel de distribución de una carga, `inTruckAmount`/`inTruckUnit` se presenta como fila informativa al final (estilo `info`, `role="status"`), **nunca** como alerta warning/danger ni como nodo de mapa: el camión no es una ubicación.
- Color del fill por umbral (canónico, OQ-046 resuelta 2026-09-24): `<70 %` → `--color-success`; `70–90 %` → `--color-warning`; `>90 %` → `--color-danger` (BR-005: no superar capacidad; el estado superado se marca como alerta y bloquea movimientos entrantes).
- Accesibilidad: `role="progressbar"` + `aria-valuenow/min/max`; el texto acompaña siempre (no color-only, WCAG 1.4.1).
- Superando capacidad: el número en `--color-danger-text` + banner warning en el LocationCard + ícono ⚠. Nunca animar el llenado de la barra (datos, no decoración).

### 6.9 Empty states y skeletons

**EmptyState** (patrón en `COMPONENTS.md` §5.2): ícono lineal (stroke 1.5–2) + título (`md semibold`) + descripción (`sm`, `--color-muted-strong` — nunca `muted` por debajo de AA) + acción sugerida (ghost/secondary). Tres variantes por contexto:
- "Sin datos aún" (primer uso): CTA de creación — "No hay cargas registradas. Para registrar la primera, usá 'Registrar carga'."
- "Sin resultados con filtros": sugerir limpiar filtros — "Sin cargas para los filtros aplicados. ¿Querés limpiar los filtros?"
- "Vacío operativo" (sector sin cargas): "No hay cargas en este sector. Para ubicar una carga, usá 'Mover carga'." (copy de BRAND-BOOK §5.6)

**Skeleton**: bloques `--color-surface-muted` de forma fiel al layout final (filas de tabla con 4–6 barras de ancho variable; card con header + 3 barras; texto con 2–3 líneas). Animación: pulse suave de opacidad (0.5↔1) a `--motion-base` con loop, **deshabilitado con `prefers-reduced-motion`** (bloques estáticos). `aria-busy="true"` en el contenedor; nunca mostrar skeleton y contenido a la vez; los skeletons nunca reemplazan el error (si falla, reemplazar por `ErrorState` con retry).

### 6.10 Navegación

- **Sidebar** (desktop, shell de `SCREENS.md`): ítem activo con fondo `--color-primary-soft`, texto `--color-primary` y marcador izquierdo (barra 3px); hover `--color-surface-muted`; colapsable a íconos (con tooltip). Ítems por rol (BR-009 UX): Viewer ve consulta; Operator agrega operación; Admin agrega Auditoría, Planos (edición), Configuración, Usuarios.
- **Topbar**: buscador global (CargoSearch, debounce 300ms), ícono de alertas con contador (badge `danger` open), menú de usuario.
- **Móvil** (<`--bp-md`): sidebar → drawer (`--z-drawer` + scrim) con botón hamburguesa; navegación por breadcrumbs en sub-niveles; mapa con panel inferior/drawer (no clonar desktop, MASTER-SPEC §12).
- **Tabs/pestañas dentro de secciones** (p. ej. Detalle de carga: Datos · Historial · Alertas): subrayado `--color-primary` (2px) en la activa; `aria-selected`, navegación con flechas; focus ring visible.

## 7. Criterios de aceptación

- [ ] Los 7 patrones (botones, formularios, tablas, badges, alertas, diálogos, tarjetas) + capacity indicators + navegación + empty states + skeletons tienen estados y reglas definidos.
- [ ] Todos los valores referencian tokens (`--color-*`, `--space-*`, `--radius-*`, `--motion-*`, `--z-*`); no hay hex sueltos definidos en este documento.
- [ ] Cada patrón tiene ejemplo hacer/no-hacer sin placeholders.
- [ ] Observación obligatoria (BR-006/007) integrada en el patrón de diálogo (§6.6) y en errores de formulario (§6.2).
- [ ] Las reglas son coherentes con BRAND-BOOK (voz/tono, do/don't) y DESIGN-TOKENS (contraste AA, motion).
- [ ] Toda ambigüedad de umbral/política está en §9 (DECISIÓN PENDIENTE) con pregunta + impacto + propuesta.

## 8. Archivos involucrados

- `docs/MASTER-SPEC.md` — §7, §8, §9, §10, §12, §13
- `docs/brand/BRAND-BOOK.md` · `docs/brand/DESIGN-TOKENS.md` · `docs/brand/MAP-VISUAL-GUIDELINES.md`
- `docs/ux/USER-FLOWS.md` · `docs/ux/SCREENS.md` — convenciones y shell que esta guía materializa
- `docs/frontend/COMPONENTS.md` — contratos de los componentes que esta guía estiliza
- Futuro: `docs/frontend/DESIGN-SYSTEM.md` (W4), `docs/OPEN-QUESTIONS.md` (centralización de pendientes)

## 9. Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Implementadores hardcodean valores (hex/spacing) en componentes | Regla de solo tokens + plantilla CSS de DESIGN-TOKENS §12 + lint futuro (stylelint) |
| Densidad excesiva por pensarlo "operativo" | Densidad default 44px; compacta 36px opt-in; `xs` solo para metadatos/códigos |
| Estado comunicado solo con color en tablas/badges | Regla ícono+label en todo badge/alerta/indicador (WCAG 1.4.1) |
| Observación obligatoria evadible (textarea vacío con espacios) | Validación de no-vacío tras trim en frontend + validación backend (BR-006/007) |
| Foco oculto detrás de errores de formulario | Ring de foco independiente del borde danger (§6.2) |
| Diálogos anidados o doble confirmación (fricción) | Patrón combinado §6.6 (banner + observación en un solo diálogo) |
| Umbrales de capacidad/permanencia aplicados sin validación | DP-UI-01/06 + DP-TK-03 (resueltas 2026-09-24: OQ-046 umbrales <70/70–90/>90; OQ-008 → BR-014/015 30/40); pendientes centralizados en OPEN-QUESTIONS |

## 10. DECISIÓN PENDIENTE

| ID | Pregunta | Impacto | Propuesta de este documento |
| --- | --- | --- | --- |
| DP-UI-01 | ~~¿Umbrales de CapacityIndicator: rangos de color (¿<90/≥90/≥100? ¿<70/70–90/>90?)?~~ → **RESUELTA (OQ-046, 2026-09-24)**: umbrales canónicos **normal <70% · warning 70–90% · danger >90%**; la unidad de cálculo quedó resuelta en BR-041 (efectiva por tipo de ubicación/override) | Dashboard, mapa, LocationCard | OQ-046 (resuelta 2026-09-24) |
| DP-UI-02 | ¿Longitud máxima y reglas de la observación (¿500 chars? ¿normalización de espacios?) | ObservationDialog, validación backend (BR-006/007) | 🔶 Residual local de UI (sin OQ; 500 caracteres con contador; trim + rechazo de solo espacios) |
| DP-UI-03 | Reversión/acciones de alto impacto: ¿un diálogo combinado (advertencia + observación) o dos pasos? | Experiencia y conformidad con BR-007 | 🔶 Residual local de UI (sin OQ; un solo diálogo combinado) |
| DP-UI-04 | ¿Toasts de éxito (ToastHost) en v1 o solo feedback contextual-inline? | Confirmaciones pos-acción; relacionado OQ-011 | 🔶 Residual local de UI (sin OQ; OQ-011 = notificaciones de alertas in-app, no toasts de acción) |
| DP-UI-05 | Diálogos destructivos: ¿permitir cierre por click fuera del diálogo? | Riesgo de confirmaciones accidentales | 🔶 Residual local de UI (sin OQ; no cerrar por click fuera en destructivas) |
| DP-UI-06 | ~~Umbrales de PermanenceBadge: ¿25/30 días o configurables por predio?~~ → **RESUELTA (OQ-008 → BR-014/015, 2026-09-23)**: alerta a **30 días** y segunda a **40** (corridos, base `entryDate`), configurables por settings; rango del badge (0–25 neutro · 26–30 warning · >30 danger) = propuesta local adoptada | Badges y alertas de rezago | OQ-008 → BR-014/015 (resuelta) |

> Nota de proceso: estos IDs (DP-UI-*) son locales al grupo W7; se reportan al orquestador para su centralización en `OPEN-QUESTIONS.md`. DP-UI-01/06 se consolidan con DP-TK-03 y OQ-008/009/014/046.

---

*Fin del documento. Próximo: `MAP-VISUAL-GUIDELINES.md` (sistema visual del plano operativo).*