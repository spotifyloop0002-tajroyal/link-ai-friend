import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function extractTopic(message: string): string {
  const lower = message.toLowerCase();

  // Prefer explicit "about X" pattern
  const aboutIdx = lower.indexOf("about");
  if (aboutIdx !== -1) {
    const after = message.slice(aboutIdx + "about".length).trim();
    if (after) return after.replace(/[.?!]$/, "").trim();
  }

  // Fallback: strip common verbs
  const cleaned = message
    .replace(/^(create|generate|write|make|draft|please|can you|could you|i want|i need)\s*/gi, "")
    .replace(/\s*(posts?|content|articles?|drafts?)\s*/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned || "professional development";
}

function isGreeting(lower: string): boolean {
  return lower === "hi" || lower === "hello" || lower === "hey" || lower === "hola";
}

function isPostRequest(lower: string): boolean {
  return (
    lower.includes("write") ||
    lower.includes("create") ||
    lower.includes("generate") ||
    lower.includes("draft") ||
    lower.includes("post about") ||
    /^(post|posts)\s+(about|on|regarding)\b/.test(lower)
  );
}

function isPostNowRequest(lower: string): boolean {
  return (
    lower.includes("post it") ||
    lower.includes("publish") ||
    lower.includes("post now") ||
    lower.includes("post this")
  );
}

function isImmediateTimeRequest(lower: string): boolean {
  return (
    lower.includes("right now") ||
    lower.includes("immediately") ||
    lower === "now" ||
    lower.includes("post it now") ||
    lower.includes("publish now")
  );
}

function isScheduleTimeRequest(lower: string): boolean {
  return (
    lower.match(/at \d|tomorrow|tonight|morning|afternoon|evening|\d+pm|\d+am/) !== null
  );
}

function buildDraft(topic: string): string {
  return `The landscape of ${topic} is evolving rapidly.

As professionals, we need to stay ahead of the curve and embrace innovation while staying grounded in what actually works.

Here are three key insights I've been reflecting on:

1) Continuous learning is no longer optional—it's essential
2) Adaptation requires both courage and strategic thinking
3) Results come from balancing bold ideas with practical execution

What's your perspective on ${topic}? I'd love to hear your thoughts in the comments.

#Professional #Innovation #Growth`;
}

function nowIso(): string {
  return new Date().toISOString();
}

serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const message: string = String(body?.message ?? "");
    const generatedPosts: any[] = body?.generatedPosts || [];

    console.log("agent-chat received:", message);
    console.log("generatedPosts count:", generatedPosts.length);

    const lower = message.trim().toLowerCase();

    // Default response shape expected by the frontend hook:
    // { type, message, posts, topic, action }

    if (!message.trim()) {
      return new Response(
        JSON.stringify({
          type: "message",
          message: "Please type a message to continue.",
          posts: [],
          topic: null,
          action: null,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (isGreeting(lower)) {
      return new Response(
        JSON.stringify({
          type: "message",
          message:
            "Hello! I'm your LinkedIn posting assistant.\n\nI can help you:\n1. Create professional posts - say 'write a post about [topic]'\n2. Schedule posts - say 'post it tomorrow at 2pm'\n3. Post immediately - click the 'Post Now' button or say 'post it now'\n\nWhat would you like to create?",
          posts: [],
          topic: null,
          action: null,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ============================================
    // USER SAYS "POST IT" - CHECK FOR TIME
    // ============================================
    if (isPostNowRequest(lower)) {
      // Check if they ALSO said a time
      if (isImmediateTimeRequest(lower)) {
        // User said "post it now" or "right now" - trigger immediate post
        if (generatedPosts.length === 0) {
          return new Response(
            JSON.stringify({
              type: "message",
              message: "I don't have any posts ready to publish. Would you like me to create one first?\n\nJust say 'write a post about [topic]'.",
              posts: [],
              topic: null,
              action: null,
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({
            type: "action",
            message: "Posting to LinkedIn now... Click the 'Post Now' button to confirm.",
            posts: [],
            topic: null,
            action: "post_now",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      if (isScheduleTimeRequest(lower)) {
        // They specified a schedule time
        return new Response(
          JSON.stringify({
            type: "message",
            message: "I'll schedule this post for the time you specified. Click the 'Post Now' button in the Generated Posts panel to confirm.",
            posts: [],
            topic: null,
            action: "schedule_post",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // NO TIME SPECIFIED - ASK FOR IT (don't auto-post!)
      return new Response(
        JSON.stringify({
          type: "message",
          message: "When would you like to post this?\n\nYou can:\n• Say 'right now' or 'post it now' to publish immediately\n• Say 'tomorrow at 2pm' to schedule it\n• Or just click the 'Post Now' button in the Generated Posts panel",
          posts: [],
          topic: null,
          action: null,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ============================================
    // USER SAYS JUST "NOW" OR "RIGHT NOW"
    // ============================================
    if (isImmediateTimeRequest(lower) && !isPostRequest(lower)) {
      if (generatedPosts.length === 0) {
        return new Response(
          JSON.stringify({
            type: "message",
            message: "I don't have any posts ready. Would you like me to create one first?\n\nJust say 'write a post about [topic]'.",
            posts: [],
            topic: null,
            action: null,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          type: "action",
          message: "Posting to LinkedIn now... Click the 'Post Now' button to confirm.",
          posts: [],
          topic: null,
          action: "post_now",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ============================================
    // GENERATE POST REQUEST
    // ============================================
    if (isPostRequest(lower)) {
      const topic = extractTopic(message);
      const draft = buildDraft(topic);
      const ts = nowIso();

      const post = {
        id: `post-${Date.now()}`,
        content: draft,
        suggestedTime: ts,
        reasoning: `Generated a draft about "${topic}"`,
        scheduledDateTime: ts,
        generateImage: false,
        imagePrompt: `Professional LinkedIn visual for: ${topic}`,
      };

      return new Response(
        JSON.stringify({
          type: "posts_generated",
          message: `I've created a post about ${topic} for you.\n\nYou can see it in the "Generated Posts" panel. When would you like to post it?\n\nOptions:\n• Say "post it now" or "right now"\n• Say "post it tomorrow at 2pm"\n• Click the "Post Now" button`,
          posts: [post],
          topic,
          action: null,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fallback
    return new Response(
      JSON.stringify({
        type: "message",
        message: `I understand you want to discuss: "${message}"\n\nWould you like me to create a LinkedIn post about this? Just say "write a post about ${message}"`,
        posts: [],
        topic: null,
        action: null,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("agent-chat error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    // IMPORTANT: return 200 so the frontend doesn't treat it as a function failure
    return new Response(
      JSON.stringify({
        type: "message",
        message: "Sorry, I encountered an error. Please try again.",
        posts: [],
        topic: null,
        action: null,
        error: errorMessage,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  }
});
