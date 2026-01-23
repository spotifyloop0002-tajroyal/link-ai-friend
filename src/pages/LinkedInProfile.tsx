import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { RefreshCw, MapPin, Briefcase, User, Clock, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useLinkedBotExtension } from "@/hooks/useLinkedBotExtension";
import { useUserProfile, LinkedInProfileData } from "@/hooks/useUserProfile";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { formatDistanceToNow } from "date-fns";

const LinkedInProfile = () => {
  const { toast } = useToast();
  const { isConnected, isInstalled, isLoading: extensionLoading } = useLinkedBotExtension();
  const { profile, isLoading: profileLoading } = useUserProfile();
  
  const [profileData, setProfileData] = useState<LinkedInProfileData | null>(null);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Load saved profile data on mount
  useEffect(() => {
    if (profile) {
      const savedData = profile.linkedin_profile_data;
      if (savedData) {
        setProfileData(savedData);
      }
      if (profile.profile_last_scraped) {
        setLastSynced(new Date(profile.profile_last_scraped));
      }
    }
  }, [profile]);

  const refreshProfile = async () => {
    if (!window.LinkedBotExtension) {
      toast({
        title: "Extension Not Found",
        description: "Please install the LinkedBot Chrome extension first.",
        variant: "destructive",
      });
      return;
    }

    if (!isConnected) {
      toast({
        title: "Extension Not Connected",
        description: "Please connect your extension from the LinkedIn Connection page.",
        variant: "destructive",
      });
      return;
    }

    setIsRefreshing(true);

    try {
      const result = await window.LinkedBotExtension.scrapeAnalytics();
      
      if (result?.success && result.data?.profile) {
        const newProfileData: LinkedInProfileData = {
          ...result.data.profile,
        };
        
        setProfileData(newProfileData);
        const now = new Date();
        setLastSynced(now);

        // Save to database
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { error } = await supabase
            .from('user_profiles')
            .update({
              linkedin_profile_data: JSON.parse(JSON.stringify(newProfileData)),
              profile_last_scraped: now.toISOString(),
            })
            .eq('user_id', user.id);

          if (error) {
            console.error('Error saving profile data:', error);
            toast({
              title: "Warning",
              description: "Profile data refreshed but could not be saved.",
              variant: "destructive",
            });
          } else {
            toast({
              title: "Profile Updated",
              description: "Your LinkedIn profile data has been refreshed.",
            });
          }
        }
      } else {
        toast({
          title: "Refresh Failed",
          description: result?.error || "Could not fetch profile data from LinkedIn.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error refreshing profile:', error);
      toast({
        title: "Error",
        description: "Failed to refresh profile data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const getInitials = (name: string | undefined) => {
    if (!name) return "?";
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const isLoading = extensionLoading || profileLoading;

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-3xl font-bold">LinkedIn Profile</h1>
          <p className="text-muted-foreground mt-2">
            View and sync your LinkedIn profile data
          </p>
        </motion.div>

        {/* Extension Status Warning */}
        {!isLoading && !isInstalled && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Card className="border-yellow-500/50 bg-yellow-500/10">
              <CardContent className="flex items-center gap-3 py-4">
                <AlertCircle className="w-5 h-5 text-yellow-500" />
                <p className="text-sm">
                  Install the LinkedBot Chrome extension to sync your profile data.
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {!isLoading && isInstalled && !isConnected && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Card className="border-yellow-500/50 bg-yellow-500/10">
              <CardContent className="flex items-center gap-3 py-4">
                <AlertCircle className="w-5 h-5 text-yellow-500" />
                <p className="text-sm">
                  Connect your extension from the LinkedIn Connection page to sync data.
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Profile Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Profile Data</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={refreshProfile}
                  disabled={isRefreshing || !isConnected}
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                  {isRefreshing ? "Refreshing..." : "Refresh Data"}
                </Button>
              </CardTitle>
              <CardDescription>
                {lastSynced ? (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Last updated: {formatDistanceToNow(lastSynced, { addSuffix: true })}
                  </span>
                ) : (
                  "No data synced yet"
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-start gap-4">
                  <Skeleton className="w-20 h-20 rounded-full" />
                  <div className="flex-1 space-y-3">
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-4 w-64" />
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                </div>
              ) : profileData ? (
                <div className="flex items-start gap-6">
                  <Avatar className="w-20 h-20 border-2 border-primary/20">
                    <AvatarImage src={profileData.profilePhoto} alt={profileData.fullName || profileData.username} />
                    <AvatarFallback className="text-xl bg-primary text-primary-foreground">
                      {getInitials(profileData.fullName || profileData.username)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-3">
                    <div>
                      <h2 className="text-xl font-semibold">
                        {profileData.fullName || profileData.username || "Unknown"}
                      </h2>
                      {profileData.headline && (
                        <p className="text-muted-foreground">{profileData.headline}</p>
                      )}
                    </div>
                    
                    {(profileData.currentRole || profileData.currentCompany) && (
                      <div className="flex items-center gap-2 text-sm">
                        <Briefcase className="w-4 h-4 text-muted-foreground" />
                        <span>
                          {profileData.currentRole}
                          {profileData.currentRole && profileData.currentCompany && " at "}
                          {profileData.currentCompany && (
                            <span className="font-medium">{profileData.currentCompany}</span>
                          )}
                        </span>
                      </div>
                    )}
                    
                    {profileData.location && (
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                        <span>{profileData.location}</span>
                      </div>
                    )}

                    {/* Stats */}
                    <div className="flex gap-4 pt-2">
                      {profileData.followersCount !== undefined && (
                        <div className="text-center">
                          <p className="text-lg font-semibold">{profileData.followersCount.toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">Followers</p>
                        </div>
                      )}
                      {profileData.connectionsCount !== undefined && (
                        <div className="text-center">
                          <p className="text-lg font-semibold">{profileData.connectionsCount.toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">Connections</p>
                        </div>
                      )}
                    </div>

                    {profileData.profileUrl && (
                      <a
                        href={profileData.profileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                      >
                        View on LinkedIn →
                      </a>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <User className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground">No profile data available</p>
                  <p className="text-sm text-muted-foreground/70 mt-1">
                    Click "Refresh Data" to sync your LinkedIn profile
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Saved LinkedIn URL */}
        {profile?.linkedin_profile_url && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Linked Profile URL</CardTitle>
              </CardHeader>
              <CardContent>
                <a
                  href={profile.linkedin_profile_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline break-all"
                >
                  {profile.linkedin_profile_url}
                </a>
                {profile.linkedin_profile_confirmed && (
                  <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                    🔒 Profile URL is locked and cannot be changed
                  </p>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default LinkedInProfile;
