// LinkedBot Extension Bridge v3
// This script allows the Chrome extension to communicate with the React app
// Extension calls these methods → Bridge dispatches events + notifies backend

window.LinkedBotBridge = {
  // Version identifier
  version: '3.0',

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
      const supabaseUrl = 'https://glrgfnqdzwbpkcsoxsgd.supabase.co';
      const payload = {
        postId: data.postId,
        trackingId: data.trackingId,
        userId: data.userId,
        status: 'posted',
        postedAt: data.postedAt || new Date().toISOString(),
        linkedinUrl: data.linkedinUrl
      };
      
      console.log('🔗 Bridge: Sending to sync-post:', JSON.stringify(payload));
      
      const response = await fetch(`${supabaseUrl}/functions/v1/sync-post`, {
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
      const supabaseUrl = 'https://glrgfnqdzwbpkcsoxsgd.supabase.co';
      const response = await fetch(`${supabaseUrl}/functions/v1/sync-post`, {
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
  }
};

console.log('✅ LinkedBot Bridge Ready - v3');
