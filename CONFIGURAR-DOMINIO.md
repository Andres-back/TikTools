# 🌐 Configuración del Dominio tiktoolstream.studio

## Paso 1: Configurar DNS en Name.com

1. **Inicia sesión en Name.com**
   - Ve a https://www.name.com
   - Inicia sesión con tu cuenta

2. **Ve a la configuración del dominio**
   - Click en "My Domains"
   - Busca `tiktoolstream.studio`
   - Click en "Manage"

3. **Configurar DNS Records**
   - Ve a la pestaña "DNS Records"
   - Necesitas agregar estos registros:

### Opción A: Apuntar a Digital Ocean App

```
Type: A
Host: @
Answer: <IP-de-tu-app-digital-ocean>
TTL: Automatic

Type: CNAME
Host: www
Answer: tiktoolstream.studio.
TTL: Automatic
```

Para obtener la IP de tu app en Digital Ocean:
- Ve a tu App en Digital Ocean
- Settings → Domains
- Ahí te mostrará las instrucciones específicas

### Opción B: Usar Digital Ocean Nameservers (RECOMENDADO)

1. En Digital Ocean:
   - Ve a Networking → Domains
   - Add Domain: `tiktoolstream.studio`
   - Te dará 3 nameservers como:
     ```
     ns1.digitalocean.com
     ns2.digitalocean.com
     ns3.digitalocean.com
     ```

2. En Name.com:
   - Ve a "Nameservers"
   - Cambia de "Name.com Nameservers" a "Custom Nameservers"
   - Agrega los 3 nameservers de Digital Ocean
   - Save

3. De vuelta en Digital Ocean:
   - Networking → Domains → tiktoolstream.studio
   - Agrega estos records:
     ```
     Type: A
     Hostname: @
     Will Direct To: Tu App (tiktools)
     TTL: 30 seconds
     
     Type: A
     Hostname: www
     Will Direct To: Tu App (tiktools)
     TTL: 30 seconds
     ```

## Paso 2: Configurar SSL/HTTPS

Digital Ocean automáticamente proveerá un certificado SSL gratuito (Let's Encrypt) cuando configures el dominio.

1. En tu App de Digital Ocean
2. Settings → Domains
3. Add Domain: `tiktoolstream.studio`
4. También agrega: `www.tiktoolstream.studio`

Digital Ocean manejará automáticamente:
- ✅ Certificado SSL
- ✅ Renovación automática
- ✅ Redirección HTTP → HTTPS

## Paso 3: Actualizar Variables de Entorno

Si usas CORS, actualiza la variable:

```bash
CORS_ORIGIN=https://tiktoolstream.studio
```

## Paso 4: Verificar la Configuración

**Tiempo de propagación:** 5 minutos - 48 horas (usualmente < 2 horas)

**Verificar DNS:**
```bash
# Windows PowerShell
nslookup tiktoolstream.studio

# Debería mostrar la IP de tu servidor
```

**Probar en navegador:**
```
https://tiktoolstream.studio
https://www.tiktoolstream.studio
```

## Troubleshooting

### El dominio no resuelve después de 24 horas

1. Verifica que los nameservers en Name.com coincidan exactamente
2. En Digital Ocean, verifica que los records A estén apuntando a tu app
3. Usa https://dnschecker.org para verificar propagación global

### Error de SSL/Certificado

1. Espera 10-15 minutos después de agregar el dominio
2. Digital Ocean genera el certificado automáticamente
3. Si persiste, elimina y vuelve a agregar el dominio en Settings → Domains

### Dominio muestra "404" o "No encontrado"

1. Verifica que tu app esté desplegada y corriendo
2. Revisa que el health check pase
3. Asegúrate de que el puerto sea 8080

## Configuración Completa ✅

Una vez todo esté configurado:

- ✅ `https://tiktoolstream.studio` → Tu app
- ✅ `https://www.tiktoolstream.studio` → Tu app (redirección automática)
- ✅ Certificado SSL válido
- ✅ Redirección HTTP → HTTPS automática
