import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Bot, ArrowLeft, Loader2, Mail, Lock, User, ShieldCheck, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useToast } from "@/hooks/use-toast";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

type SignupStep = "email" | "otp" | "password";

const Signup = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [step, setStep] = useState<SignupStep>("email");

  // Form fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('onboarding_completed')
          .eq('user_id', session.user.id)
          .maybeSingle();

        if (profile?.onboarding_completed) {
          navigate("/dashboard");
        } else {
          navigate("/onboarding");
        }
      }
      setCheckingAuth(false);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('onboarding_completed')
          .eq('user_id', session.user.id)
          .maybeSingle();

        if (profile?.onboarding_completed) {
          navigate("/dashboard");
        } else {
          navigate("/onboarding");
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handleSendOtp = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!name.trim() || !email.trim()) {
      toast({ title: "Missing fields", description: "Please fill in your name and email", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-otp", {
        body: { email: email.trim() },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({ title: "OTP Sent!", description: `Verification code sent to ${email}` });
      setStep("otp");
      setResendCooldown(60);
    } catch (err: any) {
      toast({ title: "Failed to send OTP", description: err.message || "Please try again", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (otp.length !== 6) {
      toast({ title: "Invalid OTP", description: "Please enter the 6-digit code", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("verify-otp", {
        body: { email: email.trim(), otp: otp.trim() },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({ title: "Email Verified!", description: "Now create your password" });
      setStep("password");
    } catch (err: any) {
      toast({ title: "Verification failed", description: err.message || "Invalid or expired OTP", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast({ title: "Password too short", description: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/onboarding`,
          data: { full_name: name.trim() },
        },
      });

      if (error) throw error;

      if (data.session?.user && data.session.access_token) {
        initializeUserInExtension(data.session.user.id, data.session.user.email, data.session.access_token);
        toast({ title: "Account created!", description: "Welcome to LinkedBot. Let's set up your account." });
      }
    } catch (error) {
      console.error('Sign up error:', error);
      toast({ title: "Sign up failed", description: error instanceof Error ? error.message : "Failed to create account", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setIsLoading(true);
    try {
      const { error } = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (error) throw error;
    } catch (error) {
      console.error('Google signup error:', error);
      toast({ title: "Signup failed", description: error instanceof Error ? error.message : "Failed to sign up with Google", variant: "destructive" });
      setIsLoading(false);
    }
  };

  const initializeUserInExtension = (userId: string, email: string | undefined, accessToken?: string) => {
    console.log('🔒 Initializing user in extension:', userId);
    const windowWithBridge = window as any;
    if (typeof windowWithBridge.LinkedBotBridge !== 'undefined' && typeof windowWithBridge.LinkedBotBridge.setCurrentUser === 'function') {
      windowWithBridge.LinkedBotBridge.setCurrentUser(userId);
    }
    if (accessToken) {
      console.log('📤 Sending auth to extension');
      window.postMessage({ type: 'SET_AUTH', userId, accessToken }, '*');
    }
    window.postMessage({ type: 'INITIALIZE_USER', userId, email: email || null }, '*');
    window.postMessage({ type: 'SET_CURRENT_USER', userId }, '*');
    console.log('✅ Auth sent to extension');
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const stepIndicator = (
    <div className="flex items-center justify-center gap-2 mb-8">
      {(["email", "otp", "password"] as SignupStep[]).map((s, i) => (
        <div key={s} className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
            step === s ? "bg-primary text-primary-foreground" :
            (["email", "otp", "password"].indexOf(step) > i) ? "bg-primary/20 text-primary" :
            "bg-muted text-muted-foreground"
          }`}>
            {i + 1}
          </div>
          {i < 2 && <div className={`w-8 h-0.5 ${["email", "otp", "password"].indexOf(step) > i ? "bg-primary/40" : "bg-muted"}`} />}
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left side - Decorative */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div className="absolute inset-0 gradient-hero-bg" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[size:4rem_4rem]" />
        
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
        
        <div className="relative z-10 flex flex-col justify-center items-center w-full px-12">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="text-center">
            <div className="w-20 h-20 rounded-2xl bg-primary-foreground/20 backdrop-blur-sm flex items-center justify-center mx-auto mb-8">
              <Bot className="w-12 h-12 text-primary-foreground" />
            </div>
            <h1 className="text-4xl font-bold text-primary-foreground mb-4">Join LinkedBot</h1>
            <p className="text-xl text-primary-foreground/80 max-w-md">
              Start creating engaging LinkedIn content with AI-powered automation. Free to get started.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Right side - Signup form */}
      <div className="w-full lg:w-1/2 flex flex-col">
        <div className="p-6">
          <Button variant="ghost" onClick={() => step === "email" ? navigate("/") : setStep(step === "password" ? "otp" : "email")} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            {step === "email" ? "Back to home" : "Back"}
          </Button>
        </div>

        <div className="flex-1 flex items-center justify-center px-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="w-full max-w-md">
            {/* Mobile logo */}
            <div className="lg:hidden flex items-center gap-2 justify-center mb-8">
              <div className="w-12 h-12 rounded-xl gradient-bg flex items-center justify-center">
                <Bot className="w-7 h-7 text-primary-foreground" />
              </div>
              <span className="text-2xl font-bold">LinkedBot</span>
            </div>

            {stepIndicator}

            <AnimatePresence mode="wait">
              {/* STEP 1: Name & Email */}
              {step === "email" && (
                <motion.div key="email" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>
                  <div className="text-center mb-8">
                    <h2 className="text-3xl font-bold mb-2">Create your account</h2>
                    <p className="text-muted-foreground">Sign up to get started with LinkedBot</p>
                  </div>

                  <form onSubmit={handleSendOtp} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input id="name" type="text" placeholder="John Doe" value={name} onChange={(e) => setName(e.target.value)} className="pl-10" disabled={isLoading} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10" disabled={isLoading} />
                      </div>
                    </div>

                    <Button type="submit" variant="gradient" size="xl" className="w-full gap-2" disabled={isLoading}>
                      {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><span>Verify Email</span><ArrowRight className="w-4 h-4" /></>}
                    </Button>
                  </form>

                  {/* Divider */}
                  <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
                    </div>
                  </div>

                  <Button variant="outline" size="xl" className="w-full gap-3" onClick={handleGoogleSignUp} disabled={isLoading}>
                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                    )}
                    Sign up with Google
                  </Button>
                </motion.div>
              )}

              {/* STEP 2: OTP Verification */}
              {step === "otp" && (
                <motion.div key="otp" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>
                  <div className="text-center mb-8">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                      <ShieldCheck className="w-8 h-8 text-primary" />
                    </div>
                    <h2 className="text-3xl font-bold mb-2">Verify your email</h2>
                    <p className="text-muted-foreground">
                      We sent a 6-digit code to <span className="font-medium text-foreground">{email}</span>
                    </p>
                  </div>

                  <form onSubmit={handleVerifyOtp} className="space-y-6">
                    <div className="flex justify-center">
                      <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                        <InputOTPGroup>
                          <InputOTPSlot index={0} />
                          <InputOTPSlot index={1} />
                          <InputOTPSlot index={2} />
                          <InputOTPSlot index={3} />
                          <InputOTPSlot index={4} />
                          <InputOTPSlot index={5} />
                        </InputOTPGroup>
                      </InputOTP>
                    </div>

                    <Button type="submit" variant="gradient" size="xl" className="w-full" disabled={isLoading || otp.length !== 6}>
                      {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Verify Code"}
                    </Button>
                  </form>

                  <p className="text-center text-sm text-muted-foreground mt-4">
                    Didn't receive the code?{" "}
                    {resendCooldown > 0 ? (
                      <span>Resend in {resendCooldown}s</span>
                    ) : (
                      <button type="button" onClick={() => handleSendOtp()} className="text-primary hover:underline font-medium">
                        Resend OTP
                      </button>
                    )}
                  </p>
                </motion.div>
              )}

              {/* STEP 3: Password */}
              {step === "password" && (
                <motion.div key="password" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>
                  <div className="text-center mb-8">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                      <ShieldCheck className="w-8 h-8 text-primary" />
                    </div>
                    <h2 className="text-3xl font-bold mb-2">Set your password</h2>
                    <p className="text-muted-foreground">
                      Email verified! Now create a secure password.
                    </p>
                  </div>

                  <form onSubmit={handleCreateAccount} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input id="password" type="password" placeholder="Min. 6 characters" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10" disabled={isLoading} />
                      </div>
                      <p className="text-xs text-muted-foreground">Must be at least 6 characters</p>
                    </div>

                    <Button type="submit" variant="gradient" size="xl" className="w-full" disabled={isLoading}>
                      {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Create Account"}
                    </Button>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Toggle sign in */}
            <p className="text-center text-sm text-muted-foreground mt-6">
              Already have an account?{" "}
              <button type="button" onClick={() => navigate("/login")} className="text-primary hover:underline font-medium">
                Sign in
              </button>
            </p>

            <p className="text-center text-xs text-muted-foreground mt-4">
              By continuing, you agree to LinkedBot's{" "}
              <a href="#" className="text-primary hover:underline">Terms of Service</a>{" "}
              and{" "}
              <a href="#" className="text-primary hover:underline">Privacy Policy</a>
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Signup;
