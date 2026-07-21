# Plan de Estabilización - TikToolStream

## Fase 1: Corrección P0 (Seguridad)

### 1.1 Eliminar Endpoints Setup/Debug
**Archivo:** `server-new.js`
**Acción:** Eliminar líneas 86-181 (endpoints `/api/setup/*`) y líneas 253-329 (endpoints `/api/debug/*`).
**Commit:** `fix: remove setup and debug endpoints with hardcoded secrets`

### 1.2 Aplicar Helmet
**Archivo:** `server-new.js`
**Acción:** Agregar `app.use(require('./src/shared/config/security'))` o `app.use(require('helmet')())` después de la creación de `app`.
**Commit:** `fix: apply helmet security headers`

### 1.3 Aplicar Rate Limiting
**Archivo:** `server-new.js`
**Acción:** Agregar `app.use(generalLimiter)` y `app.use('/api/auth', authLimiter)`.
**Importar:** `const { generalLimiter, authLimiter } = require('./src/shared/middlewares/rate-limit');`
**Commit:** `fix: apply rate limiting protection`

### 1.4 Corregir CORS
**Archivo:** `server-new.js`
**Acción:** Reemplazar CORS inline por `const corsOptions = require('./src/shared/config/cors')` y `app.use(cors(corsOptions))`.
**Commit:** `fix: apply secure CORS configuration`

### 1.5 Eliminar Contraseña SMTP Hardcodeada
**Archivo:** `src/shared/utils/mailer.js`, `src/shared/utils/mailer.util.js`
**Acción:** Cambiar `|| 'zcfwoqqtbcmdmhsy'` a requerir variable de entorno.
**Commit:** `fix: remove hardcoded SMTP password`

### 1.6 Aplicar Compression
**Archivo:** `server-new.js`
**Acción:** Agregar `app.use(require('compression')())`.
**Commit:** `fix: enable gzip compression`

### 1.7 Agregar Manejo Seguro de Errores
**Archivo:** `server-new.js`
**Acción:** Conectar `errorHandler` y `notFoundHandler` de `src/shared/middlewares/error-handler.js`.
**Commit:** `fix: apply centralized error handling`

---

## Fase 2: Estabilización de Archivos

### 2.1 Determinar DB Canónica
**Canónica:** `database/db.js` (más importada)
**Acción:**
- Mantener `database/db.js` como fuente de verdad
- Reemplazar imports en `src/shared/middlewares/auth.js` y `plan.js` para que apunten a `../../../database/db`
- Eliminar `src/shared/database/connection.js`
- Dejar `src/shared/database/db.js` como alias temporal (redirección)
**Commit:** `refactor: unify database imports to canonical database/db.js`

### 2.2 Determinar Auth Canónico
**Canónica:** `src/shared/middlewares/auth.js` (más completa, 272 líneas)
**Acción:**
- Migrar `server-new.js` para importar desde `./src/shared/middlewares/auth` (ya lo hace correctamente)
- Verificar que `auth.js` exporta `generateTokens`, `authMiddleware`, `adminMiddleware`
- Eliminar `src/shared/middlewares/auth.middleware.js` después de verificar que ningún importador la usa
**Commit:** `refactor: unify auth middleware to canonical version`

### 2.3 Determinar Plan Canónico
**Canónica:** `src/shared/middlewares/plan.js` (más completa, 340 líneas)
**Acción:**
- Migrar `server-new.js` para importar desde `./src/shared/middlewares/plan` (ya lo hace)
- Eliminar `src/shared/middlewares/plan.middleware.js`
**Commit:** `refactor: unify plan middleware to canonical version`

### 2.4 Determinar Mailer Canónico
**Canónica:** `src/shared/utils/mailer.js`
**Acción:**
- Corregir import en `server-new.js:113` de `./utils/mailer` a `./src/shared/utils/mailer`
- Eliminar `src/shared/utils/mailer.util.js`
**Commit:** `refactor: unify mailer and fix broken import`

### 2.5 Resolver Rutas de Upload Incorrectas
**Archivos:** `src/modules/chat/routes.js`, `news/routes.js`, `overlays/routes.js`
**Acción:** Reemplazar `path.join(__dirname, '../uploads/...')` por `path.join(process.cwd(), 'uploads', ...)`
**Commit:** `fix: correct upload directory paths`

