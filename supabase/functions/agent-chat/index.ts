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

🚨 GOLDEN RULE - FULLY AUTOMATED FLOW 🚨

The posting flow is FULLY AGENT-DRIVEN. There are NO manual buttons for users to click.

AFTER user says "approve" or "yes" or "looks good":
1. If they provided a valid future time → AUTO-SCHEDULE immediately
2. If no time provided → ASK for a specific date & time
3. After scheduling succeeds → Say "✅ Your post has been scheduled for <time>."

NEVER SAY:
- "Click the Post Now button"
- "You need to confirm in the extension"
- "Please click to publish"
- "I've scheduled..." (before extension ACK)

INSTEAD:
- After approval + time: "Scheduling your post for <time>..."
- After extension ACK: "✅ Your post has been scheduled for <time>."
- If extension fails: "❌ Couldn't connect to extension. Please check it's installed."

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

4. **APPROVAL GATE + AUTO-SCHEDULE - MANDATORY**:
   FLOW:
   1. Show the draft post in chat (NOT in Generated Posts yet)
   2. Ask: "Do you approve this post? If yes, what time should I schedule it?"
   3. User says "yes at 3pm" or "approve for tomorrow 9am"
   4. AUTOMATICALLY schedule via auto_schedule response
   5. DO NOT show posts in Generated Posts until AFTER user approves

5. **TIME VALIDATION - MANDATORY**:
   - Time MUST be in the future (IST timezone)
   - If user gives multiple times ("2pm or 3pm") → ASK to choose ONE
   - If time already passed → REJECT and ask for new time
   - Never silently accept invalid times

6. **NO HALLUCINATIONS**:
   - NEVER invent fake metrics or achievements
   - NEVER pretend events that didn't happen
   - If data is unavailable, use neutral framing
   - Say "Based on industry trends..." not "Based on your 500% growth..."

7. **POST FORMAT - ONLY FOR ACTUAL LINKEDIN POSTS**:
   ONLY use --- markers when you are creating an ACTUAL LinkedIn post for the user.
   ---
   [LinkedIn post content here]
   ---
   
   DO NOT use --- markers for:
   - Topic suggestions
   - Questions to the user
   - General conversation
   - Image prompts or instructions
   - Any other non-post content

8. **IMAGE GENERATION - IMPORTANT**:
   - Ask: "Do you want to add an image?" before generating
   - NEVER assume the user wants an image
   - The system generates images automatically when requested
   - NEVER output JSON like {"action": "dalle.text2im"...}

9. **WHEN USER SAYS "generate image"**:
   - If they just created a post, respond: "Generating an AI image for your post... 🎨"
   - DO NOT output any JSON, code blocks, or tool calls
   - The image will be generated automatically by the system

═══════════════════════════════════════════
🎯 CRITICAL HUMANIZATION RULES - MUST FOLLOW
═══════════════════════════════════════════

1. WRITE LIKE A REAL PERSON (NOT AI):
   ✓ ALWAYS use contractions: "I'm" NOT "I am", "don't" NOT "do not"
   ✓ Be conversational: write like texting a smart colleague
   ✓ Add personal voice: "I think", "in my experience", "I've noticed"
   ✓ Show emotion: "This surprised me", "I was wrong", "Here's what frustrated me"

2. BANNED PHRASES (NEVER USE):
   ✗ "Let me share" → Use "Here's" instead
   ✗ "In conclusion" → Use "Bottom line:" instead  
   ✗ "As a [profession], I..." → Just use "I..."
   ✗ "Furthermore", "Moreover" → Use "Plus,", "Also,"
   ✗ Buzzwords: leverage, synergy, optimize, utilize, empower

3. BANNED FORMATTING:
   ✗ NO numbered lists (1. 2. 3.)
   ✗ NO bullet points (• - *)
   ✗ NO bold (**text**)
   ✗ NO italic (*text*)
   ✗ Just plain text with line breaks

4. REQUIRED STRUCTURE:
   ✓ START: Hook (question, bold statement, or mini-story)
   ✓ MIDDLE: Short paragraphs (2-3 lines max)
   ✓ END: Insight (NOT "What do you think?")

