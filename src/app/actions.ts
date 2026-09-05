"use server";

import { sendDailyBrief, type SendResult } from "@/lib/daily-brief/send";

/**
 * The API route is locked behind CRON_SECRET, which must never reach the browser,
 * so the homepage button goes through this server action instead.
 */
export async function sendBriefAction(): Promise<SendResult> {
  return sendDailyBrief();
}
