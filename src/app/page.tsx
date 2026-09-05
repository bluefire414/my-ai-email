import { headers } from "next/headers";

import { RefreshButton } from "./refresh-button";
import { SendMailButton } from "./send-mail-button";
import type { SentBriefRecord } from "@/lib/daily-brief/types";

export const dynamic = "force-dynamic";

type History = { ok: true; records: SentBriefRecord[] } | { ok: false; error: string };

/** Call our own /api/daily-brief/history route — it needs an absolute URL on the server. */
async function getHistory(): Promise<History> {
  const headerList = await headers();
  const host = headerList.get("host") ?? "localhost:3000";
  const protocol = headerList.get("x-forwarded-proto") ?? "http";

  try {
    const res = await fetch(`${protocol}://${host}/api/daily-brief/history?limit=20`, {
      cache: "no-store",
    });
    return res.json();
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString("zh-TW", {
    timeZone: "Asia/Taipei",
    hour12: false,
  });
}

function Card({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-black/10 bg-black/[.02] p-5 dark:border-white/15 dark:bg-white/[.03]">
      <header className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-semibold tracking-wide text-black/60 dark:text-white/60">
          {title}
        </h2>
        {subtitle && (
          <span className="text-xs text-black/40 dark:text-white/40">{subtitle}</span>
        )}
      </header>
      {children}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-black/50 dark:text-white/50">{label}</div>
      <div className="text-lg font-medium tabular-nums">{value}</div>
    </div>
  );
}

/** The most recent mail, shown in full. */
function LatestBrief({ record }: { record: SentBriefRecord }) {
  const { weather, stock, news, digest, errors } = record;

  return (
    <div className="flex flex-col gap-5">
      {digest && (
        <section className="rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 p-6 text-white">
          <h2 className="text-xl font-bold sm:text-2xl">{digest.headline}</h2>
          <p className="mt-3 text-sm leading-relaxed text-white/90">{digest.encouragement}</p>
        </section>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <Card title="天氣" subtitle={weather ? `${weather.location}・${weather.date}` : undefined}>
          {weather ? (
            <>
              <div className="mb-4 flex items-baseline gap-3">
                <span className="text-3xl font-semibold tabular-nums">
                  {weather.currentTemp ?? "—"}°C
                </span>
                <span className="text-black/60 dark:text-white/60">{weather.description}</span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <Stat label="最高" value={`${weather.maxTemp ?? "—"}°`} />
                <Stat label="最低" value={`${weather.minTemp ?? "—"}°`} />
                <Stat
                  label="降雨機率"
                  value={`${weather.precipitationProbability ?? "—"}%`}
                />
              </div>
              {digest?.weatherNote && (
                <p className="mt-4 text-sm text-black/70 dark:text-white/70">
                  {digest.weatherNote}
                </p>
              )}
            </>
          ) : (
            <p className="text-sm text-black/50 dark:text-white/50">當時無資料</p>
          )}
        </Card>

        <Card title="股價" subtitle={stock ? `前一交易日 ${stock.tradeDate}` : undefined}>
          {stock ? (
            <>
              <div className="mb-4 flex items-baseline gap-3">
                <span className="text-3xl font-semibold tabular-nums">{stock.close}</span>
                <span
                  className={
                    stock.change >= 0
                      ? "font-medium text-red-600 dark:text-red-400"
                      : "font-medium text-green-600 dark:text-green-400"
                  }
                >
                  {stock.change >= 0 ? "▲" : "▼"} {Math.abs(stock.change)}
                </span>
              </div>
              <div className="mb-3 text-sm text-black/60 dark:text-white/60">
                {stock.name}（{stock.symbol}）・{stock.currency}
              </div>
              <div className="grid grid-cols-3 gap-3">
                <Stat label="開盤" value={String(stock.open)} />
                <Stat label="最高" value={String(stock.high)} />
                <Stat label="最低" value={String(stock.low)} />
              </div>
              <div className="mt-3 text-xs text-black/50 dark:text-white/50">
                成交量 {stock.volume.toLocaleString("zh-TW")} 股
              </div>
              {digest?.stockNote && (
                <p className="mt-4 text-sm text-black/70 dark:text-white/70">
                  {digest.stockNote}
                </p>
              )}
            </>
          ) : (
            <p className="text-sm text-black/50 dark:text-white/50">當時無資料</p>
          )}
        </Card>
      </div>

      {digest && digest.newsHighlights.length > 0 && (
        <Card title="AI 精選重點">
          <ul className="flex flex-col gap-3">
            {digest.newsHighlights.map((item, index) => (
              <li key={index} className="border-l-2 border-indigo-500 pl-3">
                <div className="font-medium">{item.title}</div>
                <div className="text-sm text-black/60 dark:text-white/60">{item.takeaway}</div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card title="科技新聞" subtitle={news.length ? `${news.length} 則` : undefined}>
        {news.length ? (
          <ul className="flex flex-col divide-y divide-black/10 dark:divide-white/10">
            {news.map((item) => (
              <li key={item.link} className="py-3 first:pt-0 last:pb-0">
                <a
                  href={item.link}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium hover:underline"
                >
                  {item.title}
                </a>
                <div className="mt-1 text-xs text-black/50 dark:text-white/50">
                  {item.source}
                  {item.publishedAt && `・${formatTime(item.publishedAt)}`}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-black/50 dark:text-white/50">當時無資料</p>
        )}
      </Card>

      {errors.length > 0 && (
        <Card title="這封信抓取失敗的來源">
          <ul className="flex list-disc flex-col gap-1 pl-5 text-sm text-amber-700 dark:text-amber-400">
            {errors.map((message, index) => (
              <li key={index}>{message}</li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

export default async function Home() {
  const history = await getHistory();
  const records = history.ok ? history.records : [];
  const [latest, ...older] = records;

  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-10 sm:py-14">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">寄件備份</h1>
          <p className="mt-1 text-sm text-black/50 dark:text-white/50">
            {latest
              ? `最近一次寄出：${formatTime(latest.sentAt)} → ${latest.to}`
              : "尚未寄出任何簡報"}
          </p>
        </div>
        <div className="flex items-start gap-2">
          <RefreshButton />
          <SendMailButton />
        </div>
      </header>

      {!history.ok && (
        <p className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-700 dark:text-red-300">
          讀取資料庫失敗：{history.error}
        </p>
      )}

      {history.ok && !latest && (
        <p className="rounded-2xl border border-dashed border-black/15 p-8 text-center text-sm text-black/50 dark:border-white/20 dark:text-white/50">
          資料庫裡還沒有寄送紀錄，按右上角「寄給我」寄出第一封簡報。
        </p>
      )}

      {latest && (
        <div className="flex flex-col gap-8">
          <div>
            <div className="mb-4 rounded-xl bg-black/[.03] px-4 py-3 text-sm dark:bg-white/[.05]">
              <div className="font-medium">{latest.subject}</div>
              <div className="mt-1 text-xs text-black/50 dark:text-white/50">
                {latest.from} → {latest.to}・Resend {latest.resendId}
              </div>
            </div>
            <LatestBrief record={latest} />
          </div>

          {older.length > 0 && (
            <Card title="更早的寄送紀錄" subtitle={`共 ${records.length} 筆`}>
              <ul className="flex flex-col divide-y divide-black/10 dark:divide-white/10">
                {older.map((record) => (
                  <li key={record.id} className="flex flex-wrap gap-x-3 gap-y-1 py-3 first:pt-0 last:pb-0">
                    <span className="text-sm tabular-nums text-black/50 dark:text-white/50">
                      {formatTime(record.sentAt)}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm">{record.subject}</span>
                    {record.errors.length > 0 && (
                      <span className="text-xs text-amber-600 dark:text-amber-400">
                        {record.errors.length} 項來源異常
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      )}
    </main>
  );
}
