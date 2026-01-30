// useLinkedBotExtension.ts
// React hook for LinkedBot Chrome Extension Communication
// Handles context invalidation and auto-reconnection

import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';

interface ExtensionState {
  isInstalled: boolean;
  isConnected: boolean;
  extensionId: string | null;
  isLoading: boolean;
  requiresRefresh: boolean;
}

interface PostData {
  id: string;
  content: string;
  scheduled_time?: string;
  photo_url?: string;
  user_id?: string;
}

export function useLinkedBotExtension() {
  const [state, setState] = useState<ExtensionState>({
    isInstalled: false,
    isConnected: false,
    extensionId: null,
    isLoading: true,
    requiresRefresh: false,
  });
  
  const messageHandlerRef = useRef<((event: MessageEvent) => void) | null>(null);

  // ============================================================================
  // HANDLE EXTENSION MESSAGES
  // ============================================================================
  
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.source !== window) return;
      const message = event.data;

      // Extension connected
      if (message.type === 'EXTENSION_CONNECTED') {
        if (message.extensionId) {
          setState({
            isInstalled: true,
            isConnected: true,
            extensionId: message.extensionId,
            isLoading: false,
            requiresRefresh: false,
          });
          
          toast.success('Extension Connected', {
            description: 'LinkedBot extension is ready to use!',
          });
        } else {
          setState(prev => ({
            ...prev,
            isConnected: false,
            isLoading: false,
            requiresRefresh: message.requiresRefresh || false,
          }));
          
          if (message.requiresRefresh) {
            toast.error('Refresh Required', {
              description: message.error || 'Extension was reloaded. Please refresh the page.',
              duration: 10000,
            });
          }
        }
      }

      // Extension status check
      if (message.type === 'EXTENSION_STATUS') {
        setState(prev => ({
          ...prev,
          isInstalled: true,
          isConnected: message.connected,
          extensionId: message.extensionId || prev.extensionId,
          isLoading: false,
          requiresRefresh: message.requiresRefresh || false,
        }));
        
        if (message.requiresRefresh) {
          toast.error('Refresh Required', {
            description: 'Extension was reloaded. Please refresh the page.',
            duration: 10000,
          });
        }
      }

      // Extension disconnected
      if (message.type === 'EXTENSION_DISCONNECTED') {
        setState({
          isInstalled: true,
          isConnected: false,
          extensionId: null,
          isLoading: false,
          requiresRefresh: false,
        });
      }

      // Context invalidated - CRITICAL
      if (message.type === 'EXTENSION_CONTEXT_INVALIDATED') {
        setState({
          isInstalled: true,
          isConnected: false,
          extensionId: null,
          isLoading: false,
          requiresRefresh: true,
        });
        
        toast.error('⚠️ Page Refresh Required', {
          description: 'The extension was reloaded. Please refresh this page to reconnect.',
          duration: Infinity,
          action: {
            label: 'Refresh Now',
            onClick: () => window.location.reload(),
          },
        });
      }

      // Schedule result
      if (message.type === 'SCHEDULE_RESULT') {
        if (message.requiresRefresh) {
          toast.error('Refresh Required', {
            description: 'Extension was reloaded. Please refresh the page.',
            duration: 10000,
          });
          return;
        }
        
        if (message.success) {
          toast.success('Posts Scheduled', {
            description: `${message.queueLength || message.scheduledCount || 1} post(s) in queue`,
          });
        } else {
          toast.error('Schedule Failed', {
            description: message.error || 'Could not schedule posts',
          });
        }
      }

      // Post result
      if (message.type === 'POST_RESULT') {
        if (message.requiresRefresh) {
          toast.error('Refresh Required', {
            description: 'Extension was reloaded. Please refresh the page.',
            duration: 10000,
          });
          return;
        }
        
        if (message.success) {
          toast.success('Post Published!', {
            description: 'Your LinkedIn post is now live',
          });
        } else {
          toast.error('Publishing Failed', {
            description: message.error || 'Could not publish post',
          });
        }
      }
    };

    messageHandlerRef.current = handleMessage;
    window.addEventListener('message', handleMessage);

    return () => {
      if (messageHandlerRef.current) {
        window.removeEventListener('message', messageHandlerRef.current);
      }
    };
  }, []);

  // ============================================================================
  // AUTO-CONNECT ON MOUNT
  // ============================================================================
  
  useEffect(() => {
    // Check if extension API is available directly
    if (typeof window.LinkedBotExtension !== 'undefined') {
      setState(prev => ({ ...prev, isInstalled: true }));
      checkExtension();
    } else {
      // Auto-check extension status on mount via message
      setTimeout(() => {
        window.postMessage({ type: 'CHECK_EXTENSION' }, '*');
      }, 500);
      
      // Also set loading to false after timeout if no response
      setTimeout(() => {
        setState(prev => {
          if (prev.isLoading) {
            return { ...prev, isLoading: false };
          }
          return prev;
        });
      }, 2000);
    }

    // Listen for extension ready event
    const handleExtensionReady = () => {
      setState(prev => ({ ...prev, isInstalled: true }));
      checkExtension();
    };

    window.addEventListener('linkedbot-extension-ready', handleExtensionReady);

    return () => {
      window.removeEventListener('linkedbot-extension-ready', handleExtensionReady);
    };
  }, []);

  // ============================================================================
  // API METHODS
  // ============================================================================
  
  const connectExtension = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true }));
    
    // Try direct API first
    if (typeof window.LinkedBotExtension?.connect === 'function') {
      try {
        const result = await window.LinkedBotExtension.connect();
        if (result.success) {
          setState({
            isInstalled: true,
            isConnected: true,
            extensionId: result.extensionId || null,
            isLoading: false,
            requiresRefresh: false,
          });
          localStorage.setItem('extension_connected', 'true');
          if (result.extensionId) {
            localStorage.setItem('extension_id', result.extensionId);
          }
          return { success: true, extensionId: result.extensionId };
        } else {
          throw new Error(result.error || 'Connection failed');
        }
      } catch (error) {
        setState(prev => ({ ...prev, isLoading: false }));
        throw error;
      }
    }
    
    // Fallback to message-based connection
    window.postMessage({ type: 'CONNECT_EXTENSION' }, '*');
    return { success: true };
  }, []);

  const disconnectExtension = useCallback(async () => {
    // Try direct API first
    if (typeof window.LinkedBotExtension?.disconnect === 'function') {
      await window.LinkedBotExtension.disconnect();
    }
    
    // Also send message
    window.postMessage({ type: 'DISCONNECT_EXTENSION' }, '*');
    
    setState({
      isInstalled: true,
      isConnected: false,
      extensionId: null,
      isLoading: false,
      requiresRefresh: false,
    });
    
    localStorage.removeItem('extension_connected');
    localStorage.removeItem('extension_id');
  }, []);

  const checkExtension = useCallback(async () => {
    // Try direct API first
    if (typeof window.LinkedBotExtension?.checkStatus === 'function') {
      try {
        const result = await window.LinkedBotExtension.checkStatus();
        setState(prev => ({
          ...prev,
          isInstalled: true,
          isConnected: result.connected,
          extensionId: result.extensionId || prev.extensionId,
          isLoading: false,
        }));
        return;
      } catch (error) {
        console.error('Error checking extension:', error);
      }
    }
    
    // Fallback to message
    window.postMessage({ type: 'CHECK_EXTENSION' }, '*');
  }, []);

  const postNow = useCallback(async (post: PostData): Promise<{ success: boolean; error?: string; linkedinPostId?: string }> => {
    console.log('=== useLinkedBotExtension.postNow CALLED ===');
    console.log('Post:', post);
    console.log('State:', state);

    if (!state.isConnected) {
      toast.error('Not Connected', {
        description: 'Please connect the extension first',
      });
      return { success: false, error: 'Extension not connected' };
    }

    if (state.requiresRefresh) {
      toast.error('Refresh Required', {
        description: 'Extension was reloaded. Please refresh the page.',
        action: {
          label: 'Refresh',
          onClick: () => window.location.reload(),
        },
      });
      return { success: false, error: 'Page refresh required' };
    }

    // Try direct API first
    if (typeof window.LinkedBotExtension?.postNow === 'function') {
      try {
        const result = await window.LinkedBotExtension.postNow({
          id: post.id,
          content: post.content,
          photo_url: post.photo_url,
          scheduled_time: post.scheduled_time || new Date().toISOString(),
        });
        
        if (!result.success && result.error) {
          let userFriendlyError = result.error;
          
          if (result.error.includes('No tab with id')) {
            userFriendlyError = 'LinkedIn tab was closed. Please keep LinkedIn open while posting.';
          } else if (result.error.includes('Extension context invalidated')) {
            userFriendlyError = 'Extension was reloaded. Please refresh this page and try again.';
          } else if (result.error.includes('Could not establish connection')) {
            userFriendlyError = 'Extension disconnected. Please check if the extension is enabled in Chrome.';
          }
          
          return { success: false, error: userFriendlyError };
        }
        
        return result;
      } catch (error) {
        console.error('Error posting:', error);
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Failed to post' 
        };
      }
    }

    // Fallback to message-based posting
    window.postMessage({
      type: 'POST_NOW',
      post: {
        id: post.id,
        user_id: post.user_id,
        content: post.content,
        photo_url: post.photo_url,
        scheduled_for: post.scheduled_time || new Date().toISOString(),
      },
    }, '*');
    
    return { success: true };
  }, [state.isConnected, state.requiresRefresh]);

  const sendPendingPosts = useCallback(async (posts: PostData[], userId?: string): Promise<{ success: boolean; error?: string; queueLength?: number }> => {
    if (!state.isConnected) {
      return { success: false, error: 'Extension not connected' };
    }

    if (state.requiresRefresh) {
      return { success: false, error: 'Page refresh required' };
    }

    // Try direct API first
    if (typeof window.LinkedBotExtension !== 'undefined') {
      const api: any = window.LinkedBotExtension;
      const candidates = [
        'sendPendingPosts',
        'sendPosts',
        'sendScheduledPosts',
        'schedulePosts',
        'queuePosts',
        'enqueuePosts',
        'addPosts',
      ];

      const fnName = candidates.find((name) => typeof api?.[name] === 'function');
      if (fnName) {
        const transformedPosts = posts.map(post => ({
          id: post.id,
          user_id: userId || post.user_id,
          content: post.content,
          photo_url: post.photo_url,
          scheduled_for: post.scheduled_time,
          scheduled_time: post.scheduled_time,
        }));

        try {
          const result = await api[fnName](transformedPosts);
          if (result && result.success === false) {
            return { success: false, error: result.error || 'Extension rejected posts' };
          }
          return { success: true, queueLength: result?.queueLength };
        } catch (error) {
          return { success: false, error: error instanceof Error ? error.message : 'Failed to send posts' };
        }
      }
    }

    // Fallback to message-based scheduling
    const transformedPosts = posts.map(post => ({
      id: post.id,
      user_id: userId || post.user_id,
      content: post.content,
      photo_url: post.photo_url,
      scheduled_for: post.scheduled_time,
    }));

    window.postMessage({
      type: 'SCHEDULE_POSTS',
      posts: transformedPosts,
    }, '*');
    
    return { success: true };
  }, [state.isConnected, state.requiresRefresh]);

  const scrapeAnalytics = useCallback(() => {
    if (!state.isConnected) {
      toast.error('Not Connected', {
        description: 'Please connect the extension first',
      });
      return;
    }

    window.postMessage({ type: 'SCRAPE_ANALYTICS' }, '*');
  }, [state.isConnected]);

  const scanPosts = useCallback(async (limit = 50) => {
    if (!state.isConnected) {
      return { success: false, error: 'Extension not connected' };
    }

    // Try direct API first
    if (typeof window.LinkedBotExtension?.scanPosts === 'function') {
      return await window.LinkedBotExtension.scanPosts(limit);
    }

    // Fallback to message
    window.postMessage({
      type: 'SCAN_POSTS',
      limit: limit,
    }, '*');
    
    return { success: true };
  }, [state.isConnected]);

  // 🔒 Set current user in extension (for data isolation)
  const setCurrentUser = useCallback((userId: string) => {
    console.log('🔒 Setting current user in extension:', userId);
    window.postMessage({
      type: 'SET_CURRENT_USER',
      userId: userId
    }, '*');
    window.postMessage({
      type: 'SET_USER_ID',
      userId: userId
    }, '*');
  }, []);

  // 🔒 Clear user session on logout
  const clearUserSession = useCallback(() => {
    console.log('🔒 Clearing user session in extension');
    window.postMessage({
      type: 'CLEAR_USER_SESSION'
    }, '*');
    window.postMessage({
      type: 'LOGOUT_USER'
    }, '*');
  }, []);

  return {
    // State - maintain backwards compatibility
    isInstalled: state.isInstalled,
    isConnected: state.isConnected,
    extensionId: state.extensionId,
    isLoading: state.isLoading,
    requiresRefresh: state.requiresRefresh,
    
    // Methods
    connectExtension,
    disconnectExtension,
    checkExtension,
    postNow,
    sendPendingPosts,
    scrapeAnalytics,
    scanPosts,
    setCurrentUser,
    clearUserSession,
  };
}

