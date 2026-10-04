# CargoOps — Design Tokens (DESIGN-TOKENS)

> Grupo: W7 (brand) · Fuente canónica: `docs/MASTER-SPEC.md` (v0.2) · Estado FASE 0: especificación textual.
> Actualizado 2026-09-23 (v0.2, §§62-70): tokens de ocupación/capacidad por % (normal/warning/danger) alineados a success/warning/danger (MASTER-SPEC §13) y formato de unidades.
> Este archivo es la **única fuente de valores** (color, tipografía, spacing, radius, sombras, opacity, breakpoints, motion, z-index) para implementación. Ningún hex, tamaño ni duración puede hardcodearse fuera de estos tokens.
> Formato: tablas listas para traducir a CSS custom properties (bloque de ejemplo en §12). Nombrar en inglés; los comentarios de UI van en español (MASTER-SPEC §16).

---

## 1. Objetivo

Definir el sistema de design tokens de CargoOps con valores concretos y justificados, incluyendo una **evaluación de contraste WCAG 2.2 AA** de la paleta propuesta en MASTER-SPEC §13, para que la implementación (Angular 20+, CSS custom properties) sea consistente y accesible desde el primer commit.

## 2. Contexto

- MASTER-SPEC §13 propone una paleta base **a validar** (primary/secondary/background/surface/text/muted/success/warning/danger/info) y delega el detalle (tipografía, spacing, borders, radius, shadows, status colors, charts, map colors) en `brand/`.
- Principios UX canónicos (MASTER-SPEC §12): claridad > decoración, velocidad, legibilidad, estados visibles; objetivo WCAG 2.2 AA (contraste AA incluido).
- La UI es desktop-first (MASTER-SPEC §12): los tokens de tamaño parten de escritorio y bajan a tablet/móvil por breakpoints.
- El mapa operativo consume un namespace propio `--map-*` (detalle en `MAP-VISUAL-GUIDELINES.md`).
- Distribución M:N Cargo↔Location (v0.2, §§62-70): la ocupación acumulada de una ubicación es Σ de segmentos `ACTIVE` en unidad compatible (BR-033) y se expresa como **% ocupado** con umbrales canónicos **<70 % normal · 70–90 % warning · >90 % danger** (§69). Este documento define los tokens semánticos de ocupación (`--color-occupancy-*`, alias de success/warning/danger de §13) y los tokens de mapa (`--map-occupancy-*`) para `CapacityIndicator`, `LocationOccupancyCard` y el plano (ver MAP-VISUAL-GUIDELINES §5.2).

## 3. Restricciones

- No redefinir los hex de la paleta base del MASTER-SPEC §13 sin validación del usuario (los cambios se documentan como DECISIÓN PENDIENTE).
- Los tokens derivados (hover/active/disabled/texto-seguro) son decisión de este grupo, pero deben trazarse al token base correspondiente.
- Valores en px para v1 (no rem) salvo tipografía accesible: tamaño de fuente raíz 16 px sin zoom; toda escala documentada en px **y** en relación 1rem = 16 px.
- No incluir dark mode completo en v1 (DP-BR-05); los tokens on-dark mínimos para superficies `secondary` se declaran explícitamente como tales.
- Motion mínima, no decorativa (MASTER-SPEC §12).

## 4. Dependencias

| Documento | Relación |
| --- | --- |
| `docs/MASTER-SPEC.md` §13 (paleta base), §12 (UX/AA), §11.5 (mapa SVG) y §11.2 (stack) | Canónico |
| `docs/brand/BRAND-BOOK.md` | Identidad que estos tokens materializan |
| `docs/brand/UI-GUIDELINES.md` | Reglas de uso de los tokens en componentes |
| `docs/brand/MAP-VISUAL-GUIDELINES.md` | Tokens `--map-*` consumidos |
| `docs/frontend/DESIGN-SYSTEM.md` (W4) | Implementación final de los tokens en Angular |

## 5. Decisiones

### 5.1 Modelo de tokens

Tres niveles:

1. **Primitivos (raw)**: valores puros (hex, px, ms). Naming `--c-blue-600`, `--c-slate-900`, etc. (familia Tailwind como referencia interna, no como dependencia).
2. **Semánticos (aliases)**: el nivel que consume la UI. Naming `--color-primary`, `--space-4`, `--radius-md`, `--font-size-md`.
3. **Namespace mapa**: `--map-*` derivados de primitivos (ver §11 y MAP-VISUAL-GUIDELINES.md).

Regla: la UI referencia **solo** tokens semánticos (`--color-primary`, nunca `--c-blue-600` directamente, salvo token mapa explícito).

### 5.2 Evaluación de contraste WCAG 2.2 AA — paleta base §13

