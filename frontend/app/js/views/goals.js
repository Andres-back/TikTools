/**
 * Goals View — TikToolStream
 * Metas con auto-incremento al alcanzar el objetivo
 */

export async function mount({ target, api, signal }) {
  const { showToast } = await import('/app/js/core/toast.js');

  target.innerHTML = `
    <h1 class="view-title">Metas (Goal Overlays)</h1>
    <p class="view-subtitle">Crea barras de progreso que se reajustan automáticamente al alcanzar la meta</p>
    <div class="card" style="margin-bottom:var(--space-lg);max-width:600px">
      <h3 style="margin-bottom:var(--space-md)" id="formTitle">➕ Nueva Meta</h3>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-sm);margin-bottom:var(--space-sm)">
        <div class="input-group">
          <label class="input-label">Tipo</label>
          <select id="goalType" class="input-field">
            <option value="likes">❤️ Likes</option>
            <option value="shares">🔄 Shares</option>
            <option value="followers">👥 Seguidores</option>
            <option value="coins">💎 Monedas</option>
          </select>
        </div>
        <div class="input-group">
          <label class="input-label">Título</label>
          <input type="text" id="goalTitle" class="input-field" placeholder="Ej: 5000 Likes!" value="Meta">
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-sm);margin-bottom:var(--space-sm)">
        <div class="input-group">
          <label class="input-label">Meta</label>
          <input type="number" id="goalTarget" class="input-field" value="1000" min="1">
        </div>
        <div class="input-group" id="incrementGroup" style="display:none">
          <label class="input-label">Incremento automático</label>
          <input type="number" id="goalIncrement" class="input-field" value="1000" min="1" placeholder="Ej: 1000">
          <div style="font-size:var(--text-xs);color:var(--text-muted);margin-top:2px">Al alcanzar la meta, sube automáticamente</div>
        </div>
      </div>
      <label style="display:flex;align-items:center;gap:8px;margin-bottom:var(--space-sm);cursor:pointer;font-size:var(--text-sm)">
        <input type="checkbox" id="goalAutoIncrement"> 🔄 Auto-incremento (al llegar a la meta, sube el objetivo automáticamente)
      </label>
      <div class="input-group" style="margin-bottom:var(--space-md)">
        <label class="input-label">Sonido al completar meta</label>
        <select id="goalSound" class="input-field">
          <option value="/assets/sounds/memes/sigma.mp3">🐺 Sigma (recomendado)</option>
          <option value="/assets/sounds/effects/applause.mp3">👏 Aplausos</option>
          <option value="/assets/sounds/effects/airhorn.mp3">📯 Airhorn</option>
          <option value="/assets/sounds/effects/drumroll.mp3">🥁 Redoble</option>
          <option value="/assets/sounds/effects/cymbal.mp3">🎵 Címbalo</option>
          <option value="/assets/sounds/memes/taco-bell.mp3">🛎️ Taco Bell</option>
          <option value="/assets/sounds/effects/bone-crack.mp3">🦴 Bone Crack</option>
          <option value="/assets/sounds/games/minecraft-level-up.mp3">⬆️ Level Up</option>
          <option value="/assets/sounds/games/zelda-item-get.mp3">🗡️ Zelda Item</option>
          <option value="">🔇 Sin sonido</option>
        </select>
        <div style="font-size:var(--text-xs);color:var(--text-muted);margin-top:4px">🎬 También se reproducirá un video en el overlay al completar la meta</div>
      </div>
      <div style="display:flex;gap:var(--space-sm)">
        <button class="btn btn-primary" id="btnSaveGoal" style="flex:1">Crear Meta</button>
        <button class="btn btn-secondary" id="btnCancelEdit" style="display:none">Cancelar</button>
      </div>
      <input type="hidden" id="editGoalId" value="">
    </div>

    <div id="goalsList"><div class="loading-state"><div class="spinner-sm"></div></div></div>

    <div class="card" id="obsGoalCard" style="margin-top:var(--space-lg)">
      <h3 style="margin-bottom:var(--space-md)">Overlay para OBS</h3>
      <p style="color:var(--text-muted);font-size:var(--text-sm);margin-bottom:var(--space-md)">Cada tipo de meta tiene su propio URL. Agrégalos como Browser Source en OBS.</p>
      <div id="obsGoalUrls" style="display:grid;gap:var(--space-sm)"></div>
    </div>
  `;

  // Toggle increment field when auto-increment is checked
  document.getElementById('goalAutoIncrement')?.addEventListener('change', function() {
    document.getElementById('incrementGroup').style.display = this.checked ? 'block' : 'none';
    if (this.checked && !document.getElementById('goalIncrement').value) {
      document.getElementById('goalIncrement').value = document.getElementById('goalTarget').value || 1000;
    }
  }, { signal });

  // When target changes, update increment default
  document.getElementById('goalTarget')?.addEventListener('input', function() {
    if (document.getElementById('goalAutoIncrement').checked && !document.getElementById('goalIncrement').value) {
      document.getElementById('goalIncrement').value = this.value;
    }
  }, { signal });

  /* live poll active goal progress every 5s */
  let livePollInterval = null;
  let goalsCache = [];

  function buildOverlayUrl(type, sound) {
    const userId = (() => { try { return JSON.parse(localStorage.getItem('user') || '{}').id; } catch { return ''; } })();
    let url = `${window.location.origin}/overlays/overlay-goal.html${userId ? '?userId=' + userId : '?'}&type=${encodeURIComponent(type)}`;
    if (sound) url += `&sound=${encodeURIComponent(sound)}`;
    return url;
  }

  async function loadGoals() {
    const container = document.getElementById('goalsList');
    if (!container) return;
    try {
      const data = await api.get('/goals', { signal });
      goalsCache = Array.isArray(data) ? data : [];
      if (goalsCache.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>Sin metas. Crea una nueva.</p></div>';
        return;
      }
      container.innerHTML = `
        <h3 style="margin-bottom:var(--space-md)">Metas (${goalsCache.length})</h3>
        <div style="display:grid;gap:var(--space-sm)">${goalsCache.map(g => {
          const pct = g.target > 0 ? Math.min(100, Math.round((g.current / g.target) * 100)) : 0;
          return `<div class="card" style="padding:var(--space-md)">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
              <div>
                <span style="font-weight:600">${g.title}</span>
                <span style="color:var(--text-muted);font-size:var(--text-xs);margin-left:6px">${g.type}</span>
                ${g.auto_increment ? '<span class="badge badge-info" style="margin-left:6px">🔄 auto</span>' : ''}
              </div>
              <div style="display:flex;align-items:center;gap:6px">
                <span class="badge ${g.active ? 'badge-success' : 'badge-info'}">${g.active ? 'Activa' : 'Completada'}</span>
                <button class="btn btn-sm btn-ghost" data-edit='${JSON.stringify({id:g.id,type:g.type,title:g.title,target:g.target,auto_increment:g.auto_increment,increment_amount:g.increment_amount,completion_sound:g.completion_sound}).replace(/'/g,"&#39;")}' title="Editar">✏️</button>
                <button class="btn btn-sm btn-ghost" data-del="${g.id}" title="Eliminar" style="color:var(--color-danger)">🗑️</button>
              </div>
            </div>
            <div style="display:flex;justify-content:space-between;font-size:var(--text-sm);margin-bottom:4px">
              <span style="font-weight:600">${(g.current || 0).toLocaleString()}</span>
              <span style="color:var(--text-muted)">/ ${(g.target || 0).toLocaleString()}</span>
            </div>
            <div style="background:rgba(255,255,255,0.05);border-radius:6px;height:10px;overflow:hidden;position:relative">
              <div style="height:100%;width:${pct}%;border-radius:6px;background:${pct >= 100 ? 'linear-gradient(90deg,#ffd700,#ff6b00)' : 'var(--color-primary-gradient)'};transition:width 0.5s"></div>
            </div>
            <div style="display:flex;justify-content:space-between;font-size:var(--text-xs);color:var(--text-muted);margin-top:4px">
              <span>${pct}%</span>
              ${g.auto_increment ? `<span>+${(g.increment_amount || 0).toLocaleString()} al alcanzar</span>` : ''}
            </div>
            <div style="margin-top:8px;border-radius:8px;overflow:hidden;background:rgba(0,0,0,0.3);height:60px;position:relative">
              <iframe src="${buildOverlayUrl(g.type)}" style="position:absolute;inset:-40px 0;border:none;width:100%;height:140px;pointer-events:none;transform:scale(0.55);transform-origin:0 0" sandbox="allow-scripts allow-same-origin"></iframe>
            </div>
          </div>`;
        }).join('')}</div>`;
      // Edit buttons
      container.querySelectorAll('[data-edit]').forEach(btn => {
        btn.addEventListener('click', () => {
          const g = JSON.parse(btn.dataset.edit);
          document.getElementById('editGoalId').value = g.id;
          document.getElementById('formTitle').textContent = '✏️ Editar Meta';
          document.getElementById('goalType').value = g.type;
          document.getElementById('goalTitle').value = g.title;
          document.getElementById('goalTarget').value = g.target;
          document.getElementById('goalAutoIncrement').checked = g.auto_increment;
          document.getElementById('goalIncrement').value = g.increment_amount || '';
          document.getElementById('incrementGroup').style.display = g.auto_increment ? 'block' : 'none';
          if (g.completion_sound) document.getElementById('goalSound').value = g.completion_sound;
          document.getElementById('btnSaveGoal').textContent = 'Guardar Cambios';
          document.getElementById('btnCancelEdit').style.display = 'block';
        }, { signal });
      });
      // Delete buttons
      container.querySelectorAll('[data-del]').forEach(btn => {
        btn.addEventListener('click', async () => {
          if (!confirm('¿Eliminar esta meta?')) return;
          try { await api.del(`/goals/${btn.dataset.del}`, { signal }); showToast({ type: 'success', message: 'Meta eliminada' }); loadGoals(); } catch {}
        }, { signal });
      });
    } catch (err) {
      if (err.name !== 'AbortError') container.innerHTML = '<div class="error-state"><p>Error al cargar metas</p></div>';
    }
  }

  document.getElementById('btnSaveGoal')?.addEventListener('click', async () => {
    const editId = document.getElementById('editGoalId').value;
    const type = document.getElementById('goalType').value;
    const title = document.getElementById('goalTitle').value.trim() || 'Meta';
    const target = parseInt(document.getElementById('goalTarget').value) || 1000;
    const autoIncrement = document.getElementById('goalAutoIncrement').checked;
    const incrementAmount = autoIncrement ? parseInt(document.getElementById('goalIncrement').value) || target : 0;
    const completionSound = document.getElementById('goalSound').value || null;

    try {
      if (editId) {
        await api.put(`/goals/${editId}`, { title, target, completionSound }, { signal });
        showToast({ type: 'success', message: 'Meta actualizada' });
      } else {
        await api.post('/goals', { type, title, target, autoIncrement, incrementAmount, completionSound }, { signal });
        showToast({ type: 'success', message: autoIncrement ? `Meta creada: cada ${target.toLocaleString()} sube +${incrementAmount.toLocaleString()}` : 'Meta creada' });
      }
      resetForm();
      loadGoals();
    } catch (err) {
      showToast({ type: 'error', message: err.message || 'Error' });
    }
  }, { signal });

  // Cancel edit
  document.getElementById('btnCancelEdit')?.addEventListener('click', resetForm, { signal });

  function resetForm() {
    document.getElementById('editGoalId').value = '';
    document.getElementById('formTitle').textContent = '➕ Nueva Meta';
    document.getElementById('goalTarget').value = '1000';
    document.getElementById('goalIncrement').value = '';
    document.getElementById('goalAutoIncrement').checked = false;
    document.getElementById('incrementGroup').style.display = 'none';
    document.getElementById('btnSaveGoal').textContent = 'Crear Meta';
    document.getElementById('btnCancelEdit').style.display = 'none';
  }

  // OBS URLs por tipo
  const userId = (() => { try { return JSON.parse(localStorage.getItem('user') || '{}').id; } catch { return ''; } })();
  const base = `${window.location.origin}/overlays/overlay-goal.html`;
  const sound = document.getElementById('goalSound')?.value;
  const soundParam = sound ? `&sound=${encodeURIComponent(sound)}` : '';
  const types = [
    { type: 'likes', icon: '❤️', name: 'Likes' },
    { type: 'shares', icon: '🔄', name: 'Shares' },
    { type: 'followers', icon: '👥', name: 'Seguidores' },
    { type: 'coins', icon: '💎', name: 'Monedas' }
  ];
  const obsContainer = document.getElementById('obsGoalUrls');
  if (obsContainer) {
    obsContainer.innerHTML = types.map(t => {
      const url = `${base}${userId ? '?userId=' + userId + '&type=' + t.type : '?type=' + t.type}${soundParam}`;
      return `<div style="display:flex;align-items:center;gap:var(--space-sm)">
        <span style="font-size:20px">${t.icon}</span>
        <input type="text" value="${url}" readonly style="flex:1;padding:8px 12px;background:var(--bg-input);border:1px solid var(--border-color);border-radius:8px;color:var(--color-primary);font-family:var(--font-mono);font-size:var(--text-xs)">
        <button class="btn btn-sm btn-primary" data-copy="${url}">📋</button>
      </div>`;
    }).join('');
    obsContainer.querySelectorAll('[data-copy]').forEach(btn => {
      btn.addEventListener('click', async () => {
        try { await navigator.clipboard.writeText(btn.dataset.copy); btn.textContent = '✅'; setTimeout(() => btn.textContent = '📋', 2000); } catch {}
      }, { signal });
    });
  }

  await loadGoals();

  /* live poll: refresh active goals' progress every 5s */
  livePollInterval = setInterval(async () => {
    try {
      const data = await api.get('/goals', { signal });
      const fresh = Array.isArray(data) ? data : [];
      /* only re-render if any progress changed */
      let changed = fresh.length !== goalsCache.length;
      if (!changed) {
        for (let i = 0; i < fresh.length; i++) {
          if (fresh[i].current !== goalsCache[i].current || fresh[i].active !== goalsCache[i].active) {
            changed = true; break;
          }
        }
      }
      if (changed) {
        goalsCache = fresh;
        const container = document.getElementById('goalsList');
        if (container) {
          const html = container.innerHTML;
          container.innerHTML = html.replace(/<h3[^>]*>Metas[^<]*<\/h3>/, `<h3 style="margin-bottom:var(--space-md)">Metas (${fresh.length})</h3>`);
        }
      }
    } catch {}
  }, 5000);

  return () => {
    if (livePollInterval) clearInterval(livePollInterval);
  };
}
