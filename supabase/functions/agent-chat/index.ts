import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface AgentSettings {
  type: string;
  tone: string;
  emojiLevel: number;
  postLength: string;
  voiceReference?: string;
}

interface UserContext {
  name?: string;
  industry?: string;
}

// Agent type specific prompts
const AGENT_TYPE_PROMPTS: Record<string, { personality: string; guidelines: string[] }> = {
  comedy: {
    personality: `You are a comedy content creator for LinkedIn. Your posts are witty, humorous but still professional. Use funny observations about work/business life.`,
    guidelines: ['Use emojis (3-5 per post)', 'Keep it light but not offensive', 'End with engaging questions']
  },
  professional: {
    personality: `You are a professional business content creator. Your posts are formal, data-driven, and industry-focused.`,
    guidelines: ['Minimal emojis', 'Include statistics when relevant', 'Use professional vocabulary']
  },
  storytelling: {
    personality: `You are a storytelling content creator. Your posts are narrative-driven with clear beginning, middle, end.`,
    guidelines: ['Start with a hook', 'Use short sentences for impact', 'End with lesson or reflection']
  },
  "thought-leadership": {
    personality: `You are a thought leader sharing expert insights. Your posts are forward-thinking and challenge conventional wisdom.`,
    guidelines: ['Lead with bold statements', 'Back up with reasoning', 'Invite discussion']
  },
  motivational: {
    personality: `You are a motivational content creator. Your posts are inspirational and focus on mindset and personal growth.`,
    guidelines: ['Use power words', 'Include calls to action', 'Emojis for emphasis']
  },
  "data-analytics": {
    personality: `You are a data-driven content creator. Your posts are statistics-heavy and quantitative.`,
    guidelines: ['Lead with numbers', 'Use data visualization emojis (📊📈)', 'Include percentages']
  },
  creative: {
    personality: `You are a creative design-focused content creator. Your posts focus on aesthetics and design thinking.`,
    guidelines: ['Use color emojis', 'Describe visual concepts', 'Suggest visual content']
  },
  news: {
    personality: `You are a company news/updates content creator. Your posts are announcement-focused and clear.`,
    guidelines: ['Start with announcement', 'Include key details', 'Thank the community']
  }
};

function getPostLengthGuideline(postLength: string): string {
  switch (postLength) {
    case "short": return "Keep posts under 100 words. Concise and punchy.";
    case "long": return "Posts should be 200-300 words. Detailed and comprehensive.";
    default: return "Posts should be 100-200 words. Well-balanced.";
  }
}

function getEmojiGuideline(level: number): string {
  if (level === 0) return "No emojis at all.";
  if (level === 1) return "Minimal emojis (1-2 per post).";
  if (level === 2) return "Moderate emojis (3-5 per post).";
  if (level === 3) return "Generous emojis (5-8 per post).";
  return "Heavy emoji usage throughout.";
}

function extractTopicFromMessage(message: string): string | null {
  const patterns = [
    /(?:about|on|regarding|for)\s+["']?([^"'\n.]+?)["']?(?:\.|$)/i,
    /["']([^"']+)["']/,
  ];

  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match?.[1]?.trim()) {
      return match[1].trim();
    }
  }

  // Clean up the message to extract topic
  const cleaned = message
    .replace(/^(create|generate|write|make|please|can you|could you|i want|i need)\s*/gi, "")
    .replace(/\s*(posts?|content|articles?|drafts?)\s*/gi, " ")
    .replace(/\s*(about|on|for|regarding)\s*/gi, " ")
    .replace(/\d+\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned.length > 2 ? cleaned : null;
}

function isPostGenerationRequest(message: string): boolean {
  const lower = message.toLowerCase();
  const triggers = ["create", "generate", "write", "make", "draft", "post about"];
  const hasTrigger = triggers.some(t => lower.includes(t));
  const mentionsPost = lower.includes("post") || lower.includes("content");
  
  // Also match "post about X" pattern
  if (/^(post|posts)\s+(about|on|regarding)\b/.test(lower)) return true;
  
  return hasTrigger || (hasTrigger && mentionsPost);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { message, history, agentSettings, userContext } = await req.json();

    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableApiKey) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const settings: AgentSettings = agentSettings || { type: "professional", tone: "conversational", emojiLevel: 2, postLength: "medium" };
    const agentConfig = AGENT_TYPE_PROMPTS[settings.type] || AGENT_TYPE_PROMPTS.professional;

    // Build system prompt - SIMPLE: only generate posts, never claim to post
    const systemPrompt = `You are a LinkedIn content creation assistant.

${agentConfig.personality}

${agentConfig.guidelines.map(g => `- ${g}`).join('\n')}

${getPostLengthGuideline(settings.postLength)}
${getEmojiGuideline(settings.emojiLevel)}

CRITICAL RULES:
1. When user asks to create/write/generate a post:
   - Generate the LinkedIn post content directly
   - Include relevant hashtags
   - The post should be ready to publish

2. When user says "post it" or "publish it":
   - Tell them: "Click the 'Post Now' button next to the post in the Generated Posts panel."
   - You DO NOT have the ability to post directly.

3. NEVER say:
   - "I will post it now"
   - "Posting to LinkedIn..."
   - "Your post is live"
   - Any LinkedIn URLs

4. Keep posts professional, engaging, and suitable for LinkedIn.
5. Do NOT mention LinkedBot or any brand names in posts - keep them neutral.
6. Write as if YOU are the person posting (first person).`;

    const messages = [
      { role: "system", content: systemPrompt },
      ...(history || []).slice(-10),
      { role: "user", content: message }
    ];

    // Check if this is a post generation request
    const isGeneration = isPostGenerationRequest(message);
    const topic = extractTopicFromMessage(message);

    // Call Lovable AI using the correct endpoint
    const response = await fetch("https://lovable.dev/api/llm/chat", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini",
        messages: messages,
        max_tokens: 2048,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("API Error:", response.status, errorText);
      throw new Error(`API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const assistantMessage = data.choices?.[0]?.message?.content || data.content || "I encountered an issue. Please try again.";

    // If this was a generation request, structure it as posts
    let responseType = "message";
    let posts: any[] = [];

    if (isGeneration && topic) {
      posts = [{
        id: `post-${Date.now()}`,
        content: assistantMessage,
        suggestedTime: getNextOptimalTime(),
        reasoning: `Generated ${settings.type} style post about "${topic}"`,
        scheduledDateTime: getNextOptimalTime(),
        generateImage: false,
        imagePrompt: `Professional LinkedIn visual for: ${topic}`,
      }];
      
      responseType = "posts_generated";
    }

    return new Response(
      JSON.stringify({
        type: responseType,
        message: assistantMessage,
        posts: posts,
        topic: topic,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Agent error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({
        type: "message",
        message: "I encountered an error. Please try again.",
        error: errorMessage,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});

function getNextOptimalTime(): string {
  const now = new Date();
  const scheduled = new Date(now);
  scheduled.setHours(9, 0, 0, 0);
  
  if (now.getHours() >= 9 || now.getDay() === 0 || now.getDay() === 6) {
    scheduled.setDate(scheduled.getDate() + 1);
  }
  
  while (scheduled.getDay() === 0 || scheduled.getDay() === 6) {
    scheduled.setDate(scheduled.getDate() + 1);
  }
  
  return scheduled.toISOString();
}
