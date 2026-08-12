export async function mount({ target, api, params, navigate, signal }) {
  function escapeHtml(s) { return String(s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

  target.innerHTML = '<div class="loading-state"><div class="spinner-sm"></div><p>Cargando usuario...</p></div>';
  try {
    const data = await api.get(\`/admin/users/\${params.id}\`, { signal });
    const u = data.user;
    const planHistory = data.planHistory || [];

    target.innerHTML = \`
      <div class="ux-page-head">
        <div>
          <div class="ux-kicker">Admin</div>
          <h1 class="view-title">@\${escapeHtml(u.username || '')}</h1>
          <p class="view-subtitle">Detalles del usuario y su historial</p>
        </div>
        <div class="ux-page-actions">
          <a href="/app/admin/users" class="btn btn-secondary" data-router-link><i class="fa-solid fa-arrow-left"></i> Volver</a>
          <button class="btn btn-primary" id="btnEditUser">✏️ Editar</button>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(280px, 1fr));gap:var(--space-lg)">
        <div class="card" style="padding:var(--space-lg)">
          <h3 style="margin-bottom:var(--space-md);display:flex;align-items:center;gap:8px"><i class="fa-regular fa-user" style="color:var(--color-primary)"></i> Información</h3>
          <div style="display:grid;gap:var(--space-sm)">
            <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border-color)">
              <span style="color:var(--text-muted);font-size:var(--text-sm)">ID</span>
              <span style="font-family:var(--font-mono);font-size:var(--text-sm)">#\${u.id}</span>
            </div>
            <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border-color)">
              <span style="color:var(--text-muted);font-size:var(--text-sm)">Email</span>
              <span style="font-size:var(--text-sm)">\${escapeHtml(u.email || '—')}</span>
            </div>
            <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border-color)">
              <span style="color:var(--text-muted);font-size:var(--text-sm)">Rol</span>
              <span class="badge \${u.role === 'admin' ? 'badge-info' : 'badge-success'}">\${u.role || 'user'}</span>
            </div>
            <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border-color)">
              <span style="color:var(--text-muted);font-size:var(--text-sm)">Estado</span>
              <span>\${u.is_active ? '<span class="badge badge-success">Activo</span>' : '<span class="badge badge-danger">Inactivo</span>'}</span>
            </div>
            <div style="display:flex;justify-content:space-between;padding:8px 0;">
              <span style="color:var(--text-muted);font-size:var(--text-sm)">Registro</span>
              <span style="font-size:var(--text-sm)">\${u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}</span>
            </div>
          </div>
        </div>

        <div class="card" style="padding:var(--space-lg)">
          <h3 style="margin-bottom:var(--space-md);display:flex;align-items:center;gap:8px"><i class="fa-solid fa-crown" style="color:var(--color-warning)"></i> Plan</h3>
          <div style="display:grid;gap:var(--space-sm)">
            <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border-color)">
              <span style="color:var(--text-muted);font-size:var(--text-sm)">Tipo</span>
              <span class="badge \${u.plan_type === 'premium' ? 'badge-warning' : 'badge-info'}">\${u.plan_type || 'free'}</span>
            </div>
            <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border-color)">
              <span style="color:var(--text-muted);font-size:var(--text-sm)">Días restantes</span>
              <span style="font-weight:700;color:var(--color-warning)">\${u.plan_days_remaining || 0}d</span>
            </div>
            <div style="display:flex;justify-content:space-between;padding:8px 0;">
              <span style="color:var(--text-muted);font-size:var(--text-sm)">Verificado</span>
              <span>\${u.is_verified !== false ? '✅' : '❌'}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="card" style="margin-top:var(--space-lg);padding:var(--space-lg)">
        <h3 style="margin-bottom:var(--space-md);display:flex;align-items:center;gap:8px"><i class="fa-solid fa-clock-rotate-left" style="color:var(--color-primary)"></i> Historial de Plan (\${planHistory.length})</h3>
        \${planHistory.length === 0
          ? '<p style="color:var(--text-muted)">Sin historial</p>'
          : \`<div class="table-container"><table><thead><tr><th>Acción</th><th>Plan</th><th>Días</th><th>Admin</th><th>Fecha</th></tr></thead>
              <tbody>\${planHistory.map(h => \`<tr><td>\${h.action}</td><td><span class="badge badge-info">\${h.plan_type || '—'}</span></td><td>\${h.days_changed || 0}</td><td>@\${h.admin_username || '—'}</td><td style="font-size:var(--text-xs)">\${h.created_at ? new Date(h.created_at).toLocaleString() : '—'}</td></tr>\`).join('')}</tbody></table></div>\`
        }
      </div>
    \`;

    document.getElementById('btnEditUser')?.addEventListener('click', () => {
      navigate(\`/app/admin/users\`);
    }, { signal });
  } catch (err) {
    target.innerHTML = \`<div class="error-state"><p>Error: \${escapeHtml(err.message)}</p><a href="/app/admin/users" class="btn btn-primary" data-router-link>Volver</a></div>\`;
  }
  // GSAP animate admin user detail
    if (typeof gsap !== 'undefined') requestAnimationFrame(() => {
      const cards = document.querySelectorAll('.card');
      if (cards.length) gsap.from(cards, { opacity: 0, y: 20, stagger: 0.08, duration: 0.4, ease: 'power2.out' });
    });
}
