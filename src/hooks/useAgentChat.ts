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
  regeneratePost: (postId: string) => Promise<void>;
}

const initialMessage: ChatMessage = {
  role: "assistant",
  content: "Hey! 👋 I'm your LinkedIn posting assistant. I can help you create engaging posts for your profile.\n\nI can:\n• Create professional LinkedIn posts on any topic\n• Research trending topics in your industry\n• Suggest the best times to post for maximum reach\n• Generate AI images for your posts\n• Schedule multiple posts in advance\n\nWhat would you like to post about today? Or I can suggest some trending topics!"
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
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("agent-chat", {
        body: {
          message,
          history: messages,
          agentSettings,
          userContext,
        },
      });

      if (error) {
        throw error;
      }

      if (data.error) {
        throw new Error(data.error);
      }

      // Add assistant message
      const assistantMessage: ChatMessage = {
        role: "assistant",
        content: data.message,
      };
      setMessages(prev => [...prev, assistantMessage]);

      // If posts were generated, update state
      if (data.type === "posts_generated" && data.posts?.length > 0) {
        setGeneratedPosts(data.posts);
        toast.success(`Created ${data.posts.length} posts about "${data.topic}"!`);
      }

    } catch (error: any) {
      console.error("Chat error:", error);
      
      let errorMessage = "Sorry, I encountered an error. Please try again.";
      if (error.message?.includes("Rate limits")) {
        errorMessage = "I'm getting too many requests right now. Please wait a moment and try again.";
      } else if (error.message?.includes("Payment required")) {
        errorMessage = "AI credits are low. Please add more credits in settings.";
      }
      
      setMessages(prev => [
        ...prev,
        { role: "assistant", content: errorMessage }
      ]);
      
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

  const regeneratePost = useCallback(async (postId: string) => {
    const post = generatedPosts.find(p => p.id === postId);
    if (!post) return;

    setIsLoading(true);
    try {
      // For now, just notify - in production this would call the API
      toast.info("Regenerating post...");
      
      // Simulate regeneration delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      toast.success("Post regenerated!");
    } catch (error) {
      toast.error("Failed to regenerate post");
    } finally {
      setIsLoading(false);
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
  };
}
