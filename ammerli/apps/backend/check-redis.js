const Redis = require('ioredis');

const redisUrl = process.env.REDIS_URL;
let redis;

if (redisUrl) {
  redis = new Redis(redisUrl, {
    maxRetriesPerRequest: null,
    tls: redisUrl.startsWith('rediss://') ? { rejectUnauthorized: false } : undefined
  });
} else {
  redis = new Redis({
    host: 'localhost',
    port: 6379,
    password: 'redispass',
    maxRetriesPerRequest: null
  });
}

async function run() {
  try {
    const keys = await redis.keys('driver:metadata:*');
    console.log(`Found ${keys.length} driver metadata keys`);
    for (const key of keys) {
      const data = await redis.hgetall(key);
      console.log(`${key}:`, data);
    }
  } catch (err) {
    console.error('Redis error:', err);
  } finally {
    redis.quit();
  }
}

run();