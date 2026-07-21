const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  host: process.env.DATABASE_HOST || 'localhost',
  port: process.env.DATABASE_PORT || 5432,
  user: process.env.DATABASE_USERNAME || 'postgres',
  password: process.env.DATABASE_PASSWORD || 'postgres',
  database: process.env.DATABASE_NAME || 'ammerli',
});

client.connect().then(() => {
  return client.query("SELECT u.id, u.phone, u.role, u.first_name, u.password, d.id as driver_id FROM users u LEFT JOIN drivers d ON d.user_id = u.id");
}).then(res => {
  console.log(JSON.stringify(res.rows, null, 2));
  return client.end();
}).catch(err => {
  console.error(err);
  process.exit(1);
});
