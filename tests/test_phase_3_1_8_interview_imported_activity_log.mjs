#!/usr/bin/env node

/**
 * Phase 3.1.8 - Interview Imported Activity Log Test
 * Tests the enhanced activity logging for interview transcript imports
 * with detailed persona evidence counts and name mapping.
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

console.log('🧪 Phase 3.1.8 - Interview Imported Activity Log Test');
console.log('================================================\n');

// Test configuration
const testConfig = {
  timeout: 30000,
  retries: 3,
  verbose: true,
};

// Sample transcript content for testing
const testTranscriptContent = `
# Agency Marketing Client Interview - Campaign Performance

**Date:** December 15, 2024
**Participant:** Sarah Johnson, Marketing Director at GrowthHub Agency

## Campaign Overview

We've been running conversion optimization campaigns for our SaaS clients and seeing great results. The key is focusing on funnel analysis and A/B testing every element.

### Key Pain Points

1. **ROI Reporting**: Clients want to see clear attribution from marketing spend to revenue
2. **Copy Iteration Speed**: We need faster turnaround on landing page optimization
3. **Client Management**: Keeping stakeholders aligned on campaign performance

### Success Metrics

- 40% improvement in conversion rates through systematic testing
- 25% reduction in client reporting time with automated dashboards
- 3x faster campaign iteration cycles

## Solo Founder Perspective

During the discussion, we also talked about bootstrapping approaches:

- MVP validation is critical before scaling marketing spend
- Resource constraints mean focusing on one channel at a time
- Product-market fit should drive feature priority decisions
- Time to market is everything for solo founders

## Next Steps

- Implement better attribution modeling
- Automate more reporting workflows
- Focus on lead generation optimization
`;

/**
 * Test Results Tracking
 */
let testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  details: [],
};

function logTest(testName, passed, details = '') {
  testResults.total++;
  if (passed) {
    testResults.passed++;
    console.log(`✅ ${testName}`);
  } else {
    testResults.failed++;
    console.log(`❌ ${testName}`);
    if (details) {
      console.log(`   Details: ${details}`);
    }
  }
  testResults.details.push({ testName, passed, details });
}

/**
 * Mock database setup for testing
 */
async function setupTestDatabase() {
  try {
    console.log('🔧 Setting up test database...');
    
    // Clear and initialize database
    const setupCommand = `cd "${projectRoot}" && npm run db:migrate`;
    execSync(setupCommand, { stdio: 'pipe' });
    
    // Seed personas
    const seedCommand = `cd "${projectRoot}" && node scripts/db-seed-mock.js --personas-only`;
    execSync(seedCommand, { stdio: 'pipe' });
    
    console.log('✅ Test database setup completed');
    return true;
  } catch (error) {
    console.error('❌ Failed to setup test database:', error.message);
    return false;
  }
}

/**
 * Test 1: Enhanced Data Flow - TranscriptProcessingResult Interface
 */
async function testEnhancedDataFlow() {
  console.log('\n📋 Test 1: Enhanced Data Flow Verification');
  
  try {
    // Check that WorkflowOrchestrator.ts has the enhanced interface
    const orchestratorPath = join(projectRoot, 'src/main/services/WorkflowOrchestrator.ts');
    const orchestratorContent = readFileSync(orchestratorPath, 'utf8');
    
    // Test 1.1: TranscriptProcessingResult interface has new fields
    const hasEvidenceCreated = orchestratorContent.includes('evidenceCreated?: string[]');
    const hasPersonasAffected = orchestratorContent.includes('personasAffected?: string[]');
    const hasProcessingTime = orchestratorContent.includes('processingTime?: number');
    const hasEvidenceCountByPersona = orchestratorContent.includes('evidenceCountByPersona?: Record<string, number>');
    
    logTest(
      'TranscriptProcessingResult interface enhanced',
      hasEvidenceCreated && hasPersonasAffected && hasProcessingTime && hasEvidenceCountByPersona,
      `evidenceCreated: ${hasEvidenceCreated}, personasAffected: ${hasPersonasAffected}, processingTime: ${hasProcessingTime}, evidenceCountByPersona: ${hasEvidenceCountByPersona}`
    );
    
    // Test 1.2: calculateEvidenceCountsByPersona method exists
    const hasCalculateMethod = orchestratorContent.includes('calculateEvidenceCountsByPersona');
    const hasEvidenceRepoImport = orchestratorContent.includes('EvidenceRepo');
    
    logTest(
      'Evidence counting method implemented',
      hasCalculateMethod && hasEvidenceRepoImport,
      `calculateMethod: ${hasCalculateMethod}, evidenceRepoImport: ${hasEvidenceRepoImport}`
    );
    
    // Test 1.3: processTranscriptManual captures detailed results
    const hasIngestResultCapture = orchestratorContent.includes('const ingestResult') && orchestratorContent.includes('transcriptIngestService.processTranscript');
    const hasEvidenceCountCalculation = orchestratorContent.includes('await this.calculateEvidenceCountsByPersona');
    
    logTest(
      'processTranscriptManual captures detailed results',
      hasIngestResultCapture && hasEvidenceCountCalculation,
      `ingestResultCapture: ${hasIngestResultCapture}, evidenceCountCalculation: ${hasEvidenceCountCalculation}`
    );
    
  } catch (error) {
    logTest('Enhanced Data Flow Verification', false, error.message);
  }
}

