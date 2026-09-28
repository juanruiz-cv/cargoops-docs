# CargoOps — Seguridad (SECURITY.md)

> Grupo W2 · Arquitectura · Fuente de verdad: `docs/MASTER-SPEC.md` §6 (BR), §9 (alerta), §10 (API), §11.2 (stack).
> Estado: borrador FASE 0 (documentación). Define el modelo de seguridad que implementará el grupo W5.

## 1. Objetivo

Definir el modelo de seguridad de CargoOps en todas sus dimensiones: autenticación, autorización (RBAC), protección de API, validación/desinfección de entradas, gestión de secretos, seguridad de generación de PDF y archivos, privacidad, logging seguro y headers de transporte. El principio rector: **el backend es SIEMPRE la capa de autoridad (BR-009)** y la seguridad se diseña por defecto, no como añadido.

## 2. Contexto

CargoOps maneja datos operativos comerciales de un predio aduanero: códigos de carga, ubicaciones, historial, operadores. No almacena datos de tarjetas ni datos biométricos, pero la trazabilidad (BR-008, BR-013) exige que toda acción quede registrada con autor y momento, y el acceso debe estar segmentado por rol (Viewer/Operator/Admin — MASTER-SPEC §8). El sistema es una SPA Angular + API REST NestJS, con trabajos en segundo plano (OQ-007 resuelta: Redis + BullMQ en v1) y exportación de PDF (ADR-013).

## 3. Restricciones

- Autenticación **JWT + refresh tokens** (ADR-008, MASTER-SPEC §11.2). No sesiones server-side clásicas.
- Autorización **RBAC por permisos** (AUTHORIZATION.md) con validación SIEMPRE en backend (BR-009, BR-010, BR-011, BR-012).
- IP/userAgent en auditoría **equilibrados con privacidad** (BR-017); minimización de datos (no almacenar datos sensibles innecesarios).
- Exportación PDF con permisos por rol y sin exponer datos no autorizados (BR-018).
- FASE 0: solo documentación. No se generan claves, secretos ni configs reales.

## 4. Dependencias

- `docs/MASTER-SPEC.md` §6, §8, §10, §11, §14 (QA/DevOps) · `docs/OPEN-QUESTIONS.md` (OQ-006, OQ-007, OQ-010, OQ-011, OQ-032 — todas resueltas en v0.5)
- `architecture/ADR/ADR-008` (Auth), ADR-009 (RBAC), ADR-010 (Audit), ADR-013 (PDF)
- Hermandos W2: `AUTHORIZATION.md`, `AUDIT.md`, `DATABASE.md` (password_hash, audit_logs), `PDF-EXPORT.md`, `ARCHITECTURE.md`
- Downstream: `backend/BACKEND-ARCHITECTURE.md`, `backend/ERROR-HANDLING.md`, `devops/` (secrets, TLS, monitoring)

## 5. Decisiones

### 5.1 Autenticación (JWT + refresh tokens — ADR-008)

**Flujo canónico** (detalle en `backend/API.md`):

1. `POST /api/v1/auth/login` — usuario+contraseña → verifica `users.active` y `deleted_at IS NULL` → emite **access token** (corto) + **refresh token** (largo, rotativo) → `AuditLog LOGIN`.
2. Access token: JWS firmado (HS256 con secreto, o RS256 con par de claves — ver §5.10), **expiración corta recomendada: 15 min** (configurable), claims: `sub` (userId), `username`, `roles[]` (códigos), `permissions[]` (códigos efectivos) — ver AUTHORIZATION.md §5.4, `jti`, `iat/exp/iss/aud`.
3. `POST /api/v1/auth/refresh` — valida refresh token, **rota** (el usado se invalida), emite nuevo par → evita robo/reuso prolongado. El refresh se almacena **hasheado** (SHA-256) en DB (columna en `users` o tabla `refresh_tokens` — ver §8) o en Redis (OQ-007 resuelta: Redis disponible en v1) — permite revocación y detección de reuso.
4. `POST /api/v1/auth/logout` — revoca refresh, `AuditLog LOGOUT`.
5. **Revocación**: una contraseña cambiada o un usuario desactivado (`active=false`) **invalida inmediatamente** los refresh existentes (se borra/verifica la marca); los access token expiran solos a los 15 min (tradeoff aceptado del stateless JWT; mitigable reduciendo TTL).

