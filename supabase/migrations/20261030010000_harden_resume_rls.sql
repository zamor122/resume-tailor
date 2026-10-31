-- Harden RLS on public.resumes (AUDIT.md F6).
--
-- The previous policies granted anonymous (anon-key) access to ANY row:
--   SELECT: (select auth.uid()) = user_id OR session_id IS NOT NULL
--   UPDATE: (select auth.uid()) = user_id OR (user_id IS NULL AND session_id IS NOT NULL)
--
-- The anon/publishable key ships to browsers, so with those clauses any visitor
-- could read EVERY anonymous resume, and could UPDATE any anonymous row to claim
-- it (setting user_id to their own).
--
-- The application does not rely on those clauses: every resume read and write
-- goes through the service-role client (supabaseAdmin), which bypasses RLS
-- entirely, and the browser client is only used to read access_grants. The
-- anonymous teaser flow goes through POST /api/resume/retrieve, which authorizes
-- server-side. So this is a pure tightening with no functional change.
--
-- Trade-off, stated explicitly: an anonymous visitor can no longer read resume
-- rows directly through the anon key. They never did in the app's design.
-- If a future flow needs client-side resume reads, do it through an API route
-- with an explicit ownership check rather than by re-opening these policies.

DROP POLICY IF EXISTS "Users can view own resumes" ON public.resumes;
CREATE POLICY "Users can view own resumes" ON public.resumes
  FOR SELECT USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can link own resumes" ON public.resumes;
CREATE POLICY "Users can link own resumes" ON public.resumes
  FOR UPDATE
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);
