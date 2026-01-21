import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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
  linkedin_username: string | null;
  preferred_tone: string | null;
  post_frequency: string | null;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
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

  useEffect(() => {
    fetchProfile();
  }, []);

  return {
    profile,
    isLoading,
    error,
    fetchProfile,
    saveProfile,
    completeOnboarding,
  };
};
