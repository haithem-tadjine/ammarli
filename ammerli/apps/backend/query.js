const { Client } = require('pg');
const client = new Client({
  user: 'postgres',
  host: 'localhost',
  database: 'nestjs_api',
  password: 'postgres',
  port: 5433
});
client.connect().then(() => {
  return client.query(`
    ALTER TABLE drivers RENAME COLUMN "waterTypes" TO "waterType";
    ALTER TABLE drivers RENAME COLUMN "licensePlate" TO "truckPlate";
    ALTER TABLE drivers RENAME COLUMN "storageCapacity" TO "capacity";
  `);
}).then(res => {
  console.log('Columns renamed!');
  client.end();
}).catch(err => {
  console.error(err);
  client.end();
});
