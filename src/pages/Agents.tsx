import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Bot,
  Plus,
  Briefcase,
  Smile,
  BookOpen,
  Lightbulb,
  Heart,
  BarChart,
  Palette,
  Newspaper,
  ArrowRight,
  ArrowLeft,
  Send,
  Paperclip,
  Sparkles,
  Check,
  Edit,
  Trash2,
  Loader2,
} from "lucide-react";
import { useAgentChat } from "@/hooks/useAgentChat";
import { PostPreviewCard } from "@/components/agents/PostPreviewCard";
import { toast } from "sonner";

const agentTypes = [
  { id: "comedy", icon: Smile, label: "Comedy/Humorous", description: "Funny, light-hearted posts" },
  { id: "professional", icon: Briefcase, label: "Professional", description: "Formal, industry insights" },
  { id: "storytelling", icon: BookOpen, label: "Storytelling", description: "Narrative-driven, personal stories" },
  { id: "thought-leadership", icon: Lightbulb, label: "Thought Leadership", description: "Expert opinions, insights" },
  { id: "motivational", icon: Heart, label: "Motivational", description: "Inspirational content" },
  { id: "data-analytics", icon: BarChart, label: "Data/Analytics", description: "Stats, industry reports" },
  { id: "creative", icon: Palette, label: "Creative/Design", description: "Visual content focused" },
  { id: "news", icon: Newspaper, label: "News/Updates", description: "Company announcements" },
];

const existingAgents = [
  {
    id: 1,
    name: "Professional Tech Posts",
    type: "professional",
    postsCreated: 24,
    postsScheduled: 8,
    successRate: 96,
    isActive: true,
  },
  {
    id: 2,
    name: "Startup Stories",
    type: "storytelling",
    postsCreated: 12,
    postsScheduled: 4,
    successRate: 92,
    isActive: true,
  },
];

