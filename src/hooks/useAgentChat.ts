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

interface UseAgentChatReturn {
  messages: ChatMessage[];
  isLoading: boolean;
  generatedPosts: GeneratedPost[];
  sendMessage: (message: string) => Promise<void>;
  resetChat: () => void;
  updatePost: (postId: string, updates: Partial<GeneratedPost>) => void;
  deletePost: (postId: string) => void;
  regeneratePost: (postId: string, agentSettings: AgentSettings, userContext: UserContext) => Promise<void>;
  generateImageForPost: (postId: string) => Promise<void>;
}

const initialMessage: ChatMessage = {
  role: "assistant",
  content: "Hey! 👋 I'm your LinkedIn posting assistant. I can help you create engaging posts for your profile.\n\nI can:\n• Create professional LinkedIn posts on any topic\n• Research trending topics in your industry\n• Suggest the best times to post for maximum reach\n• Generate AI images for your posts\n• Schedule multiple posts in advance\n\nWhat would you like to post about today? Try: \"Create 5 posts about AI trends\""
};

export function useAgentChat(
  agentSettings: AgentSettings,
  userContext: UserContext = {}
): UseAgentChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([initialMessage]);
  const [isLoading, setIsLoading] = useState(false);
  const [generatedPosts, setGeneratedPosts] = useState<GeneratedPost[]>([]);

  const sendMessage = useCallback(async (message: string) => {
    if (!message.trim() || isLoading) return;

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
      }

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
    } finally {
      setIsLoading(false);
    }
  }, [messages, agentSettings, userContext, isLoading]);

  const resetChat = useCallback(() => {
    setMessages([initialMessage]);
    setGeneratedPosts([]);
  }, []);

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
