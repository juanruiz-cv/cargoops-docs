# ADR-008 — Authentication

- Estado: Accepted
- Fecha: 2026-09-23
- Decisores: Equipo CargoOps / Software Architect

## Contexto

CargoOps es una aplicación corporativa de acceso restringido: usuarios internos del predio logístico con roles definidos (ADR-009) y operación en red del establecimiento (intranet/red local con acceso controlado). La autenticación debe proteger operaciones críticas (crear/mover cargas, reversiones, auditoría) y registrar login/logout en el audit log (`AuditAction.LOGIN/LOGOUT`, MASTER-SPEC §4.3). MASTER-SPEC §11.2 fija el esquema: **JWT + Refresh Token**. El modelo de dominio ya incluye `User { id, username, email, passwordHash, active, lastLoginAt, ... }`.

## Decisión

Adoptar **JWT (access token) + Refresh Token rotativo** como mecanismo de autenticación v1 (MASTER-SPEC §11.2):

- **Access token (JWT)**: corta vida (15 minutos), firmado HS256/RS256 (clave secreta de app en secreto gestionado; RS256 si se quiere rotación de claves sin invalidar todos los tokens), claims mínimos: `sub` (userId), `roles`/`permissions` snapshot (para guards RBAC sin round-trip a DB — ADR-009), `jti` y `iat/exp`. El frontend lo guarda **en memoria** (nunca en localStorage) y lo adjunta como `Authorization: Bearer`.
- **Refresh token**: de larga vida (acorde a política: 7 días con rotación), **opaco y random** (no-JWT, sin claims), almacenado **en base de datos** (tabla con hash del token, `userId`, `expiresAt`, `revokedAt`) para permitir **revocación real** y **rotación en cada refresh** (el refresh viejo muere; detección de reuso → revocación de la sesión completa). Se entrega en **cookie HttpOnly, Secure, SameSite=Strict** (mitiga XSS y CSRF; la cookie no es leíble por JS).
- **Endpoints canónicos**: `POST /api/v1/auth/login` (username/email + password → access + refresh), `POST /api/v1/auth/refresh` (rota refresh, emite nuevo access y refresh), `POST /api/v1/auth/logout` (revoca refresh; audit LOGOUT — MASTER-SPEC §10, §4.3).
- **Hash de contraseñas**: Argon2id (recomendado) o bcrypt (cost ≥ 12) — decisión operativa con ambos aceptables; `passwordHash` nunca viaja fuera del backend.
- **Protecciones** (MASTER-SPEC §14, seguridad): rate limiting en login/refresh (anti fuerza bruta), lockout progresivo por usuario, validación de `active` en cada request (usuarios desactivados pierden acceso al expirar access o en el próximo refresh), `lastLoginAt` actualizado en login, y revocación global de refresh por usuario (Admin puede invalidar sesiones — vinculado a gestión de usuarios en ADR-009).
- **Stateless con escapes controlados**: el access token es stateless (perfila los guards), la revocación fina se resuelve vía refresh en DB y vía `active=false`; no se exige blacklist de access en v1 (ventana de 15 min aceptable para el predio; se documenta como mitigación si un rol de riesgo lo exige).
- **Mejoras futuras** (se diseñan, no se implementan — MASTER-SPEC §1.5): MFA/TOTP, WebAuthn/passkeys, SSO corporativo vía OAuth 2.0 / OpenID Connect (usando el mismo refresh) y expiración de sesión por inactividad.

El estado de decisión es **Accepted**: el esquema JWT + refresh es canónico (MASTER-SPEC §11.2); no depende de preguntas abiertas del negocio.

## Alternativas consideradas

1. **Sesiones server-side (cookie de sesión + Redis/DB).** Rechazada para v1: estado en servidor por sesión, dependencia de sesiones distribuidas (Redis) o sticky sessions, y revocación inmediata que en la práctica se logra igual con refresh rotativo en DB. Ventaja real (revocación total) se cubre con access corto + `active` + revocación de refresh. Se revisaría si el predio exigiera revocación instantánea de access (p. ej. seguridad aduanera estricta — pendiente de confirmar con negocio).
2. **OAuth 2.0 / OIDC desde el inicio (provider interno o externo).** Rechazada para v1: los usuarios son internos (~decenas), no hay SSO corporativo confirmado; montar un IdP agrega componentes (authorization server, consent, scopes) sin beneficio inmediato. Queda como evolución para integraciones (MASTER-SPEC §1.5) y multi-predio.
3. **Solo JWT (sin refresh).** Rechazada: o bien access muy corto (mala UX con re-login constante) o bien access largo (ventana de revocación inaceptable para operaciones sensibles: reversión, auditoría). El refresh rotativo resuelve la tensión.
4. **API keys por usuario/servicio.** Rechazada como mecanismo principal (no identifica sesiones ni permite logout/rotación); queda reservada para integraciones futuras con servicios (MASTER-SPEC §1.5) fuera del login humano.

## Consecuencias

**Positivas:**

- UX operativa fluida (login único por jornada; refresh silencioso), sin re-autenticación constante en el puesto de trabajo.
- Revocación real de sesiones (refresh en DB) e inhabilitación inmediata de usuarios `active=false`.
- Access jwt stateless → guards simples y rápidos en NestJS (ADR-003/009).
- Auditoría de LOGIN/LOGOUT habilitada por diseño (ADR-010).

**Negativas:**

- Complejidad moderada: tabla de refresh tokens + rotación + detección de reuso (más que una cookie de sesión simple).
- Ventana de validez de access (≤15 min) sin blacklist: aceptada y documentada; mitigaciones disponibles si el perfil de amenaza lo exige.
- Cookies HttpOnly requieren manejo de CORS/CSRF correcto en el despliegue (mismos/SameSite); el frontend usa cookie solo para refresh, nunca para lectura (SSR no aplica en v1 — OQ-010).

## Referencias

- MASTER-SPEC §4.1 (User, passwordHash, lastLoginAt), §4.3 (AuditAction LOGIN/LOGOUT), §10 (endpoints auth), §11.2 (stack: JWT + Refresh), §1.5 (SSO futuro).
- ADR-003 (guards NestJS), ADR-009 (RBAC sobre claims del token), ADR-010 (auditoría de autenticación).
- `architecture/SECURITY.md` (grupo W2), `backend/API.md` (W5).