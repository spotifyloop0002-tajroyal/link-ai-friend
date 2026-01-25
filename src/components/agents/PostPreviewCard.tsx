import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  Clock,
  Trash2,
  Edit,
  RefreshCw,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Check,
  Loader2,
  Image as ImageIcon,
  CheckCircle,
  AlertCircle,
  ThumbsUp,
  Send,
} from "lucide-react";
import { GeneratedPost } from "@/hooks/useAgentChat";
import { formatDistanceToNow } from "date-fns";
import { formatDateOnlyIST, formatTimeIST } from "@/lib/timezoneUtils";
import { 
  PostStatus,
  STATUS_LABELS, 
  STATUS_COLORS, 
  canEditPost, 
  canDeletePost, 
  canPostNow as canPostNowCheck,
  isProcessingState,
  shouldArchivePost,
} from "@/lib/postLifecycle";

interface PostPreviewCardProps {
  post: GeneratedPost;
  index: number;
  totalPosts: number;
  onUpdate: (updates: Partial<GeneratedPost>) => void;
  onDelete: () => void;
  onRegenerate: () => void;
  onGenerateImage: () => void;
  onApprove?: () => void;
  isLoading?: boolean;
  isPosting?: boolean;
}

export function PostPreviewCard({
  post,
  index,
  totalPosts,
  onUpdate,
  onDelete,
  onRegenerate,
  onGenerateImage,
  onApprove,
  isLoading,
  isPosting,
}: PostPreviewCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(post.content);

  const scheduledDate = new Date(post.scheduledDateTime);
  const formattedDate = formatDateOnlyIST(scheduledDate);
  const formattedTime = formatTimeIST(scheduledDate);

  const handleSaveEdit = () => {
    onUpdate({ content: editedContent });
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditedContent(post.content);
    setIsEditing(false);
  };

  const handleToggleImageGeneration = (checked: boolean) => {
    onUpdate({ generateImage: checked });
    if (checked && !post.imageUrl) {
      onGenerateImage();
    }
  };

  // Get current status with fallback
  const currentStatus: PostStatus = (post.status as PostStatus) || 'draft';
  const isApproved = post.approved || false;
  const canEdit = canEditPost(currentStatus);
  const canDelete = canDeletePost(currentStatus);
  const canPost = canPostNowCheck(currentStatus, isApproved);
  const isProcessing = isProcessingState(currentStatus);
  const isArchived = shouldArchivePost(currentStatus);

  // Get status colors from lifecycle
  const statusColors = STATUS_COLORS[currentStatus] || STATUS_COLORS.draft;

  // Status badge with proper lifecycle display
  const getStatusBadge = () => {
    switch (currentStatus) {
      case 'posted':
      case 'published':
        return (
          <Badge variant="default" className={`${statusColors.bg} ${statusColors.text} ${statusColors.border}`}>
            <CheckCircle className="w-3 h-3 mr-1" />
            {STATUS_LABELS[currentStatus]}
          </Badge>
        );
      case 'queued_in_extension':
      case 'posting':
        return (
          <Badge variant="default" className={`${statusColors.bg} ${statusColors.text} ${statusColors.border}`}>
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            {STATUS_LABELS[currentStatus]}
          </Badge>
        );
      case 'scheduled':
        return (
          <Badge variant="default" className={`${statusColors.bg} ${statusColors.text} ${statusColors.border}`}>
            <Clock className="w-3 h-3 mr-1" />
            {post.scheduledTime 
              ? `In ${formatDistanceToNow(new Date(post.scheduledTime))}` 
              : 'Scheduled'}
          </Badge>
        );
      case 'approved':
        return (
          <Badge variant="default" className={`${statusColors.bg} ${statusColors.text} ${statusColors.border}`}>
            <ThumbsUp className="w-3 h-3 mr-1" />
            Approved
          </Badge>
        );
      case 'failed':
        return (
          <Badge variant="destructive" className="gap-1">
            <AlertCircle className="w-3 h-3" />
            Failed
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="bg-muted text-muted-foreground">
            <Edit className="w-3 h-3 mr-1" />
            Draft {isApproved ? '(Approved)' : ''}
          </Badge>
        );
    }
  };

  // Don't render archived posts
  if (isArchived) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`bg-card border rounded-xl overflow-hidden ${statusColors.border}`}
    >
      {/* Header with status */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-muted/50 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">
            📝 Post {index + 1} of {totalPosts}
          </span>
          {getStatusBadge()}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onDelete}
          disabled={!canDelete || isProcessing}
          className="h-7 w-7 text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* Generated Image */}
      {post.imageUrl && (
        <div className="relative">
          <img 
            src={post.imageUrl} 
            alt="Generated post image" 
            className="w-full h-32 object-cover"
          />
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 h-7 w-7 bg-background/80 hover:bg-background"
            onClick={onGenerateImage}
            disabled={post.isGeneratingImage}
          >
            {post.isGeneratingImage ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5" />
            )}
          </Button>
        </div>
      )}

      {/* Content */}
      <div className="p-3">
        {isEditing ? (
          <div className="space-y-2">
            <textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              className="w-full min-h-[120px] p-2.5 rounded-lg border border-border bg-background resize-none text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={handleCancelEdit}>
                Cancel
              </Button>
              <Button variant="gradient" size="sm" onClick={handleSaveEdit}>
                <Check className="w-3.5 h-3.5 mr-1" />
                Save
              </Button>
            </div>
          </div>
        ) : (
          <>
            <p className="text-sm whitespace-pre-wrap leading-relaxed">
              {isExpanded ? post.content : `${post.content.substring(0, 150)}${post.content.length > 150 ? "..." : ""}`}
            </p>
            {post.content.length > 150 && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-primary text-xs font-medium mt-1.5 flex items-center gap-0.5 hover:underline"
              >
                {isExpanded ? (
                  <>Less <ChevronUp className="w-3.5 h-3.5" /></>
                ) : (
                  <>More <ChevronDown className="w-3.5 h-3.5" /></>
                )}
              </button>
            )}
          </>
        )}
      </div>

      {/* Schedule Info */}
      <div className="px-3 py-2 bg-muted/30 border-t border-border">
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Calendar className="w-3.5 h-3.5" />
            <span>{formattedDate}</span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Clock className="w-3.5 h-3.5" />
            <span>{formattedTime} IST</span>
          </div>
        </div>
        {post.reasoning && (
          <p className="text-xs text-muted-foreground mt-1">
            💡 {post.reasoning}
          </p>
        )}
      </div>

      {/* AI Image Toggle */}
      <div className="px-3 py-2.5 border-t border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Switch
              checked={post.generateImage || false}
              onCheckedChange={handleToggleImageGeneration}
              disabled={post.isGeneratingImage}
            />
            <label className="text-xs flex items-center gap-1">
              {post.isGeneratingImage ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-secondary" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-secondary" />
                  AI image
                </>
              )}
            </label>
          </div>
          {!post.imageUrl && post.generateImage && !post.isGeneratingImage && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={onGenerateImage}
            >
              <ImageIcon className="w-3.5 h-3.5 mr-1" />
              Generate
            </Button>
          )}
        </div>
        {post.generateImage && !post.imageUrl && (
          <Input
            value={post.imagePrompt || ""}
            onChange={(e) => onUpdate({ imagePrompt: e.target.value })}
            placeholder="Custom image prompt (optional)..."
            className="mt-2 text-xs h-8"
          />
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-1.5 p-2.5 border-t border-border">
        {/* Approve button - only show if not approved and can edit */}
        {!isApproved && canEdit && onApprove && (
          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-8 text-xs border-blue-500/30 text-blue-600 hover:bg-blue-500/10"
            onClick={onApprove}
            disabled={isLoading || isProcessing}
          >
            <ThumbsUp className="w-3.5 h-3.5 mr-1" />
            Approve
          </Button>
        )}
        
        {/* Edit button - only if can edit */}
        {canEdit && (
          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-8 text-xs"
            onClick={() => setIsEditing(true)}
            disabled={isLoading || isProcessing}
          >
            <Edit className="w-3.5 h-3.5 mr-1" />
            Edit
          </Button>
        )}
        
        {/* Regenerate button - only if can edit */}
        {canEdit && (
          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-8 text-xs"
            onClick={onRegenerate}
            disabled={isLoading || isProcessing}
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1 ${isLoading ? "animate-spin" : ""}`} />
            Regenerate
          </Button>
        )}

        {/* Post Now button REMOVED - posting is fully agent-driven */}

        {/* Processing indicator */}
        {isProcessing && (
          <div className="flex-1 flex items-center justify-center h-8 text-xs text-muted-foreground">
            <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
            {STATUS_LABELS[currentStatus]}
          </div>
        )}
      </div>
    </motion.div>
  );
}
