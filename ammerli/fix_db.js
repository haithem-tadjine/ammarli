const { Client } = require('pg');

async function fix() {
  const client = new Client({
    user: 'ammerli',
    host: 'localhost',
    database: 'ammerli_postgres',
    password: 'ammerli',
    port: 25432,
  });

  try {
    await client.connect();
    console.log('Connected to DB');

    try {
      await client.query('ALTER TABLE wallet_transactions DROP CONSTRAINT "FK_ca1f5da18d92655666b87c9fcbb"');
      console.log('Dropped foreign key');
    } catch(e) {
      console.log('FK error:', e.message);
    }
    
    try {
      await client.query('ALTER TABLE wallet_transactions ALTER COLUMN "driverId" DROP NOT NULL');
      console.log('Dropped NOT NULL constraint on driverId');
    } catch(e) {
      console.log('NOT NULL error:', e.message);
    }

  } catch (err) {
    console.error('Connection Error:', err.message);
  } finally {
    await client.end();
  }
}

fix();
