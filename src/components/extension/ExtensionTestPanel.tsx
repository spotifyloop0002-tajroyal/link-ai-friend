import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, CheckCircle2, AlertCircle, Clock, RefreshCw, Trash2 } from "lucide-react";
import { format } from "date-fns";

interface PostedUrl {
  postId: string;
  trackingId?: string;
  linkedinUrl: string;
  timestamp: string;
  verified: boolean;
}

export function ExtensionTestPanel() {
  const [postedUrls, setPostedUrls] = useState<PostedUrl[]>([]);
  const [isListening, setIsListening] = useState(false);

  useEffect(() => {
    // Load from localStorage on mount
    const saved = localStorage.getItem('linkedbot_posted_urls');
    if (saved) {
      try {
        setPostedUrls(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse posted URLs:', e);
      }
    }

    // Listen for extension events
    const handleMessage = (event: MessageEvent) => {
      if (event.source !== window) return;
      
      const { type, data } = event.data || {};
      
      // Listen for POST_RESULT, postSuccess, postCompleted events
      if (
        type === 'POST_RESULT' ||
        type === 'EXTENSION_EVENT' && (data?.event === 'postSuccess' || data?.event === 'postCompleted')
      ) {
        const eventData = type === 'POST_RESULT' ? event.data : data?.data || data;
        const linkedinUrl = eventData?.linkedinUrl || eventData?.postUrl;
        const postId = eventData?.postId;
        
        if (postId) {
          const newEntry: PostedUrl = {
            postId,
            trackingId: eventData?.trackingId,
            linkedinUrl: linkedinUrl || '',
            timestamp: new Date().toISOString(),
            verified: !!linkedinUrl && linkedinUrl.includes('linkedin.com'),
          };
          
          setPostedUrls(prev => {
            const updated = [newEntry, ...prev.filter(u => u.postId !== postId)].slice(0, 20);
            localStorage.setItem('linkedbot_posted_urls', JSON.stringify(updated));
            return updated;
          });
        }
      }
    };

    // Also listen for custom events from bridge
    const handleBridgeEvent = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { postId, linkedinUrl, trackingId } = customEvent.detail || {};
      
      if (postId) {
        const newEntry: PostedUrl = {
          postId,
          trackingId,
          linkedinUrl: linkedinUrl || '',
          timestamp: new Date().toISOString(),
          verified: !!linkedinUrl && linkedinUrl.includes('linkedin.com'),
        };
        
        setPostedUrls(prev => {
          const updated = [newEntry, ...prev.filter(u => u.postId !== postId)].slice(0, 20);
          localStorage.setItem('linkedbot_posted_urls', JSON.stringify(updated));
          return updated;
        });
      }
    };

    window.addEventListener('message', handleMessage);
    window.addEventListener('linkedbot:post-published', handleBridgeEvent);
    setIsListening(true);

    return () => {
      window.removeEventListener('message', handleMessage);
      window.removeEventListener('linkedbot:post-published', handleBridgeEvent);
    };
  }, []);

  const clearHistory = () => {
    setPostedUrls([]);
    localStorage.removeItem('linkedbot_posted_urls');
  };

  const verifiedCount = postedUrls.filter(u => u.verified).length;
  const pendingCount = postedUrls.filter(u => !u.verified).length;

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            🔌 Extension Test Panel
            {isListening && (
              <Badge variant="secondary" className="text-xs bg-success/10 text-success">
                Listening
              </Badge>
            )}
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={clearHistory} className="h-8 gap-1">
            <Trash2 className="w-3.5 h-3.5" />
            Clear
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Real-time log of posted URLs received from Chrome extension
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Summary */}
        <div className="flex gap-4 text-sm">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-success" />
            <span>{verifiedCount} verified</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-warning" />
            <span>{pendingCount} pending</span>
          </div>
        </div>

        {/* URL List */}
        {postedUrls.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <RefreshCw className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No posted URLs yet</p>
            <p className="text-xs">Post something to see URLs appear here</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {postedUrls.map((item, index) => (
              <div
                key={`${item.postId}-${index}`}
                className={`p-3 rounded-lg border ${
                  item.verified 
                    ? 'bg-success/5 border-success/20' 
                    : 'bg-warning/5 border-warning/20'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {item.verified ? (
                        <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-warning flex-shrink-0" />
                      )}
                      <span className="text-xs font-mono text-muted-foreground truncate">
                        {item.postId.substring(0, 8)}...
                      </span>
                    </div>
                    
                    {item.linkedinUrl ? (
                      <a
                        href={item.linkedinUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline flex items-center gap-1 truncate"
                      >
                        <ExternalLink className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{item.linkedinUrl}</span>
                      </a>
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        No URL received
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {format(new Date(item.timestamp), 'HH:mm:ss')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
