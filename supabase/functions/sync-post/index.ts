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
  status?: 'posted' | 'failed' | 'scheduled' | 'queued_in_extension' | 'posting';
  postedAt?: string;
  lastError?: string;
  // NEW: Audit fields
  action?: 'queue' | 'ack' | 'post' | 'fail';
  queuedAt?: string;
  extensionAckAt?: string;
}

// LinkedIn URL validation regex - matches activity posts
const LINKEDIN_URL_PATTERN = /linkedin\.com\/(posts|feed).*activity[-:][0-9]{19}/;
// Pattern to extract activity ID
const ACTIVITY_ID_PATTERN = /activity[-:](\d{19})/;

// Validate if a LinkedIn URL is a real published post
function isValidLinkedInUrl(url: string | undefined | null): boolean {
  if (!url) return false;
  return LINKEDIN_URL_PATTERN.test(url);
}

// Extract activity ID from LinkedIn URL
function extractActivityId(url: string | undefined | null): string | null {
  if (!url) return null;
  const match = url.match(ACTIVITY_ID_PATTERN);
  return match ? match[1] : null;
}

// Detailed URL validation logging
function validateAndLogUrl(url: string | undefined | null): { isValid: boolean; activityId: string | null; details: Record<string, unknown> } {
  const details: Record<string, unknown> = {
    urlProvided: !!url,
    urlLength: url?.length ?? 0,
    urlPreview: url ? url.substring(0, 100) : null,
  };
  
  if (!url) {
    details.failureReason = 'URL is null or undefined';
    return { isValid: false, activityId: null, details };
  }
  
  // Check individual pattern components
  details.containsLinkedIn = url.includes('linkedin.com');
  details.containsPosts = url.includes('/posts/');
  details.containsFeed = url.includes('/feed');
  details.containsActivity = url.includes('activity');
  details.hasActivityPattern = ACTIVITY_ID_PATTERN.test(url);
  details.fullPatternMatch = LINKEDIN_URL_PATTERN.test(url);
  
  const activityId = extractActivityId(url);
  details.extractedActivityId = activityId;
  
  if (!details.containsLinkedIn) {
    details.failureReason = 'URL does not contain linkedin.com';
  } else if (!details.containsPosts && !details.containsFeed) {
    details.failureReason = 'URL does not contain /posts/ or /feed';
  } else if (!details.containsActivity) {
    details.failureReason = 'URL does not contain activity keyword';
  } else if (!details.hasActivityPattern) {
    details.failureReason = 'URL does not have valid activity ID pattern (19 digits)';
  } else if (!details.fullPatternMatch) {
    details.failureReason = 'URL does not match full LinkedIn post pattern';
  }
  
  return { 
    isValid: LINKEDIN_URL_PATTERN.test(url), 
    activityId, 
    details 
  };
}

