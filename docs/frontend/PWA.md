# CargoOps — Progressive Web App (PWA)

> Grupo W4 (frontend) · Fuente canónica: `docs/MASTER-SPEC.md` (§12: instalación, caching, offline parcial, actualizaciones; **"Movimientos críticos NO offline" sin estrategia transaccional explícita**), `docs/architecture/ADR/ADR-002-Angular.md` (service worker de Angular), `docs/OPEN-QUESTIONS.md` (OQ-010: alcance PWA/SSR en v1).
> Fase 0: documentación. Los bloques fenced son ilustrativos; no se genera código de producción.

## 1. Objetivo

Definir la estrategia PWA del frontend de CargoOps: manifest, service worker, estrategias de caching (precache vs runtime), offline parcial (consulta de datos cacheados, **sin escrituras**), flujo de actualización y la **REGLA CRÍTICA**: las operaciones de movimiento NO son offline en v1. El alcance quedó **resuelto en OQ-010 (2026-09-24): PWA mínima (rama A)**.

## 2. Contexto

Aplicación de operación profesional en la red del predio: la conectividad estable es la norma, pero pueden existir cortes parciales (oficina ↔ depósito). MASTER-SPEC §12 exige instalación, caching, offline parcial y actualizaciones; ADR-002 fija **PWA mínima en v1** (manifest + SW de assets y shell) y prohíbe movimientos offline sin estrategia transaccional explícita. La autorización es JWT en memoria + refresh en cookie HttpOnly (ADR-008): **el service worker nunca toca tokens ni respuestas de auth**.

## 3. Restricciones

- R1: **Ninguna mutación offline en v1**: movimientos, cambios de estado, creación/registro, reversiones, edición de plano — todas requieren conexión y respuesta 2xx (BR-006/007/008/016; MASTER-SPEC §12). Sin colas de reintento sin estrategia transaccional (OQ-032 resuelta 2026-09-24: movimientos NO offline; `Idempotency-Key` en escritura).
- R2: Sin caching de endpoints de auth (`/api/v1/auth/*`) ni de respuestas con datos personales (export PDF — BR-018).
- R3: El cache de datos operativos es solo de LECTURA y siempre se muestra con frescura (timestamp "última sincronización").
- R4: HTTPS obligatorio (SW y manifest); lo garantiza el deploy (devops W9).
- R5: La UI muestra estado offline (banner global) y bloquea las acciones de escritura (señal `isOffline` del interceptor api-error — FRONTEND-ARCHITECTURE §5.6; STATE-MANAGEMENT §5.6).
- R6: Alcance v1 **resuelto en OQ-010 (2026-09-24): PWA mínima (rama A)**; la PWA completa (offline total de lectura, sincronización programada, colas) NO se implementa en v1 (requeriría estrategia transaccional — OQ-032: movimientos NO offline).

## 4. Dependencias

| Documento | Uso |
| --- | --- |
| MASTER-SPEC §12 | Regla de movimientos NO offline; requisitos PWA |
| ADR-002 | Stack: service worker de Angular; PWA mínima v1 |
| OQ-010 | Alcance v1 (mínima vs completa; coordinación con SSR) |
| `frontend/FRONTEND-ARCHITECTURE.md` §5.6/§5.9 | Señal offline, errores, SSR |
| `frontend/STATE-MANAGEMENT.md` | Caché de consultas, invalidación, bloqueo de escrituras |
| `frontend/ACCESSIBILITY.md` §5.9 | Anuncio accesible de actualización/offline |
| `devops/` (W9) | HTTPS, deploy, base href |

## 5. Decisiones

### 5.1 Stack: service worker de Angular (`@angular/service-worker`)

- `@angular/service-worker` + `ngsw-config.json` (integración del CLI; ADR-002).
- Alternativa evaluada — **Workbox**: control fino de estrategias, pero configuración y mantenimiento manuales (hashing, grupos) sin beneficio para el alcance v1 → reservada como opción si OQ-010 escala a rama B (DP-PWA-04).
- Registro del SW solo en production (nunca en dev); `provideServiceWorker` con `registrationStrategy` definida en implementación.

### 5.2 Manifest (web app manifest)

| Campo | Valor propuesto |
| --- | --- |
| name / short_name | CargoOps / CargoOps |
| description | Plataforma de gestión operativa de cargas y depósitos (es-AR) |
| lang | es-AR |
| start_url | `/login` (DP-PWA-02: ¿`/login` directo vs `/` con redirect?) |
| scope | `/` |
| display | standalone |
| orientation | any (desktop y móvil) |
| theme_color | `#0F172A` (`--color-secondary`, header) |
| background_color | `#F8FAFC` (`--color-background`) |
| icons | 192×192, 512×512 y maskable 512 — generados desde assets de BRAND/W7 |

