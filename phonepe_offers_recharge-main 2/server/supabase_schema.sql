-- ==============================================================================
-- Supabase Row Level Security (RLS) & Schema for Payment Option Click Tracking
-- ==============================================================================

-- 1. Create table for payment option click tracking
CREATE TABLE IF NOT EXISTS public.payment_click_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id TEXT,
    session_id TEXT,
    payment_option TEXT NOT NULL CHECK (payment_option IN ('phonepe', 'google_pay', 'qr_code', 'paytm')),
    clicked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    client_ip TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_payment_click_option ON public.payment_click_events(payment_option);
CREATE INDEX IF NOT EXISTS idx_payment_click_order ON public.payment_click_events(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_click_session ON public.payment_click_events(session_id);
CREATE INDEX IF NOT EXISTS idx_payment_click_time ON public.payment_click_events(clicked_at DESC);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.payment_click_events ENABLE ROW LEVEL SECURITY;

-- 3. Policy: Service Role (Backend Server) has full access
CREATE POLICY "Service role full access to payment_click_events"
ON public.payment_click_events
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 4. Policy: Public / Anon clients can ONLY INSERT click events
-- Note: Customers CANNOT select, update, or delete ANY records (isolation guaranteed)
CREATE POLICY "Allow public insert of payment_click_events"
ON public.payment_click_events
FOR INSERT
TO anon
WITH CHECK (true);

-- 5. By default in PostgreSQL/Supabase RLS, when RLS is active:
-- NO SELECT policy exists for public/anon/authenticated roles.
-- This guarantees customers cannot view other customers' tracking records.
-- NO UPDATE or DELETE policies exist for public/anon/authenticated roles.
-- This guarantees customers cannot modify or delete any tracking records.
