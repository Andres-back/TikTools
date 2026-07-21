const http = require('http');
const { spawn } = require('child_process');

const PORT = 7894;
const BASE = `http://localhost:${PORT}`;

const server = spawn('node', ['server-new.js'], {
  cwd: 'D:\\DEV\\TIKTOOLSTREAM',
  env: { ...process.env, NODE_ENV: 'development', JWT_SECRET: 'fase2-test', PORT: String(PORT) },
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

  // Verificar server
  const h = await request('/api/health');
  if (h.status !== 200) { console.log('Server not responding'); server.kill(); process.exit(1); }
  console.log('Server OK\n');

  // Probar auth module adapter — verify it exports correctly
  // We can't test ES modules from Node easily, but we can test the server start + page load
  const tests = [
    { url: '/', label: 'Index page', expect: 200 },
    { url: '/login.html', label: 'Login page', expect: 200 },
    { url: '/admin.html', label: 'Admin page', expect: 200 },
    { url: '/roulette.html', label: 'Roulette page', expect: 200 },
    { url: '/modules/auth.js', label: 'Auth module (adapter)', expect: 200 },
    { url: '/modules/broadcast.js', label: 'Broadcast module (adapter)', expect: 200 },
    { url: '/shared/api.js', label: 'Shared API', expect: 200 },
    { url: '/shared/auth.js', label: 'Shared Auth', expect: 200 },
    { url: '/shared/ws.js', label: 'Shared WS', expect: 200 },
    { url: '/shared/sanitize.js', label: 'Shared Sanitize', expect: 200 },
    { url: '/shared/toast.js', label: 'Shared Toast', expect: 200 },
    { url: '/shared/event-bus.js', label: 'Shared EventBus', expect: 200 },
    { url: '/api/health', label: 'API Health', expect: 200 },
    { url: '/overlays/overlay-timer.html', label: 'Overlay timer', expect: 200 },
    { url: '/overlays/overlay-ruleta.html', label: 'Overlay ruleta', expect: 200 },
  ];

  let passed = 0;
  let failed = 0;
  for (const t of tests) {
    const r = await request(t.url);
    const ok = r.status === t.expect;
    if (ok) passed++; else failed++;
    console.log(`${ok ? '✅' : '❌'} ${t.label}: ${r.status} (expected ${t.expect})`);
  }

  console.log(`\n${passed}/${tests.length} passed, ${failed} failed`);
  server.kill();
  process.exit(failed > 0 ? 1 : 0);
}

main();
