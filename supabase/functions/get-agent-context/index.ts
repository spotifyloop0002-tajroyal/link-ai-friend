import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claimsData.claims.sub;
    console.log("📊 Fetching agent context for user:", userId);

    // Fetch user profile
    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (profileError) {
      console.error("Profile fetch error:", profileError);
    }

    // Fetch writing style
    const { data: writingStyle, error: styleError } = await supabase
      .from("user_writing_style")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (styleError) {
      console.error("Writing style fetch error:", styleError);
    }

    // Fetch recent posts (last 20)
    const { data: recentPosts, error: postsError } = await supabase
      .from("linkedin_post_history")
      .select("post_content, post_date, views, likes, comments, shares")
      .eq("user_id", userId)
      .order("post_date", { ascending: false })
      .limit(20);

    if (postsError) {
      console.error("Recent posts fetch error:", postsError);
    }

    // Fetch analytics summary
    const { data: analytics, error: analyticsError } = await supabase
      .from("linkedin_analytics")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (analyticsError) {
      console.error("Analytics fetch error:", analyticsError);
    }

    // Build AI context object
    const agentContext = {
      profile: profile ? {
        name: profile.name,
        userType: profile.user_type,
        companyName: profile.company_name,
        industry: profile.industry,
        companyDescription: profile.company_description,
        targetAudience: profile.target_audience,
        location: profile.location,
        defaultTopics: profile.default_topics,
        role: profile.role,
        background: profile.background,
        postingGoals: profile.posting_goals,
        preferredTone: profile.preferred_tone,
      } : null,
      writingStyle: writingStyle ? {
        avgPostLength: writingStyle.avg_post_length,
        commonTopics: writingStyle.common_topics,
        toneAnalysis: writingStyle.tone_analysis,
        emojiUsage: writingStyle.emoji_usage,
        hashtagStyle: writingStyle.hashtag_style,
        totalPostsAnalyzed: writingStyle.total_posts_analyzed,
      } : null,
      recentPosts: recentPosts?.map(p => ({
        content: p.post_content?.substring(0, 500),
        date: p.post_date,
        engagement: {
          views: p.views || 0,
          likes: p.likes || 0,
          comments: p.comments || 0,
          shares: p.shares || 0,
        },
      })) || [],
      analytics: analytics ? {
        followersCount: analytics.followers_count,
        connectionsCount: analytics.connections_count,
        lastSynced: analytics.last_synced,
      } : null,
      timestamp: new Date().toISOString(),
    };

    // Build AI instructions based on user data
    const aiInstructions = buildAIInstructions(agentContext);

    console.log("✅ Agent context compiled successfully");

    return new Response(
      JSON.stringify({
        success: true,
        context: agentContext,
        aiInstructions,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("❌ Agent context error:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function buildAIInstructions(context: any): string {
  const { profile, writingStyle, recentPosts } = context;

  let instructions = "";

  // Add profile context
  if (profile) {
    instructions += `USER PROFILE:\n`;
    instructions += `- Name: ${profile.name || "Unknown"}\n`;
    instructions += `- Type: ${profile.userType === "company" ? "Company Account" : "Personal Brand"}\n`;
    
    if (profile.userType === "company") {
      instructions += `- Company: ${profile.companyName || "N/A"}\n`;
      instructions += `- Industry: ${profile.industry || "N/A"}\n`;
      instructions += `- Description: ${profile.companyDescription || "N/A"}\n`;
    } else {
      instructions += `- Role: ${profile.role || "N/A"}\n`;
      instructions += `- Background: ${profile.background || "N/A"}\n`;
    }
    
    instructions += `- Target Audience: ${profile.targetAudience || "General professional audience"}\n`;
    instructions += `- Posting Goals: ${profile.postingGoals?.join(", ") || "Build presence"}\n`;
    instructions += `- Default Topics: ${profile.defaultTopics?.join(", ") || "General professional topics"}\n`;
    instructions += `\n`;
  }

  // Add writing style context
  if (writingStyle) {
    instructions += `WRITING STYLE ANALYSIS:\n`;
    instructions += `- Average post length: ${writingStyle.avgPostLength || 150} words\n`;
    instructions += `- Tone: ${writingStyle.toneAnalysis?.tone || "professional"}\n`;
    instructions += `- Uses emojis: ${writingStyle.emojiUsage ? "Yes, include emojis naturally" : "No, avoid emojis"}\n`;
    instructions += `- Hashtag style: ${writingStyle.hashtagStyle || "moderate"} (${
      writingStyle.hashtagStyle === "frequent" ? "Include 3-5 hashtags" :
      writingStyle.hashtagStyle === "rare" ? "Use 0-1 hashtags" :
      "Include 1-3 hashtags"
    })\n`;
    
    if (writingStyle.commonTopics?.length > 0) {
      instructions += `- Common topics/hashtags: ${writingStyle.commonTopics.slice(0, 8).join(", ")}\n`;
    }
    
    instructions += `- Based on ${writingStyle.totalPostsAnalyzed || 0} analyzed posts\n`;
    instructions += `\n`;
  }

  // Add example posts
  if (recentPosts?.length > 0) {
    instructions += `RECENT POST EXAMPLES (match this style):\n`;
    recentPosts.slice(0, 5).forEach((post: any, idx: number) => {
      const preview = post.content?.substring(0, 150) || "";
      instructions += `${idx + 1}. "${preview}..."\n`;
    });
    instructions += `\n`;
  }

  // Add general instructions
  instructions += `REQUIREMENTS:\n`;
  instructions += `- Match the user's writing style and voice\n`;
  
  if (writingStyle?.avgPostLength) {
    instructions += `- Target length: around ${writingStyle.avgPostLength} words\n`;
  }
  
  if (profile?.targetAudience) {
    instructions += `- Write for audience: ${profile.targetAudience}\n`;
  }

  return instructions;
}
