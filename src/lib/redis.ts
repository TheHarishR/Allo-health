// src/lib/redis.ts
import { Redis } from '@upstash/redis';

// Lazy init — only throws at call time if env vars are missing
let _redis: Redis | null = null;

function getRedis(): Redis {
  if (!_redis) {
    if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
      throw new Error(
        'Missing UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN. ' +
          'Add them to .env.local (see .env.example).'
      );
    }
    _redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
  }
  return _redis;
}

const LOCK_TTL_MS = 10_000; // 10 seconds max lock hold

export async function acquireLock(key: string): Promise<string | null> {
  const redis = getRedis();
  const lockKey = `lock:${key}`;
  const lockValue = `${Date.now()}-${Math.random()}`;
  const result = await redis.set(lockKey, lockValue, { nx: true, px: LOCK_TTL_MS });
  return result === 'OK' ? lockValue : null;
}

export async function releaseLock(key: string, lockValue: string): Promise<void> {
  const redis = getRedis();
  const lockKey = `lock:${key}`;
  const script = `
    if redis.call("get", KEYS[1]) == ARGV[1] then
      return redis.call("del", KEYS[1])
    else
      return 0
    end
  `;
  await redis.eval(script, [lockKey], [lockValue]);
}

const IDEMPOTENCY_TTL_S = 86_400; // 24 hours

export async function getIdempotencyResult(key: string): Promise<unknown | null> {
  const redis = getRedis();
  const stored = await redis.get(`idempotency:${key}`);
  return stored ?? null;
}

export async function setIdempotencyResult(key: string, result: unknown): Promise<void> {
  const redis = getRedis();
  await redis.set(`idempotency:${key}`, JSON.stringify(result), {
    ex: IDEMPOTENCY_TTL_S,
  });
}
