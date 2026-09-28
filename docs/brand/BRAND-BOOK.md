# CargoOps — Manual de Marca (BRAND-BOOK)

> Grupo: W7 (brand) · Fuente canónica: `docs/MASTER-SPEC.md` (v0.1) · Estado FASE 0: especificación textual, sin assets gráficos (SVG/PNG) hasta nueva orden.
> Este documento define **qué es** la marca CargoOps y **cómo se comporta**, no cómo se renderiza. Los valores numéricos de color/tipografía viven en `DESIGN-TOKENS.md`; las reglas de componentes en `UI-GUIDELINES.md`; el sistema visual del mapa en `MAP-VISUAL-GUIDELINES.md`.

---

## 1. Objetivo

Definir la identidad de marca de CargoOps: concepto, naming, tagline, personalidad, voz y tono, y reglas de aplicación/usos incorrectos. El objetivo es que cualquier agente de implementación, diseñador o copywriter produzca piezas **reconocibles, coherentes y operativamente sobrias** sin ambigüedad, a partir de especificación textual.

## 2. Contexto

- CargoOps es una plataforma web profesional de gestión operativa de cargas y depósitos en un predio logístico/aduanero (MASTER-SPEC §1.1): registro de cargas, camiones, descargas, ubicación física, plazoleta, sectores, áreas especiales y trazabilidad completa con alertas.
- La marca opera en un contexto de **uso profesional de alta frecuencia**: operadores de depósito, supervisores y administradores trabajan con la plataforma muchas horas al día, en escritorio y, en menor medida, en tablet/móvil (MASTER-SPEC §12).
- Principios UX canónicos que condicionan la marca (MASTER-SPEC §12): claridad > decoración, velocidad, legibilidad, estados visibles, mínima fricción, trazabilidad. La identidad visual debe **apoyar** estos principios, nunca competir con ellos.
- Público objetivo: operadores logísticos, jefes de depósito, personal aduanero/despachante, administradores de predio. Perfil: técnico, con poco tiempo, vocabulario de depósito (carga, sector, plazoleta, permanencia, rezago, descarga).
- UI inicial en es-AR (MASTER-SPEC §16, OQ-012); el idioma de la interfaz es español rioplatense neutro, y la marca debe sonar igual de natural en Argentina, Chile, Uruguay y México.

## 3. Restricciones

- FASE 0: **solo documentación**. Prohibido generar SVG/PNG/logos vectoriales reales o assets de producción. El logo aquí es **descripción textual** para guiar el trabajo visual futuro.
- No inventar reglas de negocio: toda decisión de marca que requiera validación del usuario se declara en `DECISIÓN PENDIENTE` (centralizada por el orquestador en `OPEN-QUESTIONS.md`).
- No introducir colores fuera de la paleta definida en `DESIGN-TOKENS.md` (derivada de MASTER-SPEC §13).
- No usar jerga marketinera ni tono festivo: el contexto es operativo y de control de mercadería ajena.
- Cualquier desviación del MASTER-SPEC debe justificarse por escrito y quedar como pendiente.

## 4. Dependencias

| Documento | Relación |
| --- | --- |
| `docs/MASTER-SPEC.md` | Propósito (§1), glosario (§2), capacidades (§1.4), principios UX (§12), paleta base (§13), UI es-AR (§16) |
| `docs/OPEN-QUESTIONS.md` | Centralización de decisión pendiente de tagline, paleta y arte de logo (entradas a agregar por el orquestador) |
| `docs/brand/DESIGN-TOKENS.md` | Valores de color, tipografía, spacing, etc. que esta marca consume |
| `docs/brand/UI-GUIDELINES.md` | Aplicación de la marca en componentes |
| `docs/brand/MAP-VISUAL-GUIDELINES.md` | Aplicación de la marca en el plano operativo |
| `docs/ux/USER-FLOWS.md`, `docs/frontend/DESIGN-SYSTEM.md` (W4/W6) | Consumidores futuros de esta identidad |

## 5. Decisiones

### 5.1 Naming: CargoOps

