// Script to automatically create Supabase database schema
// Usage: npx tsx scripts/setup-supabase.ts

const SCHEMA_SQL = `
-- Access grants table
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
  original_content TEXT NOT NULL,
  tailored_content TEXT NOT NULL,
  obfuscated_content TEXT NOT NULL,
  content_map JSONB NOT NULL,
  job_description TEXT,
  match_score JSONB,
  improvement_metrics JSONB,
  free_reveal JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

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
  stripe_session_id TEXT UNIQUE NOT NULL,
  stripe_payment_intent_id TEXT,
  stripe_price_id TEXT NOT NULL,
  amount_cents INT NOT NULL,
  currency TEXT DEFAULT 'usd',
  status TEXT NOT NULL,
  tier_purchased TEXT NOT NULL CHECK (tier_purchased IN ('2D', '7D', '30D')),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_access_grants_user_id ON access_grants(user_id);
CREATE INDEX IF NOT EXISTS idx_access_grants_expires_at ON access_grants(expires_at);
CREATE INDEX IF NOT EXISTS idx_access_grants_tier ON access_grants(tier_purchased);
CREATE INDEX IF NOT EXISTS idx_resumes_user_id ON resumes(user_id);
CREATE INDEX IF NOT EXISTS idx_resumes_session_id ON resumes(session_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_stripe_session_id ON payments(stripe_session_id);
CREATE INDEX IF NOT EXISTS idx_payments_tier ON payments(tier_purchased);

-- Row Level Security
ALTER TABLE access_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE resumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies (drop existing if any)
DROP POLICY IF EXISTS "Users can view own access grants" ON access_grants;
DROP POLICY IF EXISTS "Users can view own resumes" ON resumes;
DROP POLICY IF EXISTS "Users can view own sessions" ON sessions;
DROP POLICY IF EXISTS "Users can view own payments" ON payments;

CREATE POLICY "Users can view own access grants" ON access_grants
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own resumes" ON resumes
  FOR SELECT USING (auth.uid() = user_id OR session_id IS NOT NULL);

CREATE POLICY "Users can view own sessions" ON sessions
  FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can view own payments" ON payments
  FOR SELECT USING (auth.uid() = user_id);

-- SQL Functions
CREATE OR REPLACE FUNCTION has_active_access(user_uuid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM access_grants
    WHERE user_id = user_uuid
      AND is_active = true
      AND expires_at > NOW()
  );
$$ LANGUAGE SQL SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_remaining_access_time(user_uuid UUID)
RETURNS INTERVAL AS $$
  SELECT expires_at - NOW()
  FROM access_grants
  WHERE user_id = user_uuid
    AND is_active = true
    AND expires_at > NOW()
  ORDER BY expires_at DESC
  LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_current_tier(user_uuid UUID)
RETURNS TEXT AS $$
  SELECT tier_purchased
  FROM access_grants
  WHERE user_id = user_uuid
    AND is_active = true
    AND expires_at > NOW()
  ORDER BY expires_at DESC
  LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER;
`;

async function setupSupabase() {
  console.log('Setting up Supabase schema...');
  
  // Note: Supabase doesn't have a direct exec_sql RPC by default
  // We'll output the SQL for manual execution
  console.log('\n⚠️  Direct SQL execution not available via API.');
  console.log('Please run the SQL below in Supabase SQL Editor:\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(SCHEMA_SQL);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n📋 Steps:');
  console.log('1. Go to: Supabase Dashboard > SQL Editor > New Query');
  console.log('2. Copy and paste the SQL above');
  console.log('3. Click "Run" to execute');
  console.log('\n✅ After running the SQL, your schema will be ready!');
}

setupSupabase().catch(console.error);

