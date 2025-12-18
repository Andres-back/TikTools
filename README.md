# 🏆 Sistema de Subastas TikTok Live

Sistema modular para realizar **subastas en vivo** a través de TikTok Live. El usuario que done más monedas (💎) al finalizar el tiempo **GANA la subasta**.

## ✨ Características

- 🎯 **Sistema de subastas en tiempo real** - Conexión directa a TikTok Live
- ⏱️ **Temporizador configurable** - Tiempo inicial + delay/snipe
- 🏆 **Leaderboard animado** - Top 3 donadores con efectos visuales premium
- 🤝 **Tie-breaker automático** - Si hay empate, se extiende el tiempo 30 segundos
- 💎 **Suma manual de monedas** - Para ajustes o donaciones externas
- 📝 **Mensaje personalizable** - En el encabezado del timer
- 💾 **Persistencia** - Configuración guardada en localStorage
- 🎨 **UI Premium** - Animaciones y efectos visuales modernos

## 📁 Estructura del Proyecto

```
RAG-Anything-ui/
├── server.js             # Servidor Node.js + WebSocket
├── frontend/
│   ├── index.html        # UI principal
│   ├── main.js           # Punto de entrada (ES6 modules)
│   ├── styles.css        # Estilos premium con animaciones
│   └── modules/
│       ├── storage.js    # Persistencia localStorage
│       ├── config.js     # Configuración del sistema
│       ├── coins.js      # Procesamiento de monedas
│       ├── leaderboard.js # Ranking con animaciones
│       ├── timer.js      # Temporizador con tie-breaker
│       └── connection.js # WebSocket al servidor
└── .env                  # Variables de entorno
```

## 🚀 Inicio Rápido

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar Session ID de TikTok
copy .env.example .env
# Edita .env y agrega tu TIKTOK_SESSION_ID

# 3. Iniciar servidor
npm start
```

Abre `http://localhost:8080` en el navegador.

## ⚙️ Configuración

### Variables de Entorno (.env)

```env
TIKTOK_SESSION_ID=tu_session_id_aqui
```

### ⚠️ IMPORTANTE: Obtener Session ID

Si ves el error `Failed to extract SIGI_STATE`:

1. Ve a https://www.tiktok.com e inicia sesión
2. Abre DevTools (F12) → Application → Cookies
3. Copia el valor de `sessionid`
4. Pégalo en `.env`

### Controles en la UI

| Control | Descripción |
|---------|-------------|
| **Tiempo inicial** | Duración de la fase principal (10-600 seg) |
| **Tiempo delay** | Fase de "snipe" al final (0-120 seg) |
| **Extensión empate** | Tiempo extra si hay empate (default: 30 seg) |
| **Mensaje** | Texto en el encabezado del timer (ej: "MIN 10") |

## 🎮 Cómo Funciona

1. **Conectar al live** - Ingresa el usuario de TikTok y presiona "Conectar"
2. **Configurar tiempos** - Ajusta según tu subasta
3. **Iniciar contador** - Presiona "▶ Iniciar"
4. **Los regalos se cuentan automáticamente** - Solo monedas (💎)
5. **Top 1 al finalizar = GANADOR** de la subasta

### Sistema de Empates

Si al terminar el tiempo hay 2+ usuarios con las mismas monedas:
1. Se detecta automáticamente el empate
2. Se muestra "¡EMPATE! @user1 vs @user2"
3. Se añaden 30 segundos (configurable)
4. Máximo 5 extensiones

## 🎨 Leaderboard Premium

El leaderboard incluye:
- **👑 Primer lugar** - Fondo dorado con brillo animado
- **🥈 Segundo lugar** - Estilo plateado
- **🥉 Tercer lugar** - Estilo bronce
- **Animaciones** al actualizar posiciones
- **Efecto de nuevo líder** cuando cambia el Top 1

## 📋 API Global

```javascript
// Leaderboard
tiktokLiveUi.recordDonorCoins(uniqueId, label, coins)
tiktokLiveUi.resetLeaderboard()
tiktokLiveUi.getWinner()

// Timer
tiktokLiveUi.startTimer()
tiktokLiveUi.pauseTimer()
tiktokLiveUi.resetTimer()

// Conexión
tiktokLiveUi.connect(username)
tiktokLiveUi.disconnect()
```

## 🔧 Arquitectura

### Flujo de Datos

```
TikTok Live → WebSocket → coins.js → leaderboard.js → UI
                ↓
            server.js (Node.js + tiktok-live-connector)
```

### Módulos

| Módulo | Función |
|--------|---------|
| `coins.js` | Procesa regalos, deduplicación, cálculo de monedas |
| `leaderboard.js` | Ranking, animaciones, detección de empates |
| `timer.js` | Fases: IDLE → INITIAL → DELAY → TIE_BREAK → FINISHED |
| `connection.js` | WebSocket, reconexión automática |
| `config.js` | Tiempos, validación de configuración |
| `storage.js` | Persistencia en localStorage |

## 📚 Tecnologías

- **Frontend**: Vanilla JavaScript (ES6 Modules), CSS3 con animaciones
- **Backend**: Node.js + Express
- **WebSocket**: ws
- **TikTok**: tiktok-live-connector v2.0.2

## 📝 Licencia

MIT
