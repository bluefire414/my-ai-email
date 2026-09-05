import { fetchWithTimeout } from "./fetch";
import type { NewsItem } from "./types";

const FEEDS = [
  { source: "TechNews 科技新報", url: "https://technews.tw/feed/" },
  { source: "INSIDE", url: "https://www.inside.com.tw/feed/rss" },
];

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

function decode(text: string): string {
  return text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&(\w+);/g, (match, name) => ENTITIES[name] ?? match)
    .trim();
}

function tagValue(item: string, tag: string): string | null {
  const match = item.match(new RegExp(`<${tag}[^>]*>(.*?)</${tag}>`, "is"));
  return match ? decode(match[1]) : null;
}

function parseFeed(xml: string, source: string, limit: number): NewsItem[] {
  const items = xml.match(/<item[\s>][\s\S]*?<\/item>/gi) ?? [];

  return items.slice(0, limit).flatMap((item) => {
    const title = tagValue(item, "title");
    const link = tagValue(item, "link");
    if (!title || !link) return [];

    const pubDate = tagValue(item, "pubDate");
    const parsed = pubDate ? new Date(pubDate) : null;

    return [
      {
        title,
        link,
        source,
        publishedAt: parsed && !Number.isNaN(parsed.getTime()) ? parsed.toISOString() : null,
      },
    ];
  });
}

/** Latest tech headlines pulled straight from public RSS feeds. */
export async function getNews(limit = 8): Promise<NewsItem[]> {
  const perFeed = Math.ceil(limit / FEEDS.length);

  const results = await Promise.allSettled(
    FEEDS.map(async ({ source, url }) => {
      const res = await fetchWithTimeout(url, {}, 15_000);
      return parseFeed(await res.text(), source, perFeed);
    }),
  );

  const items = results.flatMap((result) =>
    result.status === "fulfilled" ? result.value : [],
  );

  if (!items.length) {
    const reasons = results
      .map((result, index) =>
        result.status === "rejected"
          ? `${FEEDS[index].source}: ${result.reason instanceof Error ? result.reason.message : result.reason}`
          : null,
      )
      .filter(Boolean);
    throw new Error(`所有 RSS 來源都抓取失敗（${reasons.join("；")}）`);
  }

  return items
    .sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""))
    .slice(0, limit);
}
