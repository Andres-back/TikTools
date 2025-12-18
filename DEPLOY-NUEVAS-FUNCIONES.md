# 🚀 GUÍA DE DEPLOY - NUEVAS FUNCIONALIDADES

## ⚠️ IMPORTANTE: Leer Antes de Deployar

Este deploy agrega 10 nuevas funcionalidades importantes:
1. ✅ Logos 3x más grandes
2. ✅ Menú de perfil + logout
3. ✅ Sistema de novedades (admin)
4. ✅ Chat usuario-admin
5. ✅ Overlays personalizados
6. ✅ Barra flotante de acciones
7. ✅ 3 nuevas tablas en base de datos
8. ✅ Subida de archivos (multer)
9. ✅ 3 nuevos endpoints API
10. ✅ CSS y JavaScript mejorados

---

## 📋 CHECKLIST PRE-DEPLOY

### ✅ 1. Verificar Archivos Locales
```bash
# Asegurarse de que estos archivos existen:
ls routes/news.js
ls routes/chat.js
ls routes/overlays.js
ls frontend/modules/ui.js
ls frontend/app-styles.css
ls migrate-new-tables.js
```

### ✅ 2. Verificar Dependencias
```bash
# Confirmar que multer está en package.json
cat package.json | grep multer
# Debe mostrar: "multer": "^1.4.5-lts.1"
```

### ✅ 3. Commit y Push
```bash
git status
git add .
git commit -m "Feature: Profile menu, news, chat, overlay customization - Full implementation"
git push origin main
```

---

## 🗄️ MIGRACIÓN DE BASE DE DATOS

### Opción A: Desde Local (Recomendado)

Si puedes conectarte a la base de datos de producción desde tu máquina:

```bash
# 1. Asegúrate de tener DATABASE_URL en .env
# DATABASE_URL=postgresql://user:password@host:port/database?sslmode=require

# 2. Ejecutar script de migración
node migrate-new-tables.js
```

### Opción B: Desde Digital Ocean Console

1. Ir a Digital Ocean → Databases → tu base PostgreSQL
2. Click en "Pools & Users" → Copiar connection string
3. Click en "Console" (o usa un cliente como pgAdmin)
4. Ejecutar este SQL:

```sql
-- Tabla de noticias/novedades
CREATE TABLE IF NOT EXISTS news (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    image_url TEXT,
    author_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_news_created_at ON news(created_at DESC);

-- Tabla de mensajes (chat usuario-admin)
CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    recipient_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    image_url TEXT,
    read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_recipient ON messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);

-- Tabla de configuración de overlays por usuario
CREATE TABLE IF NOT EXISTS overlays (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    left_image_url TEXT DEFAULT '/assets/QuesadillaCrocodilla.webp',
    right_image_url TEXT DEFAULT '/assets/Noel.webp',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Trigger para updated_at en overlays
DROP TRIGGER IF EXISTS update_overlays_updated_at ON overlays;
CREATE TRIGGER update_overlays_updated_at
    BEFORE UPDATE ON overlays
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

5. Verificar que las tablas se crearon:
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('news', 'messages', 'overlays');
```

Deberías ver 3 filas:
- news
- messages
- overlays

---

## 🔧 CONFIGURACIÓN EN DIGITAL OCEAN

### 1. Verificar Variables de Entorno

En Digital Ocean App Platform:
1. Settings → Components → tiktools → Environment Variables
2. Verificar que existen:
   - `DATABASE_URL` ✅
   - `JWT_SECRET` ✅
   - `NODE_ENV=production` ✅

### 2. Configurar Directorios Persistentes (Opcional)

Si quieres que los archivos subidos persistan entre deploys:

1. Settings → Components → tiktools
2. Scroll a "Persistent Volumes"
3. Add Volume:
   - Name: `uploads`
   - Mount Path: `/workspace/uploads`
   - Size: `1 GB` (ajustar según necesidad)

**NOTA:** Si no configuras volumen persistente, los archivos se perderán en cada deploy. Para producción, considera usar S3 o DigitalOcean Spaces.

### 3. Health Check (Opcional)

Verificar que el health check funciona:
- Health Check Path: `/api/health`
- Port: `8080`

---

## 🚀 PROCESO DE DEPLOY

### 1. Monitorear Build

Después de hacer push:
1. Ir a Digital Ocean → Apps → tiktools
2. Click en "Runtime Logs"
3. Ver el progreso del build:
   ```
   ✓ Installing dependencies
   ✓ Building application
   ✓ Starting application
   ```

### 2. Verificar Logs de Inicio

Buscar estas líneas en los logs:
```
🔍 DIAGNÓSTICO DE INICIO
NODE_ENV: production
DATABASE_URL: SET ✓
JWT_SECRET: SET ✓

✓ Database connection established
🚀 Server is running
   Port: 8080
   Environment: production
```

### 3. Verificar Health Check

```bash
curl https://tu-app.ondigitalocean.app/api/health
```

Respuesta esperada:
```json
{
  "status": "ok",
  "timestamp": "2024-01-...",
  "version": "2.0.0",
  "database": "postgresql",
  "env": {
    "nodeEnv": "production",
    "hasDatabase": true,
    "hasJWT": true
  }
}
```

---

## 🧪 TESTING POST-DEPLOY

### 1. Test Básico de UI

1. Abrir `https://tu-app.ondigitalocean.app`
2. Verificar que el header aparece con logo
3. Login con usuario existente
4. Verificar que aparece el menú con nombre de usuario
5. Click en nombre → Debe mostrar "Cerrar Sesión"
6. NO hacer logout todavía

### 2. Test de Modales

