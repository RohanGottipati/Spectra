import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
    if (!webhookUrl) {
      return NextResponse.json(
        { error: "DISCORD_WEBHOOK_URL is not configured" },
        { status: 500 }
      );
    }
    const payload = await request.json();
    const body =
      payload && (payload.content || payload.embeds)
        ? payload
        : { content: "Spectra anomaly detected." };

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json({ error: errorText }, { status: 502 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
