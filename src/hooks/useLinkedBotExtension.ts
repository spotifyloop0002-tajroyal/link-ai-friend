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
  const sendPendingPosts = useCallback((posts: Post[]) => {
    if (typeof window.LinkedBotExtension === 'undefined' || !status.isConnected) {
      throw new Error('Extension not connected');
    }

    window.LinkedBotExtension.sendPendingPosts(posts);
  }, [status.isConnected]);

  // Post immediately
  const postNow = useCallback(async (post: Post) => {
    if (typeof window.LinkedBotExtension === 'undefined' || !status.isConnected) {
      throw new Error('Extension not connected');
    }

    try {
      const result = await window.LinkedBotExtension.postNow(post);
      return result;
    } catch (error) {
      console.error('Error posting:', error);
      throw error;
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

  return {
    ...status,
    isLoading,
    connectExtension,
    disconnectExtension,
    sendPendingPosts,
    postNow,
    checkExtension,
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
    };
  }
}
