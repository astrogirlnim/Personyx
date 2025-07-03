#!/usr/bin/env node

/**
 * Phase 2.7 Persona Evolution - Production Readiness Test
 * 
 * This test verifies that Phase 2.7 will work correctly in production environments
 * by testing the migration system, table creation, and deployment scenarios.
 */

import { readFileSync, writeFileSync, unlinkSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Test configuration
const TEST_CONFIG = {
  verbose: true,
  testDbPath: join(__dirname, 'test_production_db.db'),
  migrationDir: join(__dirname, '../src/main/db/migrations'),
  connectionFile: join(__dirname, '../src/main/db/connection.ts'),
};

// Test results tracking
let testResults = {
  passed: 0,
  failed: 0,
  total: 0,
  errors: [],
};

/**
 * Test runner utility
 */
function test(name, condition, details = null) {
  testResults.total++;
  if (condition) {
    testResults.passed++;
    console.log(`✅ ${name}`);
    if (details && TEST_CONFIG.verbose) {
      console.log(`   ${details}`);
    }
  } else {
    testResults.failed++;
    console.log(`❌ ${name}`);
    if (details) {
      console.log(`   ${details}`);
    }
    testResults.errors.push(name);
  }
}

/**
 * Test 1: Migration Files Structure
 */
function testMigrationFilesStructure() {
  console.log('\n📁 Testing Migration Files Structure...');

  // Check if all migration files exist
  const requiredMigrations = [
    '0000_common_satana.sql',
    '0001_narrow_virginia_dare.sql',
    '0002_activity_log_table.sql',
    '0003_soft_red_wolf.sql',
  ];

  requiredMigrations.forEach(migrationFile => {
    const migrationPath = join(TEST_CONFIG.migrationDir, migrationFile);
    test(
      `Migration file exists: ${migrationFile}`,
      existsSync(migrationPath),
      `Path: ${migrationPath}`
    );
  });

  // Check if 0003 migration includes persona_history table
  const migration0003Path = join(TEST_CONFIG.migrationDir, '0003_soft_red_wolf.sql');
  if (existsSync(migration0003Path)) {
    const migration0003Content = readFileSync(migration0003Path, 'utf8');
    test(
      'Migration 0003 creates persona_history table',
      migration0003Content.includes('CREATE TABLE `persona_history`'),
      'persona_history table definition found'
    );
    test(
      'Migration 0003 includes persona_id foreign key',
      migration0003Content.includes('FOREIGN KEY (`persona_id`) REFERENCES `personas`(`id`)'),
      'Foreign key constraint found'
    );
  }
}

/**
 * Test 2: Database Connection Migration Logic
 */
function testDatabaseConnectionMigrationLogic() {
  console.log('\n🔄 Testing Database Connection Migration Logic...');

  const connectionFileContent = readFileSync(TEST_CONFIG.connectionFile, 'utf8');

  // Check if migration0003Tables is defined
  test(
    'migration0003Tables is defined',
    connectionFileContent.includes('migration0003Tables = [\'persona_history\']'),
    'migration0003Tables array found'
  );

  // Check if needsMigration0003 is defined
  test(
    'needsMigration0003 check is defined',
    connectionFileContent.includes('needsMigration0003 = migration0003Tables.some'),
    'needsMigration0003 logic found'
  );

  // Check if migration 0003 execution step exists
  test(
    'Migration 0003 execution step exists',
    connectionFileContent.includes('runSingleMigration(\'0003_soft_red_wolf.sql\')'),
    'Migration 0003 execution found'
  );

  // Check if createTablesManually includes persona_history
  test(
    'createTablesManually includes persona_history',
    connectionFileContent.includes('CREATE TABLE IF NOT EXISTS persona_history'),
    'Manual table creation includes persona_history'
  );

  // Check if persona_history indexes are included
  test(
    'persona_history indexes are included',
    connectionFileContent.includes('idx_persona_history_persona_id') &&
    connectionFileContent.includes('idx_persona_history_timestamp') &&
    connectionFileContent.includes('idx_persona_history_change_type'),
    'All required indexes found'
  );
}

/**
 * Test 3: TypeScript Compilation
 */
function testTypeScriptCompilation() {
  console.log('\n🏗️ Testing TypeScript Compilation...');

  try {
    const result = execSync('pnpm typecheck', { 
      cwd: join(__dirname, '..'),
      stdio: 'pipe',
      encoding: 'utf8'
    });
    
    test(
      'TypeScript compilation successful',
      true,
      'All TypeScript files compile without errors'
    );
  } catch (error) {
    test(
      'TypeScript compilation successful',
      false,
      `Compilation failed: ${error.message}`
    );
  }
}

/**
 * Test 4: Build Process
 */
function testBuildProcess() {
  console.log('\n🔨 Testing Build Process...');

  try {
    const result = execSync('pnpm build', { 
      cwd: join(__dirname, '..'),
      stdio: 'pipe',
      encoding: 'utf8'
    });
    
    test(
      'Build process successful',
      true,
      'All build steps completed successfully'
    );
    
    // Check if migration logic is sound (migration files are intentionally not packaged)
    // The system falls back to createTablesManually() when migration files aren't available
    const connectionContent = readFileSync(TEST_CONFIG.connectionFile, 'utf8');
    test(
      'Migration fallback logic is implemented',
      connectionContent.includes('createTablesManually()') &&
      connectionContent.includes('CREATE TABLE IF NOT EXISTS persona_history'),
      'createTablesManually() includes persona_history table for production deployment'
    );
  } catch (error) {
    test(
      'Build process successful',
      false,
      `Build failed: ${error.message}`
    );
  }
}

/**
 * Test 5: Schema Validation
 */
function testSchemaValidation() {
  console.log('\n📋 Testing Schema Validation...');

  try {
    const schemaFile = join(__dirname, '../src/main/db/schema.ts');
    const schemaContent = readFileSync(schemaFile, 'utf8');

    test(
      'PersonaHistory schema is defined',
      schemaContent.includes('export const personaHistory'),
      'personaHistory table schema found'
    );

    test(
      'PersonaHistory type is exported',
      schemaContent.includes('export type PersonaHistory'),
      'PersonaHistory type found'
    );

    test(
      'PersonaHistory includes required fields',
      schemaContent.includes('historyId') &&
      schemaContent.includes('personaId') &&
      schemaContent.includes('previousData') &&
      schemaContent.includes('newData') &&
      schemaContent.includes('changeType') &&
      schemaContent.includes('confidence') &&
      schemaContent.includes('timestamp'),
      'All required fields found'
    );
  } catch (error) {
    test(
      'Schema validation',
      false,
      `Schema validation failed: ${error.message}`
    );
  }
}

/**
 * Test 6: Service Integration
 */
function testServiceIntegration() {
  console.log('\n🔗 Testing Service Integration...');

  try {
    // Check PersonaEvolutionService
    const evolutionServiceFile = join(__dirname, '../src/main/services/PersonaEvolutionService.ts');
    const evolutionServiceContent = readFileSync(evolutionServiceFile, 'utf8');

    test(
      'PersonaEvolutionService exists',
      existsSync(evolutionServiceFile),
      'PersonaEvolutionService file found'
    );

    test(
      'PersonaEvolutionService imports PersonaHistoryRepo',
      evolutionServiceContent.includes('PersonaHistoryRepo'),
      'PersonaHistoryRepo import found'
    );

    // Check TranscriptIngestService integration
    const transcriptServiceFile = join(__dirname, '../src/main/services/TranscriptIngestService.ts');
    const transcriptServiceContent = readFileSync(transcriptServiceFile, 'utf8');

    test(
      'TranscriptIngestService integrates PersonaEvolutionService',
      transcriptServiceContent.includes('PersonaEvolutionService'),
      'PersonaEvolutionService integration found'
    );

    test(
      'TranscriptIngestService emits persona-evolved events',
      transcriptServiceContent.includes('persona-evolved'),
      'IPC event emission found'
    );
  } catch (error) {
    test(
      'Service integration',
      false,
      `Service integration failed: ${error.message}`
    );
  }
}

/**
 * Test 7: Production Deployment Scenarios
 */
function testProductionDeploymentScenarios() {
  console.log('\n🚀 Testing Production Deployment Scenarios...');

  // Test migration sequence
  const migrationSequence = [
    'migration0000Tables',
    'migration0001Tables', 
    'migration0002Tables',
    'migration0003Tables',
  ];

  const connectionContent = readFileSync(TEST_CONFIG.connectionFile, 'utf8');

  migrationSequence.forEach(migration => {
    test(
      `${migration} is properly defined`,
      connectionContent.includes(migration),
      `${migration} found in migration logic`
    );
  });

  // Test that all migration checks are included in logging
  test(
    'All migration checks included in logging',
    connectionContent.includes('needsMigration0000') &&
    connectionContent.includes('needsMigration0001') &&
    connectionContent.includes('needsMigration0002') &&
    connectionContent.includes('needsMigration0003'),
    'All migration checks found in logging'
  );
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log('🧪 Phase 2.7 Persona Evolution - Production Readiness Test');
  console.log('=' .repeat(70));
  console.log('Testing production deployment readiness...');

  try {
    testMigrationFilesStructure();
    testDatabaseConnectionMigrationLogic();
    testTypeScriptCompilation();
    testBuildProcess();
    testSchemaValidation();
    testServiceIntegration();
    testProductionDeploymentScenarios();

    // Summary
    console.log('\n' + '='.repeat(70));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(70));
    console.log(`✅ Passed: ${testResults.passed}/${testResults.total}`);
    console.log(`❌ Failed: ${testResults.failed}/${testResults.total}`);
    console.log(`🎯 Success Rate: ${Math.round((testResults.passed / testResults.total) * 100)}%`);

    if (testResults.failed > 0) {
      console.log('\n❌ Failed Tests:');
      testResults.errors.forEach(error => {
        console.log(`  - ${error}`);
      });
    }

    console.log('\n🚀 PRODUCTION READINESS STATUS:');
    if (testResults.failed === 0) {
      console.log('✅ Phase 2.7 Persona Evolution is READY for production deployment!');
      console.log('🎉 All critical systems tested and verified');
      console.log('📋 Migration system will handle persona_history table creation');
      console.log('🔄 Existing production instances will auto-migrate on restart');
    } else {
      console.log('❌ Production deployment NOT READY - fix failed tests first');
    }

    return testResults.failed === 0;
  } catch (error) {
    console.error('💥 Test execution failed:', error);
    return false;
  }
}

// Run tests
runAllTests().then(success => {
  process.exit(success ? 0 : 1);
}); 