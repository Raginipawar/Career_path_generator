// src/lib/redis.ts
import Redis from 'ioredis';

let redisClient: Redis | null = null;

export function getRedis(): Redis {
  if (!redisClient) {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) throw new Error('REDIS_URL is not set in environment variables');

    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      lazyConnect: false,
      retryStrategy: (times) => {
        if (times > 3) return null; // stop retrying after 3 attempts
        return Math.min(times * 200, 1000);
      },
    });

    redisClient.on('connect', () => console.log('✅ Redis connected'));
    redisClient.on('error', (err) => console.error('❌ Redis error:', err.message));
  }
  return redisClient;
}

const CACHE_TTL = parseInt(process.env.REDIS_TTL_SECONDS ?? '86400', 10);

export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const redis = getRedis();
    const data = await redis.get(key);
    return data ? (JSON.parse(data) as T) : null;
  } catch {
    return null; // fail silently — cache miss is safe
  }
}

export async function cacheSet(key: string, value: unknown, ttl = CACHE_TTL): Promise<void> {
  try {
    const redis = getRedis();
    await redis.setex(key, ttl, JSON.stringify(value));
  } catch {
    // fail silently — caching is optional
  }
}

export async function cacheDel(key: string): Promise<void> {
  try {
    const redis = getRedis();
    await redis.del(key);
  } catch {
    // ignore
  }
}

/** Generate a deterministic cache key from a profile object */
export function profileCacheKey(profileId: string): string {
  return `roadmap:profile:${profileId}`;
}
