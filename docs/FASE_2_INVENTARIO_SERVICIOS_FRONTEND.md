# Fase 2 — Inventario de Servicios Frontend

**Rama:** `refactor/frontend-shared-services-phase-2`
**Commit base:** `07eae51` (phase 1 test fix)

---

## 1. Implementaciones actuales por funcionalidad

### Fetch y llamadas API

| Archivo | Línea(s) | Implementación | Importa desde |
|---------|----------|---------------|---------------|
| `modules/auth.js` | 65-95 | `apiCall()` propia: fetch + headers + refresh | — |
| `admin.html` | 985-1010 | `apiCall()` inline duplicada | — |
| `admin.html` | 1280, 1306, 1328, 1353, 1810 | fetch directo (FormData, DELETE, etc.) | — |
| `modules/roulette.js` | 99 | `fetch('/gifts.json')` directo | — |
| `main.js` | 580 | `apiCall('/payments/plan-status')` | `modules/auth.js` |
| `ui.js` | 222, 341, 485, 548 | fetch directo a `/api/news`, `/api/chat` | — |
| `login.html` | 611, 679 | fetch directo a `/api/auth/login`, `/api/auth/register` | — |

**🔥 5 implementaciones diferentes de fetch con auth.**

### Inserción de Authorization header

| Archivo | Línea | Código |
|---------|-------|--------|
| `modules/auth.js` | 76 | `headers['Authorization'] = 'Bearer ' + token` |
| `admin.html` | 994 | `headers['Authorization'] = 'Bearer ' + token` |
| `login.html` | — | No usa (login público) |

### Refresh de access token

| Archivo | Línea | Comportamiento |
|---------|-------|----------------|
| `modules/auth.js` | 97-125 | Intenta refresh. Si falla, borra tokens. NO redirige. |
| `admin.html` | — | No implementa refresh — solo verifica perfil en checkAdminAccess |

### Lectura/escritura de tokens (localStorage/sessionStorage)

| Archivo | Líneas | Funciones |
|---------|--------|-----------|
| `modules/auth.js` | 10-57 | `getAccessToken`, `getRefreshToken`, `getUser`, `storeTokens`, `clearTokens` |
| `login.html` | 529-594 | Lectura/escritura directa en inline script |
| `admin.html` | 982, 1027-1032, 1081, 1101-1107 | Lectura/escritura directa duplicada |
| `ui.js` | 42, 73, 325-326, 460 | Lectura directa |
| `index.html` | 630, 691 | Lectura directa |
| `roulette.html` | 619 | Lectura directa |

**🔥 La misma lógica de almacenamiento está copiada en 6 lugares distintos.**

### Login, registro, logout

| Flujo | Archivo | Líneas | ¿Usa función compartida? |
|-------|---------|--------|--------------------------|
| Login | `login.html` | 602-641 | ❌ Inline, duplicado de auth.js |
| Registro | `login.html` | 664-707 | ❌ Inline |
| Logout | `ui.js` | 73 | ❌ `clearTokens()` + redirect |
| Logout | `admin.html` | 1100-1108 | ❌ `clearTokens()` duplicado |

### Verificación de autenticación

| Archivo | Líneas | Método |
|---------|--------|--------|
| `index.html` | 609-651 | Script inline: importa `isLoggedIn`, redirige si no |
| `roulette.html` | 598-641 | Script inline: IDÉNTICO a index.html |
| `admin.html` | 1010-1098 | Script inline más complejo (verifica con servidor) |
| `login.html` | 537-599 | Script inline (si ya tiene token, redirige) |

**🔥 El mismo script de auth check está copiado en 4 páginas.**

### WebSocket

| Archivo | Línea | Tipo | Reconexión |
|---------|-------|------|------------|
| `modules/connection.js` | 366 | WebSocket principal `/live` | ✅ Manual con backoff |
| `modules/connection.js` | 64 | WebSocket sync `/sync` | ✅ Manual con backoff |
| `modules/roulette.js` | 151 | WebSocket overlay `/live` | ✅ Manual |

### BroadcastChannel

| Archivo | Línea | Channel |
|---------|-------|---------|
| `modules/connection.js` | 41 | `tiktoolstream_overlay` |
| `main.js` | 79 | `tiktoolstream_overlay` |

### innerHTML (riesgo XSS)

