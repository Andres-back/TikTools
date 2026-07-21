/**
 * Layout helpers â€” TikToolStream App Shell
 */

import { navigate } from './router.js';

export async function initLayout() {
  // Sidebar toggle
  const sidebar = document.getElementById('mainSidebar');
  const overlay = document.getElementById('sidebarOverlay');
  const toggle = document.getElementById('sidebarToggle');

  if (toggle && sidebar && overlay) {
    toggle.addEventListener('click', () => {
      sidebar.classList.toggle('open');
      overlay.classList.toggle('active');
    });
    overlay.addEventListener('click', () => {
      sidebar.classList.remove('open');
      overlay.classList.remove('active');
    });
  }

  // Internal links use the SPA router when possible.
  document.querySelectorAll('.nav-item[data-route], [data-router-link]').forEach(el => {
    el.addEventListener('click', (e) => {
      if (e.ctrlKey || e.metaKey || e.button === 1) return; // Open in new tab
      const path = el.getAttribute('href');
      if (!path || !path.startsWith('/app')) return;
      e.preventDefault();
      navigate(path);
      if (sidebar && overlay) {
        sidebar.classList.remove('open');
        overlay.classList.remove('active');
      }
    });
  });

  // Logout
  const logoutLink = document.getElementById('logoutLink');
  if (logoutLink) {
    logoutLink.addEventListener('click', async (e) => {
      e.preventDefault();
      const auth = await import('/app/js/core/auth.js');
      await auth.logout();
    });
  }

  const auth = await import('/app/js/core/auth.js');
  const user = auth.getCurrentUser();
  const userNameEl = document.getElementById('userNameDisplay');
  if (userNameEl) {
    userNameEl.textContent = user?.username || user?.email || 'Usuario';
  }
  const adminLink = document.getElementById('adminLink');
  if (adminLink) {
    adminLink.style.display = auth.isAdmin() ? 'block' : 'none';
  }

  // Auto-close sidebar on resize (when crossing breakpoint)
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (sidebar && overlay) {
        // Close sidebar if we're on desktop (width > 1100px)
        if (window.innerWidth > 1100) {
          sidebar.classList.remove('open');
          overlay.classList.remove('active');
        }
      }
    }, 150);
  });
}

export function updateWsIndicator(state) {
  const el = document.getElementById('wsIndicator');
  if (!el) return;
  el.className = 'ws-indicator ' + state;
  el.title = state.charAt(0).toUpperCase() + state.slice(1);
}

