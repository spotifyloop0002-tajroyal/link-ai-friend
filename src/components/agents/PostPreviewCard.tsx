import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
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
} from "lucide-react";
import { GeneratedPost } from "@/hooks/useAgentChat";

interface PostPreviewCardProps {
  post: GeneratedPost;
  index: number;
  totalPosts: number;
  onUpdate: (updates: Partial<GeneratedPost>) => void;
  onDelete: () => void;
  onRegenerate: () => void;
  isLoading?: boolean;
}

export function PostPreviewCard({
  post,
  index,
  totalPosts,
  onUpdate,
  onDelete,
  onRegenerate,
  isLoading,
}: PostPreviewCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(post.content);

  const scheduledDate = new Date(post.scheduledDateTime);
  const formattedDate = scheduledDate.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const formattedTime = scheduledDate.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  const handleSaveEdit = () => {
    onUpdate({ content: editedContent });
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditedContent(post.content);
    setIsEditing(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="bg-card border border-border rounded-xl overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-muted/50 border-b border-border">
        <span className="text-sm font-medium">
          📝 Post {index + 1} of {totalPosts}
        </span>
        <Button
          variant="ghost"
          size="icon"
          onClick={onDelete}
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="p-4">
        {isEditing ? (
          <div className="space-y-3">
            <textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              className="w-full min-h-[150px] p-3 rounded-lg border border-border bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={handleCancelEdit}>
                Cancel
              </Button>
              <Button variant="gradient" size="sm" onClick={handleSaveEdit}>
                <Check className="w-4 h-4 mr-1" />
                Save
              </Button>
            </div>
          </div>
        ) : (
          <>
            <p className="text-sm whitespace-pre-wrap">
              {isExpanded ? post.content : `${post.content.substring(0, 200)}${post.content.length > 200 ? "..." : ""}`}
            </p>
            {post.content.length > 200 && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-primary text-sm font-medium mt-2 flex items-center gap-1 hover:underline"
              >
                {isExpanded ? (
                  <>
                    Show Less <ChevronUp className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    View Full Post <ChevronDown className="w-4 h-4" />
                  </>
                )}
              </button>
            )}
          </>
        )}
      </div>

      {/* Schedule Info */}
      <div className="px-4 py-3 bg-muted/30 border-t border-border">
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="w-4 h-4" />
            <span>{formattedDate}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span>{formattedTime}</span>
          </div>
        </div>
        {post.reasoning && (
          <p className="text-xs text-muted-foreground mt-1.5">
            💡 {post.reasoning}
          </p>
        )}
      </div>

      {/* AI Image Toggle */}
      <div className="px-4 py-3 border-t border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Switch
              checked={post.generateImage || false}
              onCheckedChange={(checked) => onUpdate({ generateImage: checked })}
            />
            <label className="text-sm flex items-center gap-1">
              <Sparkles className="w-4 h-4 text-secondary" />
              Generate AI image
            </label>
          </div>
        </div>
        {post.generateImage && (
          <Input
            value={post.imagePrompt || ""}
            onChange={(e) => onUpdate({ imagePrompt: e.target.value })}
            placeholder="Describe the image or leave blank to auto-generate..."
            className="mt-2 text-sm"
          />
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 p-4 border-t border-border">
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={() => setIsEditing(true)}
          disabled={isLoading}
        >
          <Edit className="w-4 h-4 mr-1" />
          Edit
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={onRegenerate}
          disabled={isLoading}
        >
          <RefreshCw className={`w-4 h-4 mr-1 ${isLoading ? "animate-spin" : ""}`} />
          Regenerate
        </Button>
      </div>
    </motion.div>
  );
}
