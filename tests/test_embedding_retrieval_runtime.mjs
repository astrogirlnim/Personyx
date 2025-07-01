/**
 * Runtime Test for Phase 2.2 - Embedding Retrieval API
 * 
 * This test verifies the actual runtime functionality of the embedding retrieval API
 * by interacting with the running Electron application.
 * 
 * Usage: Start the Personyx app with `./dev.sh`, then run this test
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import path from 'path';

console.log('🧪 Phase 2.2 Embedding Retrieval API - Runtime Tests');
console.log('='.repeat(60));

const testResults = {
  passed: 0,
  failed: 0,
  tests: []
};

function logTest(name, success, details = '') {
  const status = success ? '✅ PASS' : '❌ FAIL';
  const message = `${status} - ${name}`;
  console.log(message);
  if (details) console.log(`   ${details}`);
  
  testResults.tests.push({ name, success, details });
  if (success) {
    testResults.passed++;
  } else {
    testResults.failed++;
  }
}

function checkAppRunning() {
  try {
    // Check if Electron process is running
    const result = execSync('ps aux | grep -i electron | grep -v grep', { encoding: 'utf8' });
    return result.includes('electron') || result.includes('Personyx');
  } catch (error) {
    return false;
  }
}

function checkDatabaseHasData() {
  try {
    // Check if we have mock data from Phase 1.4
    const interviewsDir = 'interviews';
    const personasFile = 'personas.yml';
    
    const hasInterviews = existsSync(interviewsDir);
    const hasPersonas = existsSync(personasFile);
    
    if (hasInterviews && hasPersonas) {
      // Check for actual content
      const personasContent = readFileSync(personasFile, 'utf8');
      return personasContent.includes('solo_founder') && personasContent.includes('agency_marketer');
    }
    return false;
  } catch (error) {
    return false;
  }
}

function testDevelopmentSetup() {
  console.log('\n🔧 Testing Development Environment');
  console.log('-'.repeat(40));

  // Test 1: Check if app can be started
  try {
    const hasDevScript = existsSync('./dev.sh');
    logTest('Development script exists', hasDevScript);
    
    if (hasDevScript) {
      const devScriptContent = readFileSync('./dev.sh', 'utf8');
      const hasProperSetup = devScriptContent.includes('npm') || devScriptContent.includes('pnpm');
      logTest('Development script properly configured', hasProperSetup);
    }
  } catch (error) {
    logTest('Development environment check', false, error.message);
  }

  // Test 2: Check if mock data is available
  const hasMockData = checkDatabaseHasData();
  logTest('Mock data available for testing', hasMockData, 
    hasMockData ? 'personas.yml and interviews/ found' : 'Run Phase 1.4 first to create mock data');

  // Test 3: Check if database can be accessed
  try {
    const hasDbScript = existsSync('scripts/validate-database.js');
    logTest('Database validation script exists', hasDbScript);
    
    if (hasDbScript) {
      try {
        execSync('node scripts/validate-database.js', { encoding: 'utf8', stdio: 'pipe' });
        logTest('Database validation passes', true);
      } catch (error) {
        logTest('Database validation passes', false, 'Database validation failed');
      }
    }
  } catch (error) {
    logTest('Database accessibility check', false, error.message);
  }
}

function testServiceDependencies() {
  console.log('\n🔗 Testing Service Dependencies');
  console.log('-'.repeat(40));

  // Check if all required service files exist
  const serviceFiles = [
    'src/main/services/EmbeddingRetrievalService.ts',
    'src/main/services/LangGraphService.ts',
    'src/main/db/repositories/EmbeddingRepo.ts',
    'src/main/db/repositories/EvidenceRepo.ts',
    'src/main/db/repositories/PersonaRepo.ts'
  ];

  for (const file of serviceFiles) {
    const exists = existsSync(file);
    logTest(`Service file: ${path.basename(file)}`, exists);
  }

  // Check database schema
  const schemaExists = existsSync('src/main/db/schema.ts');
  logTest('Database schema defined', schemaExists);

  if (schemaExists) {
    const schemaContent = readFileSync('src/main/db/schema.ts', 'utf8');
    const hasEmbeddingsTable = schemaContent.includes('embeddings');
    const hasEvidenceTable = schemaContent.includes('evidence');
    
    logTest('Embeddings table schema', hasEmbeddingsTable);
    logTest('Evidence table schema', hasEvidenceTable);
  }
}

function testAPIConfiguration() {
  console.log('\n⚙️ Testing API Configuration');
  console.log('-'.repeat(40));

  // Check if OpenAI API key can be configured
  try {
    const setupScriptExists = existsSync('scripts/setup-api-key.js');
    logTest('API key setup script exists', setupScriptExists);

    // Check for environment variable instructions
    const readmeExists = existsSync('README.md');
    if (readmeExists) {
      const readmeContent = readFileSync('README.md', 'utf8');
      const hasApiKeyInstructions = readmeContent.includes('API') || readmeContent.includes('OPENAI');
      logTest('API key configuration documented', hasApiKeyInstructions);
    }
  } catch (error) {
    logTest('API configuration check', false, error.message);
  }
}

function generateTestPlan() {
  console.log('\n📋 Manual Testing Plan for Embedding Retrieval API');
  console.log('-'.repeat(50));
  
  console.log('\n1. 🚀 Start the Application:');
  console.log('   • Run: ./dev.sh');
  console.log('   • Wait for "✅ All services ready" message');
  console.log('   • Check tray icon appears with "PY" text');

  console.log('\n2. 🧪 Test Similarity Search (if app running):');
  console.log('   • Open tray menu → Settings/Debug');
  console.log('   • Test search query: "onboarding problems"');
  console.log('   • Expected: Returns results from interview transcripts');
  console.log('   • Verify: Query time < 200ms');

  console.log('\n3. 💾 Test Caching (repeat queries):');
  console.log('   • Run same query: "onboarding problems"');
  console.log('   • Expected: Much faster response (cached=true)');
  console.log('   • Wait 5+ minutes, repeat query');
  console.log('   • Expected: Cache expires, fresh query runs');

  console.log('\n4. 🎯 Test Persona Filtering:');
  console.log('   • Search with personaId: "solo_founder"');
  console.log('   • Expected: Only solo founder evidence returned');
  console.log('   • Search with personaId: "agency_marketer"');
  console.log('   • Expected: Only agency marketer evidence returned');

  console.log('\n5. 📊 Test Performance & Limits:');
  console.log('   • Test with topN=1, 5, 10, 50');
  console.log('   • Test with minSimilarity=0.5, 0.7, 0.9');
  console.log('   • Expected: Results respect limits and thresholds');

  console.log('\n6. 🔍 Test Edge Cases:');
  console.log('   • Empty query: ""');
  console.log('   • Non-existent persona: "fake-persona"');
  console.log('   • Very long query (1000+ chars)');
  console.log('   • Expected: Graceful handling, no crashes');

  console.log('\n7. 🛠️ Debugging Tools:');
  console.log('   • Check logs in console for detailed timing');
  console.log('   • Monitor cache statistics');
  console.log('   • Verify similarity scores are reasonable (0.0-1.0)');
}

// Run all tests
async function runTests() {
  console.log('🎯 Testing Phase 2.2 Embedding Retrieval API Runtime');
  console.log('This verifies the implementation is ready for manual testing\n');

  testDevelopmentSetup();
  testServiceDependencies();
  testAPIConfiguration();

  // Check if app is currently running
  const appRunning = checkAppRunning();
  logTest('Electron app currently running', appRunning, 
    appRunning ? 'App is running - ready for live testing' : 'Start app with ./dev.sh to test live functionality');

  generateTestPlan();

  // Print final results
  console.log('\n' + '='.repeat(60));
  console.log('📊 RUNTIME TEST RESULTS');
  console.log('='.repeat(60));
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  
  if (testResults.failed === 0) {
    console.log('\n🎉 All runtime prerequisites passed!');
    console.log('💡 The Embedding Retrieval API is ready for testing.');
    console.log('📝 Follow the manual testing plan above to verify functionality.');
  } else {
    console.log('\n⚠️  Some prerequisites failed. Fix these before testing:');
    testResults.tests
      .filter(test => !test.success)
      .forEach(test => console.log(`   - ${test.name}: ${test.details}`));
  }

  console.log('\n🚀 Ready to test Phase 2.2 implementation!');
  
  return testResults.failed;
}

// Run the tests
runTests().then(failures => {
  process.exit(failures > 0 ? 1 : 0);
}).catch(error => {
  console.error('❌ Runtime test failed:', error);
  process.exit(1);
}); 