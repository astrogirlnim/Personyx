#!/usr/bin/env node

/**
 * Node.js Version Checker for Personyx
 * Ensures exact version compatibility across development and CI/CD
 */

const fs = require('fs');
const path = require('path');

// ANSI colors for better output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkNodeVersion() {
  try {
    // Read expected version from .nvmrc
    const nvmrcPath = path.join(__dirname, '..', '.nvmrc');
    const expectedVersion = fs.readFileSync(nvmrcPath, 'utf8').trim();

    // Get current Node.js version
    const currentVersion = process.version.slice(1); // Remove 'v' prefix

    log('\n🔍 Node.js Version Check', 'bold');
    log('========================', 'cyan');
    log(`Expected version: ${expectedVersion}`, 'blue');
    log(`Current version:  ${currentVersion}`, 'blue');

    if (currentVersion === expectedVersion) {
      log('\n✅ Node.js version is correct!', 'green');
      log('🚀 All systems ready for development', 'green');
      return true;
    } else {
      log('\n❌ Node.js version mismatch detected!', 'red');
      log('\n🔧 This can cause native module compilation issues.', 'yellow');
      log('\n📋 To fix this:', 'bold');
      log(`   1. Install Node.js ${expectedVersion}:`, 'cyan');
      log(
        `      • Using nvm: nvm install ${expectedVersion} && nvm use ${expectedVersion}`,
        'cyan'
      );
      log(`      • Using volta: volta install node@${expectedVersion}`, 'cyan');
      log(`      • Manual: Download from https://nodejs.org/`, 'cyan');
      log(`   2. Restart your terminal`, 'cyan');
      log(`   3. Run 'node --version' to verify`, 'cyan');
      log(
        `   4. Run 'npm run rebuild-for-electron' to rebuild native modules`,
        'cyan'
      );

      // Check if we're in CI environment
      if (process.env.CI) {
        log(
          '\n⚠️  CI environment detected - continuing with warning',
          'yellow'
        );
        return true;
      }

      log(
        '\n💡 Tip: Use volta (https://volta.sh/) for automatic Node.js version switching!',
        'blue'
      );

      // Exit with error code in development
      process.exit(1);
    }
  } catch (error) {
    log('\n❌ Error checking Node.js version:', 'red');
    log(error.message, 'red');

    if (!process.env.CI) {
      process.exit(1);
    }
  }
}

// Handle script execution
if (require.main === module) {
  checkNodeVersion();
}

module.exports = { checkNodeVersion };
