import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface RefreshAnalyticsButtonProps {
  variant?: 'default' | 'outline' | 'secondary' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

export function RefreshAnalyticsButton({
  variant = 'outline',
  size = 'sm',
  className = '',
}: RefreshAnalyticsButtonProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (isRefreshing) return;
    
    setIsRefreshing(true);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please log in to refresh analytics');
        setIsRefreshing(false);
        return;
      }

      // Fetch recent posts with LinkedIn URLs
      const { data: posts, error } = await supabase
        .from('posts')
        .select('linkedin_post_url')
        .eq('user_id', user.id)
        .eq('status', 'posted')
        .not('linkedin_post_url', 'is', null)
        .order('posted_at', { ascending: false })
        .limit(30);

      if (error) throw error;

      if (!posts || posts.length === 0) {
        toast.info('No posts to refresh analytics for');
        setIsRefreshing(false);
        return;
      }

      const postUrls = posts
        .map(p => p.linkedin_post_url)
        .filter((url): url is string => url !== null);

      if (postUrls.length === 0) {
        toast.info('No LinkedIn URLs found to scrape');
        setIsRefreshing(false);
        return;
      }

      console.log(`📊 Requesting analytics for ${postUrls.length} posts...`);

      // Send to extension
      window.postMessage({
        type: 'SCRAPE_BULK_ANALYTICS',
        postUrls: postUrls,
      }, '*');

      toast.loading(`Refreshing analytics for ${postUrls.length} posts...`, {
        id: 'analytics-refresh',
      });

      // Listen for result
      const handleResult = (event: MessageEvent) => {
        if (event.source !== window) return;
        
        if (event.data.type === 'BULK_ANALYTICS_RESULT') {
          window.removeEventListener('message', handleResult);
          setIsRefreshing(false);
          toast.dismiss('analytics-refresh');

          if (event.data.success) {
            toast.success(`Updated analytics for ${event.data.successful}/${event.data.total} posts`);
          } else {
            toast.error('Failed to refresh analytics: ' + (event.data.error || 'Unknown error'));
          }
        }
      };

      window.addEventListener('message', handleResult);

      // Timeout after 2 minutes
      setTimeout(() => {
        window.removeEventListener('message', handleResult);
        if (isRefreshing) {
          setIsRefreshing(false);
          toast.dismiss('analytics-refresh');
          toast.error('Analytics refresh timed out');
        }
      }, 120000);
    } catch (error) {
      console.error('Failed to refresh analytics:', error);
      toast.error('Failed to refresh analytics');
      setIsRefreshing(false);
    }
  };

  return (
    <Button
      onClick={handleRefresh}
      disabled={isRefreshing}
      variant={variant}
      size={size}
      className={`gap-2 ${className}`}
    >
      <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
      {isRefreshing ? 'Refreshing...' : 'Refresh Analytics'}
    </Button>
  );
}