Metodología: razón de contraste WCAG = (L1+0.05)/(L2+0.05), luminancia relativa con fórmula sRGB linealizada. Umbrales: texto normal ≥ 4.5:1 · texto grande (≥18.66px bold / ≥24px) ≥ 3:1 · componentes gráficos/no-texto (WCAG 1.4.11) ≥ 3:1. Fondo de referencia principal: surface #FFFFFF y background #F8FAFC. Los estados disabled están **exentos** del requisito de contraste (WCAG 1.4.3 excepción), pero deben verse claramente deshabilitados.

| Token base | Valor | Contraste vs #FFFFFF | Contraste vs #F8FAFC | Veredicto uso texto | Veredicto uso gráfico/no-texto |
| --- | --- | --- | --- | --- | --- |
| primary | #2563EB | **5.17:1** ✓ | 4.97:1 ✓ | AA texto normal | ✓ (≥3:1) |
| secondary | #0F172A | **17.85:1** ✓ | 16.05:1 ✓ | AA (sobresaliente) | ✓ |
| background | #F8FAFC | 1.05:1 (es fondo claro, no texto) | — | n/a | n/a |
| surface | #FFFFFF | 1:1 (es el blanco de referencia) | — | n/a | n/a |
| text | #0F172A | **17.85:1** ✓ | 16.05:1 ✓ | AA (sobresaliente) | ✓ |
| muted | #64748B | **4.76:1** ✓ | **4.55:1** ⚠ borde justo | AA solo si ≥4.5; en background queda al filo (4.55). **Regla de uso**: muted solo para texto secundario no esencial (metadatos, captions) ≥14px; texto esencial o <14px → usar `muted-strong` #475569 (7.58:1). | ✓ |
| success | #16A34A | **3.30:1** ✗ texto normal (✓ large/no-texto) | 3.22:1 ✗ | ✗ texto blanco sobre él; ✗ texto del color sobre blanco. Correcto: texto oscuro `#0F172A` sobre él = **5.42:1** ✓, o `success-text` #15803D sobre blanco = **5.01:1** ✓ | ✓ (≥3:1) |
| warning | #F59E0B | **2.15:1** ✗ | 2.10:1 ✗ | ✗ sobre blanco. Correcto: texto oscuro `#0F172A` sobre él = **8.31:1** ✓; texto del color sobre blanco → `warning-text` #B45309 = **5.02:1** ✓ | ✗ como borde/ícono sobre blanco (necesita ≥3:1); usar `warning-hover` #D97706 = 3.19:1 o `warning-text` |
| danger | #DC2626 | **4.83:1** ✓ | 4.64:1 ✓ | AA texto normal (blanco y texto del color, ambos ✓) | ✓ |
| info | #0EA5E9 | **2.77:1** ✗ | 2.69:1 ✗ | ✗ sobre blanco; texto oscuro sobre él = **6.44:1** ✓; texto del color sobre blanco → `info-text` #0369A1 = **5.93:1** ✓ | ✗ (2.77 < 3:1); usar `info-text` o `info-strong` para bordes/íconos |
| text en primary (botón) | #FFFFFF / #2563EB | **5.17:1** ✓ | — | AA texto normal en botón primario | ✓ |

**Conclusión de la evaluación**: la paleta base es **sólida y se mantiene** (no se cambia ningún hex). Tres colores semánticos (success/warning/info) fallan AA como texto *sobre blanco* en su valor base; se resuelve con **tokens derivados de texto/gráfico** (success-text, warning-text, info-text, warning-hover) y reglas de aplicación: los fills solidos de success/warning/info siempre llevan texto oscuro (`#0F172A`), y el texto del color sobre blanco usa siempre la variante -text. Esta estrategia NO modifica la paleta canónica; el único cambio de hex canónico sería una decisión de usuario (DP-BR-02).

### 5.3 Tipografía: decisión de sistema de fuentes

- **Familia sans**: stack del sistema (sin carga de webfonts en v1) — justificación: principio de **velocidad** (MASTER-SPEC §12), PWA mínima (OQ-010), cero dependencia de red para lectura, y legibilidad consistente en es/AR. `font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif`.
- **Familia mono**: para códigos de carga, patentes, IDs, números de referencia (identidades alfanuméricas heterogéneas, MASTER-SPEC §4.4: `029TERRA26`, `JV028/2026CH`…). `font-family: ui-monospace, SFMono-Regular, "Cascadia Mono", "JetBrains Mono", Consolas, monospace`.
- **Weights**: 400/500/600/700. Se evita light (300) en v1 (legibilidad sobre fondos claros).
- **Números tabulares**: tabular figures (`font-feature-settings: "tnum"`) en tablas, KPIs y capacity indicators (alineación decimal correcta).
- **Fuente de marca comercial** (logo/PDF marketing): DECISIÓN PENDIENTE DP-BR-03/DP-TY-01; los documentos PDF de exportación usan el stack del sistema mientras no haya fuente de marca.

---

## 6. Token: Color

### 6.1 Primitivos (referencia interna)

