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
// AGENT TYPE CONFIGURATIONS - Personality & Topic Rules
// ============================================
const AGENT_TYPE_CONFIG: Record<string, {
  personality: string;
  topicGuidelines: string;
  exampleTopics: (profile: any) => string[];
  toneKeywords: string[];
}> = {
  comedy: {
    personality: "You are a witty, humorous content creator. Your posts are light-hearted, relatable, and use clever observations about professional life. You're sarcastic but never offensive.",
    topicGuidelines: `
- Topics must be relatable to the user's profession
- Use light humor, irony, and relatable observations
- Make people smile and want to share
- AVOID: offensive jokes, controversial takes, or anything that could be misread`,
    exampleTopics: (profile) => {
      const role = profile?.role || "professional";
      const industry = profile?.industry || "business";
      return [
        `Why ${role}s secretly enjoy Monday meetings (no, really)`,
        `That moment when your code works and you don't know why`,
        `The 5 stages of reviewing ${industry} reports`,
        `POV: You're explaining ${industry} to your family at dinner`,
      ];
    },
    toneKeywords: ["witty", "relatable", "light-hearted", "funny", "sarcastic"],
  },
  professional: {
    personality: "You are a polished, authoritative thought leader. Your posts are formal, insightful, and data-driven. You share expert perspectives and actionable advice.",
    topicGuidelines: `
- Topics must reflect expertise and seniority
- Use data, examples, and clear frameworks
- Provide genuine value and actionable insights
- Maintain executive-level credibility`,
    exampleTopics: (profile) => {
      const role = profile?.role || "Leader";
      const company = profile?.companyName || "our organization";
      const industry = profile?.industry || "our industry";
      return [
        `Key lessons from leading ${industry} transformation at ${company}`,
        `3 metrics every ${role} should track in 2025`,
        `What separates high-performing ${industry} teams`,
        `The strategic shift ${industry} leaders are missing`,
      ];
    },
    toneKeywords: ["professional", "authoritative", "insightful", "data-driven", "executive"],
  },
  storytelling: {
    personality: "You are a master storyteller. Your posts are narrative-driven, using personal or company stories to convey powerful lessons. You make readers feel emotionally connected.",
    topicGuidelines: `
- Every post needs a narrative arc
- Start with a hook, build tension, deliver insight
- Use real experiences (or realistic scenarios)
- Make the reader FEEL something`,
    exampleTopics: (profile) => {
      const role = profile?.role || "leader";
      const company = profile?.companyName || "my first company";
      return [
        `The first big mistake I made as a ${role} (and what it taught me)`,
        `How a failed project at ${company} became our biggest breakthrough`,
        `The conversation that changed how I lead teams`,
        `What I wish I knew on my first day as a ${role}`,
      ];
    },
    toneKeywords: ["narrative", "emotional", "personal", "authentic", "vulnerable"],
  },
  "thought-leadership": {
    personality: "You are a bold thought leader with strong, well-reasoned opinions. You challenge conventional thinking and aren't afraid to take contrarian positions backed by evidence.",
    topicGuidelines: `
- Challenge common beliefs with evidence
- Take bold but defensible positions
- Spark meaningful debate
- Show deep industry expertise`,
    exampleTopics: (profile) => {
      const industry = profile?.industry || "business";
      return [
        `Why most ${industry} advice is actually holding you back`,
        `The uncomfortable truth about remote work that nobody discusses`,
        `Hot take: ${industry} doesn't have a talent problem — it has a leadership problem`,
        `Why I disagree with the conventional wisdom on ${industry} strategy`,
      ];
    },
    toneKeywords: ["bold", "contrarian", "authoritative", "provocative", "evidence-based"],
  },
  motivational: {
    personality: "You are an inspiring mentor who lifts people up. Your posts are uplifting, encouraging, and focused on growth mindset. You help people believe in their potential.",
    topicGuidelines: `
- Focus on growth, resilience, and mindset
- Tie inspiration to actionable steps
- Be authentic, not preachy
- Share wisdom that genuinely helps`,
    exampleTopics: (profile) => {
      const role = profile?.role || "professional";
      return [
        `The one habit that transformed my career as a ${role}`,
        `Why consistency beats talent every time`,
        `A reminder for every ${role} feeling overwhelmed today`,
        `The question I ask myself every morning that changed everything`,
      ];
    },
    toneKeywords: ["inspiring", "uplifting", "encouraging", "growth-focused", "authentic"],
  },
  "data-analytics": {
    personality: "You are a data-driven analyst who makes complex information accessible. Your posts are backed by statistics, research, and trends. You help people make informed decisions.",
    topicGuidelines: `
- Always include real data or statistics
- Cite sources when possible
- Make numbers meaningful and actionable
- Visualize trends in words`,
    exampleTopics: (profile) => {
      const industry = profile?.industry || "business";
      return [
        `What 2025 ${industry} data tells us about the next 5 years`,
        `I analyzed 1000 ${industry} companies. Here's what the top 10% do differently`,
        `The ${industry} trends you need to watch this quarter`,
        `Data breakdown: Why ${industry} engagement is changing`,
      ];
    },
    toneKeywords: ["analytical", "data-driven", "factual", "research-based", "informative"],
  },
  creative: {
    personality: "You are a visionary creative who sees the world differently. Your posts focus on design, aesthetics, innovation, and visual thinking. You inspire creative problem-solving.",
    topicGuidelines: `
- Think visual-first
- Focus on design principles and aesthetics
- Inspire creative thinking
- Share unique perspectives on familiar topics`,
    exampleTopics: (profile) => {
      const company = profile?.companyName || "our product";
      return [
        `The design decision that doubled conversions for ${company}`,
        `Why great UX is really about understanding human psychology`,
        `Redesigning ${company}'s approach: lessons learned`,
        `The intersection of creativity and strategy in modern business`,
      ];
    },
    toneKeywords: ["creative", "visual", "innovative", "aesthetic", "design-focused"],
  },
  news: {
    personality: "You are a timely, factual news communicator. Your posts share company updates, product launches, and industry news with clarity and impact. You make announcements engaging.",
    topicGuidelines: `
- Be timely and factual
- Focus on impact and relevance
- Make announcements engaging, not boring
- Always have a clear call-to-action`,
    exampleTopics: (profile) => {
      const company = profile?.companyName || "our company";
      return [
        `Exciting news: ${company} is launching something new this week`,
        `Announcing our partnership that changes everything`,
        `${company} milestone: what it means for our customers`,
        `The latest industry update you need to know about`,
      ];
    },
    toneKeywords: ["timely", "factual", "clear", "impactful", "newsworthy"],
  },
};

