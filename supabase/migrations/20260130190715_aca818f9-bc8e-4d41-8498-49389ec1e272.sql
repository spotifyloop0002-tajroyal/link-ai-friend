-- Fix: Update posts status constraint to include all lifecycle states
-- This fixes the "violates check constraint posts_status_check" error

ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_status_check;

ALTER TABLE posts ADD CONSTRAINT posts_status_check 
  CHECK (status = ANY (ARRAY[
    'draft',
    'approved', 
    'scheduled',
    'queued_in_extension',
    'posting',
    'posted',
    'published',
    'failed'
  ]));