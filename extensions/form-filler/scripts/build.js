const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.join(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const packageJson = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
const manifestJson = JSON.parse(fs.readFileSync(path.join(rootDir, 'manifest.json'), 'utf8'));

function cleanDist() {
  if (fs.existsSync(distDir)) {
    fs.rmSync(distDir, { recursive: true, force: true });
  }
  fs.mkdirSync(distDir, { recursive: true });
}

function copyFiles() {
  const filesToCopy = [
    'manifest.json',
    'background.js',
    'content.js',
    'content.css',
    'field-detector.js',
    'profiles.js',
    'popup.html',
    'popup.js',
    'popup.css',
    'icons'
  ];

  for (const file of filesToCopy) {
    const src = path.join(rootDir, file);
    const dest = path.join(distDir, file);

    if (fs.existsSync(src)) {
      if (fs.statSync(src).isDirectory()) {
        copyDir(src, dest);
      } else {
        fs.copyFileSync(src, dest);
      }
    } else {
      console.warn(`Warning: ${file} not found, skipping`);
    }
  }
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function createZip() {
  const zipName = `form-filler-v${packageJson.version}.zip`;
  const zipPath = path.join(rootDir, zipName);

  try {
    execSync(`cd "${distDir}" && zip -r "${zipPath}" .`, { stdio: 'inherit' });
    console.log(`✅ Created ${zipName}`);
  } catch (error) {
    console.error('Failed to create zip:', error.message);
    process.exit(1);
  }
}

console.log('📦 Building Form Filler extension...');
cleanDist();
copyFiles();
createZip();
console.log('✅ Build complete!');
console.log(`📁 Output: ${distDir}`);
console.log(`📦 Package: form-filler-v${packageJson.version}.zip`);