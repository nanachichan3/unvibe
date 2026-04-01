/**
 * HTML escape utility — prevents XSS in file names and user content
 */
export function escapeHtml(str: string): string {
  const htmlEscapes: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return str.replace(/[&<>"']/g, (chr) => htmlEscapes[chr]);
}

/**
 * Truncate string with ellipsis
 */
export function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 1) + '…';
}

/**
 * Sanitize and validate extracted zip path — prevents zip slip attacks
 * Returns null if path is malicious (escapes directory bounds)
 */
export function sanitizeZipPath(path: string, basePath: string = ''): string | null {
  // Normalize path separators
  const normalized = path.replace(/\\/g, '/');

  // Block absolute paths and parent directory traversal
  if (normalized.startsWith('/') ||
      normalized.includes('..') ||
      normalized.startsWith('$') ||
      normalized.includes('\0')) {
    return null;
  }

  // Ensure path doesn't escape the intended extraction base
  if (basePath) {
    const resolved = `/${normalized}`;
    const base = `/${basePath}`;
    if (!resolved.startsWith(base + '/') && resolved !== base) {
      return null;
    }
  }

  return normalized;
}

/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
