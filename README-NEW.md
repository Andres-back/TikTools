# TikTok Live Auction System

Sistema de subastas en vivo para TikTok con autenticación de usuarios, base de datos y tracking de regalos.

## 🚀 Características

- **Conexión en tiempo real** a streams de TikTok Live
- **Sistema de autenticación** con JWT (registro, login, tokens)
- **Base de datos** PostgreSQL (producción) / SQLite (desarrollo)
- **Tracking de regalos** y estadísticas por usuario
- **Leaderboard en tiempo real** con animaciones
- **Overlay para OBS** integrado
- **Timer configurable** con fases y alertas
- **Deploy ready** para Digital Ocean

## 📦 Instalación

### Desarrollo Local

```bash
# Clonar repositorio
git clone <tu-repo>
cd tiktok-live-auction

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus valores

# Iniciar servidor
npm start
```

### Con Docker

```bash
# Construir y ejecutar
docker-compose up -d

# Ver logs
docker-compose logs -f app

# Detener
docker-compose down
```

## 🔧 Configuración

### Variables de Entorno

| Variable | Descripción | Default |
|----------|-------------|---------|
| `PORT` | Puerto del servidor | 8080 |
| `NODE_ENV` | Entorno (development/production) | development |
| `DATABASE_URL` | URL de PostgreSQL | SQLite local |
| `JWT_SECRET` | Clave secreta para tokens | (requerido en prod) |
| `TIKTOK_SESSION_ID` | Session ID de TikTok | (opcional) |

### Obtener TikTok Session ID

1. Abre TikTok.com en tu navegador
2. Inicia sesión en tu cuenta
3. Abre DevTools (F12) → Application → Cookies
4. Busca `sessionid_ss` o `sessionid`
5. Copia el valor y ponlo en `.env`

## 🌐 API Endpoints

### Autenticación

```
POST /api/auth/register  - Crear cuenta
POST /api/auth/login     - Iniciar sesión
POST /api/auth/refresh   - Renovar token
POST /api/auth/logout    - Cerrar sesión
GET  /api/auth/profile   - Obtener perfil
PUT  /api/auth/profile   - Actualizar perfil
PUT  /api/auth/password  - Cambiar contraseña
```

### Subastas

```
GET    /api/auctions           - Listar subastas
POST   /api/auctions           - Crear subasta
GET    /api/auctions/:id       - Obtener subasta
PUT    /api/auctions/:id       - Actualizar subasta
DELETE /api/auctions/:id       - Eliminar subasta
POST   /api/auctions/:id/gifts - Registrar regalo
POST   /api/auctions/:id/finish - Finalizar subasta
```

### Estadísticas

```
GET /api/stats - Obtener estadísticas del usuario
```

## 🚢 Deploy en Digital Ocean

### Opción 1: App Platform (Recomendado)

1. Ve a [Digital Ocean App Platform](https://cloud.digitalocean.com/apps)
2. Conecta tu repositorio de GitHub
3. Configura:
   - **Source**: Tu repositorio
   - **Branch**: main
   - **Build Command**: `npm install`
   - **Run Command**: `npm start`
4. Agrega variables de entorno:
   - `NODE_ENV=production`
   - `JWT_SECRET=<tu-clave-segura>`
   - `DATABASE_URL=<url-de-tu-db>`
5. Deploy!

### Opción 2: Droplet con Docker

```bash
# En tu Droplet
git clone <tu-repo>
cd tiktok-live-auction

# Configurar
cp .env.example .env
nano .env  # Editar valores

# Ejecutar
docker-compose up -d
```

### Opción 3: Droplet Manual

```bash
# Instalar Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Instalar PostgreSQL
sudo apt-get install -y postgresql postgresql-contrib

# Configurar DB
sudo -u postgres createuser --interactive
sudo -u postgres createdb tiktok_auction

# Clonar y configurar
git clone <tu-repo>
cd tiktok-live-auction
npm install --production

# Usar PM2 para producción
npm install -g pm2
pm2 start server-new.js --name tiktok-auction
pm2 save
pm2 startup
```

## 📁 Estructura del Proyecto

```
├── database/
│   ├── db.js          # Conexión a base de datos
│   └── schema.sql     # Esquema PostgreSQL
├── frontend/
│   ├── index.html     # Aplicación principal
│   ├── overlay.html   # Overlay para OBS
│   ├── main.js        # JavaScript principal
│   ├── styles.css     # Estilos
│   └── modules/       # Módulos JS
├── middleware/
│   └── auth.js        # Middleware de autenticación
├── routes/
│   ├── auth.js        # Rutas de autenticación
│   └── auctions.js    # Rutas de subastas
├── server-new.js      # Servidor con Express
├── Dockerfile         # Configuración Docker
├── docker-compose.yml # Orquestación Docker
└── .env.example       # Ejemplo de configuración
```

## 🔒 Seguridad

- Contraseñas hasheadas con bcrypt
- Tokens JWT con expiración
- Refresh tokens para renovación segura
- Protección CORS configurable
- Usuario no-root en Docker

## 📊 Base de Datos

### Tablas

- `users` - Usuarios del sistema
- `sessions` - Sesiones activas (refresh tokens)
- `auctions` - Subastas creadas
- `donors` - Donadores por subasta
- `gifts` - Regalos recibidos
- `user_stats` - Estadísticas agregadas
- `user_settings` - Configuración por usuario

## 🛠️ Desarrollo

```bash
# Modo desarrollo
npm run dev

# Verificar configuración
npm run check

# Tests
npm test
```

## 📝 Licencia

MIT
