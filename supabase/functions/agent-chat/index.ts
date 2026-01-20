import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ============================================
// TAVILY RESEARCH FUNCTION
// ============================================
async function researchTopic(topic: string): Promise<string | null> {
  const TAVILY_API_KEY = Deno.env.get("TAVILY_API_KEY");
  
  if (!TAVILY_API_KEY) {
    console.log("No Tavily API key, skipping research");
    return null;
  }

  try {
    console.log("🔍 Researching topic with Tavily:", topic);
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: TAVILY_API_KEY,
        query: `Latest trends and insights about ${topic} for LinkedIn professional post`,
        search_depth: "basic",
        max_results: 3,
      }),
    });

    const data = await response.json();
    
    if (data.results && data.results.length > 0) {
      const insights = data.results.map((r: any) => `- ${r.content?.substring(0, 200)}`).join("\n");
      console.log("✅ Research complete");
      return insights;
    }
  } catch (error) {
    console.error("Tavily research error:", error);
  }
  
  return null;
}

// ============================================
// REAL AI FUNCTION (via Lovable AI Gateway)
// ============================================
async function callAI(prompt: string, conversationHistory: any[] = []): Promise<string> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  
  if (!LOVABLE_API_KEY) {
    throw new Error("LOVABLE_API_KEY not configured");
  }

  const systemPrompt = `You are a professional LinkedIn content creator and posting assistant.

PERSONALITY:
- Conversational and friendly like ChatGPT
- Professional but approachable
- Ask clarifying questions when needed
- Provide specific, actionable advice

BEHAVIOR RULES:

1. WHEN USER GIVES VAGUE TOPIC (e.g., "write about cars", "post about technology"):
   - Ask for more details
   - Provide 3-4 example angles they could take
   - Be helpful and guide them
   - Example: "I'd love to write about cars! To make this impactful, are you interested in:
     • Electric vehicles and sustainability?
     • Autonomous driving technology?
     • Industry market trends?
     • Or something else specific?"

2. WHEN USER GIVES SPECIFIC TOPIC (e.g., "write about tech in cars", "post about AI in healthcare"):
   - Acknowledge you understand
   - Tell them you're creating the post
   - Use research data if provided
   - Create a professional LinkedIn post (150-250 words)
   - Format the post with clear paragraphs and bullet points
   - Include relevant hashtags
   - Wrap the post content between --- markers
   - Ask if they want changes
   - Ask when they want to post it

3. WHEN USER ASKS TO SEE/SHOW POST:
   - Show the complete post content in the chat
   - Format it nicely between --- markers
   - Ask if they want any changes

4. WHEN DISCUSSING POSTING TIME:
   - Understand natural language: "tomorrow at 2pm", "next Monday", "in 3 hours", "3:42pm today"
   - Confirm the schedule clearly
   - Tell them it will appear in "Scheduled Posts"

5. CONVERSATION STYLE:
   - Natural and flowing like ChatGPT
   - Remember context from conversation
   - Be helpful and proactive
   - Use emojis occasionally but professionally

POST FORMAT:
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
    // Remove more than 2 consecutive newlines
    .replace(/\n{3,}/g, '\n\n')
    // Remove leading/trailing whitespace
    .trim()
    // Remove excessive spaces at the start of lines
    .replace(/^[ \t]{3,}/gm, '')
    // Ensure consistent spacing around bullet points
    .replace(/\n•/g, '\n\n•')
    .replace(/•\s+/g, '• ')
    // Clean up multiple spaces
    .replace(/  +/g, ' ');
}

// ============================================
// GENERATE IMAGE PROMPT FROM POST CONTENT
// ============================================
function generateImagePromptFromPost(postContent: string): string {
  // Extract the first meaningful line
  const lines = postContent.split('\n').filter(line => line.trim().length > 0);
  const firstLine = lines[0]?.trim() || 'Professional business content';
  
  // Clean topic: remove emojis and special characters
  const cleanTopic = firstLine
    .replace(/[\u{1F300}-\u{1F9FF}]/gu, '') // Remove emojis
    .replace(/[^\w\s.,!?-]/g, '')
    .trim()
    .substring(0, 150);
  
  // Extract key themes
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
  // Look for content between --- markers
  const markerPattern = /---\s*\n([\s\S]+?)\n\s*---/;
  const match = aiResponse.match(markerPattern);
  
  if (match && match[1]) {
    // Clean the extracted content
    return cleanPostContent(match[1]);
  }
  
  return null;
}

// ============================================
// DETECT USER INTENT
// ============================================
function detectIntent(message: string): { type: string; data?: any } {
  const lower = message.toLowerCase().trim();

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
    /\d{1,2}:\d{2}\s*(am|pm)?/i, // 3:42, 3:42pm, 15:30
    /\d{1,2}\s*(am|pm)/i, // 3pm, 3 pm
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
  // More than 5 meaningful words = specific
  // Or contains specific keywords
  const specificIndicators = [
    /and\s+\w+/i, // "tech and AI"
    /in\s+\w+/i, // "AI in healthcare"
    /for\s+\w+/i, // "tips for developers"
    /about\s+\w+\s+\w+/i, // "about machine learning"
    /how\s+to/i,
    /\d+\s+(tips|ways|steps|reasons)/i,
  ];
  
  return words.length > 5 || specificIndicators.some(p => p.test(message));
}

// ============================================
// MAIN HANDLER
// ============================================
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const message: string = String(body?.message ?? "").trim();
    const conversationHistory: any[] = body?.history || [];
    const generatedPosts: any[] = body?.generatedPosts || [];

    console.log("📨 Agent received:", message);
    console.log("📝 History length:", conversationHistory.length);
    console.log("🗂️ Generated posts:", generatedPosts.length);

    if (!message) {
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

    const intent = detectIntent(message);
    console.log("🎯 Detected intent:", intent.type);

    let response = "";
    let posts: any[] = [];
    let action: string | null = null;

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
4. **Post immediately** - Say "post it now" or click the Post Now button

What would you like to create today?`;
        break;
      }

      case "cancel": {
        response = "No problem! Let me know when you'd like to create a LinkedIn post. Just say 'write a post about [topic]' when you're ready. 👍";
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
          // Extract time from message
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
          const research = await researchTopic(message);
          if (research) {
            enhancedPrompt = `${message}\n\n[LATEST RESEARCH INSIGHTS - Use these to make the post current and data-driven:]\n${research}`;
          }
        }

        // Call real AI for intelligent response
        response = await callAI(enhancedPrompt, conversationHistory);

        // Extract post if AI created one
        const postContent = extractPostContent(response);
        if (postContent) {
          // Generate image prompt from actual post content
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
        response = await callAI(message, conversationHistory);
        
        // Check if AI created a post in the response
        const postContent = extractPostContent(response);
        if (postContent) {
          // Generate image prompt from actual post content
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
