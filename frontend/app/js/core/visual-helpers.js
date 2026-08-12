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

/* ====== GSAP Animation Helpers ====== */

/**
 * Animate page enter with stagger — cards, stats, list items
 * @param {HTMLElement} container - parent element
 * @param {string|string[]} selectors - CSS selector(s) for children to animate
 * @param {object} opts - { stagger, duration, ease, from, y, x, scale, rotation }
 */
export function gsapStaggerIn(container, selectors = '.gsap-stagger > *', opts = {}) {
  if (typeof gsap === 'undefined') return;
  const defaults = { stagger: 0.05, duration: 0.5, ease: 'power3.out', y: 24, opacity: 0 };
  const cfg = { ...defaults, ...opts };
  const targets = typeof selectors === 'string'
    ? container.querySelectorAll(selectors)
    : selectors;
  if (!targets || targets.length === 0) return;
  gsap.set(targets, { opacity: 0, y: cfg.y });
  gsap.to(targets, {
    opacity: 1, y: 0,
    duration: cfg.duration,
    stagger: cfg.stagger,
    ease: cfg.ease,
    overwrite: 'auto'
  });
}

/**
 * Animate a single element entrance
 */
export function gsapFadeIn(el, opts = {}) {
  if (typeof gsap === 'undefined' || !el) return;
  const defaults = { duration: 0.6, ease: 'power2.out', y: 20 };
  const cfg = { ...defaults, ...opts };
  gsap.fromTo(el, { opacity: 0, y: cfg.y }, { opacity: 1, y: 0, duration: cfg.duration, ease: cfg.ease });
}

/**
 * Number count-up using GSAP
 */
export function gsapCountUp(el, from = 0, to, duration = 1.2) {
  if (typeof gsap === 'undefined' || !el) return;
  if (from === to) { el.textContent = formatNum(to); return; }
  const obj = { val: from };
  gsap.to(obj, {
    val: to,
    duration,
    ease: 'power2.out',
    onUpdate: () => { el.textContent = formatNum(Math.round(obj.val)); }
  });
}

/**
 * Pulse glow animation
 */
export function gsapPulse(el, duration = 1.5) {
  if (typeof gsap === 'undefined' || !el) return;
  gsap.to(el, {
    scale: 1.04,
    duration: duration / 2,
    ease: 'power1.inOut',
    yoyo: true,
    repeat: -1
  });
}

/**
 * Magnetic hover effect using GSAP
 */
export function gsapMagnetic(btn) {
  if (typeof gsap === 'undefined' || !btn || btn.dataset.gsapMag) return;
  btn.dataset.gsapMag = '1';
  btn.addEventListener('mousemove', (e) => {
    const rect = btn.getBoundingClientRect();
    const x = (e.clientX - rect.left - rect.width / 2) * 0.3;
    const y = (e.clientY - rect.top - rect.height / 2) * 0.3;
    gsap.to(btn, { x, y, duration: 0.3, ease: 'power2.out', overwrite: 'auto' });
  });
  btn.addEventListener('mouseleave', () => {
    gsap.to(btn, { x: 0, y: 0, duration: 0.4, ease: 'elastic.out(1, 0.3)' });
  });
}

/**
 * Stagger reveal for cards/lists
 */
export function gsapRevealCards(container, opts = {}) {
  if (typeof gsap === 'undefined' || !container) return;
  const cards = container.children;
  if (!cards || cards.length === 0) return;
  const cfg = { stagger: 0.06, duration: 0.5, ease: 'power3.out', y: 30, scale: 0.95 };
  Object.assign(cfg, opts);
  gsap.set(cards, { opacity: 0, y: cfg.y, scale: cfg.scale });
  gsap.to(cards, {
    opacity: 1, y: 0, scale: 1,
    duration: cfg.duration,
    stagger: cfg.stagger,
    ease: cfg.ease,
    overwrite: 'auto'
  });
}
