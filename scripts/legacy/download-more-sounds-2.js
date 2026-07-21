/**
 * Script para descargar MÁS sonidos de Myinstants (batch 2)
 * Créditos: https://www.myinstants.com/
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const SOUNDS_DIR = path.join(__dirname, 'frontend', 'assets', 'sounds');
const METADATA_FILE = path.join(SOUNDS_DIR, 'sounds-metadata.json');
const DELAY_BETWEEN_REQUESTS = 1200;

const NEW_SOUNDS = [
  // === MEMES ===
  { name: 'du-bist-gut-genug', url: '/es/instant/du-bist-gut-genug-22336/', category: 'memes' },
  { name: 'what-a-good-boy', url: '/es/instant/what-a-good-boy-58925/', category: 'memes' },
  { name: 'gay-gay-gay-gay', url: '/es/instant/gay-gay-gay-gay-81081/', category: 'memes' },
  { name: 'spiderman-meme-song', url: '/es/instant/spiderman-meme-song-37638/', category: 'memes' },
  { name: 'ive-got-this-faaah', url: '/es/instant/ive-got-this-faaaaaaaaahhhhh-66795/', category: 'memes' },
  { name: 'the-nut-button', url: '/es/instant/the-nut-button-20451/', category: 'memes' },
  { name: 'windows-xp-error', url: '/es/instant/windows-xp-error/', category: 'memes' },
  { name: 'french-meme-song', url: '/es/instant/french-meme-song-55813/', category: 'memes' },
  { name: 'spongebob-boowomp', url: '/es/instant/spongebob-boowomp-96031/', category: 'memes' },
  { name: 'bing-chilling', url: '/es/instant/bing-chilling-44511/', category: 'memes' },
  { name: 'what-da-dog-doin', url: '/es/instant/what-da-dog-doin-35890/', category: 'memes' },
  { name: 'doge-bonk', url: '/es/instant/doge-bonk-84044/', category: 'memes' },
  { name: 'goofy-ahh-runnin', url: '/es/instant/goofy-ahh-runnin-25331/', category: 'memes' },
  { name: 'laughing-dog-meme', url: '/es/instant/laughing-dog-meme-78821/', category: 'memes' },
  { name: 'tom-and-jerry-scream', url: '/es/instant/tom-and-jerry-scream-71256/', category: 'memes' },
  { name: 'yourrage-laugh', url: '/es/instant/yourrage-laugh-89736/', category: 'memes' },
  { name: 'eww-brother-eww', url: '/es/instant/eww-brother-eww-60822/', category: 'memes' },
  { name: 'coffin-dance', url: '/es/instant/coffin-dance-meme-31063/', category: 'memes' },
  { name: 'auughhh', url: '/es/instant/auughhh-79002/', category: 'memes' },
  { name: 'nya-cat-girl', url: '/es/instant/nya-cat-girl-sound-95668/', category: 'memes' },

  // === EFFECTS ===
  { name: 'fart-button', url: '/es/instant/fart-button/', category: 'effects' },
  { name: 'dun-dun-dun', url: '/es/instant/dun-dun-dunnnnnnnn-68584/', category: 'effects' },
  { name: 'censor-beep', url: '/es/instant/censor-beep-1/', category: 'effects' },
  { name: 'smoke-detector-beep', url: '/es/instant/smoke-detector-beep-97430/', category: 'effects' },
  { name: 'prowler-sound', url: '/es/instant/prowler-sound-effect-83389/', category: 'effects' },
  { name: 'cartoon-slip', url: '/es/instant/cartoon-slip-89839/', category: 'effects' },
  { name: 'sudden-suspense', url: '/es/instant/sudden-suspense-64030/', category: 'effects' },
  { name: 'sparkleeeeeee', url: '/es/instant/sparkleeeeeee-19288/', category: 'effects' },
  { name: 'anime-punch', url: '/es/instant/anime-punch/', category: 'effects' },
  { name: 'thunder', url: '/es/instant/thunder-65237/', category: 'effects' },
  { name: 'wrong-answer-buzzer', url: '/es/instant/wrong-answer-buzzer-6983/', category: 'effects' },
  { name: 'pop-sfx', url: '/es/instant/pop-sfx-75405/', category: 'effects' },
  { name: 'danger-alarm', url: '/es/instant/danger-alarm-sound-effect-meme-98361/', category: 'effects' },
  { name: 'dial-up', url: '/es/instant/dial-up-sound-53214/', category: 'effects' },
  { name: 'cash-register', url: '/es/instant/cash-register/', category: 'effects' },
  { name: 'thx', url: '/es/instant/thx/', category: 'effects' },
  { name: 'wet-fart', url: '/es/instant/wet-fart-11093/', category: 'effects' },
  { name: 'family-feud-ding', url: '/es/instant/family-feud-yes-ding-24818/', category: 'effects' },

  // === NOTIFICATIONS ===
  { name: 'discord-notification', url: '/es/instant/discord-notification-38119/', category: 'notifications' },
  { name: 'youve-got-mail', url: '/es/instant/youve-got-mail/', category: 'notifications' },
  { name: 'gta-v-notification', url: '/es/instant/gta-v-notification-96319/', category: 'notifications' },
  { name: 'fnaf-balloon-boy', url: '/es/instant/fnaf-balloon-boy-hello-12102/', category: 'notifications' },

  // === GAMES ===
  { name: 'roblox-oof', url: '/es/instant/roblox-oof/', category: 'games' },
  { name: 'minecraft-level-up', url: '/es/instant/minecraft-level-up-sound/', category: 'games' },
  { name: 'minecraft-xp', url: '/es/instant/minecraft-xp-sound/', category: 'games' },
  { name: 'zelda-item-get', url: '/es/instant/zelda-item-get/', category: 'games' },
  { name: 'metal-gear-alert', url: '/es/instant/metal-gear-solid-alert/', category: 'games' },
  { name: 'fnaf-jumpscare', url: '/es/instant/fnaf-jumpscare-scream/', category: 'games' },
  { name: 'pikmin', url: '/es/instant/pikmin-69773/', category: 'games' },
  { name: 'perfect-street-fighter', url: '/es/instant/perfect-street-fighter-16558/', category: 'games' },
  { name: 'scary-maze-scream', url: '/es/instant/scary-maze-game-scream-sound-47386/', category: 'games' },

  // === MUSIC ===
  { name: 'jeopardy-theme', url: '/es/instant/jeopardy-theme-song-88152/', category: 'music' },
  { name: 'final-jeopardy', url: '/es/instant/final-jeopardy-thinking-music-31414/', category: 'music' },
  { name: 'mii-channel', url: '/es/instant/mii-channel-music-82732/', category: 'music' },
  { name: 'worlds-smallest-violin', url: '/es/instant/worlds-smallest-violin/', category: 'music' },
  { name: 'crickets-chirping', url: '/es/instant/crickets-chirping/', category: 'music' },
  { name: 'nokia-ringtone', url: '/es/instant/nokia-kick-ringtone-98192/', category: 'music' },
  { name: 'tuco-get-out', url: '/es/instant/tuco-get-out-30566/', category: 'music' },

  // === REACTIONS ===
  { name: 'michael-jackson-hee-hee', url: '/es/instant/michael-jackson-hee-hee-40277/', category: 'reactions' },
  { name: 'damn', url: '/es/instant/damn/', category: 'reactions' },
  { name: 'kids-cheering', url: '/es/instant/kids-cheering/', category: 'reactions' },
  { name: 'wrong-answer-gameshow', url: '/es/instant/wrong-answer-gameshow/', category: 'reactions' },

  // === ANIME ===
  { name: 'to-be-continued', url: '/es/instant/to-be-continued-jojo/', category: 'anime' },
  { name: 'tuturu', url: '/es/instant/tuturu/', category: 'anime' },
  { name: 're-zero-return-by-death', url: '/es/instant/re-zero-return-by-death-51511/', category: 'anime' },
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
  console.log('Descargador de Sonidos Batch #2 - Myinstants.com');
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
    
    // Ensure category directory exists
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
