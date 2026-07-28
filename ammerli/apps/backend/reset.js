const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres:postgres@localhost:5433/nestjs_api' });
client.connect()
  .then(() => client.query(`UPDATE users SET "walletBalance" = 0, debt = 500 WHERE role = 'DRIVER'`))
  .then(() => { console.log('Done reset!'); process.exit(0); })
  .catch(e => { console.error(e); process.exit(1); });
