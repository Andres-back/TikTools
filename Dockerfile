# Usar Node.js 20 LTS
FROM node:20-slim

# Establecer directorio de trabajo
WORKDIR /app

# Instalar dependencias del sistema necesarias para pg y mejor rendimiento
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copiar archivos de dependencias primero (para cache de Docker)
COPY package*.json ./

# Instalar dependencias de producción
RUN npm ci --only=production --ignore-scripts && npm cache clean --force

# Copiar el resto del código
COPY . .

# Crear directorio para base de datos SQLite (dev)
RUN mkdir -p /app/database/data

# Exponer puerto
EXPOSE 8080

# Variables de entorno por defecto
ENV NODE_ENV=production
ENV PORT=8080
ENV HOST=0.0.0.0

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:8080/api/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))" || exit 1

# Usuario no-root para seguridad
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodeuser
USER nodeuser

# Comando de inicio
CMD ["node", "server-new.js"]
