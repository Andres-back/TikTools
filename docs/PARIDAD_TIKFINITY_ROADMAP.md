# Roadmap de paridad funcional con TikFinity

**Fecha de corte:** 2026-07-16  
**Objetivo:** alcanzar paridad de capacidades para creadores de TikTok Live con una arquitectura propia, sin copiar marca, textos ni recursos protegidos de terceros.

## Principio de producto

La paridad no se mide por cantidad de pantallas. Una función cuenta como terminada solo cuando completa este ciclo:

1. TikTok entrega un evento real.
2. El servidor lo normaliza y lo asigna al creador correcto.
3. Una regla decide si debe ejecutar una acción.
4. El estado relevante se persiste.
5. Dashboard y overlays OBS reciben el mismo resultado.
6. El flujo tiene pruebas de éxito, reconexión, duplicados y errores.

## Arquitectura objetivo

TikToolStream debe organizarse alrededor de cuatro primitivas:

- **Live Session:** una conexión TikTok por canal, reconexión y estado observable.
- **Event Bus:** contrato canónico para gift, chat, like, follow, share, viewer, subscribe y member.
- **Rule Engine:** filtros, cooldowns y ejecución Evento -> Acción por usuario.
- **Output Queues:** colas aisladas para multimedia, sonido, TTS, overlays e integraciones.

## Fase 0 — Núcleo Live

### Completado en esta iteración

- El dashboard enlaza el username TikTok real con el ID interno del creador.
- Los overlays se suscriben al canal interno y dejan de intentar conectar cuentas ficticias `user_<id>`.
- El servidor distribuye eventos únicamente al dashboard y overlays del canal correspondiente.
- Se normalizan chat, gifts, likes, follows, shares, viewers, members, subscriptions, emotes, questions y rankings.
- Los combos de gifts emiten `giftProgress` durante la racha y un solo `gift` contable al finalizar.
- Los overlays abiertos después del inicio reciben el estado `connected` actual.
- La desconexión del dashboard se propaga a sus overlays.
- Hay pruebas automatizadas del contrato de eventos y una prueba real del handshake WebSocket.

### Pendiente para cerrar Fase 0

- Persistir `user_id -> tiktok_unique_id` y el estado de la sesión Live.
- Autenticar el WebSocket del dashboard y usar tokens firmados/revocables en URLs OBS.
- Añadir simulador de eventos en desarrollo y pruebas E2E dashboard/overlay.
- Aplicar límites de conexiones, tamaño de mensajes y origen permitido.
- Añadir logging estructurado de conexión, reconexión y errores TikTok.

## Fase 1 — Motor de automatización

1. Separar **Eventos** de **Acciones** en el modelo de datos.
2. Implementar filtros por tipo de evento, gift, monedas mínimas, usuario, rol y comando.
3. Implementar cooldown global y por usuario.
4. Crear colas por canal para imagen, video, sonido y TTS.
5. Persistir ejecuciones e idempotencia para evitar dobles disparos.
6. Mover al servidor el progreso de goals, timers y subastas.
7. Rehidratar dashboard y overlays desde base de datos tras recargar.

### Criterio de aceptación

Un gift sintético y uno real deben producir exactamente una ejecución, actualizar la base de datos y mostrar el mismo resultado en dashboard y overlay.

## Fase 2 — Herramientas de interacción

- Chatbot seguro y limitado por rate, con comandos y respuestas automáticas.
- Subathon/timer controlado por gifts, follows, shares, likes, subs y chat.
- Song requests con OAuth Spotify, cola, permisos y moderación.
- Puntos, niveles, rankings, top gifters/likers y gift counters.
- Goals de likes, shares, follows, coins, viewers y subscriptions.
- Galería de overlays configurables y múltiples pantallas de acciones.

## Fase 3 — Integraciones y negocio

- OBS WebSocket y Streamer.bot.
- Webhooks/API local para extensiones.
- Voicemod, atajos y conectores de juegos/dispositivos según demanda.
- Límites Free/Pro aplicados en servidor.
- PayPal real con captura servidor-a-servidor, idempotencia, validación de importe y reembolsos reales.

## Bloqueadores antes de producción

- `capture-order` no debe conceder Premium sin verificar la orden con PayPal.
- Refresh tokens deben funcionar igual en SQLite y PostgreSQL.
- Las migraciones de ruleta y columnas nuevas deben ejecutarse automáticamente.
- Las consultas deben eliminar incompatibilidades `NOW()`/`datetime()` y booleano/entero.
- Goals, timers, subastas y analytics deben dejar de depender de estado solo en memoria.

## Orden de implementación recomendado

1. Sesión Live persistente y tokens OBS.
2. Vertical completa Gift -> Subasta -> Leaderboard persistido.
3. Rule Engine y cola multimedia.
4. Goals y subathon persistentes.
5. TTS/chatbot moderados.
6. Spotify, puntos y rankings.
7. Integraciones externas y monetización.

Este orden maximiza reutilización: cada herramienta nueva consume el mismo Event Bus y no vuelve a implementar conexión, deduplicación ni sincronización.
