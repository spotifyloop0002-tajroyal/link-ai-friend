// ============================================================================
// POST LIFECYCLE STATE MACHINE
// ============================================================================
// Enforces strict state transitions for posts:
// draft → approved → queued_in_extension → posting → posted
//                                        ↘ failed

export type PostStatus = 
  | 'draft' 
  | 'approved' 
  | 'scheduled' 
  | 'queued_in_extension' 
  | 'posting' 
  | 'posted' 
  | 'published'  // Alias for posted (for backwards compatibility)
  | 'failed';

// Valid state transitions
const VALID_TRANSITIONS: Record<PostStatus, PostStatus[]> = {
  draft: ['approved', 'draft'], // Can stay draft or move to approved
  approved: ['scheduled', 'queued_in_extension', 'posting', 'approved'], // Can schedule or post immediately
  scheduled: ['queued_in_extension', 'failed', 'draft'], // Scheduled posts go to extension
  queued_in_extension: ['posting', 'failed'], // Extension picked it up
  posting: ['posted', 'published', 'failed'], // Currently posting
  posted: [], // Terminal state - no transitions allowed
  published: [], // Terminal state (alias for posted)
  failed: ['draft', 'approved'], // Can retry by going back to draft/approved
};

// Status display labels
export const STATUS_LABELS: Record<PostStatus, string> = {
  draft: 'Draft',
  approved: 'Approved',
  scheduled: 'Scheduled',
  queued_in_extension: 'Queued',
  posting: 'Posting...',
  posted: 'Posted ✓',
  published: 'Published ✓',
  failed: 'Failed ✗',
};

// Status colors for UI
export const STATUS_COLORS: Record<PostStatus, { bg: string; text: string; border: string }> = {
  draft: { bg: 'bg-muted', text: 'text-muted-foreground', border: 'border-border' },
  approved: { bg: 'bg-blue-500/20', text: 'text-blue-600', border: 'border-blue-500/30' },
  scheduled: { bg: 'bg-purple-500/20', text: 'text-purple-600', border: 'border-purple-500/30' },
  queued_in_extension: { bg: 'bg-yellow-500/20', text: 'text-yellow-600', border: 'border-yellow-500/30' },
  posting: { bg: 'bg-orange-500/20', text: 'text-orange-600', border: 'border-orange-500/30' },
  posted: { bg: 'bg-green-500/20', text: 'text-green-600', border: 'border-green-500/30' },
  published: { bg: 'bg-green-500/20', text: 'text-green-600', border: 'border-green-500/30' },
  failed: { bg: 'bg-red-500/20', text: 'text-red-600', border: 'border-red-500/30' },
};

/**
 * Check if a status transition is valid
 */
export function canTransitionTo(currentStatus: PostStatus, newStatus: PostStatus): boolean {
  const validNextStates = VALID_TRANSITIONS[currentStatus] || [];
  return validNextStates.includes(newStatus);
}

/**
 * Validate and perform a status transition
 * @throws Error if transition is invalid
 */
export function validateTransition(currentStatus: PostStatus, newStatus: PostStatus): void {
  if (!canTransitionTo(currentStatus, newStatus)) {
    throw new Error(
      `Invalid status transition: ${currentStatus} → ${newStatus}. ` +
      `Valid transitions from ${currentStatus}: ${VALID_TRANSITIONS[currentStatus].join(', ') || 'none'}`
    );
  }
}

/**
 * Check if a post can be edited (only in draft or approved states)
 */
export function canEditPost(status: PostStatus): boolean {
  return status === 'draft' || status === 'approved';
}

/**
 * Check if a post can be deleted
 */
export function canDeletePost(status: PostStatus): boolean {
  return status === 'draft' || status === 'approved' || status === 'failed';
}

/**
 * Check if "Post Now" button should be enabled
 */
export function canPostNow(status: PostStatus, approved: boolean): boolean {
  // Can only post if approved and in a postable state
  if (!approved) return false;
  return status === 'approved' || status === 'scheduled' || status === 'draft';
}

/**
 * Check if post should be archived (hidden from active list)
 */
export function shouldArchivePost(status: PostStatus): boolean {
  return status === 'posted' || status === 'published';
}

/**
 * Check if post is in a terminal state
 */
export function isTerminalState(status: PostStatus): boolean {
  return status === 'posted' || status === 'published' || status === 'failed';
}

/**
 * Check if post is currently being processed
 */
export function isProcessingState(status: PostStatus): boolean {
  return status === 'queued_in_extension' || status === 'posting';
}

// ============================================================================
// PREFLIGHT VALIDATION
// ============================================================================

export interface PreflightValidation {
  valid: boolean;
  errors: string[];
}

export interface PostForValidation {
  content?: string;
  imageUrl?: string;
  imageSkipped?: boolean;
  scheduledTime?: string | Date;
  approved?: boolean;
  status?: PostStatus;
}

/**
 * Strict preflight validation before sending to extension
 * ALL conditions must pass or scheduling is blocked
 */
export function validatePreflightForScheduling(post: PostForValidation): PreflightValidation {
  const errors: string[] = [];

  // 1. Content must exist
  if (!post.content || post.content.trim().length < 10) {
    errors.push('Post content is missing or too short (min 10 characters)');
  }

  // Check for AI hallucination patterns
  if (post.content && (
    post.content.includes('"action"') ||
    post.content.includes('dalle.text2im') ||
    post.content.trim().startsWith('{')
  )) {
    errors.push('Post content appears to be invalid (AI hallucination detected)');
  }

  // 2. Image must be attached OR explicitly skipped
  if (!post.imageUrl && !post.imageSkipped) {
    errors.push('Image is required. Attach an image or explicitly skip image generation.');
  }

  // 3. Scheduled time must be valid and in the future (IST)
  if (!post.scheduledTime) {
    errors.push('Scheduled time is missing');
  } else {
    const scheduledDate = typeof post.scheduledTime === 'string' 
      ? new Date(post.scheduledTime) 
      : post.scheduledTime;
    
    if (isNaN(scheduledDate.getTime())) {
      errors.push('Scheduled time is invalid');
    } else if (scheduledDate <= new Date()) {
      errors.push('Scheduled time must be in the future');
    }
  }

  // 4. Post must be approved
  if (!post.approved) {
    errors.push('Post must be approved before scheduling. Ask for user approval first.');
  }

  // 5. Status must allow scheduling
  const status = post.status || 'draft';
  if (status !== 'approved' && status !== 'scheduled' && status !== 'draft') {
    errors.push(`Cannot schedule post with status: ${status}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate for immediate "Post Now" action
 */
export function validatePreflightForPostNow(post: PostForValidation): PreflightValidation {
  const errors: string[] = [];

  // 1. Content must exist
  if (!post.content || post.content.trim().length < 10) {
    errors.push('Post content is missing or too short');
  }

  // 2. Post must be approved
  if (!post.approved) {
    errors.push('Post must be approved before posting');
  }

  // 3. Status must allow posting
  const status = post.status || 'draft';
  if (!canPostNow(status, post.approved || false)) {
    errors.push(`Cannot post with current status: ${status}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Check if content has already been posted (duplicate prevention)
 */
export function generateContentHash(content: string): string {
  // Simple hash for duplicate detection
  const normalized = content.toLowerCase().replace(/\s+/g, ' ').trim();
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(16);
}
