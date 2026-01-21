import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ============================================
// FETCH USER CONTEXT FOR AI
// ============================================
async function fetchUserContext(authHeader: string | null): Promise<any | null> {
  if (!authHeader) return null;

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    
    const response = await fetch(`${supabaseUrl}/functions/v1/get-agent-context`, {
      method: "GET",
      headers: {
        "Authorization": authHeader,
        "Content-Type": "application/json",
      },
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success) {
        console.log("✅ User context loaded");
        return data;
      }
    }
  } catch (error) {
    console.error("Failed to fetch user context:", error);
  }
  
  return null;
}

// ============================================
// TAVILY RESEARCH FUNCTION - ENHANCED
// ============================================
async function researchTopic(topic: string, userContext?: any): Promise<{ insights: string; suggestedTopics: string[] } | null> {
  const TAVILY_API_KEY = Deno.env.get("TAVILY_API_KEY");
  
  if (!TAVILY_API_KEY) {
    console.log("No Tavily API key, skipping research");
    return null;
  }

  try {
    console.log("🔍 Researching topic with Tavily:", topic);
    
    // Build context-aware query
    let query = `Latest trends and insights about ${topic} for LinkedIn professional post`;
    if (userContext?.agentContext?.profile?.industry) {
      query += ` in the ${userContext.agentContext.profile.industry} industry`;
    }
    
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: TAVILY_API_KEY,
        query,
        search_depth: "basic",
        max_results: 5,
      }),
    });

    const data = await response.json();
    
    if (data.results && data.results.length > 0) {
      const insights = data.results.map((r: any) => `- ${r.content?.substring(0, 200)}`).join("\n");
      
      // Extract suggested topics from results
      const suggestedTopics = data.results
        .slice(0, 3)
        .map((r: any) => r.title?.substring(0, 60) || topic);
      
      console.log("✅ Research complete with", data.results.length, "results");
      return { insights, suggestedTopics };
    }
  } catch (error) {
    console.error("Tavily research error:", error);
  }
  
  return null;
}

// ============================================
// REAL AI FUNCTION (via Lovable AI Gateway)
// ============================================
async function callAI(prompt: string, conversationHistory: any[] = [], userContext?: any): Promise<string> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  
  if (!LOVABLE_API_KEY) {
    throw new Error("LOVABLE_API_KEY not configured");
  }

  // Build dynamic system prompt with user context
  let userContextSection = "";
  if (userContext?.aiInstructions) {
    userContextSection = `\n\n${userContext.aiInstructions}`;
  }

  const systemPrompt = `You are a professional LinkedIn content creator and posting assistant.

PERSONALITY:
- Conversational and friendly like ChatGPT
- Professional but approachable
- Ask clarifying questions when needed
- Provide specific, actionable advice
${userContextSection}

CRITICAL BEHAVIOR RULES:

1. **CONFIRMATION FLOW** (MOST IMPORTANT):
   When user asks to create multiple posts (e.g., "create posts for next 5 days", "generate a week of content"):
   - DO NOT create posts immediately
   - First respond with a PLAN asking for confirmation:
     "Here's what I can do for you - please confirm:
     
     📋 **My Plan:**
     • Research latest trends in [topic/industry]
     • Create [X] unique posts with varied content
     • Suggest optimal posting times
     • Generate AI images for each post
     
     📅 **Suggested Schedule:**
     • Day 1: [Topic idea 1]
     • Day 2: [Topic idea 2]
     • etc.
     
     **Would you like me to proceed with this plan?** Or would you prefer different topics/timing?"
   
   Only create posts AFTER user confirms with "yes", "proceed", "go ahead", etc.

2. WHEN USER GIVES VAGUE TOPIC (e.g., "write about cars", "post about technology"):
   - Ask for more details
   - Provide 3-4 example angles they could take
   - Use research to suggest trending topics
   - Example: "I'd love to write about cars! Based on current trends, here are some angles:
     • Electric vehicles and sustainability
     • Autonomous driving technology
     • Industry market trends
     • Or something else specific?"

3. WHEN USER GIVES SPECIFIC TOPIC (e.g., "write about tech in cars", "post about AI in healthcare"):
   - Acknowledge you understand
   - Tell them you're creating the post
   - Use research data if provided
   - Create a professional LinkedIn post (150-250 words)
   - Format the post with clear paragraphs and bullet points
   - Include relevant hashtags
   - Wrap the post content between --- markers
   - Ask if they want changes
   - Ask when they want to post it

4. SCHEDULING RULES (LinkedIn-safe):
   - NEVER schedule same time every day
   - Vary posting times between 9am-6pm
   - Max 2 posts per day
   - Suggest different content lengths/formats
   - Avoid repetitive post structures

5. POST FORMAT:
When creating a post, use this format:
---
[Your LinkedIn post content here with paragraphs, bullet points, and hashtags]
---

Then ask: "What do you think? Would you like any changes? When would you like to post this?"`;

  try {
    console.log("🤖 Calling Lovable AI Gateway...");
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...conversationHistory.map((msg: any) => ({
            role: msg.role,
            content: msg.content,
          })),
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        throw new Error("Rate limit exceeded. Please try again in a moment.");
      }
      if (response.status === 402) {
        throw new Error("AI credits exhausted. Please add credits to continue.");
      }
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.choices && data.choices[0]?.message?.content) {
      console.log("✅ AI response received");
      return data.choices[0].message.content;
    } else {
      throw new Error("Invalid AI response format");
    }
  } catch (error) {
    console.error("AI error:", error);
    throw error;
  }
}

