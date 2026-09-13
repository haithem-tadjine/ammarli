const Redis = require('ioredis');

const redisUrl = process.env.REDIS_URL;

let redis;

if (redisUrl) {
  // إذا كان الرابط موجودًا (في Railway)، نستخدمه مباشرة مع خيارات إضافية
  redis = new Redis(redisUrl, {
    maxRetriesPerRequest: null,
    tls: redisUrl.startsWith('rediss://') ? { rejectUnauthorized: false } : undefined
  });
} else {
  // كاحتياط للتطوير المحلي (Local)
  redis = new Redis({
    host: 'localhost',
    port: 6379,
    password: 'redispass',
    maxRetriesPerRequest: null
  });
}

async function run() {
  try {
    const geo = await redis.georadius('drivers_geo', 6.1748, 35.5557, 5, 'km', 'WITHDIST');
    console.log(`Found ${geo.length} drivers in 5km radius:`, geo);
  } catch (err) {
    console.error('Redis error:', err);
  } finally {
    redis.quit();
  }
}

run();