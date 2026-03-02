-- Supabase Database Schema
-- Run this in Supabase SQL Editor: Dashboard > SQL Editor > New Query

-- Access grants table (time-based access - NOT subscriptions)
-- Users purchase access for a period (2D, 7D, 30D); grants access to ALL resumes when valid
CREATE TABLE IF NOT EXISTS access_grants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_session_id TEXT UNIQUE,
  stripe_customer_id TEXT,
  payment_timestamp TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  tier_purchased TEXT NOT NULL CHECK (tier_purchased IN ('2D', '7D', '30D')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Resumes table
CREATE TABLE IF NOT EXISTS resumes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT,
  customer_email TEXT,
  original_content TEXT NOT NULL,
  tailored_content TEXT NOT NULL,
  obfuscated_content TEXT NOT NULL,
  content_map JSONB NOT NULL,
  job_description TEXT,
  match_score JSONB,
  improvement_metrics JSONB,
  free_reveal JSONB,
  format_spec JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Migration: Add format_spec to existing resumes table (run if column missing)
ALTER TABLE resumes ADD COLUMN IF NOT EXISTS format_spec JSONB;

-- Migration: Add job_title and company_name for profile table display (extracted from job description)
ALTER TABLE resumes ADD COLUMN IF NOT EXISTS job_title TEXT;
ALTER TABLE resumes ADD COLUMN IF NOT EXISTS company_name TEXT;

-- Migration: Applied-with-resume feedback (did user apply to a job using this resume?)
ALTER TABLE resumes ADD COLUMN IF NOT EXISTS applied_with_resume BOOLEAN;
ALTER TABLE resumes ADD COLUMN IF NOT EXISTS feedback_comment TEXT;

-- Migration: Versioning (chain re-tailors for same application)
ALTER TABLE resumes ADD COLUMN IF NOT EXISTS parent_resume_id UUID REFERENCES resumes(id) ON DELETE SET NULL;
ALTER TABLE resumes ADD COLUMN IF NOT EXISTS version_number INT;
ALTER TABLE resumes ADD COLUMN IF NOT EXISTS root_resume_id UUID REFERENCES resumes(id) ON DELETE SET NULL;

-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resume_id UUID REFERENCES resumes(id) ON DELETE CASCADE,
  stripe_session_id TEXT UNIQUE NOT NULL,
  stripe_payment_intent_id TEXT,
  stripe_price_id TEXT NOT NULL,
  amount_cents INT NOT NULL,
  currency TEXT DEFAULT 'usd',
  status TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_access_grants_user_id ON access_grants(user_id);
CREATE INDEX IF NOT EXISTS idx_access_grants_expires_at ON access_grants(expires_at);
CREATE INDEX IF NOT EXISTS idx_access_grants_tier ON access_grants(tier_purchased);
CREATE INDEX IF NOT EXISTS idx_resumes_user_id ON resumes(user_id);
CREATE INDEX IF NOT EXISTS idx_resumes_session_id ON resumes(session_id);
CREATE INDEX IF NOT EXISTS idx_resumes_customer_email ON resumes(customer_email);
CREATE INDEX IF NOT EXISTS idx_resumes_user_id_created_at ON resumes(user_id, created_at DESC) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_resumes_session_id_created_at ON resumes(session_id, created_at DESC) WHERE session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_resume_id ON payments(resume_id);
CREATE INDEX IF NOT EXISTS idx_payments_stripe_session_id ON payments(stripe_session_id);

-- Row Level Security
ALTER TABLE access_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE resumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies (drop existing if any)
-- auth.uid() wrapped in SELECT to evaluate once per query (initPlan) for performance
DROP POLICY IF EXISTS "Users can view own access grants" ON access_grants;
DROP POLICY IF EXISTS "Users can view own resumes" ON resumes;
DROP POLICY IF EXISTS "Users can link own resumes" ON resumes;
DROP POLICY IF EXISTS "Users can view own sessions" ON sessions;
DROP POLICY IF EXISTS "Users can view own payments" ON payments;

CREATE POLICY "Users can view own access grants" ON access_grants
  FOR SELECT USING ((select auth.uid()) = user_id);

-- RLS Policy: Allow anonymous reads by session_id, authenticated reads by user_id
-- This enables the teaser strategy where anonymous users can see their generated resume
CREATE POLICY "Users can view own resumes" ON resumes
  FOR SELECT USING (
    (select auth.uid()) = user_id 
    OR session_id IS NOT NULL  -- Allow anonymous access by session_id
  );

-- Allow updates to link session_id resumes to user_id (for when user authenticates)
CREATE POLICY "Users can link own resumes" ON resumes
  FOR UPDATE USING (
    (select auth.uid()) = user_id 
    OR (user_id IS NULL AND session_id IS NOT NULL)  -- Allow linking anonymous resumes
  );

CREATE POLICY "Users can view own sessions" ON sessions
  FOR SELECT USING ((select auth.uid()) = user_id OR user_id IS NULL);

CREATE POLICY "Users can view own payments" ON payments
  FOR SELECT USING ((select auth.uid()) = user_id);

-- SQL Functions (SET search_path = public for security - prevents search_path injection)
CREATE OR REPLACE FUNCTION has_active_access(user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM access_grants
    WHERE user_id = user_uuid
      AND is_active = true
      AND expires_at > NOW()
  );
$$;

CREATE OR REPLACE FUNCTION get_remaining_access_time(user_uuid UUID)
RETURNS INTERVAL
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT expires_at - NOW()
  FROM access_grants
  WHERE user_id = user_uuid
    AND is_active = true
    AND expires_at > NOW()
  ORDER BY expires_at DESC
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION get_current_tier(user_uuid UUID)
RETURNS TEXT
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tier_purchased
  FROM access_grants
  WHERE user_id = user_uuid
    AND is_active = true
    AND expires_at > NOW()
  ORDER BY expires_at DESC
  LIMIT 1;
$$;

-- blog_posts RLS (run when blog_posts table exists - see migration 20250213000000_create_blog_posts)
-- ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Blog posts are publicly readable" ON public.blog_posts FOR SELECT USING (true);

