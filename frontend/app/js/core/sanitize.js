/**
 * Sanitize — TikToolStream
 * Prevención de XSS y limpieza de datos de usuario
 */

export function escapeHtml(value) {
  if (typeof value !== 'string') return String(value || '');
  return value.replace(/[&<>"'\/]/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;',
    '"': '&quot;', "'": '&#x27;', '/': '&#x2F;'
  })[ch]);
}

export function sanitizeText(value, options = {}) {
  if (typeof value !== 'string') return '';
  const { maxLength = 10000, allowNewlines = false } = options;
  let result = value
    .trim()
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '');
  if (!allowNewlines) result = result.replace(/[\r\n]/g, ' ');
  return result.substring(0, maxLength);
}

export function sanitizeUrl(value) {
  if (typeof value !== 'string' || !value) return '';
  try {
    const url = new URL(value, window.location.origin);
    if (!['http:', 'https:'].includes(url.protocol)) return '';
    return url.toString();
  } catch { return ''; }
}

export function setText(element, value) {
  if (!element) return;
  element.textContent = sanitizeText(value);
}
