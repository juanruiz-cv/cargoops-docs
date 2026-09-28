# STORYBOOK.md — Storybook: estándar de documentación viva de componentes

> Grupo W4 (frontend). Este documento fija **cómo se documentan y verifican los componentes Angular de CargoOps con Storybook**: arquitectura y addons, estructura, naming, args, decorators, datos de ejemplo, matriz de estados por componente, pruebas, accesibilidad, responsive, regresión visual y reglas de mantenimiento. Complementa `COMPONENTS.md` (qué componentes existen) y `DESIGN-SYSTEM.md` (cómo se ven).

---

## 1. Objetivo

Definir el estándar único de Storybook para el frontend de CargoOps: la biblioteca y su ubicación, los addons obligatorios, la organización de archivos `.stories.ts`, la convención de nombres de stories y argumentos, el uso de decorators para dependencias y providers, la fuente de los datos de ejemplo, la matriz obligatoria de estados por componente, los tipos de prueba asociados a cada story, las cotas de accesibilidad y responsive, y el pipeline de regresión visual. El objetivo operativo es que el catálogo de Storybook sirva simultáneamente como documentación, como RED de seguridad de regresión y como insumo de las auditorías de accesibilidad del grupo W8.

## 2. Contexto

El inventario de componentes ya está cerrado en `COMPONENTS.md`: 18 componentes canónicos de MASTER-SPEC §11.4 (§5.1) más 11 propuestos (§5.2), cada uno con propósito, inputs, outputs, estados visuales y requisitos de accesibilidad. `DESIGN-SYSTEM.md` §5.2 define las primitivas de `ui/` y §5.3 los patrones de estado obligatorios (`loading → (error | empty | content)`), mientras `ACCESSIBILITY.md` §5.10 exige escaneo axe-core en CI y recorrido manual por pantalla. `STATE-MANAGEMENT.md` §5.4.1 y §5.7 fijan que la ocupación y la distribución son datos derivados del backend, sin optimistic update en las mutaciones de segmentos.

Estado verificado del repositorio `cargoops-frontend` a la fecha de este documento: **no existe Storybook**. `package.json` no declara `storybook` ni ningún addon; los scripts disponibles son `lint` (`oxlint`), `format:check` (Prettier), `build` y `test` (`@angular/build:unit-test` sobre Vitest 5); no hay carpeta `.storybook/` ni ningún archivo `*.stories.ts` en `src/`, y tampoco existe todavía la carpeta `ui/` de primitivas. El CI actual (`.github/workflows/ci.yml`) ejecuta `lint → format:check → build --configuration production → test`. Los componentes presentes son presentacionales de dos features: `features/cargas/components/` (`cargo-filters`, `cargo-search`, `cargo-table`, `distribution-panel`) y `features/locations/components/` (`capacity-indicator`, `location-card`, `location-cargos`, `location-filters`, `location-occupancy-card`).

La raíz de `src` real es `src/app/` y dentro se ubica `core/`, `features/`, `layouts/`, `pages/`, `models/`, `services/`, `state/`, `guards/`, `interceptors/` y `utils/`. `FRONTEND-ARCHITECTURE.md` §5.3 describe el esquema canónico `src/core/ | shared/ | features/ | …`; la diferencia de nivel (`src/app/`) es la convención efectiva del repositorio y Storybook se configura sobre ella.

## 3. Restricciones

| # | Restricción | Origen |
| --- | --- | --- |
| R-01 | Un componente standalone sin stories no se considera terminado; los 18 canónicos y los 11 propuestos tienen catálogo. | COMPONENTS.md CA-1, R4 |
| R-02 | Las stories no reproducen lógica de negocio: reciben datos por `args` y no calculan ocupación, permanencia ni unidades. | BR-009, BR-033, FRONTEND-ARCHITECTURE §5.4 |
| R-03 | Los valores por defecto de `args` provienen de los datos de referencia de MASTER-SPEC §5; ningún ejemplo usa datos inventados de otro dominio. | MASTER-SPEC §5 |
| R-04 | Los `args` respetan los contratos de `COMPONENTS.md` §6: mismos nombres, mismos tipos, mismos valores de enum canónicos. | COMPONENTS.md R1, MASTER-SPEC §4.3 |
| R-05 | Toda story con datos declara sus estados `loading`, `empty`, `error` y `normal`; las primitivas sin datos quedan justificadas. | COMPONENTS.md R4, DESIGN-SYSTEM §5.3 |
| R-06 | Los textos visibles de las stories salen de `$localize`/i18n del componente; la locale de las stories es `es-AR`. | I18N.md §5.1/§5.2, `LOCALE_ID` en `app.config.ts` |
| R-07 | Ningún componente de stories importa un store global ni un servicio HTTP real; la dependencia se inyecta con decorator. | FRONTEND-ARCHITECTURE §5.8, R2 |
| R-08 | La regresión visual es obligatoria para los 18 componentes canónicos y opcional para los propuestos. | DECISIÓN DEL ESTÁNDAR (justificación en §5.11) |
| R-09 | Storybook no sustituye las pruebas unitarias: una story con interacción relevante tiene test asociado en el archivo `*.spec.ts` del componente. | FRONTEND-ARCHITECTURE §5.8 |
| R-10 | El pipeline de stories no es bloqueante de la rama `main` hasta que la herramienta de regresión visual esté decidida (§5.11 y §9). | DECISIÓN DEL ESTÁNDAR, con pendiente explícito en §9 |

## 4. Dependencias

