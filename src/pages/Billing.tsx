import { useState } from "react";
import { motion } from "framer-motion";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useSubscription, PLAN_LIMITS } from "@/hooks/useSubscription";
import { 
  CreditCard, 
  Check, 
  Crown, 
  Zap, 
  Rocket, 
  Tag,
  Calendar,
  BarChart3,
  Bot,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";

const planIcons = {
  free: Zap,
  pro: Crown,
  business: Rocket,
};

const planColors = {
  free: "bg-muted text-muted-foreground",
  pro: "bg-primary text-primary-foreground",
  business: "bg-secondary text-secondary-foreground",
};

const BillingPage = () => {
  const { status, isLoading, applyCoupon } = useSubscription();
  const [couponCode, setCouponCode] = useState("");
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    
    setIsApplyingCoupon(true);
    await applyCoupon(couponCode);
    setCouponCode("");
    setIsApplyingCoupon(false);
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  const PlanIcon = planIcons[status?.plan || "free"];
  const currentLimits = status?.limits || PLAN_LIMITS.free;

  return (
    <DashboardLayout>
      <div className="space-y-8 max-w-4xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-3xl font-bold">Billing & Subscription</h1>
          <p className="text-muted-foreground mt-1">
            Manage your subscription and billing details
          </p>
        </motion.div>

        {/* Current Plan */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${status?.plan === "free" ? "bg-muted" : "gradient-bg"}`}>
                    <PlanIcon className={`w-6 h-6 ${status?.plan === "free" ? "text-foreground" : "text-primary-foreground"}`} />
                  </div>
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {status?.plan?.charAt(0).toUpperCase()}{status?.plan?.slice(1)} Plan
                      <Badge className={planColors[status?.plan || "free"]}>
                        {status?.plan === "free" ? "Current" : "Active"}
                      </Badge>
                    </CardTitle>
                    <CardDescription>
                      {status?.expiresAt 
                        ? `Expires on ${format(new Date(status.expiresAt), "MMMM d, yyyy")}`
                        : status?.plan === "free" ? "Free forever" : "Active subscription"
                      }
                    </CardDescription>
                  </div>
                </div>
                {status?.plan === "free" && (
                  <Button variant="gradient">Upgrade Plan</Button>
                )}
              </div>
            </CardHeader>
          </Card>
        </motion.div>

        {/* Usage Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid md:grid-cols-3 gap-4"
        >
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                Daily Posts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{status?.postsToday || 0} used</span>
                  <span className="text-muted-foreground">{currentLimits.postsPerDay} limit</span>
                </div>
                <Progress 
                  value={((status?.postsToday || 0) / currentLimits.postsPerDay) * 100} 
                  className="h-2"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" />
                Monthly Posts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{status?.postsThisMonth || 0} used</span>
                  <span className="text-muted-foreground">{currentLimits.postsPerMonth} limit</span>
                </div>
                <Progress 
                  value={((status?.postsThisMonth || 0) / currentLimits.postsPerMonth) * 100} 
                  className="h-2"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Bot className="w-4 h-4 text-primary" />
                Active Agents
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{status?.agentsCount || 0} active</span>
                  <span className="text-muted-foreground">
                    {currentLimits.agents === -1 ? "Unlimited" : `${currentLimits.agents} limit`}
                  </span>
                </div>
                <Progress 
                  value={currentLimits.agents === -1 ? 10 : ((status?.agentsCount || 0) / currentLimits.agents) * 100} 
                  className="h-2"
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Coupon Code */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Tag className="w-5 h-5 text-primary" />
                Apply Coupon Code
              </CardTitle>
              <CardDescription>
                Have a coupon code? Enter it below to apply a discount or upgrade your plan.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3">
                <Input
                  placeholder="Enter coupon code (e.g., FREE2026)"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  className="max-w-sm"
                />
                <Button 
                  onClick={handleApplyCoupon}
                  disabled={!couponCode.trim() || isApplyingCoupon}
                >
                  {isApplyingCoupon ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : null}
                  Apply
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Plan Comparison */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Compare Plans</CardTitle>
              <CardDescription>Choose the right plan for your needs</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-6">
                {(["free", "pro", "business"] as const).map((plan) => {
                  const limits = PLAN_LIMITS[plan];
                  const Icon = planIcons[plan];
                  const isCurrentPlan = status?.plan === plan;
                  
                  return (
                    <div 
                      key={plan}
                      className={`p-4 rounded-xl border ${isCurrentPlan ? "border-primary bg-primary/5" : "border-border"}`}
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <Icon className={`w-5 h-5 ${plan === "free" ? "text-muted-foreground" : "text-primary"}`} />
                        <span className="font-semibold capitalize">{plan}</span>
                        {isCurrentPlan && (
                          <Badge variant="outline" className="ml-auto text-xs">Current</Badge>
                        )}
                      </div>
                      <ul className="space-y-2 text-sm">
                        <li className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-success" />
                          {limits.agents === -1 ? "Unlimited" : limits.agents} Agent{limits.agents !== 1 ? "s" : ""}
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-success" />
                          {limits.postsPerMonth} posts/month
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-success" />
                          {limits.postsPerDay} posts/day
                        </li>
                        {limits.aiImageGeneration && (
                          <li className="flex items-center gap-2">
                            <Check className="w-4 h-4 text-success" />
                            AI Image Generation
                          </li>
                        )}
                      </ul>
                      {!isCurrentPlan && plan !== "free" && (
                        <Button variant="outline" className="w-full mt-4" size="sm">
                          Upgrade to {plan.charAt(0).toUpperCase() + plan.slice(1)}
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Payment Method */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-primary" />
                Payment Method
              </CardTitle>
              <CardDescription>
                {status?.plan === "free" 
                  ? "Add a payment method to upgrade your plan"
                  : "Manage your payment methods"
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline">
                <CreditCard className="w-4 h-4 mr-2" />
                Add Payment Method
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </DashboardLayout>
  );
};

export default BillingPage;
