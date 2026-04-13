/** URL path looks like a common browser-playable video (query/hash ignored). */
const VIDEO_PATH = /\.(mp4|webm|mov|m4v|ogv)(\?|#|$)/i;

export function isListingVideoUrl(url: string): boolean {
  const s = url.trim();
  if (!s) return false;
  try {
    const u = new URL(s);
    return VIDEO_PATH.test(u.pathname);
  } catch {
    return VIDEO_PATH.test(s);
  }
}