| Tipo | Dependencia | Qué aporta |
| --- | --- | --- |
| Canónico | `MASTER-SPEC.md` §4.3, §5, §11.4, §12, §13 | Enums, seeds de datos, catálogo de componentes, responsive, reglas de color |
| Grupo W4 | `frontend/COMPONENTS.md` §5, §6, §7 | Contratos de inputs/outputs, estados visuales y accesibilidad por componente |
| Grupo W4 | `frontend/DESIGN-SYSTEM.md` §5.2, §5.3, §5.6 | Primitivas `ui/`, secuencia de estados, formato de unidades y umbrales de ocupación |
| Grupo W4 | `frontend/ACCESSIBILITY.md` §5.1, §5.2, §5.5, §5.8, §5.10 | WCAG 2.2 AA, navegación por teclado, formularios, diálogos, pruebas de a11y |
| Grupo W4 | `frontend/FRONTEND-ARCHITECTURE.md` §5.2, §5.3, §5.4, §5.8 | Standalone + signals, estructura de carpetas, flujo de datos, container/presentational |
| Grupo W4 | `frontend/STATE-MANAGEMENT.md` §5.4.1, §5.7 | Datos derivados del backend y prohibición de optimistic update en segmentos |
| Grupo W4 | `frontend/I18N.md` §5.1–§5.5 | Locale `es-AR`, claves `@@`, formatos de números, unidades y plurales |
| W7 | `brand/DESIGN-TOKENS.md` §10.3, §10.4, §11 | Breakpoints `--bp-*`, motion, namespace `--map-*` |
| W6 | `ux/SCREENS.md`, `ux/MAP-UX.md` | Comportamiento esperado de las pantallas que compone estos componentes |
| W8 | `qa/QA-STRATEGY.md`, `qa/ACCEPTANCE-CRITERIA.md` | Dónde se vuelca la evidencia de accesibilidad y regresión visual |
| Código | `cargoops-frontend/package.json`, `angular.json`, `.github/workflows/ci.yml`, `src/app/app.config.ts` | Estado real del tooling y provider de locale |

## 5. Decisiones

### 5.1 Arquitectura y addons

- **Storybook para Angular standalone**, instalado en el repositorio `cargoops-frontend` (no en un paquete independiente): comparte `tsconfig`, `package.json`, tokens SCSS y providers de la aplicación. Justificación: los componentes son standalone y no dependen de `NgModule`, y la configuración de `appConfig` (incluido `LOCALE_ID: 'es-AR'`) debe ser idéntica a la de producción para que `$localize` resuelva igual (I18N.md §5.1).
- **Configuración en `.storybook/`** en la raíz del repositorio, con `main.ts` (frameworks, addons, `staticDirs`) y `preview.ts` (parameters globales, decorators globales, orden de decorators).
- **Addons obligatorios**:
  - `@storybook/addon-essentials` (docs, controls, actions, backgrounds, viewport, interactions, toolbars, measure, highlight) como base única.
  - `@storybook/addon-a11y` para la auditoría axe-core por story, alineada con `ACCESSIBILITY.md` §5.10.
  - `@storybook/addon-interactions` y `@storybook/test` para ejecutar las pruebas de interacción desde el panel de la story y reutilizar `play` en el runner.
  - `@storybook/addon-docs` con `autodocs` para generar la página de API de cada componente desde los decoradores.
  - `@storybook/blocks` y `@storybook/addon-themes` solo si se requiere un tema alterno; el tema por defecto es el de la marca (DESIGN-TOKENS).
- **Addons no adoptados en v1**: gestión de estado (ngrx), manager de tema visual propio, addon de internacionalización runtime (el conmutador de idioma está fuera de v1 por OQ-034). Se documentan como no adoptados para evitar que se agreguen por inercia.
- **No hay una segunda instancia de Storybook para `docs`**: se agrega la story al repositorio del frontend, y el documento canónico sigue siendo `COMPONENTS.md` (R-01, sin duplicar fuente de verdad).

### 5.2 Estructura de carpetas y ubicación de los archivos

- Configuración en `.storybook/`; stories **co-locadas** con el componente, no en una carpeta central `stories/`. Co-locación elimina la distancia entre el componente y su documentación y hace que un PR que cambia el contrato de `args` incluya su story.
- Convenciones de nombre de archivo (kebab-case, alineadas a la estructura real `src/app/`):

```
src/app/
├── features/
│   ├── cargas/
│   │   └── components/
│   │       ├── cargo-table/
│   │       │   ├── cargo-table.ts
│   │       │   ├── cargo-table.html
│   │       │   ├── cargo-table.scss
│   │       │   ├── cargo-table.stories.ts      ← story
│   │       │   └── cargo-table.spec.ts         ← pruebas unitarias
│   │       └── distribution-panel/
│   │           ├── distribution-panel.ts
│   │           ├── distribution-panel.stories.ts
│   │           └── distribution-panel.spec.ts
│   └── locations/
│       └── components/
│           ├── capacity-indicator/
│           │   ├── capacity-indicator.ts
│           │   ├── capacity-indicator.stories.ts
│           │   └── capacity-indicator.spec.ts
│           └── ...
├── shared/          # componentes reutilizables (ConfirmDialog, ObservationDialog, EmptyState, ...)
├── ui/              # primitivas del design system (DESIGN-SYSTEM §5.2)
├── layouts/         # shells: app-shell, auth-layout
└── pages/           # login, dashboard, not-found, forbidden
.storybook/
├── main.ts
├── preview.ts
├── preview-head.html        # <html lang="es-AR"> y styles globales
└── testing/                 # handlers MSW compartidos y utilidades de render
```

