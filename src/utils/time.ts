/**
 * Time utilities
 */

/**
 * Format a date as a human-readable "time ago" string
 */
export function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffWeeks === 1) return '1 week ago';
  if (diffWeeks < 4) return `${diffWeeks} weeks ago`;
  if (diffMonths === 1) return '1 month ago';
  if (diffMonths < 12) return `${diffMonths} months ago`;

  return date.toLocaleDateString();
}

/**
 * Format a date as "time ago" with an action and file context
 */
export function formatTimeAgoWithContext(date: Date, action: string, file: string): string {
  const timeAgo = formatTimeAgo(date);
  const fileName = file.split(/[/\\]/).pop() || file;
  return `You ${action} in ${fileName} ${timeAgo === 'just now' ? 'just now' : timeAgo}`;
}
