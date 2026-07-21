/**
 * Script para descargar MÁS sonidos de Myinstants (batch 3)
 * Categorías: Movies, Television, Sports, Viral, Pranks, Recent
 * Créditos: https://www.myinstants.com/
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const SOUNDS_DIR = path.join(__dirname, 'frontend', 'assets', 'sounds');
const METADATA_FILE = path.join(SOUNDS_DIR, 'sounds-metadata.json');
const DELAY_BETWEEN_REQUESTS = 1200;

const NEW_SOUNDS = [
  // === MOVIES/TV ===
  { name: 'jaws-theme', url: '/es/instant/jaws-theme-20053/', category: 'movies' },
  { name: 'imperial-march', url: '/es/instant/imperial-march-star-wars/', category: 'movies' },
  { name: 'here-comes-the-money', url: '/es/instant/here-comes-the-money/', category: 'movies' },
  { name: 'x-files', url: '/es/instant/x-files/', category: 'movies' },
  { name: 'godzilla-roar', url: '/es/instant/godzilla-roar-2/', category: 'movies' },
  { name: 'tv-static', url: '/es/instant/tv-static/', category: 'movies' },
  { name: 'gong-sound', url: '/es/instant/gong-sound-27308/', category: 'movies' },
  { name: 'transformers', url: '/es/instant/transformers-transforming-3503/', category: 'movies' },
  { name: 'jojo-ayayay', url: '/es/instant/jojo-ayayay-40739/', category: 'movies' },
  { name: 'dune-scream', url: '/es/instant/dune-scream-56633/', category: 'movies' },
  { name: 'windows-xp-startup', url: '/es/instant/windows-xp-startup-sound-58970/', category: 'movies' },
  { name: 'damn-son', url: '/es/instant/damn-son-whered-ya-find-this/', category: 'movies' },
  { name: 'law-and-order-dun-dun', url: '/es/instant/law-and-order-dun-dun/', category: 'movies' },
  { name: 'noot-noot', url: '/es/instant/noot-noot-pingu-85062/', category: 'movies' },
  { name: 'lego-yoda-death', url: '/es/instant/lego-yoda-death-sound-58846/', category: 'games' },
  { name: 'super-mario-64-thwomp', url: '/es/instant/super-mario-64-thwomp/', category: 'games' },
  { name: 'cartoon-chase', url: '/es/instant/cartoon-chase-52579/', category: 'effects' },
  { name: 'spongebob-sad-song', url: '/es/instant/spongebob-sad-song-94002/', category: 'music' },
  { name: 'my-leg-fish', url: '/es/instant/my-leg-fish/', category: 'memes' },
  { name: 'que-miras-bobo', url: '/es/instant/que-miras-bobo-messi-18772/', category: 'memes' },

  // === SPORTS ===
  { name: 'finish-him', url: '/es/instant/finish-him/', category: 'games' },
  { name: 'among-us-emergency', url: '/es/instant/among-us-emergency-meeting-5844/', category: 'games' },
  { name: 'super-mario-pipe', url: '/es/instant/super-mario-pipe/', category: 'games' },
  { name: 'sitcom-laugh', url: '/es/instant/sitcom-laugh/', category: 'reactions' },
  { name: 'crowd-cheering', url: '/es/instant/crowd-cheering/', category: 'reactions' },
  { name: 'police-siren', url: '/es/instant/police-siren-75367/', category: 'effects' },
  { name: 'cartoon-jump', url: '/es/instant/cartoon-jump-80656/', category: 'effects' },
  { name: 'ka-ching', url: '/es/instant/ka-ching/', category: 'effects' },
  { name: 'coach-whistle', url: '/es/instant/coach-whistle-94622/', category: 'effects' },
  { name: 'boxing-bell', url: '/es/instant/boxing-bell/', category: 'effects' },
  { name: 'horse-neigh', url: '/es/instant/horse-neigh/', category: 'effects' },
  { name: 'whip', url: '/es/instant/whip/', category: 'effects' },
  { name: 'awkward-cricket', url: '/es/instant/awkward-cricket-74642/', category: 'effects' },
  { name: 'fbi-open-up', url: '/es/instant/fbi-open-up-with-explosion-491/', category: 'effects' },

  // === PRANKS ===
  { name: 'shocked-sound', url: '/es/instant/shocked-sound-37548/', category: 'effects' },
  { name: 'keyboard-typing', url: '/es/instant/keyboard-typing-sound-16012/', category: 'effects' },
  { name: 'goofy-yell', url: '/es/instant/goofy-yell/', category: 'effects' },
  { name: 'quack', url: '/es/instant/quackmp3/', category: 'effects' },
  { name: 'pew', url: '/es/instant/pew/', category: 'effects' },
  { name: 'censor-beep-3', url: '/es/instant/censor-beep-3/', category: 'effects' },
  { name: 'blood-splatter', url: '/es/instant/blood-splatter-55536/', category: 'effects' },
  { name: 'netflix-intro', url: '/es/instant/netflix-intro-79459/', category: 'music' },
  { name: 'tf2-critical-hit', url: '/es/instant/tf2-critical-hit-33843/', category: 'games' },
  { name: 'tf2-frying-pan', url: '/es/instant/tf2-frying-pan/', category: 'games' },
  { name: 'fnaf-2-scream', url: '/es/instant/fnaf-2-scream/', category: 'games' },
  { name: 'pizza-tower-taunt', url: '/es/instant/pizza-tower-taunt-50721/', category: 'games' },
  { name: 'ultra-instinct', url: '/es/instant/ultra-instinct-45647/', category: 'anime' },
  { name: 'japanese-yoooo', url: '/es/instant/japanese-yoooo/', category: 'memes' },
  { name: 'why-are-you-running', url: '/es/instant/why-are-you-running-15312/', category: 'memes' },
  { name: 'you-need-to-leave', url: '/es/instant/you-need-to-leave-11539/', category: 'reactions' },

  // === RECENT / MISC ===
  { name: 'miles-objection', url: '/es/instant/miles-objection-23786/', category: 'games' },
  { name: 'german-song', url: '/es/instant/german-song-10008/', category: 'music' },
  { name: 'i-carly-cheers', url: '/es/instant/icarly-cheers-86037/', category: 'reactions' },
  { name: 'clapping', url: '/es/instant/clapping/', category: 'reactions' },
  { name: 'love-island-text', url: '/es/instant/love-island-text-57720/', category: 'notifications' },
  { name: 'door-knocking-sfx', url: '/es/instant/door-knocking-sfx-96109/', category: 'effects' },
  { name: 'crowd-clap', url: '/es/instant/crowd-clap/', category: 'reactions' },
  { name: 'bass-drop', url: '/es/instant/bass-drop-sound-effect-87683/', category: 'effects' },
  { name: 'german-ringtone', url: '/es/instant/german-ringtone-call-22891/', category: 'notifications' },
  { name: 'nokia-arabic', url: '/es/instant/nokia-arabic-ringstone-97490/', category: 'music' },
  { name: 'old-spice-whistle', url: '/es/instant/old-spice-whistle-matthq/', category: 'music' },
  { name: 'yodel-goofy', url: '/es/instant/yodel-goofy-98204/', category: 'memes' },
  { name: 'youtube-subscribe', url: '/es/instant/youtube-subscribe-and-like-bell-sound-4900/', category: 'notifications' },
  { name: 'discord-calling', url: '/es/instant/discord-calling-8030/', category: 'notifications' },
  { name: 'what-the-hell', url: '/es/instant/what-the-hellllllllllll-17281/', category: 'memes' },
  { name: 'yoooooooooooo', url: '/es/instant/yoooooooooooo-60048/', category: 'memes' },
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
  console.log('Descargador de Sonidos Batch #3 - Myinstants.com');
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
