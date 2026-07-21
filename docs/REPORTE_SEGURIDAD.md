# Reporte de Seguridad - TikToolStream

**Clasificación:** NO LISTO PARA PRODUCCIÓN
**Auditor:** Revisión automatizada + análisis manual
**Fecha:** 14 Julio 2026

---

## Resumen

Se identificaron **12 hallazgos P0** (críticos), **7 P1** (altos), **6 P2** (medios) y **4 P3** (bajos). El proyecto expone secretos hardcodeados, endpoints destructivos públicos, y carece de protecciones básicas como Helmet y rate limiting a pesar de tener las dependencias instaladas.

---

## Hallazgos Críticos (P0)

### P0-01: Endpoint reset-users-force 🔴
**Archivo:** `server-new.js:87-95`
**Severidad:** CRÍTICA
**Descripción:** Endpoint público que TRUNCA todas las tablas de usuarios usando un secreto hardcodeado (`lolkjk12_RESET`) pasado como query parameter.
**Impacto:** Cualquier persona que conozca o adivine el secreto puede destruir toda la base de datos de usuarios.
**Exploit:** `GET /api/setup/reset-users-force?secret=lolkjk12_RESET`
**Solución:** Eliminar el endpoint. Las operaciones administrativas deben usar JWT + rol admin.

### P0-02: Endpoint manually-verify 🔴
**Archivo:** `server-new.js:98-106`
**Severidad:** CRÍTICA
**Descripción:** Permite verificar cualquier email sin pasar por el flujo normal de verificación.
**Impacto:** Bypass completo de verificación de email.
**Solución:** Eliminar el endpoint.

### P0-03: Endpoint debug-email 🔴
**Archivo:** `server-new.js:109-134`
**Severidad:** CRÍTICA
**Descripción:** Envía correos de prueba y expone el objeto de error completo incluyendo `error.stack`, `error.response`, `error.command` y el código SMTP.
**Impacto:** Exposición de información interna del servidor y potenciales credenciales.
**Solución:** Eliminar el endpoint.

### P0-04: Endpoint create-admin 🔴
**Archivo:** `server-new.js:137-181`
**Severidad:** CRÍTICA
**Descripción:** Permite crear un usuario administrador sin autenticación, solo con el secreto hardcodeado.
**Impacto:** Cualquier atacante puede crear una cuenta admin y tomar control total del sistema.
**Exploit:** `POST /api/setup/create-admin?secret=lolkjk12_RESET` con body `{username, email, password}`
**Solución:** Eliminar el endpoint.

### P0-05: Endpoint debug-uploads 🔴
**Archivo:** `server-new.js:254-297`
**Severidad:** ALTA
**Descripción:** Lista todos los archivos subidos con sus rutas absolutas del servidor, tamaños y URLs.
**Impacto:** Exposición de estructura de archivos del servidor, enumeración de contenido.
**Solución:** Eliminar o proteger con JWT + admin.

### P0-06: Endpoint file-exists 🔴
**Archivo:** `server-new.js:300-329`
**Severidad:** ALTA
**Descripción:** Permite verificar si cualquier archivo existe en el directorio `uploads/overlays/`.
**Impacto:** Enumeración de archivos, path traversal parcial.
**Solución:** Eliminar o proteger con JWT + admin.

### P0-07: CORS Abierto 🔴
**Archivo:** `server-new.js:71-74`
**Severidad:** ALTA
**Descripción:** CORS configurado con `origin: '*'` y `credentials: true`. Esto permite que cualquier sitio web externo haga peticiones autenticadas (con cookies) al servidor.
**Impacto:** Potencial exfiltración de datos, CSRF avanzado.
```js
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));
```
**Solución:** Especificar orígenes exactos en producción. No usar `*` con `credentials: true`.

### P0-08: Contraseña SMTP Hardcodeada 🔴
**Archivo:** `src/shared/utils/mailer.js:5` (y mailer.util.js:5)
**Severidad:** CRÍTICA
**Descripción:** La contraseña SMTP de Gmail está hardcodeada como fallback:
```js
const EMAIL_PASS = process.env.EMAIL_PASS || 'zcfwoqqtbcmdmhsy';
```
**Impacto:** La contraseña está en el repositorio público. Cualquiera puede acceder a ella y enviar correos como `tiktoolstreamstudio@gmail.com`.
**Solución:** Eliminar el fallback hardcodeado. Requerir `EMAIL_PASS` vía variable de entorno. Rotar la contraseña actual.

### P0-09: Helmet No Aplicado 🔴
**Archivo:** `server-new.js` (middleware)
**Severidad:** MEDIA
**Descripción:** Helmet está instalado (`helmet: ^8.1.0`) y configurado (`src/shared/config/security.js`) pero NUNCA se aplica en `server-new.js`.
**Impacto:** Sin headers de seguridad: X-Content-Type-Options, X-Frame-Options, CSP, HSTS, etc.
**Solución:** Agregar `app.use(require('./src/shared/config/security'))` o `app.use(require('helmet')())`.

### P0-10: Rate Limiting No Aplicado 🔴
**Archivo:** `server-new.js` (middleware)
**Severidad:** MEDIA
**Descripción:** `express-rate-limit` está instalado y configurado (`src/shared/middlewares/rate-limit.js`) pero NUNCA se aplica en `server-new.js`.
**Impacto:** Sin protección contra brute force, ataques de diccionario, DoS.
**Solución:** Agregar `app.use(generalLimiter)` en server-new.js.

