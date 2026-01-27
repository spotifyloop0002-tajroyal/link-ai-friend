import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, XCircle, Loader2, Clock, AlertCircle, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { PostStatusInfo } from "@/hooks/useExtensionEvents";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ExtensionStatusIndicatorProps {
  connected: boolean;
  message: string | null;
  postStatuses: Record<string, PostStatusInfo>;
  className?: string;
  compact?: boolean;
}

const statusConfig = {
  draft: { 
    icon: Clock, 
    color: "text-muted-foreground", 
    bgColor: "bg-muted",
    label: "Draft" 
  },
  scheduled: { 
    icon: Clock, 
    color: "text-primary", 
    bgColor: "bg-primary/10",
    label: "Scheduled" 
  },
  posting: { 
    icon: Loader2, 
    color: "text-secondary", 
    bgColor: "bg-secondary/10",
    label: "Posting" 
  },
  posted: { 
    icon: CheckCircle2, 
    color: "text-emerald-500", 
    bgColor: "bg-emerald-500/10",
    label: "Posted" 
  },
  verifying: { 
    icon: Loader2, 
    color: "text-amber-500", 
    bgColor: "bg-amber-500/10",
    label: "Verifying" 
  },
  failed: { 
    icon: AlertCircle, 
    color: "text-destructive", 
    bgColor: "bg-destructive/10",
    label: "Failed" 
  },
};

export function ExtensionStatusIndicator({
  connected,
  message,
  postStatuses,
  className,
  compact = false,
}: ExtensionStatusIndicatorProps) {
  const statusEntries = Object.entries(postStatuses);
  const hasStatuses = statusEntries.length > 0;

  if (compact) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <div className={cn(
          "w-2 h-2 rounded-full",
          connected ? "bg-emerald-500" : "bg-destructive"
        )} />
        <span className="text-xs text-muted-foreground">
          {connected ? "Extension Connected" : "Extension Not Connected"}
        </span>
      </div>
    );
  }

  return (
    <div className={cn("rounded-lg border border-border p-4 bg-card", className)}>
      {/* Connection Status */}
      <div className="flex items-center gap-2 mb-3">
        <motion.div
          animate={{ scale: connected ? [1, 1.2, 1] : 1 }}
          transition={{ duration: 0.3 }}
          className={cn(
            "w-3 h-3 rounded-full",
            connected ? "bg-emerald-500" : "bg-destructive"
          )}
        />
        <span className={cn(
          "text-sm font-medium",
          connected ? "text-emerald-500" : "text-destructive"
        )}>
          {connected ? "Extension Connected" : "Extension Not Connected"}
        </span>
      </div>

      {/* Live Status Message */}
      <AnimatePresence mode="wait">
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            className="text-sm text-muted-foreground mb-3 px-2 py-1 bg-muted rounded"
          >
            {message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Post Statuses */}
      {hasStatuses && (
        <div className="border-t border-border pt-3 mt-3">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
            Post Status
          </h4>
          <ScrollArea className="max-h-[200px]">
            <div className="space-y-2">
              <AnimatePresence>
                {statusEntries.map(([postId, post]) => {
                  const config = statusConfig[post.status];
                  const Icon = config.icon;
                  const isAnimating = post.status === 'posting' || post.status === 'verifying';

                  return (
                    <motion.div
                      key={postId}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      className={cn(
                        "flex items-center gap-2 p-2 rounded-lg text-sm",
                        config.bgColor
                      )}
                    >
                      <Icon className={cn(
                        "w-4 h-4 flex-shrink-0",
                        config.color,
                        isAnimating && "animate-spin"
                      )} />
                      
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-xs">{post.message}</p>
                        {post.scheduledTime && (
                          <p className="text-xs text-muted-foreground">
                            Scheduled: {new Date(post.scheduledTime).toLocaleString()}
                          </p>
                        )}
                      </div>

                      <span className={cn(
                        "flex-shrink-0 px-2 py-0.5 rounded-full text-[10px] font-medium",
                        config.color,
                        config.bgColor
                      )}>
                        {config.label}
                      </span>

                      {post.linkedinUrl && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => window.open(post.linkedinUrl, '_blank')}
                        >
                          <ExternalLink className="w-3 h-3" />
                        </Button>
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