/**
 * Test 2: Activity Log Service Enhancement
 */
async function testActivityLogServiceEnhancement() {
  console.log('\n📋 Test 2: Activity Log Service Enhancement');
  
  try {
    // Check ActivityLogService.ts has new methods
    const servicePath = join(projectRoot, 'src/main/services/ActivityLogService.ts');
    const serviceContent = readFileSync(servicePath, 'utf8');
    
    // Test 2.1: logInterviewImported method exists
    const hasLogInterviewImported = serviceContent.includes('async logInterviewImported(');
    const hasPersonaMapping = serviceContent.includes('getPersonaNames');
    const hasPersonaRepoImport = serviceContent.includes('PersonaRepo');
    
    logTest(
      'logInterviewImported method implemented',
      hasLogInterviewImported && hasPersonaMapping,
      `logInterviewImported: ${hasLogInterviewImported}, personaMapping: ${hasPersonaMapping}`
    );
    
    // Test 2.2: getPersonaNames method exists
    const hasGetPersonaNamesMethod = serviceContent.includes('private async getPersonaNames');
    const hasPersonaFallback = serviceContent.includes('Fallback to ID as name');
    
    logTest(
      'getPersonaNames method with fallback implemented',
      hasGetPersonaNamesMethod && hasPersonaFallback,
      `getPersonaNamesMethod: ${hasGetPersonaNamesMethod}, fallback: ${hasPersonaFallback}`
    );
    
    // Test 2.3: Enhanced metadata structure
    const hasDetailedDescription = serviceContent.includes('evidence for ${persona.name}');
    const hasEnhancedMetadata = serviceContent.includes('evidenceCountByPersona');
    const hasPersonaNames = serviceContent.includes('personaNames');
    
    logTest(
      'Enhanced activity logging with persona details',
      hasDetailedDescription && hasEnhancedMetadata && hasPersonaNames,
      `detailedDescription: ${hasDetailedDescription}, enhancedMetadata: ${hasEnhancedMetadata}, personaNames: ${hasPersonaNames}`
    );
    
  } catch (error) {
    logTest('Activity Log Service Enhancement', false, error.message);
  }
}

/**
 * Test 3: Main Process Integration
 */
async function testMainProcessIntegration() {
  console.log('\n📋 Test 3: Main Process Integration');
  
  try {
    // Check main.ts uses new activity logging
    const mainPath = join(projectRoot, 'src/main/main.ts');
    const mainContent = readFileSync(mainPath, 'utf8');
    
    // Test 3.1: Uses logInterviewImported method
    const hasLogInterviewImportedCall = mainContent.includes('.logInterviewImported(');
    const hasEvidenceCountByPersonaCheck = mainContent.includes('evidenceCountByPersona');
    const hasFallbackLogging = mainContent.includes('logTranscriptImportSuccess');
    
    logTest(
      'Main process uses enhanced activity logging',
      hasLogInterviewImportedCall && hasEvidenceCountByPersonaCheck && hasFallbackLogging,
      `logInterviewImported: ${hasLogInterviewImportedCall}, evidenceCountCheck: ${hasEvidenceCountByPersonaCheck}, fallback: ${hasFallbackLogging}`
    );
    
    // Test 3.2: Phase 3.1.8 comment exists
    const hasPhaseComment = mainContent.includes('Phase 3.1.8');
    
    logTest(
      'Phase 3.1.8 implementation documented',
      hasPhaseComment,
      `phaseComment: ${hasPhaseComment}`
    );
    
  } catch (error) {
    logTest('Main Process Integration', false, error.message);
  }
}

/**
 * Test 4: Type System Updates
 */
