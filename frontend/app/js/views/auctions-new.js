/**
 * New Auction View — TikToolStream
 */

export async function mount({ target, api, navigate, signal }) {
  target.innerHTML = `
    <h1 class="view-title">Nueva Subasta</h1>
    <div class="card" style="max-width:500px">
      <div class="input-group" style="margin-bottom:var(--space-md)">
        <label class="input-label" for="auctionUsername">Usuario TikTok</label>
        <input type="text" id="auctionUsername" class="input-field" placeholder="@usuario" required>
        <span class="error-text" id="errUsername" style="display:none"></span>
      </div>
      <div class="input-group" style="margin-bottom:var(--space-md)">
        <label class="input-label" for="auctionTitle">Título (opcional)</label>
        <input type="text" id="auctionTitle" class="input-field" placeholder="Ej: Subasta del viernes">
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:var(--space-md);margin-bottom:var(--space-md)">
        <div class="input-group">
          <label class="input-label" for="auctionTime">Tiempo inicial (s)</label>
          <input type="number" id="auctionTime" class="input-field" value="120" min="10" max="600">
        </div>
        <div class="input-group">
          <label class="input-label" for="auctionDelay">Delay (s)</label>
          <input type="number" id="auctionDelay" class="input-field" value="20" min="0" max="120">
        </div>
        <div class="input-group">
          <label class="input-label" for="auctionTie">Extensión (s)</label>
          <input type="number" id="auctionTie" class="input-field" value="10" min="0" max="60">
        </div>
      </div>
      <button class="btn btn-primary" id="btnSave" style="width:100%">Crear Subasta</button>
      <div id="formFeedback" style="margin-top:var(--space-sm);font-size:var(--text-sm)"></div>
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
    btn.disabled = true; btn.textContent = 'Creando...';

    try {
      const result = await api.post('/auctions', {
        tiktokUsername: username,
        title: document.getElementById('auctionTitle').value.trim() || undefined,
        initialTime: parseInt(document.getElementById('auctionTime').value) || 120,
        delayTime: parseInt(document.getElementById('auctionDelay').value) || 20,
        tieExtension: parseInt(document.getElementById('auctionTie').value) || 10
      }, { signal });
      feedback.innerHTML = '<span style="color:var(--color-success)">✅ Subasta creada</span>';
      setTimeout(() => navigate(`/app/auctions/${result.auction?.id || ''}`), 1000);
    } catch (err) {
      if (err.name === 'AbortError') return;
      feedback.innerHTML = `<span style="color:var(--color-danger)">Error: ${err.message || 'Error al crear'}</span>`;
      btn.disabled = false; btn.textContent = 'Crear Subasta';
    }
  }, { signal });
}
