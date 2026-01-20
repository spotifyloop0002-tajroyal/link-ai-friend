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

type AgentAction = "generate_posts" | "chat" | "schedule_post" | "post_now";

interface ParsedAgentRequest {
  action: AgentAction;
  topic: string | null;
  count: number;
  scheduledTime?: string; // ISO string for scheduled time
}

// ========================================
// AGENT TYPE PROMPTS - Detailed personality for each type
// ========================================
const AGENT_TYPE_PROMPTS: Record<string, { personality: string; guidelines: string[] }> = {
  comedy: {
    personality: `You are a comedy content creator for LinkedIn. Your posts are:
- Witty and humorous but still professional
- Use funny observations about work/business life
- Self-deprecating humor when appropriate
- Relatable situations that make people smile
- Light-hearted takes on serious topics
- Include jokes, puns, or funny analogies

Tone: Playful, amusing, engaging
Goal: Make people laugh while still providing value`,
    guidelines: [
      'Use emojis frequently (3-5 per post)',
      'Keep it light but not offensive',
      'Relate humor to professional context',
      'End with engaging questions'
    ]
  },
  
  professional: {
    personality: `You are a professional business content creator. Your posts are:
- Formal and authoritative
- Data-driven with facts and statistics
- Industry-focused insights
- Thought-provoking analysis
- Educational and informative
- Strategic thinking

Tone: Professional, knowledgeable, credible
Goal: Establish expertise and thought leadership`,
    guidelines: [
      'Minimal or no emojis',
      'Include statistics and data when relevant',
      'Cite sources when appropriate',
      'Use professional vocabulary'
    ]
  },
  
  storytelling: {
    personality: `You are a storytelling content creator. Your posts are:
- Narrative-driven with clear beginning, middle, end
- Personal experiences and lessons learned
- Emotional and relatable
- Use vivid descriptions
- Character-focused (you, team members, clients)
- Share failures, challenges, and victories

Tone: Personal, authentic, engaging
Goal: Connect emotionally through stories`,
    guidelines: [
      'Start with a hook',
      'Use short sentences for impact',
      'Include dialogue when relevant',
      'End with lesson or reflection'
    ]
  },
  
  "thought-leadership": {
    personality: `You are a thought leader sharing expert insights. Your posts are:
- Forward-thinking and visionary
- Challenge conventional wisdom
- Predict trends and future scenarios
- Based on deep expertise
- Provoke discussion and debate
- Offer unique perspectives

Tone: Authoritative, visionary, provocative
Goal: Establish as industry expert and influencer`,
    guidelines: [
      'Lead with bold statements',
      'Back up with reasoning',
      'Challenge status quo',
      'Invite discussion'
    ]
  },
  
  motivational: {
    personality: `You are a motivational content creator. Your posts are:
- Inspirational and uplifting
- Focus on mindset and personal growth
- Encourage action and perseverance
- Share wisdom and life lessons
- Energetic and passionate
- Empowering language

Tone: Energetic, inspiring, encouraging
Goal: Motivate audience to take action`,
    guidelines: [
      'Use power words (achieve, conquer, unleash)',
      'Include calls to action',
      'Emojis for emphasis',
      'End with questions for engagement'
    ]
  },
  
  "data-analytics": {
    personality: `You are a data-driven content creator. Your posts are:
- Statistics-heavy and quantitative
- Charts, graphs, and visualizations descriptions
- Industry reports and surveys
- Trend analysis with numbers
- Research-backed insights
- Comparative data points

Tone: Analytical, factual, informative
Goal: Inform with data and insights`,
    guidelines: [
      'Lead with numbers',
      'Use data visualization emojis (📊📈)',
      'Cite sources',
      'Include percentages and statistics'
    ]
  },
  
  creative: {
    personality: `You are a creative design-focused content creator. Your posts are:
- Visually descriptive
- Focus on aesthetics and design
- Creative process insights
- Before/after transformations
- Design principles and trends
- Visual storytelling

Tone: Creative, artistic, inspiring
Goal: Showcase creativity and design thinking`,
    guidelines: [
      'Use color emojis',
      'Describe visual concepts',
      'Reference design examples',
      'Suggest visual content'
    ]
  },
  
  news: {
    personality: `You are a company news/updates content creator. Your posts are:
- Announcement-focused
- Clear and concise
- Newsworthy information
- Milestones and achievements
- Product launches and updates
- Team announcements

Tone: Professional, exciting, informative
Goal: Share news effectively`,
    guidelines: [
      'Start with announcement',
      'Include key details',
      'Use celebration emojis',
      'Thank the community'
    ]
  }
};

