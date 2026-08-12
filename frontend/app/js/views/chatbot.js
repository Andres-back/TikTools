/**
 * Chatbot Configuration View — TikToolStream
 * Premium with categories, usage stats and test runner
 */

export async function mount({ target, api, signal }) {
  const { showToast } = await import('/app/js/core/toast.js');

  let cmds = [];
  let search = '';
  let category = 'all';

  const CATEGORIES = {
    info: { icon: 'ℹ️', color: '#00d9ff', label: 'Info' },
    fun: { icon: '🎉', color: '#ffd700', label: 'Diversión' },
    mod: { icon: '🛡️', color: '#ff6b6b', label: 'Moderación' },
    util: { icon: '🛠️', color: '#7b2ff7', label: 'Utilidad' }
  };

  target.innerHTML = `
    <style>
      .cb-head { display:flex; align-items:center; justify-content:space-between; margin-bottom:var(--space-md); flex-wrap:wrap; gap:var(--space-md); }
      .cb-stats { display:grid; grid-template-columns:repeat(4, 1fr); gap:var(--space-sm); margin-bottom:var(--space-lg); }
      .cb-stats .stat { background:linear-gradient(135deg, rgba(0,217,255,0.08), rgba(123,47,247,0.04)); border:1px solid rgba(0,217,255,0.15); border-radius:12px; padding:var(--space-md); text-align:center; }
      .cb-stats .stat .nu { font-size:1.4rem; font-weight:800; background:linear-gradient(135deg, #00d9ff, #7b2ff7); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }
      .cb-stats .stat .lb { font-size:var(--text-xs); color:var(--text-muted); }
      .cb-grid { display:grid; grid-template-columns: 380px 1fr; gap:var(--space-lg); }
      .cb-form { background:linear-gradient(160deg, rgba(20,25,45,0.95), rgba(15,20,40,0.95)); border:1px solid rgba(255,255,255,0.08); border-radius:16px; padding:var(--space-md); align-self:start; }
      .cb-form h3 { font-size: var(--text-sm); text-transform: uppercase; letter-spacing: 1.5px; color: var(--text-muted); margin-bottom: var(--space-md); font-weight: 600; }
      .cb-list-wrap { display:flex; flex-direction:column; gap:var(--space-sm); }
      .cb-toolbar { display:flex; gap:8px; align-items:center; margin-bottom:var(--space-md); flex-wrap:wrap; }
      .cb-toolbar input { flex:1; min-width:160px; padding:8px 12px; background:var(--bg-input); border:1px solid var(--border-color); border-radius:10px; color:#fff; font-size:var(--text-sm); }
      .cat-chip { padding:5px 12px; border-radius:16px; border:1px solid var(--border-color); background:transparent; color:var(--text-secondary); cursor:pointer; font-size:var(--text-xs); font-weight:600; transition:all 0.2s; font-family:inherit; }
      .cat-chip:hover { background:rgba(0,217,255,0.06); }
      .cat-chip.active { background:linear-gradient(135deg, rgba(0,217,255,0.2), rgba(123,47,247,0.15)); border-color:rgba(0,217,255,0.5); color:#00d9ff; }
      .cmd-card { background:linear-gradient(160deg, rgba(20,25,45,0.95), rgba(15,20,40,0.95)); border:1px solid rgba(255,255,255,0.08); border-radius:14px; padding:var(--space-md); display:flex; align-items:center; gap:10px; transition:all 0.2s; }
      .cmd-card:hover { border-color:rgba(0,217,255,0.25); transform:translateX(2px); }
      .cmd-card.disabled { opacity:0.5; }
      .cmd-icon { width:40px; height:40px; border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:1.1rem; flex-shrink:0; }
      .cmd-body { flex:1; min-width:0; }
      .cmd-trigger { color:#00d9ff; font-weight:700; font-family:'Montserrat',monospace; font-size:0.95rem; }
      .cmd-response { color:var(--text-secondary); font-size:0.85rem; margin-top:2px; overflow:hidden; text-overflow:ellipsis; display:-webkit-box; -webkit-line-clamp:1; -webkit-box-orient:vertical; }
      .cmd-meta { display:flex; gap:6px; margin-top:4px; font-size:var(--text-xs); color:var(--text-muted); align-items:center; flex-wrap:wrap; }
      .cmd-meta .badge-count { background:rgba(0,217,255,0.1); color:#00d9ff; padding:2px 6px; border-radius:6px; font-weight:700; }
      .cmd-actions { display:flex; gap:4px; flex-shrink:0; }
      .cmd-actions button { padding:5px 8px; font-size:0.85rem; }
      .test-panel { margin-top:var(--space-md); padding:var(--space-md); background:linear-gradient(135deg, rgba(255,215,0,0.05), rgba(255,107,0,0.02)); border:1px solid rgba(255,215,0,0.2); border-radius:14px; }
      .test-panel h4 { color:#ffd700; font-size:var(--text-sm); margin-bottom:8px; font-weight:700; }
      .test-bubble { background:rgba(10,10,30,0.6); border:1px solid var(--border-color); border-radius:10px; padding:8px 12px; margin-top:8px; font-size:0.9rem; }
      .test-bubble .tb-trigger { color:#00d9ff; font-weight:700; font-family:monospace; }
      .test-bubble .tb-arrow { color:var(--text-muted); margin:0 6px; }
      .test-bubble .tb-response { color:#fff; }
      @media (max-width: 900px) { .cb-grid { grid-template-columns:1fr; } .cb-stats { grid-template-columns:repeat(2, 1fr); } }
    </style>

    <div class="cb-head">
      <div>
        <h1 class="view-title" style="margin-bottom:4px">🤖 Chatbot</h1>
        <p class="view-subtitle" style="margin-bottom:0">Comandos personalizados que los viewers pueden usar en el chat</p>
      </div>
    </div>

    <div class="cb-stats">
      <div class="stat"><div class="nu" id="statCmds">0</div><div class="lb">Comandos</div></div>
      <div class="stat"><div class="nu" id="statActive">0</div><div class="lb">Activos</div></div>
      <div class="stat"><div class="nu" id="statUses">0</div><div class="lb">Usos totales</div></div>
      <div class="stat"><div class="nu" id="statTop">—</div><div class="lb">Más usado</div></div>
    </div>

    <div class="cb-grid">
      <div class="cb-form">
        <h3>➕ Nuevo Comando</h3>
        <div class="input-group" style="margin-bottom:var(--space-sm)">
          <label class="input-label">Trigger</label>
          <input type="text" id="cmdName" class="input-field" placeholder="!redes" value="!">
        </div>
        <div class="input-group" style="margin-bottom:var(--space-sm)">
          <label class="input-label">Respuesta</label>
          <textarea id="cmdResponse" class="input-field" rows="3" placeholder="Texto que responderá el bot"></textarea>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-sm);margin-bottom:var(--space-sm)">
          <div class="input-group">
            <label class="input-label">Categoría</label>
            <select id="cmdCat" class="input-field">
              <option value="info">ℹ️ Info</option>
              <option value="fun">🎉 Diversión</option>
              <option value="mod">🛡️ Moderación</option>
              <option value="util">🛠️ Utilidad</option>
            </select>
          </div>
          <div class="input-group">
            <label class="input-label">Permiso</label>
            <select id="cmdPerm" class="input-field">
              <option value="all">Todos</option>
              <option value="vip">VIP</option>
              <option value="mod">Mod</option>
            </select>
          </div>
        </div>
        <div class="input-group" style="margin-bottom:var(--space-sm)">
          <label class="input-label">Cooldown (segundos)</label>
          <input type="number" id="cmdCooldown" class="input-field" value="0" min="0">
        </div>
        <button class="btn btn-primary" id="btnAddCmd" style="width:100%">Crear Comando</button>

        <div class="test-panel">
          <h4>🧪 Probador</h4>
          <p style="font-size:var(--text-xs);color:var(--text-muted);margin-bottom:6px">Escribe un trigger y mira la respuesta</p>
          <input type="text" id="testInput" class="input-field" placeholder="!redes" style="width:100%">
          <div id="testResult" class="test-bubble" style="display:none"></div>
        </div>
      </div>

      <div>
        <div class="cb-toolbar">
          <input type="text" id="cbSearch" placeholder="🔍 Buscar comando...">
          <button class="cat-chip active" data-cat="all">Todos</button>
          <button class="cat-chip" data-cat="info">ℹ️ Info</button>
          <button class="cat-chip" data-cat="fun">🎉 Fun</button>
          <button class="cat-chip" data-cat="mod">🛡️ Mod</button>
          <button class="cat-chip" data-cat="util">🛠️ Util</button>
        </div>
        <div id="commandsList" class="cb-list-wrap"><div class="loading-state"><div class="spinner-sm"></div></div></div>
      </div>
    </div>
  `;

  function escapeHtml(s) { return String(s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function escapeAttr(s) { return String(s || '').replace(/"/g, '&quot;'); }

  function updateStats() {
    const total = cmds.length;
    const active = cmds.filter(c => c.enabled !== false && c.enabled !== 0).length;
    const uses = cmds.reduce((s, c) => s + (c.usage_count || 0), 0);
    const top = [...cmds].sort((a, b) => (b.usage_count || 0) - (a.usage_count || 0))[0];
    document.getElementById('statCmds').textContent = total;
    document.getElementById('statActive').textContent = active;
    document.getElementById('statUses').textContent = uses.toLocaleString();
    document.getElementById('statTop').textContent = top ? escapeHtml(top.command) : '—';
  }

  function renderList() {
    const container = document.getElementById('commandsList');
    if (!container) return;
    let filtered = cmds;
    if (category !== 'all') filtered = filtered.filter(c => (c.category || 'info') === category);
    if (search) filtered = filtered.filter(c => (c.command || '').toLowerCase().includes(search) || (c.response || '').toLowerCase().includes(search));

    if (filtered.length === 0) {
      container.innerHTML = '<div class="empty-state"><p>Sin comandos</p></div>';
      return;
    }
    container.innerHTML = filtered.map(c => {
      const cat = CATEGORIES[c.category || 'info'] || CATEGORIES.info;
      const enabled = c.enabled !== false && c.enabled !== 0;
      return `<div class="cmd-card ${enabled ? '' : 'disabled'}">
        <div class="cmd-icon" style="background:${cat.color}22;color:${cat.color}">${cat.icon}</div>
        <div class="cmd-body">
          <div class="cmd-trigger">${escapeHtml(c.command)}</div>
          <div class="cmd-response">${escapeHtml(c.response || '')}</div>
          <div class="cmd-meta">
            <span class="badge-count">${c.usage_count || 0} usos</span>
            <span>·</span>
            <span>perm: ${c.permission || 'all'}</span>
            ${c.cooldown > 0 ? `<span>·</span><span>cd: ${c.cooldown}s</span>` : ''}
          </div>
        </div>
        <div class="cmd-actions">
          <button class="btn btn-sm btn-ghost" data-test="${escapeAttr(c.command)}" title="Probar">▶</button>
          <button class="btn btn-sm ${enabled ? 'btn-success' : 'btn-secondary'}" data-toggle="${c.id}" title="${enabled ? 'Desactivar' : 'Activar'}">${enabled ? 'ON' : 'OFF'}</button>
          <button class="btn btn-sm btn-ghost" data-del="${c.id}" title="Eliminar" style="color:var(--color-danger)">🗑️</button>
        </div>
      </div>`;
    }).join('');

    container.querySelectorAll('[data-test]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.getElementById('testInput').value = btn.dataset.test;
        runTest();
      });
    });
    container.querySelectorAll('[data-toggle]').forEach(btn => {
      btn.addEventListener('click', async () => {
        try { await api.put(`/chatbot/${btn.dataset.toggle}/toggle`, {}, { signal }); await loadCmds(); } catch (err) { showToast({ type: 'error', message: err.message }); }
      }, { signal });
    });
    container.querySelectorAll('[data-del]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('¿Eliminar este comando?')) return;
        try { await api.del(`/chatbot/${btn.dataset.del}`, { signal }); showToast({ type: 'success', message: 'Eliminado' }); await loadCmds(); } catch (err) { showToast({ type: 'error', message: err.message }); }
      }, { signal });
    });
  }

  function runTest() {
    const input = document.getElementById('testInput').value.trim();
    const result = document.getElementById('testResult');
    if (!input) { result.style.display = 'none'; return; }
    const match = cmds.find(c => c.command.toLowerCase() === input.toLowerCase());
    result.style.display = 'block';
    if (match) {
      result.innerHTML = `<span class="tb-trigger">${escapeHtml(match.command)}</span><span class="tb-arrow">→</span><span class="tb-response">${escapeHtml(match.response || '')}</span>`;
    } else {
      result.innerHTML = `<span style="color:var(--color-danger)">✗ No se encontró ningún comando con ese trigger</span>`;
    }
  }

  async function loadCmds() {
    try {
      const data = await api.get('/chatbot', { signal });
      cmds = Array.isArray(data) ? data : [];
      updateStats();
      renderList();
    } catch (err) { console.error(err); }
  }

  document.querySelectorAll('.cat-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.cat-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      category = chip.dataset.cat;
      renderList();
    }, { signal });
  });

  document.getElementById('cbSearch')?.addEventListener('input', (e) => {
    search = e.target.value.toLowerCase();
    renderList();
  }, { signal });

  document.getElementById('testInput')?.addEventListener('input', runTest, { signal });
  document.getElementById('testInput')?.addEventListener('keypress', (e) => { if (e.key === 'Enter') runTest(); }, { signal });

  document.getElementById('btnAddCmd')?.addEventListener('click', async () => {
    let cmd = document.getElementById('cmdName').value.trim();
    const response = document.getElementById('cmdResponse').value.trim();
    const category = document.getElementById('cmdCat').value;
    if (!cmd || !response) { showToast({ type: 'warning', message: 'Trigger y respuesta requeridos' }); return; }
    if (!cmd.startsWith('!')) cmd = '!' + cmd;
    try {
      await api.post('/chatbot', {
        command: cmd, response,
        category,
        permission: document.getElementById('cmdPerm').value,
        cooldown: parseInt(document.getElementById('cmdCooldown').value) || 0
      }, { signal });
      showToast({ type: 'success', message: `Comando ${cmd} creado` });
      document.getElementById('cmdName').value = '!';
      document.getElementById('cmdResponse').value = '';
      await loadCmds();
    } catch (err) { showToast({ type: 'error', message: err.message || 'Error' }); }
  }, { signal });

  await loadCmds();
  // GSAP animate chatbot
    if (typeof gsap !== 'undefined') requestAnimationFrame(() => {
      const stats = document.querySelectorAll('.cb-stats > .stat');
      if (stats.length) gsap.from(stats, { opacity: 0, y: 20, stagger: 0.07, duration: 0.4, ease: 'power2.out' });
    });
}
