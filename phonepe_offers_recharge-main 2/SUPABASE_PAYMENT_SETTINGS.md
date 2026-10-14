# Persistent UPI ID and QR Code settings

This change keeps the existing Admin Panel fields unchanged. Only `upi_id` and `qr_code_url` are moved to Supabase; other website settings and application data continue using the main PostgreSQL database (`DATABASE_URL`).

## 1. Create Supabase storage/table
Open your Supabase project → SQL Editor, paste the contents of `supabase/payment-settings.sql`, and run it.

## 2. Set Render environment variables
In the backend Render service → Environment, add:
- `SUPABASE_URL`: your Supabase Project URL
- `SUPABASE_SERVICE_ROLE_KEY`: the server-side service-role/secret key from Supabase API keys

Never put the service-role/secret key in frontend variables, GitHub source, or chat. Do not use the anon/publishable key for these server writes.

## 3. Deploy and verify
Merge the pull request so Render deploys the backend. Then:
1. Open Admin Panel → Settings.
2. Change the UPI ID and save.
3. Upload a QR image and save.
4. Reload the admin settings and the public website; verify both values remain.
5. Restart/redeploy the Render service and verify again.

If Supabase is configured but unavailable, reads/writes for these payment settings fail rather than silently reporting a successful save to PostgreSQL only. If the Supabase variables are not configured yet, these two settings are read from and saved to the main PostgreSQL `website_settings` table until setup is completed.
