import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useUserProfile, ProfileData } from "@/hooks/useUserProfile";
import { useToast } from "@/hooks/use-toast";
import { usePageTitle } from "@/hooks/usePageTitle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { LinkedInProfileInput, validateLinkedInUrl } from "@/components/linkedin/LinkedInProfileInput";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  User,
  Linkedin,
  Building2,
  MapPin,
  Phone,
  Mail,
  Save,
  Loader2,
  Lock,
  Crown,
  Calendar,
  AlertCircle,
} from "lucide-react";
import { format } from "date-fns";
import { Alert, AlertDescription } from "@/components/ui/alert";

const SettingsPage = () => {
  usePageTitle("Settings");
  const { profile, isLoading, saveProfile } = useUserProfile();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  // Editable fields
  const [name, setName] = useState(profile?.name || "");
  const [phoneNumber, setPhoneNumber] = useState(profile?.phone_number || "");
  const [city, setCity] = useState(profile?.city || "");
  const [country, setCountry] = useState(profile?.country || "");
  const [role, setRole] = useState(profile?.role || "");
  const [background, setBackground] = useState(profile?.background || "");
  const [preferredTone, setPreferredTone] = useState(profile?.preferred_tone || "");
  const [postFrequency, setPostFrequency] = useState(profile?.post_frequency || "");
  const [linkedinUrl, setLinkedinUrl] = useState(profile?.linkedin_profile_url || "");

  // LinkedIn URL edit logic: can only be edited once after initial entry
  const editCount = profile?.linkedin_profile_edit_count || 0;
  const isConfirmed = profile?.linkedin_profile_confirmed || false;
  const hasExistingUrl = !!profile?.linkedin_profile_url;
  
  // Editing is disabled if: confirmed OR (has existing URL AND edit count >= 1)
  const isLinkedInLocked = isConfirmed || (hasExistingUrl && editCount >= 1);
  
  // Can edit if: no existing URL OR (has URL but edit count is 0 and not confirmed)
  const canEdit = !isConfirmed && (!hasExistingUrl || editCount === 0);

  // Update local state when profile loads
  useEffect(() => {
    if (profile) {
      setName(profile.name || "");
      setPhoneNumber(profile.phone_number || "");
      setCity(profile.city || "");
      setCountry(profile.country || "");
      setRole(profile.role || "");
      setBackground(profile.background || "");
      setPreferredTone(profile.preferred_tone || "");
      setPostFrequency(profile.post_frequency || "");
      setLinkedinUrl(profile.linkedin_profile_url || "");
    }
  }, [profile]);

  const handleSave = async () => {
    // Validate LinkedIn URL if it's being set
    if (linkedinUrl && !isLinkedInLocked) {
      const validation = validateLinkedInUrl(linkedinUrl);
      if (!validation.isValid) {
        toast({
          title: "Invalid LinkedIn URL",
          description: validation.error,
          variant: "destructive",
        });
        return;
      }
    }

    setIsSaving(true);
    try {
      const profileData: ProfileData = {
        name,
        phone_number: phoneNumber,
        city,
        country,
        role,
        background,
        preferred_tone: preferredTone,
        post_frequency: postFrequency,
      };

      // Handle LinkedIn URL save with one-time edit logic
      if (canEdit && linkedinUrl && linkedinUrl !== profile?.linkedin_profile_url) {
        profileData.linkedin_profile_url = linkedinUrl;
        profileData.linkedin_profile_url_locked = true;
        
        // If this is an edit (not initial), increment count and confirm
        if (hasExistingUrl) {
          // This is an edit - lock permanently
          profileData.linkedin_profile_confirmed = true;
        }
        // Increment edit count (will be 1 after first save)
        profileData.linkedin_profile_edit_count = editCount + 1;
      }

      const success = await saveProfile(profileData);

      if (success) {
        toast({
          title: "Settings saved",
          description: "Your profile has been updated successfully.",
        });
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground mt-1">
            Manage your account settings and preferences
          </p>
        </motion.div>

        {/* Profile Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Profile Information
              </CardTitle>
              <CardDescription>
                Update your personal information and preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Basic Info */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <div className="relative mt-1.5">
                    <Input
                      id="email"
                      value={profile?.email || ""}
                      disabled
                      className="pr-10 bg-muted"
                    />
                    <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
              </div>

              {/* LinkedIn URL */}
              <div>
                {isLinkedInLocked ? (
                  <>
                    <Label htmlFor="linkedin" className="flex items-center gap-2">
                      <Linkedin className="w-4 h-4 text-[#0A66C2]" />
                      LinkedIn Profile URL
                    </Label>
                    <div className="relative mt-1.5">
                      <Input
                        id="linkedin"
                        value={profile?.linkedin_profile_url || ""}
                        disabled
                        className="pr-10 bg-muted"
                      />
                      <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <Lock className="w-3 h-3" />
                      🔒 LinkedIn profile locked and cannot be changed.
                    </p>
                  </>
                ) : (
                  <>
                    <LinkedInProfileInput
                      value={linkedinUrl}
                      onChange={setLinkedinUrl}
                    />
                    <Alert className="mt-3 border-warning/50 bg-warning/10">
                      <AlertCircle className="w-4 h-4 text-warning" />
                      <AlertDescription className="text-xs text-warning">
                        <strong>⚠️ Important:</strong> You can edit your LinkedIn profile link only once. 
                        {hasExistingUrl 
                          ? " This is your final edit - please double-check before confirming."
                          : " Please double-check before confirming."}
                      </AlertDescription>
                    </Alert>
                  </>
                )}
              </div>

              {/* Contact & Location */}
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+91 9876543210"
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Mumbai"
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="country">Country</Label>
                  <Input
                    id="country"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    placeholder="India"
                    className="mt-1.5"
                  />
                </div>
              </div>

              {/* Professional Info */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="role">Role/Profession</Label>
                  <Input
                    id="role"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    placeholder="Marketing Director"
                    className="mt-1.5"
                  />
                </div>
                {profile?.company_name && (
                  <div>
                    <Label htmlFor="company">Company</Label>
                    <div className="relative mt-1.5">
                      <Input
                        id="company"
                        value={profile.company_name}
                        disabled
                        className="bg-muted"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="background">Background/Bio</Label>
                <Textarea
                  id="background"
                  value={background}
                  onChange={(e) => setBackground(e.target.value)}
                  placeholder="Tell us about your experience..."
                  className="mt-1.5 min-h-[100px]"
                  maxLength={200}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {background.length}/200 characters
                </p>
              </div>

              <Separator />

              {/* Posting Preferences */}
              <div>
                <h3 className="font-medium mb-4">Posting Preferences</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>Preferred Tone</Label>
                    <Select value={preferredTone} onValueChange={setPreferredTone}>
                      <SelectTrigger className="mt-1.5">
                        <SelectValue placeholder="Select tone" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="professional">Professional</SelectItem>
                        <SelectItem value="conversational">Conversational</SelectItem>
                        <SelectItem value="casual">Casual</SelectItem>
                        <SelectItem value="formal">Formal</SelectItem>
                        <SelectItem value="humorous">Humorous</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Posting Frequency</Label>
                    <Select value={postFrequency} onValueChange={setPostFrequency}>
                      <SelectTrigger className="mt-1.5">
                        <SelectValue placeholder="Select frequency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="2-3-week">2-3 times per week</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="biweekly">Bi-weekly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSave} disabled={isSaving} className="gap-2">
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Subscription Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crown className="w-5 h-5" />
                Subscription
              </CardTitle>
              <CardDescription>
                Manage your subscription plan
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Crown className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold capitalize">
                        {profile?.subscription_plan || "Free"} Plan
                      </span>
                      <Badge variant={profile?.subscription_plan === "free" ? "secondary" : "default"}>
                        {profile?.subscription_plan === "free" ? "Current" : "Active"}
                      </Badge>
                    </div>
                    {profile?.subscription_expires_at && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                        <Calendar className="w-3 h-3" />
                        Expires: {format(new Date(profile.subscription_expires_at), "MMM d, yyyy")}
                      </p>
                    )}
                  </div>
                </div>
                <Button variant="outline">Upgrade Plan</Button>
              </div>

              {/* Usage Stats */}
              <div className="grid grid-cols-3 gap-4 mt-6">
                <div className="text-center p-4 bg-muted/30 rounded-lg">
                  <p className="text-2xl font-bold">{profile?.posts_created_count || 0}</p>
                  <p className="text-xs text-muted-foreground">Posts Created</p>
                </div>
                <div className="text-center p-4 bg-muted/30 rounded-lg">
                  <p className="text-2xl font-bold">{profile?.posts_scheduled_count || 0}</p>
                  <p className="text-xs text-muted-foreground">Posts Scheduled</p>
                </div>
                <div className="text-center p-4 bg-muted/30 rounded-lg">
                  <p className="text-2xl font-bold">{profile?.posts_published_count || 0}</p>
                  <p className="text-xs text-muted-foreground">Posts Published</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </DashboardLayout>
  );
};

export default SettingsPage;