- Un story **no** declara un story en otro archivo: cada `*.stories.ts` contiene exclusivamente las stories de su componente. Las stories de una página viven junto a la página, con prefijo de página (`CargaListPage`) y se marcan `parameters: { page: true }` para excluirlas de la regresión visual.
- La carpeta `.storybook/testing/` es la única ubicación de datos compartidos, factories y handlers de red; no se puede distribuir código de aplicación fuera de `src/app/` (R-07, dirección de dependencias de FRONTEND-ARCHITECTURE §5.3).

### 5.3 Naming

- **Nombre del componente** en el story: igual a la clase (`CargoTable`), sin sufijo `Component` (COMPONENTS.md R1: nombres y contratos en inglés).
- **Export del story**: `export const Default: Story = { ... }` con `Meta<typeof CargoTable>` y `StoryObj<typeof CargoTable>`, tipado estricto sin `any` (MASTER-SPEC §15).
- **Formato de `export const`**: PascalCase; el nombre de la story es un sustantivo o adverbio breve en inglés, sin numeración ni sufijos de versión:

| Patrón | Uso | Ejemplo |
| --- | --- | --- |
| `Default` | Variante por defecto, la story de referencia del componente | `Default` |
| `Loading` / `Empty` / `Error` | Estados obligatorios de datos (R-05) | `Empty` |
| `WithSelection` | Variante con datos de entrada no triviales | `WithSelection` |
| `Mobile` / `Tablet` | Variante de viewport cuando el layout cambia estructuralmente | `Mobile` |
| `Disabled` / `Readonly` | Estados de control | `Disabled` |

- **Nombres de args**: exactamente los nombres de input de `COMPONENTS.md` §6 (`cargos`, `isLoading`, `totalItems`, `segments`, `inTruckAmount`, `permissions`, …). Prohibido renombrar un arg para "simplificar" la story: si el contrato cambia, cambian ambas (R-04).
- **Título de la story en la sidebar**: usa el `title` por defecto derivado de la ruta, con el prefijo `App/`, y el nombre del feature como primer segmento (`App/Cargas/CargoTable`). Esto replica la organización de `features/` sin inventar una taxonomía paralela.
- Las stories de página llevan el nombre de la ruta (`CargaListPage`, `LocationDetailPage`, `DashboardPage`) para que la correspondencia con `ROUTING.md` sea inmediata.
- Nomenclatura en inglés en identificadores, nombres de story y `play`; los textos visibles que la story renderiza provienen de i18n del componente (R-06).

### 5.4 Args y controls

- `args` declara únicamente valores estables. Los datos que cambian de historia a historia van en `args`; los handlers van en `argTypes` con `action`.
- `argTypes` declara `control` explícito para cada input: `text` para `code` y `name`, `select` con las opciones del enum canónico para `status`, `boolean` para flags, `number` para cantidades, `object` para estructuras (`cargo`, `segments`, `occupancy`) y `date` para timestamps.
- Los `select` de enums **no** llevan valores inventados: las opciones son las de MASTER-SPEC §4.3 (`REGISTERED`, `IN_TRUCK`, `PARTIALLY_UNLOADED`, `STORED`, `IN_REVIEW`, `REZAGO`, `SECUESTRO`, `IN_TRANSIT`, `EXITED`, `DELETED` para `CargoStatus`; `ACTIVE`/`EXITED` para `CargoLocationStatus`; `LOW`/`MEDIUM`/`HIGH`/`CRITICAL` para `AlertSeverity`). Un story no puede renderizar un valor que el backend no emite.
- `parameters` por story, no en el componente: `layout`, `viewport`, `docs.description.story`, `a11y`, `chromatic`/equivalente cuando exista, `controls.disable` para stories de solo lectura.
- Objetos complejos (`cargo`, `occupancy`, `segments`): se editan con `control: { type: 'object' }` sobre el objeto completo, y cada subcampo se agrupa por categoría con `table.category` en su `argTypes`. **Decisión del estándar**: la edición campo por campo de un objeto anidado se documenta en la página `docs` del componente, no en el panel de controls, para mantener el panel usable.
- **Regla de dominio**: cuando un input es un valor derivado del backend (`occupiedCapacity`, `inTruckAmount`, `percentage`, `permanenceDays`), la story no permite calcularlo: recibe el valor ya resuelto y el `description` de la página de docs lo marca como derivado (BR-033, BR-042, BR-049).
- Ejemplo de contrato de args de referencia:

```typescript
// capacity-indicator.stories.ts
import type { Meta, StoryObj } from '@storybook/angular';

const meta: Meta<CapacityIndicator> = {
  title: 'App/Cargas/CapacityIndicator',
  component: CapacityIndicator,
  tags: ['autodocs'],
  argTypes: {
    capacityUnit: {
      control: { type: 'select' },
      options: ['UNITS', 'PALLETS', 'TONS', 'CUBIC_METERS', 'AREA', 'PERCENT'], // MASTER-SPEC §4.3
    },
    used: { control: { type: 'number' } },
    capacity: { control: { type: 'number' } },
  },
  args: {
    // Sector 4: 100 m² configurados, 80 m² ocupados (MASTER-SPEC §5)
    used: 80,
    capacity: 100,
    capacityUnit: 'AREA',
    showLabel: true,
    compact: false,
  },
};
export default meta;

type Story = StoryObj<typeof CapacityIndicator>;
```

### 5.5 Decorators

