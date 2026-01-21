import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_RETRIES = 3;
const RETRY_DELAY_MINUTES = [5, 15, 30]; // Exponential backoff

interface ScheduledPost {
  id: string;
  content: string;
  photo_url: string | null;
  scheduled_time: string;
  user_id: string;
  status: string;
  retry_count: number;
}

/**
 * Get current time in IST for logging
 */
function getCurrentTimeIST(): string {
  return new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
}

/**
 * Calculate next retry time with exponential backoff
 */
function calculateNextRetryTime(retryCount: number): string {
  const delayMinutes = RETRY_DELAY_MINUTES[retryCount] || 60;
  const nextRetry = new Date();
  nextRetry.setMinutes(nextRetry.getMinutes() + delayMinutes);
  return nextRetry.toISOString();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    console.log(`[${getCurrentTimeIST()} IST] Processing scheduled posts...`);

    // Get all posts that are due for posting
    const now = new Date().toISOString();
    
    // 1. Get scheduled posts that are due
    const { data: duePosts, error: fetchError } = await supabase
      .from('posts')
      .select('*')
      .eq('status', 'scheduled')
      .lte('scheduled_time', now)
      .order('scheduled_time', { ascending: true })
      .limit(10);

    if (fetchError) {
      console.error('Error fetching scheduled posts:', fetchError);
      throw fetchError;
    }

    // 2. Get failed posts that are ready for retry
    const { data: retryPosts, error: retryError } = await supabase
      .from('posts')
      .select('*')
      .eq('status', 'failed')
      .lt('retry_count', MAX_RETRIES)
      .lte('next_retry_at', now)
      .order('next_retry_at', { ascending: true })
      .limit(5);

    if (retryError) {
      console.error('Error fetching retry posts:', retryError);
    }

    const allPosts = [...(duePosts || []), ...(retryPosts || [])];
    
    console.log(`[${getCurrentTimeIST()} IST] Found ${allPosts.length} posts to process`);

    const results = {
      processed: 0,
      pending: 0,
      failed: 0,
      maxRetriesReached: 0,
      posts: [] as { id: string; status: string; error?: string }[],
    };

    for (const post of allPosts) {
      console.log(`[${getCurrentTimeIST()} IST] Processing post ${post.id}...`);
      
      try {
        // Mark post as pending (being processed)
        await supabase
          .from('posts')
          .update({ 
            status: 'pending',
            updated_at: new Date().toISOString()
          })
          .eq('id', post.id);

        results.pending++;

        // NOTE: The actual posting is done by the browser extension
        // This function marks posts as ready for the extension to pick up
        // In a real implementation, you would trigger the extension here
        
        // For now, we'll mark posts as ready for the extension
        // The extension polls for 'pending' posts and processes them

        results.posts.push({
          id: post.id,
          status: 'pending',
        });

        console.log(`[${getCurrentTimeIST()} IST] Post ${post.id} marked as pending for extension`);

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const currentRetryCount = (post.retry_count || 0) + 1;

        console.error(`[${getCurrentTimeIST()} IST] Error processing post ${post.id}:`, errorMessage);

        if (currentRetryCount >= MAX_RETRIES) {
          // Max retries reached - mark as permanently failed
          await supabase
            .from('posts')
            .update({
              status: 'failed',
              last_error: `Max retries (${MAX_RETRIES}) reached. Last error: ${errorMessage}`,
              retry_count: currentRetryCount,
              updated_at: new Date().toISOString()
            })
            .eq('id', post.id);

          results.maxRetriesReached++;
          results.posts.push({
            id: post.id,
            status: 'failed_permanently',
            error: errorMessage,
          });
        } else {
          // Schedule for retry
          const nextRetryAt = calculateNextRetryTime(currentRetryCount);
          
          await supabase
            .from('posts')
            .update({
              status: 'failed',
              last_error: errorMessage,
              retry_count: currentRetryCount,
              next_retry_at: nextRetryAt,
              updated_at: new Date().toISOString()
            })
            .eq('id', post.id);

          results.failed++;
          results.posts.push({
            id: post.id,
            status: 'retry_scheduled',
            error: `Retry ${currentRetryCount}/${MAX_RETRIES} at ${new Date(nextRetryAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST`,
          });
        }
      }
    }

    results.processed = allPosts.length;

    console.log(`[${getCurrentTimeIST()} IST] Processing complete:`, results);

    return new Response(
      JSON.stringify({
        success: true,
        timestamp: new Date().toISOString(),
        timestampIST: getCurrentTimeIST(),
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error(`[${getCurrentTimeIST()} IST] Process scheduled posts error:`, error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        timestampIST: getCurrentTimeIST(),
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
