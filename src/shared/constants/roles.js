/**
 * Constantes de roles de usuario
 */

const ROLES = {
  ADMIN: 'admin',
  MODERATOR: 'moderator',
  USER: 'user'
};

const ROLE_HIERARCHY = {
  [ROLES.ADMIN]: 3,
  [ROLES.MODERATOR]: 2,
  [ROLES.USER]: 1
};

function hasPermission(userRole, requiredRole) {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

function isAdmin(userRole) {
  return userRole === ROLES.ADMIN;
}

function isModerator(userRole) {
  return userRole === ROLES.MODERATOR || userRole === ROLES.ADMIN;
}

module.exports = {
  ROLES,
  ROLE_HIERARCHY,
  hasPermission,
  isAdmin,
  isModerator
};
