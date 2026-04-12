const PORT = Number(process.env.PORT) || 3000;

export function getPublicBaseUrl() {
  return (process.env.PUBLIC_URL || `http://localhost:${PORT}`).replace(/\/$/, "");
}

/**
 * Re-point stored absolute URLs to the current PUBLIC_URL (HTTPS, new domain, VPS)
 * so <img> src works without re-uploading. Only paths containing /uploads/ are changed.
 */
export function rewriteUploadUrl(url) {
  if (url == null || typeof url !== "string") return url;
  const trimmed = url.trim();
  if (!trimmed) return url;
  const idx = trimmed.indexOf("/uploads/");
  if (idx === -1) return trimmed;
  return `${getPublicBaseUrl()}${trimmed.slice(idx)}`;
}
