import { motion } from "framer-motion";
import { Building2, User, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface OnboardingStep1Props {
  accountType: "company" | "personal" | null;
  setAccountType: (type: "company" | "personal") => void;
  onNext: () => void;
}

export const OnboardingStep1 = ({
  accountType,
  setAccountType,
  onNext,
}: OnboardingStep1Props) => {
  return (
    <motion.div
      key="step1"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
    >
      <h2 className="text-xl font-semibold mb-6">
        What are you using LinkedBot for?
      </h2>

      <div className="grid sm:grid-cols-2 gap-4">
        <button
          onClick={() => setAccountType("company")}
          className={`p-6 rounded-xl border-2 transition-all duration-300 text-left hover:border-primary/50 ${
            accountType === "company"
              ? "border-primary bg-primary/5"
              : "border-border"
          }`}
        >
          <div
            className={`w-14 h-14 rounded-xl mb-4 flex items-center justify-center ${
              accountType === "company" ? "gradient-bg" : "bg-muted"
            }`}
          >
            <Building2
              className={`w-7 h-7 ${
                accountType === "company"
                  ? "text-primary-foreground"
                  : "text-muted-foreground"
              }`}
            />
          </div>
          <h3 className="font-semibold text-lg mb-1">My Company</h3>
          <p className="text-sm text-muted-foreground">
            Build your company's LinkedIn presence and generate leads
          </p>
        </button>

        <button
          onClick={() => setAccountType("personal")}
          className={`p-6 rounded-xl border-2 transition-all duration-300 text-left hover:border-primary/50 ${
            accountType === "personal"
              ? "border-primary bg-primary/5"
              : "border-border"
          }`}
        >
          <div
            className={`w-14 h-14 rounded-xl mb-4 flex items-center justify-center ${
              accountType === "personal" ? "gradient-bg" : "bg-muted"
            }`}
          >
            <User
              className={`w-7 h-7 ${
                accountType === "personal"
                  ? "text-primary-foreground"
                  : "text-muted-foreground"
              }`}
            />
          </div>
          <h3 className="font-semibold text-lg mb-1">Personal Brand</h3>
          <p className="text-sm text-muted-foreground">
            Grow your personal influence and professional network
          </p>
        </button>
      </div>

      <div className="flex justify-end mt-8">
        <Button
          variant="gradient"
          size="lg"
          disabled={!accountType}
          onClick={onNext}
          className="gap-2"
        >
          Continue
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </motion.div>
  );
};
