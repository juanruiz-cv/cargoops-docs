# CargoOps — Design System del Frontend (DESIGN-SYSTEM)

> Grupo W4 (frontend) · Fuente canónica: `docs/MASTER-SPEC.md` (§11.4, §12, §13) y `docs/brand/DESIGN-TOKENS.md` (W7).
> Fase 0: documentación. Los bloques fenced son ilustrativos; no se genera código de producción.

## 1. Objetivo

Definir el design system de la UI de CargoOps: cómo se aplican los design tokens de `brand/DESIGN-TOKENS.md` a las primitivas `ui/`, los estados estándar de componente (loading / empty / error / disabled), la jerarquía visual y las reglas operativas de uso (claridad > decoración; sin animaciones innecesarias). Es la capa de apariencia que viste los componentes de `COMPONENTS.md` y las pantallas de `ux/SCREENS.md`.

## 2. Contexto

CargoOps es una herramienta de **operación profesional**: desktop-first, tablas densas, mapa SVG, formularios con observación obligatoria (MASTER-SPEC §12/§11.4). El sistema visual se materializa en `brand/DESIGN-TOKENS.md` (valores con auditoría de contraste AA) y, próximamente, en `brand/UI-GUIDELINES.md` y `brand/MAP-VISUAL-GUIDELINES.md` (W7). Este documento es el puente entre los tokens y la implementación Angular (ADR-002): define patrones de componente, estados y jerarquía sin redefinir valores.

## 3. Restricciones

- R1: La UI referencia SOLO tokens semánticos (`--color-primary`, `--space-4`, `--radius-md`, ...); ningún hex, px ni duración se hardcodea fuera de los tokens (DESIGN-TOKENS §3/§5.1).
- R2: No redefinir la paleta base del MASTER-SPEC §13; su modificación es decisión del usuario (DP-TK-01).
- R3: Claridad > decoración: sin sombras decorativas en tarjetas, sin gradientes, sin animaciones no esenciales (MASTER-SPEC §12; DESIGN-TOKENS §10.4).
- R4: Contraste AA como requisito de diseño: reglas de texto sobre fills semánticos y variantes `-text` (DESIGN-TOKENS §5.2/§6.3). Detalle en `ACCESSIBILITY.md`.
- R5: Ningún estado se comunica solo con color (WCAG 1.4.1; MASTER-SPEC §13): ícono, patrón o label siempre.
- R6: Las primitivas de UI son presentacionales (solo inputs/outputs), viven en `ui/` y no contienen lógica de dominio (`FRONTEND-ARCHITECTURE.md` §5.8; CA-6).
- R7: Desktop-first; en móvil las tablas refluyen a cards y el mapa usa panel/drawer inferior (MASTER-SPEC §12; SCREENS D-SC-03).

## 4. Dependencias

| Documento | Uso |
| --- | --- |
| `brand/DESIGN-TOKENS.md` | Única fuente de valores (color, tipografía, spacing, radius, shadows, motion, z-index, `--map-*`) |
| MASTER-SPEC §12/§13 | Principios UX y paleta base |
| `frontend/COMPONENTS.md` | Contratos de componentes que este sistema viste |
| `frontend/FRONTEND-ARCHITECTURE.md` | Estructura `ui/`, OnPush, flujo de datos, reglas de componentes |
| `ux/SCREENS.md` | Pantallas y shell que consumen las primitivas |
| `frontend/ACCESSIBILITY.md` (hermano W4) | Requisitos AA de cada patrón visual |

## 5. Decisiones

### 5.1 Tokens consumidos (resumen operativo)

La fuente de valores es DESIGN-TOKENS.md; aquí se fija el uso.

**Color (semánticos clave):**

| Token | Uso | Nota de contraste |
| --- | --- | --- |
| `--color-primary` | Acciones principales, links, foco, elementos activos | 5.17:1 vs blanco ✓ |
| `--color-secondary` | Superficies oscuras (header), botón secundario | 17.85:1 ✓ |
| `--color-background`/`--color-surface` | Fondo de página / tarjetas, tablas, diálogos | — |
| `--color-text`/`--color-muted`/`--color-muted-strong` | Texto principal / secundario (muted solo ≥14px y no esencial; si no, muted-strong) | 17.85 / 4.76 / 7.58 ✓ |
| `--color-success/warning/danger/info` + variantes `-text`, `-soft`, `-hover` | Estados y alertas | fills con texto oscuro; texto sobre claro usa `-text` |
| `--color-focus-ring` / `--color-focus-ring-on-dark` | Foco visible 2px, offset 2px | 5.17 / 9.90 ✓ |

