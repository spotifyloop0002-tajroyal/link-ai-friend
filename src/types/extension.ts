// Chrome Extension Event Types

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
  | 'extensionDisconnected';

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

export interface ExtensionEvent {
  event: ExtensionEventType;
  data: ExtensionEventData;
}

export interface PostSchedulePayload {
  id: string;
  trackingId: string;
  content: string;
  scheduledTime: string;
  userId?: string;
  imageUrl?: string | null;
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
}

export interface ExtensionDisconnectedMessage {
  type: 'EXTENSION_DISCONNECTED';
}

export interface ExtensionEventMessage {
  type: 'EXTENSION_EVENT';
  event: ExtensionEventType;
  data: ExtensionEventData;
}

export interface SchedulePostsMessage {
  type: 'SCHEDULE_POSTS';
  posts: PostSchedulePayload[];
}

export interface ScheduleResultMessage {
  type: 'SCHEDULE_RESULT';
  success: boolean;
  message?: string;
  scheduledCount?: number;
  error?: string;
}

export type ExtensionMessage = 
  | ExtensionConnectedMessage
  | ExtensionDisconnectedMessage
  | ExtensionEventMessage
  | SchedulePostsMessage
  | ScheduleResultMessage;