| Aspecto | Decisión |
| --- | --- |
| Nombre | **CargoOps** (una sola palabra, "O" mayúscula). |
| Origen | `Cargo` (unidad operativa de mercadería, dominio) + `Ops` (operaciones). Comunica el dominio (cargas) y el tipo de producto (gestión operativa). |
| Ventajas | Corto, memorable, descriptivo, pronunciable en español e inglés sin cambios ("kárgo-ops"), fácil de escribir en código/IDs, consistente con los repos objetivos `cargoops-frontend/backend/infrastructure` (MASTER-SPEC §22). |
| Alternativas evaluadas | `CargoOps` vs `Cargo Ops` (con espacio) vs `CARGOOPS`. Se descartan las variantes con espacio o todo mayúsculas: rompen legibilidad y la convención de repos. |
| Regla de escritura | Siempre `CargoOps` en texto corriente. Nunca `Cargoops`, `CARGOOPS`, `Cargo Ops` ni `Cargo-Ops`. En minúsculas de código se admite `cargoops` (repos, URLs, paquetes). |
| Uso como verbo/atributo | `Sistema CargoOps`, `la plataforma CargoOps`; evitar usarlo como adjetivo genérico ("cargas cargoops"). |
| Registro legal | Verificación de disponibilidad de marca/dominio **fuera de alcance FASE 0** — ver DECISIÓN PENDIENTE DP-BR-04. |

### 5.2 Concepto de marca (brand concept)

CargoOps es la marca de **control operativo con trazabilidad total**. Su identidad se resume en tres ejes:

1. **Control** — el operador sabe dónde está cada carga, siempre.
2. **Claridad** — la pantalla se lee de un vistazo; el sistema no decora, informa.
3. **Trazabilidad** — cada movimiento queda registrado y es reconstruible (MASTER-SPEC §1.1, BR-008).

Metáfora rectora: **"el depósito bien ordenado"** — estanterías alineadas, etiquetas legibles, pasillos despejados. La interfaz debe sentirse como un plano prolijo, no como un tablero festivo.

Arquetipo de marca: **El Experto Pro** (quiet competence). No es el amigo simpático (cartoonish), no es el burocrata frío (hostil). Es el jefe de depósito de confianza: breve, preciso, sin gritos, que nunca pierde una carga.

### 5.3 Concepto de logo (descripción textual — sin assets en FASE 0)

Propuesta base **"Módulo Ubicado"**, lista para exploración visual en fases futuras:

- **Símbolo**: un cuadrado redondeado (contorno de nave/galpón en trazo grueso) dividido internamente por una grilla 2×2 (los sectores del depósito). **Una celda** — la superior derecha — está **rellena** con el color primary; las otras tres permanecen vacías. Lectura: "la carga está ubicada en el sector correcto". 
- **Alternativa de símbolo (variante B)**: la celda rellena se sustituye por un **pin de ubicación** superpuesto a la grilla, anclado en la celda superior derecha. Aplicar en contextos donde el pin comunique mejor (mapa, app móvil futura).
- **Wordmark**: `CargoOps` en la tipografía de marca (sans semibold, ver DESIGN-TOKENS), con la letra **O final tratada como punto de mapa** (círculo con muesca de pin) — opcional, a validar en exploración visual; si distrae, se descarta y queda tipografía limpia.
- **Lectura cromática**: símbolo en primary `#2563EB` sobre fondo surface; en contextos oscuros, versión monocolor blanco. Nada de degradados, sombras ni efectos 3D.

**Variantes oficiales** (todas textuales; el set final se renderiza en FASE visual):

| Variante | Descripción | Uso |
| --- | --- | --- |
| Lockup horizontal | Símbolo + wordmark lado a lado | Header de la app, login, documentos |
| Lockup apilado | Símbolo sobre wordmark centrado | Pantallas de bienvenida/instalación (futuro), presentaciones |
| Solo símbolo | Símbolo sin wordmark | Favicon, icono de app, avatar de marca, marcas de agua |
| Monocromo positivo | Todo en `#0F172A` | Impresión limitada a un color (etiquetas internas) |
| Monocromo inverso | Todo en blanco | Sobre fondos dark `#0F172A` y fotografías oscuras |
| Versión pequeña | Símbolo simplificado: la grilla puede simplificarse a 2 celdas (1 rellena) bajo 32 px | Favicon y miniaturas |

