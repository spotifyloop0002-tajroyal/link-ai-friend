import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface SyncPostPayload {
  trackingId?: string;
  postId?: string;
  userId?: string;
  linkedinUrl?: string;
  status?: 'posted' | 'failed' | 'scheduled';
  postedAt?: string;
  lastError?: string;
}

Deno.serve(async (req) => {
  console.log('=== sync-post called ===');
  console.log('Method:', req.method);
  
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
    const payload: SyncPostPayload = await req.json();
    console.log('Payload received:', JSON.stringify(payload));
    
    const { trackingId, postId, userId, linkedinUrl, status, postedAt, lastError } = payload;

    if (!trackingId && !postId) {
      console.error('Missing trackingId or postId');
      return new Response(JSON.stringify({ error: 'trackingId or postId required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase credentials');
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Build update data based on status
    const newStatus = status || 'posted';
    const updateData: Record<string, unknown> = {
      status: newStatus,
      updated_at: new Date().toISOString(),
    };

    // Always set posted_at and linkedin_post_url for posted status
    if (newStatus === 'posted') {
      updateData.posted_at = postedAt || new Date().toISOString();
      // Only set linkedin_post_url if provided (could be null if URL extraction failed)
      if (linkedinUrl) {
        updateData.linkedin_post_url = linkedinUrl;
      }
    }

    if (newStatus === 'failed') {
      updateData.last_error = lastError || 'Unknown error';
      updateData.retry_count = 1;
    }

    console.log('Update data:', JSON.stringify(updateData));

    // First, try to find the post to confirm it exists
    let findQuery = supabase.from('posts').select('id, user_id, status');
    
    if (postId) {
      findQuery = findQuery.eq('id', postId);
    } else if (trackingId) {
      findQuery = findQuery.eq('tracking_id', trackingId);
    }

    const { data: existingPost, error: findError } = await findQuery.maybeSingle();
    
    if (findError) {
      console.error('Error finding post:', findError);
      return new Response(JSON.stringify({ success: false, error: 'Error finding post' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!existingPost) {
      console.error('Post not found with postId:', postId, 'or trackingId:', trackingId);
      return new Response(JSON.stringify({ success: false, error: 'Post not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Found post:', JSON.stringify(existingPost));

    // Now update the post
    let updateQuery = supabase.from('posts').update(updateData);

    if (postId) {
      updateQuery = updateQuery.eq('id', postId);
    } else if (trackingId) {
      updateQuery = updateQuery.eq('tracking_id', trackingId);
    }

    const { error: postError, data: updatedPost } = await updateQuery.select().single();

    if (postError) {
      console.error('Post update error:', postError);
      return new Response(JSON.stringify({ success: false, error: postError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Post updated successfully:', JSON.stringify(updatedPost));

    // Use the userId from the found post if not provided
    const effectiveUserId = userId || existingPost.user_id;

    // Only increment counts and create notification for successful posts
    if (effectiveUserId && newStatus === 'posted') {
      console.log('Incrementing post counts for user:', effectiveUserId);
      
      // Increment daily post count
      const { error: rpcError } = await supabase.rpc('increment_daily_post_count', { 
        p_user_id: effectiveUserId 
      });
      if (rpcError) {
        console.error('RPC error:', rpcError);
      }

      // Create success notification
      const { error: notifError } = await supabase.from('notifications').insert({
        user_id: effectiveUserId,
        title: 'Post Published ✅',
        message: linkedinUrl 
          ? 'Your LinkedIn post has been published successfully.' 
          : 'Your LinkedIn post has been published (URL not captured).',
        type: 'post',
      });
      if (notifError) {
        console.error('Notification error:', notifError);
      }

      // Update user profile posts_published_count
      const { data: currentProfile } = await supabase
        .from('user_profiles')
        .select('posts_published_count')
        .eq('user_id', effectiveUserId)
        .maybeSingle();
      
      if (currentProfile) {
        await supabase
          .from('user_profiles')
          .update({ posts_published_count: (currentProfile.posts_published_count || 0) + 1 })
          .eq('user_id', effectiveUserId);
      }
    }

    // Create failure notification
    if (effectiveUserId && newStatus === 'failed') {
      await supabase.from('notifications').insert({
        user_id: effectiveUserId,
        title: 'Post Failed ❌',
        message: lastError || 'Failed to publish your post. Please try again.',
        type: 'post',
      });
    }

    console.log(`✅ Post ${postId || trackingId} status updated to: ${newStatus}`);

    return new Response(JSON.stringify({ 
      success: true, 
      post: updatedPost,
      message: `Post status updated to ${newStatus}`
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Sync post error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
