# Matriz de Endpoints y Permisos - TikToolStream

## Leyenda
- 🔓 = Público (sin autenticación)
- 🔐 = Requiere JWT (cualquier rol)
- 🔑 = Requiere JWT + rol específico
- 🔴 = Inseguro (debe corregirse)

---

## Autenticación (`/api/auth`)

| Endpoint | Método | Auth | Validación | Rate Limit | Estado |
|----------|--------|------|------------|------------|--------|
| `/api/auth/register` | POST | 🔓 | Email debe ser @gmail.com, password ≥ 6 chars | ❌ No | ⚠️ |
| `/api/auth/login` | POST | 🔓 | Fields required | ❌ No | ⚠️ |
| `/api/auth/refresh` | POST | 🔓 | Refresh token en body | ❌ No | ✅ |
| `/api/auth/verify` | GET | 🔓 | Token en query | ❌ No | ✅ |
| `/api/auth/logout` | POST | 🔐 | — | ❌ No | ✅ |
| `/api/auth/profile` | GET | 🔐 | — | ❌ No | ✅ |
| `/api/auth/profile` | PUT | 🔐 | displayName, avatarUrl | ❌ No | ✅ |
| `/api/auth/password` | PUT | 🔐 | currentPassword, newPassword (≥6 chars) | ❌ No | ✅ |

---

## Setup/Debug 🔴

| Endpoint | Método | Auth Actual | Auth Requerida | Riesgo |
|----------|--------|-------------|----------------|--------|
| `/api/setup/reset-users-force` | GET | 🔴 `?secret=lolkjk12_RESET` | 🔑 admin | Destruye TODOS los usuarios |
| `/api/setup/manually-verify` | GET | 🔴 `?secret=lolkjk12_RESET` | 🔑 admin | Bypass verificación email |
| `/api/setup/debug-email` | GET | 🔴 `?secret=lolkjk12_RESET` | 🔑 admin | Expone stack+credenciales |
| `/api/setup/create-admin` | POST | 🔴 `?secret=lolkjk12_RESET` | 🔑 admin | Creación admin no autorizada |
| `/api/debug/uploads` | GET | 🔓 | 🔑 admin | Enumera archivos del servidor |
| `/api/debug/file-exists/:filename` | GET | 🔓 | 🔑 admin | Path traversal limitado |

---

## Admin (`/api/admin`)

| Endpoint | Método | Auth | Permisos | Notas |
|----------|--------|------|----------|-------|
| `/api/admin/dashboard` | GET | 🔐 | 🔑 admin | — |
| `/api/admin/users` | GET | 🔐 | 🔑 admin | Filtros: search, status, plan, page, limit |
| `/api/admin/users/:id` | GET | 🔐 | 🔑 admin | Incluye historial, pagos, stats |
| `/api/admin/users` | POST | 🔐 | 🔑 admin | Crear usuario |
| `/api/admin/users/:id` | PUT | 🔐 | 🔑 admin | Actualizar campos |
| `/api/admin/users/:id` | DELETE | 🔐 | 🔑 admin | No permite eliminar admins |
| `/api/admin/users/:id/add-days` | POST | 🔐 | 🔑 admin | Añadir días, body: {days, planType} |
| `/api/admin/users/:id/remove-days` | POST | 🔐 | 🔑 admin | Quitar días |
| `/api/admin/users/:id/toggle-status` | POST | 🔐 | 🔑 admin | Activar/desactivar |
| `/api/admin/users/:id/reset-password` | POST | 🔐 | 🔑 admin | Resetear contraseña |
| `/api/admin/users/:id/role` | PUT | 🔐 | 🔑 admin | Cambiar rol |
| `/api/admin/chats` | GET | 🔐 | 🔑 admin | Bandeja de conversaciones |
| `/api/admin/chats/:userId/read` | POST | 🔐 | 🔑 admin | Marcar como leído |
| `/api/admin/chats/:userId` | DELETE | 🔐 | 🔑 admin | Eliminar conversación |

---

## Pagos (`/api/payments`)

| Endpoint | Método | Auth | Notas |
|----------|--------|------|-------|
| `/api/payments/plans` | GET | 🔓 | Lista planes disponibles |
| `/api/payments/plan-status` | GET | 🔐 | Estado del plan del usuario |
| `/api/payments/create-order` | POST | 🔐 | Crea orden pendiente |
| `/api/payments/capture-order` | POST | 🔐 | Captura pago PayPal |
| `/api/payments/history` | GET | 🔐 | Historial de pagos |

---

## Subastas (`/api/auctions`)

