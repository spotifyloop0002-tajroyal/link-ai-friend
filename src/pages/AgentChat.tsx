import { useState, useRef, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Bot,
  ArrowLeft,
  Send,
  Sparkles,
  Loader2,
  Linkedin,
  ImagePlus,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { format } from "date-fns";
import { useAgentChat, GeneratedPost } from "@/hooks/useAgentChat";
import { useAgents } from "@/hooks/useAgents";
import { useUserProfile } from "@/hooks/useUserProfile";
import { usePostingLimits } from "@/hooks/usePostingLimits";
import { PostPreviewCard } from "@/components/agents/PostPreviewCard";
import { ExtensionActivityLog, useExtensionActivityLog } from "@/components/agents/ExtensionActivityLog";
import { ImageUploadPanel } from "@/components/agents/ImageUploadPanel";
import { ExtensionStatusIndicator } from "@/components/extension/ExtensionStatusIndicator";
import { toast } from "sonner";
import { useLinkedBotExtension } from "@/hooks/useLinkedBotExtension";
import { useImageUpload } from "@/hooks/useImageUpload";
import { useExtensionEvents } from "@/hooks/useExtensionEvents";
import { supabase } from "@/integrations/supabase/client";
import { PostStatus } from "@/lib/postLifecycle";

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
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  const { agents } = useAgents();
  const { profile } = useUserProfile();

  // Find the agent if ID provided and LOAD its saved settings
  const currentAgent = agentId ? agents.find(a => a.id === agentId) : null;
  const displayAgentType = currentAgent?.type || agentType;
  const displayAgentName = currentAgent?.name || agentTypes.find(t => t.id === displayAgentType)?.label || "Agent";

  // Parse agent settings from saved database settings
  const savedSettings = currentAgent?.settings as {
    tone?: string;
    emojiLevel?: number;
    postLength?: string;
    voiceReference?: string;
  } | null;

  // Agent settings - NOW CONNECTED to saved DB settings!
  const currentAgentSettings = {
    type: displayAgentType,
    tone: savedSettings?.tone || "conversational",
    emojiLevel: savedSettings?.emojiLevel ?? 2,
    postLength: savedSettings?.postLength || "medium",
    voiceReference: savedSettings?.voiceReference,
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
    previewPost,
    sendMessage,
    resetChat,
    updatePost,
    deletePost,
    regeneratePost,
    generateImageForPost,
    confirmPreviewPost,
    clearPreview,
    savePostToDatabase,
    setGeneratedPosts, // Need this for adding approved posts
  } = useAgentChat(currentAgentSettings, currentUserContext, agentId);

  // Scheduling dialog state removed - scheduling is now agent-driven

  // Extension hook for posting to LinkedIn
  const {
    isConnected: isExtensionConnected,
    sendPendingPosts,
  } = useLinkedBotExtension();

  // Enhanced extension events with real-time status
  const extensionStatus = useExtensionEvents();

  const [isPostingNow, setIsPostingNow] = useState(false);

  // Posting limits hook
  const { canPost, limitMessage, incrementPostCount, status: limitsStatus } = usePostingLimits();

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

  // Preflight validation removed - scheduling is now fully agent-driven with validation in auto_schedule handler

  // Approve a post for scheduling/posting
  const handleApprovePost = async (postId: string) => {
    const post = generatedPosts.find(p => p.id === postId);
    if (!post) return;

    // Validate content exists before approving
    if (!post.content || post.content.trim().length < 10) {
      toast.error("Cannot approve: Post content is too short or missing");
      return;
    }

    // Ask about image if not set and not skipped
    if (!post.imageUrl && !post.imageSkipped) {
      // Mark as image skipped if user is approving without image
      updatePost(postId, { 
        approved: true, 
        imageSkipped: true,
        status: 'approved' as PostStatus,
      });
      toast.success("✅ Post approved (no image)");
    } else {
      updatePost(postId, { 
        approved: true,
        status: 'approved' as PostStatus,
      });
      toast.success("✅ Post approved and ready to schedule!");
    }
  };

  // Post execution is now FULLY agent-driven - removed postSingleNow and postNow functions
  // The auto_schedule response handler above manages all posting via extension

  const handleSendMessage = async () => {
    const hasImages = uploadedImages.length > 0;
    const hasText = chatInput.trim().length > 0;
    
    if (!hasText && !hasImages) return;
    if (isLoading || isUploadingImages) return;

    // Check posting limits before generating content
    if (!canPost) {
      toast.error(limitMessage || "Posting limit reached. Upgrade your plan for more posts.");
      return;
    }

    const message = chatInput.trim();
    const imageUrls = getImageUrls();
    setChatInput("");

    // "Post now" commands are now handled by the agent via auto_schedule
    // We inform the user to use the agent for posting
    // REMOVED: Frontend blocking of "post now" - let the agent handle it
    // The agent now manages all intent detection including "post now"
    
    // Let the agent handle the post now request naturally via message

    // If images are uploaded, include them in the message
    const finalMessage = hasImages && imageUrls.length > 0
      ? `${message || "Create posts for these images"}\n\n[UPLOADED_IMAGES: ${imageUrls.join(", ")}]`
      : message;

    // Clear uploaded images after sending
    if (hasImages) {
      clearImages();
      setShowImageUpload(false);
    }

    const response = await sendMessage(finalMessage, { generateImage: generatePhoto, uploadedImages: imageUrls });
    
    // Handle generate_image response - generate image for specific post
    if (response?.type === "generate_image" && response.postId) {
      console.log("🎨 Generating image for post:", response.postId);
      generateImageForPost(response.postId);
      return;
    }
    
    // Handle auto_schedule response - automatically save and send to extension
    // This is the ONLY way posts get added to Generated Posts (after approval)
    if (response?.type === "auto_schedule" && response.postToSchedule && response.scheduledTime) {
      console.log("🚀 Auto-scheduling post (user approved):", response);
      
      const postToSchedule = response.postToSchedule;
      const scheduledTime = new Date(response.scheduledTime);
      
      // Validate extension is connected
      if (!isExtensionConnected) {
        toast.error("❌ Extension not connected. Please install and connect the Chrome extension first.");
        addActivityEntry("failed", "Extension not connected", postToSchedule.id);
        return;
      }
      
      // Save to database with approved and scheduled status
      const postToSave: GeneratedPost = {
        id: postToSchedule.id,
        content: postToSchedule.content,
        suggestedTime: postToSchedule.suggestedTime || scheduledTime.toISOString(),
        reasoning: postToSchedule.reasoning || "Auto-scheduled after approval",
        scheduledDateTime: scheduledTime.toISOString(),
        imageUrl: postToSchedule.imageUrl,
        imagePrompt: postToSchedule.imagePrompt,
        status: 'scheduled' as PostStatus,
        approved: true, // Auto-approved since user explicitly approved
        imageSkipped: !postToSchedule.imageUrl, // Skip image if not provided
      };
      
      const savedPost = await savePostToDatabase(postToSave, scheduledTime);
      
      if (savedPost) {
        // NOW add to Generated Posts (only after approval)
        updatePost(savedPost.id, savedPost);
        
        // Send to extension immediately
        addActivityEntry("sending", `Scheduling for ${format(scheduledTime, 'MMM d, h:mm a')}...`, savedPost.id);
        
        const validScheduledTime = scheduledTime.toISOString();
        
        if (!savedPost.trackingId) {
          console.error("❌ Missing trackingId on saved post");
          addActivityEntry("failed", "Missing tracking ID", savedPost.id);
          toast.error("Failed to schedule: missing tracking ID");
          return;
        }
        
        const postForExtension = {
          id: savedPost.dbId || savedPost.id,
          trackingId: savedPost.trackingId,
          content: savedPost.content,
          imageUrl: savedPost.imageUrl || undefined,
          scheduledTime: validScheduledTime,
          photo_url: savedPost.imageUrl || undefined,
          scheduled_time: validScheduledTime,
        };
        
        console.log("📤 Sending to extension:", postForExtension);
        
        const result = await sendPendingPosts([postForExtension as any]);
        
        if (result.success) {
          // Add to Generated Posts panel ONLY after successful extension handoff
          const finalPost = { 
            ...savedPost, 
            status: 'queued_in_extension' as PostStatus,
            queuedAt: new Date().toISOString(),
          };
          
          // Use setGeneratedPosts from hook to add the approved post
          setGeneratedPosts(prev => [finalPost, ...prev.filter(p => p.id !== finalPost.id)]);
          
          addActivityEntry("scheduled", `Scheduled for ${format(scheduledTime, 'MMM d, h:mm a')}`, savedPost.id);
          toast.success(`✅ Post scheduled for ${format(scheduledTime, 'MMM d, h:mm a')}!`);
          
          // Update database to mark sent to extension
          await supabase.from('posts').update({ 
            sent_to_extension_at: new Date().toISOString(),
            status: 'queued_in_extension',
          }).eq('id', savedPost.dbId || savedPost.id);
        } else {
          addActivityEntry("failed", result.error || "Failed to send to extension", savedPost.id);
          toast.error(result.error || "❌ Failed to send to extension");
        }
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // handlePostAllNow removed - posting is now fully agent-driven

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

        {/* Posting Limits Banner */}
        {limitsStatus && (
          <div className="flex items-center gap-4 py-2 px-4 bg-muted/50 rounded-lg mt-2 text-sm">
            <span className="text-muted-foreground">
              Posts today: <strong>{limitsStatus.postsToday}/{limitsStatus.dailyLimit}</strong>
            </span>
            <span className="text-muted-foreground">
              This month: <strong>{limitsStatus.postsThisMonth}/{limitsStatus.monthlyLimit}</strong>
            </span>
            {!canPost && (
              <Alert variant="destructive" className="py-1 px-3 flex-1">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs ml-2">
                  {limitMessage}
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

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
                      {/* Display uploaded images as thumbnails */}
                      {message.role === "user" && message.uploadedImages && message.uploadedImages.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-3">
                          {message.uploadedImages.map((imgUrl, imgIdx) => (
                            <img
                              key={imgIdx}
                              src={imgUrl}
                              alt={`Uploaded image ${imgIdx + 1}`}
                              className="w-20 h-20 object-cover rounded-lg border border-primary-foreground/20"
                            />
                          ))}
                        </div>
                      )}
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
                        onApprove={() => handleApprovePost(post.id)}
                        isLoading={isLoading}
                        isPosting={isPostingNow}
                      />
                    ))}
                  </div>
                </ScrollArea>

                {/* Extension Status Indicator with real-time updates */}
                <div className="border-t border-border pt-3 mt-3">
                  <ExtensionStatusIndicator
                    connected={isExtensionConnected || extensionStatus.connected}
                    message={extensionStatus.message}
                    postStatuses={extensionStatus.postStatuses}
                    compact={Object.keys(extensionStatus.postStatuses).length === 0}
                  />
                </div>

                {/* Extension Activity Log */}
                <div className="border-t border-border pt-3 mt-3 h-[140px]">
                  <ExtensionActivityLog entries={activityEntries} onClear={clearActivityLog} />
                </div>
              </>
            )}
          </div>
        </div>

        {/* SchedulingDialog removed - scheduling is now fully agent-driven */}
      </div>
    </DashboardLayout>
  );
};

export default AgentChatPage;
