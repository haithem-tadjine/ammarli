const Redis = require('ioredis');

const redis = new Redis({
  host: 'localhost',
  port: 6379,
  password: 'redispass'
});

async function run() {
  try {
    const keys = await redis.keys('driver:metadata:*');
    console.log(`Found ${keys.length} driver metadata keys`);
    for (const key of keys) {
      const data = await redis.hgetall(key);
      console.log(`${key}:`, data);
    }
  } catch (err) {
    console.error(err);
  } finally {
    redis.quit();
  }
}

run();
