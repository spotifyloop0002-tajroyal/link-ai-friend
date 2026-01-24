import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { Chrome, Shield, Zap, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";

const features = [
  {
    icon: Zap,
    title: "One-Click Posting",
    description: "Schedule and publish posts directly from your browser without switching tabs.",
  },
  {
    icon: Shield,
    title: "Safe & Secure",
    description: "Your credentials never leave your browser. We prioritize your account safety.",
  },
  {
    icon: Eye,
    title: "Human-Like Behavior",
    description: "Our extension mimics natural human interactions to keep your account safe.",
  },
];

const ChromeExtension = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="container px-4 max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <div className="w-20 h-20 rounded-2xl gradient-bg flex items-center justify-center mx-auto mb-6">
              <Chrome className="w-10 h-10 text-primary-foreground" />
            </div>
            <h1 className="text-4xl font-bold mb-4">Chrome Extension</h1>
            <p className="text-muted-foreground max-w-2xl mx-auto mb-8">
              The LinkedBot Chrome extension is the bridge between our AI and your LinkedIn profile. 
              It handles posting securely and naturally.
            </p>
            <Button variant="gradient" size="lg">
              Install Extension
            </Button>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <div 
                key={index}
                className="p-6 rounded-2xl bg-card border border-border text-center"
              >
                <div className="w-14 h-14 rounded-xl gradient-bg flex items-center justify-center mx-auto mb-4">
                  <feature.icon className="w-7 h-7 text-primary-foreground" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ChromeExtension;
