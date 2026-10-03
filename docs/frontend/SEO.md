# CargoOps — SEO y Metadata (SEO)

> Grupo W4 (frontend) · Fuente canónica: `docs/MASTER-SPEC.md` (§11.2 "SSR cuando aporte"), `docs/OPEN-QUESTIONS.md` (OQ-010), `docs/frontend/FRONTEND-ARCHITECTURE.md` (§5.9, §5.6).
> Fase 0: documentación. Los bloques fenced son ilustrativos; no se genera código de producción.

## 1. Objetivo

Definir la estrategia de SEO y metadata del frontend de CargoOps: qué páginas son indexables vs no-index (aplicación autenticada), títulos/descripciones por ruta, Open Graph, robots/sitemap, URLs semánticas, HTML semántico y SSR/SSG donde tenga sentido (alcance cerrado en OQ-010, 2026-09-24: sin SSR en v1).

## 2. Contexto

CargoOps es una aplicación corporativa de **acceso restringido**: el único acceso público en v1 es `/login` (SCREENS §1) y no existe landing pública en el alcance actual. Por lo tanto, el SEO aplica con moderación y con una regla dominante: **nunca indexar datos operativos del predio**. MASTER-SPEC define SSR "cuando aporte" (§11.2) sin fijar alcance en v1 (OQ-010). SSR también aporta a la primera carga percibida de login y de una landing futura (FRONTEND-ARCHITECTURE §5.9).

## 3. Restricciones

- R1: Ninguna página autenticada es indexable: dashboard, cargas (listado/detalle/registro/edición), camiones, mapa operativo, planos, historial, alertas, auditoría, configuración, usuarios/roles → `robots: noindex` siempre (datos sensibles del predio).
- R2: `/login` tampoco se indexa: no tiene contenido informativo y su URL no debe quedar en índices.
- R3: Metadata por ruta: título, descripción (y canonical si aplica) definidos en `data` de cada ruta (ROUTING §5.5); beneficio doble SEO/a11y (`<title>` anunciado por lectores).
- R4: HTML semántico (landmarks, heading jerárquico) como base SEO y a11y (ACCESSIBILITY §5.1/5.9).
- R5: SSR/SSG **resuelto en OQ-010 (2026-09-24)**: rama A — sin SSR en v1 (PWA mínima); este documento describe la rama A como v1 (DP-SEO-02 resuelta).
- R6: Los datos autenticados nunca viajan en HTML servido por SSR (solo contenido público).

## 4. Dependencias

| Documento | Uso |
| --- | --- |
| MASTER-SPEC §11.2 | SSR "cuando aporte" |
| OQ-010 | Alcance SSR/PWA en v1 |
| `frontend/FRONTEND-ARCHITECTURE.md` §5.9/§5.6/§5.5 | SSR, errores, títulos |
| `frontend/ROUTING.md` | Árbol y `data` de metadata |
| `frontend/I18N.md` | Títulos localizados (es-AR) |
| `frontend/PWA.md` | Coordinación carga/actualización con SSR |

## 5. Decisiones

### 5.1 Páginas indexables vs no-index

- **v1: 0 páginas indexables** (login noindex + app autenticada noindex; sin landing). 
  - Implementación: el `meta.service` (ROUTING §5.5) aplica `noindex, nofollow` globalmente de forma idempotente; capa extra propuesta: `X-Robots-Tag: noindex` a nivel servidor/deploy (DP-SEO-03, con devops W9) para que incluso el HTML fuente sin JS no sea indexable.
  - Los parámetros internos (filtros `?estado=…`) no generan páginas indexables (todo el sitio está noindexed).
- **Futuro**: si existe landing pública (única página indexable), pasa a `index,follow`, se agrega a sitemap y se le aplica OG — **OQ-033 resuelta (2026-09-24): sin landing pública en v1** (sin página indexable en v1).
- Canonical: sin duplicados en v1; cuando exista contenido multi-idioma (I18N, DP-I18N-01) aplicar canonical + `hreflang` es/es-AR.

### 5.2 Metadata por ruta (title, description)

- `data: { title: $localize(...), description?: $localize(...) }` en cada ruta (ROUTING §5.5); `meta.service` central aplica `<title>`, meta description y `robots` en cada navegación (Router events) y en el bootstrap.
- Formato de título: `CargoOps — Cargas` (app + sección, es-AR v1); h1 único por página coherente con el título (beneficio a11y: SCREENS y ACCESSIBILITY §5.9).
- Sin páginas sin título: todo route leaf con `data.title` (criterio QA).

### 5.3 Open Graph

- Solo páginas públicas (landing futura): `og:title`, `og:description`, `og:type=website`, `og:image` (assets de marca/BRAND), `og:locale es_AR`, `og:site_name`.
- En páginas autenticadas: no aplica (noindex); no emitir OG tags sin contenido válido.

### 5.4 robots.txt y sitemap

