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

type AgentAction = "generate_posts" | "chat";

interface ParsedAgentRequest {
  action: AgentAction;
  topic: string | null;
  count: number;
}

function fallbackDetectPostGenerationIntent(message: string): boolean {
  const triggers = [
    "create",
    "generate",
    "write",
    "make",
    "draft",
    "schedule",
    "publish",
    "regenerate",
  ];
  const lower = message.toLowerCase();
  return triggers.some((t) => lower.includes(t)) &&
    (lower.includes("post") || lower.includes("posts") || lower.includes("content"));
}

function fallbackExtractCount(message: string): number {
  const explicitNumber = message.match(/(\d+)\s*(?:posts?|drafts?)/i);
  if (explicitNumber) {
    const n = Number.parseInt(explicitNumber[1], 10);
    return Number.isFinite(n) ? Math.min(Math.max(n, 1), 10) : 5;
  }

  const lower = message.toLowerCase();
  if (/(single|one)\s+(post|draft)/i.test(lower) || lower.includes("regenerate")) return 1;
  return 5;
}

function looksLikeNoTopic(topic: string): boolean {
  const lowered = topic.toLowerCase();
  if (topic.trim().length < 3) return true;
  if (/\b(show me|here|topic|please)\b/i.test(lowered)) return true;

  const stop = new Set([
    "the",
    "a",
    "an",
    "and",
    "show",
    "me",
    "here",
    "topic",
    "please",
    "create",
    "generate",
    "write",
    "make",
    "posts",
    "post",
    "content",
    "draft",
    "drafts",
  ]);
  const remaining = lowered
    .split(/\s+/)
    .map((t) => t.replace(/[^a-z0-9-]/g, ""))
    .filter(Boolean)
    .filter((t) => !stop.has(t));

  return remaining.length === 0;
}

function fallbackExtractTopic(message: string): string | null {
  const patterns = [
    /(?:about|on|regarding|for)\s+["']?([^"'\n.]+?)["']?(?:\.|$)/i,
    /(?:topic)\s*(?::|=)?\s*["']?([^"'\n.]+?)["']?(?:\.|$)/i,
    /["']([^"']+)["']/,
  ];

  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match?.[1]) {
      const t = match[1].trim();
      if (!looksLikeNoTopic(t)) return t;
    }
  }

  // Last resort: try to remove common filler and see if anything meaningful remains.
  const rough = message
    .replace(/^(create|generate|write|make|please|can you|could you|i want|i need)\s*/gi, "")
    .replace(/\s*(posts?|content|articles?|drafts?)\s*/gi, " ")
    .replace(/\s*(about|on|for|regarding)\s*/gi, " ")
    .replace(/\d+\s*/g, " ")
    .replace(/\b(show me|here|topic|please)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!rough || looksLikeNoTopic(rough)) return null;
  return rough;
}

async function parseAgentRequest(
  {
    message,
    history,
  }: {
    message: string;
    history: ChatMessage[];
  },
  apiKey: string,
): Promise<ParsedAgentRequest> {
  const fallback: ParsedAgentRequest = {
    action: fallbackDetectPostGenerationIntent(message) ? "generate_posts" : "chat",
    topic: fallbackExtractTopic(message),
    count: fallbackExtractCount(message),
  };

  // Keep it cheap: only parse with AI when the message *might* be asking for generation.
  if (fallback.action !== "generate_posts") return fallback;

  const recent = history.slice(-6).map((m) => `${m.role}: ${m.content}`).join("\n");

  try {
    const parseResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content:
              "You extract structured intent from user messages for a LinkedIn post generator. " +
              "If the user asks to generate/write/create posts, set action=generate_posts; otherwise action=chat. " +
              "Topic must be a short, clean phrase (e.g. 'AI trends', 'AI for recruiters'). " +
              "Remove filler like 'show me', 'here', 'topic'. If topic is missing/unclear, set topic=null. " +
              "Count must be 1-10; default 5 unless user clearly asks otherwise (or says 'single'/'regenerate' => 1).",
          },
          {
            role: "user",
            content: `Latest message:\n${message}\n\nRecent conversation:\n${recent}`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "parse_agent_request",
              description: "Parse the user's request into action, topic and count.",
              parameters: {
                type: "object",
                properties: {
                  action: { type: "string", enum: ["generate_posts", "chat"] },
                  topic: { type: ["string", "null"] },
                  count: { type: "integer", minimum: 1, maximum: 10 },
                },
                required: ["action", "topic", "count"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "parse_agent_request" } },
      }),
    });

    if (!parseResponse.ok) return fallback;

    const parseData = await parseResponse.json();
    const msg = parseData.choices?.[0]?.message;

    const argsText: string | undefined =
      msg?.tool_calls?.[0]?.function?.arguments ??
      msg?.function_call?.arguments;

    if (!argsText) return fallback;

    const parsed = JSON.parse(argsText) as ParsedAgentRequest;

    const count = Math.min(Math.max(Number(parsed.count ?? fallback.count), 1), 10);
    const topicRaw = typeof parsed.topic === "string" ? parsed.topic.trim() : null;
    const topic = topicRaw && !looksLikeNoTopic(topicRaw) ? topicRaw : null;

    return {
      action: parsed.action === "chat" ? "chat" : "generate_posts",
      topic,
      count,
    };
  } catch {
    return fallback;
  }
}

