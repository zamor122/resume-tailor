-- Reconcile the payments table with the declared schema (found while testing the money path).
--
-- The live payments table had drifted from scripts/supabase-schema.sql in BOTH directions:
--   * it HAD a  `tier_purchased` column (NOT NULL) that the schema file did not declare, and
--   * it LACKED the `resume_id` column that the schema file DID declare.
--
-- The webhook's payments insert omitted tier_purchased (NOT NULL violation) and supplied
-- resume_id (PostgREST PGRST204, column not found). Every payments row therefore failed —
-- silently, because the old code only warned. The F4 fail-loud change surfaced it.
--
-- tier_purchased is now declared in scripts/supabase-schema.sql; this migration adds the
-- missing resume_id so the live database matches. Idempotent and additive.

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS resume_id uuid REFERENCES public.resumes(id) ON DELETE CASCADE;
