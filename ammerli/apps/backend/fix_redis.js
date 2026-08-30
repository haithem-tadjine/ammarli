const Redis = require('ioredis');

async function main() {
  const redisUrl = process.env.REDIS_URL;

  const redis = new Redis(redisUrl || {
    host: 'localhost',
    port: 6379,
    password: 'redispass',
  }, {
    maxRetriesPerRequest: null,
    tls: redisUrl && redisUrl.startsWith('rediss://') ? { rejectUnauthorized: false } : undefined
  });

  const driverId = '76e75842-1483-45b5-ae42-a6dea32ff284';
  const key = `driver:metadata:${driverId}`;

  try {
    const exists = await redis.exists(key);
    if (exists) {
      await redis.hset(key, 'isSuspended', 'false');
      console.log('Driver unsuspend successfully synced to Redis');
    } else {
      console.log('Driver not currently active in Redis (no action needed).');
    }
  } catch (err) {
    console.error('Error updating redis:', err);
  } finally {
    redis.quit();
  }
}

main();