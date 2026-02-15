-- Fix RLS policies: wrap auth.uid() in SELECT to evaluate once per query (initPlan)
-- See: https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices

DROP POLICY IF EXISTS "Users can view own access grants" ON access_grants;
DROP POLICY IF EXISTS "Users can view own resumes" ON resumes;
DROP POLICY IF EXISTS "Users can link own resumes" ON resumes;
DROP POLICY IF EXISTS "Users can view own sessions" ON sessions;
DROP POLICY IF EXISTS "Users can view own payments" ON payments;

CREATE POLICY "Users can view own access grants" ON access_grants
  FOR SELECT USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can view own resumes" ON resumes
  FOR SELECT USING (
    (select auth.uid()) = user_id 
    OR session_id IS NOT NULL
  );

CREATE POLICY "Users can link own resumes" ON resumes
  FOR UPDATE USING (
    (select auth.uid()) = user_id 
    OR (user_id IS NULL AND session_id IS NOT NULL)
  );

CREATE POLICY "Users can view own sessions" ON sessions
  FOR SELECT USING ((select auth.uid()) = user_id OR user_id IS NULL);

CREATE POLICY "Users can view own payments" ON payments
  FOR SELECT USING ((select auth.uid()) = user_id);
