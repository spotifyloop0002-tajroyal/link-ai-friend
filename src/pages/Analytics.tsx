import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useLinkedBotExtension } from "@/hooks/useLinkedBotExtension";
import { useLinkedInAnalytics } from "@/hooks/useLinkedInAnalytics";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useToast } from "@/hooks/use-toast";
import { usePageTitle } from "@/hooks/usePageTitle";
import { MissingProfileBanner } from "@/components/linkedin/MissingProfileBanner";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  Eye,
  Heart,
  MessageCircle,
  Share2,
  TrendingUp,
  RefreshCw,
  Wifi,
  WifiOff,
  Loader2,
  ExternalLink,
  Search,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RefreshAnalyticsButton } from "@/components/analytics/RefreshAnalyticsButton";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface PostData {
  id: string;
  content: string;
  views_count: number;
  likes_count: number;
  comments_count: number;
  shares_count: number;
  posted_at: string | null;
  created_at: string;
  linkedin_post_url: string | null;
  status: string | null;
}

const formatNumber = (num: number): string => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
  if (num >= 1000) return (num / 1000).toFixed(1) + "K";
  return num.toString();
};

const calcEngagement = (v: number, l: number, c: number, s: number): number => {
  if (!v || v === 0) return 0;
  return ((l + c + s) / v) * 100;
};

