
-- Add LinkedIn verification columns to user_profiles
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS linkedin_public_id VARCHAR(100),
ADD COLUMN IF NOT EXISTS linkedin_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS linkedin_verified_at TIMESTAMPTZ;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_linkedin_public_id ON public.user_profiles(linkedin_public_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_linkedin_verified ON public.user_profiles(linkedin_verified);