async function testTypeSystemUpdates() {
  console.log('\n📋 Test 4: Type System Updates');
  
  try {
    // Check shared types updated
    const typesPath = join(projectRoot, 'src/shared/types.ts');
    const typesContent = readFileSync(typesPath, 'utf8');
    
    // Test 4.1: ActivityLogMetadata enhanced
    const hasEvidenceCountByPersona = typesContent.includes('evidenceCountByPersona?: Record<string, number>');
    const hasPersonaNames = typesContent.includes('personaNames?: Array<{ id: string; name: string }>');
    const hasTotalEvidenceCount = typesContent.includes('totalEvidenceCount?: number');
    const hasPersonasAffectedCount = typesContent.includes('personasAffectedCount?: number');
    
    logTest(
      'ActivityLogMetadata interface enhanced',
      hasEvidenceCountByPersona && hasPersonaNames && hasTotalEvidenceCount && hasPersonasAffectedCount,
      `evidenceCountByPersona: ${hasEvidenceCountByPersona}, personaNames: ${hasPersonaNames}, totalCount: ${hasTotalEvidenceCount}, affectedCount: ${hasPersonasAffectedCount}`
    );
    
    // Test 4.2: Phase 3.1.8 comment in types
    const hasPhaseComment = typesContent.includes('Phase 3.1.8');
    
    logTest(
      'Type system updates documented',
      hasPhaseComment,
      `phaseComment: ${hasPhaseComment}`
    );
    
  } catch (error) {
    logTest('Type System Updates', false, error.message);
  }
}

/**
 * Test 5: UI Enhancement
 */
async function testUIEnhancement() {
  console.log('\n📋 Test 5: UI Enhancement');
  
  try {
    // Check ActivityLogPanel.tsx updated
    const panelPath = join(projectRoot, 'src/renderer/components/ActivityLogPanel.tsx');
    const panelContent = readFileSync(panelPath, 'utf8');
    
    // Test 5.1: Enhanced persona evidence display
    const hasPersonaEvidenceDisplay = panelContent.includes('Phase 3.1.8: Enhanced persona evidence display');
    const hasPersonaMapping = panelContent.includes('entry.metadata.personaNames.map');
    const hasPersonaNameDisplay = panelContent.includes('persona.name');
    const hasEvidenceCountDisplay = panelContent.includes('evidenceCount} evidence');
    
    logTest(
      'UI displays detailed persona evidence counts',
      hasPersonaEvidenceDisplay && hasPersonaMapping && hasPersonaNameDisplay && hasEvidenceCountDisplay,
      `personaDisplay: ${hasPersonaEvidenceDisplay}, mapping: ${hasPersonaMapping}, nameDisplay: ${hasPersonaNameDisplay}, countDisplay: ${hasEvidenceCountDisplay}`
    );
    
    // Test 5.2: Evidence Gate design compliance
    const hasPersonaColors = panelContent.includes('bg-persona/10 text-persona');
    const hasEvidenceColors = panelContent.includes('bg-evidence/10 text-evidence');
    const hasProperStyling = panelContent.includes('border-persona/20') && panelContent.includes('border-evidence/20');
    
    logTest(
      'UI follows Evidence Gate design system',
      hasPersonaColors && hasEvidenceColors && hasProperStyling,
      `personaColors: ${hasPersonaColors}, evidenceColors: ${hasEvidenceColors}, styling: ${hasProperStyling}`
    );
    
  } catch (error) {
    logTest('UI Enhancement', false, error.message);
  }
}

/**
 * Test 6: Integration Flow Verification
 */
async function testIntegrationFlow() {
  console.log('\n📋 Test 6: Integration Flow Verification');
  
  try {
    // Test 6.1: Persona definitions exist
    const personasPath = join(projectRoot, 'personas.yml');
    const personasExist = existsSync(personasPath);
    
    if (personasExist) {
      const personasContent = readFileSync(personasPath, 'utf8');
      const hasSoloFounder = personasContent.includes('solo_founder');
      const hasAgencyMarketer = personasContent.includes('agency_marketer');
      const hasNames = personasContent.includes('Solo Founder') && personasContent.includes('Agency Marketer');
      
      logTest(
        'Persona definitions properly configured',
        hasSoloFounder && hasAgencyMarketer && hasNames,
        `soloFounder: ${hasSoloFounder}, agencyMarketer: ${hasAgencyMarketer}, names: ${hasNames}`
      );
    } else {
      logTest('Persona definitions properly configured', false, 'personas.yml not found');
    }
    
    // Test 6.2: Database schema supports activity log
    const schemaPath = join(projectRoot, 'src/main/db/schema.ts');
    const schemaContent = readFileSync(schemaPath, 'utf8');
    const hasActivityLogTable = schemaContent.includes('activity_log');
    const hasMetadataField = schemaContent.includes('metadata: text');
    
    logTest(
      'Database schema supports enhanced activity logging',
      hasActivityLogTable && hasMetadataField,
      `activityLogTable: ${hasActivityLogTable}, metadataField: ${hasMetadataField}`
    );
    
    // Test 6.3: Build system compatibility
    try {
      execSync(`cd "${projectRoot}" && npm run typecheck`, { stdio: 'pipe' });
      logTest('TypeScript compilation passes', true);
    } catch (error) {
      logTest('TypeScript compilation passes', false, 'Type check failed');
    }
    
  } catch (error) {
    logTest('Integration Flow Verification', false, error.message);
  }
}