**Storage de tokens en el cliente (SPA Angular + PWA)** — decisión con recomendación (§8 para confirmar):
- **Recomendado**: access token en memoria (no localStorage: inmune a XSS de persistencia); refresh token en **cookie `httpOnly` + `Secure` + `SameSite=Strict`** (o `Lax` si se requieren enlaces externos) — el JS no lo lee, mitigando XSS.
- Alternativa evaluada: ambos en localStorage con refresh en header — más simple pero expone el refresh a XSS persistente. **No recomendada**.
- Con cookie httpOnly para refresh, el **CSRF** se mitiga con `SameSite=Strict` + verificación de origen; si se usara header Bearer para refresh (sin cookie), CSRF desaparece pero XSS gana superficie — el orquestador confirma (ver §8).

### 5.2 Hashing de contraseñas — **recomendación: Argon2id**

| Algoritmo | Recomendación | Justificación |
| --- | --- | --- |
| **Argon2id** | ✅ **Primario** | Ganador de la Password Hashing Competition (PHC, 2015); resistente a ataques GPU/ASIC por ser **memory-hard**; parámetros configurables `m=19MiB (o más), t=2, p=1` (revisar según hardware de deploy). Implementación en Node: `argon2` (binding nativo) o pura `@node-rs/argon2`. |
| bcrypt | ⚠️ Aceptado (fallback) | Ampliamente soportado, cost 12+; menor resistencia a GPU en masa que Argon2id; sin memoria dura. Aceptable si la dependencia nativa de argon2 es un problema de platforma. |

**Decisiones asociadas**:
- Formato de almacenamiento: string autocontenido con parámetros (`$argon2id$v=19$m=19456,t=2,p=1$...`) en `users.password_hash` (varchar 255 es suficiente).
- **Nunca** loguear el hash ni la contraseña; comparación siempre del lado servidor (`verify` constante-tiempo, provisto por la librería).
- **Política de contraseñas** (longitud mínima, complejidad, expiración, 2FA) — sin definición canónica → **DECISIÓN PENDIENTE** (§8), recomendación base: mínimo 12 caracteres, sin expiración forzada en v1, 2FA (TOTP) como mejora futura.
- Reset de contraseña: flujo con token de un solo uso, expiración corta, enlace enviado por email (requiere canal email — NOTIFICATIONS.md; sin email en v1, OQ-011 resuelta → el ADMIN administra contraseñas).

### 5.3 Autorización (RBAC)

- Modelo completo y matriz en **AUTHORIZATION.md**; resumen: permisos granulares (`{entidad}.{acción}`), roles de semilla (VIEWER/OPERATOR/ADMIN), puente `role_permissions` con excepción `granted=false`.
- **Guards globales** en NestJS: `AuthGuard` (valida JWT y carga usuario activo) + `PermissionsGuard` (valida permisos efectivos contra el requisito del `@RequirePermissions()` del handler). Deny-by-default: **sin anotación de permisos → 403**.
- El frontend aplica guards/directivas de UX para ocultar acciones no permitidas, pero **nunca** como única capa (BR-009): un cliente modificado puede llamar la API directamente.
- `AuditLog PERMISSION_CHANGE` en toda modificación de roles/permisos/asignaciones (BR-012, AUDIT.md §5.2).

### 5.4 Protección de endpoints (API)

- **Rate limiting** por IP y por usuario en endpoints sensibles: login/refresh (anti force-bruteforce), exportaciones, creación de recursos. Valores concretos: **DECISIÓN PENDIENTE** (§8) — recomendación base: login 5 intentos fallidos / 15 min con backoff exponencial; API general 100 req/min por usuario.
- **Lockout / retardo**: tras N intentos fallidos de login, bloqueo temporal + `AuditLog` de intentos fallidos (sin registrar la contraseña).
- `requestId` en cada request (header `X-Request-Id`), propagado a logs y error envelope (MASTER-SPEC §10) — trazabilidad sin exponer internos.
- Idempotencia: **Idempotency-Key en endpoints de escritura** (alta, movimientos, segmentos — OQ-032 resuelta → BR-052): replays devuelven el resultado previo y los clientes usan retries con backoff (los movimientos NO son offline en v1). La unicidad de `code` (BR-002) sigue como red adicional.
- **Paginación limitada**: `limit` máx. 100 (MASTER-SPEC §10) y validado; filtros whitelist por DTO (evita inyección en `sort`/`filter` — se mapea contra allowlist de columnas).

### 5.5 Validación y sanitización de entradas

