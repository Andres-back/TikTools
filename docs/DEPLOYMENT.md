# 🚀 Guía de Deployment - TikToolStream

**Última actualización**: Diciembre 23, 2025

---

## 🎯 Stack de Producción

### Infraestructura Actual
- **Hosting**: Digital Ocean App Platform
- **Base de Datos**: PostgreSQL Managed Database (Digital Ocean)
- **Deployment**: Git push directo a Digital Ocean
- **SSL**: Automático via Digital Ocean

### ¿Por qué NO usamos Docker?

Digital Ocean App Platform **ya usa contenedores internamente**, por lo que:
- ❌ No necesitas Dockerfile
- ❌ No necesitas docker-compose.yml
- ✅ Digital Ocean detecta automáticamente Node.js
- ✅ Maneja build y deployment automáticamente

---

## 📋 Configuración en Digital Ocean

### 1. App Platform Settings

**Build Command:**
```bash
npm ci --only=production
```

**Run Command:**
```bash
node server-new.js
```

**Environment Variables (REQUERIDAS):**
```bash
NODE_ENV=production
PORT=8080
DATABASE_URL=postgresql://user:pass@host:25060/db?sslmode=require
JWT_SECRET=<generar-secret-seguro-32-chars>
CORS_ORIGIN=https://tu-dominio.com
PAYPAL_CLIENT_ID=<tu-paypal-client-id>
PAYPAL_SECRET=<tu-paypal-secret>
PAYPAL_MODE=live
```

**Environment Variables (OPCIONALES):**
```bash
TIKTOK_SESSION_ID=<si-lo-usas>
TIKTOK_TT_TARGET_IDC=<si-lo-usas>
```

---

## 🗄️ Base de Datos PostgreSQL

### Conexión desde App
Digital Ocean proporciona automáticamente:
- `${db.HOSTNAME}` → Host de la BD
- `${db.PORT}` → Puerto (25060)
- `${db.USERNAME}` → Usuario
- `${db.PASSWORD}` → Contraseña
- `${db.DATABASE}` → Nombre de BD

**DATABASE_URL se construye automáticamente:**
```
postgresql://${db.USERNAME}:${db.PASSWORD}@${db.HOSTNAME}:${db.PORT}/${db.DATABASE}?sslmode=require
```

### Ejecutar Migraciones

**Opción 1: Desde tu computadora (remoto)**
```bash
# 1. Obtener DATABASE_URL de Digital Ocean
export DATABASE_URL="postgresql://..."

# 2. Ejecutar migraciones
npm run migrate

# 3. O ejecutar manualmente
psql $DATABASE_URL < src/shared/database/schema.sql
```

**Opción 2: Console de Digital Ocean**
1. Ir a tu BD Managed Database en Digital Ocean
2. Click en "Console"
3. Ejecutar:
```sql
\i /path/to/schema.sql
```

---

## 🔧 Proceso de Deployment

### Deployment Automático (Recomendado)

Digital Ocean hace deployment automático cuando:
1. ✅ Haces `git push` a tu rama principal
2. ✅ Detecta cambios en el repo
3. ✅ Ejecuta build automáticamente
4. ✅ Despliega nueva versión
5. ✅ Zero-downtime deployment

### Deployment Manual

```bash
# 1. Asegúrate de que todo funciona local
npm start

# 2. Commit cambios
git add .
git commit -m "feat: nueva funcionalidad"

# 3. Push a GitHub/GitLab
git push origin main

# 4. Digital Ocean detecta el push y despliega automáticamente
```

---

## 📊 Monitoreo y Logs

### Ver Logs en Digital Ocean
1. Ir a tu App en Digital Ocean Dashboard
2. Click en "Runtime Logs"
3. Ver logs en tiempo real

### Logs de la App
El servidor genera logs en:
- `logs/combined.log` - Todos los logs
- `logs/error.log` - Solo errores

**En Digital Ocean estos logs se muestran en Runtime Logs**

---

## ⚙️ Configuración de Health Checks

Digital Ocean usa el endpoint `/api/health` para verificar que la app está viva.

