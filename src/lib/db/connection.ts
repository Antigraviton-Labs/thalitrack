import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

// Demo mode flag - set to true when MongoDB is not configured or connection fails
let _isDemoMode = false;

// Getter function to check demo mode status
export function isDemoMode(): boolean {
  return _isDemoMode;
}

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var mongoose: MongooseCache | undefined;
}

const cached: MongooseCache = global.mongoose || { conn: null, promise: null };

if (!global.mongoose) {
  global.mongoose = cached;
}

export async function connectDB(): Promise<typeof mongoose | null> {
  // Check for explicit demo mode flag first
  if (process.env.DEMO_MODE === 'true' || process.env.NEXT_PUBLIC_DEMO_MODE === 'true') {
    console.warn('⚠️ DEMO_MODE enabled - running with mock data');
    _isDemoMode = true;
    return null;
  }

  // If no MongoDB URI configured, run in demo mode
  if (!MONGODB_URI) {
    console.warn('⚠️ MONGODB_URI not configured - running in DEMO mode with mock data');
    _isDemoMode = true;
    return null;
  }

  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      console.log('✅ MongoDB connected successfully');
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;
    _isDemoMode = false;
    return cached.conn;
  } catch (e) {
    cached.promise = null;
    console.warn('⚠️ MongoDB connection failed - running in DEMO mode with mock data');
    console.warn('Error:', e instanceof Error ? e.message : e);
    _isDemoMode = true;
    return null;
  }
}

export default connectDB;
