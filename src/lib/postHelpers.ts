// ============================================================================
// POST CONTENT UTILITIES
// ============================================================================

/**
 * Clean post content by removing markdown and fixing spacing
 */
export function cleanPostContent(content: string): string {
  return content
    // Remove Gemini's code block wrappers
    .replace(/^```[\w]*\n/gm, '')
    .replace(/\n```$/gm, '')
    
    // Remove ALL markdown formatting
    .replace(/\*\*\*([^*]+)\*\*\*/g, '$1')  // Bold+italic ***text***
    .replace(/\*\*([^*]+)\*\*/g, '$1')       // Bold **text**
    .replace(/\*([^*]+)\*/g, '$1')           // Italic *text*
    .replace(/_([^_]+)_/g, '$1')             // Italic _text_
    .replace(/~~([^~]+)~~/g, '$1')           // Strikethrough ~~text~~
    .replace(/`([^`]+)`/g, '$1')             // Inline code `text`
    .replace(/^#{1,6}\s+/gm, '')             // Headers # ## ###
    
    // Remove bullet points and numbered lists
    .replace(/^\s*[-*+•]\s+/gm, '')          // Bullet points
    .replace(/^\s*\d+[\.)]\s+/gm, '')        // Numbered lists 1. 1)
    .replace(/^\s*[a-z][\.)]\s+/gm, '')      // Letter lists a. a)
    
    // Fix excessive spacing
    .replace(/\n{4,}/g, '\n\n\n')            // Max 2 blank lines
    .replace(/[ \t]{2,}/g, ' ')              // Multiple spaces → single
    .replace(/^\s+/gm, '')                   // Remove leading whitespace
    .replace(/\s+$/gm, '')                   // Remove trailing whitespace
    
    // Clean up around emojis
    .replace(/\n{2,}([\u{1F300}-\u{1F9FF}])/gu, '\n$1')
    .replace(/([\u{1F300}-\u{1F9FF}])\n{2,}/gu, '$1\n')
    
    // Fix excessive punctuation
    .replace(/\.{3,}/g, '...')               // Multiple dots → ellipsis
    .replace(/!{2,}/g, '!')                  // Multiple ! → single
    .replace(/\?{2,}/g, '?')                 // Multiple ? → single
    
    .trim();
}

/**
 * Humanize post content by replacing AI phrases with casual human ones
 */
export function humanizePost(content: string): string {
  let humanized = content;
  
  const replacements: [RegExp, string][] = [
    // Conclusions
    [/In conclusion,/gi, 'Bottom line:'],
    [/To conclude,/gi, 'Look,'],
    [/To summarize,/gi, "Here's the deal:"],
    [/In summary,/gi, "Here's what matters:"],
    
    // Sharing phrases
    [/Let me share/gi, "Here's"],
    [/I'd like to share/gi, "Gonna share"],
    [/I want to share/gi, "Here's"],
    
    // Formal transitions
    [/Furthermore,/gi, 'Plus,'],
    [/Moreover,/gi, 'Also,'],
    [/Additionally,/gi, 'And'],
    [/However,/gi, 'But'],
    [/Therefore,/gi, 'So'],
    
    // Force contractions
    [/\bI am\b/g, "I'm"],
    [/\bYou are\b/g, "You're"],
    [/\bWe are\b/g, "We're"],
    [/\bIt is\b/g, "It's"],
    [/\bdo not\b/gi, "don't"],
    [/\bcannot\b/gi, "can't"],
    [/\bwill not\b/gi, "won't"],
    
    // Buzzwords
    [/\bleverage\b/gi, 'use'],
    [/\butilize\b/gi, 'use'],
    [/\bsynergy\b/gi, 'teamwork'],
    [/\boptimize\b/gi, 'improve'],
    
    // Formal phrases
    [/In order to/gi, 'To'],
    [/I would like to/gi, "I want to"],
    [/For example,/gi, "Like,"],
    
    // AI starters
    [/^As a .+?, I/gm, 'I'],
  ];
  
  for (const [pattern, replacement] of replacements) {
    humanized = humanized.replace(pattern, replacement);
  }
  
  // Remove generic engagement endings
  humanized = humanized.replace(/\n\n(What do you think\?|Thoughts\?|What's your take\?)\s*$/gi, '');
  
  return humanized;
}

/**
 * Generate an image prompt based on actual post content
 */
export function generateImagePromptFromPost(postContent: string): string {
  // Extract the first meaningful line (skip empty lines)
  const lines = postContent.split('\n').filter(line => line.trim().length > 0);
  const firstLine = lines[0]?.trim() || 'Professional business content';
  
  // Clean topic: remove emojis and special characters
  const cleanTopic = firstLine
    .replace(/[\u{1F300}-\u{1F9FF}]/gu, '') // Remove emojis
    .replace(/[^\w\s.,!?-]/g, '')
    .trim()
    .substring(0, 150);
  
  // Extract key themes from the post
  const themes: string[] = [];
  const lowerContent = postContent.toLowerCase();
  
  if (lowerContent.includes('ai') || lowerContent.includes('artificial intelligence')) {
    themes.push('artificial intelligence, technology');
  }
  if (lowerContent.includes('car') || lowerContent.includes('automotive') || lowerContent.includes('vehicle')) {
    themes.push('automotive, vehicles');
  }
  if (lowerContent.includes('leader') || lowerContent.includes('leadership')) {
    themes.push('leadership, business');
  }
  if (lowerContent.includes('tech') || lowerContent.includes('software')) {
    themes.push('technology, innovation');
  }
  if (lowerContent.includes('health') || lowerContent.includes('medical')) {
    themes.push('healthcare, medical');
  }
  if (lowerContent.includes('future') || lowerContent.includes('innovation')) {
    themes.push('futuristic, innovation');
  }
  
  const themeString = themes.length > 0 ? themes.join(', ') : 'professional business';
  
  return `Professional LinkedIn social media post image.
