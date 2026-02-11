import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { verifyLinkedInAccount, getVerificationErrorMessage } from '@/utils/linkedinVerification';
import { toast } from 'sonner';
import { CheckCircle2, XCircle, Loader2, Shield, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface LinkedInVerificationProps {
  linkedinPublicId: string | null;
  linkedinVerified: boolean;
  linkedinProfileUrl: string | null;
  onVerificationComplete?: () => void;
}

export default function LinkedInVerification({
  linkedinPublicId,
  linkedinVerified,
  linkedinProfileUrl,
  onVerificationComplete,
}: LinkedInVerificationProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{
    title: string;
    message: string;
    action: string;
    details?: string;
  } | null>(null);

  const handleVerify = async () => {
    if (!linkedinPublicId) {
      toast.error('Please add your LinkedIn profile URL first in Settings.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await verifyLinkedInAccount(linkedinPublicId);

      if (result.success) {
        // Update database
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { error: updateError } = await supabase
            .from('user_profiles')
            .update({
              linkedin_verified: true,
              linkedin_verified_at: new Date().toISOString(),
            })
            .eq('user_id', user.id);

          if (updateError) {
            console.error('Failed to update verification status:', updateError);
            toast.error('Verification succeeded but failed to save. Please try again.');
            return;
          }
        }

        toast.success(`✅ LinkedIn account verified successfully!`);
        onVerificationComplete?.();
      } else {
        const errorInfo = getVerificationErrorMessage(result.error!, {
          expectedLinkedInId: result.expectedLinkedInId,
          currentLinkedInId: result.currentLinkedInId,
        });
        setError(errorInfo);
      }
    } catch (err) {
      setError({
        title: 'Extension Error',
        message: 'LinkedBot extension is not responding.',
        action: 'Make sure the extension is installed and enabled, then try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!linkedinPublicId && !linkedinProfileUrl) {
    return (
      <Card className="border-warning/50 bg-warning/5">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 text-warning">
            <Shield className="w-5 h-5" />
            <div>
              <p className="font-medium">No LinkedIn Profile</p>
              <p className="text-sm text-muted-foreground">
                Please add your LinkedIn profile URL in Settings to enable verification.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Shield className="w-5 h-5" />
          LinkedIn Verification
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Row */}
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
          <div>
            <p className="text-sm font-medium">Registered Account</p>
            <p className="text-xs text-muted-foreground">
              linkedin.com/in/{linkedinPublicId}
            </p>
          </div>
          {linkedinVerified ? (
            <div className="flex items-center gap-1.5 text-green-600 bg-green-50 dark:bg-green-950/30 px-3 py-1.5 rounded-full text-xs font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Verified
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-amber-600 bg-amber-50 dark:bg-amber-950/30 px-3 py-1.5 rounded-full text-xs font-medium">
              <XCircle className="w-3.5 h-3.5" />
              Not Verified
            </div>
          )}
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertTitle>{error.title}</AlertTitle>
            <AlertDescription className="space-y-1">
              <p>{error.message}</p>
              {error.details && (
                <p className="font-mono text-xs">{error.details}</p>
              )}
              <p className="text-sm">{error.action}</p>
            </AlertDescription>
          </Alert>
        )}

        {/* Verify Button */}
        <Button
          onClick={handleVerify}
          disabled={loading}
          className="w-full gap-2"
          variant={linkedinVerified ? 'outline' : 'default'}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Verifying...
            </>
          ) : linkedinVerified ? (
            '🔄 Re-verify Account'
          ) : (
            '🔐 Verify LinkedIn Account'
          )}
        </Button>

        {/* How it works */}
        <div className="rounded-lg bg-muted/30 p-3 space-y-2">
          <p className="text-xs font-medium text-muted-foreground">How it works:</p>
          <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
            <li>Open LinkedIn in this browser and log in</li>
            <li>Click "Verify LinkedIn Account" above</li>
            <li>Extension checks if you're logged into the correct account</li>
            <li>Once verified, you can post to LinkedIn</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}
