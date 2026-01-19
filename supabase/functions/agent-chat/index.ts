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
  company?: string;
  background?: string;
}

// Helper to detect if user wants to generate posts
function detectPostGenerationIntent(message: string): boolean {
  const triggers = [
    'create', 'generate', 'write', 'make', 'post about',
    'posts about', 'schedule', 'publish', 'posts on', 'posts for',
    'need posts', 'want posts', 'give me posts', 'prepare posts'
  ];
  const lowerMessage = message.toLowerCase();
  return triggers.some(t => lowerMessage.includes(t));
}

// Extract topic from message
function extractTopic(message: string): string {
  // Try common patterns
  const patterns = [
    /(?:about|on|regarding|for)\s+["']?([^"'\n.]+?)["']?(?:\s+for|\s+in|\s+on|\.|$)/i,
    /(?:posts?|content)\s+(?:about|on)\s+["']?([^"'\n.]+?)["']?/i,
    /["']([^"']+)["']/,
  ];
  
  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  
  // Fallback: return the message after removing command words
  return message
    .replace(/^(create|generate|write|make|please|can you|could you|i want|i need)\s*/gi, '')
    .replace(/\s*(posts?|content|articles?)\s*/gi, ' ')
    .replace(/\s*(about|on|for|regarding)\s*/gi, ' ')
    .replace(/\d+\s*/g, '')
    .trim() || message;
}

// Extract count from message
function extractCount(message: string): number {
  const match = message.match(/(\d+)\s*posts?/i);
  return match ? Math.min(parseInt(match[1]), 10) : 5;
}

// Get emoji config based on level
function getEmojiConfig(level: number): string {
  switch (level) {
    case 0: return "Do not use any emojis";
    case 1: return "Use 1-2 emojis sparingly";
    case 2: return "Use 3-5 emojis moderately";
    case 3: return "Use many emojis (5+) liberally";
    default: return "Use emojis moderately";
  }
}

// Get post length config
function getPostLengthConfig(length: string): string {
  switch (length) {
    case "short": return "Keep posts short (50-100 words)";
    case "medium": return "Write medium-length posts (100-200 words)";
    case "long": return "Write longer, detailed posts (200-300 words)";
    default: return "Write medium-length posts (100-200 words)";
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, history, agentSettings, userContext } = await req.json() as {
      message: string;
      history: ChatMessage[];
      agentSettings: AgentSettings;
      userContext: UserContext;
    };

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const shouldGeneratePosts = detectPostGenerationIntent(message);
    
    // Build conversational system prompt
    const systemPrompt = `You are a friendly LinkedIn posting assistant for LinkedBot.

User Context:
- Name: ${userContext.name || 'User'}
- Industry: ${userContext.industry || 'Technology'}
- Company: ${userContext.company || 'Personal brand'}
- Background: ${userContext.background || 'Professional'}

Agent Settings:
- Type: ${agentSettings.type || 'professional'}
- Tone: ${agentSettings.tone || 'conversational'}
- Voice Reference: ${agentSettings.voiceReference || 'Professional and engaging'}

Your Role:
1. Have natural, friendly conversations
2. Help users decide what to post about
3. Only generate posts when explicitly asked
4. Suggest trending topics in their industry
5. Be casual and helpful, not robotic

IMPORTANT RULES:
- If user says "hi", "hello", "hey" → greet them warmly and ask how you can help
- If user asks "what can you do" → explain your capabilities
- If user asks for topic suggestions → suggest 3-5 relevant topics for their industry
- Keep tone friendly, not too formal
- Use emojis occasionally but not excessively
- Ask clarifying questions when needed

${shouldGeneratePosts ? `
The user wants to generate posts. Acknowledge their request enthusiastically and let them know you'll research the topic and create posts for them. Mention that you're analyzing trends and will suggest optimal posting times.
` : `
The user is having a conversation. Respond naturally and helpfully. Do NOT assume they want posts unless they explicitly ask.
`}`;

    // Build messages for chat
    const messages = [
      { role: "system", content: systemPrompt },
      ...history.map(m => ({ role: m.role, content: m.content })),
      { role: "user", content: message }
    ];

    // Call Lovable AI for chat response
    const chatResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages,
      }),
    });

    if (!chatResponse.ok) {
      if (chatResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (chatResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required, please add credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${chatResponse.status}`);
    }

    const chatData = await chatResponse.json();
    const assistantMessage = chatData.choices?.[0]?.message?.content || "I'm here to help!";

    // If generating posts, create them
    if (shouldGeneratePosts) {
      const topic = extractTopic(message);
      const count = extractCount(message);
      
      const postGenerationPrompt = `Generate exactly ${count} engaging LinkedIn posts about: ${topic}

User Context:
- Industry: ${userContext.industry || 'Technology'}
- Company: ${userContext.company || 'Personal brand'}
- Background: ${userContext.background || 'Professional'}

Agent Settings:
- Type: ${agentSettings.type || 'professional'} (match this style)
- Tone: ${agentSettings.tone || 'conversational'}
${agentSettings.voiceReference ? `- Voice Style: ${agentSettings.voiceReference}` : ''}
- ${getEmojiConfig(agentSettings.emojiLevel)}
- ${getPostLengthConfig(agentSettings.postLength)}

Requirements:
1. Make posts engaging, valuable, and authentic
2. Match the specified tone and style exactly
3. Include 2-4 relevant hashtags per post
4. Format properly for LinkedIn (use line breaks, spacing)
5. Each post should have a different angle/hook
6. Include a call-to-action or question to drive engagement

Return ONLY a valid JSON array with this exact structure (no markdown, no explanation):
[
  {
    "content": "Full post text with hashtags included...",
    "suggestedTime": "morning",
    "reasoning": "Brief reason why this time is best for this topic"
  }
]`;

      const postsResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: "You are a LinkedIn content expert. Generate posts in the exact JSON format requested. Return ONLY valid JSON, no markdown." },
            { role: "user", content: postGenerationPrompt }
          ],
        }),
      });

      if (!postsResponse.ok) {
        throw new Error("Failed to generate posts");
      }

      const postsData = await postsResponse.json();
      const postsText = postsData.choices?.[0]?.message?.content || "[]";
      
      // Parse posts JSON
      let posts = [];
      try {
        // Clean up markdown if present
        const cleanedText = postsText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        posts = JSON.parse(cleanedText);
      } catch (e) {
        console.error("Failed to parse posts:", e, postsText);
        // Try to extract JSON array from response
        const jsonMatch = postsText.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          try {
            posts = JSON.parse(jsonMatch[0]);
          } catch (e2) {
            console.error("Second parse attempt failed:", e2);
          }
        }
      }

      // Add scheduling info
      const now = new Date();
      posts = posts.map((post: any, index: number) => {
        const scheduledDate = new Date(now);
        scheduledDate.setDate(scheduledDate.getDate() + index + 1);
        
        let hours = 9; // default morning
        if (post.suggestedTime === 'afternoon') hours = 14;
        if (post.suggestedTime === 'evening') hours = 18;
        
        scheduledDate.setHours(hours, 0, 0, 0);
        
        return {
          ...post,
          scheduledDateTime: scheduledDate.toISOString(),
          id: `post-${Date.now()}-${index}`,
        };
      });

      return new Response(JSON.stringify({
        type: "posts_generated",
        message: assistantMessage,
        posts,
        topic,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Normal conversation
    return new Response(JSON.stringify({
      type: "message",
      message: assistantMessage,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Agent chat error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Failed to process request" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
