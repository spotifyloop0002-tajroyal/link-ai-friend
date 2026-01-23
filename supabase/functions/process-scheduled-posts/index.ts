import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * DEPRECATED: Scheduling is now handled entirely by the Chrome extension.
 * 
 * This function only performs status checks and cleanup - it does NOT execute posts.
 * The Chrome extension is the single source of truth for scheduling and publishing.
 * 
 * Website responsibilities:
 * - Collect post content, date, time
 * - Save to database
 * - Send payload to Chrome extension
 * 
 * Extension responsibilities:
 * - Store scheduling data locally
 * - Execute posts at exact scheduled time
 * - Send post results back to website
 */

function getCurrentTimeIST(): string {
  return new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    console.log(`[${getCurrentTimeIST()} IST] Post status check (execution handled by extension)...`);

    const now = new Date().toISOString();
    
    // Only check for stale posts that might need attention
    // This is for monitoring only - NOT for execution
    const { data: stalePosts, error: fetchError } = await supabase
      .from('posts')
      .select('id, status, scheduled_time, sent_to_extension_at')
      .eq('status', 'scheduled')
      .lte('scheduled_time', now)
      .order('scheduled_time', { ascending: true })
      .limit(50);

    if (fetchError) {
      console.error('Error fetching posts:', fetchError);
      throw fetchError;
    }

    // Posts that are overdue but never sent to extension - flag them
    const notSentToExtension = (stalePosts || []).filter(
      p => !p.sent_to_extension_at
    );

    // Posts that were sent but are still scheduled (extension may have failed)
    const possiblyStuck = (stalePosts || []).filter(
      p => p.sent_to_extension_at
    );

    console.log(`[${getCurrentTimeIST()} IST] Status check complete:`, {
      totalOverdue: stalePosts?.length || 0,
      notSentToExtension: notSentToExtension.length,
      possiblyStuck: possiblyStuck.length,
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: "Status check only - execution handled by Chrome extension",
        timestamp: new Date().toISOString(),
        timestampIST: getCurrentTimeIST(),
        stats: {
          overduePostsFound: stalePosts?.length || 0,
          notSentToExtension: notSentToExtension.length,
          possiblyStuckInExtension: possiblyStuck.length,
        },
        // These posts may need manual attention
        postsNeedingAttention: notSentToExtension.map(p => ({
          id: p.id,
          scheduledTime: p.scheduled_time,
          issue: "Never sent to extension"
        })),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error(`[${getCurrentTimeIST()} IST] Status check error:`, error);
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
