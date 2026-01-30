import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook to automatically sync user authentication (userId + accessToken) to the Chrome extension.
 * This ensures the extension always has valid credentials for authenticated API calls.
 * 
 * Extension v3.1.1+ requires SET_AUTH with both userId and accessToken.
 */
export const useUserIdSync = () => {
  useEffect(() => {
    console.log('🔌 Setting up extension auth sync...');
    
    const syncAuthToExtension = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user && session.access_token) {
          console.log('📤 Sending auth to extension:', session.user.id);
          
          // ✅ NEW v3.1.1: Send SET_AUTH with both userId and accessToken
          window.postMessage({
            type: 'SET_AUTH',
            userId: session.user.id,
            accessToken: session.access_token
          }, '*');
          
          // Also send legacy formats for backward compatibility with older extensions
          window.postMessage({
            type: 'SET_USER_ID',
            userId: session.user.id
          }, '*');
          
          window.postMessage({
            type: 'SET_CURRENT_USER',
            userId: session.user.id
          }, '*');
          
          window.postMessage({
            type: 'INITIALIZE_USER',
            userId: session.user.id,
            email: session.user.email || null
          }, '*');
          
          console.log('✅ Auth sent to extension');
        } else {
          console.log('⚠️ No active session to sync');
        }
      } catch (error) {
        console.error('❌ Failed to sync auth:', error);
      }
    };
    
    // Sync immediately when component mounts
    syncAuthToExtension();
    
    // Also sync when extension becomes ready
    const handleExtensionReady = () => {
      console.log('🔌 Extension ready - re-syncing auth');
      syncAuthToExtension();
    };
    
    // Listen for auth state changes to re-sync
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('🔐 Auth event:', event);
      
      if (event === 'SIGNED_IN' && session?.user && session.access_token) {
        console.log('📤 Sending auth to extension (on login):', session.user.id);
        
        window.postMessage({
          type: 'SET_AUTH',
          userId: session.user.id,
          accessToken: session.access_token
        }, '*');
        
        // Legacy formats
        window.postMessage({
          type: 'SET_USER_ID',
          userId: session.user.id
        }, '*');
        
        window.postMessage({
          type: 'SET_CURRENT_USER',
          userId: session.user.id
        }, '*');
        
        window.postMessage({
          type: 'INITIALIZE_USER',
          userId: session.user.id,
          email: session.user.email || null
        }, '*');
        
        console.log('✅ Auth synced on login');
      } else if (event === 'TOKEN_REFRESHED' && session?.user && session.access_token) {
        console.log('🔄 Token refreshed - updating extension');
        
        window.postMessage({
          type: 'SET_AUTH',
          userId: session.user.id,
          accessToken: session.access_token
        }, '*');
        
        console.log('✅ Auth refreshed in extension');
      } else if (event === 'SIGNED_OUT') {
        console.log('🔒 User signed out - clearing extension auth');
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
