/**
 * Visual Helpers — TikToolStream
 * Premium effects (countUp, magnetic, particles) — vanilla, 0KB
 */

export function initVisualHelpers() {
  // auto-attach magnetic to all .btn-primary
  document.querySelectorAll('.btn-primary, .btn-success, .btn-danger').forEach(btn => {
    magneticButton(btn);
  });
}

/* ====== countUp vanilla (rAF) ====== */
export function countUp(el, from, to, duration = 1500) {
  if (!el) return;
  const start = performance.now();
  const diff = to - from;
  if (diff === 0) { el.textContent = formatNum(to); return; }
  function frame(now) {
    const elapsed = now - start;
    const k = Math.min(1, elapsed / duration);
    const ease = 1 - Math.pow(1 - k, 3);
    el.textContent = formatNum(Math.round(from + diff * ease));
    if (k < 1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

/* ====== format number with locale ====== */
export function formatNum(n) {
  return Number(n || 0).toLocaleString('es-ES');
}

/* ====== magnetic button hover effect ====== */
export function magneticButton(btn) {
  if (!btn || btn.dataset.magnetic === '1') return;
  btn.dataset.magnetic = '1';
  btn.style.transition = 'transform 0.2s ease-out';
  btn.addEventListener('mousemove', (e) => {
    const rect = btn.getBoundingClientRect();
    const x = (e.clientX - rect.left - rect.width / 2) * 0.25;
    const y = (e.clientY - rect.top - rect.height / 2) * 0.25;
    btn.style.transform = `translate(${x}px, ${y}px)`;
  });
  btn.addEventListener('mouseleave', () => {
    btn.style.transform = 'translate(0, 0)';
  });
}

/* ====== letter reveal (splitText-like) ====== */
export function letterReveal(el, text, stagger = 28) {
  if (!el) return;
  el.innerHTML = '';
  const chars = [...String(text || '')];
  chars.forEach((ch, i) => {
    const span = document.createElement('span');
    span.className = 'reveal-char';
    span.textContent = ch === ' ' ? '\u00A0' : ch;
    span.style.animationDelay = `${i * stagger}ms`;
    el.appendChild(span);
  });
}

/* ====== stagger animation (children appear sequentially) ====== */
export function staggerChildren(container, className = 'stagger-item', delay = 60) {
  if (!container) return;
  const items = container.children;
  for (let i = 0; i < items.length; i++) {
    items[i].style.animationDelay = `${i * delay}ms`;
    items[i].classList.add(className);
  }
}

/* ====== confetti vanilla (CSS particles + rAF) ====== */
export function spawnConfetti(x, y, count = 40, palette) {
  const colors = palette || ['#ff006e', '#00f5ff', '#8b5cf6', '#ffd700', '#00ff88', '#ff6b00'];
  for (let i = 0; i < count; i++) {
    const p = document.createElement('div');
    p.className = 'confetti-piece';
    p.style.left = (x - 5) + 'px';
    p.style.top = (y - 7) + 'px';
    p.style.background = colors[i % colors.length];
    p.style.borderRadius = i % 3 === 0 ? '50%' : '2px';
    document.body.appendChild(p);
    const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5;
    const dist = 200 + Math.random() * 280;
    const dx = Math.cos(angle) * dist;
    const dy = Math.sin(angle) * dist - 100;
    const rot = (Math.random() - 0.5) * 720;
    const dur = 1800 + Math.random() * 1200;
    const start = performance.now();
    function anim(now) {
      const k = Math.min(1, (now - start) / dur);
      const ease = 1 - Math.pow(1 - k, 2);
      const gravity = 300 * ease * ease;
      p.style.transform = `translate(${dx * ease}px, ${dy * ease + gravity}px) rotate(${rot * ease}deg)`;
      p.style.opacity = 1 - ease;
      if (k < 1) requestAnimationFrame(anim);
      else p.remove();
    }
    requestAnimationFrame(anim);
  }
}

/* ====== screen shake ====== */
export function screenShake(el, intensity = 1) {
  const target = el || document.body;
  target.style.animation = 'none';
  void target.offsetHeight;
  target.style.animation = `screenShake 0.5s ease-in-out`;
}
