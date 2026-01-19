import { useEffect } from "react";
import { motion } from "framer-motion";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { ExtensionStatus } from "@/components/ExtensionStatus";
import { useLinkedBotExtension } from "@/hooks/useLinkedBotExtension";
import {
  Bot,
  Calendar,
  TrendingUp,
  Plus,
  Clock,
  Eye,
  Edit,
  Trash2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const stats = [
  {
    label: "Total Active Agents",
    value: "2",
    subtitle: "Currently working",
    icon: Bot,
    color: "from-primary to-primary/60",
  },
  {
    label: "Upcoming Posts",
    value: "8",
    subtitle: "Scheduled in next 7 days",
    icon: Calendar,
    color: "from-secondary to-secondary/60",
  },
  {
    label: "This Month's Reach",
    value: "12.4K",
    subtitle: "+23% from last month",
    icon: TrendingUp,
    color: "from-warning to-warning/60",
  },
];

const upcomingPosts = [
  {
    id: 1,
    preview: "Excited to share our latest AI developments in healthcare...",
    agent: "Professional Tech",
    scheduledDate: "Jan 20, 2026",
    scheduledTime: "9:00 AM",
    status: "scheduled",
  },
  {
    id: 2,
    preview: "3 lessons I learned from building my startup from scratch...",
    agent: "Storytelling",
    scheduledDate: "Jan 21, 2026",
    scheduledTime: "12:00 PM",
    status: "scheduled",
  },
  {
    id: 3,
    preview: "The future of remote work is here. Here's what you need to know...",
    agent: "Thought Leadership",
    scheduledDate: "Jan 22, 2026",
    scheduledTime: "5:00 PM",
    status: "scheduled",
  },
  {
    id: 4,
    preview: "When my first startup failed, I thought it was over...",
    agent: "Comedy",
    scheduledDate: "Jan 23, 2026",
    scheduledTime: "10:00 AM",
    status: "scheduled",
  },
];

const DashboardPage = () => {
  const navigate = useNavigate();
  const { isConnected, sendPendingPosts } = useLinkedBotExtension();

  // Listen for extension events
  useEffect(() => {
    const handlePostPublished = (event: Event) => {
      const customEvent = event as CustomEvent;
      console.log('✅ Post published:', customEvent.detail);
      // TODO: Update post status in database
    };

    const handleAnalytics = (event: Event) => {
      const customEvent = event as CustomEvent;
      console.log('📊 Analytics scraped:', customEvent.detail);
      // TODO: Save analytics to database
    };

    window.addEventListener('linkedbot-post-published', handlePostPublished);
    window.addEventListener('linkedbot-analytics-scraped', handleAnalytics);

    return () => {
      window.removeEventListener('linkedbot-post-published', handlePostPublished);
      window.removeEventListener('linkedbot-analytics-scraped', handleAnalytics);
    };
  }, []);

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
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        >
          <div>
            <h1 className="text-3xl font-bold">Welcome back, John!</h1>
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
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
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
            <h2 className="text-xl font-semibold">Upcoming Posts (Next 7 Days)</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Post Preview</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Agent</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Scheduled</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Status</th>
                  <th className="text-right p-4 text-sm font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {upcomingPosts.map((post) => (
                  <tr key={post.id} className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors">
                    <td className="p-4">
                      <p className="text-sm line-clamp-1 max-w-xs">{post.preview}</p>
                    </td>
                    <td className="p-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                        <Bot className="w-3 h-3" />
                        {post.agent}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span>{post.scheduledDate}</span>
                        <span className="text-muted-foreground">{post.scheduledTime}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-warning/10 text-warning text-xs font-medium">
                        <Clock className="w-3 h-3" />
                        Scheduled
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-end gap-2">
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
            <h3 className="font-semibold text-lg mb-1">Schedule Single Post</h3>
            <p className="text-sm text-muted-foreground">
              Quickly create and schedule a one-off LinkedIn post
            </p>
          </button>
        </motion.div>
      </div>
    </DashboardLayout>
  );
};

export default DashboardPage;
