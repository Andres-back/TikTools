/**
 * Overlay Participantes - TikToolStream
 * Listen BroadcastChannel from roulette.js and render participants
 */

(function() {
  'use strict';
  if (new URLSearchParams(window.location.search).get('mode') === 'mobile') document.body.classList.add('mobile');

  const state = {
    participants: new Map(),
    totalEntries: 0
  };

  function escapeHtml(s) { return String(s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function escapeAttr(s) { return String(s || '').replace(/"/g, '&quot;'); }

  function render() {
    const listEl = document.getElementById('participantsList');
    if (!listEl) return;
    if (state.participants.size === 0) {
      listEl.innerHTML = `<div class="empty-state">
        <div class="empty-icon">🎯</div>
        <p>Esperando participantes...</p>
        <small>Los participantes aparecerán aquí cuando se unan al juego</small>
      </div>`;
    } else {
      const sorted = Array.from(state.participants.entries()).sort((a, b) => b[1].entries - a[1].entries);
      listEl.innerHTML = sorted.map(([uid, data], index) => {
        const displayLabel = data.displayName || uid;
        const initial = displayLabel ? displayLabel.charAt(0).toUpperCase() : '?';
        const avatarHtml = data.profileImage
          ? `<div class="participant-avatar"><img src="${escapeAttr(data.profileImage)}" alt="@${escapeHtml(displayLabel)}" onerror="this.parentNode.textContent='${initial}'"></div>`
          : `<div class="participant-avatar fallback" style="border-color:${escapeAttr(data.color || '#8a78e4')}">${escapeHtml(initial)}</div>`;

        let rankingBadge = '';
        if (index === 0) rankingBadge = '<div class="ranking-badge gold">🥇</div>';
        else if (index === 1) rankingBadge = '<div class="ranking-badge silver">🥈</div>';
        else if (index === 2) rankingBadge = '<div class="ranking-badge bronze">🥉</div>';

        const percentage = state.totalEntries > 0 ? ((data.entries / state.totalEntries) * 100).toFixed(1) : '0';
        const progressWidth = Math.min(100, parseFloat(percentage));

        return `<div class="participant-item" style="animation-delay:${index * 0.05}s">
          ${rankingBadge}
          ${avatarHtml}
          <div class="participant-info">
            <div class="participant-name">@${escapeHtml(displayLabel)}</div>
            <div class="participant-entries">${data.entries} entrada${data.entries > 1 ? 's' : ''}</div>
          </div>
          <div class="participant-percentage">${percentage}%</div>
          <div class="entry-progress" style="width: ${progressWidth}%"></div>
        </div>`;
      }).join('');
    }

    /* update stats */
    const countEl = document.getElementById('participantCount');
    const totalEl = document.getElementById('totalEntries');
    if (countEl) countEl.textContent = state.participants.size;
    if (totalEl) totalEl.textContent = state.totalEntries;
  }

  function applyParticipants(list) {
    state.participants.clear();
    if (Array.isArray(list)) {
      list.forEach(p => {
        if (p && p.uniqueId) {
          state.participants.set(p.uniqueId, {
            displayName: p.displayName || p.display_name || p.uniqueId,
            entries: p.entries || 1,
            color: p.color || '#8a78e4',
            profileImage: p.profileImage || p.profile_image || null
          });
        }
      });
    }
    recalcTotal();
    render();
  }

  function upsertParticipant(p) {
    if (!p || !p.uniqueId) return;
    const entries = p.entries ?? 1;
    if (entries <= 0) {
      state.participants.delete(p.uniqueId);
    } else {
      state.participants.set(p.uniqueId, {
        displayName: p.displayName || p.display_name || p.uniqueId,
        entries,
        color: p.color || '#8a78e4',
        profileImage: p.profileImage || p.profile_image || null
      });
    }
    recalcTotal();
    render();
    /* pulse animation on the updated item */
    setTimeout(() => {
      const items = document.querySelectorAll('.participant-item');
      items.forEach(item => {
        if (item.textContent.includes(`@${p.displayName || p.uniqueId}`)) {
          item.classList.add('updating');
          setTimeout(() => item.classList.remove('updating'), 500);
        }
      });
    }, 50);
  }

  function recalcTotal() {
    let total = 0;
    state.participants.forEach(p => { total += p.entries || 0; });
    state.totalEntries = total;
  }

  function connectBroadcast() {
    let channel;
    try {
      channel = new BroadcastChannel('tts_roulette');
    } catch (e) { return; }
    channel.onmessage = (ev) => {
      const msg = ev.data || {};
      if (msg.type === 'participants_update' || msg.type === 'spin_end') {
        if (Array.isArray(msg.participants)) applyParticipants(msg.participants);
      }
    };
  }

  function init() {
    render();
    connectBroadcast();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
