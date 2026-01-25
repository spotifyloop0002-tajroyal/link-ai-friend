-- ================================================
-- BILLING SYSTEM TABLES
-- ================================================

-- Create coupons table
CREATE TABLE IF NOT EXISTS public.coupons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL DEFAULT 'percentage' CHECK (type IN ('percentage', 'fixed')),
  value DECIMAL NOT NULL DEFAULT 0,
  plan TEXT CHECK (plan IN ('pro', 'business')),
  duration_days INTEGER NOT NULL DEFAULT 30,
  max_uses INTEGER,
  current_uses INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  valid_from TIMESTAMP WITH TIME ZONE DEFAULT now(),
  valid_until TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create payments table
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  razorpay_order_id TEXT,
  razorpay_payment_id TEXT,
  razorpay_signature TEXT,
  amount DECIMAL NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  plan TEXT NOT NULL CHECK (plan IN ('pro', 'business')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed', 'refunded')),
  coupon_id UUID REFERENCES public.coupons(id),
  coupon_code TEXT,
  discount_amount DECIMAL DEFAULT 0,
  final_amount DECIMAL NOT NULL,
  payment_method TEXT,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for coupons (read-only for authenticated users, write for admins)
CREATE POLICY "Anyone can read active coupons" 
ON public.coupons 
FOR SELECT 
USING (is_active = true AND (valid_until IS NULL OR valid_until > now()));

CREATE POLICY "Admins can manage coupons" 
ON public.coupons 
FOR ALL 
USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for payments
CREATE POLICY "Users can view their own payments" 
ON public.payments 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own payments" 
ON public.payments 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System can update payments"
ON public.payments
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all payments" 
ON public.payments 
FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage all payments" 
ON public.payments 
FOR ALL 
USING (public.has_role(auth.uid(), 'admin'));

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_coupons_code ON public.coupons(code);
CREATE INDEX IF NOT EXISTS idx_coupons_active ON public.coupons(is_active);

-- Insert default coupons (matching existing hardcoded ones)
INSERT INTO public.coupons (code, type, value, plan, duration_days, is_active) VALUES
  ('FREE2026', 'percentage', 100, 'pro', 30, true),
  ('BUSS2026', 'percentage', 100, 'business', 30, true)
ON CONFLICT (code) DO NOTHING;

-- Add trigger for updated_at
CREATE TRIGGER update_coupons_updated_at
BEFORE UPDATE ON public.coupons
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payments_updated_at
BEFORE UPDATE ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();