/**
 * Song Requests View — TikToolStream
 * Premium with queue visualization and stats
 */

export async function mount({ target, api, signal }) {
  const { showToast } = await import('/app/js/core/toast.js');

  let queue = [];
  let cfg = null;
  let spotifyConnected = false;
  let spotifyProfile = null;

  target.innerHTML = `
    <style>
      .sr-shell { display:grid; grid-template-columns: 360px 1fr; gap:var(--space-lg); }
      .sr-panel { background:linear-gradient(160deg, rgba(20,25,45,0.95), rgba(15,20,40,0.95)); border:1px solid rgba(255,255,255,0.08); border-radius:16px; padding:var(--space-md); }
      .sr-panel h3 { font-size: var(--text-sm); text-transform: uppercase; letter-spacing: 1.5px; color: var(--text-muted); margin-bottom: var(--space-md); font-weight: 600; }
      .sr-stats { display:grid; grid-template-columns:repeat(3, 1fr); gap:var(--space-sm); margin-bottom:var(--space-lg); }
      .sr-stats .stat { background:linear-gradient(135deg, rgba(0,217,255,0.08), rgba(123,47,247,0.04)); border:1px solid rgba(0,217,255,0.15); border-radius:12px; padding:var(--space-md); text-align:center; }
      .sr-stats .stat .ic { font-size:1.3rem; }
      .sr-stats .stat .nu { font-size:1.4rem; font-weight:800; background:linear-gradient(135deg, #1DB954, #1ed760); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }
      .sr-stats .stat .lb { font-size:var(--text-xs); color:var(--text-muted); }
      .spotify-card { background:linear-gradient(135deg, #1DB954, #1ed760); border-radius:14px; padding:var(--space-md); color:#fff; margin-bottom:var(--space-md); display:flex; align-items:center; gap:12px; }
      .spotify-card.off { background:linear-gradient(135deg, rgba(29,185,84,0.2), rgba(30,215,96,0.1)); border:1px dashed rgba(29,185,84,0.3); color:rgba(255,255,255,0.7); }
      .spotify-card .sp-icon { font-size:1.6rem; }
      .spotify-card .sp-name { font-weight:700; font-size:0.95rem; }
      .sp-sub { font-size:var(--text-xs); opacity:0.8; }
      .queue-list { display:flex; flex-direction:column; gap:var(--space-sm); }
      .song-card { background:linear-gradient(135deg, rgba(0,217,255,0.06), rgba(123,47,247,0.03)); border:1px solid rgba(0,217,255,0.12); border-radius:14px; padding:var(--space-md); display:flex; align-items:center; gap:12px; position:relative; transition:all 0.2s; }
      .song-card:hover { border-color:rgba(0,217,255,0.3); transform:translateX(2px); }
      .song-card.played { opacity:0.5; }
      .song-card.playing { border-color:#1DB954; background:linear-gradient(135deg, rgba(29,185,84,0.1), rgba(30,215,96,0.05)); box-shadow:0 0 20px rgba(29,185,84,0.2); }
      .song-card .pos { font-size:1.4rem; font-weight:800; font-family:'Montserrat',sans-serif; color:var(--text-muted); min-width:32px; text-align:center; }
      .song-card.playing .pos { color:#1DB954; animation: pulse 1s ease-in-out infinite; }
      .song-card .cover { width:48px; height:48px; border-radius:8px; background:linear-gradient(135deg, #1DB954, #1ed760); display:flex; align-items:center; justify-content:center; font-size:1.3rem; flex-shrink:0; overflow:hidden; }
      .song-card .cover img { width:100%; height:100%; object-fit:cover; }
      .song-card .info { flex:1; min-width:0; }
      .song-card .title { font-weight:700; font-size:0.95rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
      .song-card .meta { font-size:var(--text-xs); color:var(--text-muted); margin-top:2px; }
      .song-card .actions { display:flex; gap:4px; flex-shrink:0; }
      .song-card .actions button { padding:5px 8px; font-size:0.8rem; }
      .empty-queue { text-align:center; padding:var(--space-xl); color:var(--text-muted); }
      .empty-queue .ic { font-size:3rem; margin-bottom:8px; opacity:0.4; }
      @keyframes pulse { 0%,100%{transform:scale(1);} 50%{transform:scale(1.1);} }
      @media (max-width: 900px) { 
        .sr-shell { grid-template-columns: 1fr; } 
        .sr-stats { grid-template-columns:repeat(3, 1fr); }
      }
      @media (max-width: 600px) {
        .sr-stats { grid-template-columns:1fr; }
        .song-card { flex-wrap:wrap; }
        .song-card .cover { width:40px; height:40px; }
      }
    </style>

    <h1 class="view-title" style="margin-bottom:4px">🎵 Solicitar Canciones</h1>
    <p class="view-subtitle" style="margin-bottom:var(--space-lg)">Los viewers pueden pedir canciones a cambio de regalos en TikTok</p>

    <div class="sr-stats">
      <div class="stat"><div class="ic">🎼</div><div class="nu" id="statQueued">0</div><div class="lb">En cola</div></div>
      <div class="stat"><div class="ic">▶️</div><div class="nu" id="statPlayed">0</div><div class="lb">Reproducidas</div></div>
      <div class="stat"><div class="ic">👥</div><div class="nu" id="statRequesters">0</div><div class="lb">Solicitantes</div></div>
    </div>

    <div class="sr-shell">
      <div>
        <div class="spotify-card off" id="spotifyCard">
          <div class="sp-icon">🎧</div>
          <div style="flex:1">
            <div class="sp-name" id="spName">Spotify no conectado</div>
            <div class="sp-sub" id="spSub">Conecta para activar las solicitudes</div>
          </div>
          <button class="btn btn-sm" id="btnSpotify" style="background:rgba(0,0,0,0.25);color:#fff;border:1px solid rgba(255,255,255,0.3)">Conectar</button>
        </div>

        <div class="sr-panel" style="margin-bottom:var(--space-md)">
          <h3>⚙️ Configuración</h3>
          <div class="input-group" style="margin-bottom:var(--space-sm)">
            <label class="input-label">Mínimo de regalo (💎)</label>
            <input type="number" id="srMinGift" class="input-field" value="1" min="1">
          </div>
          <div class="input-group" style="margin-bottom:var(--space-sm)">
            <label class="input-label">Máx. en cola</label>
            <input type="number" id="srMaxQueue" class="input-field" value="10" min="1" max="50">
          </div>
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:var(--text-sm);margin-bottom:var(--space-md)">
            <input type="checkbox" id="srEnabled"> Habilitado
          </label>
          <button class="btn btn-primary" id="btnSaveSr" style="width:100%">💾 Guardar</button>
        </div>

        <div class="sr-panel">
          <h3>🧪 Agregar manualmente</h3>
          <div class="input-group" style="margin-bottom:var(--space-sm)">
            <label class="input-label">Título</label>
            <input type="text" id="manualTitle" class="input-field" placeholder="Nombre de la canción">
          </div>
          <div class="input-group" style="margin-bottom:var(--space-sm)">
            <label class="input-label">Artista</label>
            <input type="text" id="manualArtist" class="input-field" placeholder="Artista">
          </div>
          <div class="input-group" style="margin-bottom:var(--space-sm)">
            <label class="input-label">Solicitante</label>
            <input type="text" id="manualRequester" class="input-field" placeholder="@usuario">
          </div>
          <div class="input-group" style="margin-bottom:var(--space-sm)">
            <label class="input-label">Spotify URI (opcional)</label>
            <input type="text" id="manualUri" class="input-field" placeholder="spotify:track:...">
          </div>
          <button class="btn btn-success" id="btnAddManual" style="width:100%">+ Agregar a la cola</button>
        </div>
      </div>

      <div class="sr-panel">
        <h3>📋 Cola actual (${queue.length})</h3>
        <div id="queueContainer" class="queue-list">
          <div class="empty-queue"><div class="ic">🎵</div><p>Sin canciones en cola</p></div>
        </div>
      </div>
    </div>
  `;

  function escapeHtml(s) { return String(s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function escapeAttr(s) { return String(s || '').replace(/"/g, '&quot;'); }

  function renderQueue() {
    const container = document.getElementById('queueContainer');
    const header = document.querySelector('.sr-panel h3');
    if (header) header.textContent = `📋 Cola actual (${queue.length})`;
    if (queue.length === 0) {
      container.innerHTML = '<div class="empty-queue"><div class="ic">🎵</div><p>Sin canciones en cola</p></div>';
    } else {
      container.innerHTML = queue.map((s, i) => {
        const isPlaying = s.played === false && i === 0;
        const isPlayed = s.played;
        return `<div class="song-card ${isPlayed ? 'played' : ''} ${isPlaying ? 'playing' : ''}">
          <div class="pos">${isPlaying ? '▶' : (i + 1)}</div>
          <div class="cover">${s.album_art ? `<img src="${escapeAttr(s.album_art)}" onerror="this.style.display='none';this.parentNode.textContent='🎵'">` : '🎵'}</div>
          <div class="info">
            <div class="title">${escapeHtml(s.song_title || s.title || 'Sin título')}</div>
            <div class="meta">${escapeHtml(s.song_artist || s.artist || '—')} · @${escapeHtml(s.requester || '—')}</div>
          </div>
          <div class="actions">
            ${!isPlayed ? `<button class="btn btn-sm btn-ghost" data-played="${s.id}" title="Marcar reproducida">✓</button>` : ''}
            <button class="btn btn-sm btn-ghost" data-rm="${s.id}" title="Eliminar" style="color:var(--color-danger)">🗑️</button>
          </div>
        </div>`;
      }).join('');

      container.querySelectorAll('[data-played]').forEach(btn => {
        btn.addEventListener('click', async () => {
          try { await api.put(`/songrequests/queue/${btn.dataset.played}/played`, {}, { signal }); await loadQueue(); } catch {}
        }, { signal });
      });
      container.querySelectorAll('[data-rm]').forEach(btn => {
        btn.addEventListener('click', async () => {
          if (!confirm('¿Eliminar de la cola?')) return;
          try { await api.del(`/songrequests/queue/${btn.dataset.rm}`, { signal }); await loadQueue(); } catch {}
        }, { signal });
      });
    }
    updateStats();
  }

  function updateStats() {
    const queued = queue.filter(s => !s.played).length;
    const played = queue.filter(s => s.played).length;
    const requesters = new Set(queue.map(s => s.requester).filter(Boolean)).size;
    document.getElementById('statQueued').textContent = queued;
    document.getElementById('statPlayed').textContent = played;
    document.getElementById('statRequesters').textContent = requesters;
  }

  function renderSpotify() {
    const card = document.getElementById('spotifyCard');
    const name = document.getElementById('spName');
    const sub = document.getElementById('spSub');
    const btn = document.getElementById('btnSpotify');
    if (spotifyConnected) {
      card.classList.remove('off');
      name.textContent = `🎧 ${spotifyProfile?.display_name || 'Spotify Conectado'}`;
      sub.textContent = spotifyProfile?.email || 'Cuenta vinculada';
      btn.textContent = 'Desconectar';
    } else {
      card.classList.add('off');
      name.textContent = 'Spotify no conectado';
      sub.textContent = 'Conecta para activar las solicitudes';
      btn.textContent = 'Conectar';
    }
  }

  async function loadAll() {
    try {
      const [configRes, queueRes, spotifyRes] = await Promise.allSettled([
        api.get('/songrequests/config', { signal }),
        api.get('/songrequests/queue', { signal }),
        api.get('/songrequests/spotify', { signal })
      ]);
      if (configRes.status === 'fulfilled' && configRes.value) {
        cfg = configRes.value;
        document.getElementById('srMinGift').value = cfg.min_gift_value || 1;
        document.getElementById('srMaxQueue').value = cfg.max_requests || 10;
        document.getElementById('srEnabled').checked = !!cfg.enabled;
      }
      if (queueRes.status === 'fulfilled') {
        queue = Array.isArray(queueRes.value) ? queueRes.value : (queueRes.value?.queue || []);
        renderQueue();
      }
      if (spotifyRes.status === 'fulfilled' && spotifyRes.value) {
        spotifyConnected = !!spotifyRes.value.connected;
        spotifyProfile = spotifyRes.value.profile || null;
        renderSpotify();
      }
    } catch {}
  }

  document.getElementById('btnSaveSr')?.addEventListener('click', async () => {
    try {
      await api.put('/songrequests/config', {
        minGiftValue: parseInt(document.getElementById('srMinGift').value) || 1,
        maxRequests: parseInt(document.getElementById('srMaxQueue').value) || 10,
        enabled: document.getElementById('srEnabled').checked
      }, { signal });
      showToast({ type: 'success', message: 'Configuración guardada' });
    } catch (err) { showToast({ type: 'error', message: err.message || 'Error' }); }
  }, { signal });

  document.getElementById('btnAddManual')?.addEventListener('click', async () => {
    const title = document.getElementById('manualTitle').value.trim();
    const artist = document.getElementById('manualArtist').value.trim();
    const requester = document.getElementById('manualRequester').value.trim().replace(/^@/, '');
    const uri = document.getElementById('manualUri').value.trim();
    if (!title || !requester) { showToast({ type: 'warning', message: 'Título y solicitante requeridos' }); return; }
    try {
      await api.post('/songrequests/queue', {
        songTitle: title, songArtist: artist, requester,
        spotifyUri: uri || null
      }, { signal });
      document.getElementById('manualTitle').value = '';
      document.getElementById('manualArtist').value = '';
      document.getElementById('manualRequester').value = '';
      document.getElementById('manualUri').value = '';
      showToast({ type: 'success', message: 'Agregada a la cola' });
      await loadAll();
    } catch (err) { showToast({ type: 'error', message: err.message || 'Error' }); }
  }, { signal });

  document.getElementById('btnSpotify')?.addEventListener('click', () => {
    if (spotifyConnected) {
      if (!confirm('¿Desconectar Spotify?')) return;
      api.del('/songrequests/spotify', { signal }).then(() => { spotifyConnected = false; renderSpotify(); });
    } else {
      window.open('/api/songrequests/spotify/login', '_blank');
      showToast({ type: 'info', message: 'Completa el login en la nueva pestaña y vuelve aquí' });
    }
  }, { signal });

  await loadAll();
  // GSAP animate song requests
    if (typeof gsap !== 'undefined') requestAnimationFrame(() => {
      const stats = document.querySelectorAll('.sr-stats > .stat');
      if (stats.length) gsap.from(stats, { opacity: 0, y: 20, stagger: 0.08, duration: 0.4, ease: 'power2.out' });
    });
}
