import 'dotenv/config';
import { Pool, types, type PoolClient } from 'pg';
import bcrypt from 'bcryptjs';

// pg returns BIGINT (OID 20) as a string by default. COUNT(*) and the
// epoch-millisecond columns in login_attempts are BIGINT, so parse them as numbers.
types.setTypeParser(20, (value: string) => parseInt(value, 10));

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error(
    'DATABASE_URL is not set. Example: postgresql://user:password@localhost:5432/phonepe_recharge'
  );
}

// SSL is on by default for remote databases (Render, Supabase, Neon...) and off for localhost.
// Override with DATABASE_SSL=true|false.
const isLocalDatabase = /@(localhost|127\.0\.0\.1|\[::1\])(:|\/|$)/.test(connectionString);
const sslEnabled = process.env.DATABASE_SSL ? process.env.DATABASE_SSL === 'true' : !isLocalDatabase;

export const pool = new Pool({
  connectionString,
  ssl: sslEnabled ? { rejectUnauthorized: false } : undefined,
  max: Number(process.env.DB_POOL_MAX) || 10,
});

pool.on('error', (err) => {
  console.error('[DB] Unexpected error on idle PostgreSQL client:', err);
});

type Params = unknown[];

// Queries in this codebase are written with `?` placeholders; PostgreSQL wants $1, $2, ...
function toPgPlaceholders(sql: string): string {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

function createApi(executor: Pool | PoolClient) {
  return {
    /** Run a query and return every row. */
    async all<T = any>(sql: string, params: Params = []): Promise<T[]> {
      const result = await executor.query(toPgPlaceholders(sql), params as any[]);
      return result.rows as T[];
    },
    /** Run a query and return the first row (or undefined). */
    async get<T = any>(sql: string, params: Params = []): Promise<T | undefined> {
      const result = await executor.query(toPgPlaceholders(sql), params as any[]);
      return result.rows[0] as T | undefined;
    },
    /** Run INSERT / UPDATE / DELETE and return the affected row count. */
    async run(sql: string, params: Params = []): Promise<{ changes: number }> {
      const result = await executor.query(toPgPlaceholders(sql), params as any[]);
      return { changes: result.rowCount ?? 0 };
    },
    /** Run one or more raw statements (no parameters), e.g. schema DDL. */
    async exec(sql: string): Promise<void> {
      await executor.query(sql);
    },
  };
}

export type DbApi = ReturnType<typeof createApi>;

export const db = {
  ...createApi(pool),
  /** Run `fn` inside a BEGIN / COMMIT block; rolls back if `fn` throws. */
  async transaction<T>(fn: (tx: DbApi) => Promise<T>): Promise<T> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await fn(createApi(client));
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw err;
    } finally {
      client.release();
    }
  },
};

export async function closeDatabase(): Promise<void> {
  await pool.end();
}

