import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Check, Zap, Crown, Rocket } from "lucide-react";
import { useNavigate } from "react-router-dom";

const plans = [
  {
    name: "Free",
    icon: Zap,
    price: "$0",
    period: "forever",
    description: "Perfect for getting started with LinkedIn automation",
    features: [
      "1 Active Agent",
      "5 posts per month",
      "Basic analytics",
      "Photo upload",
      "Community support",
    ],
    cta: "Get Started Free",
    popular: false,
  },
  {
    name: "Pro",
    icon: Crown,
    price: "$19",
    period: "per month",
    description: "For professionals serious about LinkedIn growth",
    features: [
      "3 Active Agents",
      "30 posts per month",
      "Advanced analytics",
      "AI photo generation",
      "Smart scheduling",
      "Priority support",
      "Custom voice training",
    ],
    cta: "Start Pro Trial",
    popular: true,
  },
  {
    name: "Business",
    icon: Rocket,
    price: "$49",
    period: "per month",
    description: "For teams and agencies managing multiple brands",
    features: [
      "Unlimited Agents",
      "Unlimited posts",
      "Full analytics suite",
      "AI photo generation",
      "Smart scheduling",
      "Priority support",
      "Custom voice training",
      "A/B testing (coming soon)",
      "Team collaboration",
    ],
    cta: "Start Business Trial",
    popular: false,
  },
];

const Pricing = () => {
  const navigate = useNavigate();

  return (
    <section className="py-24 relative overflow-hidden" id="pricing">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-muted/30 via-background to-background" />
      
      <div className="container relative z-10 px-4">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <span className="text-primary font-semibold text-sm uppercase tracking-wider">
            Pricing
          </span>
          <h2 className="text-3xl md:text-5xl font-bold mt-4 mb-6">
            Simple, Transparent Pricing
          </h2>
          <p className="text-lg text-muted-foreground">
            Start free and scale as you grow. No hidden fees, cancel anytime.
          </p>
        </motion.div>

        {/* Pricing cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className={`relative ${plan.popular ? 'md:-mt-4 md:mb-4' : ''}`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full gradient-bg text-primary-foreground text-sm font-medium">
                  Most Popular
                </div>
              )}
              
              <div className={`h-full p-8 rounded-2xl border ${plan.popular ? 'border-primary shadow-glow' : 'border-border shadow-lg'} bg-card flex flex-col`}>
                {/* Plan header */}
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-12 h-12 rounded-xl ${plan.popular ? 'gradient-bg' : 'bg-muted'} flex items-center justify-center`}>
                    <plan.icon className={`w-6 h-6 ${plan.popular ? 'text-primary-foreground' : 'text-foreground'}`} />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold">{plan.name}</h3>
                  </div>
                </div>

                {/* Price */}
                <div className="mb-4">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground ml-2">/{plan.period}</span>
                </div>

                <p className="text-muted-foreground mb-6">{plan.description}</p>

                {/* Features */}
                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full bg-success/20 flex items-center justify-center flex-shrink-0">
                        <Check className="w-3 h-3 text-success" />
                      </div>
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <Button
                  variant={plan.popular ? "gradient" : "outline"}
                  size="lg"
                  className="w-full"
                  onClick={() => navigate("/login")}
                >
                  {plan.cta}
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Pricing;
