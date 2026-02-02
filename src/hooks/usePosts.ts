import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Post {
  id: string;
  user_id: string;
  agent_id: string | null;
  agent_name: string | null;
  content: string;
  photo_url: string | null;
  status: string;
  scheduled_time: string | null;
  posted_at: string | null;
  linkedin_post_url: string | null;
  linkedin_post_id: string | null;
  retry_count: number;
  last_error: string | null;
  next_retry_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreatePostData {
  content: string;
  photo_url?: string;
  status?: string;
  scheduled_time?: string;
  agent_id?: string;
  agent_name?: string;
}

// Polling interval for fallback (10 seconds)
const POLLING_INTERVAL_MS = 10000;

export const usePosts = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const fetchPosts = useCallback(async (filters?: { status?: string; limit?: number }) => {
    try {
      setIsLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setPosts([]);
        return;
      }

      let query = supabase
        .from("posts")
        .select("*")
        .eq("user_id", user.id)
        .order("scheduled_time", { ascending: true, nullsFirst: false });

      if (filters?.status) {
        query = query.eq("status", filters.status);
      }

      if (filters?.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;
      setPosts(data || []);
    } catch (err) {
      console.error("Error fetching posts:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch posts");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Set up realtime subscription for post status updates
  useEffect(() => {
    const setupRealtimeSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const channel = supabase
        .channel('posts-status-changes')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'posts',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            console.log('📡 Post updated via realtime:', payload.new);
            // Update local state with the new post data
            setPosts(prev => 
              prev.map(post => 
                post.id === payload.new.id 
                  ? { ...post, ...payload.new as Post }
                  : post
              )
            );
            
            // Show toast if post was just published
            if (payload.new.status === 'posted' && payload.old?.status !== 'posted') {
              toast({
                title: "Post Published ✅",
                description: "Your LinkedIn post has been published successfully!",
              });
            }
            
            // Show toast if post failed
            if (payload.new.status === 'failed' && payload.old?.status !== 'failed') {
              toast({
                title: "Post Failed ❌",
                description: payload.new.last_error || "Failed to publish your post.",
                variant: "destructive",
              });
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };

    setupRealtimeSubscription();
  }, [toast]);

  // Listen for extension events (Chrome extension messages)
  useEffect(() => {
    const handlePostPublished = (event: CustomEvent) => {
      const data = event.detail;
      console.log('🔗 Extension: Post published event', data);
      
      // Immediately update local state if we have postId
      if (data?.postId) {
        setPosts(prev => 
          prev.map(post => 
            post.id === data.postId 
              ? { 
                  ...post, 
                  status: 'posted',
                  linkedin_post_url: data.linkedinUrl || post.linkedin_post_url,
                  posted_at: data.postedAt || new Date().toISOString()
                }
              : post
          )
        );
      }
      
      // Refetch to ensure consistency
      fetchPosts();
    };

    const handlePostFailed = (event: CustomEvent) => {
      const data = event.detail;
      console.log('❌ Extension: Post failed event', data);
      
      if (data?.postId) {
        setPosts(prev => 
          prev.map(post => 
            post.id === data.postId 
              ? { ...post, status: 'failed', last_error: data.error || 'Unknown error' }
              : post
          )
        );
      }
      
      fetchPosts();
    };

    // Listen for both bridge events and direct extension messages
    window.addEventListener('linkedbot:post-published', handlePostPublished as EventListener);
    window.addEventListener('linkedbot:post-failed', handlePostFailed as EventListener);
    
    return () => {
      window.removeEventListener('linkedbot:post-published', handlePostPublished as EventListener);
      window.removeEventListener('linkedbot:post-failed', handlePostFailed as EventListener);
    };
  }, [fetchPosts]);

  // Polling fallback: refetch every 10 seconds + on window focus
  useEffect(() => {
    // Start polling interval
    pollingRef.current = setInterval(() => {
      console.log('🔄 Polling: Refreshing posts...');
      fetchPosts();
    }, POLLING_INTERVAL_MS);

    // Also refetch on window focus
    const handleFocus = () => {
      console.log('👁️ Window focus: Refreshing posts...');
      fetchPosts();
    };

    window.addEventListener('focus', handleFocus);
    
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
      window.removeEventListener('focus', handleFocus);
    };
  }, [fetchPosts]);

  // Fetch all queued posts (pending + posting = not yet posted)
  const fetchScheduledPosts = useCallback(async () => {
    // Fetch all posts without status filter - let UI filter
    return fetchPosts();
  }, [fetchPosts]);

  // Set post to "posting" state (optimistic UI before extension publishes)
  const markAsPosting = useCallback((postId: string) => {
    setPosts(prev =>
      prev.map(post =>
        post.id === postId
          ? { ...post, status: 'posting' }
          : post
      )
    );
  }, []);

  const createPost = useCallback(async (postData: CreatePostData): Promise<Post | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Not authenticated",
          description: "Please log in to create a post.",
          variant: "destructive",
        });
        return null;
      }

      const { data, error: createError } = await supabase
        .from("posts")
        .insert({
          user_id: user.id,
          content: postData.content,
          photo_url: postData.photo_url,
          status: postData.status || "draft",
          scheduled_time: postData.scheduled_time,
          agent_id: postData.agent_id,
          agent_name: postData.agent_name,
        })
        .select()
        .single();

      if (createError) throw createError;

      const newPost = data as Post;
      setPosts(prev => [newPost, ...prev]);

      return newPost;
    } catch (err) {
      console.error("Error creating post:", err);
      toast({
        title: "Failed to create post",
        description: err instanceof Error ? err.message : "An error occurred",
        variant: "destructive",
      });
      return null;
    }
  }, [toast]);

  const updatePost = useCallback(async (postId: string, updates: Partial<Post>): Promise<boolean> => {
    try {
      const { error: updateError } = await supabase
        .from("posts")
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("id", postId);

      if (updateError) throw updateError;

      setPosts(prev =>
        prev.map(post =>
          post.id === postId
            ? { ...post, ...updates, updated_at: new Date().toISOString() }
            : post
        )
      );

      return true;
    } catch (err) {
      console.error("Error updating post:", err);
      toast({
        title: "Failed to update post",
        description: err instanceof Error ? err.message : "An error occurred",
        variant: "destructive",
      });
      return false;
    }
  }, [toast]);

  const deletePost = useCallback(async (postId: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await supabase
        .from("posts")
        .delete()
        .eq("id", postId);

      if (deleteError) throw deleteError;

      setPosts(prev => prev.filter(post => post.id !== postId));

      toast({
        title: "Post deleted",
        description: "The post has been removed.",
      });

      return true;
    } catch (err) {
      console.error("Error deleting post:", err);
      toast({
        title: "Failed to delete post",
        description: err instanceof Error ? err.message : "An error occurred",
        variant: "destructive",
      });
      return false;
    }
  }, [toast]);

  const getPostsForDate = useCallback((date: Date): Post[] => {
    return posts.filter(post => {
      if (!post.scheduled_time) return false;
      const postDate = new Date(post.scheduled_time);
      return (
        postDate.getFullYear() === date.getFullYear() &&
        postDate.getMonth() === date.getMonth() &&
        postDate.getDate() === date.getDate()
      );
    });
  }, [posts]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  return {
    posts,
    isLoading,
    error,
    fetchPosts,
    fetchScheduledPosts,
    createPost,
    updatePost,
    deletePost,
    getPostsForDate,
    markAsPosting, // New: for optimistic UI
  };
};
