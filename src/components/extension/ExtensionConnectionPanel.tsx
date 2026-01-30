// ExtensionConnectionPanel.tsx
// Component for managing LinkedBot Chrome Extension connection

import { useLinkedBotExtension } from '@/hooks/useLinkedBotExtension';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle, XCircle, RefreshCw, Download, ExternalLink } from 'lucide-react';

export function ExtensionConnectionPanel() {
  const {
    isConnected,
    isInstalled,
    extensionId,
    isLoading,
    requiresRefresh,
    connectExtension,
    disconnectExtension,
    checkExtension,
  } = useLinkedBotExtension();

  const handleConnect = async () => {
    try {
      await connectExtension();
    } catch (error) {
      console.error('Connection failed:', error);
    }
  };

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">LinkedIn Extension</CardTitle>
          
          {isLoading && (
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          )}
          
          {!isLoading && isConnected && (
            <div className="flex items-center gap-1.5 text-success">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm font-medium">Connected</span>
            </div>
          )}
          
          {!isLoading && !isConnected && !requiresRefresh && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <XCircle className="w-4 h-4" />
              <span className="text-sm font-medium">Not Connected</span>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* REFRESH REQUIRED ALERT */}
        {requiresRefresh && (
          <Alert variant="destructive">
            <AlertDescription className="flex items-center justify-between">
              <span>Extension was reloaded. Page refresh required.</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.reload()}
                className="ml-4"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh Page
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* CONNECTION STATUS */}
        {!requiresRefresh && (
          <>
            <p className="text-sm text-muted-foreground">
              {isConnected
                ? 'Extension is connected and ready to publish posts to LinkedIn.'
                : 'Connect the Chrome extension to schedule and publish LinkedIn posts.'}
            </p>

            {extensionId && (
              <p className="text-xs text-muted-foreground font-mono bg-muted px-2 py-1 rounded">
                Extension ID: {extensionId.substring(0, 12)}...
              </p>
            )}

            {/* ACTION BUTTONS */}
            <div className="flex gap-2">
              {!isConnected ? (
                <Button onClick={handleConnect} disabled={isLoading}>
                  {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Connect Extension
                </Button>
              ) : (
                <>
                  <Button variant="outline" onClick={disconnectExtension}>
                    Disconnect
                  </Button>
                  <Button variant="ghost" onClick={checkExtension}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh Status
                  </Button>
                </>
              )}
            </div>
          </>
        )}

        {/* INSTALLATION HELP */}
        {!isInstalled && !isLoading && !requiresRefresh && (
          <Alert>
            <Download className="w-4 h-4" />
            <AlertDescription>
              <p className="font-medium mb-2">Extension not detected?</p>
              <ol className="list-decimal list-inside space-y-1 text-sm">
                <li>Install the LinkedBot Chrome extension</li>
                <li>Refresh this page</li>
                <li>Click "Connect Extension"</li>
              </ol>
              <Button variant="outline" size="sm" className="mt-3" asChild>
                <a
                  href="https://chrome.google.com/webstore"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Get Extension
                </a>
              </Button>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// EXAMPLE: Post Publishing Button
// ============================================================================

interface PostNowButtonProps {
  post: {
    id: string;
    content: string;
    photo_url?: string;
    scheduled_time?: string;
  };
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export function PostNowButton({ post, onSuccess, onError }: PostNowButtonProps) {
  const { isConnected, postNow, requiresRefresh, isLoading } = useLinkedBotExtension();

  const handlePost = async () => {
    const result = await postNow({
      id: post.id,
      content: post.content,
      photo_url: post.photo_url,
      scheduled_time: post.scheduled_time || new Date().toISOString(),
    });

    if (result.success) {
      onSuccess?.();
    } else {
      onError?.(result.error || 'Failed to post');
    }
  };

  if (requiresRefresh) {
    return (
      <Button variant="destructive" onClick={() => window.location.reload()}>
        <RefreshCw className="w-4 h-4 mr-2" />
        Refresh Page Required
      </Button>
    );
  }

  if (!isConnected) {
    return (
      <Button variant="secondary" disabled>
        Connect Extension First
      </Button>
    );
  }

  return (
    <Button onClick={handlePost} disabled={isLoading}>
      {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
      📤 Post to LinkedIn Now
    </Button>
  );
}

// ============================================================================
// EXAMPLE: Schedule Posts Button
// ============================================================================

interface SchedulePostsButtonProps {
  posts: Array<{
    id: string;
    content: string;
    photo_url?: string;
    scheduled_time: string;
  }>;
  userId?: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export function SchedulePostsButton({ posts, userId, onSuccess, onError }: SchedulePostsButtonProps) {
  const { isConnected, sendPendingPosts, requiresRefresh, isLoading } = useLinkedBotExtension();

  const handleSchedule = async () => {
    const result = await sendPendingPosts(posts, userId);

    if (result.success) {
      onSuccess?.();
    } else {
      onError?.(result.error || 'Failed to schedule posts');
    }
  };

  if (requiresRefresh) {
    return (
      <Button variant="outline" disabled>
        Refresh Required
      </Button>
    );
  }

  if (!isConnected) {
    return (
      <Button variant="outline" disabled>
        Extension Not Connected
      </Button>
    );
  }

  return (
    <Button variant="outline" onClick={handleSchedule} disabled={isLoading}>
      📅 Schedule {posts.length} Post{posts.length !== 1 ? 's' : ''}
    </Button>
  );
}

// ============================================================================
// EXAMPLE: Analytics Scraper Button
// ============================================================================

export function ScrapeAnalyticsButton() {
  const { isConnected, scrapeAnalytics, requiresRefresh, isLoading } = useLinkedBotExtension();

  if (requiresRefresh) {
    return (
      <Button variant="outline" disabled>
        Refresh Required
      </Button>
    );
  }

  if (!isConnected) {
    return (
      <Button variant="outline" disabled>
        Connect Extension
      </Button>
    );
  }

  return (
    <Button variant="outline" onClick={scrapeAnalytics} disabled={isLoading}>
      📊 Scrape LinkedIn Analytics
    </Button>
  );
}
