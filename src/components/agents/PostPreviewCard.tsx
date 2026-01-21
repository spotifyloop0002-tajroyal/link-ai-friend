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
} from "lucide-react";
import { GeneratedPost } from "@/hooks/useAgentChat";
import { formatDistanceToNow } from "date-fns";
import { formatDateOnlyIST, formatTimeIST } from "@/lib/timezoneUtils";

interface PostPreviewCardProps {
  post: GeneratedPost;
  index: number;
  totalPosts: number;
  onUpdate: (updates: Partial<GeneratedPost>) => void;
  onDelete: () => void;
  onRegenerate: () => void;
  onGenerateImage: () => void;
  isLoading?: boolean;
}

export function PostPreviewCard({
  post,
  index,
  totalPosts,
  onUpdate,
  onDelete,
  onRegenerate,
  onGenerateImage,
  isLoading,
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

  // FIX 4: Status badge styling
  const getStatusBadge = () => {
    const status = post.status || 'draft';
    switch (status) {
      case 'published':
        return (
          <Badge variant="default" className="bg-green-500/20 text-green-600 border-green-500/30">
            <CheckCircle className="w-3 h-3 mr-1" />
            Published
          </Badge>
        );
      case 'scheduled':
        return (
          <Badge variant="default" className="bg-blue-500/20 text-blue-600 border-blue-500/30">
            <Clock className="w-3 h-3 mr-1" />
            {post.scheduledTime 
              ? `In ${formatDistanceToNow(new Date(post.scheduledTime))}` 
              : 'Scheduled'}
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="bg-muted text-muted-foreground">
            <Edit className="w-3 h-3 mr-1" />
            Draft
          </Badge>
        );
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`bg-card border rounded-xl overflow-hidden ${
        post.status === 'published' 
          ? 'border-green-500/30' 
          : post.status === 'scheduled' 
            ? 'border-blue-500/30' 
            : 'border-border'
      }`}
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
        <Button
          variant="outline"
          size="sm"
          className="flex-1 h-8 text-xs"
          onClick={() => setIsEditing(true)}
          disabled={isLoading}
        >
          <Edit className="w-3.5 h-3.5 mr-1" />
          Edit
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1 h-8 text-xs"
          onClick={onRegenerate}
          disabled={isLoading}
        >
          <RefreshCw className={`w-3.5 h-3.5 mr-1 ${isLoading ? "animate-spin" : ""}`} />
          Regenerate
        </Button>
      </div>
    </motion.div>
  );
}