- Los decorators se registran en `.storybook/preview.ts` con `preview.decorators` en **un solo lugar**, en este orden: (1) providers de la aplicación, (2) i18n/locale, (3) tema y tokens, (4) fixtures de datos, (5) indicadores de desarrollo. Storybook aplica los decorators en orden inverso al de registro, por lo que el primer decorator del array es el más externo del árbol de inyección: el orden de arriba es el orden de anidamiento real.
- **Providers**: la story usa `applicationConfig` de `src/app/app.config.ts` para heredar `provideRouter`, `provideHttpClient(withInterceptors([...]))`, `LOCALE_ID: 'es-AR'` y el service worker deshabilitado. Se sobreescribe el service worker con `enabled: false` y `provideHttpClient` se conserva para que los interceptores no rompan (**decisión del estándar**: importar `appConfig` en vez de re-declarar providers evita que Storybook se desvíe de producción).
- **Stores**: los stores de signals son singletons globales. Cada story que dependa de un store recibe una instancia fresca por story mediante un provider de test (`provideState` equivalente o un provider que cree un store nuevo por story). Prohibido mutar el store global compartido entre stories (R-07).
- **Servicios HTTP**: no se usa backend real. Los datos entran por `args`; cuando un componente contenedor necesita un servicio, se sustituye por un fake declarado en `.storybook/testing/` con el mismo contrato público.
- **Locale**: `LOCALE_ID` es `es-AR` y `preview-head.html` fuerza `<html lang="es-AR">` para que las reglas de `ACCESSIBILITY.md` §5.6 (idioma de página) se verifiquen igual que en producción.
- **Tokens**: `preview.ts` importa `src/styles/tokens.scss` (o la hoja de estilos global) para que la story use los mismos tokens que la aplicación; queda prohibido definir colores o espaciados hardcodeados en una story (DESIGN-SYSTEM §5.1).

```typescript
// .storybook/preview.ts — ilustrativo: forma del registro, no implementación final
import { applicationConfig } from '../src/app/app.config';
import { esAR } from './testing/locales';

export const decorators = [
  withApplicationProviders(applicationConfig.providers),
  withLocale(esAR),
  withBrandTokens(),
];
```

> La forma concreta de aplicar `ApplicationConfig.providers` sobre el árbol de la story (spread directo de los providers o envoltura con `bootstrapApplication` parcial) depende de la versión de Angular y de Storybook que se instale. Se resuelve en la implementación y queda registrada en §9 como pendiente de tooling, no de contrato.

### 5.6 Datos de ejemplo (fixtures y mocks)

- Los datos por defecto salen de **MASTER-SPEC §5**, que es la fuente de verdad de los datos de referencia:
  - Cargas: `029TERRA26`, `032TERRA26`, `050TERRA26` (Sector 4), `054TERRA26` (Sector 5), `052TERRA26`, `037TERRA26` (Sector 3), `036TERRA26` (Plazoleta).
  - Distribución de `029TERRA26`: Sector 3 20 m² `ACTIVE` + Sector 4 35 m² `ACTIVE`, total 55 m².
  - Ocupación de Sector 4: capacidad 100 m², ocupada 80 m², disponible 20 m² (35 + 25 + 20).
  - Movimiento parcial de ejemplo: 20 m² de Sector 3 → Sector 5.
  - Descarga parcial de ejemplo: `036TERRA26` con 40 % en camión y 60 % en Sector 4.
- Los datos viven en factories puras en `.storybook/testing/`: `cargo.fixtures.ts`, `location.fixtures.ts`, `segment.fixtures.ts`, `movement.fixtures.ts`, `alert.fixtures.ts`. Cada factory expone un caso base y variantes nombradas (`storedCargo`, `partiallyUnloadedCargo`, `staleCargo`, `sector4At80Percent`, `activeAndExitedSegments`). Las factories no comparten estado mutable entre stories: devuelven objetos nuevos en cada llamada.
- Los valores de `entryDate` y `movedAt` son fechas ISO 8601 UTC fijas (`2026-09-20T08:00:00Z`, `2026-09-23T09:20:00Z`) para que la regresión visual sea determinista; el story de permanencia > 30 días usa `2026-08-01T09:00:00Z` como base de `029TERRA26` (API.md §5.1). **Decisión del estándar**: nada de `new Date()` dentro de una story, porque vuelve el snapshot no reproducible.
- Los handlers HTTP (si el componente pide datos a un servicio en lugar de recibirlos por `args`) se declaran en `.storybook/testing/` con MSW sobre `HttpClient` (`provideHttpClient(withInterceptors([...]))` más `provideHttpClientTesting`), con un handler por endpoint de `API.md` y respuestas que respetan el envelope `{ data }` / `{ error }` (API-CONVENTIONS §4.2/§4.3). El caso de error por defecto de cada handler devuelve un envelope de error realista con `code`, `message` y `requestId`.
- Los `permissions` de las stories se declaran como el conjunto real de códigos (`cargo.create`, `cargo.move`, `cargo.export_pdf`, `location.manage`, `users.manage`, `audit.read`, …) en los tres perfiles de rol: `viewerPermissions`, `operatorPermissions`, `adminPermissions`. La story de permisos insuficientes usa el perfil `VIEWER` (BR-010).
- **Prohibido** inventar métricas de negocio en los datos de ejemplo (cantidades que no cierren con el total, porcentajes inconsistentes, ubicaciones inexistentes). Si una story necesita un caso límite, ese caso se declara explícitamente con su BR en el `description` de la story.

### 5.7 Matriz de estados por componente

