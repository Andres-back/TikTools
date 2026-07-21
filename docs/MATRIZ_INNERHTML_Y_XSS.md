# Matriz de innerHTML y XSS — TikToolStream

---

## Usos de innerHTML (31 totales)

### CRÍTICOS — Datos de API sin sanitizar

| Archivo | Línea | Código | Dato | Riesgo |
|---------|-------|--------|------|--------|
| `modules/ui.js` | 281 | `div.innerHTML = ...` | Noticias: título, contenido, imagen_url | 🔴 Alto |
| `modules/ui.js` | 416 | `div.innerHTML = ...` | Chat: mensaje, nombre de usuario | 🔴 Alto |
| `admin.html` | 1202 | `container.innerHTML = ...` | Noticias: título, contenido | 🔴 Alto |
| `admin.html` | 1424 | `container.innerHTML = ...` | Usuarios: username, email | 🔴 Alto |
| `admin.html` | 1660 | `container.innerHTML = ...` | Chat: username, mensaje | 🔴 Alto |
| `admin.html` | 1732 | `container.innerHTML = ...` | Chat: mensajes | 🔴 Alto |
| `admin.html` | 1660 | `chat-item onclick` | Chat: username, email (antes de fix) | 🔴 Alto |
| `modules/leaderboard.js` | 169 | `top3.map(...)` | Donadores: nickname | 🟡 Medio |
| `modules/roulette.js` | 277 | `participantsList.innerHTML` | Participantes: displayName | 🟡 Medio |
| `modules/roulette.js` | 764 | `validGiftInfoImage.innerHTML` | Gift: nombre, imagen | 🟡 Medio |

### BAJO — Textos controlados por el sistema

| Archivo | Línea | Dato | Razón |
|---------|-------|------|-------|
| `modules/auth.js` | 309 | Nombre de usuario (propio) | El usuario ya está autenticado |
| `modules/ui.js` | 321, 350, 363, 384 | Textos fijos "No hay mensajes", etc. | Sin datos externos |
| `admin.html` | 1187, 1236, 1407, 1648, 1720, 1780 | "Cargando...", "Error..." | Textos fijos |
| `admin.html` | 1192, 1420, 1656 | "No hay datos..." | Textos fijos |
| `modules/leaderboard.js` | 139, 277 | "Esperando donaciones..." | Textos fijos |
| `modules/roulette.js` | 123, 133, 265, 737 | Textos de selectores | Textos fijos |

### RECOMENDACIONES

1. **Prioridad 1:** Migrar `ui.js:281` y `ui.js:416` a `textContent` + elementos creados con `document.createElement`
2. **Prioridad 2:** Migrar `admin.html` noticias y chat (líneas 1202, 1660, 1732)
3. **Prioridad 3:** Migrar `leaderboard.js` y `roulette.js` a `textContent` o `sanitize.escapeHtml()`

### Alternativa a innerHTML

Para los casos donde se necesita HTML enriquecido (noticias con formato), evaluar:

```js
import { escapeHtml } from '../shared/sanitize.js';
element.innerHTML = `<p>${escapeHtml(dangerousText)}</p>`;
```

O mejor, construir el DOM con API:

```js
const p = document.createElement('p');
p.textContent = dangerousText;
element.appendChild(p);
```
