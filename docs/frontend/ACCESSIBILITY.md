# CargoOps — Accesibilidad (WCAG 2.2 AA) (ACCESSIBILITY)

> Grupo W4 (frontend) · Fuente canónica: `docs/MASTER-SPEC.md` (§12 objetivo AA: navegación por teclado, focus, contraste AA, labels, ARIA, screen readers, diálogos, tablas, mapa con alternativa) y `docs/brand/DESIGN-TOKENS.md` (§5.2 auditoría de contraste).
> Fase 0: documentación. Los bloques fenced son ilustrativos; no se genera código de producción.

## 1. Objetivo

Definir cómo CargoOps alcanza y verifica **WCAG 2.2 AA**: criterios aplicados a los componentes clave (tabla, badge, diálogos, mapa), navegación por teclado, focus visible, contraste AA sobre tokens, labels/formularios, screen readers, alternativa accesible del mapa (listado de cargas por ubicación) y estrategia de testing a11y.

## 2. Contexto

MASTER-SPEC §12 fija el objetivo AA y la accesibilidad es parte del Definition of Done global (§20): "una funcionalidad no está terminada si le falta... accesibilidad básica". Los tokens ya traen auditoría de contraste y reglas de uso (DESIGN-TOKENS §5.2/§6.3). El mapa SVG (ADR-006) es el componente de mayor riesgo: debe tener alternativa operativa accesible (listado), porque nunca es la única vía de operación (MASTER-SPEC §12).

## 3. Restricciones

- R1: AA como requisito de aceptación de cada pantalla/componente (MASTER-SPEC §12/§20), no como mejora posterior.
- R2: Nunca color como único canal (WCAG 1.4.1; MASTER-SPEC §13, SCREENS D-SC-05): ícono/label/patrón siempre.
- R3: Focus y contraste provienen de DESIGN-TOKENS (`--color-focus-ring`, escala de contraste); sin excepciones por componente.
- R4: Todo diálogo (`ConfirmDialog`, `ObservationDialog`) cumple focus trap + retorno de foco + Esc.
- R5: El mapa nunca es la única vía de operación: alternativa en listado obligatoria (COMPONENTS §6.6/§6.10).
- R6: Regiones live con moderación: `polite` por defecto; `assertive` solo errores críticos (evitar "ruido" de lectores).

## 4. Dependencias

| Documento | Uso |
| --- | --- |
| `brand/DESIGN-TOKENS.md` §5.2/§6.3/§10.4 | Contraste AA, foco, motion reduce |
| `frontend/COMPONENTS.md` §6/§7 | Contratos ARIA por componente |
| `ux/SCREENS.md` | Pantallas y shell (skip link, tablas, mapa) |
| `qa/` (W8 futuro) | Test cases de accesibilidad |

## 5. Decisiones

### 5.1 Mapeo de criterios WCAG 2.2 AA a CargoOps

