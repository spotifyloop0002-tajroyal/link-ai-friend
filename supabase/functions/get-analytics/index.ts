import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('Auth error:', userError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const userId = user.id;

    console.log('📊 Fetching analytics for user:', userId);

    // Get profile analytics from linkedin_analytics table
    const { data: profile, error: profileError } = await supabase
      .from('linkedin_analytics')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (profileError) {
      console.error('Profile fetch error:', profileError);
      throw profileError;
    }

    // v5.0: Fetch analytics from POSTS table (primary source)
    // The extension now updates posts table directly with views_count, likes_count, etc.
    const { data: postsWithAnalytics, error: postsError } = await supabase
      .from('posts')
      .select('id, content, linkedin_post_url, views_count, likes_count, comments_count, shares_count, last_synced_at, posted_at, status')
      .eq('user_id', userId)
      .eq('status', 'posted')
      .not('linkedin_post_url', 'is', null)
      .order('posted_at', { ascending: false })
      .limit(50);

    if (postsError) {
      console.error('Posts fetch error:', postsError);
      throw postsError;
    }

    // Transform posts data to match the expected analytics format
    const posts = (postsWithAnalytics || []).map(post => ({
      id: post.id,
      user_id: userId,
      post_id: post.id,
      content_preview: post.content?.substring(0, 200) || null,
      linkedin_url: post.linkedin_post_url,
      views: post.views_count || 0,
      likes: post.likes_count || 0,
      comments: post.comments_count || 0,
      shares: post.shares_count || 0,
      post_timestamp: post.posted_at,
      scraped_at: post.last_synced_at,
    }));

    // Calculate last sync time from most recent post
    const lastSyncTime = posts.length > 0 && posts[0].scraped_at 
      ? posts[0].scraped_at 
      : profile?.last_synced || null;

    console.log('✅ Analytics fetched:', { profile: !!profile, postsCount: posts.length });

    return new Response(JSON.stringify({
      success: true,
      analytics: {
        profile: profile || null,
        posts: posts
      },
      lastSync: lastSyncTime
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('❌ Analytics fetch error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Failed to fetch analytics' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
