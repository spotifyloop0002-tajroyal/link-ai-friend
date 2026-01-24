import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useUserProfile } from "@/hooks/useUserProfile";
import { supabase } from "@/integrations/supabase/client";
import { OnboardingStep1 } from "@/components/onboarding/OnboardingStep1";
import { OnboardingStep2Company } from "@/components/onboarding/OnboardingStep2Company";
import { OnboardingStep2Personal } from "@/components/onboarding/OnboardingStep2Personal";

const Onboarding = () => {
  const [checkingAuth, setCheckingAuth] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { completeOnboarding } = useUserProfile();

  // Check auth on mount
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: "Please log in",
          description: "You need to be logged in to complete onboarding.",
          variant: "destructive",
        });
        navigate("/login");
        return;
      }
      setCheckingAuth(false);
    };
    
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        navigate("/login");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, toast]);
  
  const [step, setStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [accountType, setAccountType] = useState<"company" | "personal" | null>(null);
  
  // Common fields
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");

  // Company form state
  const [companyName, setCompanyName] = useState("");
  const [industry, setIndustry] = useState("");
  const [companyDescription, setCompanyDescription] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [location, setLocation] = useState("");

  // Personal form state
  const [fullName, setFullName] = useState("");
  const [profession, setProfession] = useState("");
  const [background, setBackground] = useState("");

  const handleComplete = async () => {
    setIsSaving(true);
    
    try {
      const profileData = {
        user_type: accountType,
        linkedin_profile_url: linkedinUrl,
        linkedin_profile_url_locked: true, // Lock the URL after save
        phone_number: phoneNumber,
        city,
        country,
        ...(accountType === "company"
          ? {
              name: companyName,
              company_name: companyName,
              industry,
              company_description: companyDescription,
              target_audience: targetAudience,
              location,
            }
          : {
              name: fullName,
              role: profession,
              background,
            }),
      };

      const success = await completeOnboarding(profileData);
      
      if (success) {
        toast({
          title: "Welcome to LinkedBot!",
          description: "Your account has been set up successfully.",
        });
        navigate("/dashboard");
      }
    } catch (err) {
      toast({
        title: "Setup failed",
        description: err instanceof Error ? err.message : "An error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl gradient-bg flex items-center justify-center mx-auto mb-6">
            <Bot className="w-10 h-10 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Let's Set Up Your Account</h1>
          <p className="text-muted-foreground">
            Tell us about yourself so we can create better content for you
          </p>
        </div>

        {/* Progress indicator - Now only 2 steps */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2].map((s) => (
            <div
              key={s}
              className={`h-2 rounded-full transition-all duration-300 ${
                s <= step ? "w-16 gradient-bg" : "w-12 bg-muted"
              }`}
            />
          ))}
        </div>

        {/* Step content */}
        <div className="bg-card rounded-2xl border border-border shadow-lg p-8">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <OnboardingStep1
                accountType={accountType}
                setAccountType={setAccountType}
                onNext={() => setStep(2)}
              />
            )}

            {step === 2 && accountType === "company" && (
              <OnboardingStep2Company
                companyName={companyName}
                setCompanyName={setCompanyName}
                industry={industry}
                setIndustry={setIndustry}
                companyDescription={companyDescription}
                setCompanyDescription={setCompanyDescription}
                targetAudience={targetAudience}
                setTargetAudience={setTargetAudience}
                location={location}
                setLocation={setLocation}
                linkedinUrl={linkedinUrl}
                setLinkedinUrl={setLinkedinUrl}
                phoneNumber={phoneNumber}
                setPhoneNumber={setPhoneNumber}
                city={city}
                setCity={setCity}
                country={country}
                setCountry={setCountry}
                onBack={() => setStep(1)}
                onNext={handleComplete}
              />
            )}

            {step === 2 && accountType === "personal" && (
              <OnboardingStep2Personal
                fullName={fullName}
                setFullName={setFullName}
                profession={profession}
                setProfession={setProfession}
                background={background}
                setBackground={setBackground}
                linkedinUrl={linkedinUrl}
                setLinkedinUrl={setLinkedinUrl}
                phoneNumber={phoneNumber}
                setPhoneNumber={setPhoneNumber}
                city={city}
                setCity={setCity}
                country={country}
                setCountry={setCountry}
                onBack={() => setStep(1)}
                onNext={handleComplete}
              />
            )}
          </AnimatePresence>
        </div>

        {isSaving && (
          <div className="fixed inset-0 bg-background/80 flex items-center justify-center z-50">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-muted-foreground">Setting up your account...</p>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default Onboarding;