| Archivo | Líneas | Contexto |
|---------|--------|----------|
| `modules/auth.js` | 309-324 | `createUserWidget()` — nombre de usuario |
| `modules/ui.js` | 281, 416 | Noticias y chat — **datos de API** |
| `modules/ui.js` | 321, 350, 363, 384 | Chat — textos estáticos y datos de API |
| `admin.html` | 17+ usos | Tablas de usuarios, noticias, chat — **datos de API** |
| `modules/leaderboard.js` | 139, 169, 277 | Nombres de donadores |
| `modules/roulette.js` | 123-133, 265-277, 737, 764 | Nombres de participantes, datos de gifts |

### alert()

| Archivo | Líneas | Contexto |
|---------|--------|----------|
| `ui.js` | 475, 507, 539, 565 | Chat — errores de sesión/envío |
| `main.js` | 504, 509, 514, 524, 630 | Suma manual, upgrade |
| `admin.html` | 1075, 1303, 1324, 1349, 1857 | Acciones administrativas |
| `index.html` | 739, 743, 758 | Navegación, copiar URL |
| `roulette.js` | 595, 600, 630 | Ruleta — ganador, confirmación |

---

## 2. Matriz de funcionalidades vs implementaciones

| Funcionalidad | Implementaciones | Importadores | Diferencias | Canónica propuesta | Riesgo |
|--------------|-----------------|--------------|-------------|-------------------|--------|
| API call con auth | 5 | Toda la app | admin.html usa `fetch` directo con formData. auth.js hace refresh. | `shared/api.js` | 🔴 Alto |
| Token storage | 6 spags | auth.js, ui.js, admin.html, login.html, index.html, roulette.html | login.html usa `remember` flag. admin.html acceso directo. | `shared/auth.js` | 🔴 Alto |
| Auth check | 4 spags | index.html, admin.html, login.html, roulette.html | admin.html verifica con servidor. Los otros solo localStorage. | `shared/auth.js` | 🟡 Medio |
| Login | 1 spag | login.html | Sin diferencias | `shared/auth.js` | 🟢 Bajo |
| Logout | 3 spags | ui.js, admin.html, shared/auth.js (futuro) | admin.html tiene más limpieza | `shared/auth.js` | 🟢 Bajo |
| WebSocket connect | 2 | connection.js, roulette.js | Roulette crea WS separado | `shared/ws.js` | 🟡 Medio |
| BroadcastChannel | 2 | connection.js, main.js | Mismo canal pero instancias separadas | `shared/event-bus.js` | 🟢 Bajo |
| innerHTML | 5+ archivos | Múltiples | Sin sanitización actual | `shared/sanitize.js` | 🔴 Alto |
| alert() | 4+ archivos | ui.js, main.js, admin.html, roulette.js | Sustituir progresivamente | `shared/toast.js` | 🟢 Bajo |

---

## 3. Exportaciones a preservar en adaptadores

| Módulo legacy | Exportaciones | Tipo de adaptador |
|--------------|---------------|-------------------|
| `modules/auth.js` | `apiCall`, `getAccessToken`, `getRefreshToken`, `getUser`, `isLoggedIn`, `isGuest`, `storeTokens`, `clearTokens`, `login`, `register`, `logout`, `refreshAccessToken`, `getProfile`, `updateProfile`, `getAuctions`, `createAuction`, `getAuction`, `recordGift`, `finishAuction`, `getStats`, `createUserWidget`, `requireAuth` | Re-exportador + wrappers |
| `modules/broadcast.js` | `setWebSocket`, `broadcastToAll`, `broadcastToSocket` | Re-exportador |
| `modules/connection.js` | 20+ exportaciones | No migrar (se reemplazará en Fase 3) |
| `modules/ui.js` | `initUI` | No migrar (depende de HTML) |
| `modules/coins.js` | 5 exportaciones | No migrar (lógica pura) |
| `modules/config.js` | 12 exportaciones | No migrar (lógica pura) |
| `modules/leaderboard.js` | 12 exportaciones | No migrar (lógica pura) |
| `modules/timer.js` | 15 exportaciones | No migrar (lógica pura) |
| `modules/storage.js` | 20 exportaciones | No migrar |
| `modules/animations.js` | 5 exportaciones | No migrar |
| `modules/roulette.js` | `init` | No migrar (página específica) |
