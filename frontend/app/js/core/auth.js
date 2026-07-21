/**
 * Auth Service — TikToolStream
 * Autenticación centralizada con eventos
 */

import { emit, on } from './event-bus.js';

const TOKEN_KEY = 'accessToken';
const REFRESH_KEY = 'refreshToken';
const USER_KEY = 'user';

function getStorage(preferLocal = true) {
  return (preferLocal && localStorage.getItem(TOKEN_KEY)) ? localStorage : sessionStorage;
}

export function getAccessToken() {
  return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY) || null;
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_KEY) || sessionStorage.getItem(REFRESH_KEY) || null;
}

export function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || sessionStorage.getItem(USER_KEY) || 'null');
  } catch { return null; }
}

export function isAuthenticated() {
  return !!getAccessToken();
}

export function hasRole(role) {
  const user = getCurrentUser();
  return user && user.role === role;
}

export function isAdmin() {
  return hasRole('admin');
}

export function isGuest() {
  return sessionStorage.getItem('guest') === 'true';
}

export function storeTokens({ accessToken, refreshToken, user }) {
  const storage = (localStorage.getItem(TOKEN_KEY) || accessToken) ? localStorage : sessionStorage;
  if (accessToken) storage.setItem(TOKEN_KEY, accessToken);
  if (refreshToken) storage.setItem(REFRESH_KEY, refreshToken);
  if (user) {
    storage.setItem(USER_KEY, JSON.stringify(user));
    emit('auth:user-updated', user);
  }
  emit('auth:login', { accessToken, user });
}

export function clearSession() {
  [localStorage, sessionStorage].forEach(s => {
    s.removeItem(TOKEN_KEY);
    s.removeItem(REFRESH_KEY);
    s.removeItem(USER_KEY);
  });
  sessionStorage.removeItem('guest');
  emit('auth:logout');
}

export function clearTokens() {
  clearSession();
}

export async function login(credentials) {
  const { post } = await import('./api.js');
  const data = await post('/auth/login', credentials);
  storeTokens({
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    user: data.user
  });
  emit('auth:login', data);
  return data;
}

export async function register(data) {
  const { post } = await import('./api.js');
  return post('/auth/register', data);
}

export async function logout() {
  try {
    const { post } = await import('./api.js');
    const refreshToken = getRefreshToken();
    if (refreshToken) await post('/auth/logout', { refreshToken });
  } catch { /* silent */ }
  clearSession();
  window.location.href = '/app/login';
}

export async function refreshAccessToken() {
  const { post } = await import('./api.js');
  const refreshToken = getRefreshToken();
  if (!refreshToken) throw new Error('No refresh token');
  const data = await post('/auth/refresh', { refreshToken });
  storeTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken || refreshToken });
  emit('auth:refresh');
  return data.accessToken;
}

export function requireAuth() {
  if (!isAuthenticated() && !isGuest()) {
    window.location.href = '/app/login';
  }
}

export function requireAdmin() {
  if (!isAuthenticated()) {
    window.location.href = '/app/login';
  } else if (!isAdmin()) {
    window.location.href = '/app/403';
  }
}

// Sincronizar logout entre pestañas
window.addEventListener('storage', (e) => {
  if (e.key === TOKEN_KEY && !e.newValue) {
    emit('auth:expired');
    clearSession();
  }
});
