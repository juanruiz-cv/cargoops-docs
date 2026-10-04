# CargoOps — Guías Visuales del Mapa (MAP-VISUAL-GUIDELINES)

> Grupo: W7 (brand) · Fuente canónica: `docs/MASTER-SPEC.md` (v0.3) · Estado FASE 0: especificación textual.
> Sistema visual del mapa operativo (SVG, ADR-006): zones, estados de ocupación acumulada, áreas especiales, marcadores y segmentos de carga (distribución M:N), paneles de selección y leyenda. Valores de color en el namespace `--map-*` de `DESIGN-TOKENS.md` §11; este documento define **cómo se aplican y por qué**.
> Marco canónico: MASTER-SPEC §3 (referencia visual: plazoleta gris a la izquierda, galpón amarillo a la derecha con sectores 1–12, áreas especiales), §4.1/§4.3 (`CargoLocation`, enums), §6 (BR-032…BR-042), §9 (alerta `CAPACITY`), §11.5 (motor SVG, interactividad, distribución M:N en el mapa — §§62-70/§69), §12 (AA y alternativa accesible) y §13 ("no depender solo del color: iconos, patrones, labels, estados; leyenda obligatoria").

---

## 1. Objetivo

Definir el sistema visual del plano operativo de CargoOps: colores, patrones, íconos, tipografía de labels y reglas de estados para zonas (plazoleta, galpón), **ocupación acumulada de ubicaciones (normal/warning/danger por % ocupado, §69)**, áreas especiales (Scanner, Balanza, Rezago, Secuestro), **marcadores y segmentos de carga (distribución M:N, §§62-70)** y estados de selección con sus paneles (§69). El mapa debe leerse **sin ambigüedad aun sin color** (WCAG 1.4.1) y cumplir contraste AA para texto y ≥3:1 para grafismo informativo.

## 2. Contexto

- El mapa es la **fotografía del producto** (BRAND-BOOK §5.9) y el atajo preferido para ubicar/mover cargas; el listado de cargas es la alternativa accesible (MASTER-SPEC §12).
- El layout NO es una imagen estática: es datos estructurados (`Location`, `Map`, `MapElement`, MASTER-SPEC §4 y §11.5); cada zona tiene nombre, código, tipo, posición, tamaño, capacidad, unidad y estado editable (BR-020).
- Tipos de ubicación: `PLAZOLETA`, `GALPON`, `SECTOR`, `SCANNER`, `BALANZA`, `REZAGO`, `SECUESTRO`, `OTRO` (MASTER-SPEC §4.3). Distribución M:N Cargo↔Location vía `CargoLocation` (secciones 62-70; BR-032/033): la **ocupación acumulada** de una ubicación es derivada (Σ segmentos `ACTIVE` en unidad compatible) y el **% ocupado** = occupiedCapacity / capacity (BR-033/035; §69).
- **Una ubicación con N cargas** (BR-033): cada carga activa aporta su segmento a la ocupación y se pinta con su marcador dentro de la ubicación; **una carga con N ubicaciones** (BR-032/040): se pinta un marcador por segmento `ACTIVE`, con cantidad/porcentaje en el label (§5.4.1).
- Umbrales de ocupación canónicos (§69, **OQ-046 resuelta 2026-09-24**): **<70 % normal · 70–90 % warning · >90 % danger**; el % solo es calculable en unidad compatible (BR-035; la unidad por defecto por tipo de ubicación es BR-041; **sin conversión en v1 — OQ-044 → BR-048**).
- Estados operativos de carga (CargoStatus) visibles en el mapa: `IN_TRUCK` (plazoleta), `STORED` (sectores), `IN_REVIEW` (scanner/balanza), `REZAGO`, `SECUESTRO`, `IN_TRANSIT` (transitorio); `REGISTERED`/`EXITED` no se pintan (sin ubicación / fuera del predio). Los segmentos `CargoLocationStatus.EXITED` tampoco se pintan en el mapa (no ocupan); se representan en los paneles de distribución (§5.4.2, DP-MV-07).
- Interacciones planificadas (MASTER-SPEC §11.5): zoom, pan, selección, hover, drag, snap, grid; el detalle de interacción vive en `ux/MAP-UX.md` (futuro) — aquí solo lo visual de los estados.
- Presupuesto visual: mínimo color, máxima información; el mapa convive con tablas de datos, no compite con ellas.