**Reglas de espacio y tamaño mínimos**: el espacio de seguridad equivale a la altura de la "C" del wordmark en todas las direcciones. Tamaño mínimo de reproducción: lockup horizontal 150 px de ancho; símbolo 24 px. Por debajo de 32 px, usar el símbolo simplificado (2 celdas).

### 5.4 Taglines (propuestas — elección PENDIENTE)

| # | Tagline | Ángulo |
| --- | --- | --- |
| T-1 | **"Control total, trazabilidad absoluta."** | Refuerza los dos pilares funcionales del producto (control + trazabilidad). La más descriptiva. |
| T-2 | **"Cada carga, siempre localizada."** | Centrada en el beneficio concreto para el operador; la más "de depósito". |
| T-3 | **"Tu predio, claro de punta a punta."** | Más cercana y territorial; buena para comunicación comercial, menos técnica. |

Reglas de uso: la tagline nunca reemplaza al wordmark; acompaña al lockup solo en contextos de presentación (login, documentos, presentaciones), nunca dentro de la app operativa (ruido visual).

### 5.5 Personalidad de marca

| Eje | Posición |
| --- | --- |
| Confianza | Alta — el sistema nunca pierde una carga (trazabilidad). |
| Calidez | Media-baja — profesional, cordial sin ser efusivo. |
| Formalidad | Media — registro técnico claro, sin burocracia ni exceso de tecnicismo. |
| Energía | Media — sobria; la urgencia la comunica el color semántico, no la tipografía. |
| Humor | Nulo en contexto operativo — el humor no aparece en la UI ni en errores. |

Palabras que describen la marca: *precisa, confiable, ordenada, directa, sobria, pro-operación*. Palabras que NO la describen: *divertida, juvenil, ruidosa, decorativa, abstracta, marketinera*.

### 5.6 Voz y tono (writing guide)

**Voz** (quién habla): la plataforma habla como un **supervisor de depósito competente**: conoce el predio, usa el vocabulario del oficio, da instrucciones cortas y confirmaciones claras.

**Tono** (cómo habla según el contexto):

| Contexto | Tono | Ejemplo de copy (lengua de referencia) |
| --- | --- | --- |
| Operación normal | Directo, confirmatorio | "Carga 029TERRA26 movida a Sector 4." |
| Confirmación de acción destructiva | Serio, con consecuencia explícita | "Reversión del movimiento del Sector 4 al Sector 1. Esta acción queda registrada en el historial." |
| Error de validación | Específico, con causa y acción | "La observación es obligatoria para mover la carga. Escribí el motivo en el campo Observación." |
| Error de sistema | Sobrio, con referencia útil | "No se pudo guardar el movimiento (ref. a3f2…). La carga no fue modificada. Intentá de nuevo o contactá al administrador." |
| Mensaje vacío | Informativo, invita a la acción | "No hay cargas en este sector. Para ubicar una carga, usá 'Mover carga'." |
| Registro de observación | Verbos en infinitivo/imperativo corto | "Indicá el motivo del movimiento." |

**Reglas de copy**:
- Frases cortas. Una idea por oración. Evitar negaciones dobles.
- Vocabulario del dominio confirmado por glosario (MASTER-SPEC §2): *carga, camión, plazoleta, galpón, sector, descarga, ubicación, movimiento, observación, permanencia, rezago, secuestro, scanner, balanza*.
- Números y códigos siempre tal cual ingresados (`029TERRA26`, no "la carga 29 terra").
- Sin exclamaciones salvo alertas operativas reales ("¡Capacidad superada!"), y aun así con moderación.
- Sin jerga marketinera ("solución integral", "experiencia premium") en UI.
- Errores: formato `Qué pasó + Por qué + Qué hacer` (ver UI-GUIDELINES §Alertas).
- La voz no usa regionalismos fuera de es-AR neutro (OQ-012); nada de lunfardo ("laburo", "mango") en copy de UI.
- Nombre del producto en copy: `CargoOps` como sustantivo propio; "el sistema" como alternativa genérica.

