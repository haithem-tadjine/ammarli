const { DataSource } = require('typeorm');
const argon2 = require('argon2');
const { v4: uuidv4 } = require('uuid');

const ds = new DataSource({
  type: 'postgres',
  url: 'postgresql://postgres:postgres@localhost:5433/nestjs_api',
  entities: []
});

async function main() {
  try {
    await ds.initialize();
    console.log("Database connected.");

    const phone = '0696739465';
    const rawPassword = '3491761835';
    const role = 'SUPER_ADMIN';

    // Check if user already exists
    const existing = await ds.query('SELECT id FROM users WHERE phone = $1', [phone]);
    if (existing.length > 0) {
      console.log(`User with phone ${phone} already exists.`);
      return;
    }

    // Hash password
    const hashedPassword = await argon2.hash(rawPassword);

    const id = uuidv4();
    const systemUserId = '00000000-0000-0000-0000-000000000000';

    await ds.query(`
      INSERT INTO users (
        id, phone, password, role, first_name, last_name, 
        bio, created_by, updated_by, walletBalance, debt
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `, [
      id, phone, hashedPassword, role, 'Admin', 'Ammarli', 
      'Admin created via script', systemUserId, systemUserId, 0, 0
    ]);

    console.log("Admin account created successfully!");
    console.log(`Phone: ${phone}`);
    console.log(`Password: ${rawPassword}`);
  } catch (err) {
    console.error("Error creating admin:", err);
  } finally {
    if (ds.isInitialized) {
      await ds.destroy();
    }
  }
}

main();
