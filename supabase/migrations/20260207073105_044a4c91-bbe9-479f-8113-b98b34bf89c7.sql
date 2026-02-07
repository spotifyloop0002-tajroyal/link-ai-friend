-- Drop existing function first (return type changed)
DROP FUNCTION IF EXISTS public.get_admin_users_data();

-- Recreate with REAL counts from posts table instead of stale cached counters
CREATE OR REPLACE FUNCTION public.get_admin_users_data()
RETURNS TABLE(
  id uuid,
  user_id uuid,
  email text,
  name text,
  phone_number text,
  linkedin_profile_url text,
  city text,
  country text,
  role text,
  company_name text,
  industry text,
  subscription_plan text,
  subscription_expires_at timestamptz,
  posts_created_count bigint,
  posts_scheduled_count bigint,
  posts_published_count bigint,
  followers_count bigint,
  created_at timestamptz,
  last_active_at timestamptz,
  onboarding_completed boolean
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    up.id,
    up.user_id,
    up.email,
    up.name,
    up.phone_number,
    up.linkedin_profile_url,
    up.city,
    up.country,
    up.role,
    up.company_name,
    up.industry,
    up.subscription_plan,
    up.subscription_expires_at,
    COALESCE((SELECT COUNT(*) FROM posts p WHERE p.user_id = up.user_id), 0) as posts_created_count,
    COALESCE((SELECT COUNT(*) FROM posts p WHERE p.user_id = up.user_id AND p.status = 'pending'), 0) as posts_scheduled_count,
    COALESCE((SELECT COUNT(*) FROM posts p WHERE p.user_id = up.user_id AND p.status = 'posted'), 0) as posts_published_count,
    COALESCE((SELECT la.followers_count FROM linkedin_analytics la WHERE la.user_id = up.user_id LIMIT 1), 0)::bigint as followers_count,
    up.created_at,
    up.last_active_at,
    COALESCE(up.onboarding_completed, false) as onboarding_completed
  FROM user_profiles up
  WHERE NOT EXISTS (
    SELECT 1 FROM user_roles ur 
    WHERE ur.user_id = up.user_id 
    AND ur.role IN ('admin', 'super_admin')
  );
$$;
