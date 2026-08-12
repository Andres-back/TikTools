/**
 * Sounds Configuration View — TikToolStream
 * Premium con preview, toggle ON/OFF, min gift value y biblioteca de sonidos
 */

import { countUp, formatNum, magneticButton, staggerChildren } from '/app/js/core/visual-helpers.js';

export async function mount({ target, api, signal }) {
  const { showToast } = await import('/app/js/core/toast.js');

  let sounds = [];
  let soundGiftData = {};
  let soundLibrary = [];
  let selectedLibrarySound = null;

  function escapeHtml(s) { return String(s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function escapeAttr(s) { return String(s || '').replace(/"/g, '&quot;'); }

  /* audio cache for preview */
  const audioCache = {};
  function playPreview(url, volume) {
    if (!url) return;
    if (audioCache[url]) {
      try { audioCache[url].currentTime = 0; audioCache[url].volume = volume || 0.8; audioCache[url].play().catch(() => {}); return; } catch {}
    }
    try {
      const a = new Audio(url);
      a.volume = volume || 0.8;
      audioCache[url] = a;
      a.play().catch(() => {});
    } catch {}
  }
  function stopPreview(url) {
    if (audioCache[url]) {
      try { audioCache[url].pause(); audioCache[url].currentTime = 0; } catch {}
    }
  }

  target.innerHTML = `
    <style>
      .sound-form { background:linear-gradient(160deg, rgba(20,25,45,0.95), rgba(15,20,40,0.95)); border:1px solid rgba(255,255,255,0.08); border-radius:16px; padding:var(--space-md); margin-bottom:var(--space-lg); max-width:560px; }
      .sound-form .gift-row { display:flex; gap:8px; align-items:center; }
      .sound-form .gift-preview { width:40px; height:40px; border-radius:6px; display:none; object-fit:contain; background:rgba(255,255,255,0.05); }
      .sound-form .gift-preview.show { display:block; }
      .sound-grid { display:grid; gap:var(--space-sm); }
      .sound-card { background:linear-gradient(160deg, rgba(20,25,45,0.95), rgba(15,20,40,0.95)); border:1px solid rgba(255,255,255,0.08); border-radius:14px; padding:var(--space-md); display:flex; align-items:center; gap:14px; transition:all 0.3s; }
      .sound-card.disabled { opacity:0.5; }
      .sound-card:hover { border-color:rgba(0,217,255,0.2); }
      .sound-card .gift-img { width:48px; height:48px; border-radius:10px; background:linear-gradient(135deg, rgba(0,217,255,0.15), rgba(123,47,247,0.05)); display:flex; align-items:center; justify-content:center; font-size:1.5rem; flex-shrink:0; overflow:hidden; }
      .sound-card .gift-img img { width:100%; height:100%; object-fit:contain; }
      .sound-card .info { flex:1; min-width:0; }
      .sound-card .trigger { font-weight:700; color:#fff; }
      .sound-card .meta { font-size:var(--text-xs); color:var(--text-muted); margin-top:4px; }
      .sound-card .actions { display:flex; gap:6px; flex-shrink:0; }
      .sound-card .play-btn { width:36px; height:36px; border-radius:50%; background:linear-gradient(135deg, #00d9ff, #7b2ff7); border:none; color:#fff; cursor:pointer; display:flex; align-items:center; justify-content:center; font-size:0.9rem; transition:all 0.2s; }
      .sound-card .play-btn:hover { transform:scale(1.1); box-shadow:0 0 16px rgba(0,217,255,0.4); }
      .sound-card .play-btn.playing { background:linear-gradient(135deg, #ff006e, #8b5cf6); animation: spinSlow 2s linear infinite; }
      @keyframes spinSlow { to { transform: rotate(360deg); } }
      
      /* Biblioteca de sonidos */
      .library-section { background:linear-gradient(160deg, rgba(20,25,45,0.95), rgba(15,20,40,0.95)); border:1px solid rgba(0,217,255,0.2); border-radius:16px; padding:var(--space-md); margin-bottom:var(--space-lg); }
      .library-section h3 { color:#00d9ff; margin-bottom:var(--space-md); }
      .library-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(200px, 1fr)); gap:var(--space-sm); }
      .library-item { background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:10px; padding:12px; cursor:pointer; transition:all 0.2s; }
      .library-item:hover { background:rgba(0,217,255,0.08); border-color:rgba(0,217,255,0.3); }
      .library-item.selected { background:rgba(0,217,255,0.15); border-color:#00d9ff; }
      .library-item .name { font-weight:600; font-size:0.9rem; margin-bottom:4px; }
      .library-item .category { font-size:0.7rem; color:var(--text-muted); text-transform:uppercase; }
      .library-item .play-icon { float:right; font-size:1.2rem; }
      .credits { font-size:0.75rem; color:var(--text-muted); margin-top:var(--space-md); text-align:center; }
      .credits a { color:#00d9ff; }
    </style>

    <h1 class="view-title">🔊 Alertas de Sonido</h1>
    <p class="view-subtitle">Reproduce sonidos automáticos al recibir regalos en TikTok Live</p>

    <div class="sound-form">
      <h3 style="margin-bottom:var(--space-md)">➕ Agregar Alerta</h3>
      
      <!-- Selector de sonido -->
      <div style="margin-bottom:var(--space-md)">
        <label class="input-label">Sonido</label>
        <div style="display:flex;gap:8px;margin-bottom:8px">
          <button class="btn btn-secondary btn-sm" id="btnUploadSound" style="flex:1">📤 Subir archivo</button>
          <button class="btn btn-primary btn-sm" id="btnSelectLibrary" style="flex:1">📚 Usar de biblioteca</button>
        </div>
        <div id="uploadSection" style="display:none">
          <input type="file" id="soundFile" class="input-field" accept="audio/mpeg,audio/wav,audio/ogg,audio/mp3,audio/m4a">
        </div>
        <div id="selectedSoundWrapper" style="display:none">
          <input type="text" id="selectedSoundName" class="input-field" readonly placeholder="Selecciona un sonido de la biblioteca">
        </div>
      </div>
      
      <div class="input-group" style="margin-bottom:var(--space-sm)">
        <label class="input-label">Regalo (opcional — vacío = todos)</label>
        <div class="gift-row">
          <select id="soundGiftId" class="input-field" style="flex:1">
            <option value="">🎁 Todos los regalos</option>
          </select>
          <img id="soundGiftPreview" class="gift-preview" alt="">
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:var(--space-sm)">
        <div class="input-group">
          <label class="input-label">Volumen (0.1 - 1.0)</label>
          <input type="number" id="soundVolume" class="input-field" value="0.8" min="0.1" max="1" step="0.1">
        </div>
        <div class="input-group">
          <label class="input-label">Min. valor regalo (💎)</label>
          <input type="number" id="soundMinGift" class="input-field" value="1" min="1">
        </div>
      </div>
      <button class="btn btn-primary" id="btnAddSound" style="width:100%">Agregar Alerta</button>
    </div>

    <!-- Biblioteca de sonidos -->
    <div class="library-section" id="librarySection" style="display:none">
      <h3>📚 Biblioteca de Sonidos</h3>
      <p style="font-size:var(--text-sm);color:var(--text-muted);margin-bottom:var(--space-md)">
        Sonidos predefinidos de <a href="https://www.myinstants.com/" target="_blank">Myinstants.com</a>
      </p>
      <div class="library-grid" id="libraryGrid"></div>
      <div class="credits">
        Créditos: <a href="https://www.myinstants.com/" target="_blank">Myinstants.com</a> · 
        <a href="https://www.myinstants.com/terms_of_use.html" target="_blank">Términos de uso</a>
      </div>
    </div>

    <div id="soundsList"><div class="loading-state"><div class="spinner-sm"></div></div></div>
  `;

  async function loadGiftSelect() {
    try {
      const resp = await fetch('/gifts.json');
      soundGiftData = await resp.json();
      const select = document.getElementById('soundGiftId');
      if (!select) return;
      const gifts = Object.values(soundGiftData).sort((a, b) => (b.diamond_count || 0) - (a.diamond_count || 0));
      select.innerHTML = '<option value="">🎁 Todos los regalos</option>' +
        gifts.map(g => `<option value="${g.id}">${g.name} (${g.diamond_count || g.cost}💎)</option>`).join('');
    } catch {}
  }

  async function loadSoundLibrary() {
    try {
      const resp = await fetch('/assets/sounds/sounds-metadata.json');
      const data = await resp.json();
      soundLibrary = data.sounds || [];
      renderLibrary();
    } catch (err) {
      console.error('Error loading sound library:', err);
    }
  }

  function renderLibrary() {
    const grid = document.getElementById('libraryGrid');
    if (!grid || soundLibrary.length === 0) return;
    
    grid.innerHTML = soundLibrary.map(sound => `
      <div class="library-item" data-sound-id="${sound.id}" data-sound-file="${sound.file}">
        <div class="play-icon">▶</div>
        <div class="name">${escapeHtml(sound.name)}</div>
        <div class="category">${sound.category}</div>
      </div>
    `).join('');
    
    // Bind library item clicks
    grid.querySelectorAll('.library-item').forEach(item => {
      item.addEventListener('click', () => {
        const soundId = item.dataset.soundId;
        const soundFile = item.dataset.soundFile;
        const sound = soundLibrary.find(s => s.id === soundId);
        
        if (sound) {
          selectedLibrarySound = sound;
          document.getElementById('selectedSoundName').value = sound.name;
          
          // Highlight selected
          grid.querySelectorAll('.library-item').forEach(i => i.classList.remove('selected'));
          item.classList.add('selected');
          
          // Play preview
          playPreview(soundFile, 0.8);
        }
      }, { signal });
    });
  }

  // Toggle between upload and library
  document.getElementById('btnUploadSound')?.addEventListener('click', () => {
    document.getElementById('uploadSection').style.display = 'block';
    document.getElementById('selectedSoundWrapper').style.display = 'none';
    const libSection = document.querySelector('.library-section');
    if (libSection) libSection.style.display = 'none';
    selectedLibrarySound = null;
  }, { signal });

  document.getElementById('btnSelectLibrary')?.addEventListener('click', () => {
    document.getElementById('uploadSection').style.display = 'none';
    document.getElementById('selectedSoundWrapper').style.display = 'block';
    const libSection = document.querySelector('.library-section');
    if (libSection) libSection.style.display = 'block';
    loadSoundLibrary();
  }, { signal });

  document.getElementById('soundGiftId')?.addEventListener('change', function() {
    const preview = document.getElementById('soundGiftPreview');
    if (!preview) return;
    const gift = soundGiftData[this.value];
    if (gift && gift.image) {
      preview.src = gift.image;
      preview.classList.add('show');
    } else {
      preview.classList.remove('show');
    }
  });

  async function loadSounds() {
    try {
      const data = await api.get('/sounds', { signal });
      sounds = Array.isArray(data) ? data : [];
      renderSounds();
    } catch (err) {
      console.error(err);
    }
  }

  function renderSounds() {
    const container = document.getElementById('soundsList');
    if (sounds.length === 0) {
      container.innerHTML = '<h3 style="margin-bottom:var(--space-md)">Tus alertas (0)</h3><div class="empty-state"><p>Sin alertas de sonido configuradas</p></div>';
      return;
    }
    container.innerHTML = `<h3 style="margin-bottom:var(--space-md)">Tus alertas (${sounds.length})</h3><div class="sound-grid">${sounds.map(s => {
      const giftImg = s.trigger_id && soundGiftData[s.trigger_id]?.image;
      const isAny = !s.trigger_id || s.trigger_id === 'any';
      const giftName = isAny ? 'Todos los regalos' : (soundGiftData[s.trigger_id]?.name || s.trigger_id);
      const enabled = s.enabled !== false && s.enabled !== 0;
      return `<div class="sound-card ${enabled ? '' : 'disabled'}" data-id="${s.id}">
        <div class="gift-img">${giftImg ? `<img src="${escapeAttr(giftImg)}" onerror="this.style.display='none';this.parentNode.textContent='🎁'">` : '🎁'}</div>
        <div class="info">
          <div class="trigger">${escapeHtml(giftName)}</div>
          <div class="meta">Vol: ${s.volume ?? 0.8} · Min: ${s.min_gift_value ?? 1}💎 · ${s.sound_file?.split('/').pop() || ''}</div>
        </div>
        <div class="actions">
          <button class="play-btn" data-play="${escapeAttr(s.sound_file)}" data-volume="${s.volume ?? 0.8}" title="Preview">▶</button>
          <button class="btn btn-sm ${enabled ? 'btn-success' : 'btn-secondary'}" data-toggle="${s.id}" title="${enabled ? 'Desactivar' : 'Activar'}">${enabled ? 'ON' : 'OFF'}</button>
          <button class="btn btn-sm btn-danger" data-del="${s.id}" title="Eliminar">🗑️</button>
        </div>
      </div>`;
    }).join('')}</div>`;

    staggerChildren(container, 'sound-card', 50);
    bindSoundActions();
    document.querySelectorAll('.play-btn').forEach(b => magneticButton(b));
  }

  function bindSoundActions() {
    const container = document.getElementById('soundsList');
    container.querySelectorAll('[data-play]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const url = btn.dataset.play;
        const vol = parseFloat(btn.dataset.volume) || 0.8;
        if (btn.classList.contains('playing')) {
          stopPreview(url);
          btn.classList.remove('playing');
          btn.textContent = '▶';
        } else {
          document.querySelectorAll('.play-btn.playing').forEach(other => {
            other.classList.remove('playing');
            other.textContent = '▶';
            stopPreview(other.dataset.play);
          });
          playPreview(url, vol);
          btn.classList.add('playing');
          btn.textContent = '⏸';
          setTimeout(() => {
            btn.classList.remove('playing');
            btn.textContent = '▶';
          }, 5000);
        }
      }, { signal });
    });
    container.querySelectorAll('[data-toggle]').forEach(btn => {
      btn.addEventListener('click', async () => {
        try {
          await api.put(`/sounds/${btn.dataset.toggle}/toggle`, {}, { signal });
          showToast({ type: 'success', message: 'Estado actualizado' });
          loadSounds();
        } catch (err) { showToast({ type: 'error', message: err.message || 'Error' }); }
      }, { signal });
    });
    container.querySelectorAll('[data-del]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('¿Eliminar esta alerta?')) return;
        try {
          await api.del(`/sounds/${btn.dataset.del}`, { signal });
          showToast({ type: 'success', message: 'Alerta eliminada' });
          loadSounds();
        } catch (err) { showToast({ type: 'error', message: err.message || 'Error' }); }
      }, { signal });
    });
  }

  document.getElementById('btnAddSound')?.addEventListener('click', async () => {
    // Check if using library sound
    if (selectedLibrarySound) {
      const formData = new FormData();
      formData.append('soundUrl', selectedLibrarySound.file);
      formData.append('triggerType', 'gift');
      formData.append('triggerId', document.getElementById('soundGiftId').value || '');
      formData.append('volume', document.getElementById('soundVolume').value || '0.8');
      formData.append('minGiftValue', document.getElementById('soundMinGift').value || '1');
      formData.append('enabled', 'true');
      
      try {
        await api.post('/sounds', {
          soundFile: selectedLibrarySound.file,
          triggerType: 'gift',
          triggerId: document.getElementById('soundGiftId').value || '',
          volume: document.getElementById('soundVolume').value || '0.8',
          minGiftValue: document.getElementById('soundMinGift').value || '1',
          enabled: true
        }, { signal });
        showToast({ type: 'success', message: 'Alerta agregada desde biblioteca' });
        document.getElementById('selectedSoundName').value = '';
        document.getElementById('soundGiftId').value = '';
        document.getElementById('soundMinGift').value = '1';
        selectedLibrarySound = null;
        document.querySelectorAll('.library-item').forEach(i => i.classList.remove('selected'));
        loadSounds();
      } catch (err) {
        showToast({ type: 'error', message: err.message || 'Error al agregar' });
      }
      return;
    }
    
    // Upload custom file
    const fileInput = document.getElementById('soundFile');
    const file = fileInput?.files?.[0];
    if (!file) { showToast({ type: 'warning', message: 'Selecciona un archivo de audio o usa la biblioteca' }); return; }
    if (file.size > 5 * 1024 * 1024) { showToast({ type: 'error', message: 'Máx 5MB' }); return; }
    const formData = new FormData();
    formData.append('sound', file);
    formData.append('triggerType', 'gift');
    formData.append('triggerId', document.getElementById('soundGiftId').value || '');
    formData.append('volume', document.getElementById('soundVolume').value || '0.8');
    formData.append('minGiftValue', document.getElementById('soundMinGift').value || '1');
    formData.append('enabled', 'true');
    try {
      await api.upload('/sounds', formData, { signal });
      showToast({ type: 'success', message: 'Alerta agregada' });
      fileInput.value = '';
      document.getElementById('soundGiftId').value = '';
      document.getElementById('soundMinGift').value = '1';
      loadSounds();
    } catch (err) {
      showToast({ type: 'error', message: err.message || 'Error al subir' });
    }
  }, { signal });

  await loadGiftSelect();
  await loadSounds();
  // GSAP animate sounds
    if (typeof gsap !== 'undefined') requestAnimationFrame(() => {
      const cards = document.querySelectorAll('.sound-card');
      if (cards.length) gsap.from(cards, { opacity: 0, x: -15, stagger: 0.05, duration: 0.35, ease: 'power2.out' });
    });
}