### P0-11: Compression No Aplicada 🔴
**Archivo:** `server-new.js` (middleware)
**Severidad:** BAJA-MEDIA
**Descripción:** `compression` está en package.json pero nunca se aplica.
**Impacto:** Sin compresión gzip, mayor uso de ancho de banda.
**Solución:** Agregar `app.use(require('compression')())`.

### P0-12: Stack Traces en Producción 🔴
**Archivo:** `server-new.js:408-411`
**Severidad:** MEDIA
**Descripción:** El error handler solo oculta stacks en producción, pero algunos endpoints (debug-email) exponen stacks sin importar el entorno.
**Solución:** Unificar manejo de errores, nunca exponer stacks.

---

## Hallazgos Altos (P1)

### P1-01: JWT_SECRET Fallback Hardcodeado
**Archivo:** `src/shared/middlewares/auth.middleware.js:8`
**Detalle:** `const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-change-in-production';`
**Impacto:** Si alguien despliega sin configurar JWT_SECRET, todos los tokens usan la misma clave.
**Solución:** Validar JWT_SECRET en producción y no tener fallback.

### P1-02: Módulo Roulette No Montado
**Archivo:** `server-new.js`
**Detalle:** El router de ruleta (`src/modules/roulette/routes.js`) nunca se monta con `app.use()`.
**Impacto:** Ruleta no funcional en API.

### P1-03: Import Roto en server-new.js
**Archivo:** `server-new.js:113`
**Detalle:** `require('./utils/mailer')` — Esta ruta no existe. Debería ser `./src/shared/utils/mailer`.
**Impacto:** El endpoint `/api/setup/debug-email` fallará con MODULE_NOT_FOUND.

### P1-04: Ruta de Upload Incorrecta en Chat/News/Overlays
**Archivo:** `src/modules/chat/routes.js:17`, `news/routes.js:17`, `overlays/routes.js:18`
**Detalle:** Usan `path.join(__dirname, '../uploads/...')` que resuelve a `src/modules/chat/uploads/chat/` en lugar de `uploads/chat/`.
**Impacto:** Los archivos subidos se guardan en ubicaciones incorrectas.
**Corrección:** Usar `path.join(process.cwd(), 'uploads', ...)`.

### P1-05: SQL Injection Potencial en Admin Routes
**Archivo:** `src/modules/admin/routes.js:32-50`
**Detalle:** Construcción dinámica de SQL con concatenación de strings para ILIKE y filtros.
**Impacto:** Bajo riesgo porque los parámetros se pasan como array, pero la construcción dinámica puede ser riesgosa.

### P1-06: Sin Sanitización en News/Chat
**Archivo:** `src/modules/news/routes.js:129`, `chat/routes.js:156`
**Detalle:** Los campos `title`, `content`, `message` se insertan directamente en la BD sin sanitización XSS.
**Impacto:** Potencial XSS almacenado si los valores se renderizan sin escapar.

---

## Vulnerabilidades de Dependencias

| Dependencia | Vulnerabilidades | Gravedad | Acción |
|-------------|-----------------|----------|--------|
| `protobufjs` (vía tiktok-live-connector) | Code execution, code injection, prototype injection, DoS (11 advisories) | 🔴 Critical | `npm audit fix` o esperar actualización de tiktok-live-connector |
| `axios` | SSRF, auth bypass, prototype pollution, credential theft, DoS (20+ advisories) | 🔴 High | `npm audit fix` |
| `nodemailer` | SMTP command injection, CRLF injection, TLS bypass (6 advisories) | 🔴 High | `npm audit fix --force` (breaking change a v9) |
| `ws` | Memory disclosure, memory exhaustion DoS (2 advisories) | 🔴 High | `npm audit fix` |
| `express-rate-limit` | IPv4-mapped IPv6 bypass | 🔴 High | `npm audit fix` |
| `path-to-regexp` | ReDoS (2 advisories) | High | `npm audit fix` |
| `form-data` | CRLF injection | High | `npm audit fix` |
| `follow-redirects` | Auth header leak to redirect targets | Moderate | `npm audit fix` |
| `qs` | DoS via arrayLimit (3 advisories) | Moderate | `npm audit fix` |
| `ip-address` | XSS in HTML-emitting methods | Moderate | `npm audit fix` |

---

## Checklist de Seguridad OWASP Top 10

| Categoría | Estado | Notas |
|-----------|--------|-------|
| A01: Broken Access Control | 🔴 FALLA | Endpoints setup sin auth, CORS abierto |
| A02: Cryptographic Failures | 🔴 FALLA | JWT_SECRET hardcodeado, contraseña SMTP hardcodeada |
| A03: Injection | 🟡 PARCIAL | SQL parametrizado OK, pero sin sanitización XSS en contenido |
| A04: Insecure Design | 🔴 FALLA | Endpoints destructivos públicos |
| A05: Security Misconfiguration | 🔴 FALLA | Sin Helmet, sin rate limit, CORS abierto |
| A06: Vulnerable Components | 🔴 FALLA | 13 vulnerabilidades en dependencias |
| A07: Auth Failures | 🔴 FALLA | WebSocket sin auth |
| A08: Data Integrity Failures | 🟢 OK | No hay deserialización insegura |
| A09: Logging Failures | 🟡 PARCIAL | Winston configurado pero no conectado |
| A10: SSRF | 🟡 PARCIAL | axios vulnerable, pero sin funcionalidad SSRF evidente |

---

## Recomendación

**NO LISTO PARA PRODUCCIÓN.** Se requieren correcciones P0 inmediatas antes de cualquier despliegue.
