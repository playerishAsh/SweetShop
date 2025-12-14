const fs = require('fs');
const path = require('path');

const from = path.resolve(__dirname, '..', 'dist', 'src', 'server.js');
const to = path.resolve(__dirname, '..', 'dist', 'server.js');

if (!fs.existsSync(from)) {
  console.error(`Postbuild copy failed: source not found: ${from}`);
  process.exit(1);
}

fs.copyFileSync(from, to);
console.log(`Copied ${from} -> ${to}`);