## 3. Restricciones

- **No redefinir los tokens `--map-*`** de `DESIGN-TOKENS.md` §11 sin validación; los ajustes se documentan como DECISIÓN PENDIENTE (este grupo puede proponer valores derivados, igual que DESIGN-TOKENS §5.2).
- El color **nunca es el único canal**: toda zona/estado/marcador lleva label y, donde corresponda, ícono o patrón (MASTER-SPEC §13).
- Leyenda **obligatoria y visible por defecto** (componente `MapLegend`, COMPONENTS.md §5.1); colapsable, nunca oculta por omisión.
- Los umbrales de ocupación (§69: <70 / 70–90 / >90, OQ-046) se aplican solo si el % es calculable en unidad compatible (BR-035); con unidades incompatibles se muestra la ocupación por unidad y el % queda en "—" (BR-041: unidad efectiva por tipo/override; OQ-044: conversión).
- Accesibilidad ARIA del mapa: cada shape y marcador lleva `aria-label` descriptivo (p. ej. "Sector 4 · 80 de 100 m² · 80 % · 3 cargas") y el listado de cargas es la alternativa accesible (MASTER-SPEC §12); foco navegable por teclado con anillo visible (§5.10).
- Texto de mapa mínimo 12px (`--map-label-visible-min`); los códigos de carga aparecen desde `--map-cargo-label-zoom` (1.0) y nunca por debajo de 12px.
- Sin animaciones en el mapa salvo feedback de interacción (hover/resaltado ≤150ms); **sin parpadeo** de marcadores (estrés visual en operación).
- Móvil (<`--bp-md` 768px): el mapa usa panel inferior/drawer con `LocationCard` (MASTER-SPEC §12); el zoom táctil (pinch) respeta los mismos niveles de detalle.
- Los hex citados de `--map-*` son de referencia para auditoría de contraste; en código se usa el token.

## 4. Dependencias

| Documento | Relación |
| --- | --- |
| `docs/MASTER-SPEC.md` | §3 (referencia visual), §4.3 (enums), §7 (CargoStatus), §11.5 (motor SVG), §13 (regla color+leyenda), §12 (AA y alternativa accesible) |
| `docs/brand/DESIGN-TOKENS.md` | §11 (`--map-*`), §5.2 (metodología de contraste), §6 (reglas de color) |
| `docs/brand/BRAND-BOOK.md` | §5.9 (iconografía lineal, mapa como "fotografía") |
| `docs/brand/UI-GUIDELINES.md` | Badges, CapacityIndicator, empty states reutilizados en mapas/paneles |
| `docs/frontend/COMPONENTS.md` | `OperationalMap`, `MapLocation`, `MapToolbar`, `MapLegend`, `LocationCard` |
| Futuros | `architecture/MAP-ENGINE.md`, `ux/MAP-UX.md` (interacción), OQ-015 (editor de planos v1) |

## 5. Decisiones

### 5.1 Zonas base (MASTER-SPEC §3)

| Zona | Fill | Stroke | Label | Ícono |
| --- | --- | --- | --- | --- |
| Plazoleta | `--map-zone-plazoleta-fill` #E2E8F0 | `--map-zone-plazoleta-stroke` #CBD5E1 | `--map-zone-plazoleta-text` #334155 (8.41:1 ✓) | — |
| Galpón | `--map-zone-galpon-fill` #FEF3C7 | `--map-zone-galpon-stroke` #D97706 | `--map-zone-galpon-text` #92400E (6.33:1 ✓) | — |

