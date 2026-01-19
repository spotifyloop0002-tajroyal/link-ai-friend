import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Bot, Linkedin, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const Login = () => {
  const navigate = useNavigate();
  const [showLinkedInModal, setShowLinkedInModal] = useState(false);

  const handleGoogleLogin = () => {
    setShowLinkedInModal(true);
  };

  const handleLinkedInLogin = () => {
    // Simulate login - in production this would be OAuth
    navigate("/onboarding");
  };

  const handleConnectLinkedIn = () => {
    setShowLinkedInModal(false);
    navigate("/onboarding");
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left side - Decorative */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div className="absolute inset-0 gradient-hero-bg" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[size:4rem_4rem]" />
        
        {/* Floating elements */}
        <motion.div
          className="absolute top-1/4 left-1/4 w-20 h-20 bg-primary-foreground/20 rounded-2xl backdrop-blur-sm"
          animate={{ y: [0, -20, 0], rotate: [0, 5, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-1/3 right-1/4 w-16 h-16 bg-primary-foreground/20 rounded-full backdrop-blur-sm"
          animate={{ y: [0, 20, 0], rotate: [0, -5, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute top-1/2 right-1/3 w-12 h-12 bg-primary-foreground/20 rounded-lg backdrop-blur-sm"
          animate={{ y: [0, 15, 0], rotate: [0, 10, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />
        
        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center items-center w-full px-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            <div className="w-20 h-20 rounded-2xl bg-primary-foreground/20 backdrop-blur-sm flex items-center justify-center mx-auto mb-8">
              <Bot className="w-12 h-12 text-primary-foreground" />
            </div>
            <h1 className="text-4xl font-bold text-primary-foreground mb-4">
              Welcome to LinkedBot
            </h1>
            <p className="text-xl text-primary-foreground/80 max-w-md">
              Your AI-powered LinkedIn automation tool. Create, schedule, and post engaging content effortlessly.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Right side - Login form */}
      <div className="w-full lg:w-1/2 flex flex-col">
        {/* Back button */}
        <div className="p-6">
          <Button variant="ghost" onClick={() => navigate("/")} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to home
          </Button>
        </div>

        {/* Login content */}
        <div className="flex-1 flex items-center justify-center px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-md"
          >
            {/* Mobile logo */}
            <div className="lg:hidden flex items-center gap-2 justify-center mb-8">
              <div className="w-12 h-12 rounded-xl gradient-bg flex items-center justify-center">
                <Bot className="w-7 h-7 text-primary-foreground" />
              </div>
              <span className="text-2xl font-bold">LinkedBot</span>
            </div>

            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold mb-2">Get started</h2>
              <p className="text-muted-foreground">
                Sign in to continue to LinkedBot
              </p>
            </div>

            {/* Login options */}
            <div className="space-y-4">
              <Button
                variant="linkedin"
                size="xl"
                className="w-full gap-3"
                onClick={handleLinkedInLogin}
              >
                <Linkedin className="w-5 h-5" />
                Continue with LinkedIn
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    Or
                  </span>
                </div>
              </div>

              <Button
                variant="google"
                size="xl"
                className="w-full gap-3"
                onClick={handleGoogleLogin}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </Button>
            </div>

            <p className="text-center text-sm text-muted-foreground mt-8">
              By continuing, you agree to LinkedBot's{" "}
              <a href="#" className="text-primary hover:underline">
                Terms of Service
              </a>{" "}
              and{" "}
              <a href="#" className="text-primary hover:underline">
                Privacy Policy
              </a>
            </p>
          </motion.div>
        </div>
      </div>

      {/* LinkedIn Connection Modal */}
      <Dialog open={showLinkedInModal} onOpenChange={setShowLinkedInModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Linkedin className="w-5 h-5 text-primary" />
              Connect Your LinkedIn Account
            </DialogTitle>
            <DialogDescription>
              To use LinkedBot, you need to connect your LinkedIn account. This allows us to post content on your behalf.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-6">
              We'll only access your LinkedIn profile to publish posts you've approved. Your data is secure and encrypted.
            </p>
            <Button
              variant="linkedin"
              className="w-full gap-2"
              onClick={handleConnectLinkedIn}
            >
              <Linkedin className="w-5 h-5" />
              Connect LinkedIn Account
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Login;