// Get emoji config based on level
function getEmojiConfig(level: number): string {
  switch (level) {
    case 0: return "Do not use any emojis at all";
    case 1: return "Use only 1-2 emojis very sparingly";
    case 2: return "Use 3-4 emojis moderately throughout";
    case 3: return "Use many emojis (5+) liberally and expressively";
    default: return "Use emojis moderately";
  }
}

// Get post length config
function getPostLengthConfig(length: string): string {
  switch (length) {
    case "short": return "50-100 words - punchy and concise";
    case "medium": return "100-200 words - balanced depth";
    case "long": return "200-300 words - detailed and comprehensive";
    default: return "100-200 words";
  }
}

// Get agent type description
function getAgentTypeDescription(type: string): string {
  const types: Record<string, string> = {
    "comedy": "Write with humor, wit, and entertaining observations. Use clever wordplay.",
    "professional": "Write formally with industry expertise. Focus on insights and value.",
    "storytelling": "Use narrative arcs, personal anecdotes, and emotional hooks.",
    "thought-leadership": "Share bold opinions, predictions, and contrarian viewpoints.",
    "motivational": "Be inspirational, uplifting, and encouraging. Share lessons learned.",
    "data-analytics": "Lead with statistics, research findings, and data-driven insights.",
    "creative": "Be artistic, visual-focused, and design-oriented.",
    "news": "Share timely updates, announcements, and industry news.",
  };
  return types[type] || types["professional"];
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

    const parsed = await parseAgentRequest({ message, history }, LOVABLE_API_KEY);

    const shouldGeneratePosts = parsed.action === "generate_posts";

    // If generating posts, do research first, then generate
    if (shouldGeneratePosts) {
      const topic = parsed.topic;
      const count = parsed.count;

      if (!topic) {
        return new Response(
          JSON.stringify({
            type: "message",
            message:
              "I can do that — what topic should the posts be about?\n\nExamples:\n• Create 5 posts about AI trends\n• Create 3 posts about AI tools for small business\n• Create 10 posts about recruiting with AI",
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
      
      console.log(`Generating ${count} posts about: ${topic}`);
      
      // Step 1: Research the topic using Gemini
      const researchPrompt = `You are a LinkedIn content researcher. Research the latest trends, news, and insights about: "${topic}"

Provide a research summary including:
1. Current trends and what's happening now
2. Key statistics or data points
3. Expert opinions or notable quotes
4. Controversial or discussion-worthy angles
5. Practical tips or actionable insights

Format as a concise research brief that can be used to write engaging LinkedIn posts.`;

      const researchResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "user", content: researchPrompt }
          ],
        }),
      });

      if (!researchResponse.ok) {
        const status = researchResponse.status;
        if (status === 429) {
          return new Response(JSON.stringify({ error: "Rate limits exceeded. Please wait a moment and try again." }), {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (status === 402) {
          return new Response(JSON.stringify({ error: "AI credits low. Please add credits in settings." }), {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        throw new Error(`Research failed: ${status}`);
      }

      const researchData = await researchResponse.json();
      const researchInsights = researchData.choices?.[0]?.message?.content || "";

      // Step 2: Generate posts using research
      const postGenerationPrompt = `Generate exactly ${count} unique, engaging LinkedIn posts about: "${topic}"

RESEARCH INSIGHTS TO USE:
${researchInsights}

USER CONTEXT (use ONLY if relevant to the topic):
- Industry: ${userContext.industry || 'Technology'}
${userContext.company ? `- Company: ${userContext.company}` : ''}
${userContext.background ? `- Background: ${userContext.background}` : ''}

AGENT STYLE REQUIREMENTS:
- Agent Type: ${agentSettings.type || 'professional'}
- Style Guide: ${getAgentTypeDescription(agentSettings.type)}
- Tone: ${agentSettings.tone || 'conversational'}
${agentSettings.voiceReference ? `- Voice Style: Write like ${agentSettings.voiceReference}` : ''}
- Emoji Usage: ${getEmojiConfig(agentSettings.emojiLevel)}
- Post Length: ${getPostLengthConfig(agentSettings.postLength)}

CRITICAL POST REQUIREMENTS:
1. Each post MUST be unique with a different angle/hook
2. Use the research insights to add value and credibility
3. Format properly for LinkedIn (use line breaks for readability)
4. Include 2-4 relevant hashtags at the end
5. End with a question or call-to-action to drive engagement
6. Make it feel authentic, not AI-generated
7. NEVER mention "LinkedBot" or any specific product name - write GENERIC posts that the user can personalize
8. Write as if YOU are the user sharing their own thoughts/insights - use first person "I", "we", "my experience"
9. Keep posts versatile so they work for any professional in the industry
10. DO NOT promote any specific company or tool unless the user explicitly mentioned it in the topic

POSTING TIMES - assign each post one of these optimal times:
- "morning" (8-10 AM) - Best for B2B, professional insights
- "lunch" (12-1 PM) - Good for quick tips, motivation
- "afternoon" (3-5 PM) - Best for thought-provoking content
- "evening" (6-8 PM) - Best for personal stories, reflections

Return ONLY a valid JSON array (no markdown, no explanation):
[
  {
    "content": "Full post text with line breaks and hashtags...",
    "suggestedTime": "morning",
    "reasoning": "Brief reason why this time is optimal for this post type"
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
            { 
              role: "system", 
              content: "You are a LinkedIn content expert. Generate posts in the exact JSON format requested. Return ONLY valid JSON array, no markdown code blocks." 
            },
            { role: "user", content: postGenerationPrompt }
          ],
        }),
      });

      if (!postsResponse.ok) {
        throw new Error(`Post generation failed: ${postsResponse.status}`);
      }

      const postsData = await postsResponse.json();
      let postsText = postsData.choices?.[0]?.message?.content || "[]";
      
      // Clean up markdown if present
      postsText = postsText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      
      // Parse posts JSON
      let posts = [];
      try {
        posts = JSON.parse(postsText);
      } catch (e) {
        console.error("Failed to parse posts:", e);
        const jsonMatch = postsText.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          try {
            posts = JSON.parse(jsonMatch[0]);
          } catch (e2) {
            console.error("Second parse failed:", e2);
            // Return error message
            return new Response(JSON.stringify({
              type: "message",
              message: "I had trouble generating the posts. Could you try rephrasing your request? For example: 'Create 5 posts about AI trends'"
            }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        }
      }

      // Validate posts array
      if (!Array.isArray(posts) || posts.length === 0) {
        return new Response(JSON.stringify({
          type: "message",
          message: "I couldn't generate posts for that topic. Please try a different topic or be more specific."
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Add scheduling info
      const now = new Date();
      const timeHours: Record<string, number> = {
        "morning": 9,
        "lunch": 12,
        "afternoon": 15,
        "evening": 18
      };

      posts = posts.map((post: any, index: number) => {
        const scheduledDate = new Date(now);
        scheduledDate.setDate(scheduledDate.getDate() + index + 1);
        
        const hours = timeHours[post.suggestedTime] || 9;
        scheduledDate.setHours(hours, 0, 0, 0);
        
        return {
          id: `post-${Date.now()}-${index}`,
          content: post.content || "",
          suggestedTime: post.suggestedTime || "morning",
          reasoning: post.reasoning || "Optimal time for professional content",
          scheduledDateTime: scheduledDate.toISOString(),
        };
      });

      // Success message
      const successMessage = `🎉 I've created ${posts.length} posts about "${topic}" based on the latest trends and insights!\n\nEach post is scheduled for an optimal time. You can:\n• Edit any post's content\n• Regenerate individual posts\n• Add AI-generated images\n• Adjust scheduling times\n\nReview your posts on the right and click "Schedule All" when ready!`;

      return new Response(JSON.stringify({
        type: "posts_generated",
        message: successMessage,
        posts,
        topic,
        research: researchInsights.substring(0, 500) + "...",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Normal conversation (not generating posts)
    const conversationPrompt = `You are a friendly, helpful LinkedIn content assistant.

USER CONTEXT:
- Name: ${userContext.name || 'there'}
${userContext.industry ? `- Industry: ${userContext.industry}` : ''}
${userContext.company ? `- Company: ${userContext.company}` : ''}

YOUR PERSONALITY:
- Friendly and conversational, not robotic
- Use occasional emojis but don't overdo it
- Be concise but helpful
- Always guide users toward creating content

CRITICAL RULES:
1. NEVER mention "LinkedBot" or any specific product name
2. You are a NEUTRAL assistant helping the user create posts for THEIR OWN LinkedIn profile
3. Keep suggestions generic and versatile
4. Focus on the USER's ideas and topics, not promoting any tool

CONVERSATION RULES:
1. If user says "hi", "hello", "hey" → Greet warmly, introduce yourself briefly, ask what they'd like to post about
2. If user asks what you can do → List your capabilities clearly
3. If user asks for topic ideas → Suggest 4-5 trending topics relevant to their industry
4. If user seems unsure → Ask clarifying questions to help them decide
5. Keep responses concise (2-4 short paragraphs max)

NEVER generate posts in conversation mode. Only provide posts when user explicitly asks with words like "create", "generate", "write" posts.

Recent conversation:
${history.slice(-4).map(m => `${m.role}: ${m.content}`).join('\n')}

User's message: "${message}"

Respond naturally:`;

    const chatResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "user", content: conversationPrompt }
        ],
      }),
    });

    if (!chatResponse.ok) {
      const status = chatResponse.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limits exceeded. Please wait a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits low. Please add credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`Chat failed: ${status}`);
    }

    const chatData = await chatResponse.json();
    const assistantMessage = chatData.choices?.[0]?.message?.content || 
      "Hey! 👋 I'm here to help you create amazing LinkedIn posts. What would you like to post about today?";

    return new Response(JSON.stringify({
      type: "message",
      message: assistantMessage,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Agent chat error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Something went wrong. Please try again." 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
