-- Create analytics queue for 2-hour post analytics scraping
CREATE TABLE IF NOT EXISTS analytics_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  post_url TEXT NOT NULL,
  scheduled_for TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  attempts INTEGER DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for efficient scheduling queries
CREATE INDEX idx_analytics_queue_scheduled 
ON analytics_queue(scheduled_for, status)
WHERE status = 'pending';

-- Index for cleanup queries
CREATE INDEX idx_analytics_queue_created 
ON analytics_queue(created_at);

-- Auto-update updated_at timestamp
CREATE TRIGGER update_analytics_queue_updated_at
  BEFORE UPDATE ON analytics_queue
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE analytics_queue ENABLE ROW LEVEL SECURITY;

-- Allow service role access only (edge functions)
CREATE POLICY "Service role access for analytics_queue"
ON analytics_queue FOR ALL
USING (auth.role() = 'service_role');

-- Table for Extension Test Panel logging
CREATE TABLE IF NOT EXISTS extension_posted_urls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  post_id UUID REFERENCES posts(id) ON DELETE SET NULL,
  tracking_id TEXT,
  post_url TEXT NOT NULL,
  status TEXT DEFAULT 'received' CHECK (status IN ('received', 'pending', 'error')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for efficient user queries
CREATE INDEX idx_extension_urls_user 
ON extension_posted_urls(user_id, created_at DESC);

-- Index for tracking ID lookups
CREATE INDEX idx_extension_urls_tracking 
ON extension_posted_urls(tracking_id);

-- Row Level Security
ALTER TABLE extension_posted_urls ENABLE ROW LEVEL SECURITY;

-- Users can only see their own URLs
CREATE POLICY "Users View Own URLs"
ON extension_posted_urls FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can insert their own URLs
CREATE POLICY "Users Insert Own URLs"
ON extension_posted_urls FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);