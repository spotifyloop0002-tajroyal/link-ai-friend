import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export const DAILY_LIMITS = {
  free: 1,
  pro: 2,
  business: 3,
} as const;

export const MONTHLY_LIMITS = {
  free: 5,
  pro: 30,
  business: 60,
} as const;

export type PlanType = keyof typeof DAILY_LIMITS;

interface PostingLimitsStatus {
  plan: PlanType;
  postsToday: number;
  postsThisMonth: number;
  dailyLimit: number;
  monthlyLimit: number;
  canPost: boolean;
  remainingToday: number;
  remainingThisMonth: number;
  limitMessage: string | null;
}

export const usePostingLimits = () => {
  const [status, setStatus] = useState<PostingLimitsStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkLimits = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setStatus(null);
        setIsLoading(false);
        return;
      }

      // Get user profile for plan
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('subscription_plan')
        .eq('user_id', user.id)
        .maybeSingle();

      const plan = (profile?.subscription_plan as PlanType) || 'free';
      const dailyLimit = DAILY_LIMITS[plan] || DAILY_LIMITS.free;
      const monthlyLimit = MONTHLY_LIMITS[plan] || MONTHLY_LIMITS.free;

      // Get today's date range (start and end of day in UTC)
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      // Get month's date range
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);

      // Count posts SUCCESSFULLY POSTED today (only 'posted' status counts)
      const { count: postsToday } = await supabase
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'posted') // Only count successfully posted!
        .gte('created_at', todayStart.toISOString())
        .lte('created_at', todayEnd.toISOString());

      // Count posts SUCCESSFULLY POSTED this month (only 'posted' status counts)
      const { count: postsThisMonth } = await supabase
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'posted') // Only count successfully posted!
        .gte('created_at', monthStart.toISOString());

      const todayCount = postsToday || 0;
      const monthCount = postsThisMonth || 0;

      const canPostDaily = todayCount < dailyLimit;
      const canPostMonthly = monthCount < monthlyLimit;
      const canPost = canPostDaily && canPostMonthly;

      let limitMessage: string | null = null;
      if (!canPostDaily) {
        limitMessage = `⚠️ Daily limit reached. You can create ${dailyLimit} post${dailyLimit > 1 ? 's' : ''}/day on the ${plan} plan. Upgrade for more!`;
      } else if (!canPostMonthly) {
        limitMessage = `⚠️ Monthly limit reached. You can create ${monthlyLimit} posts/month on the ${plan} plan. Upgrade for more!`;
      }

      setStatus({
        plan,
        postsToday: todayCount,
        postsThisMonth: monthCount,
        dailyLimit,
        monthlyLimit,
        canPost,
        remainingToday: Math.max(0, dailyLimit - todayCount),
        remainingThisMonth: Math.max(0, monthlyLimit - monthCount),
        limitMessage,
      });
    } catch (error) {
      console.error('Error checking posting limits:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkLimits();
  }, [checkLimits]);

  const incrementPostCount = useCallback(async () => {
    // Refresh limits after creating a post
    await checkLimits();
  }, [checkLimits]);

  return {
    status,
    isLoading,
    checkLimits,
    incrementPostCount,
    canPost: status?.canPost ?? true,
    limitMessage: status?.limitMessage ?? null,
  };
};
