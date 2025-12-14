const fs = require('fs');
const path = require('path');

const srcServer = path.resolve(__dirname, '..', 'dist', 'src', 'server.js');
const wrapper = path.resolve(__dirname, '..', 'dist', 'server.js');

if (!fs.existsSync(srcServer)) {
  console.error(`Postbuild failed: compiled server not found: ${srcServer}`);
  process.exit(1);
}

// Create a small wrapper that requires the emitted server inside dist/src
const content = `// Auto-generated wrapper to load compiled server
require('./src/server');
`;
fs.writeFileSync(wrapper, content, { encoding: 'utf8' });
console.log(`Wrote wrapper ${wrapper} -> requires ./src/server`);
