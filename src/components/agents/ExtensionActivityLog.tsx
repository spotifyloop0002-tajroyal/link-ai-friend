import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import {
  Send,
  CheckCircle2,
  Clock,
  AlertCircle,
  Trash2,
  RefreshCw,
} from "lucide-react";

export interface ActivityEntry {
  id: string;
  timestamp: Date;
  status: "sending" | "queued" | "published" | "failed";
  message: string;
  postId?: string;
}

export function useExtensionActivityLog() {
  const [entries, setEntries] = useState<ActivityEntry[]>([]);

  const addEntry = useCallback(
    (
      status: ActivityEntry["status"],
      message: string,
      postId?: string
    ) => {
      setEntries((prev) => [
        {
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          timestamp: new Date(),
          status,
          message,
          postId,
        },
        ...prev,
      ]);
    },
    []
  );

  const clearLog = useCallback(() => setEntries([]), []);

  // Listen for extension events
  useEffect(() => {
    const handlePostPublished = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      addEntry(
        "published",
        `Post published to LinkedIn${detail?.linkedinPostId ? ` (ID: ${detail.linkedinPostId})` : ""}`,
        detail?.postId
      );
    };

    window.addEventListener("linkedbot-post-published", handlePostPublished);
    return () =>
      window.removeEventListener("linkedbot-post-published", handlePostPublished);
  }, [addEntry]);

  return { entries, addEntry, clearLog };
}

interface ExtensionActivityLogProps {
  entries: ActivityEntry[];
  onClear: () => void;
}

const statusConfig: Record<
  ActivityEntry["status"],
  { icon: typeof CheckCircle2; color: string; label: string }
> = {
  sending: { icon: RefreshCw, color: "text-secondary", label: "Sending" },
  queued: { icon: Clock, color: "text-amber-500", label: "Queued" },
  published: { icon: CheckCircle2, color: "text-emerald-500", label: "Published" },
  failed: { icon: AlertCircle, color: "text-destructive", label: "Failed" },
};

export function ExtensionActivityLog({
  entries,
  onClear,
}: ExtensionActivityLogProps) {
  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground text-sm">
        <Send className="w-6 h-6 mb-2 opacity-50" />
        <p>No activity yet</p>
        <p className="text-xs mt-1">Actions will appear here once you send posts to the extension.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Extension Activity
        </h4>
        <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={onClear}>
          <Trash2 className="w-3 h-3 mr-1" />
          Clear
        </Button>
      </div>
      <ScrollArea className="flex-1">
        <div className="space-y-2 pr-2">
          <AnimatePresence initial={false}>
            {entries.map((entry) => {
              const cfg = statusConfig[entry.status];
              const Icon = cfg.icon;
              return (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="flex items-start gap-2 text-xs border border-border rounded-lg p-2 bg-card"
                >
                  <Icon
                    className={`w-4 h-4 flex-shrink-0 mt-0.5 ${cfg.color} ${
                      entry.status === "sending" ? "animate-spin" : ""
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="truncate font-medium">{entry.message}</p>
                    <p className="text-muted-foreground mt-0.5">
                      {entry.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                  <span
                    className={`flex-shrink-0 px-1.5 py-0.5 rounded-full text-[10px] font-medium ${cfg.color} bg-muted`}
                  >
                    {cfg.label}
                  </span>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </ScrollArea>
    </div>
  );
}
