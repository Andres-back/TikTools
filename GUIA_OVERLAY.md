# Sistema de Subasta TikTok Live - Guía de Uso

## 📋 Resumen de Cambios

### ✅ Problema 1: Timer Corregido
El sistema del timer ya está funcionando. Los elementos DOM están correctamente inicializados.

**Para probar:**
1. Abre http://localhost:8080
2. Haz clic en "▶ Iniciar" en los controles de subasta
3. El timer debería comenzar la cuenta regresiva

**Si el timer no inicia:**
- Abre la consola del navegador (F12)
- Busca mensajes de error
- Verifica que los elementos HTML existan (timerDisplay, timerCard)

---

### ✅ Problema 2: Overlay para TikTok - IMPLEMENTADO

Se creó un **overlay independiente** que muestra solo el leaderboard y se sincroniza automáticamente con la aplicación principal.

## 🎯 Cómo Usar el Overlay en TikTok

### Paso 1: Abrir las dos páginas

1. **Aplicación Principal** (Panel de control):
   ```
   http://localhost:8080
   ```
   Esta página tiene todos los controles y el panel lateral.

2. **Overlay para TikTok** (Solo leaderboard):
   ```
   http://localhost:8080/overlay.html
   ```
   Esta página muestra SOLO el Top Donadores sin controles.

### Paso 2: Agregar Overlay a TikTok Live (OBS Studio)

1. **Abre OBS Studio** (o tu software de streaming)

2. **Agrega una fuente de navegador:**
   - Haz clic en **[+]** en la sección "Fuentes"
   - Selecciona **"Navegador"**
   - Nombre: "Leaderboard TikTok"

3. **Configura la fuente:**
   ```
   URL: http://localhost:8080/overlay.html
   Ancho: 450
   Alto: 600
   ```

4. **Transparencia:**
   - ✅ Marca "Apagar fuente cuando no está visible"
   - ✅ Marca "Actualizar el navegador cuando la escena se activa"
   - Desmarca "Controlar audio mediante OBS"

5. **Posiciona el overlay:**
   - Arrastra el leaderboard a la esquina donde quieras mostrarlo
   - Ajusta el tamaño según necesites
   - El fondo es semi-transparente, se verá bien sobre tu video

### Paso 3: Sincronización Automática

El overlay se sincroniza automáticamente:
- ✅ Se conecta al mismo servidor WebSocket
- ✅ Recibe actualizaciones en tiempo real
- ✅ Muestra los mismos donadores que en la app principal
- ✅ Las animaciones se ejecutan simultáneamente

**No necesitas hacer nada más** - ambas páginas se actualizan solas cuando llegan donaciones.

---

## 🖥️ URLs del Sistema

| Propósito | URL | Descripción |
|-----------|-----|-------------|
| **App Principal** | http://localhost:8080 | Panel completo con controles |
| **Overlay TikTok** | http://localhost:8080/overlay.html | Solo leaderboard para OBS |
| **WebSocket** | ws://localhost:8080/live | Conexión tiempo real |

---

## 🎨 Personalización del Overlay

Si quieres cambiar el aspecto del overlay:

### Cambiar Tamaño
Edita `frontend/overlay.html`, línea ~44:
```css
max-width: 420px;  /* Cambia este valor */
```

### Cambiar Transparencia del Fondo
Edita `frontend/overlay.html`, línea ~43:
```css
background: rgba(15, 23, 42, 0.92);  /* Último número es opacidad (0-1) */
```

### Ocultar Elementos
- Para ocultar el título "🏆 Top Donadores", busca `.leaderboard-header` y agrega `display: none;`
- Para mostrar solo Top 1, busca `donors.map((donor, index)` y cambia el slice

---

## 🔧 Resolución de Problemas

### El overlay no se conecta
1. Verifica que el servidor esté corriendo: http://localhost:8080
2. Abre la consola del navegador en el overlay (F12)
3. Busca mensajes de "[Overlay]"
4. El overlay se reconecta automáticamente cada 3 segundos

### El leaderboard no se actualiza
1. Verifica que la app principal esté conectada a TikTok Live
2. Asegúrate de que haya donaciones activas
3. El broadcast ocurre cada vez que se actualiza el ranking

### OBS no muestra el overlay correctamente
1. Verifica que la URL sea correcta: http://localhost:8080/overlay.html
2. Asegúrate de que el ancho/alto sean suficientes (450x600)
3. Haz clic derecho en la fuente → Propiedades → Actualizar
4. Reinicia la fuente si es necesario

---

## 📝 Notas Técnicas

### Arquitectura de Sincronización
```
┌──────────────┐     WebSocket      ┌──────────────┐
│ App Principal│ ───────────────────>│   Servidor   │
│ (localhost)  │ <───────────────────│  Node.js     │
└──────────────┘                     └──────────────┘
                                            │
                                            │ broadcast
                                            ▼
                                     ┌──────────────┐
                                     │   Overlay    │
                                     │  (TikTok)    │
                                     └──────────────┘
```

### Mensajes WebSocket
- `leaderboard-update`: Enviado cuando cambia el ranking
- `gift`: Regalo/donación de TikTok Live
- `connected`: Conexión exitosa
- `error`: Errores del sistema

---

## 🚀 Ejemplo de Uso Completo

1. **Inicia el servidor:**
   ```powershell
   node server.js
   ```

2. **Abre la app principal:**
   - Ve a http://localhost:8080
   - Ingresa un usuario de TikTok
   - Haz clic en "Conectar"
   - Inicia el timer

3. **Configura OBS:**
   - Agrega fuente navegador con http://localhost:8080/overlay.html
   - Posiciona en la esquina
   - Inicia tu stream

4. **¡Listo!**
   - Cuando lleguen donaciones en TikTok Live
   - Se actualizarán en ambas páginas
   - El leaderboard en OBS se verá en tu stream

---

## ❓ Preguntas Frecuentes

**P: ¿Puedo usar dos overlays diferentes?**
R: Sí, puedes abrir overlay.html múltiples veces con URLs diferentes y todos se sincronizarán.

**P: ¿Funciona sin internet?**
R: Sí, todo funciona en localhost. Solo necesitas internet para conectarte al TikTok Live.

**P: ¿Puedo cambiar los colores?**
R: Sí, edita las variables CSS en overlay.html en la sección `:root`.

**P: ¿El overlay consume muchos recursos?**
R: No, es muy ligero. Solo HTML+CSS+JavaScript vanilla.

---

Creado por: Andrecchh Tools
Fecha: Diciembre 2025
