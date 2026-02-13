/**
 * Sanitizes analytics values from the extension.
 * The extension sometimes sends values multiplied by 1,000,000
 * (e.g., 5 views becomes 5000000). This detects and corrects that.
 */
export function sanitizeAnalyticsValue(value: unknown): number {
  if (value === null || value === undefined) return 0;

  let num: number;

  if (typeof value === 'string') {
    // Handle locale-formatted strings like "1,234" or "1.234"
    let str = String(value).trim();
    const lastComma = str.lastIndexOf(',');
    const lastDot = str.lastIndexOf('.');
    const isCommaDecimal = lastComma > lastDot;

    if (isCommaDecimal) {
      str = str.replace(/\./g, '').replace(',', '.');
    } else {
      str = str.replace(/,/g, '');
    }

    num = parseFloat(str);
    if (isNaN(num)) return 0;
  } else {
    num = Number(value);
    if (isNaN(num)) return 0;
  }

  // The extension always inflates values by x1,000,000
  // e.g., 5 becomes 5000000, 57 becomes 57000000
  // Always divide by 1,000,000 if value is >= 1,000,000
  if (num >= 1_000_000) {
    const corrected = Math.round(num / 1_000_000);
    console.warn(`⚠️ Analytics value ${num} inflated, correcting to ${corrected}`);
    return corrected;
  }

  return Math.round(num);
}

export function sanitizeAnalytics(analytics: {
  views?: unknown;
  likes?: unknown;
  comments?: unknown;
  reposts?: unknown;
  shares?: unknown;
}) {
  return {
    views: sanitizeAnalyticsValue(analytics.views),
    likes: sanitizeAnalyticsValue(analytics.likes),
    comments: sanitizeAnalyticsValue(analytics.comments),
    shares: sanitizeAnalyticsValue(analytics.reposts ?? analytics.shares),
  };
}
