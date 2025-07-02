#!/usr/bin/env node

/**
 * Firebase Configuration Checker
 * Verifies that Firebase is properly configured for Personyx via .env
 */

const path = require('path');
const fs = require('fs');

// Load environment variables from .env
require('dotenv').config();

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

function log(message, color = 'reset') {
  console.log(colors[color] + message + colors.reset);
}

function validateEnvironmentConfig() {
  log('🔥 Firebase Environment Configuration Validator', 'cyan');
  log('==============================================\n', 'cyan');

  // Check if .env exists
  const envPath = path.join(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) {
    log('❌ .env file not found', 'red');
    log('   Please copy firebase-config.env to .env', 'yellow');
    log('   Command: cp firebase-config.env .env\n', 'yellow');
    process.exit(1);
  }

  log('✅ .env file found and loaded', 'green');

  // Validate required environment variables
  const requiredVars = [
    'FIREBASE_API_KEY',
    'FIREBASE_AUTH_DOMAIN',
    'FIREBASE_PROJECT_ID',
    'FIREBASE_STORAGE_BUCKET',
    'FIREBASE_MESSAGING_SENDER_ID',
    'FIREBASE_APP_ID',
    'FIREBASE_FUNCTIONS_URL',
  ];

  let isValid = true;

  log('\n📋 Validating Environment Variables:', 'bold');
  requiredVars.forEach(varName => {
    const value = process.env[varName];
    if (!value || value.includes('your_') || value.includes('example')) {
      log(`❌ ${varName}: Missing or still has placeholder value`, 'red');
      isValid = false;
    } else {
      // Show truncated value for security
      const displayValue =
        value.length > 30 ? value.substring(0, 30) + '...' : value;
      log(`✅ ${varName}: ${displayValue}`, 'green');
    }
  });

  // Check optional OpenAI key
  log('\n🔑 Optional Configuration:', 'bold');
  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey) {
    log('✅ OPENAI_API_KEY: Configured (for local fallback)', 'green');
  } else {
    log(
      '⚠️  OPENAI_API_KEY: Not set (Cloud Functions will handle this)',
      'yellow'
    );
  }

  if (!isValid) {
    log('\n❌ Configuration validation failed!', 'red');
    log('   Please update .env with your actual Firebase values\n', 'yellow');
    process.exit(1);
  }

  log('\n🎉 Environment configuration is valid!', 'green');
  log(`   Project: ${process.env.FIREBASE_PROJECT_ID}`, 'cyan');
  log(`   Auth Domain: ${process.env.FIREBASE_AUTH_DOMAIN}`, 'cyan');
  log(`   Functions: ${process.env.FIREBASE_FUNCTIONS_URL}\n`, 'cyan');
}

// Test Firebase connection
async function testFirebaseConnection() {
  log('🌐 Testing Firebase Connectivity:', 'bold');

  try {
    // Test Auth Domain reachability
    log('   Testing Auth Domain...', 'yellow');
    const authResponse = await fetch(
      `https://${process.env.FIREBASE_AUTH_DOMAIN}`
    );
    if (authResponse.ok || authResponse.status === 404) {
      log('   ✅ Auth Domain is reachable', 'green');
    } else {
      log(
        `   ⚠️  Auth Domain responded with status: ${authResponse.status}`,
        'yellow'
      );
    }

    // Test Functions health check
    log('   Testing Cloud Functions...', 'yellow');
    try {
      const functionsResponse = await fetch(
        `${process.env.FIREBASE_FUNCTIONS_URL}/healthCheck`,
        {
          method: 'GET',
          headers: {
            Accept: 'application/json',
          },
        }
      );

      if (functionsResponse.ok) {
        const healthData = await functionsResponse.json();
        log('   ✅ Cloud Functions are deployed and healthy', 'green');
        log(
          `   📊 Service: ${healthData.service} v${healthData.version}`,
          'blue'
        );
        log(
          `   🤖 OpenAI Configured: ${healthData.openai_configured ? 'Yes' : 'No'}`,
          'blue'
        );
      } else {
        log('   ⚠️  Cloud Functions not deployed or unhealthy', 'yellow');
        log('   💡 Deploy with: firebase deploy --only functions', 'blue');
      }
    } catch (funcError) {
      log('   ⚠️  Cloud Functions not yet deployed', 'yellow');
      log('   💡 Deploy with: firebase deploy --only functions', 'blue');
    }
  } catch (error) {
    log(`   ❌ Connection test failed: ${error.message}`, 'red');
  }
}

// Test Firebase SDK initialization
async function testFirebaseSDK() {
  log('🔧 Testing Firebase SDK:', 'bold');

  try {
    // Test Firebase app initialization
    const { initializeApp } = require('firebase/app');

    const firebaseConfig = {
      apiKey: process.env.FIREBASE_API_KEY,
      authDomain: process.env.FIREBASE_AUTH_DOMAIN,
      projectId: process.env.FIREBASE_PROJECT_ID,
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.FIREBASE_APP_ID,
    };

    const app = initializeApp(firebaseConfig);
    log('   ✅ Firebase App initialization successful', 'green');

    // Test Auth module
    const { getAuth } = require('firebase/auth');
    const auth = getAuth(app);
    log('   ✅ Firebase Auth module loaded', 'green');

    log('   📱 Firebase SDK is properly configured', 'cyan');
  } catch (error) {
    log(`   ❌ Firebase SDK test failed: ${error.message}`, 'red');
    log(
      '   💡 Make sure firebase package is installed: npm install firebase',
      'blue'
    );
  }
}

// Main execution
async function main() {
  try {
    validateEnvironmentConfig();
    await testFirebaseConnection();
    await testFirebaseSDK();

    log('🎯 Next Steps:', 'bold');
    log('   1. ✅ Environment configured correctly', 'green');
    log('   2. 🔐 Enable Email/Password auth in Firebase Console', 'blue');
    log('   3. 🚀 Deploy functions: firebase deploy --only functions', 'blue');
    log('   4. 🧪 Test Personyx app: npm run dev\n', 'blue');

    log('🎉 Your Personyx Firebase setup is ready!', 'green');
  } catch (error) {
    log(`\n💥 Setup check failed: ${error.message}`, 'red');
    process.exit(1);
  }
}

// Execute
main().catch(console.error);
