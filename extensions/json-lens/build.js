const fs = require('fs');
const path = require('path');

const SOURCE_DIR = __dirname;
const DIST_DIR = path.join(__dirname, 'dist');

const FILES_TO_COPY = [
  'manifest.json',
  'background.js',
  'content.js',
  'content.css',
  'formatter.js',
  'json-tree.js',
  'popup.html',
  'popup.js',
  'popup.css'
];

const DIRS_TO_COPY = [
  'icons'
];

function cleanDist() {
  if (fs.existsSync(DIST_DIR)) {
    fs.rmSync(DIST_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(DIST_DIR, { recursive: true });
}

function copyFiles() {
  for (const file of FILES_TO_COPY) {
    const src = path.join(SOURCE_DIR, file);
    const dest = path.join(DIST_DIR, file);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, dest);
      console.log(`Copied ${file}`);
    } else {
      console.warn(`Warning: ${file} not found`);
    }
  }
}

function copyDirectories() {
  for (const dir of DIRS_TO_COPY) {
    const src = path.join(SOURCE_DIR, dir);
    const dest = path.join(DIST_DIR, dir);
    if (fs.existsSync(src)) {
      copyDirRecursive(src, dest);
      console.log(`Copied directory ${dir}`);
    } else {
      console.warn(`Warning: directory ${dir} not found`);
    }
  }
}

function copyDirRecursive(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function validateManifest() {
  const manifestPath = path.join(DIST_DIR, 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  
  const required = ['manifest_version', 'name', 'version', 'description'];
  for (const field of required) {
    if (!manifest[field]) {
      throw new Error(`Missing required manifest field: ${field}`);
    }
  }
  
  if (manifest.manifest_version !== 3) {
    throw new Error('Must use Manifest V3');
  }
  
  console.log('Manifest validation passed');
  console.log(`  Name: ${manifest.name}`);
  console.log(`  Version: ${manifest.version}`);
  console.log(`  Description: ${manifest.description}`);
}

function createZip() {
  const manifestPath = path.join(DIST_DIR, 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const zipName = `json-lens-v${manifest.version}.zip`;
  const zipPath = path.join(__dirname, zipName);
  
  // Simple zip using Node's built-in (requires external zip tool)
  // For production, consider using archiver or similar
  console.log(`\nTo create zip package, run:`);
  console.log(`  cd dist && zip -r ../${zipName} .`);
  console.log(`\nOr use: npx zip-dir dist ${zipName}`);
}

function main() {
  console.log('Building JSON Lens extension...\n');
  
  cleanDist();
  copyFiles();
  copyDirectories();
  validateManifest();
  createZip();
  
  console.log('\nBuild complete! Output in ./dist/');
  console.log('Load the dist/ directory in Chrome developer mode to test.');
}

main();