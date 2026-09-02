const fs = require('fs');
const path = require('path');

const DIST_DIR = path.join(__dirname, 'dist');
const SOURCE_FILES = [
  'manifest.json',
  'background.js',
  'content.js',
  'storage.js',
  'highlight.js',
  'popup.html',
  'popup.js',
  'popup.css',
  'icons/icon16.png',
  'icons/icon48.png',
  'icons/icon128.png',
  'LICENSE'
];

function cleanDist() {
  if (fs.existsSync(DIST_DIR)) {
    fs.rmSync(DIST_DIR, { recursive: true });
  }
  fs.mkdirSync(DIST_DIR, { recursive: true });
  fs.mkdirSync(path.join(DIST_DIR, 'icons'), { recursive: true });
}

function copyFiles() {
  for (const file of SOURCE_FILES) {
    const src = path.join(__dirname, file);
    const dest = path.join(DIST_DIR, file);
    
    if (!fs.existsSync(src)) {
      console.warn(`Warning: Source file not found: ${file}`);
      continue;
    }
    
    const destDir = path.dirname(dest);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }
    
    fs.copyFileSync(src, dest);
    console.log(`Copied: ${file}`);
  }
}

function updateManifest() {
  const manifestPath = path.join(DIST_DIR, 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  
  // Remove development-only fields if any
  delete manifest.key;
  
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log('Updated manifest.json');
}

function validateBuild() {
  const manifestPath = path.join(DIST_DIR, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    throw new Error('Manifest not found in dist/');
  }
  
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  
  const required = ['manifest_version', 'name', 'version', 'permissions', 'action', 'background', 'content_scripts', 'icons'];
  for (const field of required) {
    if (!manifest[field]) {
      throw new Error(`Missing required manifest field: ${field}`);
    }
  }
  
  if (manifest.manifest_version !== 3) {
    throw new Error('Manifest version must be 3');
  }
  
  console.log('Build validation passed');
}

function main() {
  console.log('Building ClipVault extension...\n');
  
  try {
    cleanDist();
    copyFiles();
    updateManifest();
    validateBuild();
    
    console.log('\n✅ Build successful!');
    console.log(`Output: ${DIST_DIR}`);
  } catch (error) {
    console.error('\n❌ Build failed:', error.message);
    process.exit(1);
  }
}

main();