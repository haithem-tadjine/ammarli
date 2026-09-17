const { Client } = require('pg');

const client = new Client({
  user: 'postgres',
  host: 'localhost',
  database: 'nestjs_api',
  password: 'postgres',
  port: 5433
});

client.connect().then(() => {
  return client.query('SELECT id, status, "userId", "driverId", "isReviewOrder" FROM requests ORDER BY "createdAt" DESC LIMIT 5');
}).then(res => {
  console.table(res.rows);
  return client.query('SELECT * FROM requests WHERE "isReviewOrder" = true');
}).then(res => {
  console.log("Review orders count:", res.rows.length);
  if (res.rows.length > 0) {
    console.table(res.rows.map(r => ({id: r.id, status: r.status, isReviewOrder: r.isReviewOrder})));
  }
  process.exit(0);
}).catch(e => {
  console.error(e);
  process.exit(1);
});