const AgentsPage = () => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createStep, setCreateStep] = useState(1);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [emojiLevel, setEmojiLevel] = useState([2]);
  const [postLength, setPostLength] = useState("medium");
  const [tone, setTone] = useState("conversational");
  const [voiceReference, setVoiceReference] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [generatePhoto, setGeneratePhoto] = useState(false);
  const [agents, setAgents] = useState(existingAgents);
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Agent chat hook
  const {
    messages,
    isLoading,
    generatedPosts,
    sendMessage,
    resetChat,
    updatePost,
    deletePost,
    regeneratePost,
  } = useAgentChat(
    {
      type: selectedType || "professional",
      tone,
      emojiLevel: emojiLevel[0],
      postLength,
      voiceReference: voiceReference || undefined,
    },
    {
      name: "User",
      industry: "Technology",
      company: "LinkedBot",
      background: "Building innovative solutions",
    }
  );

  // Scroll to bottom when messages change
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!chatInput.trim() || isLoading) return;
    const message = chatInput;
    setChatInput("");
    await sendMessage(message);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const resetModal = () => {
    setCreateStep(1);
    setSelectedType(null);
    setShowAdvanced(false);
    setChatInput("");
    resetChat();
  };

  const toggleAgentStatus = (agentId: number) => {
    setAgents((prev) =>
      prev.map((agent) =>
        agent.id === agentId ? { ...agent, isActive: !agent.isActive } : agent
      )
    );
  };

  const getTypeIcon = (type: string) => {
    const agentType = agentTypes.find((t) => t.id === type);
    return agentType?.icon || Bot;
  };

  const handleScheduleAll = () => {
    if (generatedPosts.length === 0) {
      toast.error("No posts to schedule");
      return;
    }
    toast.success(`Scheduled ${generatedPosts.length} posts!`);
    setShowCreateModal(false);
    resetModal();
  };

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
            <h1 className="text-3xl font-bold">Your AI Posting Agents</h1>
            <p className="text-muted-foreground mt-1">
              Create and manage your content creation agents
            </p>
          </div>
          <Button
            variant="gradient"
            className="gap-2"
            onClick={() => setShowCreateModal(true)}
          >
            <Plus className="w-4 h-4" />
            Create New Agent
          </Button>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {[
            { label: "Total Agents", value: agents.length },
            { label: "Active Agents", value: agents.filter((a) => a.isActive).length },
            { label: "Total Posts", value: agents.reduce((sum, a) => sum + a.postsCreated, 0) },
            { label: "Avg Success Rate", value: `${Math.round(agents.reduce((sum, a) => sum + a.successRate, 0) / agents.length)}%` },
          ].map((stat, index) => (
            <div
              key={index}
              className="bg-card rounded-xl border border-border p-4"
            >
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <p className="text-2xl font-bold mt-1">{stat.value}</p>
            </div>
          ))}
        </motion.div>

        {/* Agents grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {agents.map((agent) => {
            const TypeIcon = getTypeIcon(agent.type);
            return (
              <div
                key={agent.id}
                className="bg-card rounded-2xl border border-border p-6 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-14 h-14 rounded-xl gradient-bg flex items-center justify-center">
                    <TypeIcon className="w-7 h-7 text-primary-foreground" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={agent.isActive}
                      onCheckedChange={() => toggleAgentStatus(agent.id)}
                    />
                    <span className={`text-xs font-medium ${agent.isActive ? "text-success" : "text-muted-foreground"}`}>
                      {agent.isActive ? "Active" : "Paused"}
                    </span>
                  </div>
                </div>

                <h3 className="font-semibold text-lg mb-1">{agent.name}</h3>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium capitalize">
                  {agent.type.replace("-", " ")}
                </span>

                <div className="grid grid-cols-3 gap-4 mt-6 pt-4 border-t border-border">
                  <div>
                    <p className="text-2xl font-bold">{agent.postsCreated}</p>
                    <p className="text-xs text-muted-foreground">Posts Created</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{agent.postsScheduled}</p>
                    <p className="text-xs text-muted-foreground">Scheduled</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{agent.successRate}%</p>
                    <p className="text-xs text-muted-foreground">Success</p>
                  </div>
                </div>

                <div className="flex gap-2 mt-6">
                  <Button variant="outline" className="flex-1 gap-2">
                    <Edit className="w-4 h-4" />
                    Edit
                  </Button>
                  <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            );
          })}

          {/* Add new agent card */}
          <button
            onClick={() => setShowCreateModal(true)}
            className="min-h-[280px] rounded-2xl border-2 border-dashed border-border hover:border-primary/50 flex flex-col items-center justify-center gap-4 transition-colors group"
          >
            <div className="w-16 h-16 rounded-xl bg-muted group-hover:bg-primary/10 flex items-center justify-center transition-colors">
              <Plus className="w-8 h-8 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-muted-foreground group-hover:text-foreground transition-colors">
                Create New Agent
              </p>
              <p className="text-sm text-muted-foreground">
                Add another AI posting assistant
              </p>
            </div>
          </button>
        </motion.div>
      </div>

      {/* Create Agent Modal */}
      <Dialog
        open={showCreateModal}
        onOpenChange={(open) => {
          setShowCreateModal(open);
          if (!open) resetModal();
        }}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          {createStep === 1 && (
            <>
              <DialogHeader>
                <DialogTitle>Select Agent Type</DialogTitle>
                <DialogDescription>
                  Choose the style of content your agent will create
                </DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-6">
                {agentTypes.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => setSelectedType(type.id)}
                    className={`p-4 rounded-xl border-2 transition-all text-center hover:border-primary/50 ${
                      selectedType === type.id
                        ? "border-primary bg-primary/5"
                        : "border-border"
                    }`}
                  >
                    <div
                      className={`w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center ${
                        selectedType === type.id
                          ? "gradient-bg"
                          : "bg-muted"
                      }`}
                    >
                      <type.icon
                        className={`w-6 h-6 ${
                          selectedType === type.id
                            ? "text-primary-foreground"
                            : "text-muted-foreground"
                        }`}
                      />
                    </div>
                    <p className="font-medium text-sm">{type.label}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {type.description}
                    </p>
                  </button>
                ))}
              </div>

              <div className="flex justify-end">
                <Button
                  variant="gradient"
                  disabled={!selectedType}
                  onClick={() => setCreateStep(2)}
                  className="gap-2"
                >
                  Continue
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </>
          )}

          {createStep === 2 && (
            <div className="flex flex-col h-full">
              <DialogHeader className="flex-shrink-0">
                <DialogTitle>Customize Your Agent</DialogTitle>
                <DialogDescription>
                  Fine-tune how your agent creates content (optional)
                </DialogDescription>
              </DialogHeader>

              <ScrollArea className="flex-1 py-6 -mx-6 px-6">
                <div className="space-y-6">
                  <button
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="flex items-center gap-2 text-sm font-medium text-primary"
                  >
                    {showAdvanced ? "Hide" : "Show"} Advanced Settings
                    <ArrowRight
                      className={`w-4 h-4 transition-transform ${
                        showAdvanced ? "rotate-90" : ""
                      }`}
                    />
                  </button>

                  <AnimatePresence>
                    {showAdvanced && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-6"
                      >
                        <div>
                          <Label>Voice Reference</Label>
                          <Input
                            value={voiceReference}
                            onChange={(e) => setVoiceReference(e.target.value)}
                            placeholder="e.g., Like Elon Musk - bold and direct"
                            className="mt-1.5"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Optional: Describe a public figure's communication style to mimic
                          </p>
                        </div>

                        <div>
                          <Label>Tone Preference</Label>
                          <div className="grid grid-cols-2 gap-2 mt-2">
                            {[
                              { id: "conversational", label: "Casual/Conversational" },
                              { id: "formal", label: "Formal/Corporate" },
                              { id: "friendly", label: "Friendly/Approachable" },
                              { id: "bold", label: "Bold/Contrarian" },
                            ].map((t) => (
                              <button
                                key={t.id}
                                onClick={() => setTone(t.id)}
                                className={`p-3 rounded-lg border text-sm transition-colors ${
                                  tone === t.id
                                    ? "border-primary bg-primary/5"
                                    : "border-border hover:border-primary/50"
                                }`}
                              >
                                {t.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <Label>Emoji Usage</Label>
                          <div className="mt-3 px-2">
                            <Slider
                              value={emojiLevel}
                              onValueChange={setEmojiLevel}
                              max={3}
                              step={1}
                            />
                            <div className="flex justify-between text-xs text-muted-foreground mt-2">
                              <span>No emojis</span>
                              <span>Minimal</span>
                              <span>Moderate</span>
                              <span>Lots</span>
                            </div>
                          </div>
                        </div>

                        <div>
                          <Label>Post Length</Label>
                          <div className="grid grid-cols-3 gap-2 mt-2">
                            {[
                              { id: "short", label: "Short", desc: "50-100 words" },
                              { id: "medium", label: "Medium", desc: "100-200 words" },
                              { id: "long", label: "Long", desc: "200-300 words" },
                            ].map((l) => (
                              <button
                                key={l.id}
                                onClick={() => setPostLength(l.id)}
                                className={`p-3 rounded-lg border text-center transition-colors ${
                                  postLength === l.id
                                    ? "border-primary bg-primary/5"
                                    : "border-border hover:border-primary/50"
                                }`}
                              >
                                <p className="font-medium text-sm">{l.label}</p>
                                <p className="text-xs text-muted-foreground">{l.desc}</p>
                              </button>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </ScrollArea>

              <div className="flex justify-between flex-shrink-0 pt-4 border-t border-border">
                <Button variant="ghost" onClick={() => setCreateStep(1)} className="gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </Button>
                <Button variant="gradient" onClick={() => setCreateStep(3)} className="gap-2">
                  Continue
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {createStep === 3 && (
            <div className="flex flex-col h-[75vh]">
              <DialogHeader className="flex-shrink-0">
                <DialogTitle>Tell Your Agent What to Create</DialogTitle>
                <DialogDescription>
                  Chat with your agent to generate posts
                </DialogDescription>
              </DialogHeader>

              <div className="flex-1 flex gap-4 min-h-0 mt-4">
                {/* Chat Section */}
                <div className="flex-1 flex flex-col min-h-0">
                  {/* Chat messages */}
                  <ScrollArea className="flex-1 pr-4">
                    <div className="space-y-4 pb-4">
                      {messages.map((message, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`flex ${
                            message.role === "user" ? "justify-end" : "justify-start"
                          }`}
                        >
                          <div
                            className={`max-w-[85%] p-4 rounded-2xl ${
                              message.role === "user"
                                ? "gradient-bg text-primary-foreground"
                                : "bg-muted"
                            }`}
                          >
                            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                          </div>
                        </motion.div>
                      ))}
                      {isLoading && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="flex justify-start"
                        >
                          <div className="bg-muted p-4 rounded-2xl flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span className="text-sm">Thinking...</span>
                          </div>
                        </motion.div>
                      )}
                      <div ref={chatEndRef} />
                    </div>
                  </ScrollArea>

                  {/* Chat input */}
                  <div className="flex-shrink-0 border-t border-border pt-4">
                    <div className="flex items-center gap-2 mb-3">
                      <input
                        type="checkbox"
                        id="generatePhoto"
                        checked={generatePhoto}
                        onChange={(e) => setGeneratePhoto(e.target.checked)}
                        className="rounded"
                      />
                      <label htmlFor="generatePhoto" className="text-sm flex items-center gap-1">
                        <Sparkles className="w-4 h-4 text-secondary" />
                        Generate photo with AI
                      </label>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" disabled={isLoading}>
                        <Paperclip className="w-5 h-5" />
                      </Button>
                      <Input
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Say hi or ask me to create posts..."
                        className="flex-1"
                        disabled={isLoading}
                      />
                      <Button 
                        variant="gradient" 
                        size="icon" 
                        onClick={handleSendMessage}
                        disabled={isLoading || !chatInput.trim()}
                      >
                        {isLoading ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <Send className="w-5 h-5" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Generated Posts Section */}
                {generatedPosts.length > 0 && (
                  <div className="w-[350px] flex-shrink-0 border-l border-border pl-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold">Generated Posts</h3>
                      <span className="text-sm text-muted-foreground">
                        {generatedPosts.length} posts
                      </span>
                    </div>
                    <ScrollArea className="h-[calc(100%-80px)]">
                      <div className="space-y-4 pr-4">
                        {generatedPosts.map((post, index) => (
                          <PostPreviewCard
                            key={post.id}
                            post={post}
                            index={index}
                            totalPosts={generatedPosts.length}
                            onUpdate={(updates) => updatePost(post.id, updates)}
                            onDelete={() => deletePost(post.id)}
                            onRegenerate={() => regeneratePost(post.id)}
                            isLoading={isLoading}
                          />
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                )}
              </div>

              <div className="flex justify-between mt-4 flex-shrink-0 pt-4 border-t border-border">
                <Button variant="ghost" onClick={() => setCreateStep(2)} className="gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </Button>
                <Button 
                  variant="success" 
                  className="gap-2"
                  onClick={handleScheduleAll}
                  disabled={generatedPosts.length === 0}
                >
                  <Check className="w-4 h-4" />
                  Schedule All {generatedPosts.length > 0 ? `(${generatedPosts.length})` : ""} Posts
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default AgentsPage;