- Cada componente con datos declara cuatro stories base: `Default` (normal), `Loading`, `Empty` y `Error` (DESIGN-SYSTEM §5.3, COMPONENTS.md R4). Los estados específicos del dominio se agregan como stories adicionales.
- `Loading` se representa con `isLoading: true` y los datos mínimos, no con un componente de carga: la story debe poder activarse y desactivarse con un control.
- `Error` se representa con `errorMessage` (o `error` con `requestId`), nunca con una cadena de excepción.
- Matriz obligatoria de estados, un conjunto por componente del catálogo canónico:

| # | Componente (COMPONENTS.md) | Estados obligatorios en stories | Estados de dominio adicionales | Regla visible |
| --- | --- | --- | --- | --- |
| 1 | `CargoTable` | `Default`, `Loading`, `Empty`, `Error` | `WithSelection`, `SortedByEntryDate`, `Alert` | `aria-sort` en columna ordenada; `aria-live="polite"` al cambiar de página |
| 2 | `CargoStatusBadge` | `Default` | `SizeSm`, `IconOnly` | Un estado por valor de `CargoStatus`; color nunca único canal |
| 3 | `CargoDetail` | `Default`, `Loading`, `Error` | `SoftDeleted`, `WithoutTruck` | Pairs label/valor en `<dl>`; sección de distribución con estados propios |
| 4 | `CargoSearch` | `Default`, `Disabled` | `WithValue`, `NormalizationError` | Debounce de 300 ms; `queryChange` tras normalizar |
| 5 | `CargoFilters` | `Default`, `Collapsed` | `WithActiveChips`, `WithoutResults` | `fieldset`/`legend` por grupo; chips removibles con `aria-label` |
| 6 | `OperationalMap` | `Default`, `Loading`, `Empty`, `Error` | `WithSelection`, `NonInteractive` | Alternativa accesible por listado; el mapa no es la única vía |
| 7 | `MapLocation` | `Default`, `Selected` | `Hovered`, `Inactive`, `OverCapacity`, `Disabled` | Patrón + ícono + label, nunca solo color |
| 8 | `MapToolbar` | `Default` | `ZoomLimits`, `LegendOpen`, `AccessibleListOpen` | `aria-pressed` en toggles; target ≥ 24 px |
| 9 | `MapLegend` | `Default`, `Collapsed` | — | Lista semántica; cada ítem con muestra visual + label |
| 10 | `LocationCard` | `Default`, `Loading`, `Empty`, `Error` | `Selected`, `WithOverOccupied` | Cantidad + unidad legible en cada carga del segmento |
| 11 | `MovementTimeline` | `Default`, `Loading`, `Empty`, `Error` | `WithRevert`, `WithPermissionsForRevert` | `<ol>` con fechas es-AR; reversión marcada |
| 12 | `CapacityIndicator` | `Default`, `Loading`, `Error` | `Normal`, `Warning70to90`, `DangerOver90`, `Unlimited`, `OverOccupied`, `Compact` | `role="meter"` con `aria-valuetext`; umbrales 70 % y 90 % |
| 13 | `AlertCard` | `Default`, `Loading`, `Error` | `BySeverity` (LOW/MEDIUM/HIGH/CRITICAL), `ByStatus` (OPEN/ACKNOWLEDGED/RESOLVED/DISMISSED) | Acciones según `AlertStatus` y permisos; mover a Rezago es decisión humana |
| 14 | `ConfirmDialog` | `Default` | `ToneDanger`, `Loading`, `WithError` | Foco inicial en Cancelar cuando el tono es `danger`; Esc cancela |
| 15 | `ObservationDialog` | `Default`, `ValidationError` | `Submitting`, `BackendError` | Foco inicial en el textarea; contador de caracteres anunciado |
| 16 | `PdfExportButton` | `Default`, `Disabled` | `Loading`, `WithoutPermission`, `WithError` | Label textual "Exportar PDF"; resultado anunciado |
| 17 | `DistributionPanel` | `Default` (`mode='cargo'`), `Loading`, `Empty`, `Error` | `ModeLocation`, `WithInTruckResidual`, `WithoutTotalDeclared`, `WithExitedSegment` | Fila "En camión" solo si hay total declarado y residual > 0; nunca suma unidades incompatibles |
| 18 | `LocationOccupancyCard` | `Default`, `Loading`, `Error` | `Unlimited`, `OverOccupied`, `WithoutData` | `role="meter"` con `aria-valuetext`; patrón de franjas en sobreocupación |

- Para los 11 componentes propuestos (`PageHeader`, `Breadcrumbs`, `EmptyState`, `ErrorState`, `LoadingIndicator`, `PaginationBar`, `StatusFilterDropdown`, `PermanenceBadge`, `ToastHost`, `CapacityUnitBadge`, `FormField`) la matriz mínima es: `Default` más los estados que la columna "Estados de dominio adicionales" de `COMPONENTS.md` §7 describa. Las primitivas sin datos (`Breadcrumbs`, `MapLegend`, `StatusFilterDropdown`, `PermanenceBadge`, `CapacityUnitBadge`) quedan justificadas como excepción a R-05.
- Cada story de la matriz incluye su `docs.description.story` con la regla que representa y el identificador BR cuando aplica, de modo que la evidencia de auditoría sea legible desde el propio catálogo.

### 5.8 Pruebas asociadas a las stories

