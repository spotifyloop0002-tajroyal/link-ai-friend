import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp?: Date;
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
  status?: 'draft' | 'scheduled' | 'published';
  scheduledTime?: string; // ISO string for when to post
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

// Storage keys for persistence
const CHAT_STORAGE_KEY = "linkedbot_chat_history";
const POSTS_STORAGE_KEY = "linkedbot_generated_posts";
const MAX_STORED_MESSAGES = 30;

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
    content: `Hi — I'm your LinkedIn posting agent powered by AI. ${config.intro}

I can help you:
• **Create posts** with real-time research
• **Schedule** posts for optimal times
• **Post immediately** to LinkedIn

**Sample topics:**
${config.samples.map(s => `• ${s}`).join('\n')}

What should we write about?`,
    timestamp: new Date(),
  };
}

// Load from localStorage
function loadStoredMessages(): ChatMessage[] {
  try {
    const stored = localStorage.getItem(CHAT_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed.map((msg: any) => ({
        ...msg,
        timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date(),
      }));
    }
  } catch (error) {
    console.error("Error loading chat history:", error);
  }
  return [];
}

function loadStoredPosts(): GeneratedPost[] {
  try {
    const stored = localStorage.getItem(POSTS_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error("Error loading generated posts:", error);
  }
  return [];
}

export function useAgentChat(
  agentSettings: AgentSettings,
  userContext: UserContext = {}
) {
  // Initialize with stored data or welcome message
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const stored = loadStoredMessages();
    if (stored.length > 0) {
      console.log("📂 Loaded", stored.length, "messages from storage");
      return stored;
    }
    return [getInitialMessage(agentSettings.type)];
  });
  
  const [isLoading, setIsLoading] = useState(false);
  
  const [generatedPosts, setGeneratedPosts] = useState<GeneratedPost[]>(() => {
    const stored = loadStoredPosts();
    if (stored.length > 0) {
      console.log("📂 Loaded", stored.length, "posts from storage");
    }
    return stored;
  });

  // Save messages to localStorage when they change
  useEffect(() => {
    if (messages.length > 0) {
      try {
        const messagesToStore = messages.slice(-MAX_STORED_MESSAGES);
        localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messagesToStore));
        console.log("💾 Saved", messagesToStore.length, "messages");
      } catch (error) {
        console.error("Error saving chat history:", error);
      }
    }
  }, [messages]);

  // Save posts to localStorage when they change
  useEffect(() => {
    try {
      localStorage.setItem(POSTS_STORAGE_KEY, JSON.stringify(generatedPosts));
      console.log("💾 Saved", generatedPosts.length, "posts");
    } catch (error) {
      console.error("Error saving posts:", error);
    }
  }, [generatedPosts]);

  const sendMessage = useCallback(async (message: string, options?: { generateImage?: boolean; uploadedImages?: string[] }): Promise<void> => {
    if (!message.trim() || isLoading) return;

    console.log("=== useAgentChat.sendMessage ===");
    console.log("Message:", message);
    console.log("Options:", options);

    const userMessage: ChatMessage = { 
      role: "user", 
      content: message,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("agent-chat", {
        body: {
          message,
          history: [...messages, userMessage].slice(-10).map(m => ({
            role: m.role,
            content: m.content,
          })),
          agentSettings,
          userContext,
          generatedPosts,
          generateImage: options?.generateImage ?? false,
          uploadedImages: options?.uploadedImages ?? [],
        },
      });

      console.log("Agent response:", data);

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      const assistantMessage: ChatMessage = {
        role: "assistant",
        content: data.message,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMessage]);

      // If posts were generated, add them
      if (data.type === "posts_generated" && data.posts?.length > 0) {
        // Mark posts for image generation if toggle is ON
        const postsWithImageFlag = data.posts.map((post: GeneratedPost) => ({
          ...post,
          generateImage: options?.generateImage ?? false,
        }));
        
        setGeneratedPosts(prev => [...postsWithImageFlag, ...prev]);
        toast.success(`Created ${data.posts.length} post(s)!`);
        
        // FIX 1: Auto-generate images if toggle is ON
        if (options?.generateImage) {
          console.log("🎨 Auto-generating images for posts...");
          toast.info("Generating AI images...");
          
          // Generate images for each new post
          for (const post of postsWithImageFlag) {
            try {
              const { data: imageData, error: imageError } = await supabase.functions.invoke("generate-post-image", {
                body: {
                  prompt: post.imagePrompt,
                  postContent: post.content,
                },
              });

              if (imageError) throw imageError;
              if (imageData.error) throw new Error(imageData.error);

              // Update the post with the generated image
              setGeneratedPosts(prev =>
                prev.map(p => p.id === post.id ? { 
                  ...p, 
                  imageUrl: imageData.imageUrl,
                  isGeneratingImage: false 
                } : p)
              );
              toast.success("Image generated!");
            } catch (imgError: any) {
              console.error("Image generation error:", imgError);
              toast.error(`Image failed: ${imgError.message || "Unknown error"}`);
            }
          }
        }
      }

    } catch (error: any) {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: `Sorry, I encountered an error: ${error.message || "Unknown error"}. Please try again.`,
        timestamp: new Date(),
      }]);
      toast.error(error.message || "Failed to send message");
    } finally {
      setIsLoading(false);
    }
  }, [messages, agentSettings, userContext, isLoading, generatedPosts]);

  const resetChat = useCallback(() => {
    setMessages([getInitialMessage(agentSettings.type)]);
    setGeneratedPosts([]);
    localStorage.removeItem(CHAT_STORAGE_KEY);
    localStorage.removeItem(POSTS_STORAGE_KEY);
    toast.success("Chat history cleared");
  }, [agentSettings.type]);

  const clearHistory = useCallback(() => {
    resetChat();
  }, [resetChat]);

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
    clearHistory,
    updatePost,
    deletePost,
    regeneratePost,
    generateImageForPost,
    setGeneratedPosts,
  };
}
