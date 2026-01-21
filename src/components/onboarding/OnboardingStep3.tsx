import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Check, Loader2, Wifi, WifiOff, RefreshCw, Download, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useLinkedBotExtension } from "@/hooks/useLinkedBotExtension";
import { useLinkedInAnalytics } from "@/hooks/useLinkedInAnalytics";
import { useToast } from "@/hooks/use-toast";

interface OnboardingStep3Props {
  onBack: () => void;
  onComplete: () => void;
  isSaving: boolean;
}

export const OnboardingStep3 = ({
  onBack,
  onComplete,
  isSaving,
}: OnboardingStep3Props) => {
  const { toast } = useToast();
  const {
    isInstalled,
    isConnected,
    isLoading: extensionLoading,
    connectExtension,
    checkExtension,
  } = useLinkedBotExtension();

  const { saveScannedPosts } = useLinkedInAnalytics();

  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanComplete, setScanComplete] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      await connectExtension();
      toast({
        title: "Extension connected!",
        description: "Your LinkedIn extension is now connected.",
      });
    } catch (err) {
      toast({
        title: "Connection failed",
        description: err instanceof Error ? err.message : "Failed to connect",
        variant: "destructive",
      });
    } finally {
      setConnecting(false);
    }
  };

  const handleScanPosts = async () => {
    const ext = window.LinkedBotExtension as any;
    if (!ext?.scanPosts) {
      toast({
        title: "Feature not available",
        description: "Extension doesn't support post scanning. Please update.",
        variant: "destructive",
      });
      return;
    }

    setScanning(true);
    setScanProgress(10);

    try {
      setScanProgress(30);
      const result = await ext.scanPosts(50);
      setScanProgress(60);

      if (result?.success && result?.data) {
        const posts = result.data.posts || [];
        const writingStyle = result.data.writingStyle || null;

        setScanProgress(80);
        await saveScannedPosts({ posts, writingStyle });
        setScanProgress(100);
        setScanComplete(true);

        toast({
          title: "Posts scanned successfully!",
          description: `Analyzed ${posts.length} posts to learn your writing style.`,
        });
      } else {
        throw new Error(result?.error || "Scan failed");
      }
    } catch (err) {
      console.error("Scan error:", err);
      toast({
        title: "Scan failed",
        description: err instanceof Error ? err.message : "Failed to scan posts",
        variant: "destructive",
      });
    } finally {
      setScanning(false);
    }
  };

  return (
    <motion.div
      key="step3"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
    >
      <h2 className="text-xl font-semibold mb-2">Connect LinkedIn Extension</h2>
      <p className="text-muted-foreground mb-6">
        Connect and scan your posts to help AI match your writing style (optional)
      </p>

      <div className="space-y-4">
        {/* Extension Status Card */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <span className="font-medium">Extension Status</span>
              <Badge variant={isConnected ? "default" : "secondary"} className="gap-1">
                {isConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                {isConnected ? "Connected" : "Not Connected"}
              </Badge>
            </div>

            {extensionLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                Checking extension...
              </div>
            ) : !isInstalled ? (
              <div className="space-y-3">
                <Alert>
                  <Download className="w-4 h-4" />
                  <AlertDescription>
                    Install the LinkedBot Chrome extension to enable auto-posting.
                  </AlertDescription>
                </Alert>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={checkExtension} className="gap-1">
                    <RefreshCw className="w-3 h-3" />
                    Refresh
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <a
                      href="https://chrome.google.com/webstore"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="gap-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Get Extension
                    </a>
                  </Button>
                </div>
              </div>
            ) : !isConnected ? (
              <Button onClick={handleConnect} disabled={connecting} size="sm" className="gap-1">
                {connecting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wifi className="w-3 h-3" />}
                Connect Extension
              </Button>
            ) : (
              <Alert className="border-success/50 bg-success/10">
                <Check className="w-4 h-4 text-success" />
                <AlertDescription className="text-success">
                  Extension is connected and ready!
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Post Scanning Card */}
        {isConnected && (
          <Card>
            <CardContent className="p-4">
              <h3 className="font-medium mb-2">Scan Your Posts</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Analyze your LinkedIn posts so AI can match your writing style.
              </p>

              {scanning && (
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    <span className="text-sm">Scanning posts...</span>
                  </div>
                  <Progress value={scanProgress} />
                </div>
              )}

              {scanComplete && (
                <Alert className="mb-4 border-success/50 bg-success/10">
                  <Check className="w-4 h-4 text-success" />
                  <AlertDescription className="text-success">
                    Posts scanned! AI will now match your writing style.
                  </AlertDescription>
                </Alert>
              )}

              <Button
                onClick={handleScanPosts}
                disabled={scanning}
                variant="outline"
                size="sm"
                className="gap-1"
              >
                {scanning ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <RefreshCw className="w-3 h-3" />
                )}
                {scanComplete ? "Re-scan Posts" : "Scan My Posts"}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="flex justify-between mt-8">
        <Button variant="ghost" onClick={onBack} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
        <Button
          variant="gradient"
          size="lg"
          onClick={onComplete}
          disabled={isSaving}
          className="gap-2"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Check className="w-4 h-4" />
              Complete Setup
            </>
          )}
        </Button>
      </div>
    </motion.div>
  );
};
