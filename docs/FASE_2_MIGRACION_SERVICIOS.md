# Fase 2 — Migración de Servicios Frontend

**Rama:** `refactor/frontend-shared-services-phase-2`

---

## 1. Servicios creados

| Servicio | Archivo | Propósito | Líneas |
|----------|---------|-----------|--------|
| API Client | `frontend/shared/api.js` | HTTP centralizado con JWT, refresh, AbortSignal, ApiError | ~120 |
| Auth Service | `frontend/shared/auth.js` | Login, registro, logout, tokens, guards, eventos | ~120 |
| WebSocket | `frontend/shared/ws.js` | Conexión WS con reconexión backoff, cola, estados | ~150 |
| Sanitize | `frontend/shared/sanitize.js` | escapeHtml, sanitizeText, sanitizeUrl, setText | ~65 |
| Toast | `frontend/shared/toast.js` | Notificaciones accesibles aria-live con dedup | ~100 |
| Event Bus | `frontend/shared/event-bus.js` | Pub/sub on/off/once/emit/clear | ~35 |

## 2. Adaptadores de compatibilidad creados

| Módulo legacy | Archivo | Tipo | Exportaciones preservadas |
|--------------|---------|------|--------------------------|
| `modules/auth.js` | Re-escrito | Re-exporta de `shared/auth.js` + `shared/api.js` | 24 funciones (idéntica interfaz) |
| `modules/broadcast.js` | Actualizado | Re-exporta de `shared/ws.js` | 3 funciones |

## 3. Dependencias rotas por módulo

| Módulo | Importa de | Afecta a | Estado |
|--------|-----------|----------|--------|
| `modules/auth.js` | (nadie, es importado) | `index.html`, `roulette.html`, `main.js`, `ui.js`, `roulette.js` | ✅ Compatible |
| `modules/broadcast.js` | (nadie, es importado) | `leaderboard.js`, `connection.js` | ✅ Compatible |

## 4. APIs de eventos publicados

| Evento | Emisor | Payload |
|--------|--------|---------|
| `auth:login` | `auth.js` | `{ accessToken, user }` |
| `auth:logout` | `auth.js` | — |
| `auth:refresh` | `auth.js` | — |
| `auth:expired` | `auth.js` (storage event) | — |
| `auth:user-updated` | `auth.js` | `user` |
| `ws:state` | `ws.js` | `'connected' | 'disconnected' | 'reconnecting' | ...` |
| `ws:message:*` | `ws.js` | Datos del mensaje deserializado |

## 5. Pruebas

| Suite | Resultado |
|-------|-----------|
| Smoke (Fase 2) | 15/15 passed |
| Regresión (Fase 1) | 21/21 passed |
