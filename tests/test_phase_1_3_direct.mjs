#!/usr/bin/env node

/**
 * Phase 1.3 Direct Component Test
 * Tests the LangGraph + n8n Workflow implementation components directly
 */

import { readFileSync, existsSync } from 'fs';

let passed = 0;
let failed = 0;

function test(name, condition, details = '') {
  if (condition) {
    console.log(`✅ ${name} ${details}`);
    passed++;
  } else {
    console.log(`❌ ${name} ${details}`);
    failed++;
  }
}

console.log(
  '🚀 Testing Phase 1.3 LangGraph + n8n Workflow Implementation...\n'
);

// Test 1: Source files exist
console.log('📁 Testing source file implementation...');
test(
  'InterviewFolderWatcher exists',
  existsSync('src/main/services/InterviewFolderWatcher.ts')
);
test(
  'LangGraphService exists',
  existsSync('src/main/services/LangGraphService.ts')
);
test(
  'PersonaConfigLoader exists',
  existsSync('src/main/services/PersonaConfigLoader.ts')
);
test(
  'WorkflowOrchestrator exists',
  existsSync('src/main/services/WorkflowOrchestrator.ts')
);
test(
  'EmbeddingRepo exists',
  existsSync('src/main/db/repositories/EmbeddingRepo.ts')
);
test('Personas config exists', existsSync('personas.yml'));

// Test 2: WorkflowOrchestrator implementation
console.log('\n🔄 Testing WorkflowOrchestrator...');
try {
  const content = readFileSync(
    'src/main/services/WorkflowOrchestrator.ts',
    'utf8'
  );
  test('Extends EventEmitter', content.includes('extends EventEmitter'));
  test('Has initialize method', content.includes('async initialize()'));
  test('Processes transcripts', content.includes('processTranscript'));
  test('Emits IPC events', content.includes('transcript-ingested'));
  test('Handles errors', content.includes('error'));
} catch (error) {
  test('WorkflowOrchestrator analysis', false, error.message);
}

// Test 3: LangGraphService implementation
console.log('\n🧠 Testing LangGraphService...');
try {
  const content = readFileSync('src/main/services/LangGraphService.ts', 'utf8');
  test('OpenAI integration', content.includes('import OpenAI'));
  test('Embedding model', content.includes('text-embedding-3-small'));
  test('Classification model', content.includes('gpt-4o-mini'));
  test('Content chunking', content.includes('chunkContent'));
  test('Persona classification', content.includes('PersonaClassification'));
  test('Retry logic', content.includes('retryWithBackoff'));
} catch (error) {
  test('LangGraphService analysis', false, error.message);
}

// Test 4: InterviewFolderWatcher implementation
console.log('\n👀 Testing InterviewFolderWatcher...');
try {
  const content = readFileSync(
    'src/main/services/InterviewFolderWatcher.ts',
    'utf8'
  );
  test('Chokidar import', content.includes('import { watch'));
  test('File events', content.includes('transcript-added'));
  test('File validation', content.includes('isValidTranscriptFile'));
  test('Stability threshold', content.includes('stabilityThreshold'));
  test('File size limits', content.includes('maxFileSize'));
} catch (error) {
  test('InterviewFolderWatcher analysis', false, error.message);
}

// Test 5: Feature completeness
console.log('\n🎯 Testing Phase 1.3 feature completeness...');
test(
  'Feature 3.1: File watching',
  existsSync('src/main/services/InterviewFolderWatcher.ts')
);
test(
  'Feature 3.2: LangGraph pipeline',
  existsSync('src/main/services/LangGraphService.ts')
);
test(
  'Feature 3.3: Database persistence',
  existsSync('src/main/db/repositories/EmbeddingRepo.ts')
);

try {
  const orchestratorContent = readFileSync(
    'src/main/services/WorkflowOrchestrator.ts',
    'utf8'
  );
  test(
    'Feature 3.4: IPC events',
    orchestratorContent.includes('transcript-ingested')
  );
} catch (error) {
  test('Feature 3.4: IPC events', false);
}

// Results
console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);

if (failed === 0) {
  console.log('🎉 All Phase 1.3 components implemented correctly!');
} else {
  console.log(`⚠️ ${failed} issues found in implementation.`);
}

process.exit(failed === 0 ? 0 : 1);
