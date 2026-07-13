const Redis = require('ioredis');

const redis = new Redis({
  host: 'localhost',
  port: 6379,
  password: 'redispass'
});

async function run() {
  try {
    const geo = await redis.georadius('drivers_geo', 6.1748, 35.5557, 5, 'km', 'WITHDIST');
    console.log(`Found ${geo.length} drivers in 5km radius:`, geo);
  } catch (err) {
    console.error(err);
  } finally {
    redis.quit();
  }
}

run();
