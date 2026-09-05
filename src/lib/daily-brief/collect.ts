import { getDigest } from "./digest";
import { getNews } from "./news";
import { DEFAULT_SYMBOL, getStock } from "./stock";
import { DEFAULT_LOCATION, getWeather } from "./weather";
import type { DailyBrief, Digest } from "./types";

export interface CollectOptions {
  location?: typeof DEFAULT_LOCATION;
  symbol?: string;
  newsLimit?: number;
}

function reason(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Gather every source in parallel and hand the result to the AI digest.
 * A single failing source degrades that section instead of failing the whole brief.
 */
export async function collectBrief({
  location = DEFAULT_LOCATION,
  symbol = DEFAULT_SYMBOL,
  newsLimit = 8,
}: CollectOptions = {}): Promise<DailyBrief> {
  const errors: string[] = [];

  const [weatherResult, stockResult, newsResult] = await Promise.allSettled([
    getWeather(location),
    getStock(symbol),
    getNews(newsLimit),
  ]);

  const weather = weatherResult.status === "fulfilled" ? weatherResult.value : null;
  const stock = stockResult.status === "fulfilled" ? stockResult.value : null;
  const news = newsResult.status === "fulfilled" ? newsResult.value : [];

  if (weatherResult.status === "rejected") errors.push(`天氣：${reason(weatherResult.reason)}`);
  if (stockResult.status === "rejected") errors.push(`股價：${reason(stockResult.reason)}`);
  if (newsResult.status === "rejected") errors.push(`新聞：${reason(newsResult.reason)}`);

  let digest: Digest | null = null;
  try {
    digest = await getDigest(weather, stock, news);
  } catch (error) {
    errors.push(`AI 統整：${reason(error)}`);
  }

  return {
    generatedAt: new Date().toISOString(),
    date: new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Taipei" }).format(new Date()),
    weather,
    stock,
    news,
    digest,
    errors,
  };
}
