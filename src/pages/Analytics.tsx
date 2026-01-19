import { motion } from "framer-motion";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
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
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Eye, Heart, MessageCircle, Share2, TrendingUp, Trophy, Bot, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

const reachData = [
  { date: "Jan 1", reach: 1200 },
  { date: "Jan 5", reach: 1800 },
  { date: "Jan 10", reach: 2400 },
  { date: "Jan 15", reach: 3200 },
  { date: "Jan 19", reach: 4100 },
];

const engagementByType = [
  { type: "Professional", engagement: 4.2 },
  { type: "Storytelling", engagement: 5.8 },
  { type: "Thought Leadership", engagement: 4.5 },
  { type: "Comedy", engagement: 6.2 },
];

const pieData = [
  { name: "Views", value: 12400, color: "hsl(201, 89%, 40%)" },
  { name: "Likes", value: 580, color: "hsl(262, 83%, 58%)" },
  { name: "Comments", value: 124, color: "hsl(160, 84%, 39%)" },
  { name: "Shares", value: 45, color: "hsl(38, 92%, 50%)" },
];

const topPosts = [
  {
    id: 1,
    preview: "3 lessons I learned from building my startup from scratch...",
    views: 3200,
    likes: 145,
    comments: 32,
    shares: 12,
    date: "Jan 15, 2026",
    agent: "Storytelling",
  },
  {
    id: 2,
    preview: "The future of AI in healthcare is not what you think...",
    views: 2800,
    likes: 120,
    comments: 28,
    shares: 8,
    date: "Jan 12, 2026",
    agent: "Professional Tech",
  },
  {
    id: 3,
    preview: "Why 90% of startups fail and how to be in the 10%...",
    views: 2400,
    likes: 98,
    comments: 22,
    shares: 6,
    date: "Jan 10, 2026",
    agent: "Thought Leadership",
  },
];

const postPerformance = [
  {
    id: 1,
    preview: "Excited to share our latest AI developments in healthcare...",
    agent: "Professional Tech",
    date: "Jan 18, 2026",
    views: 1240,
    likes: 52,
    comments: 8,
    shares: 3,
    engagementRate: 5.1,
  },
  {
    id: 2,
    preview: "When my first startup failed, I thought it was over...",
    agent: "Comedy",
    date: "Jan 17, 2026",
    views: 980,
    likes: 78,
    comments: 15,
    shares: 5,
    engagementRate: 10.0,
  },
  {
    id: 3,
    preview: "5 trends shaping tech in 2026 that nobody talks about...",
    agent: "Thought Leadership",
    date: "Jan 16, 2026",
    views: 1560,
    likes: 64,
    comments: 12,
    shares: 4,
    engagementRate: 5.1,
  },
];

const AnalyticsPage = () => {
  return (
    <DashboardLayout>
      <div className="space-y-8">
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
          <Select defaultValue="30">
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 3 months</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>
        </motion.div>

        {/* Stats cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {[
            { label: "Total Posts", value: "24", icon: TrendingUp, change: "+8" },
            { label: "Total Reach", value: "12.4K", icon: Eye, change: "+23%" },
            { label: "Avg Engagement", value: "5.2%", icon: Heart, change: "+0.8%" },
            { label: "Best Post Reach", value: "3.2K", icon: Trophy, change: "" },
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
                  <span className="text-xs text-muted-foreground">{post.date}</span>
                </div>
                <p className="text-sm line-clamp-2 mb-4">{post.preview}</p>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{post.views.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Heart className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{post.likes}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MessageCircle className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{post.comments}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Share2 className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{post.shares}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1 text-xs text-primary">
                    <Bot className="w-3 h-3" />
                    {post.agent}
                  </span>
                  <Button variant="ghost" size="sm" className="gap-1 text-xs">
                    View
                    <ExternalLink className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Post performance table */}
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
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Agent</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Date</th>
                  <th className="text-center p-4 text-sm font-medium text-muted-foreground">Views</th>
                  <th className="text-center p-4 text-sm font-medium text-muted-foreground">Likes</th>
                  <th className="text-center p-4 text-sm font-medium text-muted-foreground">Comments</th>
                  <th className="text-center p-4 text-sm font-medium text-muted-foreground">Shares</th>
                  <th className="text-center p-4 text-sm font-medium text-muted-foreground">Engagement</th>
                </tr>
              </thead>
              <tbody>
                {postPerformance.map((post) => (
                  <tr key={post.id} className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors">
                    <td className="p-4">
                      <p className="text-sm line-clamp-1 max-w-xs">{post.preview}</p>
                    </td>
                    <td className="p-4">
                      <span className="inline-flex items-center gap-1 text-xs text-primary bg-primary/10 px-2 py-1 rounded-full">
                        <Bot className="w-3 h-3" />
                        {post.agent}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-muted-foreground">{post.date}</td>
                    <td className="p-4 text-center text-sm font-medium">{post.views.toLocaleString()}</td>
                    <td className="p-4 text-center text-sm font-medium">{post.likes}</td>
                    <td className="p-4 text-center text-sm font-medium">{post.comments}</td>
                    <td className="p-4 text-center text-sm font-medium">{post.shares}</td>
                    <td className="p-4 text-center">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-success/10 text-success">
                        {post.engagementRate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </DashboardLayout>
  );
};

export default AnalyticsPage;
