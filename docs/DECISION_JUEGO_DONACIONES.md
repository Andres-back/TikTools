# DECISIÓN: Juego para donaciones en TikToolStream (Kaetram vs BrowserQuest)

**Fecha**: Agosto 4, 2026
**Estado**: Decisión tomada — pendiente spike técnico
**Alcance**: Elegir el motor de juego para la funcionalidad "streamer juega + el chat lanza jefes con regalos (hasta 1000 monedas) + equipo bueno/malo" conectada al motor HTTP de integraciones.

---

## 1. Objetivo

- El streamer juega en vivo (capturado por OBS).
- Regalos de TikTok (1–1000 monedas) disparan eventos en el juego:
  - **Equipo malo**: oleadas de mobs, elites y BOSSES que atacan al streamer.
  - **Equipo bueno**: curaciones, buffs, items, oro/XP, aliados.
- Animaciones visibles en transmisión (spawns, efectos, avisos con el nombre del donador).
- Mecánica que incentive donaciones (escalones de monedas → mayor impacto).

## 2. Candidatos evaluados

| Candidato | Veredicto |
|---|---|
| **Kaetram** (github.com/Kaetram/Kaetram-Open) | ✅ **SELECCIONADO** |
| **BrowserQuest** (github.com/mozilla/BrowserQuest) | ❌ Descartado como base (ver §4) |
| Minecraft vía RCON | Ya implementado en TikToolStream — opción paralela sin costo |
| agar.io-clone / Ogar / slither.io clones | Descartados: demasiado simples para retención |
| Crowd Control (Werekraken) | Descartado: ahora propietario/cerrado |
| Juegos con IP de Nintendo/Pokémon | Descartados: riesgo DMCA |

## 3. Kaetram — análisis verificado (rama develop, v2.5.1, push 2026-08-03)

"Open-source 2D MMORPG, versión extendida de BrowserQuest" (dicho por el propio repo). Licencia MPL-2.0 (código) + OPL (assets). 715 stars, CI + e2e activos, 9 issues abiertos, Discord y wiki propios.

### Stack
- Servidor: **TypeScript + µWebSockets** (WS moderno) — puerto **9001** (libre).
- **API REST express ya integrada** (`packages/server/src/network/api.ts`) — puerto **9002**, con `accessToken` propio. Superficie lista para recibir donaciones; solo falta añadir una ruta.
- Cliente: **Astro + sirv** — puerto **9000**. Motor de render moderno: iluminación dinámica, overlays, tiles animados.
- **MongoDB opcional** (`SKIP_DATABASE=true` por defecto — corre sin DB).
- Node ≥ 16.17.1 LTS, **yarn v3 (corepack)**.

### Mecánicas que cubren el requerimiento
- **Jefes por plugins**: `packages/server/data/plugins/mobs/` — `skeletonking.ts` (spawnea 6 esbirros al recibir daño), `forestdragon`, `ogrelord`, `piratecaptain`, `hellhound`, `queenant`, `spider`, `santa`. Hooks `handleHit`/`handleDeath`. Un boss nuevo = un archivo plugin.
- **Equipo bueno**: plugins de items (`healingitem`, `effectpotion`, `firepotion`, `hotsauce`...) + trading, guilds, skilling, enchantment.
- **Eventos especiales**: sistema de minigames (`packages/server/src/game/minigames`).
- **Puente externo existente**: integración de Discord (`packages/common/api/discord.ts`) — patrón arquitectónico a copiar para el puente TikTok.
- Chat del juego con burbujas y broadcast → avisos "@usuario lanzó un JEFE" visibles en pantalla.

### Operación
- `corepack enable` → `yarn` → `.env` con `ACCEPT_LICENSE=true` (obligatorio, MPL2.0+OPL) → `yarn dev` (desarrollo) o `yarn build && yarn start` (producción).
- Cada cambio de config exige rebuild del cliente (`astro build`).
- Submódulo `packages/app` (Kaetram-App, web oficial) **NO necesario** — clonar sin `--recursive`.
- Repo grande (~848 MB con assets, 2 347 archivos). Curva de entrada media (~3–4 días).

## 4. BrowserQuest — por qué se descarta como base (verificado, rama master)

- Código de **2012**, deprecado por Mozilla; deps de servidor muertas (`websocket-server`/miksago, WebSocket-Node viejo) → riesgo alto en Node moderno.
- **Sin canal externo**: toda conexión WS es tratada como player; no hay auth ni admin. Habría que construir un "director" completo (aunque es viable: el `worldserver` expone `addMob`/`addNpc`/`addItem` y hay 13 kinds de mobs, incluido `boss` Cow King).
- ES5 + RequireJS + jQuery; sin build moderno.
- Visuales pixel 2012 (funciona, pero menos atractivo en stream).
- Puertos: default 8000 **ocupado** por el Docker de XCalificator.
- A favor (por qué se evaluó): chico (~68 MB), entendible en 1 día, mecánica completa de aggro/loot, licencia MPL-2.0 + CC-BY-SA 3.0.

