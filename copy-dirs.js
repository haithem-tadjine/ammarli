const fs = require('fs');
const path = require('path');

const src = 'ammarli-v2';
const destCustomer = 'ammarli-customer';
const destDriver = 'ammarli-driver';
const excludes = ['node_modules', '.expo', '.git'];

function copyRecursiveSync(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();
  
  if (excludes.includes(path.basename(src))) return;

  if (isDirectory) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    fs.readdirSync(src).forEach(childItemName => {
      copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

console.log('Copying to customer...');
copyRecursiveSync(src, destCustomer);
console.log('Copying to driver...');
copyRecursiveSync(src, destDriver);
console.log('Done.');
