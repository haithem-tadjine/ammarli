const argon2 = require('argon2');

async function generate() {
  const hash = await argon2.hash('3491761835');
  console.log('HASH:', hash);
}

generate();