### 5.7 Aplicaciones (dónde vive la marca)

| Aplicación | Alcance en FASE 0 |
| --- | --- |
| Interfaz web (Angular 20+, §11.2) | Colores, tipografía, componentes: ver DESIGN-TOKENS.md y UI-GUIDELINES.md |
| Mapa operativo (SVG) | Identidad cromática de zonas y estados: ver MAP-VISUAL-GUIDELINES.md |
| Exportaciones PDF (§10, ADR-013) | Header con lockup horizontal, footer con página y "CargoOps", paleta limitada a secondary/primary/text; tipografía del sistema (el PDF se genera en backend; usar las mismas tokens si el motor lo permite, si no, aproximación documentada) |
| Login / auth | Lockup horizontal + tagline seleccionada + fondo background; sin fotografía de stock |
| App móvil futura (§1.5) | Solo símbolo en icono; respetar breakpoints y touch targets |
| Fuera de alcance FASE 0 | Papelería, redes, merchandising, sitios web marketing — no se documentan |

### 5.8 Usos incorrectos (do / don't)

**Do**:
- Usar el lockup horizontal en headers y documentos.
- Usar el símbolo solo en favicon/app icon/avatar.
- Respetar espacio de seguridad y tamaños mínimos.
- Usar la variante monocromo inversa sobre `secondary` (#0F172A).
- Mantener proporciones; escalar siempre de forma proporcional.
- Acompañar el símbolo con texto/label en cualquier contexto < 32 px.

**Don't**:
- No estirar, rotar, inclinar ni deformar el símbolo o wordmark.
- No recolorar el logo fuera de: primary, secondary, blanco (positivo/inverso), monocromo.
- No aplicar degradados, sombras, brillos, bordes, rellenos fotográficos ni efectos 3D al símbolo.
- No colocar el logo sobre fondos de contraste insuficiente (p. ej. sobre warning `#F59E0B` o sobre fotos aéreas ruidosas).
- No animar el logo (ni en login ni en loading).
- No escribir "CargoOps" con otra capitalización ni separarlo.
- No usar el logo como adorno decorativo; siempre cumple una función de identificación.
- No combinar el logo con otros símbolos ajenos en el mismo bloque.

### 5.9 Sistemas de apoyo (support systems)

| Sistema | Regla |
| --- | --- |
| **Iconografía** | Un solo set de íconos lineal (stroke 1.5–2, grilla 24×24). Significados fijos: camión, carga, movimiento, reloj (permanencia/rezago), candado (secuestro), escáner, balanza, alerta/bell, ubicación/pin. Los íconos **siempre** con label textual en contextos operativos críticos (no color/ícono solo). Detalle: UI-GUIDELINES.md y futuro DESIGN-SYSTEM.md (W4). |
| **Fotografía** | No se usa fotografía de personas ni stock en producto. Fondos planos (background/surface). La "fotografía" del producto ES el mapa operativo (ver MAP-VISUAL-GUIDELINES.md). |
| **Ilustración** | No se usan ilustraciones decorativas en v1 (principio claridad > decoración). Los empty states usan ícono + tipografía (UI-GUIDELINES.md). |
| **Data-viz** | Gráficos del dashboard: paleta categórica derivada de tokens semánticos (ver DESIGN-TOKENS.md §Color). Sin 3D, sin sombras en barras, sin colores fuera de la paleta. |
| **Motion** | Mínima y funcional: ver tokens de motion en DESIGN-TOKENS.md; reglas de uso en UI-GUIDELINES.md §Principios. |
| **Copy/tone** | Este manual (§5.6) es la fuente de voz; cualquier copy nuevo se redacta con estas reglas. |
| **Accesibilidad** | La marca nunca gana sobre la accesibilidad: contraste AA sobre todos los fondos (auditoría en DESIGN-TOKENS.md §Evaluación de contraste), focus visible en todo componente. |

## 6. Criterios de aceptación

- [ ] El documento existe y es coherente con MASTER-SPEC §§1, 2, 12, 13, 16.
- [ ] El naming `CargoOps` queda definido con reglas de escritura y sin ambigüedad de capitalización.
- [ ] El concepto de logo es 100 % textual, reproducible por un diseñador sin assets previos.
- [ ] Hay 2–3 taglines propuestas y la elección está marcada DECISIÓN PENDIENTE.
- [ ] Voz y tono incluyen ejemplos concretos de copy por contexto.
- [ ] Sección do/don't completa sin placeholders.
- [ ] No se definen colores nuevos: todo valor numérico apunta a DESIGN-TOKENS.md.
- [ ] Las DECISIONES PENDIENTES identificadas están listadas en §8 con formato pregunta + impacto.

## 7. Archivos involucrados

- `docs/MASTER-SPEC.md` (canónico)
- `docs/OPEN-QUESTIONS.md` (pendientes centralizados)
- `docs/brand/BRAND-BOOK.md` (este archivo)
- `docs/brand/DESIGN-TOKENS.md` · `docs/brand/UI-GUIDELINES.md` · `docs/brand/MAP-VISUAL-GUIDELINES.md` (sistema de apoyo)
- Futuros consumidores: `docs/frontend/DESIGN-SYSTEM.md`, `docs/ux/USER-FLOWS.md`, `docs/ux/MAP-UX.md`, `docs/backend/PDF-EXPORT.md`

## 8. Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Marca confundida con competencia o dominio ocupado | DP-BR-04: verificación legal/dominio fuera de alcance; no bloquea FASE 0. |
| Logo con concepto difícil de rasterizar en 24 px | Variante simplificada definida (2 celdas) + tamaño mínimo 24 px. |
| Tagline elegida sin validación de negocio | DECISIÓN PENDIENTE (DP-BR-01 🔶 residual local de marca); no se usa en UI hasta validar. |
| Tono demasiado cercano/duro según el público | Reglas de tono por contexto (§5.6); revisión con usuarios en fases de testing (W8). |
| Copy regional deslizado en UI | Regla explícita: es-AR neutro, sin lunfardo (OQ-012). |
| Desviación cromática entre implementadores | Tokens únicos en DESIGN-TOKENS.md; prohibido hex suelto en código. |

## 9. DECISIÓN PENDIENTE

| ID | Pregunta | Impacto | Propuesta de este documento |
| --- | --- | --- | --- |
| DP-BR-01 | ¿Qué tagline se adopta entre T-1, T-2 y T-3 (§5.4)? | Copy de login, PDF y presentaciones | 🔶 Residual local de marca (sin OQ; T-1 "Control total, trazabilidad absoluta." como propuesta) |
| DP-BR-02 | ¿Se valida la paleta base de MASTER-SPEC §13 tal cual, o se acepta el ajuste propuesto en DESIGN-TOKENS.md (tokens derivados texto-seguros para warning/info/success sin tocar los hex base)? | Todos los componentes y el mapa | 🔶 Residual local de marca (sin OQ; mantener hex base + tokens derivados) |
| DP-BR-03 | ¿Se aprueba el concepto de logo "Módulo Ubicado" (grilla 2×2 + celda rellena / variante pin) para la exploración visual de la FASE de implementación? | Identidad visual futura | 🔶 Residual local de marca (sin OQ; concepto §5.3, arte final fuera de FASE 0) |
| DP-BR-04 | ¿Hay restricciones legales/registro sobre el nombre CargoOps (marca/dominio)? | Naming definitivo | 🔶 Residual local de marca (sin OQ; fuera de FASE 0 — no bloquea documentación) |
| DP-BR-05 | ¿Dark mode es requerido en v1 (afecta tokens de surface/text y el mapa) o se difiere? | Tokens y mapa | 🔶 Residual local de marca (sin OQ; diferir a v1.1+ — v1 solo tema claro, coherente con OQ-010 PWA mínima) |

> Nota de proceso: estas entradas se reportan al orquestador para su centralización en `OPEN-QUESTIONS.md` (el grupo W7 no edita ese archivo). Los IDs DP-BR-* son locales a este grupo; el orquestador puede renumerarlos como OQ-xxx.

---

*Fin del documento. Próximo: `DESIGN-TOKENS.md` (valores) y `UI-GUIDELINES.md` / `MAP-VISUAL-GUIDELINES.md` (aplicación).*