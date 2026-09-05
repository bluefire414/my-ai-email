export interface Weather {
  location: string;
  date: string;
  description: string;
  currentTemp: number | null;
  maxTemp: number | null;
  minTemp: number | null;
  precipitationProbability: number | null;
}

export interface Stock {
  symbol: string;
  name: string;
  tradeDate: string;
  open: number;
  high: number;
  low: number;
  close: number;
  change: number;
  volume: number;
  currency: string;
}

export interface NewsItem {
  title: string;
  link: string;
  source: string;
  publishedAt: string | null;
}

export interface Digest {
  headline: string;
  weatherNote: string;
  stockNote: string;
  newsHighlights: { title: string; takeaway: string }[];
  encouragement: string;
}

export interface DailyBrief {
  generatedAt: string;
  date: string;
  weather: Weather | null;
  stock: Stock | null;
  news: NewsItem[];
  digest: Digest | null;
  errors: string[];
}
