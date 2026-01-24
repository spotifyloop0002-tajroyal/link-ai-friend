import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { Book, Chrome, MessageSquare, Calendar, BarChart3, Settings } from "lucide-react";

const docs = [
  {
    icon: Book,
    title: "Getting Started",
    description: "Learn the basics of LinkedBot and set up your account in minutes.",
  },
  {
    icon: Chrome,
    title: "Chrome Extension",
    description: "Install and configure the LinkedBot Chrome extension for seamless posting.",
  },
  {
    icon: MessageSquare,
    title: "AI Agents",
    description: "Create and customize AI agents for different content styles.",
  },
  {
    icon: Calendar,
    title: "Scheduling",
    description: "Master the scheduling system for optimal posting times.",
  },
  {
    icon: BarChart3,
    title: "Analytics",
    description: "Understand your post performance and engagement metrics.",
  },
  {
    icon: Settings,
    title: "Settings & Configuration",
    description: "Customize LinkedBot to match your workflow.",
  },
];

const Documentation = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="container px-4 max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold mb-4">Documentation</h1>
          <p className="text-muted-foreground mb-12">Everything you need to get the most out of LinkedBot.</p>
          
          <div className="grid md:grid-cols-2 gap-6">
            {docs.map((doc, index) => (
              <div 
                key={index}
                className="p-6 rounded-2xl bg-card border border-border hover:border-primary/50 transition-colors cursor-pointer"
              >
                <div className="w-12 h-12 rounded-xl gradient-bg flex items-center justify-center mb-4">
                  <doc.icon className="w-6 h-6 text-primary-foreground" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{doc.title}</h3>
                <p className="text-muted-foreground">{doc.description}</p>
              </div>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Documentation;
