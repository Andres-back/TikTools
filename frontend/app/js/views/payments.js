/**
 * Payments View — TikToolStream
 */

export async function mount({ target, api, navigate, signal }) {
  target.innerHTML = `
    <h1 class="view-title">Plan y Pagos</h1>
    <div id="planStatus"><div class="loading-state"><div class="spinner-sm"></div></div></div>
    <div id="plansList" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:var(--space-lg);margin-top:var(--space-lg)">
      <div class="card" style="text-align:center;border-color:var(--color-primary)">
        <div style="font-size:var(--text-3xl);margin-bottom:var(--space-md)">⭐</div>
        <h3>Premium Mensual</h3>
        <div style="font-size:var(--text-3xl);font-weight:800;margin:var(--space-md)">$9.99</div>
        <div style="color:var(--text-muted);font-size:var(--text-sm);margin-bottom:var(--space-lg)">30 días · Subastas ilimitadas</div>
        <button class="btn btn-primary" style="width:100%" data-plan="premium_monthly">Suscribirse</button>
      </div>
      <div class="card" style="text-align:center;border-color:var(--color-warning)">
        <div style="font-size:var(--text-3xl);margin-bottom:var(--space-md)">👑</div>
        <h3>Premium Anual</h3>
        <div style="font-size:var(--text-3xl);font-weight:800;margin:var(--space-md)">$79.99</div>
        <div style="color:var(--text-muted);font-size:var(--text-sm);margin-bottom:var(--space-lg)">365 días · Ahorra 33%</div>
        <button class="btn btn-primary" style="width:100%" data-plan="premium_yearly">Suscribirse</button>
      </div>
    </div>
    <div style="margin-top:var(--space-lg)">
      <h3 style="margin-bottom:var(--space-md)">Historial de Pagos</h3>
      <a href="/app/payments/history" class="btn btn-secondary" data-router-link>Ver historial completo</a>
    </div>
    <div id="paypalContainer" style="display:none;margin-top:var(--space-md)"></div>
  `;

  // Load current plan
  try {
    const plan = await api.get('/payments/plan-status', { signal });
    const statusEl = document.getElementById('planStatus');
    if (statusEl) {
      statusEl.innerHTML = `
        <div class="card" style="margin-bottom:var(--space-lg)">
          <div style="display:flex;align-items:center;justify-content:space-between">
            <div><strong>Plan actual:</strong> ${plan.planType || 'free'}</div>
            <span class="badge ${plan.isActive ? 'badge-success' : 'badge-danger'}">${plan.isActive ? 'Activo' : 'Expirado'}</span>
          </div>
          <div style="color:var(--text-muted);font-size:var(--text-sm);margin-top:8px">${plan.daysRemaining ?? 0} días restantes · Expira: ${plan.expiresAt ? new Date(plan.expiresAt).toLocaleDateString() : '—'}</div>
        </div>
      `;
    }
  } catch {}

  // Subscribe buttons
  document.querySelectorAll('[data-plan]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const planId = btn.dataset.plan;
      btn.disabled = true; btn.textContent = 'Procesando...';
      try {
        const order = await api.post('/payments/create-order', { planId }, { signal });
        const container = document.getElementById('paypalContainer');
        container.style.display = 'block';
        container.innerHTML = `<p style="color:var(--text-muted)">Redirigiendo a PayPal para completar el pago...</p>
          <div id="paypal-button-container"></div>`;

        // Load PayPal SDK if available
        if (typeof paypal !== 'undefined') {
          paypal.Buttons({
            createOrder: () => order.orderData?.purchase_units ? order.orderData.purchase_units[0].amount.value : '9.99',
            onApprove: async (data) => {
              try {
                await api.post('/payments/capture-order', { paymentId: order.paymentId, orderId: data.orderID, payerId: data.payerID }, { signal });
                toast?.showToast?.({ type: 'success', message: 'Pago exitoso. Tu plan se ha actualizado.' });
                navigate('/app/dashboard');
              } catch (e) {
                toast?.showToast?.({ type: 'error', message: e.message || 'Error al procesar pago' });
              }
            },
            onError: (err) => {
              toast?.showToast?.({ type: 'error', message: 'PayPal error: ' + (err?.message || 'desconocido') });
            }
          }).render('#paypal-button-container');
        } else {
          /* PayPal SDK no cargado. Pedido queda pendiente. */
          container.innerHTML = `<div style="padding:var(--space-md);background:rgba(255,215,0,0.08);border:1px solid rgba(255,215,0,0.2);border-radius:12px;margin-top:var(--space-sm)">
            <div style="font-weight:700;color:#ffd700;margin-bottom:6px">⚠️ Pasarela de pago no configurada</div>
            <div style="font-size:var(--text-sm);color:var(--text-secondary)">El pedido <code>${escapeHtml(order.paymentId || '')}</code> fue creado. Contacta al administrador para completar el pago manualmente.</div>
            <div style="font-size:var(--text-xs);color:var(--text-muted);margin-top:6px">La integración con PayPal SDK se activará cuando se configure PAYPAL_CLIENT_ID.</div>
          </div>`;
        }
      } catch (err) {
        toast?.showToast?.({ type: 'error', message: err.message || 'Error' });
        btn.disabled = false; btn.textContent = 'Suscribirse';
      }
    }, { signal });
  });
}

function escapeHtml(s) { return String(s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
