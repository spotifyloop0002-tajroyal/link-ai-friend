import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface GeneratedPost {
  id: string;
  content: string;
  suggestedTime: string;
  reasoning: string;
  scheduledDateTime: string;
  generateImage?: boolean;
  imagePrompt?: string;
  imageUrl?: string;
  isGeneratingImage?: boolean;
}

export interface AgentSettings {
  type: string;
  tone: string;
  emojiLevel: number;
  postLength: string;
  voiceReference?: string;
}

export interface UserContext {
  name?: string;
  industry?: string;
  company?: string;
  background?: string;
}

export type AgentChatResponse =
  | { type: "message"; message: string }
  | { type: "posts_generated"; message: string; posts: GeneratedPost[]; topic?: string }
  | { type: "post_now"; message: string }
  | { type: "schedule_post"; message: string; scheduledTime: string }
  | { type: "ask_schedule"; message: string }
  | { type: "ask_count"; message: string; topic: string };

interface UseAgentChatReturn {
  messages: ChatMessage[];
  isLoading: boolean;
  generatedPosts: GeneratedPost[];
  sendMessage: (message: string, hasGeneratedPosts?: boolean) => Promise<AgentChatResponse | null>;
  resetChat: () => void;
  updatePost: (postId: string, updates: Partial<GeneratedPost>) => void;
  deletePost: (postId: string) => void;
  regeneratePost: (postId: string, agentSettings: AgentSettings, userContext: UserContext) => Promise<void>;
  generateImageForPost: (postId: string) => Promise<void>;
}

// Agent type specific welcome messages with sample topics
const agentWelcomeMessages: Record<string, { intro: string; samples: string[] }> = {
  "comedy": {
    intro: "Ready to make your network laugh! 😄 I specialize in witty, humorous content that entertains while delivering value.",
    samples: [
      "Monday motivation (with a twist)",
      "Tech industry stereotypes",
      "Office culture observations",
      "Work-from-home fails"
    ]
  },
  "professional": {
    intro: "I'll help you craft polished, industry-focused content that positions you as a thought leader.",
    samples: [
      "Industry best practices",
      "Leadership lessons learned",
      "Career growth strategies",
      "Professional development tips"
    ]
  },
  "storytelling": {
    intro: "Let's turn your experiences into compelling narratives! 📖 I craft story-driven posts that connect emotionally.",
    samples: [
      "Your career journey moments",
      "Lessons from failure",
      "Behind-the-scenes at work",
      "A mentor who changed your path"
    ]
  },
  "thought-leadership": {
    intro: "Time to share bold ideas! 💡 I help you craft contrarian takes and expert opinions that spark discussion.",
    samples: [
      "Unpopular industry opinions",
      "Future predictions for your field",
      "Why common advice is wrong",
      "What most people miss about..."
    ]
  },
  "motivational": {
    intro: "Let's inspire your network! ✨ I create uplifting content that encourages and empowers others.",
    samples: [
      "Overcoming challenges",
      "Celebrating small wins",
      "Mindset shifts that changed everything",
      "Advice for your younger self"
    ]
  },
  "data-analytics": {
    intro: "Let's make your insights data-driven! 📊 I craft posts backed by statistics and research.",
    samples: [
      "Industry statistics breakdown",
      "Market trends analysis",
      "Research findings in your field",
      "Data-backed predictions"
    ]
  },
  "creative": {
    intro: "Time to get creative! 🎨 I help you craft visually-oriented, design-focused content.",
    samples: [
      "Design thinking in action",
      "Creative process insights",
      "Visual trends in your industry",
      "Innovation and creativity tips"
    ]
  },
  "news": {
    intro: "Stay current and relevant! 📰 I help you share timely updates and industry news.",
    samples: [
      "Breaking industry news",
      "Company announcements",
      "Event recaps",
      "Weekly industry roundup"
    ]
  }
};

function getInitialMessage(agentType: string): ChatMessage {
  const config = agentWelcomeMessages[agentType] || agentWelcomeMessages["professional"];
  
  return {
    role: "assistant",
    content: `Hi — I’m your LinkedIn posting agent. ${config.intro}

Tell me what you want to write (and how many posts you need).

**Sample topics for this style:**
${config.samples.map(s => `• ${s}`).join('\n')}

What should we write about?`,
  };
}