// ========================================
// VOICE REFERENCE PROFILES - Famous figures' communication styles
// ========================================
const FAMOUS_VOICE_PROFILES: Record<string, {
  tone_adjectives: string[];
  sentence_style: string;
  vocabulary: string;
  common_phrases: string[];
  emotional_tone: string;
  example: string;
}> = {
  'elon musk': {
    tone_adjectives: ['bold', 'direct', 'visionary', 'irreverent'],
    sentence_style: 'Short, punchy, often fragmented sentences',
    vocabulary: 'Technical but simple, first-principles thinking',
    common_phrases: ['fundamental', 'obviously', 'the thing is', 'literally'],
    emotional_tone: 'Confident, slightly provocative, passionate about mission',
    example: 'Physics says it\'s possible. Engineering says it\'s hard. Economics says it\'s worth it. Let\'s do it.'
  },
  
  'gary vaynerchuk': {
    tone_adjectives: ['energetic', 'real', 'aggressive', 'authentic'],
    sentence_style: 'Rapid-fire, conversational, lots of emphasis',
    vocabulary: 'Street-smart, blunt, contemporary slang',
    common_phrases: ['listen', 'the reality is', 'you need to understand', 'bro'],
    emotional_tone: 'Intense, passionate, no-nonsense',
    example: 'Listen. You\'re worried about what people think? NOBODY IS THINKING ABOUT YOU. They\'re worried about themselves. So go execute.'
  },
  
  'simon sinek': {
    tone_adjectives: ['thoughtful', 'inspiring', 'philosophical', 'calm'],
    sentence_style: 'Measured, clear, builds to insights',
    vocabulary: 'Simple but profound, metaphor-rich',
    common_phrases: ['the thing is', 'it turns out', 'here\'s the thing', 'start with why'],
    emotional_tone: 'Warm, inspiring, introspective',
    example: 'People don\'t buy what you do. They buy why you do it. And what you do simply proves what you believe.'
  },
  
  'sheryl sandberg': {
    tone_adjectives: ['professional', 'empowering', 'data-driven', 'warm'],
    sentence_style: 'Clear, structured, persuasive',
    vocabulary: 'Business-focused, empowerment language',
    common_phrases: ['research shows', 'it\'s important to', 'we need to', 'lean in'],
    emotional_tone: 'Confident but approachable, encouraging',
    example: 'We cannot change what we are not aware of, and once we are aware, we cannot help but change.'
  },
  
  'virat kohli': {
    tone_adjectives: ['passionate', 'aggressive', 'motivational', 'intense'],
    sentence_style: 'Direct, powerful, emphatic',
    vocabulary: 'Sports metaphors, victory language, determination',
    common_phrases: ['give your 100%', 'never give up', 'believe in yourself', 'chase your dreams'],
    emotional_tone: 'Fiery, determined, championship mentality',
    example: 'Self-belief and hard work will always earn you success. Never settle for anything less than your best.'
  },
  
  'naval ravikant': {
    tone_adjectives: ['philosophical', 'minimalist', 'wise', 'contrarian'],
    sentence_style: 'Aphoristic, tweet-like, dense with meaning',
    vocabulary: 'Philosophical, startup/investing terms, wisdom',
    common_phrases: ['specific knowledge', 'leverage', 'the way to get rich'],
    emotional_tone: 'Calm, detached, philosophical',
    example: 'Seek wealth, not money or status. Wealth is having assets that earn while you sleep.'
  },
  
  'brené brown': {
    tone_adjectives: ['vulnerable', 'empathetic', 'research-driven', 'warm'],
    sentence_style: 'Conversational, story-driven, emotionally resonant',
    vocabulary: 'Psychology terms made accessible, emotional language',
    common_phrases: ['vulnerability is', 'shame resilience', 'wholehearted', 'courage'],
    emotional_tone: 'Warm, vulnerable, encouraging',
    example: 'Vulnerability is not winning or losing; it\'s having the courage to show up when you can\'t control the outcome.'
  },
  
  'steve jobs': {
    tone_adjectives: ['visionary', 'perfectionist', 'inspirational', 'demanding'],
    sentence_style: 'Simple, dramatic pauses, building to revelation',
    vocabulary: 'Design-focused, revolutionary, simple words',
    common_phrases: ['one more thing', 'insanely great', 'think different', 'it just works'],
    emotional_tone: 'Passionate, dramatic, product-obsessed',
    example: 'Design is not just what it looks like and feels like. Design is how it works.'
  },
  
  'oprah winfrey': {
    tone_adjectives: ['empathetic', 'uplifting', 'authentic', 'spiritual'],
    sentence_style: 'Personal, conversational, builds connection',
    vocabulary: 'Accessible, emotional, self-help focused',
    common_phrases: ['your truth', 'live your best life', 'aha moment', 'what I know for sure'],
    emotional_tone: 'Warm, encouraging, deeply personal',
    example: 'Turn your wounds into wisdom. What I know for sure is that speaking your truth is the most powerful tool we all have.'
  },
  
  'richard branson': {
    tone_adjectives: ['adventurous', 'fun', 'unconventional', 'optimistic'],
    sentence_style: 'Light, energetic, story-driven',
    vocabulary: 'Adventure terms, fun, business with personality',
    common_phrases: ['screw it, let\'s do it', 'business should be fun', 'adventure'],
    emotional_tone: 'Playful, optimistic, risk-embracing',
    example: 'Business opportunities are like buses, there\'s always another one coming. Screw it, let\'s do it!'
  }
};

