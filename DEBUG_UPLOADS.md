# Debug de Problemas de Upload - Guía de Diagnóstico

## Problemas Reportados

1. **Overlay images**: Error 404 al cargar imágenes (ej: `1766174854485-zdfvixa7k.webp`)
2. **News images**: Imágenes de novedades no se ven
3. **Chat**: No se pueden enviar mensajes

## Logging Implementado

He añadido logging detallado a los 3 módulos de upload para diagnosticar el problema:

### 1. Overlays (`routes/overlays.js`)

**Tags de log**: `[OVERLAY-UPLOAD]`, `[OVERLAY-POST]`

**Qué verás en los logs**:
```
[OVERLAY-UPLOAD] Destination check: <ruta>
[OVERLAY-UPLOAD] Creating directory: <ruta>  (solo si no existe)
[OVERLAY-UPLOAD] Directory ready for file: <nombre_original>
[OVERLAY-UPLOAD] Generated filename: <nombre_único>
[OVERLAY-POST] Request from user <userId>
[OVERLAY-POST] Files received: <leftImage|rightImage|none>
[OVERLAY-POST] Processing left image: <filename>
[OVERLAY-POST] Left image URL set to: /uploads/overlays/<filename>
[OVERLAY-POST] File saved at: <path_completo>
[OVERLAY-POST] Database updated successfully for user <userId>
```

### 2. News (`routes/news.js`)

**Tags de log**: `[NEWS-UPLOAD]`, `[NEWS-POST]`

**Qué verás en los logs**:
```
[NEWS-UPLOAD] Destination check: <ruta>
[NEWS-UPLOAD] Creating directory: <ruta>  (solo si no existe)
[NEWS-UPLOAD] Directory ready for file: <nombre_original>
[NEWS-UPLOAD] Generated filename: <nombre_único>
[NEWS-POST] Request from user <userId>
[NEWS-POST] File received: <filename|none>
[NEWS-POST] Image URL set to: /uploads/news/<filename>
[NEWS-POST] File saved at: <path_completo>
[NEWS-POST] Database updated successfully
```

### 3. Chat (`routes/chat.js`)

**Tags de log**: `[CHAT-UPLOAD]`, `[CHAT-POST]`

**Qué verás en los logs**:
```
[CHAT-UPLOAD] Destination check: <ruta>
[CHAT-UPLOAD] Creating directory: <ruta>  (solo si no existe)
[CHAT-UPLOAD] Directory ready for file: <nombre_original>
[CHAT-UPLOAD] Generated filename: <nombre_único>
[CHAT-POST] Content-Type: <tipo>
[CHAT-POST] Using JSON mode|multipart mode
[CHAT-POST] Request from user <userId> (admin: true|false)
[CHAT-POST] Message: "<mensaje>"
[CHAT-POST] File received: <filename|none>
[CHAT-POST] Admin sending to user <userId>|User sending to admin <adminId>
[CHAT-POST] Image URL set to: /uploads/chat/<filename>
[CHAT-POST] File saved at: <path_completo>
[CHAT-POST] Message saved successfully with ID <messageId>
```

### 4. Static File Serving (`start.js`)

**Tag de log**: `[UPLOADS]`

**Qué verás en los logs**:
```
[UPLOADS] Request: /overlays/<filename>
[UPLOADS] Request: /news/<filename>
[UPLOADS] Request: /chat/<filename>
```

## Cómo Diagnosticar

### Paso 1: Intentar reproducir los errores

1. **Overlay**: Cambiar la imagen del overlay en visualización
2. **News**: Crear una novedad con imagen
3. **Chat**: Enviar un mensaje (con o sin imagen)

### Paso 2: Revisar los logs del servidor

Busca los logs con los tags mencionados arriba. Aquí está lo que debes verificar:

#### Si NO aparecen logs de UPLOAD:
- **Problema**: El request no está llegando a multer
- **Posible causa**:
  - Frontend no está enviando el FormData correctamente
  - Middleware de autenticación bloqueando el request
  - Ruta incorrecta

