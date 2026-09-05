import type { DailyBrief } from "./types";

const RESEND_URL = "https://api.resend.com/emails";

/** salecomlab.com is verified in Resend, so mail is signed with our own domain. */
export const FROM = "今日簡報 <brief@salecomlab.com>";
export const TO = "bluefire414@gmail.com";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString("zh-TW", { timeZone: "Asia/Taipei", hour12: false });
}

function section(title: string, body: string): string {
  return `
    <tr>
      <td style="padding:0 0 20px 0;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
               style="border:1px solid #e5e7eb;border-radius:12px;background:#ffffff;">
          <tr>
            <td style="padding:18px 20px;">
              <div style="font-size:12px;font-weight:700;letter-spacing:.08em;color:#6b7280;text-transform:uppercase;padding-bottom:10px;">
                ${escapeHtml(title)}
              </div>
              ${body}
            </td>
          </tr>
        </table>
      </td>
    </tr>`;
}

function weatherSection(brief: DailyBrief): string {
  const { weather, digest } = brief;
  if (!weather) return section("天氣", `<div style="color:#9ca3af;font-size:14px;">今日無資料</div>`);

  const note = digest?.weatherNote
    ? `<div style="font-size:14px;color:#374151;padding-top:12px;">${escapeHtml(digest.weatherNote)}</div>`
    : "";

  return section(
    `天氣・${weather.location}`,
    `<div style="font-size:28px;font-weight:700;color:#111827;">${weather.currentTemp ?? "—"}°C
       <span style="font-size:15px;font-weight:400;color:#6b7280;padding-left:8px;">${escapeHtml(weather.description)}</span>
     </div>
     <div style="font-size:14px;color:#4b5563;padding-top:8px;">
       最高 ${weather.maxTemp ?? "—"}° ・ 最低 ${weather.minTemp ?? "—"}° ・ 降雨機率 ${weather.precipitationProbability ?? "—"}%
     </div>
     ${note}`,
  );
}

function stockSection(brief: DailyBrief): string {
  const { stock, digest } = brief;
  if (!stock) return section("股價", `<div style="color:#9ca3af;font-size:14px;">今日無資料</div>`);

  const rising = stock.change >= 0;
  const note = digest?.stockNote
    ? `<div style="font-size:14px;color:#374151;padding-top:12px;">${escapeHtml(digest.stockNote)}</div>`
    : "";

  return section(
    `${stock.name}（${stock.symbol}）・${stock.tradeDate}`,
    `<div style="font-size:28px;font-weight:700;color:#111827;">${stock.close}
       <span style="font-size:16px;font-weight:600;color:${rising ? "#dc2626" : "#16a34a"};padding-left:8px;">
         ${rising ? "▲" : "▼"} ${Math.abs(stock.change)}
       </span>
     </div>
     <div style="font-size:14px;color:#4b5563;padding-top:8px;">
       開盤 ${stock.open} ・ 最高 ${stock.high} ・ 最低 ${stock.low} ・ 成交量 ${stock.volume.toLocaleString("zh-TW")} 股
     </div>
     ${note}`,
  );
}

function highlightsSection(brief: DailyBrief): string {
  const highlights = brief.digest?.newsHighlights ?? [];
  if (!highlights.length) return "";

  const items = highlights
    .map(
      (item) => `
      <div style="border-left:3px solid #6366f1;padding:0 0 0 12px;margin:0 0 14px 0;">
        <div style="font-size:15px;font-weight:600;color:#111827;">${escapeHtml(item.title)}</div>
        <div style="font-size:13px;color:#6b7280;padding-top:4px;">${escapeHtml(item.takeaway)}</div>
      </div>`,
    )
    .join("");

  return section("AI 精選重點", items);
}

function newsSection(brief: DailyBrief): string {
  if (!brief.news.length)
    return section("科技新聞", `<div style="color:#9ca3af;font-size:14px;">今日無資料</div>`);

  const items = brief.news
    .map(
      (item) => `
      <div style="padding:10px 0;border-top:1px solid #f3f4f6;">
        <a href="${escapeHtml(item.link)}" style="font-size:15px;color:#1f2937;text-decoration:none;font-weight:500;">
          ${escapeHtml(item.title)}
        </a>
        <div style="font-size:12px;color:#9ca3af;padding-top:4px;">
          ${escapeHtml(item.source)}${item.publishedAt ? `・${formatTime(item.publishedAt)}` : ""}
        </div>
      </div>`,
    )
    .join("");

  return section("科技新聞", items);
}