// ============================================
// CLEAN POST CONTENT - Remove excessive spacing
// ============================================
function cleanPostContent(content: string): string {
  return content
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .replace(/^[ \t]{3,}/gm, '')
    .replace(/\n•/g, '\n\n•')
    .replace(/•\s+/g, '• ')
    .replace(/  +/g, ' ');
}

// ============================================
// GENERATE IMAGE PROMPT FROM POST CONTENT
// ============================================
function generateImagePromptFromPost(postContent: string): string {
  const lines = postContent.split('\n').filter(line => line.trim().length > 0);
  const firstLine = lines[0]?.trim() || 'Professional business content';
  
  const cleanTopic = firstLine
    .replace(/[\u{1F300}-\u{1F9FF}]/gu, '')
    .replace(/[^\w\s.,!?-]/g, '')
    .trim()
    .substring(0, 150);
  
  const themes: string[] = [];
  const lowerContent = postContent.toLowerCase();
  
  if (lowerContent.includes('ai') || lowerContent.includes('artificial intelligence')) {
    themes.push('artificial intelligence, technology');
  }
  if (lowerContent.includes('car') || lowerContent.includes('automotive') || lowerContent.includes('vehicle')) {
    themes.push('automotive, vehicles');
  }
  if (lowerContent.includes('tech') || lowerContent.includes('software')) {
    themes.push('technology, innovation');
  }
  if (lowerContent.includes('leadership') || lowerContent.includes('management')) {
    themes.push('leadership, business');
  }
  if (lowerContent.includes('startup') || lowerContent.includes('entrepreneur')) {
    themes.push('startup, entrepreneurship');
  }
  
  const themeString = themes.length > 0 ? themes.join(', ') : 'professional business';
  
  return `Professional LinkedIn social media post image.
Topic: ${cleanTopic}
Themes: ${themeString}
Style: Modern, business professional, clean design
Colors: Professional blue tones, white, subtle gradients
Format: Social media post optimized for LinkedIn
Requirements: No text overlay, visually represent the concept, minimalist`;
}

// ============================================
// EXTRACT POST CONTENT FROM AI RESPONSE
// ============================================
function extractPostContent(aiResponse: string): string | null {
  const markerPattern = /---\s*\n([\s\S]+?)\n\s*---/;
  const match = aiResponse.match(markerPattern);
  
  if (match && match[1]) {
    return cleanPostContent(match[1]);
  }
  
  return null;
}

