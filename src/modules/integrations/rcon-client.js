'use strict';

const net = require('net');

const PACKET = Object.freeze({ RESPONSE: 0, COMMAND: 2, AUTH_RESPONSE: 2, AUTH: 3 });
const DEFAULT_ALLOWED_COMMANDS = Object.freeze([
  'say', 'tellraw', 'title', 'playsound', 'particle', 'summon', 'effect', 'give', 'time', 'weather'
]);
const HARD_DENIED_COMMANDS = Object.freeze([
  'stop', 'op', 'deop', 'ban', 'ban-ip', 'pardon', 'pardon-ip', 'whitelist', 'save-off',
  'reload', 'permission', 'permissions', 'lp', 'luckperms'
]);

class RconClient {
  constructor(options = {}) {
    this.host = String(options.host || '').trim();
    this.port = integer(options.port, 25575);
    this.password = String(options.password || '');
    this.connectTimeoutMs = bounded(options.connectTimeoutMs, 250, 10000, 1800);
    this.commandTimeoutMs = bounded(options.commandTimeoutMs, 250, 15000, 2600);
    this.maxResponseBytes = bounded(options.maxResponseBytes, 1024, 65536, 8192);
  }

  execute(command) {
    if (!this.host) return Promise.reject(rconError('RCON_HOST_REQUIRED', 'Host RCON requerido'));
    if (!this.password || this.password.length > 256) return Promise.reject(rconError('RCON_PASSWORD_INVALID', 'Contraseña RCON inválida'));
    if (this.port < 1 || this.port > 65535) return Promise.reject(rconError('RCON_PORT_INVALID', 'Puerto RCON inválido'));

    return new Promise((resolve, reject) => {
      const socket = net.createConnection({ host: this.host, port: this.port });
      const authId = randomRequestId();
      const commandId = authId + 1;
      let state = 'connecting';
      let buffer = Buffer.alloc(0);
      let response = '';
      let responseBytes = 0;
      let commandWritten = false;
      let settled = false;
      let idleTimer = null;

      const connectTimer = setTimeout(() => finish(rconError('RCON_CONNECT_TIMEOUT', 'Tiempo de conexión RCON agotado')), this.connectTimeoutMs);
      let commandTimer = null;

      function cleanup() {
        clearTimeout(connectTimer);
        clearTimeout(commandTimer);
        clearTimeout(idleTimer);
        socket.removeAllListeners();
        socket.destroy();
      }

      function finish(error, value) {
        if (settled) return;
        settled = true;
        cleanup();
        if (error) reject(error);
        else resolve(value);
      }

      function finishAfterIdle() {
        clearTimeout(idleTimer);
        idleTimer = setTimeout(() => finish(null, { response, bytes: responseBytes }), 110);
      }

      socket.setNoDelay(true);
      socket.on('connect', () => {
        clearTimeout(connectTimer);
        state = 'authenticating';
        socket.write(encodePacket(authId, PACKET.AUTH, this.password));
        commandTimer = setTimeout(() => finish(rconError('RCON_AUTH_TIMEOUT', 'Tiempo de autenticación RCON agotado')), this.commandTimeoutMs);
      });

      socket.on('data', (chunk) => {
        buffer = Buffer.concat([buffer, chunk]);
        let decoded;
        try { decoded = decodePackets(buffer); } catch (error) { finish(error); return; }
        buffer = decoded.remaining;

        for (const packet of decoded.packets) {
          if (state === 'authenticating') {
            if (packet.id === -1 && packet.type === PACKET.AUTH_RESPONSE) {
              finish(rconError('RCON_AUTH_FAILED', 'RCON rechazó la contraseña'));
              return;
            }
            if (packet.id === authId && packet.type === PACKET.AUTH_RESPONSE) {
              clearTimeout(commandTimer);
              state = 'executing';
              commandWritten = true;
              socket.write(encodePacket(commandId, PACKET.COMMAND, command));
              commandTimer = setTimeout(() => {
                const code = commandWritten ? 'RCON_RESULT_UNKNOWN' : 'RCON_COMMAND_TIMEOUT';
                finish(rconError(code, 'No se recibió confirmación del comando RCON'));
              }, this.commandTimeoutMs);
            }
            continue;
          }

          if (state === 'executing' && packet.id === commandId) {
            const bytes = Buffer.byteLength(packet.body, 'utf8');
            responseBytes += bytes;
            if (responseBytes > this.maxResponseBytes) {
              finish(rconError('RCON_RESPONSE_TOO_LARGE', 'La respuesta RCON superó el límite'));
              return;
            }
            response += packet.body;
            finishAfterIdle();
          }
        }
      });

      socket.on('error', (error) => {
        const code = commandWritten ? 'RCON_RESULT_UNKNOWN' : 'RCON_CONNECTION_ERROR';
        finish(rconError(code, code === 'RCON_RESULT_UNKNOWN' ? 'La conexión se perdió después de enviar el comando' : 'No se pudo conectar al servidor RCON', error));
      });

      socket.on('close', () => {
        if (settled) return;
        if (state === 'executing' && responseBytes > 0) finish(null, { response, bytes: responseBytes });
        else {
          const code = commandWritten ? 'RCON_RESULT_UNKNOWN' : 'RCON_CONNECTION_CLOSED';
          finish(rconError(code, commandWritten ? 'La conexión cerró sin confirmar el resultado' : 'El servidor RCON cerró la conexión'));
        }
      });
    });
  }
}

