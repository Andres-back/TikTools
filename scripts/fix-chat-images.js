/**
 * Script para diagnosticar y arreglar imágenes del chat
 * Uso: node scripts/fix-chat-images.js
 */

const path = require('path');
const fs = require('fs');
const db = require('../database/db');

async function fixChatImages() {
  console.log('🔍 Analizando imágenes del chat...\n');

  try {
    // Obtener todos los mensajes con imágenes
    const result = await db.query(
      `SELECT id, sender_id, image_url, created_at
       FROM messages
       WHERE image_url IS NOT NULL AND image_url != ''
       ORDER BY created_at DESC`
    );

    const messages = result.rows || result;
    console.log(`📊 Total de mensajes con imágenes: ${messages.length}\n`);

    let fixed = 0;
    let missing = 0;
    let ok = 0;

    for (const msg of messages) {
      const originalUrl = msg.image_url;
      let currentUrl = originalUrl;
      let needsUpdate = false;

      // Normalizar URL si no tiene el prefijo correcto
      if (!currentUrl.startsWith('/uploads/') && !currentUrl.startsWith('http')) {
        currentUrl = `/uploads/chat/${currentUrl}`;
        needsUpdate = true;
      }

      // Verificar si el archivo existe
      const filePath = path.join(__dirname, '..', currentUrl);
      const exists = fs.existsSync(filePath);

      if (needsUpdate && exists) {
        // Actualizar la base de datos
        await db.query(
          'UPDATE messages SET image_url = $1 WHERE id = $2',
          [currentUrl, msg.id]
        );
        console.log(`✅ Corregido: ${originalUrl} → ${currentUrl}`);
        fixed++;
      } else if (exists) {
        console.log(`✓ OK: ${currentUrl}`);
        ok++;
      } else {
        console.log(`❌ FALTA: ${currentUrl} (ID: ${msg.id})`);
        missing++;
      }
    }

    console.log(`\n📊 RESUMEN:`);
    console.log(`   ✅ Imágenes OK: ${ok}`);
    console.log(`   🔧 Imágenes corregidas: ${fixed}`);
    console.log(`   ❌ Imágenes faltantes: ${missing}`);

    if (missing > 0) {
      console.log(`\n⚠️  Hay ${missing} imágenes faltantes en el servidor.`);
      console.log(`   Opciones:`);
      console.log(`   1. Pedir al usuario que reenvíe las imágenes`);
      console.log(`   2. Eliminar referencias en la BD (opcional)`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

fixChatImages();
