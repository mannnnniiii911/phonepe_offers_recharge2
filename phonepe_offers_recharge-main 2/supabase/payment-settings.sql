-- Run once in Supabase Dashboard > SQL Editor.
-- Creates a small, dedicated table for the two editable payment settings.
create table if not exists public.website_payment_settings (
  setting_key text primary key check (setting_key in ('upi_id', 'qr_code_url')),
  setting_value text not null,
  updated_at timestamptz not null default now(),
  updated_by text not null default 'admin'
);

alter table public.website_payment_settings enable row level security;
-- No anon/authenticated policies are intentionally created. The server uses
-- the secret/service-role key, which bypasses RLS and must remain server-only.

-- Public QR image bucket; uploads are made only by the backend service key.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('payment-qr', 'payment-qr', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
