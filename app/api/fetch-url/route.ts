import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  let url: string;
  try {
    const body = await req.json();
    url = body.url;
    if (!url || typeof url !== "string") throw new Error("Invalid URL");
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; SpeakUp/1.0)" },
    });
    clearTimeout(timeout);

    const html = await res.text();

    // Extract title
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim().slice(0, 120) : url;

    // Strip tags and extract clean text
    const text = html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 500);

    return NextResponse.json({ title, excerpt: text });
  } catch {
    return NextResponse.json({ title: url, excerpt: "" });
  }
}
