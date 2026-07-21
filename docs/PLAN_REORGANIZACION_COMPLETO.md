# 📋 Plan Completo de Reorganización y Escalabilidad — TikToolStream

**Fecha**: Diciembre 23, 2025  
**Objetivo**: Limpiar, organizar y escalar la plataforma TikToolStream con arquitectura modular, base de datos centralizada, sistema de overlays avanzado e integración completa de ruleta.

---

## 📑 Índice

1. [Fase 1: Preparación y Estructura](#fase-1-preparación-y-estructura)
2. [Fase 2: Base de Datos Centralizada](#fase-2-base-de-datos-centralizada)
3. [Fase 3: Configuración y Variables de Entorno](#fase-3-configuración-y-variables-de-entorno)
4. [Fase 4: Servicios y Lógica de Negocio](#fase-4-servicios-y-lógica-de-negocio)
5. [Fase 5: Rutas y Controladores](#fase-5-rutas-y-controladores)
6. [Fase 6: WebSocket Centralizado](#fase-6-websocket-centralizado)
7. [Fase 7: Sistema de Overlays Avanzados](#fase-7-sistema-de-overlays-avanzados)
8. [Fase 8: Integración de Ruleta](#fase-8-integración-de-ruleta)
9. [Fase 9: Frontend y Módulos](#fase-9-frontend-y-módulos)
10. [Fase 10: Limpieza y Eliminación de Duplicados](#fase-10-limpieza-y-eliminación-de-duplicados)
11. [Fase 11: Testing y Validación](#fase-11-testing-y-validación)
12. [Fase 12: Deployment](#fase-12-deployment)

---

## 🎯 Fase 1: Preparación y Estructura

### 1.1 Crear rama de desarrollo
- [ ] Ejecutar: `git checkout -b refactor/reorganization`
- [ ] Verificar rama activa: `git branch`
- [ ] Crear backup local de archivos críticos

### 1.2 Crear estructura de carpetas
```bash
mkdir -p src/{config,database/migrations,services,routes,controllers,middleware,websocket/events,utils}
mkdir -p frontend/src/{components,modules,overlays,services,styles,utils}
mkdir -p tests/{unit,integration,fixtures}
mkdir -p docs
```

**Tareas:**
- [ ] Crear carpeta `src/config` para configuraciones centralizadas
- [ ] Crear carpeta `src/database/migrations` para migraciones versionadas
- [ ] Crear carpeta `src/services` para lógica de negocio reutilizable
- [ ] Crear carpeta `src/routes` para rutas de API
- [ ] Crear carpeta `src/controllers` para controladores
- [ ] Crear carpeta `src/middleware` para middlewares personalizados
- [ ] Crear carpeta `src/websocket/events` para handlers de eventos WS
- [ ] Crear carpeta `src/utils` para funciones auxiliares
- [ ] Crear carpeta `frontend/src` para código frontend modular
- [ ] Crear carpeta `tests` con subcarpetas unit e integration

### 1.3 Documentar cambios
- [ ] Crear `docs/ARCHITECTURE.md` con visión general de la arquitectura
- [ ] Crear `docs/STRUCTURE.md` explicando la nueva estructura
- [ ] Crear `docs/MIGRATION.md` con guía de migración paso a paso

---

## 🗄️ Fase 2: Base de Datos Centralizada

### 2.1 Crear schema SQL único y definitivo

**Archivo**: `src/database/schema.sql`

**Tareas:**
- [ ] Crear tabla `users` con campos: id, username, email, password_hash, tiktok_id, tiktok_username, plan_id, status, avatar_url, created_at, updated_at, last_login
- [ ] Crear tabla `plans` con campos: id, name, price, features (JSONB), max_overlays, max_auctions, custom_css, advanced_analytics, support_priority
- [ ] Crear tabla `overlays` con campos: id, user_id, name, type, config (JSONB), images (JSONB), css_custom, is_active, created_at, updated_at
- [ ] Crear tabla `roulette_games` con campos: id, user_id, status, segments, current_spin_result, total_spins, created_at, updated_at
- [ ] Crear tabla `roulette_entries` con campos: id, game_id, user_tiktok_id, username, gift_count, entry_time
- [ ] Crear tabla `auctions` con campos: id, user_id, title, description, current_price, starting_price, status, start_time, end_time, created_at, updated_at
- [ ] Crear tabla `auction_bids` con campos: id, auction_id, bidder_name, bidder_tiktok_id, amount, bid_time
- [ ] Crear tabla `gift_events` con campos: id, user_id, sender_tiktok_id, sender_username, gift_name, gift_count, coin_value, total_coins, processed_at, duplicated
- [ ] Crear tabla `coin_ledger` con campos: id, user_id, tiktok_user_id, tiktok_username, coins_earned, coins_spent, total_coins, rank, updated_at
- [ ] Crear tabla `chat_messages` con campos: id, user_id, sender_name, sender_tiktok_id, message, is_pinned, created_at
- [ ] Crear tabla `transactions` con campos: id, user_id, type, amount, currency, status, payment_method, external_transaction_id, created_at, updated_at
- [ ] Crear tabla `news` con campos: id, user_id, title, content, is_active, created_at, updated_at

### 2.2 Crear tablas para sesiones en vivo

**Tareas:**
- [ ] Crear tabla `live_sessions` con campos: id, user_id, session_token, status, started_at, ended_at, total_coins, total_likes
- [ ] Crear tabla `session_top_donors` con campos: id, session_id, tiktok_user_id, username, avatar_url, total_coins, donation_count, rank, updated_at
- [ ] Crear tabla `session_top_likes` con campos: id, session_id, tiktok_user_id, username, avatar_url, like_count, rank, updated_at
- [ ] Crear tabla `session_gifts_of_day` con campos: id, session_id, gift_name, gift_icon_url, total_count, total_coins, main_donor_id, main_donor_username, main_donor_avatar, last_received_at
- [ ] Crear tabla `session_combos` con campos: id, session_id, gift_name, gift_icon_url, combo_count, last_sender_id, last_sender_username, last_sender_avatar, last_sent_at, combo_started_at
- [ ] Crear tabla `overlay_configs` con campos: id, user_id, overlay_type, enabled, position, animation, duration_seconds, theme, custom_css, custom_colors (JSONB), created_at, updated_at

### 2.3 Crear índices para optimización

**Tareas:**
- [ ] Crear índice en `overlays.user_id`
- [ ] Crear índice en `overlays(user_id, is_active)`
- [ ] Crear índice en `roulette_games.user_id`
- [ ] Crear índice en `roulette_entries.game_id`
- [ ] Crear índice en `auctions.user_id`
- [ ] Crear índice en `auction_bids.auction_id`
- [ ] Crear índice en `gift_events.user_id`
- [ ] Crear índice en `coin_ledger.user_id`
- [ ] Crear índice en `coin_ledger.rank`
- [ ] Crear índice en `chat_messages.user_id`
- [ ] Crear índice en `chat_messages.created_at`
- [ ] Crear índice en `transactions.user_id`
- [ ] Crear índice en `transactions.status`
- [ ] Crear índice en `live_sessions.user_id`
- [ ] Crear índice en `live_sessions.status`
- [ ] Crear índice en `session_top_donors.session_id`
- [ ] Crear índice en `session_top_likes.session_id`
- [ ] Crear índice en `session_gifts_of_day.session_id`
- [ ] Crear índice en `session_combos.session_id`
- [ ] Crear índice en `overlay_configs.user_id`

### 2.4 Insertar datos iniciales

**Tareas:**
- [ ] Insertar planes default: Free (1 overlay, 3 auctions), Pro (5 overlays, 20 auctions, custom_css), VIP (20 overlays, 100 auctions, priority_support)
- [ ] Crear seed script para usuarios de prueba
- [ ] Crear seed script para regalos predefinidos

### 2.5 Crear migraciones versionadas

**Archivo**: `src/database/migrations/001_init.sql`
- [ ] Migración inicial con todas las tablas base

**Archivo**: `src/database/migrations/002_live_sessions.sql`
- [ ] Migración para tablas de sesiones en vivo

**Archivo**: `src/database/migrations/003_indexes.sql`
- [ ] Migración para crear todos los índices

---

## ⚙️ Fase 3: Configuración y Variables de Entorno

### 3.1 Crear archivo de configuración centralizado

**Archivo**: `src/config/env.js`

**Tareas:**
- [ ] Crear función `required()` para validar variables obligatorias
- [ ] Crear función `optional()` para variables opcionales
- [ ] Exportar: NODE_ENV, PORT, HOST
- [ ] Exportar: DATABASE_URL, DATABASE_SSL
- [ ] Exportar: JWT_SECRET, JWT_EXPIRY
- [ ] Exportar: TIKTOK_SESSION_ID (deprecated, preparar para OAuth)
- [ ] Exportar: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
- [ ] Exportar: STRIPE_SECRET, STRIPE_PUBLIC
- [ ] Exportar: UPLOAD_DIR, MAX_FILE_SIZE
- [ ] Exportar: LOG_LEVEL, CORS_ORIGINS

### 3.2 Crear logger centralizado

**Archivo**: `src/config/logger.js`

**Tareas:**
- [ ] Crear función `info()` para logs informativos
- [ ] Crear función `error()` para logs de error
- [ ] Crear función `warn()` para logs de advertencia
- [ ] Crear función `debug()` para logs de debug
- [ ] Añadir timestamp a cada log
- [ ] Hacer compatible con múltiples canales (console, file, etc.)

### 3.3 Crear conexión centralizada a BD

**Archivo**: `src/config/database.js`

**Tareas:**
- [ ] Crear pool de conexiones PostgreSQL (o sqlite si es desarrollo)
- [ ] Implementar `pool.on('error')` para manejar desconexiones
- [ ] Implementar `pool.on('connect')` para logging
- [ ] Exportar `query()` y `transaction()` methods
- [ ] Agregar manejo de SSL para producción

### 3.4 Crear archivo `.env.example`

**Archivo**: `.env.example`

**Tareas:**
- [ ] Documentar todas las variables de entorno
- [ ] Proporcionar valores de ejemplo
- [ ] Marcar cuáles son requeridas vs opcionales
- [ ] Incluir valores recomendados para desarrollo vs producción

### 3.5 Crear archivo `.env.production`

**Tareas:**
- [ ] Copiar `.env.example` a `.env.production`
- [ ] Rellenar valores reales de producción
- [ ] NO commitear a git (añadir a `.gitignore`)
- [ ] Documentar dónde obtener valores (ej: secrets manager, vault, etc.)

---

## 🔧 Fase 4: Servicios y Lógica de Negocio

### 4.1 Crear servicio de autenticación

**Archivo**: `src/services/auth.service.js`

**Tareas:**
- [ ] Implementar `registerUser()` - crear nuevo usuario con hash de contraseña
- [ ] Implementar `loginUser()` - validar credenciales y generar JWT
- [ ] Implementar `validateJWT()` - verificar token válido
- [ ] Implementar `refreshToken()` - generar nuevo token
- [ ] Implementar `changePassword()` - cambiar contraseña
- [ ] Implementar `resetPassword()` - recuperación de contraseña
- [ ] Implementar `deleteUser()` - eliminar cuenta de usuario
- [ ] Agregar logging para todos los eventos de auth

### 4.2 Crear servicio de overlays

**Archivo**: `src/services/overlay.service.js`

**Tareas:**
- [ ] Implementar `createOverlay()` - crear nuevo overlay
- [ ] Implementar `getOverlaysByUser()` - obtener overlays de un usuario
- [ ] Implementar `updateOverlay()` - actualizar configuración
- [ ] Implementar `deleteOverlay()` - eliminar overlay
- [ ] Implementar `uploadOverlayImage()` - subir imagen para overlay
- [ ] Implementar `getOverlayConfig()` - obtener configuración completa
- [ ] Implementar `validateOverlayQuota()` - verificar límite de overlays según plan
- [ ] Implementar `serveOverlayImage()` - servir imagen con URL correcta

### 4.3 Crear servicio de ruleta

**Archivo**: `src/services/roulette.service.js`

**Tareas:**
- [ ] Implementar `startGame()` - iniciar nuevo juego de ruleta
- [ ] Implementar `addEntry()` - añadir entrada de regalo a ruleta
- [ ] Implementar `getEntries()` - obtener todas las entradas
- [ ] Implementar `spin()` - ejecutar giro de ruleta (cálculo de ganador)
- [ ] Implementar `getHistory()` - historial de juegos
- [ ] Implementar `getGameStats()` - estadísticas del juego
- [ ] Implementar `resetGame()` - resetear juego actual
- [ ] Agregar lógica de pesos (más regalos = más probabilidad)

### 4.4 Crear servicio de subastas

**Archivo**: `src/services/auction.service.js`

**Tareas:**
- [ ] Implementar `createAuction()` - crear nueva subasta
- [ ] Implementar `getAuctionsByUser()` - obtener subastas de usuario
- [ ] Implementar `placeBid()` - realizar oferta
- [ ] Implementar `getBidHistory()` - historial de ofertas
- [ ] Implementar `finishAuction()` - terminar subasta y declarar ganador
- [ ] Implementar `pauseAuction()` - pausar subasta
- [ ] Implementar `cancelAuction()` - cancelar subasta
- [ ] Implementar `getTopBidder()` - obtener oferta más alta actual

### 4.5 Crear servicio de pagos

**Archivo**: `src/services/payment.service.js`

**Tareas:**
- [ ] Implementar `createCheckoutSession()` - crear sesión de pago (Stripe)
- [ ] Implementar `webhookHandler()` - procesar webhooks de Stripe
- [ ] Implementar `getTransactionHistory()` - historial de transacciones
- [ ] Implementar `refund()` - procesar reembolso
- [ ] Implementar `upgradeToProPlan()` - cambiar a plan Pro
- [ ] Implementar `upgradeToVIPPlan()` - cambiar a plan VIP
- [ ] Implementar `validatePayment()` - validar pago completado
- [ ] Crear logs de todas las transacciones

### 4.6 Crear servicio de TikTok

**Archivo**: `src/services/tiktok.service.js`

**Tareas:**
- [ ] Implementar `connectTikTokLive()` - conectar con TikTok Live
- [ ] Implementar `parseGiftEvent()` - parsear evento de regalo
- [ ] Implementar `parseLikeEvent()` - parsear evento de like
- [ ] Implementar `parseFollowEvent()` - parsear evento de follow
- [ ] Implementar `parseShareEvent()` - parsear evento de share
- [ ] Implementar `mapGiftToCoins()` - mapear regalo de TikTok a monedas
- [ ] Implementar `handleDisconnect()` - manejar desconexión
- [ ] Agregar reconnection logic con reintentos exponenciales

### 4.7 Crear servicio de email

**Archivo**: `src/services/email.service.js`

**Tareas:**
- [ ] Implementar `sendVerificationEmail()` - enviar email de verificación
- [ ] Implementar `sendPasswordResetEmail()` - enviar email de recuperación
- [ ] Implementar `sendAuctionNotification()` - notificación de subasta
- [ ] Implementar `sendPaymentReceipt()` - recibo de pago
- [ ] Implementar `sendMonthlyReport()` - reporte mensual
- [ ] Implementar `sendLiveAlert()` - alerta cuando usuario va en vivo
- [ ] Crear templates HTML para cada email
- [ ] Agregar envío async con cola

### 4.8 Crear servicio de planes y features

**Archivo**: `src/services/plan.service.js`

**Tareas:**
- [ ] Implementar `getPlanByUserId()` - obtener plan del usuario
- [ ] Implementar `checkFeatureAccess()` - validar si usuario tiene acceso a feature
- [ ] Implementar `getAvailableFeatures()` - listar features disponibles
- [ ] Implementar `upgradePlan()` - cambiar plan
- [ ] Implementar `downgradeAlert()` - alertar antes de downgrade
- [ ] Implementar `getUsageStats()` - estadísticas de uso (overlays, auctions, etc.)
- [ ] Crear constantes con features por plan

### 4.9 Crear servicio de sesiones en vivo

**Archivo**: `src/services/live-session.service.js`

**Tareas:**
- [ ] Implementar `startSession()` - iniciar sesión en vivo
- [ ] Implementar `endSession()` - terminar sesión
- [ ] Implementar `getActiveSession()` - obtener sesión activa
- [ ] Implementar `updateTopDonors()` - actualizar ranking de donadores
- [ ] Implementar `recalculateTopDonorsRanks()` - recalcular ranks
- [ ] Implementar `getTopDonors()` - obtener top 3 donadores
- [ ] Implementar `updateTopLikes()` - actualizar ranking de likes
- [ ] Implementar `getTopLikes()` - obtener top 3 likes
- [ ] Implementar `updateGiftOfDay()` - actualizar regalo del día
- [ ] Implementar `getGiftOfDay()` - obtener regalo principal
- [ ] Implementar `updateCombo()` - actualizar combo
- [ ] Implementar `getComboOfDay()` - obtener combo principal
- [ ] Implementar `cleanupSessionData()` - limpiar datos al desconectar
- [ ] Agregar cleanup automático después de 12 horas sin actividad

---

## 🛣️ Fase 5: Rutas y Controladores

### 5.1 Crear rutas de autenticación

**Archivo**: `src/routes/auth.routes.js`

**Tareas:**
- [ ] POST `/api/auth/register` - registrar usuario
- [ ] POST `/api/auth/login` - login
- [ ] POST `/api/auth/logout` - logout
- [ ] POST `/api/auth/refresh-token` - renovar token
- [ ] GET `/api/auth/profile` - obtener perfil del usuario
- [ ] PUT `/api/auth/profile` - actualizar perfil
- [ ] PUT `/api/auth/change-password` - cambiar contraseña
- [ ] POST `/api/auth/forgot-password` - recuperación de contraseña
- [ ] POST `/api/auth/reset-password/:token` - resetear contraseña
- [ ] DELETE `/api/auth/delete-account` - eliminar cuenta

**Archivo**: `src/controllers/auth.controller.js`

**Tareas:**
- [ ] Crear controlador para cada ruta
- [ ] Implementar validación de entrada
- [ ] Implementar manejo de errores
- [ ] Agregar logging de eventos
- [ ] Retornar respuestas JSON consistentes

### 5.2 Crear rutas de overlays

**Archivo**: `src/routes/overlays.routes.js`

**Tareas:**
- [ ] GET `/api/overlays` - listar overlays del usuario
- [ ] POST `/api/overlays` - crear overlay
- [ ] GET `/api/overlays/:overlayId` - obtener overlay específico
- [ ] PUT `/api/overlays/:overlayId` - actualizar overlay
- [ ] DELETE `/api/overlays/:overlayId` - eliminar overlay
- [ ] POST `/api/overlays/:overlayId/upload` - subir imagen
- [ ] GET `/api/overlays/:overlayId/embed` - obtener código embed
- [ ] GET `/api/overlays/live/start` - iniciar sesión en vivo
- [ ] POST `/api/overlays/live/end` - terminar sesión
- [ ] GET `/api/overlays/live/session` - obtener sesión activa
- [ ] GET `/api/overlays/live/:sessionId/top-donors` - top donadores
- [ ] GET `/api/overlays/live/:sessionId/top-likes` - top likes
- [ ] GET `/api/overlays/live/:sessionId/gift-of-day` - regalo del día
- [ ] GET `/api/overlays/live/:sessionId/combo-of-day` - combo del día

**Archivo**: `src/controllers/overlay.controller.js`

**Tareas:**
- [ ] Crear controlador para cada ruta
- [ ] Implementar validación de imágenes (formato, tamaño)
- [ ] Implementar validación de rutas absolutas para archivos
- [ ] Agregar logging de uploads
- [ ] Validar cuota de overlays según plan

### 5.3 Crear rutas de ruleta

**Archivo**: `src/routes/roulette.routes.js`

**Tareas:**
- [ ] POST `/api/roulette/start` - iniciar juego
- [ ] POST `/api/roulette/:gameId/entry` - añadir entrada
- [ ] GET `/api/roulette/:gameId/entries` - obtener entradas
- [ ] POST `/api/roulette/:gameId/spin` - ejecutar giro
- [ ] GET `/api/roulette/history` - historial de juegos
- [ ] GET `/api/roulette/:gameId/stats` - estadísticas del juego
- [ ] POST `/api/roulette/:gameId/reset` - resetear juego

**Archivo**: `src/controllers/roulette.controller.js`

**Tareas:**
- [ ] Implementar lógica de giro (cálculo de ganador)
- [ ] Validar que game existe y pertenece al usuario
- [ ] Emitir eventos WebSocket después de cada acción

### 5.4 Crear rutas de subastas

**Archivo**: `src/routes/auctions.routes.js`

**Tareas:**
- [ ] GET `/api/auctions` - listar subastas
- [ ] POST `/api/auctions` - crear subasta
- [ ] GET `/api/auctions/:auctionId` - obtener subasta
- [ ] PUT `/api/auctions/:auctionId` - actualizar subasta
- [ ] DELETE `/api/auctions/:auctionId` - eliminar subasta
- [ ] POST `/api/auctions/:auctionId/bid` - realizar oferta
- [ ] GET `/api/auctions/:auctionId/bids` - historial de ofertas
- [ ] POST `/api/auctions/:auctionId/finish` - terminar subasta
- [ ] POST `/api/auctions/:auctionId/pause` - pausar subasta

**Archivo**: `src/controllers/auction.controller.js`

**Tareas:**
- [ ] Implementar validaciones de ofertas
- [ ] Validar que nuevo bid > bid anterior
- [ ] Emitir WebSocket updates en tiempo real

### 5.5 Crear rutas de pagos

**Archivo**: `src/routes/payments.routes.js`

**Tareas:**
- [ ] POST `/api/payments/checkout` - crear sesión Stripe
- [ ] POST `/api/payments/webhook` - webhook de Stripe
- [ ] GET `/api/payments/transactions` - historial de transacciones
- [ ] GET `/api/payments/invoice/:transactionId` - obtener factura
- [ ] POST `/api/payments/refund/:transactionId` - solicitar reembolso
- [ ] GET `/api/payments/plans` - listar planes disponibles

**Archivo**: `src/controllers/payment.controller.js`

**Tareas:**
- [ ] Validar firma de webhook de Stripe
- [ ] Actualizar plan del usuario después de pago exitoso
- [ ] Crear registro de transacción en BD

### 5.6 Crear rutas de chat

**Archivo**: `src/routes/chat.routes.js`

**Tareas:**
- [ ] GET `/api/chat/messages` - obtener mensajes
- [ ] POST `/api/chat/messages` - enviar mensaje
- [ ] PUT `/api/chat/messages/:messageId/pin` - fijar mensaje
- [ ] DELETE `/api/chat/messages/:messageId` - eliminar mensaje
- [ ] GET `/api/chat/stats` - estadísticas de chat

### 5.7 Crear rutas de admin

**Archivo**: `src/routes/admin.routes.js`

**Tareas:**
- [ ] GET `/api/admin/users` - listar usuarios (solo admin)
- [ ] GET `/api/admin/users/:userId` - detalles de usuario
- [ ] PUT `/api/admin/users/:userId/plan` - cambiar plan del usuario
- [ ] PUT `/api/admin/users/:userId/suspend` - suspender usuario
- [ ] GET `/api/admin/analytics` - analytics globales
- [ ] GET `/api/admin/transactions` - historial de transacciones
- [ ] POST `/api/admin/emails` - enviar email masivo

### 5.8 Crear rutas de health check

**Archivo**: `src/routes/health.routes.js`

**Tareas:**
- [ ] GET `/api/health` - status del servidor
- [ ] GET `/api/health/ready` - readiness check (BD disponible)
- [ ] GET `/api/health/database` - estado de BD
- [ ] GET `/api/health/version` - versión de app

### 5.9 Agrupar todas las rutas

**Archivo**: `src/routes/index.js`

**Tareas:**
- [ ] Importar todas las rutas
- [ ] Registrar en orden: health, auth, protected routes
- [ ] Implementar middleware de autenticación global

---

## 🔌 Fase 6: WebSocket Centralizado

### 6.1 Crear servidor WebSocket principal

**Archivo**: `src/websocket/ws.js`

**Tareas:**
- [ ] Crear servidor Socket.io
- [ ] Implementar CORS configuration
- [ ] Implementar autenticación de socket (verificar JWT)
- [ ] Crear salas por usuario: `user_${userId}`
- [ ] Crear salas por sesión: `session_${sessionId}`
- [ ] Importar todos los handlers de eventos
- [ ] Registrar listeners de eventos
- [ ] Implementar manejo de desconexión
- [ ] Agregar logging de conexiones/desconexiones

### 6.2 Crear eventos de regalos

**Archivo**: `src/websocket/events/gift.events.js`

**Tareas:**
- [ ] Implementar `onGiftReceived()` - procesar regalo recibido
- [ ] Implementar `onGiftProcessed()` - regalo procesado
- [ ] Emitir eventos WebSocket a clientes relevantes
- [ ] Llamar a servicios de actualización (top donors, etc.)
- [ ] Agregar deduplicación de regalos

### 6.3 Crear eventos de ruleta

**Archivo**: `src/websocket/events/roulette.events.js`

**Tareas:**
- [ ] Implementar `onGiftForRoulette()` - añadir entrada a ruleta
- [ ] Implementar `onRouletteSpin()` - ejecutar giro
- [ ] Emitir `roulette:entry-added` a todos los clientes
- [ ] Emitir `roulette:result` con ganador
- [ ] Emitir `roulette:status-update` con estado actual

### 6.4 Crear eventos de overlays avanzados

**Archivo**: `src/websocket/events/advanced-overlays.events.js`

**Tareas:**
- [ ] Implementar `onGiftReceived()` - actualizar top donadores, regalo del día, combo
- [ ] Implementar `onLikeReceived()` - actualizar top likes
- [ ] Implementar `onFollowReceived()` - actualizar top followers (futuro)
- [ ] Implementar `onSessionEnd()` - limpiar datos y desconectar overlays
- [ ] Emitir evento `overlays:update` con todos los datos
- [ ] Incluir información de usuario (avatar, nombre)

### 6.5 Crear eventos de chat

**Archivo**: `src/websocket/events/chat.events.js`

**Tareas:**
- [ ] Implementar `onChatMessage()` - recibir y broadcast mensaje
- [ ] Implementar `onMessagePin()` - fijar mensaje
- [ ] Implementar `onMessageDelete()` - eliminar mensaje
- [ ] Emitir `chat:new-message` a todos los clientes
- [ ] Guardar en BD

### 6.6 Crear eventos de leaderboard

**Archivo**: `src/websocket/events/leaderboard.events.js`

**Tareas:**
- [ ] Implementar `onCoinUpdate()` - actualizar ranking de monedas
- [ ] Emitir `leaderboard:update` con top 10
- [ ] Recalcular ranks en tiempo real

### 6.7 Crear eventos de timer

**Archivo**: `src/websocket/events/timer.events.js`

**Tareas:**
- [ ] Implementar `onTimerTick()` - actualización de timer
- [ ] Implementar `onTimerStart()` - iniciar timer
- [ ] Implementar `onTimerStop()` - detener timer
- [ ] Emitir `timer:update` cada segundo
- [ ] Sincronizar tiempo de servidor

---

## 🎬 Fase 7: Sistema de Overlays Avanzados

### 7.1 Crear overlay de Top Donadores

**Archivo**: `frontend/src/overlays/overlay-top-donors.html`

**Tareas:**
- [ ] Crear estructura HTML con lista de 3 donadores
- [ ] Diseñar UI atractivo con gradientes y animaciones
- [ ] Implementar elemento de ranking (1º, 2º, 3º con colores diferentes)
- [ ] Mostrar avatar del usuario
- [ ] Mostrar nombre de usuario
- [ ] Mostrar cantidad de monedas total
- [ ] Mostrar cantidad de donaciones
- [ ] Agregar animación de slide-in cuando aparecen
- [ ] Conectar a WebSocket para updates en tiempo real
- [ ] Implementar auto-refresh cada 5 segundos
- [ ] Hacer responsive para diferentes resoluciones

**Archivo**: `frontend/src/overlays/overlay-top-donors.js`

**Tareas:**
- [ ] Crear cliente WebSocket
- [ ] Implementar `fetchTopDonors()` via API
- [ ] Implementar `renderDonors()` - renderizar lista
- [ ] Escuchar evento `overlays:update` del WebSocket
- [ ] Auto-actualizar cada 5 segundos
- [ ] Manejar estado vacío (no hay donadores aún)

### 7.2 Crear overlay de Top Likes

**Archivo**: `frontend/src/overlays/overlay-top-likes.html`

**Tareas:**
- [ ] Crear estructura HTML con lista de 3 likers
- [ ] Diseño con corazones y colores rosa/rojo
- [ ] Mostrar avatar, nombre, cantidad de likes
- [ ] Animación de aparición
- [ ] Elemento 404 cuando está vacío
- [ ] Responsive design

**Archivo**: `frontend/src/overlays/overlay-top-likes.js`

**Tareas:**
- [ ] Conectar a WebSocket
- [ ] Fetch y render de top likes
- [ ] Escuchar eventos de like
- [ ] Auto-actualizar

### 7.3 Crear overlay de Regalo del Día

**Archivo**: `frontend/src/overlays/overlay-gift-of-day.html`

**Tareas:**
- [ ] Crear estructura con gran visualización de regalo
- [ ] Mostrar icono/emoji del regalo
- [ ] Mostrar nombre del regalo
- [ ] Mostrar contador de veces recibido
- [ ] Mostrar total de monedas
- [ ] Mostrar card del donador principal con foto
- [ ] Diseño grandioso y atractivo
- [ ] Animación pop-in al aparecer

**Archivo**: `frontend/src/overlays/overlay-gift-of-day.js`

**Tareas:**
- [ ] Fetch regalo del día
- [ ] Renderizar con animaciones
- [ ] Escuchar WebSocket updates
- [ ] Auto-actualizar cada 5 segundos

### 7.4 Crear overlay de Combo del Día

**Archivo**: `frontend/src/overlays/overlay-combo-of-day.html`

**Tareas:**
- [ ] Crear display grande del número de combo
- [ ] Mostrar emoji de fuego o similar
- [ ] Mostrar nombre del regalo
- [ ] Mostrar último enviador con foto
- [ ] Diseño dinámico y emocionante
- [ ] Número grande pulsando

**Archivo**: `frontend/src/overlays/overlay-combo-of-day.js`

**Tareas:**
- [ ] Fetch combo actual
- [ ] Render con pulse animation
- [ ] WebSocket listener para updates
- [ ] Auto-refresh cada 3 segundos

### 7.5 Crear panel de configuración de overlays

**Archivo**: `frontend/src/components/OverlayConfig.js`

**Tareas:**
- [ ] Crear UI para activar/desactivar overlays
- [ ] Selector de posición (top-left, top-right, bottom-left, bottom-right, center)
- [ ] Selector de animación (slide-in, fade-in, bounce, pop)
- [ ] Selector de duración (en segundos)
- [ ] Selector de tema (dark, light, custom)
- [ ] Editor de CSS personalizado
- [ ] Selector de colores
- [ ] Botón de preview en vivo
- [ ] Guardar configuración

### 7.6 Crear tabla para mapeo de regalos

**Archivo**: `src/database/gifts-mapping.sql`

**Tareas:**
- [ ] Crear tabla `gift_mappings` con: tiktok_gift_id, gift_name, coin_value, icon_url
- [ ] Popular con todos los regalos de TikTok
- [ ] Crear índice en `tiktok_gift_id`
- [ ] Documentar cómo actualizar cuando TikTok añade nuevos regalos

---

## 🎡 Fase 8: Integración de Ruleta

### 8.1 Migrar código de ruleta de Nueva carpeta (3)

**Tareas:**
- [ ] Copiar lógica de `Nueva carpeta (3)/backend/giftNames.js` a `src/services/roulette.service.js`
- [ ] Copiar lógica de `Nueva carpeta (3)/frontend/overlay-ruleta.js` a `frontend/src/modules/roulette.module.js`
- [ ] Copiar HTML y estilos de `Nueva carpeta (3)/frontend/overlay-ruleta.html`
- [ ] Integrar gifts.json en BD
- [ ] Asegurar que API endpoints van a `/api/roulette`

### 8.2 Crear servicio integrado de ruleta

**Tareas:**
- [ ] Reutilizar `roulette.service.js` creado en Fase 4
- [ ] Conectar con `gift_events` para detectar regalos automáticamente
- [ ] Implementar lógica de pesos basada en cantidad de regalos
- [ ] Crear endpoints API para: start, spin, get entries, get results
- [ ] Emitir eventos WebSocket en tiempo real

### 8.3 Crear overlay de ruleta mejorado

**Archivo**: `frontend/src/overlays/overlay-roulette.html`

**Tareas:**
- [ ] Crear canvas para animación de ruleta
- [ ] Implementar rotación suave
- [ ] Mostrar entradas en tiempo real
- [ ] Mostrar ganador con animación especial
- [ ] Mostrar contador de entradas
- [ ] Botón para iniciar giro (solo streamer)
- [ ] Mostrar historial de últimos giros
- [ ] Responsive design

**Archivo**: `frontend/src/modules/roulette.module.js`

**Tareas:**
- [ ] Implementar lógica de canvas y rotación
- [ ] Crear función de dibujo de rueda
- [ ] Crear función de giro (animación)
- [ ] Conectar a WebSocket para updates
- [ ] Escuchar evento `roulette:entry-added`
- [ ] Escuchar evento `roulette:result`
- [ ] Procesar regalos entrantes automáticamente

### 8.4 Integrar ruleta con pipeline de regalos

**Tareas:**
- [ ] Cuando se recibe regalo → check si hay sesión de ruleta activa
- [ ] Si sí → agregar entrada automáticamente via WebSocket
- [ ] Emitir evento `roulette:entry-added`
- [ ] Todos los overlays de ruleta se actualizan en tiempo real
- [ ] Crear configuración para: auto-start ruleta, duración de ruleta

### 8.5 Crear endpoint para iniciar ruleta automáticamente

**Tareas:**
- [ ] POST `/api/roulette/start-on-gift` - iniciar ruleta cuando se recibe primer regalo
- [ ] Configurable desde admin panel
- [ ] Automatic reset después de X minutos sin actividad

---

## 🖥️ Fase 9: Frontend y Módulos

### 9.1 Reorganizar módulos frontend

**Archivo**: `frontend/src/main.js`

**Tareas:**
- [ ] Importar todos los módulos desde `frontend/src/modules/`
- [ ] Registrar módulos: auth, overlay, roulette, auction, leaderboard, timer, coins, chat, config
- [ ] Inicializar WebSocket con autenticación
- [ ] Setup de event listeners globales
- [ ] Implementar error handling global

### 9.2 Crear servicio de API client

**Archivo**: `frontend/src/services/api.js`

**Tareas:**
- [ ] Crear cliente HTTP centralizado
- [ ] Implementar `get()`, `post()`, `put()`, `delete()`
- [ ] Auto-incluir JWT en headers
- [ ] Refresh token automático si expira
- [ ] Logging de requests/responses
- [ ] Error handling consistente

### 9.3 Crear servicio de WebSocket client

**Archivo**: `frontend/src/services/websocket.js`

**Tareas:**
- [ ] Crear cliente Socket.io
- [ ] Conectar con autenticación JWT
- [ ] Reconnection automática
- [ ] Listener centralizado para eventos
- [ ] Emit helper functions

### 9.4 Actualizar módulo de autenticación

**Archivo**: `frontend/src/modules/auth.module.js`

**Tareas:**
- [ ] Actualizar login para usar nuevo API client
- [ ] Implementar registro
- [ ] Guardar JWT en localStorage
- [ ] Logout y limpiar datos
- [ ] Auto-login si JWT disponible
- [ ] Refresh token antes de expirar

### 9.5 Actualizar módulo de overlays

**Archivo**: `frontend/src/modules/overlay.module.js`

**Tareas:**
- [ ] Crear overlay nuevo desde UI
- [ ] Listar overlays existentes
- [ ] Actualizar configuración de overlay
- [ ] Borrar overlay
- [ ] Upload de imagen para overlay
- [ ] Preview de overlay
- [ ] Generar URL de overlay para OBS
- [ ] Validación de quota según plan

### 9.6 Actualizar módulo de leaderboard

**Archivo**: `frontend/src/modules/leaderboard.module.js`

**Tareas:**
- [ ] Escuchar WebSocket `leaderboard:update`
- [ ] Renderizar top 10 de monedas
- [ ] Mostrar avatares de usuarios
- [ ] Mostrar rankings dinámicos
- [ ] Animación suave al cambiar posiciones
- [ ] Resaltar cambios (rojo = bajó, verde = subió)

### 9.7 Actualizar módulo de timer

**Archivo**: `frontend/src/modules/timer.module.js`

**Tareas:**
- [ ] Sincronizar timer con servidor
- [ ] Mostrar fases: inicial, delay, tie-break
- [ ] Escuchar `timer:update` del WebSocket
- [ ] Animaciones de cambio de fase
- [ ] Validación de configuración desde `config.module.js`

### 9.8 Actualizar módulo de coins

**Archivo**: `frontend/src/modules/coins.module.js`

**Tareas:**
- [ ] Procesar eventos de regalo
- [ ] Mapear regalo a monedas
- [ ] Deduplicación de regalos
- [ ] Actualizar leaderboard
- [ ] Emitir evento para ruleta si está activa
- [ ] Logging de todos los regalos

### 9.9 Actualizar módulo de chat

**Archivo**: `frontend/src/modules/chat.module.js`

**Tareas:**
- [ ] Escuchar mensajes vía WebSocket
- [ ] Renderizar mensajes en timeline
- [ ] Soportar pinned messages
- [ ] Mostrar avatares de usuarios
- [ ] Moderar mensajes si es admin
- [ ] Buscar en historial de chat

### 9.10 Actualizar módulo de config

**Archivo**: `frontend/src/modules/config.module.js`

**Tareas:**
- [ ] Cargar configuración desde servidor
- [ ] Guardar configuración localmente
- [ ] Soportar override local
- [ ] Funciones: `getInitialTime()`, `getDelayTime()`, `getTieExtension()`

### 9.11 Crear módulo de sesión en vivo

**Archivo**: `frontend/src/modules/live-session.module.js`

**Tareas:**
- [ ] Botón "Ir en Vivo"
- [ ] Botón "Terminar Vivo"
- [ ] Mostrar estado de sesión actual
- [ ] Mostrar duración de sesión
- [ ] Mostrar total de monedas en sesión
- [ ] Guardar sessionId en localStorage
- [ ] Limpiar al desconectar

---

## 🧹 Fase 10: Limpieza y Eliminación de Duplicados

### 10.1 Eliminar archivos duplicados del root

**Tareas:**
- [ ] Eliminar `start.js` (reemplazado por `src/server.js`)
- [ ] Eliminar `server-new.js` (reemplazado por `src/server.js`)
- [ ] Eliminar `database/db.js` (reemplazado por `src/config/database.js`)
- [ ] Eliminar `routes/` (reemplazado por `src/routes/`)
- [ ] Eliminar `utils/mailer.js` (reemplazado por `src/services/email.service.js`)
- [ ] Eliminar `middleware/` (reemplazado por `src/middleware/`)
- [ ] Eliminar `Nueva carpeta (3)/` (código migrado a `src/services/roulette.service.js`)

### 10.2 Eliminar archivos y carpetas obsoletos

**Tareas:**
- [ ] Eliminar `TRABAJO_COMPLETADO.md` (obsoleto)
- [ ] Eliminar `SOLUCION_PROBLEMAS.md` (obsoleto)
- [ ] Eliminar archivos `.md` deprecados
- [ ] Limpiar carpeta `scripts/` - mantener solo esenciales
- [ ] Eliminar archivos de test antiguos

### 10.3 Reorganizar carpeta frontend

**Tareas:**
- [ ] Mover HTML de overlays a `frontend/src/overlays/`
- [ ] Consolidar CSS en `frontend/src/styles/`
- [ ] Consolidar módulos en `frontend/src/modules/`
- [ ] Crear índice de imports en `frontend/src/main.js`

### 10.4 Actualizar imports en todos los archivos

**Tareas:**
- [ ] Buscar importaciones del formato antiguo
- [ ] Actualizar a nuevas rutas
- [ ] Verificar que no haya imports rotos
- [ ] Testear la aplicación

---

## 🧪 Fase 11: Testing y Validación

### 11.1 Crear tests unitarios para servicios

**Tareas:**
- [ ] Test `auth.service.js`: register, login, JWT validation
- [ ] Test `overlay.service.js`: CRUD operations, image handling
- [ ] Test `roulette.service.js`: game logic, winner calculation
- [ ] Test `live-session.service.js`: rank calculations, cleanup
- [ ] Test `email.service.js`: template rendering
- [ ] Test `payment.service.js`: transaction handling
- [ ] Cobertura mínima: 80%

### 11.2 Crear tests de integración

**Tareas:**
- [ ] Test flujo de login + crear overlay + ir en vivo
- [ ] Test flujo de regalo → top donor → overlay update
- [ ] Test flujo de ruleta: start → add entries → spin
- [ ] Test flujo de pago: checkout → webhook → update plan
- [ ] Test flujo de sesión: start → recibir regalos → end → cleanup
- [ ] Test WebSocket connection y eventos

### 11.3 Validar estructura de BD

**Tareas:**
- [ ] Ejecutar migraciones en BD de prueba
- [ ] Verificar que todas las tablas se crean correctamente
- [ ] Verificar que todos los índices se crean
- [ ] Test inserts/updates/deletes en cada tabla
- [ ] Verificar foreign keys funcionan
- [ ] Verificar defaults están correctos

### 11.4 Validar rutas API

**Tareas:**
- [ ] Test todas las rutas GET
- [ ] Test todas las rutas POST con datos válidos
- [ ] Test todas las rutas POST con datos inválidos
- [ ] Test autenticación (requests sin JWT)
- [ ] Test autorización (usuarios sin permisos)
- [ ] Test CORS headers
- [ ] Usar Postman o script para validar

### 11.5 Validar WebSocket

**Tareas:**
- [ ] Test conexión WS con autenticación
- [ ] Test reconexión automática
- [ ] Test salas privadas por usuario
- [ ] Test salas por sesión
- [ ] Test eventos en tiempo real
- [ ] Test cleanup al desconectar

### 11.6 Validar overlays en OBS

**Tareas:**
- [ ] Agregar cada overlay como fuente de navegador en OBS
- [ ] Verificar que los iframes se cargan correctamente
- [ ] Verificar que reciben WebSocket updates
- [ ] Verificar animaciones funcionan
- [ ] Verificar responsive design en diferentes resoluciones
- [ ] Probar con datos de prueba

### 11.7 Validar flujos completos

**Tareas:**
- [ ] Simular stream en vivo: conectar TikTok → recibir regalos → ver en overlays
- [ ] Verificar deduplicación de regalos
- [ ] Verificar ruleta automática cuando se reciben regalos
- [ ] Verificar top donadores se actualiza
- [ ] Verificar cleanup al desconectar
- [ ] Verificar múltiples usuarios simultáneamente
- [ ] Probar bajo carga (simular muchos eventos)

---

## 🚀 Fase 12: Deployment

### 12.1 Preparar configuración de producción

**Tareas:**
- [ ] Crear `.env.production` con valores reales
- [ ] Configurar DATABASE_URL a BD productiva (Postgres)
- [ ] Generar JWT_SECRET aleatorio y seguro
- [ ] Configurar SMTP para emails transaccionales
- [ ] Configurar Stripe API keys
- [ ] Configurar CORS_ORIGINS con dominio correcto
- [ ] Configurar LOG_LEVEL a `info`

### 12.2 Preparar Docker

**Tareas:**
- [ ] Crear `Dockerfile` con Node.js LTS
- [ ] Multi-stage build: dependencias → código → imagen final
- [ ] Health check endpoint
- [ ] User no-root para seguridad
- [ ] Volumes para uploads y logs
- [ ] Actualizar `docker-compose.yml` con servicios:
  - [ ] web: servidor Node
  - [ ] postgres: BD productiva
  - [ ] redis: cache (opcional pero recomendado)
  - [ ] nginx: reverse proxy

### 12.3 Preparar base de datos para producción

**Tareas:**
- [ ] Crear BD Postgres
- [ ] Ejecutar schema.sql
- [ ] Ejecutar todas las migraciones en orden
- [ ] Insertar planes default
- [ ] Insertar gift mappings
- [ ] Backup automático configurado
- [ ] Verificar que BD es accesible desde Docker

### 12.4 Build y test en Docker

**Tareas:**
- [ ] `docker-compose build`
- [ ] `docker-compose up` en local
- [ ] Test endpoints API
- [ ] Test WebSocket
- [ ] Test uploads de archivos
- [ ] Verificar logs

### 12.5 Deploying a servidor (ej: DigitalOcean, AWS, Heroku)

**Tareas:**
- [ ] Preparar servidor con Docker instalado
- [ ] Clone repo a servidor
- [ ] Copiar `.env.production` a servidor (no vía git)
- [ ] `docker-compose up -d`
- [ ] Verificar que está corriendo
- [ ] Setup SSL con Let's Encrypt
- [ ] Configurar dominio (DNS pointing)
- [ ] Test desde navegador y OBS

### 12.6 Configurar CI/CD (opcional pero recomendado)

**Tareas:**
- [ ] Usar GitHub Actions
- [ ] Pipeline: test → build → deploy
- [ ] Trigger en push a `main` branch
- [ ] Auto-deploy a producción si tests pasan
- [ ] Slack notifications para status

### 12.7 Monitoreo y mantenimiento

**Tareas:**
- [ ] Configurar logs centralizados (ej: DataDog, LogRocket)
- [ ] Alertas si BD no responde
- [ ] Alertas si servidor tiene error rate alto
- [ ] Backup automático diario de BD
- [ ] Limpieza automática de datos antiguos (> 30 días)
- [ ] Monitoreo de uso de disco

### 12.8 Documentación final

**Tareas:**
- [ ] Actualizar `README.md` con instrucciones de deploy
- [ ] Documentar cómo escalar (agregar servidor, caché, etc.)
- [ ] Documentar cómo hacer hotfix en producción
- [ ] Documentar procesos de backup/restore
- [ ] Crear runbook para emergencias

---

## 📊 Resumen de Cambios Clave

### Eliminar
```
- start.js
- server-new.js
- database/db.js
- routes/ (en root)
- middleware/ (en root)
- utils/mailer.js
- Nueva carpeta (3)/
- Archivos .md deprecados
```

### Crear
```
- src/ (arquitectura modular)
  - config/ (centralizado)
  - database/ (schema único)
  - services/ (9+ servicios)
  - routes/ (10+ rutas)
  - controllers/ (handlers)
  - middleware/ (validación, auth)
  - websocket/ (eventos en tiempo real)
  - utils/ (helpers)
- frontend/src/ (modular)
  - components/
  - modules/
  - overlays/ (4 nuevos overlays)
  - services/
  - styles/
- tests/ (unitarios + integración)
- docs/ (documentación)
```

### Actualizar
```
- package.json (nuevas dependencias si es necesario)
- .env.example (variables centralizadas)
- docker-compose.yml (nuevos servicios)
- Dockerfile (multi-stage)
```

---

## 🎯 Orden Recomendado de Ejecución

1. **Fase 1**: Preparación (30 min)
2. **Fase 2**: Base de datos (1 hora)
3. **Fase 3**: Configuración (30 min)
4. **Fase 4**: Servicios (2 horas)
5. **Fase 5**: Rutas y controladores (2 horas)
6. **Fase 6**: WebSocket (1.5 horas)
7. **Fase 7**: Overlays avanzados (2 horas)
8. **Fase 8**: Integración de ruleta (1.5 horas)
9. **Fase 9**: Frontend (2 horas)
10. **Fase 10**: Limpieza (1 hora)
11. **Fase 11**: Testing (3 horas)
12. **Fase 12**: Deployment (2 horas)

**Total estimado**: 18.5 horas de desarrollo

---

## ✅ Checklist Final

- [ ] Todos los archivos creados en las nuevas ubicaciones
- [ ] Todos los imports actualizados
- [ ] Base de datos migrada y poblada
- [ ] Tests pasando (80%+ cobertura)
- [ ] API endpoints validados (Postman)
- [ ] WebSocket funcional (Socket.io cliente + servidor)
- [ ] Overlays funcionando en OBS
- [ ] No hay duplicados de código
- [ ] Documentación actualizada
- [ ] Docker imagen lista
- [ ] .env.production configurado (NO en git)
- [ ] Rama pull request abierta
- [ ] Code review aprobado
- [ ] Merge a main
- [ ] Deploy a producción exitoso
- [ ] Monitoreo en vivo

---

## 📞 Soporte y Referencias

**Documentación creada:**
- `docs/ARCHITECTURE.md` - Visión general de arquitectura
- `docs/STRUCTURE.md` - Estructura de carpetas y archivos
- `docs/MIGRATION.md` - Guía paso a paso de migración
- `docs/API.md` - Documentación de endpoints
- `docs/DATABASE.md` - Schema y migraciones
- `docs/DEPLOYMENT.md` - Guía de deploy
- `docs/TROUBLESHOOTING.md` - Solución de problemas comunes

**Contacto:**
- Issues: GitHub Issues
- Slack: canal #tiktools-dev
- Email: dev@tiktools.com

---

## 🎉 Beneficios Finales

✅ **Escalabilidad**: Fácil agregar features nuevas  
✅ **Mantenibilidad**: Código organizado y predecible  
✅ **Reutilización**: Servicios compartidos sin duplicados  
✅ **Testing**: Componentes independientes para test  
✅ **Performance**: Índices DB optimizados  
✅ **Seguridad**: JWT, SQL injection protection, CORS  
✅ **Real-time**: WebSocket para actualizaciones instantáneas  
✅ **Overlays**: 4 nuevos overlays integrados  
✅ **Ruleta**: Sistema completo funcional  
✅ **Sin Session ID**: OAuth ready (preparado para futuro)

---

**Creado**: Diciembre 23, 2025  
**Última actualización**: Diciembre 23, 2025  
**Versión**: 1.0  
**Estado**: Listo para implementación
