-- Add columns for storing LinkedIn profile data
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS linkedin_profile_data jsonb DEFAULT NULL,
ADD COLUMN IF NOT EXISTS profile_last_scraped timestamp with time zone DEFAULT NULL;