// ============================================
// DETECT USER INTENT - ENHANCED
// ============================================
function detectIntent(message: string, uploadedImages?: string[]): { type: string; data?: any } {
  const lower = message.toLowerCase().trim();

  // Check for uploaded images first
  if (uploadedImages && uploadedImages.length > 0) {
    return { type: "create_posts_from_images", data: { imageUrls: uploadedImages } };
  }

  // Check for [UPLOADED_IMAGES:] marker in message
  const imageMatch = message.match(/\[UPLOADED_IMAGES:\s*([^\]]+)\]/);
  if (imageMatch) {
    const imageUrls = imageMatch[1].split(",").map(url => url.trim()).filter(url => url.length > 0);
    if (imageUrls.length > 0) {
      return { type: "create_posts_from_images", data: { imageUrls } };
    }
  }

  // Multi-post request (needs confirmation first)
  const multiPostPatterns = [
    /create\s+posts?\s+for\s+(?:the\s+)?(?:next\s+)?\d+\s*days?/i,
    /generate\s+\d+\s*posts?/i,
    /(?:a\s+)?week(?:'s)?\s+(?:worth\s+)?(?:of\s+)?content/i,
    /schedule\s+posts?\s+for\s+(?:the\s+)?week/i,
    /batch\s+create/i,
    /multiple\s+posts?/i,
  ];
  
  if (multiPostPatterns.some(p => p.test(message))) {
    return { type: "multi_post_request", data: { originalMessage: message } };
  }

  // User confirms plan
  const confirmPatterns = [
    /^(yes|yeah|yep|sure|ok|okay|proceed|go ahead|do it|confirm|approved?|let'?s go|sounds good|perfect)$/i,
    /^(yes|yeah|yep|sure|ok|okay),?\s*(please|proceed|go ahead)?$/i,
  ];
  
  if (confirmPatterns.some(p => p.test(lower))) {
    return { type: "confirm_plan" };
  }

  // Show post
  if (lower.includes("show") && (lower.includes("post") || lower.includes("content"))) {
    return { type: "show_post" };
  }

  // Post now (immediate)
  if ((lower.includes("post it") || lower.includes("publish")) &&
      (lower.includes("now") || lower.includes("right now") || lower.includes("immediately"))) {
    return { type: "post_now" };
  }

  // Post with specific time
  const timePatterns = [
    /\d{1,2}:\d{2}\s*(am|pm)?/i,
    /\d{1,2}\s*(am|pm)/i,
    /today/i,
    /tomorrow/i,
    /tonight/i,
    /morning/i,
    /afternoon/i,
    /evening/i,
    /next\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i,
    /in\s+\d+\s+(hour|minute|day)/i,
  ];
  
  const hasTime = timePatterns.some(pattern => pattern.test(lower));
  
  if ((lower.includes("post it") || lower.includes("post this") || lower.includes("schedule")) && hasTime) {
    return { type: "schedule_post", data: { timeText: message } };
  }

  // Ask for time (post without time)
  if (lower.includes("post it") || lower.includes("publish it") || lower.includes("post this")) {
    return { type: "ask_time" };
  }

  // Create post request
  if (lower.match(/^(write|create|generate|make|draft)\s/i) ||
      lower.includes("post about") ||
      lower.includes("write about") ||
      lower.includes("create a post")) {
    return { type: "create_post" };
  }

  // Greeting
  if (/^(hi|hello|hey|hola|good\s+(morning|afternoon|evening))$/i.test(lower)) {
    return { type: "greeting" };
  }

  // Negative/Cancel
  if (/^(no|nope|cancel|nevermind|never mind)$/i.test(lower)) {
    return { type: "cancel" };
  }

  // Default to conversation
  return { type: "conversation" };
}

// ============================================
// CHECK IF TOPIC IS SPECIFIC OR VAGUE
// ============================================
function isSpecificTopic(message: string): boolean {
  const words = message.split(/\s+/).filter(w => w.length > 2);
  const specificIndicators = [
    /and\s+\w+/i,
    /in\s+\w+/i,
    /for\s+\w+/i,
    /about\s+\w+\s+\w+/i,
    /how\s+to/i,
    /\d+\s+(tips|ways|steps|reasons)/i,
  ];
  
  return words.length > 5 || specificIndicators.some(p => p.test(message));
}

// ============================================
// GENERATE MULTI-POST SCHEDULE
// ============================================
function generateScheduleSuggestion(numDays: number, topics: string[]): string {
  const times = ["9:00 AM", "10:30 AM", "12:00 PM", "2:00 PM", "4:30 PM", "6:00 PM"];
  const schedule: string[] = [];
  
  for (let i = 0; i < numDays; i++) {
    const day = i === 0 ? "Today" : i === 1 ? "Tomorrow" : `Day ${i + 1}`;
    const time = times[Math.floor(Math.random() * times.length)];
    const topic = topics[i % topics.length] || `Topic ${i + 1}`;
    schedule.push(`• ${day} at ${time} IST: ${topic}`);
  }
  
  return schedule.join("\n");
}

// ============================================
// MAIN HANDLER
// ============================================
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    const body = await req.json().catch(() => ({}));
    const message: string = String(body?.message ?? "").trim();
    const conversationHistory: any[] = body?.history || [];
    const generatedPosts: any[] = body?.generatedPosts || [];
    const pendingPlan: any = body?.pendingPlan || null;
    const uploadedImages: string[] = body?.uploadedImages || [];

    console.log("📨 Agent received:", message);
    console.log("📝 History length:", conversationHistory.length);
    console.log("🗂️ Generated posts:", generatedPosts.length);
    console.log("🖼️ Uploaded images:", uploadedImages.length);

    // Fetch user context for personalized AI
    const userContext = await fetchUserContext(authHeader);

    if (!message && uploadedImages.length === 0) {
      return new Response(
        JSON.stringify({
          type: "message",
          message: "Please type a message to continue.",
          posts: [],
          action: null,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const intent = detectIntent(message, uploadedImages);
    console.log("🎯 Detected intent:", intent.type);

    let response = "";
    let posts: any[] = [];
    let action: string | null = null;
    let planToConfirm: any = null;

    // ============================================
    // HANDLE DIFFERENT INTENTS
    // ============================================

    switch (intent.type) {
      case "greeting": {
        response = `Hello! 👋 I'm your LinkedIn posting assistant.

I can help you:
1. **Create posts** - Say "write a post about [topic]"
2. **Research topics** - I'll find the latest insights for your posts
3. **Schedule posts** - Say "post it tomorrow at 2pm"
4. **Batch create** - Say "create posts for next 5 days"

What would you like to create today?`;
        break;
      }

      case "cancel": {
        response = "No problem! Let me know when you'd like to create a LinkedIn post. Just say 'write a post about [topic]' when you're ready. 👍";
        break;
      }

      case "create_posts_from_images": {
        const imageUrls: string[] = intent.data?.imageUrls || [];
        console.log("🖼️ Creating posts for", imageUrls.length, "images");
        
        // Clean the message to extract any user instructions
        const cleanMessage = message.replace(/\[UPLOADED_IMAGES:[^\]]+\]/g, "").trim();
        const userInstructions = cleanMessage || "Create an engaging LinkedIn post for this image";
        
        // Generate a post for each image
        for (let i = 0; i < imageUrls.length; i++) {
          const imageUrl = imageUrls[i];
          const postIndex = i + 1;
          
          const imagePostPrompt = `You are creating a LinkedIn post for an uploaded image (image ${postIndex} of ${imageUrls.length}).

User instructions: ${userInstructions}

The image has been uploaded and will be attached to this post. Create an engaging, professional LinkedIn post that:
1. Captures attention with a strong opening
2. Relates to the user's instructions or describes what the image might represent
3. Includes a call to action or question to drive engagement
4. Uses appropriate hashtags (2-3 max)

IMPORTANT: Output the post content between --- markers like this:
---
Your post content here
---

Make each post unique if there are multiple images.`;

          try {
            const aiResponse = await callAI(imagePostPrompt, conversationHistory, userContext);
            const postContent = extractPostContent(aiResponse);
            
            if (postContent) {
              // Schedule each post at different times (spread across the day)
              const scheduledTime = new Date();
              scheduledTime.setHours(scheduledTime.getHours() + (i * 2) + 1); // Space posts 2 hours apart
              
              posts.push({
                id: `post-${Date.now()}-${i}`,
                content: postContent,
                suggestedTime: scheduledTime.toISOString(),
                reasoning: `Post ${postIndex} of ${imageUrls.length} - created from uploaded image`,
                scheduledDateTime: scheduledTime.toISOString(),
                generateImage: false, // Image already provided
                imageUrl: imageUrl, // Attach the uploaded image
                imagePrompt: null,
              });
            }
          } catch (error) {
            console.error(`Error generating post for image ${postIndex}:`, error);
          }
        }
        
        if (posts.length > 0) {
          response = `🖼️ Created ${posts.length} post(s) for your uploaded images!\n\nEach post has been paired with its image and scheduled at different times to maximize engagement.\n\nYou can:\n• Edit any post content\n• Change the schedule\n• Post now or schedule for later`;
        } else {
          response = "I had trouble creating posts for your images. Please try again or provide more specific instructions.";
        }
        break;
      }

      case "multi_post_request": {
        // Extract number of days/posts from message
        const numMatch = message.match(/(\d+)\s*(?:days?|posts?)/i);
        const numDays = numMatch ? parseInt(numMatch[1]) : 5;
        
        // Research to get topic suggestions
        const research = await researchTopic("trending professional topics", userContext);
        const suggestedTopics = research?.suggestedTopics || [
          "Industry insights",
          "Professional growth tips",
          "Success story",
          "How-to guide",
          "Thought leadership",
        ];
        
        const schedule = generateScheduleSuggestion(numDays, suggestedTopics);
        
        response = `Great idea! Here's what I can do for you - **please confirm**:

📋 **My Plan:**
• Research latest trends in your industry
• Create ${numDays} unique posts with varied content
• Suggest optimal posting times (different each day)
• Generate AI images for each post (if enabled)

📅 **Suggested Schedule:**
${schedule}

⚡ **LinkedIn-Safe Approach:**
• Different posting times each day
• Varied content formats
• Max 2 posts per day

**Would you like me to proceed with this plan?**
Or would you prefer different topics/timing?`;
        
        planToConfirm = {
          type: "multi_post",
          numDays,
          topics: suggestedTopics,
          schedule,
        };
        break;
      }

      case "confirm_plan": {
        // User confirmed - generate the posts
        if (pendingPlan && pendingPlan.type === "multi_post") {
          response = `Perfect! 🚀 Creating ${pendingPlan.numDays} posts for you...`;
          
          // Generate posts (would be done via AI in production)
          // For now, signal to create posts
          action = "execute_plan";
        } else {
          // No plan to confirm - use AI to respond
          response = await callAI(message, conversationHistory, userContext);
        }
        break;
      }

      case "show_post": {
        if (!generatedPosts || generatedPosts.length === 0) {
          response = "I don't have any posts to show yet. Would you like me to create one? Just say 'write a post about [topic]' 📝";
        } else {
          const latestPost = generatedPosts[0];
          response = `Here's your latest post:\n\n---\n\n${latestPost.content}\n\n---\n\nWhat do you think? Would you like any changes? When would you like to post this?`;
        }
        break;
      }

      case "post_now": {
        if (!generatedPosts || generatedPosts.length === 0) {
          response = "I don't have any posts ready to publish. Would you like me to create one first?\n\nJust say 'write a post about [topic]' 📝";
        } else {
          response = "Got it! Posting to LinkedIn now... 🚀\n\nClick the **Post Now** button in the Generated Posts panel to confirm.";
          action = "post_now";
        }
        break;
      }

      case "schedule_post": {
        if (!generatedPosts || generatedPosts.length === 0) {
          response = "I don't have any posts to schedule. Would you like me to create one first?\n\nJust say 'write a post about [topic]' 📝";
        } else {
          const timeText = intent.data?.timeText || message;
          response = `Perfect! I'll schedule your post for ${timeText}. 📅\n\nClick the **Post Now** button to confirm and send it to the extension.`;
          action = "schedule_post";
        }
        break;
      }

      case "ask_time": {
        if (!generatedPosts || generatedPosts.length === 0) {
          response = "I don't have any posts ready. Would you like me to create one first?\n\nJust say 'write a post about [topic]' 📝";
        } else {
          response = `When would you like to post this?\n\nYou can say:\n• **"post it now"** or **"right now"** to publish immediately\n• **"post it at 3:30pm today"** to schedule for later\n• **"post it tomorrow at 2pm"** for next day\n\nOr just click the **Post Now** button to publish immediately.`;
        }
        break;
      }

      case "create_post": {
        const isSpecific = isSpecificTopic(message);
        console.log("📊 Topic specificity:", isSpecific ? "specific" : "vague");

        let enhancedPrompt = message;

        // If specific topic, add research
        if (isSpecific) {
          const research = await researchTopic(message, userContext);
          if (research) {
            enhancedPrompt = `${message}\n\n[LATEST RESEARCH INSIGHTS - Use these to make the post current and data-driven:]\n${research.insights}`;
          }
        }

        // Call real AI for intelligent response
        response = await callAI(enhancedPrompt, conversationHistory, userContext);

        // Extract post if AI created one
        const postContent = extractPostContent(response);
        if (postContent) {
          const imagePrompt = generateImagePromptFromPost(postContent);
          
          posts = [{
            id: `post-${Date.now()}`,
            content: postContent,
            suggestedTime: new Date().toISOString(),
            reasoning: "Generated by AI agent",
            scheduledDateTime: new Date().toISOString(),
            generateImage: false,
            imagePrompt: imagePrompt,
          }];
        }
        break;
      }

      case "conversation":
      default: {
        // For general conversation, use AI
        response = await callAI(message, conversationHistory, userContext);
        
        // Check if AI created a post in the response
        const postContent = extractPostContent(response);
        if (postContent) {
          const imagePrompt = generateImagePromptFromPost(postContent);
          
          posts = [{
            id: `post-${Date.now()}`,
            content: postContent,
            suggestedTime: new Date().toISOString(),
            reasoning: "Generated by AI agent",
            scheduledDateTime: new Date().toISOString(),
            generateImage: false,
            imagePrompt: imagePrompt,
          }];
        }
        break;
      }
    }

    return new Response(
      JSON.stringify({
        type: posts.length > 0 ? "posts_generated" : "message",
        message: response,
        posts,
        topic: null,
        action,
        planToConfirm,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("❌ Agent error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    return new Response(
      JSON.stringify({
        type: "message",
        message: `I encountered an error: ${errorMessage}\n\nPlease try again.`,
        posts: [],
        topic: null,
        action: null,
        error: errorMessage,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  }
});
