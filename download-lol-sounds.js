/**
 * Script para descargar sonidos de League of Legends desde Myinstants
 * Créditos: https://www.myinstants.com/
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const SOUNDS_DIR = path.join(__dirname, 'frontend', 'assets', 'sounds');
const METADATA_FILE = path.join(SOUNDS_DIR, 'sounds-metadata.json');
const DELAY = 1200;

const LOL_SOUNDS = [
  // === ANUNCIOS DEL JUEGO ===
  { name: 'lol-first-blood', url: '/es/instant/first-blood-league-of-legends-30963/', category: 'games', desc: 'First Blood anuncio LoL' },
  { name: 'lol-double-kill', url: '/es/instant/league-of-legends-double-kill-1-80694/', category: 'games', desc: 'Double Kill anuncio' },
  { name: 'lol-triple-kill', url: '/es/instant/league-of-legends-trible-kill-1-33596/', category: 'games', desc: 'Triple Kill anuncio' },
  { name: 'lol-quadra-kill', url: '/es/instant/league-of-legends-quadra-kill-2-37555/', category: 'games', desc: 'Quadra Kill anuncio' },
  { name: 'lol-pentakill', url: '/es/instant/lol-announcer-pentakill/', category: 'games', desc: 'Pentakill anuncio' },
  { name: 'lol-legendary', url: '/es/instant/league-of-legends-legendary-kill-1-56473/', category: 'games', desc: 'Legendary kill streak' },
  { name: 'lol-ally-slain', url: '/es/instant/lol-an-ally-has-been-slain-76284/', category: 'games', desc: 'An ally has been slain' },
  { name: 'lol-defeat', url: '/es/instant/lol-defeat-95029/', category: 'games', desc: 'Derrota sonido LoL' },
  { name: 'lol-missing', url: '/es/instant/league-of-legends-missing-2964/', category: 'games', desc: 'Missing ping' },
  { name: 'lol-afk', url: '/es/instant/league-of-legends-afk-13202/', category: 'games', desc: 'AFK warning' },
  { name: 'lol-enemy-double', url: '/es/instant/lol-enemy-double-kill-49826/', category: 'games', desc: 'Enemy Double Kill' },
  { name: 'lol-enemy-triple', url: '/es/instant/lol-enemy-triple-kill-50500/', category: 'games', desc: 'Enemy Triple Kill' },
  { name: 'lol-enemy-quadra', url: '/es/instant/lol-enemy-quadra-kill-30918/', category: 'games', desc: 'Enemy Quadra Kill' },
  { name: 'lol-enemy-penta', url: '/es/instant/lol-enemy-penta-kill-38057/', category: 'games', desc: 'Enemy Pentakill' },

  // === VOCES DE CAMPEONES ===
  { name: 'yasuo-hasaki', url: '/es/instant/yasuo-hasaki/', category: 'games', desc: 'Yasuo HASAKI' },
  { name: 'yasuo-face-wind', url: '/es/instant/yasuo-face-the-wind/', category: 'games', desc: 'Yasuo FACE THE WIND' },
  { name: 'yasuo-ultimate', url: '/es/instant/yasuo-ultimate/', category: 'games', desc: 'Yasuo ultimate' },
  { name: 'yasuo-korean', url: '/es/instant/yasuo-ultimate-korean-voiceove/', category: 'games', desc: 'Yasuo ultimate Korean' },
  { name: 'lee-sin', url: '/es/instant/lee-sin/', category: 'games', desc: 'Lee Sin' },
  { name: 'mordekaiser', url: '/es/instant/mordekaiser/', category: 'games', desc: 'Mordekaiser' },
  { name: 'shaco', url: '/es/instant/shaco/', category: 'games', desc: 'Shaco' },
  { name: 'veigar-laugh', url: '/es/instant/veigar-laugh-363/', category: 'games', desc: 'Veigar laugh' },
  { name: 'jinx-panic', url: '/es/instant/jinx-everybody-panic-82713/', category: 'games', desc: 'Jinx Everybody Panic' },
  { name: 'alistar-milk', url: '/es/instant/you-cant-milk-those-alistar/', category: 'games', desc: 'Alistar You cant milk those' },
  { name: 'ahri-trust', url: '/es/instant/dont-you-trust-me-ahri-70472/', category: 'games', desc: 'Ahri Dont you trust me' },
  { name: 'teemo-captain', url: '/es/instant/capt-teemo-on-duty/', category: 'games', desc: 'Captain Teemo on duty' },
  { name: 'kogmaw', url: '/es/instant/kogmaw-tantantan/', category: 'games', desc: 'KogMaw tantantan' },
  { name: 'faker-what', url: '/es/instant/faker-what-was-that-move-11489/', category: 'memes', desc: 'Faker what was that move' },
  { name: 'seraphine', url: '/es/instant/seraphine-16405/', category: 'games', desc: 'Seraphine' },
];

function fetch(url) {
  return new Promise((resolve, reject) => {
    const options = { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36', 'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8', 'Accept-Language': 'es-ES,es;q=0.9', 'Accept-Encoding': 'identity' } };
    https.get(url, options, (res) => { let d = ''; res.on('data', c => d += c); res.on('end', () => resolve(d)); }).on('error', reject);
  });
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const options = { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'Referer': 'https://www.myinstants.com/' } };
    https.get(url, options, (res) => { res.pipe(file); file.on('finish', () => file.close(resolve)); }).on('error', (err) => { fs.unlink(dest, () => reject(err)); });
  });
}

async function getMp3Url(soundUrl) {
  try {
    const html = await fetch('https://www.myinstants.com' + soundUrl);
    const m = html.match(/data-url="([^"]+\.mp3)"/);
    if (m) return m[1].startsWith('http') ? m[1] : 'https://www.myinstants.com' + m[1];
    const a = html.match(/\/media\/sounds\/[^"'\s]+\.mp3/);
    if (a) return 'https://www.myinstants.com' + a[0];
    return null;
  } catch (e) { console.error(`Error: ${e.message}`); return null; }
}

async function downloadSound(sound, metadata) {
  const { name, url, category } = sound;
  const dir = path.join(SOUNDS_DIR, category);
  const mp3 = path.join(dir, `${name}.mp3`);
  if (fs.existsSync(mp3)) { console.log(`✓ ${name} ya existe`); return metadata; }
  console.log(`→ Descargando ${name}...`);
  const mp3Url = await getMp3Url(url);
  if (!mp3Url) { console.error(`✗ No se encontró URL MP3 para ${name}`); return metadata; }
  try {
    await downloadFile(mp3Url, mp3);
    console.log(`✓ ${name} descargado`);
    metadata.sounds.push({ id: name, name: name.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), file: `/assets/sounds/${category}/${name}.mp3`, category, source: 'https://www.myinstants.com' + url, credits: 'Myinstants.com' });
  } catch (e) { console.error(`✗ Error descargando ${name}: ${e.message}`); }
  return metadata;
}

function saveMetadata(metadata) {
  if (fs.existsSync(METADATA_FILE)) {
    try {
      const existing = JSON.parse(fs.readFileSync(METADATA_FILE, 'utf8'));
      if (existing.sounds && Array.isArray(existing.sounds)) {
        const ids = new Set(existing.sounds.map(s => s.id));
        metadata.sounds = [...existing.sounds, ...metadata.sounds.filter(s => !ids.has(s.id))];
      }
    } catch {}
  }
  metadata.lastUpdated = new Date().toISOString();
  metadata.totalSounds = metadata.sounds.length;
  fs.writeFileSync(METADATA_FILE, JSON.stringify(metadata, null, 2), 'utf8');
  console.log(`\n✓ Metadata guardada: ${metadata.totalSounds} sonidos`);
}

async function main() {
  console.log('='.repeat(60));
  console.log('Descargador de Sonidos de League of Legends - Myinstants');
  console.log('='.repeat(60));
  let metadata = { version: '1.0.0', source: 'https://www.myinstants.com/', credits: 'Sonidos proporcionados por Myinstants.com', license: 'Ver términos en https://www.myinstants.com/terms_of_use.html', lastUpdated: new Date().toISOString(), totalSounds: 0, sounds: [] };
  if (fs.existsSync(METADATA_FILE)) {
    try { const existing = JSON.parse(fs.readFileSync(METADATA_FILE, 'utf8')); metadata = { ...metadata, ...existing }; console.log(`✓ Metadata existente: ${metadata.totalSounds} sonidos\n`); } catch {}
  }
  console.log(`Descargando ${LOL_SOUNDS.length} sonidos de League...\n`);
  for (let i = 0; i < LOL_SOUNDS.length; i++) {
    const s = LOL_SOUNDS[i];
    console.log(`[${i + 1}/${LOL_SOUNDS.length}] ${s.desc}`);
    const dir = path.join(SOUNDS_DIR, s.category);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    metadata = await downloadSound(s, metadata);
    if (i < LOL_SOUNDS.length - 1) await new Promise(r => setTimeout(r, DELAY));
  }
  saveMetadata(metadata);
  console.log('\n' + '='.repeat(60));
  console.log('¡Descarga completada!');
  console.log(`Total: ${metadata.totalSounds} sonidos`);
  console.log('='.repeat(60));
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
