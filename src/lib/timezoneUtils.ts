// ============================================================================
// IST (Indian Standard Time) TIMEZONE UTILITIES
// ============================================================================

const IST_TIMEZONE = 'Asia/Kolkata';
const IST_OFFSET_HOURS = 5.5; // UTC+5:30

/**
 * Get current time in IST
 */
export function getCurrentTimeIST(): Date {
  return new Date(new Date().toLocaleString('en-US', { timeZone: IST_TIMEZONE }));
}

/**
 * Convert a Date to IST timezone
 */
export function toIST(date: Date): Date {
  return new Date(date.toLocaleString('en-US', { timeZone: IST_TIMEZONE }));
}

/**
 * Format a date for display in IST
 */
export function formatDateIST(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('en-IN', { 
    timeZone: IST_TIMEZONE,
    dateStyle: 'medium',
    timeStyle: 'short'
  });
}

/**
 * Format just the time in IST
 */
export function formatTimeIST(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString('en-IN', { 
    timeZone: IST_TIMEZONE,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

/**
 * Format just the date in IST
 */
export function formatDateOnlyIST(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-IN', { 
    timeZone: IST_TIMEZONE,
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });
}

/**
 * Create an ISO string that represents a specific time in IST
 * This converts local IST time to UTC for storage
 */
export function createISOFromIST(
  year: number,
  month: number, // 0-indexed
  day: number,
  hours: number,
  minutes: number = 0
): string {
  // Create date in IST by calculating UTC offset
  const utcHours = hours - IST_OFFSET_HOURS;
  const date = new Date(Date.UTC(year, month, day, Math.floor(utcHours), minutes + (utcHours % 1) * 60));
  return date.toISOString();
}

/**
 * Parse a natural language time string into an ISO string (in IST context)
 * Returns the time as an ISO string that represents the correct moment
 */
export function parseScheduleTimeIST(
  timeText: string, 
  referenceDate?: Date
): string | null {
  const lower = timeText.toLowerCase().trim();
  
  // Get current time in IST for reference
  const nowIST = referenceDate 
    ? new Date(referenceDate.toLocaleString('en-US', { timeZone: IST_TIMEZONE }))
    : getCurrentTimeIST();
  
  // Create a working date in IST context
  let year = nowIST.getFullYear();
  let month = nowIST.getMonth();
  let day = nowIST.getDate();
  let hours = 9; // Default to 9 AM IST
  let minutes = 0;
  
  // Handle relative day references
  if (lower.includes('tomorrow')) {
    day += 1;
  } else if (lower.includes('next week')) {
    day += 7;
  }
  
  // Handle day of week
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  for (let i = 0; i < days.length; i++) {
    if (lower.includes(`next ${days[i]}`)) {
      const currentDay = nowIST.getDay();
      let daysUntil = i - currentDay;
      if (daysUntil <= 0) daysUntil += 7;
      day += daysUntil;
      break;
    }
  }
  
  // Handle "in X hours/minutes"
  const inHoursMatch = lower.match(/in\s+(\d+)\s*hours?/i);
  if (inHoursMatch) {
    const hoursToAdd = parseInt(inHoursMatch[1]);
    const result = new Date(nowIST);
    result.setHours(result.getHours() + hoursToAdd);
    return result.toISOString();
  }
  
  const inMinutesMatch = lower.match(/in\s+(\d+)\s*minutes?/i);
  if (inMinutesMatch) {
    const minsToAdd = parseInt(inMinutesMatch[1]);
    const result = new Date(nowIST);
    result.setMinutes(result.getMinutes() + minsToAdd);
    return result.toISOString();
  }
  
  // Extract time (e.g., "3:42 pm", "15:30", "3pm")
  // Match patterns like "3:42 pm", "3:42pm", "15:30"
  const timeMatch = lower.match(/(\d{1,2}):(\d{2})\s*(am|pm)?/i);
  if (timeMatch) {
    hours = parseInt(timeMatch[1]);
    minutes = parseInt(timeMatch[2]);
    const ampm = timeMatch[3]?.toLowerCase();
    
    if (ampm === 'pm' && hours < 12) hours += 12;
    if (ampm === 'am' && hours === 12) hours = 0;
  } else {
    // Match patterns like "3pm", "3 pm"
    const simpleTimeMatch = lower.match(/(\d{1,2})\s*(am|pm)/i);
    if (simpleTimeMatch) {
      hours = parseInt(simpleTimeMatch[1]);
      const ampm = simpleTimeMatch[2].toLowerCase();
      
      if (ampm === 'pm' && hours < 12) hours += 12;
      if (ampm === 'am' && hours === 12) hours = 0;
    }
  }
  
  // Handle relative times of day
  if (lower.includes('morning') && !timeMatch) {
    hours = 9;
    minutes = 0;
  } else if (lower.includes('afternoon') && !timeMatch) {
    hours = 14;
    minutes = 0;
  } else if (lower.includes('evening') && !timeMatch) {
    hours = 18;
    minutes = 0;
  } else if (lower.includes('tonight') && !timeMatch) {
    hours = 20;
    minutes = 0;
  }
  
  // Calculate the date, handling month overflow
  const tempDate = new Date(year, month, day);
  year = tempDate.getFullYear();
  month = tempDate.getMonth();
  day = tempDate.getDate();
  
  // Create the scheduled time
  // Convert IST time to UTC for storage
  const utcHours = hours - 5; // IST is UTC+5:30
  const utcMinutes = minutes - 30;
  
  let scheduledDate = new Date(Date.UTC(year, month, day, utcHours, utcMinutes));
  
  // Adjust if minutes went negative
  if (utcMinutes < 0) {
    scheduledDate = new Date(scheduledDate.getTime() - 30 * 60 * 1000);
  }
  
  // If the time is in the past for today (in IST), assume tomorrow
  const now = new Date();
  if (scheduledDate <= now && !lower.includes('today')) {
    scheduledDate.setDate(scheduledDate.getDate() + 1);
  }
  
  return scheduledDate.toISOString();
}

/**
 * Check if a scheduled time has passed (comparing in UTC)
 */
export function isPostDue(scheduledTime: string): boolean {
  const now = new Date();
  const scheduled = new Date(scheduledTime);
  
  console.log('[IST] Checking post schedule:', {
    now: now.toISOString(),
    nowIST: formatDateIST(now),
    scheduled: scheduled.toISOString(),
    scheduledIST: formatDateIST(scheduled),
    isDue: now >= scheduled
  });
  
  return now >= scheduled;
}

/**
 * Format a scheduled time for display (user-friendly)
 */
export function formatScheduledTimeIST(isoString: string): string {
  const date = new Date(isoString);
  const nowIST = getCurrentTimeIST();
  const tomorrow = new Date(nowIST);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  // Convert scheduled date to IST for comparison
  const scheduledIST = toIST(date);
  
  const isToday = scheduledIST.toDateString() === nowIST.toDateString();
  const isTomorrow = scheduledIST.toDateString() === tomorrow.toDateString();
  
  const timeStr = formatTimeIST(date);
  
  if (isToday) {
    return `Today at ${timeStr} IST`;
  } else if (isTomorrow) {
    return `Tomorrow at ${timeStr} IST`;
  } else {
    return `${formatDateOnlyIST(date)} at ${timeStr} IST`;
  }
}

/**
 * Get optimal posting times for LinkedIn in IST
 */
export function getOptimalPostingTimesIST(): { time: string; label: string }[] {
  return [
    { time: '08:00', label: '8:00 AM IST - Early morning engagement' },
    { time: '10:00', label: '10:00 AM IST - Mid-morning peak' },
    { time: '12:00', label: '12:00 PM IST - Lunch break browsing' },
    { time: '17:00', label: '5:00 PM IST - End of workday' },
    { time: '19:00', label: '7:00 PM IST - Evening engagement' },
  ];
}
