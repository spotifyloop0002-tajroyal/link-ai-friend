import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
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
  Edit,
  Trash2,
  MessageSquare,
  GraduationCap,
} from "lucide-react";
import { useAgents } from "@/hooks/useAgents";
import { usePageTitle } from "@/hooks/usePageTitle";
import { toast } from "sonner";
import { ReferenceMaterials } from "@/components/agents/ReferenceMaterials";

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

const AgentsPage = () => {
  usePageTitle("AI Agents");
  const navigate = useNavigate();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [trainAgentId, setTrainAgentId] = useState<string | null>(null);
  const [createStep, setCreateStep] = useState(1);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [emojiLevel, setEmojiLevel] = useState([2]);
  const [postLength, setPostLength] = useState("medium");
  const [tone, setTone] = useState("conversational");
  const [voiceReference, setVoiceReference] = useState("");
  const [agentName, setAgentName] = useState("");

  // Fetch real agents
  const { agents, isLoading: agentsLoading, createAgent, toggleAgentStatus, deleteAgent } = useAgents();

  const handleToggleAgentStatus = async (agentId: string) => {
    await toggleAgentStatus(agentId);
  };

  const handleDeleteAgent = async (agentId: string) => {
    await deleteAgent(agentId);
  };

  const getTypeIcon = (type: string) => {
    const agentType = agentTypes.find((t) => t.id === type);
    return agentType?.icon || Bot;
  };

  const resetModal = () => {
    setCreateStep(1);
    setSelectedType(null);
    setShowAdvanced(false);
    setAgentName("");
    setTone("conversational");
    setEmojiLevel([2]);
    setPostLength("medium");
    setVoiceReference("");
  };

  // Navigate to chat page when Continue is clicked after selecting type
  const handleContinueToChat = async () => {
    if (!selectedType) return;

    // Create a new agent in the database
    const agentLabel = agentTypes.find(t => t.id === selectedType)?.label || selectedType;
    const newAgentName = agentName.trim() || `${agentLabel} Agent`;
    
    try {
      const newAgent = await createAgent({
        name: newAgentName,
        type: selectedType,
        settings: {
          tone,
          emojiLevel: emojiLevel[0],
          postLength,
          voiceReference: voiceReference || undefined,
        },
      });

      setShowCreateModal(false);
      resetModal();

      // Navigate to the chat page with the new agent
      if (newAgent?.id) {
        navigate(`/dashboard/agents/chat?type=${selectedType}&id=${newAgent.id}`);
      } else {
        navigate(`/dashboard/agents/chat?type=${selectedType}`);
      }
    } catch (error) {
      console.error("Failed to create agent:", error);
      toast.error("Failed to create agent. Please try again.");
    }
  };

  // Open chat for existing agent
  const handleOpenAgentChat = (agent: typeof agents[0]) => {
    navigate(`/dashboard/agents/chat?type=${agent.type}&id=${agent.id}`);
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
            { label: "Active Agents", value: agents.filter((a) => a.is_active).length },
            { label: "Total Posts", value: agents.reduce((sum, a) => sum + (a.posts_created || 0), 0) },
            { label: "Avg Success Rate", value: agents.length > 0 ? `${Math.round(agents.reduce((sum, a) => sum + (a.success_rate || 0), 0) / agents.length)}%` : "0%" },
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
                      checked={agent.is_active}
                      onCheckedChange={() => handleToggleAgentStatus(agent.id)}
                    />
                    <span className={`text-xs font-medium ${agent.is_active ? "text-success" : "text-muted-foreground"}`}>
                      {agent.is_active ? "Active" : "Paused"}
                    </span>
                  </div>
                </div>

                <h3 className="font-semibold text-lg mb-1">{agent.name}</h3>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium capitalize">
                  {agent.type.replace("-", " ")}
                </span>

                <div className="grid grid-cols-3 gap-4 mt-6 pt-4 border-t border-border">
                  <div>
                    <p className="text-2xl font-bold">{agent.posts_created}</p>
                    <p className="text-xs text-muted-foreground">Posts Created</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{agent.posts_scheduled}</p>
                    <p className="text-xs text-muted-foreground">Scheduled</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{agent.success_rate}%</p>
                    <p className="text-xs text-muted-foreground">Success</p>
                  </div>
                </div>

                <div className="flex gap-2 mt-6">
                  <Button 
                    variant="gradient" 
                    className="flex-1 gap-2"
                    onClick={() => handleOpenAgentChat(agent)}
                  >
                    <MessageSquare className="w-4 h-4" />
                    Chat
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="text-primary hover:text-primary"
                    onClick={() => setTrainAgentId(agent.id)}
                    title="Train Agent"
                  >
                    <GraduationCap className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleDeleteAgent(agent.id)}
                  >
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

      {/* Create Agent Modal - Steps 1 & 2 only */}
      <Dialog
        open={showCreateModal}
        onOpenChange={(open) => {
          setShowCreateModal(open);
          if (!open) resetModal();
        }}
      >
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
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
            <div className="flex flex-col max-h-[75vh]">
              <DialogHeader className="flex-shrink-0 pb-4">
                <DialogTitle>Customize Your Agent</DialogTitle>
                <DialogDescription>
                  Fine-tune how your agent creates content (optional)
                </DialogDescription>
              </DialogHeader>

              <div className="relative flex-1 min-h-0">
                <div 
                  className="overflow-y-auto max-h-[50vh] pr-4 scrollbar-thin scrollbar-thumb-primary/30 scrollbar-track-muted"
                  style={{ scrollbarWidth: 'thin', scrollbarColor: 'hsl(var(--primary) / 0.3) hsl(var(--muted))' }}
                >
                  <div className="space-y-6 pb-6">
                    {/* Agent Name */}
                    <div>
                      <Label>Agent Name (Optional)</Label>
                      <Input
                        value={agentName}
                        onChange={(e) => setAgentName(e.target.value)}
                        placeholder={`e.g., My ${agentTypes.find(t => t.id === selectedType)?.label} Agent`}
                        className="mt-1.5"
                      />
                    </div>

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
                </div>
              </div>

              <div className="flex justify-between flex-shrink-0 pt-4 mt-2 border-t border-border">
                <Button variant="ghost" onClick={() => setCreateStep(1)} className="gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </Button>
                <Button variant="gradient" onClick={handleContinueToChat} className="gap-2">
                  Create & Start Chatting
                  <MessageSquare className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      {/* Train Agent Dialog */}
      <Dialog open={!!trainAgentId} onOpenChange={(open) => !open && setTrainAgentId(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-primary" />
              Train Agent
            </DialogTitle>
            <DialogDescription>
              Upload writing samples, brand guidelines, topic notes, or any reference data. The agent will use this to match your style.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <ReferenceMaterials agentId={trainAgentId} />
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default AgentsPage;
