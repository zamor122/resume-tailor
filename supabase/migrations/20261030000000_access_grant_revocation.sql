-- Access grant revocation (refunds / chargebacks)
--
-- Records WHY and WHEN a grant was deactivated, so a revoked customer can be
-- distinguished from one whose access simply expired naturally.
--
-- Driven by the Stripe webhook (charge.refunded / charge.dispute.created):
-- see src/app/api/stripe/webhook/route.ts -> handleRevocation().

ALTER TABLE public.access_grants
  ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ;

ALTER TABLE public.access_grants
  ADD COLUMN IF NOT EXISTS revoked_reason TEXT;
