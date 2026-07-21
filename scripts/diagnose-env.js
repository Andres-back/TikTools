/**
 * Script de Diagnóstico - Verificar Variables de Entorno
 * Ejecutar: node diagnose-env.js
 */

require('dotenv').config();

console.log('\n🔍 DIAGNÓSTICO DE VARIABLES DE ENTORNO\n');
console.log('='.repeat(60));

// Variables críticas
const criticalVars = {
  'NODE_ENV': process.env.NODE_ENV,
  'PORT': process.env.PORT,
  'HOST': process.env.HOST,
  'DATABASE_URL': process.env.DATABASE_URL ? '✓ Configurado' : '✗ NO CONFIGURADO',
  'JWT_SECRET': process.env.JWT_SECRET ? '✓ Configurado' : '✗ NO CONFIGURADO'
};

console.log('\n📋 Variables Críticas:\n');
for (const [key, value] of Object.entries(criticalVars)) {
  const status = value && value !== 'undefined' ? '✓' : '✗';
  console.log(`  ${status} ${key}: ${value || 'NO CONFIGURADO'}`);
}

// Verificar DATABASE_URL en detalle
if (process.env.DATABASE_URL) {
  console.log('\n🔗 Análisis de DATABASE_URL:\n');
  const url = process.env.DATABASE_URL;
  
  try {
    const parsedUrl = new URL(url.replace('postgresql://', 'postgres://'));
    console.log(`  ✓ Protocolo: ${parsedUrl.protocol}`);
    console.log(`  ✓ Host: ${parsedUrl.hostname}`);
    console.log(`  ✓ Puerto: ${parsedUrl.port}`);
    console.log(`  ✓ Database: ${parsedUrl.pathname.slice(1)}`);
    console.log(`  ✓ SSL Mode: ${url.includes('sslmode') ? url.match(/sslmode=(\w+)/)[1] : 'NO ESPECIFICADO'}`);
    
    if (!url.includes('sslmode=require')) {
      console.log('\n  ⚠️  ADVERTENCIA: sslmode=require no está en la URL');
      console.log('     Esto podría causar problemas de conexión SSL');
    }
  } catch (error) {
    console.log(`  ✗ Error al parsear URL: ${error.message}`);
  }
} else {
  console.log('\n❌ DATABASE_URL no configurado - La app usará SQLite (no recomendado en producción)');
}

// Verificar SSL config para pg
console.log('\n🔐 Configuración SSL:\n');
console.log('  El código está configurado para:');
console.log('  - rejectUnauthorized: false');
console.log('  - checkServerIdentity: () => undefined');
console.log('  Esto permite certificados auto-firmados (requerido para Digital Ocean)');

// Variables opcionales
const optionalVars = {
  'PAYPAL_CLIENT_ID': process.env.PAYPAL_CLIENT_ID,
  'PAYPAL_SECRET': process.env.PAYPAL_SECRET,
  'PAYPAL_MODE': process.env.PAYPAL_MODE,
  'CORS_ORIGIN': process.env.CORS_ORIGIN,
  'TIKTOK_SIGN_API_KEY': process.env.TIKTOK_SIGN_API_KEY
};

console.log('\n📦 Variables Opcionales:\n');
for (const [key, value] of Object.entries(optionalVars)) {
  const status = value ? '✓' : '○';
  console.log(`  ${status} ${key}: ${value ? 'Configurado' : 'No configurado (opcional)'}`);
}

// Resumen
console.log('\n' + '='.repeat(60));
const hasDatabase = !!process.env.DATABASE_URL;
const hasJWT = !!process.env.JWT_SECRET;
const isReady = hasDatabase && hasJWT;

if (isReady) {
  console.log('\n✅ CONFIGURACIÓN COMPLETA - La app está lista para producción\n');
} else {
  console.log('\n❌ CONFIGURACIÓN INCOMPLETA\n');
  if (!hasDatabase) {
    console.log('  ✗ Falta DATABASE_URL - Agrega la URL de PostgreSQL');
  }
  if (!hasJWT) {
    console.log('  ✗ Falta JWT_SECRET - Genera uno con: npm run generate:jwt');
  }
  console.log('');
}

// Test de conexión (opcional)
if (process.env.DATABASE_URL && process.argv.includes('--test-connection')) {
  console.log('🧪 Probando conexión a la base de datos...\n');
  
  const { Pool } = require('pg');
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false,
      checkServerIdentity: () => undefined
    }
  });
  
  pool.query('SELECT NOW()', (err, result) => {
    if (err) {
      console.log(`  ✗ Error de conexión: ${err.message}\n`);
    } else {
      console.log(`  ✓ Conexión exitosa! Timestamp: ${result.rows[0].now}\n`);
    }
    pool.end();
  });
}