Deno.serve(async (req) => {
  console.log('=== SYNC-POST EDGE FUNCTION CALLED ===');
  console.log('📅 Timestamp:', new Date().toISOString());
  console.log('📍 Method:', req.method);
  console.log('🔗 URL:', req.url);
  
  // Log all headers for debugging
  const headersObj: Record<string, string> = {};
  req.headers.forEach((value, key) => {
    headersObj[key] = value;
  });
  console.log('📋 Headers:', JSON.stringify(headersObj, null, 2));
  
  if (req.method === 'OPTIONS') {
    console.log('✅ Handling CORS preflight');
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    console.log('❌ Invalid method:', req.method);
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const rawBody = await req.text();
    console.log('📥 RAW REQUEST BODY:', rawBody);
    console.log('📥 Body length:', rawBody.length);
    
    let payload: SyncPostPayload;
    try {
      payload = JSON.parse(rawBody);
    } catch (parseError) {
      console.error('❌ JSON parse error:', parseError);
      console.error('❌ Failed to parse body:', rawBody.substring(0, 500));
      return new Response(JSON.stringify({ success: false, error: 'Invalid JSON payload' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    console.log('📋 PARSED PAYLOAD:', JSON.stringify(payload, null, 2));
    
    const { trackingId, postId, userId, linkedinUrl, status, postedAt, lastError, action, queuedAt, extensionAckAt } = payload;

    console.log('🔍 IDENTIFIERS:');
    console.log('   postId:', postId);
    console.log('   trackingId:', trackingId);
    console.log('   userId:', userId);
    console.log('   status:', status);
    console.log('   action:', action);
    console.log('   postedAt:', postedAt);
    console.log('   queuedAt:', queuedAt);
    console.log('   extensionAckAt:', extensionAckAt);
    
    // Detailed LinkedIn URL logging
    console.log('🔗 LINKEDIN URL ANALYSIS:');
    console.log('   Raw URL:', linkedinUrl);
    console.log('   URL type:', typeof linkedinUrl);
    
    const urlValidation = validateAndLogUrl(linkedinUrl);
    console.log('   Validation result:', JSON.stringify(urlValidation, null, 2));

    if (!trackingId && !postId) {
      console.error('❌ Missing trackingId or postId - cannot identify post');
      return new Response(JSON.stringify({ success: false, error: 'trackingId or postId required' }), {
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

    // First, find the post to confirm it exists - TRY BOTH postId AND trackingId
    console.log('🔍 Searching for post...');
    
    let existingPost = null;
    let findError = null;

    // Try finding by postId first (UUID)
    if (postId) {
      console.log('🔍 Trying to find by postId:', postId);
      const result = await supabase
        .from('posts')
        .select('id, user_id, status, linkedin_post_url, tracking_id')
        .eq('id', postId)
        .maybeSingle();
      
      existingPost = result.data;
      findError = result.error;
      console.log('🔍 postId search result:', existingPost ? 'FOUND' : 'NOT FOUND');
    }
    
    // If not found by postId, try trackingId
    if (!existingPost && trackingId) {
      console.log('🔍 Trying to find by trackingId:', trackingId);
      const result = await supabase
        .from('posts')
        .select('id, user_id, status, linkedin_post_url, tracking_id')
        .eq('tracking_id', trackingId)
        .maybeSingle();
      
      existingPost = result.data;
      findError = result.error;
      console.log('🔍 trackingId search result:', existingPost ? 'FOUND' : 'NOT FOUND');
    }
    
    if (findError) {
      console.error('❌ Error finding post:', findError);
      return new Response(JSON.stringify({ success: false, error: 'Error finding post', details: findError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!existingPost) {
      console.error('❌ POST NOT FOUND');
      console.error('   Searched postId:', postId);
      console.error('   Searched trackingId:', trackingId);
      
      // Log all posts to help debug
      const { data: allPosts } = await supabase
        .from('posts')
        .select('id, tracking_id, status')
        .limit(10);
      console.log('📋 Recent posts in DB:', JSON.stringify(allPosts, null, 2));
      
      return new Response(JSON.stringify({ success: false, error: 'Post not found', searchedPostId: postId, searchedTrackingId: trackingId }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('✅ FOUND POST:', JSON.stringify(existingPost, null, 2));

    // Determine the new status based on payload
    const newStatus = status || 'posted';
    console.log('📊 New status to set:', newStatus);
    
    // Check if this is a valid verified LinkedIn URL with detailed logging
    const incomingUrlValidation = validateAndLogUrl(linkedinUrl);
    const existingUrlValidation = validateAndLogUrl(existingPost.linkedin_post_url);
    
    const hasValidUrl = incomingUrlValidation.isValid;
    const hadValidUrl = existingUrlValidation.isValid;
    
    console.log('🔗 URL VALIDATION COMPARISON:');
    console.log('   Incoming URL valid:', hasValidUrl);
    console.log('   Incoming activity ID:', incomingUrlValidation.activityId);
    console.log('   Existing URL valid:', hadValidUrl);
    console.log('   Existing activity ID:', existingUrlValidation.activityId);
    
    if (!hasValidUrl && linkedinUrl) {
      console.log('⚠️ INCOMING URL FAILED VALIDATION:');
      console.log('   Failure reason:', incomingUrlValidation.details.failureReason);
      console.log('   Full details:', JSON.stringify(incomingUrlValidation.details, null, 2));
    }
    
    // Build update data
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    // Handle action-based updates (new audit logging)
    if (action === 'queue') {
      // Extension received the post and queued it
      updateData.status = 'queued_in_extension';
      updateData.queued_at = queuedAt || new Date().toISOString();
      console.log('📥 Post queued in extension');
    } else if (action === 'ack') {
      // Extension acknowledged it will process the post
      updateData.extension_ack_at = extensionAckAt || new Date().toISOString();
      console.log('✅ Extension ACK received');
    } else if (action === 'post' || newStatus === 'posted') {
      // Post was actually published
      updateData.status = 'posted';
      updateData.posted_at = postedAt || new Date().toISOString();
      
      // Set verification flags based on URL validity
      if (hasValidUrl) {
        updateData.linkedin_post_url = linkedinUrl;
        updateData.verified = true;
        console.log('✅ Valid LinkedIn URL detected - marking as verified');
      } else if (linkedinUrl) {
        // URL provided but doesn't match pattern - still save it
        updateData.linkedin_post_url = linkedinUrl;
        updateData.verified = false;
        console.log('⚠️ LinkedIn URL provided but not verified pattern');
      } else {
        // No URL - posted but verification pending
        updateData.verified = false;
        console.log('⏳ No LinkedIn URL - verification pending');
      }
    } else if (action === 'fail' || newStatus === 'failed') {
      // Post failed
      updateData.status = 'failed';
      updateData.last_error = lastError || 'Unknown error';
      updateData.retry_count = 1;
      updateData.verified = false;
    } else if (newStatus === 'queued_in_extension') {
      updateData.status = 'queued_in_extension';
      updateData.queued_at = queuedAt || new Date().toISOString();
    } else if (newStatus === 'posting') {
      updateData.status = 'posting';
    }

    console.log('📝 UPDATE DATA:', JSON.stringify(updateData, null, 2));

    // Update the post using the found post's ID (most reliable)
    const { error: postError, data: updatedPost } = await supabase
      .from('posts')
      .update(updateData)
      .eq('id', existingPost.id)
      .select()
      .single();

    if (postError) {
      console.error('❌ POST UPDATE ERROR:', postError);
      return new Response(JSON.stringify({ success: false, error: postError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('✅ POST UPDATED SUCCESSFULLY:', JSON.stringify(updatedPost, null, 2));

    // Use the userId from the found post if not provided
    const effectiveUserId = userId || existingPost.user_id;

    // Only increment counts for first-time posted status (not re-verification)
    const isFirstTimePosted = existingPost.status !== 'posted' && newStatus === 'posted';
    
    if (effectiveUserId && isFirstTimePosted) {
      console.log('Incrementing post counts for user:', effectiveUserId);
      
      // Increment daily post count
      const { error: rpcError } = await supabase.rpc('increment_daily_post_count', { 
        p_user_id: effectiveUserId 
      });
      if (rpcError) {
        console.error('RPC error:', rpcError);
      }

      // Create success notification with appropriate message
      const notificationMessage = hasValidUrl 
        ? 'Your LinkedIn post has been published and verified!' 
        : 'Your LinkedIn post has been published (verification pending).';
        
      const { error: notifError } = await supabase.from('notifications').insert({
        user_id: effectiveUserId,
        title: hasValidUrl ? 'Post Published ✅' : 'Post Published ⏳',
        message: notificationMessage,
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
    
    // If URL was just verified (had no valid URL before, now has one)
    if (effectiveUserId && !hadValidUrl && hasValidUrl) {
      console.log('🎉 URL verification upgrade - notifying user');
      await supabase.from('notifications').insert({
        user_id: effectiveUserId,
        title: 'Post Verified ✅',
        message: 'Your LinkedIn post URL has been confirmed. Analytics syncing is now enabled.',
        type: 'analytics',
      });
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

    console.log(`✅ Post ${postId || trackingId} status updated to: ${newStatus}, verified: ${hasValidUrl}`);
    console.log('📤 Returning success response with updated post');

    return new Response(JSON.stringify({ 
      success: true, 
      post: updatedPost,
      verified: hasValidUrl,
      message: `Post status updated to ${newStatus}`
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('❌ Sync post error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Error details:', errorMessage);
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});