**Tipografía:** escala xs (12px) a 3xl (30px), base `--font-size-md`; familia mono para códigos de carga, patentes e IDs; `tnum` en tablas/KPIs; pesos 400–700 (sin light).

**Spacing:** escala base 4px; padding estándar `--space-4`; diálogos `--space-5`; secciones `--space-6`; contenedor de página `--space-8`. Solo múltiplos de la escala.

**Radius/Sombra:** `--radius-md` en controles y badges; `--radius-lg` en tarjetas/contenedor de tabla; `--radius-xl` en diálogos/paneles; `--shadow-*` solo para overlays (dropdown < diálogo): las tarjetas en página llevan borde 1px, no sombra.

**Z-index/motion:** escalas de DESIGN-TOKENS §10.4/§10.5 (`--z-sticky` < `--z-dropdown` < `--z-drawer` < `--z-scrim` < `--z-dialog` < `--z-toast`); motion mínima, solo transform/opacity.

**Reglas de color (heredadas de DESIGN-TOKENS §6.3):**
1. Texto del color sobre blanco → variante `-text`.
2. Fill sólido semántico con texto → texto oscuro `#0F172A` sobre success/warning/info; texto blanco sobre primary/danger.
3. Badges → fondo `-soft` + contenido `-text` (patrón soft).
4. Nunca color como único canal de información.
5. Disabled → neutros grises + textura visible (exento AA pero claramente deshabilitado).

### 5.2 Primitivas `ui/` (base del design system)

Cada primitiva es standalone, `ChangeDetectionStrategy.OnPush` y presentacional. Contrato de inputs/outputs completo en `COMPONENTS.md`; aquí su apariencia y estados.

**`ui/button`** — variantes: `primary` (fill), `secondary` (fill oscuro), `surface` (blanco + borde), `ghost` (sin borde), `danger` (fill rojo, solo acciones destructivas). Tamaños sm/md/lg derivados de la escala: padding `--space-1/2/3` + `--space-3/4/5` y `--font-size-sm/md` (definición de px exactos en implementación sobre tokens). Estados: default / hover / active / focus (ring `--color-focus-ring` 2px offset 2px) / disabled (grises `--color-primary-disabled-*`, exento AA pero visible) / loading (spinner inline, ancho estable, `aria-busy`). Target mínimo 24×24 (WCAG 2.2 2.5.8); el label nunca es solo ícono (salvo ícono + `aria-label`, permitido en toolbar).

**`ui/input`, `ui/select` + `ui/form-field`** — label visible siempre (nunca placeholder como único label); hint opcional; error inline con ícono + texto; estados default / focus (ring) / invalid (borde `--color-border-danger`) / disabled (gris + `--opacity-disabled`) / readonly. `form-field` conecta label, control, hint y error con `for/id` y `aria-describedby` (detalle en `ACCESSIBILITY.md` §5.5).

**`ui/table` (primitiva) y `CargoTable` (dominio)** — tabla semántica (`<table>`, `caption`, `th scope="col"`); header sticky (`--z-sticky`); hover de fila `--color-surface-muted`; selección resaltada `--color-primary-soft`; orden con `aria-sort` + indicador; celdas compactas `--space-3`, `tnum` en columnas numéricas; paginación server-side. En móvil la tabla refluye a cards (`< bp-md`): no clonar desktop (MASTER-SPEC §12; SCREENS D-SC-03).

**`ui/badge`** — patrón soft: fondo `-soft` + texto/ícono `-text`; `--radius-full`; variantes por estado (success/warning/danger/info/muted). Ícono + label; nunca solo color.

**`ui/dialog`** — primitiva base para `ConfirmDialog` y `ObservationDialog` (COMPONENTS §6.14/§6.15): surface, `--radius-xl`, `--shadow-lg`, scrim `--color-scrim`, `--z-dialog`; header con título `--font-size-2xl`; footer de acciones alineadas a la derecha, botón primario a la izquierda del botón de riesgo. ARIA completo en `ACCESSIBILITY.md` §5.8.

**`ui/tooltip`** — solo refuerzo informativo, **nunca único canal** (COMPONENTS: tooltips no exclusivos en badges, mapa y toolbar); aparece en hover/focus, se cierra con Esc; `--z-dropdown`, `--shadow-md`.

**`ui/spinner` + `LoadingIndicator`** — spinner para acciones puntuales (inline en botones); skeleton para bloques de datos (tablas, mapa, detalle). Skeleton sin shimmer en v1 (loop decorativo evitado por R3): opacidad estática y etiqueta `aria-busy` en el contenedor.

