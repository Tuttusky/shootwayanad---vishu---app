/**
 * Parses `/api/register` response bodies. Never throws — if the body is not JSON
 * (HTML error page, edge crash, old proxy), returns { ok: false, error } so the UI
 * shows a clear message instead of a generic parse error.
 */
export function parseRegisterResponseBody(text: string): {
  ok?: boolean;
  error?: string;
} {
  const trimmed = text.trim();
  if (!trimmed) {
    return {
      ok: false,
      error:
        "Empty response from the server. Redeploy the site on Vercel, confirm GAS_WEB_APP_URL, and try again.",
    };
  }
  try {
    const data = JSON.parse(trimmed) as { ok?: boolean; error?: string };
    if (typeof data === "object" && data !== null && !Array.isArray(data)) {
      return data;
    }
    return {
      ok: false,
      error:
        "Unexpected server response. Deploy the latest code and check Apps Script Web App URL (ends in /exec).",
    };
  } catch {
    return {
      ok: false,
      error:
        "Could not read the registration response (often HTML instead of JSON). Update GAS_WEB_APP_URL in Vercel to your current Apps Script Web App /exec URL, set Who has access: Anyone, redeploy the site, then try again.",
    };
  }
}
