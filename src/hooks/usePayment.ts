import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Plan pricing
export const PLAN_PRICING = {
  pro: { usd: 12, inr: 999 },
  business: { usd: 22, inr: 1999 },
};

interface CouponValidation {
  valid: boolean;
  code?: string;
  type?: "percentage" | "fixed";
  value?: number;
  restrictedPlan?: string | null;
  discounts?: Record<string, number>;
  error?: string;
}

interface PaymentResult {
  success: boolean;
  type?: "free_access" | "razorpay_order" | "verified";
  message?: string;
  plan?: string;
  expiresAt?: string;
  orderId?: string;
  amount?: number;
  originalAmount?: number;
  discountAmount?: number;
  keyId?: string;
  error?: string;
}

declare global {
  interface Window {
    Razorpay: any;
  }
}

export function usePayment() {
  const [isLoading, setIsLoading] = useState(false);
  const [couponValidation, setCouponValidation] = useState<CouponValidation | null>(null);

  // Load Razorpay script
  const loadRazorpayScript = useCallback((): Promise<boolean> => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }

      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  }, []);

  // Validate coupon
  const validateCoupon = useCallback(async (code: string): Promise<CouponValidation> => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("razorpay-payment", {
        body: { action: "validate_coupon", couponCode: code },
      });

      if (error) throw error;
      
      setCouponValidation(data);
      return data;
    } catch (err: any) {
      const result = { valid: false, error: err.message || "Failed to validate coupon" };
      setCouponValidation(result);
      return result;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Clear coupon
  const clearCoupon = useCallback(() => {
    setCouponValidation(null);
  }, []);

  // Create payment
  const createPayment = useCallback(async (
    plan: "pro" | "business",
    couponCode?: string,
    onSuccess?: (result: PaymentResult) => void
  ): Promise<PaymentResult> => {
    setIsLoading(true);

    try {
      // Step 1: Create order
      const { data: orderData, error: orderError } = await supabase.functions.invoke("razorpay-payment", {
        body: { action: "create_order", plan, couponCode },
      });

      if (orderError) throw orderError;
      if (orderData.error) throw new Error(orderData.error);

      // If free access (100% discount), return immediately
      if (orderData.type === "free_access") {
        toast.success("🎉 " + orderData.message);
        onSuccess?.(orderData);
        return orderData;
      }

      // Step 2: Load Razorpay
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error("Failed to load payment gateway");
      }

      // Step 3: Open Razorpay checkout
      return new Promise((resolve, reject) => {
        const options = {
          key: orderData.keyId,
          amount: orderData.amount * 100,
          currency: orderData.currency,
          name: "LinkedBot",
          description: `${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan Subscription`,
          order_id: orderData.orderId,
          handler: async (response: any) => {
            try {
              // Verify payment
              const { data: verifyData, error: verifyError } = await supabase.functions.invoke("razorpay-payment", {
                body: {
                  action: "verify_payment",
                  paymentData: {
                    orderId: orderData.orderId,
                    paymentId: response.razorpay_payment_id,
                    signature: response.razorpay_signature,
                  },
                },
              });

              if (verifyError) throw verifyError;
              if (verifyData.error) throw new Error(verifyData.error);

              toast.success("🎉 Payment successful! Welcome to " + plan.charAt(0).toUpperCase() + plan.slice(1) + "!");
              onSuccess?.(verifyData);
              resolve(verifyData);
            } catch (err: any) {
              toast.error("Payment verification failed: " + err.message);
              reject(err);
            } finally {
              setIsLoading(false);
            }
          },
          prefill: {},
          theme: {
            color: "#6366f1",
          },
          modal: {
            ondismiss: () => {
              setIsLoading(false);
              resolve({ success: false, error: "Payment cancelled" });
            },
          },
        };

        const razorpay = new window.Razorpay(options);
        razorpay.on("payment.failed", (response: any) => {
          toast.error("Payment failed: " + response.error.description);
          setIsLoading(false);
          resolve({ success: false, error: response.error.description });
        });
        razorpay.open();
      });

    } catch (err: any) {
      toast.error(err.message || "Payment failed");
      setIsLoading(false);
      return { success: false, error: err.message };
    }
  }, [loadRazorpayScript]);

  // Calculate final price with coupon
  const calculateFinalPrice = useCallback((
    plan: "pro" | "business",
    coupon?: CouponValidation | null
  ): { original: number; discount: number; final: number } => {
    const original = PLAN_PRICING[plan].inr;
    let discount = 0;

    if (coupon?.valid && coupon.discounts) {
      discount = coupon.discounts[plan] || 0;
    }

    return {
      original,
      discount,
      final: Math.max(0, original - discount),
    };
  }, []);

  return {
    isLoading,
    couponValidation,
    validateCoupon,
    clearCoupon,
    createPayment,
    calculateFinalPrice,
    PLAN_PRICING,
  };
}
