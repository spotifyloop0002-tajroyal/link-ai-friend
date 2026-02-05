 /**
  * LinkedIn URL Validation and Normalization Utilities
  * Handles multiple URL formats returned by the extension
  */
 
 export interface LinkedInUrlValidation {
   isValid: boolean;
   url: string | null;
   format: 'feed_update' | 'posts_with_username' | 'unknown' | 'invalid';
   activityId: string | null;
   error?: string;
 }
 
 /**
  * Validate and normalize LinkedIn post URL
  * Supports multiple formats:
  * - Format 1: /feed/update/urn:li:share:XXX or urn:li:activity:XXX
  * - Format 2: /posts/{username}_activity-XXX
  * - Format 3 (BROKEN): /posts/activity-XXX (no username) - REJECTED
  */
 export function validateLinkedInPostUrl(url: string | undefined | null): LinkedInUrlValidation {
   if (!url || typeof url !== 'string') {
     console.error('❌ Invalid URL: empty or not a string');
     return { isValid: false, url: null, format: 'invalid', activityId: null, error: 'URL is empty or invalid' };
   }
 
   // Clean the URL
   const cleanUrl = url.trim();
   
   if (!cleanUrl.includes('linkedin.com')) {
     console.error('❌ Invalid URL: not a LinkedIn URL:', cleanUrl);
     return { isValid: false, url: null, format: 'invalid', activityId: null, error: 'Not a LinkedIn URL' };
   }
 
   console.log('🔍 Validating LinkedIn URL:', cleanUrl);
 
   // Extract activity ID using regex
   const activityMatch = cleanUrl.match(/activity[-:](\d{19})/);
   const shareMatch = cleanUrl.match(/share[:-](\d{19})/);
   const activityId = activityMatch?.[1] || shareMatch?.[1] || null;
 
   // Format 1: /feed/update/urn:li:share:XXX or urn:li:activity:XXX
   if (cleanUrl.includes('/feed/update/urn:li:')) {
     console.log('✅ Valid feed update URL');
     return { isValid: true, url: cleanUrl, format: 'feed_update', activityId };
   }
 
   // Format 2: /posts/{username}_activity-XXX (has username before _activity)
   const postsWithUsernameMatch = cleanUrl.match(/\/posts\/([^\/]+)_activity-/);
   if (postsWithUsernameMatch && postsWithUsernameMatch[1]) {
     console.log('✅ Valid posts URL with username:', postsWithUsernameMatch[1]);
     return { isValid: true, url: cleanUrl, format: 'posts_with_username', activityId };
   }
 
   // Format 3 (BROKEN): /posts/activity-XXX (no username)
   if (cleanUrl.includes('/posts/activity-') || cleanUrl.match(/\/posts\/\d/)) {
     console.error('❌ Invalid posts URL (missing username):', cleanUrl);
     console.error('   This format does not work on LinkedIn!');
     return { 
       isValid: false, 
       url: null, 
       format: 'invalid', 
       activityId,
       error: 'Invalid posts URL format (missing username)' 
     };
   }
 
   // Check if it at least contains activity ID
   if (activityId) {
     console.warn('⚠️ Unknown URL format but contains valid activity ID:', cleanUrl);
     return { isValid: true, url: cleanUrl, format: 'unknown', activityId };
   }
 
   // Unknown format without activity ID
   console.warn('⚠️ Unknown URL format, no activity ID found:', cleanUrl);
   return { isValid: false, url: null, format: 'invalid', activityId: null, error: 'Unknown URL format' };
 }
 
 /**
  * Normalize URL for database matching
  * Strips query parameters and normalizes format
  */
 export function normalizeLinkedInUrl(url: string): string {
   try {
     const urlObj = new URL(url);
     // Remove common tracking parameters
     urlObj.searchParams.delete('utm_source');
     urlObj.searchParams.delete('utm_medium');
     urlObj.searchParams.delete('utm_campaign');
     urlObj.searchParams.delete('trackingId');
     return urlObj.toString();
   } catch {
     return url;
   }
 }
 
 /**
  * Check if two LinkedIn URLs point to the same post
  */
 export function isSameLinkedInPost(url1: string | null, url2: string | null): boolean {
   if (!url1 || !url2) return false;
   
   const validation1 = validateLinkedInPostUrl(url1);
   const validation2 = validateLinkedInPostUrl(url2);
   
   // Compare by activity ID if both have it
   if (validation1.activityId && validation2.activityId) {
     return validation1.activityId === validation2.activityId;
   }
   
   // Fall back to normalized URL comparison
   return normalizeLinkedInUrl(url1) === normalizeLinkedInUrl(url2);
 }