export function useAgentChat(
  agentSettings: AgentSettings,
  userContext: UserContext = {}
): UseAgentChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>(() => [getInitialMessage(agentSettings.type)]);
  const [isLoading, setIsLoading] = useState(false);
  const [generatedPosts, setGeneratedPosts] = useState<GeneratedPost[]>([]);

  const sendMessage = useCallback(async (message: string, hasGeneratedPosts: boolean = false): Promise<AgentChatResponse | null> => {
    if (!message.trim() || isLoading) return null;

    const userMessage: ChatMessage = { role: "user", content: message };
    const nextHistory = [...messages, userMessage];

    setMessages(nextHistory);
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("agent-chat", {
        body: {
          message,
          history: nextHistory,
          agentSettings,
          userContext,
          hasGeneratedPosts, // Pass to backend so it knows if posts exist
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      const assistantMessage: ChatMessage = {
        role: "assistant",
        content: data.message,
      };
      setMessages(prev => [...prev, assistantMessage]);

      if (data.type === "posts_generated" && data.posts?.length > 0) {
        setGeneratedPosts(data.posts);
        toast.success(`Created ${data.posts.length} posts about "${data.topic}"!`);
        return { type: "posts_generated", message: data.message, posts: data.posts, topic: data.topic };
      }

      if (data.type === "post_now") {
        return { type: "post_now", message: data.message };
      }

      if (data.type === "schedule_post") {
        return { type: "schedule_post", message: data.message, scheduledTime: data.scheduledTime };
      }

      if (data.type === "ask_schedule") {
        return { type: "ask_schedule", message: data.message };
      }

      if (data.type === "ask_count") {
        return { type: "ask_count", message: data.message, topic: data.topic };
      }

      return { type: "message", message: data.message };

    } catch (error: any) {
      console.error("Chat error:", error);
      
      let errorMessage = "Sorry, I encountered an error. Please try again.";
      if (error.message?.includes("Rate limits")) {
        errorMessage = "I'm getting too many requests. Please wait a moment and try again.";
      } else if (error.message?.includes("credits")) {
        errorMessage = "AI credits are low. Please add more credits in settings.";
      }
      
      setMessages(prev => [...prev, { role: "assistant", content: errorMessage }]);
      toast.error(error.message || "Failed to send message");
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [messages, agentSettings, userContext, isLoading]);

  const resetChat = useCallback(() => {
    setMessages([getInitialMessage(agentSettings.type)]);
    setGeneratedPosts([]);
  }, [agentSettings.type]);

  const updatePost = useCallback((postId: string, updates: Partial<GeneratedPost>) => {
    setGeneratedPosts(prev =>
      prev.map(post => post.id === postId ? { ...post, ...updates } : post)
    );
  }, []);

  const deletePost = useCallback((postId: string) => {
    setGeneratedPosts(prev => prev.filter(post => post.id !== postId));
    toast.success("Post removed");
  }, []);

  const regeneratePost = useCallback(async (
    postId: string, 
    settings: AgentSettings, 
    context: UserContext
  ) => {
    const post = generatedPosts.find(p => p.id === postId);
    if (!post) return;

    setGeneratedPosts(prev =>
      prev.map(p => p.id === postId ? { ...p, isGeneratingImage: true } : p)
    );

    try {
      const { data, error } = await supabase.functions.invoke("agent-chat", {
        body: {
          message: `Regenerate a single post similar to this topic: ${post.content.substring(0, 100)}`,
          history: [],
          agentSettings: settings,
          userContext: context,
        },
      });

      if (error) throw error;
      if (data.posts?.[0]) {
        setGeneratedPosts(prev =>
          prev.map(p => p.id === postId ? { 
            ...data.posts[0], 
            id: postId,
            scheduledDateTime: p.scheduledDateTime 
          } : p)
        );
        toast.success("Post regenerated!");
      }
    } catch (error) {
      toast.error("Failed to regenerate post");
    } finally {
      setGeneratedPosts(prev =>
        prev.map(p => p.id === postId ? { ...p, isGeneratingImage: false } : p)
      );
    }
  }, [generatedPosts]);

  const generateImageForPost = useCallback(async (postId: string) => {
    const post = generatedPosts.find(p => p.id === postId);
    if (!post) return;

    setGeneratedPosts(prev =>
      prev.map(p => p.id === postId ? { ...p, isGeneratingImage: true } : p)
    );

    try {
      const { data, error } = await supabase.functions.invoke("generate-post-image", {
        body: {
          prompt: post.imagePrompt,
          postContent: post.content,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setGeneratedPosts(prev =>
        prev.map(p => p.id === postId ? { 
          ...p, 
          imageUrl: data.imageUrl,
          isGeneratingImage: false 
        } : p)
      );
      toast.success("Image generated!");
    } catch (error: any) {
      console.error("Image generation error:", error);
      toast.error(error.message || "Failed to generate image");
      setGeneratedPosts(prev =>
        prev.map(p => p.id === postId ? { ...p, isGeneratingImage: false } : p)
      );
    }
  }, [generatedPosts]);

  return {
    messages,
    isLoading,
    generatedPosts,
    sendMessage,
    resetChat,
    updatePost,
    deletePost,
    regeneratePost,
    generateImageForPost,
  };
}
