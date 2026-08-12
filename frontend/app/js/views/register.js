export async function mount({ target, navigate, signal }) {
  target.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:center;min-height:80vh;padding:var(--space-lg)">
      <div class="card" style="width:100%;max-width:420px;padding:var(--space-xl)">
        <div style="text-align:center;margin-bottom:var(--space-xl)">
          <div style="width:56px;height:56px;border-radius:14px;background:var(--color-primary-gradient);display:flex;align-items:center;justify-content:center;margin:0 auto var(--space-md)">
            <i class="fa-solid fa-ticket" style="font-size:24px;color:#fff"></i>
          </div>
          <h2 style="font-family:var(--font-display);font-size:var(--text-xl);font-weight:700;letter-spacing:-0.3px">Crear Cuenta</h2>
          <p style="color:var(--text-secondary);font-size:var(--text-sm);margin-top:4px">TikTok LIVE Tools — Regístrate gratis</p>
        </div>
        <div class="input-group" style="margin-bottom:var(--space-md)">
          <label class="input-label"><i class="fa-regular fa-user" style="margin-right:4px"></i> Usuario</label>
          <input type="text" id="regUser" class="input-field" placeholder="usuario" autocomplete="username">
        </div>
        <div class="input-group" style="margin-bottom:var(--space-md)">
          <label class="input-label"><i class="fa-regular fa-envelope" style="margin-right:4px"></i> Email</label>
          <input type="email" id="regEmail" class="input-field" placeholder="email@gmail.com">
        </div>
        <div class="input-group" style="margin-bottom:var(--space-md)">
          <label class="input-label"><i class="fa-solid fa-lock" style="margin-right:4px"></i> Contraseña</label>
          <input type="password" id="regPass" class="input-field" placeholder="••••••••" autocomplete="new-password">
        </div>
        <button class="btn btn-primary" id="regBtn" style="width:100%;padding:12px;font-size:var(--text-base)">
          <i class="fa-solid fa-user-plus"></i> Crear Cuenta
        </button>
        <div id="regFeedback" style="margin-top:var(--space-md);font-size:var(--text-sm);text-align:center"></div>
        <div style="margin-top:var(--space-lg);text-align:center;font-size:var(--text-sm);color:var(--text-muted);padding-top:var(--space-lg);border-top:1px solid var(--border-color)">
          ¿Ya tienes cuenta? <a href="/app/login" style="color:var(--color-primary);font-weight:600" data-router-link>Iniciar sesión <i class="fa-solid fa-arrow-right" style="font-size:11px"></i></a>
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
  // GSAP animate register
    if (typeof gsap !== 'undefined') requestAnimationFrame(() => {
      const card = document.querySelector('.card');
      if (card) gsap.from(card, { opacity: 0, y: 30, scale: 0.97, duration: 0.5, ease: 'power3.out' });
      const inputs = document.querySelectorAll('.input-field');
      if (inputs.length) gsap.from(inputs, { opacity: 0, y: 12, stagger: 0.06, duration: 0.3, ease: 'power2.out', delay: 0.2 });
    });
}
