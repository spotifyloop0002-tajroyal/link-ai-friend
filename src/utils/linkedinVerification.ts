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

    // Send verification request to extension
    window.postMessage({
      type: 'VERIFY_LINKEDIN_ACCOUNT',
      expectedLinkedInId,
    }, '*');

    // Timeout after 30 seconds
    setTimeout(() => {
      window.removeEventListener('message', messageHandler);
      reject(new Error('Verification timeout - Extension may not be installed'));
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
    'LINKEDIN_NOT_OPEN': {
      title: 'LinkedIn Not Open',
      message: 'LinkedIn is not open in this browser.',
      action: 'Please open linkedin.com in a new tab and try again.',
    },
    'NOT_LOGGED_IN': {
      title: 'Not Logged In',
      message: 'You are not logged into LinkedIn.',
      action: 'Please log in to LinkedIn and try again.',
    },
    'ACCOUNT_MISMATCH': {
      title: 'Wrong LinkedIn Account',
      message: "You're logged into the wrong LinkedIn account.",
      details: details ? `Expected: ${details.expectedLinkedInId}\nFound: ${details.currentLinkedInId}` : '',
      action: 'Please log into the correct LinkedIn account.',
    },
    'DETECTION_FAILED': {
      title: 'Detection Failed',
      message: 'Could not detect your LinkedIn account.',
      action: 'Please refresh and try again.',
    },
  };

  return messages[errorCode] || {
    title: 'Verification Error',
    message: 'An error occurred during verification.',
    action: 'Please try again.',
  };
}
