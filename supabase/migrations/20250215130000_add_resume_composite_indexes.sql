-- Optimize resume list queries: filter + order by created_at
-- Covers: list by user_id/session_id with ORDER BY created_at DESC
-- Also supports getFreeResumeIdsServer (ORDER BY created_at ASC via backward scan)
-- Note: Use CREATE INDEX (not CONCURRENTLY) - migrations run in a transaction.
-- For zero-downtime on large tables, run CONCURRENTLY manually in SQL Editor.

CREATE INDEX IF NOT EXISTS idx_resumes_user_id_created_at
  ON public.resumes (user_id, created_at DESC)
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_resumes_session_id_created_at
  ON public.resumes (session_id, created_at DESC)
  WHERE session_id IS NOT NULL;
