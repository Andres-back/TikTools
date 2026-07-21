# Handoff - TikToolStream

**Proyecto:** TikToolStream — Plataforma SaaS de subastas en TikTok Live
**Repositorio:** https://github.com/Andres-back/TikTools
**Rama base:** cleanup/remove-duplicates-and-reorganize
**Dominio:** https://tiktoolstream.studio

---

## Resumen Ejecutivo

TikToolStream es una plataforma SaaS funcional para streamers de TikTok Live. El proyecto fue reestructurado en la rama `cleanup/remove-duplicates-and-reorganize` pero quedó en un estado **incompleto** con:

- **Secretos hardcodeados** (contraseña SMTP, JWT fallback, secreto de reset)
- **Endpoints destructivos públicos** (reset-users, create-admin)
- **Duplicación masiva de código** (3 bases de datos, 2 auths, 2 plans, 2 mailers)
- **Protecciones de seguridad ausentes** (Helmet, rate limiting, CORS restrictivo)
- **Scripts rotos** (check, test)
- **Módulo sin montar** (roulette)
- **0% cobertura de pruebas**

---

## Estado Actual

### ✅ Funcional
- Autenticación JWT (register, login, refresh, logout, profile)
- Admin CRUD de usuarios con planes
- Subastas API (CRUD + gifts + finalizar)
- Pagos PayPal (createOrder, captureOrder)
- Chat usuario-admin con upload de imágenes
- Noticias (CRUD admin)
- Overlays personalizados con upload de imágenes
- WebSocket para conexión TikTok Live
- Conexión TikTok vía tiktok-live-connector
- Diagnóstico de entorno

### ❌ No Funcional / Roto
- **Roulette** — API implementada pero no montada en server-new.js
- **npm run check** — Script no existe
- **npm test** — Script no existe
- **debug-email** — Import roto (`./utils/mailer`)
- **Security headers** — Helmet no aplicado
- **Rate limiting** — No aplicado
- **Compression** — No aplicada

### 🔴 Crítico (P0)
1. 4 endpoints setup con secreto hardcodeado `lolkjk12_RESET`
2. 2 endpoints debug públicos que exponen rutas absolutas
3. CORS `*` + `credentials: true`
4. Contraseña SMTP hardcodeada en código
5. Sin Helmet, sin rate limiting, sin compression
6. 13 vulnerabilidades en dependencias

---

## Archivos Clave

| Archivo | Propósito | Estado |
|---------|-----------|--------|
| `server-new.js` | Entry point principal (746 líneas) | ✅ Activo |
| `database/db.js` | DB activa (PostgreSQL/SQLite) | ✅ Canónico |
| `src/modules/*/routes.js` | Módulos API (9 módulos) | ✅ 8/9 montados |
| `src/shared/middlewares/auth.js` | Auth completo (272 líneas) | ✅ Canónico |
| `src/shared/middlewares/plan.js` | Plan completo (340 líneas) | ✅ Canónico |
| `src/shared/utils/mailer.js` | Mailer activo | ✅ Canónico |
| `src/shared/utils/logger.js` | Winston logger | ✅ Sin conectar |
| `src/shared/config/security.js` | Config Helmet | ✅ Sin conectar |
| `src/shared/middlewares/rate-limit.js` | Rate limiters | ✅ Sin conectar |
| `src/shared/middlewares/error-handler.js` | Error handler | ✅ Sin conectar |

---

## Archivos Huérfanos (Eliminables)

| Archivo | Riesgo |
|---------|--------|
| `src/shared/database/connection.js` | 🟢 Ninguno (0 importadores) |
| `src/shared/utils/mailer.util.js` | 🟢 Ninguno (0 importadores) |
| `src/shared/middlewares/plan.middleware.js` | 🟢 Ninguno (0 importadores) |
| `src/shared/middlewares/auth.middleware.js` | 🟡 Migrar server-new.js primero |
| `database/schema.sql` | 🟢 Inline en db.js |
| `package-new.json` | 🟢 Obsoleto |

---

## Plan de Acción Recomendado

### Día 1: Seguridad (3-4 horas)
1. Eliminar endpoints `/api/setup/*` y `/api/debug/*`
2. Aplicar Helmet, rate limiting, CORS restrictivo, compression
3. Eliminar contraseña SMTP hardcodeada
4. Aplicar error handler centralizado
5. Commit: `fix: security patches P0`

### Día 2: Estabilización (3-4 horas)
6. Unificar DB canónica (database/db.js)
7. Unificar auth canónico (auth.js)
8. Unificar plan canónico (plan.js)
9. Unificar mailer canónico (mailer.js)
10. Corregir rutas de upload
11. Montar módulo roulette
12. Commit: `refactor: unify duplicate modules`

### Día 3: Scripts y Config (2 horas)
13. Arreglar package.json scripts
14. Eliminar archivos huérfanos
15. Corregir migrate-new-tables.js import
16. Commit: `chore: fix scripts and cleanup orphans`

### Día 4: Pruebas (4-6 horas)
17. Crear tests de auth
18. Crear tests de subastas
19. Crear tests de planes
20. Crear tests de ruleta
21. Crear tests de seguridad
22. Commit: `test: initial test suite`

### Día 5: Verificación (2 horas)
23. npm ci limpio
24. npm test pasa
25. npm start funciona
26. Verificar flujo completo
27. Commit: `chore: final verification`

---

## Procedimiento de Rollback

Si un cambio rompe producción:

```bash
# Si hay git:
git revert HEAD --no-edit
git push

# Si no hay git:
# 1. Restaurar server-new.js desde backup
# 2. Restaurar database/db.js desde backup
# 3. Verificar /api/health
# 4. Verificar login de admin

# En Digital Ocean:
# 1. Ir a Apps -> TikTools -> Settings
# 2. "Rollback" a la última versión estable
# 3. Verificar health check
```

---

## Recomendación Final

**NO LISTO PARA PRODUCCIÓN.**

El proyecto requiere las correcciones P0 de seguridad antes de cualquier despliegue. Una vez aplicadas las Fases 1-3, el proyecto estaría **LISTO PARA STAGING**. Las pruebas automatizadas (Fase 4) deben completarse antes de considerar **LISTO PARA PRODUCCIÓN**.

### Riesgos Identificados para Despliegue
1. Si se despliega sin corregir, los endpoints setup permiten destruir la BD de producción
2. CORS abierto permite exfiltración de datos de usuarios autenticados
3. Sin rate limiting, login es vulnerable a brute force
4. Sin Helmet, la app es vulnerable a clickjacking y MIME sniffing
5. Contraseña SMTP expuesta permite suplantación de correo
6. 13 vulnerabilidades en dependencias pueden ser explotadas
7. WebSocket sin auth permite recibir datos de gifts de cualquier stream
8. Los uploads se guardan en directorios incorrectos (chat, news, overlays)
