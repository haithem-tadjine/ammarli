const { Client } = require('pg');

async function seedWilayas() {
  const client = new Client({
    user: 'postgres',
    host: 'localhost',
    database: 'nestjs_api',
    password: 'postgres',
    port: 5433,
  });

  await client.connect();

  const wilayas = [
    { code: '16', name: 'الجزائر العاصمة (Alger)' },
    { code: '09', name: 'البليدة (Blida)' },
    { code: '31', name: 'وهران (Oran)' },
    { code: '25', name: 'قسنطينة (Constantine)' },
    { code: '23', name: 'عنابة (Annaba)' },
    { code: '35', name: 'بومرداس (Boumerdes)' },
    { code: '15', name: 'تيزي وزو (Tizi Ouzou)' },
    { code: '42', name: 'تيبازة (Tipaza)' }
  ];

  for (const w of wilayas) {
    const res = await client.query('SELECT id FROM wilayas WHERE code = $1', [w.code]);
    if (res.rows.length === 0) {
      await client.query(`
        INSERT INTO wilayas (code, name, is_active, is_debt_ceiling_enabled, created_by, updated_by)
        VALUES ($1, $2, true, true, 'system', 'system')
      `, [w.code, w.name]);
      console.log(`Inserted Wilaya: ${w.name}`);
    } else {
      console.log(`Wilaya ${w.name} already exists`);
    }
  }

  await client.end();
}

seedWilayas().catch(console.error);
