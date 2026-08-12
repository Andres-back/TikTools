/**
 * Settings View — TikToolStream
 * Premium settings: profile, theme, language, session, danger zone
 */

export async function mount({ target, auth, api, navigate, signal }) {
  const { showToast } = await import('/app/js/core/toast.js');

  const savedSession = localStorage.getItem('tiktok_sessionid') || '';
  const savedTheme = localStorage.getItem('tts_theme') || 'dark';
  const savedLang = localStorage.getItem('tts_lang') || 'es';
  const savedVolume = localStorage.getItem('tts_sound_volume') || '0.8';
  const savedNotif = localStorage.getItem('tts_notifications') !== 'false';

  target.innerHTML = `
    <style>
      .set-grid { display:grid; grid-template-columns:repeat(auto-fit, minmax(320px, 1fr)); gap:var(--space-lg); max-width:1100px; }
      .set-card { background:linear-gradient(160deg, rgba(20,25,45,0.95), rgba(15,20,40,0.95)); border:1px solid rgba(255,255,255,0.08); border-radius:16px; padding:var(--space-lg); position:relative; overflow:hidden; }
      .set-card::before { content:''; position:absolute; top:0; left:0; right:0; height:1px; background:linear-gradient(90deg, transparent, rgba(0,217,255,0.4), transparent); }
      .set-card h3 { font-size: var(--text-base); color: #fff; margin-bottom: var(--space-md); display:flex; align-items:center; gap:8px; }
      .set-card p.set-desc { color:var(--text-muted); font-size:var(--text-sm); margin-bottom:var(--space-md); }
      .theme-grid { display:grid; grid-template-columns:repeat(3, 1fr); gap:var(--space-sm); margin-bottom:var(--space-md); }
      .theme-opt { padding:var(--space-sm); border:2px solid var(--border-color); border-radius:10px; cursor:pointer; text-align:center; transition:all 0.2s; background:transparent; color:var(--text-secondary); font-family:inherit; font-size:var(--text-sm); font-weight:600; }
      .theme-opt:hover { border-color:rgba(0,217,255,0.3); }
      .theme-opt.active { border-color:#00d9ff; background:rgba(0,217,255,0.08); color:#00d9ff; }
      .theme-opt .preview { width:100%; height:36px; border-radius:6px; margin-bottom:6px; }
      .theme-opt .preview.dark { background:linear-gradient(135deg, #0a0a1e, #1a1a3e); }
      .theme-opt .preview.mid { background:linear-gradient(135deg, #2a2a4a, #4a4a6a); }
      .theme-opt .preview.light { background:linear-gradient(135deg, #f5f5f5, #e0e0e0); }
      .lang-grid { display:grid; grid-template-columns:repeat(2, 1fr); gap:var(--space-sm); }
      .lang-opt { padding:10px; border:1px solid var(--border-color); border-radius:8px; cursor:pointer; text-align:center; transition:all 0.2s; background:transparent; color:var(--text-secondary); font-family:inherit; font-weight:600; }
      .lang-opt.active { border-color:#00d9ff; background:rgba(0,217,255,0.1); color:#00d9ff; }
      .slider-row { display:flex; align-items:center; gap:var(--space-md); margin-bottom:var(--space-sm); }
      .slider-row input[type=range] { flex:1; accent-color:#00d9ff; }
      .slider-row .val { min-width:40px; text-align:right; color:#00d9ff; font-weight:700; }
      .switch { position:relative; display:inline-block; width:50px; height:28px; }
      .switch input { opacity:0; width:0; height:0; }
      .switch .slider-sw { position:absolute; cursor:pointer; inset:0; background:rgba(255,255,255,0.15); transition:0.3s; border-radius:34px; }
      .switch .slider-sw::before { content:""; position:absolute; height:20px; width:20px; left:4px; bottom:4px; background:#fff; transition:0.3s; border-radius:50%; }
      .switch input:checked + .slider-sw { background:linear-gradient(135deg, #00d9ff, #7b2ff7); }
      .switch input:checked + .slider-sw::before { transform:translateX(22px); }
      .switch-row { display:flex; align-items:center; justify-content:space-between; padding:var(--space-sm) 0; }
      .switch-row .label { font-size:var(--text-sm); }
      .switch-row .desc { font-size:var(--text-xs); color:var(--text-muted); margin-top:2px; }
      .danger-zone { border-color:rgba(255,23,68,0.3); }
      .danger-zone h3 { color:#ff6b6b; }
    </style>

    <h1 class="view-title" style="margin-bottom:var(--space-lg)">⚙️ Configuración</h1>

    <div class="set-grid">
      <div class="set-card">
        <h3>🎨 Apariencia</h3>
        <p class="set-desc">Personaliza el tema visual de la aplicación</p>
        <div class="theme-grid">
          <button class="theme-opt ${savedTheme === 'dark' ? 'active' : ''}" data-theme="dark">
            <div class="preview dark"></div>Oscuro
          </button>
          <button class="theme-opt ${savedTheme === 'mid' ? 'active' : ''}" data-theme="mid">
            <div class="preview mid"></div>Medio
          </button>
          <button class="theme-opt ${savedTheme === 'light' ? 'active' : ''}" data-theme="light">
            <div class="preview light"></div>Claro
          </button>
        </div>

        <h3 style="margin-top:var(--space-md)">🌐 Idioma</h3>
        <p class="set-desc">Idioma de la interfaz</p>
        <div class="lang-grid">
          <button class="lang-opt ${savedLang === 'es' ? 'active' : ''}" data-lang="es">🇪🇸 Español</button>
          <button class="lang-opt ${savedLang === 'en' ? 'active' : ''}" data-lang="en">🇺🇸 English</button>
        </div>
      </div>

      <div class="set-card">
        <h3>🔔 Notificaciones y Sonido</h3>
        <p class="set-desc">Controla las alertas y el volumen por defecto</p>
        <div class="switch-row">
          <div>
            <div class="label">Notificaciones del navegador</div>
            <div class="desc">Recibe avisos de regalos y eventos</div>
          </div>
          <label class="switch">
            <input type="checkbox" id="notifToggle" ${savedNotif ? 'checked' : ''}>
            <span class="slider-sw"></span>
          </label>
        </div>
        <div class="switch-row">
          <div>
            <div class="label">Volumen por defecto de alertas</div>
            <div class="desc">Aplica a todas las alertas de sonido</div>
          </div>
          <span class="val" id="volVal">${(parseFloat(savedVolume) * 100).toFixed(0)}%</span>
        </div>
        <div class="slider-row">
          <input type="range" id="volSlider" min="0" max="1" step="0.05" value="${savedVolume}">
        </div>
        <div class="switch-row">
          <div>
            <div class="label">Sonido al conectar</div>
            <div class="desc">Pitido al iniciar el live</div>
          </div>
          <label class="switch">
            <input type="checkbox" id="connectBeep" ${localStorage.getItem('tts_beep_connect') !== 'false' ? 'checked' : ''}>
            <span class="slider-sw"></span>
          </label>
        </div>
      </div>

      <div class="set-card" id="hypeConfigCard" style="display:none">
        <h3>🐺 Hype Arena</h3>
        <p class="set-desc">Controla la dificultad del sistema de Hype en el overlay</p>
        <div class="switch-row">
          <div><div class="label">Multiplicador de Hype</div><div class="desc">Más alto = sube más rápido</div></div>
          <span class="val" id="hypeMultVal">1.0x</span>
        </div>
        <div class="slider-row"><input type="range" id="hypeMult" min="0.1" max="5" step="0.1" value="1"></div>
        <div class="switch-row">
          <div><div class="label">Decaimiento</div><div class="desc">Más alto = baja más rápido</div></div>
          <span class="val" id="hypeDecayVal">0.65</span>
        </div>
        <div class="slider-row"><input type="range" id="hypeDecay" min="0.1" max="5" step="0.05" value="0.65"></div>
        <div class="switch-row">
          <div><div class="label">Umbral base por nivel</div><div class="desc">Hype necesario para el primer nivel</div></div>
          <span class="val" id="hypeBaseVal">100</span>
        </div>
        <div class="slider-row"><input type="range" id="hypeBase" min="10" max="500" step="10" value="100"></div>
        <div class="switch-row">
          <div><div class="label">Multiplicador de umbral</div><div class="desc">1.5 = cada nivel requiere 50% más</div></div>
          <span class="val" id="hypeThreshVal">1.5x</span>
        </div>
        <div class="slider-row"><input type="range" id="hypeThresh" min="1.1" max="5" step="0.1" value="1.5"></div>
        <div class="switch-row">
          <div><div class="label">🎬 Animaciones</div><div class="desc">Screen shake, flashes, rings</div></div>
          <label class="switch"><input type="checkbox" id="hypeAnim" checked><span class="slider-sw"></span></label>
        </div>
        <div class="switch-row">
          <div><div class="label">🔊 Sonidos</div><div class="desc">Efectos de sonido en cada nivel</div></div>
          <label class="switch"><input type="checkbox" id="hypeSound" checked><span class="slider-sw"></span></label>
        </div>
        <div class="switch-row">
          <div><div class="label">Niveles máximos</div><div class="desc">0 = ilimitado</div></div>
          <span class="val" id="hypeMaxVal">0</span>
        </div>
        <div class="slider-row"><input type="range" id="hypeMax" min="0" max="50" step="1" value="0"></div>
        <button class="btn btn-primary" id="btnSaveHype" style="width:100%;margin-top:var(--space-sm)">💾 Guardar Configuración</button>
        <div id="hypeFeedback" style="margin-top:var(--space-sm);font-size:var(--text-sm)"></div>
      </div>

      <div class="set-card">
        <h3>🔌 TikTok Session</h3>
        <p class="set-desc">Tu session ID de TikTok (opcional, mejora la conexión)</p>
        <div class="input-group" style="margin-bottom:var(--space-sm)">
          <label class="input-label">Session ID</label>
          <input type="password" id="settingsSessionId" class="input-field" placeholder="sessionid de TikTok" value="${savedSession}">
        </div>
        <button class="btn btn-primary" id="btnSaveSession" style="width:100%">💾 Guardar Session ID</button>
        <div id="sessionFeedback" style="margin-top:var(--space-sm);font-size:var(--text-sm)"></div>
      </div>

      <div class="set-card">
        <h3>👤 Cuenta</h3>
        <p class="set-desc">Gestiona tu cuenta y suscripción</p>
        <div style="display:flex;flex-direction:column;gap:var(--space-sm)">
          <a href="/app/profile" class="btn btn-secondary" data-router-link style="text-decoration:none">👤 Editar Perfil</a>
          <a href="/app/payments" class="btn btn-secondary" data-router-link style="text-decoration:none">💎 Plan y Pagos</a>
          <a href="/app/overlays" class="btn btn-secondary" data-router-link style="text-decoration:none">🖥️ Ver Overlays</a>
        </div>
      </div>

      <div class="set-card danger-zone">
        <h3>⚠️ Zona Peligrosa</h3>
        <p class="set-desc">Acciones irreversibles. Procede con cuidado.</p>
        <button class="btn btn-secondary" id="btnLogoutS" style="width:100%;margin-bottom:var(--space-sm);background:rgba(255,215,0,0.1);border-color:rgba(255,215,0,0.3);color:#ffd700">🚪 Cerrar Sesión</button>
        <button class="btn btn-danger" id="btnDeleteAccount" style="width:100%">🗑️ Eliminar Cuenta</button>
      </div>
    </div>
  `;

  function applyTheme(theme) {
    document.body.setAttribute('data-theme', theme);
    document.querySelectorAll('.theme-opt').forEach(b => b.classList.toggle('active', b.dataset.theme === theme));
    localStorage.setItem('tts_theme', theme);
    if (theme === 'light') {
      document.documentElement.style.setProperty('--bg-app', '#f5f5f5');
      document.documentElement.style.setProperty('--bg-card', 'rgba(255,255,255,0.95)');
      document.documentElement.style.setProperty('--text-primary', '#1a1a2e');
      document.documentElement.style.setProperty('--text-secondary', 'rgba(0,0,0,0.7)');
      document.documentElement.style.setProperty('--text-muted', 'rgba(0,0,0,0.5)');
      document.documentElement.style.setProperty('--border-color', 'rgba(0,0,0,0.1)');
    } else {
      document.documentElement.style.setProperty('--bg-app', '#0a0a1e');
      document.documentElement.style.setProperty('--bg-card', 'rgba(20,25,45,0.95)');
      document.documentElement.style.setProperty('--text-primary', '#ffffff');
      document.documentElement.style.setProperty('--text-secondary', 'rgba(255,255,255,0.7)');
      document.documentElement.style.setProperty('--text-muted', 'rgba(255,255,255,0.4)');
      document.documentElement.style.setProperty('--border-color', 'rgba(255,255,255,0.1)');
    }
  }
  applyTheme(savedTheme);

  document.querySelectorAll('.theme-opt').forEach(b => b.addEventListener('click', () => applyTheme(b.dataset.theme), { signal }));

  document.querySelectorAll('.lang-opt').forEach(b => b.addEventListener('click', () => {
    document.querySelectorAll('.lang-opt').forEach(x => x.classList.remove('active'));
    b.classList.add('active');
    localStorage.setItem('tts_lang', b.dataset.lang);
    showToast({ type: 'info', message: b.dataset.lang === 'es' ? 'Idioma cambiado a Español' : 'Language changed to English' });
  }, { signal }));

  const volSlider = document.getElementById('volSlider');
  const volVal = document.getElementById('volVal');
  volSlider?.addEventListener('input', () => {
    const v = parseFloat(volSlider.value);
    volVal.textContent = `${(v * 100).toFixed(0)}%`;
    localStorage.setItem('tts_sound_volume', String(v));
  }, { signal });

  document.getElementById('notifToggle')?.addEventListener('change', (e) => {
    localStorage.setItem('tts_notifications', e.target.checked ? 'true' : 'false');
    if (e.target.checked && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, { signal });

  document.getElementById('connectBeep')?.addEventListener('change', (e) => {
    localStorage.setItem('tts_beep_connect', e.target.checked ? 'true' : 'false');
  }, { signal });

  document.getElementById('btnSaveSession')?.addEventListener('click', () => {
    const val = document.getElementById('settingsSessionId').value.trim();
    if (val) {
      localStorage.setItem('tiktok_sessionid', val);
      showToast({ type: 'success', message: 'Session ID guardado' });
    } else {
      localStorage.removeItem('tiktok_sessionid');
      showToast({ type: 'info', message: 'Session ID eliminado' });
    }
  }, { signal });

  document.getElementById('btnLogoutS')?.addEventListener('click', async () => {
    if (!confirm('¿Cerrar sesión?')) return;
    await auth.logout();
  }, { signal });

  // ====== HYPE CONFIG ======
  async function loadHypeConfig() {
    try {
      const cfg = await api.get('/settings/hype', { signal });
      document.getElementById('hypeConfigCard').style.display = 'block';
      document.getElementById('hypeMult').value = cfg.multiplier || 1;
      document.getElementById('hypeMultVal').textContent = (cfg.multiplier || 1).toFixed(1) + 'x';
      document.getElementById('hypeDecay').value = cfg.decay || 0.65;
      document.getElementById('hypeDecayVal').textContent = (cfg.decay || 0.65).toFixed(2);
      document.getElementById('hypeBase').value = cfg.thresholdBase || 100;
      document.getElementById('hypeBaseVal').textContent = cfg.thresholdBase || 100;
      document.getElementById('hypeThresh').value = cfg.thresholdMultiplier || 1.5;
      document.getElementById('hypeThreshVal').textContent = (cfg.thresholdMultiplier || 1.5).toFixed(1) + 'x';
      document.getElementById('hypeAnim').checked = cfg.animations !== false;
      document.getElementById('hypeSound').checked = cfg.sound !== false;
      document.getElementById('hypeMax').value = cfg.maxLevels || 0;
      document.getElementById('hypeMaxVal').textContent = cfg.maxLevels || '∞';
    } catch {}
  }

  // Slider live updates
  const bindSlider = (id, valId, fmt) => {
    const el = document.getElementById(id);
    const val = document.getElementById(valId);
    el?.addEventListener('input', () => { val.textContent = fmt(el.value); }, { signal });
  };
  bindSlider('hypeMult', 'hypeMultVal', v => parseFloat(v).toFixed(1) + 'x');
  bindSlider('hypeDecay', 'hypeDecayVal', v => parseFloat(v).toFixed(2));
  bindSlider('hypeBase', 'hypeBaseVal', v => String(Math.round(v)));
  bindSlider('hypeThresh', 'hypeThreshVal', v => parseFloat(v).toFixed(1) + 'x');
  bindSlider('hypeMax', 'hypeMaxVal', v => parseInt(v) === 0 ? '∞' : v);

  document.getElementById('btnSaveHype')?.addEventListener('click', async () => {
    const cfg = {
      multiplier: parseFloat(document.getElementById('hypeMult').value),
      decay: parseFloat(document.getElementById('hypeDecay').value),
      thresholdBase: parseInt(document.getElementById('hypeBase').value),
      thresholdMultiplier: parseFloat(document.getElementById('hypeThresh').value),
      animations: document.getElementById('hypeAnim').checked,
      sound: document.getElementById('hypeSound').checked,
      maxLevels: parseInt(document.getElementById('hypeMax').value)
    };
    try {
      await api.put('/settings/hype', cfg, { signal });
      document.getElementById('hypeFeedback').textContent = '✅ Configuración guardada';
      document.getElementById('hypeFeedback').style.color = 'var(--color-success)';
      showToast({ type: 'success', message: 'Configuración de Hype guardada' });
    } catch (err) {
      document.getElementById('hypeFeedback').textContent = '❌ Error: ' + (err.message || 'desconocido');
      document.getElementById('hypeFeedback').style.color = 'var(--color-danger)';
    }
  }, { signal });

  loadHypeConfig();

  document.getElementById('btnDeleteAccount')?.addEventListener('click', () => {
    showToast({ type: 'warning', message: 'Contacta al administrador para eliminar tu cuenta' });
  }, { signal });
  // GSAP animate settings
    if (typeof gsap !== 'undefined') requestAnimationFrame(() => {
      const cards = document.querySelectorAll('.set-card');
      if (cards.length) gsap.from(cards, { opacity: 0, y: 24, stagger: 0.07, duration: 0.4, ease: 'power2.out' });
    });
}