| Criterio | Aplicación en CargoOps |
| --- | --- |
| 1.1.1 Text alternatives | Mapa → listado de cargas por ubicación (§5.7); íconos decorativos `aria-hidden`; íconos con significado → `aria-label` i18n |
| 1.3.1 Info and relationships | `<table>` semántica (`caption`, `th scope`), `<dl>` en detalle de carga, `fieldset`+`legend` en filtros, `<ol>` en timeline y listado del mapa |
| 1.4.1 Use of color | Badges con label+ícono; permanencia textual+numérica ("34 días"); mapa con patrón+ícono+leyenda (MASTER-SPEC §13) |
| 1.4.3 Contrast (AA) | Auditoría de tokens (DESIGN-TOKENS §5.2): `muted` solo ≥14px no esencial; variantes `-text`; texto oscuro sobre fills success/warning/info; sin tamaños <12px |
| 1.4.10 Reflow | Desktop-first; tablas→cards y mapa→drawer en móvil (SCREENS D-SC-03); operable a 320px sin scroll horizontal |
| 1.4.11 Non-text contrast | Bordes/íconos con significado ≥3:1 (`warning-hover`, `info-text`, strokes del mapa); indicadores de foco ≥3:1 |
| 1.4.12 Text spacing | Line-heights de tokens; sin clipping con sobre-escritura de usuarios (verificar en QA) |
| 2.1.1 / 2.1.2 Keyboard | Todo operable por teclado (§5.2); sin trampas de foco |
| 2.2.2 Timing | Sin auto-refresco agresivo; polling con TTL adoptado (OQ-036 resuelta 2026-09-24: dashboard/alertas ~30s) → pausa automática en interacción y anuncio; sin parpadeos |
| 2.4.1 Bypass blocks | Skip link a `#main` en `app-shell` y `auth-layout` |
| 2.4.4 Link purpose | Anclas con propósito claro ("Ver todas las alertas", código de carga como link) |
| 2.4.7 Focus visible | Ring 2px offset 2px (`--color-focus-ring`; on-dark `--color-focus-ring-on-dark`); en el mapa, ring `--map-cargo-selected-ring` + foco reflejado en listado |
| 2.4.11 Focus not obscured (WCAG 2.2) | Header sticky y drawers no tapan el elemento con foco: offset 2px + scroll automático |
| 2.5.7 Dragging (WCAG 2.2) | Drag de cargas (si DP-SC-06) siempre con alternativa no-drag (diálogo de movimiento con observación); pan/zoom del mapa también por botones (`MapToolbar`) |
| 2.5.8 Target size (WCAG 2.2) | Targets ≥24×24; toolbar del mapa y botones de ícono ≥32px |
| 3.1.1 Language | `<html lang="es-AR">` (I18N §5.6) |
| 3.2.x Predictable | Sin cambios de contexto al enfocar; submit explícito; el diálogo no mueve la página de fondo |
| 3.3.1–3.3.4 Input assistance | Labels visibles (nunca placeholder único); errores inline con texto+ícono+`aria-describedby`; `role="alert"` en errores globales |
| 4.1.2 Name/Role/Value | `ui/dialog` (`role="dialog" aria-modal aria-labelledby`), tabla (`aria-sort`), `role="meter"`, toggles (`aria-pressed`), badges con name por texto visible |
| 4.1.3 Status messages (WCAG 2.2) | Toasts (`aria-live` polite; assertive en errores), paginación "mostrando X–Y de Z", "movimiento registrado" anunciado |

### 5.2 Navegación por teclado

- Orden del DOM: skip link → sidebar → topbar → contenido → diálogos; sin `tabindex` positivos.
- **Tabla de cargas**: el código es un link (Enter navega al detalle); orden por columna en `th` con botón (`aria-sort`); selección con checkbox; paginación con `aria-current="page"` (COMPONENTS §6.1).
- **Mapa**: el 100 % de las operaciones alcanzable desde el listado alternativo — seleccionar ubicación con Enter, abrir detalle, filtrar, mover (vía diálogo, no drag). El SVG puede ser adicionalmente navegable por flechas (`MapLocation` con `role="group"` + label, COMPONENTS §6.7) pero no es requisito porque la alternativa existe.
- **Diálogos**: foco inicial (título, o textarea en `ObservationDialog`), Tab cíclico (focus trap), Esc cancela (salvo `submitting`), retorno de foco al invocador al cerrar.
- **Atajos globales de teclado** ("g" al mapa, etc.): 🔶 residual local DP-A11Y-01 (no comprometer sin validación UX/W6; los atajos deben ser descubribles y no interferir con lectores).

### 5.3 Focus visible

