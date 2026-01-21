import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// Plan limits configuration
export const PLAN_LIMITS = {
  free: { 
    agents: 1, 
    postsPerMonth: 5, 
    postsPerDay: 1,
    aiImageGeneration: false,
    smartScheduling: false,
  },
  pro: { 
    agents: 3, 
    postsPerMonth: 30, 
    postsPerDay: 2,
    aiImageGeneration: true,
    smartScheduling: true,
  },
  business: { 
    agents: -1, // unlimited 
    postsPerMonth: 60, 
    postsPerDay: 3,
    aiImageGeneration: true,
    smartScheduling: true,
  },
};

// Active coupons
const ACTIVE_COUPONS: Record<string, { plan: string; duration: number; description: string }> = {
  "FREE2026": { plan: "pro", duration: 30, description: "Free Pro Plan for 30 days" },
};

export interface SubscriptionStatus {
  plan: "free" | "pro" | "business";
  isActive: boolean;
  expiresAt: string | null;
  postsThisMonth: number;
  postsToday: number;
  agentsCount: number;
  limits: typeof PLAN_LIMITS.free;
  canCreatePost: boolean;
  canCreateAgent: boolean;
  remainingPostsToday: number;
  remainingPostsThisMonth: number;
}

export const useSubscription = () => {
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchSubscriptionStatus = useCallback(async () => {
    try {
      setIsLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setStatus(null);
        return;
      }

      // Get user profile with subscription info
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("subscription_plan, subscription_expires_at, posts_created_count, posts_scheduled_count, posts_published_count")
        .eq("user_id", user.id)
        .maybeSingle();

      // Get posts created today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { count: postsToday } = await supabase
        .from("posts")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("created_at", today.toISOString());

      // Get posts created this month
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      
      const { count: postsThisMonth } = await supabase
        .from("posts")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("created_at", monthStart.toISOString());

      // Count agents (mock - you'd have an agents table)
      const agentsCount = 2; // Placeholder

      // Determine plan
      let plan: "free" | "pro" | "business" = "free";
      const subscriptionPlan = profile?.subscription_plan?.toLowerCase();
      
      if (subscriptionPlan === "pro" || subscriptionPlan === "business") {
        // Check if subscription is still active
        const expiresAt = profile?.subscription_expires_at;
        if (expiresAt) {
          const expiryDate = new Date(expiresAt);
          if (expiryDate > new Date()) {
            plan = subscriptionPlan as "pro" | "business";
          }
        } else {
          plan = subscriptionPlan as "pro" | "business";
        }
      }

      const limits = PLAN_LIMITS[plan];
      const dailyPostsUsed = postsToday || 0;
      const monthlyPostsUsed = postsThisMonth || 0;

      const subscriptionStatus: SubscriptionStatus = {
        plan,
        isActive: plan !== "free" || true,
        expiresAt: profile?.subscription_expires_at || null,
        postsThisMonth: monthlyPostsUsed,
        postsToday: dailyPostsUsed,
        agentsCount,
        limits,
        canCreatePost: dailyPostsUsed < limits.postsPerDay && monthlyPostsUsed < limits.postsPerMonth,
        canCreateAgent: limits.agents === -1 || agentsCount < limits.agents,
        remainingPostsToday: Math.max(0, limits.postsPerDay - dailyPostsUsed),
        remainingPostsThisMonth: Math.max(0, limits.postsPerMonth - monthlyPostsUsed),
      };

      setStatus(subscriptionStatus);
    } catch (error) {
      console.error("Error fetching subscription status:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const applyCoupon = useCallback(async (couponCode: string): Promise<boolean> => {
    const normalizedCode = couponCode.trim().toUpperCase();
    const coupon = ACTIVE_COUPONS[normalizedCode];

    if (!coupon) {
      toast({
        title: "Invalid coupon",
        description: "This coupon code is not valid or has expired.",
        variant: "destructive",
      });
      return false;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Not authenticated",
          description: "Please log in to apply a coupon.",
          variant: "destructive",
        });
        return false;
      }

      // Check if coupon was already used
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("subscription_plan")
        .eq("user_id", user.id)
        .maybeSingle();

      // Calculate expiry date
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + coupon.duration);

      // Update subscription
      const { error } = await supabase
        .from("user_profiles")
        .update({
          subscription_plan: coupon.plan,
          subscription_expires_at: expiryDate.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);

      if (error) throw error;

      toast({
        title: "Coupon applied!",
        description: coupon.description,
      });

      await fetchSubscriptionStatus();
      return true;
    } catch (error) {
      console.error("Error applying coupon:", error);
      toast({
        title: "Error",
        description: "Failed to apply coupon. Please try again.",
        variant: "destructive",
      });
      return false;
    }
  }, [fetchSubscriptionStatus, toast]);

  const checkPostLimit = useCallback((): { allowed: boolean; message?: string } => {
    if (!status) return { allowed: false, message: "Loading subscription status..." };

    if (status.postsToday >= status.limits.postsPerDay) {
      return {
        allowed: false,
        message: `Daily limit reached (${status.limits.postsPerDay} posts/day). Upgrade to ${status.plan === "free" ? "Pro" : "Business"} for more posts.`,
      };
    }

    if (status.postsThisMonth >= status.limits.postsPerMonth) {
      return {
        allowed: false,
        message: `Monthly limit reached (${status.limits.postsPerMonth} posts/month). Upgrade your plan for more posts.`,
      };
    }

    return { allowed: true };
  }, [status]);

  const checkAgentLimit = useCallback((): { allowed: boolean; message?: string } => {
    if (!status) return { allowed: false, message: "Loading subscription status..." };

    if (status.limits.agents !== -1 && status.agentsCount >= status.limits.agents) {
      return {
        allowed: false,
        message: `Agent limit reached (${status.limits.agents} agents). Upgrade your plan to create more agents.`,
      };
    }

    return { allowed: true };
  }, [status]);

  useEffect(() => {
    fetchSubscriptionStatus();
  }, [fetchSubscriptionStatus]);

  return {
    status,
    isLoading,
    fetchSubscriptionStatus,
    applyCoupon,
    checkPostLimit,
    checkAgentLimit,
    PLAN_LIMITS,
  };
};
