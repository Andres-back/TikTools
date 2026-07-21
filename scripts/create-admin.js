const bcrypt = require('bcryptjs');
const { initDatabase, query, closeDatabase } = require('../database/db');

(async () => {
  await initDatabase();
  const hash = await bcrypt.hash('Admin123!', 12);
  try {
    await query(
      "INSERT INTO users (username, email, password_hash, role, is_verified, plan_type, plan_days_remaining) VALUES ($1, $2, $3, 'admin', 1, 'premium', 365) ON CONFLICT DO NOTHING",
      ['admin', 'admin@gmail.com', hash]
    );
    console.log('✅ Admin created');
  } catch (e) {
    await query("UPDATE users SET role = 'admin', is_verified = 1, plan_type = 'premium' WHERE username = $1", ['admin']);
    console.log('✅ Admin updated');
  }
  const r = await query('SELECT id, username, role, is_verified FROM users WHERE username = $1', ['admin']);
  console.log(JSON.stringify(r.rows));
  await closeDatabase();
})();