| Token | Valor | Nota |
| --- | --- | --- |
| --c-blue-600 | #2563EB | primary |
| --c-blue-700 | #1D4ED8 | primary hover |
| --c-blue-800 | #1E40AF | primary active |
| --c-blue-200 | #BFDBFE | usos decorativos primary |
| --c-blue-300 | #93C5FD | foco on-dark |
| --c-slate-900 | #0F172A | secondary / text |
| --c-slate-800 | #1E293B | secondary hover |
| --c-slate-700 | #334155 | secondary active / texto en grises |
| --c-slate-600 | #475569 | muted-strong |
| --c-slate-500 | #64748B | muted |
| --c-slate-400 | #94A3B8 | disabled text |
| --c-slate-300 | #CBD5E1 | border-strong |
| --c-slate-200 | #E2E8F0 | border-default |
| --c-slate-100 | #F1F5F9 | surface-muted / hover |
| --c-slate-50 | #F8FAFC | background |
| --c-white | #FFFFFF | surface |
| --c-green-600 | #16A34A | success |
| --c-green-700 | #15803D | success-text / success hover |
| --c-green-50 | #F0FDF4 | success-soft |
| --c-amber-500 | #F59E0B | warning |
| --c-amber-600 | #D97706 | warning-hover |
| --c-amber-700 | #B45309 | warning-text / warning-strong |
| --c-amber-50 | #FFFBEB | warning-soft |
| --c-red-600 | #DC2626 | danger |
| --c-red-700 | #B91C1C | danger hover / danger-text |
| --c-red-50 | #FEF2F2 | danger-soft |
| --c-sky-500 | #0EA5E9 | info |
| --c-sky-700 | #0369A1 | info-text / info-strong |
| --c-sky-50 | #F0F9FF | info-soft |
| --c-teal-600 | #14B8A6 | balanza (mapa) |
| --c-teal-100 | #CCFBF1 | balanza-soft (mapa) |
| --c-orange-600 | #EA580C | rezago (mapa) |
| --c-orange-50 | #FFEDD5 | rezago-soft (mapa) |

> El namespace primitivo es interno de documentación; en CSS pueden declararse igual para trazabilidad, pero la UI usa los semánticos (§6.2).

### 6.2 Semánticos (los que usa la UI)

| Token | Valor | Uso | Contraste clave |
| --- | --- | --- | --- |
| --color-primary | #2563EB | Acciones principales, links, foco, elementos activos | 5.17:1 vs blanco ✓ |
| --color-primary-hover | #1D4ED8 | Hover de acciones primarias | 6.70:1 ✓ |
| --color-primary-active | #1E40AF | Estado presionado | 8.72:1 ✓ |
| --color-primary-soft | #EFF6FF | Fondo de elemento primario suave (nav activa) | (fill) |
| --color-primary-disabled-text | #94A3B8 | Texto botón deshabilitado | exento AA |
| --color-primary-disabled-bg | #E5E7EB | Fondo botón deshabilitado | exento AA |
| --color-secondary | #0F172A | Superficies oscuras, botón secundario, header | 17.85:1 ✓ |
| --color-secondary-hover | #1E293B | Hover | 14.63:1 ✓ |
| --color-secondary-active | #334155 | Activo | ✓ |
| --color-background | #F8FAFC | Fondo de página | — |
| --color-surface | #FFFFFF | Tarjetas, tablas, diálogos, formularios | — |
| --color-surface-muted | #F1F5F9 | Secciones alternas, hover de fila, inputs deshabilitados | — |
| --color-text | #0F172A | Texto principal | 17.85:1 ✓ |
| --color-text-inverse | #FFFFFF | Texto sobre surfaces oscuras | 17.85:1 ✓ |
| --color-muted | #64748B | Metadatos, captions, texto secundario no esencial (≥14px) | 4.76:1 ✓ / 4.55:1 ⚠ en background |
| --color-muted-strong | #475569 | Texto secundario esencial o <14px | 7.58:1 ✓ |
| --color-text-disabled | #94A3B8 | Contenido deshabilitado | exento AA |
| --color-link | #2563EB | Enlaces | 5.17:1 ✓ |
| --color-link-hover | #1D4ED8 | Enlaces hover (subrayado opcional) | 6.70:1 ✓ |
| --color-success | #16A34A | Confirmaciones, estado STORED, capacidades OK | fill: 3.30 (con texto oscuro ✓ 5.42) |
| --color-success-hover | #15803D | Hover sobre acciones success (raro en v1) | — |
| --color-success-text | #15803D | Texto/ícono success sobre claro | 5.01:1 ✓ |
| --color-success-soft | #F0FDF4 | Fondo de badge/alert success | — |
| --color-warning | #F59E0B | Alertas, estado PARTIALLY/IN_REVIEW, capacidad ≥90% | fill con texto oscuro ✓ 8.31 |
| --color-warning-hover | #D97706 | Borde/ícono warning sobre claro (≥3:1) | 3.19:1 ✓ no-texto |
| --color-warning-text | #B45309 | Texto warning sobre claro | 5.02:1 ✓ |
| --color-warning-soft | #FFFBEB | Fondo de badge/alert warning | — |
| --color-danger | #DC2626 | Errores, destrucción, alerta crítica | 4.83:1 ✓ |
| --color-danger-hover | #B91C1C | Hover de acciones destructivas | 6.47:1 ✓ |
| --color-danger-text | #B91C1C | Texto de error sobre claro | 6.47:1 ✓ |
| --color-danger-soft | #FEF2F2 | Fondo de badge/alert danger | — |
| --color-info | #0EA5E9 | Estados informativos, IN_TRUCK, scanner | fill con texto oscuro ✓ 6.44 |
| --color-info-text | #0369A1 | Texto/ícono info sobre claro | 5.93:1 ✓ |
| --color-info-soft | #F0F9FF | Fondo de badge/alert info | — |
| --color-occupancy-normal | #16A34A | Ocupación <70 % (alias success; fill con texto oscuro ✓ 5.42) | ✓ no-texto |
| --color-occupancy-normal-text | #15803D | Texto/ícono de capacidad OK sobre claro (alias success-text) | 5.01:1 ✓ |
| --color-occupancy-warning | #F59E0B | Ocupación 70–90 % (alias warning; fill con texto oscuro ✓ 8.31) | borde/ícono: usar -text o warning-hover |
| --color-occupancy-warning-text | #B45309 | Texto/ícono ocupación warning sobre claro (alias warning-text) | 5.02:1 ✓ |
| --color-occupancy-danger | #DC2626 | Ocupación >90 % y sobreocupación % >100 (alias danger) | 4.83:1 ✓ |
| --color-occupancy-danger-text | #B91C1C | Texto/ícono ocupación danger sobre claro (alias danger-text) | 6.47:1 ✓ |
| --occupancy-threshold-warning | 70 % | Umbral warning (§69); banda 70–90 % | — |
| --occupancy-threshold-danger | 90 % | Umbral danger (§69); banda >90 % | — |
| --color-focus-ring | #2563EB | Outline de foco (2px, offset 2px) | 5.17:1 ✓ |
| --color-focus-ring-on-dark | #93C5FD | Foco sobre surfaces oscuras | 9.90:1 vs #0F172A ✓ |
| --color-scrim | rgba(15,23,42,0.5) | Fondo de diálogos/overlays | — |

