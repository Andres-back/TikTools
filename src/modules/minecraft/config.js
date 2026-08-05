'use strict';

/**
 * Minecraft — configuración del módulo (Crafty Controller + servidor).
 * Todo sale del .env; sin tabla propia (las reglas viven en integration_rules).
 */

function minecraftEnvConfig(env = process.env) {
  return {
    craftyUrl: String(env.CRAFTY_URL || 'https://localhost:8443').replace(/\/+$/, ''),
    craftyUser: String(env.CRAFTY_USER || ''),
    craftyPassword: String(env.CRAFTY_PASSWORD || ''),
    craftyServerId: String(env.CRAFTY_SERVER_ID || ''),
    playitUrl: String(env.MC_PLAYIT_URL || ''),
    serverPort: String(env.MC_SERVER_PORT || '25565'),
    rconPort: String(env.MC_RCON_PORT || '25575')
  };
}

/** Valida la config esencial; devuelve un error legible o null. */
function craftyConfigError(cfg = minecraftEnvConfig()) {
  if (!cfg.craftyUser || !cfg.craftyPassword) {
    return 'CRAFTY_USER / CRAFTY_PASSWORD no están configurados en el .env de TikToolStream';
  }
  if (!cfg.craftyServerId) {
    return 'CRAFTY_SERVER_ID no está configurado en el .env de TikToolStream';
  }
  return null;
}

module.exports = { minecraftEnvConfig, craftyConfigError };
