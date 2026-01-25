import { useState } from "react";
import { motion } from "framer-motion";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useSubscription, PLAN_LIMITS } from "@/hooks/useSubscription";
import { usePayment, PLAN_PRICING } from "@/hooks/usePayment";
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
  X,
  Sparkles,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

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
  const { status, isLoading: subscriptionLoading, fetchSubscriptionStatus } = useSubscription();
  const { 
    isLoading: paymentLoading, 
    couponValidation, 
    validateCoupon, 
    clearCoupon, 
    createPayment,
    calculateFinalPrice,
  } = usePayment();

  const [couponCode, setCouponCode] = useState("");
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<"pro" | "business" | null>(null);

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    
    setIsApplyingCoupon(true);
    const result = await validateCoupon(couponCode);
    setIsApplyingCoupon(false);
    
    if (result.valid) {
      toast.success("Coupon applied successfully!");
    } else {
      toast.error(result.error || "Invalid coupon code");
    }
  };

  const handleRemoveCoupon = () => {
    clearCoupon();
    setCouponCode("");
    toast.info("Coupon removed");
  };

  const handleUpgrade = async (plan: "pro" | "business") => {
    setSelectedPlan(plan);
    
    const result = await createPayment(
      plan,
      couponValidation?.valid ? couponValidation.code : undefined,
      async () => {
        await fetchSubscriptionStatus();
        setSelectedPlan(null);
        clearCoupon();
        setCouponCode("");
      }
    );

    if (!result.success && result.error !== "Payment cancelled") {
      toast.error(result.error || "Payment failed");
    }
    
    setSelectedPlan(null);
  };

  if (subscriptionLoading) {
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
      <div className="space-y-8 max-w-4xl mx-auto">
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
                Have a coupon code? Enter it below to get a discount on your subscription.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3 items-start">
                <div className="flex-1 space-y-2">
                  <div className="flex gap-3">
                    <Input
                      placeholder="Enter coupon code"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      className="max-w-sm"
                      disabled={!!couponValidation?.valid}
                    />
                    {couponValidation?.valid ? (
                      <Button variant="outline" onClick={handleRemoveCoupon}>
                        <X className="w-4 h-4 mr-2" />
                        Remove
                      </Button>
                    ) : (
                      <Button 
                        onClick={handleApplyCoupon}
                        disabled={!couponCode.trim() || isApplyingCoupon}
                      >
                        {isApplyingCoupon ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : null}
                        Apply
                      </Button>
                    )}
                  </div>
                  
                  {couponValidation?.valid && (
                    <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 dark:bg-green-950/30 px-3 py-2 rounded-lg">
                      <Check className="w-4 h-4" />
                      <span>
                        Coupon <strong>{couponValidation.code}</strong> applied! 
                        {couponValidation.type === "percentage" 
                          ? ` ${couponValidation.value}% off`
                          : ` ₹${couponValidation.value} off`
                        }
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Pricing Plans */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Choose Your Plan</CardTitle>
              <CardDescription>Select the plan that best fits your needs</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-6">
                {(["free", "pro", "business"] as const).map((plan) => {
                  const limits = PLAN_LIMITS[plan];
                  const Icon = planIcons[plan];
                  const isCurrentPlan = status?.plan === plan;
                  const pricing = plan !== "free" ? calculateFinalPrice(plan, couponValidation) : null;
                  const isProcessing = selectedPlan === plan && paymentLoading;
                  
                  return (
                    <motion.div 
                      key={plan}
                      whileHover={plan !== "free" && !isCurrentPlan ? { scale: 1.02 } : {}}
                      className={`p-6 rounded-xl border-2 transition-all ${
                        isCurrentPlan 
                          ? "border-primary bg-primary/5" 
                          : plan === "pro"
                            ? "border-primary/50 bg-gradient-to-b from-primary/5 to-transparent"
                            : "border-border hover:border-primary/30"
                      }`}
                    >
                      {/* Plan Header */}
                      <div className="flex items-center gap-2 mb-4">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          plan === "free" ? "bg-muted" : "gradient-bg"
                        }`}>
                          <Icon className={`w-5 h-5 ${plan === "free" ? "text-muted-foreground" : "text-primary-foreground"}`} />
                        </div>
                        <div>
                          <span className="font-bold capitalize text-lg">{plan}</span>
                          {plan === "pro" && (
                            <Badge variant="secondary" className="ml-2 text-xs">Popular</Badge>
                          )}
                        </div>
                      </div>

                      {/* Pricing */}
                      <div className="mb-4">
                        {plan === "free" ? (
                          <div className="text-2xl font-bold">Free</div>
                        ) : pricing ? (
                          <div className="space-y-1">
                            {pricing.discount > 0 ? (
                              <>
                                <div className="flex items-baseline gap-2">
                                  <span className="text-2xl font-bold text-primary">
                                    ₹{pricing.final}
                                  </span>
                                  <span className="text-sm text-muted-foreground line-through">
                                    ₹{pricing.original}
                                  </span>
                                  <span className="text-xs text-muted-foreground">/month</span>
                                </div>
                                <div className="text-xs text-green-600 flex items-center gap-1">
                                  <Sparkles className="w-3 h-3" />
                                  You save ₹{pricing.discount}!
                                </div>
                              </>
                            ) : (
                              <div className="flex items-baseline gap-1">
                                <span className="text-2xl font-bold">₹{pricing.original}</span>
                                <span className="text-sm text-muted-foreground">/month</span>
                              </div>
                            )}
                            <div className="text-xs text-muted-foreground">
                              (${PLAN_PRICING[plan].usd} USD)
                            </div>
                          </div>
                        ) : null}
                      </div>

                      {/* Features */}
                      <ul className="space-y-2 text-sm mb-6">
                        <li className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                          {limits.agents === -1 ? "Unlimited" : limits.agents} Agent{limits.agents !== 1 ? "s" : ""}
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                          {limits.postsPerMonth} posts/month
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                          {limits.postsPerDay} posts/day
                        </li>
                        {limits.aiImageGeneration && (
                          <li className="flex items-center gap-2">
                            <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                            AI Image Generation
                          </li>
                        )}
                        {limits.smartScheduling && (
                          <li className="flex items-center gap-2">
                            <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                            Smart Scheduling
                          </li>
                        )}
                      </ul>

                      {/* Action Button */}
                      {isCurrentPlan ? (
                        <Badge variant="outline" className="w-full justify-center py-2">
                          Current Plan
                        </Badge>
                      ) : plan !== "free" ? (
                        <Button 
                          className="w-full"
                          variant={plan === "pro" ? "gradient" : "secondary"}
                          onClick={() => handleUpgrade(plan)}
                          disabled={paymentLoading}
                        >
                          {isProcessing ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin mr-2" />
                              Processing...
                            </>
                          ) : pricing?.final === 0 ? (
                            "Activate Free"
                          ) : (
                            `Upgrade to ${plan.charAt(0).toUpperCase() + plan.slice(1)}`
                          )}
                        </Button>
                      ) : null}
                    </motion.div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Payment Security */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4" />
                  <span>Secure Payment via Razorpay</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  <span>256-bit SSL Encryption</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  <span>Cancel Anytime</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </DashboardLayout>
  );
};

export default BillingPage;
