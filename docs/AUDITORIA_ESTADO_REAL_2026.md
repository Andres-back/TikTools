# Auditoría de Estado Real - TikToolStream 2026

**Fecha:** 14 Julio 2026
**Rama:** cleanup/remove-duplicates-and-reorganize (ZIP download, sin .git)
**Commit:** N/A (descargado como ZIP)
**Node.js:** v22.14.0
**npm:** 10.9.2
**OS:** Windows 11 Pro (10.0.26200) x64

---

## 1. Estado Inicial Comprobado

### Git
- No hay repositorio `.git` — el proyecto fue descargado como ZIP desde GitHub.
- No se puede rastrear el commit original.
- Es necesario inicializar git y crear una rama de trabajo.

### Dependencias
- `npm ci` ejecutado exitosamente (223 packages)
- `npm audit` reporta **13 vulnerabilidades** (5 moderate, 7 high, 1 critical)
- Dependencias críticas vulnerables: axios, nodemailer, ws, protobufjs, express-rate-limit, uuid, qs

### Scripts rotos
| Script | Comando | Resultado |
|--------|---------|-----------|
| `npm run check` | `node check-config.js` | **FALLA** — archivo no existe |
| `npm test` | `node test-coins-count.js` | **FALLA** — archivo no existe |
| `npm run diagnose` | `node scripts/diagnose-env.js` | ✅ Funciona |
| `npm start` | `node server-new.js` | ⚠️ Inicia pero requiere `.env` |

### Errores de import detectados en server-new.js
```js
const { initDatabase, closeDatabase, getDB } = require('./database/db');
// Línea 24 - Importa database/db.js correctamente

const { transporter } = require('./utils/mailer');
// Línea 113 - RUTA INCORRECTA: ./utils/mailer no existe
// La ruta correcta sería: ./src/shared/utils/mailer.js
```

---

## 2. Hallazgos por Prioridad

### P0 - Crítico (Corregir inmediatamente)

| ID | Hallazgo | Archivo | Línea | Riesgo |
|----|----------|---------|-------|--------|
| P0-01 | Endpoint reset users con secreto hardcodeado | server-new.js | 87-95 | Destrucción completa de datos |
| P0-02 | Endpoint verify manual con secreto hardcodeado | server-new.js | 98-106 | Bypass de verificación email |
| P0-03 | Endpoint debug email con stack trace expuesto | server-new.js | 109-134 | Exposición de error interno + secretos |
| P0-04 | Endpoint create admin con secreto hardcodeado | server-new.js | 137-181 | Creación de admin no autorizada |
| P0-05 | Endpoint debug uploads expone rutas absolutas | server-new.js | 254-297 | Exposición de estructura de archivos |
| P0-06 | Endpoint file-exists permite path traversal limitado | server-new.js | 300-329 | Enumeración de archivos |
| P0-07 | CORS con origen `*` + `credentials: true` | server-new.js | 71-74 | Riesgo de exfiltración de datos |
| P0-08 | Contraseña SMTP hardcodeada | src/shared/utils/mailer.js | 5 | Exposición de credenciales |
| P0-09 | Helmet importado pero NUNCA aplicado | server-new.js | — | Sin headers de seguridad |
| P0-10 | Rate limiting importado pero NUNCA aplicado | server-new.js | — | Sin protección contra brute force |
| P0-11 | `compression` en package.json pero NUNCA aplicado | server-new.js | — | Sin compresión gzip |
| P0-12 | Debug email expone contraseña SMTP en stack | server-new.js | 109-134 | Exposición de credencial SMTP |

### P1 - Alto

| ID | Hallazgo | Archivo | Línea | Riesgo |
|----|----------|---------|-------|--------|
| P1-01 | 3 copias idénticas de db.js (536 líneas c/u) | database/db.js, src/shared/database/db.js, src/shared/database/connection.js | todas | Mantenimiento imposible |
| P1-02 | 2 copias de auth (auth.js 272L vs auth.middleware.js 121L) | src/shared/middlewares/auth.js, auth.middleware.js | todas | Código divergente |
| P1-03 | 2 copias de plan (plan.js 340L vs plan.middleware.js 224L) | src/shared/middlewares/plan.js, plan.middleware.js | todas | Código divergente |
| P1-04 | 2 copias idénticas de mailer | src/shared/utils/mailer.js, mailer.util.js | todas | Duplicidad exacta |
| P1-05 | Endpoint overlay check revela rutas del servidor | src/modules/overlays/routes.js | 255-277 | Exposición de estructura |
| P1-06 | Endpoint news check revela rutas del servidor | src/modules/news/routes.js | 171-193 | Exposición de estructura |
| P1-07 | `server-new.js` usa authMiddleware de la ruta incorrecta | server-new.js | 25 | Usa auth.middleware.js (simplificado) vs auth.js (completo) |

