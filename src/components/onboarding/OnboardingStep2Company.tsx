import { motion } from "framer-motion";
import { ArrowRight, ArrowLeft, X } from "lucide-react";
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

interface OnboardingStep2CompanyProps {
  companyName: string;
  setCompanyName: (value: string) => void;
  industry: string;
  setIndustry: (value: string) => void;
  companyDescription: string;
  setCompanyDescription: (value: string) => void;
  targetAudience: string;
  setTargetAudience: (value: string) => void;
  location: string;
  setLocation: (value: string) => void;
  topics: string[];
  setTopics: (topics: string[]) => void;
  topicInput: string;
  setTopicInput: (value: string) => void;
  onBack: () => void;
  onNext: () => void;
}

export const OnboardingStep2Company = ({
  companyName,
  setCompanyName,
  industry,
  setIndustry,
  companyDescription,
  setCompanyDescription,
  targetAudience,
  setTargetAudience,
  location,
  setLocation,
  topics,
  setTopics,
  topicInput,
  setTopicInput,
  onBack,
  onNext,
}: OnboardingStep2CompanyProps) => {
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

  const canProceed = companyName && industry && companyDescription;

  return (
    <motion.div
      key="step2-company"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
    >
      <h2 className="text-xl font-semibold mb-6">Tell us about your company</h2>

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