#### Si aparecen logs de UPLOAD pero NO de POST:
- **Problema**: Multer está procesando pero falla antes del handler
- **Posible causa**:
  - Archivo excede 5MB
  - Tipo de archivo no permitido
  - Error en multer middleware

#### Si aparecen ambos logs pero el archivo no existe:
- **Problema**: El archivo se guarda pero no se puede leer después
- **Posible causa**:
  - Permisos del directorio `uploads/` en producción
  - Path mismatch entre donde se guarda y donde se sirve
  - Archivo se borra después (revisa logs de DELETE)

#### Si aparece el log `[UPLOADS] Request:` con 404:
- **Problema**: El servidor recibe el request pero no encuentra el archivo
- **Posible causa**:
  - El archivo no existe en el filesystem
  - Path incorrecto en la base de datos
  - Directorio `uploads/` vacío en producción

### Paso 3: Verificar filesystem

En el servidor de producción (Digital Ocean), ejecuta:

```bash
# Verificar que existen los directorios
ls -la uploads/
ls -la uploads/overlays/
ls -la uploads/news/
ls -la uploads/chat/

# Verificar archivos recientes
find uploads/ -type f -mtime -1  # archivos del último día

# Verificar permisos
ls -la uploads/
```

**Permisos correctos**:
- Directorios: `drwxr-xr-x` (755)
- Archivos: `-rw-r--r--` (644)

### Paso 4: Verificar base de datos

Conecta a PostgreSQL y verifica las URLs guardadas:

```sql
-- Overlays
SELECT user_id, left_image_url, right_image_url FROM overlays ORDER BY updated_at DESC LIMIT 10;

-- News
SELECT id, title, image_url FROM news ORDER BY created_at DESC LIMIT 10;

-- Chat
SELECT id, sender_id, message, image_url FROM messages WHERE image_url IS NOT NULL ORDER BY created_at DESC LIMIT 10;
```

Verifica que las URLs tienen el formato correcto: `/uploads/<categoria>/<filename>`

## Escenarios Comunes

### Escenario A: Logs muestran que el archivo se guardó pero 404
```
[OVERLAY-POST] File saved at: /app/uploads/overlays/1766174854485-zdfvixa7k.webp
[UPLOADS] Request: /overlays/1766174854485-zdfvixa7k.webp
```

**Diagnóstico**: El archivo se guardó exitosamente, pero cuando el frontend lo solicita, no se encuentra.

**Posibles causas**:
1. **Digital Ocean monta el filesystem en modo ephemeral** - Los archivos se pierden al reiniciar
2. **Path absoluto vs relativo** - El archivo se guarda en una ubicación diferente a donde se sirve
3. **Contenedor Docker** - Los archivos están en el contenedor pero no en un volumen persistente

**Solución recomendada**:
- Usar un servicio de almacenamiento externo (Digital Ocean Spaces, AWS S3, Cloudinary)
- O configurar un volumen persistente en Digital Ocean Apps

### Escenario B: No aparecen logs de upload
```
[CHAT-POST] Content-Type: application/json
[CHAT-POST] Using JSON mode
[CHAT-POST] Message: "test"
[CHAT-POST] File received: none
```

**Diagnóstico**: El frontend está enviando JSON en lugar de FormData.

**Posibles causas**:
1. El código del frontend no está creando FormData para imágenes
2. El botón de upload no funciona

**Solución**: Revisar el código del frontend para asegurar que usa FormData cuando hay archivos.

### Escenario C: Error antes de llegar al handler
```
[CHAT-UPLOAD] Destination check: /app/uploads/chat
Error: EACCES: permission denied, mkdir '/app/uploads/chat'
```

**Diagnóstico**: Permisos insuficientes para crear directorios.

**Solución**:
```bash
# En el servidor
chmod -R 755 uploads/
chown -R node:node uploads/  # o el usuario que corre Node.js
```

## Próximos Pasos

1. **Deploy estos cambios** a producción
2. **Reproduce los 3 errores** (overlay, news, chat)
3. **Captura los logs** del servidor
4. **Comparte los logs** para análisis detallado

Con esta información podremos identificar exactamente dónde está fallando el proceso de upload.
