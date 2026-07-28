const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres:postgres@localhost:5433/nestjs_api'
});

async function run() {
  await client.connect();
  const res = await client.query('SELECT id, status, type, volume, "tankerDetails" FROM requests ORDER BY created_at DESC LIMIT 5');
  console.log(JSON.stringify(res.rows, null, 2));
  await client.end();
}

run().catch(console.error);