**`ToastHost`** — toasts de éxito/error/info/offline; `--z-toast`; auto-dismiss solo en informativos (éxito/info), nunca en error; `aria-live` polite, assertive en errores (ACCESSIBILITY §5.6).

### 5.3 Estados de UI (patrones)

- **Loading**: skeleton para bloques de datos; spinner inline en acciones; `aria-busy` en contenedores. Nunca tabla vacía parpadeando.
- **Empty**: `EmptyState` con título + mensaje + acción sugerida ("los mensajes de empty proponen la siguiente acción" — SCREENS D-SC-04; p. ej. "Sin cargas para los filtros aplicados" + [Limpiar filtros]).
- **Error**: `ErrorState` con mensaje + `requestId` + reintento solo en operaciones idempotentes (GET) (FRONTEND-ARCHITECTURE §5.6). Errores de mutación inline en el punto de acción: toast + formulario conservando datos; nunca navegación a pantalla genérica.
- **Disabled**: exento de contraste AA (WCAG 1.4.3) pero visualmente deshabilitado: grises + `--opacity-disabled`; el botón mantiene su geometría.
- **Secuencia** obligatoria: `loading → (error | empty | content)`; un componente no alterna estados de forma confusa ni muestra contenido mientras carga (salvo `refreshing` silencioso con indicador discreto — STATE-MANAGEMENT §5.6).

### 5.4 Jerarquía visual

- **Tipográfica**: h1 de página `--font-size-xl`; h2 de diálogo/sección `--font-size-2xl`; títulos de tarjeta `--font-size-lg`; cuerpo `--font-size-md`; metadatos/captions `--font-size-sm` (regla muted); código/especiales mono.
- **Elevación**: contenido de página plano (bordes 1px), overlay jerarquizado por z-index + sombra; nunca elevar tarjetas de contenido con sombra.
- **Espaciado**: ritmo base `--space-4`; separación de secciones `--space-6`; padding de contenedor `--space-8`.
- **Énfasis**: `primary` reservado a acciones principales/links/foco; `danger` exclusivo de destrucción; `success` a confirmaciones y estados OK (STORED); `warning` a advertencias/revisión (IN_REVIEW, PARTIALLY, rezago); `info` a contextos informativos (IN_TRUCK, scanner). No usar primary como decoración.
- **Densidad**: tablas y listados compactos (más datos por pantalla, desktop-first); modos de densidad adicionales fuera de v1 (sin decisión).

### 5.5 Mapa y color (`--map-*`)

- El mapa consume el namespace `--map-*` de DESIGN-TOKENS §11 (nunca hex directos).
- Nunca color como único canal: estado + patrón (`--map-pattern-hatch*`) + ícono + label; **leyenda obligatoria** desplegable (MAP-VISUAL-GUIDELINES W7).
- Umbrales de ocupación: `-available` / `-partial` / `-full` con fills suaves y stroke fuerte; estados inactiva/mantenimiento con hatch + opacidad.
- Selección/hover: ring `--map-cargo-selected-ring` (2px, offset 2px); el foco del teclado se refleja tanto en el SVG como en el listado alternativo (ACCESSIBILITY §5.7).
- Cargas con alerta: anillo/ícono `--map-cargo-alert-ring` + label; en tránsito: dashed `--map-cargo-transit-stroke`.

### 5.6 Formato de unidades y patrones de capacidad (distribución M:N)

Reglas para cantidades, capacidad y ocupación (BR-033/035/040; secciones 62-70). Los valores los provee el backend (`GET /locations/:id/capacity`, `GET /cargos/:id/locations`); la UI formatea, nunca suma unidades incompatibles (BR-035).

- **Formato de unidades** (aplicar en tablas, tarjetas, KPIs y `CapacityIndicator`):

