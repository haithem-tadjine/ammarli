import { Client } from 'pg';

async function run() {
  const client = new Client({
    host: 'localhost',
    port: 5433,
    user: 'postgres',
    password: 'postgres',
    database: 'nestjs_api',
  });
  await client.connect();
  
  try {
    const res = await client.query(`UPDATE requests SET status = 'CANCELLED' WHERE status IN ('DELIVERING', 'ARRIVED', 'SEARCHING', 'DISPATCHED', 'ACCEPTED')`);
    console.log('Updated rows:', res.rowCount);
  } catch (e) {
    console.error(e);
  }
  
  await client.end();
}

run();
