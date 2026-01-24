import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface PostSuccessPayload {
  postId?: string;
  trackingId?: string;
  userId: string;
  postedAt: string;
  linkedinUrl?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
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
    const payload: PostSuccessPayload = await req.json();
    const { postId, trackingId, userId, postedAt, linkedinUrl } = payload;

    // Validate required fields
    if (!userId) {
      return new Response(JSON.stringify({ error: 'userId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!postId && !trackingId) {
      return new Response(JSON.stringify({ error: 'postId or trackingId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Build update query
    let query = supabase.from('posts').update({
      status: 'posted',
      posted_at: postedAt || new Date().toISOString(),
      linkedin_post_url: linkedinUrl || null,
      updated_at: new Date().toISOString(),
    });

    // Match by postId or trackingId
    if (postId) {
      query = query.eq('id', postId);
    } else if (trackingId) {
      query = query.eq('tracking_id', trackingId);
    }

    // Ensure user owns the post
    query = query.eq('user_id', userId);

    const { data: updatedPost, error: updateError } = await query.select().single();

    if (updateError) {
      console.error('Post update error:', updateError);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Failed to update post status' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Increment daily post count
    const { error: rpcError } = await supabase.rpc('increment_daily_post_count', { 
      p_user_id: userId 
    });
    
    if (rpcError) {
      console.error('RPC increment error:', rpcError);
    }

    // Update user profile posts_published_count
    const { data: currentProfile } = await supabase
      .from('user_profiles')
      .select('posts_published_count')
      .eq('user_id', userId)
      .single();
    
    if (currentProfile) {
      await supabase
        .from('user_profiles')
        .update({ 
          posts_published_count: (currentProfile.posts_published_count || 0) + 1,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);
    }

    // Create success notification
    await supabase.from('notifications').insert({
      user_id: userId,
      title: 'Post Published ✅',
      message: 'Your LinkedIn post has been published successfully!',
      type: 'post',
    });

    console.log('Post marked as published:', updatedPost?.id || trackingId);

    return new Response(JSON.stringify({ 
      success: true, 
      post: updatedPost 
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Post success error:', error);
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
