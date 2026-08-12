/**
 * Payments View — TikToolStream
 */

export async function mount({ target, api, navigate, signal }) {
  let toast;
  try { const t = await import('/app/js/core/toast.js'); toast = t; } catch {}

  target.innerHTML = `
    <div class="ux-page-head">
      <div>
        <div class="ux-kicker">Suscripción</div>
        <h1 class="view-title">Plan y Pagos</h1>
        <p class="view-subtitle">Gestiona tu suscripción Premium y accede a todas las funcionalidades</p>
      </div>
      <div class="ux-page-actions">
        <a href="/app/payments/history" class="btn btn-secondary" data-router-link><i class="fa-solid fa-clock-rotate-left"></i> Historial</a>
      </div>
    </div>
    <div id="planStatus"><div class="loading-state"><div class="spinner-sm"></div></div></div>
    <div id="plansList" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:var(--space-lg);margin-top:var(--space-lg)">
      <div class="card" style="text-align:center;border-color:var(--color-primary);padding:var(--space-xl);position:relative;overflow:hidden">
        <div style="position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,var(--color-primary),transparent)"></div>
        <div style="width:56px;height:56px;border-radius:14px;background:linear-gradient(135deg, rgba(0,212,255,0.15), rgba(124,58,237,0.1));display:flex;align-items:center;justify-content:center;margin:0 auto var(--space-md)">
          <i class="fa-solid fa-star" style="font-size:24px;color:var(--color-primary)"></i>
        </div>
        <h3 style="font-family:var(--font-display);font-size:var(--text-lg)">Premium Mensual</h3>
        <div style="font-size:var(--text-3xl);font-weight:800;margin:var(--space-md);background:linear-gradient(135deg, #00d9ff, #7b2ff7);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">$9.99</div>
        <div style="color:var(--text-muted);font-size:var(--text-sm);margin-bottom:var(--space-lg)"><i class="fa-regular fa-calendar"></i> 30 días · Subastas ilimitadas</div>
        <button class="btn btn-primary" style="width:100%;padding:12px" data-plan="premium_monthly"><i class="fa-solid fa-crown"></i> Suscribirse</button>
      </div>
      <div class="card" style="text-align:center;border-color:var(--color-warning);padding:var(--space-xl);position:relative;overflow:hidden">
        <div style="position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,var(--color-warning),transparent)"></div>
        <div style="position:absolute;top:8px;right:8px"><span class="badge badge-warning">AHORRA 33%</span></div>
        <div style="width:56px;height:56px;border-radius:14px;background:linear-gradient(135deg, rgba(251,191,36,0.15), rgba(249,115,22,0.1));display:flex;align-items:center;justify-content:center;margin:0 auto var(--space-md)">
          <i class="fa-solid fa-crown" style="font-size:24px;color:var(--color-warning)"></i>
        </div>
        <h3 style="font-family:var(--font-display);font-size:var(--text-lg)">Premium Anual</h3>
        <div style="font-size:var(--text-3xl);font-weight:800;margin:var(--space-md);background:linear-gradient(135deg, #ffd700, #ff6b00);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">$79.99</div>
        <div style="color:var(--text-muted);font-size:var(--text-sm);margin-bottom:var(--space-lg)"><i class="fa-regular fa-calendar"></i> 365 días · Ahorra 33% · <strong style="color:var(--color-warning)">$6.67/mes</strong></div>
        <button class="btn btn-primary" style="width:100%;padding:12px;background:linear-gradient(135deg, #ffd700, #ff6b00);border:none" data-plan="premium_yearly"><i class="fa-solid fa-crown"></i> Suscribirse</button>
      </div>
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
  // GSAP animate payments
    if (typeof gsap !== 'undefined') requestAnimationFrame(() => {
      const plans = document.querySelectorAll('#plansList > .card');
      if (plans.length) gsap.from(plans, { opacity: 0, y: 24, stagger: 0.1, duration: 0.45, ease: 'power2.out' });
    });
}

function escapeHtml(s) { return String(s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
