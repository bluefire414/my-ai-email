import { NextResponse } from "next/server";

import { connectToDatabase } from "@/lib/mongodb";
import { SentBriefModel } from "@/models/SentBrief";
import type { SentBriefRecord } from "@/lib/daily-brief/types";

export const dynamic = "force-dynamic";

function toIso(value: unknown): string | null {
  return value instanceof Date ? value.toISOString() : null;
}

/**
 * GET /api/daily-brief/history?limit=20
 *
 * The briefs we have already mailed out, newest first.
 */
export async function GET(request: Request) {
  const limitParam = Number(new URL(request.url).searchParams.get("limit"));
  const limit = Math.min(Math.max(limitParam || 20, 1), 100);

  try {
    await connectToDatabase();

    const docs = await SentBriefModel.find({}).sort({ sentAt: -1 }).limit(limit).lean();

    const records: SentBriefRecord[] = docs.map((doc) => ({
      id: String(doc._id),
      date: doc.date,
      generatedAt: toIso(doc.generatedAt) ?? "",
      sentAt: toIso(doc.sentAt) ?? "",
      from: doc.from,
      to: doc.to,
      subject: doc.subject,
      resendId: doc.resendId,
      // Every stored field is optional in the schema, so fill the gaps here.
      weather: doc.weather
        ? {
            location: doc.weather.location ?? "",
            date: doc.weather.date ?? "",
            description: doc.weather.description ?? "",
            currentTemp: doc.weather.currentTemp ?? null,
            maxTemp: doc.weather.maxTemp ?? null,
            minTemp: doc.weather.minTemp ?? null,
            precipitationProbability: doc.weather.precipitationProbability ?? null,
          }
        : null,
      stock: doc.stock
        ? {
            symbol: doc.stock.symbol ?? "",
            name: doc.stock.name ?? "",
            tradeDate: doc.stock.tradeDate ?? "",
            open: doc.stock.open ?? 0,
            high: doc.stock.high ?? 0,
            low: doc.stock.low ?? 0,
            close: doc.stock.close ?? 0,
            change: doc.stock.change ?? 0,
            volume: doc.stock.volume ?? 0,
            currency: doc.stock.currency ?? "TWD",
          }
        : null,
      news: (doc.news ?? []).map((item) => ({
        title: item.title ?? "",
        link: item.link ?? "",
        source: item.source ?? "",
        publishedAt: toIso(item.publishedAt),
      })),
      digest: doc.digest
        ? {
            headline: doc.digest.headline ?? "",
            weatherNote: doc.digest.weatherNote ?? "",
            stockNote: doc.digest.stockNote ?? "",
            newsHighlights: (doc.digest.newsHighlights ?? []).map((item) => ({
              title: item.title ?? "",
              takeaway: item.takeaway ?? "",
            })),
            encouragement: doc.digest.encouragement ?? "",
          }
        : null,
      errors: doc.errors ?? [],
    }));

    return NextResponse.json({ ok: true, count: records.length, records });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : String(error) },
      { status: 502 },
    );
  }
}
