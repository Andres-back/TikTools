/**
 * Hype Arena View — TikToolStream
 * Preview, controls, testing zone
 */

export async function mount({ target, api, signal }) {
  const { showToast } = await import('/app/js/core/toast.js');
  let hypeCfg = { multiplier: 1, decay: 0.65, thresholdBase: 100, thresholdMultiplier: 1.5, animations: true, sound: true, maxLevels: 0 };
  let userId = '';
  try { const u = JSON.parse(localStorage.getItem('user') || '{}'); userId = u.id || ''; } catch {}

  function buildPreviewUrl(demo) {
    const uid = userId || 'demo';
    let url = `${location.origin}/overlays/overlay-hype-arena.html?userId=${uid}${demo ? '&demo=1' : ''}`;
    url += `&multiplier=${hypeCfg.multiplier}&decay=${hypeCfg.decay}&thresholdBase=${hypeCfg.thresholdBase}&thresholdMult=${hypeCfg.thresholdMultiplier}`;
    if (!hypeCfg.animations) url += '&noAnim=1';
    if (!hypeCfg.sound) url += '&noSound=1';
    if (hypeCfg.maxLevels > 0) url += `&maxLevels=${hypeCfg.maxLevels}`;
    url += `&v=${Date.now()}`;
    return url;
  }

  target.innerHTML = `
    <style>
      .ha-shell { display:grid; grid-template-columns:320px minmax(0,1fr); gap:18px; min-height:calc(100vh - var(--header-height) - 44px); }
      .ha-panel { background:linear-gradient(160deg,rgba(20,25,45,0.95),rgba(15,20,40,0.95)); border:1px solid rgba(255,255,255,0.08); border-radius:16px; padding:var(--space-lg); }
      .ha-panel h3 { font-size:var(--text-base); margin-bottom:var(--space-md); display:flex; align-items:center; gap:8px; }
      .ha-label { font-size:var(--text-xs); color:var(--text-secondary); font-weight:600; text-transform:uppercase; letter-spacing:0.5px; }
      .ha-val { float:right; color:var(--color-primary); font-weight:700; font-size:var(--text-sm); }
      .ha-slider { width:100%; margin:6px 0 14px; accent-color:var(--color-primary); }
      .ha-switch { display:flex; align-items:center; justify-content:space-between; padding:6px 0; }
      .ha-switch .ha-label { text-transform:none; letter-spacing:0; }
      .ha-btn-grid { display:grid; grid-template-columns:1fr 1fr; gap:6px; margin:var(--space-sm) 0; }
      .ha-btn-grid .btn { font-size:var(--text-xs); padding:8px; min-height:36px; }
      .ha-preview-wrap { aspect-ratio:16/9; background:#02030a; border-radius:12px; overflow:hidden; position:relative; }
      .ha-preview-wrap iframe { width:100%; height:100%; border:0; }
      .ha-url-row { display:flex; gap:8px; margin-top:var(--space-sm); }
      .ha-url-row input { flex:1; padding:8px 10px; background:var(--bg-input); border:1px solid var(--border-color); border-radius:8px; color:var(--color-primary); font:12px var(--font-mono); }
      .ha-stats { display:grid; grid-template-columns:repeat(4,1fr); gap:var(--space-sm); margin-top:var(--space-md); }
      .ha-stat { text-align:center; padding:var(--space-sm); background:rgba(0,217,255,0.05); border-radius:10px; border:1px solid rgba(0,217,255,0.12); }
      .ha-stat .num { font-size:1.4rem; font-weight:800; color:var(--color-primary); }
      .ha-stat .lbl { font-size:var(--text-xs); color:var(--text-muted); text-transform:uppercase; }
      .ha-feedback { font-size:var(--text-sm); margin-top:var(--space-sm); min-height:20px; }
      .switch { position:relative; display:inline-block; width:50px; height:28px; flex-shrink:0; }
      .switch input { opacity:0; width:0; height:0; }
      .switch .slider-sw { position:absolute; cursor:pointer; inset:0; background:rgba(255,255,255,0.15); transition:0.3s; border-radius:34px; }
      .switch .slider-sw::before { content:""; position:absolute; height:20px; width:20px; left:4px; bottom:4px; background:#fff; transition:0.3s; border-radius:50%; }
      .switch input:checked + .slider-sw { background:linear-gradient(135deg, #00d9ff, #7b2ff7); }
      .switch input:checked + .slider-sw::before { transform:translateX(22px); }
      @media(max-width:900px){ .ha-shell { grid-template-columns:1fr; } .ha-preview-wrap { aspect-ratio:4/3; } }
    </style>

    <div class="ux-page-head">
      <div>
        <div class="ux-kicker">🐺 Overlay Premium</div>
        <h1 class="view-title">Hype Arena</h1>
        <p class="view-subtitle">Controla la energía de tu comunidad en vivo con niveles de hype, sonidos y animaciones</p>
      </div>
      <div class="ux-page-actions">
        <a class="btn btn-secondary" href="/app/settings" data-router-link>⚙️ Configuración</a>
      </div>
    </div>

    <div class="ha-shell">
      <!-- LEFT: Controls -->
      <div>
        <div class="ha-panel" style="margin-bottom:var(--space-md)">
          <h3>⚙️ Dificultad</h3>

          <div class="ha-label">Multiplicador de Hype <span class="ha-val" id="haMultVal">1.0x</span></div>
          <input type="range" class="ha-slider" id="haMult" min="0.1" max="5" step="0.1" value="1">

          <div class="ha-label">Decaimiento <span class="ha-val" id="haDecayVal">0.65</span></div>
          <input type="range" class="ha-slider" id="haDecay" min="0.1" max="5" step="0.05" value="0.65">

          <div class="ha-label">Umbral base <span class="ha-val" id="haBaseVal">100</span></div>
          <input type="range" class="ha-slider" id="haBase" min="10" max="500" step="10" value="100">

          <div class="ha-label">Multiplicador de umbral <span class="ha-val" id="haThreshVal">1.5x</span></div>
          <input type="range" class="ha-slider" id="haThresh" min="1.1" max="5" step="0.1" value="1.5">

          <div class="ha-label">Niveles máximos <span class="ha-val" id="haMaxVal">0 (∞)</span></div>
          <input type="range" class="ha-slider" id="haMax" min="0" max="50" step="1" value="0">

          <div class="ha-switch">
            <span class="ha-label">🎬 Animaciones</span>
            <label class="switch"><input type="checkbox" id="haAnim" checked><span class="slider-sw"></span></label>
          </div>
          <div class="ha-switch" style="border-bottom:none">
            <span class="ha-label">🔊 Sonidos</span>
            <label class="switch"><input type="checkbox" id="haSound" checked><span class="slider-sw"></span></label>
          </div>

          <button class="btn btn-primary" id="haSave" style="width:100%;margin-top:var(--space-md)">💾 Guardar Configuración</button>
          <div class="ha-feedback" id="haFeedback"></div>
        </div>

        <div class="ha-panel">
          <h3>🧪 Zona de Prueba</h3>
          <p class="ha-label" style="text-transform:none;letter-spacing:0;color:var(--text-muted);font-weight:400;margin-bottom:var(--space-sm)">
            Simula eventos para probar el comportamiento del hype
          </p>
          <div class="ha-btn-grid">
            <button class="btn btn-secondary" data-test="like">❤️ Like</button>
            <button class="btn btn-secondary" data-test="follow">💫 Follow</button>
            <button class="btn btn-secondary" data-test="share">🔄 Share</button>
            <button class="btn btn-secondary" data-test="gift">🎁 Gift</button>
            <button class="btn btn-secondary" data-test="big" style="grid-column:1/-1">👑 Regalo Épico (1000💎)</button>
          </div>
        </div>
      </div>

      <!-- RIGHT: Preview + URL + Stats -->
      <div>
        <div class="ha-panel">
          <h3>🎬 Vista Previa</h3>
          <div class="ha-preview-wrap" id="haPreviewWrap">
            <iframe id="haPreview" sandbox="allow-scripts allow-same-origin allow-popups"></iframe>
          </div>
          <div class="ha-url-row">
            <input type="text" id="haUrl" readonly>
            <button class="btn btn-primary" id="haCopy">📋</button>
          </div>

          <div class="ha-stats" id="haStats">
            <div class="ha-stat"><div class="num" id="hsHype">0</div><div class="lbl">Hype</div></div>
            <div class="ha-stat"><div class="num" id="hsLevel">0</div><div class="lbl">Nivel</div></div>
            <div class="ha-stat"><div class="num" id="hsCombo">0</div><div class="lbl">Combo</div></div>
            <div class="ha-stat"><div class="num" id="hsViewers">0</div><div class="lbl">Viewers</div></div>
          </div>
        </div>
      </div>
    </div>
  `;

  /* === Load config === */
  async function loadCfg() {
    try {
      const d = await api.get('/settings/hype', { signal });
      hypeCfg = { ...hypeCfg, ...d };
      document.getElementById('haMult').value = hypeCfg.multiplier;
      document.getElementById('haMultVal').textContent = hypeCfg.multiplier.toFixed(1) + 'x';
      document.getElementById('haDecay').value = hypeCfg.decay;
      document.getElementById('haDecayVal').textContent = hypeCfg.decay.toFixed(2);
      document.getElementById('haBase').value = hypeCfg.thresholdBase;
      document.getElementById('haBaseVal').textContent = hypeCfg.thresholdBase;
      document.getElementById('haThresh').value = hypeCfg.thresholdMultiplier;
      document.getElementById('haThreshVal').textContent = hypeCfg.thresholdMultiplier.toFixed(1) + 'x';
      document.getElementById('haAnim').checked = hypeCfg.animations !== false;
      document.getElementById('haSound').checked = hypeCfg.sound !== false;
      document.getElementById('haMax').value = hypeCfg.maxLevels || 0;
      document.getElementById('haMaxVal').textContent = hypeCfg.maxLevels > 0 ? String(hypeCfg.maxLevels) : '0 (∞)';
      updatePreview();
    } catch {}
  }

  /* === Update preview URL === */
  function updatePreview() {
    const url = buildPreviewUrl(true);
    document.getElementById('haUrl').value = buildPreviewUrl(false);
    const iframe = document.getElementById('haPreview');
    iframe.src = url;
  }

  /* === Slider live updates === */
  const bindSlider = (id, valId, fmt) => {
    document.getElementById(id)?.addEventListener('input', () => {
      document.getElementById(valId).textContent = fmt(document.getElementById(id).value);
    }, { signal });
  };
  bindSlider('haMult', 'haMultVal', v => parseFloat(v).toFixed(1) + 'x');
  bindSlider('haDecay', 'haDecayVal', v => parseFloat(v).toFixed(2));
  bindSlider('haBase', 'haBaseVal', v => String(Math.round(v)));
  bindSlider('haThresh', 'haThreshVal', v => parseFloat(v).toFixed(1) + 'x');
  bindSlider('haMax', 'haMaxVal', v => parseInt(v) > 0 ? String(parseInt(v)) : '0 (∞)');

  /* === Save === */
  document.getElementById('haSave')?.addEventListener('click', async () => {
    const cfg = {
      multiplier: parseFloat(document.getElementById('haMult').value),
      decay: parseFloat(document.getElementById('haDecay').value),
      thresholdBase: parseInt(document.getElementById('haBase').value),
      thresholdMultiplier: parseFloat(document.getElementById('haThresh').value),
      animations: document.getElementById('haAnim').checked,
      sound: document.getElementById('haSound').checked,
      maxLevels: parseInt(document.getElementById('haMax').value)
    };
    try {
      await api.put('/settings/hype', cfg, { signal });
      hypeCfg = cfg;
      document.getElementById('haFeedback').textContent = '✅ Guardado';
      document.getElementById('haFeedback').style.color = 'var(--color-success)';
      updatePreview();
      showToast({ type: 'success', message: 'Configuración guardada' });
    } catch (err) {
      document.getElementById('haFeedback').textContent = '❌ ' + (err.message || 'Error');
      document.getElementById('haFeedback').style.color = 'var(--color-danger)';
    }
  }, { signal });

  /* === Copy URL === */
  document.getElementById('haCopy')?.addEventListener('click', async () => {
    const input = document.getElementById('haUrl');
    try { await navigator.clipboard.writeText(input.value); document.getElementById('haCopy').textContent = '✅'; setTimeout(() => document.getElementById('haCopy').textContent = '📋', 2000); } catch { input.select(); document.execCommand('copy'); }
  }, { signal });

  /* === Test buttons === */
  document.querySelectorAll('[data-test]').forEach(btn => {
    btn.addEventListener('click', () => {
      const type = btn.dataset.test;
      const iframe = document.getElementById('haPreview');
      if (!iframe?.contentWindow) return;
      try {
        iframe.contentWindow.postMessage({ type: 'hypeTest', test: type }, '*');
      } catch {}
    }, { signal });
  });

  /* === Listen for stats from iframe === */
  window.addEventListener('message', (e) => {
    if (!e.data || e.data.type !== 'hypeStats') return;
    const s = e.data;
    document.getElementById('hsHype').textContent = s.hype ?? '—';
    document.getElementById('hsLevel').textContent = s.level ?? '—';
    document.getElementById('hsCombo').textContent = s.combo ?? '—';
    document.getElementById('hsViewers').textContent = s.viewers ?? '—';
  }, { signal });

  loadCfg();
  // GSAP animate hype arena
    if (typeof gsap !== 'undefined') requestAnimationFrame(() => {
      const panels = document.querySelectorAll('.ha-panel');
      if (panels.length) gsap.from(panels, { opacity: 0, y: 24, stagger: 0.1, duration: 0.45, ease: 'power2.out' });
    });
}