- Los labels de zona usan `--font-weight-semibold`; el código de la zona opcional en formato `--font-family-mono` dentro del label (p. ej. "Sector 4").
- Los bordes internos entre sectores usan `--map-occupancy-normal-stroke` (línea fina sobre el fill del galpón); el stroke del galpón queda reservado al **perímetro** de la zona, evitando ambigüedad entre límite e interior.
- **Bordes de contorno (#CBD5E1 / #D97706: 1.48:1 y 2.84:1 vs sus fills)** no cumplen 3:1 como grafismo informativo: son **decorativos de delimitación**, la identidad la da el label. Regla: ningún borde transporta estado por sí solo (DP-MV-02).

### 5.2 Estados de ocupación acumulada (toda ubicación con capacidad)

La ocupación es la suma de los segmentos `CargoLocation.ACTIVE` en unidad compatible (BR-033) y el **% ocupado** = occupiedCapacity / capacity. Umbrales canónicos **§69**: <70 % normal · 70–90 % warning · >90 % danger. Aplica a sectores, plazoleta y áreas especiales con capacidad (unidad por defecto por tipo: OQ-041).

| Estado | % ocupado | Fill | Stroke | Patrón | Label (obligatorio) |
| --- | --- | --- | --- | --- | --- |
| Normal | 0 ≤ % < 70 | `--map-occupancy-normal-fill` #FFFFFF | `--map-occupancy-normal-stroke` #CBD5E1 | sin patrón | "Sector 4 · 35/100 m² · 35 %" |
| Warning | 70 ≤ % ≤ 90 | `--map-occupancy-warning-fill` #FEF9C3 | `--map-occupancy-warning-stroke` #A16207 (4.58:1 ✓ vs fill) | hatch suave `--map-pattern-hatch-light` | "Sector 7 · 85/100 m² · 85 %" |
| Danger | % > 90 | `--map-occupancy-danger-fill` #FEE2E2 | `--map-occupancy-danger-stroke` #DC2626 (3.95:1 ✓ vs fill) | hatch 45° `--map-pattern-hatch` | "Sector 10 · 96/100 m² · 96 % ⚠" |

- Los umbrales sustituyen a la propuesta previa (parcial 1–99 % / lleno ≥100 %) de DP-TK-03/DP-MV-05, ahora alineada a §§62-70 (ver DP actualizada en §9 y DESIGN-TOKENS §16).
- **Sobreocupación (% > 100)** solo por regla administrativa explícita (BR-036, `allowOverOccupation` + auditoría + observación; OQ-043): la banda danger se mantiene (tinte + hatch + label) y se agrega badge "SOBRECUPACIÓN" + alerta `CAPACITY` (MASTER-SPEC §9). Sin el flag, superar el 100 % es un bloqueo de validación (BR-005), no un estado visual.
- El label de ocupación ("35/100 m² · 35 %") es **obligatorio en toda ubicación con capacidad** (no-color-only) y usa `--map-zone-galpon-text` #92400E (6.33:1 sobre warning-fill; 5.80:1 sobre danger-fill; 7.09:1 sobre blanco normal — AA ✓, ver §5.6).
- Danger → además del patrón y el label, `CapacityIndicator` (UI-GUIDELINES §6.8) en el panel/detalle y alerta `CAPACITY` cuando corresponda; nunca pintar la ubicación de un rojo saturado (confunde con secuestro).
- Capacidad `UNLIMITED` (OQ-009/014/041): sin barra ni patrón; label "Sin límite" en gris `muted-strong`.
- Unidades incompatibles entre carga y ubicación (BR-035; OQ-044): el % no es calculable → el label muestra solo la ocupación por unidad ("3 cargas · 45 t") y el % queda en "—".
- `Location.status = INACTIVE / MAINTENANCE` (BR-004): no definido aún en `--map-*` → **DP-MV-03** (propuesta: fill `--color-surface-muted` + hatch denso + badge "Inactiva"/"Mantenimiento"; movimientos bloqueados).

### 5.3 Áreas especiales

| Área | Fill | Stroke | Ícono (siempre) | Label |
| --- | --- | --- | --- | --- |
| Scanner | `--map-scanner-fill` #E0F2FE | `--map-scanner-stroke` #0EA5E9 | escáner | "Scanner" |
| Balanza | `--map-balance-fill` #CCFBF1 | `--map-balance-stroke` #14B8A6 | balanza | "Balanza" |
| Rezago | `--map-rezago-fill` #FFEDD5 | `--map-rezago-stroke` #EA580C | reloj | "Rezago" |
| Secuestro | `--map-secuestro-fill` #FEE2E2 | `--map-secuestro-stroke` #DC2626 | candado | "Secuestro" |

- Labels sobre fills suaves: **`#0F172A`** (≥12:1 sobre todos los fills suaves) con el ícono asociado; el color de zona **no reemplaza** al ícono+label (Rezago y Secuestro comparten tinte cálido: la diferencia real la dan reloj vs candado + texto).
- Secuestro distingue además el stroke en 2px (`--border-width-strong`) — redundancia estructural, no solo cromática.
- Cargas `IN_REVIEW` visibles dentro de Scanner/Balanza con su marcador habitual (sin doble anillo de área).

### 5.4 Marcadores de carga

| Estado del marcador | Visual | Regla |
| --- | --- | --- |
| Normal | Cuadrado `--radius-sm` fill `--map-cargo-default` #2563EB (5.17:1 vs blanco; 4.61:1 vs galpón ✓) + código en `--map-cargo-text` blanco, mono 12px | El código es el marcador; sin tooltip como único medio |
| Seleccionada | Anillo `--map-cargo-selected-ring` (2px, offset 2px) + `--shadow-sm`; código con label de fondo claro | Anillo actual #F59E0B = 2.15:1 sobre blanco falla AA grafismo → **DP-MV-01** propone `#D97706` (3.19:1) |
| Con alerta (STALE_30D OPEN, BR-014) | Anillo `--map-cargo-alert-ring` #DC2626 (4.83:1 ✓) + ícono ⚠ junto al marcador | La alerta se ve en **cualquier ubicación** (aunque no esté en Rezago) — DP-MV-06 |
| En tránsito (IN_TRANSIT) | Stroke `--map-cargo-transit-stroke` #0F172A **dashed 2px** + ícono camión; sin opacidad reducida (legibilidad) | Transitorio: no es arrastrable a un nuevo destino sin confirmar; el marker mantiene el código visible |

- Los marcadores **no se animan** (sin pulso, sin parpadeo); el feedback de hover es solo resaltado de borde del contenedor/panel.
- Regla de densidad: cuando dos marcadores colisionan por zoom, ganan estos criterios (en orden): alerta → tránsito → selección → orden alfabético del código; se usa desplazamiento automático (spiral offset) documentado para el motor de render (ADR-006).
- Sin marcador para: `REGISTERED` (sin ubicación) y `EXITED` (fuera del predio) — solo listado; `DELETED` oculto (filtro).

### 5.4.1 Segmentos de carga (una carga con N ubicaciones — §§62-70)

- Una carga distribuida en N ubicaciones (BR-032) se representa con **un marcador por segmento `CargoLocation` ACTIVE** en cada ubicación; el marcador usa el cuadro estándar (§5.4) con el código y, desde `--map-cargo-label-zoom`, el detalle `cantidad · %` en mono: `029TERRA26 · 20 m² · 36 %` (cantidad en la unidad del segmento; semántica del % según OQ-045).
- Posicionamiento dentro de la ubicación: layout por offsets (spiral/grilla) del motor de render (ADR-006); colisiones resueltas con la regla §5.4 (alerta → tránsito → selección → alfabético).
- **Segmento `EXITED`** (CargoLocationStatus): no consume capacidad ni se pinta en el mapa (la ocupación es Σ de ACTIVE, BR-033). Se representa en los paneles de distribución (§5.4.2) con patrón atenuado `--map-segment-exited-stroke` (#94A3B8, dashed) + badge "Salida" + `exitedAt`; fechas `enteredAt`/`exitedAt` por segmento (BR-039/040). Visualización de fantasmas en el mapa → **DP-MV-07**.
- **Residual en camión** (descarga parcial, BR-038): `totalQuantity − Σ segmentos activos`; no es una ubicación del plano → se muestra solo en el panel de la carga ("En camión · 40 %"), ligado a la resolución de OQ-042.
- Con un único segmento ACTIVE, el comportamiento es idéntico al marcador único actual (sin cambio visual).

### 5.4.2 Estados de selección (§69) y paneles

- **Ubicación seleccionada** → panel (desktop: panel lateral adyacente; móvil: drawer inferior — MASTER-SPEC §12) con: nombre + código, capacidad (`capacity` + `capacityUnit`), ocupación acumulada (Σ activos en unidad compatible), **% ocupado con `CapacityIndicator`**, cargas presentes (código + cantidad/% por segmento, con alertas por carga → anillo ⚠ reutilizado), alertas de la ubicación (`CAPACITY`) y movimientos recientes.
- **Carga seleccionada** → panel con **distribución completa** (BR-040): todos sus segmentos (ACTIVE y EXITED) con ubicación, cantidad, %, `enteredAt`/`exitedAt` y estado del segmento; residual en camión si aplica (OQ-042); badge de `CargoStatus`; alertas; línea de tiempo de movimientos.
- Los paneles son regiones ARIA (`role="region"`/`dialog` + `aria-labelledby`), con gestión de foco al abrir y cierre por ESC; en ningún caso el panel es la única vía de lectura (el listado de cargas lo complementa — MASTER-SPEC §12).

### 5.5 Leyenda obligatoria (`MapLegend`)

- **Visible por defecto** (colapsable), detecta la presencia del mapa y comunica: zonas, estados de ocupación (los 3 umbrales con su % y patrón), áreas especiales (ícono+color), marcadores (normal, seleccionada, alerta, tránsito) y estados de segmento ACTIVE/EXITED.
- Cada entrada = **chip con el elemento visual (fill/patrón/marcador) + ícono + label de texto**; nada solo-color. En móvil la leyenda se pliega a un botón "Leyenda" dentro del `MapToolbar` (sin perder acceso, `aria-expanded`).
- La leyenda es el lugar natural para educar sobre los patrones (hatch = banda danger, ocupación >90 %), no una concesión: es requisito de aceptación (MASTER-SPEC §13).

```
✅ Leyenda (fragmento):
   ██ Normal (<70 %)   ██ Warning (70–90 %, hatch suave)   ██ Danger (>90 %, hatch ╱╱)
   ⛨ Scanner  ⚖ Balanza  🕒 Rezago  🔒 Secuestro
   ■ Carga (segmento ACTIVE)    ◎ Carga seleccionada   ⚠ Carga con alerta   ▷▷ Carga en tránsito
   ┅ Segmento EXITED (solo en panel de distribución)   ⚠ SOBRECUPACIÓN (>100 %, BR-036)
❌ Leyenda con solo cuadraditos de color sin texto: inaccesible y ambigua (Rezago vs Secuestro).
```

### 5.6 Contraste y legibilidad (auditoría de `--map-*`)

| Par | Razón | Veredicto |
| --- | --- | --- |
| Texto plazoleta #334155 sobre #E2E8F0 | 8.41:1 | AA texto ✓ (DESIGN-TOKENS §11) |
| Texto sectores #92400E sobre #FEF3C7 | 6.33:1 | AA ✓ |
| Texto #92400E sobre blanco disponible | 7.09:1 | AA ✓ |
| Marcador #2563EB sobre galpón #FEF3C7 | 4.61:1 | AA texto/grafismo ✓ |
| Marcador #2563EB sobre blanco sector | 5.17:1 | AA ✓ |
| Anillo de alerta #DC2626 sobre blanco | 4.83:1 | grafismo ✓ (≥3:1) |
| Anillo de selección #F59E0B sobre blanco | 2.15:1 | ✗ grafismo — DP-MV-01 |
| Stroke warning #A16207 sobre #FEF9C3 | 4.58:1 | grafismo ✓ |
| Stroke danger #DC2626 sobre #FEE2E2 | 3.95:1 | grafismo ✓ |
| Label ocupación #92400E sobre danger-fill #FEE2E2 | 5.80:1 | AA texto ✓ |
| Segmento EXITED #94A3B8 sobre blanco (paneles) | 2.56:1 | decorativo — siempre con label "Salida" (DP-MV-07) |
| Contorno plazoleta #CBD5E1 sobre fondo | 1.48:1 | decorativo (identidad por label) — DP-MV-02 |
| Contorno galpón #D97706 sobre #FEF3C7 | 2.84:1 | decorativo (identidad por label) — DP-MV-02 |

Reglas: labels de zona/carga ≥12px (`--map-label-visible-min`); códigos de carga en `--font-family-mono`; los estados de ocupación usan el par patrón + % en label y los estados informativos el par (patrón o ícono) + label, nunca el tinte de fill solo.

### 5.7 Densidad y zoom

| Nivel | Zoom | Contenido visible |
| --- | --- | --- |
| Vista general | <0.75 | Zonas + áreas + labels de zona; en ubicaciones solo el contador de ocupación ("8/10 · 80 %") sin códigos |
| Operativa | 0.75–1.5 | + códigos de carga y detalle `cantidad · %` de segmentos desde `--map-cargo-label-zoom` (1.0) con marcadores; leyenda completa |
| Detalle | >1.5 | + hit-boxes de carga ampliados, sub-áreas (docks, filas), grid/snap visible para edición (ADMIN, OQ-015) |

- El zoom nunca degrada la legibilidad: los labels se ocultan por nivel en lugar de encogerse; al superponerse, gana el marcador de alerta (§5.4).
- Hover sobre zona/marcador: resalta y abre `LocationCard`/`CargoDetail` flotante; en móvil el mismo hover se resuelve por tap → panel inferior.
- Rendimiento: capas y culling por nivel de zoom (ADR-006, MASTER-SPEC §11.5 "render eficiente"); con >500 marcadores visibles se prioriza la vista de contadores por sector (el detalle requiere zoom).

### 5.8 Relación con tokens y trazabilidad

- El mapa consume **exclusivamente el namespace `--map-*`** (DESIGN-TOKENS §11), derivado de primitivos; ningún hex directo en el componente `OperationalMap`.
- Regla de sincronización: cualquier cambio de valor de mapa se hace en `DESIGN-TOKENS.md` y se refleja aquí (y viceversa); un ajuste de `--map-*` que toque un hex canónico §13 requiere validación (DP-BR-02/DP-TK-01).
- Los badges/indicadores que el mapa reutiliza en paneles (CargoStatusBadge, CapacityIndicator, PermanenceBadge) vienen de UI-GUIDELINES §6.4/§6.8: mismo patrón en mapa y listado (coherencia visual total).

### 5.9 Ejemplos hacer/no-hacer (resumen visual)

```
✅ Ubicación al 85 %: fill amarillo suave + hatch ligero + label "Sector 7 · 85/100 m² · 85 %"
✅ Rezago: fill naranja suave + reloj + label "Rezago"
✅ Carga distribuida: marcador por segmento ACTIVE con "código · cantidad · %"; EXITED solo en el panel (dashed + "Salida")
❌ Dos ubicaciones diferenciadas solo por tinte de fill (rojo/azul): indistinguible en escala de grises y para daltónicos.
❌ Marcador de alerta solo con anillo rojo sin ⚠: falla en zoom bajo y en dispositivos con contraste reducido.
✅ Selección: anillo + elevación (sombra) + panel lateral abierto: tres señales, no una.
```

### 5.10 Accesibilidad del mapa (WCAG 2.2 AA)

- **Nunca solo color** (WCAG 1.4.1): todo estado de ocupación lleva patrón + label con %; todo marcador/segmento lleva código/texto; los paneles repiten la información en texto.
- **ARIA**: cada shape de ubicación y cada marcador expone `aria-label` descriptivo ("Sector 4 · ocupación 80 de 100 m² · 80 % · cargas: 029TERRA26, 032TERRA26"); el SVG no se expone como `role="img"` global (se pierde el recorrido por elementos); el área del mapa usa `role="group"` con `aria-describedby` apuntando a la leyenda, **con la condición de que el destino de la descripción exista en el DOM siempre que la descripción aplica**: la leyenda es colapsable (§5.5), de modo que su id solo existe mientras está abierta y un `aria-describedby` colgante no lo anuncia ningún lector de pantalla; cuando la descripción puede faltar, la relación no se expresa de ninguna forma. Exponerla queda **aplazado a propósito** - la leyenda ya se anuncia como *disclosure* por su propio botón (`aria-expanded` + `aria-controls` en `MapToolbar`) - y requiere un único dueño del estado "leyenda abierta" antes de volver a intentarse.
- **Teclado**: Tab recorre ubicaciones y marcadores en orden del plano; Enter/Espacio selecciona y abre el panel (§5.4.2); ESC cierra; foco visible con `--color-focus-ring` (2px, offset 2px).
- **Contraste**: texto del mapa ≥4.5:1 (tabla §5.6); grafismo informativo ≥3:1; los bordes decorativos no transportan estado (DP-MV-02); el par patrón+label cubre la banda donde el filtro cromático falla (protanopía/deuteranopía).
- **Movimiento**: sin animación de marcadores; solo feedback de interacción ≤150ms y respeto de `prefers-reduced-motion` (DESIGN-TOKENS §10.4); sin parpadeo (WCAG 2.2.2/2.3.1).
- **Alternativa accesible**: el listado de cargas (tabla) y los paneles de selección son fuente de información equivalente (MASTER-SPEC §12); en móvil el drawer inferior mantiene el mismo contenido accesible por teclado/touch.

## 6. Criterios de aceptación

- [ ] Zonas, estados de ocupación acumulada (normal/warning/danger con umbrales §69 <70/70–90/>90), áreas especiales y marcadores de carga (incluidos segmentos ACTIVE/EXITED) especificados con token + label + ícono/patrón (no-color-only).
- [ ] Representaciones M:N cubiertas: una ubicación con N cargas (ocupación acumulada + marcadores múltiples, §5.2) y una carga con N ubicaciones (segmentos con cantidad/%, §5.4.1).
- [ ] Estados de selección §69: paneles de ubicación (capacidad/ocupación/%/cargas/alertas/movimientos) y de carga (distribución completa) especificados (§5.4.2).
- [ ] Accesibilidad: ARIA en shapes/paneles, foco navegable, listado alternativo y nunca color-solo (§5.10 — WCAG 2.2 AA / 1.4.1).
- [ ] Auditoría de contraste del namespace `--map-*` incluida (tabla §5.6) con veredicto por par.
- [ ] Leyenda obligatoria visible por defecto, con entrada texto+ícono por cada elemento (MASTER-SPEC §13).
- [ ] Niveles de zoom con reglas de densidad y umbrales que reutilizan `--map-label-visible-min` y `--map-cargo-label-zoom`.
- [ ] Regla de trazabilidad token↔mapa explícita; sin hex sueltos.
- [ ] Toda ambigüedad (selección, bordes, INACTIVE, camiones, segmentos EXITED, umbrales) en §9 DECISIÓN PENDIENTE.

## 7. Archivos involucrados

- `docs/MASTER-SPEC.md` — §3, §4.1/§4.3, §5, §6 (BR-032…BR-040), §7, §9, §11.5, §12, §13 (canónico; v0.2 §§62-70)
- `docs/brand/DESIGN-TOKENS.md` — §11 (`--map-*`), §5.2 (contraste), §6.2 (tokens de ocupación), §16 (DP-TK-03)
- `docs/brand/UI-GUIDELINES.md` — badges/indicadores/panel reutilizados en el mapa (`CapacityIndicator`, `LocationOccupancyCard`, `DistributionPanel`)
- `docs/frontend/COMPONENTS.md` — `OperationalMap`, `MapLocation`, `MapToolbar`, `MapLegend`, `LocationCard`, `LocationOccupancyCard`, `DistributionPanel`
- Futuros: `architecture/MAP-ENGINE.md`, `architecture/ADR/ADR-006-SVG-Map-Engine.md`, `ux/MAP-UX.md`, `docs/OPEN-QUESTIONS.md` (OQ-009/014/015/041/042/043/044/045)

## 8. Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Lectura solo-por-color (daltónicos, pantallas lavadas) | Redundancia ícono + patrón + label + stroke; auditoría §5.6 |
| Rezago vs Secuestro confundibles (tintes cálidos) | Íconos distintos (reloj/candado) + stroke grueso en secuestro + labels |
| Anillo de selección ilegible sobre blanco | DP-MV-01: propuesta `#D97706` (3.19:1) sin tocar hex base §13 |
| Mapa lento con muchos marcadores | Culling por zoom + contadores por sector; capas memoizadas (ADR-006) |
| Leyenda colapsada pierde significado | Visible por defecto; en móvil accesible desde toolbar con `aria-expanded` |
| Desincronización tokens `--map-*` | Regla §5.8: cambio único desde DESIGN-TOKENS y reflejado aquí |
| Bordes de zona interpretados como estado | Regla explícita: contorno decorativo; el estado vive en fill+tinte+patrón+label (DP-MV-02) |
| % de ocupación engañoso por unidades incompatibles (BR-035) | Solo sumar unidades compatibles; si no, mostrar ocupación por unidad y "% —" (OQ-041/044) |
| Umbrales 70/90 malinterpretados como regla de negocio | Son visuales (§69); la regla de negocio es BR-005/036 (no superar capacidad salvo flag administrativo) |
| Segmentos EXITED confundidos con carga presente | No se pintan en el mapa; patrón atenuado + badge "Salida" en paneles (DP-MV-07) |

## 9. DECISIÓN PENDIENTE

| ID | Pregunta | Impacto | Propuesta de este documento |
| --- | --- | --- | --- |
| DP-MV-01 | Anillo de selección `--map-cargo-selected-ring` #F59E0B (2.15:1) no cumple 3:1 como grafismo: ¿se ajusta el token derivado a `#D97706` (3.19:1)? | Selección en el mapa | 🔶 Residual local de presentación (sin OQ; ajustar a `#D97706` — consolida DP-BR-02/DP-TK-01) |
| DP-MV-02 | Contornos de zona (#CBD5E1 / #D97706) <3:1: ¿se mantienen decorativos (identidad por label+fill) o se endurecen? | Delimitación visual del plano | 🔶 Residual local de presentación (sin OQ; mantener decorativos + regla "ningún estado por borde") |
| DP-MV-03 | `Location.status INACTIVE/MAINTENANCE` no tiene tokens `--map-*`: ¿valores propuestos (fill `--color-surface-muted` + hatch denso + badge)? | Ubicaciones fuera de servicio (BR-004) | 🔶 Residual local de presentación (sin OQ; validar propuesta) |
| DP-MV-04 | ~~¿El plazola muestra camiones como marcadores (placa en mono) o solo cargas (IN_TRUCK)?~~ → **RESUELTA (OQ-014, 2026-09-24)**: la Plazoleta limita en **UNITS (camiones)** → **sí, marcador de camión con placa + conteo de cargas** (la capacidad en camiones es la unidad efectiva — BR-041) | Plazoleta, techos con muchos camiones | OQ-014 (resuelta 2026-09-24) |
| DP-MV-05 | ~~Umbrales de ocupación: §§62-70/§69 definen **<70 % normal · 70–90 % warning · >90 % danger**. ¿Se confirman como canónicos y se sincroniza DP-TK-03?~~ → **RESUELTA (OQ-046, 2026-09-24)**: umbrales canónicos confirmados **normal <70% · warning 70–90% · danger >90%**; DP-TK-03 sincronizado | Toda ubicación con capacidad y el dashboard | OQ-046 (resuelta 2026-09-24) |
| DP-MV-06 | Cargas con alerta STALE_30D OPEN en cualquier ubicación: ¿se resaltan con anillo danger siempre, aunque no estén en Rezago? | Visualización de alertas en el mapa | 🔶 Residual local de presentación (sin OQ; sí, anillo danger + ⚠) |
| DP-MV-07 | Segmentos `CargoLocation.EXITED`: ¿se muestran como fantasmas opcionales en el mapa (toggle "Ver histórico") o únicamente en los paneles de distribución? | Histórico en el mapa / densidad / BR-040 | 🔶 Residual local de presentación (sin OQ; solo paneles y listados en v1) |
| DP-MV-08 | Formato del label de segmento en el mapa: ¿`código · cantidad · %` siempre, o `código · %` y cantidad solo en el panel? Redondeo del % (entero vs 1 decimal). | Densidad y legibilidad por zoom | 🔶 Residual local de presentación (sin OQ; propuesta §11.1 adoptada — ver DP-TK-05) |

> Nota de proceso: IDs DP-MV-* locales al grupo W7; se reportan al orquestador para `OPEN-QUESTIONS.md` (consolidables con DP-BR-02/DP-TK-03 y OQ-009/014/015/041/042/043/044/045). Además: el prompt de trabajo referenciaba "MASTER-SPEC §40 (sistema visual del mapa)"; **la v0.2 del MASTER-SPEC tiene 24 secciones** y el contenido de mapa vive en §3, §11.5 y §13 — se documenta así para evitar una referencia inexistente.

---

*Fin del documento. Grupo W7 (brand) completo: `BRAND-BOOK.md` → `DESIGN-TOKENS.md` → `UI-GUIDELINES.md` → `MAP-VISUAL-GUIDELINES.md`.*