- Cada story es un caso de prueba ejecutable: el `play` function se ejecuta con `@storybook/test` (`expect`, `userEvent`, `within`) y corre en el pipeline. Tipos de prueba por categoría:
  - **Render**: la story monta sin excepción y el texto clave está presente (`within(canvas).getByText`).
  - **Interacción**: se dispara el output y se verifica el efecto (por ejemplo, `CargoSearch` emite `queryChange` tras el debounce; `CargoFilters` emite `clearAll` al quitar el último chip).
  - **Accesibilidad**: las stories de diálogo verifican foco inicial, `Esc` y retorno de foco (ACCESSIBILITY §5.8); las de datos verifican el texto alternativo accesible (por ejemplo, `CapacityIndicator` con `aria-valuetext`).
  - **Estado**: la story de `Error` verifica que el mensaje y el `requestId` se muestran; la de `Empty` verifica que la acción sugerida está presente (SCREENS D-SC-04).
- Las stories no ejecutan llamadas reales: usan `args` y `play`, sin red.
- Las pruebas unitarias del componente (`*.spec.ts`, Vitest vía `@angular/build:unit-test`) siguen siendo obligatorias para lógica propia del componente (Cálculos derivados simples, transformaciones de labels). Storybook cubre la superficie visual e interactiva; el spec cubre la lógica (R-09). Ambos archivos conviven en el mismo directorio del componente.
- El comando de ejecución es independiente del build de la aplicación: `storybook test --maxWorkers=2` (o el runner equivalente) en el job de pruebas, sin publicar un Storybook estático en `main` (R-10).

### 5.9 Accesibilidad

- `@storybook/addon-a11y` ejecuta axe-core sobre la story montada; el panel muestra violaciones por regla WCAG. El resultado se vuelca como evidencia en W8 (ACCESSIBILITY CA-1).
- Criterios que cada story debe cumplir, derivados de `ACCESSIBILITY.md`:
  - Navegación por teclado completa: `Tab` recorre los controles, `Esc` cierra diálogos, foco visible siempre (token `--color-focus-ring`) y nunca `outline: none` sin reemplazo.
  - Ningún estado se comunica solo con color: badge, indicador de ocupación y estados del mapa llevan label + ícono/patrón (DESIGN-SYSTEM §5.1 regla 4).
  - Formularios: label visible (nunca placeholder como único label), hint y error conectados con `aria-describedby`, contador de caracteres en `ObservationDialog` anunciado.
  - Diálogos: `role="dialog"`, `aria-modal="true"`, foco atrapado, foco inicial según el tono, retorno de foco al invocador.
  - Tabla: `<table>` con `caption`, `th scope="col"`, `aria-sort` en la columna ordenada y `aria-live="polite"` en cambios de página.
  - Medidor de ocupación: `role="meter"` con `aria-valuenow/min/max` y `aria-valuetext` con la unidad legible ("80 de 100 m² · disponibles 20 m²").
  - En la story del mapa, la alternativa accesible (listado por ubicación) está montada y es operable por teclado; la story falla si el mapa queda como única vía (COMPONENTS CA-4).
- Los viewports de prueba incluyen el zoom 200 % y el reflow a 320 px exigidos por el checklist manual de ACCESSIBILITY §5.10, verificables sobre la story interactiva.

### 5.10 Responsive

- Viewports Storybook alineados con los breakpoints de `DESIGN-TOKENS.md` §10.3, como configuración global:

| Viewport Storybook | Ancho | Token | Uso en CargoOps |
| --- | --- | --- | --- |
| `MobileSmall` | 375 px | por debajo de `--bp-xs` (480 px) | Móvil pequeño; sidebar en drawer, mapa en panel inferior |
| `Mobile` | 414 px | por debajo de `--bp-xs` (480 px) | Móvil estándar; ancho de referencia del formulario de movimiento |
| `Tablet` | 768 px | `--bp-md` (768 px) | Punto de corte del mapa; tablas pasan a cards apiladas |
| `Laptop` | 1280 px | `--bp-xl` (1280 px) | Escritorio amplio; diseño base (DESIGN-SYSTEM §5.8 desktop-first) |
| `Desktop` | 1536 px | `--bp-2xl` (1536 px) | Pantallas grandes |

- Reglas de layout por viewport:
  - `CargoTable` y `ui/table` refluyen a cards apiladas por debajo de `--bp-md`; no se clona la versión desktop (DESIGN-SYSTEM §5.2, MASTER-SPEC §12).
  - `OperationalMap` pasa a drawer o panel inferior por debajo de `--bp-md`; la story `Mobile` monta el drawer con el listado accesible.
  - `MapToolbar` reduce labels a íconos en pantallas pequeñas manteniendo target ≥ 24 px.
  - `DistributionPanel` mantiene la fila "En camión" visible también en móvil: es información de negocio, no decoración.
- Los componentes con cambio estructural de layout declaran una story específica de viewport (`Mobile`, `Tablet`) además de ser verificables con el addon de viewport; el resto se cubre con la configuración global sin duplicar stories.
- La regresión visual usa el viewport de referencia `Laptop` salvo que el componente tenga story de viewport propia (§5.11).

### 5.11 Regresión visual

- Alcance obligatorio: los 18 componentes canónicos. Alcance recomendado: los 11 propuestos. Las stories de página quedan excluidas del baseline salvo que el equipo lo decida (R-08).
- Baseline por componente: una captura por story y por viewport de referencia. No se mantiene un baseline por combinación completa salvo para los 4 componentes con layout responsive estructural (`CargoTable`, `OperationalMap`, `MapToolbar`, `DistributionPanel`), que tienen dos baselines (`Laptop` y `Mobile`).
- Umbral de diferencia por defecto: 0.2 % de píxeles por captura (**decisión del estándar**: umbral bajo para detectar regresiones de color y de spacing sin generar ruido por renderizado de fuentes).
- Proceso: (1) se ejecuta la suite; (2) se sube el resultado; (3) el PR se bloquea si hay diferencia por encima del umbral; (4) una diferencia intencional se acepta revisando el diff y se regenera el baseline en el mismo PR, con la razón en la descripción.
- La regresión visual no reemplaza la revisión de accesibilidad: un cambio de color que no rompe el contraste puede romper la auditoría axe, y ambos controles son obligatorios por separado.
- La suite se ejecuta en el CI del frontend junto a `lint`, `format:check`, `build` y `test`; el resultado se publica como artefacto para revisión (`.github/workflows/ci.yml` del repositorio frontend).

