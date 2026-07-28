const { Client } = require('pg');
const argon2 = require('argon2');

async function seed() {
  const client = new Client({
    user: 'postgres',
    host: 'localhost',
    database: 'nestjs_api',
    password: 'postgres',
    port: 5433,
  });

  await client.connect();

  const mockUsers = [
    { phone: '+213555000000', role: 'SUPER_ADMIN', name: 'Super Admin' },
    { phone: '+213555111111', role: 'WILAYA_MANAGER', name: 'Wilaya Manager' },
    { phone: '+213555222222', role: 'COMMUNE_MANAGER', name: 'Commune Manager' },
    { phone: '+213555333333', role: 'AGENT', name: 'Agent (Cashier)' },
  ];

  const hash = await argon2.hash('password123');

  for (const u of mockUsers) {
    const res = await client.query('SELECT id FROM users WHERE phone = $1', [u.phone]);
    if (res.rows.length === 0) {
      await client.query(`
        INSERT INTO users (first_name, last_name, phone, password, role, bio, created_by, updated_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [u.name, 'Test', u.phone, hash, u.role, `I am a ${u.role}`, 'system', 'system']);
      console.log(`Inserted ${u.role}`);
    } else {
      console.log(`User ${u.role} already exists`);
    }
  }

  await client.end();
}

seed().catch(console.error);
