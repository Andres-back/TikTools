# Handoff — Fase 2 Frontend

---

## Estado actual

### ✅ Completado en Fase 0-1

1. **Caracterización de 31 rutas** — documentadas con status, content-type y tamaño
2. **8 URLs rotas corregidas** en `index.html` (3) y `roulette.html` (5)
3. **Ruta muerta eliminada** (`/overlay/:userId`)
4. **9 overlays funcionales** confirmados bajo `/overlays/`
5. **20/21 tests de regresión pasan**
6. **SPA fallback intacto** (se retirará en fase posterior)
7. **Sin cambios en BD, WebSocket ni arquitectura**

### Rama de trabajo

```
fix/frontend-routes-phase-0-1
└── cleanup/remove-duplicates-and-reorganize (base)
```

---

## Próximos pasos (Fase 2)

### Objetivo
Crear servicios frontend centralizados SIN cambiar layout ni navegación.

### Archivos a crear

```
frontend/shared/
├── api.js          ← Cliente HTTP con fetch + JWT + refresh + AbortSignal
├── auth.js         ← Auth service (login, logout, token management, guards)
├── ws.js           ← WebSocket centralizado con reconexión automática
├── sanitize.js     ← Sanitización HTML
├── toast.js        ← Sistema de notificaciones toast
└── event-bus.js    ← Pub/sub para comunicación entre componentes
```

### Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `frontend/index.html` | Reemplazar imports de `./modules/` por `./shared/` |
| `frontend/roulette.html` | (igual) |
| `frontend/admin.html` | Reemplazar `apiCall` inline por `shared/api.js` |
| `frontend/login.html` | Usar `shared/auth.js` |

### Mantener compatibilidad

```js
// modules/auth.js → se convierte en re-exportador:
export { login, logout, getAccessToken, ... } from '../shared/auth.js';
```

---

## Riesgos pendientes

| Riesgo | Severidad | Notas |
|--------|-----------|-------|
| SPA fallback global oculta 404s | Media | Se retirará en Fase 3 (nuevo shell) |
| 14 rutas falsas devuelven index.html | Media | Se resolverá con el router de Fase 3 |
| Duplicación de sidebar/header | Media | Se resuelve en Fase 3 con shell único |
| Seguridad de overlays (userId en URL) | Alta | Se resuelve en Fase 5 con claves |
| Iframe aún carga overlay con userId en URL | Media | Se resuelve en Fase 5 |

---

## Recomendación

**FASE 0 Y 1 APROBADAS; PUEDE INICIARSE FASE 2.**
