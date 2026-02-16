import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac } from "node:crypto";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Plan pricing in INR
const PLAN_PRICES = {
  pro: 999,      // ₹999 = $12
  business: 1999, // ₹1999 = $22
};

async function sendPaymentEmail(
  email: string,
  name: string | null,
  plan: string,
  amount: number,
  discountAmount: number,
  expiresAt: string
) {
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  if (!resendApiKey) {
    console.error("RESEND_API_KEY not configured, skipping payment email");
    return;
  }

  const planName = plan.charAt(0).toUpperCase() + plan.slice(1);
  const expiryDate = new Date(expiresAt).toLocaleDateString("en-IN", {
    year: "numeric", month: "long", day: "numeric",
  });
  const userName = name || "there";
  const finalAmount = Math.max(0, amount - discountAmount);

  const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb;">
      <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 32px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px;">🎉 Payment Successful!</h1>
        <p style="color: #e0e7ff; margin: 8px 0 0;">Welcome to LinkedBot ${planName}</p>
      </div>
      <div style="padding: 32px;">
        <p style="font-size: 16px; color: #374151;">Hi ${userName},</p>
        <p style="font-size: 15px; color: #4b5563; line-height: 1.6;">
          Your payment has been processed successfully. Here are your subscription details:
        </p>
        <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px 0; color: #6b7280;">Plan</td><td style="padding: 8px 0; text-align: right; font-weight: 600; color: #111827;">${planName}</td></tr>
            ${discountAmount > 0 ? `
            <tr><td style="padding: 8px 0; color: #6b7280;">Original Amount</td><td style="padding: 8px 0; text-align: right; color: #6b7280; text-decoration: line-through;">₹${amount}</td></tr>
            <tr><td style="padding: 8px 0; color: #059669;">Discount</td><td style="padding: 8px 0; text-align: right; color: #059669;">-₹${discountAmount}</td></tr>
            ` : ""}
            <tr><td style="padding: 8px 0; color: #6b7280;">Amount Paid</td><td style="padding: 8px 0; text-align: right; font-weight: 600; color: #111827;">₹${finalAmount}</td></tr>
            <tr><td style="padding: 8px 0; color: #6b7280;">Valid Until</td><td style="padding: 8px 0; text-align: right; font-weight: 600; color: #111827;">${expiryDate}</td></tr>
          </table>
        </div>
        <p style="font-size: 14px; color: #6b7280; line-height: 1.6;">
          You now have full access to all ${planName} features. Start creating amazing LinkedIn content today!
        </p>
        <div style="text-align: center; margin-top: 24px;">
          <a href="https://link-ai-friend.lovable.app/dashboard" style="display: inline-block; background: #6366f1; color: #ffffff; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600;">Go to Dashboard</a>
        </div>
      </div>
      <div style="background: #f9fafb; padding: 16px 32px; text-align: center; border-top: 1px solid #e5e7eb;">
        <p style="font-size: 12px; color: #9ca3af; margin: 0;">© ${new Date().getFullYear()} LinkedBot. All rights reserved.</p>
      </div>
    </div>
  `;

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: "LinkedBot <onboarding@resend.dev>",
        to: [email],
        subject: `✅ Payment Confirmed – LinkedBot ${planName} Plan Activated`,
        html,
      }),
    });
    console.log("Payment confirmation email sent to", email);
  } catch (err) {
    console.error("Failed to send payment email:", err);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const RAZORPAY_KEY_ID = Deno.env.get("RAZORPAY_KEY_ID");
    const RAZORPAY_KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify user
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { action, plan, couponCode, paymentData } = body;

    // ================================
    // ACTION: CREATE ORDER
    // ================================
    if (action === "create_order") {
      if (!plan || !PLAN_PRICES[plan as keyof typeof PLAN_PRICES]) {
        return new Response(
          JSON.stringify({ error: "Invalid plan" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      let amount = PLAN_PRICES[plan as keyof typeof PLAN_PRICES];
      let discountAmount = 0;
      let couponId = null;

      // Apply coupon if provided
      if (couponCode) {
        const { data: coupon, error: couponError } = await supabase
          .from("coupons")
          .select("*")
          .eq("code", couponCode.toUpperCase())
          .eq("is_active", true)
          .single();

        if (!couponError && coupon) {
          // Check if coupon is still valid
          const now = new Date();
          const validFrom = coupon.valid_from ? new Date(coupon.valid_from) : null;
          const validUntil = coupon.valid_until ? new Date(coupon.valid_until) : null;

          if ((!validFrom || now >= validFrom) && (!validUntil || now <= validUntil)) {
            // Check max uses
            if (!coupon.max_uses || coupon.current_uses < coupon.max_uses) {
              // Check plan restriction
              if (!coupon.plan || coupon.plan === plan) {
                if (coupon.type === "percentage") {
                  discountAmount = Math.round((amount * coupon.value) / 100);
                } else if (coupon.type === "fixed") {
                  discountAmount = Math.min(coupon.value, amount);
                }
                couponId = coupon.id;
              }
            }
          }
        }
      }

      const finalAmount = Math.max(0, amount - discountAmount);

      // If final amount is 0, skip Razorpay and grant access directly
      if (finalAmount === 0) {
        // Grant access directly
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 30);

        // Update user profile
        await supabase
          .from("user_profiles")
          .update({
            subscription_plan: plan,
            subscription_expires_at: expiryDate.toISOString(),
          })
          .eq("user_id", user.id);

        // Record payment
        await supabase.from("payments").insert({
          user_id: user.id,
          amount: amount,
          currency: "INR",
          plan: plan,
          status: "success",
          coupon_id: couponId,
          coupon_code: couponCode,
          discount_amount: discountAmount,
          final_amount: 0,
          payment_method: "coupon",
        });

        // Increment coupon usage
        if (couponId) {
          const { data: couponData } = await supabase
            .from("coupons")
            .select("current_uses")
            .eq("id", couponId)
            .single();
          
          if (couponData) {
            await supabase
              .from("coupons")
              .update({ current_uses: (couponData.current_uses || 0) + 1 })
              .eq("id", couponId);
          }
        }

        // Send confirmation email
        const { data: profileData } = await supabase
          .from("user_profiles")
          .select("email, name")
          .eq("user_id", user.id)
          .single();
        if (profileData?.email) {
          await sendPaymentEmail(profileData.email, profileData.name, plan, amount, discountAmount, expiryDate.toISOString());
        }

        return new Response(
          JSON.stringify({
            success: true,
            type: "free_access",
            message: "Plan activated with 100% discount!",
            plan,
            expiresAt: expiryDate.toISOString(),
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Create Razorpay order
      if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
        return new Response(
          JSON.stringify({ error: "Payment gateway not configured. Please contact support." }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const orderPayload = {
        amount: finalAmount * 100, // Razorpay expects amount in paise
        currency: "INR",
        receipt: `order_${user.id.slice(0, 8)}_${Date.now()}`,
        notes: {
          user_id: user.id,
          plan: plan,
          coupon_code: couponCode || "",
        },
      };

      const razorpayResponse = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`)}`,
        },
        body: JSON.stringify(orderPayload),
      });

      if (!razorpayResponse.ok) {
        const errorText = await razorpayResponse.text();
        console.error("Razorpay order error:", errorText);
        return new Response(
          JSON.stringify({ error: "Failed to create payment order" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const order = await razorpayResponse.json();

      // Store pending payment
      await supabase.from("payments").insert({
        user_id: user.id,
        razorpay_order_id: order.id,
        amount: amount,
        currency: "INR",
        plan: plan,
        status: "pending",
        coupon_id: couponId,
        coupon_code: couponCode,
        discount_amount: discountAmount,
        final_amount: finalAmount,
      });

      return new Response(
        JSON.stringify({
          success: true,
          type: "razorpay_order",
          orderId: order.id,
          amount: finalAmount,
          originalAmount: amount,
          discountAmount,
          currency: "INR",
          keyId: RAZORPAY_KEY_ID,
          plan,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ================================
    // ACTION: VERIFY PAYMENT
    // ================================
    if (action === "verify_payment") {
      const { orderId, paymentId, signature } = paymentData;

      if (!orderId || !paymentId || !signature) {
        return new Response(
          JSON.stringify({ error: "Missing payment verification data" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!RAZORPAY_KEY_SECRET) {
        return new Response(
          JSON.stringify({ error: "Payment verification not configured" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Verify signature
      const expectedSignature = createHmac("sha256", RAZORPAY_KEY_SECRET)
        .update(`${orderId}|${paymentId}`)
        .digest("hex");

      if (signature !== expectedSignature) {
        // Update payment as failed
        await supabase
          .from("payments")
          .update({ status: "failed", error_message: "Signature verification failed" })
          .eq("razorpay_order_id", orderId);

        return new Response(
          JSON.stringify({ error: "Payment verification failed" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get payment details
      const { data: payment, error: paymentError } = await supabase
        .from("payments")
        .select("*")
        .eq("razorpay_order_id", orderId)
        .single();

      if (paymentError || !payment) {
        return new Response(
          JSON.stringify({ error: "Payment record not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Update payment as successful
      await supabase
        .from("payments")
        .update({
          razorpay_payment_id: paymentId,
          razorpay_signature: signature,
          status: "success",
          payment_method: "razorpay",
        })
        .eq("razorpay_order_id", orderId);

      // Calculate expiry (30 days from now)
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 30);

      // Update user subscription
      await supabase
        .from("user_profiles")
        .update({
          subscription_plan: payment.plan,
          subscription_expires_at: expiryDate.toISOString(),
        })
        .eq("user_id", user.id);

      // Increment coupon usage if used
      if (payment.coupon_id) {
        const { data: couponData } = await supabase
          .from("coupons")
          .select("current_uses")
          .eq("id", payment.coupon_id)
          .single();
        
        if (couponData) {
          await supabase
            .from("coupons")
            .update({ current_uses: (couponData.current_uses || 0) + 1 })
            .eq("id", payment.coupon_id);
        }
      }

      // Send confirmation email
      const { data: profileData2 } = await supabase
        .from("user_profiles")
        .select("email, name")
        .eq("user_id", user.id)
        .single();
      if (profileData2?.email) {
        await sendPaymentEmail(profileData2.email, profileData2.name, payment.plan, payment.amount, payment.discount_amount || 0, expiryDate.toISOString());
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: "Payment verified successfully!",
          plan: payment.plan,
          expiresAt: expiryDate.toISOString(),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ================================
    // ACTION: VALIDATE COUPON
    // ================================
    if (action === "validate_coupon") {
      if (!couponCode) {
        return new Response(
          JSON.stringify({ error: "Coupon code required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: coupon, error: couponError } = await supabase
        .from("coupons")
        .select("*")
        .eq("code", couponCode.toUpperCase())
        .eq("is_active", true)
        .single();

      if (couponError || !coupon) {
        return new Response(
          JSON.stringify({ valid: false, error: "Invalid or expired coupon" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check validity
      const now = new Date();
      const validFrom = coupon.valid_from ? new Date(coupon.valid_from) : null;
      const validUntil = coupon.valid_until ? new Date(coupon.valid_until) : null;

      if ((validFrom && now < validFrom) || (validUntil && now > validUntil)) {
        return new Response(
          JSON.stringify({ valid: false, error: "Coupon has expired" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (coupon.max_uses && coupon.current_uses >= coupon.max_uses) {
        return new Response(
          JSON.stringify({ valid: false, error: "Coupon usage limit reached" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Calculate discount for each plan
      const discounts: Record<string, number> = {};
      for (const [planKey, price] of Object.entries(PLAN_PRICES)) {
        if (!coupon.plan || coupon.plan === planKey) {
          if (coupon.type === "percentage") {
            discounts[planKey] = Math.round((price * coupon.value) / 100);
          } else {
            discounts[planKey] = Math.min(coupon.value, price);
          }
        }
      }

      return new Response(
        JSON.stringify({
          valid: true,
          code: coupon.code,
          type: coupon.type,
          value: coupon.value,
          restrictedPlan: coupon.plan,
          discounts,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Payment error:", error);
    return new Response(
      JSON.stringify({ error: "Payment processing failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
