import { fetchWithTimeout } from "./fetch";
import type { Stock } from "./types";

export const DEFAULT_SYMBOL = "2330";

interface TwseStockDay {
  stat: string;
  title?: string;
  data?: string[][];
}

/** "2026-09-05" in the Taipei trading calendar, regardless of server timezone. */
function taipeiToday(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** TWSE dates come as ROC years: "115/09/04" -> "2026-09-04". */
function fromRocDate(roc: string): string {
  const [year, month, day] = roc.split("/");
  return `${Number(year) + 1911}-${month}-${day}`;
}

function toNumber(value: string): number {
  const parsed = Number(value.replace(/[,\s+]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

/** TWSE marks unchanged days with "X0.00" and drops the sign into a separate glyph. */
function parseChange(value: string): number {
  if (!value || value.includes("X")) return 0;
  return toNumber(value.replace("−", "-"));
}

async function fetchMonth(symbol: string, yyyymmdd: string): Promise<TwseStockDay> {
  const url =
    "https://www.twse.com.tw/exchangeReport/STOCK_DAY" +
    `?response=json&date=${yyyymmdd}&stockNo=${symbol}`;
  const res = await fetchWithTimeout(url, {}, 15_000);
  return res.json();
}

/**
 * Previous trading day's OHLC from the TWSE open endpoint (free, no API key).
 * Falls back to the prior month when today is at the start of a month.
 */
export async function getStock(symbol = DEFAULT_SYMBOL): Promise<Stock> {
  const today = taipeiToday();
  const [year, month] = today.split("-").map(Number);

  const months = [
    `${year}${String(month).padStart(2, "0")}01`,
    month === 1
      ? `${year - 1}1201`
      : `${year}${String(month - 1).padStart(2, "0")}01`,
  ];

  for (const monthStart of months) {
    const json = await fetchMonth(symbol, monthStart);
    if (json.stat !== "OK" || !json.data?.length) continue;

    // Rows are ascending by date; the last one before today is the previous trading day.
    const row = [...json.data]
      .reverse()
      .find((entry) => fromRocDate(entry[0]) < today);
    if (!row) continue;

    return {
      symbol,
      name: json.title?.trim().split(/\s+/)[2] ?? symbol,
      tradeDate: fromRocDate(row[0]),
      open: toNumber(row[3]),
      high: toNumber(row[4]),
      low: toNumber(row[5]),
      close: toNumber(row[6]),
      change: parseChange(row[7]),
      volume: toNumber(row[1]),
      currency: "TWD",
    };
  }

  throw new Error(`找不到 ${symbol} 的前一交易日資料`);
}