### 5.12 Casos especiales de CargoOps

- **Distribución M:N y residual "En camión"**: la story de `DistributionPanel` en modo `cargo` muestra los segmentos de `029TERRA26` (Sector 3 20 m², Sector 4 35 m²) y la fila residual "En camión" cuando `totalQuantity` está definido y el residual es mayor que cero. La story `WithoutTotalDeclared` monta `totalQuantity: null` y `inTruckAmount: null` y verifica que la fila residual no aparece; la acción de declarar el total sí aparece, porque el backend responde `CARGO_TOTAL_REQUIRED` (BR-042).
- **Unidades**: la story de `CapacityIndicator` por defecto usa `AREA` (Sector 4 → m² por defecto, BR-041) y existe una story con override de unidad (`PALLETS`) para verificar el label de unidad efectiva; la story `MixedUnits` documenta que el componente **no** consolida occupancy entre unidades incompatibles (BR-035).
- **Estados de ocupación**: las stories `Warning70to90` (80 %) y `DangerOver90` (95 %) fijan los umbrales canónicos, y `OverOccupied` muestra el patrón de franjas administrativo (BR-036 ampliada, OQ-043).
- **Alertas de rezago**: la story de `AlertCard` con `STALE_30D` y `permanenceDays: 53` verifica el badge de permanencia y que la acción "mover a Rezago" es una decisión humana con observación, nunca automática (BR-014).
- **Permisos**: la story de permisos insuficientes usa el perfil `VIEWER`; el botón de mover/exportar/eliminar aparece deshabilitado, no oculto, para que el estado sea visible y auditable (BR-010).
- **Sin optimistic update**: las stories de `DistributionPanel` y de los diálogos de movimiento no simulan un estado optimista previo a la respuesta; el componente solo muestra confirmación cuando el backend responde 2xx (STATE-MANAGEMENT §5.7, BR-008).
- **Mapa estático**: `OperationalMap` no tiene story de edición ni drag and drop; el mapa es vista estática en v1 (OQ-015) y `MapToolbar` no expone herramientas de edición.
- **Polling**: las stories de `CargoDetail` y del mapa no arrancan timers de polling; el refresco de 30 s es responsabilidad del contenedor de página, no del componente presentacional (OQ-036).

### 5.13 Reglas de mantenimiento

- **Toda story nueva** requiere: componente covered por el catálogo de `COMPONENTS.md`, `args` con datos de MASTER-SPEC §5 o del dominio real, la matriz de estados de §5.7 para el componente, y `docs.description.story` explicando qué caso representa.
- **Toda story modificada** que cambie un `arg` exige revisar el `argTypes` y el `*.spec.ts` del componente, porque los tres son el mismo contrato desde tres ángulos.
- **Prohibido** en una story: llamadas HTTP reales, acceso a `localStorage`, uso de `window.alert`/`confirm`, uso de `Date.now()` o `new Date()` sin fecha fija, estilos inline que no provengan de los tokens, y valores de enum no canónicos (MASTER-SPEC §4.3).
- **Prohibido** duplicar en Storybook la documentación que ya existe en `COMPONENTS.md`: la story muestra, el documento explica. La descripción larga de un componente vive en `COMPONENTS.md` §6; en la story se enlaza.
- Cuando `COMPONENTS.md` cambia el contrato de un componente, sus stories se actualizan en el mismo PR; una story desalineada con el contrato es un defecto, igual que un DTO desalineado con `API.md` (OPENAPI.md §5.12).
- Storybook se ejecuta en modo smoke en cada PR (levanta, renderiza la story de referencia de cada story file) y completo en el pipeline de `main`.
- Cuando la librería o la versión de Angular cambie, se actualizan Storybook y sus addons en un PR dedicado, no mezclado con cambios de componentes, para que el diff de baselines sea atribuible a la librería.
- Storybook se documenta en el README del repositorio frontend con los comandos: `storybook` (desarrollo), `build-storybook` (estático), `test` (pruebas de interacción) y el rol de cada uno en el pipeline.

## 6. Criterios de aceptación

1. Existe `.storybook/` con `main.ts` y `preview.ts`, y los addons obligatorios (§5.1) están instalados y habilitados.
2. Cada componente del catálogo canónico de `COMPONENTS.md` §5.1 tiene un archivo `*.stories.ts` co-locado con el componente, con `autodocs`.
3. La matriz de estados de §5.7 está cubierta: las stories `Default`, `Loading`, `Empty` y `Error` existen en todo componente con datos, con los estados de dominio adicionales de la tabla.
4. Ningún `arg` usa un valor de enum ajeno a MASTER-SPEC §4.3, y todos los datos de ejemplo provienen de MASTER-SPEC §5.
5. La locale de las stories es `es-AR` y `<html lang="es-AR">` está presente; ningún texto visible está hardcodeado en el archivo de story.
6. Las stories no realizan llamadas de red ni leen `localStorage`; los datos entran por `args` y las dependencias se inyectan con decorator.
7. Los cinco viewports de §5.10 están configurados y los cuatro componentes con layout responsive estructural tienen story de viewport.
8. `storybook test` ejecuta las pruebas de interacción y de accesibilidad definidas en las stories y falla ante una regresión.
9. El panel de a11y no reporta errores en ninguna story; las historias de diálogo verifican foco inicial, `Esc` y retorno de foco.
10. La regresión visual tiene baseline para los 18 componentes canónicos y el umbral es 0.2 % de píxeles.
11. El pipeline del frontend ejecuta las stories sin bloquear la rama hasta que la herramienta de regresión visual esté decidida; a partir de esa decisión, el paso queda bloqueante (R-10, §9).
12. Las stories de `DistributionPanel` cubren el caso `WithoutTotalDeclared` y no muestran la fila residual cuando el total no está declarado (BR-042).

