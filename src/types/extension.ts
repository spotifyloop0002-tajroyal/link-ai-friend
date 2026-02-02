// Chrome Extension Event Types - v5.0 (Auto Analytics Scraping)

export type ExtensionEventType = 
  | 'postScheduled'
  | 'postStarting'
  | 'postFilling'
  | 'postPublished'
  | 'postSuccess'
  | 'postFailed'
  | 'postUrlFailed'
  | 'postRetrying'
  | 'queueUpdated'
  | 'analyticsUpdated'
  | 'alarmFired'
  | 'extensionConnected'
  | 'extensionDisconnected'
  | 'extensionReadyForScraping';

export interface ExtensionEventData {
  postId?: string;
  trackingId?: string;
  message?: string;
  error?: string;
  linkedinUrl?: string;
  scheduledTime?: string;
  queueLength?: number;
  retryIn?: string;
  analytics?: {
    views: number;
    likes: number;
    comments: number;
    shares: number;
  };
}

// v5.0 - Analytics scraping types
export interface AnalyticsScrapeResult {
  url: string;
  views: number;
  likes: number;
  comments: number;
  reposts: number;
  scrapedAt: string;
}

export interface SingleAnalyticsResult {
  success: boolean;
  postUrl: string;
  analytics?: AnalyticsScrapeResult;
  error?: string;
}

export interface BulkAnalyticsResult {
  success: boolean;
  results: Array<{
    success: boolean;
    url: string;
    analytics?: AnalyticsScrapeResult;
    error?: string;
  }>;
  total: number;
  successful: number;
  error?: string;
}

// v5.0 - New message types for analytics scraping
export interface ScrapeAnalyticsMessage {
  type: 'SCRAPE_ANALYTICS';
  postUrl: string;
}

export interface ScrapeBulkAnalyticsMessage {
  type: 'SCRAPE_BULK_ANALYTICS';
  postUrls: string[];
}

export interface AnalyticsResultMessage {
  type: 'ANALYTICS_RESULT';
  success: boolean;
  postUrl: string;
  analytics?: AnalyticsScrapeResult;
  error?: string;
}

export interface BulkAnalyticsResultMessage {
  type: 'BULK_ANALYTICS_RESULT';
  success: boolean;
  results: Array<{
    success: boolean;
    url: string;
    analytics?: AnalyticsScrapeResult;
    error?: string;
  }>;
  total: number;
  successful: number;
  error?: string;
}

export interface ExtensionReadyForScrapingMessage {
  type: 'EXTENSION_READY_FOR_SCRAPING';
}

export interface ExtensionEvent {
  event: ExtensionEventType;
  data: ExtensionEventData;
}

// v4.0 - Simplified post payload (NO user_id)
export interface PostSchedulePayload {
  id: string;
  content: string;
  imageUrl?: string | null;  // Renamed from photo_url
  scheduleTime?: string;     // Renamed from scheduledTime/scheduled_time
  trackingId?: string;       // For database sync
}

export interface ScheduleResult {
  success: boolean;
  message?: string;
  scheduledCount?: number;
  error?: string;
}

// Window message types for extension communication
export interface ExtensionConnectedMessage {
  type: 'EXTENSION_CONNECTED';
  version?: string;
  extensionId?: string;
}

export interface ExtensionDisconnectedMessage {
  type: 'EXTENSION_DISCONNECTED';
}

export interface ExtensionEventMessage {
  type: 'EXTENSION_EVENT';
  event: ExtensionEventType;
  data: ExtensionEventData;
}

// v4.0 - Simplified schedule message (NO user_id)
export interface SchedulePostsMessage {
  type: 'SCHEDULE_POSTS';
  posts: PostSchedulePayload[];
}

export interface ScheduleResultMessage {
  type: 'SCHEDULE_RESULT';
  success: boolean;
  message?: string;
  scheduledCount?: number;
  queueLength?: number;
  error?: string;
}

// v4.0 - Simplified post now message (NO user_id)
export interface PostNowMessage {
  type: 'POST_NOW';
  post: {
    id: string;
    content: string;
    imageUrl?: string | null;
  };
}

export interface PostResultMessage {
  type: 'POST_RESULT';
  success: boolean;
  postId?: string;
  error?: string;
}

export type ExtensionMessage = 
  | ExtensionConnectedMessage
  | ExtensionDisconnectedMessage
  | ExtensionEventMessage
  | SchedulePostsMessage
  | ScheduleResultMessage
  | PostNowMessage
  | PostResultMessage
  | ScrapeAnalyticsMessage
  | ScrapeBulkAnalyticsMessage
  | AnalyticsResultMessage
  | BulkAnalyticsResultMessage
  | ExtensionReadyForScrapingMessage;