// Export as both named and default for compatibility
export const useLinkedBotExtensionHook = useLinkedBotExtension;

// Type declaration for window
declare global {
  interface Window {
    LinkedBotExtension?: {
      isInstalled: boolean;
      isConnected: boolean;
      extensionId: string | null;
      connect: () => Promise<{ success: boolean; extensionId?: string; error?: string }>;
      disconnect: () => Promise<{ success: boolean }>;
      checkStatus: () => Promise<{ connected: boolean; extensionId?: string }>;
      sendPendingPosts: (posts: { id: string; content: string; photo_url?: string; scheduled_time: string }[]) => void;
      postNow: (post: { id: string; content: string; photo_url?: string; scheduled_time: string }) => Promise<{ success: boolean; linkedinPostId?: string; error?: string }>;
      onEvent: (callback: (event: string, data: unknown) => void) => void;
      saveProfileUrl?: (url: string) => Promise<{ success: boolean; error?: string }>;
      scrapeProfile?: (profileUrl: string) => Promise<{
        success: boolean;
        error?: string;
        data?: {
          fullName?: string;
          headline?: string;
          profilePhoto?: string;
          currentRole?: string;
          currentCompany?: string;
          location?: string;
          followersCount?: number;
          connectionsCount?: number;
          profileUrl?: string;
          username?: string;
        };
      }>;
      scrapeAnalytics: () => Promise<{ 
        success: boolean; 
        error?: string; 
        data?: { 
          profile: { 
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
          };
          posts: Array<{ postId?: string; content?: string; views?: number; likes?: number; comments?: number; reposts?: number; timestamp?: string; linkedinUrl?: string }>;
          scrapedAt: string;
        } 
      }>;
      scanPosts: (limit?: number) => Promise<{ 
        success: boolean; 
        error?: string; 
        data?: { 
          posts: Array<{ content: string; timestamp?: string; views?: number; likes?: number; comments?: number; reposts?: number; postUrl?: string }>;
          writingStyle?: { avgPostLength?: number; tone?: string; usesEmojis?: boolean; usesHashtags?: boolean; avgHashtagsPerPost?: number; commonHashtags?: string[] };
        } 
      }>;
      onPostHistoryScanned?: (callback: (data: unknown) => void) => void;
    };
  }
}
