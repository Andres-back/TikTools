# Fase 1 — Reparación de Rutas Frontend

**Fecha:** 15 Julio 2026
**Rama:** `fix/frontend-routes-phase-0-1`

---

## Cambios realizados

### Commit 1: `b6f2d5e` — fix broken overlay URLs

| Archivo | Línea | Cambio |
|---------|-------|--------|
| `frontend/index.html` | 430 | `src="/overlay-timer.html"` → `src="/overlays/overlay-timer.html"` |
| `frontend/index.html` | 678 | `file: '/overlay-timer.html'` → `file: '/overlays/overlay-timer.html'` |
| `frontend/index.html` | 684 | `file: '/overlay-timer.html'` → `file: '/overlays/overlay-generic.html'` |
| `frontend/roulette.html` | 325 | `href="/overlay-ruleta.html"` → `href="/overlays/overlay-ruleta.html"` |
| `frontend/roulette.html` | 332 | `href="/overlay-participantes.html"` → `href="/overlays/overlay-participantes.html"` |
| `frontend/roulette.html` | 415 | `href="/overlay-ruleta.html"` → `href="/overlays/overlay-ruleta.html"` |
| `frontend/roulette.html` | 416 | `href="/overlay-participantes.html"` → `href="/overlays/overlay-participantes.html"` |
| `frontend/roulette.html` | 663 | `/overlay-timer.html` → `/overlays/overlay-timer.html` |

### Commit 2: `581e7ba` — remove dead route

| Archivo | Líneas | Cambio |
|---------|--------|--------|
| `server-new.js` | 244-247 | Eliminado `app.get('/overlay/:userId', ...)` |

---

## Verificación

### Rutas que siguen funcionando (sin cambios)

```
/overlays/overlay-timer.html          ✅ 200 (25KB)
/overlays/overlay-goal.html           ✅ 200 (7KB)
/overlays/overlay-sounds.html         ✅ 200 (4KB)
/overlays/overlay-timer-extendable.html ✅ 200 (6KB)
/overlays/overlay-actions.html        ✅ 200 (8KB)
/overlays/overlay-tts.html            ✅ 200 (4KB)
/overlays/overlay-ruleta.html         ✅ 200 (9KB)
/overlays/overlay-participantes.html  ✅ 200 (7KB)
/overlays/overlay-generic.html        ✅ 200 (13KB)
```

### Rutas corregidas

| Ruta | Antes | Después |
|------|-------|---------|
| `/overlays/overlay-timer.html` (iframe) | No se usaba (iframe apuntaba a raíz) | ✅ Ahora el iframe carga el overlay real |
| `/overlays/overlay-timer.html` (OVERLAY_MAP) | URL incorrecta para OBS | ✅ URL correcta |
| `/overlays/overlay-generic.html` (leaderboard) | Apuntaba al timer | ✅ Apunta al overlay genérico |
| `/overlays/overlay-ruleta.html` (links) | 3 links rotos | ✅ Todos corregidos |
| `/overlays/overlay-participantes.html` (links) | 3 links rotos | ✅ Todos corregidos |
| `/overlay/:userId` | Ruta muerta (404) | ✅ Eliminada |