### 6.3 Reglas de aplicación de color (resumen)

1. **Texto del color sobre blanco** → usar variante `-text` (success-text, warning-text, info-text, danger-text).
2. **Fill sólido semántico con texto** → texto oscuro #0F172A sobre success/warning/info; texto blanco sobre primary/danger (5.17/4.83 ✓).
3. **Badges estándar** → variante `-soft` de fondo + `-text` de contenido (patrón soft, ver UI-GUIDELINES §Badges).
4. **Nada de color como único canal de información** (WCAG 1.4.1): ícono o label siempre (MASTER-SPEC §13 mapa; UI-GUIDELINES).
5. **Disabled** → neutros grises + exención AA, pero con textura visible (opacidad y/o relleno degradado evidente).
6. **Ocupación** (`--color-occupancy-*` y umbrales) exclusivos de indicadores de capacidad/ocupación (% <70 / 70–90 / >90, §69); no reemplazan a success/warning/danger en otros contextos (estados de carga, alertas generales).

---

## 7. Token: Tipografía

### 7.1 Familias

| Token | Valor |
| --- | --- |
| --font-family-sans | `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif` |
| --font-family-mono | `ui-monospace, SFMono-Regular, "Cascadia Mono", "JetBrains Mono", Consolas, monospace` |

### 7.2 Escala (px / rem @16)

| Token | Valor | Line-height | Uso |
| --- | --- | --- | --- |
| --font-size-xs | 12px (0.75rem) | 1.333 (16px) | Metadatos, tablas compactas, código en celdas; nunca texto esencial largo |
| --font-size-sm | 14px (0.875rem) | 1.429 (20px) | Texto secundario, tablas default, badges, labels de formulario |
| --font-size-md | 16px (1rem) | 1.5 (24px) | **Base** — cuerpo de página, celdas principales |
| --font-size-lg | 18px (1.125rem) | 1.556 (28px) | Títulos de tarjeta, subtítulos de sección |
| --font-size-xl | 20px (1.25rem) | 1.4 (28px) | Títulos de página (h1 UI) |
| --font-size-2xl | 24px (1.5rem) | 1.334 (32px) | Títulos de diálogo/secciones h2 |
| --font-size-3xl | 30px (1.875rem) | 1.267 (38px) | Títulos hero solo en login/presentación |