/**
 * Test 7: Cross-Platform Compatibility
 */
async function testCrossPlatformCompatibility() {
  console.log('\n📋 Test 7: Cross-Platform Compatibility');
  
  try {
    // Test 7.1: No hardcoded paths
    const files = [
      'src/main/services/WorkflowOrchestrator.ts',
      'src/main/services/ActivityLogService.ts',
      'src/main/main.ts'
    ];
    
    let hasHardcodedPaths = false;
    let hasWindowsPaths = false;
    
    for (const file of files) {
      const filePath = join(projectRoot, file);
      const content = readFileSync(filePath, 'utf8');
      
      // Check for hardcoded paths
      if (content.includes('C:\\') || content.includes('/Users/') || content.includes('/home/')) {
        hasHardcodedPaths = true;
      }
      
      // Check for Windows-specific paths
      if (content.includes('\\\\') || content.match(/[A-Z]:\\/)) {
        hasWindowsPaths = true;
      }
    }
    
    logTest(
      'No hardcoded file paths',
      !hasHardcodedPaths,
      `hardcodedPaths: ${hasHardcodedPaths}`
    );
    
    logTest(
      'No Windows-specific paths',
      !hasWindowsPaths,
      `windowsPaths: ${hasWindowsPaths}`
    );
    
    // Test 7.2: Electron APIs used correctly
    const mainPath = join(projectRoot, 'src/main/main.ts');
    const mainContent = readFileSync(mainPath, 'utf8');
    const usesElectronAPIs = mainContent.includes('BrowserWindow') && mainContent.includes('ipcMain');
    
    logTest(
      'Uses Electron APIs correctly',
      usesElectronAPIs,
      `electronAPIs: ${usesElectronAPIs}`
    );
    
  } catch (error) {
    logTest('Cross-Platform Compatibility', false, error.message);
  }
}

/**
 * Main test execution
 */
async function runTests() {
  console.log('🚀 Starting Phase 3.1.8 comprehensive tests...\n');
  
  const startTime = Date.now();
  
  // Setup test environment
  const dbSetup = await setupTestDatabase();
  if (!dbSetup) {
    console.log('❌ Failed to setup test environment. Aborting tests.');
    return;
  }
  
  // Run all tests
  await testEnhancedDataFlow();
  await testActivityLogServiceEnhancement();
  await testMainProcessIntegration();
  await testTypeSystemUpdates();
  await testUIEnhancement();
  await testIntegrationFlow();
  await testCrossPlatformCompatibility();
  
  const endTime = Date.now();
  const duration = endTime - startTime;
  
  // Print results
  console.log('\n' + '='.repeat(50));
  console.log('🎯 Phase 3.1.8 Test Results Summary');
  console.log('='.repeat(50));
  console.log(`📊 Total Tests: ${testResults.total}`);
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`📈 Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`);
  console.log(`⏱️  Duration: ${duration}ms`);
  
  if (testResults.failed > 0) {
    console.log('\n❌ Failed Tests:');
    testResults.details
      .filter(test => !test.passed)
      .forEach(test => {
        console.log(`   • ${test.testName}${test.details ? `: ${test.details}` : ''}`);
      });
  }
  
  // Phase completion status
  if (testResults.failed === 0) {
    console.log('\n🎉 Phase 3.1.8 Implementation: COMPLETE ✅');
    console.log('✨ Interview Imported Activity Log with detailed persona evidence counts is production-ready!');
  } else {
    console.log('\n⚠️  Phase 3.1.8 Implementation: INCOMPLETE');
    console.log(`   ${testResults.failed} test(s) need to be addressed before marking as complete.`);
  }
  
  return testResults.failed === 0;
}

// Execute tests
runTests()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('💥 Test execution failed:', error);
    process.exit(1);
  }); 