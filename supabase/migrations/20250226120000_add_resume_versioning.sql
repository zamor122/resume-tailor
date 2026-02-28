-- Versioning: chain re-tailors for the same application (one row per run)
ALTER TABLE public.resumes ADD COLUMN IF NOT EXISTS parent_resume_id UUID REFERENCES public.resumes(id) ON DELETE SET NULL;
ALTER TABLE public.resumes ADD COLUMN IF NOT EXISTS version_number INT;
ALTER TABLE public.resumes ADD COLUMN IF NOT EXISTS root_resume_id UUID REFERENCES public.resumes(id) ON DELETE SET NULL;

-- Backfill: existing rows are roots
UPDATE public.resumes
SET version_number = 1, root_resume_id = id
WHERE parent_resume_id IS NULL AND (version_number IS NULL OR root_resume_id IS NULL);

-- Index for listing versions by root
CREATE INDEX IF NOT EXISTS idx_resumes_root_resume_id ON public.resumes (root_resume_id) WHERE root_resume_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_resumes_parent_resume_id ON public.resumes (parent_resume_id) WHERE parent_resume_id IS NOT NULL;
