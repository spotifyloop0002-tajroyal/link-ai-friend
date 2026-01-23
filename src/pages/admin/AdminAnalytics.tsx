import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import AdminLayout from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart3,
  Loader2,
  Shield,
  Users,
  Bot,
  FileText,
  TrendingUp,
  Calendar,
  Eye,
  ThumbsUp,
  MessageSquare,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";
import { format, subDays } from "date-fns";

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', '#10b981', '#f59e0b'];

const AdminAnalytics = () => {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalAgents: 0,
    totalPosts: 0,
    publishedPosts: 0,
    totalViews: 0,
    totalLikes: 0,
    totalComments: 0,
  });
  const [planDistribution, setPlanDistribution] = useState<any[]>([]);
  const [dailySignups, setDailySignups] = useState<any[]>([]);
  const [postsByStatus, setPostsByStatus] = useState<any[]>([]);

  useEffect(() => {
    const checkAdminAccess = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          navigate("/login");
          return;
        }

        const { data, error } = await supabase.rpc('has_role', {
          _user_id: user.id,
          _role: 'admin'
        });

        if (error) {
          setIsAdmin(false);
          return;
        }

        setIsAdmin(data === true);

        if (data === true) {
          await fetchAnalytics();
        }
      } catch (err) {
        setIsAdmin(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAdminAccess();
  }, [navigate]);

  const fetchAnalytics = async () => {
    try {
      // Fetch all data in parallel
      const [usersRes, agentsRes, postsRes, analyticsRes] = await Promise.all([
        supabase.rpc('get_admin_users_data'),
        supabase.from('agents').select('*', { count: 'exact' }),
        supabase.from('posts').select('*'),
        supabase.from('post_analytics').select('views, likes, comments, shares'),
      ]);

      const users = usersRes.data || [];
      const posts = postsRes.data || [];
      const analytics = analyticsRes.data || [];

      // Calculate stats
      const totalViews = analytics.reduce((sum, a) => sum + (a.views || 0), 0);
      const totalLikes = analytics.reduce((sum, a) => sum + (a.likes || 0), 0);
      const totalComments = analytics.reduce((sum, a) => sum + (a.comments || 0), 0);

      setStats({
        totalUsers: users.length,
        totalAgents: agentsRes.count || 0,
        totalPosts: posts.length,
        publishedPosts: posts.filter(p => p.status === 'published').length,
        totalViews,
        totalLikes,
        totalComments,
      });

      // Plan distribution
      const planCounts: Record<string, number> = {};
      users.forEach((u: any) => {
        const plan = u.subscription_plan || 'free';
        planCounts[plan] = (planCounts[plan] || 0) + 1;
      });
      setPlanDistribution(
        Object.entries(planCounts).map(([name, value]) => ({ name, value }))
      );

      // Daily signups (last 7 days)
      const signupsByDay: Record<string, number> = {};
      for (let i = 6; i >= 0; i--) {
        const date = format(subDays(new Date(), i), 'MMM d');
        signupsByDay[date] = 0;
      }
      users.forEach((u: any) => {
        if (u.created_at) {
          const date = format(new Date(u.created_at), 'MMM d');
          if (signupsByDay[date] !== undefined) {
            signupsByDay[date]++;
          }
        }
      });
      setDailySignups(
        Object.entries(signupsByDay).map(([date, count]) => ({ date, count }))
      );

      // Posts by status
      const statusCounts: Record<string, number> = {};
      posts.forEach((p) => {
        const status = p.status || 'draft';
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      });
      setPostsByStatus(
        Object.entries(statusCounts).map(([name, value]) => ({ name, value }))
      );

    } catch (err) {
      console.error("Analytics fetch error:", err);
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  if (!isAdmin) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
          <Shield className="w-16 h-16 text-muted-foreground" />
          <h1 className="text-2xl font-bold">Access Denied</h1>
          <Button onClick={() => navigate("/dashboard")}>Go to Dashboard</Button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-primary" />
            Platform Analytics
          </h1>
          <p className="text-muted-foreground mt-1">
            Overview of platform performance and user activity
          </p>
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4"
        >
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.totalUsers}</p>
                  <p className="text-xs text-muted-foreground">Total Users</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-secondary/10">
                  <Bot className="w-5 h-5 text-secondary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.totalAgents}</p>
                  <p className="text-xs text-muted-foreground">Active Agents</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <FileText className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.totalPosts}</p>
                  <p className="text-xs text-muted-foreground">Total Posts</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <TrendingUp className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.publishedPosts}</p>
                  <p className="text-xs text-muted-foreground">Published</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Engagement Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="grid grid-cols-3 gap-4"
        >
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Eye className="w-6 h-6 text-muted-foreground" />
                <div>
                  <p className="text-xl font-bold">{stats.totalViews.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Total Views</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <ThumbsUp className="w-6 h-6 text-muted-foreground" />
                <div>
                  <p className="text-xl font-bold">{stats.totalLikes.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Total Likes</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <MessageSquare className="w-6 h-6 text-muted-foreground" />
                <div>
                  <p className="text-xl font-bold">{stats.totalComments.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Total Comments</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Daily Signups */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  User Signups (Last 7 Days)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dailySignups}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="date" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip />
                      <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Plan Distribution */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Subscription Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={planDistribution}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        dataKey="value"
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      >
                        {planDistribution.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Posts by Status */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="lg:col-span-2"
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Posts by Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={postsByStatus} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" className="text-xs capitalize" width={80} />
                      <Tooltip />
                      <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminAnalytics;
