import { useState } from "react";
import { motion } from "framer-motion";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useLinkedBotExtension } from "@/hooks/useLinkedBotExtension";
import { useLinkedInAnalytics } from "@/hooks/useLinkedInAnalytics";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useToast } from "@/hooks/use-toast";
import { MissingProfileBanner } from "@/components/linkedin/MissingProfileBanner";
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
} from "recharts";
import { Eye, Heart, MessageCircle, Share2, TrendingUp, Trophy, Bot, ExternalLink, RefreshCw, Wifi, WifiOff, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RefreshAnalyticsButton } from "@/components/analytics/RefreshAnalyticsButton";

const formatNumber = (num: number): string => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
};

const calculateEngagementRate = (views: number, likes: number, comments: number, shares: number): string => {
  if (!views || views === 0) return "0.0";
  const totalEngagement = likes + comments + shares;
  return ((totalEngagement / views) * 100).toFixed(1);
};

const AnalyticsPage = () => {
  const { toast } = useToast();
  const { isConnected, isInstalled } = useLinkedBotExtension();
  const { profile: userProfile, isLoading: profileLoading } = useUserProfile();
  const {
    profile,
    posts,
    lastSync,
    isLoading,
    isSyncing,
    error,
    fetchAnalytics,
    syncAnalytics,
  } = useLinkedInAnalytics();

  const hasProfileUrl = Boolean(userProfile?.linkedin_profile_url);

  const [period, setPeriod] = useState("30");

  const handleSyncAnalytics = async () => {
    if (!isConnected) {
      toast({
        title: "Extension not connected",
        description: "Please connect the extension first from the LinkedIn Connection page.",
        variant: "destructive",
      });
      return;
    }

    if (!hasProfileUrl && !profileLoading) {
      toast({
        title: "Profile URL required",
        description: "Please add your LinkedIn profile URL from the LinkedIn Connection page first.",
        variant: "destructive",
      });
      return;
    }

    const ext = window.LinkedBotExtension as any;
    if (!ext?.scrapeAnalytics) {
      toast({
        title: "Feature not available",
        description: "Your extension version doesn't support analytics scraping. Please update the extension.",
        variant: "destructive",
      });
      return;
    }

    try {
      // First, ensure the profile URL is synced to the extension
      if (userProfile?.linkedin_profile_url && ext?.saveProfileUrl) {
        try {
          await ext.saveProfileUrl(userProfile.linkedin_profile_url);
        } catch (urlErr) {
          console.warn("Could not sync profile URL to extension:", urlErr);
        }
      }

      toast({
        title: "Syncing analytics",
        description: "Scraping your LinkedIn analytics... This may take a moment.",
      });

      const result = await ext.scrapeAnalytics();

      // Handle undefined or null response
      if (!result) {
        throw new Error("Extension returned no data. Please ensure LinkedIn is open in another tab.");
      }

      // Handle error response
      if (!result.success) {
        throw new Error(result.error || "Failed to scrape analytics");
      }

      // Handle missing data with fallbacks
      const analyticsData = result.data || {};
      await syncAnalytics({
        profile: analyticsData.profile || null,
        posts: analyticsData.posts || [],
      });
    } catch (err) {
      console.error("Sync error:", err);
      toast({
        title: "Sync failed",
        description: err instanceof Error ? err.message : "Failed to sync analytics",
        variant: "destructive",
      });
    }
  };

  // Calculate total metrics
  const totalViews = posts.reduce((sum, p) => sum + (p.views || 0), 0);
  const totalLikes = posts.reduce((sum, p) => sum + (p.likes || 0), 0);
  const totalComments = posts.reduce((sum, p) => sum + (p.comments || 0), 0);
  const totalShares = posts.reduce((sum, p) => sum + (p.shares || 0), 0);
  const avgEngagement = posts.length > 0 
    ? (((totalLikes + totalComments + totalShares) / totalViews) * 100).toFixed(1)
    : "0.0";
  const bestPostReach = posts.length > 0 
    ? Math.max(...posts.map(p => p.views || 0))
    : 0;

  // Prepare chart data
  const reachData = posts
    .slice(0, 10)
    .reverse()
    .map((post, index) => ({
      date: post.post_timestamp 
        ? new Date(post.post_timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        : `Post ${index + 1}`,
      reach: post.views || 0,
    }));

  // Engagement by type (mock data for now, would need agent type tracking)
  const engagementByType = [
    { type: "Professional", engagement: 4.2 },
    { type: "Storytelling", engagement: 5.8 },
    { type: "Thought Leadership", engagement: 4.5 },
    { type: "Comedy", engagement: 6.2 },
  ];

  // Top 3 posts
  const topPosts = [...posts]
    .sort((a, b) => (b.views || 0) - (a.views || 0))
    .slice(0, 3);

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Missing Profile URL Banner */}
        {!profileLoading && !hasProfileUrl && isConnected && (
          <MissingProfileBanner />
        )}

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        >
          <div>
            <h1 className="text-3xl font-bold">Analytics</h1>
            <p className="text-muted-foreground mt-1">
              Track your LinkedIn content performance
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <Badge variant={isConnected ? "default" : "secondary"} className="gap-1">
              {isConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
              {isConnected ? "Connected" : "Disconnected"}
            </Badge>
            
            {/* v5.0 - Refresh Analytics Button for bulk scraping */}
            <RefreshAnalyticsButton 
              variant="outline" 
              size="sm"
            />
            
            <Button
              onClick={handleSyncAnalytics}
              disabled={!isConnected || isSyncing}
              size="sm"
              className="gap-2"
            >
              {isSyncing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              {isSyncing ? "Syncing..." : "Sync Profile"}
            </Button>
            
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Select period" />
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

        {/* Last Sync Info */}
        {lastSync && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-sm text-muted-foreground"
          >
            Last synced: {new Date(lastSync).toLocaleString()}
          </motion.p>
        )}

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>⚠️ {error}</AlertDescription>
          </Alert>
        )}

        {/* Loading State */}
        {isLoading ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : posts.length === 0 && !profile ? (
          /* Empty State */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="bg-card rounded-2xl border border-border p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">No Analytics Data</h3>
              <p className="text-muted-foreground mb-6">
                Connect your extension and sync to see your LinkedIn analytics
              </p>
              <Button onClick={handleSyncAnalytics} disabled={!isConnected || isSyncing}>
                {isSyncing ? "Syncing..." : "Sync Now"}
              </Button>
            </div>
          </motion.div>
        ) : (
          <>
            {/* Stats cards */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="grid grid-cols-2 lg:grid-cols-4 gap-6"
            >
              {[
                { label: "Total Posts", value: posts.length.toString(), icon: TrendingUp, change: "" },
                { label: "Total Reach", value: formatNumber(totalViews), icon: Eye, change: "" },
                { label: "Avg Engagement", value: `${avgEngagement}%`, icon: Heart, change: "" },
                { label: "Best Post Reach", value: formatNumber(bestPostReach), icon: Trophy, change: "" },
              ].map((stat, index) => (
                <div
                  key={index}
                  className="bg-card rounded-2xl border border-border p-6 shadow-sm"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <stat.icon className="w-5 h-5 text-primary" />
                    </div>
                    {stat.change && (
                      <span className="text-xs font-medium text-success bg-success/10 px-2 py-1 rounded-full">
                        {stat.change}
                      </span>
                    )}
                  </div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </motion.div>

            {/* Charts grid */}
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Reach over time */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-card rounded-2xl border border-border p-6 shadow-sm"
              >
                <h3 className="font-semibold mb-6">Reach Over Time</h3>
                <div className="h-64">
                  {reachData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={reachData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="reach"
                          stroke="hsl(201, 89%, 40%)"
                          strokeWidth={3}
                          dot={{ fill: "hsl(201, 89%, 40%)", strokeWidth: 2 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      No data available
                    </div>
                  )}
                </div>
              </motion.div>

              {/* Engagement by type */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-card rounded-2xl border border-border p-6 shadow-sm"
              >
                <h3 className="font-semibold mb-6">Engagement by Agent Type</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={engagementByType}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="type" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                      />
                      <Bar
                        dataKey="engagement"
                        fill="hsl(262, 83%, 58%)"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>
            </div>

            {/* Top performing posts */}
            {topPosts.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-card rounded-2xl border border-border shadow-sm"
              >
                <div className="p-6 border-b border-border">
                  <h3 className="font-semibold">Top Performing Posts</h3>
                </div>
                <div className="grid md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border">
                  {topPosts.map((post, index) => (
                    <div key={post.id} className="p-6">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-8 h-8 rounded-full gradient-bg flex items-center justify-center text-primary-foreground font-bold text-sm">
                          #{index + 1}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {post.post_timestamp ? new Date(post.post_timestamp).toLocaleDateString() : 'Unknown date'}
                        </span>
                      </div>
                      <p className="text-sm line-clamp-2 mb-4">
                        {post.content_preview || 'No content preview'}
                      </p>
                      <div className="grid grid-cols-2 gap-3 mb-4">
                        <div className="flex items-center gap-2">
                          <Eye className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm font-medium">{formatNumber(post.views)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Heart className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm font-medium">{formatNumber(post.likes)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MessageCircle className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm font-medium">{formatNumber(post.comments)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Share2 className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm font-medium">{formatNumber(post.shares)}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center gap-1 text-xs text-primary">
                          <Bot className="w-3 h-3" />
                          {calculateEngagementRate(post.views, post.likes, post.comments, post.shares)}% engagement
                        </span>
                        {post.linkedin_url && (
                          <Button variant="ghost" size="sm" className="gap-1 text-xs" asChild>
                            <a href={post.linkedin_url} target="_blank" rel="noopener noreferrer">
                              View
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Post performance table */}
            {posts.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-card rounded-2xl border border-border shadow-sm"
              >
                <div className="p-6 border-b border-border">
                  <h3 className="font-semibold">Post Performance</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left p-4 text-sm font-medium text-muted-foreground">Post</th>
                        <th className="text-left p-4 text-sm font-medium text-muted-foreground">Date</th>
                        <th className="text-center p-4 text-sm font-medium text-muted-foreground">Views</th>
                        <th className="text-center p-4 text-sm font-medium text-muted-foreground">Likes</th>
                        <th className="text-center p-4 text-sm font-medium text-muted-foreground">Comments</th>
                        <th className="text-center p-4 text-sm font-medium text-muted-foreground">Shares</th>
                        <th className="text-center p-4 text-sm font-medium text-muted-foreground">Engagement</th>
                        <th className="text-center p-4 text-sm font-medium text-muted-foreground">Link</th>
                      </tr>
                    </thead>
                    <tbody>
                      {posts.slice(0, 10).map((post) => (
                        <tr key={post.id} className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors">
                          <td className="p-4">
                            <p className="text-sm line-clamp-1 max-w-xs">{post.content_preview || 'No preview'}</p>
                          </td>
                          <td className="p-4 text-sm text-muted-foreground">
                            {post.post_timestamp ? new Date(post.post_timestamp).toLocaleDateString() : '-'}
                          </td>
                          <td className="p-4 text-center text-sm font-medium">{formatNumber(post.views)}</td>
                          <td className="p-4 text-center text-sm font-medium">{formatNumber(post.likes)}</td>
                          <td className="p-4 text-center text-sm font-medium">{formatNumber(post.comments)}</td>
                          <td className="p-4 text-center text-sm font-medium">{formatNumber(post.shares)}</td>
                          <td className="p-4 text-center">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-success/10 text-success">
                              {calculateEngagementRate(post.views, post.likes, post.comments, post.shares)}%
                            </span>
                          </td>
                          <td className="p-4 text-center">
                            {post.linkedin_url ? (
                              <a href={post.linkedin_url} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                              </a>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AnalyticsPage;
