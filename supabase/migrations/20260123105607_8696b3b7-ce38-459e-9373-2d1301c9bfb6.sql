-- Add new fields to user_profiles for LinkedIn profile edit tracking
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS linkedin_profile_edit_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS linkedin_profile_confirmed boolean DEFAULT false;

-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID, -- nullable for global/admin notifications
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'system', -- admin, system, post, analytics
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications or global notifications (user_id IS NULL)
CREATE POLICY "Users can view their own or global notifications"
ON public.notifications
FOR SELECT
USING (auth.uid() = user_id OR user_id IS NULL);

-- Users can update (mark as read) their own notifications
CREATE POLICY "Users can update their own notifications"
ON public.notifications
FOR UPDATE
USING (auth.uid() = user_id);

-- Admins can insert notifications (for broadcast)
CREATE POLICY "Admins can insert notifications"
ON public.notifications
FOR INSERT
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR 
  auth.uid() = user_id
);

-- Admins can delete notifications
CREATE POLICY "Admins can delete notifications"
ON public.notifications
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Add index for faster queries
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX idx_notifications_is_read ON public.notifications(is_read);

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;