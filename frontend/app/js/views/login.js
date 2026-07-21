/**
 * Login View — TikTools | TikTok LIVE Tools
 * TikFinity-inspired login screen
 */

export async function mount({ target, navigate, signal }) {
  target.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:center;min-height:80vh;padding:var(--space-lg)">
      <div class="card" style="width:100%;max-width:420px;padding:var(--space-xl)">
        <div style="text-align:center;margin-bottom:var(--space-xl)">
          <div style="width:56px;height:56px;border-radius:14px;background:var(--color-primary-gradient);display:flex;align-items:center;justify-content:center;margin:0 auto var(--space-md)">
            <i class="fa-solid fa-ticket" style="font-size:24px;color:#fff"></i>
          </div>
          <h2 style="font-family:var(--font-display);font-size:var(--text-xl);font-weight:700;letter-spacing:-0.3px">TikTools</h2>
          <p style="color:var(--text-secondary);font-size:var(--text-sm);margin-top:4px">TikTok LIVE Tools — Inicia sesión</p>
        </div>
        <div id="loginForm">
          <div class="input-group" style="margin-bottom:var(--space-md)">
            <label class="input-label"><i class="fa-regular fa-user" style="margin-right:4px"></i> Usuario o Email</label>
            <input type="text" id="loginUser" class="input-field" placeholder="usuario@email.com" autocomplete="username">
          </div>
          <div class="input-group" style="margin-bottom:var(--space-md)">
            <label class="input-label"><i class="fa-solid fa-lock" style="margin-right:4px"></i> Contraseña</label>
            <input type="password" id="loginPass" class="input-field" placeholder="••••••••" autocomplete="current-password">
          </div>
          <label style="display:flex;align-items:center;gap:8px;margin-bottom:var(--space-lg);font-size:var(--text-sm);color:var(--text-secondary);cursor:pointer">
            <input type="checkbox" id="loginRemember"> Recordar sesión
          </label>
          <button class="btn btn-primary" id="loginBtn" style="width:100%;padding:12px;font-size:var(--text-base)">
            <i class="fa-solid fa-arrow-right-to-bracket"></i> Iniciar Sesión
          </button>
          <div id="loginFeedback" style="margin-top:var(--space-md);font-size:var(--text-sm);text-align:center"></div>
        </div>
        <div style="margin-top:var(--space-lg);text-align:center;font-size:var(--text-sm);color:var(--text-muted);padding-top:var(--space-lg);border-top:1px solid var(--border-color)">
          ¿No tienes cuenta? <a href="/app/register" style="color:var(--color-primary);font-weight:600" data-router-link>Registrarse <i class="fa-solid fa-arrow-right" style="font-size:11px"></i></a>
        </div>
      </div>
    </div>
  `;

  const btn = document.getElementById('loginBtn');
  const feedback = document.getElementById('loginFeedback');

  async function doLogin() {
    const username = document.getElementById('loginUser').value.trim();
    const password = document.getElementById('loginPass').value;
    const remember = document.getElementById('loginRemember').checked;

    if (!username || !password) {
      feedback.innerHTML = '<span style="color:var(--color-danger)"><i class="fa-solid fa-circle-exclamation"></i> Completa todos los campos</span>';
      return;
    }

    btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Ingresando...';
    const auth = await import('/app/js/core/auth.js');
    const api = await import('/app/js/core/api.js');

    try {
      const data = await api.post('/auth/login', { username, password }, { signal });

      auth.storeTokens({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        user: data.user
      });

      navigate(data.user?.role === 'admin' ? '/app/admin' : '/app/dashboard', { replace: true });
    } catch (err) {
      const msg = err.message || 'Error al iniciar sesión';
      feedback.innerHTML = `<span style="color:var(--color-danger)"><i class="fa-solid fa-circle-exclamation"></i> ${msg}</span>`;
      btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-arrow-right-to-bracket"></i> Iniciar Sesión';
    }
  }

  document.getElementById('loginBtn')?.addEventListener('click', doLogin, { signal });
  document.getElementById('loginPass')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') doLogin();
  }, { signal });
}
