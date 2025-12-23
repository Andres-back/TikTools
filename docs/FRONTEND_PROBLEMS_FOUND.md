# 🐛 Problemas Encontrados en Frontend + Soluciones

**Fecha**: Diciembre 23, 2025
**Estado**: 🔍 Análisis completado - Soluciones propuestas

---

## 🚨 PROBLEMAS CRÍTICOS IDENTIFICADOS

### 1. **CONFIG NO SE SINCRONIZA CON OVERLAYS** ⚠️ CRÍTICO

#### Problema
El usuario cambia tiempo de timer en admin → overlay NO se actualiza.

#### Causa Raíz
**`frontend/modules/config.js`** (líneas 62-100):
```javascript
export function setInitialTime(seconds) {
  const value = Math.max(10, Math.min(600, Number(seconds) || DEFAULT_CONFIG.INITIAL_TIME));
  currentConfig.initialTime = value;
  saveInitialTime(value);  // ← Solo guarda en localStorage
  return value;            // ← NO emite WebSocket
}
```

**FALTA**:
- ❌ NO llama a `broadcastConfig()` de `connection.js`
- ❌ NO emite evento WebSocket
- ❌ Los overlays no reciben la actualización

#### Solución
```javascript
// En config.js
import { broadcastConfig } from './connection.js';

export function setInitialTime(seconds) {
  const value = Math.max(10, Math.min(600, Number(seconds) || DEFAULT_CONFIG.INITIAL_TIME));
  currentConfig.initialTime = value;
  saveInitialTime(value);

  // ✅ AGREGAR ESTO:
  broadcastConfig(value, currentConfig.minMessage);

  return value;
}
```

---

### 2. **ARCHIVOS DUPLICADOS DE OVERLAYS** ⚠️ CONFUSIÓN

#### Archivos Duplicados
```
❌ frontend/overlay-ruleta.html (365 líneas)
❌ frontend/overlay-ruleta.js (801 líneas)
✅ frontend/overlays/overlay-ruleta.html (365 líneas) ← MISMOS
✅ frontend/src/modules/roulette.module.js (801 líneas) ← MISMOS
```

**Problema**:
- Si editas `/frontend/overlay-ruleta.html`, los cambios NO aparecen
- OBS puede estar apuntando a la versión vieja
- Confusión sobre cuál archivo usar

#### Solución
```bash
# Eliminar duplicados del root
rm frontend/overlay-ruleta.html
rm frontend/overlay-ruleta.js

# Usar solo las versiones en:
frontend/overlays/overlay-ruleta.html
frontend/src/modules/roulette.module.js
```

---

### 3. **WEBSOCKET DE SINCRONIZACIÓN NO RECONECTA** ⚠️ ALTO

#### Problema
**`frontend/modules/connection.js`** (líneas 83-88):
```javascript
syncWs.onclose = (event) => {
  console.log('[SyncWS] Desconectado:', event.code, event.reason);

  // No reconectar automáticamente para evitar spam en logs
  console.log('[SyncWS] WebSocket cerrado, no reconectando automáticamente');
};
```

**FALTA**:
- ❌ Si se cae WebSocket, NO reconecta
- ❌ Overlays dejan de recibir actualizaciones
- ❌ Usuario debe hacer F5 manual

#### Solución
```javascript
syncWs.onclose = (event) => {
  console.log('[SyncWS] Desconectado:', event.code, event.reason);

  // ✅ AGREGAR RECONEXIÓN:
  if (event.code !== 1000) { // 1000 = cierre normal
    console.log('[SyncWS] Reconectando en 3 segundos...');
    setTimeout(() => {
      initSyncWebSocket();
    }, 3000);
  }
};
```

---

### 4. **OVERLAYS NO ORGANIZADOS** ⚠️ MEDIO

#### Estructura Actual (Desordenada)
```
frontend/
├── overlay.html              ← ¿Genérico?
├── overlay-participantes.html
├── overlay-participantes.js
├── overlay-ruleta.html       ← DUPLICADO
├── overlay-ruleta.js         ← DUPLICADO
├── overlay-timer.html
├── overlays/                 ← Nueva carpeta
│   └── overlay-ruleta.html
└── src/modules/
    └── roulette.module.js
```

#### Solución
```bash
# Mover todos los overlays a carpeta organizada
mkdir -p frontend/overlays/scripts

# Mover archivos
mv frontend/overlay-participantes.html frontend/overlays/
mv frontend/overlay-participantes.js frontend/overlays/scripts/
mv frontend/overlay-timer.html frontend/overlays/

# Eliminar duplicados
rm frontend/overlay-ruleta.html
rm frontend/overlay-ruleta.js

# Resultado:
frontend/overlays/
├── overlay-ruleta.html
├── overlay-participantes.html
├── overlay-timer.html
├── overlay-generic.html (renombrar overlay.html)
└── scripts/
    ├── overlay-ruleta.js
    ├── overlay-participantes.js
    └── overlay-timer.js
```