### P2 - Medio

| ID | Hallazgo | Archivo | Riesgo |
|----|----------|---------|--------|
| P2-01 | Scripts `check-config.js` y `test-coins-count.js` no existen | package.json | Scripts rotos |
| P2-02 | `npm run migrate` apunta a `./database/db` desde scripts/ | scripts/migrate-new-tables.js:6 | Ruta relativa incorrecta |
| P2-03 | README.md desactualizado (menciona server.js, no server-new.js) | README.md | Confusión |
| P2-04 | `package-new.json` huérfano en root | root | Archivo obsoleto |
| P2-05 | Lint/no typecheck configurados | package.json | Sin calidad de código |
| P2-06 | Sin tests automatizados | todo el proyecto | Sin verificación |

### P3 - Bajo

| ID | Hallazgo | Archivo | Riesgo |
|----|----------|---------|--------|
| P3-01 | Sin .gitignore efectivo para uploads reales | .gitignore | Podría commitear uploads |
| P3-02 | Logs de producción con información sensible | src/shared/constants/errors.js | Privacidad |
| P3-03 | Frontend sin sanitización XSS en overlays | frontend/overlays/ | XSS potencial |
| P3-04 | gift.json duplicado (frontend/ y frontend/assets/) | frontend/ | Inconsistencia |

---

## 3. Vulnerabilidades de Dependencias (npm audit)

### Críticas (1)
- **protobufjs**: Arbitrary code execution, code injection, prototype injection (vía tiktok-live-connector)

### High (7)
- **axios**: 20+ vulnerabilidades (SSRF, auth bypass, prototype pollution, DoS, credential theft)
- **express-rate-limit**: IPv4-mapped IPv6 bypass
- **nodemailer**: SMTP command injection, CRLF injection, TLS cert validation
- **path-to-regexp**: ReDoS via sequential optional groups
- **ws**: Uninitialized memory disclosure, memory exhaustion DoS
- **form-data**: CRLF injection

### Moderate (5)
- **protobufjs**: Overlong UTF-8 decoding
- **follow-redirects**: Auth header leak
- **qs**: DoS via arrayLimit bypass (x3)
- **ip-address**: XSS in HTML-emitting methods
- **uuid**: Missing buffer bounds check

---

## 4. Resumen de Archivos por Estado

### Archivos activos (producción)
- `server-new.js` — Entry point (746 líneas)
- `database/db.js` — DB activa (importada por server-new.js)
- `src/modules/*/routes.js` — 9 módulos
- `src/shared/middlewares/auth.middleware.js` — Auth usada por server-new.js
- `src/shared/middlewares/plan.middleware.js` — Plan usada por server-new.js

### Archivos huérfanos (no importados)
- `database/schema.sql` — No usado, el schema está inline en db.js
- `database/migrations/007_roulette_system.sql` — No aplicado automáticamente
- `src/shared/database/db.js` — No importado por nadie
- `src/shared/database/connection.js` — No importado por nadie
- `src/shared/utils/mailer.js` — **Importado incorrectamente** desde server-new.js:113 como `./utils/mailer`
- `src/shared/utils/mailer.util.js` — No importado por nadie
- `src/shared/middlewares/auth.js` — **Importado** por src/modules/auth/routes.js
- `src/shared/middlewares/plan.js` — **Importado** por src/modules/admin/routes.js
- `src/shared/middlewares/plan.middleware.js` — No importado por nadie
- `src/shared/middlewares/error-handler.js` — No conectado a server-new.js
- `src/shared/middlewares/rate-limit.js` — No conectado a server-new.js (solo definido)
- `src/shared/middlewares/validators.js` — No conectado a server-new.js
- `src/shared/middlewares/async-handler.js` — No usado
- `src/shared/utils/logger.js` — No conectado a server-new.js
- `src/shared/utils/sanitizer.js` — No usado
- `src/shared/utils/file-upload.js` — No usado
- `src/shared/config/*.js` — 3 archivos, no conectados
- `src/shared/constants/*.js` — 3 archivos, parcialmente usados
- `src/modules/tiktok/services/gifts.service.js` — No importado por server-new.js
- `src/modules/roulette/routes.js` — **NO MONTADO** en server-new.js
- `package-new.json` — Obsoleto
- `scripts/migrate-new-tables.js` — Ruta de import incorrecta

