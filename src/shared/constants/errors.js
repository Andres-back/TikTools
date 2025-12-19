/**
 * Mensajes de error estandarizados
 */

const ERROR_MESSAGES = {
  // Autenticación
  INVALID_CREDENTIALS: 'Email o contraseña incorrectos',
  TOKEN_EXPIRED: 'Token expirado, por favor inicia sesión nuevamente',
  TOKEN_INVALID: 'Token inválido',
  UNAUTHORIZED: 'No autorizado',
  FORBIDDEN: 'No tienes permisos para realizar esta acción',
  EMAIL_NOT_VERIFIED: 'Por favor verifica tu email antes de continuar',

  // Validación
  REQUIRED_FIELDS: 'Faltan campos requeridos',
  INVALID_EMAIL: 'Email inválido',
  INVALID_PASSWORD: 'Contraseña débil',
  PASSWORDS_DONT_MATCH: 'Las contraseñas no coinciden',
  INVALID_USERNAME: 'Nombre de usuario inválido',

  // Recursos
  USER_NOT_FOUND: 'Usuario no encontrado',
  RESOURCE_NOT_FOUND: 'Recurso no encontrado',
  DUPLICATE_EMAIL: 'Este email ya está registrado',
  DUPLICATE_USERNAME: 'Este nombre de usuario ya está en uso',

  // Planes
  PLAN_EXPIRED: 'Tu plan ha expirado',
  PLAN_LIMIT_REACHED: 'Has alcanzado el límite de tu plan',
  UPGRADE_REQUIRED: 'Actualiza tu plan para acceder a esta función',

  // Rate limiting
  TOO_MANY_REQUESTS: 'Demasiadas peticiones, intenta más tarde',

  // Archivos
  FILE_TOO_LARGE: 'Archivo demasiado grande',
  INVALID_FILE_TYPE: 'Tipo de archivo no permitido',
  UPLOAD_FAILED: 'Error al subir archivo',

  // General
  INTERNAL_ERROR: 'Error interno del servidor',
  BAD_REQUEST: 'Petición inválida',
  CONFLICT: 'Conflicto con el estado actual',
  SERVICE_UNAVAILABLE: 'Servicio temporalmente no disponible'
};

const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED'
};

module.exports = {
  ERROR_MESSAGES,
  ERROR_CODES
};
