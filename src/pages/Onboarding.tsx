import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useUserProfile } from "@/hooks/useUserProfile";
import { OnboardingStep1 } from "@/components/onboarding/OnboardingStep1";
import { OnboardingStep2Company } from "@/components/onboarding/OnboardingStep2Company";
import { OnboardingStep2Personal } from "@/components/onboarding/OnboardingStep2Personal";
import { OnboardingStep3 } from "@/components/onboarding/OnboardingStep3";

const Onboarding = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { completeOnboarding } = useUserProfile();
  
  const [step, setStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [accountType, setAccountType] = useState<"company" | "personal" | null>(null);
  
  // Shared state
  const [topics, setTopics] = useState<string[]>([]);
  const [topicInput, setTopicInput] = useState("");
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);

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
        default_topics: topics,
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
              posting_goals: selectedGoals,
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

        {/* Progress indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-2 rounded-full transition-all duration-300 ${
                s <= step ? "w-12 gradient-bg" : "w-8 bg-muted"
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
                topics={topics}
                setTopics={setTopics}
                topicInput={topicInput}
                setTopicInput={setTopicInput}
                onBack={() => setStep(1)}
                onNext={() => setStep(3)}
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
                topics={topics}
                setTopics={setTopics}
                topicInput={topicInput}
                setTopicInput={setTopicInput}
                selectedGoals={selectedGoals}
                setSelectedGoals={setSelectedGoals}
                onBack={() => setStep(1)}
                onNext={() => setStep(3)}
              />
            )}

            {step === 3 && (
              <OnboardingStep3
                onBack={() => setStep(2)}
                onComplete={handleComplete}
                isSaving={isSaving}
              />
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};

export default Onboarding;
