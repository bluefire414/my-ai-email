import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const WeatherSchema = new Schema(
  {
    location: String,
    date: String,
    description: String,
    currentTemp: Number,
    maxTemp: Number,
    minTemp: Number,
    precipitationProbability: Number,
  },
  { _id: false },
);

const StockSchema = new Schema(
  {
    symbol: String,
    name: String,
    tradeDate: String,
    open: Number,
    high: Number,
    low: Number,
    close: Number,
    change: Number,
    volume: Number,
    currency: String,
  },
  { _id: false },
);

const NewsItemSchema = new Schema(
  {
    title: String,
    link: String,
    source: String,
    publishedAt: Date,
  },
  { _id: false },
);

const DigestSchema = new Schema(
  {
    headline: String,
    weatherNote: String,
    stockNote: String,
    newsHighlights: [{ _id: false, title: String, takeaway: String }],
    encouragement: String,
  },
  { _id: false },
);

const SentBriefSchema = new Schema(
  {
    // Taipei calendar date the brief covers, e.g. "2026-09-05"
    date: { type: String, required: true, index: true },
    generatedAt: { type: Date, required: true },
    sentAt: { type: Date, default: () => new Date() },
    from: { type: String, required: true },
    to: { type: String, required: true },
    subject: { type: String, required: true },
    // Resend message id, handy for chasing delivery status later
    resendId: { type: String, required: true, unique: true },
    weather: { type: WeatherSchema, default: null },
    stock: { type: StockSchema, default: null },
    news: { type: [NewsItemSchema], default: [] },
    digest: { type: DigestSchema, default: null },
    // Sources that failed while gathering this brief
    errors: { type: [String], default: [] },
  },
  { timestamps: true },
);

// The mailbox view is "what did we send, newest first".
SentBriefSchema.index({ sentAt: -1 });

export type SentBrief = InferSchemaType<typeof SentBriefSchema>;

// Dev hot reload re-registers models, so reuse the existing one.
export const SentBriefModel: Model<SentBrief> =
  (mongoose.models.SentBrief as Model<SentBrief>) ||
  mongoose.model<SentBrief>("SentBrief", SentBriefSchema);
