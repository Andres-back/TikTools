/**
 * Payments History View — TikToolStream
 */
export async function mount({ target, api, navigate, signal }) {
  target.innerHTML = '<div class="loading-state"><div class="spinner-sm"></div><p>Cargando historial...</p></div>';

  try {
    const data = await api.get('/payments/history', { signal });
    const payments = data.payments || data || [];

    target.innerHTML = `
      <div class="ux-page-head">
        <div>
          <div class="ux-kicker">Facturación</div>
          <h1 class="view-title">Historial de Pagos</h1>
          <p class="view-subtitle">Todos tus pagos y suscripciones registrados</p>
        </div>
        <div class="ux-page-actions">
          <a href="/app/payments" class="btn btn-secondary" data-router-link><i class="fa-solid fa-arrow-left"></i> Volver</a>
        </div>
      </div>
      ${payments.length === 0
        ? '<div class="empty-state" style="margin-top:var(--space-lg)"><i class="fa-regular fa-receipt" style="font-size:40px;opacity:0.25"></i><p>No hay pagos registrados</p></div>'
        : `<div class="table-container"><table><thead><tr><th>Fecha</th><th>Plan</th><th>Monto</th><th>Estado</th></tr></thead>
            <tbody>${payments.map(p => {
              const statusClass = p.status === 'completed' ? 'badge-success' : p.status === 'refunded' ? 'badge-danger' : 'badge-warning';
              return `<tr>
                <td style="font-size:var(--text-xs);white-space:nowrap">${p.created_at ? new Date(p.created_at).toLocaleString() : '—'}</td>
                <td><span class="badge badge-info">${p.plan_type || '—'}</span></td>
                <td style="font-weight:700;color:var(--color-warning)">$${(p.amount || 0).toFixed(2)}</td>
                <td><span class="badge ${statusClass}">${p.status || '—'}</span></td>
              </tr>`;
            }).join('')}</tbody></table></div>`
      }
    `;
  } catch (err) {
    if (err.name === 'AbortError') return;
    target.innerHTML = '<div class="error-state"><p>Error al cargar historial</p><button class="btn btn-primary" onclick="location.href=\'/app/payments\'">Volver</button></div>';
  }
  // GSAP animate payments history
    if (typeof gsap !== 'undefined') requestAnimationFrame(() => {
      const container = document.querySelector('.table-container');
      if (container) gsap.from(container, { opacity: 0, y: 20, duration: 0.4, ease: 'power2.out' });
    });
}
