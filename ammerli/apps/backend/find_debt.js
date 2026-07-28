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
      SELECT d.id, d.app_commission_debt, u.first_name, u.last_name, u.phone 
      FROM drivers d
      JOIN users u ON d."user_id" = u.id
      WHERE d.app_commission_debt > 0
      ORDER BY d.app_commission_debt DESC;
    `);

    console.log(JSON.stringify(res.rows, null, 2));

  } catch (err) {
    console.error('Error connecting to database:', err);
  } finally {
    await client.end();
  }
}

main();
