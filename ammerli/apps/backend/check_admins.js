const { DataSource } = require('typeorm');
const ds = new DataSource({
  type: 'postgres',
  url: 'postgresql://postgres:postgres@localhost:5433/nestjs_api',
  entities: []
});
ds.initialize().then(async () => {
  const users = await ds.query("SELECT role, first_name, phone FROM users WHERE role IN ('SUPER_ADMIN', 'ADMIN', 'WILAYA_MANAGER')");
  console.log(users);
  process.exit(0);
}).catch(console.error);