- Tokens: `--color-focus-ring` (#2563EB) 2px con offset 2px; sobre superficies oscuras `--color-focus-ring-on-dark` (9.90:1 vs `--color-secondary`).
- Mapa: al seleccionar por teclado, la ubicación muestra el ring de selección y el listado sincroniza el foco (STATE-MANAGEMENT §5.5).
- Regla de implementación: nunca `outline: none` sin reemplazo visible (lint futuro).

### 5.4 Contraste AA (aplicación sobre tokens)

- Patrones verificados: botón primario (texto blanco sobre primary 5.17:1 ✓); link primary sobre blanco ✓; badge soft (fondo `-soft` + texto `-text`); `muted` (regla de uso: ≥14px y no esencial); disabled (exento AA pero visiblemente deshabilitado); mapa: labels de zona y marcadores ya auditados en DESIGN-TOKENS §11 (`--map-zone-galpon-text` 6.36:1 ✓, `--map-cargo-default` 4.64:1 ✓).
- Cualquier cambio de hex en tokens requiere re-auditoría (DP-TK-01).
- QA: auditoría automática por tokens + spot checks manuales; los approvals de diseño (W7 UI-GUIDELINES) no liberan AA.

### 5.5 Labels y formularios

- `ui/form-field`: label visible + hint + error; conexiones `for/id` y `aria-describedby` a hint y error; requerido indicado (asterisco + `aria-required` nativo); error → `aria-invalid`.
- Errores del backend (envelope) mapeados al campo correspondiente (BR-006 observación vacía en `ObservationDialog`; 409 duplicado en código); error global con `role="alert"`.
- Filtros: `fieldset`+`legend` por grupo (COMPONENTS §6.5); chips removibles con botón y `aria-label`.
- Errores de normalización de código (CargoSearch): mensaje con `aria-describedby` (COMPONENTS §6.4).

### 5.6 ARIA en componentes clave

- **`ui/dialog`** (base de `ConfirmDialog`/`ObservationDialog`): ver §5.8.
- **`ui/table` + `CargoTable`**: `caption` visible u oculto accesible; `th scope="col"`; columna ordenada con `aria-sort`; botón con label "Ordenar por X"; `aria-live="polite"` al cambiar de página (COMPONENTS §6.1).
- **`ui/badge` / `CargoStatusBadge`**: texto visible (label i18n) + ícono `aria-hidden`; el name nunca depende solo de `aria-label` (debe haber texto visible).
- **`CapacityIndicator`**: `role="meter"` + `aria-valuenow/min/max` + label textual (COMPONENTS §6.12).
- **Mapa**: `role="group"` en `MapLocation` con `aria-label` (nombre de ubicación); tooltip nunca exclusivo; alternativa §5.7.
- **`ToastHost`**: `aria-live="polite"` (éxito/info/offline), `assertive` (error); auto-dismiss solo informativos.
- **`PermanenceBadge`**: texto "34 días" (nunca solo color).
- **`AlertCard`**: `article` + encabezado + acciones con labels claras (reconocer ≠ resolver).
- **`MovementTimeline`**: `<ol>` con fechas absolutas legibles; reversiones marcadas textualmente ("revertido por…").

### 5.7 Alternativa accesible del mapa (listado de cargas por ubicación)

- El panel derecho del mapa ES la alternativa (SCREENS §7; COMPONENTS §6.6/§6.10): listado navegable por teclado de ubicaciones con ocupación y sus cargas; toda operación del SVG tiene equivalente en el listado o en diálogos.
- Sincronización cross-highlight compartida (dueño único `map.store`, STATE §5.5); anunciar solo la *selección* (no el hover) con `aria-live="polite"`.
- `MapToolbar` expone `toggleAccessibleList()` con `aria-pressed` (COMPONENTS §6.8); en móvil, el drawer contiene el mismo listado.
- Estados de ocupación en el listado con los mismos canales (texto + indicadores), nunca solo color.

### 5.8 Diálogos (`ObservationDialog`, `ConfirmDialog`)

- **`ObservationDialog`** (COMPONENTS §6.15): foco inicial en el textarea; label + contador de caracteres anunciados; errores de validación y de backend con `aria-describedby`; botón submit con loading; nunca se cierra con pendiente sin aviso.
- **`ConfirmDialog`** (COMPONENTS §6.14): foco inicial en el botón menos destructivo (en tono `danger`, el foco va a Cancelar para prevenir accidentes); mensaje de riesgo claro; `aria-labelledby` al título.
- Ambos: focus trap, Esc cancela, retorno de foco al invocador; z-index de token (`--z-dialog`) con scrim.

### 5.9 Screen readers y anuncios

- `<title>` dinámico por ruta (ROUTING §5.5) + h1 único por página (SEO §5.6).
- Anuncios: fin de carga ("listado actualizado"), "movimiento registrado" (éxito de mutación), errores con `role="alert"`, "nueva versión disponible" (PWA), estado offline.
- Dashboard: cada card KPI con label descriptivo y resumen legible (SCREENS §2).
- Auditoría: diffs presentados como lista de cambios legible, no blob JSON crudo (SCREENS §11).
- Permanencia y estados siempre textuales + numéricos, no solo color (SCREENS D-SC-05).

### 5.10 Testing de accesibilidad

- **Automático (CI)**: escaneo axe-core (o equivalente) en unit/E2E por página; lint future: prohibir `outline: none` sin reemplazo y color como único canal; contraste verificado sobre tokens.
- **Manual (checklist por pantalla)**: recorrido completo por teclado (Tab/Enter/Esc/flechas); lectores de pantalla (al menos NVDA + VoiceOver); zoom 200%; reflow a 320px; `prefers-reduced-motion`.
- **Casos críticos para el TEST-PLAN futuro (W8)**: mover una carga solo por teclado; completar `ObservationDialog` sin ratón; operar el mapa vía listado; ordenar/paginar la tabla por teclado; diálogo con foco atrapado y retorno correcto.

## 6. Criterios de aceptación

- CA-1: Auditoría axe-core en verde (0 errores; alertas justificadas y documentadas) para cada página.
- CA-2: Todas las rutas navegables 100 % por teclado (incluido el mapa vía listado).
- CA-3: Diálogos con trap/retorno/Esc verificados en E2E.
- CA-4: Ningún componente comunica estado solo con color (revisión de implementación; badge, indicadores, mapa, permanencia).
- CA-5: La alternativa del mapa alcanza el 100 % de las operaciones del SVG.
- CA-6: `prefers-reduced-motion` respetado (DESIGN-TOKENS §10.4).

## 7. Archivos involucrados

- Consumidores: `frontend/DESIGN-SYSTEM.md` (apariencia de focus/estados), `frontend/COMPONENTS.md` (ARIA), `frontend/SEO.md` (títulos), `frontend/I18N.md` (textos y anuncios).
- Fuentes: MASTER-SPEC §12/§20, `brand/DESIGN-TOKENS.md` §5.2, `ux/SCREENS.md`, ADR-006 (mapa alternativo).

## 8. Riesgos

- R-01: Mapa como vía exclusiva de operación → bloqueado por CA-5.
- R-02: Regiones live ruidosas (hover anunciado, toasts frecuentes) → regla R6 + revisión.
- R-03: Drag de cargas sin alternativa no-drag (WCAG 2.5.7) → la alternativa por diálogo es obligatoria si DP-SC-06 habilita drag.
- R-04: Contraste roto por cambios de tokens → DP-TK-01 + re-auditoría.
- R-05: ~~Enum de severidad de alerta sin definir (DP-COMP-03)~~ → **resuelta (ID-007, 2026-09-23)**: `AlertSeverity` canónico en MASTER-SPEC §4.3 (`LOW | MEDIUM | HIGH | CRITICAL`); el mapeo visual/accesible de `AlertCard` se fija contra ese enum.

## 9. DECISIÓN PENDIENTE

| ID | Pregunta | Relación |
| --- | --- | --- |
| DP-A11Y-01 | ¿Atajos de teclado globales documentados en v1? | 🔶 Residual local UX/W6 (MAP-UX, USER-FLOWS; sin OQ asociada) |
| DP-A11Y-02 | ~~Política de anuncios y pausa ante polling/refresco automático (WCAG 2.2.2)~~ → **RESUELTA (OQ-036, 2026-09-24)**: **polling con TTL** (dashboard/alertas ~30s; detalle/mapa manual) con **pausa automática en interacción** (WCAG 2.2.2) — sin WebSocket en v1 | OQ-036 (resuelta 2026-09-24) / STATE-MANAGEMENT DP-ST-02 |