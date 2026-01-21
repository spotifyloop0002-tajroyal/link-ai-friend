import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatScheduledTimeIST, parseScheduleTimeIST, isPostDue } from '@/lib/timezoneUtils';

interface ScheduledPost {
  id: string;
  content: string;
  photo_url: string | null;
  scheduled_time: string;
  status: 'draft' | 'scheduled' | 'pending' | 'published' | 'failed';
  retry_count: number;
  last_error: string | null;
  next_retry_at: string | null;
  created_at: string;
  updated_at: string;
}

export function useScheduledPosts() {
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch all user's posts
  const fetchPosts = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('user_id', user.id)
        .order('scheduled_time', { ascending: true });

      if (error) throw error;
      
      // Cast to proper types since we know the structure
      setPosts((data || []) as unknown as ScheduledPost[]);
    } catch (error) {
      console.error('Error fetching posts:', error);
      toast.error('Failed to load posts');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Schedule a new post
  const schedulePost = useCallback(async (
    content: string,
    scheduledTime: string | Date,
    photoUrl?: string
  ): Promise<{ success: boolean; postId?: string; error?: string }> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'Not authenticated' };
      }

      // Parse time if it's a natural language string
      let isoTime: string;
      if (typeof scheduledTime === 'string' && !scheduledTime.includes('T')) {
        const parsed = parseScheduleTimeIST(scheduledTime);
        if (!parsed) {
          return { success: false, error: 'Could not parse time' };
        }
        isoTime = parsed;
      } else {
        isoTime = typeof scheduledTime === 'string' 
          ? scheduledTime 
          : scheduledTime.toISOString();
      }

      // Validate time is in the future
      if (new Date(isoTime) <= new Date()) {
        return { success: false, error: 'Scheduled time must be in the future' };
      }

      const { data, error } = await supabase
        .from('posts')
        .insert({
          user_id: user.id,
          content,
          photo_url: photoUrl || null,
          scheduled_time: isoTime,
          status: 'scheduled',
          retry_count: 0,
        })
        .select()
        .single();

      if (error) throw error;

      // Update local state
      await fetchPosts();

      toast.success(`Post scheduled for ${formatScheduledTimeIST(isoTime)}`);
      return { success: true, postId: data.id };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to schedule post';
      toast.error(message);
      return { success: false, error: message };
    }
  }, [fetchPosts]);

  // Update post status
  const updatePostStatus = useCallback(async (
    postId: string,
    status: 'draft' | 'scheduled' | 'published' | 'failed',
    additionalData?: { 
      linkedin_post_id?: string; 
      linkedin_post_url?: string;
      last_error?: string;
    }
  ) => {
    try {
      const updateData: Record<string, unknown> = {
        status,
        updated_at: new Date().toISOString(),
        ...additionalData,
      };

      if (status === 'published') {
        updateData.posted_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('posts')
        .update(updateData)
        .eq('id', postId);

      if (error) throw error;

      // Update local state
      setPosts(prev => prev.map(p => 
        p.id === postId 
          ? { ...p, ...updateData } as ScheduledPost
          : p
      ));

      return { success: true };
    } catch (error) {
      console.error('Error updating post status:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }, []);

  // Retry a failed post
  const retryPost = useCallback(async (postId: string) => {
    try {
      const post = posts.find(p => p.id === postId);
      if (!post) {
        return { success: false, error: 'Post not found' };
      }

      // Reset retry count and reschedule for now
      const { error } = await supabase
        .from('posts')
        .update({
          status: 'scheduled',
          retry_count: 0,
          last_error: null,
          next_retry_at: null,
          scheduled_time: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', postId);

      if (error) throw error;

      toast.success('Post queued for retry');
      await fetchPosts();
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to retry post';
      toast.error(message);
      return { success: false, error: message };
    }
  }, [posts, fetchPosts]);

  // Delete a post
  const deletePost = useCallback(async (postId: string) => {
    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId);

      if (error) throw error;

      setPosts(prev => prev.filter(p => p.id !== postId));
      toast.success('Post deleted');
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete post';
      toast.error(message);
      return { success: false, error: message };
    }
  }, []);

  // Cancel a scheduled post
  const cancelScheduledPost = useCallback(async (postId: string) => {
    try {
      const { error } = await supabase
        .from('posts')
        .update({
          status: 'draft',
          scheduled_time: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', postId);

      if (error) throw error;

      await fetchPosts();
      toast.success('Schedule cancelled');
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to cancel schedule';
      toast.error(message);
      return { success: false, error: message };
    }
  }, [fetchPosts]);

  // Get posts by status
  const getPostsByStatus = useCallback((status: ScheduledPost['status']) => {
    return posts.filter(p => p.status === status);
  }, [posts]);

  // Get due posts (for extension to process)
  const getDuePosts = useCallback(() => {
    return posts.filter(p => 
      p.status === 'scheduled' && 
      p.scheduled_time && 
      isPostDue(p.scheduled_time)
    );
  }, [posts]);

  // Initial fetch
  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  // Subscribe to realtime updates
  useEffect(() => {
    const channel = supabase
      .channel('posts-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'posts',
        },
        () => {
          fetchPosts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchPosts]);

  return {
    posts,
    isLoading,
    schedulePost,
    updatePostStatus,
    retryPost,
    deletePost,
    cancelScheduledPost,
    getPostsByStatus,
    getDuePosts,
    fetchPosts,
    // Helpers
    formatScheduledTime: formatScheduledTimeIST,
  };
}
