import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { Users, MessageSquare, Award, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

const Community = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="container px-4 max-w-4xl mx-auto text-center">
          <div className="w-20 h-20 rounded-2xl gradient-bg flex items-center justify-center mx-auto mb-6">
            <Users className="w-10 h-10 text-primary-foreground" />
          </div>
          <h1 className="text-4xl font-bold mb-4">Join Our Community</h1>
          <p className="text-muted-foreground mb-12 max-w-2xl mx-auto">
            Connect with thousands of LinkedIn creators, share tips, get feedback, and grow together.
          </p>
          
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <div className="p-6 rounded-2xl bg-card border border-border">
              <MessageSquare className="w-10 h-10 text-primary mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Discussion Forums</h3>
              <p className="text-muted-foreground text-sm">Share ideas and learn from other creators.</p>
            </div>
            <div className="p-6 rounded-2xl bg-card border border-border">
              <Award className="w-10 h-10 text-primary mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Exclusive Content</h3>
              <p className="text-muted-foreground text-sm">Access member-only resources and templates.</p>
            </div>
            <div className="p-6 rounded-2xl bg-card border border-border">
              <Sparkles className="w-10 h-10 text-primary mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Weekly Events</h3>
              <p className="text-muted-foreground text-sm">Join live workshops and Q&A sessions.</p>
            </div>
          </div>

          <Button variant="gradient" size="lg">
            Join the Community
          </Button>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Community;
