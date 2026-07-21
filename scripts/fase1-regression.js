const http = require('http');
const { spawn } = require('child_process');
const path = require('path');

const PORT = 7891;
const BASE = `http://localhost:${PORT}`;
const ROOT = 'D:\\DEV\\TIKTOOLSTREAM';

const server = spawn('node', ['server-new.js'], {
  cwd: ROOT,
  env: { ...process.env, NODE_ENV: 'development', JWT_SECRET: 'fase1-test-2026', PORT: String(PORT) },
  stdio: 'pipe'
});

function request(url) {
  return new Promise((resolve) => {
    const req = http.get(`${BASE}${url}`, (res) => {
      let data = [];
      res.on('data', chunk => data.push(chunk));
      res.on('end', () => {
        const full = Buffer.concat(data);
        resolve({ status: res.statusCode, type: res.headers['content-type'] || 'none', size: full.length });
      });
    });
    req.on('error', (e) => resolve({ status: 'ERR', type: e.message, size: 0 }));
    req.setTimeout(5000, () => { req.destroy(); resolve({ status: 'TIMEOUT', type: '', size: 0 }); });
  });
}

async function main() {
  await new Promise(r => setTimeout(r, 6000));

  console.log('=== PRUEBAS DE REGRESIÓN FASE 1 ===\n');

  const tests = [
    // 1-4: Overlays funcionales (deben seguir funcionando)
    { url: '/overlays/overlay-timer.html', expect: 200, label: 'Overlay timer' },
    { url: '/overlays/overlay-generic.html', expect: 200, label: 'Overlay genérico' },
    { url: '/overlays/overlay-ruleta.html', expect: 200, label: 'Overlay ruleta' },
    { url: '/overlays/overlay-participantes.html', expect: 200, label: 'Overlay participantes' },

    // 5: /overlay/:userId ya no es ruta dedicada
    // Verificamos que la ruta no exista en server-new.js (no HTTP)
    { url: '/overlay/1', expect: 200, label: '/overlay/:userId → fallback (dedicada eliminada)' },

    // 6: El iframe debe cargar algo (no podemos verificar dentro del iframe desde HTTP)
    // Pero podemos verificar que la ruta a la que apunta el iframe ahora existe
    { url: '/overlays/overlay-timer.html', expect: 200, label: 'Iframe URL existe' },

    // 7: Links de ruleta
    { url: '/overlays/overlay-ruleta.html', expect: 200, label: 'Link ruleta en roulette.html' },
    { url: '/overlays/overlay-participantes.html', expect: 200, label: 'Link participantes en roulette.html' },

    // 8: Rutas antiguas funcionales de OBS
    { url: '/overlays/overlay-goal.html', expect: 200, label: 'OBS goal' },
    { url: '/overlays/overlay-sounds.html', expect: 200, label: 'OBS sounds' },
    { url: '/overlays/overlay-timer-extendable.html', expect: 200, label: 'OBS timer-extendable' },
    { url: '/overlays/overlay-actions.html', expect: 200, label: 'OBS actions' },
    { url: '/overlays/overlay-tts.html', expect: 200, label: 'OBS tts' },

    // 9: API health
    { url: '/api/health', expect: 200, label: 'API health' },

    // 10: Páginas principales
    { url: '/', expect: 200, label: 'Página principal' },
    { url: '/login.html', expect: 200, label: 'Login' },
    { url: '/admin.html', expect: 200, label: 'Admin' },
    { url: '/roulette.html', expect: 200, label: 'Ruleta' },

    // 11: Assets estáticos
    { url: '/main.js', expect: 200, label: 'main.js' },
    { url: '/styles.css', expect: 200, label: 'styles.css' },

    // 12: Rutas inexistentes (deben seguir en SPA fallback, no tocar)
    { url: '/dashboard', expect: 200, label: 'Dashboard (SPA fallback)' },
  ];

  let passed = 0;
  let failed = 0;
  const details = [];

  for (const t of tests) {
    const r = await request(t.url);
    const ok = r.status === t.expect;
    if (ok) passed++; else failed++;
    const status = ok ? '✅' : '❌';
    console.log(`${status} ${t.label}: ${r.status} (esperado ${t.expect})${ok ? '' : ' FALLÓ'}`);
    details.push({ ...t, actual: r.status, ok });
  }

  console.log(`\n=== RESULTADO: ${passed}/${tests.length} pasaron, ${failed} fallaron ===`);
  
  // Reglas específicas de validación
  console.log('\n=== VERIFICACIONES ESPECÍFICAS ===');
  console.log(`1. /overlays/overlay-timer.html → 200: ${details.find(d=>d.url==='/overlays/overlay-timer.html')?.actual}`);
  console.log(`2. /overlays/overlay-generic.html → 200: ${details.find(d=>d.url==='/overlays/overlay-generic.html')?.actual}`);
  console.log(`3. /overlays/overlay-ruleta.html → 200: ${details.find(d=>d.url==='/overlays/overlay-ruleta.html')?.actual}`);
  console.log(`4. /overlays/overlay-participantes.html → 200: ${details.find(d=>d.url==='/overlays/overlay-participantes.html')?.actual}`);
  console.log(`5. /overlay/:userId ya no es ruta dedicada: ${details.find(d=>d.url==='/overlay/1')?.actual}`);
  console.log(`6. Iframe URL apunta a archivo existente: ${details.find(d=>d.url==='/overlays/overlay-timer.html')?.actual}`);
  console.log(`7. Links ruleta existen: ${details.filter(d=>d.url.includes('overlay-ruleta')||d.url.includes('overlay-participantes')).every(d=>d.ok)}`);
  console.log(`8. OBS antiguas funcionales: ${details.filter(d=>d.url.startsWith('/overlays/') && d.url.includes('goal')||d.url.includes('sounds')).every(d=>d.ok)}`);
  console.log(`9. API health: ${details.find(d=>d.url==='/api/health')?.actual}`);
  console.log(`10. Páginas principales OK: ${['/','/login.html','/admin.html','/roulette.html'].every(u=>details.find(d=>d.url===u)?.ok)}`);
  console.log(`11. Assets estáticos OK: ${['/main.js','/styles.css'].every(u=>details.find(d=>d.url===u)?.ok)}`);
  console.log(`12. SPA fallback intacto (/dashboard → 200): ${details.find(d=>d.url==='/dashboard')?.actual}`);

  // Verificación adicional: la ruta dedicada NO existe en server-new.js
  const fs = require('fs');
  const serverCode = fs.readFileSync('server-new.js', 'utf8');
  const routeExists = serverCode.includes("'/overlay/:userId'");
  console.log(`\n5b. Ruta '/overlay/:userId' en server-new.js: ${routeExists ? '❌ AÚN EXISTE' : '✅ ELIMINADA'}`);
  if (routeExists) { console.log('❌ CRÍTICO: La ruta muerta no fue eliminada'); process.exit(1); }

  const allPass = details.filter(d => !d.ok).length === 0;
  console.log(`\n${allPass ? '✅ TODAS LAS PRUEBAS PASARON' : '❌ HAY PRUEBAS FALLIDAS'}`);

  server.kill();
  process.exit(allPass ? 0 : 1);
}

main();
