const http = require('http');
const { spawn } = require('child_process');
const path = require('path');

const PORT = 7980;
const BASE = `http://localhost:${PORT}`;
const ROOT = 'D:\\DEV\\TIKTOOLSTREAM';

const server = spawn('node', ['server-new.js'], {
  cwd: ROOT,
  env: { ...process.env, NODE_ENV: 'development', JWT_SECRET: 'phase3-test', PORT: String(PORT), FEATURE_APP_SHELL_V1: 'true' },
  stdio: 'pipe'
});

function request(url) {
  return new Promise((resolve) => {
    const req = http.get(`${BASE}${url}`, (res) => {
      let d = [];
      res.on('data', c => d.push(c));
      res.on('end', () => resolve({ status: res.statusCode, size: Buffer.concat(d).length }));
    });
    req.on('error', e => resolve({ status: 'ERR', size: 0 }));
    req.setTimeout(5000, () => { req.destroy(); resolve({ status: 'TIMEOUT', size: 0 }); });
  });
}

async function main() {
  await new Promise(r => setTimeout(r, 6000));

  const tests = [
    // Core API and shell
    { url: '/api/health', label: 'API health', expect: 200 },
    { url: '/', label: 'Root redirect → /app', expect: 302 },
    { url: '/login.html', label: 'Login redirect → /app/login', expect: 301 },
    { url: '/roulette.html', label: 'Roulette redirect → /app/roulette', expect: 301 },
    { url: '/overlays/overlay-timer.html', label: 'OBS timer (legacy)', expect: 200 },

    // App shell routes
    { url: '/app', label: '/app redirect', expect: 301 },
    { url: '/app/dashboard', label: 'App dashboard', expect: 200 },
    { url: '/app/auctions', label: 'App auctions', expect: 200 },

    // App assets
    { url: '/app/js/app.js', label: 'App JS', expect: 200 },
    { url: '/app/js/router.js', label: 'Router JS', expect: 200 },
    { url: '/app/js/routes.js', label: 'Routes JS', expect: 200 },
    { url: '/app/js/views/dashboard.js', label: 'Dashboard view', expect: 200 },
    { url: '/app/js/views/not-found.js', label: '404 view', expect: 200 },
    { url: '/app/css/variables.css', label: 'Variables CSS', expect: 200 },
    { url: '/app/css/layout.css', label: 'Layout CSS', expect: 200 },
    { url: '/app/css/components.css', label: 'Components CSS', expect: 200 },

    // Nonexistent assets under /app/ must return 404, not shell
    { url: '/app/nonexistent.js', label: 'Nonexistent JS → 404', expect: 404 },
    { url: '/app/css/nonexistent.css', label: 'Nonexistent CSS → 404', expect: 404 },

    // API 404
    { url: '/api/nonexistent', label: 'API 404', expect: 404 },

    // Unknown route → 404 (no more global SPA fallback)
    { url: '/unknown-route', label: 'Unknown route → 404', expect: 404 },
  ];

  let passed = 0;
  let failed = 0;
  for (const t of tests) {
    const r = await request(t.url);
    const ok = r.status === t.expect;
    if (ok) passed++; else failed++;
    const note = ok ? '' : ` (expected ${t.expect}, got ${r.status})`;
    console.log(`${ok ? '✅' : '❌'} ${t.label}: ${r.status} ${r.size} bytes${note}`);
  }

  console.log(`\n${passed}/${tests.length} passed, ${failed} failed`);
  server.kill();
  process.exit(failed > 0 ? 1 : 0);
}

main();