| Unidad (`QuantityUnit`) | Formato es-AR | Ejemplo |
| --- | --- | --- |
| `AREA` | m² (superíndice) | 35 m² |
| `CUBIC_METERS` | m³ (superíndice) | 12,5 m³ |
| `PALLETS` | pallets (singular/plural según cantidad) | 8 pallets |
| `TONS` | t | 3,2 t |
| `PERCENT` | % | 60 % |
| `UNITS` | u (o "unidades" en contexto largo) | 250 u |

  - La unidad **siempre visible junto al valor** (nunca implícita); tipografía `tnum` para el número (DESIGN-TOKENS §5.3).
  - En tablas densas la unidad puede vivir en el header de columna, pero se repite en la celda cuando la columna mezcla unidades (p. ej. distribución de una carga).
  - Nunca mostrar un total consolidado de segmentos en unidades distintas: si se agrupa, se agrupa por unidad compatible y el total autoritativo es el del backend (`LocationOccupancy`).
  - **Label de unidad efectiva** (BR-041): la unidad por defecto depende del `LocationType` (Sector → m²; Plazoleta/Scanner/Balanza → u; otros → configurable) con override por ubicación (gobernanza ADMIN, `CAPACITY_CHANGE`). En formularios/listados el label refleja la unidad efectiva: "Sector (m² por defecto)" o "override: pallets" cuando la ubicación la redefine.
  - **Fila residual "En camión"** (BR-042): en el panel de distribución de una carga, `inTruckAmount`/`inTruckUnit` se muestra como fila informativa al final (estilo info-soft, `role="status"`), **nunca** como alerta warning/danger ni como nodo de mapa: el camión no es una ubicación.

- **Patrón de barra de capacidad** (`CapacityIndicator` / `LocationOccupancyCard`):
  - Barra horizontal con fill semántico: ancho = `occupied / capacity` (idem máxima en sobreocupación, con marcador extra); etiqueta textual obligatoria: "80 de 100 m² · disponibles 20 m²".
  - `UNLIMITED`: sin barra, texto "Ilimitado".
  - Umbrales de color sobre tokens semánticos (nunca hex): ocupación normal → `success`; **70–90 % → `warning`** y **>90 % → `danger`** (umbrales canónicos — OQ-046 resuelta 2026-09-24; configurables a futuro); sobreocupación administrativa (`allowOverOccupation` — BR-036 ampliada/OQ-043 resuelta) → `danger` + patrón de franjas (hatch) como refuerzo.
  - La ocupación sobre el mapa usa el namespace `--map-*` con fills `-available`/`-partial`/`-full` (ver §5.5) y los mismos umbrales.

- **Accesibilidad**: contraste AA verificado en todas las variantes (fills con texto oscuro o variante `-text`, DESIGN-TOKENS §6.3); `role="meter"` con `aria-valuenow/min/max` y `aria-valuetext` con unidad; **texto + color siempre** (WCAG 1.4.1, R4).

### 5.7 Motion (mínima, no decorativa)

- Transiciones solo en `transform`/`opacity`; duraciones `--motion-fast` (100ms) / `--motion-base` (150ms) / `--motion-slow` (200ms) de DESIGN-TOKENS §10.4.
- Sin bounce, sin loop decorativo, sin animación de logo, sin skeleton shimmer.
- `prefers-reduced-motion` (`--motion-reduce`): eliminar todo movimiento no esencial; mantener solo fade ≤100ms de feedback de estado.

### 5.8 Responsive (desktop-first)

- Diseñar desde `--bp-xl` (1280px) hacia abajo (DESIGN-TOKENS §10.3).
- Tablas → cards apiladas < `--bp-md` (768px); mapa → panel inferior/drawer < `--bp-md` (MASTER-SPEC §12); sidebar → drawer en móvil (SCREENS shell); toolbar del mapa reduce labels a íconos en pantallas pequeñas manteniendo target ≥24px.

## 6. Do's & Don'ts operativos

| Do | Don't |
| --- | --- |
| Usar solo tokens semánticos (`--color-*`, `--space-*`, ...) | Hardcodear hex, duraciones o px fuera de tokens |
| Mostrar siempre estados loading/empty/error con acción siguiente | Tablas vacías o pantallas mudas |
| Respetar contraste AA: `-text` sobre claros, texto oscuro sobre fills | Texto blanco sobre warning/info/success |
| Comunicar con ícono + label (y patrón en el mapa) | Color como único canal |
| Confirmar mutaciones con `ConfirmDialog`/`ObservationDialog` (BR-006/007) | Toast único como confirmación de operación crítica |
| Mantener foco visible en todo elemento enfocable | Quitar outline sin reemplazo visible |
| Skeleton/sombra según jerarquía (sombras solo overlays) | Skeleton shimmer o sombras en tarjetas |
| Mensajes de error con contexto + `requestId` | Mostrar stack traces o errores técnicos al usuario |
| Animación mínima y sin loop; respetar reduced motion | Decoración con movimiento |
| Labels visibles con hint | Placeholder como único label |
| Mapa con leyenda y alternativa de listado | Mapa como única vía de operación |
| Mostrar siempre la unidad junto a la cantidad/capacidad (m², m³, pallets, t, %, u) | Ocultar la unidad o presentar totales mezclando unidades incompatibles (BR-035) |
| Mostrar la unidad efectiva de la ubicación (BR-041) y el residual "En camión" como fila informativa (BR-042) | Presentar "En camión" como alerta warning/danger o como nodo de mapa (el camión no es una ubicación) |
| Señalar sobreocupación con danger + texto + patrón (BR-036/OQ-043) | Cambiar solo el color de la barra para indicar ocupación |

