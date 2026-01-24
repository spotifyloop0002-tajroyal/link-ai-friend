-- Add verified column to posts table for URL verification status
ALTER TABLE public.posts 
ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT false;

-- Add index for faster lookups on verified posts
CREATE INDEX IF NOT EXISTS idx_posts_verified ON public.posts(verified);

-- Update existing posted posts: mark as verified if they have a valid LinkedIn URL
UPDATE public.posts 
SET verified = true 
WHERE status = 'posted' 
AND linkedin_post_url IS NOT NULL 
AND linkedin_post_url ~ 'linkedin\.com/(posts|feed).*activity[-:][0-9]{19}';