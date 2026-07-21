/**
 * Login View — TikToolStream
 */

export async function mount({ target, navigate, signal }) {
  target.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:center;min-height:60vh">
      <div class="card" style="width:100%;max-width:420px">
        <div style="text-align:center;margin-bottom:var(--space-lg)">
          <img src="/assets/LOGOSINFONDO.png" style="width:48px;height:48px;border-radius:12px;margin-bottom:8px">
          <h2 style="font-size:var(--text-xl)">Iniciar Sesión</h2>
        </div>
        <div id="loginForm">
          <div class="input-group" style="margin-bottom:var(--space-md)">
            <label class="input-label">Usuario o Email</label>
            <input type="text" id="loginUser" class="input-field" placeholder="usuario@email.com" autocomplete="username">
          </div>
          <div class="input-group" style="margin-bottom:var(--space-md)">
            <label class="input-label">Contraseña</label>
            <input type="password" id="loginPass" class="input-field" placeholder="••••••••" autocomplete="current-password">
          </div>
          <label style="display:flex;align-items:center;gap:8px;margin-bottom:var(--space-md);font-size:var(--text-sm);color:var(--text-secondary);cursor:pointer">
            <input type="checkbox" id="loginRemember"> Recordar sesión
          </label>
          <button class="btn btn-primary" id="loginBtn" style="width:100%">Iniciar Sesión</button>
          <div id="loginFeedback" style="margin-top:var(--space-sm);font-size:var(--text-sm);text-align:center"></div>
        </div>
        <div style="margin-top:var(--space-md);text-align:center;font-size:var(--text-sm);color:var(--text-muted)">
          ¿No tienes cuenta? <a href="/app/register" style="color:var(--color-primary)" data-router-link>Registrarse</a>
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
      feedback.innerHTML = '<span style="color:var(--color-danger)">Completa todos los campos</span>';
      return;
    }

    btn.disabled = true; btn.textContent = 'Ingresando...';
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
      feedback.innerHTML = `<span style="color:var(--color-danger)">${msg}</span>`;
      btn.disabled = false; btn.textContent = 'Iniciar Sesión';
    }
  }

  document.getElementById('loginBtn')?.addEventListener('click', doLogin, { signal });
  document.getElementById('loginPass')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') doLogin();
  }, { signal });
}
