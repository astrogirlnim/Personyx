#!/usr/bin/env node

/**
 * Phase 3.5.2 Quick Verification Test
 * Tests the core third-party token management functionality
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

console.log('🔍 Phase 3.5.2 Third-Party Token Management - Quick Verification');
console.log('=================================================================\n');

let passedTests = 0;
let totalTests = 0;

function test(name, condition, details = '') {
  totalTests++;
  if (condition) {
    console.log(`✅ ${name}`);
    passedTests++;
  } else {
    console.log(`❌ ${name}${details ? ` - ${details}` : ''}`);
  }
}

function log(message) {
  console.log(`📋 ${message}`);
}

// Test 1: Core Files Existence
log('Testing core files existence...');

const coreFiles = [
  'src/main/security/tokenVault.ts',
  'src/main/services/SettingsService.ts',
  'src/shared/constants.ts',
  'src/shared/types.ts',
  'src/main/main.ts',
  'src/main/preload.ts',
  'src/renderer/hooks/useSettings.ts',
];

let allCoreFilesExist = true;
coreFiles.forEach(file => {
  const exists = existsSync(file);
  test(`Core file exists: ${file}`, exists);
  if (!exists) allCoreFilesExist = false;
});

test('All core files exist', allCoreFilesExist);

// Test 2: TokenVault Enhancement
log('\nTesting TokenVault enhancements...');

try {
  const tokenVaultContent = readFileSync('src/main/security/tokenVault.ts', 'utf8');
  
  test('validateToken function exists', tokenVaultContent.includes('export function validateToken'));
  test('isTokenStored function exists', tokenVaultContent.includes('export function isTokenStored'));
  test('ApiService type export', tokenVaultContent.includes('export type ApiService'));
  test('OpenAI validation logic', tokenVaultContent.includes("token.startsWith('sk-')"));
  test('VSCode validation logic', tokenVaultContent.includes("token.startsWith('ghp_')") || tokenVaultContent.includes("token.startsWith('github_pat_')"));
  test('Slack validation logic', tokenVaultContent.includes("token.startsWith('xoxb-')"));
  test('Apple Notes validation logic', tokenVaultContent.includes('apple-notes'));
  test('Firebase Cloud validation logic', tokenVaultContent.includes('firebase-cloud'));
  
} catch (error) {
  test('TokenVault file readable', false, error.message);
}

// Test 3: SettingsService Enhancement
log('\nTesting SettingsService enhancements...');

try {
  const settingsServiceContent = readFileSync('src/main/services/SettingsService.ts', 'utf8');
  
  test('configureThirdPartyToken method', settingsServiceContent.includes('async configureThirdPartyToken('));
  test('getTokenStatus method', settingsServiceContent.includes('async getTokenStatus('));
  test('removeThirdPartyToken method', settingsServiceContent.includes('async removeThirdPartyToken('));
  test('testThirdPartyToken method', settingsServiceContent.includes('async testThirdPartyToken('));
  test('getMissingTokenWarnings method', settingsServiceContent.includes('async getMissingTokenWarnings('));
  test('Uses validateToken import', settingsServiceContent.includes('validateToken'));
  test('Uses isTokenStored import', settingsServiceContent.includes('isTokenStored'));
  test('Error handling implemented', settingsServiceContent.includes('try {') && settingsServiceContent.includes('catch (error)'));
  
} catch (error) {
  test('SettingsService file readable', false, error.message);
}

// Test 4: IPC Constants
log('\nTesting IPC constants...');

try {
  const constantsContent = readFileSync('src/shared/constants.ts', 'utf8');
  
  test('SET_THIRD_PARTY_TOKEN channel', constantsContent.includes('SET_THIRD_PARTY_TOKEN'));
  test('GET_TOKEN_STATUS channel', constantsContent.includes('GET_TOKEN_STATUS'));
  test('TEST_THIRD_PARTY_TOKEN channel', constantsContent.includes('TEST_THIRD_PARTY_TOKEN'));
  test('REMOVE_THIRD_PARTY_TOKEN channel', constantsContent.includes('REMOVE_THIRD_PARTY_TOKEN'));
  test('GET_MISSING_TOKEN_WARNINGS channel', constantsContent.includes('GET_MISSING_TOKEN_WARNINGS'));
  test('TOKEN_STATUS_UPDATED channel', constantsContent.includes('TOKEN_STATUS_UPDATED'));
  test('THIRD_PARTY_TOKEN_TEST_RESULT channel', constantsContent.includes('THIRD_PARTY_TOKEN_TEST_RESULT'));
  
} catch (error) {
  test('Constants file readable', false, error.message);
}

// Test 5: Type Definitions
log('\nTesting type definitions...');

try {
  const typesContent = readFileSync('src/shared/types.ts', 'utf8');
  
  test('TokenStatus interface', typesContent.includes('interface TokenStatus'));
  test('ThirdPartyTokenTestResult interface', typesContent.includes('interface ThirdPartyTokenTestResult'));
  test('SetThirdPartyTokenEvent interface', typesContent.includes('interface SetThirdPartyTokenEvent'));
  test('GetTokenStatusEvent interface', typesContent.includes('interface GetTokenStatusEvent'));
  test('TestThirdPartyTokenEvent interface', typesContent.includes('interface TestThirdPartyTokenEvent'));
  test('RemoveThirdPartyTokenEvent interface', typesContent.includes('interface RemoveThirdPartyTokenEvent'));
  test('GetMissingTokenWarningsEvent interface', typesContent.includes('interface GetMissingTokenWarningsEvent'));
  test('TokenStatusUpdatedEvent interface', typesContent.includes('interface TokenStatusUpdatedEvent'));
  test('ThirdPartyTokenTestResultEvent interface', typesContent.includes('interface ThirdPartyTokenTestResultEvent'));
  
} catch (error) {
  test('Types file readable', false, error.message);
}

// Test 6: Main Process IPC Handlers
log('\nTesting main process IPC handlers...');

try {
  const mainContent = readFileSync('src/main/main.ts', 'utf8');
  
  test('SET_THIRD_PARTY_TOKEN handler', mainContent.includes('handleSetThirdPartyToken'));
  test('GET_TOKEN_STATUS handler', mainContent.includes('handleGetTokenStatus'));
  test('TEST_THIRD_PARTY_TOKEN handler', mainContent.includes('handleTestThirdPartyToken'));
  test('REMOVE_THIRD_PARTY_TOKEN handler', mainContent.includes('handleRemoveThirdPartyToken'));
  test('GET_MISSING_TOKEN_WARNINGS handler', mainContent.includes('handleGetMissingTokenWarnings'));
  test('Service validation in handlers', mainContent.includes("!['openai', 'vscode', 'slack', 'apple-notes', 'firebase-cloud'].includes"));
  test('Error handling in handlers', mainContent.includes('try {') && mainContent.includes('catch (error)'));
  
} catch (error) {
  test('Main process file readable', false, error.message);
}

// Test 7: Preload Script
log('\nTesting preload script...');

try {
  const preloadContent = readFileSync('src/main/preload.ts', 'utf8');
  
  test('configureThirdPartyToken API', preloadContent.includes('configureThirdPartyToken'));
  test('getTokenStatus API', preloadContent.includes('getTokenStatus'));
  test('testThirdPartyToken API', preloadContent.includes('testThirdPartyToken'));
  test('removeThirdPartyToken API', preloadContent.includes('removeThirdPartyToken'));
  test('getMissingTokenWarnings API', preloadContent.includes('getMissingTokenWarnings'));
  test('onTokenStatusUpdated listener', preloadContent.includes('onTokenStatusUpdated'));
  test('onThirdPartyTokenTestResult listener', preloadContent.includes('onThirdPartyTokenTestResult'));
  
} catch (error) {
  test('Preload script file readable', false, error.message);
}

// Test 8: useSettings Hook
log('\nTesting useSettings hook...');

try {
  const useSettingsContent = readFileSync('src/renderer/hooks/useSettings.ts', 'utf8');
  
  test('TokenStatus interface import/definition', useSettingsContent.includes('TokenStatus'));
  test('ThirdPartyTokenTestResult interface import/definition', useSettingsContent.includes('ThirdPartyTokenTestResult'));
  test('tokenStatus state', useSettingsContent.includes('tokenStatus'));
  test('isTestingThirdPartyToken state', useSettingsContent.includes('isTestingThirdPartyToken'));
  test('lastThirdPartyTestResult state', useSettingsContent.includes('lastThirdPartyTestResult'));
  test('missingTokenWarnings state', useSettingsContent.includes('missingTokenWarnings'));
  test('configureThirdPartyToken method', useSettingsContent.includes('configureThirdPartyToken'));
  test('getTokenStatus method', useSettingsContent.includes('getTokenStatus'));
  test('testThirdPartyToken method', useSettingsContent.includes('testThirdPartyToken'));
  test('removeThirdPartyToken method', useSettingsContent.includes('removeThirdPartyToken'));
  test('getMissingTokenWarnings method', useSettingsContent.includes('getMissingTokenWarnings'));
  
} catch (error) {
  test('useSettings hook file readable', false, error.message);
}

// Test 9: Build and TypeScript Compliance
log('\nTesting build and TypeScript compliance...');

try {
  // Check if the project builds successfully
  const { execSync } = await import('child_process');
  
  try {
    execSync('pnpm typecheck', { stdio: 'pipe' });
    test('TypeScript compilation passes', true);
  } catch (error) {
    test('TypeScript compilation passes', false, 'TypeScript errors found');
  }
  
} catch (error) {
  test('Build system accessible', false, error.message);
}

// Test 10: Implementation Completeness
log('\nTesting implementation completeness...');

const implementationFeatures = [
  'Token validation for all services',
  'Secure token storage and retrieval',
  'IPC communication infrastructure',
  'React hook state management',
  'TypeScript type safety',
  'Error handling throughout',
  'Event broadcasting system',
  'Service-specific validation rules',
];

// This is a meta-test based on previous test results
const implementationComplete = passedTests >= (totalTests * 0.8); // 80% threshold
test('Implementation completeness', implementationComplete, `${passedTests}/${totalTests} tests passed`);

// Summary
console.log('\n📊 Test Results Summary');
console.log('======================');
console.log(`✅ Passed: ${passedTests}`);
console.log(`❌ Failed: ${totalTests - passedTests}`);
console.log(`📈 Success Rate: ${Math.round((passedTests / totalTests) * 100)}%`);

if (passedTests === totalTests) {
  console.log('\n🎉 All tests passed! Phase 3.5.2 foundation is ready for UI implementation.');
} else if (passedTests >= totalTests * 0.8) {
  console.log('\n✅ Most tests passed! Phase 3.5.2 foundation is largely complete.');
} else {
  console.log('\n⚠️  Some tests failed. Please review the implementation.');
}

console.log('\n🔧 Next Steps:');
console.log('1. Use the manual testing guide: tests/MANUAL_TEST_PHASE_3_5_2.md');
console.log('2. Test token validation with real token formats');
console.log('3. Verify IPC communication in the running app');
console.log('4. Test error handling scenarios');
console.log('5. Implement UI components for third-party token management'); 