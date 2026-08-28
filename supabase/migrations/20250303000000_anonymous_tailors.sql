-- One free anonymous tailor per IP per 24h (try-before-signup)
CREATE TABLE IF NOT EXISTS public.anonymous_tailors (
  hashed_ip text PRIMARY KEY,
  last_used_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.anonymous_tailors IS 'Tracks last use of anonymous (no-login) tailor per hashed IP for 24h allowance';
