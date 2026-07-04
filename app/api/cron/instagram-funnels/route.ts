import { NextRequest, NextResponse } from "next/server";
import { processDelayedExecutions } from "@/lib/instagram-funnel";

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const processed = await processDelayedExecutions();
  return NextResponse.json({ ok: true, processed });
}
