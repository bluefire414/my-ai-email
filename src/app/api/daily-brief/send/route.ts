import { timingSafeEqual } from "node:crypto";
import { NextResponse, after } from "next/server";

import { sendDailyBrief } from "@/lib/daily-brief/send";

export const dynamic = "force-dynamic";
// The background job needs ~10-15s; raise this if your platform's default is lower.
export const maxDuration = 60;

function matches(candidate: string, secret: string): boolean {
  const a = Buffer.from(candidate);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * cron-job.org can send either a custom header or a query string, so accept:
 *   Authorization: Bearer <CRON_SECRET>
 *   x-cron-secret: <CRON_SECRET>
 *   ?secret=<CRON_SECRET>
 */
function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const header = request.headers.get("x-cron-secret");
  const query = new URL(request.url).searchParams.get("secret");

  return [bearer, header, query].some((value) => value && matches(value, secret));
}

/**
 * POST /api/daily-brief/send
 *
 * Answers 202 straight away and does the work in the background, so cron-job.org
 * never waits on the ~10-15s the brief takes to build, send and archive.
 * Nobody reads the response, so the outcome goes to the server log.
 */
export async function POST(request: Request) {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json(
      { ok: false, error: "缺少環境變數 CRON_SECRET" },
      { status: 500 },
    );
  }

  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "未授權" }, { status: 401 });
  }

  const queuedAt = new Date().toISOString();

  after(async () => {
    try {
      const result = await sendDailyBrief();

      if (result.ok) {
        console.log(
          `[daily-brief] 已寄出 ${result.id} → ${result.to}` +
            (result.saved ? "，已存檔" : `，存檔失敗：${result.saveError}`) +
            (result.errors.length ? `，來源異常：${result.errors.join("；")}` : ""),
        );
      } else {
        console.error(`[daily-brief] 寄送失敗：${result.error}`);
      }
    } catch (error) {
      console.error("[daily-brief] 背景工作異常：", error);
    }
  });

  return NextResponse.json({ ok: true, queued: true, queuedAt }, { status: 202 });
}
