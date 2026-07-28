const Redis = require('ioredis');

async function main() {
  // Using the redis credentials from .env
  const redis = new Redis({
    host: 'localhost',
    port: 6379,
    password: 'redispass',
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