### Archivos que fallan al ejecutarse
- `check-config.js` — No existe (referenciado en package.json)
- `test-coins-count.js` — No existe (referenciado en package.json)

---

## 5. Matriz de Endpoints

| Endpoint | Método | Auth | Plan | Admin | Riesgo |
|----------|--------|------|------|-------|--------|
| `/api/auth/register` | POST | No | No | No | ✅ |
| `/api/auth/login` | POST | No | No | No | ⚠️ Sin rate limit |
| `/api/auth/refresh` | POST | No | No | No | ✅ |
| `/api/auth/verify` | GET | No | No | No | ✅ |
| `/api/auth/logout` | POST | JWT | No | No | ✅ |
| `/api/auth/profile` | GET/PUT | JWT | No | No | ✅ |
| `/api/auth/password` | PUT | JWT | No | No | ✅ |
| `/api/setup/reset-users-force` | GET | query secret | No | No | 🔴 CRÍTICO |
| `/api/setup/manually-verify` | GET | query secret | No | No | 🔴 CRÍTICO |
| `/api/setup/debug-email` | GET | query secret | No | No | 🔴 CRÍTICO |
| `/api/setup/create-admin` | POST | query secret | No | No | 🔴 CRÍTICO |
| `/api/debug/uploads` | GET | No | No | No | 🔴 ALTO |
| `/api/debug/file-exists/:filename` | GET | No | No | No | 🔴 ALTO |
| `/api/payments/*` | * | JWT | No | No | ✅ |
| `/api/admin/*` | * | JWT | No | admin | ✅ |
| `/api/auctions` | * | JWT | checkPlan | No | ⚠️ Sin validación límites |
| `/api/news` | * | Varía | No | admin (POST/DELETE) | ⚠️ Público sin sanitizar |
| `/api/chat` | * | JWT | No | Varía | ⚠️ Upload sin validar |
| `/api/overlays` | * | Varía | No | No | ⚠️ Público GET |
| `/api/health` | GET | No | No | No | ✅ |
| `/api/roulette/*` | * | JWT | No | No | ⚠️ NO MONTADO |
| `/live` | WS | No | No | No | ⚠️ Sin auth |

---

## 6. Comandos Ejecutados

```bash
# Estado base
> node --version        # v22.14.0
> npm --version         # 10.9.2

# Dependencias
> npm ci                # 223 packages, 13 vulnerabilities

# Auditoría
> npm audit             # 13 vulns (5 mod, 7 high, 1 critical)

# Scripts
> npm run check         # FAIL: Cannot find module 'check-config.js'
> npm test              # FAIL: Cannot find module 'test-coins-count.js'
> npm run diagnose      # OK
> npm start             # Requiere .env para CI/start completo
```

---

## 7. Conclusión

El proyecto **NO está listo para producción** debido a:

1. **4 endpoints públicos con capacidad destructiva** protegidos únicamente por un secreto hardcodeado
2. **CORS abierto** (`*` + credentials) que permite exfiltración de datos
3. **Helmet y rate limiting no aplicados** a pesar de estar instalados
4. **13 vulnerabilidades** en dependencias (1 critical, 7 high)
5. **Scripts rotos** en package.json
6. **Duplicación masiva de código** (3 DBs, 2 auths, 2 plans, 2 mailers)
7. **Módulo roulette no montado** en server-new.js
8. **Sin tests automatizados**

**Recomendación:** NO LISTO PARA PRODUCCIÓN. Se requiere fase de corrección P0 antes de cualquier despliegue.
