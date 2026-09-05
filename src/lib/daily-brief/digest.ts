import type { Digest, NewsItem, Stock, Weather } from "./types";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = "anthropic/claude-sonnet-5";

const SYSTEM_PROMPT = `你是一位溫暖、務實的個人助理，替使用者整理每日晨間簡報。
請用繁體中文（台灣用語）回答，語氣自然、精簡，不要說空話或客套話。
只輸出 JSON，不要加上 markdown 程式碼區塊或任何說明文字。

JSON 結構：
{
  "headline": "一句話總結今天的重點（20 字內）",
  "weatherNote": "根據天氣資料給出的穿著或行程建議（40 字內）",
  "stockNote": "解讀台積電前一交易日走勢（50 字內）",
  "newsHighlights": [{ "title": "新聞標題", "takeaway": "這則新聞為什麼值得注意（30 字內）" }],
  "encouragement": "給使用者的鼓勵，要具體、真誠，可以呼應今天的天氣或新聞（60 字內）"
}

newsHighlights 最多挑選 3 則最重要的新聞。若某項資料缺漏，就在對應欄位說明「今日無資料」，不要編造。`;

function buildUserPrompt(weather: Weather | null, stock: Stock | null, news: NewsItem[]): string {
  const weatherText = weather
    ? `地點：${weather.location}\n日期：${weather.date}\n天氣：${weather.description}\n` +
      `目前氣溫：${weather.currentTemp ?? "—"}°C，高溫 ${weather.maxTemp ?? "—"}°C / 低溫 ${weather.minTemp ?? "—"}°C\n` +
      `降雨機率：${weather.precipitationProbability ?? "—"}%`
    : "（今日天氣資料抓取失敗）";

  const stockText = stock
    ? `${stock.name}（${stock.symbol}）${stock.tradeDate}\n` +
      `收盤 ${stock.close} ${stock.currency}，漲跌 ${stock.change >= 0 ? "+" : ""}${stock.change}\n` +
      `開盤 ${stock.open}／最高 ${stock.high}／最低 ${stock.low}，成交量 ${stock.volume.toLocaleString("en-US")} 股`
    : "（股價資料抓取失敗）";

  const newsText = news.length
    ? news.map((item, index) => `${index + 1}. [${item.source}] ${item.title}`).join("\n")
    : "（新聞抓取失敗）";

  return `今日天氣\n${weatherText}\n\n台積電前一交易日股價\n${stockText}\n\n今日科技新聞\n${newsText}`;
}

/** Strip an accidental ```json fence before parsing. */
function parseJson(content: string): Digest {
  const cleaned = content.trim().replace(/^```(?:json)?\s*/i, "").replace(/```$/, "");
  const parsed = JSON.parse(cleaned) as Partial<Digest>;

  return {
    headline: parsed.headline ?? "",
    weatherNote: parsed.weatherNote ?? "",
    stockNote: parsed.stockNote ?? "",
    newsHighlights: Array.isArray(parsed.newsHighlights) ? parsed.newsHighlights : [],
    encouragement: parsed.encouragement ?? "",
  };
}

/** Let OpenRouter turn the raw data into a briefing plus a note of encouragement. */
export async function getDigest(
  weather: Weather | null,
  stock: Stock | null,
  news: NewsItem[],
): Promise<Digest> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("缺少環境變數 OPENROUTER_API_KEY");
  }

  const res = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENROUTER_MODEL ?? DEFAULT_MODEL,
      temperature: 0.7,
      max_tokens: 1200,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildUserPrompt(weather, stock, news) },
      ],
    }),
    signal: AbortSignal.timeout(60_000),
  });

  if (!res.ok) {
    throw new Error(`OpenRouter 回應 ${res.status}：${(await res.text()).slice(0, 200)}`);
  }

  const json = await res.json();
  const content: string | undefined = json.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("OpenRouter 未回傳內容");
  }

  return parseJson(content);
}
