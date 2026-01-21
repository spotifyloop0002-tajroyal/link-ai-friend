-- Add retry_count and last_error columns to posts table for retry logic
ALTER TABLE public.posts 
ADD COLUMN IF NOT EXISTS retry_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_error text,
ADD COLUMN IF NOT EXISTS next_retry_at timestamp with time zone;

-- Create index for efficient scheduled post queries
CREATE INDEX IF NOT EXISTS idx_posts_scheduled_status ON public.posts(status, scheduled_time) 
WHERE status IN ('scheduled', 'failed');

-- Create index for retry processing
CREATE INDEX IF NOT EXISTS idx_posts_retry ON public.posts(next_retry_at) 
WHERE status = 'failed' AND retry_count < 3;