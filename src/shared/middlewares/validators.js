/**
 * Validadores compartidos para inputs
 */

const { ValidationError } = require('./error-handler');

/**
 * Valida fortaleza de contraseña
 */
function validatePassword(password) {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

  const errors = [];
  if (password.length < minLength) errors.push('al menos 8 caracteres');
  if (!hasUpperCase) errors.push('una letra mayúscula');
  if (!hasLowerCase) errors.push('una letra minúscula');
  if (!hasNumber) errors.push('un número');
  if (!hasSpecialChar) errors.push('un carácter especial (!@#$%^&*...)');

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Valida formato de email
 */
function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Valida username (alfanumérico, guiones y guión bajo)
 */
function validateUsername(username) {
  const usernameRegex = /^[a-zA-Z0-9_-]{3,20}$/;
  return usernameRegex.test(username);
}

/**
 * Sanitiza string para prevenir inyecciones
 */
function sanitizeString(str) {
  if (typeof str !== 'string') return str;

  return str
    .trim()
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove scripts
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, ''); // Remove event handlers
}

/**
 * Valida que los campos requeridos estén presentes
 */
function validateRequiredFields(data, fields) {
  const missing = [];

  for (const field of fields) {
    if (data[field] === undefined || data[field] === null || data[field] === '') {
      missing.push(field);
    }
  }

  if (missing.length > 0) {
    throw new ValidationError(
      `Faltan campos requeridos: ${missing.join(', ')}`,
      missing
    );
  }
}

/**
 * Valida límites de paginación
 */
function validatePagination(page, limit) {
  const maxLimit = 100;
  const minLimit = 1;
  const maxPage = 1000;

  const validatedPage = Math.max(1, Math.min(parseInt(page) || 1, maxPage));
  const validatedLimit = Math.max(minLimit, Math.min(parseInt(limit) || 10, maxLimit));

  return {
    page: validatedPage,
    limit: validatedLimit,
    offset: (validatedPage - 1) * validatedLimit
  };
}

/**
 * Middleware para validar contraseñas en requests
 */
function passwordValidationMiddleware(req, res, next) {
  const { password } = req.body;

  if (!password) {
    return next();
  }

  const passwordCheck = validatePassword(password);
  if (!passwordCheck.valid) {
    throw new ValidationError(
      `Contraseña débil. Debe contener: ${passwordCheck.errors.join(', ')}`,
      passwordCheck.errors
    );
  }

  next();
}

module.exports = {
  validatePassword,
  validateEmail,
  validateUsername,
  sanitizeString,
  validateRequiredFields,
  validatePagination,
  passwordValidationMiddleware
};
