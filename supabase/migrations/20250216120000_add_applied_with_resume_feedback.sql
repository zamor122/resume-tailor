-- Applied-with-resume feedback (did user apply to a job using this resume?)
ALTER TABLE public.resumes ADD COLUMN IF NOT EXISTS applied_with_resume BOOLEAN;
ALTER TABLE public.resumes ADD COLUMN IF NOT EXISTS feedback_comment TEXT;
