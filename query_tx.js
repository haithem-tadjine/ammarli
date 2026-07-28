const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres:postgres@localhost:5433/nestjs_api'
});

async function run() {
  await client.connect();
  const res = await client.query("SELECT * FROM wallet_transactions WHERE type = 'COMMISSION' ORDER BY created_at DESC LIMIT 10");
  console.log(JSON.stringify(res.rows, null, 2));
  await client.end();
}

run().catch(console.error);
