/**
 * Payments History View — TikToolStream
 */

export async function mount({ target, api, navigate, signal }) {
  target.innerHTML = `<div class="loading-state"><div class="spinner-sm"></div><p>Cargando historial...</p></div>`;

  try {
    const data = await api.get('/payments/history', { signal });
    const payments = data.payments || data || [];

    target.innerHTML = `
      <div style="display:flex;align-items:center;gap:var(--space-md);margin-bottom:var(--space-lg)">
        <button class="btn btn-ghost" onclick="navigate('/app/payments')">← Volver</button>
        <h1 class="view-title" style="margin-bottom:0">Historial de Pagos</h1>
      </div>
      ${payments.length === 0
        ? '<div class="empty-state"><div class="icon">📜</div><p>No hay pagos registrados</p></div>'
        : `<div class="table-container"><table><thead><tr><th>Fecha</th><th>Plan</th><th>Monto</th><th>Estado</th></tr></thead>
            <tbody>${payments.map(p => `<tr>
              <td style="font-size:var(--text-xs)">${p.created_at ? new Date(p.created_at).toLocaleString() : '—'}</td>
              <td>${p.plan_type || '—'}</td>
              <td>$${(p.amount || 0).toFixed(2)}</td>
              <td><span class="badge ${p.status === 'completed' ? 'badge-success' : 'badge-warning'}">${p.status || '—'}</span></td>
            </tr>`).join('')}</tbody></table></div>`
      }
    `;
  } catch (err) {
    if (err.name === 'AbortError') return;
    target.innerHTML = `<div class="error-state"><p>Error al cargar historial</p><button class="btn btn-primary" onclick="navigate('/app/payments')">Volver</button></div>`;
  }
}