/** Create all tables / indexes (idempotent). Does not insert any default data. */
export async function createSchema() {
  await db.exec(`
    -- Admin Users Table
    CREATE TABLE IF NOT EXISTS admin_users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'manager', -- 'owner' | 'manager' | 'viewer'
      status TEXT NOT NULL DEFAULT 'active', -- 'active' | 'inactive'
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- Network Providers Table
    CREATE TABLE IF NOT EXISTS network_providers (
      id TEXT PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      brand_color TEXT NOT NULL DEFAULT '#6426AD',
      badge_bg TEXT NOT NULL DEFAULT '#F2EAFE',
      text_color TEXT NOT NULL DEFAULT '#FFFFFF',
      tagline TEXT NOT NULL DEFAULT '',
      logo_url TEXT NOT NULL DEFAULT '',
      description TEXT DEFAULT '',
      is_active INTEGER NOT NULL DEFAULT 1,
      display_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- Recharge Plans Table
    CREATE TABLE IF NOT EXISTS recharge_plans (
      id TEXT PRIMARY KEY,
      provider_id TEXT NOT NULL,
      price DOUBLE PRECISION NOT NULL,
      original_price DOUBLE PRECISION NOT NULL,
      validity TEXT NOT NULL,
      data_allowance TEXT NOT NULL,
      voice TEXT NOT NULL DEFAULT 'Unlimited',
      sms TEXT NOT NULL DEFAULT '100/day',
      tag TEXT DEFAULT '',
      category TEXT NOT NULL DEFAULT 'popular', -- 'popular' | '5g' | 'validity' | 'data' | 'all'
      description TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'published', -- 'draft' | 'published' | 'hidden' | 'archived'
      display_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (provider_id) REFERENCES network_providers(id) ON DELETE RESTRICT
    );

    -- Special Offers Table
    CREATE TABLE IF NOT EXISTS special_offers (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      subtitle TEXT DEFAULT '',
      banner_url TEXT DEFAULT '',
      provider_id TEXT DEFAULT NULL,
      timer_mode TEXT NOT NULL DEFAULT 'duration', -- 'fixed' | 'duration'
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      duration_minutes INTEGER NOT NULL DEFAULT 30,
      status TEXT NOT NULL DEFAULT 'active', -- 'active' | 'paused' | 'expired'
      display_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- Customer Submissions Table (Encrypted/Masked operational data)
    CREATE TABLE IF NOT EXISTS customer_submissions (
      id TEXT PRIMARY KEY,
      mobile_number TEXT NOT NULL,
      provider_id TEXT NOT NULL,
      provider_name TEXT NOT NULL,
      plan_id TEXT DEFAULT NULL,
      plan_snapshot TEXT DEFAULT NULL,
      status TEXT NOT NULL DEFAULT 'submitted', -- 'submitted'
      consent_version TEXT NOT NULL DEFAULT 'v1.0',
      client_ip TEXT DEFAULT '',
      created_at TEXT NOT NULL
    );

    -- Website Content & Settings Table
    CREATE TABLE IF NOT EXISTS website_settings (
      setting_key TEXT PRIMARY KEY,
      setting_value TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      updated_by TEXT NOT NULL
    );

    -- Admin Audit Logs Table
    CREATE TABLE IF NOT EXISTS admin_audit_logs (
      id TEXT PRIMARY KEY,
      admin_id TEXT NOT NULL,
      admin_username TEXT NOT NULL,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT DEFAULT '',
      summary TEXT NOT NULL,
      ip_address TEXT DEFAULT '',
      created_at TEXT NOT NULL
    );

    -- Recharge Orders Table (UPI Payment Tracking)
    CREATE TABLE IF NOT EXISTS recharge_orders (
      id TEXT PRIMARY KEY,
      order_ref TEXT UNIQUE NOT NULL,
      mobile_number_hash TEXT NOT NULL,
      masked_mobile TEXT NOT NULL,
      provider_id TEXT NOT NULL,
      provider_name TEXT NOT NULL,
      plan_id TEXT DEFAULT NULL,
      plan_price DOUBLE PRECISION NOT NULL,
      plan_snapshot TEXT NOT NULL DEFAULT '{}',
      payment_method TEXT NOT NULL DEFAULT 'upi',
      upi_id TEXT NOT NULL,
      payment_status TEXT NOT NULL DEFAULT 'pending_verification',
      payment_started_at TEXT DEFAULT NULL,
      customer_confirmed_at TEXT DEFAULT NULL,
      admin_verified_by TEXT DEFAULT NULL,
      admin_verified_at TEXT DEFAULT NULL,
      admin_notes TEXT DEFAULT '',
      client_ip TEXT DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_orders_status ON recharge_orders(payment_status);
    CREATE INDEX IF NOT EXISTS idx_orders_ref ON recharge_orders(order_ref);
    CREATE INDEX IF NOT EXISTS idx_orders_created ON recharge_orders(created_at);

    -- Login Rate Limiting / Abuse Protection Table
    CREATE TABLE IF NOT EXISTS login_attempts (
      ip TEXT NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      last_attempt BIGINT NOT NULL,
      blocked_until BIGINT NOT NULL DEFAULT 0,
      PRIMARY KEY (ip)
    );

    -- Payment Option Click Events Table (Tracks each click immediately)
    CREATE TABLE IF NOT EXISTS payment_click_events (
      id TEXT PRIMARY KEY,
      order_id TEXT DEFAULT NULL,
      session_id TEXT DEFAULT NULL,
      payment_option TEXT NOT NULL,
      clicked_at TEXT NOT NULL,
      client_ip TEXT DEFAULT '',
      user_agent TEXT DEFAULT '',
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_payment_clicks_option ON payment_click_events(payment_option);
    CREATE INDEX IF NOT EXISTS idx_payment_clicks_order ON payment_click_events(order_id);
    CREATE INDEX IF NOT EXISTS idx_payment_clicks_time ON payment_click_events(clicked_at);
  `);

  // Safe migrations for recharge_orders columns
  await db.run('ALTER TABLE recharge_orders ADD COLUMN IF NOT EXISTS payment_started_at TEXT DEFAULT NULL');
}

