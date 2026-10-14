const SUPABASE_URL = process.env.SUPABASE_URL?.replace(/\/$/, '');
const SUPABASE_SERVER_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

/**
 * UPI/QR settings are stored separately from the main PostgreSQL database.
 * The service key is server-only and must never be exposed to the browser.
 */
export function isSupabasePaymentSettingsConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_SERVER_KEY);
}

function headers(extra: Record<string, string> = {}): Record<string, string> {
  if (!SUPABASE_URL || !SUPABASE_SERVER_KEY) {
    throw new Error('Supabase payment settings are not configured');
  }
  return {
    apikey: SUPABASE_SERVER_KEY,
    Authorization: `Bearer ${SUPABASE_SERVER_KEY}`,
    ...extra,
  };
}

async function assertOk(response: Response, operation: string): Promise<void> {
  if (response.ok) return;
  const detail = (await response.text()).slice(0, 500);
  throw new Error(`Supabase ${operation} failed (${response.status}): ${detail}`);
}

export async function getPersistentPaymentSettings(): Promise<Record<string, string>> {
  if (!isSupabasePaymentSettingsConfigured()) return {};
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/website_payment_settings?select=setting_key,setting_value`,
    { headers: headers() },
  );
  await assertOk(response, 'settings read');
  const rows = await response.json() as Array<{ setting_key: string; setting_value: string }>;
  return Object.fromEntries(rows.map(row => [row.setting_key, row.setting_value]));
}

export async function savePersistentPaymentSettings(
  updates: Record<string, string>,
  updatedBy: string,
): Promise<void> {
  if (!isSupabasePaymentSettingsConfigured()) {
    throw new Error('Supabase payment settings are not configured. Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Render.');
  }

  const rows = Object.entries(updates).map(([setting_key, setting_value]) => ({
    setting_key,
    setting_value,
    updated_at: new Date().toISOString(),
    updated_by: updatedBy,
  }));
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/website_payment_settings?on_conflict=setting_key`,
    {
      method: 'POST',
      headers: headers({ 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' }),
      body: JSON.stringify(rows),
    },
  );
  await assertOk(response, 'settings write');
}

export async function uploadPaymentQr(dataUri: string): Promise<string> {
  if (!SUPABASE_URL || !SUPABASE_SERVER_KEY) {
    throw new Error('Supabase payment settings are not configured');
  }
  const match = dataUri.match(/^data:(image\/(?:jpeg|png|webp));base64,([\s\S]+)$/i);
  if (!match) throw new Error('QR image must be a base64 JPEG, PNG, or WebP image');

  const mime = match[1].toLowerCase();
  const extension = mime === 'image/jpeg' ? 'jpg' : mime.split('/')[1];
  const bytes = Buffer.from(match[2], 'base64');
  const objectPath = `upi-qr.${extension}`;
  const response = await fetch(
    `${SUPABASE_URL}/storage/v1/object/payment-qr/${objectPath}`,
    {
      method: 'POST',
      headers: headers({
        'Content-Type': mime,
        'x-upsert': 'true',
        'Cache-Control': 'no-cache',
      }),
      body: bytes,
    },
  );
  await assertOk(response, 'QR upload');
  return `${SUPABASE_URL}/storage/v1/object/public/payment-qr/${objectPath}`;
}
