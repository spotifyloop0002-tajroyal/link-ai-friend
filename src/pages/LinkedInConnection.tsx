import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useLinkedBotExtension } from "@/hooks/useLinkedBotExtension";
import { useLinkedInAnalytics } from "@/hooks/useLinkedInAnalytics";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LinkedInConnectionModal } from "@/components/linkedin/LinkedInConnectionModal";
import LinkedInVerification from "@/components/linkedin/LinkedInVerification";
import { extractLinkedInId, verifyLinkedInAccount } from "@/utils/linkedinVerification";
import { supabase } from "@/integrations/supabase/client";
import { toast as sonnerToast } from "sonner";
import {
  Wifi,
  WifiOff,
  Download,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Loader2,
  ExternalLink,
  Hash,
  Smile,
  FileText,
  Linkedin,
} from "lucide-react";

const LinkedInConnectionPage = () => {
  const { toast } = useToast();
  const {
    isInstalled,
    isConnected,
    isLoading: extensionLoading,
    extensionId,
    connectExtension,
    disconnectExtension,
    checkExtension,
  } = useLinkedBotExtension();

  const {
    writingStyle,
    isScanning,
    scanProgress,
    saveScannedPosts,
  } = useLinkedInAnalytics();

  const { profile, isLoading: profileLoading, fetchProfile } = useUserProfile();

  const [scanComplete, setScanComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [skipProfileCheck, setSkipProfileCheck] = useState(false);
  const [urlJustSaved, setUrlJustSaved] = useState(false);

  const hasProfileUrl = Boolean(profile?.linkedin_profile_url) || urlJustSaved;

  // Auto-fix: extract linkedin_public_id if URL exists but public_id is missing
  useEffect(() => {
    if (profile?.linkedin_profile_url && !profile?.linkedin_public_id) {
      const publicId = extractLinkedInId(profile.linkedin_profile_url);
      if (publicId) {
        supabase.auth.getUser().then(({ data: { user } }) => {
          if (user) {
            supabase.from('user_profiles')
              .update({ linkedin_public_id: publicId })
              .eq('user_id', user.id)
              .then(() => fetchProfile());
          }
        });
      }
    }
  }, [profile?.linkedin_profile_url, profile?.linkedin_public_id]);

  // Auto-verify when profile URL is saved — extension opens LinkedIn itself
  const autoVerify = useCallback(async (profileUrl: string) => {
    const publicId = extractLinkedInId(profileUrl);
    if (!publicId) return;

    try {
      const result = await verifyLinkedInAccount(publicId);
      if (result.success) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('user_profiles')
            .update({
              linkedin_verified: true,
              linkedin_verified_at: new Date().toISOString(),
              linkedin_public_id: publicId,
            })
            .eq('user_id', user.id);
          await fetchProfile();
          sonnerToast.success('✅ LinkedIn account verified automatically!');
        }
      } else {
        // Extension reported a specific error - show it
        const errorMsg = result.error === 'ACCOUNT_MISMATCH' 
          ? 'LinkedIn account mismatch. Please log into the correct account.'
          : result.error === 'NOT_LOGGED_IN'
          ? 'Not logged into LinkedIn. Please log in and try verifying from Settings.'
          : 'Verification failed. You can re-verify from Settings.';
        sonnerToast.warning('Verification issue', { description: errorMsg });
      }
    } catch (err) {
      // Extension not installed or timeout - silently skip
      console.log('Auto-verify skipped:', err instanceof Error ? err.message : err);
    }
  }, [fetchProfile]);

  const handleConnect = async () => {
    setError(null);
    setConnecting(true);

    try {
      if (!isInstalled) {
        setError("Extension not installed. Please install the LinkedBot Chrome extension first.");
        return;
      }

      await connectExtension();
      toast({
        title: "Extension connected",
        description: "Your LinkedIn extension is now connected and ready to use.",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect extension");
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnectExtension();
      toast({
        title: "Extension disconnected",
        description: "Your LinkedIn extension has been disconnected.",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to disconnect");
    }
  };

  const handleScanPosts = async (forceSkipCheck = false) => {
    if (!hasProfileUrl && !forceSkipCheck && !skipProfileCheck) {
      setShowProfileModal(true);
      toast({
        title: "Profile URL required",
        description: "Please provide your LinkedIn profile URL first.",
        variant: "destructive",
      });
      return;
    }
    setSkipProfileCheck(false);

    const ext = window.LinkedBotExtension as any;
    if (!ext?.scanPosts) {
      toast({
        title: "Feature not available",
        description: "Your extension version doesn't support post scanning. Please update the extension.",
        variant: "destructive",
      });
      return;
    }

    setScanning(true);
    setError(null);

    try {
      toast({
        title: "Scanning posts",
        description: "Scanning your LinkedIn posts... This may take a moment.",
      });

      const result = await ext.scanPosts(50);

      if (result.success && result.data) {
        await saveScannedPosts({
          posts: result.data.posts || [],
          writingStyle: result.data.writingStyle || null,
        });
        setScanComplete(true);
      } else {
        throw new Error(result.error || "Failed to scan posts");
      }
    } catch (err) {
      console.error("Scan error:", err);
      setError(err instanceof Error ? err.message : "Failed to scan posts");
      toast({
        title: "Scan failed",
        description: err instanceof Error ? err.message : "Failed to scan posts",
        variant: "destructive",
      });
    } finally {
      setScanning(false);
    }
  };

  if (extensionLoading) {
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
          <h1 className="text-3xl font-bold">LinkedIn Connection</h1>
          <p className="text-muted-foreground mt-1">
            Connect your extension to enable auto-posting and analytics
          </p>
        </motion.div>

        {/* Connection Status Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Extension Status</CardTitle>
                <Badge variant={isConnected ? "default" : "secondary"} className="gap-1">
                  {isConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                  {isConnected ? "Connected" : "Not Connected"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {!isInstalled ? (
                <>
                  <Alert>
                    <Download className="w-4 h-4" />
                    <AlertDescription>
                      Install the LinkedBot Chrome extension and click "Connect" to enable features.
                    </AlertDescription>
                  </Alert>
                  <div className="flex gap-3">
                    <Button onClick={() => checkExtension()} variant="outline" className="gap-2">
                      <RefreshCw className="w-4 h-4" />
                      Refresh Status
                    </Button>
                    <Button asChild variant="outline">
                      <a
                        href={import.meta.env.VITE_EXTENSION_STORE_URL || 'https://chrome.google.com/webstore'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="gap-2"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Install Extension
                      </a>
                    </Button>
                  </div>
                </>
              ) : !isConnected ? (
                <>
                  <Alert>
                    <AlertCircle className="w-4 h-4" />
                    <AlertDescription>
                      Extension is installed but not connected. Click "Connect" to link your account.
                    </AlertDescription>
                  </Alert>
                  <Button onClick={handleConnect} disabled={connecting} className="gap-2">
                    {connecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wifi className="w-4 h-4" />}
                    Connect Extension
                  </Button>
                </>
              ) : (
                <>
                  <Alert className="border-success/50 bg-success/10">
                    <CheckCircle className="w-4 h-4 text-success" />
                    <AlertDescription className="text-success">
                      Extension is connected and ready to use!
                    </AlertDescription>
                  </Alert>
                  <div className="flex gap-3">
                    <Button onClick={() => checkExtension()} variant="outline" className="gap-2">
                      <RefreshCw className="w-4 h-4" />
                      Refresh Status
                    </Button>
                    <Button onClick={handleDisconnect} variant="destructive">
                      Disconnect
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Error Alert */}
        {error && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Alert variant="destructive">
              <AlertCircle className="w-4 h-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </motion.div>
        )}

        {/* LinkedIn Verification - show whenever profile has LinkedIn URL */}
        {(profile?.linkedin_profile_url || urlJustSaved) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <LinkedInVerification
              linkedinPublicId={profile?.linkedin_public_id || null}
              linkedinVerified={profile?.linkedin_verified || false}
              linkedinProfileUrl={profile?.linkedin_profile_url || null}
              onVerificationComplete={() => fetchProfile()}
            />
          </motion.div>
        )}

        {/* Scan Progress */}
        {(scanProgress || isScanning) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card>
              <CardContent className="py-6">
                <div className="flex items-center gap-4">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  <div className="flex-1">
                    <p className="font-medium">{scanProgress?.message || "Scanning posts..."}</p>
                    <Progress value={scanProgress?.percentage || 30} className="mt-2" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Missing Profile URL Banner - only when no URL at all */}
        {isConnected && !profileLoading && !hasProfileUrl && !showProfileModal && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <Alert variant="destructive" className="border-warning bg-warning/10 text-warning-foreground">
              <AlertCircle className="w-4 h-4 text-warning" />
              <AlertDescription className="flex items-center justify-between">
                <span className="text-warning">Please provide your LinkedIn profile URL first</span>
                <Button size="sm" variant="outline" onClick={() => setShowProfileModal(true)} className="ml-4 gap-1.5">
                  <Linkedin className="w-3.5 h-3.5" />
                  Add Profile URL
                </Button>
              </AlertDescription>
            </Alert>
          </motion.div>
        )}

        {/* Writing Style Analysis */}
        {writingStyle && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Your Writing Style</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-muted/50 rounded-lg p-4 text-center">
                    <FileText className="w-5 h-5 mx-auto mb-2 text-primary" />
                    <p className="text-sm text-muted-foreground">Avg Post Length</p>
                    <p className="text-xl font-bold">{writingStyle.avgPostLength} words</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-4 text-center">
                    <span className="text-2xl mb-2 block">🎭</span>
                    <p className="text-sm text-muted-foreground">Tone</p>
                    <p className="text-xl font-bold capitalize">{writingStyle.tone}</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-4 text-center">
                    <Smile className="w-5 h-5 mx-auto mb-2 text-primary" />
                    <p className="text-sm text-muted-foreground">Uses Emojis</p>
                    <p className="text-xl font-bold">{writingStyle.usesEmojis ? "✅ Yes" : "❌ No"}</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-4 text-center">
                    <Hash className="w-5 h-5 mx-auto mb-2 text-primary" />
                    <p className="text-sm text-muted-foreground">Avg Hashtags</p>
                    <p className="text-xl font-bold">{writingStyle.avgHashtagsPerPost}</p>
                  </div>
                </div>
                {writingStyle.commonHashtags && writingStyle.commonHashtags.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">Common Hashtags</p>
                    <div className="flex flex-wrap gap-2">
                      {writingStyle.commonHashtags.slice(0, 8).map((tag) => (
                        <Badge key={tag} variant="secondary">#{tag}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Based on analysis of {writingStyle.totalPostsAnalyzed || 0} posts
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>

      {/* LinkedIn Profile URL Modal */}
      <LinkedInConnectionModal
        open={showProfileModal}
        onOpenChange={setShowProfileModal}
        extensionId={extensionId}
        onConnect={connectExtension}
        onSuccess={async () => {
          setUrlJustSaved(true);
          await fetchProfile();
          toast({
            title: "Profile URL saved",
            description: "Verifying LinkedIn account...",
          });

          // Auto-verify LinkedIn account after URL is saved
          const updatedProfile = await supabase.auth.getUser().then(async ({ data: { user } }) => {
            if (!user) return null;
            const { data } = await supabase
              .from('user_profiles')
              .select('linkedin_profile_url')
              .eq('user_id', user.id)
              .single();
            return data;
          });

          if (updatedProfile?.linkedin_profile_url) {
            // Try auto-verification
            setTimeout(() => autoVerify(updatedProfile.linkedin_profile_url!), 1000);
          }
        }}
      />
    </DashboardLayout>
  );
};

export default LinkedInConnectionPage;
