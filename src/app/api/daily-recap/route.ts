import { NextRequest, NextResponse } from "next/server";
import { sendDailyRecaps } from "@/lib/dailyRecap";

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const result = await sendDailyRecaps();
  return NextResponse.json(result);
}
