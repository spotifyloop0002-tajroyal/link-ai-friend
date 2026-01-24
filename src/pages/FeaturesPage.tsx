import { motion } from "framer-motion";
import { 
  Bot, 
  Calendar, 
  BarChart3, 
  Image, 
  Chrome, 
  Sparkles,
  Clock,
  Target,
  Zap,
  ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import dashboardPreview from "@/assets/dashboard-preview.png";

const features = [
  {
    icon: Bot,
    title: "AI Content Generation",
    description: "Powered by Gemini AI, LinkedBot creates engaging posts that match your brand voice and resonate with your audience.",
    color: "from-primary to-primary/60",
  },
  {
    icon: Calendar,
    title: "Smart Scheduling",
    description: "Our AI analyzes optimal posting times based on your industry and audience for maximum engagement.",
    color: "from-secondary to-secondary/60",
  },
  {
    icon: BarChart3,
    title: "Analytics Dashboard",
    description: "Track your reach, engagement, and growth with beautiful charts and actionable insights.",
    color: "from-success to-success/60",
  },
  {
    icon: Image,
    title: "AI Photo Generation",
    description: "Generate stunning, relevant images for your posts using Stable Diffusion AI technology.",
    color: "from-warning to-warning/60",
  },
  {
    icon: Chrome,
    title: "Chrome Extension",
    description: "Our extension mimics human behavior to post naturally, keeping your account safe and authentic.",
    color: "from-primary to-secondary",
  },
  {
    icon: Sparkles,
    title: "Multiple Agents",
    description: "Create different AI agents for various content types - professional, humorous, storytelling, and more.",
    color: "from-secondary to-primary",
  },
];

const stats = [
  { icon: Clock, value: "10hrs+", label: "Saved Weekly" },
  { icon: Target, value: "3x", label: "More Engagement" },
  { icon: Zap, value: "24/7", label: "Always Working" },
];

const FeaturesPage = () => {
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
              className="text-center max-w-3xl mx-auto mb-12"
            >
              <span className="text-primary font-semibold text-sm uppercase tracking-wider">
                Features
              </span>
              <h1 className="text-4xl md:text-6xl font-bold mt-4 mb-6">
                Everything You Need to
                <br />
                <span className="gradient-text">Dominate LinkedIn</span>
              </h1>
              <p className="text-lg text-muted-foreground">
                LinkedBot combines cutting-edge AI with smart automation to transform 
                how you create and publish LinkedIn content.
              </p>
            </motion.div>

            {/* Dashboard Preview */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="relative max-w-5xl mx-auto"
            >
              <div className="relative rounded-2xl overflow-hidden border border-border shadow-2xl bg-card">
                {/* Browser Chrome */}
                <div className="flex items-center gap-2 px-4 py-3 bg-muted/50 border-b border-border">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-destructive/60" />
                    <div className="w-3 h-3 rounded-full bg-warning/60" />
                    <div className="w-3 h-3 rounded-full bg-success/60" />
                  </div>
                  <div className="flex-1 flex justify-center">
                    <div className="px-4 py-1 rounded-md bg-background/50 text-xs text-muted-foreground">
                      linkedbot4.lovable.app/dashboard
                    </div>
                  </div>
                </div>
                
                {/* Dashboard Image */}
                <img 
                  src={dashboardPreview} 
                  alt="LinkedBot Dashboard Preview showing analytics, scheduled posts, and engagement metrics"
                  className="w-full h-auto"
                />
              </div>
              
              {/* Decorative elements */}
              <div className="absolute -z-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-gradient-radial from-primary/20 via-transparent to-transparent blur-3xl" />
            </motion.div>
          </div>
        </section>

        {/* Stats row */}
        <section className="py-12">
          <div className="container px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="flex flex-wrap justify-center gap-8"
            >
              {stats.map((stat, index) => (
                <div
                  key={index}
                  className="flex items-center gap-4 px-6 py-4 rounded-2xl bg-card border border-border shadow-lg"
                >
                  <div className="w-12 h-12 rounded-xl gradient-bg flex items-center justify-center">
                    <stat.icon className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{stat.value}</div>
                    <div className="text-sm text-muted-foreground">{stat.label}</div>
                  </div>
                </div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* Features grid */}
        <section className="py-16">
          <div className="container px-4">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="group relative"
                >
                  <div className="h-full p-6 rounded-2xl bg-card border border-border shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                    <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300`}>
                      <feature.icon className="w-7 h-7 text-primary-foreground" />
                    </div>
                    <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                    <p className="text-muted-foreground leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
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
                Ready to Transform Your LinkedIn Presence?
              </h2>
              <p className="text-muted-foreground mb-8">
                Join thousands of professionals who are already growing their LinkedIn with LinkedBot.
              </p>
              <Button 
                variant="gradient" 
                size="lg" 
                onClick={() => navigate("/signup")}
                className="gap-2"
              >
                Get Started Free
                <ArrowRight className="w-4 h-4" />
              </Button>
            </motion.div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default FeaturesPage;
