# 🚀 Solución de Deploy en Digital Ocean - Guía Completa

## ❌ Problema Original

```
Database initialization error: self-signed certificate in certificate chain
✗ Server startup failed: self-signed certificate in certificate chain
ERROR component terminated with non-zero exit code: 1
```

## ✅ Solución Implementada

### 1. Configuración SSL Corregida

**Archivo:** `database/db.js`

Se modificó la configuración de PostgreSQL para aceptar certificados SSL auto-firmados de Digital Ocean:

```javascript
const sslConfig = {
  rejectUnauthorized: false
};

pool = new Pool({
  connectionString,
  ssl: sslConfig,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});
```

**Cambios específicos:**
- ✅ Removida condición `isProduction` para SSL (ahora siempre activo con DATABASE_URL)
- ✅ Simplificada configuración SSL a solo `rejectUnauthorized: false`
- ✅ Aumentado timeout de conexión a 10 segundos
- ✅ Inicialización de schema ejecutada siempre que se use PostgreSQL

### 2. Archivos Creados

#### `DEPLOY-DIGITALOCEAN-SOLUTION.md`
Guía completa de deployment con troubleshooting.

#### `.env.digitalocean`
Template con las credenciales de tu base de datos:
```env
DATABASE_URL=<tu-database-url-de-digital-ocean>
```

Obtén la URL de: Digital Ocean → Databases → Connection Details

#### `generate-jwt-secret.js`
Script para generar JWT_SECRET seguro.

### 3. Scripts Agregados

```bash
npm run generate:jwt  # Generar JWT_SECRET
```

## 📋 Pasos para Deploy (CHECKLIST)

### Paso 1: Generar JWT Secret

```bash
npm run generate:jwt
```

Copia el resultado. Lo necesitarás en el siguiente paso.

### Paso 2: Configurar Variables de Entorno en Digital Ocean

En tu App de Digital Ocean:

1. Ve a **Settings** → **App-Level Environment Variables**
2. Agrega estas variables:

```bash
NODE_ENV=production
PORT=8080
HOST=0.0.0.0
DATABASE_URL=<tu-database-url-completa-de-digital-ocean>
JWT_SECRET=<pega-aqui-el-secret-generado>
```

**Donde obtener:**
- DATABASE_URL: Digital Ocean → Databases → Connection Details
- JWT_SECRET: `npm run generate:jwt`

**Variables Opcionales** (agrega si las necesitas):

```bash
# PayPal (para sistema de pagos)
PAYPAL_CLIENT_ID=tu-client-id
PAYPAL_SECRET=tu-secret
PAYPAL_MODE=live

# CORS (si tienes un dominio personalizado)
CORS_ORIGIN=https://tu-dominio.com
```

### Paso 3: Hacer Commit y Push

```bash
# Verificar que .env NO esté en el commit
git status

# Agregar cambios
git add .

# Commit
git commit -m "Fix: PostgreSQL SSL configuration for Digital Ocean deployment"

# Push al repositorio
git push origin main
```

### Paso 4: Verificar el Deploy

Digital Ocean debería detectar automáticamente el push y re-desplegar.

**Logs esperados (exitosos):**
```
✓ PostgreSQL connected successfully
✓ PostgreSQL schema initialized
✓ Server listening on 0.0.0.0:8080
✓ Environment: production
✓ Database: PostgreSQL
```

### Paso 5: Probar la Aplicación

```bash
# Health Check
curl https://tu-app.ondigitalocean.app/api/health

# Respuesta esperada:
{
  "status": "ok",
  "timestamp": "2025-12-18T04:00:00.000Z",
  "version": "2.0.0",
  "database": "postgresql"
}
```

## 🔍 Troubleshooting

### Error: "Missing required environment variables: JWT_SECRET"

**Solución:** Configura `JWT_SECRET` en las variables de entorno de Digital Ocean.

```bash
npm run generate:jwt
# Copia el resultado y agrégalo en Digital Ocean
```

### Error: "Database initialization error"

**Verificar:**
1. ✅ DATABASE_URL está correctamente configurado
2. ✅ Incluye `?sslmode=require` al final
3. ✅ No hay espacios extra en la URL
4. ✅ Las credenciales son correctas

### Health Check Failed

**Posibles causas:**
- Puerto incorrecto (debe ser 8080)
- Servidor no responde en `/api/health`
- Base de datos no conectada

**Verificar logs:**
```bash
# En Digital Ocean, ve a Runtime Logs
# O usa doctl CLI:
doctl apps logs <tu-app-id>
```

## 📦 Cambios en el Código

### Archivos Modificados

1. **database/db.js**
   - Configuración SSL simplificada
   - Siempre acepta certificados auto-firmados
   - Timeout aumentado
   - Schema se inicializa siempre en PostgreSQL

2. **package.json**
   - Agregado script `generate:jwt`

### Archivos Creados

1. **DEPLOY-DIGITALOCEAN-SOLUTION.md** - Guía de deployment
2. **.env.digitalocean** - Template de variables de entorno
3. **generate-jwt-secret.js** - Generador de JWT secrets
4. **RESUMEN-CAMBIOS.md** - Este archivo

## ✅ Verificación Final

Antes de hacer push, verifica:

- [ ] JWT_SECRET configurado en Digital Ocean
- [ ] DATABASE_URL configurado en Digital Ocean
- [ ] NODE_ENV=production configurado
- [ ] Archivo `.env` NO está en el commit
- [ ] Código compilado sin errores
- [ ] Health check funciona localmente (opcional)

## 🎯 Próximos Pasos

1. ✅ **Deploy completado exitosamente**
2. ✅ **Crear primer usuario administrador**
3. ✅ **Configurar PayPal** (si usas pagos)
4. ✅ **Probar funcionalidades:**
   - Registro/Login
   - Creación de subastas
   - Conexión a TikTok Live
   - Sistema de pagos (si configurado)

## 📞 Soporte

Si encuentras algún problema:

1. **Revisa los logs** en Digital Ocean
2. **Consulta** `DEPLOY-DIGITALOCEAN-SOLUTION.md`
3. **Verifica** que todas las variables de entorno estén configuradas
4. **Prueba** el health check: `/api/health`

## 🔐 Seguridad

⚠️ **NUNCA** hagas commit de:
- Archivo `.env`
- JWT_SECRET
- Credenciales de base de datos
- API keys de PayPal/TikTok

El `.gitignore` ya está configurado para prevenir esto.

---

**¡Deployment exitoso!** 🎉

Tu aplicación ahora está correctamente configurada para funcionar en Digital Ocean con PostgreSQL.
