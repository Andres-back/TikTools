export async function mount({ target, navigate, signal }) {
  target.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:center;min-height:60vh">
      <div class="card" style="width:100%;max-width:420px">
        <div style="text-align:center;margin-bottom:var(--space-lg)">
          <div style="font-size:36px;margin-bottom:8px">📝</div>
          <h2 style="font-size:var(--text-xl)">Crear Cuenta</h2>
        </div>
        <div class="input-group" style="margin-bottom:var(--space-md)">
          <label class="input-label">Usuario</label>
          <input type="text" id="regUser" class="input-field" placeholder="usuario" autocomplete="username">
        </div>
        <div class="input-group" style="margin-bottom:var(--space-md)">
          <label class="input-label">Email</label>
          <input type="email" id="regEmail" class="input-field" placeholder="email@gmail.com">
        </div>
        <div class="input-group" style="margin-bottom:var(--space-md)">
          <label class="input-label">Contraseña</label>
          <input type="password" id="regPass" class="input-field" placeholder="••••••••" autocomplete="new-password">
        </div>
        <button class="btn btn-primary" id="regBtn" style="width:100%">Crear Cuenta</button>
        <div id="regFeedback" style="margin-top:var(--space-sm);font-size:var(--text-sm);text-align:center"></div>
        <div style="margin-top:var(--space-md);text-align:center;font-size:var(--text-sm);color:var(--text-muted)">
          ¿Ya tienes cuenta? <a href="/app/login" style="color:var(--color-primary)" data-router-link>Iniciar sesión</a>
        </div>
      </div>
    </div>
  `;

  document.getElementById('regBtn')?.addEventListener('click', async () => {
    const username = document.getElementById('regUser').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPass').value;
    const fb = document.getElementById('regFeedback');

    if (!username || !email || !password) {
      fb.innerHTML = '<span style="color:var(--color-danger)">Completa todos los campos</span>';
      return;
    }

    const btn = document.getElementById('regBtn');
    btn.disabled = true; btn.textContent = 'Registrando...';
    const api = await import('/app/js/core/api.js');

    try {
      await api.post('/auth/register', { username, email, password }, { signal });
      fb.innerHTML = '<span style="color:var(--color-success)">✅ Registro exitoso. Revisa tu email para verificar la cuenta.</span>';
      setTimeout(() => navigate('/app/login'), 3000);
    } catch (err) {
      fb.innerHTML = `<span style="color:var(--color-danger)">${err.message || 'Error al registrar'}</span>`;
      btn.disabled = false; btn.textContent = 'Crear Cuenta';
    }
  }, { signal });
}