// ========================================
// HELPER FUNCTIONS
// ========================================

function fallbackDetectPostGenerationIntent(message: string): boolean {
  const lower = message.toLowerCase().trim();

  // Many users say "post about X" to mean "create a post about X".
  // Treat that as content generation (NOT publishing permission).
  if (/^(post|posts)\s+(about|on|regarding)\b/.test(lower)) return true;

  const triggers = ["create", "generate", "write", "make", "draft", "regenerate"];
  const hasTrigger = triggers.some((t) => lower.includes(t));
  const mentionsPost =
    lower.includes("post") || lower.includes("posts") || lower.includes("content");

  return hasTrigger && mentionsPost;
}

function detectPostingIntent(message: string): boolean {
  const lower = message.toLowerCase().trim();

  // Avoid false positives where user is asking for content ideas ("post about X")
  // or asking for a link ("post link?").
  if (/^(post|posts)\s+(about|on|regarding)\b/.test(lower)) return false;
  if (/\bpost\s+link\b/.test(lower)) return false;

  // Detect explicit posting permission only (not generic "post").
  return (
    /\bpost\s+(it|this)\b/.test(lower) ||
    /\bpost\s*now\b/.test(lower) ||
    /\bpublish(\s+(it|this))?\b/.test(lower) ||
    /\bschedule(\s+(it|this))?\b/.test(lower) ||
    /\bgo\s+ahead\b/.test(lower)
  );
}

function detectPostNowIntent(message: string): boolean {
  const lower = message.toLowerCase().trim();
  return (
    /\bpost\s*(it\s*)?now\b/.test(lower) ||
    /\bpublish\s*(it\s*)?now\b/.test(lower)
  );
}

function parseScheduleTime(message: string): string | null {
  // Match patterns like "12:32 am", "3pm", "9:00 AM", "today at 6 PM", "tomorrow morning"
  const timeMatch = message.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i);
  if (timeMatch) {
    let hours = Number.parseInt(timeMatch[1], 10);
    const minutes = Number.parseInt(timeMatch[2] ?? "0", 10);
    const ampm = timeMatch[3].toLowerCase();
    
    if (ampm === "pm" && hours < 12) hours += 12;
    if (ampm === "am" && hours === 12) hours = 0;
    
    const now = new Date();
    const scheduled = new Date(now);
    scheduled.setHours(hours, minutes, 0, 0);
    
    // If time has passed today, schedule for tomorrow
    if (scheduled.getTime() <= now.getTime()) {
      scheduled.setDate(scheduled.getDate() + 1);
    }
    
    // Check for "tomorrow" keyword
    if (/\btomorrow\b/i.test(message)) {
      scheduled.setDate(scheduled.getDate() + 1);
    }
    
    return scheduled.toISOString();
  }
  
  // Handle relative times like "tomorrow morning", "tomorrow at 9"
  if (/\btomorrow\s*(morning)?\b/i.test(message)) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0); // Default to 9 AM
    return tomorrow.toISOString();
  }
  
  return null;
}

