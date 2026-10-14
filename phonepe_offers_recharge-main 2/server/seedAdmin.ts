import bcrypt from 'bcryptjs';
import { db, initDatabase, closeDatabase } from './db';

const username = process.argv[2] || 'admin';
const email = process.argv[3] || 'admin@phonepe-recharge.local';
const password = process.argv[4] || 'AdminPassword@2026!';

async function main() {
  console.log(`Setting up initial administrator: ${username} (${email})...`);

  // Make sure the tables exist (safe to run repeatedly)
  await initDatabase();

  const existing = await db.get<{ id: string }>('SELECT id FROM admin_users WHERE username = ? OR email = ?', [username, email]);
  const salt = bcrypt.genSaltSync(12);
  const passwordHash = bcrypt.hashSync(password, salt);
  const now = new Date().toISOString();

  if (existing) {
    await db.run(`
      UPDATE admin_users
      SET password_hash = ?, role = 'owner', status = 'active', updated_at = ?
      WHERE id = ?
    `, [passwordHash, now, existing.id]);
    console.log(`✅ Administrator '${username}' password and owner privileges updated successfully.`);
  } else {
    const id = 'admin-owner-' + Date.now();
    await db.run(`
      INSERT INTO admin_users (id, username, email, password_hash, role, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'owner', 'active', ?, ?)
    `, [id, username, email, passwordHash, now, now]);
    console.log(`✅ Created owner administrator '${username}' successfully.`);
  }

  console.log(`Credentials: Username: ${username} | Email: ${email}`);
}

main()
  .then(async () => {
    await closeDatabase();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error('❌ Failed to set up administrator:', err);
    await closeDatabase().catch(() => undefined);
    process.exit(1);
  });