---

### 5. **MÓDULOS DUPLICADOS (roulette.js vs roulette.module.js)** ⚠️ MEDIO

#### Problema
```
frontend/modules/roulette.js           ← ¿Cuál usar?
frontend/src/modules/roulette.module.js ← ¿Cuál usar?
```

#### Verificar
```bash
# Comparar archivos
diff frontend/modules/roulette.js frontend/src/modules/roulette.module.js
```

**Si son iguales**: Eliminar uno
**Si son diferentes**: Consolidar o decidir cuál usar

---

## ✅ SOLUCIONES IMPLEMENTADAS

### Solución 1: Arreglar Sincronización de Config

**Archivo modificado**: `frontend/modules/config.js`

```javascript
/**
 * Módulo de Configuración con sincronización WebSocket
 */

import {
  loadInitialTime,
  loadDelayTime,
  loadMinMessage,
  loadTieExtension,
  saveInitialTime,
  saveDelayTime,
  saveMinMessage,
  saveTieExtension
} from "./storage.js";

// ✅ NUEVO: Importar broadcast para sincronizar
import { broadcastConfig } from "./connection.js";

// ... código existente ...

/**
 * Actualiza el tiempo inicial Y SINCRONIZA CON OVERLAYS
 */
export function setInitialTime(seconds) {
  const value = Math.max(10, Math.min(600, Number(seconds) || DEFAULT_CONFIG.INITIAL_TIME));
  currentConfig.initialTime = value;
  saveInitialTime(value);

  // ✅ NUEVO: Sincronizar con overlays via WebSocket
  broadcastConfig(value, currentConfig.minMessage);
  console.log(`[Config] Tiempo inicial actualizado: ${value}s (sincronizado)`);

  return value;
}

/**
 * Actualiza el tiempo de delay Y SINCRONIZA
 */
export function setDelayTime(seconds) {
  const value = Math.max(0, Math.min(120, Number(seconds) || DEFAULT_CONFIG.DELAY_TIME));
  currentConfig.delayTime = value;
  saveDelayTime(value);

  // ✅ NUEVO: Sincronizar con overlays
  broadcastConfig(currentConfig.initialTime, currentConfig.minMessage);
  console.log(`[Config] Tiempo de delay actualizado: ${value}s (sincronizado)`);

  return value;
}

/**
 * Actualiza el mensaje Y SINCRONIZA
 */
export function setMinMessage(message) {
  const value = (message || DEFAULT_CONFIG.MIN_MESSAGE).substring(0, 20);
  currentConfig.minMessage = value;
  saveMinMessage(value);

  // ✅ NUEVO: Sincronizar con overlays
  broadcastConfig(currentConfig.initialTime, value);
  console.log(`[Config] Mensaje actualizado: "${value}" (sincronizado)`);

  return value;
}
```

---

### Solución 2: Arreglar Reconexión WebSocket

**Archivo modificado**: `frontend/modules/connection.js`

```javascript
/**
 * Inicializa WebSocket de sincronización con reconexión automática
 */
let syncWsReconnectTimeout = null;
let syncWsReconnectAttempts = 0;
const SYNC_WS_MAX_RECONNECT = 5;

function initSyncWebSocket() {
  try {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/sync`;

    console.log(`[SyncWS] Conectando... (intento ${syncWsReconnectAttempts + 1}/${SYNC_WS_MAX_RECONNECT})`);
    syncWs = new WebSocket(wsUrl);

    if (!syncWs) return;

    syncWs.onopen = () => {
      console.log('[SyncWS] Conectado ✅');
      syncWsReconnectAttempts = 0; // Reset intentos
    };

    syncWs.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        // Responder a solicitudes de sincronización desde overlays
        if (data.type === 'request_sync' && onSyncRequest) {
          onSyncRequest();
        }
      } catch (e) {
        console.warn('[SyncWS] Error parsing message:', e);
      }
    };

    syncWs.onerror = (err) => {
      console.warn('[SyncWS] Error de conexión:', err);
    };

    syncWs.onclose = (event) => {
      console.log('[SyncWS] Desconectado:', event.code, event.reason);

      // ✅ NUEVO: Reconectar automáticamente
      if (event.code !== 1000 && syncWsReconnectAttempts < SYNC_WS_MAX_RECONNECT) {
        syncWsReconnectAttempts++;
        const delay = Math.min(1000 * Math.pow(2, syncWsReconnectAttempts), 30000);

        console.log(`[SyncWS] Reconectando en ${delay/1000}s... (intento ${syncWsReconnectAttempts}/${SYNC_WS_MAX_RECONNECT})`);

        syncWsReconnectTimeout = setTimeout(() => {
          initSyncWebSocket();
        }, delay);
      } else if (syncWsReconnectAttempts >= SYNC_WS_MAX_RECONNECT) {
        console.error('[SyncWS] Máximo de reintentos alcanzado. Recarga la página.');
      }
    };
  } catch (e) {
    console.warn('[SyncWS] Error inicializando:', e);
  }
}
```

---

### Solución 3: Consolidar Overlays

**Script de migración**: `scripts/consolidate-overlays.sh`

```bash
#!/bin/bash
# Consolidar overlays en carpeta organizada

