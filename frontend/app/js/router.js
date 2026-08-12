/**
 * Router — TikToolStream App Shell
 * History API router with guards, dynamic imports, and lifecycle
 */

let currentCleanup = null;
let currentAbort = null;
let currentRoute = null;

const routes = [];

export function defineRoutes(table) {
  routes.push(...table);
}

export function getRoutes() { return [...routes]; }

export function getCurrentRoute() { return currentRoute; }

function matchRoute(path) {
  for (const route of routes) {
    const paramNames = [];
    const pattern = route.path.replace(/:([^/]+)/g, (_, name) => {
      paramNames.push(name);
      return '([^/]+)';
    });
    const regex = new RegExp(`^${pattern}$`);
    const match = path.match(regex);
    if (match) {
      const params = {};
      paramNames.forEach((name, i) => { params[name] = decodeURIComponent(match[i + 1]); });
      return { ...route, params, match: true };
    }
  }
  return null;
}

export async function navigate(path, { replace = false } = {}) {
  // Cleanup previous view
  if (currentCleanup) {
    try { await currentCleanup(); } catch {}
    currentCleanup = null;
  }
  if (currentAbort) {
    currentAbort.abort();
    currentAbort = null;
  }

  const queryStart = path.indexOf('?');
  const pathname = queryStart >= 0 ? path.substring(0, queryStart) : path;
  const search = queryStart >= 0 ? path.substring(queryStart) : '';
  const query = new URLSearchParams(search);

  const route = matchRoute(pathname);

  if (!route) {
    // Not found — try 404 view
    const notFoundRoute = routes.find(r => r.path === '/app/404');
    if (notFoundRoute) return navigate('/app/404', { replace: true });
    await renderError('Página no encontrada');
    if (!replace) history.pushState({ path }, '', path);
    return;
  }

  // Guard check
  if (route.guard) {
    const { isAuthenticated, isGuest } = await import('/app/js/core/auth.js');
    if (route.guard === 'auth' && !isAuthenticated() && !isGuest()) {
      navigate('/app/login', { replace: true });
      return;
    }
    if (route.guard === 'admin') {
      const { isAdmin } = await import('/app/js/core/auth.js');
      if (!isAdmin()) return navigate('/app/403', { replace: true });
    }
  }

  currentAbort = new AbortController();
  currentRoute = route;

  const publicRoute = ['/app/login', '/app/register', '/app/verify-email'].includes(pathname);
  document.body.classList.toggle('auth-route', publicRoute);

  if (!replace) history.pushState({ path }, '', path);
  document.title = route.title || 'TikTools | TikTok LIVE Tools';

  const target = document.getElementById('app-view');
  if (!target) return;

  // Show loading
  target.innerHTML = '<div class="loading-state"><div class="spinner-sm"></div><p style="color:var(--text-muted)">Cargando...</p></div>';

  try {
    const module = await route.load();
    const { isAuthenticated, getCurrentUser } = await import('/app/js/core/auth.js');
    const context = {
      target,
      params: route.params || {},
      query,
      signal: currentAbort.signal,
      navigate,
      user: getCurrentUser(),
      auth: await import('/app/js/core/auth.js'),
      api: await import('/app/js/core/api.js'),
      ws: await import('/app/js/core/ws.js'),
      toast: await import('/app/js/core/toast.js')
    };
    currentCleanup = await module.mount(context) || null;

    // GSAP page enter animation
    if (typeof gsap !== 'undefined') {
      gsap.fromTo(target,
        { opacity: 0, y: 12 },
        { opacity: 1, y: 0, duration: 0.35, ease: 'power2.out', clearProps: 'transform' }
      );
      // Animate all cards with stagger
      const cards = target.querySelectorAll('.card, .dash-card, .stat-card, [class*="gsap-stagger"]');
      if (cards.length > 0) {
        gsap.set(cards, { opacity: 0, y: 20 });
        gsap.to(cards, {
          opacity: 1, y: 0,
          duration: 0.4,
          stagger: 0.04,
          ease: 'power2.out',
          delay: 0.1,
          overwrite: 'auto'
        });
      }
    }
  } catch (err) {
    console.error('[Router] Error mounting view:', err);
    target.innerHTML = `<div class="error-state"><p>Error al cargar la vista</p><button class="btn btn-primary" onclick="location.reload()">Reintentar</button></div>`;
  }

  // Update active nav
  document.querySelectorAll('.nav-item').forEach(el => {
    const active = el.dataset.route === pathname;
    el.classList.toggle('active', active);
    if (active) el.setAttribute('aria-current', 'page'); else el.removeAttribute('aria-current');
  });
  const activeNav = [...document.querySelectorAll('.nav-item[data-route]')].find((item) => item.dataset.route === pathname);
  const pageTitle = document.getElementById('pageTitleDisplay');
  const pageSection = document.getElementById('pageSectionDisplay');
  if (pageTitle) pageTitle.textContent = activeNav?.querySelector('span')?.textContent || String(route.title || 'TikToolStream').split('|')[0].trim();
  if (pageSection) {
    let sectionMarker = activeNav?.previousElementSibling;
    while (sectionMarker && !sectionMarker.classList?.contains('nav-section-title')) sectionMarker = sectionMarker.previousElementSibling;
    const sectionTitle = activeNav?.closest('.nav-more')
      ? 'Más herramientas'
      : sectionMarker?.textContent || (pathname.startsWith('/app/admin') ? 'Administración' : 'TikToolStream');
    pageSection.textContent = sectionTitle;
  }
  if (activeNav?.closest('.nav-more')) activeNav.closest('.nav-more').open = true;

  // Focus management
  target.focus({ preventScroll: true });
}

export async function handlePopState() {
  await navigate(location.pathname + location.search, { replace: true });
}

// Error fallback
async function renderError(message) {
  const target = document.getElementById('app-view');
  if (target) { target.innerHTML = `<div class="error-state"><p>${message}</p><button class="btn btn-primary" id="errGoHome">Ir al inicio</button></div>`; const btn = document.getElementById('errGoHome'); if (btn) btn.addEventListener('click', () => navigate('/app/dashboard')); }
}
