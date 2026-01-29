// ============================================================================
// SYNC-POST EDGE FUNCTION - SECURITY FIXED WITH USER OWNERSHIP VERIFICATION
// ============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

console.log('🚀 sync-post function loaded (SECURITY FIXED VERSION)');

interface SyncPostPayload {
  userId: string; // MANDATORY - must be present
  postId?: string;
  trackingId?: string;
  status?: 'scheduled' | 'posting' | 'posted' | 'failed' | 'queued_in_extension';
  linkedinUrl?: string;
  linkedinPostId?: string;
  error?: string;
  lastError?: string;
  scheduledTime?: string;
  postedAt?: string;
  action?: 'queue' | 'ack' | 'post' | 'fail';
  queuedAt?: string;
  extensionAckAt?: string;
}

// LinkedIn URL validation regex - matches activity posts
const LINKEDIN_URL_PATTERN = /linkedin\.com\/(posts|feed).*activity[-:][0-9]{19}/;
const ACTIVITY_ID_PATTERN = /activity[-:](\d{19})/;

function isValidLinkedInUrl(url: string | undefined | null): boolean {
  if (!url) return false;
  return LINKEDIN_URL_PATTERN.test(url);
}

function extractActivityId(url: string | undefined | null): string | null {
  if (!url) return null;
  const match = url.match(ACTIVITY_ID_PATTERN);
  return match ? match[1] : null;
}

