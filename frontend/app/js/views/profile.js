/**
 * Profile View — TikToolStream
 * Premium profile with avatar picker + display name + password
 */

import { countUp, formatNum, magneticButton } from '/app/js/core/visual-helpers.js';

export async function mount({ target, api, user, signal }) {
  const { showToast } = await import('/app/js/core/toast.js');

  const PRESET_AVATARS = [
    { id: 'astronaut', emoji: '🚀', bg: 'linear-gradient(135deg, #667eea, #764ba2)' },
    { id: 'wizard', emoji: '🧙', bg: 'linear-gradient(135deg, #8b5cf6, #ec4899)' },
    { id: 'ninja', emoji: '🥷', bg: 'linear-gradient(135deg, #1a1a2e, #16213e)' },
    { id: 'crown', emoji: '👑', bg: 'linear-gradient(135deg, #ffd700, #ff6b00)' },
    { id: 'fire', emoji: '🔥', bg: 'linear-gradient(135deg, #ff006e, #ff6b00)' },
    { id: 'star', emoji: '⭐', bg: 'linear-gradient(135deg, #ffd700, #00d9ff)' },
    { id: 'ghost', emoji: '👻', bg: 'linear-gradient(135deg, #9d4edd, #00d9ff)' },
    { id: 'rocket', emoji: '🎮', bg: 'linear-gradient(135deg, #00ff88, #00d9ff)' },
    { id: 'diamond', emoji: '💎', bg: 'linear-gradient(135deg, #00d9ff, #7b2ff7)' },
    { id: 'cat', emoji: '🐱', bg: 'linear-gradient(135deg, #ff9a9e, #fad0c4)' },
    { id: 'fox', emoji: '🦊', bg: 'linear-gradient(135deg, #ff6b35, #f7931e)' },
    { id: 'unicorn', emoji: '🦄', bg: 'linear-gradient(135deg, #ff006e, #8b5cf6)' }
  ];

  function escapeHtml(s) { return String(s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

  let currentProfile = null;
  let selectedAvatar = null;

  target.innerHTML = `
    <style>
      .prof-shell { display:grid; grid-template-columns:1fr 1fr; gap:var(--space-lg); }
      .prof-card { background:linear-gradient(160deg, rgba(20,25,45,0.95), rgba(15,20,40,0.95)); border:1px solid rgba(255,255,255,0.08); border-radius:16px; padding:var(--space-lg); }
      .prof-avatar-section { display:flex; align-items:center; gap:14px; margin-bottom:var(--space-md); }
      .prof-avatar-big { width:80px; height:80px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:2.4rem; border:3px solid rgba(0,217,255,0.4); box-shadow:0 0 24px rgba(0,217,255,0.2); flex-shrink:0; }
      .prof-avatar-big img { width:100%; height:100%; border-radius:50%; object-fit:cover; }
      .prof-presets { display:grid; grid-template-columns:repeat(auto-fill, minmax(50px, 1fr)); gap:8px; margin-top:var(--space-md); }
      .prof-preset { aspect-ratio:1; border-radius:12px; border:2px solid var(--border-color); cursor:pointer; display:flex; align-items:center; justify-content:center; font-size:1.6rem; transition:all 0.2s; position:relative; }
      .prof-preset:hover { transform:scale(1.08); border-color:rgba(0,217,255,0.5); }
      .prof-preset.selected { border-color:#00d9ff; box-shadow:0 0 16px rgba(0,217,255,0.4); transform:scale(1.05); }
      .prof-preset.selected::after { content:'✓'; position:absolute; top:-4px; right:-4px; background:#00d9ff; color:#0a0a0f; width:18px; height:18px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:0.7rem; font-weight:700; }
      .prof-custom-url { display:flex; gap:6px; margin-top:8px; }
      .prof-custom-url input { flex:1; }
      @media (max-width: 768px) {
        .prof-shell { grid-template-columns:1fr; }
        .prof-card { padding:var(--space-md); }
      }
      @media (max-width: 480px) {
        .prof-avatar-big { width:60px; height:60px; font-size:1.8rem; }
        .prof-presets { grid-template-columns:repeat(auto-fill, minmax(40px, 1fr)); }
        .prof-preset { font-size:1.3rem; }
      }
    </style>

    <h1 class="view-title" style="margin-bottom:var(--space-lg)">👤 Mi Perfil</h1>

    <div class="prof-shell">
      <div class="prof-card">
        <h3 style="margin-bottom:var(--space-md)">🎭 Avatar y Nombre</h3>
        <div class="prof-avatar-section">
          <div class="prof-avatar-big" id="profAvatarBig">👤</div>
          <div style="flex:1;min-width:0">
            <div id="profUsernameDisplay" style="font-weight:700;font-size:1.1rem"></div>
            <div id="profEmailDisplay" style="font-size:var(--text-sm);color:var(--text-muted)"></div>
          </div>
        </div>

        <div class="input-group" style="margin-bottom:var(--space-sm)">
          <label class="input-label">Nombre a mostrar</label>
          <input type="text" id="profDisplayName" class="input-field" placeholder="Opcional">
        </div>

        <div class="input-group" style="margin-bottom:var(--space-sm)">
          <label class="input-label">URL de imagen personalizada (opcional)</label>
          <div class="prof-custom-url">
            <input type="url" id="profAvatarUrl" class="input-field" placeholder="https://...">
            <button class="btn btn-secondary btn-sm" id="btnApplyUrl">Aplicar</button>
          </div>
        </div>

        <label class="input-label">Elige un avatar</label>
        <div class="prof-presets" id="profPresets"></div>

        <button class="btn btn-primary" id="btnSaveProfile" style="width:100%;margin-top:var(--space-md)">💾 Guardar Cambios</button>
        <div id="profFeedback" style="margin-top:var(--space-sm);font-size:var(--text-sm)"></div>
      </div>

      <div class="prof-card">
        <h3 style="margin-bottom:var(--space-md)">🔐 Cambiar Contraseña</h3>
        <div class="input-group" style="margin-bottom:var(--space-sm)">
          <label class="input-label">Contraseña actual</label>
          <input type="password" id="pwCurrent" class="input-field">
        </div>
        <div class="input-group" style="margin-bottom:var(--space-sm)">
          <label class="input-label">Nueva contraseña (mín 6 caracteres)</label>
          <input type="password" id="pwNew" class="input-field" minlength="6">
        </div>
        <button class="btn btn-primary" id="btnChangePw">Cambiar Contraseña</button>
        <div id="pwFeedback" style="margin-top:var(--space-sm);font-size:var(--text-sm)"></div>
      </div>
    </div>
  `;

  /* render presets */
  const presetsEl = document.getElementById('profPresets');
  presetsEl.innerHTML = PRESET_AVATARS.map(a => `
    <div class="prof-preset" data-avatar="${a.id}" data-emoji="${a.emoji}" data-bg="${a.bg}" title="${a.id}">${a.emoji}</div>
  `).join('');
  presetsEl.querySelectorAll('.prof-preset').forEach(el => {
    el.addEventListener('click', () => {
      presetsEl.querySelectorAll('.prof-preset').forEach(p => p.classList.remove('selected'));
      el.classList.add('selected');
      selectedAvatar = { id: el.dataset.avatar, emoji: el.dataset.emoji, bg: el.dataset.bg };
      updateAvatarPreview(selectedAvatar.emoji, selectedAvatar.bg);
    }, { signal });
  });

  function updateAvatarPreview(content, bg) {
    const el = document.getElementById('profAvatarBig');
    if (!el) return;
    if (content && content.startsWith('http')) {
      el.innerHTML = `<img src="${escapeHtml(content)}" onerror="this.style.display='none';this.parentNode.textContent='👤'">`;
      el.style.background = 'rgba(0,0,0,0.3)';
    } else if (content && bg) {
      el.textContent = content;
      el.style.background = bg;
    } else {
      el.textContent = '👤';
      el.style.background = 'linear-gradient(135deg, #667eea, #764ba2)';
    }
  }

  document.getElementById('btnApplyUrl')?.addEventListener('click', () => {
    const url = document.getElementById('profAvatarUrl').value.trim();
    if (!url) return;
    presetsEl.querySelectorAll('.prof-preset').forEach(p => p.classList.remove('selected'));
    selectedAvatar = { id: 'custom', url };
    updateAvatarPreview(url);
  }, { signal });

  /* load profile */
  try {
    const profile = await api.get('/auth/profile', { signal });
    currentProfile = profile;
    if (profile) {
      if (profile.display_name) document.getElementById('profDisplayName').value = profile.display_name;
      document.getElementById('profUsernameDisplay').textContent = '@' + (profile.username || user?.username || '');
      document.getElementById('profEmailDisplay').textContent = profile.email || user?.email || '';
      if (profile.avatar_url) {
        document.getElementById('profAvatarUrl').value = profile.avatar_url;
        updateAvatarPreview(profile.avatar_url);
      } else {
        updateAvatarPreview(null);
      }
    }
  } catch {}

  document.getElementById('btnSaveProfile')?.addEventListener('click', async () => {
    const btn = document.getElementById('btnSaveProfile');
    btn.disabled = true; btn.textContent = 'Guardando...';
    try {
      const payload = {
        displayName: document.getElementById('profDisplayName').value.trim() || null
      };
      if (selectedAvatar && selectedAvatar.id === 'custom') {
        payload.avatarUrl = selectedAvatar.url;
      } else if (selectedAvatar && selectedAvatar.id) {
        /* build a deterministic data URI from preset for avatar */
        payload.avatarUrl = `preset://${selectedAvatar.id}`;
      }
      await api.put('/auth/profile', payload, { signal });
      showToast({ type: 'success', message: 'Perfil actualizado' });
    } catch (err) {
      document.getElementById('profFeedback').innerHTML = `<span style="color:var(--color-danger)">${escapeHtml(err.message)}</span>`;
    }
    btn.disabled = false; btn.textContent = '💾 Guardar Cambios';
  }, { signal });

  document.getElementById('btnChangePw')?.addEventListener('click', async () => {
    const current = document.getElementById('pwCurrent').value;
    const newPw = document.getElementById('pwNew').value;
    if (!current || !newPw) {
      document.getElementById('pwFeedback').innerHTML = '<span style="color:var(--color-danger)">Completa ambos campos</span>';
      return;
    }
    if (newPw.length < 6) {
      document.getElementById('pwFeedback').innerHTML = '<span style="color:var(--color-danger)">Mínimo 6 caracteres</span>';
      return;
    }
    const btn = document.getElementById('btnChangePw');
    btn.disabled = true; btn.textContent = 'Cambiando...';
    try {
      await api.put('/auth/password', { currentPassword: current, newPassword: newPw }, { signal });
      showToast({ type: 'success', message: 'Contraseña cambiada' });
      document.getElementById('pwCurrent').value = '';
      document.getElementById('pwNew').value = '';
    } catch (err) {
      document.getElementById('pwFeedback').innerHTML = `<span style="color:var(--color-danger)">${escapeHtml(err.message)}</span>`;
    }
    btn.disabled = false; btn.textContent = 'Cambiar Contraseña';
  }, { signal });
  // GSAP animate profile
    if (typeof gsap !== 'undefined') requestAnimationFrame(() => {
      const cards = document.querySelectorAll('.prof-card');
      if (cards.length) gsap.from(cards, { opacity: 0, y: 24, stagger: 0.1, duration: 0.45, ease: 'power2.out' });
    });
}
