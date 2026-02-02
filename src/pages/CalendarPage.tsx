import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Bot,
  Clock,
  Edit,
  Trash2,
  Eye,
  Loader2,
} from "lucide-react";
import { format, addMonths, subMonths, isSameDay } from "date-fns";
import { usePosts } from "@/hooks/usePosts";
import { useAgents } from "@/hooks/useAgents";
import { useNavigate } from "react-router-dom";

// Color mapping for agent types
const agentColors: Record<string, string> = {
  comedy: "bg-warning",
  professional: "bg-primary",
  storytelling: "bg-secondary",
  "thought-leadership": "bg-success",
  motivational: "bg-pink-500",
  "data-analytics": "bg-blue-500",
  creative: "bg-purple-500",
  news: "bg-orange-500",
};

const CalendarPage = () => {
  const navigate = useNavigate();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [viewMode, setViewMode] = useState<"month" | "week">("month");
  const [filterAgent, setFilterAgent] = useState("all");

  // Fetch real data
  const { posts, isLoading: postsLoading, deletePost, fetchScheduledPosts } = usePosts();
  const { agents, isLoading: agentsLoading } = useAgents();

  useEffect(() => {
    fetchScheduledPosts();
  }, [fetchScheduledPosts]);

  const getPostsForDate = (date: Date) => {
    return posts.filter((post) => {
      // Show both scheduled and posted posts
      if (!post.scheduled_time && !post.posted_at) return false;
      const postDate = post.posted_at ? new Date(post.posted_at) : new Date(post.scheduled_time!);
      return isSameDay(postDate, date);
    });
  };

  const selectedDatePosts = selectedDate ? getPostsForDate(selectedDate) : [];

  // Show ALL posts in list (pending + posting + posted)
  const filteredPosts = filterAgent === "all"
    ? posts.filter(p => p.status === "pending" || p.status === "posting" || p.status === "posted" || p.status === "failed")
    : posts.filter((post) => post.agent_name === filterAgent && ["pending", "posting", "posted", "failed"].includes(post.status));

  const getAgentColor = (agentName: string | null) => {
    if (!agentName) return "bg-muted";
    const agent = agents.find(a => a.name === agentName);
    if (agent) {
      return agentColors[agent.type] || "bg-primary";
    }
    return "bg-primary";
  };

  const handleDeletePost = async (postId: string) => {
    await deletePost(postId);
  };

  const isLoading = postsLoading || agentsLoading;

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  // Get unique agent names for filter
  const uniqueAgentNames = [...new Set(posts.map(p => p.agent_name).filter(Boolean))];

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
            <h1 className="text-3xl font-bold">Content Calendar</h1>
            <p className="text-muted-foreground mt-1">
              Schedule and manage your LinkedIn posts
            </p>
          </div>
          <Button variant="gradient" className="gap-2" onClick={() => navigate("/dashboard/agents")}>
            <Plus className="w-4 h-4" />
            Create Post
          </Button>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Calendar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-2"
          >
            <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
              {/* Calendar header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <h2 className="text-xl font-semibold">
                    {format(currentMonth, "MMMM yyyy")}
                  </h2>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant={viewMode === "month" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("month")}
                  >
                    Month
                  </Button>
                  <Button
                    variant={viewMode === "week" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("week")}
                  >
                    Week
                  </Button>
                </div>
              </div>

              {/* Calendar component */}
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                month={currentMonth}
                onMonthChange={setCurrentMonth}
                className="w-full"
                modifiers={{
                  hasPost: posts.filter(p => p.scheduled_time).map((p) => new Date(p.scheduled_time!)),
                }}
                modifiersStyles={{
                  hasPost: {
                    fontWeight: "bold",
                  },
                }}
                components={{
                  Day: ({ date, ...props }) => {
                    const postsOnDay = getPostsForDate(date);
                    return (
                      <button
                        {...props}
                        className={`relative w-full h-12 flex flex-col items-center justify-center rounded-lg hover:bg-muted transition-colors ${
                          selectedDate && isSameDay(date, selectedDate)
                            ? "bg-primary text-primary-foreground"
                            : ""
                        }`}
                        onClick={() => setSelectedDate(date)}
                      >
                        <span>{format(date, "d")}</span>
                        {postsOnDay.length > 0 && (
                          <div className="flex gap-0.5 mt-1">
                            {postsOnDay.slice(0, 3).map((post, i) => (
                              <div
                                key={i}
                                className={`w-1.5 h-1.5 rounded-full ${getAgentColor(post.agent_name)}`}
                              />
                            ))}
                          </div>
                        )}
                      </button>
                    );
                  },
                }}
              />
            </div>
          </motion.div>

          {/* Selected date posts */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-semibold">
                  {selectedDate
                    ? format(selectedDate, "MMMM d, yyyy")
                    : "Select a date"}
                </h3>
                {selectedDatePosts.length > 0 && (
                  <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                    {selectedDatePosts.length} post{selectedDatePosts.length > 1 ? "s" : ""}
                  </span>
                )}
              </div>

              {selectedDatePosts.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                    <Clock className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground mb-4">No posts scheduled</p>
                  <Button variant="outline" className="gap-2" onClick={() => navigate("/dashboard/agents")}>
                    <Plus className="w-4 h-4" />
                    Create Post
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {selectedDatePosts.map((post) => (
                    <div
                      key={post.id}
                      className="p-4 rounded-xl bg-muted/50 border border-border"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`w-2 h-2 rounded-full ${getAgentColor(post.agent_name)}`} />
                        <span className="text-xs font-medium text-muted-foreground">
                          {post.scheduled_time ? format(new Date(post.scheduled_time), "h:mm a") : "No time"}
                        </span>
                      </div>
                      <p className="text-sm line-clamp-2 mb-3">{post.content}</p>
                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center gap-1 text-xs text-primary">
                          <Bot className="w-3 h-3" />
                          {post.agent_name || "Manual"}
                        </span>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <Edit className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => handleDeletePost(post.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* All scheduled posts */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-card rounded-2xl border border-border shadow-sm"
        >
          <div className="p-6 border-b border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h2 className="text-xl font-semibold">All Scheduled Posts</h2>
            <Select value={filterAgent} onValueChange={setFilterAgent}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by agent" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Agents</SelectItem>
                {uniqueAgentNames.map((name) => (
                  <SelectItem key={name} value={name!}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {filteredPosts.length === 0 ? (
            <div className="p-12 text-center">
              <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">No scheduled posts yet</p>
              <Button variant="outline" onClick={() => navigate("/dashboard/agents")}>
                Create Your First Post
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredPosts.map((post) => (
                <div
                  key={post.id}
                  className="p-4 hover:bg-muted/50 transition-colors flex items-center gap-4"
                >
                  <div className={`w-3 h-3 rounded-full ${getAgentColor(post.agent_name)} flex-shrink-0`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{post.content}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span>{post.scheduled_time ? format(new Date(post.scheduled_time), "MMM d, yyyy") : "No date"}</span>
                      <span>{post.scheduled_time ? format(new Date(post.scheduled_time), "h:mm a") : ""}</span>
                      <span className="inline-flex items-center gap-1 text-primary">
                        <Bot className="w-3 h-3" />
                        {post.agent_name || "Manual"}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleDeletePost(post.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </DashboardLayout>
  );
};

export default CalendarPage;