Justificación: escala compacta desktop-first (más datos por pantalla), base 16px, decremento de 2px hasta 12px (límite inferior de legibilidad). No hay tamaño <12px.

### 7.3 Pesos y line-height

| Token | Valor | Uso |
| --- | --- | --- |
| --font-weight-regular | 400 | Cuerpo, tablas |
| --font-weight-medium | 500 | Labels, botones, énfasis suave |
| --font-weight-semibold | 600 | Títulos, valores de KPI, badges |
| --font-weight-bold | 700 | Solo refuerzo crítico (números de alerta) |
| --line-height-body | 1.5 | Cuerpo |
| --line-height-heading | 1.25 | Títulos ×l y mayores |
| --line-height-table | 1.4 | Tablas |
| --letter-spacing-label | 0.02em | Labels en mayúscula pequeña |
| --font-feature-tnum | "tnum" | Tablas numéricas y KPIs |

---

## 8. Token: Spacing (escala base 4px)

| Token | Valor | Uso típico |
| --- | --- | --- |
| --space-0 | 0 | — |
| --space-1 | 4px | Gaps entre ícono y texto en badgetools, micro-separaciones |
| --space-2 | 8px | Gap interno compacto, padding de badges/pills |
| --space-3 | 12px | Padding de celdas de tabla densa, gap entre checkbox y label |
| --space-4 | 16px | **Padding estándar** de tarjetas/inputs; gap base entre campos |
| --space-5 | 20px | Padding de diálogos, gap entre acciones de botón |
| --space-6 | 24px | Gap entre secciones de una página/panel |
| --space-8 | 32px | Padding de panel/page container, gap entre tarjetas de dashboard |
| --space-10 | 40px | Secciones mayores, header de página |
| --space-12 | 48px | Separación de bloques de página |
| --space-16 | 64px | Separación de secciones completas |
| --space-20 | 80px | Máxima separación (raro) |

Regla: solo se usan múltiplos de la escala; nunca valores intermedios arbitrarios (p. ej. 6, 10, 14px).

---

## 9. Token: Borders y Radius

| Token | Valor | Uso |
| --- | --- | --- |
| --border-width-default | 1px | Bordes de superficie estándar |
| --border-width-strong | 2px | Énfasis, foco visible, selección de mapa |
| --border-color-default | #E2E8F0 | Bordes de tarjetas/tablas/inputs |
| --border-color-strong | #CBD5E1 | Bordes importantes (tabla header, diálogo) |
| --border-color-muted | #F1F5F9 | Bordes ultra suaves (separadores) |
| --border-color-danger | #DC2626 | Inputs en error, bordes de alerta |
| --radius-sm | 4px | Inputs, tags, badges pequeños |
| --radius-md | 6px | **Default**: botones, inputs, badges |
| --radius-lg | 8px | Tarjetas, contenedor de tabla, popovers |
| --radius-xl | 12px | Diálogos, paneles laterales, mapa (elementos de plano) |
| --radius-full | 9999px | Pills, badges de estado, indicadores |

---

## 10. Token: Shadows, Opacity, Breakpoints, Motion, Z-index

### 10.1 Shadows

| Token | Valor | Uso |
| --- | --- | --- |
| --shadow-xs | 0 1px 2px rgba(15,23,42,0.05) | Elevación mínima (fila hover) |
| --shadow-sm | 0 1px 3px rgba(15,23,42,0.08) | Tarjetas flotantes, popovers livianos |
| --shadow-md | 0 4px 8px rgba(15,23,42,0.10) | Dropdowns, tooltips |
| --shadow-lg | 0 8px 24px rgba(15,23,42,0.12) | Diálogos, drawer, paneles superpuestos |

Regla: las tarjetas en página **no** usan sombra (borde 1px basta: claridad > decoración); las sombras marcan jerarquía de overlay (dropdown < diálogo). Scrim: `rgba(15,23,42,0.5)`.

### 10.2 Opacity

| Token | Valor | Uso |
| --- | --- | --- |
| --opacity-disabled | 0.5 | Íconos/contenido deshabilitado (complementa color) |
| --opacity-hover-overlay | 0.08 | Overlay oscuro sobre elementos hover (icon buttons) |
| --opacity-active-overlay | 0.12 | Overlay al presionar |
| --opacity-scrim | 0.5 | Capa scrim de diálogos |

### 10.3 Breakpoints (desktop-first, MASTER-SPEC §12)

| Token | Valor | Nota |
| --- | --- | --- |
| --bp-xs | 480px | Móvil pequeño |
| --bp-sm | 640px | Móvil grande |
| --bp-md | 768px | Tablet vertical — **punto de corte del mapa** (drawer inferior) |
| --bp-lg | 1024px | Escritorio estándar |
| --bp-xl | 1280px | Escritorio amplio |
| --bp-2xl | 1536px | Pantallas grandes |