Topic: ${cleanTopic}
Themes: ${themeString}
Style: Modern, business professional, clean design, high quality
Layout: Clean background with subtle visual elements
Colors: Professional blue tones (#0A66C2), white, subtle gradients
Format: Social media post optimized for LinkedIn
Requirements: No text overlay, visually represent the concept, minimalist icons or abstract shapes allowed, professional and corporate feel`;
}

// ============================================================================
// SCHEDULING UTILITIES
// ============================================================================

/**
 * Parse a natural language time string into a Date object
 */
export function parseScheduleTime(
  timeText: string, 
  referenceDate: Date = new Date()
): Date | null {
  const lower = timeText.toLowerCase().trim();
  const result = new Date(referenceDate);
  
  // Reset to start of day for calculations
  result.setSeconds(0, 0);
  
  // Handle relative day references
  if (lower.includes('tomorrow')) {
    result.setDate(result.getDate() + 1);
  } else if (lower.includes('next week')) {
    result.setDate(result.getDate() + 7);
  }
  
  // Handle day of week
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  for (let i = 0; i < days.length; i++) {
    if (lower.includes(`next ${days[i]}`)) {
      const currentDay = result.getDay();
      let daysUntil = i - currentDay;
      if (daysUntil <= 0) daysUntil += 7;
      result.setDate(result.getDate() + daysUntil);
      break;
    }
  }
  
  // Handle "in X hours/minutes"
  const inHoursMatch = lower.match(/in\s+(\d+)\s*hours?/i);
  if (inHoursMatch) {
    result.setHours(result.getHours() + parseInt(inHoursMatch[1]));
    return result;
  }
  
  const inMinutesMatch = lower.match(/in\s+(\d+)\s*minutes?/i);
  if (inMinutesMatch) {
    result.setMinutes(result.getMinutes() + parseInt(inMinutesMatch[1]));
    return result;
  }
  
  // Extract time (e.g., "3:42 pm", "15:30", "3pm")
  let hours = 9; // Default to 9am
  let minutes = 0;
  
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
  
  result.setHours(hours, minutes, 0, 0);
  
  // If the time is in the past for today, assume tomorrow
  if (result <= new Date() && !lower.includes('today')) {
    result.setDate(result.getDate() + 1);
  }
  
  return result;
}

/**
 * Check if a scheduled time has passed
 */
export function isPostDue(scheduledTime: string): boolean {
  const now = new Date();
  const scheduled = new Date(scheduledTime);
  
  console.log('Checking post schedule:', {
    now: now.toISOString(),
    scheduled: scheduled.toISOString(),
    nowLocal: now.toLocaleString(),
    scheduledLocal: scheduled.toLocaleString(),
    isDue: now >= scheduled
  });
  
  return now >= scheduled;
}

/**
 * Format a date for display
 */
export function formatScheduledTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const isToday = date.toDateString() === now.toDateString();
  const isTomorrow = date.toDateString() === tomorrow.toDateString();
  
  const timeStr = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  
  if (isToday) {
    return `Today at ${timeStr}`;
  } else if (isTomorrow) {
    return `Tomorrow at ${timeStr}`;
  } else {
    return date.toLocaleDateString([], { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  }
}