Deno.serve(async (req) => {
  console.log('=== SYNC-POST EDGE FUNCTION CALLED ===');
  console.log('📅 Timestamp:', new Date().toISOString());
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase credentials');
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseClient = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Parse request body
    const rawBody = await req.text();
    let payload: SyncPostPayload;
    try {
      payload = JSON.parse(rawBody);
    } catch (parseError) {
      console.error('❌ JSON parse error:', parseError);
      return new Response(JSON.stringify({ success: false, error: 'Invalid JSON payload' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('📥 Sync request received:', { 
      userId: payload.userId, 
      postId: payload.postId,
      trackingId: payload.trackingId,
      status: payload.status,
      action: payload.action
    });

    // ========================================================================
    // 🔒 CRITICAL SECURITY CHECK #1: userId is REQUIRED
    // ========================================================================
    if (!payload.userId) {
      console.error('❌ SECURITY: Missing userId in request');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'userId is required for security verification' 
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // ========================================================================
    // 🔒 CRITICAL SECURITY CHECK #2: Find post WITH ownership verification
    // ========================================================================
    let post = null;

    // Try finding by postId first (if provided)
    if (payload.postId) {
      console.log('🔍 Looking up post by postId:', payload.postId);
      
      const { data, error } = await supabaseClient
        .from('posts')
        .select('*')
        .eq('id', payload.postId)
        .eq('user_id', payload.userId) // 🔒 OWNERSHIP CHECK
        .maybeSingle();

      if (error) {
        console.error('❌ Database error:', error);
        return new Response(
          JSON.stringify({ success: false, error: 'Database error' }),
          { 
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      if (!data) {
        console.warn('⚠️ Post not found or user does not own this post:', {
          postId: payload.postId,
          userId: payload.userId
        });
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Post not found or access denied' 
          }),
          { 
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      post = data;
    }
    // Try finding by trackingId as fallback
    else if (payload.trackingId) {
      console.log('🔍 Looking up post by trackingId:', payload.trackingId);
      
      const { data, error } = await supabaseClient
        .from('posts')
        .select('*')
        .eq('tracking_id', payload.trackingId)
        .eq('user_id', payload.userId) // 🔒 OWNERSHIP CHECK
        .maybeSingle();

      if (error) {
        console.error('❌ Database error:', error);
        return new Response(
          JSON.stringify({ success: false, error: 'Database error' }),
          { 
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      if (!data) {
        console.warn('⚠️ Post not found or user does not own this post:', {
          trackingId: payload.trackingId,
          userId: payload.userId
        });
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Post not found or access denied' 
          }),
          { 
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      post = data;
    }
    else {
      console.error('❌ Neither postId nor trackingId provided');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Either postId or trackingId must be provided' 
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // ========================================================================
    // 🔒 CRITICAL SECURITY CHECK #3: Double-verify ownership before update
    // ========================================================================
    if (post.user_id !== payload.userId) {
      console.error('❌ SECURITY VIOLATION: User attempting to modify another user\'s post!', {
        postUserId: post.user_id,
        requestUserId: payload.userId,
        postId: post.id
      });
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Access denied: You do not own this post' 
        }),
        { 
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('✅ Ownership verified - proceeding with update');

    // ========================================================================
    // Build update data
    // ========================================================================
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    };

    const linkedinUrl = payload.linkedinUrl;
    const hasValidUrl = isValidLinkedInUrl(linkedinUrl);
    const newStatus = payload.status || (payload.action === 'post' ? 'posted' : payload.action === 'fail' ? 'failed' : null);

    // Handle action-based updates
    if (payload.action === 'queue') {
      updateData.status = 'queued_in_extension';
      updateData.queued_at = payload.queuedAt || new Date().toISOString();
      console.log('📥 Post queued in extension');
    } else if (payload.action === 'ack') {
      updateData.extension_ack_at = payload.extensionAckAt || new Date().toISOString();
      console.log('✅ Extension ACK received');
    } else if (payload.action === 'post' || newStatus === 'posted') {
      updateData.status = 'posted';
      updateData.posted_at = payload.postedAt || new Date().toISOString();
      
      if (hasValidUrl) {
        updateData.linkedin_post_url = linkedinUrl;
        updateData.verified = true;
        console.log('✅ Valid LinkedIn URL detected - marking as verified');
      } else if (linkedinUrl) {
        updateData.linkedin_post_url = linkedinUrl;
        updateData.verified = false;
        console.log('⚠️ LinkedIn URL provided but not verified pattern');
      } else {
        updateData.verified = false;
        console.log('⏳ No LinkedIn URL - verification pending');
      }
    } else if (payload.action === 'fail' || newStatus === 'failed') {
      updateData.status = 'failed';
      updateData.last_error = payload.lastError || payload.error || 'Unknown error';
      updateData.retry_count = 1;
      updateData.verified = false;
    } else if (newStatus) {
      updateData.status = newStatus;
    }

    if (payload.linkedinPostId) {
      updateData.linkedin_post_id = payload.linkedinPostId;
    }

    console.log('📝 Update data:', JSON.stringify(updateData, null, 2));

    // Update the post with ownership verification
    const { data: updatedPost, error: updateError } = await supabaseClient
      .from('posts')
      .update(updateData)
      .eq('id', post.id)
      .eq('user_id', payload.userId) // 🔒 OWNERSHIP CHECK (redundant but safe)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Update error:', updateError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to update post' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('✅ Post updated successfully:', updatedPost.id);

    // Handle side effects for first-time posted status
    const isFirstTimePosted = post.status !== 'posted' && updateData.status === 'posted';
    
    if (isFirstTimePosted) {
      console.log('📊 First time posted - updating counts');
      
      // Increment daily post count
      const { error: rpcError } = await supabaseClient.rpc('increment_daily_post_count', { 
        p_user_id: payload.userId 
      });
      if (rpcError) console.error('RPC error:', rpcError);

      // Create success notification
      const notificationMessage = hasValidUrl 
        ? 'Your LinkedIn post has been published and verified!' 
        : 'Your LinkedIn post has been published (verification pending).';
        
      await supabaseClient.from('notifications').insert({
        user_id: payload.userId,
        title: hasValidUrl ? 'Post Published ✅' : 'Post Published ⏳',
        message: notificationMessage,
        type: 'post',
      });

      // Update user profile posts_published_count
      const { data: currentProfile } = await supabaseClient
        .from('user_profiles')
        .select('posts_published_count')
        .eq('user_id', payload.userId)
        .maybeSingle();
      
      if (currentProfile) {
        await supabaseClient
          .from('user_profiles')
          .update({ posts_published_count: (currentProfile.posts_published_count || 0) + 1 })
          .eq('user_id', payload.userId);
      }
    }

    // Create failure notification
    if (updateData.status === 'failed') {
      await supabaseClient.from('notifications').insert({
        user_id: payload.userId,
        title: 'Post Failed ❌',
        message: payload.lastError || payload.error || 'Failed to publish your post. Please try again.',
        type: 'post',
      });
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        post: updatedPost,
        verified: hasValidUrl,
        message: `Post status updated to ${updateData.status || 'updated'}`
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('❌ Unhandled error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Internal server error'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