function getNextOptimalLinkedInTime(): string {
  const now = new Date();
  const scheduled = new Date(now);
  
  // Find next weekday 9 AM
  scheduled.setHours(9, 0, 0, 0);
  
  // If it's past 9 AM or weekend, move to next optimal slot
  if (now.getHours() >= 9 || now.getDay() === 0 || now.getDay() === 6) {
    scheduled.setDate(scheduled.getDate() + 1);
  }
  
  // Skip weekends
  while (scheduled.getDay() === 0 || scheduled.getDay() === 6) {
    scheduled.setDate(scheduled.getDate() + 1);
  }
  
  return scheduled.toISOString();
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
    "the", "a", "an", "and", "show", "me", "here", "topic", "please",
    "create", "generate", "write", "make", "posts", "post", "content", "draft", "drafts",
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
  { message, history }: { message: string; history: ChatMessage[] },
  apiKey: string,
): Promise<ParsedAgentRequest> {
  // Check for scheduling commands with time
  const scheduledTime = parseScheduleTime(message);
  if (scheduledTime && detectPostingIntent(message)) {
    return {
      action: "schedule_post",
      topic: null,
      count: 1,
      scheduledTime: scheduledTime,
    };
  }

  const fallback: ParsedAgentRequest = {
    action: fallbackDetectPostGenerationIntent(message) ? "generate_posts" : "chat",
    topic: fallbackExtractTopic(message),
    count: fallbackExtractCount(message),
  };

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

function getEmojiConfig(level: number): string {
  switch (level) {
    case 0: return "Do not use any emojis at all";
    case 1: return "Use only 1-2 emojis very sparingly";
    case 2: return "Use 3-4 emojis moderately throughout";
    case 3: return "Use many emojis (5+) liberally and expressively";
    default: return "Use emojis moderately";
  }
}

function getPostLengthConfig(length: string): string {
  switch (length) {
    case "short": return "50-100 words - punchy and concise";
    case "medium": return "100-200 words - balanced depth";
    case "long": return "200-300 words - detailed and comprehensive";
    default: return "100-200 words";
  }
}

function getAgentTypePrompt(type: string): { personality: string; guidelines: string[] } {
  const normalizedType = type.toLowerCase().replace(/\s+/g, '-');
  return AGENT_TYPE_PROMPTS[normalizedType] || AGENT_TYPE_PROMPTS["professional"];
}

function getVoiceProfile(voiceReference: string | undefined): typeof FAMOUS_VOICE_PROFILES[string] | null {
  if (!voiceReference) return null;
  
  const normalized = voiceReference.toLowerCase().trim();
  
  // Check for exact match
  if (FAMOUS_VOICE_PROFILES[normalized]) {
    return FAMOUS_VOICE_PROFILES[normalized];
  }
  
  // Check for partial match
  for (const [name, profile] of Object.entries(FAMOUS_VOICE_PROFILES)) {
    if (normalized.includes(name) || name.includes(normalized)) {
      return profile;
    }
  }
  
  return null;
}

function buildVoiceReferencePrompt(voiceReference: string, profile: typeof FAMOUS_VOICE_PROFILES[string]): string {
  return `
IMPORTANT: Mimic the communication style of ${voiceReference}

Voice Profile:
- Tone: ${profile.tone_adjectives.join(', ')}
- Sentence Style: ${profile.sentence_style}
- Vocabulary: ${profile.vocabulary}
- Common Phrases: ${profile.common_phrases.join(', ')}
- Emotional Tone: ${profile.emotional_tone}

Example of their style:
"${profile.example}"

Write in THIS style while maintaining the agent personality.`;
}

// ========================================
// MAIN HANDLER
// ========================================

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

    // ========================================
    // LINKEDBOT POSTING LOGIC
    // ========================================
    
    // Check if user is giving explicit posting permission
    if (detectPostingIntent(message)) {
      // Check for "post now" intent
      if (detectPostNowIntent(message)) {
        return new Response(JSON.stringify({
          type: "post_now",
          message: "✅ Posting now.\n\nI'll take care of the rest.",
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      // Try to parse a specific time from the message
      const scheduledTime = parseScheduleTime(message);
      
      if (scheduledTime) {
        const scheduledDate = new Date(scheduledTime);
        const formattedTime = scheduledDate.toLocaleTimeString("en-US", { 
          hour: "numeric", 
          minute: "2-digit", 
          hour12: true 
        });
        const formattedDate = scheduledDate.toLocaleDateString("en-US", { 
          weekday: "long", 
          month: "short", 
          day: "numeric" 
        });
        
        return new Response(JSON.stringify({
          type: "schedule_post",
          message: `✅ Your post is scheduled for ${formattedTime} on ${formattedDate}.\n\nI'll take care of the rest.`,
          scheduledTime: scheduledTime,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      // No time specified - ask ONE short follow-up question
      return new Response(JSON.stringify({
        type: "ask_schedule",
        message: "When should I post this? (e.g., today at 6 PM or tomorrow morning)",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    // Handle schedule_post action from parseAgentRequest (for backwards compatibility)
    if (parsed.action === "schedule_post" && parsed.scheduledTime) {
      const scheduledDate = new Date(parsed.scheduledTime);
      const formattedTime = scheduledDate.toLocaleTimeString("en-US", { 
        hour: "numeric", 
        minute: "2-digit", 
        hour12: true 
      });
      const formattedDate = scheduledDate.toLocaleDateString("en-US", { 
        weekday: "long", 
        month: "short", 
        day: "numeric" 
      });
      
      return new Response(JSON.stringify({
        type: "schedule_post",
        message: `✅ Your post is scheduled for ${formattedTime} on ${formattedDate}.\n\nI'll take care of the rest.`,
        scheduledTime: parsed.scheduledTime,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
      
      // Get agent type personality
      const agentTypeConfig = getAgentTypePrompt(agentSettings.type);
      
      // Get voice profile if provided
      const voiceProfile = getVoiceProfile(agentSettings.voiceReference);
      
      // Step 1: Research the topic
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
          messages: [{ role: "user", content: researchPrompt }],
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

      // Step 2: Build comprehensive post generation prompt
      const voicePromptSection = voiceProfile && agentSettings.voiceReference 
        ? buildVoiceReferencePrompt(agentSettings.voiceReference, voiceProfile)
        : "";

      const postGenerationPrompt = `Generate exactly ${count} unique, engaging LinkedIn posts about: "${topic}"

=== AGENT PERSONALITY ===
${agentTypeConfig.personality}

Guidelines for this agent type:
${agentTypeConfig.guidelines.map(g => `• ${g}`).join('\n')}

${voicePromptSection}

=== RESEARCH INSIGHTS TO USE ===
${researchInsights}

=== USER CONTEXT (use if relevant) ===
- Industry: ${userContext.industry || 'Technology'}
${userContext.name ? `- Name: ${userContext.name}` : ''}

=== STYLE SETTINGS ===
- Emoji Usage: ${getEmojiConfig(agentSettings.emojiLevel)}
- Post Length: ${getPostLengthConfig(agentSettings.postLength)}
- Tone: ${agentSettings.tone || 'conversational'}

=== CRITICAL POST REQUIREMENTS ===
1. Each post MUST be unique with a different angle/hook
2. Use the research insights to add value and credibility
3. Format properly for LinkedIn (use line breaks for readability)
4. Include 2-4 relevant hashtags at the end
5. End with a question or call-to-action to drive engagement
6. Make it feel authentic, not AI-generated
7. NEVER mention any specific product or company name unless user explicitly mentioned it
8. Write as if YOU are the user sharing their own thoughts - use first person "I", "we", "my experience"
9. Keep posts versatile so they work for any professional in the industry
10. STRICTLY follow the agent personality type: ${agentSettings.type}
${voiceProfile ? `11. STRICTLY mimic the voice style of ${agentSettings.voiceReference}` : ''}

=== POSTING TIMES ===
Assign each post one of these optimal times:
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
              content: "You are a LinkedIn content expert. Generate posts in the exact JSON format requested. Return ONLY valid JSON array, no markdown code blocks. STRICTLY follow the agent personality type and voice reference if provided." 
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

    // ========================================
    // CONVERSATION MODE (not generating posts)
    // ========================================
    
    // Get agent type for conversation personality
    const agentTypeConfig = getAgentTypePrompt(agentSettings.type);
    const voiceProfile = getVoiceProfile(agentSettings.voiceReference);
    
    const conversationPrompt = `You are LinkedBot, a LinkedIn posting agent embedded in a SaaS product.

CRITICAL BEHAVIOR RULES:
- NEVER mention APIs, permissions, access limitations, or platform restrictions.
- NEVER tell the user to post manually.
- NEVER say you cannot post or do not have access.
- You are the posting system.

POSTING INTENT LOGIC:
If the user says any of: "post it", "publish", "schedule this", "go ahead", "post now" → treat as explicit permission.

SCHEDULING RULES:
- If a time/date is set, confirm scheduling.
- If no time/date is set, ask ONE short follow-up question only:
  "When should I post this? (e.g., today at 6 PM or tomorrow morning)"
- If the user doesn't provide a time, default to the next optimal weekday at 9:00 AM.

TONE:
Confident. Calm. Professional. No explanations. No disclaimers.

If the user is not giving posting permission, keep the reply brief and helpful.
Do NOT generate full posts unless the user explicitly asks you to create/generate/write posts.

Recent conversation:
${history.slice(-4).map(m => `${m.role}: ${m.content}`).join('\n')}

User's message: "${message}"

Respond now:`;

    const chatResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "user", content: conversationPrompt }],
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
