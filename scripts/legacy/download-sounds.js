/**
 * Script de descarga de sonidos desde Myinstants.com
 * Créditos: https://www.myinstants.com/
 * 
 * Uso: node download-sounds.js
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const SOUNDS_DIR = path.join(__dirname, 'frontend', 'assets', 'sounds');
const METADATA_FILE = path.join(SOUNDS_DIR, 'sounds-metadata.json');

// Rate limiting
const DELAY_BETWEEN_REQUESTS = 1000; // 1 segundo entre requests
const MAX_CONCURRENT_DOWNLOADS = 3;

// Categorías de Myinstants
const CATEGORIES = [
  { name: 'alerts', url: 'https://www.myinstants.com/es/categories/sound%20effects/' },
  { name: 'memes', url: 'https://www.myinstants.com/es/categories/memes/' },
  { name: 'effects', url: 'https://www.myinstants.com/es/categories/sound%20effects/' },
  { name: 'notifications', url: 'https://www.myinstants.com/es/categories/sound%20effects/' },
  { name: 'games', url: 'https://www.myinstants.com/es/categories/games/' },
  { name: 'music', url: 'https://www.myinstants.com/es/categories/music/' }
];

// Sonidos populares para descargar primero
const POPULAR_SOUNDS = [
  // Memes populares
  { name: 'vine-boom', url: '/es/instant/vine-boom-sound-70972/', category: 'memes' },
  { name: 'anime-wow', url: '/es/instant/anime-wow/', category: 'memes' },
  { name: 'bruh', url: '/es/instant/bruh/', category: 'memes' },
  { name: 'sad-violin', url: '/es/instant/sad-violin-the-meme-one/', category: 'memes' },
  { name: 'fart', url: '/es/instant/fart/', category: 'memes' },
  { name: 'rizz', url: '/es/instant/rizz-sound-effect-54189/', category: 'memes' },
  { name: 'spongebob-fail', url: '/es/instant/spongebob-fail-11236/', category: 'memes' },
  { name: 'dexter', url: '/es/instant/dexter-meme-26140/', category: 'memes' },
  { name: 'taco-bell', url: '/es/instant/taco-bell-bong-42481/', category: 'memes' },
  { name: 'galaxy', url: '/es/instant/galaxy-meme-18643/', category: 'memes' },
  { name: 'romance', url: '/es/instant/romanceeeeeeeeeeeeee-29042/', category: 'memes' },
  
  // Efectos de sonido
  { name: 'ding', url: '/es/instant/ding-sound-effect/', category: 'notifications' },
  { name: 'error', url: '/es/instant/error-soundss-25534/', category: 'alerts' },
  { name: 'undertaker-bell', url: '/es/instant/the-undertaker-bell-30938/', category: 'effects' },
  { name: 'metal-pipe', url: '/es/instant/metal-pipe-clang-80894/', category: 'effects' },
  { name: 'apple-pay', url: '/es/instant/apple-pay-45496/', category: 'notifications' },
  { name: 'bone-crack', url: '/es/instant/bone-crack-23901/', category: 'effects' },
  { name: 'punch', url: '/es/instant/punch-sound-86161/', category: 'effects' },
  
  // Videojuegos
  { name: 'fortnite-death', url: '/es/instant/death-sound-fortnite-13941/', category: 'games' },
  { name: 'among-us', url: '/es/instant/among-us-role-reveal-sound-34956/', category: 'games' },
  
  // Más memes populares
  { name: 'oh-no', url: '/es/instant/oh-no-tiktok/', category: 'memes' },
  { name: 'wow', url: '/es/instant/wow-sound-effect/', category: 'memes' },
  { name: 'laugh', url: '/es/instant/laugh-sound-effect/', category: 'memes' },
  { name: 'airhorn', url: '/es/instant/airhorn/', category: 'effects' },
  { name: 'cricket', url: '/es/instant/cricket-sound/', category: 'effects' },
  { name: 'applause', url: '/es/instant/applause/', category: 'effects' },
  { name: 'boo', url: '/es/instant/boo-sound/', category: 'memes' },
  { name: 'sadtrombone', url: '/es/instant/sad-trombone/', category: 'memes' },
  { name: 'success', url: '/es/instant/success-sound/', category: 'notifications' },
  { name: 'fail', url: '/es/instant/fail-sound/', category: 'memes' },
  
  // Notificaciones
  { name: 'notification-1', url: '/es/instant/notification-sound-1/', category: 'notifications' },
  { name: 'notification-2', url: '/es/instant/notification-sound-2/', category: 'notifications' },
  { name: 'alert-1', url: '/es/instant/alert-sound-1/', category: 'alerts' },
  { name: 'alert-2', url: '/es/instant/alert-sound-2/', category: 'alerts' },
  
  // Música y jingles
  { name: 'jingle-1', url: '/es/instant/jingle-sound-1/', category: 'music' },
  { name: 'jingle-2', url: '/es/instant/jingle-sound-2/', category: 'music' },
  { name: 'drumroll', url: '/es/instant/drum-roll/', category: 'music' },
  { name: 'cymbal', url: '/es/instant/cymbal-crash/', category: 'music' },
  
  // Más efectos
  { name: 'explosion', url: '/es/instant/explosion-sound/', category: 'effects' },
  { name: 'glass-break', url: '/es/instant/glass-breaking/', category: 'effects' },
  { name: 'sword', url: '/es/instant/sword-sound/', category: 'games' },
  { name: 'gunshot', url: '/es/instant/gunshot-sound/', category: 'games' },
  { name: 'car-crash', url: '/es/instant/car-crash/', category: 'effects' },
  
  // Voces y reacciones
  { name: 'yeah', url: '/es/instant/yeah-sound/', category: 'memes' },
  { name: 'no', url: '/es/instant/no-sound/', category: 'memes' },
  { name: 'yes', url: '/es/instant/yes-sound/', category: 'memes' },
  { name: 'hello', url: '/es/instant/hello-sound/', category: 'memes' },
  { name: 'goodbye', url: '/es/instant/goodbye-sound/', category: 'memes' }
];

/**
 * Realiza una petición HTTP/HTTPS
 */