1. Verificar barra flotante visible (lado derecho)
2. Click en 📰 → Modal de novedades debe abrir
3. Click en 💬 → Modal de chat debe abrir
4. Click en 🎨 → Modal de overlay debe abrir
5. Cerrar modales con X o ESC

### 3. Test de Funcionalidad Existente

**CRÍTICO: Verificar que nada se rompió**

1. Ir a la pantalla de subasta
2. Intentar conectar a un live de TikTok (usar @testuser o similar)
3. Verificar que:
   - ✅ Conexión funciona
   - ✅ Timer inicia
   - ✅ Leaderboard muestra datos
   - ✅ Configuración guarda
   - ✅ Plan banner aparece correctamente

### 4. Test de Nuevas Funcionalidades

#### A. Sistema de Novedades (Admin Only)

**Prerequisito**: Necesitas un usuario con rol 'admin'

```sql
-- Convertir usuario a admin (ejecutar en BD)
UPDATE users SET role = 'admin' WHERE username = 'tu_usuario';
```

Luego:
1. Logout y login nuevamente
2. Click en 📰 Novedades
3. Debe aparecer formulario "Publicar Novedad"
4. Llenar título y contenido
5. Subir imagen (opcional)
6. Click "Publicar"
7. Verificar que aparece en la lista

#### B. Chat Usuario-Admin

1. Como usuario normal, click en 💬
2. Escribir mensaje y enviar
3. Como admin, abrir chat
4. Ver mensaje del usuario
5. Responder
6. Subir imagen con 📎
7. Verificar que aparece en ambos lados

#### C. Overlay Personalizado

1. Click en 🎨 Overlay
2. Subir imagen izquierda (JPG/PNG/WEBP)
3. Subir imagen derecha
4. Click "Guardar Overlay"
5. Copiar URL del overlay
6. Abrir URL en nueva pestaña:
   `https://tu-app.ondigitalocean.app/overlay/TU_USER_ID`
7. Verificar que muestra tus imágenes personalizadas

---

## 🐛 TROUBLESHOOTING

### Error: "Cannot POST /api/news"

**Causa**: Multer no instalado o ruta no montada

**Solución**:
1. Verificar en logs: `npm install multer`
2. Verificar en start.js: `app.use('/api/news', newsRoutes)`
3. Re-deploy

### Error: "relation 'news' does not exist"

**Causa**: Migraciones no ejecutadas

**Solución**:
1. Ejecutar SQL de migración en BD
2. Verificar tablas: `\dt` en psql
3. Reiniciar app

### Error: "ENOENT: no such file or directory 'uploads/news'"

**Causa**: Directorio uploads no existe

**Solución**:
```bash
# En el contenedor de Digital Ocean (via Console)
mkdir -p uploads/news uploads/chat uploads/overlays
```

O en start.js, agregar al inicio:
```javascript
const fs = require('fs');
['uploads/news', 'uploads/chat', 'uploads/overlays'].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});
```

### Modales no abren

**Causa**: ui.js no cargó o error JavaScript

**Solución**:
1. Abrir console (F12)
2. Buscar errores
3. Verificar que `initUI()` se llamó en main.js
4. Verificar que app-styles.css se cargó

### Imágenes no se muestran después de deploy

**Causa**: Archivos subidos se pierden en cada deploy

**Solución**:
1. Configurar volumen persistente (ver arriba)
2. O migrar a S3/Spaces para producción
3. Alternativa temporal: re-subir imágenes después de deploy

---

## 📊 MONITOREO POST-DEPLOY

### Métricas a Vigilar

1. **Logs de Error**: Revisar durante 1-2 horas después
2. **Uso de CPU**: Debería mantenerse < 80%
3. **Uso de Memoria**: Debería ser < 512MB
4. **Requests**: Ver si /api/news, /api/chat, /api/overlays tienen errores

### Comandos Útiles

```bash
# Ver logs en tiempo real
doctl apps logs <app-id> --follow

# Ver estado de la app
doctl apps get <app-id>

# Reiniciar si es necesario
doctl apps restart <app-id>
```

---

## ✅ CHECKLIST FINAL

- [ ] Git push exitoso
- [ ] Build completado sin errores
- [ ] Migraciones de BD ejecutadas
- [ ] Health check pasa
- [ ] UI carga correctamente
- [ ] Header y menú visibles
- [ ] Barra flotante visible
- [ ] 3 modales abren y cierran
- [ ] Funcionalidad de subasta NO rota
- [ ] Timer funciona
- [ ] Leaderboard funciona
- [ ] Conexión TikTok funciona
- [ ] (Admin) Novedades se pueden publicar
- [ ] Chat envía/recibe mensajes
- [ ] Overlay personalizado guarda
- [ ] Logout funciona correctamente

---

## 🎉 SUCCESS!

Si todo funciona:
1. ✅ 10/10 funcionalidades implementadas
2. ✅ Sin errores en producción
3. ✅ Funcionalidad existente intacta
4. ✅ Nuevas features operativas

**Next Steps:**
- Probar con usuarios reales
- Configurar dominio tiktoolstream.studio (ver CONFIGURAR-DOMINIO.md)
- Considerar automatización de pagos (ver AUTOMATIZAR-PAGOS.md)
- Configurar volúmenes persistentes para uploads
- Opcional: Migrar uploads a DigitalOcean Spaces/S3

---

## 📞 Soporte

Si algo falla:
1. **No entrar en pánico** 🧘
2. Revisar logs: Runtime Logs en Digital Ocean
3. Verificar migraciones: Conectarse a BD y verificar tablas
4. Rollback si es necesario: `git revert HEAD` y push
5. Contactar soporte si persiste

**¡Buena suerte con el deploy! 🚀**
