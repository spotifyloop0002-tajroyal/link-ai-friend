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
  Zap
} from "lucide-react";

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

const Features = () => {
  return (
    <section className="py-24 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-muted/30 to-background" />
      
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
            Features
          </span>
          <h2 className="text-3xl md:text-5xl font-bold mt-4 mb-6">
            Everything You Need to
            <br />
            <span className="gradient-text">Dominate LinkedIn</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            LinkedBot combines cutting-edge AI with smart automation to transform 
            how you create and publish LinkedIn content.
          </p>
        </motion.div>

        {/* Stats row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex flex-wrap justify-center gap-8 mb-20"
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

        {/* Features grid */}
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
                {/* Icon */}
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300`}>
                  <feature.icon className="w-7 h-7 text-primary-foreground" />
                </div>
                
                {/* Content */}
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
  );
};

export default Features;
