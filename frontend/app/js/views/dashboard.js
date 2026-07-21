/**
 * Dashboard View - TikTools
 * TikTok LIVE dashboard with connection, timer, leaderboard & live chat
 * TikFinity-inspired design
 */

import { countUp, formatNum, magneticButton } from '/app/js/core/visual-helpers.js';
import { getAccessToken } from '/app/js/core/auth.js';

export async function mount({ target, api, user, toast, signal }) {
  let ws = null;
  let leaderboard = [];
  let liveChat = [];
  let userId = user?.id;

  const TIKTOK_GIFTS = {}; // cacheado
  const GIFT_IMAGES = {}; // cacheado
  const AVATARS = {}; // cache para fallback

  // ============ RENDER ============
  target.innerHTML = `
    <style>
      .dash-grid { display:grid; grid-template-columns: 300px 1fr 340px; gap:var(--space-xl); }
      .dash-card { background:var(--bg-card); border:1px solid var(--border-color); border-radius:var(--border-radius-lg); padding:var(--space-xl); box-shadow:var(--shadow-sm); position:relative; overflow:hidden; transition:border-color var(--transition-fast); }
      .dash-card:hover { border-color:var(--border-hover); }
      .dash-card-title { font-size:var(--text-xs); color:var(--text-muted); text-transform:uppercase; letter-spacing:1px; font-weight:600; margin-bottom:var(--space-md); display:flex; align-items:center; gap:8px; }
      .dash-card-title i { color:var(--color-primary); font-size:14px; }

      .stats-row { display:grid; grid-template-columns:repeat(2,1fr); gap:var(--space-md); margin-top:var(--space-md); }
      .stats-mini { background:var(--bg-surface); border:1px solid var(--border-color); border-radius:var(--border-radius-md); padding:var(--space-lg); text-align:center; transition:all var(--transition-fast); }
      .stats-mini:hover { border-color:var(--border-hover); transform:translateY(-1px); }
      .stats-mini .num { font-family:var(--font-display); font-size:var(--text-xl); font-weight:800; color:var(--text-primary); line-height:1.2; }
      .stats-mini .lbl { font-size:var(--text-xs); color:var(--text-muted); margin-top:4px; text-transform:uppercase; letter-spacing:0.5px; }
      .stats-mini i { font-size:20px; margin-bottom:8px; display:block; }
      .stats-mini i.cyan { color:var(--color-primary); }
      .stats-mini i.gold { color:var(--color-warning); }
      .stats-mini i.green { color:var(--color-success); }
      .stats-mini i.purple { color:#a78bfa; }

      .timer-display { font-family:var(--font-display); font-size:clamp(2.5rem, 8vw, 5rem); font-weight:800; text-align:center; background:linear-gradient(135deg, #f1f5f9 0%, var(--color-primary) 100%); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; line-height:1; letter-spacing:-2px; }
      .timer-display.warn { background:linear-gradient(135deg, #f1f5f9, var(--color-warning)); -webkit-background-clip:text; background-clip:text; }
      .timer-display.danger { background:linear-gradient(135deg, var(--color-danger), #f87171); -webkit-background-clip:text; background-clip:text; animation:pulseDanger 0.5s ease-in-out infinite; }
      @keyframes pulseDanger { 0%,100%{opacity:1;transform:scale(1);} 50%{opacity:0.85;transform:scale(1.02);} }
      .timer-phase { text-align:center; font-size:var(--text-xs); text-transform:uppercase; letter-spacing:2px; color:var(--text-muted); margin-top:6px; font-weight:600; display:flex; align-items:center; justify-content:center; gap:6px; }
      .timer-phase.live { color:var(--color-success); }
      .timer-phase.warn { color:var(--color-warning); }
      .timer-phase.danger { color:var(--color-danger); animation:pulseDanger 0.5s ease-in-out infinite; }
      .timer-phase.done { color:var(--color-warning); }
      .timer-bar-wrap { height:6px; background:rgba(255,255,255,0.06); border-radius:3px; overflow:hidden; margin-top:var(--space-md); }
      .timer-bar { height:100%; background:var(--color-primary-gradient); border-radius:3px; transition:width 0.4s linear; }
      .timer-bar.warn { background:linear-gradient(90deg, var(--color-warning), #f97316); }
      .timer-bar.danger { background:linear-gradient(90deg, var(--color-danger), #f87171); }
      .timer-winner { text-align:center; margin-top:var(--space-md); padding:var(--space-md); background:linear-gradient(135deg, rgba(251,191,36,0.12), rgba(249,115,22,0.05)); border:1px solid rgba(251,191,36,0.3); border-radius:var(--border-radius-md); font-weight:700; color:var(--color-warning); display:none; }
      
      .lb-list { max-height:60vh; overflow-y:auto; padding-right:4px; }
      .lb-list::-webkit-scrollbar { width:4px; }
      .lb-list::-webkit-scrollbar-thumb { background:rgba(0,212,255,0.25); border-radius:2px; }
      .lb-row { display:flex; align-items:center; gap:10px; padding:8px 10px; border-radius:var(--border-radius-md); margin-bottom:3px; transition:all 0.2s; border:1px solid transparent; }
      .lb-row:hover { background:var(--bg-surface); border-color:var(--border-color); }
      .lb-row.gold { background:linear-gradient(135deg, rgba(251,191,36,0.1), rgba(249,115,22,0.04)); border-color:rgba(251,191,36,0.2); }
      .lb-row.silver { background:linear-gradient(135deg, rgba(192,192,192,0.08), rgba(192,192,192,0.02)); border-color:rgba(192,192,192,0.15); }
      .lb-row.bronze { background:linear-gradient(135deg, rgba(205,127,50,0.08), rgba(205,127,50,0.02)); border-color:rgba(205,127,50,0.15); }
      .lb-rank { width:26px; height:26px; border-radius:6px; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:0.8rem; font-family:var(--font-display); background:var(--bg-surface); color:var(--text-secondary); flex-shrink:0; }
      .lb-row.gold .lb-rank { background:linear-gradient(135deg, #fbbf24, #f97316); color:#1a1a2e; }
      .lb-row.silver .lb-rank { background:linear-gradient(135deg, #c0c0c0, #808080); color:#1a1a2e; }
      .lb-row.bronze .lb-rank { background:linear-gradient(135deg, #cd7f32, #8b4513); color:#fff; }
      .lb-avatar { width:34px; height:34px; border-radius:50%; background:var(--color-primary-gradient); display:flex; align-items:center; justify-content:center; font-weight:700; color:#fff; font-size:0.85rem; flex-shrink:0; overflow:hidden; border:2px solid rgba(255,255,255,0.1); }
      .lb-avatar img { width:100%; height:100%; object-fit:cover; }
      .lb-name { flex:1; min-width:0; font-weight:500; font-size:0.85rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; color:var(--text-primary); }
      .lb-coins { font-family:var(--font-display); font-weight:700; color:var(--color-warning); font-size:0.9rem; display:flex; align-items:center; gap:3px; }
      .lb-row.gold .lb-coins { background:linear-gradient(135deg, #fbbf24, #f97316); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }
      .lb-crown { position:absolute; top:-4px; right:-4px; font-size:0.9rem; }
      .connect-status { display:flex; align-items:center; gap:6px; font-size:var(--text-xs); margin-top:8px; justify-content:center; }
      .status-dot { width:8px; height:8px; border-radius:50%; background:var(--text-muted); flex-shrink:0; }
      .status-dot.connecting { background:var(--color-warning); animation:blink 1s ease-in-out infinite; }
      .status-dot.connected { background:var(--color-success); box-shadow:0 0 8px rgba(34,214,94,0.5); }
      @keyframes blink { 0%,100%{opacity:1;} 50%{opacity:0.4;} }
      
      .chat-stream { height:60vh; overflow-y:auto; padding:var(--space-sm); display:flex; flex-direction:column; gap:6px; }
      .chat-stream::-webkit-scrollbar { width:4px; }
      .chat-stream::-webkit-scrollbar-thumb { background:rgba(0,212,255,0.25); border-radius:2px; }
      .chat-msg { display:flex; align-items:flex-start; gap:8px; padding:8px 10px; border-radius:var(--border-radius-md); background:var(--bg-surface); border-left:3px solid var(--color-primary); font-size:0.85rem; margin-bottom:4px; animation: chatIn 0.3s var(--ease-smooth, cubic-bezier(0.16,1,0.3,1)) backwards; }
      .chat-msg.gift { border-color:var(--color-warning); background:linear-gradient(135deg, rgba(251,191,36,0.06), rgba(249,115,22,0.02)); }
      .chat-msg.follow { border-color:var(--color-success); }
      .chat-msg .chat-gift-img { width:34px; height:34px; border-radius:6px; object-fit:contain; flex-shrink:0; background:rgba(0,0,0,0.3); }
      .chat-msg .chat-body { flex:1; min-width:0; }
      .chat-msg .chat-user { font-weight:600; color:var(--color-primary); font-size:0.8rem; }
      .chat-msg .chat-text { color:var(--text-secondary); margin-top:2px; word-break:break-word; }
      .chat-msg .chat-amount { color:var(--color-warning); font-weight:700; margin-left:4px; }
      @keyframes chatIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
      .empty-chat { text-align:center; color:var(--text-muted); padding:var(--space-xl); font-size:0.85rem; }

      .lb-stagger { animation: lbSlideIn 0.5s var(--ease-smooth, cubic-bezier(0.16,1,0.3,1)) backwards; }
      @keyframes lbSlideIn { from { opacity:0; transform:translateX(-20px); } to { opacity:1; transform:translateX(0); } }
      .lb-coins { transition:transform 0.4s var(--ease-spring, cubic-bezier(0.34,1.56,0.64,1)); display:inline-flex; align-items:center; gap:3px; }
      .lb-coins.bump { animation: coinsBump 0.6s var(--ease-spring, cubic-bezier(0.34,1.56,0.64,1)); }
      @keyframes coinsBump { 0%{transform:scale(1);} 40%{transform:scale(1.35);color:var(--color-warning);text-shadow:0 0 20px rgba(251,191,36,0.5);} 100%{transform:scale(1);} }
      
      @media (max-width: 1280px) { 
        .dash-grid { grid-template-columns: 1fr 1fr; }
        .dash-grid > div:first-child { grid-column: 1 / -1; }
      }
      @media (max-width: 900px) { 
        .dash-grid { grid-template-columns: 1fr; }
        .dash-card { padding:var(--space-md); }
        .chat-stream { height:40vh; }
        .lb-list { max-height:40vh; }
      }
      @media (max-width: 480px) {
        .dash-card { padding:var(--space-sm); }
        .stats-row { grid-template-columns:1fr; }
      }
    </style>

    <div class="dash-grid">
      <!-- COL LEFT: Connection + Controls + Manual + Stats -->
      <div style="display:flex;flex-direction:column;gap:var(--space-md)">

        <div class="dash-card">
          <div class="dash-card-title"><i class="fa-solid fa-wifi"></i> Conexión TikTok</div>
          <div style="position:relative;margin-bottom:8px">
            <input type="text" id="tiktokUser" class="input-field" placeholder="@usuario" style="width:100%;padding:10px 14px 10px 36px;background:var(--bg-input);border:1px solid var(--border-color);border-radius:var(--border-radius-sm);color:var(--text-primary);font-size:0.9rem">
            <span style="position:absolute;left:12px;top:50%;transform:translateY(-50%);color:var(--text-muted)"><i class="fa-solid fa-at" style="font-size:14px"></i></span>
          </div>
          <button class="btn ${ws && ws.readyState === WebSocket.OPEN ? 'btn-danger' : 'btn-primary'}" id="btnConnect" style="width:100%">
            <i class="fa-solid ${ws && ws.readyState === WebSocket.OPEN ? 'fa-link-slash' : 'fa-link'}"></i>
            ${ws && ws.readyState === WebSocket.OPEN ? 'Desconectar' : 'Conectar'}
          </button>
          <div id="connectionStatus" class="connect-status"><span class="status-dot"></span><span>Desconectado</span></div>
        </div>

        <div class="stats-row">
          <div class="stats-mini"><i class="fa-solid fa-coins cyan"></i><div class="num" id="statCoins">0</div><div class="lbl">Monedas</div></div>
          <div class="stats-mini"><i class="fa-solid fa-gift gold"></i><div class="num" id="statGifts">0</div><div class="lbl">Regalos</div></div>
          <div class="stats-mini"><i class="fa-solid fa-users green"></i><div class="num" id="statDonors">0</div><div class="lbl">Donantes</div></div>
          <div class="stats-mini"><i class="fa-solid fa-crown purple"></i><div class="num" id="statPlan">-</div><div class="lbl">Plan</div></div>
        </div>
      </div>

      <!-- COL CENTER: Live Chat + Atajos -->
      <div style="display:flex;flex-direction:column;gap:var(--space-md)">
        <div class="dash-card" style="flex:1;display:flex;flex-direction:column">
          <div class="dash-card-title"><i class="fa-solid fa-comment-dots"></i> Chat del Live</div>
          <div id="liveChatStream" class="chat-stream">
            <div class="empty-chat"><i class="fa-solid fa-plug" style="display:block;font-size:28px;margin-bottom:8px;opacity:0.3"></i>Conecta TikTok para ver el chat en vivo</div>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:var(--space-md)" id="quickActions">
          <a href="/app/actions" data-router-link class="stats-mini" style="text-decoration:none;cursor:pointer;display:block">
            <i class="fa-solid fa-bolt gold"></i><div class="num" style="font-size:var(--text-base)">Acciones</div><div class="lbl">Multi-paso</div>
          </a>
          <a href="/app/overlays" data-router-link class="stats-mini" style="text-decoration:none;cursor:pointer;display:block">
            <i class="fa-solid fa-layer-group cyan"></i><div class="num" style="font-size:var(--text-base)">Overlays</div><div class="lbl">15 disponibles</div>
          </a>
          <a href="/app/analytics" data-router-link class="stats-mini" style="text-decoration:none;cursor:pointer;display:block">
            <i class="fa-solid fa-chart-line purple"></i><div class="num" style="font-size:var(--text-base)">Analytics</div><div class="lbl">Estadísticas</div>
          </a>
        </div>
      </div>

      <!-- COL RIGHT: Leaderboard -->
      <div>
        <div class="dash-card">
          <div class="dash-card-title"><i class="fa-solid fa-ranking-star"></i> Top Donadores</div>
          <div id="leaderboardList" class="lb-list">
            <div class="empty-chat"><i class="fa-regular fa-face-smile" style="display:block;font-size:28px;margin-bottom:8px;opacity:0.3"></i>Esperando donaciones...</div>
          </div>
        </div>
      </div>
    </div>
  `;

  // ============ TIKTOK CONNECTION ============
  const connectBtn = document.getElementById('btnConnect');
  const statusEl = document.getElementById('connectionStatus');
  const tiktokUserInput = document.getElementById('tiktokUser');

  function setStatus(text, kind) {
    statusEl.innerHTML = `<span class="status-dot ${kind || ''}"></span><span>${text}</span>`;
  }

  function tryLoadSession() {
    const saved = localStorage.getItem('tiktok_user');
    if (saved) {
      tiktokUserInput.value = saved;
      setStatus(`@${saved} guardado`, '');
    }
  }
  tryLoadSession();

  function connectWS() {
    const username = tiktokUserInput.value.trim();
    if (!username) { setStatus('Ingresa un usuario', ''); return; }
    // Guardar usuario
    localStorage.setItem('tiktok_user', username);
    const accessToken = getAccessToken();
    if (!accessToken) {
      setStatus('Sesión expirada. Inicia sesión de nuevo.', '');
      return;
    }

    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    try {
      ws = new WebSocket(`${protocol}//${location.host}/live`);
    } catch (e) { setStatus('Error al conectar', ''); return; }

    setStatus('Conectando...', 'connecting');
    connectBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Conectando...';
    connectBtn.disabled = true;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'connect', uniqueId: username, channelId: userId, accessToken }));
      connectBtn.innerHTML = '<i class="fa-solid fa-link-slash"></i> Desconectar';
      connectBtn.className = 'btn btn-danger';
      connectBtn.disabled = false;
      setStatus(`Conectado a @${username}`, 'connected');
      toast?.showToast?.({ type: 'success', message: `Conectado a @${username}` });
    };

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        handleTikTokEvent(msg);
      } catch {}
    };

    ws.onclose = () => {
      connectBtn.innerHTML = '<i class="fa-solid fa-link"></i> Conectar';
      connectBtn.className = 'btn btn-primary';
      connectBtn.disabled = false;
      if (statusEl.textContent.includes('Conectado')) {
        setStatus('Desconectado', '');
      }
      ws = null;
    };

    ws.onerror = () => { setStatus('Error de conexión', ''); };
  }

  function disconnectWS() {
    if (ws) { ws.close(); }
  }

  connectBtn.addEventListener('click', () => {
    if (ws && ws.readyState === WebSocket.OPEN) disconnectWS();
    else connectWS();
  }, { signal });

  function handleTikTokEvent(msg) {
    const data = msg.data || {};
    const type = msg.type;
    if (type === 'gift' && data) {
      const dc = data.diamondCount || 0;
      const rc = data.repeatCount || 1;
      const coins = dc * rc;
      const uid = data.uniqueId || 'anon';
      const nick = data.nickname || uid;
      const giftName = data.giftName || 'Regalo';
      const giftId = data.giftId;

      // Leaderboard
      const existing = leaderboard.find(d => d.uid === uid);
      if (existing) { existing.coins += coins; existing.gifts += 1; }
      else leaderboard.push({ uid, nick, coins, gifts: 1, avatar: data.profilePictureUrl });

      renderLeaderboard();
      updateStats();

      // Chat
      const giftImg = GIFT_IMAGES[giftId] || '';
      pushChat({
        type: 'gift',
        user: nick,
        text: `envió ${giftName}`,
        amount: coins,
        giftId,
        avatar: data.profilePictureUrl
      });
    } else if (type === 'follow') {
      pushChat({ type: 'follow', user: data.nickname || data.uniqueId, text: 'empezó a seguirte' });
    } else if (type === 'share') {
      pushChat({ type: 'follow', user: data.nickname || data.uniqueId, text: 'compartió el live' });
    } else if (type === 'like') {
      pushChat({ type: '', user: data.nickname || data.uniqueId, text: `le dio like (${data.likeCount || 1})` });
    } else if (type === 'chat' || type === 'comment') {
      pushChat({ type: '', user: data.nickname || data.uniqueId, text: data.comment || data.message || '' });
    } else if (type === 'connected') {
      setStatus(`Conectado a @${data.uniqueId || ''}`, 'connected');
    } else if (type === 'disconnected' || type === 'streamEnd') {
      setStatus('Live desconectado', '');
      if (ws?.readyState === WebSocket.OPEN) ws.close();
    }
  }

  // ============ LEADERBOARD ============
  const lastLeaderboardSnapshot = [];
  function renderLeaderboard() {
    const list = document.getElementById('leaderboardList');
    if (!list) return;
    const sorted = [...leaderboard].sort((a, b) => b.coins - a.coins);
    if (sorted.length === 0) {
      list.innerHTML = '<div class="empty-chat"><i class="fa-regular fa-face-smile" style="display:block;font-size:28px;margin-bottom:8px;opacity:0.3"></i>Esperando donaciones...</div>';
      return;
    }
    const rankClass = ['gold', 'silver', 'bronze'];
    const previousCoins = new Map(lastLeaderboardSnapshot.map(d => [d.uid, d.coins]));
    list.innerHTML = sorted.slice(0, 50).map((d, i) => {
      const initial = (d.nick || d.uid || '?').charAt(0).toUpperCase();
      const rc = rankClass[i] || '';
      const avatar = d.avatar
        ? `<img src="${escapeAttr(d.avatar)}" onerror="this.style.display='none';this.parentNode.textContent='${initial}'">`
        : initial;
      const fromCoins = previousCoins.get(d.uid) || 0;
      const medal = i === 0 ? '<i class="fa-solid fa-crown" style="color:#fbbf24;position:absolute;top:-4px;right:-4px;font-size:14px"></i>' : '';
      return `<div class="lb-row ${rc} lb-stagger" data-coins="${d.coins}" data-from="${fromCoins}" style="position:relative">
        ${medal}
        <div class="lb-rank">${i + 1}</div>
        <div class="lb-avatar">${avatar}</div>
        <div class="lb-name">@${escapeHtml(d.nick || d.uid)}</div>
        <div class="lb-coins" data-count>${formatNum(d.coins)}</div>
      </div>`;
    }).join('');

    staggerChildren(list, 'lb-stagger', 50);

    const firstRow = list.querySelector('.lb-row');
    if (firstRow) {
      const target = parseInt(firstRow.dataset.coins, 10) || 0;
      const from = parseInt(firstRow.dataset.from, 10) || 0;
      const coinEl = firstRow.querySelector('[data-count]');
      if (coinEl && target !== from) {
        if (from > 0) {
          coinEl.textContent = formatNum(from);
          countUpAnimate(coinEl, formatNum(from), formatNum(target), 1000);
        }
        setTimeout(() => {
          coinEl.classList.remove('bump');
          void coinEl.offsetWidth;
          coinEl.classList.add('bump');
        }, from > 0 ? 100 : 0);
      }
    }

    lastLeaderboardSnapshot.length = 0;
    sorted.slice(0, 50).forEach(d => lastLeaderboardSnapshot.push({ ...d }));

    broadcast('leaderboard_update', { donors: sorted.slice(0, 10) });
  }

  function countUpAnimate(el, startText, endText, duration) {
    const startVal = parseInt(startText.replace(/[^\d]/g, ''), 10) || 0;
    const endVal = parseInt(endText.replace(/[^\d]/g, ''), 10) || 0;
    const start = performance.now();
    function frame(now) {
      const k = Math.min(1, (now - start) / duration);
      const ease = 1 - Math.pow(1 - k, 3);
      const v = Math.round(startVal + (endVal - startVal) * ease);
      el.textContent = formatNum(v);
      if (k < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  function updateStats() {
    const totalCoins = leaderboard.reduce((s, d) => s + d.coins, 0);
    const totalGifts = leaderboard.reduce((s, d) => s + d.gifts, 0);
    const donorsCount = leaderboard.length;
    const coinsEl = document.getElementById('statCoins');
    const giftsEl = document.getElementById('statGifts');
    const donorsEl = document.getElementById('statDonors');
    const prevCoins = parseInt(coinsEl.dataset.value || '0', 10) || 0;
    const prevGifts = parseInt(giftsEl.dataset.value || '0', 10) || 0;
    const prevDonors = parseInt(donorsEl.dataset.value || '0', 10) || 0;
    if (totalCoins !== prevCoins) {
      countUp(coinsEl, prevCoins, totalCoins, 1200);
      coinsEl.dataset.value = totalCoins;
    } else {
      coinsEl.textContent = formatNum(totalCoins);
    }
    if (totalGifts !== prevGifts) {
      countUp(giftsEl, prevGifts, totalGifts, 1200);
      giftsEl.dataset.value = totalGifts;
    } else {
      giftsEl.textContent = formatNum(totalGifts);
    }
    if (donorsCount !== prevDonors) {
      countUp(donorsEl, prevDonors, donorsCount, 800);
      donorsEl.dataset.value = donorsCount;
    } else {
      donorsEl.textContent = formatNum(donorsCount);
    }
  }

  // ============ LIVE CHAT ============
  function pushChat({ type, user, text, amount, giftId, avatar }) {
    liveChat.push({ type, user, text, amount, giftId, avatar, time: Date.now() });
    if (liveChat.length > 100) liveChat.shift();
    renderChat();
  }

  function renderChat() {
    const stream = document.getElementById('liveChatStream');
    if (!stream) return;
    if (liveChat.length === 0) {
      stream.innerHTML = '<div class="empty-chat"><i class="fa-solid fa-plug" style="display:block;font-size:28px;margin-bottom:8px;opacity:0.3"></i>Conecta TikTok para ver el chat en vivo</div>';
      return;
    }
    stream.innerHTML = liveChat.slice(-30).reverse().map(m => {
      let body = '';
      const giftSrc = m.giftId ? GIFT_IMAGES[m.giftId] : null;
      if (giftSrc) {
        body += `<img class="chat-gift-img" src="${escapeAttr(giftSrc)}" onerror="this.style.display='none'" alt="">`;
      }
      body += `<div class="chat-body"><span class="chat-user">@${escapeHtml(m.user || 'anon')}</span>`;
      if (m.amount) body += ` <span class="chat-amount">+${m.amount.toLocaleString()}</span>`;
      body += `<div class="chat-text">${escapeHtml(m.text || '')}</div></div>`;
      return `<div class="chat-msg ${m.type || ''}">${body}</div>`;
    }).join('');
    stream.scrollTop = 0;
  }

  // ============ BROADCAST ============
  function broadcast(type, payload) {
    try {
      const channel = new BroadcastChannel('tts_dashboard');
      channel.postMessage({ type, ...payload, ts: Date.now() });
      channel.close();
    } catch {}
  }

  // ============ HELPERS ============
  function escapeHtml(s) { return String(s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function escapeAttr(s) { return String(s || '').replace(/"/g, '&quot;'); }
  function staggerChildren(parent, cls, delay) {
    const children = parent.querySelectorAll('.' + cls);
    children.forEach((el, i) => { el.style.animationDelay = `${i * delay}ms`; });
  }

  // ============ LOAD GIFTS CATALOG ============
  try {
    const resp = await fetch('/gifts.json');
    if (resp.ok) {
      const data = await resp.json();
      for (const g of Object.values(data)) {
        if (g.id && g.image) GIFT_IMAGES[g.id] = g.image;
      }
    }
  } catch {}

  // ============ LOAD PLAN ============
  try {
    const plan = await api.get('/payments/plan-status', { signal });
    document.getElementById('statPlan').textContent = plan?.isActive ? 'Pro' : 'Free';
  } catch {}

  // attach magnetic hover to primary buttons
  document.querySelectorAll('.dash-card .btn-primary, .dash-card .btn-success, .dash-card .btn-danger').forEach(b => magneticButton(b));

  return () => {
    if (ws) try { ws.close(); } catch {}
  };
}
