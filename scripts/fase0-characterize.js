const http = require('http');
const { execSync, spawn } = require('child_process');
const path = require('path');

const PORT = 7890;
const BASE = `http://localhost:${PORT}`;
const ROOT = 'D:\\DEV\\TIKTOOLSTREAM';

// Start server
const server = spawn('node', ['server-new.js'], {
  cwd: ROOT,
  env: { ...process.env, NODE_ENV: 'development', JWT_SECRET: 'fase0-test-2026', PORT: String(PORT) },
  stdio: 'pipe'
});

function request(url) {
  return new Promise((resolve) => {
    const req = http.get(`${BASE}${url}`, (res) => {
      let data = [];
      res.on('data', chunk => data.push(chunk));
      res.on('end', () => {
        const full = Buffer.concat(data);
        resolve({
          status: res.statusCode,
          type: res.headers['content-type'] || 'none',
          size: full.length,
          isHtml: full.includes(Buffer.from('<!DOCTYPE html')),
          isJson: res.headers['content-type']?.includes('json'),
          preview: full.slice(0, 200).toString().replace(/\n/g, ' ').trim()
        });
      });
    });
    req.on('error', (e) => resolve({ status: 'ERR', type: e.message, size: 0, isHtml: false, isJson: false, preview: '' }));
    req.setTimeout(5000, () => { req.destroy(); resolve({ status: 'TIMEOUT', type: '', size: 0, isHtml: false, isJson: false, preview: '' }); });
  });
}

async function main() {
  // Wait for server
  await new Promise(r => setTimeout(r, 6000));

  const urls = [
    '/',
    '/index.html',
    '/login.html',
    '/admin.html',
    '/roulette.html',
    '/verify-email.html',
    '/dashboard',
    '/register',
    '/payments',
    '/chat',
    '/overlays',
    '/overlay/1',
    '/overlay-timer.html',
    '/overlay-ruleta.html',
    '/overlay-participantes.html',
    '/overlays/overlay-timer.html',
    '/overlays/overlay-generic.html',
    '/overlays/overlay-goal.html',
    '/overlays/overlay-sounds.html',
    '/overlays/overlay-timer-extendable.html',
    '/overlays/overlay-actions.html',
    '/overlays/overlay-tts.html',
    '/overlays/overlay-ruleta.html',
    '/overlays/overlay-participantes.html',
    '/api/health',
    '/api/ruta-inexistente',
    '/assets/archivo-inexistente.js',
    '/main.js',
    '/modules/auth.js',
    '/styles.css',
    '/app-styles.css'
  ];

  console.log('========================================');
  console.log('FASE 0 — CARACTERIZACIÓN DE RUTAS');
  console.log(`Puerto: ${PORT}`);
  console.log('========================================\n');

  const results = [];
  for (const url of urls) {
    const r = await request(url);
    const htmlFlag = r.isHtml ? ' (HTML)' : '';
    const note = 
      r.status === 200 && r.isHtml && !['/','/index.html','/login.html','/admin.html','/roulette.html','/verify-email.html'].includes(url) && !url.startsWith('/overlays/') ? ' ⚠️ FALSO 200 (index.html)' :
      r.status === 200 && url.startsWith('/overlays/') ? ' ✅ Overlay real' :
      r.status === 404 && url.startsWith('/api/') ? ' ✅ JSON 404' :
      r.status === 200 && url === '/' ? ' ✅ Index.html' :
      r.status === 200 && ['.html','.js','.css','.png'].some(ext => url.endsWith(ext)) ? ' ✅ Archivo real' :
      r.status === 200 && url.startsWith('/overlay/') ? ' ⚠️ SPA fallback (no existe overlay.html)' :
      r.status === 200 && url.startsWith('/overlay-') && !url.startsWith('/overlays/') ? ' ⚠️ SPA fallback (no existe en raíz)' :
      '';
    
    console.log(`${url}`);
    console.log(`  → ${r.status} ${r.type} (${r.size} bytes)${htmlFlag}${note}`);
    console.log(`  → ${r.preview.substring(0, 120)}`);
    console.log('');
    results.push({ url, status: r.status, type: r.type, size: r.size, note });
  }

  console.log('========================================');
  console.log('RESUMEN');
  console.log('========================================');
  const ok = results.filter(r => r.status === 200 && !r.note.includes('⚠️')).length;
  const warning = results.filter(r => r.note.includes('⚠️')).length;
  const fail = results.filter(r => r.status !== 200).length;
  console.log(`✅ OK: ${ok} | ⚠️ Falsos/rotos: ${warning} | ❌ Fallos: ${fail}`);
  console.log('\n⚠️ Rutas problemáticas:');
  results.filter(r => r.note.includes('⚠️')).forEach(r => console.log(`  ${r.url}: ${r.note}`));

  server.kill();
  process.exit(0);
}

main();
