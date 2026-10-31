-- Ensure uuid-ossp is available (AUDIT.md F8).
--
-- scripts/supabase-schema.sql uses uuid_generate_v4() as a column default for
-- access_grants, resumes and payments, but never created the extension — so a
-- fresh environment fails to create the tables unless uuid-ossp happened to be
-- enabled out-of-band. This makes the dependency explicit.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
