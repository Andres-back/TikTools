/**
 * Script para generar un JWT_SECRET seguro
 * Ejecutar: node generate-jwt-secret.js
 */

const crypto = require('crypto');

// Generar un secret de 64 caracteres hexadecimales (32 bytes)
const jwtSecret = crypto.randomBytes(32).toString('hex');

console.log('\n🔐 JWT Secret generado exitosamente:\n');
console.log(jwtSecret);
console.log('\n📝 Copia este valor y úsalo como JWT_SECRET en tus variables de entorno.');
console.log('\nEn Digital Ocean:');
console.log('1. Ve a tu App Settings');
console.log('2. Sección "App-Level Environment Variables"');
console.log('3. Agrega: JWT_SECRET=' + jwtSecret);
console.log('\nEn archivo .env (desarrollo local):');
console.log('JWT_SECRET=' + jwtSecret);
console.log('\n⚠️  IMPORTANTE: Nunca compartas este secret públicamente.\n');
