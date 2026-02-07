
-- Allow admins to read ALL agents (not just their own)
CREATE POLICY "Admins can view all agents"
ON public.agents
FOR SELECT
USING (is_admin(auth.uid()));

-- Allow admins to read ALL posts (not just their own)
CREATE POLICY "Admins can view all posts"
ON public.posts
FOR SELECT
USING (is_admin(auth.uid()));

-- Allow admins to read ALL post_analytics (not just their own)
CREATE POLICY "Admins can view all post analytics"
ON public.post_analytics
FOR SELECT
USING (is_admin(auth.uid()));

-- Allow admins to read ALL user_profiles (for admin panel)
CREATE POLICY "Admins can view all user profiles"
ON public.user_profiles
FOR SELECT
USING (is_admin(auth.uid()));
