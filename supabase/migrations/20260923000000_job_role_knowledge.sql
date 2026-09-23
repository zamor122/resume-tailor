-- Migration: 20260923000000_job_role_knowledge.sql
-- Create job_role_knowledge cache table with pg_trgm fuzzy similarity support

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS job_role_knowledge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_title TEXT NOT NULL,
  industry_category TEXT NOT NULL,
  alternate_titles TEXT[] DEFAULT '{}',
  power_verbs TEXT[] NOT NULL DEFAULT '{}',
  authentic_metric_types TEXT[] NOT NULL DEFAULT '{}',
  core_competencies TEXT[] NOT NULL DEFAULT '{}',
  seniority_expectations JSONB DEFAULT '{}'::jsonb,
  usage_count INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_job_role_canonical ON job_role_knowledge (LOWER(canonical_title));
CREATE INDEX IF NOT EXISTS idx_job_role_trgm ON job_role_knowledge USING gin (canonical_title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_job_role_industry ON job_role_knowledge (industry_category);

ALTER TABLE job_role_knowledge ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to job_role_knowledge"
  ON job_role_knowledge FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow service role management of job_role_knowledge"
  ON job_role_knowledge FOR ALL
  TO service_role
  USING (true);
