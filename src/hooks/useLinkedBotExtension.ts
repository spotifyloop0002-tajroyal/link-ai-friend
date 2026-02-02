// useLinkedBotExtension.ts - v4.2 (Simplified - NO auth/user_id)
// React hook for LinkedBot Chrome Extension Communication

import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';

interface ExtensionState {
  isInstalled: boolean;
  isConnected: boolean;
  extensionId: string | null;
  isLoading: boolean;
  requiresRefresh: boolean;
}

// v4.0 - Simplified post data (NO user_id)
interface PostData {
  id: string;
  content: string;
  imageUrl?: string;       // Renamed from photo_url
  scheduleTime?: string;   // Renamed from scheduled_time
  trackingId?: string;
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
        setState({
          isInstalled: true,
          isConnected: true,
          extensionId: message.extensionId || null,
          isLoading: false,
          requiresRefresh: false,
        });
        
        localStorage.setItem('extension_connected', 'true');
        if (message.extensionId) {
          localStorage.setItem('extension_id', message.extensionId);
        }
        
        toast.success('Extension Connected', {
          description: 'LinkedBot extension is ready to use!',
        });
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
    // Check localStorage for previously connected extension
    const wasConnected = localStorage.getItem('extension_connected') === 'true';
    const savedExtensionId = localStorage.getItem('extension_id');
    
    if (wasConnected && savedExtensionId) {
      setState(prev => ({
        ...prev,
        isInstalled: true,
        isConnected: true,
        extensionId: savedExtensionId,
        isLoading: false,
      }));
    }
    
    // Send connection check message
    setTimeout(() => {
      window.postMessage({ type: 'CHECK_EXTENSION' }, '*');
    }, 500);
    
    // Set loading to false after timeout
    setTimeout(() => {
      setState(prev => {
        if (prev.isLoading) {
          return { ...prev, isLoading: false };
        }
        return prev;
      });
    }, 1500);

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
    
    // Send connection request via postMessage
    window.postMessage({ type: 'CONNECT_EXTENSION' }, '*');
    
    // Wait for response
    return new Promise<{ success: boolean; extensionId?: string }>((resolve) => {
      const timeout = setTimeout(() => {
        setState(prev => ({ ...prev, isLoading: false }));
        resolve({ success: false });
      }, 3000);
      
      const handler = (event: MessageEvent) => {
        if (event.data.type === 'EXTENSION_CONNECTED') {
          clearTimeout(timeout);
          window.removeEventListener('message', handler);
          resolve({ success: true, extensionId: event.data.extensionId });
        }
      };
      
      window.addEventListener('message', handler);
    });
  }, []);

  const disconnectExtension = useCallback(async () => {
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
    window.postMessage({ type: 'CHECK_EXTENSION' }, '*');
  }, []);

  // v4.0 - Simplified postNow (NO user_id)
  const postNow = useCallback(async (post: PostData): Promise<{ success: boolean; error?: string }> => {
    console.log('=== useLinkedBotExtension.postNow v4.0 ===');
    console.log('Post:', post);

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

    // v4.0 - Simple payload (NO user_id)
    window.postMessage({
      type: 'POST_NOW',
      post: {
        id: post.id,
        content: post.content,
        imageUrl: post.imageUrl || null,
      },
    }, '*');
    
    return { success: true };
  }, [state.isConnected, state.requiresRefresh]);

  // v4.0 - Simplified sendPendingPosts (NO user_id)
  const sendPendingPosts = useCallback(async (posts: PostData[]): Promise<{ success: boolean; error?: string; queueLength?: number }> => {
    console.log('=== useLinkedBotExtension.sendPendingPosts v4.0 ===');
    console.log('Posts:', posts);

    if (!state.isConnected) {
      return { success: false, error: 'Extension not connected' };
    }

    if (state.requiresRefresh) {
      return { success: false, error: 'Page refresh required' };
    }

    // v4.0 - Simple payload (NO user_id, renamed fields)
    const transformedPosts = posts.map(post => ({
      id: post.id,
      content: post.content,
      imageUrl: post.imageUrl || null,
      scheduleTime: post.scheduleTime,
      trackingId: post.trackingId,
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

    window.postMessage({
      type: 'SCAN_POSTS',
      limit: limit,
    }, '*');
    
    return { success: true };
  }, [state.isConnected]);

  return {
    // State
    isConnected: state.isConnected,
    isInstalled: state.isInstalled,
    extensionId: state.extensionId,
    isLoading: state.isLoading,
    requiresRefresh: state.requiresRefresh,
    
    // Connection methods
    connectExtension,
    disconnectExtension,
    checkExtension,
    
    // Posting methods (v4.0 - simplified)
    postNow,
    sendPendingPosts,
    
    // Other methods
    scrapeAnalytics,
    scanPosts,
  };
}

// Type declarations for extension API on window
declare global {
  interface Window {
    LinkedBotExtension?: {
      connect: () => Promise<{ success: boolean; extensionId?: string; error?: string }>;
      disconnect: () => Promise<void>;
      checkStatus: () => Promise<{ connected: boolean; extensionId?: string }>;
      postNow: (post: { id: string; content: string; imageUrl?: string }) => Promise<{ success: boolean; error?: string }>;
      schedulePosts: (posts: Array<{ id: string; content: string; imageUrl?: string; scheduleTime?: string }>) => Promise<{ success: boolean; queueLength?: number; error?: string }>;
      scanPosts: (limit?: number) => Promise<{ success: boolean; posts?: any[]; error?: string }>;
      scrapeProfile: (profileUrl: string) => Promise<{ success: boolean; data?: any; error?: string }>;
      scrapeAnalytics: () => Promise<{ success: boolean; data?: any; error?: string }>;
    };
  }
}
