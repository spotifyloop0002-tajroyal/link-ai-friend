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
import LinkedInVerification from "@/components/linkedin/LinkedInVerification";
import { extractLinkedInId, verifyLinkedInAccount, getVerificationErrorMessage } from "@/utils/linkedinVerification";
import { toast as sonnerToast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
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
  CheckCircle2,
  Wifi,
} from "lucide-react";
import { format } from "date-fns";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useLinkedBotExtension } from "@/hooks/useLinkedBotExtension";

const SettingsPage = () => {
  usePageTitle("Settings");
  const { profile, isLoading, saveProfile } = useUserProfile();
  const { isConnected: extensionConnected } = useLinkedBotExtension();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [isAutoVerifying, setIsAutoVerifying] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<{
    status: 'idle' | 'verifying' | 'success' | 'error';
    message: string;
    error?: string;
  } | null>(null);

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

  const autoVerifyLinkedIn = async (publicId: string) => {
    setIsAutoVerifying(true);
    setVerificationStatus({ status: 'verifying', message: 'Verifying LinkedIn account...' });
    
    try {
      const result = await verifyLinkedInAccount(publicId);
      
      if (result.success) {
        // Update verification in DB
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('user_profiles').update({
            linkedin_verified: true,
            linkedin_verified_at: new Date().toISOString(),
          }).eq('user_id', user.id);
        }
        
        setVerificationStatus({
          status: 'success',
          message: `✅ Verified! Logged in as: ${result.linkedinId}`,
        });
        sonnerToast.success('LinkedIn account verified!');
      } else {
        const errorInfo = getVerificationErrorMessage(result.error!, {
          expectedLinkedInId: result.expectedLinkedInId,
          currentLinkedInId: result.currentLinkedInId,
        });
        setVerificationStatus({
          status: 'error',
          message: errorInfo.title,
          error: `${errorInfo.message} ${errorInfo.action}`,
        });
        sonnerToast.error(errorInfo.title, { description: errorInfo.message, duration: 10000 });
      }
    } catch {
      setVerificationStatus({
        status: 'error',
        message: '❌ Extension not responding',
        error: 'Make sure the LinkedBot extension is installed and LinkedIn is open in this browser.',
      });
    } finally {
      setIsAutoVerifying(false);
    }
  };

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
    const isNewLinkedinUrl = canEdit && linkedinUrl && linkedinUrl !== profile?.linkedin_profile_url;
    
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
      if (isNewLinkedinUrl) {
        profileData.linkedin_profile_url = linkedinUrl;
        profileData.linkedin_profile_url_locked = true;
        
        const publicId = extractLinkedInId(linkedinUrl);
        if (publicId) {
          (profileData as any).linkedin_public_id = publicId;
          // Reset verification for new URL
          (profileData as any).linkedin_verified = false;
        }
        
        if (hasExistingUrl) {
          profileData.linkedin_profile_confirmed = true;
        }
        profileData.linkedin_profile_edit_count = editCount + 1;
      }

      const success = await saveProfile(profileData);

      if (success) {
        toast({
          title: "Settings saved",
          description: "Your profile has been updated successfully.",
        });
        
        // Auto-verify if LinkedIn URL was just saved
        if (isNewLinkedinUrl) {
          const publicId = extractLinkedInId(linkedinUrl);
          if (publicId) {
            // Small delay to let DB update propagate
            setTimeout(() => autoVerifyLinkedIn(publicId), 500);
          }
        }
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

        {/* Extension & Verification Status Banner */}
        {(extensionConnected || verificationStatus?.status === 'success' || (profile as any)?.linkedin_verified) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="flex flex-col sm:flex-row gap-3"
          >
            {extensionConnected && (
              <div className="flex items-center gap-3 px-4 py-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 flex-1">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-foreground">Extension Connected</p>
                  <p className="text-xs text-muted-foreground">LinkedIn extension is ready</p>
                </div>
              </div>
            )}
            {((profile as any)?.linkedin_verified || verificationStatus?.status === 'success') && (
              <div className="flex items-center gap-3 px-4 py-3 rounded-lg border border-primary/30 bg-primary/10 flex-1">
                <Wifi className="w-5 h-5 text-primary flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-foreground">LinkedIn Verified</p>
                  <p className="text-xs text-muted-foreground">Your account is verified &amp; ready to post</p>
                </div>
              </div>
            )}
          </motion.div>
        )}
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

        {/* LinkedIn Verification Card */}
        {profile?.linkedin_profile_url && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <LinkedInVerification
              linkedinPublicId={profile.linkedin_public_id}
              linkedinVerified={profile.linkedin_verified}
              linkedinProfileUrl={profile.linkedin_profile_url}
              onVerificationComplete={() => {
                // Refresh profile to update verification status
                window.location.reload();
              }}
            />
          </motion.div>
        )}

        {/* Auto-Verification Status */}
        {verificationStatus && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Alert 
              variant={verificationStatus.status === 'error' ? 'destructive' : 'default'}
              className={
                verificationStatus.status === 'success' ? 'border-green-500 bg-green-50 dark:bg-green-950/30' :
                verificationStatus.status === 'verifying' ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30' :
                ''
              }
            >
              <AlertDescription className="space-y-2">
                <p className="font-medium">{verificationStatus.message}</p>
                {verificationStatus.error && (
                  <p className="text-sm">{verificationStatus.error}</p>
                )}
                {verificationStatus.status === 'error' && (
                  <div className="flex gap-2 mt-2">
                    <Button size="sm" variant="outline" onClick={() => window.open('https://linkedin.com', '_blank')}>
                      Open LinkedIn
                    </Button>
                    <Button size="sm" onClick={() => {
                      const id = extractLinkedInId(linkedinUrl || profile?.linkedin_profile_url || '');
                      if (id) autoVerifyLinkedIn(id);
                    }}>
                      Retry Verification
                    </Button>
                  </div>
                )}
                {verificationStatus.status === 'verifying' && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Checking your LinkedIn account...
                  </div>
                )}
              </AlertDescription>
            </Alert>
          </motion.div>
        )}

        {/* Subscription moved to Billing page */}
      </div>
    </DashboardLayout>
  );
};

export default SettingsPage;
