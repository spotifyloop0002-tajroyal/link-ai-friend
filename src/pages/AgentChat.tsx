import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Bot,
  ArrowLeft,
  Send,
  Sparkles,
  Loader2,
  Linkedin,
  ImagePlus,
  RefreshCw,
} from "lucide-react";
import { format } from "date-fns";
import { useAgentChat } from "@/hooks/useAgentChat";
import { useAgents } from "@/hooks/useAgents";
import { useUserProfile } from "@/hooks/useUserProfile";
import { PostPreviewCard } from "@/components/agents/PostPreviewCard";
import { ExtensionActivityLog, useExtensionActivityLog } from "@/components/agents/ExtensionActivityLog";
import { ImageUploadPanel } from "@/components/agents/ImageUploadPanel";
import { toast } from "sonner";
import { useLinkedBotExtension } from "@/hooks/useLinkedBotExtension";
import { useImageUpload } from "@/hooks/useImageUpload";

const agentTypes = [
  { id: "comedy", label: "Comedy/Humorous" },
  { id: "professional", label: "Professional" },
  { id: "storytelling", label: "Storytelling" },
  { id: "thought-leadership", label: "Thought Leadership" },
  { id: "motivational", label: "Motivational" },
  { id: "data-analytics", label: "Data/Analytics" },
  { id: "creative", label: "Creative/Design" },
  { id: "news", label: "News/Updates" },
];

const AgentChatPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const agentType = searchParams.get("type") || "professional";
  const agentId = searchParams.get("id");
  
  const [chatInput, setChatInput] = useState("");
  const [generatePhoto, setGeneratePhoto] = useState(false);
  const [showImageUpload, setShowImageUpload] = useState(false);
  const [tone, setTone] = useState("conversational");
  const [emojiLevel, setEmojiLevel] = useState(2);
  const [postLength, setPostLength] = useState("medium");
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  const { agents } = useAgents();
  const { profile } = useUserProfile();

  // Find the agent if ID provided
  const currentAgent = agentId ? agents.find(a => a.id === agentId) : null;
  const displayAgentType = currentAgent?.type || agentType;
  const displayAgentName = currentAgent?.name || agentTypes.find(t => t.id === displayAgentType)?.label || "Agent";

  // Agent settings
  const currentAgentSettings = {
    type: displayAgentType,
    tone,
    emojiLevel,
    postLength,
  };

  // Real user context from profile
  const currentUserContext = {
    name: profile?.name || "User",
    industry: profile?.industry || "Technology",
    company: profile?.company_name,
    role: profile?.role,
    background: profile?.background,
  };

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
    generateImageForPost,
  } = useAgentChat(currentAgentSettings, currentUserContext);

  // Extension hook for posting to LinkedIn
  const {
    isConnected: isExtensionConnected,
    sendPendingPosts,
    postNow,
    isLoading: isExtensionLoading,
  } = useLinkedBotExtension();

  const [isPostingNow, setIsPostingNow] = useState(false);

  // Extension activity log
  const { entries: activityEntries, addEntry: addActivityEntry, clearLog: clearActivityLog } = useExtensionActivityLog();

  // Image upload hook
  const {
    images: uploadedImages,
    isUploading: isUploadingImages,
    addImages,
    removeImage,
    clearImages,
    getImageUrls,
    remainingSlots,
    maxImages,
  } = useImageUpload();

  // Scroll to bottom when messages change
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Validate post before publishing
  const validatePostForPublishing = (post?: { id: string; content: string; imageUrl?: string }): { valid: boolean; error?: string } => {
    if (!post) {
      return { valid: false, error: "No post available to publish. Generate a post first." };
    }
    if (!post.content?.trim()) {
      return { valid: false, error: "Post has no content. Generate a post first." };
    }
    if (post.content.trim().length < 10) {
      return { valid: false, error: "Post content is too short. Please generate a valid post." };
    }
    return { valid: true };
  };

  const postSingleNow = async (post: { id: string; content: string; imageUrl?: string }) => {
    const validation = validatePostForPublishing(post);
    if (!validation.valid) {
      toast.error(validation.error!);
      addActivityEntry("failed", validation.error!, post?.id);
      return;
    }

    if (!isExtensionConnected) {
      toast.error("Chrome extension not connected. Please connect from Dashboard first.");
      addActivityEntry("failed", "Extension not connected", post.id);
      return;
    }

    setIsPostingNow(true);
    addActivityEntry("sending", "Sending to extension...", post.id);
    
    const result = await postNow({
      id: post.id,
      content: post.content,
      photo_url: post.imageUrl,
      scheduled_time: new Date().toISOString(),
    });

    if (result?.success) {
      addActivityEntry("queued", "Sent to extension. Waiting for LinkedIn confirmation...", post.id);
      toast.info("📤 Publishing to LinkedIn...");
      updatePost(post.id, { status: 'published' });
      toast.success(`✅ Post published successfully at ${format(new Date(), 'h:mm a')}`);
    } else {
      const errorMsg = result?.error || "Extension rejected the post";
      addActivityEntry("failed", errorMsg, post.id);
      toast.error(`❌ ${errorMsg}`);
    }
    
    setIsPostingNow(false);
  };

  const handleSendMessage = async () => {
    const hasImages = uploadedImages.length > 0;
    const hasText = chatInput.trim().length > 0;
    
    if (!hasText && !hasImages) return;
    if (isLoading || isUploadingImages) return;

    const message = chatInput.trim();
    const imageUrls = getImageUrls();
    setChatInput("");

    // Check for posting commands
    const wantsPostNow =
      /\bpost(\s+it)?\s+now\b/i.test(message) ||
      /\bpublish(\s+it)?\s+now\b/i.test(message) ||
      /\bsend(\s+it)?\s+now\b/i.test(message);

    if (wantsPostNow && generatedPosts.length > 0) {
      const first = generatedPosts[0];
      const validation = validatePostForPublishing(first);
      if (!validation.valid) {
        toast.error(validation.error!);
        addActivityEntry("failed", validation.error!, first?.id);
        return;
      }
      await postSingleNow(first);
      return;
    }

    if (wantsPostNow && generatedPosts.length === 0) {
      toast.error("No post to publish. Generate a post first!");
      addActivityEntry("failed", "No post to publish - blocked", undefined);
      return;
    }

    // If images are uploaded, include them in the message
    const finalMessage = hasImages && imageUrls.length > 0
      ? `${message || "Create posts for these images"}\n\n[UPLOADED_IMAGES: ${imageUrls.join(", ")}]`
      : message;

    // Clear uploaded images after sending
    if (hasImages) {
      clearImages();
      setShowImageUpload(false);
    }

    await sendMessage(finalMessage, { generateImage: generatePhoto, uploadedImages: imageUrls });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handlePostAllNow = async () => {
    if (generatedPosts.length === 0) {
      toast.error("No posts to publish. Generate posts first.");
      return;
    }

    const invalidPosts = generatedPosts.filter(p => !p.content?.trim() || p.content.trim().length < 10);
    if (invalidPosts.length > 0) {
      toast.error(`${invalidPosts.length} post(s) have no content. Please regenerate them.`);
      return;
    }

    if (!isExtensionConnected) {
      toast.error("Chrome extension not connected. Please connect from Dashboard first.");
      return;
    }

    setIsPostingNow(true);
    
    for (const post of generatedPosts) {
      addActivityEntry("sending", `Posting "${post.content.substring(0, 30)}..."`, post.id);
      await postSingleNow(post);
    }
    
    setIsPostingNow(false);
  };

  const handleBack = () => {
    resetChat();
    navigate("/dashboard/agents");
  };

  const handleClearChat = () => {
    resetChat();
    toast.success("Chat history cleared");
  };

  return (
    <DashboardLayout>
      <div className="h-[calc(100vh-120px)] flex flex-col">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between pb-4 border-b border-border flex-shrink-0"
        >
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={handleBack}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Bot className="w-6 h-6 text-primary" />
                {displayAgentName}
              </h1>
              <p className="text-sm text-muted-foreground">
                Chat with your AI agent to create LinkedIn posts
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium capitalize">
              {displayAgentType.replace("-", " ")}
            </span>
            <Button variant="outline" size="sm" onClick={handleClearChat} className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Clear Chat
            </Button>
          </div>
        </motion.div>

        {/* Main content area */}
        <div className="flex-1 flex gap-6 min-h-0 pt-4">
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
                      className={`max-w-[80%] p-4 rounded-2xl ${
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
            <div className="flex-shrink-0 border-t border-border pt-4 space-y-3">
              {/* Image Upload Panel */}
              <AnimatePresence>
                {showImageUpload && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <ImageUploadPanel
                      images={uploadedImages}
                      isUploading={isUploadingImages}
                      remainingSlots={remainingSlots}
                      maxImages={maxImages}
                      onAddImages={addImages}
                      onRemoveImage={removeImage}
                      disabled={isLoading}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Options Row */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="generatePhoto"
                    checked={generatePhoto}
                    onChange={(e) => setGeneratePhoto(e.target.checked)}
                    className="rounded"
                  />
                  <label htmlFor="generatePhoto" className="text-sm flex items-center gap-1">
                    <Sparkles className="w-4 h-4 text-secondary" />
                    AI image
                  </label>
                </div>
                
                <Button
                  variant={showImageUpload ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setShowImageUpload(!showImageUpload)}
                  className="gap-1.5 h-7 text-xs"
                >
                  <ImagePlus className="w-3.5 h-3.5" />
                  Upload ({uploadedImages.length}/{maxImages})
                </Button>
              </div>

              {/* Input Row */}
              <div className="flex gap-2">
                <Input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={uploadedImages.length > 0 ? "Describe posts for your images..." : "Say hi or ask me to create posts..."}
                  className="flex-1"
                  disabled={isLoading}
                />
                <Button 
                  variant="gradient" 
                  size="icon" 
                  onClick={handleSendMessage}
                  disabled={isLoading || isUploadingImages || (!chatInput.trim() && uploadedImages.length === 0)}
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

          {/* Generated Posts Section - always visible */}
          <div className="w-[400px] flex-shrink-0 border-l border-border pl-6 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg">Generated Posts</h3>
              <span className="text-sm text-muted-foreground">
                {generatedPosts.length} post{generatedPosts.length !== 1 ? "s" : ""}
              </span>
            </div>
            
            {generatedPosts.length === 0 ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <Bot className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No posts generated yet.</p>
                  <p className="text-xs mt-1">Ask your agent to create a post!</p>
                </div>
              </div>
            ) : (
              <>
                <ScrollArea className="flex-1 min-h-0">
                  <div className="space-y-4 pr-4">
                    {generatedPosts.map((post, index) => (
                      <PostPreviewCard
                        key={post.id}
                        post={post}
                        index={index}
                        totalPosts={generatedPosts.length}
                        onUpdate={(updates) => updatePost(post.id, updates)}
                        onDelete={() => deletePost(post.id)}
                        onRegenerate={() => regeneratePost(post.id, currentAgentSettings, currentUserContext)}
                        onGenerateImage={() => generateImageForPost(post.id)}
                        isLoading={isLoading}
                      />
                    ))}
                  </div>
                </ScrollArea>

                {/* Post Now Button */}
                <div className="border-t border-border pt-4 mt-4">
                  <div className="flex items-center justify-between mb-3">
                    {!isExtensionConnected && (
                      <span className="text-sm text-amber-500 flex items-center gap-1">
                        <Linkedin className="w-4 h-4" />
                        Extension not connected
                      </span>
                    )}
                  </div>
                  <Button 
                    variant="success" 
                    className="w-full gap-2"
                    onClick={handlePostAllNow}
                    disabled={generatedPosts.length === 0 || isPostingNow || !isExtensionConnected}
                  >
                    {isPostingNow ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Linkedin className="w-4 h-4" />
                    )}
                    {isPostingNow ? "Posting..." : `Post Now (${generatedPosts.length})`}
                  </Button>
                </div>

                {/* Extension Activity Log */}
                <div className="border-t border-border pt-3 mt-3 h-[140px]">
                  <ExtensionActivityLog entries={activityEntries} onClear={clearActivityLog} />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AgentChatPage;
