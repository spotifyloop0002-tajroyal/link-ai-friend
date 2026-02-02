import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { LinkedInProfileData } from '@/hooks/useUserProfile';
// Import to ensure global Window type declarations are included
import '@/hooks/useLinkedBotExtension';

interface ProfileSyncResult {
  success: boolean;
  data?: LinkedInProfileData;
  error?: string;
}

export const useProfileSync = () => {
  const { toast } = useToast();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  /**
   * Sync profile data from extension to database
   * This function tries multiple methods to get profile data:
   * 1. scrapeProfile (if available) - navigates to profile URL and scrapes
   * 2. scrapeAnalytics - gets profile from current LinkedIn session
   */
  const syncProfileData = useCallback(async (
    profileUrl?: string
  ): Promise<ProfileSyncResult> => {
    setIsRefreshing(true);
    setLastError(null);

    try {
      // Gate 1: Extension must be available
      if (typeof window.LinkedBotExtension === 'undefined') {
        throw new Error('Extension not installed. Please install the LinkedBot Chrome extension first.');
      }

      // Gate 2: Check extension connection
      const statusCheck = await window.LinkedBotExtension.checkStatus();
      if (!statusCheck.connected) {
        throw new Error('Extension not connected. Please connect from the LinkedIn Connection page.');
      }

      let profileData: LinkedInProfileData | null = null;

      // Method 1: Try scrapeProfile if URL is provided and method exists
      if (profileUrl && typeof window.LinkedBotExtension.scrapeProfile === 'function') {
        console.log('📤 Trying scrapeProfile with URL:', profileUrl);
        try {
          const result = await window.LinkedBotExtension.scrapeProfile(profileUrl);
          if (result.success && result.data) {
            profileData = {
              fullName: result.data.fullName,
              headline: result.data.headline,
              profilePhoto: result.data.profilePhoto,
              currentRole: result.data.currentRole,
              currentCompany: result.data.currentCompany,
              location: result.data.location,
              followersCount: result.data.followersCount,
              connectionsCount: result.data.connectionsCount,
              profileUrl: result.data.profileUrl || profileUrl,
              username: result.data.username,
            };
          }
        } catch (e) {
          console.warn('scrapeProfile failed, will try scrapeAnalytics:', e);
        }
      }

      // Method 2: Fallback to scrapeAnalytics
      if (!profileData) {
        console.log('📤 Trying scrapeAnalytics...');
        const result = await window.LinkedBotExtension.scrapeAnalytics();
        
        if (result.success && result.data?.profile) {
          const p = result.data.profile;
          profileData = {
            fullName: p.fullName,
            headline: p.headline,
            profilePhoto: p.profilePhoto,
            currentRole: p.currentRole,
            currentCompany: p.currentCompany,
            location: p.location,
            followersCount: p.followersCount,
            connectionsCount: p.connectionsCount,
            profileUrl: p.profileUrl,
            username: p.username,
          };
        } else {
          throw new Error(result.error || 'Could not fetch profile data from LinkedIn. Make sure you are logged in.');
        }
      }

      if (!profileData) {
        throw new Error('No profile data received from extension.');
      }

      // Save to database
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Not authenticated. Please log in first.');
      }

      const now = new Date().toISOString();
      
      // Call the sync-profile edge function or update directly
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({
          linkedin_profile_data: JSON.parse(JSON.stringify(profileData)),
          profile_last_scraped: now,
        })
        .eq('user_id', user.id);

      if (updateError) {
        console.error('Database update error:', updateError);
        throw new Error('Failed to save profile data to database.');
      }

      toast({
        title: 'Profile Updated',
        description: 'Your LinkedIn profile data has been synced successfully.',
      });

      return { success: true, data: profileData };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to sync profile data.';
      setLastError(errorMessage);
      
      // Show user-friendly error messages
      let userMessage = errorMessage;
      if (errorMessage.includes('Extension context invalidated')) {
        userMessage = 'Extension was reloaded. Please refresh this page and try again.';
      } else if (errorMessage.includes('Could not establish connection')) {
        userMessage = 'Lost connection to extension. Please refresh and reconnect.';
      } else if (errorMessage.includes('No tab with id')) {
        userMessage = 'LinkedIn tab was closed. The extension will attempt to reopen it automatically.';
      }

      toast({
        title: 'Sync Failed',
        description: userMessage,
        variant: 'destructive',
      });

      return { success: false, error: userMessage };
    } finally {
      setIsRefreshing(false);
    }
  }, [toast]);

  /**
   * Poll for profile data updates from database
   * Useful when extension sends data asynchronously
   */
  const pollForProfileData = useCallback(async (
    maxAttempts = 30,
    intervalMs = 1000
  ): Promise<LinkedInProfileData | null> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    for (let i = 0; i < maxAttempts; i++) {
      await new Promise(resolve => setTimeout(resolve, intervalMs));

      const { data } = await supabase
        .from('user_profiles')
        .select('linkedin_profile_data, profile_last_scraped')
        .eq('user_id', user.id)
        .single();

      if (data?.linkedin_profile_data && data.profile_last_scraped) {
        const scrapedTime = new Date(data.profile_last_scraped);
        const now = new Date();
        
        // If scraped in last 2 minutes, consider it fresh
        if (now.getTime() - scrapedTime.getTime() < 2 * 60 * 1000) {
          return data.linkedin_profile_data as LinkedInProfileData;
        }
      }
    }

    return null;
  }, []);

  return {
    isRefreshing,
    lastError,
    syncProfileData,
    pollForProfileData,
  };
};
