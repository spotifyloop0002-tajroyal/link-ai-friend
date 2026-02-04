import { useEffect, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { ExtensionEventType } from '@/types/extension';

// Re-export for backward compatibility
export type { ExtensionEventType } from '@/types/extension';

export interface ExtensionEventData {
  postId?: string;
  trackingId?: string;
  message?: string;
  error?: string;
  linkedinUrl?: string;
  scheduledTime?: string;
  queueLength?: number;
  retryIn?: string;
  analytics?: {
    views: number;
    likes: number;
    comments: number;
    shares: number;
  };
}

export interface PostStatusInfo {
  status: 'draft' | 'scheduled' | 'posting' | 'posted' | 'failed' | 'verifying';
  message: string;
  linkedinUrl?: string;
  scheduledTime?: string;
  timestamp: Date;
}

export interface ExtensionStatus {
  connected: boolean;
  lastEvent: { event: ExtensionEventType; data: ExtensionEventData } | null;
  message: string | null;
  postStatuses: Record<string, PostStatusInfo>;
}

// Legacy event interfaces for backward compatibility
interface PostPublishedEvent {
  trackingId?: string;
  postId?: string;
  linkedinUrl?: string;
  postedAt?: string;
}

interface PostFailedEvent {
  postId?: string;
  trackingId?: string;
  error?: string;
}

interface AnalyticsUpdatedEvent {
  postId?: string;
  analytics?: {
    views?: number;
    likes?: number;
    comments?: number;
    shares?: number;
  };
}

interface ProfileScrapedEvent {
  profile?: {
    fullName?: string;
    headline?: string;
    profilePhoto?: string;
    followersCount?: number;
    connectionsCount?: number;
  };
}

interface ConnectionChangedEvent {
  connected: boolean;
  extensionId?: string;
}

interface ErrorEvent {
  message: string;
  code?: string;
}

/**
 * Enhanced hook to listen for Chrome extension events
 * Provides real-time status updates and invalidates react-query caches
 */
export const useExtensionEvents = () => {
  const queryClient = useQueryClient();
  
  const [status, setStatus] = useState<ExtensionStatus>({
    connected: false,
    lastEvent: null,
    message: null,
    postStatuses: {},
  });

  // Update post status helper
  const updatePostStatus = useCallback((
    postId: string, 
    statusInfo: Partial<PostStatusInfo>
  ) => {
    setStatus(prev => ({
      ...prev,
      postStatuses: {
        ...prev.postStatuses,
        [postId]: {
          ...prev.postStatuses[postId],
          ...statusInfo,
          timestamp: new Date(),
        } as PostStatusInfo,
      },
    }));
  }, []);

  // Clear post status
  const clearPostStatus = useCallback((postId: string) => {
    setStatus(prev => {
      const newStatuses = { ...prev.postStatuses };
      delete newStatuses[postId];
      return { ...prev, postStatuses: newStatuses };
    });
  }, []);

  // Clear all statuses
  const clearAllStatuses = useCallback(() => {
    setStatus(prev => ({ ...prev, postStatuses: {} }));
  }, []);

  useEffect(() => {
    // Handler for new postMessage-based events from webapp-content.js
    const handleWindowMessage = async (event: MessageEvent) => {
      if (event.source !== window) return;
      
      const message = event.data;
      
      // Connection status messages
      if (message.type === 'EXTENSION_CONNECTED') {
        setStatus(prev => ({
          ...prev,
          connected: true,
          message: '✅ Extension connected',
        }));
        
        toast.success('Extension Connected', {
          description: 'LinkedIn extension is ready',
        });
      }
      
      // v5.0 - Extension ready for analytics scraping
      if (message.type === 'EXTENSION_READY_FOR_SCRAPING') {
        console.log('🚀 Extension ready for analytics scraping');
        setStatus(prev => ({
          ...prev,
          connected: true,
          message: '✅ Extension ready for scraping',
        }));
        
        // Invalidate analytics to show fresh data when scraping completes
        queryClient.invalidateQueries({ queryKey: ['analytics'] });
        queryClient.invalidateQueries({ queryKey: ['linkedin-analytics'] });
      }
      
      if (message.type === 'EXTENSION_DISCONNECTED') {
        setStatus(prev => ({
          ...prev,
          connected: false,
          message: '❌ Extension disconnected',
        }));
        
        toast.warning('Extension Disconnected', {
          description: 'Please refresh the page and reconnect',
          action: {
            label: 'Refresh',
            onClick: () => window.location.reload(),
          },
          duration: 10000,
        });
      }
      
      // Extension acknowledgment - posts received confirmation
      if (message.type === 'EXTENSION_POSTS_RECEIVED') {
        console.log('✅ Extension confirmed receipt of', message.count, 'posts');
        toast.success(`Extension received ${message.count} post(s)`, {
          description: 'Posts are queued for publishing',
        });
      }
      
      // LinkedIn UI change detection - CRITICAL ALERT (Admin only, no user notification)
      if (message.type === 'EXTENSION_EVENT' && message.event === 'linkedinUIChanged') {
        console.error('🚨 CRITICAL: LinkedIn UI changed!', message.data);
        
        // Log to database and send admin alert silently (no user toast)
        (async () => {
          try {
            const { supabase } = await import('@/integrations/supabase/client');
            const { data: { user } } = await supabase.auth.getUser();
            
            // Send critical alert to admin via edge function
            await supabase.functions.invoke('send-critical-alert', {
              body: {
                alertType: 'linkedin_ui_changed',
                severity: 'critical',
                title: 'LinkedIn UI Changed',
                message: 'The LinkedIn interface has changed. Extension posting may fail.',
                details: message.data,
                userId: user?.id,
              }
            });
            
            console.log('✅ Critical alert sent to admin');
          } catch (err) {
            console.error('Failed to send critical alert:', err);
          }
        })();
      }
      
      // v5.0 - Handle POST_RESULT from extension (post success/failure with LinkedIn URL)
      if (message.type === 'POST_RESULT') {
        console.log('📨 POST_RESULT received:', message);
        
        const { success, postId, trackingId, linkedinUrl, postUrl, error } = message;
        const actualUrl = linkedinUrl || postUrl;
        const actualPostId = postId || trackingId;
        
        if (success && actualPostId) {
          console.log('✅ Post successful, saving LinkedIn URL:', actualUrl);
          
          try {
            // Import supabase dynamically to avoid circular deps
            const { supabase } = await import('@/integrations/supabase/client');
            
            // Update post with LinkedIn URL and status
            const updateData: Record<string, unknown> = {
              status: 'posted',
              posted_at: new Date().toISOString(),
            };
            
            if (actualUrl) {
              updateData.linkedin_post_url = actualUrl;
              // Initialize analytics to 0 when URL is captured
              updateData.views_count = 0;
              updateData.likes_count = 0;
              updateData.comments_count = 0;
              updateData.shares_count = 0;
            }
            
            const { error: updateError } = await supabase
              .from('posts')
              .update(updateData)
              .eq('id', actualPostId);
            
            if (updateError) {
              console.error('Failed to save LinkedIn URL:', updateError);
            } else {
              console.log('✅ LinkedIn URL saved to database:', actualUrl);
            }
            
            // Update local status
            if (actualPostId) {
              updatePostStatus(actualPostId, {
                status: 'posted',
                message: 'Posted successfully!',
                linkedinUrl: actualUrl,
              });
            }
            
            // Invalidate queries to refresh UI
            queryClient.invalidateQueries({ queryKey: ['posts'], refetchType: 'all' });
            queryClient.invalidateQueries({ queryKey: ['scheduled-posts'], refetchType: 'all' });
            queryClient.invalidateQueries({ queryKey: ['analytics'], refetchType: 'all' });
            
            // Show success toast with link to post
            if (actualUrl) {
              toast.success('Posted to LinkedIn! 🎉', {
                description: 'Your post is live',
                action: {
                  label: 'View Post',
                  onClick: () => window.open(actualUrl, '_blank'),
                },
              });
            } else {
              toast.success('Posted to LinkedIn!', {
                description: 'Post created but URL not captured',
              });
            }
          } catch (err) {
            console.error('Error saving LinkedIn URL:', err);
          }
        } else if (!success) {
          console.error('Post failed:', error);
          
          try {
            const { supabase } = await import('@/integrations/supabase/client');
            
            // Update post status to failed
            if (actualPostId) {
              await supabase
                .from('posts')
                .update({ 
                  status: 'failed',
                  last_error: error || 'Unknown error',
                })
                .eq('id', actualPostId);
              
              updatePostStatus(actualPostId, {
                status: 'failed',
                message: error || 'Failed to post',
              });
            }
            
            queryClient.invalidateQueries({ queryKey: ['posts'] });
          } catch (err) {
            console.error('Error updating failed status:', err);
          }
          
          toast.error('Failed to post to LinkedIn', {
            description: error || 'Please try again',
          });
        }
      }
      
      // v5.0 - Bulk analytics result
      // NOTE: Toast is handled by RefreshAnalyticsButton.tsx to avoid duplicates
      if (message.type === 'BULK_ANALYTICS_RESULT') {
        const { success, successful, total, results } = message;
        
        if (success) {
          console.log(`📊 Bulk analytics scraped: ${successful}/${total}`);
          
          // Save analytics data to database
          if (results && Array.isArray(results)) {
            (async () => {
              try {
                const { supabase } = await import('@/integrations/supabase/client');
                const { data: { user } } = await supabase.auth.getUser();
                
                if (!user) {
                  console.error('No user found for analytics update');
                  return;
                }
                
                for (const result of results) {
                  if (!result.url) continue;
                  
                  const views = result.views || 0;
                  const likes = result.likes || 0;
                  const comments = result.comments || 0;
                  const shares = result.reposts || result.shares || 0;
                  
                  console.log(`💾 Saving analytics for ${result.url}:`, { views, likes, comments, shares });
                  
                  // Update the post directly by LinkedIn URL
                  const { error: updateError } = await supabase
                    .from('posts')
                    .update({
                      views_count: views,
                      likes_count: likes,
                      comments_count: comments,
                      shares_count: shares,
                      last_synced_at: new Date().toISOString(),
                    })
                    .eq('user_id', user.id)
                    .eq('linkedin_post_url', result.url);
                  
                  if (updateError) {
                    console.error('Failed to update analytics for', result.url, updateError);
                  } else {
                    console.log('✅ Analytics saved for', result.url);
                  }
                }
              } catch (err) {
                console.error('Error saving bulk analytics:', err);
              }
            })();
          }
          
          // Invalidate all analytics queries to refresh UI
          queryClient.invalidateQueries({ queryKey: ['posts'], refetchType: 'all' });
          queryClient.invalidateQueries({ queryKey: ['analytics'], refetchType: 'all' });
          queryClient.invalidateQueries({ queryKey: ['linkedin-analytics'], refetchType: 'all' });
          
          // Don't show toast here - RefreshAnalyticsButton handles its own toast
        } else {
          console.error('Bulk analytics scraping failed:', message.error);
        }
      }
      
      // v5.0 - Single analytics result
      if (message.type === 'ANALYTICS_RESULT') {
        if (message.success) {
          queryClient.invalidateQueries({ queryKey: ['posts'], refetchType: 'all' });
          queryClient.invalidateQueries({ queryKey: ['analytics'], refetchType: 'all' });
        }
      }
      
      // Extension events with detailed status updates
      if (message.type === 'EXTENSION_EVENT') {
        const { event, data } = message as { event: ExtensionEventType; data: ExtensionEventData };
        
        console.log(`[Extension Event] ${event}:`, data);
        
        setStatus(prev => ({
          ...prev,
          lastEvent: { event, data },
          message: data.message || null,
        }));
        
        // Handle specific events
        const postId = data.postId || data.trackingId;
        
        if (postId) {
          switch (event) {
            case 'postScheduled':
              updatePostStatus(postId, {
                status: 'scheduled',
                message: data.message || `Scheduled for ${data.scheduledTime}`,
                scheduledTime: data.scheduledTime,
              });
              toast.success('Post Scheduled', {
                description: data.message,
              });
              break;
              
            case 'postStarting':
              updatePostStatus(postId, {
                status: 'posting',
                message: data.message || '⏰ Time to post!',
              });
              toast.info('Posting Started', {
                description: data.message || 'Starting to post to LinkedIn...',
              });
              break;
              
            case 'postFilling':
              updatePostStatus(postId, {
                status: 'posting',
                message: data.message || '📝 Filling content...',
              });
              break;
              
            case 'postPublished':
              updatePostStatus(postId, {
                status: 'posting',
                message: data.message || '✅ Posted! Getting URL...',
              });
              break;
              
            case 'postSuccess':
            case 'postCompleted':
              updatePostStatus(postId, {
                status: 'posted',
                message: data.message || 'Posted successfully!',
                linkedinUrl: data.linkedinUrl,
              });
              
              // 🔥 CRITICAL: Save to database from here too!
              (async () => {
                try {
                  const { supabase } = await import('@/integrations/supabase/client');
                  
                  const updateData: Record<string, unknown> = {
                    status: 'posted',
                    posted_at: new Date().toISOString(),
                  };
                  
                  if (data.linkedinUrl) {
                    updateData.linkedin_post_url = data.linkedinUrl;
                    updateData.views_count = 0;
                    updateData.likes_count = 0;
                    updateData.comments_count = 0;
                    updateData.shares_count = 0;
                  }
                  
                  console.log('💾 Saving post status to database:', postId, updateData);
                  
                  const { error: updateError } = await supabase
                    .from('posts')
                    .update(updateData)
                    .eq('id', postId);
                  
                  if (updateError) {
                    console.error('Failed to update post status:', updateError);
                  } else {
                    console.log('✅ Post status saved to database');
                  }
                } catch (err) {
                  console.error('Error saving post status:', err);
                }
              })();
              
              // Invalidate queries
              queryClient.invalidateQueries({ queryKey: ['posts'], refetchType: 'all' });
              queryClient.invalidateQueries({ queryKey: ['scheduled-posts'], refetchType: 'all' });
              
              toast.success('Posted Successfully!', {
                description: 'Your post is live on LinkedIn',
                action: data.linkedinUrl ? {
                  label: 'View Post',
                  onClick: () => window.open(data.linkedinUrl, '_blank'),
                } : undefined,
              });
              break;
              
            case 'postFailed':
              updatePostStatus(postId, {
                status: 'failed',
                message: data.message || data.error || 'Post failed',
              });
              
              queryClient.invalidateQueries({ queryKey: ['posts'] });
              
              toast.error('Post Failed', {
                description: data.message || data.error,
              });
              break;
              
            case 'postUrlFailed':
              updatePostStatus(postId, {
                status: 'verifying',
                message: data.message || 'Posted but URL extraction failed',
              });
              
              toast.warning('Posted (No URL)', {
                description: 'Post created but couldn\'t get URL. Check LinkedIn manually.',
              });
              break;
              
            case 'postRetrying':
              toast.info('Retrying Post', {
                description: `Will retry in ${data.retryIn}`,
              });
              break;
          }
        }
        
        // Handle non-post events
        if (event === 'queueUpdated') {
          toast.info('Queue Updated', {
            description: data.message || `${data.queueLength} posts in queue`,
          });
        }
        
        if (event === 'analyticsUpdated') {
          console.log('Analytics updated:', data);
          queryClient.invalidateQueries({ queryKey: ['analytics'] });
          queryClient.invalidateQueries({ queryKey: ['linkedin-analytics'] });
        }
        
        if (event === 'alarmFired') {
          console.log('Extension alarm fired:', data);
        }
      }
    };

    // Legacy event handlers (for backward compatibility with extension-bridge.js)
    const handlePostPublished = (event: CustomEvent<PostPublishedEvent>) => {
      const { postId, trackingId, linkedinUrl } = event.detail;
      
      console.log('✅ Extension Event: Post published', { postId, trackingId, linkedinUrl });
      console.log('🔄 Invalidating all cached queries to re-fetch from database...');
      
      const id = postId || trackingId;
      if (id) {
        updatePostStatus(id, {
          status: 'posted',
          message: 'Published to LinkedIn',
          linkedinUrl,
        });
      }
      
      // Force immediate refetch from database
      queryClient.invalidateQueries({ queryKey: ['posts'], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['scheduled-posts'], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['analytics'], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['agents'], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['user-profile'], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['notifications'], refetchType: 'all' });
      
      // Secondary refetch after delay
      setTimeout(() => {
        console.log('🔄 Secondary refetch after 1s delay');
        queryClient.invalidateQueries({ queryKey: ['posts'], refetchType: 'all' });
        queryClient.invalidateQueries({ queryKey: ['scheduled-posts'], refetchType: 'all' });
      }, 1000);
      
      toast.success('Post published successfully!', {
        description: linkedinUrl ? 'Click to view on LinkedIn' : undefined,
        action: linkedinUrl ? {
          label: 'View Post',
          onClick: () => window.open(linkedinUrl, '_blank'),
        } : undefined,
      });
    };

    const handlePostFailed = (event: CustomEvent<PostFailedEvent>) => {
      const { postId, trackingId, error } = event.detail;
      
      console.log('❌ Extension Event: Post failed', { postId, error });
      
      const id = postId || trackingId;
      if (id) {
        updatePostStatus(id, {
          status: 'failed',
          message: error || 'Failed to publish',
        });
      }
      
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['scheduled-posts'] });
      
      toast.error('Post failed to publish', {
        description: error || 'Please try again',
      });
    };

    const handleAnalyticsUpdated = (event: CustomEvent<AnalyticsUpdatedEvent>) => {
      console.log('📊 Extension Event: Analytics updated');
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['linkedin-analytics'] });
    };

    const handleProfileScraped = (event: CustomEvent<ProfileScrapedEvent>) => {
      console.log('👤 Extension Event: Profile scraped');
      queryClient.invalidateQueries({ queryKey: ['linkedin-profile'] });
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      queryClient.invalidateQueries({ queryKey: ['linkedin-analytics'] });
      toast.success('Profile data refreshed!');
    };

    const handleConnectionChanged = (event: CustomEvent<ConnectionChangedEvent>) => {
      const { connected } = event.detail;
      console.log('🔗 Extension Event: Connection', connected ? 'connected' : 'disconnected');
      
      setStatus(prev => ({
        ...prev,
        connected,
        message: connected ? '✅ Extension connected' : '❌ Extension disconnected',
      }));
      
      if (connected) {
        toast.success('Extension connected!');
      } else {
        toast.warning('Extension disconnected');
      }
    };

    const handleError = (event: CustomEvent<ErrorEvent>) => {
      const { message } = event.detail;
      console.error('❌ Extension Event: Error', message);
      toast.error(message || 'An error occurred with the extension');
    };

    // Register window message listener for new events
    window.addEventListener('message', handleWindowMessage);
    
    // Register legacy event listeners
    window.addEventListener('linkedbot:post-published', handlePostPublished as EventListener);
    window.addEventListener('linkedbot:post-failed', handlePostFailed as EventListener);
    window.addEventListener('linkedbot:analytics-updated', handleAnalyticsUpdated as EventListener);
    window.addEventListener('linkedbot:profile-scraped', handleProfileScraped as EventListener);
    window.addEventListener('linkedbot:connection-changed', handleConnectionChanged as EventListener);
    window.addEventListener('linkedbot:error', handleError as EventListener);

    return () => {
      window.removeEventListener('message', handleWindowMessage);
      window.removeEventListener('linkedbot:post-published', handlePostPublished as EventListener);
      window.removeEventListener('linkedbot:post-failed', handlePostFailed as EventListener);
      window.removeEventListener('linkedbot:analytics-updated', handleAnalyticsUpdated as EventListener);
      window.removeEventListener('linkedbot:profile-scraped', handleProfileScraped as EventListener);
      window.removeEventListener('linkedbot:connection-changed', handleConnectionChanged as EventListener);
      window.removeEventListener('linkedbot:error', handleError as EventListener);
    };
  }, [queryClient, updatePostStatus]);

  return {
    ...status,
    updatePostStatus,
    clearPostStatus,
    clearAllStatuses,
  };
};
