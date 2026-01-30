// LinkedBot Extension Bridge v3.1
// This script allows the Chrome extension to communicate with the React app
// Extension calls these methods → Bridge dispatches events + notifies backend

// Configuration
const EXTENSION_CONFIG = {
  version: '3.1',
  supabaseUrl: 'https://glrgfnqdzwbpkcsoxsgd.supabase.co',
  // Will be set when extension provides it during connection
  officialExtensionId: null,
};

window.LinkedBotBridge = {
  // Version identifier
  version: EXTENSION_CONFIG.version,

  // Called by extension when post is published successfully
  // CRITICAL: This updates the posts table and triggers UI refresh
  onPostPublished: function(data) {
    console.log('🔗 Bridge: Post published event received', data);
    
    // Dispatch legacy event for React (listened by usePosts + useExtensionEvents)
    window.dispatchEvent(new CustomEvent('linkedbot:post-published', {
      detail: {
        postId: data.postId,
        trackingId: data.trackingId,
        linkedinUrl: data.linkedinUrl,
        postedAt: data.postedAt || new Date().toISOString()
      }
    }));
    
    // Dispatch new postMessage format for enhanced status tracking
    window.postMessage({
      type: 'EXTENSION_EVENT',
      event: 'postSuccess',
      data: {
        postId: data.postId,
        trackingId: data.trackingId,
        linkedinUrl: data.linkedinUrl,
        message: '✅ Posted successfully!'
      }
    }, '*');
    
    // Notify backend to update database
    this.notifyPostSuccess(data);
  },
  
  // Called by extension when post fails
  onPostFailed: function(data) {
    console.log('🔗 Bridge: Post failed event received', data);
    
    window.dispatchEvent(new CustomEvent('linkedbot:post-failed', {
      detail: {
        postId: data.postId,
        trackingId: data.trackingId,
        error: data.error || 'Unknown error'
      }
    }));
    
    // Dispatch new format
    window.postMessage({
      type: 'EXTENSION_EVENT',
      event: 'postFailed',
      data: {
        postId: data.postId,
        trackingId: data.trackingId,
        error: data.error || 'Unknown error',
        message: '❌ ' + (data.error || 'Post failed')
      }
    }, '*');
    
    // Notify backend of failure
    this.notifyPostFailure(data);
  },
  
  // NEW: Called when post is scheduled
  onPostScheduled: function(data) {
    console.log('🔗 Bridge: Post scheduled event received', data);
    
    window.postMessage({
      type: 'EXTENSION_EVENT',
      event: 'postScheduled',
      data: {
        postId: data.postId,
        trackingId: data.trackingId,
        scheduledTime: data.scheduledTime,
        message: `✅ Scheduled for ${new Date(data.scheduledTime).toLocaleString()}`
      }
    }, '*');
  },
  
  // NEW: Called when posting is starting
  onPostStarting: function(data) {
    console.log('🔗 Bridge: Post starting event received', data);
    
    window.postMessage({
      type: 'EXTENSION_EVENT',
      event: 'postStarting',
      data: {
        postId: data.postId,
        trackingId: data.trackingId,
        message: '⏰ Time to post!'
      }
    }, '*');
  },
  
  // NEW: Called when content is being filled
  onPostFilling: function(data) {
    console.log('🔗 Bridge: Post filling event received', data);
    
    window.postMessage({
      type: 'EXTENSION_EVENT',
      event: 'postFilling',
      data: {
        postId: data.postId,
        trackingId: data.trackingId,
        message: '📝 Filling content...'
      }
    }, '*');
  },
  
  // NEW: Called when post button is clicked
  onPostPublishing: function(data) {
    console.log('🔗 Bridge: Post publishing event received', data);
    
    window.postMessage({
      type: 'EXTENSION_EVENT',
      event: 'postPublished',
      data: {
        postId: data.postId,
        trackingId: data.trackingId,
        message: '✅ Posted! Getting URL...'
      }
    }, '*');
  },
  
  // NEW: Called when URL extraction fails but post succeeded
  onPostUrlFailed: function(data) {
    console.log('🔗 Bridge: Post URL extraction failed', data);
    
    window.postMessage({
      type: 'EXTENSION_EVENT',
      event: 'postUrlFailed',
      data: {
        postId: data.postId,
        trackingId: data.trackingId,
        message: '⚠️ Posted but URL not found'
      }
    }, '*');
  },
  
  // NEW: Called when retrying
  onPostRetrying: function(data) {
    console.log('🔗 Bridge: Post retrying event received', data);
    
    window.postMessage({
      type: 'EXTENSION_EVENT',
      event: 'postRetrying',
      data: {
        postId: data.postId,
        trackingId: data.trackingId,
        retryIn: data.retryIn || '5 minutes',
        message: `🔄 Will retry in ${data.retryIn || '5 minutes'}`
      }
    }, '*');
  },
  
  // NEW: Called when queue is updated
  onQueueUpdated: function(data) {
    console.log('🔗 Bridge: Queue updated', data);
    
    window.postMessage({
      type: 'EXTENSION_EVENT',
      event: 'queueUpdated',
      data: {
        queueLength: data.queueLength,
        message: `Queue updated: ${data.queueLength} post(s)`
      }
    }, '*');
  },
  
  // Notify backend of successful post - updates posts table via sync-post
  notifyPostSuccess: async function(data) {
    console.log('🔗 Bridge: notifyPostSuccess called with:', JSON.stringify(data));
    try {
      const payload = {
        postId: data.postId,
        trackingId: data.trackingId,
        userId: data.userId,
        status: 'posted',
        postedAt: data.postedAt || new Date().toISOString(),
        linkedinUrl: data.linkedinUrl
      };
      
      console.log('🔗 Bridge: Sending to sync-post:', JSON.stringify(payload));
      
      const response = await fetch(`${EXTENSION_CONFIG.supabaseUrl}/functions/v1/sync-post`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      console.log('🔗 Bridge: sync-post response status:', response.status);
      
      const result = await response.json();
      console.log('🔗 Bridge: Backend sync-post response:', JSON.stringify(result));
      
      if (!result.success) {
        console.error('🔗 Bridge: Backend error:', result.error);
      } else {
        console.log('✅ Bridge: Post status successfully synced to database');
      }
      
      return result;
    } catch (error) {
      console.error('🔗 Bridge: Failed to notify backend:', error);
      return { success: false, error: error.message };
    }
  },
  
  // Notify backend of failed post
  notifyPostFailure: async function(data) {
    try {
      const response = await fetch(`${EXTENSION_CONFIG.supabaseUrl}/functions/v1/sync-post`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId: data.postId,
          trackingId: data.trackingId,
          userId: data.userId,
          status: 'failed',
          lastError: data.error || 'Unknown error'
        })
      });
      
      const result = await response.json();
      console.log('🔗 Bridge: Backend notified of post failure:', result);
    } catch (error) {
      console.error('🔗 Bridge: Failed to notify backend of failure:', error);
    }
  },

  // Called by extension when analytics are updated
  onAnalyticsUpdated: function(data) {
    console.log('🔗 Bridge: Analytics updated event received', data);
    
    window.dispatchEvent(new CustomEvent('linkedbot:analytics-updated', {
      detail: data
    }));
    
    window.postMessage({
      type: 'EXTENSION_EVENT',
      event: 'analyticsUpdated',
      data: {
        postId: data.postId,
        analytics: data.analytics,
        message: '📊 Analytics updated'
      }
    }, '*');
  },

  // Called by extension when profile is scraped
  onProfileScraped: function(data) {
    console.log('🔗 Bridge: Profile scraped event received', data);
    window.dispatchEvent(new CustomEvent('linkedbot:profile-scraped', {
      detail: data
    }));
  },

  // Called by extension when profile data sync completes
  onProfileDataSynced: function(data) {
    console.log('🔗 Bridge: Profile data synced', data);
    window.dispatchEvent(new CustomEvent('linkedbot:profile-data-synced', {
      detail: data
    }));
  },

  // Called by extension when connection status changes
  onConnectionStatusChanged: function(data) {
    console.log('🔗 Bridge: Connection status changed', data);
    
    window.dispatchEvent(new CustomEvent('linkedbot:connection-changed', {
      detail: data
    }));
    
    window.postMessage({
      type: data.connected ? 'EXTENSION_CONNECTED' : 'EXTENSION_DISCONNECTED',
      version: this.version
    }, '*');
  },

  // Called by extension when there's an error
  onError: function(data) {
    console.error('🔗 Bridge: Error received', data);
    window.dispatchEvent(new CustomEvent('linkedbot:error', {
      detail: data
    }));
  },

  // Request profile scrape from extension
  requestProfileScrape: function(profileUrl) {
    console.log('🔗 Bridge: Requesting profile scrape for', profileUrl);
    window.dispatchEvent(new CustomEvent('linkedbot:request-profile-scrape', {
      detail: { profileUrl }
    }));
  },
  
  // NEW: Called when an alarm fires (for debugging)
  onAlarmFired: function(data) {
    console.log('🔗 Bridge: Alarm fired', data);
    
    window.postMessage({
      type: 'EXTENSION_EVENT',
      event: 'alarmFired',
      data: {
        alarmName: data.alarmName,
        message: `⏰ Alarm: ${data.alarmName}`
      }
    }, '*');
  },
  
  // NEW: Set official extension ID for validation
  setOfficialExtensionId: function(id) {
    EXTENSION_CONFIG.officialExtensionId = id;
    console.log('🔗 Bridge: Official extension ID set:', id);
  },
  
  // NEW: Validate extension ID
  isOfficialExtension: function(id) {
    if (!EXTENSION_CONFIG.officialExtensionId) return true; // Not configured, allow all
    return id === EXTENSION_CONFIG.officialExtensionId;
  },
  
  // NEW: Get bridge version
  getVersion: function() {
    return EXTENSION_CONFIG.version;
  },
  
  // NEW: Set current user for data isolation
  setCurrentUser: function(userId) {
    console.log('🔗 Bridge: Setting current user:', userId);
    
    // Method 1: Dispatch custom event for extension's webapp-content.js to pick up
    window.dispatchEvent(new CustomEvent('linkedbot:user-changed', {
      detail: { userId: userId }
    }));
    
    // Method 2: PostMessage for webapp-content.js message listener
    window.postMessage({
      type: 'SET_CURRENT_USER',
      userId: userId
    }, '*');
    
    return { success: true };
  },
  
  // NEW: Clear user session on logout
  clearUserSession: function() {
    console.log('🔗 Bridge: Clearing user session');
    
    // Method 1: Dispatch custom event
    window.dispatchEvent(new CustomEvent('linkedbot:user-logout', {
      detail: {}
    }));
    
    // Method 2: PostMessage
    window.postMessage({
      type: 'CLEAR_USER_SESSION'
    }, '*');
    
    return { success: true };
  }
};

