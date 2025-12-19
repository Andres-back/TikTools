/**
 * Constantes de planes de suscripción
 */

const PLANS = {
  FREE: 'free',
  BASIC: 'basic',
  PREMIUM: 'premium'
};

const PLAN_FEATURES = {
  [PLANS.FREE]: {
    maxAuctions: 5,
    maxDuration: 60, // minutos
    analytics: false,
    customOverlay: false,
    priority_support: false,
    price: 0
  },
  [PLANS.BASIC]: {
    maxAuctions: 50,
    maxDuration: 180, // minutos
    analytics: true,
    customOverlay: true,
    priority_support: false,
    price: 9.99
  },
  [PLANS.PREMIUM]: {
    maxAuctions: -1, // ilimitado
    maxDuration: -1, // ilimitado
    analytics: true,
    customOverlay: true,
    priority_support: true,
    price: 19.99
  }
};

const PLAN_HIERARCHY = {
  [PLANS.FREE]: 1,
  [PLANS.BASIC]: 2,
  [PLANS.PREMIUM]: 3
};

function canAccess Feature(userPlan, feature) {
  return PLAN_FEATURES[userPlan]?.[feature] || false;
}

function isPlanActive(planExpiresAt) {
  if (!planExpiresAt) return false;
  return new Date(planExpiresAt) > new Date();
}

module.exports = {
  PLANS,
  PLAN_FEATURES,
  PLAN_HIERARCHY,
  canAccessFeature,
  isPlanActive
};