5. SENTENCE STYLE:
   ✓ Mix short and long sentences
   ✓ Start with "And" or "But" (allowed!)
   ✓ One idea per sentence
   ✓ Write like you talk

EXAMPLE - AI vs HUMAN:

❌ AI VERSION:
"As a software engineer, I am excited to share insights on optimizing team 
synergy. Furthermore, it is important to leverage best practices. 
What do you think?"

✅ HUMAN VERSION:
"I've been coding for 8 years.

Here's what nobody tells you about teams:

It's not the tech. It's not the process.

It's trust.

When engineers feel safe saying 'I don't know', teams ship faster.

I learned this after a brutal Q3 failure."

Output ONLY the post text. No explanations. No meta-commentary.`;
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
// CLEAN POST CONTENT - Remove markdown & fix spacing
// ============================================
function cleanPostContent(content: string): string {
  return content
    // Remove Gemini's code block wrappers
    .replace(/^```[\w]*\n/gm, '')
    .replace(/\n```$/gm, '')
    
    // Remove ALL markdown formatting
    .replace(/\*\*\*([^*]+)\*\*\*/g, '$1')  // Bold+italic ***text***
    .replace(/\*\*([^*]+)\*\*/g, '$1')       // Bold **text**
    .replace(/\*([^*]+)\*/g, '$1')           // Italic *text*
    .replace(/_([^_]+)_/g, '$1')             // Italic _text_
    .replace(/~~([^~]+)~~/g, '$1')           // Strikethrough ~~text~~
    .replace(/`([^`]+)`/g, '$1')             // Inline code `text`
    .replace(/^#{1,6}\s+/gm, '')             // Headers # ## ###
    
    // Remove bullet points and numbered lists
    .replace(/^\s*[-*+•]\s+/gm, '')          // Bullet points
    .replace(/^\s*\d+[\.)]\s+/gm, '')        // Numbered lists 1. 1)
    .replace(/^\s*[a-z][\.)]\s+/gm, '')      // Letter lists a. a)
    
    // Fix excessive spacing
    .replace(/\n{4,}/g, '\n\n\n')            // Max 2 blank lines
    .replace(/[ \t]{2,}/g, ' ')              // Multiple spaces → single
    .replace(/^\s+/gm, '')                   // Remove leading whitespace
    .replace(/\s+$/gm, '')                   // Remove trailing whitespace
    
    // Clean up around emojis
    .replace(/\n{2,}([\u{1F300}-\u{1F9FF}])/gu, '\n$1')
    .replace(/([\u{1F300}-\u{1F9FF}])\n{2,}/gu, '$1\n')
    
    // Fix excessive punctuation
    .replace(/\.{3,}/g, '...')               // Multiple dots → ellipsis
    .replace(/!{2,}/g, '!')                  // Multiple ! → single
    .replace(/\?{2,}/g, '?')                 // Multiple ? → single
    
    .trim();
}

