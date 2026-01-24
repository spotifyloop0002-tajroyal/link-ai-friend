import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { Search, MessageCircle, Mail, FileQuestion } from "lucide-react";
import { Input } from "@/components/ui/input";

const faqs = [
  {
    question: "How do I install the Chrome extension?",
    answer: "Visit the Chrome Web Store, search for LinkedBot, and click 'Add to Chrome'. Then sign in with your LinkedBot account.",
  },
  {
    question: "Is my LinkedIn account safe?",
    answer: "Yes! Our extension mimics human behavior and never stores your LinkedIn credentials. We prioritize your account safety.",
  },
  {
    question: "Can I cancel my subscription anytime?",
    answer: "Absolutely. You can cancel your subscription at any time from your billing settings. No questions asked.",
  },
  {
    question: "How does AI content generation work?",
    answer: "Our AI analyzes your profile, industry, and preferences to generate personalized content that matches your voice and goals.",
  },
];

const HelpCenter = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="container px-4 max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold mb-4">Help Center</h1>
          <p className="text-muted-foreground mb-8">Find answers to common questions or get in touch with our support team.</p>
          
          <div className="relative mb-12">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input 
              placeholder="Search for help..."
              className="pl-12 h-14 text-lg"
            />
          </div>

          <h2 className="text-2xl font-semibold mb-6">Frequently Asked Questions</h2>
          <div className="space-y-4 mb-12">
            {faqs.map((faq, index) => (
              <details 
                key={index}
                className="p-6 rounded-2xl bg-card border border-border group"
              >
                <summary className="font-semibold cursor-pointer flex items-center gap-3">
                  <FileQuestion className="w-5 h-5 text-primary" />
                  {faq.question}
                </summary>
                <p className="mt-4 text-muted-foreground pl-8">{faq.answer}</p>
              </details>
            ))}
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl bg-card border border-border text-center">
              <MessageCircle className="w-12 h-12 text-primary mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Live Chat</h3>
              <p className="text-muted-foreground">Chat with our support team in real-time.</p>
            </div>
            <div className="p-6 rounded-2xl bg-card border border-border text-center">
              <Mail className="w-12 h-12 text-primary mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Email Support</h3>
              <p className="text-muted-foreground">support@linkedbot.com</p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default HelpCenter;
