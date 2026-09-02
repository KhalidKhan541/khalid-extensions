const fs = require('fs');
const path = require('path');

const manifestPath = path.join(__dirname, '..', 'manifest.json');

function validateManifest() {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const errors = [];
  const warnings = [];

  if (!manifest.manifest_version || manifest.manifest_version !== 3) {
    errors.push('manifest_version must be 3');
  }

  if (!manifest.name) {
    errors.push('name is required');
  }

  if (!manifest.version) {
    errors.push('version is required');
  } else if (!/^\d+\.\d+\.\d+/.test(manifest.version)) {
    warnings.push('version should follow semver (major.minor.patch)');
  }

  if (!manifest.description) {
    warnings.push('description is recommended');
  }

  if (!manifest.permissions || !Array.isArray(manifest.permissions)) {
    errors.push('permissions array is required');
  }

  if (!manifest.action || !manifest.action.default_popup) {
    errors.push('action.default_popup is required');
  }

  if (!manifest.background || !manifest.background.service_worker) {
    errors.push('background.service_worker is required');
  }

  if (!manifest.content_scripts || !Array.isArray(manifest.content_scripts)) {
    errors.push('content_scripts array is required');
  }

  if (!manifest.icons || !manifest.icons['16'] || !manifest.icons['48'] || !manifest.icons['128']) {
    warnings.push('icons for 16, 48, 128 are recommended');
  }

  const requiredPermissions = ['storage', 'activeTab', 'scripting'];
  for (const perm of requiredPermissions) {
    if (!manifest.permissions.includes(perm)) {
      warnings.push(`Recommended permission missing: ${perm}`);
    }
  }

  if (manifest.host_permissions) {
    for (const host of manifest.host_permissions) {
      if (host === '<all_urls>') {
        warnings.push('Using <all_urls> host permission - consider narrowing scope');
      }
    }
  }

  if (errors.length > 0) {
    console.error('Manifest validation errors:');
    errors.forEach(err => console.error(`  ❌ ${err}`));
  }

  if (warnings.length > 0) {
    console.warn('Manifest validation warnings:');
    warnings.forEach(warn => console.warn(`  ⚠️  ${warn}`));
  }

  if (errors.length === 0 && warnings.length === 0) {
    console.log('✅ Manifest validation passed');
  }

  return errors.length === 0;
}

const isValid = validateManifest();
process.exit(isValid ? 0 : 1);