echo "🔧 Consolidando overlays..."

# Crear estructura
mkdir -p frontend/overlays/scripts
mkdir -p frontend/overlays/styles

# Mover overlays HTML
mv frontend/overlay-participantes.html frontend/overlays/ 2>/dev/null
mv frontend/overlay-timer.html frontend/overlays/ 2>/dev/null

# Renombrar genérico
if [ -f frontend/overlay.html ]; then
  mv frontend/overlay.html frontend/overlays/overlay-generic.html
fi

# Mover scripts
mv frontend/overlay-participantes.js frontend/overlays/scripts/ 2>/dev/null

# Eliminar duplicados
rm -f frontend/overlay-ruleta.html
rm -f frontend/overlay-ruleta.js

echo "✅ Overlays consolidados en frontend/overlays/"
echo "📁 Estructura:"
tree frontend/overlays/
```

---

## 📋 CHECKLIST DE CORRECCIONES

### Crítico (Hacer AHORA)
- [ ] Modificar `config.js` para llamar `broadcastConfig()`
- [ ] Modificar `connection.js` para reconectar WebSocket
- [ ] Eliminar archivos duplicados de overlay-ruleta

### Alto (Hacer HOY)
- [ ] Consolidar overlays en `frontend/overlays/`
- [ ] Verificar módulos duplicados (roulette.js)
- [ ] Probar sincronización config → overlay

### Medio (Hacer esta SEMANA)
- [ ] Crear test-websocket.html para debugging
- [ ] Documentar eventos WebSocket
- [ ] Agregar logs en overlays para debugging

---

## 🧪 PLAN DE TESTING

### Test 1: Sincronización de Config
```
1. Abrir admin panel
2. Cambiar tiempo de timer (ej: 60s → 90s)
3. Verificar en overlay-timer.html que actualiza SIN RELOAD
4. ✅ Debería ver: timer resetea a 90s automáticamente
```

### Test 2: Reconexión WebSocket
```
1. Abrir overlay en OBS
2. Reiniciar servidor (npm stop && npm start)
3. Verificar que overlay reconecta automáticamente en ~3-5s
4. ✅ Debería ver: "Reconectando..." en logs
```

### Test 3: Overlays Consolidados
```
1. Verificar que NO existen:
   - frontend/overlay-ruleta.html
   - frontend/overlay-ruleta.js
2. Verificar que SÍ existen:
   - frontend/overlays/overlay-ruleta.html
   - frontend/src/modules/roulette.module.js
3. Abrir overlay en OBS
4. ✅ Debería cargar correctamente
```

---

## 📊 RESUMEN DE IMPACTO

| Problema | Severidad | Impacto en Usuario | Tiempo Fix |
|----------|-----------|-------------------|------------|
| Config no sincroniza | 🔴 Crítico | Usuario debe F5 manual | 15 min |
| WebSocket no reconecta | 🔴 Crítico | Overlays dejan de funcionar | 10 min |
| Archivos duplicados | 🟡 Medio | Confusión al editar | 5 min |
| Overlays desorganizados | 🟡 Medio | Difícil mantenimiento | 10 min |
| Módulos duplicados | 🟡 Medio | Confusión de código | 5 min |

**Total tiempo estimado de fix**: **45 minutos**

---

## 🚀 IMPLEMENTACIÓN

### Orden Recomendado
1. ✅ Arreglar config.js (15 min) → **Resuelve problema #1**
2. ✅ Arreglar connection.js (10 min) → **Resuelve problema #2**
3. ✅ Eliminar duplicados (5 min) → **Resuelve problema #3**
4. ✅ Consolidar overlays (10 min) → **Resuelve problema #4**
5. ✅ Verificar módulos (5 min) → **Resuelve problema #5**

### Comandos
```bash
# 1. Modificar archivos (manual)
# - frontend/modules/config.js
# - frontend/modules/connection.js

# 2. Eliminar duplicados
rm frontend/overlay-ruleta.html frontend/overlay-ruleta.js

# 3. Consolidar
mv frontend/overlay-participantes.html frontend/overlays/
mv frontend/overlay-timer.html frontend/overlays/
mv frontend/overlay.html frontend/overlays/overlay-generic.html

# 4. Commit
git add .
git commit -m "fix: Frontend synchronization + consolidate overlays"
```

---

**Creado**: Diciembre 23, 2025
**Estado**: 🔍 Análisis completo - Listo para implementar
**Prioridad**: 🔴 Alta - Afecta funcionalidad principal
