import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook to sync Supabase SESSION to Chrome extension.
 * 
 * ARCHITECTURE:
 * - Website sends SUPABASE_SESSION (full session object) to extension
 * - Extension uses this for authenticated Supabase calls
 * - This is ONLY for auth sharing, NOT for posting
 * 
 * Message type: SUPABASE_SESSION
 */
export const useExtensionAuth = () => {
  
  const syncSessionToExtension = useCallback(async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('❌ Failed to get session:', error);
        return;
      }
      
      if (session?.user && session.access_token) {
        console.log('📤 Syncing session to extension:', session.user.id);
        
        // Store in window object for extension to read
        if (typeof window !== 'undefined') {
          // Set directly on window - don't call setAuth function
          // The extension-bridge.js may not have loaded yet
          const existingAuth = (window as any).LinkedBotAuth || {};
          (window as any).LinkedBotAuth = {
            ...existingAuth,
            userId: session.user.id,
            accessToken: session.access_token,
            refreshToken: session.refresh_token,
            // Preserve the functions if they exist
            setAuth: existingAuth.setAuth,
            getAuth: existingAuth.getAuth,
            clearAuth: existingAuth.clearAuth
          };
          
          // Store in localStorage as backup
          localStorage.setItem('linkedbot_user_id', session.user.id);
          localStorage.setItem('linkedbot_access_token', session.access_token);
        }
        
        // ✅ PRIMARY: Send full SUPABASE_SESSION to extension
        window.postMessage({
          type: 'SUPABASE_SESSION',
          session: {
            user: {
              id: session.user.id,
              email: session.user.email
            },
            access_token: session.access_token,
            refresh_token: session.refresh_token,
            expires_at: session.expires_at
          }
        }, '*');
        
        // Also send legacy formats for backward compatibility
        window.postMessage({
          type: 'SET_AUTH',
          userId: session.user.id,
          accessToken: session.access_token
        }, '*');
        
        // Dispatch custom event for extension content script
        window.dispatchEvent(new CustomEvent('linkedbot:session-ready', {
          detail: {
            userId: session.user.id,
            accessToken: session.access_token
          }
        }));
        
        console.log('✅ Session synced to extension');
      } else {
        console.log('⚠️ No active session to sync');
        
        // Clear extension auth on logout
        window.postMessage({ type: 'LOGOUT_USER' }, '*');
        localStorage.removeItem('linkedbot_user_id');
        localStorage.removeItem('linkedbot_access_token');
      }
    } catch (error) {
      console.error('❌ Failed to sync session:', error);
    }
  }, []);
  
  useEffect(() => {
    console.log('🔌 Setting up extension session sync...');
    
    // Sync immediately on mount
    syncSessionToExtension();
    
    // Retry after delays (extension content script may load late)
    const retry1 = setTimeout(syncSessionToExtension, 1000);
    const retry2 = setTimeout(syncSessionToExtension, 3000);
    
    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('🔐 Auth event:', event);
      
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        syncSessionToExtension();
      } else if (event === 'SIGNED_OUT') {
        console.log('🔒 User signed out - clearing extension auth');
        window.postMessage({ type: 'LOGOUT_USER' }, '*');
        window.postMessage({ type: 'CLEAR_USER_SESSION' }, '*');
        localStorage.removeItem('linkedbot_user_id');
        localStorage.removeItem('linkedbot_access_token');
      }
    });
    
    // Listen for extension ready event
    const handleExtensionReady = () => {
      console.log('🔌 Extension ready - syncing session');
      syncSessionToExtension();
    };
    
    window.addEventListener('linkedbot-extension-ready', handleExtensionReady);
    
    return () => {
      clearTimeout(retry1);
      clearTimeout(retry2);
      window.removeEventListener('linkedbot-extension-ready', handleExtensionReady);
      subscription.unsubscribe();
    };
  }, [syncSessionToExtension]);
  
  return {
    syncSessionToExtension
  };
};
