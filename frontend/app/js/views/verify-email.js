export async function mount({ target, query, signal }) {
  const token = query.get('token');
  target.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:center;min-height:60vh">
      <div class="card" style="width:100%;max-width:420px;text-align:center">
        ${!token ? '<p style="color:var(--color-danger)">Token de verificación requerido</p>' : '<div class="loading-state"><div class="spinner-sm"></div><p>Verificando...</p></div>'}
      </div>
    </div>
  `;

  if (!token) return;

  try {
    const api = await import('/app/js/core/api.js');
    const data = await api.get(`/auth/verify?token=${encodeURIComponent(token)}`, { signal });
    target.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:center;min-height:60vh">
        <div class="card" style="width:100%;max-width:420px;text-align:center">
          <div style="font-size:48px;margin-bottom:16px">✅</div>
          <h2>${data.alreadyVerified ? 'Ya estaba verificado' : 'Email verificado exitosamente'}</h2>
          <p style="color:var(--text-muted);margin-top:12px">${data.message || 'Puedes iniciar sesión'}</p>
          <a href="/app/login" class="btn btn-primary" style="margin-top:16px" data-router-link>Iniciar Sesión</a>
        </div>
      </div>`;
  } catch (err) {
    target.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:center;min-height:60vh">
        <div class="card" style="width:100%;max-width:420px;text-align:center">
          <div style="font-size:48px;margin-bottom:16px">❌</div>
          <h2>Error de verificación</h2>
          <p style="color:var(--color-danger);margin-top:12px">${err.message || 'Token inválido o expirado'}</p>
        </div>
      </div>`;
  }
}