### 10.4 Motion (mínima, no decorativa)

| Token | Valor | Uso |
| --- | --- | --- |
| --motion-fast | 100ms | Hover/active de botones, feedback inmediato |
| --motion-base | 150ms | **Estándar**: micro-interacciones, badges, tooltips |
| --motion-slow | 200ms | Diálogos (fade + scale 0.98→1), drawer |
| --motion-enter | cubic-bezier(0.2, 0, 0, 1) | Easing de entrada (decelera) |
| --motion-exit | cubic-bezier(0.4, 0, 1, 1) | Easing de salida (acelera) |
| --motion-reduce | `prefers-reduced-motion` | Media query: eliminar todo movimiento no esencial (mantener solo fade ≤100ms de feedback de estado) |

Reglas: sin bounce, sin loop decorativo, sin animación de logo (BRAND-BOOK §5.8), transiciones solo en transform/opacity (performance).

### 10.5 Z-index

| Token | Valor | Uso |
| --- | --- | --- |
| --z-base | 0 | Contenido de página |
| --z-sticky | 100 | Header sticky, tabla header sticky |
| --z-dropdown | 200 | Dropdowns, tooltips, popovers |
| --z-drawer | 300 | Drawer lateral/inferior (móvil) |
| --z-scrim | 390 | Scrim de diálogo/drawer |
| --z-dialog | 400 | Diálogos/modal |
| --z-toast | 500 | Toasts/notificaciones (in-app, OQ-011) |

---

## 11. Tokens del mapa (`--map-*`)

Derivados de primitivos; detalle de uso y patrones en `MAP-VISUAL-GUIDELINES.md`.

| Token | Valor | Entidad del mapa |
| --- | --- | --- |
| --map-zone-plazoleta-fill | #E2E8F0 | Plazoleta (zona gris, MASTER-SPEC §3) |
| --map-zone-plazoleta-stroke | #CBD5E1 | Borde plazoleta |
| --map-zone-plazoleta-text | #334155 | Label plazoleta (8.40:1 ✓) |
| --map-zone-galpon-fill | #FEF3C7 | Galpón (zona amarilla, §3) |
| --map-zone-galpon-stroke | #D97706 | Borde galpón |
| --map-zone-galpon-text | #92400E | Label de sectores/galpón (6.36:1 ✓) |
| --map-occupancy-normal-fill | #FFFFFF | Ocupación <70 % — normal (§69) |
| --map-occupancy-normal-stroke | #CBD5E1 | — |
| --map-occupancy-warning-fill | #FEF9C3 | Ocupación 70–90 % (tinte amarillo suave) |
| --map-occupancy-warning-stroke | #A16207 | — |
| --map-occupancy-danger-fill | #FEE2E2 | Ocupación >90 % (tinte rojo suave) |
| --map-occupancy-danger-stroke | #DC2626 | — |
| --map-occupancy-threshold-warning | 70 % | Umbral warning (canónico §69) |
| --map-occupancy-threshold-danger | 90 % | Umbral danger (canónico §69) |
| --map-segment-exited-stroke | #94A3B8 | Segmento `EXITED` en paneles de distribución (dashed + badge "Salida"; no se pinta en el mapa — DP-MV-07) |
| --map-scanner-fill | #E0F2FE | Scanner (área especial) |
| --map-scanner-stroke | #0EA5E9 | — |
| --map-balance-fill | #CCFBF1 | Balanza (área especial) |
| --map-balance-stroke | #14B8A6 | — |
| --map-rezago-fill | #FFEDD5 | Rezago (área especial) |
| --map-rezago-stroke | #EA580C | — |
| --map-secuestro-fill | #FEE2E2 | Secuestro (área especial) |
| --map-secuestro-stroke | #DC2626 | — |
| --map-cargo-default | #2563EB | Marcador de carga normal (4.64:1 vs galpón ✓) |
| --map-cargo-text | #FFFFFF | Código sobre marcador |
| --map-cargo-selected-ring | #F59E0B | Anillo de selección (2px, offset 2px) |
| --map-cargo-alert-ring | #DC2626 | Anillo/ícono de alerta (STALE_30D) |
| --map-cargo-transit-stroke | #0F172A | Marcador en tránsito (dashed) |
| --map-pattern-hatch | rgba(15,23,42,0.18) | Hatch de ocupación danger (45°, 2px/6px) |
| --map-pattern-hatch-light | rgba(15,23,42,0.10) | Hatch de ocupación warning |
| --map-label-visible-min | 12px | Tamaño mínimo de label de zona |
| --map-cargo-label-zoom | 1.0 | Zoom desde el cual se muestran códigos de carga |

