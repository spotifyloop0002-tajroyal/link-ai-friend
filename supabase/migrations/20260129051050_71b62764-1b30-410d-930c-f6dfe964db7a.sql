-- Create extension_alerts table to track critical failures
CREATE TABLE public.extension_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  alert_type TEXT NOT NULL, -- 'linkedin_ui_changed', 'posting_failed', 'multi_user_failure', 'extension_error'
  severity TEXT NOT NULL DEFAULT 'high', -- 'critical', 'high', 'medium'
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  details JSONB,
  user_id UUID, -- Optional: specific user affected
  post_id UUID REFERENCES public.posts(id),
  is_resolved BOOLEAN NOT NULL DEFAULT false,
  email_sent BOOLEAN NOT NULL DEFAULT false,
  email_sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID
);

-- Enable Row Level Security
ALTER TABLE public.extension_alerts ENABLE ROW LEVEL SECURITY;

-- Only admins can view all alerts
CREATE POLICY "Admins can view all alerts"
ON public.extension_alerts
FOR SELECT
USING (public.is_admin(auth.uid()));

-- Only admins can update alerts (mark as resolved)
CREATE POLICY "Admins can update alerts"
ON public.extension_alerts
FOR UPDATE
USING (public.is_admin(auth.uid()));

-- Service role can insert alerts (from edge functions)
CREATE POLICY "Service role inserts alerts"
ON public.extension_alerts
FOR INSERT
WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX idx_extension_alerts_created_at ON public.extension_alerts(created_at DESC);
CREATE INDEX idx_extension_alerts_alert_type ON public.extension_alerts(alert_type);
CREATE INDEX idx_extension_alerts_is_resolved ON public.extension_alerts(is_resolved);

-- Create admin_emails table to store admin notification preferences
CREATE TABLE public.admin_alert_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  email TEXT NOT NULL,
  receive_critical_alerts BOOLEAN NOT NULL DEFAULT true,
  receive_high_alerts BOOLEAN NOT NULL DEFAULT true,
  receive_medium_alerts BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_alert_settings ENABLE ROW LEVEL SECURITY;

-- Admins can manage their own settings
CREATE POLICY "Admins can manage their alert settings"
ON public.admin_alert_settings
FOR ALL
USING (public.is_admin(auth.uid()) AND user_id = auth.uid());

-- Service role can read all admin settings for sending emails
CREATE POLICY "Service role reads admin settings"
ON public.admin_alert_settings
FOR SELECT
USING (true);

-- Add trigger for updated_at
CREATE TRIGGER update_admin_alert_settings_updated_at
BEFORE UPDATE ON public.admin_alert_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for alerts
ALTER PUBLICATION supabase_realtime ADD TABLE public.extension_alerts;