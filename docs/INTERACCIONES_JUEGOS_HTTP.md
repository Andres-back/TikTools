# Game & HTTP Lab de TikToolStream

TikToolStream puede transformar eventos normalizados de TikTok LIVE en acciones server-side para:

- Servidores Minecraft compatibles con RCON.
- Juegos basados en Source RCON.
- APIs y webhooks HTTP/HTTPS.
- Feedback visual inmediato en overlays mediante `interactionQueued` e `interactionResult`.

La contraseña RCON, la URL completa del webhook, tokens y headers se cifran con AES-256-GCM. OBS y el navegador nunca reciben esos secretos.

## 1. Variables de entorno obligatorias

Genera una clave distinta por entorno:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Configura el resultado como:

```dotenv
INTEGRATIONS_ENCRYPTION_KEY=BASE64_DE_32_BYTES
```

No cambies esta clave sin migrar los secretos guardados: una clave distinta no puede descifrar conexiones existentes.

## 2. RCON seguro

En desarrollo local se permiten por defecto `127.0.0.1`, `localhost` y `::1`. En producción RCON queda deshabilitado hasta que el operador declare hosts exactos:

```dotenv
INTEGRATIONS_RCON_ALLOWED_HOSTS=10.0.0.25,minecraft.internal.example
```

No uses `*` en producción. RCON transmite la contraseña y los comandos sin cifrado; mantenlo en localhost, LAN/VPN o detrás del futuro TikToolStream Bridge. No abras el puerto RCON a Internet.

Para Minecraft, habilita RCON en `server.properties`, define una contraseña larga y reinicia el servidor. El puerto típico es `25575`.

TikToolStream aplica controles adicionales:

- Allowlist por conexión.
- Bloqueo permanente de comandos administrativos (`op`, `stop`, `whitelist`, bans, permisos y similares).
- Sustituciones sin saltos de línea, NUL, punto y coma, comillas o backticks.
- Máximo 2 KiB por comando, 8 KiB de respuesta y timeouts estrictos.
- Una ejecución simultánea por conexión.
- Un resultado perdido después de enviar el comando se marca `unknown` y no se reintenta automáticamente.

Ejemplo de regla:

```text
Evento: gift
Condición: mínimo 20 monedas
Comando: effect give @a minecraft:speed 10 1 true
Cooldown global: 5 segundos
Cooldown por viewer: 15 segundos
```

Ejemplo con variables seguras:

```text
say {{user.nickname}} activó {{gift.name}} por {{gift.coins}} monedas
```

El nombre del comando debe estar escrito en la regla. Nunca puede provenir del chat o del nickname.

## 3. HTTP y webhooks

Por defecto solo se permite HTTPS público. El motor:

- Resuelve DNS en cada entrega y fija la IP validada.
- Bloquea loopback, LAN, link-local, metadata y rangos reservados.
- No sigue redirects.
- Limita request a 32 KiB y response a 64 KiB.
- Bloquea headers hop-by-hop, `Host`, cookies, proxies y `X-Forwarded-*`.
- Incluye un `deliveryId` estable para idempotencia.
- Puede firmar cada body con HMAC-SHA256.

Opcionalmente limita los destinos desde la infraestructura:

```dotenv
INTEGRATIONS_HTTP_ALLOWED_HOSTS=hooks.example.com,api.example.net
```

Solo para instalaciones self-hosted que entiendan el riesgo:

```dotenv
INTEGRATIONS_ALLOW_HTTP=true
INTEGRATIONS_ALLOW_PRIVATE_HTTP=true
```

Headers de entrega:

```text
X-TikToolStream-Delivery: <uuid>
X-TikToolStream-Timestamp: <unix-seconds>
X-TikToolStream-Signature: v1=<hmac-sha256>
```

La firma usa:

```text
timestamp + "." + deliveryId + "." + rawJsonBody
```

## 4. Variables disponibles

Se admite sintaxis moderna y compatibilidad con varios placeholders populares:

| Valor | Variable moderna | Compatible |
|---|---|---|
| Nickname | `{{user.nickname}}` | `%nickname%` |
| Usuario TikTok | `{{user.uniqueId}}` | `%username%` |
| Nombre del regalo | `{{gift.name}}` | `%giftName%` |
| Monedas totales | `{{gift.coins}}` | `%coins%` |
| Repeticiones | `{{gift.repeatCount}}` | `%repeatCount%` |
| Comentario | `{{chat.comment}}` | `%comment%` |
| Parámetros del comando | `{{chat.commandParams}}` | `%commandParams%` |
| Likes del evento | `{{like.count}}` | `%likeCount%` |
| Tipo de evento | `{{event.type}}` | `%eventType%` |

Para bodies HTTP, una variable que ocupa todo el valor conserva su tipo. Por ejemplo, `"coins": "{{gift.coins}}"` se entrega como número.

## 5. Uso desde la app

1. Abre **Game & HTTP Lab**.
2. Crea una conexión RCON o HTTP.
3. Pulsa **Probar conexión**.
4. Crea una regla Evento → Acción.
5. Conecta el LIVE desde el Dashboard.
6. Revisa el historial: `queued`, `running`, `succeeded`, `failed`, `unknown` o `skipped`.

El Dashboard firma la propiedad del canal con su JWT antes de enlazarlo. Un socket anónimo puede consumir overlays públicos, pero no reclamar un canal ni activar acciones privilegiadas.

## 6. Hype Arena

URL OBS:

```text
https://TU_DOMINIO/overlays/overlay-hype-arena.html?userId=TU_ID
```

Modo demo visual:

```text
https://TU_DOMINIO/overlays/overlay-hype-arena.html?demo=1
```

El overlay combina viewers, racha, combo, eventos recientes, spotlight por regalo y Hype Mode. También reacciona al resultado de una integración de juego sin mostrar comandos, URLs, respuestas o errores internos.

Resolución recomendada: `1920 × 1080`, fondo transparente, 60 FPS.

## 7. Siguiente capa recomendada

Para un SaaS público, el siguiente paso es TikToolStream Bridge: una app local que abre una conexión saliente autenticada y ejecuta adaptadores en la LAN. Así Minecraft, OBS WebSocket, Streamer.bot y juegos locales no necesitan puertos entrantes ni credenciales en la nube.