- **DTOs con `class-validator`** en todos los controllers (whitelist `forbidNonWhitelisted: true`): tipos, longitudes, formato de código (regex canónica — BR-002, OQ-001 resuelta), fechas, enums.
- **Sanitización**: texto de observaciones/reasons (BR-006/007) se normaliza (trim, límite de longitud) y se **escapa en render** (Angular escapa por defecto; nunca `bypassSecurityTrustHtml` con input de usuario).
- **SQL injection**: Prisma parametriza siempre; prohibido concatenar `raw` sin parámetro; `sort`/`filter` vía allowlist.
- **XSS**: la SPA Angular escapa interpolaciones por defecto; CSP estricta (aba jo); inputs de usuario (códigos de carga, observaciones, nombres) tratados como **datos**, nunca como HTML.
- **CSRF**: ver §5.1 — con cookie httpOnly en refresh, `SameSite=Strict` + doble verificación de origen (Origin/Referer) en mutaciones; si no hay cookie (header Bearer), no aplica CSRF y se documenta.
- **DoS básico**: límite de payload (body size), timeouts de request, rate limiting global en el proxy/Edge.

### 5.6 Gestión de secretos y variables de entorno

- **Nunca en el repo**: `.env*` ignorados (salvo `.env.example` con placeholders y sin valores reales).
- Secretos por ambiente (dev/staging/prod) — `devops/ENVIRONMENTS.md`; en producción: **secret manager** (vars de entorno del runtime o servicio dedicado, según infra — OQ-006 resuelta: MinIO self-hosted; ver `devops/ENVIRONMENTS.md`).
- Inventario esperado de secretos: `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` (o par de claves), `DATABASE_URL`, `REDIS_URL` (requerido en v1 — OQ-007 resuelta), credenciales S3 MinIO (OQ-006 resuelta), puerto/servicios de email (futuro).
- **Rotación** de secretos JWT: se soporta por `kid` (múltiples claves válidas con expiración) — la rotación forzada revoca todos los refresh.

### 5.7 Seguridad de PDF y archivos (S3, firmas, permisos)

- La generación de PDF ocurre **siempre en backend** (capa de autoridad; el cliente jamás recibe datos crudos para "armar" el PDF — BR-018). Detalle en PDF-EXPORT.md.
- Los archivos generados se guardan en **S3 compatible** (OQ-006 resuelta: MinIO self-hosted) con: bucket privado, políticas de acceso mínimas, **URLs firmadas con expiración corta** (descarga única o TTL de minutos), nunca archivos estáticos públicos.
- **Permisos al descargar**: se revalidan en el backend al emitir la URL firmada (no confiar solo en el token del navegador contra S3 — S3 no conoce roles de CargoOps).
- Caché de PDFs: contenido puede contener datos de carga → respetar `Cache-Control: private`.
- Sin datos sensibles en *access logs* del servidor (query params con IDs no son sensibles; el cuerpo del PDF no se loguea).

### 5.8 Sesiones, expiración y HTTPS

- Access token: **15 min** (recomendado); refresh: **14 días** (recomendado), rotativo; sesión "inactiva": la expiración del refresh la cierra — sin session timer propio en v1 (decisión UX pendiente si se quiere timeout de inactividad).
- Cambio de contraseña/desactivación → revocación inmediata (ver §5.1).
- **HTTPS obligatorio** en staging/production: TLS 1.2+, HSTS (`Strict-Transport-Security` con `max-age` largo), redirect 301 de HTTP; certificados gestionados en `devops/`.
- **Headers de seguridad** (aplicar en API y SPA): `Content-Security-Policy` (default-src 'self'; scripts sin inline salvo nonce), `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY` (o CSP frame-ancestors), `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` conservadora; `X-XSS-Protection` obsoleto (no usar).

### 5.9 Logging seguro y privacidad

- **Nunca loguear**: contraseñas (ni hashes), tokens JWT, refresh tokens, bodies completos de mutaciones sensibles, config completa de DB.
- Campos de auditoría **minimizados** (BR-017): `ip` y `user_agent` truncados/pseudonimizados según política (ver AUDIT.md §5.6 — decisión pendiente de política); `requestId` en logs de aplicación.
- Logs estructurados (JSON) con niveles (debug/info/warn/error), sin datos personales innecesarios; los datos de carga (códigos) son necesarios operacionalmente y no constituyen información sensible en este dominio.
- **Privacidad**: minimización en recolección (solo datos necesarios para operar: username, email, nombre, acciones); sin PII innecesaria; los datos aduaneros/operativos se tratan como confidenciales del cliente del predio (decir en T&C de producto — fuera de alcance técnico aquí, se anota).

### 5.10 Modelo de firma de tokens — DECISIÓN PENDIENTE

HS256 (secreto compartido simétrico, simple) vs RS256/ES256 (par de claves, permite validar en servicios separados sin compartir secreto, útil para extracción futura de servicios — SCALABILITY.md). Recomendación: **RS256 con par dedicado por ambiente** desde el inicio si hay expectativa real de servicios separados; HS256 si el monolith se mantiene aislado. El orquestador decide (ver §8).

