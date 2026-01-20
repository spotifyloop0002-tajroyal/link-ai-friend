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
}

// Agent type specific welcome messages
const agentWelcomeMessages: Record<string, { intro: string; samples: string[] }> = {
  comedy: {
    intro: "Ready to make your network laugh! 😄 I specialize in witty, humorous content.",
    samples: ["Monday motivation (with a twist)", "Tech industry stereotypes", "Office culture observations"]
  },
  professional: {
    intro: "I'll help you craft polished, industry-focused content that positions you as a thought leader.",
    samples: ["Industry best practices", "Leadership lessons learned", "Career growth strategies"]
  },
  storytelling: {
    intro: "Let's turn your experiences into compelling narratives! 📖",
    samples: ["Your career journey moments", "Lessons from failure", "A mentor who changed your path"]
  },
  "thought-leadership": {
    intro: "Time to share bold ideas! 💡 I help you craft contrarian takes.",
    samples: ["Unpopular industry opinions", "Future predictions for your field", "What most people miss about..."]
  },
  motivational: {
    intro: "Let's inspire your network! ✨",
    samples: ["Overcoming challenges", "Celebrating small wins", "Advice for your younger self"]
  },
  "data-analytics": {
    intro: "Let's make your insights data-driven! 📊",
    samples: ["Industry statistics breakdown", "Market trends analysis", "Data-backed predictions"]
  },
  creative: {
    intro: "Time to get creative! 🎨",
    samples: ["Design thinking in action", "Creative process insights", "Innovation tips"]
  },
  news: {
    intro: "Stay current and relevant! 📰",
    samples: ["Breaking industry news", "Company announcements", "Weekly industry roundup"]
  }
};

function getInitialMessage(agentType: string): ChatMessage {
  const config = agentWelcomeMessages[agentType] || agentWelcomeMessages.professional;
  
  return {
    role: "assistant",
    content: `Hi — I'm your LinkedIn posting agent. ${config.intro}

Tell me what you want to write about, and I'll create posts for you.

**Sample topics:**
${config.samples.map(s => `• ${s}`).join('\n')}

What should we write about?`,
  };
}

export function useAgentChat(
  agentSettings: AgentSettings,
  userContext: UserContext = {}
) {
  const [messages, setMessages] = useState<ChatMessage[]>(() => [getInitialMessage(agentSettings.type)]);
  const [isLoading, setIsLoading] = useState(false);
  const [generatedPosts, setGeneratedPosts] = useState<GeneratedPost[]>([]);

  const sendMessage = useCallback(async (message: string): Promise<void> => {
    if (!message.trim() || isLoading) return;

    console.log('=== useAgentChat.sendMessage ===');
    console.log('Message:', message);

    const userMessage: ChatMessage = { role: "user", content: message };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("agent-chat", {
        body: {
          message,
          history: [...messages, userMessage].slice(-10),
          agentSettings,
          userContext,
          generatedPosts, // Pass current posts so agent knows if we have any
        },
      });

      console.log('Agent response:', data);

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      const assistantMessage: ChatMessage = {
        role: "assistant",
        content: data.message,
      };
      setMessages(prev => [...prev, assistantMessage]);

      // If posts were generated, add them
      if (data.type === "posts_generated" && data.posts?.length > 0) {
        setGeneratedPosts(data.posts);
        toast.success(`Created ${data.posts.length} post(s) about "${data.topic}"!`);
      }

    } catch (error: any) {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: "Sorry, I encountered an error. Please try again." 
      }]);
      toast.error(error.message || "Failed to send message");
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
          message: `Regenerate a post similar to: ${post.content.substring(0, 100)}`,
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
