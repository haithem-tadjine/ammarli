const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres:postgres@localhost:5433/nestjs_api' });
client.connect().then(() => client.query('SELECT * FROM requests WHERE status = \'DELIVERED\' ORDER BY created_at DESC LIMIT 1')).then(res => { console.log(JSON.stringify(res.rows, null, 2)); client.end() });
