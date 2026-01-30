import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook to automatically sync user ID to the Chrome extension on every page load.
 * This ensures the extension always knows the authenticated user.
 */
export const useUserIdSync = () => {
  useEffect(() => {
    const syncUserIdToExtension = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          console.log('🔒 Syncing user ID to extension:', user.id);
          
          // Send SET_USER_ID (new v3.0 format)
          window.postMessage({
            type: 'SET_USER_ID',
            userId: user.id
          }, '*');
          
          // Also send legacy formats for backward compatibility
          window.postMessage({
            type: 'SET_CURRENT_USER',
            userId: user.id
          }, '*');
          
          window.postMessage({
            type: 'INITIALIZE_USER',
            userId: user.id,
            email: user.email || null
          }, '*');
          
          console.log('✅ User ID synced to extension');
        }
      } catch (error) {
        console.error('Failed to sync user ID:', error);
      }
    };
    
    // Sync immediately when component mounts
    syncUserIdToExtension();
    
    // Also sync when extension becomes ready
    const handleExtensionReady = () => {
      console.log('🔌 Extension ready - re-syncing user ID');
      syncUserIdToExtension();
    };
    
    // Listen for auth state changes to re-sync
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        console.log('🔒 Auth state changed - syncing user ID');
        syncUserIdToExtension();
      } else if (event === 'SIGNED_OUT') {
        console.log('🔒 User signed out - clearing extension user');
        window.postMessage({ type: 'LOGOUT_USER' }, '*');
        window.postMessage({ type: 'CLEAR_USER_SESSION' }, '*');
      }
    });
    
    window.addEventListener('linkedbot-extension-ready', handleExtensionReady);
    
    return () => {
      window.removeEventListener('linkedbot-extension-ready', handleExtensionReady);
      subscription.unsubscribe();
    };
  }, []);
};
