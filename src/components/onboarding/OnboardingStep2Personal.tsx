import { motion } from "framer-motion";
import { ArrowRight, ArrowLeft, Linkedin, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface OnboardingStep2PersonalProps {
  fullName: string;
  setFullName: (value: string) => void;
  profession: string;
  setProfession: (value: string) => void;
  background: string;
  setBackground: (value: string) => void;
  linkedinUrl: string;
  setLinkedinUrl: (value: string) => void;
  phoneNumber: string;
  setPhoneNumber: (value: string) => void;
  city: string;
  setCity: (value: string) => void;
  country: string;
  setCountry: (value: string) => void;
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
  linkedinUrl,
  setLinkedinUrl,
  phoneNumber,
  setPhoneNumber,
  city,
  setCity,
  country,
  setCountry,
  onBack,
  onNext,
}: OnboardingStep2PersonalProps) => {
  // Validate LinkedIn URL format
  const isValidLinkedInUrl = (url: string) => {
    if (!url) return false;
    const pattern = /^https?:\/\/(www\.)?linkedin\.com\/in\/[\w-]+\/?$/i;
    return pattern.test(url.trim());
  };

  // All fields are now required
  const canProceed = 
    fullName.trim() && 
    profession.trim() && 
    background.trim() && 
    phoneNumber.trim() &&
    city.trim() &&
    country.trim() &&
    isValidLinkedInUrl(linkedinUrl);

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
            required
          />
          {!fullName.trim() && (
            <p className="text-xs text-destructive mt-1">Name is required</p>
          )}
        </div>

        {/* LinkedIn Profile URL - CRITICAL FIELD */}
        <div>
          <Label htmlFor="linkedinUrl" className="flex items-center gap-2">
            <Linkedin className="w-4 h-4 text-[#0A66C2]" />
            LinkedIn Profile URL *
          </Label>
          <Input
            id="linkedinUrl"
            value={linkedinUrl}
            onChange={(e) => setLinkedinUrl(e.target.value)}
            placeholder="https://linkedin.com/in/your-profile"
            className="mt-1.5"
            required
          />
          {linkedinUrl && !isValidLinkedInUrl(linkedinUrl) && (
            <p className="text-xs text-destructive mt-1 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              Please enter a valid LinkedIn profile URL (e.g., https://linkedin.com/in/username)
            </p>
          )}
          {!linkedinUrl && (
            <p className="text-xs text-destructive mt-1">LinkedIn URL is required</p>
          )}
          <Alert className="mt-2 border-warning/50 bg-warning/10">
            <AlertCircle className="w-4 h-4 text-warning" />
            <AlertDescription className="text-xs text-warning">
              <strong>Important:</strong> This URL cannot be changed after setup. All posting and scraping will happen on this profile only.
            </AlertDescription>
          </Alert>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="phoneNumber">Phone Number *</Label>
            <Input
              id="phoneNumber"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="+91 9876543210"
              className="mt-1.5"
              required
            />
            {!phoneNumber.trim() && (
              <p className="text-xs text-destructive mt-1">Phone is required</p>
            )}
          </div>
          <div>
            <Label htmlFor="city">City *</Label>
            <Input
              id="city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g., Mumbai"
              className="mt-1.5"
              required
            />
            {!city.trim() && (
              <p className="text-xs text-destructive mt-1">City is required</p>
            )}
          </div>
        </div>

        <div>
          <Label htmlFor="country">Country *</Label>
          <Input
            id="country"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            placeholder="e.g., India"
            className="mt-1.5"
            required
          />
          {!country.trim() && (
            <p className="text-xs text-destructive mt-1">Country is required</p>
          )}
        </div>

        <div>
          <Label htmlFor="profession">Your Role/Profession *</Label>
          <Input
            id="profession"
            value={profession}
            onChange={(e) => setProfession(e.target.value)}
            placeholder="e.g., Marketing Director"
            className="mt-1.5"
            required
          />
          {!profession.trim() && (
            <p className="text-xs text-destructive mt-1">Role/Profession is required</p>
          )}
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
            required
          />
          <p className="text-xs text-muted-foreground mt-1">
            {background.length}/200 characters
          </p>
          {!background.trim() && (
            <p className="text-xs text-destructive mt-1">Background is required</p>
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
          Complete Setup
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </motion.div>
  );
};
