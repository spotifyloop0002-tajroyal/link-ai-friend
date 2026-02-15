import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { LinkedInProfileInput, validateLinkedInUrl } from './LinkedInProfileInput';
import { Link2, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { useUserProfile } from '@/hooks/useUserProfile';
import { toast } from 'sonner';

interface LinkedInConnectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  extensionId: string | null;
  onConnect: () => Promise<{ success: boolean; extensionId?: string; error?: string }>;
  onSuccess?: () => void;
}

export const LinkedInConnectionModal: React.FC<LinkedInConnectionModalProps> = ({
  open,
  onOpenChange,
  extensionId,
  onConnect,
  onSuccess,
}) => {
  const { profile, saveProfile } = useUserProfile();
  const [profileUrl, setProfileUrl] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [step, setStep] = useState<'input' | 'connecting' | 'success' | 'error'>('input');
  const [errorMessage, setErrorMessage] = useState('');

  // Pre-fill from existing profile
  useEffect(() => {
    if (profile?.linkedin_profile_url) {
      setProfileUrl(profile.linkedin_profile_url);
    }
  }, [profile?.linkedin_profile_url]);

  const handleConnect = async () => {
    // Validate URL
    const validation = validateLinkedInUrl(profileUrl);
    if (!validation.isValid) {
      setErrorMessage(validation.error || 'Invalid URL');
      return;
    }

    setIsConnecting(true);
    setStep('connecting');
    setErrorMessage('');

    try {
      // Step 1: Save profile URL to database (skip if already saved with same URL)
      const alreadySaved = profile?.linkedin_profile_url === profileUrl;
      if (!alreadySaved) {
        const saveSuccess = await saveProfile({
          linkedin_profile_url: profileUrl,
          linkedin_profile_url_locked: true,
        });

        if (!saveSuccess) {
          throw new Error('Failed to save profile URL to database');
        }
      }

      // Step 2: Connect extension
      const result = await onConnect();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to connect extension');
      }

      // Step 3: Send profile URL to extension via window API
      if (result.extensionId && typeof window.LinkedBotExtension !== 'undefined') {
        try {
          // Use the extension's API if available
          const extApi = window.LinkedBotExtension as any;
          if (typeof extApi.saveProfileUrl === 'function') {
            await extApi.saveProfileUrl(profileUrl);
            console.log('✅ Profile URL saved to extension');
          } else {
            console.warn('⚠️ Extension does not support saveProfileUrl method');
          }
        } catch (extError) {
          console.warn('Could not send URL to extension:', extError);
          // Don't fail - extension might not support this yet
        }
      }

      // Success!
      setStep('success');
      toast.success('Extension connected! Profile URL saved.', {
        description: 'Your LinkedIn profile is now linked.',
      });

      // Close modal after brief delay and trigger success callback
      setTimeout(() => {
        onOpenChange(false);
        onSuccess?.();
      }, 1500);

    } catch (error) {
      console.error('Connection error:', error);
      setStep('error');
      setErrorMessage(error instanceof Error ? error.message : 'Connection failed');
      toast.error('Connection failed', {
        description: error instanceof Error ? error.message : 'Please try again',
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleSkip = () => {
    // Connect without profile URL
    onConnect().then((result) => {
      if (result.success) {
        toast.info('Extension connected', {
          description: 'You can add your LinkedIn profile URL later in Settings.',
        });
        onOpenChange(false);
      }
    });
  };

  const resetAndClose = () => {
    setStep('input');
    setErrorMessage('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={resetAndClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="w-5 h-5 text-primary" />
            Connect Your LinkedIn Profile
          </DialogTitle>
          <DialogDescription>
            To scan your posts and match your writing style, we need your LinkedIn profile URL.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {step === 'input' && (
            <LinkedInProfileInput
              value={profileUrl}
              onChange={setProfileUrl}
              error={errorMessage}
            />
          )}

          {step === 'connecting' && (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <Loader2 className="w-12 h-12 animate-spin text-primary" />
              <div className="text-center">
                <p className="font-medium">Connecting extension...</p>
                <p className="text-sm text-muted-foreground">Saving your profile URL</p>
              </div>
            </div>
          )}

          {step === 'success' && (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              <div className="text-center">
                <p className="font-medium text-green-600">Successfully Connected!</p>
                <p className="text-sm text-muted-foreground">Extension is ready to use</p>
              </div>
            </div>
          )}

          {step === 'error' && (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertCircle className="w-10 h-10 text-destructive" />
              </div>
              <div className="text-center">
                <p className="font-medium text-destructive">Connection Failed</p>
                <p className="text-sm text-muted-foreground">{errorMessage}</p>
              </div>
              <Button variant="outline" onClick={() => setStep('input')}>
                Try Again
              </Button>
            </div>
          )}
        </div>

        {step === 'input' && (
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="ghost"
              onClick={handleSkip}
              className="text-muted-foreground"
            >
              Skip for now
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={resetAndClose}>
                Cancel
              </Button>
              <Button
                onClick={handleConnect}
                disabled={!profileUrl.trim() || isConnecting}
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  'Connect & Save'
                )}
              </Button>
            </div>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default LinkedInConnectionModal;