### 2.6 Montar Módulo Roulette
**Archivo:** `server-new.js`
**Acción:** Agregar `const rouletteRoutes = require('./src/modules/roulette/routes');` y `app.use('/api/roulette', rouletteRoutes);`
**Commit:** `feat: mount existing roulette module in server`

---

## Fase 3: Corrección de Scripts

### 3.1 package.json
**Acciones:**
- Eliminar `"check": "node check-config.js"` (archivo no existe)
- Eliminar `"test": "node test-coins-count.js"` (archivo no existe)
- Agregar `"test": "echo \"No tests configured yet\""` o crear test inicial
- Agregar `"lint": "echo \"No linter configured yet\""`
- Agregar `"audit:check": "npm audit --audit-level=high"`
- Eliminar `package-new.json`
**Commit:** `chore: fix package.json scripts, remove orphan package-new.json`

### 3.2 Corregir migrate-new-tables.js
**Archivo:** `scripts/migrate-new-tables.js:6`
**Acción:** Cambiar `require('./database/db')` a `require('../database/db')`
**Commit:** `fix: correct migration script import path`

---

## Fase 4: Pruebas

### 4.1 Pruebas Unitarias
Crear `tests/` con:
- `tests/auth.test.js` — Registro, login, refresh, permisos
- `tests/auctions.test.js` — Creación, finalización, gifts
- `tests/plan.test.js` — Límites trial, expiración
- `tests/roulette.test.js` — Participantes, eliminación, ganadores
- `tests/security.test.js` — Sanitización, CORS, rate limiting

### 4.2 Pruebas de Integración
- `tests/api.test.js` — Flujos completos con base de datos SQLite en memoria

### 4.3 Comando de Pruebas
```json
{
  "scripts": {
    "test": "node --test tests/",
    "test:watch": "node --test --watch tests/"
  }
}
```

---

## Fase 5: Git y Despliegue

### 5.1 Inicializar Git
```bash
git init
git checkout -b cleanup/remove-duplicates-and-reorganize
git add .
git commit -m "chore: initial commit from ZIP download of cleanup branch"
```

### 5.2 Documentar Rollback
**Procedimiento de rollback:**
1. `git revert HEAD` para deshacer el último commit
2. Si se desplegó, restaurar la versión anterior desde Digital Ocean App Platform dashboard
3. Verificar que `/api/health` responda correctamente
4. Verificar que los endpoints de auth funcionen

### 5.3 Check Pre-Despliegue
- [ ] `npm ci` — Sin errores
- [ ] `npm test` — Todos los tests pasan
- [ ] `npm run diagnose` — Muestra configuración completa
- [ ] No hay endpoints `/api/setup/*` ni `/api/debug/*`
- [ ] CORS configurado con allowlist
- [ ] Helmet aplicado
- [ ] Rate limiting aplicado
- [ ] JWT_SECRET configurado (sin fallback)
- [ ] EMAIL_PASS configurado (sin fallback)

---

## Resumen de Commits Planificados

| # | Tipo | Descripción | Archivos |
|---|------|-------------|----------|
| 1 | fix | Eliminar endpoints setup/debug con secretos hardcodeados | server-new.js |
| 2 | fix | Aplicar Helmet, rate limiting, CORS seguro, compression | server-new.js |
| 3 | fix | Eliminar contraseña SMTP hardcodeada | mailer.js, mailer.util.js |
| 4 | fix | Aplicar error handler centralizado | server-new.js |
| 5 | refactor | Unificar DB canónica y eliminar duplicados | 3 archivos |
| 6 | refactor | Unificar auth canónico | 2 archivos |
| 7 | refactor | Unificar plan canónico | 2 archivos |
| 8 | refactor | Unificar mailer canónico | 2 archivos |
| 9 | fix | Corregir rutas de upload | 3 módulos |
| 10 | feat | Montar módulo roulette | server-new.js |
| 11 | chore | Corregir package.json scripts | package.json |

---

## Línea de Tiempo Estimada

| Fase | Duración estimada | Depende de |
|------|-------------------|------------|
| Fase 1: Seguridad P0 | 2-3 horas | — |
| Fase 2: Estabilización | 3-4 horas | Fase 1 |
| Fase 3: Scripts | 1 hora | Fase 2 |
| Fase 4: Pruebas | 4-6 horas | Fase 2 |
| Fase 5: Git/Despliegue | 1 hora | Fases 1-4 |
| **Total** | **11-15 horas** | |