**BrowserQuest queda como plan B** si el spike de Kaetram fallara por algún bloqueante no previsto.

## 5. Arquitectura de integración propuesta (Kaetram)

```
TikTok LIVE ──> TikToolStream (WS /live)
   │
   ▼
Actions: trigger "gift ≥ umbral" ──> paso HTTP (plantilla existente)
   │  POST http://127.0.0.1:9002/donation  (+ accessToken de Kaetram)
   │  body: { "action": "...", "user": "...", "gift": "...", "coins": N }
   │  headers: X-TikToolStream-Signature (HMAC-SHA256)
   ▼
API express de Kaetram (ruta nueva "donations", verifica firma + token)
   ├─ spawn_boss   → world.spawnMob(bossPlugin) + aggro al streamer + announce
   ├─ spawn_wave   → N mobs normales alrededor del streamer
   ├─ heal / buff  → equipo bueno (pociones/efectos sobre el streamer)
   ├─ reward       → oro / items / XP
   └─ announce     → broadcast "@usuario lanzó un JEFE" (chat del juego)
   ▼
µWebSockets ──> clientes (OBS Browser Source en http://localhost:9000)
```

### Escalones de monedas (propuesta, ajustable)
| Monedas | Evento | Efecto |
|---|---|---|
| 1–99 | `spawn_wave` | Oleada chica (mobs normales) + loot |
| 100–499 | `spawn_elite` | Mob elite (ogrelord/hellhound) + drop |
| 500–999 | `spawn_boss` | Boss (skeletonking/forestdragon) con aviso broadcast |
| Cualquiera (modo apoyo) | `heal`/`buff` | Equipo bueno: curación/efectos al streamer |

- Cooldown global (~5 s) y por viewer (~15 s) — soportado por el motor de integraciones.
- Máximo de bosses simultáneos (ej. 2) para evitar abuso.

## 6. Adecuación de la plantilla HTTP de TikToolStream

Estado actual verificado: el motor (`src/modules/integrations/http-client.js`) **bloquea HTTP local por SSRF** (solo HTTPS público por defecto; loopback/LAN denegados). Para conectar con Kaetram local:

1. `.env` de TikToolStream (hoy solo tiene `INTEGRATIONS_ENCRYPTION_KEY`):
   ```dotenv
   INTEGRATIONS_ALLOW_HTTP=true
   INTEGRATIONS_ALLOW_PRIVATE_HTTP=true
   ```
   (flags documentados en `docs/INTERACCIONES_JUEGOS_HTTP.md`; self-hosted asume el riesgo)
2. Conexión HTTP nueva en Actions → `http://127.0.0.1:9002/donation` + token.
3. Body template:
   ```json
   { "action": "spawn_boss", "user": "{{user.nickname}}", "gift": "{{gift.name}}", "coins": {{gift.coins}} }
   ```
4. En el lado Kaetram: verificar `X-TikToolStream-Signature` (timestamp + "." + deliveryId + "." + body, HMAC-SHA256) + `accessToken`.
5. Overlay OBS: Browser Source → `http://localhost:9000` (cliente del juego).

## 7. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Stack yarn v3/corepack poco familiar | Documentado; corepack enable es un paso |
| Rebuild del cliente en cada cambio de config | Script de build en docs de despliegue |
| Abuso del chat (spam de regalos baratos) | Cooldowns + umbrales + límite de bosses vivos |
| Streamer necesita pausar/desactivar | Botón ON/OFF y modo "solo equipo bueno" en la futura pantalla |
| Licencia OPL en assets | Mantener `ACCEPT_LICENSE` y avisos de licencia |
| Repo grande / submodule | Clonar sin `--recursive` (packages/app no se necesita) |

## 8. Próximos pasos

1. **Spike técnico**: clonar Kaetram (sin `--recursive`), `corepack enable`, `yarn`, `.env` con `ACCEPT_LICENSE=true`, `yarn dev`, verificar cliente en navegador y conexión WS.
2. **Ruta `/donation`** en la API de Kaetram + verificación de firma.
3. **UX/UI** en TikToolStream: pantalla de conexión del juego, umbrales, modo bueno/malo, historial de interacciones.
4. **Overlay/avisos** reutilizando el patrón `interactionQueued`/`interactionResult` (Hype Arena).
5. Pruebas end-to-end: crear regla → regalo → boss en pantalla.
