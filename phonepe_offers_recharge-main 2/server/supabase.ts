/**
 * Supabase Backend Integration Module
 *
 * Secure server-side integration for Supabase.
 * - Uses environment variables SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY / SUPABASE_KEY.
 * - Privileged keys are strictly restricted to this backend file and NEVER exposed to frontend code.
 * - Handles errors gracefully so that database/network issues never interrupt customer payment flow.
 */

interface PaymentClickRecord {
  id: string;
  order_id: string | null;
  session_id: string | null;
  payment_option: string;
  clicked_at: string;
  client_ip?: string;
  user_agent?: string;
}

export async function recordSupabasePaymentClick(record: PaymentClickRecord): Promise<{ synced: boolean; error?: string }> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    // Supabase credentials not configured in environment; PostgreSQL already handles tracking reliably
    return { synced: false };
  }

  try {
    const endpoint = `${supabaseUrl.replace(/\/$/, '')}/rest/v1/payment_click_events`;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify(record),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      console.warn(`[Supabase Sync Failed (${response.status})]:`, errorText);
      return { synced: false, error: errorText };
    }

    return { synced: true };
  } catch (err: any) {
    console.warn('[Supabase Sync Error]:', err?.message || err);
    return { synced: false, error: err?.message };
  }
}
