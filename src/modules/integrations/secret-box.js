'use strict';

const crypto = require('crypto');

const VERSION = 'v1';

function encryptSecret(value, context = {}) {
  const key = encryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(aad(context));
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(value ?? null), 'utf8'),
    cipher.final()
  ]);
  const tag = cipher.getAuthTag();
  return [VERSION, iv.toString('base64url'), tag.toString('base64url'), encrypted.toString('base64url')].join('.');
}

function decryptSecret(payload, context = {}) {
  if (!payload) return null;
  const [version, ivValue, tagValue, encryptedValue] = String(payload).split('.');
  if (version !== VERSION || !ivValue || !tagValue || !encryptedValue) throw secretError('Formato de secreto inválido');

  try {
    const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(ivValue, 'base64url'));
    decipher.setAAD(aad(context));
    decipher.setAuthTag(Buffer.from(tagValue, 'base64url'));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encryptedValue, 'base64url')),
      decipher.final()
    ]).toString('utf8');
    return JSON.parse(decrypted);
  } catch (error) {
    if (error.code === 'INTEGRATIONS_KEY_MISSING') throw error;
    throw secretError('No se pudo descifrar el secreto de la integración');
  }
}

function encryptionKey() {
  const raw = String(process.env.INTEGRATIONS_ENCRYPTION_KEY || '').trim();
  if (!raw) throw secretError('Configura INTEGRATIONS_ENCRYPTION_KEY con 32 bytes en base64', 'INTEGRATIONS_KEY_MISSING');

  if (/^[a-fA-F0-9]{64}$/.test(raw)) return Buffer.from(raw, 'hex');
  try {
    const decoded = Buffer.from(raw, 'base64');
    if (decoded.length === 32 && decoded.toString('base64').replace(/=+$/, '') === raw.replace(/=+$/, '')) return decoded;
  } catch {}
  throw secretError('INTEGRATIONS_ENCRYPTION_KEY debe contener exactamente 32 bytes en base64 o 64 caracteres hex', 'INTEGRATIONS_KEY_INVALID');
}

function aad(context) {
  return Buffer.from(`tiktoolstream:${VERSION}:${context.userId || ''}:${context.kind || ''}`, 'utf8');
}

function secretError(message, code = 'INTEGRATIONS_SECRET_ERROR') {
  const error = new Error(message);
  error.code = code;
  return error;
}

module.exports = { decryptSecret, encryptSecret, encryptionKey };
