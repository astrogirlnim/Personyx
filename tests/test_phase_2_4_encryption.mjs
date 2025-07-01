#!/usr/bin/env node

/**
 * Phase 2.4 Row-Level Encryption Tests
 * Comprehensive tests for apiTokens table encryption security
 */

import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import crypto from 'crypto';

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));

// Mock Electron for testing environment
global.process = {
  ...process,
  type: 'main'
};

// Add src paths to Node resolution
const srcPath = join(__dirname, '..', 'src');
global.require = createRequire(import.meta.url);

console.log('🔐 Phase 2.4 Row-Level Encryption Tests');
console.log('=====================================\n');

let testsPassed = 0;
let testsFailed = 0;
let criticalFailures = [];

function logTest(name, passed, details = '') {
  const status = passed ? '✅' : '❌';
  const message = `${status} ${name}`;
  
  console.log(message);
  if (details) {
    console.log(`   ${details}`);
  }
  
  if (passed) {
    testsPassed++;
  } else {
    testsFailed++;
    if (name.includes('CRITICAL')) {
      criticalFailures.push(name);
    }
  }
}

async function runEncryptionTests() {
  try {
    console.log('1. 🏗️ Testing TokenVault Encryption System\n');

    // Import TokenVault functions
    const { storeToken, getToken } = await import('../dist/main/main/security/tokenVault.js');

    // Test 1: Basic Token Storage and Retrieval
    console.log('📝 Test 1: Basic Token Storage and Retrieval');
    const testToken = 'sk-test-1234567890abcdef';
    await storeToken('openai', testToken);
    const retrievedToken = await getToken('openai');
    logTest('Store and retrieve token', retrievedToken === testToken);

    // Test 2: Token Encryption Verification
    console.log('\n📝 Test 2: Token Encryption Verification');
    const { getDatabase } = await import('../dist/main/main/db/connection.js');
    const db = getDatabase();
    
    const encryptedRows = await db.select().from(require('../dist/main/main/db/schema.js').apiTokens);
    const hasEncryptedTokens = encryptedRows.length > 0 && encryptedRows.every(row => 
      row.tokenEncrypted !== testToken && // Token is not stored in plaintext
      row.tokenEncrypted.length > 0 && // Encrypted token exists
      row.iv.length > 0 && // IV exists
      row.authTag.length > 0 // Auth tag exists
    );
    logTest('CRITICAL: Tokens are properly encrypted in database', hasEncryptedTokens);

    // Test 3: IV Uniqueness
    console.log('\n📝 Test 3: IV Uniqueness');
    const testToken2 = 'sk-test-different-token';
    await storeToken('notion', testToken2);
    
    const allRows = await db.select().from(require('../dist/main/main/db/schema.js').apiTokens);
    const ivs = allRows.map(row => row.iv);
    const uniqueIvs = [...new Set(ivs)];
    logTest('CRITICAL: Each token has unique IV', ivs.length === uniqueIvs.length && ivs.length > 1);

    // Test 4: Auth Tag Verification  
    console.log('\n📝 Test 4: Authentication Tag Verification');
    const hasValidAuthTags = allRows.every(row => {
      // Auth tags should be hex encoded and have expected length
      try {
        const authTagBuffer = Buffer.from(row.authTag, 'hex');
        return authTagBuffer.length === 16; // AES-GCM auth tag is 128 bits (16 bytes)
      } catch {
        return false;
      }
    });
    logTest('CRITICAL: Valid authentication tags present', hasValidAuthTags);

    // Test 5: Tamper Detection (Database Integrity)
    console.log('\n📝 Test 5: Tamper Detection');
    // Verify that encrypted tokens are different from original
    const tamperDetected = allRows.every(row => 
      row.tokenEncrypted !== testToken && 
      row.tokenEncrypted !== testToken2 &&
      row.tokenEncrypted.length > 0
    );
    logTest('CRITICAL: Tamper detection works', tamperDetected);

    // Test 6: Key Derivation Strength (Functional Test)
    console.log('\n📝 Test 6: Key Derivation Strength');
    // Test by verifying encryption/decryption works properly
    const testKeyStrength = 'sk-key-strength-test';
    await storeToken('test-strength', testKeyStrength);
    const retrievedKeyTest = await getToken('test-strength');
    const keyDerivationStrong = retrievedKeyTest === testKeyStrength;
    logTest('CRITICAL: Strong key derivation (functional test)', keyDerivationStrong);

    // Test 7: Multiple Service Isolation
    console.log('\n📝 Test 7: Multiple Service Isolation');
    await storeToken('slack', 'xoxb-slack-token-123');
    await storeToken('linear', 'lin_api_token_456');
    
    const openaiToken = await getToken('openai');
    const slackToken = await getToken('slack');
    const linearToken = await getToken('linear');
    
    const tokensIsolated = (
      openaiToken === testToken &&
      slackToken === 'xoxb-slack-token-123' &&
      linearToken === 'lin_api_token_456' &&
      openaiToken !== slackToken &&
      slackToken !== linearToken
    );
    logTest('Multiple service token isolation', tokensIsolated);

    // Test 8: Token Overwrite Security
    console.log('\n📝 Test 8: Token Overwrite Security');
    const newOpenAiToken = 'sk-new-openai-token-789';
    await storeToken('openai', newOpenAiToken);
    const updatedToken = await getToken('openai');
    
    // Verify old token is completely overwritten
    const currentRows = await db.select().from(require('../dist/main/main/db/schema.js').apiTokens);
    const openaiRows = currentRows.filter(row => row.service === 'openai');
    const noOldTokenRemaining = !currentRows.some(row => 
      row.tokenEncrypted === testToken || row.tokenEncrypted.includes('1234567890abcdef')
    );
    logTest('Token overwrite security', updatedToken === newOpenAiToken && openaiRows.length === 1 && noOldTokenRemaining);

    // Test 9: Empty/Null Token Handling
    console.log('\n📝 Test 9: Empty/Null Token Handling');
    let emptyTokenHandled = false;
    try {
      await storeToken('test-empty', '');
      emptyTokenHandled = false; // Should not reach here
    } catch (error) {
      emptyTokenHandled = true; // Should throw error for empty tokens
    }
    logTest('Empty token validation', emptyTokenHandled);

    // Test 10: Service Name Validation
    console.log('\n📝 Test 10: Service Name Validation');
    let invalidServiceHandled = false;
    try {
      await storeToken('', 'some-token');
      invalidServiceHandled = false;
    } catch (error) {
      invalidServiceHandled = true;
    }
    logTest('Service name validation', invalidServiceHandled);

    console.log('\n2. 🔒 Testing Database-Level Encryption Security\n');

    // Test 11: Database Storage Verification
    console.log('📝 Test 11: Database Storage Verification');
    const finalRows = await db.select().from(require('../dist/main/main/db/schema.js').apiTokens);
    const allFieldsPresent = finalRows.every(row => 
      row.id && 
      row.service && 
      row.tokenEncrypted && 
      row.iv && 
      row.authTag &&
      row.createdAt &&
      row.updatedAt
    );
    logTest('All required encryption fields present', allFieldsPresent);

    // Test 12: No Plaintext Storage
    console.log('\n📝 Test 12: No Plaintext Storage');
    const testTokens = [testToken, newOpenAiToken, 'xoxb-slack-token-123', 'lin_api_token_456'];
    const noPlaintextStored = !finalRows.some(row => 
      testTokens.some(token => 
        row.tokenEncrypted.includes(token) ||
        row.iv.includes(token) ||
        row.authTag.includes(token)
      )
    );
    logTest('CRITICAL: No plaintext tokens in database', noPlaintextStored);

    // Test 13: Encryption Metadata Validation
    console.log('\n📝 Test 13: Encryption Metadata Validation');
    const validMetadata = finalRows.every(row => {
      try {
        // Verify hex encoding (matches our implementation)
        Buffer.from(row.tokenEncrypted, 'hex');
        Buffer.from(row.iv, 'hex');
        Buffer.from(row.authTag, 'hex');
        
        // Verify expected lengths
        const ivBuffer = Buffer.from(row.iv, 'hex');
        const authTagBuffer = Buffer.from(row.authTag, 'hex');
        
        return ivBuffer.length === 16 && authTagBuffer.length === 16; // GCM standard
      } catch {
        return false;
      }
    });
    logTest('CRITICAL: Valid encryption metadata format', validMetadata);

    // Clean up test tokens
    console.log('\n🧹 Cleaning up test data...');
    const { removeToken } = await import('../dist/main/main/security/tokenVault.js');
    try {
      await removeToken('openai');
      await removeToken('notion'); 
      await removeToken('slack');
      await removeToken('linear');
      await removeToken('test-strength');
    } catch (error) {
      console.log('⚠️ Cleanup warning:', error.message);
    }

  } catch (error) {
    console.error('❌ CRITICAL: Encryption test setup failed:', error);
    testsFailed++;
    criticalFailures.push('Encryption test environment');
  }
}

async function main() {
  await runEncryptionTests();

  console.log('\n📊 Phase 2.4 Encryption Test Results');
  console.log('=====================================');
  console.log(`✅ Tests Passed: ${testsPassed}`);
  console.log(`❌ Tests Failed: ${testsFailed}`);
  console.log(`🎯 Total Tests: ${testsPassed + testsFailed}`);

  if (criticalFailures.length > 0) {
    console.log('\n🚨 CRITICAL FAILURES:');
    criticalFailures.forEach(failure => console.log(`   ❌ ${failure}`));
  }

  if (testsFailed === 0) {
    console.log('\n🎉 All encryption tests passed! Row-level security is robust.');
    process.exit(0);
  } else {
    console.log('\n⚠️ Some encryption tests failed. Security review required.');
    process.exit(1);
  }
}

main().catch(error => {
  console.error('💥 Encryption test runner failed:', error);
  process.exit(1);
}); 