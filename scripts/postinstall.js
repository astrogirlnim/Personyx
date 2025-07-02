#!/usr/bin/env node

/**
 * Cross-platform postinstall script
 * Runs electron-builder install-app-deps when not in CI and not in production
 */

const { execSync } = require('child_process');
const path = require('path');

// Check environment variables
const isCI = process.env.CI === 'true';
const isProduction = process.env.NODE_ENV === 'production';

console.log('🔧 Postinstall: Checking environment...');
console.log(`   CI: ${isCI}`);
console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'undefined'}`);

if (isCI) {
  console.log('⏭️  Skipping native module rebuild in CI environment');
  process.exit(0);
}

if (isProduction) {
  console.log('⏭️  Skipping native module rebuild in production environment');
  process.exit(0);
}

try {
  console.log('🔧 Installing app dependencies for Electron...');
  execSync('electron-builder install-app-deps', {
    stdio: 'inherit',
    cwd: process.cwd(),
  });
  console.log('✅ Native modules installed successfully');
} catch (error) {
  console.warn('⚠️  Native module installation failed:', error.message);
  console.warn(
    '   This may not affect functionality if modules are already built'
  );
  // Don't fail the entire installation if this step fails
  process.exit(0);
}
