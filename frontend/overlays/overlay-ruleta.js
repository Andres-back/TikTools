/**
 * Overlay Ruleta - TikToolStream
 * Se conecta vía WebSocket para mostrar el estado de la ruleta en vivo
 */
(function() {
  'use strict';
  if (new URLSearchParams(window.location.search).get('mode') === 'mobile') document.body.classList.add('mobile');

  let ws = null;
  let reconnectTimer = null;
  let participants = [];
  let currentWinner = null;
  const userId = new URLSearchParams(window.location.search).get('userId');

  const ICONS = {
    gift: '🎁',
    like: '❤️',
    follow: '👤',
    share: '🔄'
  };

  function updateDisplay() {
    const container = document.getElementById('participantsList');
    if (!container) return;

    if (participants.length === 0) {
      container.innerHTML = '<div class="empty-state">Esperando participantes...</div>';
      return;
    }

    container.innerHTML = participants.map((p, i) => `
      <div class="participant-entry ${p.isWinner ? 'winner' : ''}" style="animation-delay: ${i * 0.05}s">
        <span class="participant-pos">#${i + 1}</span>
        <span class="participant-name">${p.displayName || p.uniqueId}</span>
        <span class="participant-entries">${p.entries} entrada${p.entries !== 1 ? 's' : ''}</span>
        ${p.isWinner ? '<span class="winner-badge">🏆</span>' : ''}
      </div>
    `).join('');

    if (currentWinner) {
      const winnerEl = document.getElementById('winnerDisplay');
      if (winnerEl) {
        winnerEl.innerHTML = `
          <div class="winner-celebration">
            <span class="winner-trophy">🏆</span>
            <span class="winner-name">${currentWinner.displayName || currentWinner.uniqueId}</span>
            <span class="winner-label">GANADOR</span>
          </div>
        `;
        winnerEl.classList.add('visible');
      }
    }
  }

  function connectWS() {
    if (!userId) return;
    if (ws) ws.close();

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    ws = new WebSocket(`${protocol}//${window.location.host}/live`);

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'subscribe', channelId: userId }));
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);

        if (msg.type === 'roulette-update' && msg.data) {
          participants = msg.data.participants || [];
          currentWinner = msg.data.winner || null;
          updateDisplay();
        }

        if (msg.type === 'roulette-winner' && msg.data) {
          currentWinner = msg.data;
          updateDisplay();
        }

        if (msg.type === 'gift' && msg.data) {
          const diamondCount = msg.data.diamondCount || 0;
          const uniqueId = msg.data.uniqueId || 'desconocido';
          const nickname = msg.data.nickname || uniqueId;

          const existing = participants.find(p => p.uniqueId === uniqueId);
          if (existing) {
            existing.entries = (existing.entries || 1) + 1;
          } else {
            participants.push({ uniqueId, displayName: nickname, entries: 1 });
          }
          updateDisplay();
        }
      } catch (e) { /* ignore parse errors */ }
    };

    ws.onclose = () => {
      reconnectTimer = setTimeout(connectWS, 3000);
    };
    ws.onerror = () => ws.close();
  }

  if (userId) {
    connectWS();
  }
})();
