const { Client } = require('pg');

async function main() {
  const client = new Client({
    user: 'postgres',
    password: 'postgres',
    host: 'localhost',
    port: 5433,
    database: 'nestjs_api',
  });

  try {
    await client.connect();
    
    // Check drivers with debt > 0
    const res = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'wallet_transactions';
    `);

    console.log(JSON.stringify(res.rows, null, 2));

  } catch (err) {
    console.error('Error connecting to database:', err);
  } finally {
    await client.end();
  }
}

main();
