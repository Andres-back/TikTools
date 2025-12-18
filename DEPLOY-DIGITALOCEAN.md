# 🚀 Guía de Deploy en Digital Ocean

Esta guía te ayudará a desplegar tu aplicación TikTok Auction en Digital Ocean.

## Opción 1: App Platform (Más Fácil) ⭐

App Platform es la opción más sencilla - maneja todo automáticamente.

### Pasos:

1. **Crea una cuenta en Digital Ocean**
   - Ve a [digitalocean.com](https://digitalocean.com)
   - Regístrate (hay $200 de crédito gratis para empezar)

2. **Sube tu código a GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/TU-USUARIO/tiktok-auction.git
   git push -u origin main
   ```

3. **Crea la App en Digital Ocean**
   - Ve a [App Platform](https://cloud.digitalocean.com/apps)
   - Click "Create App"
   - Conecta tu repositorio de GitHub
   - Selecciona tu repo y branch (main)

4. **Configura el Build**
   - **Source Directory**: `/` (raíz)
   - **Build Command**: `npm install`
   - **Run Command**: `npm start`

5. **Agrega las Variables de Entorno**
   ```
   NODE_ENV=production
   JWT_SECRET=<genera-una-clave-segura-aqui>
   TIKTOK_SESSION_ID=<tu-session-id-de-tiktok>
   TIKTOK_TT_TARGET_IDC=<tu-target-idc>
   ```
   
   Para generar JWT_SECRET seguro:
   ```bash
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```

6. **Agrega Base de Datos PostgreSQL**
   - En la configuración de tu App, click "Add Resource"
   - Selecciona "Database"
   - Elige "PostgreSQL" (Dev Database = $0/mes)
   - Digital Ocean automáticamente crea `DATABASE_URL`

7. **Deploy!**
   - Click "Create Resources"
   - Espera unos minutos
   - ¡Tu app estará lista!

### Costo Estimado:
- App: Desde $5/mes (Basic)
- Database: $0/mes (Dev) o desde $12/mes (Producción)

---

## Opción 2: Droplet con Docker

Más control, requiere más configuración.

### Pasos:

1. **Crea un Droplet**
   - Ve a Digital Ocean → Droplets → Create
   - Elige "Docker" en Marketplace
   - Tamaño: Basic $6/mes (1GB RAM, 1 CPU)
   - Datacenter: El más cercano a ti
   - Autenticación: SSH Key (recomendado)

2. **Conecta al Droplet**
   ```bash
   ssh root@TU-IP-DEL-DROPLET
   ```

3. **Clona tu repositorio**
   ```bash
   git clone https://github.com/TU-USUARIO/tiktok-auction.git
   cd tiktok-auction
   ```

4. **Configura variables de entorno**
   ```bash
   cp .env.example .env
   nano .env
   ```
   
   Edita las variables:
   ```
   NODE_ENV=production
   JWT_SECRET=tu-clave-super-secreta
   DATABASE_URL=postgresql://auction_user:auction_pass@postgres:5432/tiktok_auction
   TIKTOK_SESSION_ID=tu-session-id
   ```

5. **Inicia con Docker Compose**
   ```bash
   docker-compose up -d
   ```

6. **Verifica que funciona**
   ```bash
   docker-compose logs -f app
   ```

7. **Configura dominio (opcional)**
   - Agrega tu dominio en Digital Ocean → Networking → Domains
   - Crea un registro A apuntando a la IP de tu Droplet

### Comandos Útiles:
```bash
# Ver logs
docker-compose logs -f

# Reiniciar
docker-compose restart

# Actualizar código
git pull
docker-compose down
docker-compose up -d --build

# Ver estado
docker-compose ps
```

---

## Opción 3: Droplet Manual (Sin Docker)

Para más control total.

### 1. Crear Droplet
- Ubuntu 22.04 LTS
- Basic $6/mes mínimo

### 2. Instalar Node.js 20
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 3. Instalar PostgreSQL
```bash
sudo apt-get install -y postgresql postgresql-contrib

# Crear usuario y base de datos
sudo -u postgres psql
```
```sql
CREATE USER auction_user WITH PASSWORD 'tu_password_seguro';
CREATE DATABASE tiktok_auction OWNER auction_user;
\q
```

### 4. Configurar Aplicación
```bash
cd /var/www
git clone https://github.com/TU-USUARIO/tiktok-auction.git
cd tiktok-auction
npm install --production

# Configurar .env
cp .env.example .env
nano .env
```

### 5. Usar PM2 para Producción
```bash
npm install -g pm2
pm2 start server-new.js --name tiktok-auction
pm2 save
pm2 startup
```

### 6. Configurar Nginx (Proxy Reverso)
```bash
sudo apt-get install -y nginx

sudo nano /etc/nginx/sites-available/tiktok-auction
```

```nginx
server {
    listen 80;
    server_name tu-dominio.com;

    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/tiktok-auction /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 7. SSL con Let's Encrypt
```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d tu-dominio.com
```

---

## 🔐 Seguridad Importante

1. **Cambia JWT_SECRET** en producción
2. **No uses passwords por defecto** de PostgreSQL
3. **Configura firewall**:
   ```bash
   sudo ufw allow 22
   sudo ufw allow 80
   sudo ufw allow 443
   sudo ufw enable
   ```
4. **Actualiza regularmente**:
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

---

## 📊 Monitoreo

### Con App Platform:
- Dashboard incluido automáticamente
- Ve métricas en la consola de DO

### Con Droplet:
```bash
# Logs de PM2
pm2 logs

# Monitoreo
pm2 monit

# Estado
pm2 status
```

---

## 🆘 Troubleshooting

### Error de conexión a DB
```bash
# Verificar PostgreSQL
sudo systemctl status postgresql

# Ver logs
sudo tail -f /var/log/postgresql/postgresql-*-main.log
```

### Error de permisos
```bash
sudo chown -R $USER:$USER /var/www/tiktok-auction
```

### Puertos en uso
```bash
sudo lsof -i :8080
sudo kill -9 <PID>
```

### Reiniciar todo
```bash
pm2 restart all
# o con Docker:
docker-compose restart
```

---

¡Listo! Tu aplicación debería estar funcionando en Digital Ocean 🎉
