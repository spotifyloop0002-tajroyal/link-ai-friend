import { supabase } from '@/integrations/supabase/client';

// ============================================================================
// SCRAPE ALL POST ANALYTICS
// ============================================================================

export async function scrapeAllPostAnalytics() {
  console.log('📊 Starting analytics scraping cron job');
  
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.log('📊 No authenticated user - skipping analytics scrape');
      return;
    }

    // Get all posts from last 30 days that have LinkedIn URLs
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const { data: posts, error } = await supabase
      .from('posts')
      .select('*')
      .eq('user_id', user.id)
      .not('linkedin_post_url', 'is', null)
      .gte('created_at', thirtyDaysAgo.toISOString())
      .eq('status', 'posted');
    
    if (error) {
      console.error('Failed to fetch posts:', error);
      return;
    }
    
    if (!posts || posts.length === 0) {
      console.log('📊 No posts with LinkedIn URLs to scrape');
      return;
    }
    
    console.log(`📊 Scraping analytics for ${posts.length} posts`);
    
    // Process each post
    for (const post of posts) {
      try {
        const result = await scrapePostAnalytics(post.linkedin_post_url!, post.id);
        
        if (result.success && result.analytics) {
          // Update database with new analytics
          const { error: updateError } = await supabase
            .from('posts')
            .update({
              views_count: result.analytics.views,
              likes_count: result.analytics.likes,
              comments_count: result.analytics.comments,
              shares_count: result.analytics.reposts,
              last_synced_at: new Date().toISOString()
            })
            .eq('id', post.id);
          
          if (updateError) {
            console.error(`Failed to update post ${post.id}:`, updateError);
          } else {
            console.log(`✅ Analytics updated for post ${post.id}`);
          }
        }
        
        // Wait 5 seconds between posts to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 5000));
        
      } catch (error) {
        console.error(`❌ Failed to scrape post ${post.id}:`, error);
      }
    }
    
    console.log('✅ Analytics scraping complete');
    
  } catch (error) {
    console.error('❌ Analytics cron job failed:', error);
  }
}

// ============================================================================
// SCRAPE SINGLE POST ANALYTICS
// ============================================================================

interface AnalyticsResult {
  success: boolean;
  analytics?: {
    views: number;
    likes: number;
    comments: number;
    reposts: number;
  };
  error?: string;
}

async function scrapePostAnalytics(linkedinUrl: string, postId: string): Promise<AnalyticsResult> {
  return new Promise<AnalyticsResult>((resolve) => {
    console.log('📊 Requesting analytics for:', linkedinUrl);
    
    // Send message to extension
    window.postMessage({
      type: 'SCRAPE_ANALYTICS',
      url: linkedinUrl,
      postId: postId
    }, '*');
    
    // Listen for response
    const handleResponse = (event: MessageEvent) => {
      if (event.data.type === 'ANALYTICS_RESULT' && event.data.postId === postId) {
        window.removeEventListener('message', handleResponse);
        
        if (event.data.success) {
          resolve({
            success: true,
            analytics: event.data.data?.analytics
          });
        } else {
          resolve({
            success: false,
            error: event.data.data?.error || 'Failed to scrape'
          });
        }
      }
    };
    
    window.addEventListener('message', handleResponse);
    
    // Timeout after 60 seconds
    setTimeout(() => {
      window.removeEventListener('message', handleResponse);
      resolve({ 
        success: false, 
        error: 'Timeout waiting for analytics' 
      });
    }, 60000);
  });
}

// ============================================================================
// START CRON JOB
// ============================================================================

let cronInterval: ReturnType<typeof setInterval> | null = null;

// Run every 2 hours
export function startAnalyticsCron() {
  // Prevent multiple intervals
  if (cronInterval) {
    console.log('⏰ Analytics cron already running');
    return;
  }

  console.log('⏰ Starting analytics cron job (every 2 hours)');
  
  // Run after a short delay to allow user auth to complete
  setTimeout(() => {
    scrapeAllPostAnalytics();
  }, 10000); // 10 second initial delay
  
  // Then run every 2 hours
  cronInterval = setInterval(() => {
    scrapeAllPostAnalytics();
  }, 2 * 60 * 60 * 1000); // 2 hours in milliseconds
}

export function stopAnalyticsCron() {
  if (cronInterval) {
    clearInterval(cronInterval);
    cronInterval = null;
    console.log('⏰ Analytics cron stopped');
  }
}
