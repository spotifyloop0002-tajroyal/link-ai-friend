// LinkedBot Extension Bridge
// This script allows the Chrome extension to communicate with the React app
// Extension calls these methods → Bridge dispatches events + notifies backend

window.LinkedBotBridge = {
  // Called by extension when post is published successfully
  // CRITICAL: This updates the posts table and triggers UI refresh
  onPostPublished: function(data) {
    console.log('🔗 Bridge: Post published event received', data);
    
    // Dispatch event for React (listened by usePosts + useExtensionEvents)
    window.dispatchEvent(new CustomEvent('linkedbot:post-published', {
      detail: {
        postId: data.postId,
        trackingId: data.trackingId,
        linkedinUrl: data.linkedinUrl,
        postedAt: data.postedAt || new Date().toISOString()
      }
    }));
    
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
    
    // Notify backend of failure
    this.notifyPostFailure(data);
  },
  
  // Notify backend of successful post - updates posts table via sync-post
  notifyPostSuccess: async function(data) {
    try {
      const supabaseUrl = 'https://glrgfnqdzwbpkcsoxsgd.supabase.co';
      const response = await fetch(`${supabaseUrl}/functions/v1/sync-post`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId: data.postId,
          trackingId: data.trackingId,
          userId: data.userId,
          status: 'posted',
          postedAt: data.postedAt || new Date().toISOString(),
          linkedinUrl: data.linkedinUrl
        })
      });
      
      const result = await response.json();
      console.log('🔗 Bridge: Backend sync-post response:', result);
      
      if (!result.success) {
        console.error('🔗 Bridge: Backend error:', result.error);
      }
    } catch (error) {
      console.error('🔗 Bridge: Failed to notify backend:', error);
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
  }
};

console.log('✅ LinkedBot Bridge Ready - v2');
