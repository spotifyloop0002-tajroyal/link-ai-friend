import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface LinkedInProfileData {
  username?: string;
  profileUrl?: string;
  followersCount?: number;
  connectionsCount?: number;
  fullName?: string;
  headline?: string;
  profilePhoto?: string;
  currentRole?: string;
  currentCompany?: string;
  location?: string;
}

export interface UserProfile {
  id: string;
  user_id: string;
  name: string | null;
  email: string | null;
  user_type: "company" | "personal" | null;
  company_name: string | null;
  industry: string | null;
  company_description: string | null;
  target_audience: string | null;
  location: string | null;
  default_topics: string[] | null;
  role: string | null;
  background: string | null;
  posting_goals: string[] | null;
  linkedin_profile_url: string | null;
  linkedin_profile_url_locked: boolean;
  linkedin_profile_edit_count: number;
  linkedin_profile_confirmed: boolean;
  linkedin_username: string | null;
  linkedin_public_id: string | null;
  linkedin_verified: boolean;
  linkedin_verified_at: string | null;
  preferred_tone: string | null;
  post_frequency: string | null;
  onboarding_completed: boolean;
  phone_number: string | null;
  city: string | null;
  country: string | null;
  subscription_plan: string | null;
  subscription_expires_at: string | null;
  posts_created_count: number;
  posts_scheduled_count: number;
  posts_published_count: number;
  last_active_at: string | null;
  created_at: string;
  updated_at: string;
  // LinkedIn profile data fields
  linkedin_profile_data: LinkedInProfileData | null;
  profile_last_scraped: string | null;
}

export interface ProfileData {
  name?: string;
  user_type?: "company" | "personal";
  company_name?: string;
  industry?: string;
  company_description?: string;
  target_audience?: string;
  location?: string;
  default_topics?: string[];
  role?: string;
  background?: string;
  posting_goals?: string[];
  preferred_tone?: string;
  post_frequency?: string;
  onboarding_completed?: boolean;
  linkedin_profile_url?: string;
  linkedin_profile_url_locked?: boolean;
  linkedin_profile_edit_count?: number;
  linkedin_profile_confirmed?: boolean;
  phone_number?: string;
  city?: string;
  country?: string;
}

export const useUserProfile = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchProfile = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setProfile(null);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (fetchError) throw fetchError;
      setProfile(data as UserProfile | null);
    } catch (err) {
      console.error("Error fetching profile:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch profile");
    } finally {
      setIsLoading(false);
    }
  };

  const saveProfile = async (profileData: ProfileData): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Not authenticated",
          description: "Please log in to save your profile.",
          variant: "destructive",
        });
        return false;
      }

      const dataToSave = {
        user_id: user.id,
        email: user.email,
        ...profileData,
        updated_at: new Date().toISOString(),
        last_active_at: new Date().toISOString(),
      };

      const { data, error: saveError } = await supabase
        .from("user_profiles")
        .upsert(dataToSave, { onConflict: "user_id" })
        .select()
        .single();

      if (saveError) throw saveError;

      setProfile(data as UserProfile);
      return true;
    } catch (err) {
      console.error("Error saving profile:", err);
      toast({
        title: "Failed to save profile",
        description: err instanceof Error ? err.message : "An error occurred",
        variant: "destructive",
      });
      return false;
    }
  };

  const completeOnboarding = async (profileData: ProfileData): Promise<boolean> => {
    return await saveProfile({
      ...profileData,
      onboarding_completed: true,
    });
  };

  const updateLastActive = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from("user_profiles")
        .update({ last_active_at: new Date().toISOString() })
        .eq("user_id", user.id);
    } catch (err) {
      console.error("Error updating last active:", err);
    }
  };

  const incrementPostCount = async (type: 'created' | 'scheduled' | 'published') => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !profile) return;

      const columnMap = {
        created: 'posts_created_count',
        scheduled: 'posts_scheduled_count',
        published: 'posts_published_count',
      };

      const column = columnMap[type];
      const currentValue = profile[column as keyof UserProfile] as number || 0;

      await supabase
        .from("user_profiles")
        .update({ [column]: currentValue + 1 })
        .eq("user_id", user.id);

      // Update local state
      setProfile({
        ...profile,
        [column]: currentValue + 1,
      });
    } catch (err) {
      console.error("Error incrementing post count:", err);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  // Update last active on mount
  useEffect(() => {
    if (profile) {
      updateLastActive();
    }
  }, [profile?.id]);

  return {
    profile,
    isLoading,
    error,
    fetchProfile,
    saveProfile,
    completeOnboarding,
    updateLastActive,
    incrementPostCount,
  };
};