function fetch(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    
    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
        'Accept-Encoding': 'identity',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Cache-Control': 'max-age=0'
      }
    };

    const req = client.get(url, options, (res) => {
      // Manejar redirecciones
      if (res.statusCode === 301 || res.statusCode === 302) {
        const redirectUrl = res.headers.location;
        console.log(`  → Redirect to: ${redirectUrl}`);
        fetch(redirectUrl).then(resolve).catch(reject);
        return;
      }
      
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (data.length === 0) {
          console.log(`  ⚠ Empty response from ${url}`);
        }
        resolve(data);
      });
    });
    
    req.on('error', (err) => {
      console.log(`  ✗ Request error: ${err.message}`);
      reject(err);
    });
    
    req.setTimeout(10000, () => {
      console.log(`  ✗ Request timeout`);
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

/**
 * Descarga un archivo y lo guarda
 */
function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const client = url.startsWith('https') ? https : http;
    
    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://www.myinstants.com/'
      }
    };

    client.get(url, options, (res) => {
      res.pipe(file);
      file.on('finish', () => {
        file.close(resolve);
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => reject(err));
    });
  });
}

/**
 * Extrae la URL del MP3 de la página del sonido
 */
async function getMp3Url(soundUrl) {
  try {
    const fullUrl = `https://www.myinstants.com${soundUrl}`;
    console.log(`  → Fetching: ${fullUrl}`);
    const html = await fetch(fullUrl);
    
    console.log(`  → HTML length: ${html.length}`);
    
    // Buscar URL del MP3 en data-url attribute
    const mp3Match = html.match(/data-url="([^"]+\.mp3)"/);
    if (mp3Match) {
      const mp3Path = mp3Match[1];
      const fullMp3Url = mp3Path.startsWith('http') ? mp3Path : `https://www.myinstants.com${mp3Path}`;
      console.log(`  ✓ Found MP3: ${fullMp3Url}`);
      return fullMp3Url;
    }
    
    // Alternativa: buscar cualquier mención de /media/sounds
    const altMatch = html.match(/\/media\/sounds\/[^"'\s]+\.mp3/);
    if (altMatch) {
      const fullMp3Url = `https://www.myinstants.com${altMatch[0]}`;
      console.log(`  ✓ Found MP3 (alt): ${fullMp3Url}`);
      return fullMp3Url;
    }
    
    console.log(`  ✗ No MP3 URL found in HTML`);
    return null;
  } catch (error) {
    console.error(`  ✗ Error:`, error.message);
    return null;
  }
}

/**
 * Descarga un sonido y actualiza metadata
 */
async function downloadSound(sound, metadata) {
  const { name, url, category } = sound;
  const categoryDir = path.join(SOUNDS_DIR, category);
  const mp3Path = path.join(categoryDir, `${name}.mp3`);
  
  // Verificar si ya existe
  if (fs.existsSync(mp3Path)) {
    console.log(`✓ ${name}.mp3 ya existe, saltando...`);
    return metadata;
  }
  
  console.log(`→ Descargando ${name}...`);
  
  // Obtener URL del MP3
  const mp3Url = await getMp3Url(url);
  if (!mp3Url) {
    console.error(`✗ No se encontró URL MP3 para ${name}`);
    return metadata;
  }
  
  // Descargar archivo
  try {
    await downloadFile(mp3Url, mp3Path);
    console.log(`✓ ${name}.mp3 descargado`);
    
    // Agregar a metadata
    metadata.sounds.push({
      id: name,
      name: name.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      file: `/assets/sounds/${category}/${name}.mp3`,
      category: category,
      source: 'https://www.myinstants.com' + url,
      credits: 'Myinstants.com'
    });
    
  } catch (error) {
    console.error(`✗ Error descargando ${name}:`, error.message);
  }
  
  return metadata;
}

/**
 * Guarda metadata en archivo JSON
 */
function saveMetadata(metadata) {
  // Cargar metadata existente si existe
  if (fs.existsSync(METADATA_FILE)) {
    try {
      const existing = JSON.parse(fs.readFileSync(METADATA_FILE, 'utf8'));
      // Preservar sonidos existentes
      if (existing.sounds && Array.isArray(existing.sounds)) {
        const existingIds = new Set(existing.sounds.map(s => s.id));
        const newSounds = metadata.sounds.filter(s => !existingIds.has(s.id));
        metadata.sounds = [...existing.sounds, ...newSounds];
      }
    } catch (error) {
      console.log('⚠ No se pudo cargar metadata existente');
    }
  }
  
  metadata.lastUpdated = new Date().toISOString();
  metadata.totalSounds = metadata.sounds.length;
  
  fs.writeFileSync(
    METADATA_FILE,
    JSON.stringify(metadata, null, 2),
    'utf8'
  );
  
  console.log(`\n✓ Metadata guardada: ${metadata.totalSounds} sonidos`);
}

/**
 * Función principal
 */
async function main() {
  console.log('='.repeat(60));
  console.log('Descargador de Sonidos - Myinstants.com');
  console.log('Créditos: https://www.myinstants.com/');
  console.log('='.repeat(60));
  console.log();
  
  // Inicializar metadata
  let metadata = {
    version: '1.0.0',
    source: 'https://www.myinstants.com/',
    credits: 'Sonidos proporcionados por Myinstants.com',
    license: 'Ver términos en https://www.myinstants.com/terms_of_use.html',
    lastUpdated: new Date().toISOString(),
    totalSounds: 0,
    sounds: []
  };
  
  // Cargar metadata existente si existe
  if (fs.existsSync(METADATA_FILE)) {
    try {
      const existing = JSON.parse(fs.readFileSync(METADATA_FILE, 'utf8'));
      metadata = { ...metadata, ...existing };
      console.log(`✓ Metadata existente cargada: ${metadata.totalSounds} sonidos\n`);
    } catch (error) {
      console.log('⚠ No se pudo cargar metadata existente, empezando desde cero\n');
    }
  }
  
  // Descargar sonidos populares
  console.log(`Descargando ${POPULAR_SOUNDS.length} sonidos populares...\n`);
  
  for (let i = 0; i < POPULAR_SOUNDS.length; i++) {
    const sound = POPULAR_SOUNDS[i];
    console.log(`[${i + 1}/${POPULAR_SOUNDS.length}]`, sound.name);
    
    metadata = await downloadSound(sound, metadata);
    
    // Rate limiting
    if (i < POPULAR_SOUNDS.length - 1) {
      await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_REQUESTS));
    }
  }
  
  // Guardar metadata final
  saveMetadata(metadata);
  
  console.log('\n' + '='.repeat(60));
  console.log('¡Descarga completada!');
  console.log(`Total: ${metadata.totalSounds} sonidos`);
  console.log('='.repeat(60));
}

// Ejecutar
main().catch(error => {
  console.error('Error fatal:', error);
  process.exit(1);
});
