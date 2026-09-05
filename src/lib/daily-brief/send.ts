import { connectToDatabase } from "@/lib/mongodb";
import { SentBriefModel } from "@/models/SentBrief";

import { collectBrief } from "./collect";
import { FROM, TO, sendBriefEmail } from "./email";
import type { DailyBrief } from "./types";

export type SendResult =
  | {
      ok: true;
      id: string;
      to: string;
      /** false when the mail went out but the MongoDB write failed */
      saved: boolean;
      saveError?: string;
      /** sources that failed while gathering the brief */
      errors: string[];
    }
  | { ok: false; error: string };

/** Keep a copy of everything that went out, so the archive matches the mail. */
async function archive(brief: DailyBrief, id: string, subject: string) {
  await connectToDatabase();

  await SentBriefModel.create({
    date: brief.date,
    generatedAt: new Date(brief.generatedAt),
    sentAt: new Date(),
    from: FROM,
    to: TO,
    subject,
    resendId: id,
    weather: brief.weather,
    stock: brief.stock,
    news: brief.news.map((item) => ({
      ...item,
      publishedAt: item.publishedAt ? new Date(item.publishedAt) : null,
    })),
    digest: brief.digest,
    errors: brief.errors,
  });
}

/**
 * Build today's brief, mail it through Resend, then archive it.
 * Shared by the cron endpoint and the "寄給我" button on the homepage.
 */
export async function sendDailyBrief(): Promise<SendResult> {
  const brief = await collectBrief();

  let id: string;
  let subject: string;
  try {
    ({ id, subject } = await sendBriefEmail(brief));
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }

  // The mail is already out, so a failed write is reported but not treated as a failure.
  try {
    await archive(brief, id, subject);
  } catch (error) {
    return {
      ok: true,
      id,
      to: TO,
      saved: false,
      saveError: error instanceof Error ? error.message : String(error),
      errors: brief.errors,
    };
  }

  return { ok: true, id, to: TO, saved: true, errors: brief.errors };
}
