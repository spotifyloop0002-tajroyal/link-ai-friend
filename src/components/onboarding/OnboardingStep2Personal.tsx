import { motion } from "framer-motion";
import { ArrowRight, ArrowLeft, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";

const postingGoals = [
  { id: "thought-leadership", label: "Thought Leadership" },
  { id: "networking", label: "Networking" },
  { id: "personal-brand", label: "Build Personal Brand" },
  { id: "promote-services", label: "Promote Services" },
];

interface OnboardingStep2PersonalProps {
  fullName: string;
  setFullName: (value: string) => void;
  profession: string;
  setProfession: (value: string) => void;
  background: string;
  setBackground: (value: string) => void;
  topics: string[];
  setTopics: (topics: string[]) => void;
  topicInput: string;
  setTopicInput: (value: string) => void;
  selectedGoals: string[];
  setSelectedGoals: (goals: string[]) => void;
  onBack: () => void;
  onNext: () => void;
}

export const OnboardingStep2Personal = ({
  fullName,
  setFullName,
  profession,
  setProfession,
  background,
  setBackground,
  topics,
  setTopics,
  topicInput,
  setTopicInput,
  selectedGoals,
  setSelectedGoals,
  onBack,
  onNext,
}: OnboardingStep2PersonalProps) => {
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
    setSelectedGoals(
      selectedGoals.includes(goalId)
        ? selectedGoals.filter((g) => g !== goalId)
        : [...selectedGoals, goalId]
    );
  };

  const canProceed = fullName && profession && background;

  return (
    <motion.div
      key="step2-personal"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
    >
      <h2 className="text-xl font-semibold mb-6">Tell us about yourself</h2>

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
        <Button variant="ghost" onClick={onBack} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
        <Button
          variant="gradient"
          size="lg"
          disabled={!canProceed}
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
