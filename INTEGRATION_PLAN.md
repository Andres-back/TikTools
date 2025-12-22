# 🎯 PLAN DE INTEGRACIÓN: SUBASTA + RULETA

## 📋 Estado Actual

### Sistema de Subasta (Proyecto Principal)
- ✅ Express.js + PostgreSQL
- ✅ TikTok Live Connector
- ✅ WebSocket `/sync` y `/live`
- ✅ Autenticación JWT
- ✅ Panel Admin
- ✅ Sistema de Chat
- ✅ Overlays: Timer, Donors
- ✅ Deployed en Digital Ocean

### Sistema de Ruleta (Nueva carpeta 3)
- ✅ Node.js standalone
- ✅ TikTok Live Connector
- ✅ WebSocket
- ⚠️ SQLite (migrar a PostgreSQL)
- ✅ Overlays: Ruleta, Participantes
- ❌ Sin autenticación
- ❌ Sin integración

---

## 🎯 OBJETIVOS

1. **Unificar ambos sistemas en una sola aplicación**
2. **Navegación fluida entre Subasta y Ruleta**
3. **Compartir autenticación, WebSocket y base de datos**
4. **Mantener toda la funcionalidad existente**
5. **Arreglar problema de imágenes del chat**

---

## 🏗️ ARQUITECTURA INTEGRADA

```
TikToolStream Unificado
│
├── Frontend
│   ├── index.html (Dashboard con tabs: Subasta | Ruleta)
│   ├── admin.html (Panel admin)
│   ├── login.html
│   │
│   ├── modules/
│   │   ├── auth.js
│   │   ├── timer.js
│   │   ├── leaderboard.js
│   │   ├── roulette.js ← NUEVO
│   │   └── ...
│   │
│   └── overlays/
│       ├── overlay-timer.html
│       ├── overlay.html (donors)
│       ├── overlay-roulette.html ← NUEVO
│       └── overlay-participants.html ← NUEVO
│
├── Backend
│   ├── start.js (servidor principal)
│   │
│   ├── routes/
│   │   ├── auth.js
│   │   ├── chat.js
│   │   ├── roulette.js ← NUEVO
│   │   └── ...
│   │
│   └── services/
│       ├── tiktok-auction.js
│       └── tiktok-roulette.js ← NUEVO
│
└── Database (PostgreSQL)
    ├── users
    ├── messages
    ├── roulette_participants ← NUEVO
    ├── roulette_config ← NUEVO
    └── roulette_winners ← NUEVO
```

---

## 📝 PASOS DE IMPLEMENTACIÓN

### **FASE 1: Preparación (15 min)**
- [x] Crear migración SQL para tablas de ruleta
- [ ] Copiar archivos de ruleta al proyecto
- [ ] Crear estructura de carpetas

### **FASE 2: Backend (30 min)**
- [ ] Crear `services/tiktok-roulette.js`
- [ ] Crear `routes/roulette.js`
- [ ] Integrar en `start.js`
- [ ] Migrar de SQLite a PostgreSQL

### **FASE 3: Frontend (45 min)**
- [ ] Crear navegación con tabs en `index.html`
- [ ] Adaptar `frontend/script.js` de ruleta
- [ ] Crear módulo `modules/roulette.js`
- [ ] Integrar overlays de ruleta

### **FASE 4: Correcciones (15 min)**
- [ ] Arreglar problema de imágenes del chat
- [ ] Optimizar código
- [ ] Limpiar archivos obsoletos

### **FASE 5: Testing (20 min)**
- [ ] Probar Subasta
- [ ] Probar Ruleta
- [ ] Probar Chat
- [ ] Probar Overlays
- [ ] Probar en Digital Ocean

---

## 🎨 DISEÑO DE NAVEGACIÓN

### Dashboard Principal (`index.html`)
```
┌─────────────────────────────────────────────────┐
│  TikToolStream  [@usuario]  [Conectar]  [Admin] │
├─────────────────────────────────────────────────┤
│                                                 │
│  [ 🎯 Subasta ]  [ 🎰 Ruleta ]  ← TABS         │
│                                                 │
├─────────────────────────────────────────────────┤
│                                                 │
│  [Contenido según tab activo]                  │
│                                                 │
│  • Subasta: Timer, Leaderboard, Controls       │
│  • Ruleta: Wheel, Participants, Config         │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## 🔧 DETALLES TÉCNICOS

### WebSocket Unificado
```javascript
// En start.js
wss.on('connection', (ws, req) => {
  const url = new URL(req.url, 'http://localhost');
  const mode = url.searchParams.get('mode'); // 'auction' | 'roulette'

  if (mode === 'auction') {
    handleAuctionClient(ws);
  } else if (mode === 'roulette') {
    handleRouletteClient(ws);
  }
});
```

### Base de Datos Compartida
- Mismo pool de conexiones PostgreSQL
- Tablas separadas por funcionalidad
- Usuario puede usar ambos sistemas con la misma cuenta

### Autenticación Compartida
- Mismo JWT para ambos sistemas
- Mismo middleware `authenticateToken`
- Permisos por rol (user/admin)

---

## 🚀 BENEFICIOS DE LA INTEGRACIÓN

1. **Un solo dominio**: `tiktoolstream.studio`
2. **Un solo login**: Autenticación unificada
3. **Un solo servidor**: Menos costos de hosting
4. **Mejor UX**: Cambio fluido entre modos
5. **Código compartido**: Menos duplicación

---

## ⚠️ PRECAUCIONES

1. **No romper funcionalidad actual de Subasta**
2. **Mantener compatibilidad con overlays existentes**
3. **No afectar datos de producción**
4. **Backup de base de datos antes de migración**
5. **Testing exhaustivo antes de deploy**

---

## 📊 PROGRESO

- [x] Análisis de ambos sistemas
- [x] Diseño de arquitectura
- [x] Creación de esquema SQL
- [ ] Integración de backend
- [ ] Integración de frontend
- [ ] Testing
- [ ] Deploy

---

**Tiempo estimado total:** 2-3 horas
**Complejidad:** Media-Alta
**Riesgo:** Bajo (con testing adecuado)

---

¡Empecemos la integración! 🚀
