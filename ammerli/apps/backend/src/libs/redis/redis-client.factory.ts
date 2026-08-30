/**
 * Standalone Redis client factory.
 * This file MUST NOT import from modules-set.ts or redis.module.ts
 * to avoid circular dependency issues.
 */
import Redis from 'ioredis';

// Singleton instance — shared across all modules
let _redisClientInstance: Redis | null = null;

/**
 * Returns plain connection options parsed from REDIS_URL.
 * Pass this to BullMQ which requires RedisOptions (not an ioredis instance).
 */
export const getRedisConnectionOptions = () => {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) throw new Error('FATAL: REDIS_URL is not defined in process.env!');
  const parsed = new URL(redisUrl);
  return {
    host: parsed.hostname,
    port: parsed.port ? parseInt(parsed.port, 10) : 6379,
    password: parsed.password ? decodeURIComponent(parsed.password) : undefined,
    username: parsed.username ? decodeURIComponent(parsed.username) : undefined,
    maxRetriesPerRequest: null as null,
    enableReadyCheck: false,
    family: 4, // Force IPv4 — prevents spurious ECONNREFUSED from IPv6 fallback attempts
    tls: parsed.protocol === 'rediss:' ? { rejectUnauthorized: false } : undefined,
    retryStrategy: (times: number) => Math.min(times * 200, 5000),
  };
};

/**
 * Returns (or creates) the singleton ioredis client.
 * Use this for CacheModule, ThrottlerModule, and RedisLibModule.
 */
export const getRedisClient = (): Redis => {
  if (_redisClientInstance) return _redisClientInstance;

  const opts = getRedisConnectionOptions();
  const redisUrl = process.env.REDIS_URL!;
  const parsed = new URL(redisUrl);

  console.log('[Redis] Creating singleton client for:', parsed.hostname + ':' + (parsed.port || 6379));

  const client = new Redis(opts);

  client.on('connect', () => {
    console.log('[Redis] Connected successfully to:', parsed.hostname + ':' + (parsed.port || 6379));
  });

  client.on('error', (err) => {
    console.error('[Redis Singleton Error]', err.message, '| host:', parsed.hostname);
  });

  _redisClientInstance = client;
  return client;
};

// Alias for backward compatibility
export const createRedisClient = getRedisClient;