## 7. Archivos involucrados

| Ruta | Rol |
| --- | --- |
| `docs/frontend/STORYBOOK.md` | Este documento |
| `docs/frontend/COMPONENTS.md` | Catálogo de componentes, contratos de `args` y estados visuales (§5, §6, §7) |
| `docs/frontend/DESIGN-SYSTEM.md` | Primitivas `ui/`, secuencia de estados, umbrales de ocupación, formato de unidades |
| `docs/frontend/ACCESSIBILITY.md` | Criterios WCAG 2.2 AA, ARIA por componente, pruebas de a11y en CI |
| `docs/frontend/FRONTEND-ARCHITECTURE.md` §5.2, §5.3, §5.8 | Standalone + signals, estructura de carpetas, container/presentational |
| `docs/frontend/STATE-MANAGEMENT.md` §5.4.1, §5.7 | Datos derivados del backend, prohibición de optimistic update |
| `docs/frontend/I18N.md` | Locale es-AR, claves `@@`, formatos de números y unidades |
| `docs/frontend/ROUTING.md` | Nombres de stories de página y rutas correspondientes |
| `docs/brand/DESIGN-TOKENS.md` §10.3, §10.4, §11 | Breakpoints, motion, namespace `--map-*` |
| `docs/ux/SCREENS.md`, `docs/ux/MAP-UX.md` | Comportamiento de pantallas y del mapa que las stories replican |
| `docs/qa/QA-STRATEGY.md`, `docs/qa/ACCEPTANCE-CRITERIA.md` | Destino de la evidencia de a11y y regresión visual |
| `docs/MASTER-SPEC.md` §4.3, §5, §11.4 | Enums, seeds, catálogo canónico |
| `cargoops-frontend/.storybook/` | Configuración `main.ts`, `preview.ts`, `preview-head.html`, `testing/` |
| `cargoops-frontend/src/app/**/**.stories.ts` | Stories co-locadas |
| `cargoops-frontend/src/app/app.config.ts` | Providers de la aplicación heredados por las stories (`LOCALE_ID: 'es-AR'`) |
| `cargoops-frontend/.github/workflows/ci.yml` | Pipeline donde se integra la ejecución de stories |

## 8. Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Storybook se convierte en documentación paralela que contradice `COMPONENTS.md` | R-01 + §5.13: el documento canónico sigue siendo `COMPONENTS.md`; la story muestra, el documento explica |
| Stories que reproducen lógica de negocio y divergen del backend | R-02 + datos derivados recibidos por `args`; prohibido calcular ocupación o residual en la story |
| Regresión visual con ruido por fuentes, animaciones o fechas | Fechas ISO fijas, sin `new Date()`; skeleton sin shimmer (§5.6); tolerancia de fuente documentada en la configuración del runner |
| Crecimiento del tiempo de CI | Smoke en cada PR y suite completa en `main`; alcance de baseline limitado a los 18 canónicos |
| Accesibilidad verificada solo en el panel, no en la app real | La story usa los mismos providers y tokens que producción; la auditoría manual de W8 sigue siendo obligatoria |
| Storybook desactualizado respecto de los componentes | §5.13: story y contrato se actualizan en el mismo PR; el smoke falla si una story no renderiza |
| Baselines que se regeneran en bloque y ocultan regresiones | Regeneración en PR separado y con razón; revisión del diff de baselines en el PR |
| Dependencias del catálogo que no se usan en la app | Cada componente de `COMPONENTS.md` tiene story; los primitivos de `ui/` se documentan desde `DESIGN-SYSTEM` §5.2 |

## 9. DECISIÓN PENDIENTE

| # | Pregunta | Impacto | Referencia |
| --- | --- | --- | --- |
| DP-STORY-01 | ¿Qué herramienta de regresión visual se adopta en v1 y con qué servicio de comparación? | Define el paso bloqueante del pipeline, el almacenamiento de baselines y el costo de la suite | `roadmap/PHASES.md` (P1-T5 CI base, P12-T2 accesibilidad) no nombra herramienta de regresión visual; decisión de tooling |
| DP-STORY-02 | ¿El axe-core de las stories se ejecuta dentro del runner de stories o como paso propio con `@axe-core/playwright` sobre las rutas de la app? | Define si el panel de a11y basta o si se requiere un segundo job que recorra las páginas | `ACCESSIBILITY.md` §5.10 define el escaneo en unit/E2E por página, pero no el runner; decisión de tooling |
| DP-STORY-03 | ¿Cómo se inyectan los `ApplicationConfig.providers` en el árbol de la story con la versión de Angular vigente? | Define la forma exacta del decorator global de providers y si el service worker se deshabilita por story o globalmente | Depende de la versión de Storybook para Angular que se instale; no afecta el contrato de componentes |