## 6. Criterios de aceptación

- [ ] Todo endpoint mutacional está protegido por AuthGuard + PermissionsGuard (BR-009); deny-by-default verificado por tests de seguridad (QA §14).
- [ ] Login/refresh/logout funcionan con rotación y revocación; contraseñas hasheadas con Argon2id (o bcrypt justificado).
- [ ] Headers de seguridad, HTTPS y CORS whitelist configurados en los tres ambientes.
- [ ] Ningún secreto aparece en logs, errores de API ni repositorios (test automatizado de detección).
- [ ] PDF/archivos: generación server-side, bucket privado, URLs firmadas, revalidación de permisos en descarga (BR-018).
- [ ] Coherencia con AUDIT.md (eventos LOGIN/LOGOUT/PERMISSION_CHANGE), AUTHORIZATION.md y DATABASE.md.

## 7. Archivos involucrados

- `docs/MASTER-SPEC.md` §6, §8, §10, §11, §14 · `docs/OPEN-QUESTIONS.md`
- `architecture/ADR/ADR-008`, ADR-009, ADR-010, ADR-013 (grupo W3)
- Hermandos W2: `AUTHORIZATION.md`, `AUDIT.md`, `DATABASE.md`, `PDF-EXPORT.md`, `ARCHITECTURE.md`
- Downstream: `backend/BACKEND-ARCHITECTURE.md`, `backend/API.md`, `backend/ERROR-HANDLING.md`, `backend/JOBS.md`, `devops/ENVIRONMENTS.md`, `devops/MONITORING.md`, `qa/QA-STRATEGY.md` (security tests)

## 8. Riesgos y decisiones pendientes

| Riesgo | Mitigación |
| --- | --- |
| XSS vía observaciones/códigos de carga | Escape Angular + CSP estricta; nunca usar innerHTML con datos |
| Robo de refresh token | Cookie httpOnly + rotación + revocación; hasheado en DB |
| Stateless JWT sin revocación inmediata | TTL corto + revocación de refresh; desactivación inmediata |
| Rate limiting insuficiente → brute-force login | Lockout + backoff + AuditLog de intentos |
| Credenciales S3/JWT en repos | Escaneo de secretos en CI (devops/CI-CD.md) |

### DECISIÓN PENDIENTE (reportar al orquestador)

Las preguntas con OQ asignada quedaron **resueltas en MASTER-SPEC v0.5 (2026-09-24)**; S1 se resolvió en la implementación de FASE 2 y S2–S4 no tienen OQ asignada y se conservan como residuales locales:

| # | Pregunta concreta | Impacto | Resolución |
| --- | --- | --- | --- |
| S1 | ~~¿Refresh token en cookie httpOnly (recomendado) o header Bearer? Determina estrategia CSRF.~~ | Arquitectura de auth, CSRF | ✅ **RESUELTA (2026-09-25, implementación FASE 2)** — cookie httpOnly + `SameSite=Strict` (§5.1); materializada en API.md §4 / auth module del backend |
| S2 | ¿Firma JWT HS256 o RS256/ES256? | Modelo de claves, extracción futura de servicios | 🔶 Pendiente local — sin OQ asignada; recomendación: RS256 si hay servicios separados, HS256 si monolith aislado (§5.10) |
| S3 | ¿Política de contraseñas (mín. 12 chars recomendado, complejidad, expiración, 2FA)? | UX de login, hash storage | 🔶 Pendiente local — sin OQ asignada; recomendación base: mínimo 12 caracteres, sin expiración forzada en v1, 2FA futura (§5.2) |
| S4 | ¿Valores exactos de rate limiting y lockout? | Operación y seguridad | 🔶 Pendiente local — sin OQ asignada; recomendación base: login 5 intentos/15 min con backoff, API 100 req/min (§5.4) |
| S5 | ~~¿Reset de contraseña sin email: ADMIN gestiona o se difiere hasta canal email (OQ-011)?~~ | Flujo de recuperación | ✅ **RESUELTA (OQ-011)** — sin canal email en v1 (solo in-app): el ADMIN gestiona contraseñas (reset manual); el flujo con token por email se difiere al canal EMAIL (v1.1) |
| S6 | ~~¿Refresh tokens en tabla propia o Redis (depende de OQ-007)?~~ | Revocación, esquema DB | ✅ **RESUELTA (OQ-007)** — Redis + BullMQ en v1: el refresh hasheado puede vivir en Redis con TTL (revocación y detección de reuso); la tabla en DB queda como alternativa sin Redis |