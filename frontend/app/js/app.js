/**
 * App Shell Entry — TikToolStream
 * Initializes layout, auth, WebSocket, and router
 */

import { initLayout, updateWsIndicator } from './layout.js';
import { navigate, handlePopState, getCurrentRoute } from './router.js';
import './routes.js';

async function init() {
  const auth = await import('/app/js/core/auth.js');
  const { isAuthenticated, isGuest } = auth;
  
  if (!isAuthenticated() && !isGuest()) {
    navigate('/app/login', { replace: true });
    return;
  }

  const ws = await import('/app/js/core/ws.js');
  ws.subscribeState(updateWsIndicator);

  // Layout
  await initLayout();

  // Hide loading, start router
  const loading = document.getElementById('appLoading');
  if (loading) loading.style.display = 'none';

  // Navigate to current path or default
  const path = location.pathname + location.search;
  if (path === '/app' || path === '/app/') {
    navigate('/app/dashboard', { replace: true });
  } else {
    navigate(path, { replace: true });
  }

  // Popstate (back/forward)
  window.addEventListener('popstate', handlePopState);
}

init().catch(err => {
  console.error('[App] Init error:', err);
  document.getElementById('app-view').innerHTML =
    '<div class="error-state"><p>Error al iniciar la aplicación</p><button class="btn btn-primary" onclick="location.reload()">Reintentar</button></div>';
});
