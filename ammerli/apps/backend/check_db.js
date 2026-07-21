const { Client } = require('pg'); 
const client = new Client({ connectionString: 'postgresql://postgres:postgres@localhost:5433/nestjs_api' }); 
client.connect().then(() => client.query('SELECT d.id, d.user_id, d.type, d."waterType", u.first_name FROM drivers d JOIN users u ON u.id = d.user_id')).then(res => { console.log(res.rows); client.end() });
