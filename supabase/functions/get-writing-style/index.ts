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

    console.log('🎨 Fetching writing style for user:', userId);

    // Get writing style
    const { data: writingStyle, error: styleError } = await supabase
      .from('user_writing_style')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (styleError) {
      console.error('Writing style fetch error:', styleError);
      throw styleError;
    }

    // Get recent post examples for AI context
    const { data: recentPosts, error: postsError } = await supabase
      .from('linkedin_post_history')
      .select('post_content, views, likes')
      .eq('user_id', userId)
      .order('post_date', { ascending: false })
      .limit(10);

    if (postsError) {
      console.error('Recent posts fetch error:', postsError);
    }

    // Build AI context
    let aiInstructions = "Write in a professional, engaging tone suitable for LinkedIn.";
    
    if (writingStyle) {
      const toneAnalysis = writingStyle.tone_analysis || {};
      
      aiInstructions = `Write in a ${toneAnalysis.tone || 'professional'} tone. `;
      aiInstructions += `Target length: around ${writingStyle.avg_post_length || 150} words. `;
      
      if (writingStyle.emoji_usage) {
        aiInstructions += "Use emojis naturally as the user typically does. ";
      } else {
        aiInstructions += "Avoid using emojis. ";
      }
      
      if (toneAnalysis.usesHashtags && writingStyle.common_topics?.length > 0) {
        aiInstructions += `Include relevant hashtags, commonly: ${writingStyle.common_topics.slice(0, 5).map((t: string) => '#' + t).join(', ')}. `;
      }
    }

    console.log('✅ Writing style fetched');

    return new Response(JSON.stringify({
      success: true,
      writingStyle: writingStyle ? {
        avgPostLength: writingStyle.avg_post_length,
        commonHashtags: writingStyle.common_topics || [],
        tone: writingStyle.tone_analysis?.tone || 'professional',
        usesEmojis: writingStyle.emoji_usage,
        usesHashtags: writingStyle.tone_analysis?.usesHashtags || false,
        avgHashtagsPerPost: writingStyle.tone_analysis?.avgHashtagsPerPost || 0,
        totalPostsAnalyzed: writingStyle.total_posts_analyzed || 0,
      } : null,
      examplePosts: recentPosts || [],
      aiInstructions,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('❌ Writing style fetch error:', error);
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