function encodePacket(id, type, body = '') {
  const bodyBuffer = Buffer.from(String(body), 'utf8');
  const size = 4 + 4 + bodyBuffer.length + 2;
  if (size > 4096) throw rconError('RCON_PACKET_TOO_LARGE', 'El paquete RCON supera 4096 bytes');
  const packet = Buffer.alloc(size + 4);
  packet.writeInt32LE(size, 0);
  packet.writeInt32LE(id, 4);
  packet.writeInt32LE(type, 8);
  bodyBuffer.copy(packet, 12);
  packet.writeUInt8(0, 12 + bodyBuffer.length);
  packet.writeUInt8(0, 13 + bodyBuffer.length);
  return packet;
}

function decodePackets(input) {
  let offset = 0;
  const packets = [];
  while (input.length - offset >= 4) {
    const size = input.readInt32LE(offset);
    if (size < 10 || size > 4096) throw rconError('RCON_PROTOCOL_ERROR', 'Tamaño de paquete RCON inválido');
    if (input.length - offset < size + 4) break;
    const start = offset + 4;
    const end = start + size;
    const id = input.readInt32LE(start);
    const type = input.readInt32LE(start + 4);
    if (input[end - 1] !== 0 || input[end - 2] !== 0) throw rconError('RCON_PROTOCOL_ERROR', 'Terminador RCON inválido');
    const body = input.subarray(start + 8, end - 2).toString('utf8');
    packets.push({ id, type, body });
    offset = end;
  }
  return { packets, remaining: input.subarray(offset) };
}

function validateRconConfig(config = {}, options = {}) {
  const host = String(config.host || '').trim().toLowerCase();
  const port = integer(config.port, 25575);
  if (!/^[a-z0-9.:[\]_-]{1,253}$/i.test(host)) throw rconError('RCON_HOST_INVALID', 'Host RCON inválido');
  if (port < 1 || port > 65535) throw rconError('RCON_PORT_INVALID', 'Puerto RCON inválido');

  const allowedHosts = options.allowedHosts || configuredAllowedHosts();
  if (!allowedHosts.includes('*') && !allowedHosts.includes(host)) {
    throw rconError('RCON_HOST_NOT_ALLOWED', `El host ${host} no está autorizado por INTEGRATIONS_RCON_ALLOWED_HOSTS`);
  }

  const allowedCommands = normalizeAllowedCommands(config.allowedCommands);
  return { host, port, engine: config.engine === 'source' ? 'source' : 'minecraft', allowedCommands };
}

function validateRconCommand(command, allowedCommands = DEFAULT_ALLOWED_COMMANDS) {
  const value = String(command || '').trim();
  if (!value || Buffer.byteLength(value, 'utf8') > 2048) throw rconError('RCON_COMMAND_INVALID', 'Comando RCON vacío o demasiado largo');
  if (/[\u0000-\u001f\u007f;`]/.test(value)) throw rconError('RCON_COMMAND_UNSAFE', 'El comando RCON contiene separadores o controles no permitidos');

  const normalizedValue = value.replace(/^\/+/, '');
  const root = normalizedValue.split(/\s+/, 1)[0].toLowerCase();
  if (HARD_DENIED_COMMANDS.includes(root)) throw rconError('RCON_COMMAND_DENIED', `El comando ${root} está bloqueado`);
  const prefixes = normalizeAllowedCommands(allowedCommands);
  if (!prefixes.some((prefix) => normalizedValue.toLowerCase() === prefix || normalizedValue.toLowerCase().startsWith(`${prefix} `))) {
    throw rconError('RCON_COMMAND_NOT_ALLOWED', `El comando debe comenzar por: ${prefixes.join(', ')}`);
  }
  return normalizedValue;
}

function configuredAllowedHosts() {
  const configured = String(process.env.INTEGRATIONS_RCON_ALLOWED_HOSTS || '')
    .split(',')
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);
  if (configured.length) return configured;
  return process.env.NODE_ENV === 'production' ? [] : ['127.0.0.1', 'localhost', '::1', '[::1]'];
}

function normalizeAllowedCommands(value) {
  const source = Array.isArray(value) && value.length ? value : DEFAULT_ALLOWED_COMMANDS;
  const commands = [...new Set(source.map((item) => String(item).trim().replace(/^\//, '').toLowerCase()).filter((item) => /^[a-z0-9_:-]+(?: [a-z0-9_:@.-]+){0,2}$/.test(item)))].slice(0, 30);
  if (!commands.length) throw rconError('RCON_ALLOWLIST_REQUIRED', 'Debes permitir al menos un comando RCON');
  return commands;
}

function randomRequestId() {
  return Math.floor(10000 + Math.random() * 1000000000);
}

function integer(value, fallback) {
  const number = Number(value);
  return Number.isInteger(number) ? number : fallback;
}

function bounded(value, min, max, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
}

function rconError(code, message, cause) {
  const error = new Error(message);
  error.code = code;
  if (cause) error.cause = cause;
  return error;
}

module.exports = {
  DEFAULT_ALLOWED_COMMANDS,
  HARD_DENIED_COMMANDS,
  PACKET,
  RconClient,
  decodePackets,
  encodePacket,
  validateRconCommand,
  validateRconConfig
};
