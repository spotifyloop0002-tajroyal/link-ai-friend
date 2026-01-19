import React from 'react';
import { useLinkedBotExtension } from '@/hooks/useLinkedBotExtension';
import { Download, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';

export const ExtensionStatus: React.FC = () => {
  const {
    isInstalled,
    isConnected,
    extensionId,
    isLoading,
    connectExtension,
    disconnectExtension,
    checkExtension,
  } = useLinkedBotExtension();

  const handleConnect = async () => {
    try {
      await connectExtension();
      toast.success('Extension connected successfully!');
    } catch (error) {
      toast.error('Failed to connect extension. Please try again.');
    }
  };

  const handleDisconnect = async () => {
    if (confirm('Are you sure you want to disconnect the extension?')) {
      await disconnectExtension();
      toast.success('Extension disconnected');
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
                onClick={() => window.open('https://chrome.google.com/webstore/YOUR_EXTENSION_ID', '_blank')}
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
                Your Chrome extension is installed but not connected. Click below to activate automatic posting.
              </p>
              <Button onClick={handleConnect}>
                <CheckCircle className="w-4 h-4 mr-2" />
                Connect Extension
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
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
            <div className="flex gap-3">
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
  );
};
