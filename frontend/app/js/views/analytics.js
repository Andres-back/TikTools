/**
 * Analytics View — TikToolStream
 * Premium analytics dashboard with SVG charts (vanilla, 0 dependencies)
 */

import { countUp, formatNum, magneticButton, staggerChildren } from '/app/js/core/visual-helpers.js';

export async function mount({ target, api, signal }) {
  const { showToast } = await import('/app/js/core/toast.js');

  function escapeHtml(s) { return String(s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

  target.innerHTML = `
    <style>
      .ana-head { margin-bottom:var(--space-lg); }
      .ana-head h1 { font-size:1.8rem; font-weight:800; background:linear-gradient(135deg, #00d9ff, #7b2ff7); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; margin-bottom:4px; }
      .ana-stats { display:grid; grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); gap:var(--space-sm); margin-bottom:var(--space-lg); }
      .ana-stat { background:linear-gradient(160deg, rgba(20,25,45,0.95), rgba(15,20,40,0.95)); border:1px solid rgba(255,255,255,0.08); border-radius:14px; padding:var(--space-md); position:relative; overflow:hidden; animation: cardIn 0.5s var(--ease-smooth) backwards; }
      .ana-stat:nth-child(1){animation-delay:0ms} .ana-stat:nth-child(2){animation-delay:80ms} .ana-stat:nth-child(3){animation-delay:160ms} .ana-stat:nth-child(4){animation-delay:240ms} .ana-stat:nth-child(5){animation-delay:320ms} .ana-stat:nth-child(6){animation-delay:400ms}
      @keyframes cardIn { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
      .ana-stat::before { content:''; position:absolute; top:0; left:0; right:0; height:1px; background:linear-gradient(90deg, transparent, var(--accent, rgba(0,217,255,0.4)), transparent); }
      .ana-stat .label { font-size:var(--text-xs); color:var(--text-muted); text-transform:uppercase; letter-spacing:1.5px; font-weight:600; margin-bottom:6px; }
      .ana-stat .value { font-size:2rem; font-weight:800; font-family:'Montserrat',sans-serif; }
      .ana-stat .sub { font-size:var(--text-xs); color:var(--text-muted); margin-top:4px; }
      .ana-stat.cyan { --accent: rgba(0,217,255,0.4); }
      .ana-stat.gold { --accent: rgba(255,215,0,0.4); }
      .ana-stat.pink { --accent: rgba(255,0,110,0.4); }
      .ana-stat.green { --accent: rgba(0,255,136,0.4); }
      .ana-stat.purple { --accent: rgba(139,92,246,0.4); }
      .ana-stat .value.cyan { background:linear-gradient(135deg, #00d9ff, #7b2ff7); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }
      .ana-stat .value.gold { background:linear-gradient(135deg, #ffd700, #ff6b00); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }
      .ana-stat .value.pink { background:linear-gradient(135deg, #ff006e, #8b5cf6); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }
      .ana-stat .value.green { background:linear-gradient(135deg, #00ff88, #00d9ff); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }
      .ana-stat .value.purple { background:linear-gradient(135deg, #8b5cf6, #ec4899); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }

      .ana-grid { display:grid; grid-template-columns:repeat(auto-fit, minmax(360px, 1fr)); gap:var(--space-md); }
      .ana-chart { background:linear-gradient(160deg, rgba(20,25,45,0.95), rgba(15,20,40,0.95)); border:1px solid rgba(255,255,255,0.08); border-radius:16px; padding:var(--space-md); position:relative; overflow:hidden; }
      .ana-chart::before { content:''; position:absolute; top:0; left:0; right:0; height:1px; background:linear-gradient(90deg, transparent, rgba(0,217,255,0.4), transparent); }
      .ana-chart h3 { font-size:var(--text-sm); text-transform:uppercase; letter-spacing:1.5px; color:var(--text-muted); margin-bottom:var(--space-md); font-weight:600; }
      .ana-chart .chart-svg { width:100%; height:200px; display:block; }
      .ana-chart .legend { display:flex; gap:14px; flex-wrap:wrap; margin-top:var(--space-sm); font-size:var(--text-xs); }
      .ana-chart .legend .item { display:flex; align-items:center; gap:6px; color:var(--text-secondary); }
      .ana-chart .legend .dot { width:10px; height:10px; border-radius:50%; }
      .ana-chart .top-list { display:flex; flex-direction:column; gap:8px; }
      .ana-chart .top-item { display:flex; align-items:center; gap:10px; padding:8px 10px; background:rgba(255,255,255,0.03); border-radius:10px; }
      .ana-chart .top-item .pos { font-weight:800; color:#ffd700; min-width:24px; }
      .ana-chart .top-item .name { flex:1; font-weight:600; font-size:var(--text-sm); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
      .ana-chart .top-item .val { color:#00d9ff; font-weight:700; font-size:var(--text-sm); }
      .ana-empty { text-align:center; color:var(--text-muted); padding:var(--space-lg); }
      .ana-loading { display:flex; justify-content:center; padding:var(--space-xl); }
    </style>

    <div class="ana-head">
      <h1>📊 Analytics</h1>
      <p style="color:var(--text-muted);font-size:var(--text-sm);margin:0">Resumen de tu actividad en TikToolStream</p>
    </div>

    <div class="ana-stats" id="anaStats"><div class="ana-loading"><div class="spinner"></div></div></div>
    <div class="ana-grid" id="anaGrid">
      <div class="ana-chart"><h3>📈 Monedas por día (últimos 14)</h3><div id="chartCoins"><div class="ana-loading"><div class="spinner-sm"></div></div></div></div>
      <div class="ana-chart"><h3>🎁 Regalos por día (últimos 14)</h3><div id="chartGifts"><div class="ana-loading"><div class="spinner-sm"></div></div></div></div>
      <div class="ana-chart"><h3>🏆 Top Donantes</h3><div id="topDonors"><div class="ana-loading"><div class="spinner-sm"></div></div></div></div>
      <div class="ana-chart"><h3>🎁 Top Regalos</h3><div id="topGifts"><div class="ana-loading"><div class="spinner-sm"></div></div></div></div>
    </div>
  `;

  /* SVG chart helpers */
  function drawLineChart(container, data, color, label) {
    if (!data || data.length === 0) {
      container.innerHTML = '<div class="ana-empty">Sin datos en los últimos 14 días</div>';
      return;
    }
    const W = 360, H = 200, P = 28;
    const max = Math.max(...data.map(d => d.value), 1);
    const min = Math.min(...data.map(d => d.value), 0);
    const range = max - min || 1;
    const stepX = (W - P * 2) / Math.max(1, data.length - 1);
    const points = data.map((d, i) => {
      const x = P + i * stepX;
      const y = H - P - ((d.value - min) / range) * (H - P * 2);
      return { x, y, value: d.value, label: d.label };
    });
    const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
    const area = path + ` L ${points[points.length - 1].x.toFixed(1)} ${H - P} L ${points[0].x.toFixed(1)} ${H - P} Z`;

    container.innerHTML = `
      <svg class="chart-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="g${color.replace('#','')}" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="${color}" stop-opacity="0.4"/>
            <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
          </linearGradient>
        </defs>
        ${[0, 1, 2, 3].map(i => `<line x1="${P}" y1="${P + i * (H - P * 2) / 3}" x2="${W - P}" y2="${P + i * (H - P * 2) / 3}" stroke="rgba(255,255,255,0.05)" stroke-width="1"/>`).join('')}
        <path d="${area}" fill="url(#g${color.replace('#','')})"/>
        <path d="${path}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="filter:drop-shadow(0 0 8px ${color}66)"/>
        ${points.map((p, i) => i % 2 === 0 ? `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3" fill="${color}"/>` : '').join('')}
        <text x="${P}" y="${H - 6}" fill="rgba(255,255,255,0.4)" font-size="9" font-family="monospace">${data[0]?.label || ''}</text>
        <text x="${W - P}" y="${H - 6}" fill="rgba(255,255,255,0.4)" font-size="9" font-family="monospace" text-anchor="end">${data[data.length-1]?.label || ''}</text>
        <text x="${W - P}" y="14" fill="${color}" font-size="11" font-weight="700" text-anchor="end">${label}: ${formatNum(data[data.length-1]?.value || 0)}</text>
      </svg>
    `;
  }

  function drawTopList(container, items, formatValue) {
    if (!items || items.length === 0) {
      container.innerHTML = '<div class="ana-empty">Sin datos aún</div>';
      return;
    }
    container.innerHTML = `<div class="top-list">${items.slice(0, 8).map((item, i) => {
      const name = item.name || item.uniqueId || item.gift_name || '—';
      const val = formatValue ? formatValue(item) : (item.coins || item.total_coins || 0);
      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`;
      return `<div class="top-item">
        <div class="pos">${medal}</div>
        <div class="name">@${escapeHtml(name)}</div>
        <div class="val">${formatNum(val)}</div>
      </div>`;
    }).join('')}</div>`;
  }

  /* compute from auctions data */
  async function loadAnalytics() {
    try {
      const auctions = await api.get('/auctions', { signal });
      const list = auctions?.auctions || auctions || [];
      const allDonors = new Map();
      const allGifts = new Map();
      let totalCoins = 0, totalGifts = 0, totalDonors = 0, active = 0, finished = 0;

      list.forEach(a => {
        totalCoins += a.total_coins_collected || 0;
        totalGifts += a.total_gifts_received || 0;
        totalDonors += a.unique_donors || 0;
        if (a.status === 'active') active++;
        if (a.status === 'finished') finished++;
      });

      /* get details from each auction */
      const allAuctionsDetail = await Promise.all(list.slice(0, 10).map(async a => {
        try {
          const d = await api.get(`/auctions/${a.id}`, { signal });
          return d;
        } catch { return null; }
      }));

      allAuctionsDetail.filter(Boolean).forEach(d => {
        (d.donors || []).forEach(dn => {
          const key = dn.tiktok_unique_id || dn.tiktok_nickname || 'unknown';
          const cur = allDonors.get(key) || { name: dn.tiktok_nickname || dn.tiktok_unique_id, coins: 0, gifts: 0 };
          cur.coins += dn.total_coins || 0;
          cur.gifts += dn.total_gifts || 0;
          allDonors.set(key, cur);
        });
        (d.gifts || []).forEach(g => {
          const key = g.gift_name || g.gift_id || 'unknown';
          const cur = allGifts.get(key) || { name: g.gift_name, coins: 0, count: 0 };
          cur.coins += g.total_coins || 0;
          cur.count += g.repeat_count || 1;
          allGifts.set(key, cur);
        });
      });

      /* render stats */
      const stats = document.getElementById('anaStats');
      stats.innerHTML = `
        <div class="ana-stat gold"><div class="label">💰 Monedas</div><div class="value gold" data-count="coins" data-value="${totalCoins}">0</div><div class="sub">Total recaudado</div></div>
        <div class="ana-stat pink"><div class="label">🎁 Regalos</div><div class="value pink" data-count="gifts" data-value="${totalGifts}">0</div><div class="sub">Total recibidos</div></div>
        <div class="ana-stat cyan"><div class="label">👥 Donantes</div><div class="value cyan" data-count="donors" data-value="${totalDonors}">0</div><div class="sub">Únicos</div></div>
        <div class="ana-stat green"><div class="label">🟢 Activas</div><div class="value green" data-count="active" data-value="${active}">0</div><div class="sub">${finished} finalizadas</div></div>
        <div class="ana-stat purple"><div class="label">🏆 Subastas</div><div class="value purple" data-count="total" data-value="${list.length}">0</div><div class="sub">Totales</div></div>
        <div class="ana-stat"><div class="label">📅 Promedio</div><div class="value">${list.length ? formatNum(Math.round(totalCoins / list.length)) : 0}</div><div class="sub">Monedas/subasta</div></div>
      `;

      stats.querySelectorAll('[data-count]').forEach(el => {
        const target = parseInt(el.dataset.value, 10) || 0;
        countUp(el, 0, target, 1400);
      });
      stats.querySelectorAll('.ana-stat').forEach(s => {
        s.addEventListener('mouseenter', () => {
          s.style.transform = 'translateY(-3px)';
          s.style.boxShadow = '0 12px 30px rgba(0,0,0,0.4)';
        });
        s.addEventListener('mouseleave', () => {
          s.style.transform = '';
          s.style.boxShadow = '';
        });
      });

      /* synthesize per-day data based on auction started_at */
      const days = 14;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const coinsByDay = [];
      const giftsByDay = [];
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const dayStart = d.getTime();
        const dayEnd = dayStart + 86400000;
        let dayCoins = 0, dayGifts = 0;
        list.forEach(a => {
          const t = new Date(a.started_at || 0).getTime();
          if (t >= dayStart && t < dayEnd) {
            dayCoins += a.total_coins_collected || 0;
            dayGifts += a.total_gifts_received || 0;
          }
        });
        const label = `${d.getDate()}/${d.getMonth() + 1}`;
        coinsByDay.push({ label, value: dayCoins });
        giftsByDay.push({ label, value: dayGifts });
      }

      drawLineChart(document.getElementById('chartCoins'), coinsByDay, '#ffd700', 'Total');
      drawLineChart(document.getElementById('chartGifts'), giftsByDay, '#ff006e', 'Total');

      /* top lists */
      const topDonorsArr = Array.from(allDonors.values()).sort((a, b) => b.coins - a.coins);
      drawTopList(document.getElementById('topDonors'), topDonorsArr);

      const topGiftsArr = Array.from(allGifts.values()).sort((a, b) => b.coins - a.coins);
      const giftsContainer = document.getElementById('topGifts');
      if (topGiftsArr.length === 0) {
        giftsContainer.innerHTML = '<div class="ana-empty">Sin regalos aún</div>';
      } else {
        const maxG = topGiftsArr[0]?.coins || 1;
        giftsContainer.innerHTML = `<div class="top-list">${topGiftsArr.slice(0, 8).map((g, i) => {
          const pct = (g.coins / maxG) * 100;
          return `<div class="top-item" style="flex-direction:column;align-items:stretch;gap:4px">
            <div style="display:flex;align-items:center;gap:8px;width:100%">
              <div class="pos" style="font-size:0.85rem;color:#ffd700;min-width:auto;width:24px;text-align:center">${i + 1}</div>
              <div class="name" style="font-size:0.9rem">🎁 ${escapeHtml(g.name)}</div>
              <div class="val">${formatNum(g.coins)}</div>
            </div>
            <div style="height:4px;background:rgba(255,255,255,0.06);border-radius:2px;overflow:hidden">
              <div style="height:100%;width:${pct}%;background:linear-gradient(90deg, #ff006e, #ffd700);border-radius:2px"></div>
            </div>
          </div>`;
        }).join('')}</div>`;
      }
    } catch (err) {
      console.error('Analytics error:', err);
      showToast({ type: 'error', message: 'Error al cargar analytics' });
    }
  }

  document.querySelectorAll('.ana-stat .btn, .ana-stat button').forEach(b => magneticButton(b));
  await loadAnalytics();
  // GSAP animate analytics
    if (typeof gsap !== 'undefined') requestAnimationFrame(() => {
      const stats = document.querySelectorAll('.ana-stat');
      if (stats.length) gsap.from(stats, { opacity: 0, y: 20, stagger: 0.06, duration: 0.4, ease: 'power2.out' });
      const charts = document.querySelectorAll('.ana-chart');
      if (charts.length) gsap.from(charts, { opacity: 0, y: 20, stagger: 0.08, duration: 0.4, ease: 'power2.out', delay: 0.2 });
    });
}
