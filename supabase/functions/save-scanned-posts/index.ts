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
    const { posts, writingStyle } = await req.json();

    console.log('📝 Saving scanned posts for user:', userId);
    console.log('Posts count:', posts?.length || 0);
    console.log('Writing style:', writingStyle);

    const scrapedAt = new Date().toISOString();

    // Save post history for AI context
    if (posts && posts.length > 0) {
      for (const post of posts) {
        if (!post.content) continue;
        
        const { error } = await supabase
          .from('linkedin_post_history')
          .insert({
            user_id: userId,
            post_content: post.content,
            post_date: post.timestamp || post.postDate || null,
            views: post.views || 0,
            likes: post.likes || 0,
            comments: post.comments || 0,
            shares: post.reposts || post.shares || 0,
            linkedin_url: post.postUrl || post.linkedinUrl || null,
            scraped_at: scrapedAt,
          });

        if (error) {
          console.error('Post history save error:', error);
        }
      }
    }

    // Save writing style analysis
    if (writingStyle) {
      const { error: styleError } = await supabase
        .from('user_writing_style')
        .upsert({
          user_id: userId,
          avg_post_length: writingStyle.avgPostLength || 0,
          common_topics: writingStyle.commonHashtags || writingStyle.commonTopics || [],
          tone_analysis: {
            tone: writingStyle.tone || 'professional',
            usesEmojis: writingStyle.usesEmojis || false,
            usesHashtags: writingStyle.usesHashtags || false,
            avgHashtagsPerPost: writingStyle.avgHashtagsPerPost || 0,
            totalPostsAnalyzed: posts?.length || 0,
          },
          emoji_usage: writingStyle.usesEmojis || false,
          hashtag_style: writingStyle.commonHashtags?.join(',') || '',
          total_posts_analyzed: posts?.length || 0,
          updated_at: scrapedAt,
        }, {
          onConflict: 'user_id'
        });

      if (styleError) {
        console.error('Writing style save error:', styleError);
        throw styleError;
      }
    }

    console.log('✅ Scanned posts saved successfully');

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('❌ Scanned posts save error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ 
      success: false, 
      error: errorMessage 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
