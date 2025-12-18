# Guía de Despliegue en DigitalOcean - TikTools

## ⚠️ Solución al Error "Non-Zero Exit Code"

Este error ocurre cuando el contenedor falla al iniciar. Las causas más comunes son:

1. **Falta JWT_SECRET** (variable obligatoria)
2. **Error de conexión a base de datos**
3. **Dependencias faltantes en package.json**

## 📋 Pre-requisitos

### 1. Base de Datos PostgreSQL
- Crear un Managed Database PostgreSQL en DigitalOcean
- Obtener la connection string (DATABASE_URL)
- Formato: `postgresql://usuario:password@host:25060/database?sslmode=require`

### 2. Variables de Entorno Obligatorias

En el panel de DigitalOcean App Platform, configurar:

```bash
# OBLIGATORIO - Sin esto el contenedor falla
JWT_SECRET=generar-un-secret-aleatorio-minimo-32-caracteres

# OBLIGATORIO - Connection string de tu base de datos
DATABASE_URL=postgresql://usuario:password@host:25060/tiktools?sslmode=require

# Configuración básica
NODE_ENV=production
PORT=8080
HOST=0.0.0.0

# PayPal (si vas a usar pagos)
PAYPAL_CLIENT_ID=tu-client-id
PAYPAL_SECRET=tu-secret
PAYPAL_MODE=live

# CORS (opcional)
CORS_ORIGIN=*
```

### 3. Generar JWT_SECRET Seguro

Ejecuta en tu terminal local:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copia el resultado y úsalo como JWT_SECRET.

## 🚀 Paso a Paso: Despliegue

### Opción 1: Deploy desde GitHub (Recomendado)

1. **Subir código a GitHub**
   ```bash
   git add .
   git commit -m "Fix: Production deployment configuration"
   git push origin main
   ```

2. **Crear App en DigitalOcean**
   - Ve a Apps → Create App
   - Conecta tu repositorio GitHub: `Andres-back/TikTools`
   - Selecciona la rama `main`

3. **Configurar Build**
   - Detectará automáticamente Dockerfile
   - Build Command: (automático)
   - Run Command: `node server-new.js`
   - HTTP Port: `8080`

4. **Configurar Variables de Entorno**
   - Settings → Environment Variables
   - Añadir TODAS las variables listadas arriba
   - ⚠️ **IMPORTANTE**: No olvidar JWT_SECRET y DATABASE_URL

5. **Conectar Base de Datos**
   - Components → Add Resource
   - Selecciona tu PostgreSQL Managed Database
   - Esto creará automáticamente DATABASE_URL

6. **Deploy**
   - Click "Deploy"
   - Monitorear logs en tiempo real

### Opción 2: Deploy Manual con Docker

```bash
# 1. Login a DigitalOcean Container Registry
doctl registry login

# 2. Build imagen
docker build -t registry.digitalocean.com/your-registry/tiktools:latest .

# 3. Push imagen
docker push registry.digitalocean.com/your-registry/tiktools:latest

# 4. Crear App y seleccionar la imagen del registry
```

## 🔍 Verificar Despliegue

### Logs en Tiempo Real
```bash
# Ver logs de la aplicación
doctl apps logs <app-id> --follow

# O desde el panel web
Apps → Tu App → Runtime Logs
```

### Healthcheck
Después del deploy, verificar:
```bash
curl https://your-app.ondigitalocean.app/api/health
```

Respuesta esperada:
```json
{
  "status": "ok",
  "timestamp": "2025-12-17T...",
  "version": "2.0.0",
  "database": "postgresql"
}
```

## 🐛 Solución de Problemas

### Error: "Non-Zero Exit Code"

**Causa**: Falta JWT_SECRET o error en DB

**Solución**:
1. Verifica logs: `doctl apps logs <app-id>`
2. Busca líneas con `✗` o `ERROR:`
3. Añade JWT_SECRET si falta
4. Verifica DATABASE_URL está bien formada
5. Redeploy

### Error: "Database not available"

**Causa**: DATABASE_URL incorrecta o DB no accesible

**Solución**:
1. Verifica connection string en Database Settings
2. Asegúrate de incluir `?sslmode=require`
3. Verifica que la app tenga acceso a la DB (trusted sources)

### Error: "Module not found"

**Causa**: Dependencias no instaladas

**Solución**:
```bash
# Verificar package.json tiene todas las dependencias
npm install

# Verificar package-lock.json existe
git add package-lock.json
git commit -m "Add package-lock"
git push
```

### Container starts then exits immediately

**Causa**: Error no capturado en startup

**Solución**:
1. Ver logs completos
2. Buscar línea que dice "Server startup failed:"
3. Corregir el error específico
4. Redeploy

## 📊 Inicializar Base de Datos

### Opción 1: Auto-migración (Recomendado)
El código ahora crea las tablas automáticamente al iniciar.

### Opción 2: Manual con psql
```bash
# Conectar a la base de datos
psql "$DATABASE_URL"

# Copiar y pegar el contenido de database/schema.sql
\i database/schema.sql

# O ejecutar directamente
psql "$DATABASE_URL" -f database/schema.sql
```

## 👤 Crear Usuario Admin

### SQL directo en PostgreSQL:
```sql
-- Conectar: psql "$DATABASE_URL"

-- 1. Crear usuario (primero regístrate desde la app)
-- 2. Promover a admin
UPDATE users 
SET role='admin', 
    plan_type='premium', 
    plan_expires_at = NOW() + INTERVAL '30 days'
WHERE email='admin@tusitio.com';
```

### O usar la API:
```bash
# 1. Registrar
curl -X POST https://your-app.ondigitalocean.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@tusitio.com","password":"AdminPass123!","name":"Admin"}'

# 2. Luego ejecutar SQL de arriba para promover a admin
```

## 🔄 Actualizaciones

Cada push a `main` dispara un auto-deploy:
```bash
git add .
git commit -m "Update: feature X"
git push origin main

# DigitalOcean detecta el push y redeploya automáticamente
```

## 💰 Costos Estimados

- **Basic App**: ~$5/mes
- **Professional App**: ~$12/mes
- **PostgreSQL Managed Database**: ~$15/mes (Basic)
- **Total**: ~$20-27/mes

## 📞 Soporte

Si el error persiste:
1. Copia logs completos
2. Verifica todas las variables de entorno están configuradas
3. Confirma DATABASE_URL es válida: `psql "$DATABASE_URL" -c "SELECT 1"`

## ✅ Checklist Final

- [ ] JWT_SECRET configurado (32+ caracteres)
- [ ] DATABASE_URL apunta a PostgreSQL Managed Database
- [ ] NODE_ENV=production
- [ ] PayPal credentials configuradas (si usas pagos)
- [ ] Código pusheado a GitHub
- [ ] App conectada al repositorio
- [ ] Variables de entorno añadidas en App Settings
- [ ] Database conectada a la App
- [ ] Logs muestran "✓ Server listening on 0.0.0.0:8080"
- [ ] Healthcheck responde 200 OK
- [ ] Usuario admin creado