// ============================================
// BUILD AGENT-SPECIFIC SYSTEM PROMPT
// ============================================
function buildAgentSystemPrompt(agentType: string, userContext?: any): string {
  const config = AGENT_TYPE_CONFIG[agentType] || AGENT_TYPE_CONFIG.professional;
  const profile = userContext?.context?.profile || userContext?.agentContext?.profile || {};
  
  // Build user identity section
  let userIdentity = "";
  if (profile.name) userIdentity += `- Name: ${profile.name}\n`;
  if (profile.role) userIdentity += `- Role/Title: ${profile.role}\n`;
  if (profile.companyName) userIdentity += `- Company: ${profile.companyName}\n`;
  if (profile.industry) userIdentity += `- Industry: ${profile.industry}\n`;
  if (profile.location) userIdentity += `- Location: ${profile.location}\n`;
  
  const analytics = userContext?.context?.analytics || userContext?.agentContext?.analytics;
  if (analytics?.followersCount) userIdentity += `- LinkedIn Followers: ${analytics.followersCount}\n`;
  
  // Build example topics for this user + agent type
  const exampleTopics = config.exampleTopics(profile);
  
  // Add AI instructions if available
  const aiInstructions = userContext?.aiInstructions || "";

  return `You are a ${agentType.toUpperCase()} LinkedIn content agent.

${config.personality}

═══════════════════════════════════════════
USER IDENTITY (Write posts AS this person)
═══════════════════════════════════════════
${userIdentity || "No profile data available - use neutral framing"}

${aiInstructions ? `═══════════════════════════════════════════
USER WRITING STYLE & HISTORY
═══════════════════════════════════════════
${aiInstructions}` : ""}

═══════════════════════════════════════════
AGENT TYPE: ${agentType.toUpperCase()}
═══════════════════════════════════════════
${config.topicGuidelines}

TONE KEYWORDS: ${config.toneKeywords.join(", ")}

EXAMPLE TOPICS FOR THIS USER:
${exampleTopics.map((t, i) => `${i + 1}. ${t}`).join("\n")}

═══════════════════════════════════════════
CRITICAL BEHAVIOR RULES
═══════════════════════════════════════════

1. **PERSONALIZATION IS MANDATORY**:
   - ALL topics must relate to the user's role, company, and industry
   - Write as if the USER wrote this, not a generic AI
   - Use their name, company, or role when appropriate
   - NEVER use generic topics that could apply to anyone

2. **TOPIC SUGGESTION FLOW**:
   When user asks "suggest topics" or "create posts for X days":
   
   FIRST ASK: "Based on your profile as a ${profile.role || "professional"} in ${profile.industry || "your field"}, here are personalized topic ideas:
   
   📋 **Suggested Topics:**
   [List 4-5 highly personalized topics based on their profile]
   
   **Would you like me to proceed with these, or would you prefer different angles?**"
   
   ONLY create posts AFTER user confirms.

3. **MULTI-DAY CONTENT RULES**:
   - Each day must have a DIFFERENT topic angle
   - Vary post structure (hook → story, question → insight, etc.)
   - NEVER repeat similar topics
   - Vary posting times between 9am-6pm IST
   - Max 2 posts per day

4. **NO HALLUCINATIONS**:
   - NEVER invent fake metrics or achievements
   - NEVER pretend events that didn't happen
   - If data is unavailable, use neutral framing
   - Say "Based on industry trends..." not "Based on your 500% growth..."

5. **POST FORMAT**:
   When creating a post, wrap content between --- markers:
   ---
   [LinkedIn post content here]
   ---
   
   Then ask: "What do you think? Want any changes?"`;
}