> Migración (v0.2, §§62-70): `--map-sector-available|partial|full-*` → `--map-occupancy-normal|warning|danger-*` (mismos valores visuales; identidad preservada; la ocupación ahora aplica a toda ubicación con capacidad, no solo sectores). El anillo de selección conserva #F59E0B con el ajuste WCAG ya propuesto (DP-MV-01: → #D97706, 3.19:1, sin tocar hex base §13). Umbrales canónicos §69: **<70 % normal · 70–90 % warning · >90 % danger** (`--map-occupancy-threshold-*`).

> **Restricción conocida - `#D97706` es dos tokens a la vez.** `--color-warning-hover` (§6.2) y `--map-zone-galpon-stroke` (esta tabla) son el mismo valor literal, así que sobre las piezas del galpón el anillo de selección comparte tono con el borde de zona que ya está dibujado: **la selección no se codifica por tono**, porque el tono no la distingue de nada. La mitigación es el **grosor del trazo**, no el color: 1px en reposo → 2px en hover → 4px al seleccionar, siempre con `non-scaling-stroke`, que se mantiene sobre cualquier fill. Por la misma razón el swatch `state-active` de la leyenda toma prestado un token de zona en lugar de tener uno propio (MAP-VISUAL-GUIDELINES §5.5). No se propone aquí ningún valor de paleta: DP-MV-01 sigue abierta y esa decisión no se cierra en esta tabla. Si la revisión de DP-MV-01 cambia el tono, el anillo de selección se mueve con ella sin tocar nada más.

### 11.1 Formato de unidades y ocupación

Aplicable a labels del mapa, `CapacityIndicator`, `LocationOccupancyCard` y paneles de distribución (BR-040; ligado a OQ-041/044/045).

| QuantityUnit | Abreviatura UI | Ejemplo |
| --- | --- | --- |
| UNITS | ud. | "12 ud." |
| PALLETS | pal. | "8 pal." |
| TONS | t | "45 t" |
| CUBIC_METERS | m³ | "120 m³" |
| AREA | m² | "80 m²" |
| PERCENT | % | "60 %" |

Reglas:

- Capacidad y ocupación **siempre con unidad** ("35/100 m²"); el % es un derivado informativo (semántica según OQ-045) y **solo se muestra si la unidad es compatible** (BR-035; OQ-044): en caso contrario el label muestra "—".
- Redondeo: % entero en labels del mapa y contadores; 1 decimal en paneles y tablas; cantidades máx. 2 decimales (truncado, no redondeo acumulativo).
- Números tabulares (`--font-feature-tnum`) en todo indicador numérico de capacidad/ocupación.
- "Sin límite" (`capacityUnit = UNLIMITED`, OQ-041): sin barra, sin %, label "Sin límite".
- Propuesta de abreviaturas/redondeo adoptada → DP-TK-05 (resuelta 2026-09-24: OQ-041/044/045 cerradas; BR-041/048/049).

---

## 12. Ejemplo de implementación (CSS custom properties)

```css
:root {
  /* Color semántico */
  --color-primary: #2563EB;
  --color-primary-hover: #1D4ED8;
  --color-primary-active: #1E40AF;
  --color-secondary: #0F172A;
  --color-background: #F8FAFC;
  --color-surface: #FFFFFF;
  --color-text: #0F172A;
  --color-muted: #64748B;
  --color-muted-strong: #475569;
  --color-success: #16A34A;        /* fills: texto oscuro */
  --color-success-text: #15803D;   /* texto sobre claro */
  --color-success-soft: #F0FDF4;
  --color-warning: #F59E0B;        /* fills: texto oscuro */
  --color-warning-text: #B45309;
  --color-warning-soft: #FFFBEB;
  --color-danger: #DC2626;
  --color-danger-text: #B91C1C;
  --color-danger-soft: #FEF2F2;
  --color-info: #0EA5E9;           /* fills: texto oscuro */
  --color-info-text: #0369A1;
  --color-info-soft: #F0F9FF;
  --color-occupancy-normal: #16A34A;   /* alias success */
  --color-occupancy-warning: #F59E0B;  /* alias warning */
  --color-occupancy-danger: #DC2626;   /* alias danger */
  --occupancy-threshold-warning: 70%;
  --occupancy-threshold-danger: 90%;
  --color-focus-ring: #2563EB;

  /* Tipografía */
  --font-family-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
                      "Helvetica Neue", Arial, "Noto Sans", sans-serif;
  --font-family-mono: ui-monospace, SFMono-Regular, "Cascadia Mono",
                      "JetBrains Mono", Consolas, monospace;
  --font-size-md: 16px;
  --font-weight-medium: 500;

  /* Spacing / radius / shadow / z-index */
  --space-1: 4px;  --space-2: 8px;  --space-3: 12px; --space-4: 16px;
  --radius-md: 6px; --radius-lg: 8px; --radius-xl: 12px;
  --shadow-md: 0 4px 8px rgba(15, 23, 42, 0.10);
  --z-dialog: 400; --z-toast: 500;
}
```

## 13. Criterios de aceptación

