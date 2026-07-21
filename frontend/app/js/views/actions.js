/**
 * Actions & Events View — TikToolStream
 * Sistema IFTTT: triggers → acciones multimedia con preview
 */

export async function mount({ target, api, signal }) {
  const { showToast } = await import('/app/js/core/toast.js');

  const userId = (() => { try { return JSON.parse(localStorage.getItem('user') || '{}').id; } catch { return ''; } })();

  target.innerHTML = `
    <style>
      .actions-grid { display:grid; grid-template-columns:1fr 1fr; gap:var(--space-lg); }
      @media (max-width: 900px) { .actions-grid { grid-template-columns:1fr; } }
      @media (max-width: 480px) {
        .actions-grid .card { padding:var(--space-sm); }
        .actions-grid input, .actions-grid select { font-size:0.85rem; }
      }
    </style>
    <h1 class="view-title">⚡ Acciones y Eventos</h1>
    <p class="view-subtitle">Define reacciones automáticas cuando los viewers envían regalos, siguen, comparten y más</p>

    <div class="actions-grid">
      <!-- Left: Form -->
      <div>
        <div class="card" style="margin-bottom:var(--space-lg)">
          <h3 style="margin-bottom:var(--space-md);display:flex;align-items:center;gap:8px">➕ Nueva Regla</h3>
          <div class="input-group" style="margin-bottom:var(--space-sm)">
            <label class="input-label">Nombre de la regla</label>
            <input type="text" id="actName" class="input-field" placeholder="Ej: Alerta de regalo grande">
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-sm);margin-bottom:var(--space-sm)">
            <div class="input-group">
              <label class="input-label">CUÁNDO (trigger)</label>
              <select id="actTrigger" class="input-field">
                <option value="gift">🎁 Cualquier regalo</option>
                <option value="gift_specific">🎯 Regalo específico</option>
                <option value="follow">👤 Nuevo seguidor</option>
                <option value="share">🔄 Share</option>
                <option value="like">❤️ Like</option>
                <option value="connect">🔗 Conexión al live</option>
                <option value="disconnect">🔌 Desconexión</option>
              </select>
            </div>
            <div class="input-group" id="giftIdGroup" style="display:none">
              <label class="input-label">Regalo</label>
              <div style="display:flex;gap:8px;align-items:center">
                <select id="actGiftId" class="input-field" style="flex:1"><option value="">Cargando regalos...</option></select>
                <img id="actGiftPreview" style="width:36px;height:36px;border-radius:6px;display:none;background:rgba(255,255,255,0.05)">
              </div>
            </div>
            <div class="input-group">
              <label class="input-label">ENTONCES (acción)</label>
              <select id="actType" class="input-field">
                <option value="alert">🔔 Alerta visual</option>
                <option value="text">📝 Texto en pantalla</option>
                <option value="sound">🔊 Sonido</option>
                <option value="video">🎬 Video</option>
                <option value="gif">🖼️ GIF animado</option>
                <option value="image">🖼️ Imagen</option>
              </select>
            </div>
          </div>
          <div class="input-group" style="margin-bottom:var(--space-sm)">
            <label class="input-label">Valor (mensaje, URL del archivo, etc.)</label>
            <input type="text" id="actValue" class="input-field" placeholder='"GRAN REGALO!" o https://ejemplo.com/video.mp4'>
            <div id="actValueHelp" style="font-size:var(--text-xs);color:var(--text-muted);margin-top:4px">📝 Escribe el mensaje que se mostrará</div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-sm);margin-bottom:var(--space-sm)">
            <div class="input-group">
              <label class="input-label">Cooldown (segundos)</label>
              <input type="number" id="actCooldown" class="input-field" value="0" min="0" placeholder="0 = sin cooldown">
            </div>
            <div class="input-group" id="volumeGroup">
              <label class="input-label">Volumen (si es sonido)</label>
              <input type="number" id="actVolume" class="input-field" value="0.8" min="0" max="1" step="0.1">
            </div>
          </div>
          <button class="btn btn-primary" id="btnAddAct" style="width:100%">➕ Crear Regla</button>
        </div>

        <!-- OBS URL -->
        <div class="card" style="background:rgba(0,217,255,0.05);border-color:rgba(0,217,255,0.2)">
          <div style="font-weight:600;margin-bottom:var(--space-sm)">🎥 Overlay para OBS</div>
          <p style="font-size:var(--text-sm);color:var(--text-muted);margin-bottom:var(--space-sm)">Agrega este overlay como Browser Source en OBS para que las acciones se vean en tu stream:</p>
          <div style="display:flex;gap:var(--space-sm)">
            <input type="text" id="obsActionsUrl" readonly style="flex:1;padding:10px;background:var(--bg-input);border:1px solid var(--border-color);border-radius:8px;color:var(--color-primary);font-family:var(--font-mono);font-size:var(--text-sm)">
            <button class="btn btn-sm btn-primary" id="copyObsUrl">📋</button>
            <button class="btn btn-sm btn-secondary" id="previewObsUrl">👁️</button>
          </div>
        </div>

        <!-- Quick test -->
        <div class="card" style="margin-top:var(--space-md);background:rgba(255,215,0,0.05);border-color:rgba(255,215,0,0.2)">
          <div style="font-weight:600;margin-bottom:var(--space-sm);font-size:var(--text-sm)">🧪 Test rápido</div>
          <p style="font-size:var(--text-xs);color:var(--text-muted);margin-bottom:var(--space-sm)">Prueba cómo se ve una acción sin esperar un regalo real</p>
          <div style="display:flex;gap:var(--space-sm)">
            <input type="text" id="testValue" class="input-field" placeholder="Mensaje de prueba" style="flex:1;font-size:var(--text-sm)">
            <select id="testType" class="input-field" style="width:120px;font-size:var(--text-sm)">
              <option value="alert">🔔 Alerta</option>
              <option value="text">📝 Texto</option>
            </select>
            <button class="btn btn-sm btn-primary" id="btnTestAction">▶ Probar</button>
          </div>
        </div>
      </div>

      <!-- Right: Rules list -->
      <div>
        <h3 style="margin-bottom:var(--space-md);font-size:var(--text-sm);text-transform:uppercase;letter-spacing:1px;color:var(--text-muted)">Reglas activas</h3>
        <div id="actionsList"><div class="loading-state"><div class="spinner-sm"></div></div></div>
      </div>
    </div>
  `;

  // ============ GIFT CATALOG ============
  let giftData = {};
  async function loadGiftSelect() {
    try {
      const resp = await fetch('/gifts.json');
      giftData = await resp.json();
      const select = document.getElementById('actGiftId');
      if (!select) return;
      const gifts = Object.values(giftData).sort((a, b) => (b.diamond_count || 0) - (a.diamond_count || 0));
      select.innerHTML = '<option value="">Selecciona un regalo...</option>' +
        gifts.map(g => `<option value="${g.id}">${g.name} (${g.diamond_count || g.cost}💎)</option>`).join('');
    } catch {}
  }
  loadGiftSelect();

  // Show gift image preview when selected
  document.getElementById('actGiftId')?.addEventListener('change', function() {
    const preview = document.getElementById('actGiftPreview');
    if (!preview) return;
    const gift = giftData[this.value];
    if (gift && gift.image) {
      preview.src = gift.image;
      preview.style.display = 'block';
    } else {
      preview.style.display = 'none';
    }
  }, { signal });

  // ============ DYNAMIC FIELDS ============
  document.getElementById('actTrigger')?.addEventListener('change', function() {
    document.getElementById('giftIdGroup').style.display = this.value === 'gift_specific' ? 'block' : 'none';
  }, { signal });

  document.getElementById('actType')?.addEventListener('change', function() {
    const help = document.getElementById('actValueHelp');
    const hints = { alert: '📝 Escribe el mensaje', text: '📝 Escribe el texto a mostrar', sound: '🔊 URL de audio (mp3, wav)', video: '🎬 URL de video (mp4, webm)', gif: '🖼️ URL de GIF animado', image: '🖼️ URL de imagen (png, jpg)' };
    if (help) help.textContent = hints[this.value] || '';
    document.getElementById('volumeGroup').style.display = this.value === 'sound' ? 'block' : 'none';
  }, { signal });

  // ============ OBS URL ============
  const obsInput = document.getElementById('obsActionsUrl');
  if (obsInput) obsInput.value = `${window.location.origin}/overlays/overlay-actions.html${userId ? '?userId=' + userId : ''}`;
  document.getElementById('copyObsUrl')?.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(obsInput.value); showToast({ type: 'success', message: 'URL copiada' }); } catch {}
  }, { signal });
  document.getElementById('previewObsUrl')?.addEventListener('click', () => {
    window.open(obsInput.value, '_blank');
  }, { signal });

  // ============ TEST ACTION ============
  document.getElementById('btnTestAction')?.addEventListener('click', () => {
    const val = document.getElementById('testValue').value.trim() || '¡Acción de prueba!';
    const type = document.getElementById('testType').value;
    const popup = window.open('', 'testPreview', 'width=400,height=300');
    if (!popup) { showToast({ type: 'warning', message: 'Permite ventanas emergentes para el preview' }); return; }
    const bg = type === 'alert' ? 'rgba(0,0,0,0.85)' : 'rgba(0,0,0,0.7)';
    const border = type === 'alert' ? '3px solid #ffd700' : '2px solid rgba(0,217,255,0.3)';
    popup.document.write(`<!DOCTYPE html><html><body style="margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh;background:transparent">
      <div style="background:${bg};backdrop-filter:blur(12px);border-radius:20px;padding:30px 50px;border:${border};text-align:center;animation:fadeIn 0.5s;color:#fff;font-family:sans-serif">
        <div style="font-size:48px;margin-bottom:8px">${type === 'alert' ? '🎯' : '💬'}</div>
        <div style="color:${type === 'alert' ? '#ffd700' : '#00d9ff'};font-weight:600;font-size:14px;text-transform:uppercase;letter-spacing:2px">TEST</div>
        <div style="font-size:24px;font-weight:700;margin-top:8px">${val}</div>
      </div>
      <style>@keyframes fadeIn{from{opacity:0;transform:scale(0.8)}to{opacity:1;transform:scale(1)}}</style>
      <script>setTimeout(()=>window.close(),4000)</script>
    </body></html>`);
  }, { signal });

  // ============ LOAD & LIST ============
  async function loadActions() {
    try {
      const data = await api.get('/actions', { signal });
      const acts = Array.isArray(data) ? data : [];
      const container = document.getElementById('actionsList');
      if (acts.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="icon">⚡</div><p>Crea tu primera regla</p></div>';
        return;
      }
      const typeIcons = { alert: '🔔', text: '📝', sound: '🔊', video: '🎬', gif: '🖼️', image: '🖼️' };
      const triggerLabels = { gift: '🎁 Cualquier regalo', gift_specific: '🎯 Regalo específico', follow: '👤 Follow', share: '🔄 Share', like: '❤️ Like', connect: '🔗 Conexión', disconnect: '🔌 Desconexión' };
      container.innerHTML = acts.map(a => {
        const cfg = typeof a.action_config === 'string' ? (() => { try { return JSON.parse(a.action_config); } catch { return {}; } })() : (a.action_config || {});
        return `<div class="card" style="margin-bottom:var(--space-sm);padding:var(--space-md);border-left:4px solid ${a.enabled ? 'var(--color-success)' : 'var(--text-muted)'}">
          <div style="display:flex;align-items:center;justify-content:space-between">
            <div style="flex:1;min-width:0">
              <div style="font-weight:600;font-size:var(--text-sm)">${a.name}</div>
              <div style="font-size:var(--text-xs);color:var(--text-muted);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
                ${triggerLabels[a.trigger_type] || a.trigger_type} → ${typeIcons[a.action_type] || ''} ${a.action_type}
                ${cfg.value ? '· "' + cfg.value.substring(0, 50) + '"' : ''}
                ${a.cooldown > 0 ? '· cd: ' + a.cooldown + 's' : ''}
              </div>
            </div>
            <div style="display:flex;gap:4px;flex-shrink:0;margin-left:8px">
              <button class="btn btn-sm ${a.enabled ? 'btn-success' : 'btn-secondary'}" data-toggle="${a.id}" style="min-width:40px">${a.enabled ? 'ON' : 'OFF'}</button>
              <button class="btn btn-sm btn-danger" data-del="${a.id}" style="min-width:32px">✕</button>
            </div>
          </div>
        </div>`;
      }).join('');
      container.querySelectorAll('[data-toggle]').forEach(btn => {
        btn.addEventListener('click', async () => {
          try { await api.put(`/actions/${btn.dataset.toggle}/toggle`, {}, { signal }); loadActions(); } catch {}
        }, { signal });
      });
      container.querySelectorAll('[data-del]').forEach(btn => {
        btn.addEventListener('click', async () => {
          try { await api.del(`/actions/${btn.dataset.del}`, { signal }); loadActions(); showToast({ type: 'success', message: 'Regla eliminada' }); } catch {}
        }, { signal });
      });
    } catch { document.getElementById('actionsList').innerHTML = '<div class="error-state"><p>Error al cargar</p></div>'; }
  }

  // ============ CREATE ACTION ============
  document.getElementById('btnAddAct')?.addEventListener('click', async () => {
    const name = document.getElementById('actName').value.trim();
    const rawTrigger = document.getElementById('actTrigger').value;
    const triggerType = rawTrigger === 'gift_specific' ? 'gift' : rawTrigger;
    const triggerId = rawTrigger === 'gift_specific' ? document.getElementById('actGiftId').value : (rawTrigger === 'gift' ? 'any' : null);
    const actionType = document.getElementById('actType').value;
    const value = document.getElementById('actValue').value.trim();
    const cooldown = parseInt(document.getElementById('actCooldown').value) || 0;
    const volume = parseFloat(document.getElementById('actVolume').value) || 0.8;

    if (!name || !value) { showToast({ type: 'warning', message: 'Nombre y valor requeridos' }); return; }

    const btn = document.getElementById('btnAddAct');
    btn.disabled = true; btn.textContent = 'Creando...';
    try {
      await api.post('/actions', { name, triggerType, triggerId, actionType, actionConfig: { value, volume }, cooldown }, { signal });
      showToast({ type: 'success', message: `Regla "${name}" creada` });
      document.getElementById('actName').value = '';
      document.getElementById('actValue').value = '';
      loadActions();
    } catch (err) { showToast({ type: 'error', message: err.message || 'Error' }); }
    btn.disabled = false; btn.textContent = '➕ Crear Regla';
  }, { signal });

  await loadActions();
}
