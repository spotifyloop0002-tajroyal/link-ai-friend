import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const { trackingId, postId, analytics } = await req.json();

    if (!trackingId && !postId) {
      return new Response(JSON.stringify({ error: 'trackingId or postId required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Find post
    let query;
    if (trackingId) {
      query = supabase.from('posts').select('id, user_id, agent_id').eq('tracking_id', trackingId).single();
    } else {
      query = supabase.from('posts').select('id, user_id, agent_id').eq('id', postId).single();
    }

    const { data: post, error: postError } = await query;

    if (postError || !post) {
      console.error('Post not found:', postError);
      return new Response(JSON.stringify({ error: 'Post not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Sanitize values - extension sometimes sends values * 1,000,000
    const sanitize = (v: number) => v >= 1_000_000 ? Math.round(v / 1_000_000) : v;
    
    const views = sanitize(analytics.views || analytics.reach || 0);
    const likes = sanitize(analytics.likes || 0);
    const comments = sanitize(analytics.comments || 0);
    const shares = sanitize(analytics.shares || analytics.reposts || 0);

    // Update post with analytics
    await supabase.from('posts').update({
      views_count: views,
      likes_count: likes,
      comments_count: comments,
      shares_count: shares,
      last_synced_at: new Date().toISOString(),
    }).eq('id', post.id);

    // Upsert to post_analytics table
    const { error: analyticsError } = await supabase
      .from('post_analytics')
      .upsert({
        post_id: post.id,
        user_id: post.user_id,
        linkedin_url: analytics.postLink || analytics.linkedinUrl,
        views: views,
        likes: likes,
        comments: comments,
        shares: shares,
        scraped_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'post_id',
        ignoreDuplicates: false,
      });

    if (analyticsError) {
      console.error('Analytics upsert error:', analyticsError);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Sync analytics error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
