/**
 * One-off helper: copy the data from the old SQLite file into PostgreSQL.
 *
 *   npm install --no-save better-sqlite3        # only needed for this script (does not touch package.json)
 *   DATABASE_URL=postgresql://... npm run migrate:sqlite
 *   DATABASE_URL=postgresql://... npm run migrate:sqlite -- path/to/database.sqlite
 *   DATABASE_URL=postgresql://... npm run migrate:sqlite -- --force   # wipe the Postgres tables first
 *
 * Keep database.sqlite, database.sqlite-wal and database.sqlite-shm together in the same
 * folder: recent writes can still be sitting in the -wal file. The SQLite file is opened read-only.
 */
import fs from 'fs';
import path from 'path';
import { db, createSchema, closeDatabase } from '../db';

// Parents first so foreign keys (recharge_plans -> network_providers) are satisfied.
const TABLES: { name: string; pk: string[] }[] = [
  { name: 'admin_users', pk: ['id'] },
  { name: 'network_providers', pk: ['id'] },
  { name: 'recharge_plans', pk: ['id'] },
  { name: 'special_offers', pk: ['id'] },
  { name: 'customer_submissions', pk: ['id'] },
  { name: 'website_settings', pk: ['setting_key'] },
  { name: 'admin_audit_logs', pk: ['id'] },
  { name: 'recharge_orders', pk: ['id'] },
  { name: 'login_attempts', pk: ['ip'] },
  { name: 'payment_click_events', pk: ['id'] },
];

async function main() {
  const args = process.argv.slice(2);
  const force = args.includes('--force');
  const sqlitePath = path.resolve(args.find((a) => !a.startsWith('--')) || path.join('server', 'data', 'database.sqlite'));

  if (!fs.existsSync(sqlitePath)) {
    throw new Error(`SQLite file not found: ${sqlitePath}`);
  }

  const moduleName = 'better-sqlite3';
  let Database: any;
  try {
    Database = (await import(moduleName)).default;
  } catch {
    throw new Error('better-sqlite3 is not installed. Run: npm install --no-save better-sqlite3');
  }

  const sqlite = new Database(sqlitePath, { readonly: true, fileMustExist: true });
  console.log(`Reading from ${sqlitePath}`);

  await createSchema();

  if (!force) {
    for (const { name } of TABLES) {
      const row = await db.get<{ c: number }>(`SELECT COUNT(*) as c FROM ${name}`);
      if ((row?.c ?? 0) > 0) {
        throw new Error(`PostgreSQL table "${name}" already has data. Re-run with --force to wipe the tables first.`);
      }
    }
  }

  const summary: { table: string; sqlite: number; postgres: number }[] = [];

  await db.transaction(async (tx) => {
    if (force) {
      await tx.exec(`TRUNCATE TABLE ${TABLES.map((t) => t.name).join(', ')}`);
    }

    for (const { name, pk } of TABLES) {
      const sqliteCols: string[] = sqlite.prepare(`PRAGMA table_info(${name})`).all().map((c: any) => c.name);
      if (sqliteCols.length === 0) {
        console.log(`- ${name}: not present in SQLite file, skipped`);
        continue;
      }
      const pgCols = (
        await tx.all<{ column_name: string }>(
          `SELECT column_name FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = ?`,
          [name]
        )
      ).map((c) => c.column_name);
      const cols = sqliteCols.filter((c) => pgCols.includes(c));

      const rows: Record<string, unknown>[] = sqlite.prepare(`SELECT ${cols.map((c) => `"${c}"`).join(', ')} FROM ${name}`).all();

      const updateSet = cols.filter((c) => !pk.includes(c)).map((c) => `"${c}" = EXCLUDED."${c}"`).join(', ');
      const insertSql = `
        INSERT INTO ${name} (${cols.map((c) => `"${c}"`).join(', ')})
        VALUES (${cols.map(() => '?').join(', ')})
        ON CONFLICT (${pk.join(', ')}) DO ${updateSet ? `UPDATE SET ${updateSet}` : 'NOTHING'}
      `;

      for (const row of rows) {
        await tx.run(insertSql, cols.map((c) => row[c] ?? null));
      }

      const after = await tx.get<{ c: number }>(`SELECT COUNT(*) as c FROM ${name}`);
      summary.push({ table: name, sqlite: rows.length, postgres: after?.c ?? 0 });
    }
  });

  sqlite.close();
  console.log('\nMigration finished:');
  console.table(summary);
}

main()
  .then(async () => {
    await closeDatabase();
  })
  .catch(async (err) => {
    console.error('❌ Migration failed:', err.message || err);
    await closeDatabase().catch(() => undefined);
    process.exit(1);
  });
