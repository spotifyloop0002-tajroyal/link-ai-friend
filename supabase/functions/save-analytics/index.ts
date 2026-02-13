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
    const { profile, posts, scrapedAt } = await req.json();

    console.log('📊 Saving analytics for user:', userId);
    console.log('Profile:', profile);
    console.log('Posts count:', posts?.length || 0);

    // Upsert profile analytics
    const { error: profileError } = await supabase
      .from('linkedin_analytics')
      .upsert({
        user_id: userId,
        username: profile?.username || null,
        profile_url: profile?.profileUrl || null,
        followers_count: profile?.followersCount || 0,
        connections_count: profile?.connectionsCount || 0,
        total_posts: posts?.length || 0,
        last_synced: scrapedAt || new Date().toISOString(),
      }, {
        onConflict: 'user_id'
      });

    if (profileError) {
      console.error('Profile save error:', profileError);
      throw profileError;
    }

    // Save post analytics
    if (posts && posts.length > 0) {
      // Sanitize values - extension sometimes sends values * 1,000,000
      const sanitize = (v: number) => v >= 1_000_000 ? Math.round(v / 1_000_000) : v;
      
      for (const post of posts) {
        const { error: postError } = await supabase
          .from('post_analytics')
          .upsert({
            user_id: userId,
            post_id: post.postId || post.id || `post_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            content_preview: post.content?.substring(0, 200) || null,
            linkedin_url: post.linkedinUrl || post.url || null,
            views: sanitize(post.views || 0),
            likes: sanitize(post.likes || 0),
            comments: sanitize(post.comments || 0),
            shares: sanitize(post.reposts || post.shares || 0),
            post_timestamp: post.timestamp || post.postDate || null,
            scraped_at: scrapedAt || new Date().toISOString(),
          }, {
            onConflict: 'user_id,post_id'
          });

        if (postError) {
          console.error('Post save error:', postError);
        }
      }
    }

    console.log('✅ Analytics saved successfully');

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('❌ Analytics save error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Failed to save analytics' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