| Endpoint | Método | Auth | Plan | Notas |
|----------|--------|------|------|-------|
| `/api/auctions` | GET | 🔐 | ❌ | Lista subastas del usuario |
| `/api/auctions/:id` | GET | 🔐 | ❌ | Detalle con donors y gifts |
| `/api/auctions` | POST | 🔐 | ✅ checkPlan | Crear subasta |
| `/api/auctions/:id` | PUT | 🔐 | ❌ | Actualizar subasta |
| `/api/auctions/:id` | DELETE | 🔐 | ❌ | Eliminar subasta |
| `/api/auctions/:id/gifts` | POST | 🔐 | ❌ | Registrar regalo |
| `/api/auctions/:id/finish` | POST | 🔐 | ❌ | Finalizar y declarar ganador |
| `/api/stats` | GET | 🔐 | ❌ | Estadísticas del usuario |

---

## Noticias (`/api/news`)

| Endpoint | Método | Auth | Notas |
|----------|--------|------|-------|
| `/api/news` | GET | 🔓 | Público |
| `/api/news` | POST | 🔐 + 🔑 admin | Crear noticia |
| `/api/news/:id` | DELETE | 🔐 + 🔑 admin | Eliminar noticia |
| `/api/news/check/:filename` | GET | 🔓 | Verifica archivo — 🔴 Sin auth |
| `/api/news/cleanup` | POST | 🔐 + 🔑 admin | Limpiar imágenes huérfanas |

---

## Chat (`/api/chat`)

| Endpoint | Método | Auth | Notas |
|----------|--------|------|-------|
| `/api/chat/:userId` | GET | 🔐 + ownership | Solo el usuario o admin |
| `/api/chat` | POST | 🔐 | Soporta JSON y multipart |
| `/api/chat/:messageId/read` | PATCH | 🔐 | Marcar como leído |
| `/api/chat/cleanup` | POST | 🔐 + 🔑 admin | Limpiar imágenes huérfanas |

---

## Overlays (`/api/overlays`)

| Endpoint | Método | Auth | Notas |
|----------|--------|------|-------|
| `/api/overlays/my` | GET | 🔐 | Config del usuario actual |
| `/api/overlays/:identifier` | GET | 🔓 | Config por ID o username |
| `/api/overlays` | POST | 🔐 | Guardar con upload de imágenes |
| `/api/overlays/check/:filename` | GET | 🔓 | Verifica archivo — 🔴 Sin auth |

---

## Ruleta (`/api/roulette`)

| Endpoint | Método | Auth | Notas |
|----------|--------|------|-------|
| `/api/roulette/participants` | GET | 🔐 | Lista participantes |
| `/api/roulette/participants` | POST | 🔐 | Agregar/actualizar |
| `/api/roulette/participants/:uniqueId` | DELETE | 🔐 | Eliminar participante |
| `/api/roulette/participants/:uniqueId/eliminate` | POST | 🔐 | Reducir entrada |
| `/api/roulette/reset` | DELETE | 🔐 | Reiniciar juego |
| `/api/roulette/config` | GET | 🔐 | Obtener configuración |
| `/api/roulette/config` | PUT | 🔐 | Actualizar configuración |
| `/api/roulette/winners` | GET | 🔐 | Historial de ganadores |

> **⚠️ NOTA:** El módulo de ruleta (`src/modules/roulette/routes.js`) existe pero **NO ESTÁ MONTADO** en `server-new.js`. No hay `app.use('/api/roulette', rouletteRoutes)`.

---

## WebSocket

| Endpoint | Auth | Notas |
|----------|------|-------|
| `/live` | 🔓 | Sin autenticación. Cualquier cliente puede conectarse y recibir datos de gifts. |

---

## Health

| Endpoint | Método | Auth | Notas |
|----------|--------|------|-------|
| `/api/health` | GET | 🔓 | Verifica DB, retorna estado |

---

## Resumen de Endpoints Inseguros (P0)

| Endpoint | Problema | Solución |
|----------|----------|----------|
| `/api/setup/*` (4 endpoints) | Secreto hardcodeado `lolkjk12_RESET` en query string | Reemplazar con JWT + rol admin |
| `/api/debug/*` (2 endpoints) | Sin auth, expone rutas absolutas | Eliminar o proteger con admin JWT |
| `/api/news/check/:filename` | Sin auth, enumera archivos | Añadir auth o eliminar |
| `/api/overlays/check/:filename` | Sin auth, enumera archivos | Añadir auth o eliminar |
| `/live` (WebSocket) | Sin auth, datos de gifts públicos | Añadir verificación de sesión |
