/**
 * Módulo de Autenticación - Frontend
 * Gestiona tokens, sesión y llamadas autenticadas a la API
 */

const API_URL = window.location.origin + '/api';

// ============ TOKEN MANAGEMENT ============

export function getAccessToken() {
  return localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
}

export function getRefreshToken() {
  return localStorage.getItem('refreshToken') || sessionStorage.getItem('refreshToken');
}

export function getUser() {
  const userData = localStorage.getItem('user') || sessionStorage.getItem('user');
  return userData ? JSON.parse(userData) : null;
}

export function isLoggedIn() {
  const token = getAccessToken();
  if (!token) return false;
  
  try {
    // Verificar que el token no esté expirado
    const payload = JSON.parse(atob(token.split('.')[1]));
    const now = Math.floor(Date.now() / 1000);
    return payload.exp > now;
  } catch (e) {
    console.warn('Token inválido, limpiando...');
    clearTokens();
    return false;
  }
}

export function isGuest() {
  return sessionStorage.getItem('guest') === 'true';
}

export function storeTokens(tokens, remember = true) {
  const storage = remember ? localStorage : sessionStorage;
  if (tokens.accessToken) storage.setItem('accessToken', tokens.accessToken);
  if (tokens.refreshToken) storage.setItem('refreshToken', tokens.refreshToken);
  if (tokens.user) storage.setItem('user', JSON.stringify(tokens.user));
}

export function clearTokens() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
  sessionStorage.removeItem('accessToken');
  sessionStorage.removeItem('refreshToken');
  sessionStorage.removeItem('user');
  sessionStorage.removeItem('guest');
}

// ============ API CALLS ============

/**
 * Realiza una llamada autenticada a la API
 */
export async function apiCall(endpoint, options = {}) {
  const token = getAccessToken();
  
  const config = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    }
  };

  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }

  let response = await fetch(`${API_URL}${endpoint}`, config);

  // Si el token expiró, intentar renovarlo
  if (response.status === 401 && getRefreshToken()) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      config.headers['Authorization'] = `Bearer ${getAccessToken()}`;
      response = await fetch(`${API_URL}${endpoint}`, config);
    }
  }

  return response;
}

/**
 * Renueva el access token usando el refresh token
 */
export async function refreshAccessToken() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  try {
    const response = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken })
    });

    if (!response.ok) {
      clearTokens();
      return false;
    }

    const data = await response.json();
    storeTokens(data);
    return true;

  } catch (error) {
    clearTokens();
    return false;
  }
}

// ============ AUTH ACTIONS ============

/**
 * Iniciar sesión
 */
export async function login(username, password, remember = true) {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Error al iniciar sesión');
  }

  storeTokens(data, remember);
  return data;
}

/**
 * Registrar usuario
 */
export async function register(username, email, password) {
  const response = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, email, password })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Error al registrarse');
  }

  storeTokens(data, true);
  return data;
}

/**
 * Cerrar sesión
 */
export async function logout() {
  try {
    await apiCall('/auth/logout', { method: 'POST' });
  } catch (error) {
    }
  clearTokens();
}

/**
 * Obtener perfil del usuario
 */
export async function getProfile() {
  const response = await apiCall('/auth/profile');
  
  if (!response.ok) {
    throw new Error('Error al obtener perfil');
  }

  return response.json();
}

/**
 * Actualizar perfil
 */
export async function updateProfile(data) {
  const response = await apiCall('/auth/profile', {
    method: 'PUT',
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Error al actualizar perfil');
  }

  return response.json();
}

// ============ AUCTION API ============

/**
 * Obtener subastas del usuario
 */
export async function getAuctions(params = {}) {
  const query = new URLSearchParams(params).toString();
  const response = await apiCall(`/auctions?${query}`);
  
  if (!response.ok) {
    throw new Error('Error al obtener subastas');
  }

  return response.json();
}

/**
 * Crear nueva subasta
 */
export async function createAuction(data) {
  const response = await apiCall('/auctions', {
    method: 'POST',
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Error al crear subasta');
  }

  return response.json();
}

/**
 * Obtener subasta específica
 */
export async function getAuction(id) {
  const response = await apiCall(`/auctions/${id}`);
  
  if (!response.ok) {
    throw new Error('Error al obtener subasta');
  }

  return response.json();
}

/**
 * Registrar regalo en subasta
 */
export async function recordGift(auctionId, giftData) {
  const response = await apiCall(`/auctions/${auctionId}/gifts`, {
    method: 'POST',
    body: JSON.stringify(giftData)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Error al registrar regalo');
  }

  return response.json();
}

/**
 * Finalizar subasta
 */
export async function finishAuction(id) {
  const response = await apiCall(`/auctions/${id}/finish`, {
    method: 'POST'
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Error al finalizar subasta');
  }

  return response.json();
}

/**
 * Obtener estadísticas
 */
export async function getStats() {
  const response = await apiCall('/stats');
  
  if (!response.ok) {
    throw new Error('Error al obtener estadísticas');
  }

  return response.json();
}

// ============ UI HELPERS ============

/**
 * Crear elemento de usuario en el header
 */
export function createUserWidget(container) {
  if (!container) return;

  const user = getUser();
  
  if (user) {
    container.innerHTML = `
      <div class="user-widget">
        <span class="user-name">👤 ${user.username}</span>
        <button class="user-logout" onclick="window.authModule.logout().then(() => location.reload())">
          Salir
        </button>
      </div>
    `;
  } else if (isGuest()) {
    container.innerHTML = `
      <div class="user-widget guest">
        <a href="/login.html" class="login-link">Iniciar Sesión</a>
      </div>
    `;
  } else {
    container.innerHTML = '';
  }
}

/**
 * Verificar autenticación y redirigir si es necesario
 */
export function requireAuth() {
  if (!isLoggedIn() && !isGuest()) {
    window.location.href = '/login.html';
    return false;
  }
  return true;
}

// Exponer para uso global (desde onclick, etc)
window.authModule = {
  login,
  logout,
  register,
  isLoggedIn,
  isGuest,
  getUser,
  getAccessToken
};

export default {
  // Tokens
  getAccessToken,
  getRefreshToken,
  getUser,
  isLoggedIn,
  isGuest,
  storeTokens,
  clearTokens,
  
  // Auth
  login,
  register,
  logout,
  getProfile,
  updateProfile,
  refreshAccessToken,
  
  // API
  apiCall,
  getAuctions,
  createAuction,
  getAuction,
  recordGift,
  finishAuction,
  getStats,
  
  // UI
  createUserWidget,
  requireAuth
};
