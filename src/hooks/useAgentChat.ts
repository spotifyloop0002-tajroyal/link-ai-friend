import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { generatePostTrackingId, embedTrackingId } from "@/lib/postHelpers";
import { 
  parseScheduleTime, 
  validateScheduleTime, 
  formatRelativeScheduledTime,
  SCHEDULE_ERRORS 
} from "@/lib/scheduling";
import { 
  PostStatus, 
  validatePreflightForScheduling, 
  validatePreflightForPostNow,
  canEditPost,
  canDeletePost,
  canPostNow,
  isProcessingState,
  shouldArchivePost,
} from "@/lib/postLifecycle";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp?: Date;
  uploadedImages?: string[]; // URLs of uploaded images for display
}

export interface PreviewPost {
  content: string;
  imageUrl?: string;
  agentType?: string;
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
  status?: PostStatus;
  scheduledTime?: string; // ISO string for when to post
  trackingId?: string;
  dbId?: string; // Database ID after saving
  // NEW: Approval and lifecycle fields
  approved?: boolean;
  imageSkipped?: boolean;
  queuedAt?: string;
  extensionAckAt?: string;
  postedAt?: string;
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

// Storage keys for persistence - now user-specific
const CHAT_STORAGE_PREFIX = "linkedbot_chat_history_";
const POSTS_STORAGE_PREFIX = "linkedbot_generated_posts_";
const MAX_STORED_MESSAGES = 30;

// Get user-specific storage keys
function getChatStorageKey(agentId?: string | null): string {
  return `${CHAT_STORAGE_PREFIX}${agentId || 'default'}`;
}
function getPostsStorageKey(agentId?: string | null): string {
  return `${POSTS_STORAGE_PREFIX}${agentId || 'default'}`;
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
function loadStoredMessages(agentId?: string | null): ChatMessage[] {
  try {
    const stored = localStorage.getItem(getChatStorageKey(agentId));
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

function loadStoredPosts(agentId?: string | null): GeneratedPost[] {
  try {
    const stored = localStorage.getItem(getPostsStorageKey(agentId));
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
  userContext: UserContext = {},
  agentId?: string | null
) {
  // Initialize with stored data or welcome message
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const stored = loadStoredMessages(agentId);
    if (stored.length > 0) {
      console.log("📂 Loaded", stored.length, "messages from storage for agent:", agentId);
      return stored;
    }
    return [getInitialMessage(agentSettings.type)];
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [previewPost, setPreviewPost] = useState<PreviewPost | null>(null);
  
  const [generatedPosts, setGeneratedPosts] = useState<GeneratedPost[]>(() => {
    const stored = loadStoredPosts(agentId);
    if (stored.length > 0) {
      console.log("📂 Loaded", stored.length, "posts from storage for agent:", agentId);
    }
    return stored;
  });

  // Save messages to localStorage when they change
  useEffect(() => {
    if (messages.length > 0) {
      try {
        const messagesToStore = messages.slice(-MAX_STORED_MESSAGES);
        localStorage.setItem(getChatStorageKey(agentId), JSON.stringify(messagesToStore));
      } catch (error) {
        console.error("Error saving chat history:", error);
      }
    }
  }, [messages, agentId]);

  // Save posts to localStorage when they change
  useEffect(() => {
    try {
      localStorage.setItem(getPostsStorageKey(agentId), JSON.stringify(generatedPosts));
    } catch (error) {
      console.error("Error saving posts:", error);
    }
  }, [generatedPosts, agentId]);

  const sendMessage = useCallback(async (message: string, options?: { generateImage?: boolean; uploadedImages?: string[] }): Promise<any> => {
    if (!message.trim() || isLoading) return;

    console.log("=== useAgentChat.sendMessage ===");
    console.log("Message:", message);
    console.log("Options:", options);

    // Store image URLs for display in chat (clean display version)
    const displayImages = options?.uploadedImages ?? [];
    
    // Create display message (without the [UPLOADED_IMAGES:] marker for cleaner chat)
    const displayContent = message.replace(/\[UPLOADED_IMAGES:[^\]]+\]/g, "").trim() || 
      (displayImages.length > 0 ? "Create posts for these images" : message);
    
    const userMessage: ChatMessage = { 
      role: "user", 
      content: displayContent,
      timestamp: new Date(),
      uploadedImages: displayImages.length > 0 ? displayImages : undefined,
    };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // CRITICAL: Log what we're sending to edge function
      console.log("🚀 Sending to edge function:", {
        message,
        generatedPostsCount: generatedPosts.length,
        generatedPosts: generatedPosts.map(p => ({ id: p.id, content: p.content?.substring(0, 50) })),
      });
      
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

      // Handle preview response (for image uploads) - show scheduling dialog
      if (data.type === "post_preview" && data.previewPost) {
        console.log("📸 Received preview post - showing scheduling dialog");
        setPreviewPost({
          content: data.previewPost.content,
          imageUrl: data.previewPost.imageUrl,
          agentType: data.previewPost.agentType,
        });
        // Don't add to generatedPosts yet - wait for user confirmation
        return data;
      }

      // Handle auto_schedule response - return data for parent to handle
      if (data.type === "auto_schedule" && data.postToSchedule && data.scheduledTime) {
        console.log("📅 Auto-schedule response received");
        return data;
      }

      // ALWAYS add posts to generatedPosts IMMEDIATELY when received
      console.log("📦 Response data:", { type: data.type, postsCount: data.posts?.length });
      
      // Add posts regardless of response type (posts_generated, message, etc)
      if (data.posts && data.posts.length > 0) {
        console.log("🔥 ADDING POSTS TO STATE NOW:", data.posts.length);
        console.log("🔥 Post content:", data.posts[0]?.content?.substring(0, 100));
        
        const newPosts: GeneratedPost[] = data.posts.map((p: any) => ({
          ...p,
          id: p.id || `post-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          status: 'draft' as PostStatus,
          approved: false,
          imageSkipped: false,
        }));
        
        // CRITICAL: Add to generated posts immediately
        setGeneratedPosts(prev => {
          const updated = [...newPosts, ...prev];
          console.log("✅ generatedPosts NOW HAS:", updated.length, "posts");
          return updated;
        });
        
        toast.success(`📝 Post created! Say "post now" or give a time to schedule.`);
        
        // Auto-generate images for posts that have generateImage flag
        for (const post of newPosts) {
          if (post.generateImage && post.imagePrompt) {
            console.log("🎨 Auto-generating image for post:", post.id);
            // Delay slightly to ensure state is updated
            setTimeout(() => {
              generateImageForPostDirect(post.id, post.content, post.imagePrompt);
            }, 500);
          }
        }
      } else {
        console.log("⚠️ No posts in response to add");
      }

      return data;

    } catch (error: any) {
      console.error("Chat error:", error);
      
      // Provide user-friendly error message
      let userMessage = "Please try again.";
      if (error.message?.includes("Failed to send a request") || error.message?.includes("FunctionsHttpError")) {
        userMessage = "Server is temporarily unavailable. Please try again in a moment.";
      } else if (error.message?.includes("network") || error.message?.includes("fetch")) {
        userMessage = "Network error. Please check your connection and try again.";
      }
      
      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: `Sorry, I encountered an error. ${userMessage}`,
        timestamp: new Date(),
      }]);
      toast.error("Failed to send message", { description: userMessage });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [messages, agentSettings, userContext, isLoading, generatedPosts]);

  const resetChat = useCallback(() => {
    setMessages([getInitialMessage(agentSettings.type)]);
    setGeneratedPosts([]);
    localStorage.removeItem(getChatStorageKey(agentId));
    localStorage.removeItem(getPostsStorageKey(agentId));
    toast.success("Chat history cleared");
  }, [agentSettings.type, agentId]);

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
    await generateImageForPostDirect(postId, post.content, post.imagePrompt);
  }, [generatedPosts]);

  // Direct image generation that doesn't depend on generatedPosts state
  const generateImageForPostDirect = useCallback(async (postId: string, content: string, imagePrompt?: string) => {
    setGeneratedPosts(prev =>
      prev.map(p => p.id === postId ? { ...p, isGeneratingImage: true } : p)
    );

    try {
      const { data, error } = await supabase.functions.invoke("generate-post-image", {
        body: {
          prompt: imagePrompt,
          postContent: content,
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
  }, []);

  // Validate post content before saving
  const isValidPostContent = (content: string): boolean => {
    if (!content || content.trim().length < 20) return false;
    // Reject JSON-looking content (AI hallucinations)
    if (content.trim().startsWith('{') && content.includes('"action"')) return false;
    if (content.includes('"action_input"')) return false;
    if (content.includes('dalle.text2im')) return false;
    return true;
  };

  // Save post to database with tracking ID
  const savePostToDatabase = useCallback(async (
    post: GeneratedPost,
    scheduledTime?: Date
  ): Promise<GeneratedPost | null> => {
    try {
      // Validate content first
      if (!isValidPostContent(post.content)) {
        toast.error("Invalid post content. Please generate a new post.");
        console.error("❌ Rejected invalid post content:", post.content.substring(0, 100));
        return null;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please log in to save posts");
        return null;
      }

      // Generate tracking ID
      const trackingId = generatePostTrackingId();
      const contentWithTracking = embedTrackingId(post.content, trackingId);

      // ✅ CLEAN ARCHITECTURE: Website ONLY inserts with status='pending'
      // Extension updates to: posting, posted, failed
      const { data: savedPost, error } = await supabase
        .from("posts")
        .insert({
          user_id: user.id,
          content: post.content,
          content_with_tracking: contentWithTracking,
          tracking_id: trackingId,
          photo_url: post.imageUrl || null,
          status: 'pending', // ✅ ALWAYS 'pending' - extension owns status updates
          scheduled_time: scheduledTime?.toISOString() || null,
          agent_id: agentId || null,
        })
        .select()
        .single();

      if (error) {
        console.error("Save post error:", error);
        throw error;
      }

      console.log("✅ Post saved to database with status=pending:", savedPost.id);
      
      // Return updated post with DB info
      return {
        ...post,
        dbId: savedPost.id,
        trackingId: trackingId,
        status: 'pending' as PostStatus, // Always pending
        scheduledTime: scheduledTime?.toISOString(),
      };
    } catch (err) {
      console.error("Failed to save post:", err);
      toast.error("Failed to save post to database");
      return null;
    }
  }, [agentId]);

  // Confirm preview post and add to generated posts
  const confirmPreviewPost = useCallback(async (scheduledTime?: Date) => {
    if (!previewPost) return null;
    
    const newPost: GeneratedPost = {
      id: `post-${Date.now()}`,
      content: previewPost.content,
      suggestedTime: (scheduledTime || new Date()).toISOString(),
      reasoning: "Created from preview",
      scheduledDateTime: (scheduledTime || new Date()).toISOString(),
      imageUrl: previewPost.imageUrl,
      status: 'pending' as PostStatus, // ✅ Always pending
    };
    
    // Save to database
    const savedPost = await savePostToDatabase(newPost, scheduledTime);
    
    if (savedPost) {
      setGeneratedPosts(prev => [savedPost, ...prev]);
      setPreviewPost(null);
      toast.success(scheduledTime ? "Post scheduled!" : "Post created!");
      return savedPost;
    }
    
    // Fallback to local-only if DB save fails
    setGeneratedPosts(prev => [newPost, ...prev]);
    setPreviewPost(null);
    return newPost;
  }, [previewPost, savePostToDatabase]);

  // Clear preview
  const clearPreview = useCallback(() => {
    setPreviewPost(null);
  }, []);

  return {
    messages,
    isLoading,
    generatedPosts,
    previewPost,
    sendMessage,
    resetChat,
    clearHistory,
    updatePost,
    deletePost,
    regeneratePost,
    generateImageForPost,
    setGeneratedPosts,
    confirmPreviewPost,
    clearPreview,
    savePostToDatabase,
  };
}
