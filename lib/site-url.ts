/**
 * Canonical public origin for metadata (Open Graph, Twitter, WhatsApp link previews).
 * WhatsApp uses Meta's crawler — it needs absolute https:// URLs; relative /public paths are not enough alone.
 *
 * Set NEXT_PUBLIC_SITE_URL in production to your real domain (no trailing slash), e.g.
 * https://www.yourdomain.com — especially if the site is served on a custom domain.
 */
export function getSiteOrigin(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit?.startsWith("http")) {
    return explicit.replace(/\/$/, "");
  }

  const production = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (production) {
    const host = production.replace(/^https?:\/\//, "").replace(/\/$/, "");
    if (host) return `https://${host}`;
  }

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    return `https://${vercel.replace(/\/$/, "")}`;
  }

  return "http://localhost:3000";
}
