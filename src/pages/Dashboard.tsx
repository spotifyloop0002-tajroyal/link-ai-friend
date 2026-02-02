import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { ExtensionStatus } from "@/components/ExtensionStatus";
import { MissingProfileBanner } from "@/components/linkedin/MissingProfileBanner";
import { useLinkedBotExtension } from "@/hooks/useLinkedBotExtension";
import { useLinkedInAnalytics } from "@/hooks/useLinkedInAnalytics";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useAgents } from "@/hooks/useAgents";
import { supabase } from "@/integrations/supabase/client";
import {
  Bot,
  Calendar,
  TrendingUp,
  Plus,
  Clock,
  Eye,
  Edit,
  Trash2,
  Loader2,
  Users,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  ThumbsUp,
  MessageSquare,
  Share2,
  BarChart3,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format, formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface PostAnalytics {
  views?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  updatedAt?: string;
}

interface ScheduledPost {
  id: string;
  content: string;
  scheduled_time: string;
  status: string;
  posted_at?: string;
  linkedin_post_url?: string;
  verified?: boolean;
  tracking_id?: string;
  views_count?: number;
  likes_count?: number;
  comments_count?: number;
  shares_count?: number;
  last_synced_at?: string;
}

// LinkedIn URL validation pattern
const LINKEDIN_URL_PATTERN = /linkedin\.com\/(posts|feed).*activity[-:][0-9]{19}/;

// Helper to determine display status
// Maps database status to display status
function getPostDisplayStatus(post: ScheduledPost): 'published' | 'posted_pending' | 'posting' | 'queued' | 'failed' {
  // If status is posted
  if (post.status === 'posted') {
    const hasValidUrl = post.linkedin_post_url && LINKEDIN_URL_PATTERN.test(post.linkedin_post_url);
    return hasValidUrl ? 'published' : 'posted_pending';
  }
  
  // If status is failed
  if (post.status === 'failed') {
    return 'failed';
  }
  
  // If actively posting
  if (post.status === 'posting') {
    return 'posting';
  }
  
  // pending = queued for posting
  return 'queued';
}

const DashboardPage = () => {
  const navigate = useNavigate();
  const { isConnected, sendPendingPosts } = useLinkedBotExtension();
  const { profile, isLoading: profileLoading } = useUserProfile();
  const { posts: analyticsPosts, isLoading: analyticsLoading } = useLinkedInAnalytics();
  const { agents, isLoading: agentsLoading } = useAgents();
  
  const [scheduledPosts, setScheduledPosts] = useState<ScheduledPost[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);

  // Fetch posts from database (scheduled + recently posted)
  const fetchPosts = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("posts")
        .select("id, content, scheduled_time, status, posted_at, linkedin_post_url, verified, tracking_id, views_count, likes_count, comments_count, shares_count, last_synced_at")
        .eq("user_id", user.id)
        .in("status", ["pending", "posting", "posted", "failed"]) // v4.0 statuses
        .order("scheduled_time", { ascending: true })
        .limit(20);

      if (error) throw error;
      setScheduledPosts(data || []);
    } catch (err) {
      console.error("Error fetching posts:", err);
    } finally {
      setPostsLoading(false);
    }
  }, []);

  // Update post analytics in real-time from extension events
  const updatePostAnalytics = useCallback((trackingId: string, analytics: PostAnalytics) => {
    setScheduledPosts(prev => 
      prev.map(post => 
        post.tracking_id === trackingId 
          ? { 
              ...post, 
              views_count: analytics.views ?? post.views_count,
              likes_count: analytics.likes ?? post.likes_count,
              comments_count: analytics.comments ?? post.comments_count,
              shares_count: analytics.shares ?? post.shares_count,
              last_synced_at: analytics.updatedAt ?? new Date().toISOString(),
            }
          : post
      )
    );
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  // Real-time subscription for post status changes
  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const setupRealtimeSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      channel = supabase
        .channel('dashboard-posts-changes')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'posts',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            console.log('📡 Real-time post update:', payload);
            // Update the post in state immediately
            setScheduledPosts(prev => 
              prev.map(post => 
                post.id === payload.new.id 
                  ? { ...post, ...payload.new as ScheduledPost }
                  : post
              )
            );
          }
        )
        .subscribe((status) => {
          console.log('Dashboard realtime subscription:', status);
        });
    };

    setupRealtimeSubscription();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  // Polling fallback - refetch every 15 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchPosts();
    }, 15000);

    return () => clearInterval(interval);
  }, [fetchPosts]);

  // Refetch on window focus
  useEffect(() => {
    const handleFocus = () => {
      fetchPosts();
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [fetchPosts]);

  // Listen for extension events via window.postMessage
  useEffect(() => {
    const handleExtensionMessage = (event: MessageEvent) => {
      // Only accept messages from our extension
      if (event.data?.action !== 'extensionEvent') return;
      
      console.log('📡 Extension event received:', event.data);
      
      if (event.data.event === 'analyticsUpdated') {
        const { trackingId, analytics } = event.data.data || {};
        if (trackingId && analytics) {
          updatePostAnalytics(trackingId, analytics);
          toast.success('Analytics updated!', {
            description: `Views: ${analytics.views || 0}, Likes: ${analytics.likes || 0}`,
          });
        }
      }
      
      if (event.data.event === 'postPublished') {
        console.log('✅ Post published via extension:', event.data.data);
        fetchPosts(); // Refetch to get latest status
        toast.success('Post published successfully!');
      }
    };

    // Also listen for custom DOM events from bridge
    const handlePostPublished = (event: Event) => {
      const customEvent = event as CustomEvent;
      console.log('✅ Post published (bridge):', customEvent.detail);
      fetchPosts();
    };

    const handleAnalyticsUpdated = (event: Event) => {
      const customEvent = event as CustomEvent;
      console.log('📊 Analytics updated (bridge):', customEvent.detail);
      const { trackingId, analytics, postId } = customEvent.detail || {};
      if (trackingId || postId) {
        updatePostAnalytics(trackingId || postId, analytics || customEvent.detail);
      }
    };

    window.addEventListener('message', handleExtensionMessage);
    window.addEventListener('linkedbot:post-published', handlePostPublished);
    window.addEventListener('linkedbot:analytics-updated', handleAnalyticsUpdated);

    return () => {
      window.removeEventListener('message', handleExtensionMessage);
      window.removeEventListener('linkedbot:post-published', handlePostPublished);
      window.removeEventListener('linkedbot:analytics-updated', handleAnalyticsUpdated);
    };
  }, [fetchPosts, updatePostAnalytics]);

  // Calculate real stats - count pending + posted
  const totalViews = analyticsPosts.reduce((sum, p) => sum + (p.views || 0), 0);
  const queuedCount = scheduledPosts.filter(p => p.status === 'pending' || p.status === 'posting').length;
  const postedCount = scheduledPosts.filter(p => p.status === 'posted').length;
  const activeAgentsCount = agents.filter(a => a.is_active).length;

  const stats = [
    {
      label: "Active Agents",
      value: activeAgentsCount.toString(),
      subtitle: "AI content creators",
      icon: Users,
      color: "from-primary to-primary/60",
    },
    {
      label: "Posts Created",
      value: profile?.posts_created_count?.toString() || "0",
      subtitle: "Total generated",
      icon: Bot,
      color: "from-secondary to-secondary/60",
    },
    {
      label: "Queued Posts",
      value: queuedCount.toString(),
      subtitle: `${postedCount} already posted`,
      icon: Calendar,
      color: "from-warning to-warning/60",
    },
    {
      label: "Total Reach",
      value: totalViews >= 1000 ? `${(totalViews / 1000).toFixed(1)}K` : totalViews.toString(),
      subtitle: "From synced analytics",
      icon: TrendingUp,
      color: "from-success to-success/60",
    },
  ];

  const isLoading = profileLoading || analyticsLoading || postsLoading || agentsLoading;

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Extension Status */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <ExtensionStatus />
        </motion.div>

        {/* Missing Profile URL Banner - Show if extension connected but no profile URL */}
        {isConnected && !profile?.linkedin_profile_url && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <MissingProfileBanner />
          </motion.div>
        )}
        
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        >
          <div>
            <h1 className="text-3xl font-bold">
              Welcome back{profile?.name ? `, ${profile.name.split(' ')[0]}` : ''}!
            </h1>
            <p className="text-muted-foreground mt-1">
              Here's what's happening with your LinkedIn content
            </p>
          </div>
          <Button variant="gradient" className="gap-2" onClick={() => navigate("/dashboard/agents")}>
            <Plus className="w-4 h-4" />
            Create New Agent
          </Button>
        </motion.div>

        {/* Stats grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-card rounded-2xl border border-border p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center`}>
                  <stat.icon className="w-6 h-6 text-primary-foreground" />
                </div>
              </div>
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-sm text-muted-foreground">{stat.subtitle}</p>
            </motion.div>
          ))}
        </div>

        {/* Upcoming posts */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-card rounded-2xl border border-border shadow-sm"
        >
          <div className="p-6 border-b border-border">
            <h2 className="text-xl font-semibold">Upcoming Scheduled Posts</h2>
          </div>
          {scheduledPosts.length === 0 ? (
            <div className="p-12 text-center">
              <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">No scheduled posts yet</p>
              <Button variant="outline" onClick={() => navigate("/dashboard/agents")}>
                Create Your First Post
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Post Preview</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Scheduled</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Status</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Analytics</th>
                    <th className="text-right p-4 text-sm font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {scheduledPosts.map((post) => (
                    <tr 
                      key={post.id} 
                      data-tracking-id={post.tracking_id}
                      className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors"
                    >
                      <td className="p-4">
                        <div className="space-y-1">
                          <p className="text-sm line-clamp-1 max-w-xs">{post.content}</p>
                          {/* URL Status Indicator */}
                          <div className="post-url-status">
                            {post.linkedin_post_url ? (
                              <a 
                                href={post.linkedin_post_url} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="text-primary hover:underline text-xs flex items-center gap-1"
                              >
                                <ExternalLink className="w-3 h-3" />
                                View on LinkedIn
                              </a>
                            ) : post.status === 'posted' ? (
                              <span className="text-muted-foreground text-xs flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                URL pending...
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="w-4 h-4 text-muted-foreground" />
                          <span>
                            {post.posted_at 
                              ? format(new Date(post.posted_at), "MMM d, yyyy 'at' h:mm a")
                              : post.scheduled_time 
                                ? format(new Date(post.scheduled_time), "MMM d, yyyy 'at' h:mm a")
                                : 'Not scheduled'
                            }
                          </span>
                        </div>
                      </td>
                      <td className="p-4">
                        {(() => {
                          const displayStatus = getPostDisplayStatus(post);
                          switch (displayStatus) {
                            case 'published':
                              return (
                                <Badge variant="default" className="bg-success/10 text-success border-success/20 gap-1">
                                  <CheckCircle2 className="w-3 h-3" />
                                  Published
                                </Badge>
                              );
                            case 'posted_pending':
                              return (
                                <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 gap-1">
                                  <Clock className="w-3 h-3" />
                                  Posted (verifying)
                                </Badge>
                              );
                            case 'posting':
                              return (
                                <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 border-blue-500/20 gap-1">
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                  Posting...
                                </Badge>
                              );
                            case 'queued':
                              return (
                                <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20 gap-1">
                                  <Clock className="w-3 h-3" />
                                  Queued
                                </Badge>
                              );
                            case 'failed':
                              return (
                                <Badge variant="destructive" className="gap-1">
                                  <AlertCircle className="w-3 h-3" />
                                  Failed
                                </Badge>
                              );
                            default:
                              return (
                                <Badge variant="secondary" className="gap-1">
                                  {post.status}
                                </Badge>
                              );
                          }
                        })()}
                      </td>
                      {/* Analytics Column */}
                      <td className="p-4">
                        {post.status === 'posted' || post.status === 'published' ? (
                          <div className="space-y-1">
                            {/* Analytics Stats */}
                            <div className="flex items-center gap-3 text-xs">
                              <span className="views-count flex items-center gap-1 text-muted-foreground">
                                <Eye className="w-3 h-3" />
                                {post.views_count || 0}
                              </span>
                              <span className="likes-count flex items-center gap-1 text-muted-foreground">
                                <ThumbsUp className="w-3 h-3" />
                                {post.likes_count || 0}
                              </span>
                              <span className="comments-count flex items-center gap-1 text-muted-foreground">
                                <MessageSquare className="w-3 h-3" />
                                {post.comments_count || 0}
                              </span>
                              <span className="shares-count flex items-center gap-1 text-muted-foreground">
                                <Share2 className="w-3 h-3" />
                                {post.shares_count || 0}
                              </span>
                            </div>
                            {/* Analytics Tracking Status */}
                            <div className="analytics-status last-updated">
                              {post.last_synced_at ? (
                                <span className="text-success text-xs flex items-center gap-1">
                                  <BarChart3 className="w-3 h-3" />
                                  Synced {formatDistanceToNow(new Date(post.last_synced_at))} ago
                                </span>
                              ) : (
                                <span className="text-muted-foreground text-xs flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  Waiting for analytics...
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-end gap-2">
                          {/* Mark as Posted fallback button */}
                          {post.linkedin_post_url && post.status !== 'posted' && (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="h-8 text-xs gap-1 text-success border-success/30 hover:bg-success/10"
                              onClick={async () => {
                                try {
                                  const { error } = await supabase
                                    .from('posts')
                                    .update({ 
                                      status: 'posted', 
                                      posted_at: new Date().toISOString(),
                                      verified: true 
                                    })
                                    .eq('id', post.id);
                                  if (error) throw error;
                                  toast.success('Post marked as posted!');
                                  fetchPosts();
                                } catch (err) {
                                  console.error('Failed to mark as posted:', err);
                                  toast.error('Failed to update post status');
                                }
                              }}
                              title="Mark as posted (URL exists but status not synced)"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              Mark Posted
                            </Button>
                          )}
                          {post.linkedin_post_url && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8"
                              onClick={() => window.open(post.linkedin_post_url, '_blank')}
                              title="View on LinkedIn"
                            >
                              <ExternalLink className="w-4 h-4 text-primary" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>

        {/* Quick actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="grid sm:grid-cols-2 gap-4"
        >
          <button
            onClick={() => navigate("/dashboard/agents")}
            className="group p-6 bg-card rounded-2xl border border-border shadow-sm hover:shadow-md hover:border-primary/50 transition-all text-left"
          >
            <div className="w-14 h-14 rounded-xl gradient-bg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Bot className="w-7 h-7 text-primary-foreground" />
            </div>
            <h3 className="font-semibold text-lg mb-1">Create New Agent</h3>
            <p className="text-sm text-muted-foreground">
              Set up a new AI agent with custom posting style and topics
            </p>
          </button>

          <button
            onClick={() => navigate("/dashboard/calendar")}
            className="group p-6 bg-card rounded-2xl border border-border shadow-sm hover:shadow-md hover:border-secondary/50 transition-all text-left"
          >
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-secondary to-secondary/60 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Calendar className="w-7 h-7 text-secondary-foreground" />
            </div>
            <h3 className="font-semibold text-lg mb-1">View Calendar</h3>
            <p className="text-sm text-muted-foreground">
              Manage your scheduled posts and content calendar
            </p>
          </button>
        </motion.div>
      </div>
    </DashboardLayout>
  );
};

export default DashboardPage;
