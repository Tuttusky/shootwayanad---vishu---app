import { NextResponse } from "next/server";

export const runtime = "nodejs";

const UPSTREAM_INVALID_MSG =
  "The registration service did not return valid data. In Google Apps Script: Deploy → manage deployments → copy the Web App URL ending in /exec, set GAS_WEB_APP_URL in Vercel to that URL, redeploy the site, and ensure the Web app uses Execute as: Me and Who has access: Anyone.";

export async function POST(request: Request) {
  try {
    const gasUrl = process.env.GAS_WEB_APP_URL;
    if (!gasUrl?.trim()) {
      return NextResponse.json(
        { ok: false, error: "GAS_WEB_APP_URL is not set on the server." },
        { status: 500 }
      );
    }

    let body: string;
    try {
      body = await request.text();
    } catch {
      return NextResponse.json(
        { ok: false, error: "Could not read request body." },
        { status: 400 }
      );
    }

    let upstream: Response;
    try {
      upstream = await fetch(gasUrl.trim(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });
    } catch {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Could not reach the registration service. Check your connection, confirm the Apps Script Web App URL is correct, and try again.",
        },
        { status: 502 }
      );
    }

    const text = await upstream.text();
    const trimmed = text.trim();

    if (!trimmed) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Registration service returned an empty response. Redeploy the Apps Script Web App and update GAS_WEB_APP_URL if the URL changed.",
        },
        { status: upstream.status >= 400 ? upstream.status : 502 }
      );
    }

    let data: unknown;
    try {
      data = JSON.parse(trimmed);
    } catch {
      return NextResponse.json(
        { ok: false, error: UPSTREAM_INVALID_MSG },
        { status: 502 }
      );
    }

    if (typeof data !== "object" || data === null || Array.isArray(data)) {
      return NextResponse.json(
        { ok: false, error: "Unexpected response from registration service." },
        { status: 502 }
      );
    }

    return NextResponse.json(data as Record<string, unknown>, {
      status: upstream.status,
    });
  } catch (err) {
    console.error("[api/register]", err);
    return NextResponse.json(
      {
        ok: false,
        error:
          "Registration service hit an unexpected error. Try again; if it persists, redeploy the site and confirm GAS_WEB_APP_URL.",
      },
      { status: 500 }
    );
  }
}
