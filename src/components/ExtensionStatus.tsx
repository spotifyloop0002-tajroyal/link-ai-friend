import React, { useState } from 'react';
import { useLinkedBotExtension } from '@/hooks/useLinkedBotExtension';
import { Download, CheckCircle, XCircle, RefreshCw, Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { LinkedInConnectionModal } from '@/components/linkedin/LinkedInConnectionModal';

const DEFAULT_TEST_POST = `🧪 Testing LinkedBot Extension!

This is a test post to verify that the Chrome extension is working correctly.

If you see this on LinkedIn, your extension is properly configured! ✅

#LinkedBot #Test #Automation`;

export const ExtensionStatus: React.FC = () => {
  const {
    isInstalled,
    isConnected,
    extensionId,
    isLoading,
    connectExtension,
    disconnectExtension,
    checkExtension,
    postNow,
  } = useLinkedBotExtension();

  const [showTestDialog, setShowTestDialog] = useState(false);
  const [showConnectionModal, setShowConnectionModal] = useState(false);
  const [testContent, setTestContent] = useState(DEFAULT_TEST_POST);
  const [isTesting, setIsTesting] = useState(false);

  const handleConnect = () => {
    setShowConnectionModal(true);
  };

  const handleConnectionSuccess = () => {
    // Optionally trigger post scan or other actions
    checkExtension();
  };

  const handleDisconnect = async () => {
    if (confirm('Are you sure you want to disconnect the extension?')) {
      await disconnectExtension();
      toast.success('Extension disconnected');
    }
  };

  const handleTestPost = async () => {
    if (!testContent.trim()) {
      toast.error('Please enter some content for the test post');
      return;
    }

    setIsTesting(true);
    try {
      const testPost = {
        id: `test-${Date.now()}`,
        content: testContent,
        scheduled_time: new Date().toISOString(),
      };

      const result = await postNow(testPost);
      
      if (result.success) {
        toast.success('Test post published successfully! Check your LinkedIn.', {
          duration: 5000,
        });
        setShowTestDialog(false);
        setTestContent(DEFAULT_TEST_POST);
      } else {
        toast.error(result.error || 'Failed to publish test post');
      }
    } catch (error) {
      console.error('Test post error:', error);
      toast.error('Failed to publish test post. Make sure LinkedIn is open in another tab.');
    } finally {
      setIsTesting(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="w-5 h-5 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">Checking extension...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!isInstalled) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <Download className="w-8 h-8 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Install Chrome Extension
              </h3>
              <p className="text-muted-foreground mb-4">
                Install the Chrome extension to automatically post your scheduled content to LinkedIn.
              </p>
              <Button
                onClick={() => window.open(import.meta.env.VITE_EXTENSION_STORE_URL || 'https://chrome.google.com/webstore', '_blank')}
              >
                <Download className="w-4 h-4 mr-2" />
                Install Extension
              </Button>
              <p className="text-sm text-muted-foreground mt-3">
                After installing, refresh this page to connect.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!isConnected) {
    return (
      <>
        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <XCircle className="w-8 h-8 text-orange-500" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Connect Extension
                </h3>
                <p className="text-muted-foreground mb-4">
                  Your Chrome extension is installed but not connected. Click below to link your LinkedIn profile and activate automatic posting.
                </p>
                <Button onClick={handleConnect}>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Connect Extension
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <LinkedInConnectionModal
          open={showConnectionModal}
          onOpenChange={setShowConnectionModal}
          extensionId={extensionId}
          onConnect={connectExtension}
          onSuccess={handleConnectionSuccess}
        />
      </>
    );
  }

  return (
    <>
      <Card className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Extension Connected ✓
              </h3>
              <p className="text-muted-foreground mb-2">
                Your extension is active and will automatically post scheduled content to LinkedIn.
              </p>
              <div className="bg-card rounded-lg border border-green-200 dark:border-green-800 p-3 mb-4">
                <p className="text-sm text-muted-foreground mb-1">Extension ID</p>
                <p className="text-sm font-mono text-foreground break-all">
                  {extensionId}
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => setShowTestDialog(true)}
                  className="bg-primary hover:bg-primary/90"
                >
                  <Send className="w-3.5 h-3.5 mr-1.5" />
                  Test Extension
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={checkExtension}
                >
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                  Refresh Status
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDisconnect}
                  className="text-destructive border-destructive/50 hover:bg-destructive/10"
                >
                  Disconnect
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Test Post Dialog */}
      <Dialog open={showTestDialog} onOpenChange={setShowTestDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="w-5 h-5 text-primary" />
              Test Extension with Sample Post
            </DialogTitle>
            <DialogDescription>
              This will publish a test post to your LinkedIn immediately to verify the extension is working correctly.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Test Post Content
              </label>
              <Textarea
                value={testContent}
                onChange={(e) => setTestContent(e.target.value)}
                placeholder="Enter your test post content..."
                className="min-h-[150px] resize-none"
              />
              <p className="text-xs text-muted-foreground mt-2">
                ⚠️ This will be posted to your actual LinkedIn profile. You can delete it after testing.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowTestDialog(false)}
              disabled={isTesting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleTestPost}
              disabled={isTesting || !testContent.trim()}
            >
              {isTesting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Posting...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Post to LinkedIn
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
