/**
 * Playwright Visual Audit — TikToolStream
 * Captura screenshots de todas las vistas y overlays para verificar UI.
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = 'http://localhost:8081';
const OUT = path.join(__dirname, 'screenshots');
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

const VIEWPORT = { width: 1920, height: 1080 };
const MOBILE_VIEWPORT = { width: 414, height: 896 };

const APP_VIEWS = [
  { route: '/app/login', name: '01-login' },
  { route: '/app/register', name: '02-register' },
  { route: '/app/dashboard', name: '03-dashboard', needsAuth: true },
  { route: '/app/overlays', name: '04-overlays', needsAuth: true },
  { route: '/app/actions', name: '05-actions', needsAuth: true },
  { route: '/app/auctions', name: '06-auctions', needsAuth: true },
  { route: '/app/roulette', name: '07-roulette', needsAuth: true },
  { route: '/app/timers', name: '08-timers', needsAuth: true },
  { route: '/app/goals', name: '09-goals', needsAuth: true },
  { route: '/app/sounds', name: '10-sounds', needsAuth: true },
  { route: '/app/chat', name: '11-chat', needsAuth: true },
  { route: '/app/chatbot', name: '12-chatbot', needsAuth: true },
  { route: '/app/songrequests', name: '13-songrequests', needsAuth: true },
  { route: '/app/analytics', name: '14-analytics', needsAuth: true },
  { route: '/app/integrations', name: '15-integrations', needsAuth: true },
  { route: '/app/payments', name: '16-payments', needsAuth: true },
  { route: '/app/profile', name: '17-profile', needsAuth: true },
  { route: '/app/settings', name: '18-settings', needsAuth: true },
];

const OVERLAYS = [
  { file: '/overlays/overlay-hype-arena.html', name: 'ov-hype-arena' },
  { file: '/overlays/overlay-chat.html', name: 'ov-chat' },
  { file: '/overlays/overlay-viewer-count.html', name: 'ov-viewer-count' },
  { file: '/overlays/overlay-uptime.html', name: 'ov-uptime' },
  { file: '/overlays/overlay-marquee.html', name: 'ov-marquee' },
  { file: '/overlays/overlay-recent-events.html', name: 'ov-recent-events' },
  { file: '/overlays/overlay-timer.html', name: 'ov-timer' },
  { file: '/overlays/overlay-goal.html', name: 'ov-goal' },
  { file: '/overlays/overlay-sounds.html', name: 'ov-sounds' },
  { file: '/overlays/overlay-tts.html', name: 'ov-tts' },
  { file: '/overlays/overlay-actions.html', name: 'ov-actions' },
  { file: '/overlays/overlay-generic.html', name: 'ov-leaderboard' },
  { file: '/overlays/overlay-ruleta.html', name: 'ov-ruleta' },
  { file: '/overlays/overlay-participantes.html', name: 'ov-participantes' },
  { file: '/overlays/overlay-timer-extendable.html', name: 'ov-timer-extendable' },
];

async function login(page) {
  try {
    await page.goto(`${BASE}/app/login`, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(1000);

    // Check if already logged in
    const url = page.url();
    if (!url.includes('login')) return true;

    // Try to find and fill login form
    const usernameInput = await page.$('input[type="text"], input[name="username"], input[placeholder*="usuario"], input[placeholder*="email"], #username, #email');
    const passwordInput = await page.$('input[type="password"], input[name="password"], #password');

    if (usernameInput && passwordInput) {
      await usernameInput.fill('admin');
      await passwordInput.fill('Admin123!');
      await page.waitForTimeout(500);

      // Click submit button
      const submitBtn = await page.$('button[type="submit"], .btn-primary');
      if (submitBtn) {
        await submitBtn.click();
        await page.waitForTimeout(3000);
        await page.waitForLoadState('networkidle').catch(() => {});
        console.log('✓ Logged in');
        return true;
      }
    }

    console.log('⚠ Could not find login form, trying direct navigation');
    return false;
  } catch (err) {
    console.log('⚠ Login error:', err.message);
    return false;
  }
}

async function captureView(page, view) {
  const url = `${BASE}${view.route}`;
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(1500); // Wait for animations/rendering
    const file = path.join(OUT, `${view.name}.png`);
    await page.screenshot({ path: file, fullPage: false });
    console.log(`✓ ${view.name}`);
    return true;
  } catch (err) {
    console.log(`✗ ${view.name}: ${err.message}`);
    return false;
  }
}

async function captureOverlay(page, overlay, mode) {
  const params = mode === 'mobile' ? '?mode=mobile' : '';
  const url = `${BASE}${overlay.file}${params}`;
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(1500);
    const suffix = mode === 'mobile' ? '-mobile' : '-pc';
    const file = path.join(OUT, `${overlay.name}${suffix}.png`);
    await page.screenshot({ path: file, fullPage: false });
    console.log(`✓ ${overlay.name} ${mode}`);
    return true;
  } catch (err) {
    console.log(`✗ ${overlay.name} ${mode}: ${err.message}`);
    return false;
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('Playwright Visual Audit — TikToolStream');
  console.log('='.repeat(60));

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: VIEWPORT });
  const page = await context.newPage();

  // Step 1: Login
  console.log('\n--- Login ---');
  await login(page);

  // Step 2: Capture app views
  console.log('\n--- App Views (1920×1080) ---');
  for (const view of APP_VIEWS) {
    await captureView(page, view);
  }

  // Step 3: Capture overlays — PC mode
  console.log('\n--- Overlays PC (1920×1080) ---');
  for (const overlay of OVERLAYS) {
    await captureOverlay(page, overlay, 'pc');
  }

  // Step 4: Capture overlays — Mobile mode
  console.log('\n--- Overlays Mobile (414×896) ---');
  await context.close();

  const mobileContext = await browser.newContext({
    viewport: MOBILE_VIEWPORT,
    deviceScaleFactor: 2,
    isMobile: true,
  });
  const mobilePage = await mobileContext.newPage();

  for (const overlay of OVERLAYS) {
    await captureOverlay(mobilePage, overlay, 'mobile');
  }

  await mobileContext.close();
  await browser.close();

  console.log('\n' + '='.repeat(60));
  console.log(`Screenshots saved to: ${OUT}`);
  console.log('='.repeat(60));
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
