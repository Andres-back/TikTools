# 🚨 SOLUCIÓN PASO A PASO - Digital Ocean

## ⚠️ Problema Actual

```
[dotenv@17.2.3] injecting env (0) from .env
```

Esto significa que **NO SE ESTÁN LEYENDO LAS VARIABLES DE ENTORNO**.

El error de SSL persiste porque Digital Ocean **NO tiene configuradas las variables de entorno**.

---

## ✅ SOLUCIÓN (Sigue EXACTAMENTE estos pasos)

### **Paso 1: Ir a Configuración de la App**

1. Ve a [https://cloud.digitalocean.com/apps](https://cloud.digitalocean.com/apps)
2. Haz clic en tu app **"tiktools"**
3. Haz clic en la pestaña **"Settings"**

### **Paso 2: Configurar Variables de Entorno**

1. En Settings, busca la sección **"App-Level Environment Variables"**
2. Haz clic en **"Edit"**
3. Haz clic en **"Bulk Editor"** (esquina superior derecha)
4. **BORRA TODO** lo que haya ahí
5. **COPIA Y PEGA EXACTAMENTE ESTO:**

```
NODE_ENV=production
PORT=8080
HOST=0.0.0.0
DATABASE_URL=postgresql://usuario:password@host:puerto/database?sslmode=require
JWT_SECRET=tu-jwt-secret-generado
```

**Obtén tus credenciales de:**
1. DATABASE_URL: Digital Ocean Dashboard → Databases → tu base de datos → Connection Details → Connection String
2. JWT_SECRET: Ejecuta `npm run generate:jwt` en tu terminal local

6. Haz clic en **"Save"**
7. Digital Ocean te preguntará si quieres re-desplegar → **Haz clic en "Save and Deploy"**

### **Paso 3: Esperar el Deploy**

1. Ve a la pestaña **"Runtime Logs"**
2. Espera a que termine el deploy (2-5 minutos)
3. Deberías ver estos logs **EXITOSOS**:

```
🔗 Connecting to PostgreSQL...
✓ PostgreSQL connected successfully
✓ PostgreSQL schema initialized
✓ Server listening on 0.0.0.0:8080
✓ Environment: production
✓ Database: PostgreSQL
```

### **Paso 4: Verificar que Funciona**

```bash
curl https://tiktools-XXXXX.ondigitalocean.app/api/health
```

**Respuesta esperada:**
```json
{
  "status": "ok",
  "timestamp": "2025-12-18T04:30:00.000Z",
  "version": "2.0.0",
  "database": "postgresql"
}
```

---

## 🔍 Si AÚN Falla

### Opción 1: Verificar las Variables

1. Ve a Settings → App-Level Environment Variables
2. Verifica que veas **EXACTAMENTE** estas 5 variables:
   - `NODE_ENV` = production
   - `PORT` = 8080
   - `HOST` = 0.0.0.0
   - `DATABASE_URL` = postgresql://doadmin:AVNS...
   - `JWT_SECRET` = dbf13a50d...

### Opción 2: Verificar Component-Level Variables

Si las App-Level no funcionan:

1. Ve a la pestaña **"Components"**
2. Haz clic en **"web"** (tu servicio)
3. Haz clic en **"Edit"** o **"Settings"**
4. Busca **"Environment Variables"**
5. Agrega las **MISMAS** variables ahí
6. Guarda y redespliega

### Opción 3: Usar archivo .do/app.yaml

Si nada funciona, Digital Ocean puede leer la configuración desde un archivo:

1. Ya creé el archivo `.do/app.yaml` con la configuración
2. Haz commit y push:
   ```bash
   git add .
   git commit -m "Add Digital Ocean app.yaml configuration"
   git push origin main
   ```
3. Digital Ocean debería detectarlo automáticamente

---

## 📊 Diagnóstico Local (Antes de Hacer Push)

Ejecuta esto en tu computadora para verificar que el código funciona:

```bash
# 1. Crear archivo .env local
# Copia DIGITAL-OCEAN-ENV.txt a .env

# 2. Diagnosticar
npm run diagnose

# 3. Probar conexión (requiere acceso a la DB)
npm run diagnose:full
```

---

## ❓ Preguntas Frecuentes

### ¿Por qué dice "injecting env (0)"?

Porque Digital Ocean **NO tiene configuradas** las variables de entorno. Sigue el Paso 2 arriba.

### ¿Dónde exactamente configuro las variables?

**Settings → App-Level Environment Variables → Edit → Bulk Editor**

NO en:
- ❌ Component-Level (a menos que App-Level no funcione)
- ❌ Archivo .env (ese es solo para desarrollo local)
- ❌ Dockerfile (las variables van en Digital Ocean UI)

### ¿Qué hace el código nuevo?

```javascript
ssl: {
  rejectUnauthorized: false,  // ← Acepta certificados auto-firmados
  checkServerIdentity: () => undefined  // ← No valida hostname
}
```

Esto es **necesario** para Digital Ocean porque usan certificados SSL auto-firmados.

---

## ✅ Checklist Final

- [ ] Variables configuradas en Digital Ocean (App-Level)
- [ ] Guardado y re-desplegado
- [ ] Logs muestran "PostgreSQL connected successfully"
- [ ] Health check funciona
- [ ] NO dice más "injecting env (0)"
- [ ] NO dice más "self-signed certificate"

---

## 🆘 Si NADA Funciona

Comparte los **Runtime Logs** completos de Digital Ocean aquí y te ayudo a diagnosticar.

**Los logs deben mostrar:**
1. Las variables de entorno que se cargan
2. El intento de conexión a PostgreSQL
3. El error específico (si hay)