const AnalyticsPage = () => {
  usePageTitle("Analytics");
  const { toast } = useToast();
  const { isConnected, isInstalled } = useLinkedBotExtension();
  const { profile: userProfile, isLoading: profileLoading } = useUserProfile();
  const { isSyncing, syncAnalytics } = useLinkedInAnalytics();

  const [posts, setPosts] = useState<PostData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState("30");
  const [sortBy, setSortBy] = useState("latest");
  const [selectedPost, setSelectedPost] = useState<PostData | null>(null);
  const [scrapingProgress, setScrapingProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);

  const hasProfileUrl = Boolean(userProfile?.linkedin_profile_url);

  // Fetch posts from DB
  const fetchPosts = async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from("posts")
        .select("id, content, views_count, likes_count, comments_count, shares_count, posted_at, created_at, linkedin_post_url, status")
        .eq("user_id", session.user.id)
        .eq("status", "posted")
        .order("posted_at", { ascending: false });

      if (error) throw error;
      setPosts((data as PostData[]) || []);
    } catch (err) {
      console.error("Failed to fetch posts:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  // Listen for extension scraping events
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.source !== window) return;
      if (event.data.type === "EXTENSION_EVENT" && event.data.event === "scrapingProgress") {
        const { current, total } = event.data.data;
        setScrapingProgress({ current, total });
      }
      if (event.data.type === "EXTENSION_EVENT" && event.data.event === "scrapingComplete") {
        setScrapingProgress(null);
        fetchPosts();
      }
      if (event.data.type === "BULK_ANALYTICS_RESULT") {
        setScrapingProgress(null);
        fetchPosts();
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  // Filter by period
  const filteredPosts = useMemo(() => {
    if (period === "all") return posts;
    const days = parseInt(period);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return posts.filter((p) => {
      const date = p.posted_at ? new Date(p.posted_at) : new Date(p.created_at);
      return date >= cutoff;
    });
  }, [posts, period]);

  // Sort
  const sortedPosts = useMemo(() => {
    const sorted = [...filteredPosts];
    switch (sortBy) {
      case "most_viewed":
        return sorted.sort((a, b) => (b.views_count || 0) - (a.views_count || 0));
      case "most_engaged":
        return sorted.sort(
          (a, b) =>
            calcEngagement(b.views_count, b.likes_count, b.comments_count, b.shares_count) -
            calcEngagement(a.views_count, a.likes_count, a.comments_count, a.shares_count)
        );
      default:
        return sorted;
    }
  }, [filteredPosts, sortBy]);

  // Summary stats
  const totalViews = filteredPosts.reduce((s, p) => s + (p.views_count || 0), 0);
  const totalLikes = filteredPosts.reduce((s, p) => s + (p.likes_count || 0), 0);
  const totalComments = filteredPosts.reduce((s, p) => s + (p.comments_count || 0), 0);
  const totalShares = filteredPosts.reduce((s, p) => s + (p.shares_count || 0), 0);
  const avgEngagement = totalViews > 0
    ? (((totalLikes + totalComments + totalShares) / totalViews) * 100).toFixed(1)
    : "0.0";

  // Chart data - impressions bar chart
  const impressionsChartData = useMemo(() => {
    return [...filteredPosts]
      .slice(0, 15)
      .reverse()
      .map((p, i) => ({
        date: p.posted_at
          ? new Date(p.posted_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })
          : `Post ${i + 1}`,
        impressions: p.views_count || 0,
      }));
  }, [filteredPosts]);

  // Line chart - trends
  const trendChartData = useMemo(() => {
    return [...filteredPosts]
      .slice(0, 15)
      .reverse()
      .map((p, i) => ({
        date: p.posted_at
          ? new Date(p.posted_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })
          : `Post ${i + 1}`,
        impressions: p.views_count || 0,
        likes: p.likes_count || 0,
        comments: p.comments_count || 0,
        shares: p.shares_count || 0,
      }));
  }, [filteredPosts]);

  // Engagement comparison chart
  const engagementChartData = useMemo(() => {
    return [...filteredPosts]
      .slice(0, 10)
      .reverse()
      .map((p, i) => ({
        post: `Post ${i + 1}`,
        engagement: parseFloat(calcEngagement(p.views_count, p.likes_count, p.comments_count, p.shares_count).toFixed(1)),
      }));
  }, [filteredPosts]);

  const handleSyncAnalytics = async () => {
    if (!isConnected) {
      toast({
        title: "Extension not connected",
        description: "Please connect the extension first.",
        variant: "destructive",
      });
      return;
    }
    const ext = window.LinkedBotExtension as any;
    if (!ext?.scrapeAnalytics) {
      toast({
        title: "Feature not available",
        description: "Please update your extension.",
        variant: "destructive",
      });
      return;
    }
    try {
      if (userProfile?.linkedin_profile_url && ext?.saveProfileUrl) {
        try { await ext.saveProfileUrl(userProfile.linkedin_profile_url); } catch {}
      }
      toast({ title: "Syncing analytics", description: "Scraping your LinkedIn analytics..." });
      const result = await ext.scrapeAnalytics();
      if (!result?.success) throw new Error(result?.error || "Failed to scrape");
      const data = result.data || {};
      await syncAnalytics({ profile: data.profile || null, posts: data.posts || [] });
      await fetchPosts();
    } catch (err) {
      toast({
        title: "Sync failed",
        description: err instanceof Error ? err.message : "Failed to sync",
        variant: "destructive",
      });
    }
  };

  const summaryCards = [
    { label: "Total Impressions", value: formatNumber(totalViews), icon: Eye, color: "text-blue-500", bg: "bg-blue-500/10" },
    { label: "Total Likes", value: formatNumber(totalLikes), icon: Heart, color: "text-rose-500", bg: "bg-rose-500/10" },
    { label: "Total Comments", value: formatNumber(totalComments), icon: MessageCircle, color: "text-amber-500", bg: "bg-amber-500/10" },
    { label: "Total Shares", value: formatNumber(totalShares), icon: Share2, color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { label: "Avg Engagement", value: `${avgEngagement}%`, icon: TrendingUp, color: "text-purple-500", bg: "bg-purple-500/10" },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Missing Profile Banner */}
        {!profileLoading && !hasProfileUrl && isConnected && <MissingProfileBanner />}

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        >
          <div>
            <h1 className="text-3xl font-bold">Analytics</h1>
            <p className="text-muted-foreground mt-1">Track your LinkedIn content performance</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <Badge variant={isConnected ? "default" : "secondary"} className="gap-1">
              {isConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
              {isConnected ? "Connected" : "Disconnected"}
            </Badge>
            <RefreshAnalyticsButton variant="outline" size="sm" />
            <Button onClick={handleSyncAnalytics} disabled={!isConnected || isSyncing} size="sm" className="gap-2">
              {isSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              {isSyncing ? "Syncing..." : "Sync Profile"}
            </Button>
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 3 months</SelectItem>
                <SelectItem value="all">All time</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </motion.div>

        {/* Loading */}
        {isLoading ? (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-28 rounded-2xl" />
              ))}
            </div>
            <div className="grid lg:grid-cols-2 gap-6">
              <Skeleton className="h-72 rounded-2xl" />
              <Skeleton className="h-72 rounded-2xl" />
            </div>
          </div>
        ) : filteredPosts.length === 0 ? (
          /* Empty State */
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="bg-card rounded-2xl border border-border p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">No Analytics Data</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Post content via LinkedBot and sync your analytics to see performance data here. Make sure your extension is connected and you have published posts.
              </p>
              <Button onClick={handleSyncAnalytics} disabled={!isConnected || isSyncing}>
                {isSyncing ? "Syncing..." : "Sync Now"}
              </Button>
            </div>
          </motion.div>
        ) : (
          <>
            {/* Summary Cards */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="grid grid-cols-2 lg:grid-cols-5 gap-4"
            >
              {summaryCards.map((card, i) => (
                <div key={i} className="bg-card rounded-2xl border border-border p-5 shadow-sm">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-10 h-10 rounded-lg ${card.bg} flex items-center justify-center`}>
                      <card.icon className={`w-5 h-5 ${card.color}`} />
                    </div>
                  </div>
                  <p className="text-2xl font-bold">{card.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{card.label}</p>
                </div>
              ))}
            </motion.div>

            {/* Charts */}
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Impressions Bar Chart */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-card rounded-2xl border border-border p-6 shadow-sm"
              >
                <h3 className="font-semibold mb-4">Impressions by Post</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={impressionsChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                      />
                      <Bar dataKey="impressions" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>

              {/* Trend Line Chart */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="bg-card rounded-2xl border border-border p-6 shadow-sm"
              >
                <h3 className="font-semibold mb-4">Growth Trends</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                      />
                      <Legend />
                      <Line type="monotone" dataKey="impressions" stroke="hsl(201, 89%, 40%)" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="likes" stroke="#f43f5e" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="comments" stroke="#f59e0b" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="shares" stroke="#10b981" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>

              {/* Engagement Comparison */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-card rounded-2xl border border-border p-6 shadow-sm lg:col-span-2"
              >
                <h3 className="font-semibold mb-4">Engagement Rate Comparison</h3>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={engagementChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="post" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} unit="%" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                        formatter={(value: number) => [`${value}%`, "Engagement"]}
                      />
                      <Bar dataKey="engagement" fill="hsl(262, 83%, 58%)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>
            </div>

            {/* Posts Table */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="bg-card rounded-2xl border border-border shadow-sm"
            >
              <div className="p-6 border-b border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <h3 className="font-semibold">Post Analytics</h3>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="latest">Latest</SelectItem>
                    <SelectItem value="most_viewed">Most Viewed</SelectItem>
                    <SelectItem value="most_engaged">Most Engaged</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Post Preview</TableHead>
                      <TableHead className="text-center">Impressions</TableHead>
                      <TableHead className="text-center">Likes</TableHead>
                      <TableHead className="text-center">Comments</TableHead>
                      <TableHead className="text-center">Shares</TableHead>
                      <TableHead className="text-center">Engagement %</TableHead>
                      <TableHead className="text-center">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedPosts.map((post) => (
                      <TableRow key={post.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedPost(post)}>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {post.posted_at ? new Date(post.posted_at).toLocaleDateString() : "-"}
                        </TableCell>
                        <TableCell className="max-w-[200px]">
                          <p className="text-sm line-clamp-1">{post.content?.substring(0, 150) || "No content"}</p>
                        </TableCell>
                        <TableCell className="text-center font-medium">{formatNumber(post.views_count || 0)}</TableCell>
                        <TableCell className="text-center font-medium">{formatNumber(post.likes_count || 0)}</TableCell>
                        <TableCell className="text-center font-medium">{formatNumber(post.comments_count || 0)}</TableCell>
                        <TableCell className="text-center font-medium">{formatNumber(post.shares_count || 0)}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary" className="text-xs">
                            {calcEngagement(post.views_count, post.likes_count, post.comments_count, post.shares_count).toFixed(1)}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setSelectedPost(post); }}>
                            View Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </motion.div>
          </>
        )}
      </div>

      {/* Scraping Progress */}
      {scrapingProgress && (
        <div className="fixed bottom-4 right-4 z-50 bg-card border border-border rounded-lg shadow-lg p-4 min-w-[300px]">
          <div className="flex items-center gap-2 mb-2">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span className="font-medium text-sm">Scraping Analytics...</span>
          </div>
          <Progress value={(scrapingProgress.current / scrapingProgress.total) * 100} />
          <p className="text-xs text-muted-foreground mt-1">
            {scrapingProgress.current} / {scrapingProgress.total} posts
          </p>
        </div>
      )}

      {/* Post Detail Modal */}
      <Dialog open={!!selectedPost} onOpenChange={(open) => !open && setSelectedPost(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Post Details</DialogTitle>
          </DialogHeader>
          {selectedPost && (
            <div className="space-y-6">
              {/* Date */}
              <p className="text-sm text-muted-foreground">
                {selectedPost.posted_at ? new Date(selectedPost.posted_at).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" }) : "Unknown date"}
              </p>

              {/* Full Content */}
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-sm whitespace-pre-wrap">{selectedPost.content}</p>
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-3 bg-blue-500/10 rounded-lg">
                  <Eye className="w-5 h-5 text-blue-500" />
                  <div>
                    <p className="font-bold">{formatNumber(selectedPost.views_count || 0)}</p>
                    <p className="text-xs text-muted-foreground">Impressions</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-rose-500/10 rounded-lg">
                  <Heart className="w-5 h-5 text-rose-500" />
                  <div>
                    <p className="font-bold">{formatNumber(selectedPost.likes_count || 0)}</p>
                    <p className="text-xs text-muted-foreground">Likes</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-amber-500/10 rounded-lg">
                  <MessageCircle className="w-5 h-5 text-amber-500" />
                  <div>
                    <p className="font-bold">{formatNumber(selectedPost.comments_count || 0)}</p>
                    <p className="text-xs text-muted-foreground">Comments</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-emerald-500/10 rounded-lg">
                  <Share2 className="w-5 h-5 text-emerald-500" />
                  <div>
                    <p className="font-bold">{formatNumber(selectedPost.shares_count || 0)}</p>
                    <p className="text-xs text-muted-foreground">Shares</p>
                  </div>
                </div>
              </div>

              {/* Engagement */}
              <div className="p-4 bg-purple-500/10 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-purple-500" />
                  <span className="font-medium">Engagement Rate</span>
                </div>
                <span className="text-xl font-bold text-purple-500">
                  {calcEngagement(selectedPost.views_count, selectedPost.likes_count, selectedPost.comments_count, selectedPost.shares_count).toFixed(1)}%
                </span>
              </div>

              {/* Link */}
              {selectedPost.linkedin_post_url && (
                <Button variant="outline" className="w-full gap-2" asChild>
                  <a href={selectedPost.linkedin_post_url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4" />
                    View on LinkedIn
                  </a>
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default AnalyticsPage;
