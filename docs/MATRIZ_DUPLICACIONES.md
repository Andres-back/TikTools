# Matriz de Duplicaciones - TikToolStream

## 1. Base de Datos (3 copias)

### 1a. `database/db.js` — ACTIVA
- **Ruta:** `D:\DEV\TIKTOOLSTREAM\database\db.js`
- **Tamaño:** 536 líneas
- **Importada por:**
  - `server-new.js` (línea 24, vía `require('./database/db')`)
  - `src/modules/auth/routes.js` (línea 7, vía `require('../../../database/db')`)
  - `src/modules/admin/routes.js` (línea 5, vía `require('../../../database/db')`)
  - `src/modules/auctions/routes.js` (línea 5, vía `require('../../../database/db')`)
  - `src/modules/payments/routes.js` (línea 5, vía `require('../../../database/db')`)
  - `src/modules/overlays/routes.js` (línea 8, vía `require('../../../database/db')`)
  - `src/modules/chat/routes.js` (línea 8, vía `require('../../../database/db')`)
  - `src/modules/news/routes.js` (línea 8, vía `require('../../../database/db')`)
  - `src/modules/roulette/routes.js` (línea 8, vía `require('../../../database/db')`)
- **Contiene:** `resetUsers()`, `initDatabase()`, `getDB()`, `query()`, `closeDatabase()`

### 1b. `src/shared/database/db.js` — HIBERNADA
- **Ruta:** `D:\DEV\TIKTOOLSTREAM\src\shared\database\db.js`
- **Tamaño:** 536 líneas (IDÉNTICA a 1a)
- **Importada por:**
  - `src/shared/middlewares/auth.js` (línea 11, vía `require('../database/db')`)
  - `src/shared/middlewares/plan.js` (línea 6, vía `require('../database/db')`)
- **Diferencia funcional:** Ninguna. Es una copia exacta.
- **Riesgo de eliminación:** BAJO si se reemplazan los imports por la ruta canónica.

### 1c. `src/shared/database/connection.js` — HIBERNADA
- **Ruta:** `D:\DEV\TIKTOOLSTREAM\src\shared\database\connection.js`
- **Tamaño:** 536 líneas (IDÉNTICA a 1a y 1b)
- **Importada por:** NADIE
- **Diferencia funcional:** Ninguna.
- **Riesgo de eliminación:** NULO (no tiene importadores).
- **Recomendación:** Eliminar directamente.

---

## 2. Autenticación (2 copias)

### 2a. `src/shared/middlewares/auth.js` — COMPLETA
- **Ruta:** `D:\DEV\TIKTOOLSTREAM\src\shared\middlewares\auth.js`
- **Tamaño:** 272 líneas
- **Importada por:**
  - `src/modules/auth/routes.js` (línea 8, vía `require('../../shared/middlewares/auth')`)
  - `src/modules/overlays/routes.js` (línea 9, vía `require('../../shared/middlewares/auth')`)
  - `src/modules/chat/routes.js` (línea 9, vía `require('../../shared/middlewares/auth')`)
  - `src/modules/news/routes.js` (línea 9, vía `require('../../shared/middlewares/auth')`)
- **Funcionalidad:** Incluye `generateTokens`, `verifyToken`, `authMiddleware`, `adminMiddleware`, `moderatorMiddleware`, `optionalAuth`, `ownershipMiddleware`, `requireVerifiedEmail`, `auditAdminAction`
- **Características:** Usa `config` centralizado, `logger`, errores personalizados (`UnauthorizedError`, `ForbiddenError`)

### 2b. `src/shared/middlewares/auth.middleware.js` — SIMPLIFICADA
- **Ruta:** `D:\DEV\TIKTOOLSTREAM\src\shared\middlewares\auth.middleware.js`
- **Tamaño:** 121 líneas
- **Importada por:**
  - `server-new.js` (línea 25, vía `require('./src/shared/middlewares/auth')`) — **esto importa auth.middleware.js porque Node resuelve auth → auth.middleware.js según orden de carpetas? NO. Esto importa auth.js porque auth.js existe.** 
  - **Espera:** En realidad `require('./src/shared/middlewares/auth')` busca `auth.js` primero, no `auth.middleware.js`. Si existe `auth.js`, ese es el que se carga.
- **Funcionalidad:** `generateTokens`, `verifyToken`, `authMiddleware`, `adminMiddleware`, `optionalAuth`, `JWT_SECRET`
- **Características:** Usa `console.log` para debug, JWT_SECRET hardcodeado como fallback (`'your-super-secret-key-change-in-production'`)
- **Diferencia funcional:**
  - `auth.js` usa `config.jwt.secret` (desde variables de entorno)
  - `auth.middleware.js` usa `process.env.JWT_SECRET` con fallback hardcodeado
  - `auth.js` tiene `moderatorMiddleware`, `ownershipMiddleware`, `requireVerifiedEmail`, `auditAdminAction`
  - `auth.middleware.js` NO tiene estas funciones
- **Riesgo de eliminación:** MEDIO — auth.middleware.js podría eliminarse si se migran todos los imports a auth.js, PERO server-new.js y los módulos deben actualizarse.

---

## 3. Plan/Suscripción (2 copias)

### 3a. `src/shared/middlewares/plan.js` — COMPLETA
- **Ruta:** `D:\DEV\TIKTOOLSTREAM\src\shared\middlewares\plan.js`
- **Tamaño:** 340 líneas
- **Importada por:**
  - `src/modules/admin/routes.js` (líneas 7-10, vía `require('../../shared/middlewares/plan')`)
  - `src/modules/auth/routes.js` (línea 9, vía `require('../../shared/middlewares/plan')`)
