export async function mount({ target, query, signal }) {
  const token = query.get('token');
  target.innerHTML = \`
    <div style="display:flex;align-items:center;justify-content:center;min-height:70vh;padding:var(--space-lg)">
      <div class="card" style="width:100%;max-width:420px;padding:var(--space-xl);text-align:center">
        \${!token ? \`
          <div style="width:56px;height:56px;border-radius:14px;background:linear-gradient(135deg, rgba(239,68,68,0.2), rgba(239,68,68,0.05));display:flex;align-items:center;justify-content:center;margin:0 auto var(--space-md)">
            <i class="fa-solid fa-triangle-exclamation" style="font-size:24px;color:var(--color-danger)"></i>
          </div>
          <p style="color:var(--color-danger);font-weight:600">Token de verificación requerido</p>
        \` : \`
          <div style="width:56px;height:56px;border-radius:14px;background:linear-gradient(135deg, rgba(0,212,255,0.2), rgba(124,58,237,0.1));display:flex;align-items:center;justify-content:center;margin:0 auto var(--space-md)">
            <i class="fa-solid fa-spinner fa-spin" style="font-size:24px;color:var(--color-primary)"></i>
          </div>
          <p style="color:var(--text-muted)">Verificando...</p>
        \`}
      </div>
    </div>
  \`;

  if (!token) return;

  try {
    const api = await import('/app/js/core/api.js');
    const data = await api.get(\`/auth/verify?token=\${encodeURIComponent(token)}\`, { signal });
    target.innerHTML = \`
      <div style="display:flex;align-items:center;justify-content:center;min-height:70vh;padding:var(--space-lg)">
        <div class="card" style="width:100%;max-width:420px;padding:var(--space-xl);text-align:center">
          <div style="width:72px;height:72px;border-radius:18px;background:linear-gradient(135deg, rgba(34,214,94,0.2), rgba(34,214,94,0.05));display:flex;align-items:center;justify-content:center;margin:0 auto var(--space-lg)">
            <i class="fa-solid fa-check" style="font-size:32px;color:var(--color-success)"></i>
          </div>
          <h2 style="font-family:var(--font-display);font-size:var(--text-xl);font-weight:700">\${data.alreadyVerified ? 'Ya estaba verificado' : 'Email verificado exitosamente'}</h2>
          <p style="color:var(--text-secondary);font-size:var(--text-sm);margin:var(--space-md) 0 var(--space-lg)">\${data.message || 'Puedes iniciar sesión'}</p>
          <a href="/app/login" class="btn btn-primary" data-router-link>
            <i class="fa-solid fa-arrow-right-to-bracket"></i> Iniciar Sesión
          </a>
        </div>
      </div>\`;
  } catch (err) {
    target.innerHTML = \`
      <div style="display:flex;align-items:center;justify-content:center;min-height:70vh;padding:var(--space-lg)">
        <div class="card" style="width:100%;max-width:420px;padding:var(--space-xl);text-align:center">
          <div style="width:72px;height:72px;border-radius:18px;background:linear-gradient(135deg, rgba(239,68,68,0.2), rgba(239,68,68,0.05));display:flex;align-items:center;justify-content:center;margin:0 auto var(--space-lg)">
            <i class="fa-solid fa-circle-exclamation" style="font-size:32px;color:var(--color-danger)"></i>
          </div>
          <h2 style="font-family:var(--font-display);font-size:var(--text-xl);font-weight:700;color:var(--color-danger)">Error de verificación</h2>
          <p style="color:var(--text-secondary);font-size:var(--text-sm);margin:var(--space-md) 0 var(--space-lg)">\${err.message || 'Token inválido o expirado'}</p>
          <a href="/app/login" class="btn btn-primary" data-router-link>
            <i class="fa-solid fa-arrow-right-to-bracket"></i> Ir al Login
          </a>
        </div>
      </div>\`;
  }
  // GSAP animate verify email
    if (typeof gsap !== 'undefined') requestAnimationFrame(() => {
      const card = document.querySelector('.card');
      if (card) gsap.from(card, { opacity: 0, y: 24, scale: 0.97, duration: 0.45, ease: 'power3.out' });
    });
}
