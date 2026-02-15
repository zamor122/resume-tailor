-- Fix security issues: RLS on blog_posts, immutable search_path on functions

-- 1. Row Level Security on blog_posts
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Blog posts are publicly readable"
  ON public.blog_posts FOR SELECT
  USING (true);

-- 2. Fix mutable search_path on SECURITY DEFINER functions
CREATE OR REPLACE FUNCTION public.has_active_access(user_uuid UUID)
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

CREATE OR REPLACE FUNCTION public.get_remaining_access_time(user_uuid UUID)
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

CREATE OR REPLACE FUNCTION public.get_current_tier(user_uuid UUID)
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