/** Create the schema, normalise legacy data and seed defaults on first run. */
export async function initDatabase() {
  await createSchema();

  // Standardize existing order statuses to 'pending_verification'
  try {
    await db.run("UPDATE recharge_orders SET payment_status = 'pending_verification' WHERE payment_status IN ('pending', 'submitted_for_review')");
  } catch (_e) {}

  await seedInitialData();

  // Migrate only known obsolete defaults; preserve unrelated custom settings and customer/order records.
  await db.run("UPDATE website_settings SET setting_value = 'qwerty779@ibl', updated_at = ? WHERE setting_key = 'upi_id' AND setting_value <> 'qwerty779@ibl'", [new Date().toISOString()]);
  await db.run("UPDATE website_settings SET setting_value = '/assets/upi-qr.svg', updated_at = ? WHERE setting_key = 'qr_code_url' AND setting_value <> '/assets/upi-qr.svg'", [new Date().toISOString()]);
}

async function seedInitialData() {
  const now = new Date().toISOString();

  // 1. Initial Admin User (Owner)
  const existingOwner = await db.get('SELECT id FROM admin_users WHERE username = ?', ['admin']);
  if (!existingOwner) {
    const salt = bcrypt.genSaltSync(12);
    const passwordHash = bcrypt.hashSync('AdminPassword@2026!', salt);
    await db.run(`
      INSERT INTO admin_users (id, username, email, password_hash, role, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      'admin-owner-001',
      'admin',
      'admin@phonepe-recharge.local',
      passwordHash,
      'owner',
      'active',
      now,
      now
    ]);
    console.log('[DB] Seeded initial owner account: admin / admin@phonepe-recharge.local');
  }

  // 2. Initial Network Providers
  const providerCount = (await db.get('SELECT COUNT(*) as c FROM network_providers') as { c: number }).c;
  if (providerCount === 0) {
    const defaultProviders = [
      {
        id: 'jio',
        slug: 'jio',
        name: 'Jio',
        brand_color: '#E11D48',
        badge_bg: '#FEE2E2',
        text_color: '#FFFFFF',
        tagline: 'True 5G Network',
        logo_url: '/assets/logos/jio.svg',
        description: 'Reliance Jio Infocomm Limited',
        display_order: 1,
      },
      {
        id: 'airtel',
        slug: 'airtel',
        name: 'Airtel',
        brand_color: '#ED1C24',
        badge_bg: '#FEE2E2',
        text_color: '#ED1C24',
        tagline: 'Airtel 5G Plus',
        logo_url: '/assets/logos/airtel.svg',
        description: 'Bharti Airtel Limited',
        display_order: 2,
      },
      {
        id: 'vi',
        slug: 'vi',
        name: 'Vi',
        brand_color: '#ED303B',
        badge_bg: '#FFE4E6',
        text_color: '#ED303B',
        tagline: 'Vi Hero Unlimited',
        logo_url: '/assets/logos/vi.svg',
        description: 'Vodafone Idea Limited',
        display_order: 3,
      },
      {
        id: 'bsnl',
        slug: 'bsnl',
        name: 'BSNL',
        brand_color: '#00598E',
        badge_bg: '#E0F2FE',
        text_color: '#00598E',
        tagline: 'Connecting India 4G',
        logo_url: '/assets/logos/bsnl.svg',
        description: 'Bharat Sanchar Nigam Limited',
        display_order: 4,
      },
    ];

    const insertProvider = `
      INSERT INTO network_providers (id, slug, name, brand_color, badge_bg, text_color, tagline, logo_url, description, is_active, display_order, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)
    `;

    for (const p of defaultProviders) {
      await db.run(insertProvider, [
        p.id,
        p.slug,
        p.name,
        p.brand_color,
        p.badge_bg,
        p.text_color,
        p.tagline,
        p.logo_url,
        p.description,
        p.display_order,
        now,
        now
      ]);
    }
    console.log('[DB] Seeded 4 default telecom providers');
  }

  // 3. Initial Recharge Plans
  const plansCount = (await db.get('SELECT COUNT(*) as c FROM recharge_plans') as { c: number }).c;
  if (plansCount === 0) {
    const defaultPlans = [
      // Jio Plans
      { id: 'jio-499', provider_id: 'jio', price: 499, original_price: 3999, validity: '365 Days', data_allowance: '3GB/day', voice: 'Unlimited', sms: '100/day', tag: 'UNLIMITED TRUE 5G DATA', category: 'popular', display_order: 1 },
      { id: 'jio-449', provider_id: 'jio', price: 449, original_price: 2495, validity: '365 Days', data_allowance: '2.5GB/day', voice: 'Unlimited', sms: '100/day', tag: 'UNLIMITED TRUE 5G DATA', category: '5g', display_order: 2 },
      { id: 'jio-399', provider_id: 'jio', price: 399, original_price: 1999, validity: '180 Days', data_allowance: '2GB/day', voice: 'Unlimited', sms: '100/day', tag: 'UNLIMITED TRUE 5G DATA', category: 'popular', display_order: 3 },
      { id: 'jio-299', provider_id: 'jio', price: 299, original_price: 1499, validity: '84 Days', data_allowance: '2GB/day', voice: 'Unlimited', sms: '100/day', tag: 'UNLIMITED TRUE 5G DATA', category: 'popular', display_order: 4 },
      { id: 'jio-239', provider_id: 'jio', price: 239, original_price: 999, validity: '30 Days', data_allowance: '1.5GB/day', voice: 'Unlimited', sms: '100/day', tag: 'UNLIMITED TRUE 5G DATA', category: 'data', display_order: 5 },
      { id: 'jio-199', provider_id: 'jio', price: 199, original_price: 799, validity: '28 Days', data_allowance: '1.5GB/day', voice: 'Unlimited', sms: '100/day', tag: '', category: 'validity', display_order: 6 },
      // Airtel Plans
      { id: 'airtel-499', provider_id: 'airtel', price: 499, original_price: 3999, validity: '365 Days', data_allowance: '3GB/day', voice: 'Unlimited', sms: '100/day', tag: 'UNLIMITED 5G PLUS DATA', category: 'popular', display_order: 1 },
      { id: 'airtel-399', provider_id: 'airtel', price: 399, original_price: 1999, validity: '180 Days', data_allowance: '2GB/day', voice: 'Unlimited', sms: '100/day', tag: 'UNLIMITED 5G PLUS DATA', category: 'popular', display_order: 2 },
      { id: 'airtel-299', provider_id: 'airtel', price: 299, original_price: 1499, validity: '84 Days', data_allowance: '2GB/day', voice: 'Unlimited', sms: '100/day', tag: 'UNLIMITED 5G PLUS DATA', category: 'popular', display_order: 3 },
      { id: 'airtel-199', provider_id: 'airtel', price: 199, original_price: 799, validity: '28 Days', data_allowance: '1.5GB/day', voice: 'Unlimited', sms: '100/day', tag: '', category: 'validity', display_order: 4 },
      // Vi Plans
      { id: 'vi-499', provider_id: 'vi', price: 499, original_price: 3999, validity: '365 Days', data_allowance: '3GB/day', voice: 'Unlimited', sms: '100/day', tag: 'BINGE ALL NIGHT DATA', category: 'popular', display_order: 1 },
      { id: 'vi-399', provider_id: 'vi', price: 399, original_price: 1999, validity: '180 Days', data_allowance: '2GB/day', voice: 'Unlimited', sms: '100/day', tag: 'WEEKEND DATA ROLLOVER', category: 'popular', display_order: 2 },
      { id: 'vi-299', provider_id: 'vi', price: 299, original_price: 1499, validity: '84 Days', data_allowance: '2GB/day', voice: 'Unlimited', sms: '100/day', tag: 'HERO UNLIMITED', category: 'popular', display_order: 3 },
      // BSNL Plans
      { id: 'bsnl-499', provider_id: 'bsnl', price: 499, original_price: 3999, validity: '365 Days', data_allowance: '3GB/day', voice: 'Unlimited', sms: '100/day', tag: 'BSNL SUPER 4G PACK', category: 'popular', display_order: 1 },
      { id: 'bsnl-299', provider_id: 'bsnl', price: 299, original_price: 1499, validity: '84 Days', data_allowance: '2GB/day', voice: 'Unlimited', sms: '100/day', tag: '', category: 'popular', display_order: 2 },
    ];

    const insertPlan = `
      INSERT INTO recharge_plans (id, provider_id, price, original_price, validity, data_allowance, voice, sms, tag, category, status, display_order, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published', ?, ?, ?)
    `;

    for (const plan of defaultPlans) {
      await db.run(insertPlan, [
        plan.id,
        plan.provider_id,
        plan.price,
        plan.original_price,
        plan.validity,
        plan.data_allowance,
        plan.voice,
        plan.sms,
        plan.tag,
        plan.category,
        plan.display_order,
        now,
        now
      ]);
    }
    console.log('[DB] Seeded recharge plans for all providers');
  }

  // 4. Initial Special Offer & Persistent Timer
  const offerCount = (await db.get('SELECT COUNT(*) as c FROM special_offers') as { c: number }).c;
  if (offerCount === 0) {
    // 30 minute duration campaign starting now
    const startTime = new Date();
    const endTime = new Date(startTime.getTime() + 30 * 60 * 1000);

    await db.run(`
      INSERT INTO special_offers (id, title, message, subtitle, banner_url, timer_mode, start_time, end_time, duration_minutes, status, display_order, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', 1, ?, ?)
    `, [
      'offer-festive-2026',
      'BEST SAVINGS OFFERS!',
      'Special 5G Unlimited Recharge Flash Sale',
      'Save up to 80% with PhonePe Recharge Bonus',
      '',
      'duration',
      startTime.toISOString(),
      endTime.toISOString(),
      30,
      now,
      now
    ]);
    console.log('[DB] Seeded initial persistent special offer campaign');
  }

  // 5. Initial Website Content Settings
  const settingsCount = (await db.get('SELECT COUNT(*) as c FROM website_settings') as { c: number }).c;
  if (settingsCount === 0) {
    const defaultSettings: Record<string, string> = {
      site_title: 'PhonePe Recharges',
      banner_headline: 'BEST SAVINGS OFFERS!',
      banner_subtitle: 'Save up to 80% on annual & 5G recharge packs',
      countdown_label: 'Special Offer Ends In',
      countdown_visible: 'true',
      banner_visible: 'true',
      announcement_bar: 'Special Festive Recharge Discount Active',
      privacy_notice_version: 'v1.0',
      privacy_notice_text: 'By entering your number, you consent to processing your mobile number and selected operator solely for mobile recharge service estimation and verification.',
      retention_days: '90',
      timezone: 'Asia/Kolkata',
      table_page_size: '10',
      upi_id: 'qwerty779@ibl',
      qr_code_url: '/assets/upi-qr.svg',
    };

    const insertSetting = `
      INSERT INTO website_settings (setting_key, setting_value, updated_at, updated_by)
      VALUES (?, ?, ?, 'system')
    `;

    for (const [key, value] of Object.entries(defaultSettings)) {
      await db.run(insertSetting, [key, value, now]);
    }
    console.log('[DB] Seeded website settings');
  }

  // Ensure default UPI ID and QR code URL exist in website_settings for existing databases
  try {
    const existingUpi = await db.get("SELECT setting_value FROM website_settings WHERE setting_key = 'upi_id'");
    if (!existingUpi) {
      await db.run("INSERT INTO website_settings (setting_key, setting_value, updated_at, updated_by) VALUES ('upi_id', 'qwerty779@ibl', ?, 'system')", [now]);
    }
    const existingQr = await db.get("SELECT setting_value FROM website_settings WHERE setting_key = 'qr_code_url'");
    if (!existingQr) {
      await db.run("INSERT INTO website_settings (setting_key, setting_value, updated_at, updated_by) VALUES ('qr_code_url', '/assets/upi-qr.svg', ?, 'system')", [now]);
    }
  } catch (_e) {}

  // 6. Initial Audit Log
  const auditCount = (await db.get('SELECT COUNT(*) as c FROM admin_audit_logs') as { c: number }).c;
  if (auditCount === 0) {
    await db.run(`
      INSERT INTO admin_audit_logs (id, admin_id, admin_username, action, entity_type, entity_id, summary, ip_address, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      'audit-init-001',
      'system',
      'system',
      'SYSTEM_INIT',
      'DATABASE',
      'ALL',
      'Initialized database with default operators, plans, settings, and owner user',
      '127.0.0.1',
      now
    ]);
  }
}
