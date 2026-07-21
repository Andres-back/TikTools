# Handoff — Fase 3 Frontend

---

## Estado actual

### ✅ Completado en Fase 2

1. **6 servicios compartidos creados** en `frontend/shared/`:
   - `api.js` — Cliente HTTP central con JWT, refresh, AbortSignal
   - `auth.js` — Auth service con eventos (login/logout/refresh/expired)
   - `ws.js` — WebSocket centralizado con backoff y cola
   - `sanitize.js` — escapeHtml, sanitizeText, sanitizeUrl
   - `toast.js` — Notificaciones aria-live
   - `event-bus.js` — Pub/sub centralizado

2. **2 adaptadores de compatibilidad**:
   - `modules/auth.js` → re-exporta desde `shared/auth.js` + `shared/api.js`
   - `modules/broadcast.js` → re-exporta desde `shared/ws.js`

3. **Pruebas**: 36/36 tests pasan (15 smoke + 21 regresión)

### Rama de trabajo

```
refactor/frontend-shared-services-phase-2
└── fix/frontend-routes-phase-0-1
    └── cleanup/remove-duplicates-and-reorganize (base)
```

---

## Riesgos pendientes

| Riesgo | Severidad | Notas |
|--------|-----------|-------|
| 14 rutas falsas devuelven index.html (SPA fallback) | Media | Pendiente de Fase 3 |
| iframe aún carga con ruta relativa al usuario | Media | Se resuelve con shell de Fase 3 |
| innerHTML en 10 ubicaciones con datos de API | Alta | Documentado en MATRIZ_INNERHTML_Y_XSS.md |
| alert() en 10+ ubicaciones | Baja | Toast disponible para migración progresiva |
| login/register aún son inline en login.html | Media | Pendiente de migración a shared/auth.js |
| admin.html tiene apiCall inline duplicado | Media | Pendiente de migración a shared/api.js |
| Sin tests unitarios automatizados | Media | shared/ services listos para test unitario |

---

## Próximos pasos (Fase 3)

### Objetivo
Crear el shell SPA `/app/*` con router vanilla, layout compartido y vistas con URL propia.

### Archivos a crear

```
frontend/app/
├── index.html          ← Shell: sidebar + header + <main id="view">
├── css/
│   ├── variables.css
│   ├── layout.css
│   └── components.css
└── js/
    ├── router.js       ← Router History API
    └── views/
        ├── dashboard.js
        ├── auctions.js
        ├── auctions-new.js
        ├── auctions-detail.js
        ├── roulette.js
        ├── overlays.js
        ├── chat.js
        ├── payments.js
        ├── profile.js
        ├── settings.js
        ├── not-found.js
        └── forbidden.js
```

### Archivos a modificar

- `server-new.js`: Agregar rutas Express para `/app/*` con wildcard `/*splat`
- Mantener `frontend/index.html` como compatibilidad

### Pruebas necesarias
- Router navega entre vistas sin recargar
- popstate (atrás/adelante) funciona
- Las rutas antiguas siguen funcionando
- 21 tests de regresión de Fase 1 siguen pasando

---

## Recomendación

**FASE 2 APROBADA; PUEDE INICIARSE FASE 3.**
