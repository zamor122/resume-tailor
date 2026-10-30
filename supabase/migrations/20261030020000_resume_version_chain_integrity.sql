-- Resume version-chain integrity (AUDIT.md F7).
--
-- parent_resume_id / root_resume_id use ON DELETE SET NULL, so deleting a
-- mid-chain resume orphans its children rather than blocking or cascading. That
-- behaviour is deliberate (it preserves data rather than destroying history), so
-- it is left as-is. What was missing was:
--   1. indexes for the version-chain lookups the compare UI performs, and
--   2. a guard against a row being its own parent.
--
-- Both are additive and cannot alter existing rows.

CREATE INDEX IF NOT EXISTS idx_resumes_parent_resume_id
  ON public.resumes (parent_resume_id);

CREATE INDEX IF NOT EXISTS idx_resumes_root_resume_id
  ON public.resumes (root_resume_id);

-- A resume cannot be its own parent. Added conditionally: if any existing row
-- already violates this, skip the constraint rather than failing the migration
-- (and report it via a notice so it can be investigated).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.resumes WHERE parent_resume_id = id) THEN
    RAISE NOTICE 'Skipping resumes_parent_not_self: existing self-parent rows found.';
  ELSIF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'resumes_parent_not_self'
  ) THEN
    ALTER TABLE public.resumes
      ADD CONSTRAINT resumes_parent_not_self
      CHECK (parent_resume_id IS NULL OR parent_resume_id <> id);
  END IF;
END $$;