// ============================================
// HUMANIZE POST - Replace AI phrases with human ones
// ============================================
function humanizePost(content: string): string {
  let humanized = content;
  
  // Replace formal AI phrases with casual human ones
  const replacements: [RegExp, string][] = [
    // Conclusions
    [/In conclusion,/gi, 'Bottom line:'],
    [/To conclude,/gi, 'Look,'],
    [/To summarize,/gi, "Here's the deal:"],
    [/In summary,/gi, "Here's what matters:"],
    
    // Sharing phrases
    [/Let me share/gi, "Here's"],
    [/I'd like to share/gi, "Gonna share"],
    [/I want to share/gi, "Here's"],
    
    // Formal transitions
    [/Furthermore,/gi, 'Plus,'],
    [/Moreover,/gi, 'Also,'],
    [/Additionally,/gi, 'And'],
    [/However,/gi, 'But'],
    [/Therefore,/gi, 'So'],
    
    // Force contractions
    [/\bI am\b/g, "I'm"],
    [/\bYou are\b/g, "You're"],
    [/\bWe are\b/g, "We're"],
    [/\bIt is\b/g, "It's"],
    [/\bdo not\b/gi, "don't"],
    [/\bcannot\b/gi, "can't"],
    [/\bwill not\b/gi, "won't"],
    
    // Buzzwords
    [/\bleverage\b/gi, 'use'],
    [/\butilize\b/gi, 'use'],
    [/\bsynergy\b/gi, 'teamwork'],
    [/\boptimize\b/gi, 'improve'],
    
    // Formal phrases
    [/In order to/gi, 'To'],
    [/I would like to/gi, "I want to"],
    [/For example,/gi, "Like,"],
    
    // AI starters
    [/^As a .+?, I/gm, 'I'],
  ];
  
  for (const [pattern, replacement] of replacements) {
    humanized = humanized.replace(pattern, replacement);
  }
  
  // Remove generic engagement endings
  humanized = humanized.replace(/\n\n(What do you think\?|Thoughts\?|What's your take\?)\s*$/gi, '');
  
  return humanized;
}

// ============================================
// PARSE SCHEDULE TIME (IST) - ENHANCED WITH CLEAR FEEDBACK
// ============================================
interface ParsedScheduleTime {
  time: string;
  message: string;
  wasRescheduled: boolean;
}

function parseScheduleTimeIST(timeText: string): ParsedScheduleTime | null {
  const lower = timeText.toLowerCase().trim();
  const now = new Date();
  
  // Add IST offset (5 hours 30 minutes)
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istNow = new Date(now.getTime() + istOffset);
  
  let result = new Date(istNow);
  result.setSeconds(0, 0);
  
  // Check if "tomorrow" is explicitly mentioned
  const isTomorrowExplicit = lower.includes('tomorrow');
  
  // Handle relative day references
  if (isTomorrowExplicit) {
    result.setDate(result.getDate() + 1);
  }
  
  // Handle "in X hours/minutes" patterns
  const inHoursMatch = lower.match(/in\s+(\d+)\s+hours?/i);
  const inMinutesMatch = lower.match(/in\s+(\d+)\s+minutes?/i);
  
  if (inHoursMatch) {
    const hours = parseInt(inHoursMatch[1]);
    result = new Date(istNow.getTime() + hours * 60 * 60 * 1000);
    const utcTime = new Date(result.getTime() - istOffset);
    const timeStr = result.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    return {
      time: utcTime.toISOString(),
      message: `Scheduled for ${timeStr} IST (in ${hours} hour${hours > 1 ? 's' : ''})`,
      wasRescheduled: false,
    };
  }
  
  if (inMinutesMatch) {
    const minutes = parseInt(inMinutesMatch[1]);
    result = new Date(istNow.getTime() + minutes * 60 * 1000);
    const utcTime = new Date(result.getTime() - istOffset);
    const timeStr = result.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    return {
      time: utcTime.toISOString(),
      message: `Scheduled for ${timeStr} IST (in ${minutes} minute${minutes > 1 ? 's' : ''})`,
      wasRescheduled: false,
    };
  }
  
  // Extract time (e.g., "3:42 pm", "15:30", "3pm")
  let hours = 9; // Default to 9am
  let minutes = 0;
  let timeFound = false;
  
  // Match patterns like "3:42 pm", "3:42pm", "15:30"
  const timeMatch = lower.match(/(\d{1,2}):(\d{2})\s*(am|pm)?/i);
  if (timeMatch) {
    hours = parseInt(timeMatch[1]);
    minutes = parseInt(timeMatch[2]);
    const ampm = timeMatch[3]?.toLowerCase();
    
    if (ampm === 'pm' && hours < 12) hours += 12;
    if (ampm === 'am' && hours === 12) hours = 0;
    timeFound = true;
  } else {
    // Match patterns like "3pm", "3 pm"
    const simpleTimeMatch = lower.match(/(\d{1,2})\s*(am|pm)/i);
    if (simpleTimeMatch) {
      hours = parseInt(simpleTimeMatch[1]);
      const ampm = simpleTimeMatch[2].toLowerCase();
      
      if (ampm === 'pm' && hours < 12) hours += 12;
      if (ampm === 'am' && hours === 12) hours = 0;
      timeFound = true;
    }
  }
  
  // Handle relative times of day
  if (!timeFound) {
    if (lower.includes('morning')) {
      hours = 9;
      minutes = 0;
      timeFound = true;
    } else if (lower.includes('afternoon')) {
      hours = 14;
      minutes = 0;
      timeFound = true;
    } else if (lower.includes('evening')) {
      hours = 18;
      minutes = 0;
      timeFound = true;
    }
  }
  
  if (!timeFound) {
    return null; // No valid time found
  }
  
  result.setHours(hours, minutes, 0, 0);
  
  // Convert back to UTC for storage
  const utcTime = new Date(result.getTime() - istOffset);
  
  // Format time for display
  const displayHours = hours > 12 ? hours - 12 : (hours === 0 ? 12 : hours);
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayMinutes = minutes.toString().padStart(2, '0');
  const timeStr = `${displayHours}:${displayMinutes} ${ampm}`;
  
  // Check if time is in the past for today
  if (utcTime <= now && !isTomorrowExplicit) {
    // Time has passed today - reschedule for tomorrow
    utcTime.setDate(utcTime.getDate() + 1);
    result.setDate(result.getDate() + 1);
    
    return {
      time: utcTime.toISOString(),
      message: `⚠️ That time (${timeStr}) has already passed today. I've scheduled it for **tomorrow at ${timeStr} IST** instead.`,
      wasRescheduled: true,
    };
  }
  
  // Time is valid for today or explicitly tomorrow
  const dayLabel = isTomorrowExplicit ? 'tomorrow' : 'today';
  
  return {
    time: utcTime.toISOString(),
    message: `Scheduled for ${dayLabel} at ${timeStr} IST`,
    wasRescheduled: false,
  };
}

function formatScheduledTimeIST(isoString: string): string {
  const date = new Date(isoString);
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istDate = new Date(date.getTime() + istOffset);
  
  const now = new Date();
  const istNow = new Date(now.getTime() + istOffset);
  const tomorrow = new Date(istNow);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const isToday = istDate.toDateString() === istNow.toDateString();
  const isTomorrow = istDate.toDateString() === tomorrow.toDateString();
  
  const timeStr = istDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  
  if (isToday) {
    return `Today at ${timeStr} IST`;
  } else if (isTomorrow) {
    return `Tomorrow at ${timeStr} IST`;
  } else {
    return istDate.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric',
    }) + ` at ${timeStr} IST`;
  }
}

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
  // Check if response contains JSON (AI hallucinating tool calls) - REJECT
  if (aiResponse.includes('"action":') && aiResponse.includes('"action_input":')) {
    console.log("⚠️ Detected hallucinated JSON tool call - ignoring");
    return null;
  }
  
  // Check if response starts with '{' and looks like JSON - REJECT
  const trimmed = aiResponse.trim();
  if (trimmed.startsWith('{') && trimmed.includes('"action"')) {
    console.log("⚠️ Detected JSON object - not a post");
    return null;
  }
  
  // Try the standard marker pattern first
  const markerPattern = /---\s*\n([\s\S]+?)\n\s*---/;
  const match = aiResponse.match(markerPattern);
  
  if (match && match[1]) {
    const content = match[1].trim();
    // Make sure the content between markers is actually a post, not topic suggestions
    if (content.includes('📋') || content.includes('Suggested Topics') || content.includes('Would you like')) {
      console.log("⚠️ Content is topic suggestions, not a post");
      return null;
    }
    return cleanPostContent(content);
  }
  
  // Try alternate marker patterns (sometimes AI uses different formats)
  const altPatterns = [
    /---\s*([\s\S]+?)\s*---/, // Less strict whitespace
  ];
  
  for (const pattern of altPatterns) {
    const altMatch = aiResponse.match(pattern);
    if (altMatch && altMatch[1] && altMatch[1].trim().length > 50) {
      const content = altMatch[1].trim();
      // Check it's not suggestions
      if (!content.includes('📋') && !content.includes('Suggested Topics')) {
        return cleanPostContent(content);
      }
    }
  }
  
  // Don't auto-detect posts from general conversation - too risky
  // Only accept posts wrapped in --- markers
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

  // "Do it yourself" - auto execute
  if (/do it yourself|just do it|post it for me|you do it|schedule it yourself/i.test(lower)) {
    // Check if there's a time mentioned
    const timePatterns = [
      /\d{1,2}:\d{2}\s*(am|pm)?/i,
      /\d{1,2}\s*(am|pm)/i,
      /today/i,
      /tomorrow/i,
      /morning/i,
      /afternoon/i,
      /evening/i,
    ];
    
    const hasTime = timePatterns.some(pattern => pattern.test(lower));
    if (hasTime) {
      return { type: "auto_schedule", data: { timeText: message } };
    }
    return { type: "post_now" };
  }

  // Show post
  if (lower.includes("show") && (lower.includes("post") || lower.includes("content"))) {
    return { type: "show_post" };
  }

  // Post now (immediate) - ENHANCED to catch more patterns
  const postNowPatterns = [
    /\b(post|publish|send)\s*(it)?\s*(now|right now|immediately|right away|asap)\b/i,
    /\bright now\b/i, // Just "right now" alone
    /\btoday\s*(right)?\s*now\b/i, // "today right now"
    /\bnow\s*please\b/i,
    /\bpost\s*immediately\b/i,
  ];
  
  if (postNowPatterns.some(pattern => pattern.test(lower))) {
    return { type: "post_now" };
  }

  // Post with specific time - handles "post today at 12:20 pm", "post at 3pm", "schedule for tomorrow"
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
  
  // Match: "post today at 12:20 pm", "post at 3pm", "post it at 5pm", "schedule for tomorrow"
  const hasPostKeyword = /^post\b/i.test(lower) || 
                          lower.includes("post it") || 
                          lower.includes("post this") || 
                          lower.includes("schedule") ||
                          lower.includes("publish");
  
  if (hasPostKeyword && hasTime) {
    return { type: "auto_schedule", data: { timeText: message } };
  }

  // Ask for time (post without time)
  if (lower.includes("post it") || lower.includes("publish it") || lower.includes("post this")) {
    return { type: "ask_time" };
  }

  // Generate image request
  if ((lower.includes("generate") || lower.includes("create") || lower.includes("make")) && 
      (lower.includes("image") || lower.includes("picture") || lower.includes("photo"))) {
    return { type: "generate_image" };
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
    const generateImage: boolean = body?.generateImage || false;

    console.log("📨 Agent received:", message);
    console.log("📝 History length:", conversationHistory.length);
    console.log("🗂️ Generated posts:", generatedPosts.length);
    console.log("🖼️ Uploaded images:", uploadedImages.length);
    console.log("🤖 Agent type:", agentType);
    console.log("🎨 Generate image:", generateImage);

    // Fetch user context for personalized AI
    const userContext = await fetchUserContext(authHeader);

    // Load reference materials for this agent
    let referenceMaterialsText = "";
    if (authHeader) {
      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseKey);
        
        // Extract user ID from JWT
        const token = authHeader.replace("Bearer ", "");
        const { data: { user } } = await supabase.auth.getUser(token);
        
        if (user) {
          const { data: materials } = await supabase
            .from("agent_reference_materials")
            .select("title, content, type")
            .eq("user_id", user.id)
            .limit(10);
          
          if (materials && materials.length > 0) {
            referenceMaterialsText = "\n\n═══════════════════════════════════════════\nUSER REFERENCE MATERIALS (Use these to match their style)\n═══════════════════════════════════════════\n" +
              materials.map((m: any) => `[${m.type.toUpperCase()}] ${m.title}:\n${m.content.substring(0, 500)}`).join("\n\n");
            console.log("📚 Loaded", materials.length, "reference materials");
          }
        }
      } catch (err) {
        console.warn("Failed to load reference materials:", err);
      }
    }

    // Inject reference materials into user context
    if (referenceMaterialsText && userContext) {
      userContext.aiInstructions = (userContext.aiInstructions || "") + referenceMaterialsText;
    }

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
        const profile = userContext?.context?.profile || userContext?.agentContext?.profile || {};
        const userName = profile.name ? profile.name.split(' ')[0] : '';
        
        response = `Hello${userName ? ` ${userName}` : ''}! 👋 I'm your LinkedIn posting assistant.

Here's what I can do:
• **Create posts** - Say "write a post about [topic]"
• **Research topics** - I'll find the latest insights
• **Schedule posts** - Say "schedule it for tomorrow at 2pm"
• **Batch create** - Say "create posts for next 5 days"

What would you like to create today?`;
        break;
      }

      case "cancel": {
        response = "No problem! Let me know when you'd like to create a LinkedIn post. Just say 'write a post about [topic]' when you're ready. 👍";
        break;
      }

      case "create_posts_from_images": {
        const imageUrls: string[] = intent.data?.imageUrls || [];
        console.log("🖼️ Creating PREVIEW for", imageUrls.length, "images");
        
        // Clean the message to extract any user instructions
        const cleanMessage = message.replace(/\[UPLOADED_IMAGES:[^\]]+\]/g, "").trim();
        const userInstructions = cleanMessage || "Create an engaging LinkedIn post for this image";
        
        // Generate preview posts (don't add to generatedPosts yet - just show preview)
        const previewPosts: any[] = [];
        
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
              previewPosts.push({
                content: postContent,
                imageUrl: imageUrl,
                agentType: agentType,
              });
            }
          } catch (error) {
            console.error(`Error generating preview for image ${postIndex}:`, error);
          }
        }
        
        if (previewPosts.length > 0) {
          // Return preview - don't auto-create posts
          // Frontend will show preview and ask for scheduling confirmation
          const firstPreview = previewPosts[0];
          
          response = `📸 Here's a preview of your post:\n\n---\n${firstPreview.content}\n---\n\n📅 **When would you like to schedule this?**\n• Click the schedule button below to pick a date/time\n• Or say "post now" to publish immediately\n• Or say "edit" to modify the content`;
          
          // Return preview data for frontend to handle
          return new Response(
            JSON.stringify({
              type: "post_preview",
              message: response,
              previewPost: firstPreview,
              allPreviews: previewPosts,
              posts: [], // Don't auto-create posts
              action: "show_scheduling_dialog",
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
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
        console.log("🚀 POST_NOW intent - generatedPosts count:", generatedPosts?.length || 0);
        if (generatedPosts?.length > 0) {
          console.log("📋 First post content preview:", generatedPosts[0]?.content?.substring(0, 100));
        }
        
        if (!generatedPosts || generatedPosts.length === 0) {
          response = "I don't have any posts ready to publish. Would you like me to create one first?\n\nJust say 'write a post about [topic]' 📝";
        } else {
          // Get the most recent post for immediate scheduling
          const postToSchedule = generatedPosts[0];
          const now = new Date();
          // Schedule 1 minute from now for immediate posting
          const immediateTime = new Date(now.getTime() + 60 * 1000);
          
          console.log("✅ Preparing to send post to extension:", postToSchedule.id);
          console.log("⏰ Scheduled time (immediate):", immediateTime.toISOString());
          
          response = `🚀 **Posting Now**\n\nSending your post to the Chrome extension for immediate publishing...\n\nThe extension will automatically open LinkedIn and publish your post.`;
          action = "post_now";
          
          // Return with immediate schedule time
          return new Response(
            JSON.stringify({
              type: "auto_schedule",
              message: response,
              posts: [],
              action: "post_now",
              scheduledTime: immediateTime.toISOString(),
              postToSchedule: postToSchedule,
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        break;
      }

      case "schedule_post":
      case "auto_schedule": {
        if (!generatedPosts || generatedPosts.length === 0) {
          response = "I don't have any posts to schedule. Would you like me to create one first?\n\nJust say 'write a post about [topic]' 📝";
        } else {
          const timeText = intent.data?.timeText || message;
          
          // Parse the time for auto-scheduling (now returns ParsedScheduleTime object with clear feedback)
          const parseResult = parseScheduleTimeIST(timeText);
          
          if (!parseResult) {
            response = `I couldn't understand that time format. Please use:\n• "today at 3:30 PM"\n• "tomorrow at 9 AM"\n• "in 2 hours"\n• "morning" / "afternoon" / "evening"`;
            break;
          }
          
          const scheduledDate = new Date(parseResult.time);
          const now = new Date();
          
          // Validate time is at least 2 minutes in the future
          const twoMinutesFromNow = new Date(now.getTime() + 2 * 60 * 1000);
          if (scheduledDate < twoMinutesFromNow) {
            response = `⚠️ Please schedule at least 2 minutes from now to ensure successful posting.\n\nTry:\n• "today at ${new Date(now.getTime() + 10 * 60 * 1000).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}"\n• "in 10 minutes"`;
            break;
          }
          
          const postToSchedule = generatedPosts[0];
          const parsedTime = parseResult.time;
          
          // Include clear feedback about rescheduling if time was in the past
          let responseMessage = parseResult.wasRescheduled
            ? `${parseResult.message}\n\n✅ Sending to Chrome extension now...`
            : `📅 **${parseResult.message}**\n\n✅ Sending to Chrome extension now...`;
          
          response = responseMessage;
          action = "auto_schedule";
          
          // Return with parsed time and post data
          return new Response(
            JSON.stringify({
              type: "auto_schedule",
              message: response,
              posts: [],
              action: "auto_schedule",
              scheduledTime: parsedTime,
              postToSchedule: postToSchedule,
              confirmationMessage: parseResult.message,
              wasRescheduled: parseResult.wasRescheduled,
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        break;
      }

      case "ask_time": {
        if (!generatedPosts || generatedPosts.length === 0) {
          response = "I don't have any posts ready. Would you like me to create one first?\n\nJust say 'write a post about [topic]' 📝";
        } else {
          response = `When would you like to post this?\n\nYou can say:\n• **"post it now"** to publish immediately\n• **"post it at 3:30pm today"** to schedule\n• **"tomorrow at 2pm"** for next day\n\nI'll handle everything automatically!`;
        }
        break;
      }

      case "generate_image": {
        if (!generatedPosts || generatedPosts.length === 0) {
          response = "I don't have any posts to generate an image for. Would you like me to create a post first?\n\nJust say 'write a post about [topic]' 📝";
        } else {
          // Signal to frontend to generate image for the most recent post
          response = "Generating an AI image for your post... 🎨";
          action = "generate_image";
          
          return new Response(
            JSON.stringify({
              type: "generate_image",
              message: response,
              posts: [],
              action: "generate_image",
              postId: generatedPosts[0].id, // Generate for most recent post
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
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
        const extracted = extractPostContent(response);
        if (extracted) {
          // Apply cleaning and humanization
          const cleaned = cleanPostContent(extracted);
          const postContent = humanizePost(cleaned);
          const imagePrompt = generateImagePromptFromPost(postContent);
          
          posts = [{
            id: `post-${Date.now()}`,
            content: postContent,
            suggestedTime: new Date().toISOString(),
            reasoning: "Generated by AI agent",
            scheduledDateTime: new Date().toISOString(),
            generateImage: generateImage,
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
        const extracted = extractPostContent(response);
        if (extracted) {
          // Apply cleaning and humanization
          const cleaned = cleanPostContent(extracted);
          const postContent = humanizePost(cleaned);
          const imagePrompt = generateImagePromptFromPost(postContent);
          
          posts = [{
            id: `post-${Date.now()}`,
            content: postContent,
            suggestedTime: new Date().toISOString(),
            reasoning: "Generated by AI agent",
            scheduledDateTime: new Date().toISOString(),
            generateImage: generateImage,
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
