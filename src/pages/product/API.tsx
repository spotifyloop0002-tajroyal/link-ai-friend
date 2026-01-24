import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { Code, Key, Webhook, FileJson } from "lucide-react";
import { Button } from "@/components/ui/button";

const API = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="container px-4 max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <div className="w-20 h-20 rounded-2xl gradient-bg flex items-center justify-center mx-auto mb-6">
              <Code className="w-10 h-10 text-primary-foreground" />
            </div>
            <h1 className="text-4xl font-bold mb-4">API Access</h1>
            <p className="text-muted-foreground max-w-2xl mx-auto mb-8">
              Integrate LinkedBot directly into your applications with our powerful REST API.
              Available on Pro and Enterprise plans.
            </p>
            <Button variant="gradient" size="lg">
              View API Docs
            </Button>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <div className="p-6 rounded-2xl bg-card border border-border text-center">
              <Key className="w-10 h-10 text-primary mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">API Keys</h3>
              <p className="text-muted-foreground text-sm">Secure authentication with rotating API keys.</p>
            </div>
            <div className="p-6 rounded-2xl bg-card border border-border text-center">
              <Webhook className="w-10 h-10 text-primary mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Webhooks</h3>
              <p className="text-muted-foreground text-sm">Real-time notifications for post events.</p>
            </div>
            <div className="p-6 rounded-2xl bg-card border border-border text-center">
              <FileJson className="w-10 h-10 text-primary mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">RESTful</h3>
              <p className="text-muted-foreground text-sm">Clean, well-documented JSON endpoints.</p>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-muted/50 border border-border">
            <h3 className="font-semibold mb-4">Example Request</h3>
            <pre className="text-sm text-muted-foreground overflow-x-auto">
{`curl -X POST https://api.linkedbot.com/v1/posts \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"content": "Your post content", "schedule": "2026-01-25T10:00:00Z"}'`}
            </pre>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default API;
