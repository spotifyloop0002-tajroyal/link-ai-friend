import { useState, useEffect, useCallback } from 'react';

interface ExtensionStatus {
  isInstalled: boolean;
  isConnected: boolean;
  extensionId: string | null;
}

interface Post {
  id: string;
  content: string;
  photo_url?: string;
  scheduled_time: string;
}

export const useLinkedBotExtension = () => {
  const [status, setStatus] = useState<ExtensionStatus>({
    isInstalled: false,
    isConnected: false,
    extensionId: null,
  });
  const [isLoading, setIsLoading] = useState(true);

  // Check if extension is installed and get status
  const checkExtension = useCallback(async () => {
    if (typeof window.LinkedBotExtension === 'undefined') {
      setStatus({
        isInstalled: false,
        isConnected: false,
        extensionId: null,
      });
      setIsLoading(false);
      return;
    }

    try {
      const result = await window.LinkedBotExtension.checkStatus();
      setStatus({
        isInstalled: true,
        isConnected: result.connected,
        extensionId: result.extensionId || null,
      });
    } catch (error) {
      console.error('Error checking extension:', error);
      setStatus({
        isInstalled: true,
        isConnected: false,
        extensionId: null,
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Connect extension
  const connectExtension = useCallback(async () => {
    if (typeof window.LinkedBotExtension === 'undefined') {
      throw new Error('Extension not installed');
    }

    try {
      const result = await window.LinkedBotExtension.connect();

      if (result.success) {
        setStatus({
          isInstalled: true,
          isConnected: true,
          extensionId: result.extensionId || null,
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
      console.error('Error connecting extension:', error);
      throw error;
    }
  }, []);

  // Disconnect extension
  const disconnectExtension = useCallback(async () => {
    if (typeof window.LinkedBotExtension === 'undefined') {
      return;
    }

    try {
      await window.LinkedBotExtension.disconnect();
      setStatus({
        isInstalled: true,
        isConnected: false,
        extensionId: null,
      });

      localStorage.removeItem('extension_connected');
      localStorage.removeItem('extension_id');
    } catch (error) {
      console.error('Error disconnecting extension:', error);
    }
  }, []);

  // Send pending posts to extension
  const sendPendingPosts = useCallback(async (posts: Post[], userId?: string): Promise<{ success: boolean; error?: string; queueLength?: number }> => {
    if (typeof window.LinkedBotExtension === 'undefined') {
      return { success: false, error: 'Extension not installed. Please install the Chrome extension first.' };
    }

    // Re-check status before sending
    try {
      const statusCheck = await window.LinkedBotExtension.checkStatus();
      if (!statusCheck.connected) {
        return { success: false, error: 'Extension not connected. Please connect from the Dashboard first.' };
      }
    } catch {
      return { success: false, error: 'Could not verify extension status.' };
    }

    try {
      const api: any = window.LinkedBotExtension;

      // Support multiple extension versions by probing available method names.
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
      if (!fnName) {
        const available = api ? Object.keys(api).filter((k) => typeof api[k] === 'function') : [];
        console.error('Extension scheduling API not found. Available methods:', available);
        return {
          success: false,
          error:
            'Your extension does not support scheduling from the app (missing scheduling API). Please update the extension and try again.',
        };
      }

      // 🔒 Transform posts to match extension's expected format
      // Extension expects: user_id, scheduled_for (not scheduled_time)
      const transformedPosts = posts.map(post => ({
        id: post.id,
        user_id: userId || (post as any).user_id, // 🔒 Include user_id for ownership verification
        content: post.content,
        photo_url: post.photo_url,
        scheduled_for: post.scheduled_time, // 🔒 Extension expects scheduled_for not scheduled_time
        scheduled_time: post.scheduled_time, // Keep both for compatibility
      }));

      console.log('📤 Calling extension method:', fnName, 'with posts:', transformedPosts);
      
      // Await the result if the function returns a promise
      const result = await api[fnName](transformedPosts);
      console.log('📥 Extension response:', result);
      
      // Validate response
      if (result && typeof result === 'object' && result.success === false) {
        return { success: false, error: result.error || 'Extension rejected posts' };
      }
      
      return { success: true, queueLength: result?.queueLength };
    } catch (error) {
      console.error('Error sending posts to extension:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Failed to send posts' };
    }
  }, []);

  // Post immediately with enhanced error handling
  const postNow = useCallback(async (post: Post): Promise<{ success: boolean; error?: string; linkedinPostId?: string }> => {
    console.log('=== useLinkedBotExtension.postNow CALLED ===');
    console.log('Post:', post);
    console.log('Extension available:', typeof window.LinkedBotExtension !== 'undefined');
    console.log('Status:', status);
    
    // GATE 1: Extension must be available
    if (typeof window.LinkedBotExtension === 'undefined') {
      console.error('❌ GATE 1 FAILED: Extension not installed');
      return { 
        success: false, 
        error: 'Extension not installed. Please install the LinkedBot Chrome extension first.' 
      };
    }

    // GATE 2: Must be connected
    if (!status.isConnected) {
      console.error('❌ GATE 2 FAILED: Extension not connected');
      return { 
        success: false, 
        error: 'Extension not connected. Please connect from the Dashboard first.' 
      };
    }

    // GATE 3: Post must have content
    if (!post.content || post.content.trim() === '') {
      console.error('❌ GATE 3 FAILED: Post content is empty');
      return { 
        success: false, 
        error: 'Post content is empty. Generate a post first.' 
      };
    }

    console.log('✅ All gates passed, calling extension...');

    try {
      // Re-check connection status before posting
      console.log('Re-checking extension connection status...');
      const statusCheck = await window.LinkedBotExtension.checkStatus();
      console.log('Status check result:', statusCheck);
      
      if (!statusCheck.connected) {
        console.error('❌ Extension disconnected during posting');
        return { 
          success: false, 
          error: 'Extension disconnected. Please reconnect from the Dashboard.' 
        };
      }

      console.log('📤 Calling window.LinkedBotExtension.postNow()...');
      const result = await window.LinkedBotExtension.postNow(post);
      console.log('📥 Extension postNow result:', result);
      
      // Handle extension-specific errors with user-friendly messages
      if (!result.success && result.error) {
        let userFriendlyError = result.error;
        
        if (result.error.includes('No tab with id')) {
          userFriendlyError = 'LinkedIn tab was closed. Please keep LinkedIn open while posting.';
        } else if (result.error.includes('Extension context invalidated')) {
          userFriendlyError = 'Extension was reloaded. Please refresh this page and try again.';
        } else if (result.error.includes('Could not establish connection')) {
          userFriendlyError = 'Extension disconnected. Please check if the extension is enabled in Chrome.';
        } else if (result.error.includes('Receiving end does not exist')) {
          userFriendlyError = 'Cannot reach LinkedIn tab. Please refresh LinkedIn and try again.';
        } else if (result.error.includes('Cannot access')) {
          userFriendlyError = 'Cannot access LinkedIn. Please make sure you are logged in to LinkedIn.';
        }
        
        return { success: false, error: userFriendlyError };
      }
      
      return result;
    } catch (error) {
      console.error('Error posting:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      let userFriendlyError = errorMessage;
      
      if (errorMessage.includes('No tab with id')) {
        userFriendlyError = 'LinkedIn tab was closed. Please keep LinkedIn open while posting.';
      } else if (errorMessage.includes('Extension context invalidated')) {
        userFriendlyError = 'Extension was reloaded. Please refresh this page and try again.';
      } else if (errorMessage.includes('Could not establish connection')) {
        userFriendlyError = 'Extension disconnected. Please check if the extension is enabled in Chrome.';
      }
      
      return { success: false, error: userFriendlyError };
    }
  }, [status.isConnected]);

  // Listen for extension events
  useEffect(() => {
    if (typeof window.LinkedBotExtension === 'undefined') {
      return;
    }

    const handleEvent = (event: string, data: unknown) => {
      console.log('Extension event:', event, data);

      switch (event) {
        case 'postPublished':
          console.log('Post published:', data);
          window.dispatchEvent(new CustomEvent('linkedbot-post-published', { detail: data }));
          break;

        case 'analyticsScraped':
          console.log('Analytics scraped:', data);
          window.dispatchEvent(new CustomEvent('linkedbot-analytics-scraped', { detail: data }));
          break;
      }
    };

    window.LinkedBotExtension.onEvent(handleEvent);
  }, []);

  // Check extension on mount
  useEffect(() => {
    const handleExtensionReady = () => {
      checkExtension();
    };

    if (typeof window.LinkedBotExtension !== 'undefined') {
      checkExtension();
    } else {
      window.addEventListener('linkedbot-extension-ready', handleExtensionReady);
    }

    return () => {
      window.removeEventListener('linkedbot-extension-ready', handleExtensionReady);
    };
  }, [checkExtension]);

  // Auto-connect if was previously connected
  useEffect(() => {
    const wasConnected = localStorage.getItem('extension_connected') === 'true';
    if (wasConnected && status.isInstalled && !status.isConnected) {
      connectExtension().catch(console.error);
    }
  }, [status.isInstalled, status.isConnected, connectExtension]);

  // 🔒 NEW: Set current user in extension (for data isolation)
  const setCurrentUser = useCallback((userId: string) => {
    console.log('🔒 Setting current user in extension:', userId);
    window.postMessage({
      type: 'SET_CURRENT_USER',
      userId: userId
    }, '*');
  }, []);

  // 🔒 NEW: Clear user session on logout
  const clearUserSession = useCallback(() => {
    console.log('🔒 Clearing user session in extension');
    window.postMessage({
      type: 'CLEAR_USER_SESSION'
    }, '*');
  }, []);

  return {
    ...status,
    isLoading,
    connectExtension,
    disconnectExtension,
    sendPendingPosts,
    postNow,
    checkExtension,
    setCurrentUser, // 🔒 NEW
    clearUserSession, // 🔒 NEW
  };
};

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
      // Profile URL method
      saveProfileUrl?: (url: string) => Promise<{ success: boolean; error?: string }>;
      // Profile scraping - navigates to profile URL and extracts data
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
      // Analytics methods
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
