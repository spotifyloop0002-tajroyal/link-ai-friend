// ============================================================================
// POST-SUCCESS EDGE FUNCTION - SECURITY FIXED WITH USER OWNERSHIP VERIFICATION
// ============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

console.log('🚀 post-success function loaded (SECURITY FIXED VERSION)');

interface PostSuccessPayload {
  userId: string; // MANDATORY - must be present
  postId?: string;
  trackingId?: string;
  linkedinUrl: string;
  linkedinPostId?: string;
  postedAt?: string;
}

Deno.serve(async (req) => {
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
    const payload: PostSuccessPayload = await req.json();
    console.log('📥 Post success notification:', { 
      userId: payload.userId,
      postId: payload.postId,
      trackingId: payload.trackingId,
      linkedinUrl: payload.linkedinUrl 
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

    // Validate required fields
    if (!payload.linkedinUrl) {
      console.error('❌ Missing linkedinUrl');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'linkedinUrl is required' 
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

    // Try finding by postId first
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

    console.log('✅ Ownership verified - marking post as successfully posted');

    // ========================================================================
    // Update post to 'posted' status
    // ========================================================================
    const now = payload.postedAt || new Date().toISOString();
    
    const { data: updatedPost, error: updateError } = await supabaseClient
      .from('posts')
      .update({
        status: 'posted',
        linkedin_post_url: payload.linkedinUrl,
        linkedin_post_id: payload.linkedinPostId || null,
        posted_at: now,
        updated_at: now,
        last_error: null // Clear any previous errors
      })
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

    console.log('✅ Post marked as posted successfully:', updatedPost.id);

    // Update user counts and create notification
    const { error: rpcError } = await supabaseClient.rpc('increment_daily_post_count', { 
      p_user_id: payload.userId 
    });
    if (rpcError) console.error('RPC error:', rpcError);

    // Update user profile posts_published_count
    const { data: currentProfile } = await supabaseClient
      .from('user_profiles')
      .select('posts_published_count')
      .eq('user_id', payload.userId)
      .maybeSingle();
    
    if (currentProfile) {
      await supabaseClient
        .from('user_profiles')
        .update({ 
          posts_published_count: (currentProfile.posts_published_count || 0) + 1,
          updated_at: now
        })
        .eq('user_id', payload.userId);
    }

    // Create success notification
    await supabaseClient.from('notifications').insert({
      user_id: payload.userId,
      title: 'Post Published ✅',
      message: 'Your LinkedIn post has been published successfully!',
      type: 'post',
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        post: updatedPost 
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