function errorSection(brief: DailyBrief): string {
  if (!brief.errors.length) return "";

  const items = brief.errors
    .map((message) => `<li style="padding-bottom:4px;">${escapeHtml(message)}</li>`)
    .join("");

  return section(
    "抓取失敗的來源",
    `<ul style="margin:0;padding-left:18px;font-size:13px;color:#b45309;">${items}</ul>`,
  );
}

/** A table-based, inline-styled email that survives Gmail and Outlook. */
export function renderBriefEmail(brief: DailyBrief): { subject: string; html: string; text: string } {
  const { digest } = brief;
  const subject = `今日簡報 ${brief.date}｜${digest?.headline ?? "天氣・股價・科技新聞"}`;

  const hero = digest
    ? `<tr>
         <td style="padding:0 0 20px 0;">
           <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                  style="border-radius:12px;background:#4f46e5;">
             <tr>
               <td style="padding:24px 20px;">
                 <div style="font-size:20px;font-weight:700;color:#ffffff;">${escapeHtml(digest.headline)}</div>
                 <div style="font-size:14px;line-height:1.7;color:#e0e7ff;padding-top:10px;">
                   ${escapeHtml(digest.encouragement)}
                 </div>
               </td>
             </tr>
           </table>
         </td>
       </tr>`
    : "";

  const html = `<!doctype html>
<html lang="zh-Hant-TW">
  <body style="margin:0;padding:24px 12px;background:#f3f4f6;font-family:-apple-system,'Segoe UI','Noto Sans TC',Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
            <tr>
              <td style="padding:0 0 20px 0;">
                <div style="font-size:22px;font-weight:700;color:#111827;">今日簡報</div>
                <div style="font-size:13px;color:#6b7280;padding-top:4px;">
                  ${brief.date}・產生於 ${formatTime(brief.generatedAt)}
                </div>
              </td>
            </tr>
            ${hero}
            ${weatherSection(brief)}
            ${stockSection(brief)}
            ${highlightsSection(brief)}
            ${newsSection(brief)}
            ${errorSection(brief)}
            <tr>
              <td style="padding:4px 0 0 0;font-size:12px;color:#9ca3af;text-align:center;">
                資料來源：Open-Meteo・臺灣證券交易所・TechNews・INSIDE，由 AI 統整
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const lines = [
    `今日簡報 ${brief.date}（產生於 ${formatTime(brief.generatedAt)}）`,
    "",
    digest ? `${digest.headline}\n${digest.encouragement}\n` : "",
    brief.weather
      ? `【天氣・${brief.weather.location}】${brief.weather.currentTemp ?? "—"}°C ${brief.weather.description}，` +
        `最高 ${brief.weather.maxTemp ?? "—"}° / 最低 ${brief.weather.minTemp ?? "—"}°，` +
        `降雨機率 ${brief.weather.precipitationProbability ?? "—"}%` +
        (digest?.weatherNote ? `\n${digest.weatherNote}` : "")
      : "【天氣】今日無資料",
    "",
    brief.stock
      ? `【${brief.stock.name}（${brief.stock.symbol}）${brief.stock.tradeDate}】收盤 ${brief.stock.close}，` +
        `漲跌 ${brief.stock.change >= 0 ? "+" : ""}${brief.stock.change}` +
        (digest?.stockNote ? `\n${digest.stockNote}` : "")
      : "【股價】今日無資料",
    "",
    "【科技新聞】",
    ...(brief.news.length
      ? brief.news.map((item) => `- ${item.title}（${item.source}）\n  ${item.link}`)
      : ["今日無資料"]),
    ...(brief.errors.length ? ["", "【抓取失敗的來源】", ...brief.errors.map((e) => `- ${e}`)] : []),
  ];

  return { subject, html, text: lines.join("\n") };
}

/** Send today's brief through Resend. Returns the Resend message id and the subject used. */
export async function sendBriefEmail(brief: DailyBrief): Promise<{ id: string; subject: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("缺少環境變數 RESEND_API_KEY");
  }

  const { subject, html, text } = renderBriefEmail(brief);

  const res = await fetch(RESEND_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: FROM, to: [TO], subject, html, text }),
    signal: AbortSignal.timeout(30_000),
  });

  const json = await res.json();

  if (!res.ok) {
    throw new Error(`Resend 回應 ${res.status}：${json?.message ?? JSON.stringify(json)}`);
  }

  return { id: json.id as string, subject };
}