- [ ] Todos los hex de MASTER-SPEC §13 presentes sin modificar (como base) en §6.
- [ ] Tokens de ocupación (`--color-occupancy-*`, `--occupancy-threshold-*` y `--map-occupancy-*`) definidos como alias de la paleta §13 sin modificar hex base; formato de unidades documentado (§11.1).
- [ ] Auditoría de contraste AA de la paleta base completa (tabla §5.2) con veredicto por token y uso.
- [ ] Tokens derivados (hover/active/disabled/soft/text) definidos y trazables al token base.
- [ ] Escala de tipografía, spacing (4px), radius, sombras, opacity, breakpoints, motion y z-index completos, sin placeholders.
- [ ] Bloque CSS de ejemplo listo para implementar (§12).
- [ ] Paleta del mapa referenciada (namespace `--map-*`) sin duplicar decisiones de MAP-VISUAL-GUIDELINES.md.

## 14. Archivos involucrados

- `docs/MASTER-SPEC.md` — §13 (paleta), §12 (UX/AA), §11.5 (mapa)
- `docs/brand/BRAND-BOOK.md` · `docs/brand/UI-GUIDELINES.md` · `docs/brand/MAP-VISUAL-GUIDELINES.md`
- Futuro: `docs/frontend/DESIGN-SYSTEM.md` (W4) — consumidor de estos tokens

## 15. Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Implementadores hardcodean hex en componentes | Regla de solo tokens semánticos + lint futuro (stylelint custom properties) |
| Uso de muted en texto pequeño esencial (borde AA 4.55 en background) | Regla de uso explícita: muted solo ≥14px y no esencial; si no, muted-strong |
| Fills sólidos warning/info con texto blanco ilegible | Regla 6.3.2: texto oscuro sobre fills semánticos claros |
| % de ocupación no calculable por unidades incompatibles (BR-035) | Mostrar ocupación por unidad y "% —"; tokens de ocupación solo con % válido (OQ-041/044) |
| La paleta base se cambia sin validación | DECISIÓN PENDIENTE DP-BR-02; el orquestador decide en OPEN-QUESTIONS |
| Webfont futura rompe la escala o el rendimiento | DP-TY-01: fuente de marca diferida; mientras tanto stack del sistema |

## 16. DECISIÓN PENDIENTE

| ID | Pregunta | Impacto | Propuesta |
| --- | --- | --- | --- |
| DP-TK-01 | ¿Se acepta la estrategia "paleta base intacta + tokens derivados texto-seguros", o se prefiere ajustar los hex canónicos de success/warning/info (p. ej. warning → #D97706 como base)? | Todos los componentes y el mapa | 🔶 Residual local de marca (sin OQ; mantener hex base + derivados — coincide con DP-BR-02) |
| DP-TK-02 | ¿Se introduce fuente de marca comercial en v1 (webfont) o se mantiene el stack del sistema? | Rendimiento (principio velocidad) y PDF | 🔶 Residual local de marca (sin OQ; stack del sistema en v1 — coherente con OQ-010 PWA mínima y DP-BR-03) |
| DP-TK-03 | ~~Umbrales de ocupación: §§62-70/§69 definen **<70 % normal · 70–90 % warning · >90 % danger**~~ → **RESUELTA (OQ-046, 2026-09-24)**: umbrales canónicos de UI confirmados **normal <70% · warning 70–90% · danger >90%** (tokens `--map-occupancy-*`), configurables por settings a futuro | MAP-VISUAL-GUIDELINES §5.2, BR-005/036 | OQ-046 (resuelta 2026-09-24) |
| DP-TK-04 | ¿Dark mode se diseña en v1 o se difiere? | Tokens surface/text y mapa | 🔶 Residual local de marca (sin OQ; diferir — DP-BR-05) |
| DP-TK-05 | ~~Formato de unidades/ocupación (§11.1): abreviaturas (ud., pal., t, m², m³, %), redondeo (entero en mapa, 1 decimal en paneles) y regla "% solo con unidad compatible". ¿Se adoptan?~~ → **RESUELTA (OQ-041 → BR-041 / OQ-044 → BR-048 / OQ-045 → BR-049, 2026-09-23/24)**: adoptar §11.1 — unidad efectiva por tipo/override (BR-041); "% solo con unidad compatible" = BR-035 sin conversión en v1 (BR-048); `percentage` derivado de UI (BR-049); abreviaturas/redondeo = propuesta local adoptada | Labels de mapa, CapacityIndicator, paneles de distribución | OQ-041/044/045 (resueltas) |

> Nota: DP-TK-01 coincide con DP-BR-02 (BRAND-BOOK); el orquestador los consolida en una sola entrada OQ.

---

*Fin del documento. Próximo: `UI-GUIDELINES.md` (aplicación de tokens en componentes) y `MAP-VISUAL-GUIDELINES.md` (sistema visual del plano).*