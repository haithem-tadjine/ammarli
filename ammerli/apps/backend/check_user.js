const { DataSource } = require('typeorm');
const ds = new DataSource({
  type: 'postgres',
  url: 'postgresql://postgres:postgres@localhost:5433/nestjs_api',
  entities: []
});
ds.initialize().then(async () => {
  const user = await ds.query("SELECT role, first_name, phone FROM users WHERE id = 'dc143c7a-2b68-4edd-b7c9-f1eaa4a95161'");
  console.log(user);
  process.exit(0);
}).catch(console.error);
