const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'dist');
const entries = [
  'audio',
  'img',
  'js',
  'screens',
  'styles',
  'index.html',
  'manifest.manifest'
];

function copyRecursive(source, target) {
  const stat = fs.statSync(source);
  if (stat.isDirectory()) {
    fs.mkdirSync(target, { recursive: true });
    for (const child of fs.readdirSync(source)) {
      copyRecursive(path.join(source, child), path.join(target, child));
    }
    return;
  }
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
}

if (!dist.startsWith(root)) {
  throw new Error(`Refusing to prepare unexpected dist path: ${dist}`);
}

fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });

for (const entry of entries) {
  copyRecursive(path.join(root, entry), path.join(dist, entry));
}

console.log(`Prepared ${dist}`);
