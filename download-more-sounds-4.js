/**
 * Script para descargar MÁS sonidos de Myinstants (batch 4)
 * Categorías: page 2 de memes, sound effects, recientes, trending
 * Créditos: https://www.myinstants.com/
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const SOUNDS_DIR = path.join(__dirname, 'frontend', 'assets', 'sounds');
const METADATA_FILE = path.join(SOUNDS_DIR, 'sounds-metadata.json');
const DELAY_BETWEEN_REQUESTS = 1200;

const NEW_SOUNDS = [
  { name: 'wilhelm-scream', url: '/es/instant/wilhelm-scream/', category: 'effects' },
  { name: 'explosion-meme', url: '/es/instant/explosion-meme-33169/', category: 'effects' },
  { name: 'extremely-loud-buzzer', url: '/es/instant/extremely-loud-incorrect-buzzer-43033/', category: 'effects' },
  { name: 'womp-womp-womp', url: '/es/instant/womp-womp-womp-55094/', category: 'effects' },
  { name: 'violin-screech', url: '/es/instant/violin-screech-meme-67456/', category: 'effects' },
  { name: 'camera-flash', url: '/es/instant/camera-flash-sound-effect-89976/', category: 'effects' },
  { name: 'mouse-click', url: '/es/instant/mouse-click-sound-63406/', category: 'effects' },
  { name: 'na-na-na', url: '/es/instant/na-na-na/', category: 'effects' },
  { name: 'mac-quack', url: '/es/instant/mac-quack-83896/', category: 'effects' },
  { name: 'bark-fart-sound', url: '/es/instant/bark-fart-sound-82395/', category: 'effects' },
  { name: 'aww', url: '/es/instant/aww/', category: 'reactions' },
  { name: 'rehehehe', url: '/es/instant/rehehehe-76246/', category: 'memes' },
  { name: 'pluh', url: '/es/instant/pluh-38652/', category: 'memes' },
  { name: 'pookie-bear', url: '/es/instant/pookie-bear-80/', category: 'memes' },
  { name: 'you-are-an-idiot', url: '/es/instant/you-are-an-idiot-42738/', category: 'memes' },
  { name: 'aayein-meme', url: '/es/instant/aayein-meme-98363/', category: 'memes' },
  { name: 'gutenmorgen', url: '/es/instant/gutenmorgen-8455/', category: 'memes' },
  { name: 'wow-anime-meme', url: '/es/instant/wow-anime-meme-55752/', category: 'anime' },
  { name: 'mario-jump', url: '/es/instant/mario-jump/', category: 'games' },
  { name: 'super-mario-death', url: '/es/instant/super-mario-death-23969/', category: 'games' },
  { name: 'minecraft-eating', url: '/es/instant/minecraft-eating-sound-39731/', category: 'games' },
  { name: 'iphone-notification', url: '/es/instant/iphone-notification-71441/', category: 'notifications' },
  { name: 'your-phone-ringing', url: '/es/instant/your-phone-ringing-52001/', category: 'notifications' },
  { name: 'discord-leave', url: '/es/instant/discord-leave-noise-46083/', category: 'notifications' },
  { name: 'windows-95-error', url: '/es/instant/windows-95-error-chord-wav-66536/', category: 'effects' },
  { name: 'windows-95-shutdown', url: '/es/instant/windows-95-shutdown-taaadddaaa-21368/', category: 'effects' },
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
  console.log('Descargador de Sonidos Batch #4 - Myinstants.com');
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
    
    const categoryDir = path.join(SOUNDS_DIR, sound.category);
    if (!fs.existsSync(categoryDir)) {
      fs.mkdirSync(categoryDir, { recursive: true });
    }
    
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
