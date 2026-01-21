import { forwardRef } from "react";
import { Bot, Linkedin, Twitter, Github } from "lucide-react";

const Footer = forwardRef<HTMLElement>((_, ref) => {
  return (
    <footer ref={ref} className="bg-sidebar text-sidebar-foreground py-16">
      <div className="container px-4">
        <div className="grid md:grid-cols-4 gap-12 mb-12">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center">
                <Bot className="w-6 h-6 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold">LinkedBot</span>
            </div>
            <p className="text-sidebar-foreground/70 text-sm leading-relaxed mb-6">
              Your AI-powered LinkedIn automation tool. Create, schedule, and post engaging content effortlessly.
            </p>
            <div className="flex gap-4">
              <a href="#" className="w-10 h-10 rounded-lg bg-sidebar-accent flex items-center justify-center hover:bg-sidebar-accent/80 transition-colors">
                <Linkedin className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 rounded-lg bg-sidebar-accent flex items-center justify-center hover:bg-sidebar-accent/80 transition-colors">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 rounded-lg bg-sidebar-accent flex items-center justify-center hover:bg-sidebar-accent/80 transition-colors">
                <Github className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Product links */}
          <div>
            <h4 className="font-semibold mb-4">Product</h4>
            <ul className="space-y-3 text-sm text-sidebar-foreground/70">
              <li><a href="#features" className="hover:text-sidebar-foreground transition-colors">Features</a></li>
              <li><a href="#pricing" className="hover:text-sidebar-foreground transition-colors">Pricing</a></li>
              <li><a href="#" className="hover:text-sidebar-foreground transition-colors">Chrome Extension</a></li>
              <li><a href="#" className="hover:text-sidebar-foreground transition-colors">API</a></li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="font-semibold mb-4">Resources</h4>
            <ul className="space-y-3 text-sm text-sidebar-foreground/70">
              <li><a href="#" className="hover:text-sidebar-foreground transition-colors">Documentation</a></li>
              <li><a href="#" className="hover:text-sidebar-foreground transition-colors">Blog</a></li>
              <li><a href="#" className="hover:text-sidebar-foreground transition-colors">Help Center</a></li>
              <li><a href="#" className="hover:text-sidebar-foreground transition-colors">Community</a></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-semibold mb-4">Legal</h4>
            <ul className="space-y-3 text-sm text-sidebar-foreground/70">
              <li><a href="#" className="hover:text-sidebar-foreground transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-sidebar-foreground transition-colors">Terms of Service</a></li>
              <li><a href="#" className="hover:text-sidebar-foreground transition-colors">Cookie Policy</a></li>
              <li><a href="#" className="hover:text-sidebar-foreground transition-colors">GDPR</a></li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-sidebar-border flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-sidebar-foreground/60">
            © {new Date().getFullYear()} LinkedBot. All rights reserved.
          </p>
          <p className="text-sm text-sidebar-foreground/60">
            Made with ❤️ for LinkedIn creators
          </p>
        </div>
      </div>
    </footer>
  );
});

Footer.displayName = "Footer";

export default Footer;
