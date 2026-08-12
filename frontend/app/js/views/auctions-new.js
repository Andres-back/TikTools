/**
 * New Auction View — TikToolStream
 */
export async function mount({ target, api, navigate, signal }) {
  target.innerHTML = `
    <div class="ux-page-head">
      <div>
        <div class="ux-kicker">Subastas</div>
        <h1 class="view-title">Nueva Subasta</h1>
        <p class="view-subtitle">Crea una subasta para tu TikTok Live</p>
      </div>
      <div class="ux-page-actions">
        <a href="/app/auctions" class="btn btn-secondary" data-router-link><i class="fa-solid fa-arrow-left"></i> Volver</a>
      </div>
    </div>
    <div class="card" style="max-width:560px">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:var(--space-lg)">
        <div style="width:44px;height:44px;border-radius:12px;background:linear-gradient(135deg, rgba(0,212,255,0.2), rgba(124,58,237,0.1));display:flex;align-items:center;justify-content:center">
          <i class="fa-solid fa-gavel" style="font-size:20px;color:var(--color-primary)"></i>
        </div>
        <div>
          <div style="font-weight:700;font-size:var(--text-base)">Configuración de la subasta</div>
          <div style="font-size:var(--text-xs);color:var(--text-muted)">Define el usuario TikTok y los parámetros de tiempo</div>
        </div>
      </div>
      <div class="input-group" style="margin-bottom:var(--space-md)">
        <label class="input-label"><i class="fa-brands fa-tiktok" style="margin-right:4px"></i> Usuario TikTok</label>
        <div style="position:relative">
          <span style="position:absolute;left:12px;top:50%;transform:translateY(-50%);color:var(--text-muted)">@</span>
          <input type="text" id="auctionUsername" class="input-field" placeholder="usuario" required style="padding-left:28px">
        </div>
        <span class="error-text" id="errUsername" style="display:none"></span>
      </div>
      <div class="input-group" style="margin-bottom:var(--space-md)">
        <label class="input-label"><i class="fa-regular fa-pen-to-square" style="margin-right:4px"></i> Título (opcional)</label>
        <input type="text" id="auctionTitle" class="input-field" placeholder="Ej: Subasta del viernes">
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:var(--space-md);margin-bottom:var(--space-md)">
        <div class="input-group">
          <label class="input-label"><i class="fa-regular fa-clock"></i> Tiempo inicial (s)</label>
          <input type="number" id="auctionTime" class="input-field" value="120" min="10" max="600">
        </div>
        <div class="input-group">
          <label class="input-label"><i class="fa-solid fa-hourglass-start"></i> Delay (s)</label>
          <input type="number" id="auctionDelay" class="input-field" value="20" min="0" max="120">
        </div>
        <div class="input-group">
          <label class="input-label"><i class="fa-solid fa-arrow-right-arrow-left"></i> Extensión (s)</label>
          <input type="number" id="auctionTie" class="input-field" value="10" min="0" max="60">
        </div>
      </div>
      <button class="btn btn-primary" id="btnSave" style="width:100%;padding:12px">
        <i class="fa-solid fa-play"></i> Crear Subasta
      </button>
      <div id="formFeedback" style="margin-top:var(--space-md);font-size:var(--text-sm);text-align:center"></div>
    </div>
  `;

  const btn = document.getElementById('btnSave');
  const feedback = document.getElementById('formFeedback');

  btn.addEventListener('click', async () => {
    const username = document.getElementById('auctionUsername').value.trim();
    if (!username) {
      document.getElementById('errUsername').style.display = 'block';
      document.getElementById('errUsername').textContent = 'El usuario TikTok es requerido';
      return;
    }
    document.getElementById('errUsername').style.display = 'none';
    btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Creando...';

    try {
      const result = await api.post('/auctions', {
        tiktokUsername: username,
        title: document.getElementById('auctionTitle').value.trim() || undefined,
        initialTime: parseInt(document.getElementById('auctionTime').value) || 120,
        delayTime: parseInt(document.getElementById('auctionDelay').value) || 20,
        tieExtension: parseInt(document.getElementById('auctionTie').value) || 10
      }, { signal });
      feedback.innerHTML = '<span style="color:var(--color-success)">✅ Subasta creada exitosamente</span>';
      setTimeout(() => navigate(\`/app/auctions/\${result.auction?.id || ''}\`), 1000);
    } catch (err) {
      if (err.name === 'AbortError') return;
      feedback.innerHTML = \`<span style="color:var(--color-danger)"><i class="fa-solid fa-circle-exclamation"></i> \${err.message || 'Error al crear'}</span>\`;
      btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-play"></i> Crear Subasta';
    }
  }, { signal });
  // GSAP animate new auction form
    if (typeof gsap !== 'undefined') requestAnimationFrame(() => {
      const card = document.querySelector('.card');
      if (card) gsap.from(card, { opacity: 0, y: 24, duration: 0.45, ease: 'power2.out' });
      const fields = document.querySelectorAll('.input-group');
      if (fields.length) gsap.from(fields, { opacity: 0, y: 12, stagger: 0.06, duration: 0.3, ease: 'power2.out', delay: 0.15 });
    });
}
