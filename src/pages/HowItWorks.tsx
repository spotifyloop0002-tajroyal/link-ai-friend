import { motion } from "framer-motion";
import { 
  UserPlus, 
  Link2, 
  MessageSquare, 
  Send,
  BarChart3,
  ArrowRight,
  Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";

const steps = [
  {
    number: "01",
    icon: UserPlus,
    title: "Create Your Account",
    description: "Sign up in seconds and complete your profile. Tell us about your role, industry, and LinkedIn goals.",
    details: [
      "Quick 2-minute setup",
      "Connect your LinkedIn profile",
      "Choose your content style"
    ]
  },
  {
    number: "02",
    icon: Link2,
    title: "Install Chrome Extension",
    description: "Our lightweight extension works in the background to post content naturally, just like you would manually.",
    details: [
      "One-click installation",
      "Secure & privacy-focused",
      "Mimics human behavior"
    ]
  },
  {
    number: "03",
    icon: MessageSquare,
    title: "Chat with AI Agent",
    description: "Simply tell our AI what you want to post about. It understands your industry, audience, and voice.",
    details: [
      "Natural conversation",
      "Context-aware suggestions",
      "Multiple agent personalities"
    ]
  },
  {
    number: "04",
    icon: Send,
    title: "Schedule & Publish",
    description: "Review the generated content, make edits if needed, and schedule for optimal posting times.",
    details: [
      "Smart scheduling",
      "Bulk post creation",
      "Calendar management"
    ]
  },
  {
    number: "05",
    icon: BarChart3,
    title: "Track Performance",
    description: "Monitor your posts' performance with real-time analytics. See what works and optimize your strategy.",
    details: [
      "Real-time metrics",
      "Engagement insights",
      "Growth tracking"
    ]
  },
];

const HowItWorks = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="pt-24">
        {/* Hero Section */}
        <section className="py-16 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-background to-background" />
          
          <div className="container relative z-10 px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-center max-w-3xl mx-auto mb-16"
            >
              <span className="text-primary font-semibold text-sm uppercase tracking-wider">
                How It Works
              </span>
              <h1 className="text-4xl md:text-6xl font-bold mt-4 mb-6">
                From Zero to
                <br />
                <span className="gradient-text">LinkedIn Pro</span>
              </h1>
              <p className="text-lg text-muted-foreground">
                Get started in minutes. Our streamlined process makes it easy to automate 
                your LinkedIn content creation and grow your professional presence.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Steps Section */}
        <section className="py-16">
          <div className="container px-4">
            <div className="max-w-4xl mx-auto space-y-12">
              {steps.map((step, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: index % 2 === 0 ? -50 : 50 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="relative"
                >
                  <div className="flex flex-col md:flex-row gap-6 items-start">
                    {/* Number & Icon */}
                    <div className="flex-shrink-0">
                      <div className="relative">
                        <div className="w-20 h-20 rounded-2xl gradient-bg flex items-center justify-center shadow-lg">
                          <step.icon className="w-10 h-10 text-primary-foreground" />
                        </div>
                        <span className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-background border-2 border-primary flex items-center justify-center text-xs font-bold text-primary">
                          {step.number}
                        </span>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 p-6 rounded-2xl bg-card border border-border shadow-lg">
                      <h3 className="text-2xl font-bold mb-3">{step.title}</h3>
                      <p className="text-muted-foreground mb-4">{step.description}</p>
                      <ul className="space-y-2">
                        {step.details.map((detail, i) => (
                          <li key={i} className="flex items-center gap-2 text-sm">
                            <Check className="w-4 h-4 text-success" />
                            <span>{detail}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Connector line */}
                  {index < steps.length - 1 && (
                    <div className="hidden md:block absolute left-10 top-24 w-0.5 h-12 bg-gradient-to-b from-primary to-transparent" />
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20">
          <div className="container px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center max-w-2xl mx-auto"
            >
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                Ready to Get Started?
              </h2>
              <p className="text-muted-foreground mb-8">
                It only takes a few minutes to set up. Start creating engaging LinkedIn content today.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button 
                  variant="gradient" 
                  size="lg" 
                  onClick={() => navigate("/signup")}
                  className="gap-2"
                >
                  Start Free Trial
                  <ArrowRight className="w-4 h-4" />
                </Button>
                <Button 
                  variant="outline" 
                  size="lg" 
                  onClick={() => navigate("/features")}
                >
                  View All Features
                </Button>
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default HowItWorks;
