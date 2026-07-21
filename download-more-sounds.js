/**
 * Script para descargar más sonidos de Myinstants con URLs reales
 * Créditos: https://www.myinstants.com/
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const SOUNDS_DIR = path.join(__dirname, 'frontend', 'assets', 'sounds');
const METADATA_FILE = path.join(SOUNDS_DIR, 'sounds-metadata.json');
const DELAY_BETWEEN_REQUESTS = 1000;

// Sonidos reales de Myinstants con URLs válidas
const NEW_SOUNDS = [
  // Memes populares adicionales
  { name: 'faaah', url: '/es/instant/faaah-63455/', category: 'memes' },
  { name: 'chicken-screaming', url: '/es/instant/chicken-on-tree-screaming-53890/', category: 'memes' },
  { name: 'long-brain-fart', url: '/es/instant/long-brain-fart-60967/', category: 'memes' },
  { name: 'oh-hell-nah', url: '/es/instant/oh-my-god-bro-oh-hell-nah-man-42939/', category: 'memes' },
  { name: 'buzzer', url: '/es/instant/buzzer-89244/', category: 'effects' },
  { name: 'cat-laugh', url: '/es/instant/cat-laugh-meme-1-15761/', category: 'memes' },
  { name: 'gunshot-meme', url: '/es/instant/gunshottttt-97863/', category: 'effects' },
  { name: 'phone-ringing', url: '/es/instant/yo-phone-is-ringing-56694/', category: 'notifications' },
  { name: 'baby-laugh', url: '/es/instant/baby-laughing-meme-56428/', category: 'memes' },
  { name: 'fart-reverb', url: '/es/instant/fart-with-reverb-17715/', category: 'memes' },
  { name: 'yaaaaaaaay', url: '/es/instant/yaaaaaaaay/', category: 'memes' },
  { name: 'kwebbelkop-laugh', url: '/es/instant/kwebbelkop-laughing-or-smth-29291/', category: 'memes' },
  { name: 'meow', url: '/es/instant/m-e-o-w-82698/', category: 'effects' },
  { name: 'sad-meow', url: '/es/instant/sad-meow-song-88771/', category: 'memes' },
  { name: 'emotional-damage', url: '/es/instant/emotional-damage-meme-74555/', category: 'memes' },
  { name: 'goku-drip', url: '/es/instant/goku-drip-99617/', category: 'memes' },
  { name: 'oh-my-god', url: '/es/instant/oh-my-god-meme-88573/', category: 'memes' },
  { name: '67', url: '/es/instant/67-71609/', category: 'memes' },
  { name: 'gah-dayum', url: '/es/instant/gah-dayum-29041/', category: 'memes' },
  { name: 'run-vine', url: '/es/instant/run-vine/', category: 'memes' },
  { name: 'homer-barts', url: '/es/instant/homer-lets-the-barts-out-72599/', category: 'memes' },
  { name: 'elevator-music', url: '/es/instant/elevator-music-background-5865/', category: 'music' },
  { name: 'lizard-button', url: '/es/instant/lizard-button-12218/', category: 'memes' },
  { name: 'fart-louder', url: '/es/instant/fart-meme-sound-better-and-louder-32265/', category: 'memes' },
  { name: 'skibidi-toilet', url: '/es/instant/my-mommy-said-no-more-skibidi-toilet-45304/', category: 'memes' },
  { name: 'lobotomy', url: '/es/instant/lobotomy-sound-effect-98475/', category: 'memes' },
  { name: 'bad-to-the-bone', url: '/es/instant/bad-to-the-bone-meme-22189/', category: 'memes' },
  { name: 'what-bottom-text', url: '/es/instant/what-bottom-text-meme-sanctuary-guardian-s-24591/', category: 'memes' },
  { name: 'aaaaaaaa', url: '/es/instant/aaaaaaaaaaaaaaaaaaaa-e-lutador-57357/', category: 'memes' }
];

function fetch(url) {
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'es-ES,es;q=0.9',
        'Accept-Encoding': 'identity'
      }
    };

    https.get(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://www.myinstants.com/'
      }
    };

    https.get(url, options, (res) => {
      res.pipe(file);
      file.on('finish', () => {
        file.close(resolve);
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => reject(err));
    });
  });
}

async function getMp3Url(soundUrl) {
  try {
    const fullUrl = `https://www.myinstants.com${soundUrl}`;
    const html = await fetch(fullUrl);
    
    const mp3Match = html.match(/data-url="([^"]+\.mp3)"/);
    if (mp3Match) {
      const mp3Path = mp3Match[1];
      return mp3Path.startsWith('http') ? mp3Path : `https://www.myinstants.com${mp3Path}`;
    }
    
    const altMatch = html.match(/\/media\/sounds\/[^"'\s]+\.mp3/);
    if (altMatch) {
      return `https://www.myinstants.com${altMatch[0]}`;
    }
    
    return null;
  } catch (error) {
    console.error(`Error: ${error.message}`);
    return null;
  }
}

async function downloadSound(sound, metadata) {
  const { name, url, category } = sound;
  const categoryDir = path.join(SOUNDS_DIR, category);
  const mp3Path = path.join(categoryDir, `${name}.mp3`);
  
  if (fs.existsSync(mp3Path)) {
    console.log(`✓ ${name}.mp3 ya existe`);
    return metadata;
  }
  
  console.log(`→ Descargando ${name}...`);
  
  const mp3Url = await getMp3Url(url);
  if (!mp3Url) {
    console.error(`✗ No se encontró URL MP3 para ${name}`);
    return metadata;
  }
  
  try {
    await downloadFile(mp3Url, mp3Path);
    console.log(`✓ ${name}.mp3 descargado`);
    
    metadata.sounds.push({
      id: name,
      name: name.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      file: `/assets/sounds/${category}/${name}.mp3`,
      category: category,
      source: 'https://www.myinstants.com' + url,
      credits: 'Myinstants.com'
    });
    
  } catch (error) {
    console.error(`✗ Error descargando ${name}: ${error.message}`);
  }
  
  return metadata;
}

function saveMetadata(metadata) {
  if (fs.existsSync(METADATA_FILE)) {
    try {
      const existing = JSON.parse(fs.readFileSync(METADATA_FILE, 'utf8'));
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
  
  fs.writeFileSync(METADATA_FILE, JSON.stringify(metadata, null, 2), 'utf8');
  console.log(`\n✓ Metadata guardada: ${metadata.totalSounds} sonidos`);
}

async function main() {
  console.log('='.repeat(60));
  console.log('Descargador de Sonidos Adicionales - Myinstants.com');
  console.log('='.repeat(60));
  console.log();
  
  let metadata = {
    version: '1.0.0',
    source: 'https://www.myinstants.com/',
    credits: 'Sonidos proporcionados por Myinstants.com',
    license: 'Ver términos en https://www.myinstants.com/terms_of_use.html',
    lastUpdated: new Date().toISOString(),
    totalSounds: 0,
    sounds: []
  };
  
  if (fs.existsSync(METADATA_FILE)) {
    try {
      const existing = JSON.parse(fs.readFileSync(METADATA_FILE, 'utf8'));
      metadata = { ...metadata, ...existing };
      console.log(`✓ Metadata existente: ${metadata.totalSounds} sonidos\n`);
    } catch (error) {
      console.log('⚠ No se pudo cargar metadata existente\n');
    }
  }
  
  console.log(`Descargando ${NEW_SOUNDS.length} sonidos nuevos...\n`);
  
  for (let i = 0; i < NEW_SOUNDS.length; i++) {
    const sound = NEW_SOUNDS[i];
    console.log(`[${i + 1}/${NEW_SOUNDS.length}] ${sound.name}`);
    
    metadata = await downloadSound(sound, metadata);
    
    if (i < NEW_SOUNDS.length - 1) {
      await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_REQUESTS));
    }
  }
  
  saveMetadata(metadata);
  
  console.log('\n' + '='.repeat(60));
  console.log('¡Descarga completada!');
  console.log(`Total: ${metadata.totalSounds} sonidos`);
  console.log('='.repeat(60));
}

main().catch(error => {
  console.error('Error fatal:', error);
  process.exit(1);
});
