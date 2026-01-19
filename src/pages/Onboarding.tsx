import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Bot, Building2, User, ArrowRight, ArrowLeft, Check, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

const industries = [
  "Technology",
  "Healthcare",
  "Finance",
  "E-commerce",
  "Education",
  "Marketing",
  "Real Estate",
  "Consulting",
  "Manufacturing",
  "Other",
];

const postingGoals = [
  { id: "thought-leadership", label: "Thought Leadership" },
  { id: "networking", label: "Networking" },
  { id: "personal-brand", label: "Build Personal Brand" },
  { id: "promote-services", label: "Promote Services" },
];

const Onboarding = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [accountType, setAccountType] = useState<"company" | "personal" | null>(null);
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

  const addTopic = () => {
    if (topicInput.trim() && !topics.includes(topicInput.trim())) {
      setTopics([...topics, topicInput.trim()]);
      setTopicInput("");
    }
  };

  const removeTopic = (topic: string) => {
    setTopics(topics.filter((t) => t !== topic));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addTopic();
    }
  };

  const toggleGoal = (goalId: string) => {
    setSelectedGoals((prev) =>
      prev.includes(goalId)
        ? prev.filter((g) => g !== goalId)
        : [...prev, goalId]
    );
  };

  const handleComplete = () => {
    navigate("/dashboard");
  };

  const canProceedStep2 = () => {
    if (accountType === "company") {
      return companyName && industry && companyDescription;
    }
    return fullName && profession && background;
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
                s <= step
                  ? "w-12 gradient-bg"
                  : "w-8 bg-muted"
              }`}
            />
          ))}
        </div>

        {/* Step content */}
        <div className="bg-card rounded-2xl border border-border shadow-lg p-8">
          <AnimatePresence mode="wait">
            {step === 1 && (
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
                    <div className={`w-14 h-14 rounded-xl mb-4 flex items-center justify-center ${
                      accountType === "company" ? "gradient-bg" : "bg-muted"
                    }`}>
                      <Building2 className={`w-7 h-7 ${
                        accountType === "company" ? "text-primary-foreground" : "text-muted-foreground"
                      }`} />
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
                    <div className={`w-14 h-14 rounded-xl mb-4 flex items-center justify-center ${
                      accountType === "personal" ? "gradient-bg" : "bg-muted"
                    }`}>
                      <User className={`w-7 h-7 ${
                        accountType === "personal" ? "text-primary-foreground" : "text-muted-foreground"
                      }`} />
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
                    onClick={() => setStep(2)}
                    className="gap-2"
                  >
                    Continue
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </motion.div>
            )}

            {step === 2 && accountType === "company" && (
              <motion.div
                key="step2-company"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <h2 className="text-xl font-semibold mb-6">
                  Tell us about your company
                </h2>

                <div className="space-y-5">
                  <div>
                    <Label htmlFor="companyName">Company Name *</Label>
                    <Input
                      id="companyName"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="e.g., Acme Inc."
                      className="mt-1.5"
                    />
                  </div>

                  <div>
                    <Label htmlFor="industry">Industry *</Label>
                    <Select value={industry} onValueChange={setIndustry}>
                      <SelectTrigger className="mt-1.5">
                        <SelectValue placeholder="Select your industry" />
                      </SelectTrigger>
                      <SelectContent>
                        {industries.map((ind) => (
                          <SelectItem key={ind} value={ind.toLowerCase()}>
                            {ind}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="description">What does your company do? *</Label>
                    <Textarea
                      id="description"
                      value={companyDescription}
                      onChange={(e) => setCompanyDescription(e.target.value)}
                      placeholder="Briefly describe your products or services..."
                      maxLength={200}
                      className="mt-1.5 min-h-[100px]"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {companyDescription.length}/200 characters
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="audience">Target Audience</Label>
                    <Input
                      id="audience"
                      value={targetAudience}
                      onChange={(e) => setTargetAudience(e.target.value)}
                      placeholder="e.g., CTOs at tech startups"
                      className="mt-1.5"
                    />
                  </div>

                  <div>
                    <Label htmlFor="location">City/Location</Label>
                    <Input
                      id="location"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="e.g., San Francisco, CA"
                      className="mt-1.5"
                    />
                  </div>

                  <div>
                    <Label>Default Posting Topics</Label>
                    <div className="flex gap-2 mt-1.5">
                      <Input
                        value={topicInput}
                        onChange={(e) => setTopicInput(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Add a topic and press Enter"
                      />
                      <Button variant="outline" onClick={addTopic}>
                        Add
                      </Button>
                    </div>
                    {topics.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {topics.map((topic) => (
                          <span
                            key={topic}
                            className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm"
                          >
                            {topic}
                            <button
                              onClick={() => removeTopic(topic)}
                              className="hover:bg-primary/20 rounded-full p-0.5"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-between mt-8">
                  <Button variant="ghost" onClick={() => setStep(1)} className="gap-2">
                    <ArrowLeft className="w-4 h-4" />
                    Back
                  </Button>
                  <Button
                    variant="gradient"
                    size="lg"
                    disabled={!canProceedStep2()}
                    onClick={() => setStep(3)}
                    className="gap-2"
                  >
                    Continue
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </motion.div>
            )}

            {step === 2 && accountType === "personal" && (
              <motion.div
                key="step2-personal"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <h2 className="text-xl font-semibold mb-6">
                  Tell us about yourself
                </h2>

                <div className="space-y-5">
                  <div>
                    <Label htmlFor="fullName">Your Name *</Label>
                    <Input
                      id="fullName"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g., John Doe"
                      className="mt-1.5"
                    />
                  </div>

                  <div>
                    <Label htmlFor="profession">Your Role/Profession *</Label>
                    <Input
                      id="profession"
                      value={profession}
                      onChange={(e) => setProfession(e.target.value)}
                      placeholder="e.g., Marketing Director"
                      className="mt-1.5"
                    />
                  </div>

                  <div>
                    <Label htmlFor="background">Your Background *</Label>
                    <Textarea
                      id="background"
                      value={background}
                      onChange={(e) => setBackground(e.target.value)}
                      placeholder="Tell us about your experience and expertise..."
                      maxLength={200}
                      className="mt-1.5 min-h-[100px]"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {background.length}/200 characters
                    </p>
                  </div>

                  <div>
                    <Label>Topics You Want to Post About</Label>
                    <div className="flex gap-2 mt-1.5">
                      <Input
                        value={topicInput}
                        onChange={(e) => setTopicInput(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Add a topic and press Enter"
                      />
                      <Button variant="outline" onClick={addTopic}>
                        Add
                      </Button>
                    </div>
                    {topics.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {topics.map((topic) => (
                          <span
                            key={topic}
                            className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm"
                          >
                            {topic}
                            <button
                              onClick={() => removeTopic(topic)}
                              className="hover:bg-primary/20 rounded-full p-0.5"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <Label>Posting Goals</Label>
                    <div className="grid sm:grid-cols-2 gap-3 mt-2">
                      {postingGoals.map((goal) => (
                        <label
                          key={goal.id}
                          className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer transition-colors"
                        >
                          <Checkbox
                            checked={selectedGoals.includes(goal.id)}
                            onCheckedChange={() => toggleGoal(goal.id)}
                          />
                          <span className="text-sm">{goal.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex justify-between mt-8">
                  <Button variant="ghost" onClick={() => setStep(1)} className="gap-2">
                    <ArrowLeft className="w-4 h-4" />
                    Back
                  </Button>
                  <Button
                    variant="gradient"
                    size="lg"
                    disabled={!canProceedStep2()}
                    onClick={() => setStep(3)}
                    className="gap-2"
                  >
                    Continue
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="text-center py-8"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", duration: 0.5 }}
                  className="w-20 h-20 rounded-full bg-success/20 flex items-center justify-center mx-auto mb-6"
                >
                  <Check className="w-10 h-10 text-success" />
                </motion.div>

                <h2 className="text-2xl font-bold mb-3">You're All Set!</h2>
                <p className="text-muted-foreground mb-8 max-w-sm mx-auto">
                  Your account is ready. Start creating AI-powered LinkedIn content that engages your audience.
                </p>

                <Button
                  variant="gradient"
                  size="xl"
                  onClick={handleComplete}
                  className="gap-2"
                >
                  Go to Dashboard
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};

export default Onboarding;