- **robots.txt**: `User-agent: *` + `Disallow: /` (todo exige autenticación) + referencia a `/sitemap.xml` solo si existe. Si hubiera landing pública futura: `Disallow` selectivo de rutas autenticadas (`/dashboard`, `/cargos`, `/operational-map`, `/maps`, `/history`, `/alerts`, `/auditoria`, `/configuracion`, `/usuarios`, `/roles`, `/trucks`) y acceso a las públicas.
- **sitemap.xml**: solo páginas públicas indexables → en v1, ausente o vacío (flag DP-SEO-01). Con landing futura: incluir solo las públicas (login no va al sitemap).
- Generación estática en build/deploy (no runtime).

### 5.5 URLs semánticas

- Rutas kebab-case descriptivas ya definidas en `ROUTING.md` (`/operational-map`, `/cargos/:id`); sin parámetros crípticos visibles; query params de filtros legibles (`?estado=STORED&pagina=2`).
- IDs de carga alfanuméricos en la URL con encoding sistemático (códigos con `/`, MASTER-SPEC §4.4 — ROUTING §5.4).

### 5.6 HTML semántico

- Landmarks: `header` (topbar del shell), `nav` (sidebar), `main id="main"` (contenido; skip link de ACCESSIBILITY), `article` para tarjetas (`AlertCard`, `LocationCard`), `section` con headings; h1 único por página y jerarquía sin saltos.
- Tablas semánticas (`caption`/`thead`/`th scope`) — beneficio marginal de SEO y crítico de a11y (ACCESSIBILITY §5.6).
- Links descriptivos (anclas con propósito legible: "Ver todas las alertas", código de carga).

### 5.7 SSR/SSG (OQ-010 resuelta 2026-09-24: sin SSR en v1)

- **Rama A — sin SSR (decidida; PWA mínima)**: metadata aplicada en cliente (bootstrap + navegación); primera carga percibida vía precaching del SW (PWA.md); las páginas siguen noindexed (no hay contenido público que indexar en v1).
- **Rama B — SSR parcial (diferida a v1.1+)**: SSR para `/login` (y landing pública futura): title/description/OG servidos en el HTML inicial + primer paint; SSG para la landing estática si existiera. Las rutas autenticadas permanecen client-rendered: **ningún dato autenticado se serializa en HTML** (sin transfer state de datos privados; los tokens nunca viajan — ADR-008).
- Impacto de infraestructura (node server / prerender) y coordinación con PWA (hidratación doble render) documentados en FRONTEND-ARCHITECTURE R-05; la decisión quedó tomada en OQ-010 (rama A en v1).
- SSR también beneficia a11y de primera carga (contenido inmediato para lectores) — sin cambio de alcance.

## 6. Criterios de aceptación

- CA-1: Todas las rutas autenticadas emiten `noindex` (verificable en meta y, si aplica, en el HTML servido).
- CA-2: Cada ruta define `title`/`description` en `data` (sin páginas sin título).
- CA-3: robots.txt y sitemap coherentes con 0 páginas indexables en v1.
- CA-4: h1 único por página y jerarquía sin saltos (auditable por test).
- CA-5: En rama B (SSR), el HTML inicial de `/login` contiene title/description/OG correctas y cero datos autenticados.

## 7. Archivos involucrados

- Consumidores: `frontend/ROUTING.md` (data), `frontend/ACCESSIBILITY.md` (títulos/landmarks), `frontend/I18N.md` (títulos localizados), `frontend/PWA.md` (coordinación de carga).
- Fuentes: MASTER-SPEC §11.2, OQ-010, FRONTEND-ARCHITECTURE §5.9/§5.6.

## 8. Riesgos

- R-01: Indexación accidental de datos del predio → capas noindex (meta + header servidor) + test en QA.
- R-02: SSR de rutas autenticadas filtra estado → regla: SSR solo público (R6).
- R-03: Títulos duplicados o vacíos entre rutas → `meta.service` central + test unitario de metadata.
- R-04: Landing solicitada fuera de alcance sin diseño → DP-SEO-01/OQ-033 (resuelta 2026-09-24: sin landing pública en v1; la pantalla no existe en SCREENS v1).

## 9. DECISIÓN PENDIENTE

| ID | Pregunta | Relación |
| --- | --- | --- |
| DP-SEO-01 | ~~¿Landing pública en v1 (única página indexable + sitemap)?~~ → **RESUELTA (OQ-033, 2026-09-24)**: **sin landing pública en v1** — app 100% autenticada, login directo; SEO/sitemap fuera de alcance (consistente con OQ-010: SSR diferido) | OQ-033 (resuelta 2026-09-24) |
| DP-SEO-02 | ~~Alcance SSR: rama A (sin SSR; PWA mínima) vs rama B (SSR login/landing)~~ → **RESUELTA (OQ-010, 2026-09-24)**: **rama A** — PWA mínima sin SSR en v1; SSR diferido a v1.1+ | OQ-010 (resuelta 2026-09-24) |
| DP-SEO-03 | ¿`X-Robots-Tag` también a nivel servidor (además del meta)? Depende del deploy | 🔶 Residual local (OQ-010 resuelta: sin SSR; decisión de deploy — devops W9) |