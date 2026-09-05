import mongoose from "mongoose";

// Dev hot reload re-runs modules, so cache the connection on globalThis
// instead of opening a new one on every reload.
type MongooseCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

const globalForMongoose = globalThis as unknown as {
  mongooseCache?: MongooseCache;
};

const cached: MongooseCache = globalForMongoose.mongooseCache ?? {
  conn: null,
  promise: null,
};
globalForMongoose.mongooseCache = cached;

export async function connectToDatabase() {
  if (cached.conn) return cached.conn;

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("缺少環境變數 MONGODB_URI，請在 .env.local 設定");
  }

  if (!cached.promise) {
    // Only override the database when MONGODB_DB is set; otherwise trust the URI.
    cached.promise = mongoose
      .connect(uri, {
        ...(process.env.MONGODB_DB ? { dbName: process.env.MONGODB_DB } : {}),
        bufferCommands: false,
      })
      .catch((err) => {
        cached.promise = null;
        throw err;
      });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}
