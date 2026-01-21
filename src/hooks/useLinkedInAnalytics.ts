import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AnalyticsProfile {
  id: string;
  user_id: string;
  username: string | null;
  profile_url: string | null;
  followers_count: number;
  connections_count: number;
  total_posts: number;
  last_synced: string | null;
}

interface PostAnalytics {
  id: string;
  user_id: string;
  post_id: string;
  content_preview: string | null;
  linkedin_url: string | null;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  post_timestamp: string | null;
  scraped_at: string | null;
}

interface WritingStyle {
  avgPostLength: number;
  commonHashtags: string[];
  tone: string;
  usesEmojis: boolean;
  usesHashtags: boolean;
  avgHashtagsPerPost: number;
  totalPostsAnalyzed: number;
}

interface UseLinkedInAnalyticsReturn {
  profile: AnalyticsProfile | null;
  posts: PostAnalytics[];
  writingStyle: WritingStyle | null;
  lastSync: string | null;
  isLoading: boolean;
  isSyncing: boolean;
  isScanning: boolean;
  scanProgress: { message: string; percentage: number } | null;
  error: string | null;
  fetchAnalytics: () => Promise<void>;
  syncAnalytics: (extensionData: { profile: any; posts: any[] }) => Promise<boolean>;
  saveScannedPosts: (data: { posts: any[]; writingStyle: any }) => Promise<boolean>;
  fetchWritingStyle: () => Promise<void>;
}

export const useLinkedInAnalytics = (): UseLinkedInAnalyticsReturn => {
  const [profile, setProfile] = useState<AnalyticsProfile | null>(null);
  const [posts, setPosts] = useState<PostAnalytics[]>([]);
  const [writingStyle, setWritingStyle] = useState<WritingStyle | null>(null);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState<{ message: string; percentage: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchAnalytics = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setIsLoading(false);
        return;
      }

      const response = await supabase.functions.invoke('get-analytics', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) throw response.error;

      const data = response.data;
      if (data.success) {
        setProfile(data.analytics?.profile || null);
        setPosts(data.analytics?.posts || []);
        setLastSync(data.lastSync);
      }
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch analytics');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const syncAnalytics = useCallback(async (extensionData: { profile: any; posts: any[] }): Promise<boolean> => {
    try {
      setIsSyncing(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      // Validate input data with fallbacks
      const safeProfile = extensionData?.profile || null;
      const safePosts = Array.isArray(extensionData?.posts) ? extensionData.posts : [];

      const response = await supabase.functions.invoke('save-analytics', {
        body: {
          profile: safeProfile,
          posts: safePosts,
          scrapedAt: new Date().toISOString(),
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) throw response.error;

      // Handle undefined response.data
      if (!response.data) {
        throw new Error('No response from server');
      }

      if (response.data.success) {
        await fetchAnalytics();
        toast({
          title: "Analytics synced",
          description: `Synced ${safePosts.length} posts successfully`,
        });
        return true;
      }

      // Handle unsuccessful response with error message
      throw new Error(response.data.error || 'Sync was not successful');
    } catch (err) {
      console.error('Failed to sync analytics:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to sync analytics';
      setError(errorMessage);
      toast({
        title: "Sync failed",
        description: errorMessage,
        variant: "destructive",
      });
      return false;
    } finally {
      setIsSyncing(false);
    }
  }, [fetchAnalytics, toast]);

  const saveScannedPosts = useCallback(async (data: { posts: any[]; writingStyle: any }): Promise<boolean> => {
    try {
      setIsScanning(true);
      setScanProgress({ message: 'Saving scanned posts...', percentage: 50 });

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await supabase.functions.invoke('save-scanned-posts', {
        body: data,
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) throw response.error;

      if (response.data.success) {
        setScanProgress({ message: 'Complete!', percentage: 100 });
        await fetchWritingStyle();
        toast({
          title: "Posts scanned",
          description: `Analyzed ${data.posts?.length || 0} posts for writing style`,
        });
        setTimeout(() => setScanProgress(null), 2000);
        return true;
      }

      return false;
    } catch (err) {
      console.error('Failed to save scanned posts:', err);
      setError(err instanceof Error ? err.message : 'Failed to save scanned posts');
      setScanProgress(null);
      toast({
        title: "Scan failed",
        description: err instanceof Error ? err.message : 'Failed to save scanned posts',
        variant: "destructive",
      });
      return false;
    } finally {
      setIsScanning(false);
    }
  }, [toast]);

  const fetchWritingStyle = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await supabase.functions.invoke('get-writing-style', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) throw response.error;

      if (response.data.success && response.data.writingStyle) {
        setWritingStyle(response.data.writingStyle);
      }
    } catch (err) {
      console.error('Failed to fetch writing style:', err);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
    fetchWritingStyle();
  }, [fetchAnalytics, fetchWritingStyle]);

  return {
    profile,
    posts,
    writingStyle,
    lastSync,
    isLoading,
    isSyncing,
    isScanning,
    scanProgress,
    error,
    fetchAnalytics,
    syncAnalytics,
    saveScannedPosts,
    fetchWritingStyle,
  };
};
