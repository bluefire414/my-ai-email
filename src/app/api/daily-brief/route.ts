import { NextResponse } from "next/server";

import { collectBrief } from "@/lib/daily-brief/collect";
import { DEFAULT_SYMBOL } from "@/lib/daily-brief/stock";
import { DEFAULT_LOCATION } from "@/lib/daily-brief/weather";

export const dynamic = "force-dynamic";

/**
 * GET /api/daily-brief
 *
 * Query params (all optional):
 *   lat, lon, location — weather coordinates, defaults to Taipei
 *   symbol             — TWSE stock code, defaults to 2330 (TSMC)
 *   news               — how many headlines to collect, defaults to 8
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;

  const lat = Number(params.get("lat"));
  const lon = Number(params.get("lon"));
  const location =
    params.has("lat") && params.has("lon") && Number.isFinite(lat) && Number.isFinite(lon)
      ? { name: params.get("location") ?? `${lat},${lon}`, latitude: lat, longitude: lon }
      : DEFAULT_LOCATION;

  const brief = await collectBrief({
    location,
    symbol: params.get("symbol") ?? DEFAULT_SYMBOL,
    newsLimit: Math.min(Math.max(Number(params.get("news")) || 8, 1), 20),
  });

  // Only fail outright when nothing at all could be gathered.
  const empty = !brief.weather && !brief.stock && !brief.news.length && !brief.digest;

  return NextResponse.json(brief, { status: empty ? 502 : 200 });
}