**Endpoint configurado en `server-new.js`:**
```javascript
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});
```

**Health Check Settings en Digital Ocean:**
- HTTP Request Path: `/api/health`
- Port: 8080
- Timeout: 10s
- Period: 30s
- Success Threshold: 1
- Failure Threshold: 3

---

## 🔐 Variables de Entorno Sensibles

### Cómo Generar JWT_SECRET

```bash
# Opción 1: Usando npm script
npm run generate:jwt

# Opción 2: Usando Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Opción 3: Usando OpenSSL
openssl rand -hex 32
```

### Configurar en Digital Ocean

1. Ir a App Settings → Environment Variables
2. Añadir variable:
   - Key: `JWT_SECRET`
   - Value: `<secret-generado>`
   - ✅ Encrypt
3. Save

---

## 🚨 Troubleshooting

### App no arranca

**Check:**
1. ✅ `DATABASE_URL` está configurado correctamente
2. ✅ `JWT_SECRET` está configurado
3. ✅ Run command es `node server-new.js` (no `start.js`)
4. ✅ Build command es `npm ci --only=production`

**Ver logs:**
```bash
# En Digital Ocean Dashboard
Runtime Logs → Ver errores
```

### Conexión a BD falla

**Check:**
1. ✅ BD está en la misma región que la app
2. ✅ BD tiene "Trusted Sources" configurado (permite app)
3. ✅ `DATABASE_URL` incluye `?sslmode=require`
4. ✅ Credenciales son correctas

### Variables de entorno no se cargan

**Digital Ocean NO usa archivos .env**
- ❌ No uses `dotenv` en producción
- ✅ Configura variables en App Settings
- ✅ Variables se pasan como `process.env.*`

---

## 📦 Dependencias de Producción

**package.json solo necesita:**
```json
"dependencies": {
  "bcryptjs": "^3.0.3",
  "compression": "^1.8.1",
  "cors": "^2.8.5",
  "dotenv": "^17.2.3",
  "express": "^5.2.1",
  "express-rate-limit": "^8.2.1",
  "helmet": "^8.1.0",
  "jsonwebtoken": "^9.0.3",
  "multer": "^1.4.5-lts.1",
  "nodemailer": "^7.0.11",
  "pg": "^8.16.3",
  "tiktok-live-connector": "^2.0.2",
  "uuid": "^13.0.0",
  "winston": "^3.19.0",
  "winston-daily-rotate-file": "^5.0.0",
  "ws": "^8.17.0"
}
```

**NO necesitas `better-sqlite3` en producción (solo desarrollo)**

---

## ✅ Checklist de Deployment

### Pre-deployment
- [ ] Tests pasan: `npm test`
- [ ] App arranca local: `npm start`
- [ ] Migraciones ejecutadas en BD
- [ ] Variables de entorno configuradas en Digital Ocean
- [ ] `JWT_SECRET` generado y configurado
- [ ] `DATABASE_URL` apunta a BD de producción

### Post-deployment
- [ ] App está "Running" en Digital Ocean
- [ ] Health check pasa (verde)
- [ ] Logs no muestran errores críticos
- [ ] Endpoint `/api/health` responde 200
- [ ] Conexión a BD funciona
- [ ] Login funciona (JWT)
- [ ] Overlays se cargan

---

## 🔄 Rollback

Si algo falla después del deployment:

**Opción 1: Rollback en Digital Ocean**
1. Ir a App → Deployments
2. Click en deployment anterior (exitoso)
3. Click "Rollback to this deployment"

**Opción 2: Revert Git**
```bash
# 1. Revertir commit
git revert HEAD

# 2. Push
git push origin main

# 3. Digital Ocean despliega versión anterior automáticamente
```

---

## 📞 Soporte

- **Digital Ocean Docs**: https://docs.digitalocean.com/products/app-platform/
- **Digital Ocean Support**: Abrir ticket desde dashboard
- **Logs en tiempo real**: Digital Ocean → App → Runtime Logs

---

**Creado**: Diciembre 23, 2025
**Versión**: 1.0
**Estado**: Producción sin Docker
