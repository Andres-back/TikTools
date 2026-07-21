# Fase 0 — Caracterización de Rutas Frontend

**Fecha:** 15 Julio 2026
**Rama:** `fix/frontend-routes-phase-0-1`
**Commit base:** `5971252` (fix: improve frontend flow with sidebar on roulette and working modals)
**Servidor:** Node v22.14.0, Express 5.2.1, Puerto 7890

---

## Resumen de rutas probadas (31 rutas)

| Resultado | Cantidad | Detalle |
|-----------|----------|---------|
| ✅ OK | 20 | Rutas que sirven contenido real |
| ⚠️ Falso 200 (SPA fallback) | 7 | Devuelven index.html en lugar de 404 |
| ❌ Fallo | 4 | 404 (esperado para rutas inexistentes) |

---

## Rutas correctas (20)

| Ruta | Status | Content-Type | Tamaño | Archivo real |
|------|--------|-------------|--------|-------------|
| `/` | 200 | text/html | 30KB | `index.html` |
| `/index.html` | 200 | text/html | 30KB | `index.html` |
| `/login.html` | 200 | text/html | 20KB | `login.html` |
| `/admin.html` | 200 | text/html | 62KB | `admin.html` |
| `/roulette.html` | 200 | text/html | 38KB | `roulette.html` |
| `/verify-email.html` | 200 | text/html | 5KB | `verify-email.html` |
| `/overlays/overlay-timer.html` | 200 | text/html | 25KB | Overlay real |
| `/overlays/overlay-generic.html` | 200 | text/html | 13KB | Overlay real |
| `/overlays/overlay-goal.html` | 200 | text/html | 7KB | Overlay real |
| `/overlays/overlay-sounds.html` | 200 | text/html | 4KB | Overlay real |
| `/overlays/overlay-timer-extendable.html` | 200 | text/html | 6KB | Overlay real |
| `/overlays/overlay-actions.html` | 200 | text/html | 8KB | Overlay real |
| `/overlays/overlay-tts.html` | 200 | text/html | 4KB | Overlay real |
| `/overlays/overlay-ruleta.html` | 200 | text/html | 9KB | Overlay real |
| `/overlays/overlay-participantes.html` | 200 | text/html | 7KB | Overlay real |
| `/api/health` | 200 | application/json | 92B | API |
| `/main.js` | 200 | text/javascript | 21KB | Módulo |
| `/modules/auth.js` | 200 | text/javascript | 9KB | Módulo |
| `/styles.css` | 200 | text/css | 56KB | CSS |
| `/app-styles.css` | 200 | text/css | 9KB | CSS |

---

## Rutas problemáticas (7) — CORREGIR EN FASE 1

| Ruta | Status | Content-Type | Tamaño | Problema |
|------|--------|-------------|--------|----------|
| `/overlay-timer.html` | 200 | text/html | 30KB | **Falso 200** — No existe en raíz. SPA fallback sirve index.html |
| `/overlay-ruleta.html` | 200 | text/html | 30KB | **Falso 200** — No existe en raíz |
| `/overlay-participantes.html` | 200 | text/html | 30KB | **Falso 200** — No existe en raíz |
| `/dashboard` | 200 | text/html | 30KB | **Falso 200** — Ruta no implementada (arquitectónico, no Fase 1) |
| `/register` | 200 | text/html | 30KB | **Falso 200** — Ruta no implementada |
| `/payments` | 200 | text/html | 30KB | **Falso 200** — Ruta no implementada |
| `/chat` | 200 | text/html | 30KB | **Falso 200** — Ruta no implementada |

---

## Ruta `/overlay/:userId` — ELIMINAR EN FASE 1

| Ruta | Status | Content-Type | Respuesta |
|------|--------|-------------|-----------|
| `/overlay/1` | 404 | application/json | `{"error":"ENOENT: no such file or directory, stat 'frontend/overlay.html'"}` |

La ruta existe en `server-new.js:245-247` pero `frontend/overlay.html` no existe en disco. Devuelve error 500/404.

---

## Referencias rotas identificadas

| # | Archivo | Línea | Código actual | Debería ser | Riesgo |
|---|---------|-------|---------------|-------------|--------|
| 1 | `frontend/index.html` | 430 | `src="/overlay-timer.html"` | `src="/overlays/overlay-timer.html"` | **Alto** — iframe carga index.html sobre sí mismo |
| 2 | `frontend/index.html` | 678 | `file: '/overlay-timer.html'` | `file: '/overlays/overlay-timer.html'` | **Alto** — URL copiada a OBS es incorrecta |
| 3 | `frontend/index.html` | 684 | `file: '/overlay-timer.html'` | `file: '/overlays/overlay-generic.html'` | **Alto** — Leaderboard apunta al timer en vez del genérico |
| 4 | `frontend/roulette.html` | 325 | `href="/overlay-ruleta.html"` | `href="/overlays/overlay-ruleta.html"` | **Medio** — Link roto en panel de ruleta |
| 5 | `frontend/roulette.html` | 332 | `href="/overlay-participantes.html"` | `href="/overlays/overlay-participantes.html"` | **Medio** — Link roto |
| 6 | `frontend/roulette.html` | 415 | `href="/overlay-ruleta.html"` | `href="/overlays/overlay-ruleta.html"` | **Medio** — Link roto en stats |
| 7 | `frontend/roulette.html` | 416 | `href="/overlay-participantes.html"` | `href="/overlays/overlay-participantes.html"` | **Medio** — Link roto |
| 8 | `frontend/roulette.html` | 663 | `/overlay-timer.html` | `/overlays/overlay-timer.html` | **Medio** — URL generada para OBS incorrecta |
| 9 | `server-new.js` | 245-247 | `app.get('/overlay/:userId', ...)` | **Eliminar** | **Medio** — Ruta muerta, archivo no existe |

---

## Overlays funcionales (NO TOCAR)

Estas URLs funcionan correctamente y no deben modificarse:

```
/overlays/overlay-timer.html         ✅ 200 (25KB)
/overlays/overlay-goal.html          ✅ 200 (7KB)
/overlays/overlay-sounds.html         ✅ 200 (4KB)
/overlays/overlay-timer-extendable.html ✅ 200 (6KB)
/overlays/overlay-actions.html        ✅ 200 (8KB)
/overlays/overlay-tts.html            ✅ 200 (4KB)
/overlays/overlay-ruleta.html         ✅ 200 (9KB)
/overlays/overlay-participantes.html   ✅ 200 (7KB)
/overlays/overlay-generic.html        ✅ 200 (13KB)
```
