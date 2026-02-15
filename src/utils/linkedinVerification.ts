/**
 * LinkedIn Verification Utility Functions
 * Handles extracting IDs, validating URLs, and verifying accounts via extension
 */

/**
 * Extract LinkedIn public ID from profile URL
 * Example: "https://www.linkedin.com/in/john-doe/" => "john-doe"
 */
export function extractLinkedInId(url: string): string | null {
  if (!url) return null;
  const match = url.match(/\/in\/([^\/\?]+)/);
  return match ? match[1].replace(/\/$/, '') : null;
}

/**
 * Validate LinkedIn URL format
 */
export function isValidLinkedInUrl(url: string): boolean {
  if (!url) return false;
  const pattern = /^https?:\/\/(www\.)?linkedin\.com\/in\/[a-zA-Z0-9-]+\/?(\?.*)?$/;
  return pattern.test(url);
}

/**
 * Verify LinkedIn account via extension
 */
export function verifyLinkedInAccount(expectedLinkedInId: string): Promise<{
  success: boolean;
  linkedinId?: string;
  error?: string;
  message?: string;
  currentLinkedInId?: string;
  expectedLinkedInId?: string;
}> {
  return new Promise((resolve, reject) => {
    const messageHandler = (event: MessageEvent) => {
      if (event.source !== window) return;

      if (event.data.type === 'VERIFY_RESULT') {
        window.removeEventListener('message', messageHandler);
        clearTimeout(timeoutId);

        if (event.data.success) {
          resolve({
            success: true,
            linkedinId: event.data.linkedinId,
            message: event.data.message,
          });
        } else {
          resolve({
            success: false,
            error: event.data.error,
            message: event.data.message,
            currentLinkedInId: event.data.currentLinkedInId,
            expectedLinkedInId: event.data.expectedLinkedInId,
          });
        }
      }
    };

    window.addEventListener('message', messageHandler);

    // Send verification request to extension — extension will open LinkedIn if needed
    window.postMessage({
      type: 'VERIFY_LINKEDIN_ACCOUNT',
      expectedLinkedInId,
    }, '*');

    // Timeout after 30 seconds (extension may need to open LinkedIn tab)
    const timeoutId = setTimeout(() => {
      window.removeEventListener('message', messageHandler);
      reject(new Error('EXTENSION_TIMEOUT'));
    }, 30000);
  });
}

/**
 * Get user-friendly error message
 */
export function getVerificationErrorMessage(errorCode: string, details?: {
  expectedLinkedInId?: string;
  currentLinkedInId?: string;
}) {
  const messages: Record<string, { title: string; message: string; action: string; details?: string }> = {
    'EXTENSION_NOT_INSTALLED': {
      title: 'Extension Not Found',
      message: 'The LinkedBot Chrome extension is not installed or not connected.',
      action: 'Please install the extension from the Chrome Web Store, then go to LinkedIn Connection page to connect it.',
    },
    'EXTENSION_TIMEOUT': {
      title: 'Extension Not Responding',
      message: 'The extension did not respond. It may not be active or LinkedIn may not be open.',
      action: 'Make sure the extension is enabled, open linkedin.com in a tab, then try again.',
    },
    'LINKEDIN_NOT_OPEN': {
      title: 'LinkedIn Not Open',
      message: 'LinkedIn is not open in this browser.',
      action: 'Please open linkedin.com in a new tab and log in, then try again.',
    },
    'NOT_LOGGED_IN': {
      title: 'Not Logged In',
      message: 'You are not logged into LinkedIn.',
      action: 'Please log in to linkedin.com in this browser and try again.',
    },
    'ACCOUNT_MISMATCH': {
      title: 'Wrong LinkedIn Account',
      message: "You're logged into a different LinkedIn account than the one registered.",
      details: details ? `Expected: ${details.expectedLinkedInId}\nFound: ${details.currentLinkedInId}` : '',
      action: 'Please log into the correct LinkedIn account and try again.',
    },
    'DETECTION_FAILED': {
      title: 'Detection Failed',
      message: 'Could not detect your LinkedIn account.',
      action: 'Please refresh LinkedIn, make sure you are logged in, and try again.',
    },
  };

  return messages[errorCode] || {
    title: 'Verification Error',
    message: 'An unexpected error occurred during verification.',
    action: 'Please make sure the extension is installed, LinkedIn is open, and try again.',
  };
}
