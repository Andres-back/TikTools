/**
 * API Client — TikToolStream
 * Cliente HTTP central con JWT, refresh automático y AbortSignal
 */

import { getAccessToken, getRefreshToken, clearSession } from './auth.js';

export class ApiError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = options.status || 0;
    this.code = options.code || '';
    this.details = options.details || null;
    this.cause = options.cause || null;
  }
}

const BASE_URL = window.location.origin + '/api';

let refreshPromise = null;

async function doRefresh() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) throw new ApiError('No refresh token', { status: 401, code: 'NO_REFRESH_TOKEN' });

  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken })
    });
    if (!res.ok) {
      clearSession();
      throw new ApiError('Refresh failed', { status: res.status, code: 'REFRESH_FAILED' });
    }
    const data = await res.json();
    const { storeTokens } = await import('./auth.js');
    storeTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken || refreshToken, user: null });
    return data.accessToken;
  })();

  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}

async function request(method, path, options = {}) {
  const { body, headers: extraHeaders = {}, signal, formData } = options;

  // No agregar auth para login, register, refresh
  const noAuth = path === '/auth/login' || path === '/auth/register' || path === '/auth/refresh';
  const token = noAuth ? null : getAccessToken();

  const headers = { ...extraHeaders };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (!formData) headers['Content-Type'] = 'application/json';

  const url = path.startsWith('http') ? path : `${BASE_URL}${path}`;

  let res;
  try {
    res = await fetch(url, {
      method,
      headers,
      body: formData || (body ? JSON.stringify(body) : undefined),
      signal
    });
  } catch (err) {
    if (err.name === 'AbortError') throw new ApiError('Request aborted', { cause: err, code: 'ABORTED' });
    throw new ApiError('Network error', { cause: err, code: 'NETWORK_ERROR' });
  }

  // Refresh automático (una sola vez)
  if (res.status === 401 && token && !noAuth) {
    try {
      const newToken = await doRefresh();
      headers['Authorization'] = `Bearer ${newToken}`;
      res = await fetch(url, {
        method,
        headers,
        body: formData || (body ? JSON.stringify(body) : undefined),
        signal
      });
    } catch {
      clearSession();
      window.location.href = '/app/login';
      throw new ApiError('Session expired', { status: 401, code: 'SESSION_EXPIRED' });
    }
  }

  // 204 No Content
  if (res.status === 204) return null;

  // Determinar tipo de respuesta
  const contentType = res.headers.get('content-type') || '';

  let data;
  if (contentType.includes('application/json')) {
    data = await res.json();
  } else if (contentType.includes('text/')) {
    data = await res.text();
  } else {
    // Para blob, arraybuffer — el llamador debe manejarlo
    return res;
  }

  if (!res.ok) {
    throw new ApiError(
      (data && data.message) || (data && data.error) || res.statusText || 'Request failed',
      { status: res.status, code: data?.code || '', details: data }
    );
  }

  return data;
}

export async function get(path, options = {}) { return request('GET', path, options); }
export async function post(path, body, options = {}) { return request('POST', path, { ...options, body }); }
export async function put(path, body, options = {}) { return request('PUT', path, { ...options, body }); }
export async function patch(path, body, options = {}) { return request('PATCH', path, { ...options, body }); }
export async function del(path, options = {}) { return request('DELETE', path, options); }

export async function upload(path, formData, options = {}) { return request('POST', path, { ...options, formData }); }
