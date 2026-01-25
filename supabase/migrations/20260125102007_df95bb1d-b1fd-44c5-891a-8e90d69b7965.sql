-- Add audit and lifecycle columns to posts table
ALTER TABLE public.posts 
ADD COLUMN IF NOT EXISTS approved boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS queued_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS extension_ack_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS image_skipped boolean DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN public.posts.approved IS 'User explicitly approved this post for scheduling';
COMMENT ON COLUMN public.posts.queued_at IS 'When post was queued in extension';
COMMENT ON COLUMN public.posts.extension_ack_at IS 'When extension acknowledged receipt';
COMMENT ON COLUMN public.posts.image_skipped IS 'User explicitly approved skipping image';