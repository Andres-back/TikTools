/**
 * Sanitizador de inputs para prevenir XSS y otros ataques
 * Nota: Para producción considerar usar DOMPurify en el backend con jsdom
 */

/**
 * Sanitiza HTML simple removiendo tags peligrosos
 */
function sanitizeHtml(html) {
  if (typeof html !== 'string') return html;

  return html
    // Remover scripts
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Remover iframes
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    // Remover event handlers
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/on\w+\s*=\s*[^\s>]*/gi, '')
    // Remover javascript: protocol
    .replace(/javascript:/gi, '')
    // Remover data: URLs (excepto images)
    .replace(/data:(?!image)/gi, '')
    // Remover objetos y embeds
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/<embed\b[^<]*>/gi, '');
}

/**
 * Escapa HTML entities
 */
function escapeHtml(text) {
  if (typeof text !== 'string') return text;

  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;'
  };

  return text.replace(/[&<>"'/]/g, (char) => map[char]);
}

/**
 * Sanitiza texto simple (para textContent)
 */
function sanitizeText(text) {
  if (typeof text !== 'string') return text;

  return text
    .trim()
    .replace(/[\x00-\x1F\x7F-\x9F]/g, '') // Remover caracteres de control
    .substring(0, 10000); // Limitar longitud
}

/**
 * Sanitiza input de usuario preservando algunos tags seguros
 */
function sanitizeUserInput(input, allowedTags = ['b', 'i', 'em', 'strong', 'p', 'br']) {
  if (typeof input !== 'string') return input;

  let sanitized = sanitizeHtml(input);

  // Remover todos los tags excepto los permitidos
  const allowedTagsRegex = new RegExp(
    `<(?!\/?(${allowedTags.join('|')})\b)[^>]*>`,
    'gi'
  );
  sanitized = sanitized.replace(allowedTagsRegex, '');

  return sanitized.trim();
}

/**
 * Valida y sanitiza URL
 */
function sanitizeUrl(url) {
  if (typeof url !== 'string') return '';

  try {
    const urlObj = new URL(url);

    // Solo permitir http y https
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return '';
    }

    return urlObj.toString();
  } catch (error) {
    return '';
  }
}

/**
 * Sanitiza objeto recursivamente
 */
function sanitizeObject(obj, options = {}) {
  const {
    allowHtml = false,
    allowedTags = ['b', 'i', 'em', 'strong', 'p', 'br']
  } = options;

  if (typeof obj !== 'object' || obj === null) {
    return typeof obj === 'string'
      ? (allowHtml ? sanitizeUserInput(obj, allowedTags) : sanitizeText(obj))
      : obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item, options));
  }

  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    sanitized[key] = sanitizeObject(value, options);
  }

  return sanitized;
}

/**
 * Middleware para sanitizar body de requests
 */
function sanitizeRequestBody(options = {}) {
  return (req, res, next) => {
    if (req.body && typeof req.body === 'object') {
      req.body = sanitizeObject(req.body, options);
    }

    if (req.query && typeof req.query === 'object') {
      req.query = sanitizeObject(req.query, { allowHtml: false });
    }

    next();
  };
}

module.exports = {
  sanitizeHtml,
  escapeHtml,
  sanitizeText,
  sanitizeUserInput,
  sanitizeUrl,
  sanitizeObject,
  sanitizeRequestBody
};