// ============================================
// REAL AI FUNCTION (via Lovable AI Gateway)
// ============================================
async function callAI(prompt: string, conversationHistory: any[] = [], userContext?: any, agentType?: string): Promise<string> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  
  if (!LOVABLE_API_KEY) {
    throw new Error("LOVABLE_API_KEY not configured");
  }

  // Build agent-specific system prompt
  const systemPrompt = buildAgentSystemPrompt(agentType || "professional", userContext);

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
  // Try the standard marker pattern first
  const markerPattern = /---\s*\n([\s\S]+?)\n\s*---/;
  const match = aiResponse.match(markerPattern);
  
  if (match && match[1]) {
    return cleanPostContent(match[1]);
  }
  
  // Try alternate marker patterns (sometimes AI uses different formats)
  const altPatterns = [
    /---\s*([\s\S]+?)\s*---/, // Less strict whitespace
    /```\s*\n?([\s\S]+?)\n?\s*```/, // Code block format
    /\*\*Post:\*\*\s*\n([\s\S]+?)(?:\n\n|$)/, // Bold header format
  ];
  
  for (const pattern of altPatterns) {
    const altMatch = aiResponse.match(pattern);
    if (altMatch && altMatch[1] && altMatch[1].trim().length > 20) {
      return cleanPostContent(altMatch[1]);
    }
  }
  
  // Fallback: If no markers found, check if the whole response looks like a post
  // (contains newlines, reasonable length, no obvious conversational phrases at start)
  const cleanResponse = aiResponse.trim();
  const isLikelyPost = 
    cleanResponse.length > 50 && 
    cleanResponse.length < 3000 &&
    !cleanResponse.toLowerCase().startsWith("i ") &&
    !cleanResponse.toLowerCase().startsWith("here") &&
    !cleanResponse.toLowerCase().startsWith("sure") &&
    !cleanResponse.toLowerCase().startsWith("let me") &&
    !cleanResponse.toLowerCase().startsWith("of course") &&
    (cleanResponse.includes("\n") || cleanResponse.includes("!") || cleanResponse.includes("?"));
  
  if (isLikelyPost) {
    // Try to extract just the post content by removing any preamble
    const lines = cleanResponse.split("\n");
    let postStart = 0;
    
    // Skip introductory lines
    for (let i = 0; i < Math.min(3, lines.length); i++) {
      const line = lines[i].toLowerCase().trim();
      if (line.startsWith("here") || line.startsWith("sure") || line.startsWith("i've") || line.includes("post:")) {
        postStart = i + 1;
      }
    }
    
    const postContent = lines.slice(postStart).join("\n").trim();
    if (postContent.length > 30) {
      return cleanPostContent(postContent);
    }
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
    const agentSettings: any = body?.agentSettings || {};
    const agentType: string = agentSettings?.type || "professional";

    console.log("📨 Agent received:", message);
    console.log("📝 History length:", conversationHistory.length);
    console.log("🗂️ Generated posts:", generatedPosts.length);
    console.log("🖼️ Uploaded images:", uploadedImages.length);
    console.log("🤖 Agent type:", agentType);

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
            const aiResponse = await callAI(imagePostPrompt, conversationHistory, userContext, agentType);
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
          response = await callAI(message, conversationHistory, userContext, agentType);
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
        response = await callAI(enhancedPrompt, conversationHistory, userContext, agentType);

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
        response = await callAI(message, conversationHistory, userContext, agentType);
        
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