- Instalabilidad: criterios estándar (HTTPS, manifest, SW con precache); `beforeinstallprompt` aceptado sin bloqueos; navegadores sin soporte PWA → la app funciona igual (progressive enhancement).

### 5.3 Estrategias de caching (ngsw)

- **Precache (`assetGroups`)**: shell de la app (index.html, chunks de features precargadas — dashboard y cargas, ver ROUTING §5.1), CSS de tokens, íconos/favicon, assets de marca. Con hash → caché inmutable.

- **Runtime caching de lectura (`dataGroups`)** — consultas GET operativas:
  - Patrón propuesto: **network-first con fallback a caché** (`strategy: "freshness"`) para listados de cargas, locations, mapas/planos, dashboard, historial y alertas: con red devuelve el dato actual y actualiza el cache; sin red sirve la última versión con indicador de antigüedad. Justificación: la frescura operativa (ocupación, estado) prima sobre la velocidad de respuesta para datos que cambian con cada movimiento.
  - Alternativa considerada — stale-while-revalidate: respuesta instantánea de caché + refetch en segundo plano; descartada para datos operativos por el riesgo de mostrar ocupación desactualizada como actual; podría evaluarse por recurso para maestros poco volátiles (`locations`) en la rama B.
  - `maxAge` por grupo (p. ej. 1 día) + `timeout` corto de red (2–5s) antes de servir fallback.

```jsonc
// Ilustración — ngsw-config.json (no producción; rutas de MASTER-SPEC §10)
{
  "index": "/index.html",
  "assetGroups": [{
    "name": "app-shell",
    "installMode": "prefetch",
    "updateMode": "prefetch",
    "resources": { "files": ["/index.html", "/favicon.ico", "/assets/**", "/*.js", "/*.css"] }
  }],
  "dataGroups": [{
    "name": "api-operativa-lectura",
    "urls": ["/api/v1/cargos", "/api/v1/locations", "/api/v1/maps", "/api/v1/dashboard",
             "/api/v1/alerts", "/api/v1/historical/**"],
    "cacheConfig": { "strategy": "freshness", "maxSize": 50, "maxAge": "1d", "timeout": "3s" }
  }]
}
```

- **Nunca en caché**: métodos no-GET (auth y mutaciones), `/api/v1/auth/*`, export PDF (PII).
- **Versionado**: los grupos de datos se versionan junto al SW; un cambio de contrato (breaking → `/api/v2`, MASTER-SPEC §10) dispara nueva versión del SW y recarga notificada (§5.5).

### 5.4 Offline parcial (consulta de datos cacheados)

- Al detectar pérdida de red (eventos de red / errores de transporte → señal `isOffline`): banner global accesible "Sin conexión — mostrando datos de la última sincronización [fecha]" (ToastHost/offline, DESIGN-SYSTEM §5.2) y las consultas sirven el cache (network-first con timeout corto).
- Lecturas: listados, detalle (si estuvo cacheado), mapa/plano (última versión), dashboard. Dato inexistente en cache → `ErrorState` "no disponible sin conexión" con reintento (solo idempotente — FRONTEND-ARCHITECTURE §5.6).
- **Escrituras: BLOQUEADAS**: acciones de mutación deshabilitadas (Mover, Registrar, Editar, Revertir...) con aviso visible (el banner lo explica; no tooltips exclusivos) y `ObservationDialog` no abre. Al recuperar la red, se rehabilita y se refetcha (invalidación — STATE-MANAGEMENT §5.6).
- Sin buffers de escritura offline en v1 ("guardar y sincronizar después" NO existe) — requiere estrategia transaccional (§5.6 y DP-PWA-03).

### 5.5 Actualización (update flow)

- `SwUpdate`: chequeo de versión en navegaciones/activaciones; al detectar nueva versión → aviso accesible "Nueva versión disponible — Actualizar" (`aria-live`, ACCESSIBILITY §5.9) y **activación en la siguiente recarga** (propuesta: evitar recargas sorpresivas en medio de una operación operativa).
- Si la nueva versión cambia el contrato API (breaking → `/api/v2`), el SW se versiona junto al deploy y se fuerza la recarga informando (el shell viejo no debe seguir sirviendo contra la API nueva).
- Nunca aplicar la actualización en mitad de una mutación confirmada: se espera el 2xx de la operación en curso; aplicar tras la confirmación no pierde datos (STATE-MANAGEMENT §5.7).
- El anuncio y el flujo de "recargar" son accesibles y no requieren configuración del usuario (sin prompts técnicos).

### 5.6 REGLA CRÍTICA: movimientos NO offline