// Listen for user session management messages from webapp
window.addEventListener('message', (event) => {
  if (event.source !== window) return;
  
  const message = event.data;
  
  // ✅ NEW v3.1.1: SET_AUTH (primary method for auth sync with access token)
  if (message.type === 'SET_AUTH') {
    console.log('🔑 Bridge v3.1.1: Setting auth:', message.userId);
    
    // Dispatch event for extension to save both userId and accessToken
    window.dispatchEvent(new CustomEvent('linkedbot:set-auth', {
      detail: { 
        userId: message.userId,
        accessToken: message.accessToken
      }
    }));
    
    // Also dispatch legacy events for backwards compatibility
    window.dispatchEvent(new CustomEvent('linkedbot:set-user-id', {
      detail: { userId: message.userId }
    }));
    
    window.dispatchEvent(new CustomEvent('linkedbot:user-changed', {
      detail: { userId: message.userId }
    }));
    
    window.dispatchEvent(new CustomEvent('linkedbot:user-initialized', {
      detail: { userId: message.userId }
    }));
    
    window.postMessage({
      type: 'AUTH_SET',
      success: true,
      userId: message.userId
    }, '*');
    
    console.log('✅ Auth dispatched to extension');
  }
  
  // ✅ SET_USER_ID (legacy method for user sync)
  if (message.type === 'SET_USER_ID') {
    console.log('🔒 Bridge v3.0: Setting user ID:', message.userId);
    
    // Dispatch event for extension to save user ID
    window.dispatchEvent(new CustomEvent('linkedbot:set-user-id', {
      detail: { userId: message.userId }
    }));
    
    // Also dispatch legacy events for backwards compatibility
    window.dispatchEvent(new CustomEvent('linkedbot:user-changed', {
      detail: { userId: message.userId }
    }));
    
    window.dispatchEvent(new CustomEvent('linkedbot:user-initialized', {
      detail: { userId: message.userId }
    }));
    
    window.postMessage({
      type: 'USER_ID_SET',
      success: true,
      userId: message.userId
    }, '*');
  }
  
  // ✅ NEW v3.0: POST_NOW (immediate post request)
  if (message.type === 'POST_NOW') {
    console.log('📤 Bridge v3.0: POST_NOW request received', message.post);
    
    // Dispatch event for extension to handle posting
    window.dispatchEvent(new CustomEvent('linkedbot:post-now', {
      detail: message.post
    }));
  }
  
  // ✅ NEW v3.2: SCHEDULE_POSTS (schedule multiple posts with userId)
  if (message.type === 'SCHEDULE_POSTS') {
    console.log('📅 Bridge v3.2: SCHEDULE_POSTS request received', message.posts?.length, 'posts');
    
    // Ensure userId is included in each post for ownership verification
    const postsWithUserId = (message.posts || []).map(post => ({
      ...post,
      userId: post.userId || post.user_id,
      user_id: post.user_id || post.userId,
    }));
    
    // Dispatch event for extension to handle scheduling
    window.dispatchEvent(new CustomEvent('linkedbot:schedule-posts', {
      detail: { posts: postsWithUserId }
    }));
  }
  
  // ✅ NEW v3.0: SCRAPE_ANALYTICS (request analytics for a post)
  if (message.type === 'SCRAPE_ANALYTICS') {
    console.log('📊 Bridge v3.0: SCRAPE_ANALYTICS request', message.url, message.postId);
    
    // Dispatch event for extension to scrape analytics
    window.dispatchEvent(new CustomEvent('linkedbot:scrape-analytics', {
      detail: { 
        url: message.url, 
        postId: message.postId 
      }
    }));
  }
  
  // ✅ NEW v3.0: Handle POST_RESULT from extension
  if (message.type === 'POST_RESULT') {
    console.log('📤 Bridge v3.0: POST_RESULT received', message);
    
    if (message.success && message.data?.linkedinUrl) {
      // Call the existing onPostPublished handler
      window.LinkedBotBridge.onPostPublished({
        postId: message.data.postId,
        trackingId: message.data.trackingId,
        linkedinUrl: message.data.linkedinUrl,
        postedAt: message.data.postedAt || new Date().toISOString()
      });
    } else if (!message.success) {
      // Call the existing onPostFailed handler
      window.LinkedBotBridge.onPostFailed({
        postId: message.data?.postId,
        trackingId: message.data?.trackingId,
        error: message.data?.error || 'Unknown error'
      });
    }
  }
  
  // ✅ NEW v3.0: Handle ANALYTICS_RESULT from extension
  if (message.type === 'ANALYTICS_RESULT') {
    console.log('📊 Bridge v3.0: ANALYTICS_RESULT received', message);
    
    // This is handled directly by the analytics-cron.ts listener
    // The postMessage is already being propagated through window
  }
  
  // Legacy: SET_CURRENT_USER (backwards compatible)
  if (message.type === 'SET_CURRENT_USER') {
    console.log('👤 Bridge: Setting current user in extension:', message.userId);
    
    // Dispatch event for extension to pick up
    window.dispatchEvent(new CustomEvent('linkedbot:user-changed', {
      detail: { userId: message.userId }
    }));
    
    window.postMessage({
      type: 'USER_SESSION_SET',
      success: true,
      userId: message.userId
    }, '*');
  }
  
  // INITIALIZE_USER (improved auth flow)
  if (message.type === 'INITIALIZE_USER') {
    console.log('🔒 Bridge: Initializing user in extension:', message.userId);
    
    // Dispatch detailed initialization event for extension
    window.dispatchEvent(new CustomEvent('linkedbot:user-initialized', {
      detail: { 
        userId: message.userId,
        email: message.email
      }
    }));
    
    // Also dispatch legacy event for backwards compatibility
    window.dispatchEvent(new CustomEvent('linkedbot:user-changed', {
      detail: { userId: message.userId }
    }));
    
    window.postMessage({
      type: 'USER_INITIALIZED',
      success: true,
      userId: message.userId
    }, '*');
  }
  
  // Legacy: CLEAR_USER_SESSION (backwards compatible)
  if (message.type === 'CLEAR_USER_SESSION') {
    console.log('🧹 Bridge: Clearing user session in extension');
    
    // Dispatch event for extension to pick up
    window.dispatchEvent(new CustomEvent('linkedbot:user-logout', {
      detail: {}
    }));
    
    window.postMessage({
      type: 'USER_SESSION_CLEARED',
      success: true
    }, '*');
  }
  
  // LOGOUT_USER (improved auth flow)
  if (message.type === 'LOGOUT_USER') {
    console.log('🔒 Bridge: Logging out user from extension');
    
    // Dispatch detailed logout event for extension
    window.dispatchEvent(new CustomEvent('linkedbot:user-logged-out', {
      detail: {}
    }));
    
    // Also dispatch legacy event for backwards compatibility
    window.dispatchEvent(new CustomEvent('linkedbot:user-logout', {
      detail: {}
    }));
    
    window.postMessage({
      type: 'USER_LOGGED_OUT',
      success: true
    }, '*');
  }
  
  // CHECK_USER_AUTH (for debugging)
  if (message.type === 'CHECK_USER_AUTH') {
    console.log('🔍 Bridge: Checking user auth status');
    
    window.dispatchEvent(new CustomEvent('linkedbot:check-auth', {
      detail: {}
    }));
  }
});

console.log('✅ LinkedBot Bridge Ready - v' + EXTENSION_CONFIG.version);
