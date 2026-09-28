# ADR-002 — Angular

- Estado: Accepted
- Fecha: 2026-09-23
- Decisores: Equipo CargoOps / Software Architect

## Contexto

El frontend de CargoOps es una aplicación de **operación profesional**: desktop-first (notebooks/PCs en el predio), con tablas densas de cargas, timeline de movimientos, formularios de observación obligatoria y un **mapa SVG interactivo** del predio (ADR-006). El MASTER-SPEC fija el stack en §11.2: Angular 20+, TypeScript, Standalone Components, Signals, Router, Reactive Forms, SSR «cuando aporte» y PWA. La accesibilidad es objetivo WCAG 2.2 AA (MASTER-SPEC §12) y la interfaz será es-AR en una primera instancia (OQ-012).

El frontend nunca es la capa de autorización (BR-009): los guards frontend son solo UX. El estado de la aplicación incluye datos maestros (cargos, ubicaciones, mapa), consultas del dashboard y una capa de interactividad del mapa (selección, hover, drag en editor).

## Decisión

Adoptar **Angular 20+** como framework frontend, con las prácticas canónicas fijadas en MASTER-SPEC §11.2 y §11.4:

- **Standalone Components** como único estilo de componentes (sin NgModules en código nuevo): se elimina el boilerplate de módulos y se simplifica el lazy loading por feature (MASTER-SPEC §11.4 estructura `core/ shared/ features/ layouts/ pages/`).
- **Signals** como primitiva de estado reactivo: inputs/outputs señalizados, computed para derivados (p. ej. capacidad usada vs. capacidad configurada de una Location), `effect` mínimo y explícito. Evaluar ejecución **zoneless** (opcional al momento de implementar) para reducción de bundle y de trabajo de detección de cambios en el mapa.
- **Router** estándar de Angular con lazy loading por feature y guards de ruta con la misma semántica de los permisos backend (solo UX, nunca autoridad).
- **Reactive Forms** para formularios operativos (registro de carga, movimiento con observación obligatoria BR-006/007, confirmación de reversión).
- **PWA mínima en v1** (manifest + service worker para caching de assets y shell): los movimientos críticos **no son offline** sin estrategia transaccional explícita (MASTER-SPEC §12). El alcance SSR/PWA completo queda sujeto a OQ-010.
- **i18n** con `@angular/localize` preparado desde el inicio; UI v1 es-AR (OQ-012), claves externas para futuro inglés.
- TypeScript en modo `strict`, ESLint y Prettier (MASTER-SPEC §15).

El estado de decisión es **Accepted**: el framework está fijado canónicamente; las únicas preguntas abiertas son de alcance (OQ-010 SSR/PWA, OQ-012 idioma), no del framework.

## Alternativas consideradas

1. **React 19 + Vite.** Rechazada: no aporta ventaja sobre Angular para este dominio (tablas + formularios + mapa); exigiría decisiones propias de estado (context/zustand), routing y estructura que Angular ya resuelve con convención; el equipo objetivo del proyecto (documentado para implementación por agentes) se beneficia de la opinión fuerte de Angular (CLI, esquemas, testing con TestBed).
2. **Vue 3 + Nuxt.** Rechazada: ecosistema más fragmentado para aplicaciones enterprise y curva de decisión sobre meta-framework; no hay ganancia tangible para un CRUD operativo con mapa.
3. **Svelte/SvelteKit.** Rechazada: bundle más chico, pero menor madurez de ecosistema para app enterprise operativa (accesibilidad, i18n, testing) en el horizonte del proyecto.
4. **Web Components puros / vanilla.** Rechazada: no cubre necesidades de estado, routing, formularios validados y testing a escala.

La elección de Angular es de **convención y ecosistema**, no de performance; el componente crítico de performance es el mapa SVG (ADR-006), que se resuelve con técnicas específicas independientes del framework.

## Consecuencias

**Positivas:**

- Convención fuerte: estructura, CLI, testing y accesibilidad resueltos por el framework.
- Signals + standalone reducen el boilerplate y mejoran la performance de re-render frente al mapa interactivo (render dirigido en piezas del mapa, no del árbol completo).
- SSR disponible (Angular Universal) si OQ-010 se resuelve a favor, sin cambio de framework.

**Negativas:**

- Bundle inicial mayor que alternativas minimalistas; mitigado con lazy loading por feature, zoneless (si aplica) y PWA caching.
- Curva de aprendizaje de Signals/zoneless para desarrolladores con experiencia Angular clásica (NgModules/Zone.js): requiere alineación del equipo en la fase 1.
- Dependencia del ciclo de release de Angular (mayor versionado activo); mitigado con actualizaciones continuas vía `ng update`.

## Referencias

- MASTER-SPEC §11.2 (stack), §11.4 (estructura frontend), §12 (UX/UI, accesibilidad, PWA), §15 (estándares).
- ADR-006 (motor de mapa SVG sobre el mismo frontend), ADR-008/009 (guards solo UX, BR-009).
- OQ-010 (SSR/PWA en v1), OQ-012 (idioma UI).
- `frontend/FRONTEND-ARCHITECTURE.md`, `frontend/COMPONENTS.md` (grupo W4).