- **Funcionalidad:** `checkPlanMiddleware`, `requirePlan`, `activateTrialDays`, `addDaysToUser`, `removeDaysFromUser`, `toggleUserAccount`, `getPlanStats`
- **Características:** Usa `logger`, constantes de `plans.js`, errores personalizados, auditoría

### 3b. `src/shared/middlewares/plan.middleware.js` — SIMPLIFICADA
- **Ruta:** `D:\DEV\TIKTOOLSTREAM\src\shared\middlewares\plan.middleware.js`
- **Tamaño:** 224 líneas
- **Importada por:**
  - `server-new.js` (línea 26, vía `require('./src/shared/middlewares/plan')`) — **esto importa plan.js, no plan.middleware.js**
- **Funcionalidad:** `checkPlanMiddleware`, `adminMiddleware` (duplicado de auth), `activateTrialDays`, `addDaysToUser`, `removeDaysFromUser`, `toggleUserAccount`
- **Características:** Sin logger, sin auditoría, respuestas directas res.status()
- **Diferencia funcional:**
  - `plan.js` usa `logger.logAudit()` y errores personalizados
  - `plan.middleware.js` usa `res.status().json()` directo
  - `plan.js` tiene `requirePlan()` y `getPlanStats()`
  - `plan.middleware.js` tiene `adminMiddleware()` que duplica funcionalidad de auth
- **Riesgo de eliminación:** BAJO — no tiene importadores directos

---

## 4. Mailer (2 copias IDÉNTICAS)

### 4a. `src/shared/utils/mailer.js` — ACTIVA
- **Ruta:** `D:\DEV\TIKTOOLSTREAM\src\shared\utils\mailer.js`
- **Tamaño:** 59 líneas
- **Importada por:**
  - `src/modules/auth/routes.js` (línea 13, vía `require('../../shared/utils/mailer')`)
  - `server-new.js` (línea 113, vía `require('./utils/mailer')`) — **RUTA INCORRECTA — fallará en producción**
- **Contiene:** Contraseña SMTP hardcodeada como fallback

### 4b. `src/shared/utils/mailer.util.js` — HIBERNADA
- **Ruta:** `D:\DEV\TIKTOOLSTREAM\src\shared\utils\mailer.util.js`
- **Tamaño:** 59 líneas (IDÉNTICA)
- **Importada por:** NADIE
- **Diferencia funcional:** Ninguna.
- **Riesgo de eliminación:** NULO

---

## 5. Gifts (2 archivos)

### 5a. `frontend/gifts.json`
- **Tamaño:** 72,028 bytes

### 5b. `frontend/assets/gifts.json`
- **Tamaño:** 60,484 bytes
- **Diferencia:** Difieren en tamaño (~12KB de diferencia)
- **Riesgo:** Inconsistencia de datos de gifts

---

## 6. Overlays (2 versiones por overlay)

### 6a. En `frontend/overlays/` — NUEVA
- `overlay-generic.html`
- `overlay-participantes.html`
- `overlay-participantes.js`
- `overlay-ruleta.html`
- `overlay-timer.html`

### 6b. En `frontend/` (raíz) — ANTIGUA
- No se encontraron overlays duplicados en root de frontend.
- Los overlays están solo en `frontend/overlays/`.

---

## 7. Config (3 archivos compartidos)

### 7a. `src/shared/config/index.js`
- Importado por: `cors.js`, `rate-limit.js`, `error-handler.js`, `security.js`, `file-upload.js`

### 7b. `src/shared/config/cors.js`
- **No importado por NADIE.** server-new.js define CORS inline.

### 7c. `src/shared/config/security.js`
- **No importado por NADIE.** server-new.js no usa helmet().

---

## 8. Logos (3 archivos de imagen)

### 8a. `data/LOGOSINFONDO.png` — 183KB
### 8b. `data/logo_fondo_blanco.png` — 570KB
### 8c. `frontend/assets/LOGOSINFONDO.png` — 183KB (duplicado de 8a)

---

## Resumen de Riesgo de Eliminación

| Archivo | Importadores | Riesgo | Acción |
|---------|-------------|--------|--------|
| `database/db.js` | 9 módulos + server-new.js | 🔴 Crítico | Mantener como canónico |
| `src/shared/database/db.js` | auth.js, plan.js | 🟡 Medio | Migrar imports → database/db.js |
| `src/shared/database/connection.js` | 0 | 🟢 Ninguno | Eliminar ya |
| `src/shared/middlewares/auth.js` | 4 módulos | 🟢 Ninguno | Mantener como canónico (versión completa) |
| `src/shared/middlewares/auth.middleware.js` | server-new.js | 🟡 Medio | Eliminar después de migrar server-new.js |
| `src/shared/middlewares/plan.js` | admin/routes.js, auth/routes.js | 🟢 Ninguno | Mantener como canónico |
| `src/shared/middlewares/plan.middleware.js` | 0 | 🟢 Ninguno | Eliminar ya |
| `src/shared/utils/mailer.js` | auth/routes.js, server-new.js (ruta rota) | 🟢 Ninguno | Mantener como canónico |
| `src/shared/utils/mailer.util.js` | 0 | 🟢 Ninguno | Eliminar ya |
| `frontend/assets/gifts.json` | frontend | 🟡 Medio | Verificar cuál es correcto |
