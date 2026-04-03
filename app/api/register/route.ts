import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
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

  const upstream = await fetch(gasUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });

  const text = await upstream.text();
  const contentType =
    upstream.headers.get("Content-Type") ?? "application/json; charset=utf-8";

  return new NextResponse(text, {
    status: upstream.status,
    headers: { "Content-Type": contentType },
  });
}