## 7. Criterios de aceptación

- CA-1: Toda primitiva de la §5.2 con variantes, estados y tokens documentados (sin celdas vacías).
- CA-2: Cada patrón de color respeta la auditoría de DESIGN-TOKENS §5.2 (badges soft, botones, muted).
- CA-3: No existe hex/duración fuera de tokens en las especificaciones; verificable con lint en el repo futuro (stylelint de custom properties, DESIGN-TOKENS §15).
- CA-4: Ningún estado usa solo color; leyenda del mapa documentada (CA-2 de COMPONENTS).
- CA-5: Motion mínima: sin loop decorativo y con `prefers-reduced-motion` definido.
- CA-6: Toda cantidad/capacidad se muestra con su unidad y respeta el formato de §5.6; ningún total consolida unidades incompatibles (BR-035).

## 8. Archivos involucrados

- Consumidores: `frontend/COMPONENTS.md` (apariencia de contratos), `frontend/ROUTING.md` (navegación), `frontend/ACCESSIBILITY.md` (AA), `frontend/I18N.md` (textos de estados).
- Fuentes: `brand/DESIGN-TOKENS.md`, MASTER-SPEC §11.4/§12/§13, `ux/SCREENS.md`, y W7 futuros `brand/UI-GUIDELINES.md` + `brand/MAP-VISUAL-GUIDELINES.md`.

## 9. Riesgos

- R-01: Drift entre tokens y CSS de implementación → lint de custom properties + revisión (mitigación de DESIGN-TOKENS §15).
- R-02: Badges/soft con contraste insuficiente si se usan hex base en vez de `-text` → regla §6.3 de tokens + QA a11y (W8).
- R-03: ~~Severidad de alerta sin enum canónico (DP-COMP-03)~~ → **resuelta (ID-007, 2026-09-23)**: `AlertSeverity` canónico en MASTER-SPEC §4.3 (`LOW | MEDIUM | HIGH | CRITICAL`); fija las variantes de `AlertCard`.
- R-04: Uso decorativo de primary/info en el mapa → restricción R5 + MAP-VISUAL-GUIDELINES (W7).
- R-05: Definiciones de px (alturas de controles) sin token → se dejan a UI-GUIDELINES (W7) para no inventar valores fuera de la escala.

## 10. DECISIÓN PENDIENTE

| ID | Pregunta | Relación |
| --- | --- | --- |
| DP-DS-01 | ¿Se acepta "paleta base intacta + variantes -text" o se ajustan los hex de success/warning/info? | 🔶 Residual local de marca (DP-TK-01 / DP-BR-02; sin OQ asociada) |
| DP-DS-02 | ¿Fuente de marca (webfont) en v1 o stack del sistema? | 🔶 Residual local de marca (DP-TK-02; OQ-010 resuelta no la fija) |
| DP-DS-03 | ~~Valores del enum de severidad de `Alert` para fijar variantes de `AlertCard`~~ → **RESUELTA (2026-09-23, ID-007)**: `AlertSeverity` canónico en MASTER-SPEC §4.3 (`LOW | MEDIUM | HIGH | CRITICAL`) | DP-COMP-03 (resuelta) |
| DP-DS-04 | ¿Dark mode se diseña en v1 o se difiere? | 🔶 Residual local (DP-TK-04 / DP-BR-05; sin OQ asociada) |
| DP-DS-05 | Detalle fino de medidas (alturas de control, paddings exactos) → corresponde a UI-GUIDELINES (W7) | no es decisión ABIERTA del negocio; coordinar con W7 |
| DP-DS-06 | ~~Umbrales de color de ocupación por rango (<70 / 70–90 / >90) para `CapacityIndicator`/`LocationOccupancyCard` y regla de sobreocupación visual~~ → **RESUELTA (OQ-046, 2026-09-24)**: umbrales canónicos **normal <70% · warning 70–90% · danger >90%** (tokens `--map-occupancy-*`); sobreocupación = solo ADMIN, límite default +10%, observación y auditoría (OQ-043 → BR-036 ampliada). La unidad por defecto por tipo de ubicación quedó resuelta en BR-041. | OQ-046 / OQ-043 (resueltas 2026-09-24) |