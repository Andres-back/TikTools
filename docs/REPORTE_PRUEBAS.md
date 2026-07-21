# Reporte de Pruebas - TikToolStream

## Estado Actual: Sin Pruebas Automatizadas

Este proyecto **no tiene ningún test automatizado** implementado. No existe directorio `tests/`, ningún archivo `*.test.js`, ni framework de testing configurado.

---

## Comandos de Prueba Existentes

| Comando | Resultado | Motivo |
|---------|-----------|--------|
| `npm test` (alias `node test-coins-count.js`) | ❌ FALLA | `test-coins-count.js` no existe en el repositorio |
| `npm run check` (alias `node check-config.js`) | ❌ FALLA | `check-config.js` no existe en el repositorio |
| `npm run diagnose` | ✅ PASA | Script existe y funciona |

---

## Cobertura de Pruebas Requerida

Basado en el código existente, se requieren las siguientes pruebas:

### Módulo de Autenticación
- [ ] Registro exitoso con email @gmail.com
- [ ] Registro rechaza dominios no-Gmail
- [ ] Registro rechaza password < 6 caracteres
- [ ] Registro rechaza usuario duplicado
- [ ] Login exitoso con username
- [ ] Login exitoso con email
- [ ] Login rechaza credenciales inválidas
- [ ] Login rechaza email no verificado
- [ ] Login rechaza plan expirado
- [ ] Refresh token genera nuevos tokens
- [ ] Refresh token rechaza token inválido
- [ ] Logout invalida sesión
- [ ] Profile devuelve datos del usuario
- [ ] Change password funciona correctamente
- [ ] Rate limit en login después de 5 intentos

### Módulo de Subastas
- [ ] Crear subasta con datos válidos
- [ ] Crear subasta sin tiktokUsername rechaza
- [ ] Crear subasta sin plan activo rechaza
- [ ] Listar subastas del usuario
- [ ] Obtener subasta específica con donors y gifts
- [ ] Actualizar subasta (título, estado, notas)
- [ ] Registrar regalo crea donador nuevo
- [ ] Registrar regalo actualiza donador existente
- [ ] Registrar regalo suma total_coins_collected
- [ ] Finalizar subasta declara ganador correcto
- [ ] Finalizar subasta actualiza posiciones
- [ ] Finalizar subasta sin donadores funciona
- [ ] Eliminar subastra
- [ ] Stats devuelve datos del usuario

### Módulo de Administración
- [ ] Listar usuarios con filtros
- [ ] Obtener detalle de usuario con historial
- [ ] Crear usuario desde admin
- [ ] Actualizar usuario
- [ ] Eliminar usuario (no admin)
- [ ] Rechazar eliminar admin
- [ ] Añadir días a usuario
- [ ] Quitar días a usuario
- [ ] Toggle status de usuario
- [ ] Dashboard devuelve métricas

### Módulo de Planes
- [ ] checkPlanMiddleware permite admin siempre
- [ ] checkPlanMiddleware bloquea plan expirado
- [ ] checkPlanMiddleware bloquea cuenta inactiva
- [ ] activateTrialDays asigna 2 días
- [ ] addDaysToUser extiende desde expiración actual
- [ ] removeDaysFromUser nunca deja negativo

### Módulo de Pagos
- [ ] getPlans devuelve planes disponibles
- [ ] createOrder crea payment pendiente
- [ ] captureOrder completa pago y añade días
- [ ] getPaymentHistory devuelve historial

### Módulo de Ruleta
- [ ] Agregar participante nuevo
- [ ] Actualizar entries de participante existente
- [ ] Eliminar participante
- [ ] Eliminar entrada (reduce entries)
- [ ] Eliminar última entrada declara ganador
- [ ] Reset elimina todos los participantes
- [ ] Config se guarda y recupera

### Módulo de Chat
- [ ] Enviar mensaje usuario → admin
- [ ] Enviar mensaje admin → usuario
- [ ] Obtener historial entre usuario y admin
- [ ] Usuario no puede ver chat de otro usuario
- [ ] Marcar mensaje como leído

### Módulo de Noticias
- [ ] GET /api/news público funciona
- [ ] POST /api/news requiere admin
- [ ] DELETE /api/news/:id requiere admin

### Módulo de Overlays
- [ ] GET /api/overlays/:identifier público funciona
- [ ] GET /api/overlays/my requiere auth
- [ ] POST /api/overlays guarda configuración

### Seguridad
- [ ] CORS bloquea orígenes no permitidos
- [ ] Rate limit bloquea después de N intentos
- [ ] Helmet agrega headers de seguridad
- [ ] Sanitización previene XSS en inputs
- [ ] JWT inválido es rechazado
- [ ] Tokens expirados son rechazados
- [ ] Refresh token no funciona como access token

---

## Stack de Testing Recomendado

```json
{
  "devDependencies": {
    "node:test": "built-in",
    "supertest": "^7.0.0",
    "sinon": "^19.0.0",
    "better-sqlite3": "^11.10.0"
  }
}
```

Node.js 22 tiene test runner integrado (`node --test`), no requiere framework externo. Para testing HTTP usar `supertest`.

---

## Conclusión

El proyecto requiere una implementación completa de pruebas desde cero. No hay líneas de código de prueba existentes.