- MASTER-SPEC §12 es categórico: "**Movimientos críticos NO offline** sin estrategia transaccional explícita".
- Razón técnica: un movimiento exige validación backend (BR-004/005/006/007/016: ubicación activa, capacidad, observación obligatoria, máquina de estados) y garantías de orden/atomicidad para el historial reconstruible (BR-008). Una cola offline sin idempotencia + reconciliación puede duplicar, reordenar o crear movimientos inconsistentes, rompiendo la trazabilidad.
- v1: movimientos y cambios de estado SOLO online, con confirmación 2xx (STATE-MANAGEMENT §5.7). 
- Camino futuro si el negocio lo exige (fuera de v1 — DP-PWA-03 / OQ-032 resuelta: movimientos NO offline): idempotency keys por movimiento, cola persistente y firme, validación local de reglas BR (costo: duplicar lógica de dominio en cliente), reconciliación con el servidor y ledger de reversión; requiere definición explícita del orquestador junto con backend.

### 5.7 Alcance v1 (OQ-010 resuelta 2026-09-24: PWA mínima)

- **Rama A — PWA mínima (decidida en OQ-010)**: manifest + SW de precache del shell + dataGroups de lectura (network-first) + banner offline + bloqueo de escrituras + update flow. Sin IndexedDB adicional, sin descarga selectiva de features, sin sincronización programada.
- **Rama B — PWA completa (futura)**: agregaría lectura offline con datos estructurados (IndexedDB), descarga selectiva de features, notificaciones sincronizadas y —solo con estrategia transaccional— cola de movimientos. Fuera de v1: OQ-010 (rama A) y OQ-032 (movimientos NO offline) resueltas 2026-09-24.
- **Coordinación con SSR (OQ-010)**: con SSR, el HTML inicial se sirve del servidor; el SW sigue cacheando assets, nunca el HTML auth dinámico; se evita el doble render/hidratación (FRONTEND-ARCHITECTURE R-05).

## 6. Criterios de aceptación

- CA-1: Manifest instalable (auditoría Lighthouse PWA básica en Chrome/Edge/Android).
- CA-2: Con red → datos siempre frescos (network-first); sin red → lectura de cache con banner y timestamp; escrituras deshabilitadas y sin buffers.
- CA-3: Logout/401 no dejan datos autenticados en cache (nunca se cachean auth ni export PDF; verificable con test).
- CA-4: Actualización con aviso accesible, sin interrumpir operaciones y sin perdida de mutaciones confirmadas.
- CA-5: Ningún movimiento offline (revisión de código + test E2E de interacción sin red).

## 7. Archivos involucrados

- Consumidores: `frontend/STATE-MANAGEMENT.md` (`isOffline`, invalidación), `frontend/ACCESSIBILITY.md` (anuncios), `frontend/DESIGN-SYSTEM.md` (banner/toast offline), `frontend/ROUTING.md` (precarga de features).
- Fuentes: MASTER-SPEC §12, ADR-002, OQ-010, `devops/` (W9: HTTPS/deploy), FRONTEND-ARCHITECTURE §5.6/§5.9.

## 8. Riesgos

- R-01: Datos cacheados presentados como actuales → banner + timestamp obligatorios (R3).
- R-02: SW sirviendo el shell viejo tras un deploy → versionado de SW + recarga notificada.
- R-03: Caché accidental de export PDF o datos personales → exclusión explícita por URL + tests.
- R-04: Actualización aplicada en mitad de una mutación → esperar el 2xx antes de activar (§5.5).
- R-05: PWA completa sin estrategia transaccional → bloqueada por R6/§5.6.
- R-06: OQ-010 resuelta (2026-09-24): **rama A — PWA mínima en v1**; la rama B no se implementa en v1.

## 9. DECISIÓN PENDIENTE

| ID | Pregunta | Relación |
| --- | --- | --- |
| DP-PWA-01 | ~~Alcance v1: rama A (PWA mínima) vs rama B (PWA completa)~~ → **RESUELTA (OQ-010, 2026-09-24)**: **rama A — PWA mínima** en v1 (manifest + service worker + offline parcial de assets); rama B diferida a v1.1+ | OQ-010 (resuelta 2026-09-24) |
| DP-PWA-02 | `start_url`: `/login` directo vs `/` con redirect (y splash) | 🔶 Residual local de marca (OQ-010 resuelta no lo fija; BRAND W7) |
| DP-PWA-03 | ~~Estrategia transaccional offline para movimientos (idempotency keys + reconciliación)~~ → **RESUELTA (OQ-032, 2026-09-24)**: movimientos **NO offline** en v1 (requieren conexión); `Idempotency-Key` en endpoints de escritura + retries con backoff | OQ-032 (resuelta 2026-09-24) |
| DP-PWA-04 | ¿Mantener Workbox como alternativa si OQ-010 escala a rama B? | 🔶 Residual local (rama B recién decidida en OQ-010; Workbox solo si escala) |