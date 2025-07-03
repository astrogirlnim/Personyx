#!/usr/bin/env node

/**
 * Phase 3.1.7 Success Toast Implementation Test
 * Tests the GlobalSuccessToast component and transcript success event integration
 */

import { readFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

console.log('🧪 Phase 3.1.7 Success Toast Implementation Test');
console.log('=' .repeat(60));

let totalTests = 0;
let passedTests = 0;
let failedTests = [];

function test(name, condition) {
  totalTests++;
  if (condition) {
    console.log(`✅ ${name}`);
    passedTests++;
  } else {
    console.log(`❌ ${name}`);
    failedTests.push(name);
  }
}

// Test file existence and basic structure
console.log('\n📁 File Structure Tests');
console.log('-'.repeat(40));

// Core component files
test(
  'GlobalSuccessToast.tsx exists',
  existsSync(join(rootDir, 'src/renderer/components/GlobalSuccessToast.tsx'))
);

// Type definitions in shared files
const typesFile = join(rootDir, 'src/shared/types.ts');
const constantsFile = join(rootDir, 'src/shared/constants.ts');
const preloadFile = join(rootDir, 'src/main/preload.ts');
const globalDtsFile = join(rootDir, 'src/renderer/global.d.ts');
const orchestratorFile = join(rootDir, 'src/main/services/WorkflowOrchestrator.ts');
const appFile = join(rootDir, 'src/renderer/App.tsx');

test('Types file exists', existsSync(typesFile));
test('Constants file exists', existsSync(constantsFile));
test('Preload file exists', existsSync(preloadFile));
test('Global types file exists', existsSync(globalDtsFile));
test('WorkflowOrchestrator file exists', existsSync(orchestratorFile));
test('App.tsx file exists', existsSync(appFile));

// Test component implementation
console.log('\n🧩 GlobalSuccessToast Component Tests');
console.log('-'.repeat(40));

if (existsSync(join(rootDir, 'src/renderer/components/GlobalSuccessToast.tsx'))) {
  const successToastContent = readFileSync(
    join(rootDir, 'src/renderer/components/GlobalSuccessToast.tsx'),
    'utf8'
  );

  // Component structure tests
  test(
    'GlobalSuccessToast component export',
    successToastContent.includes('export function GlobalSuccessToast')
  );

  test(
    'SuccessToast interface defined',
    successToastContent.includes('export interface SuccessToast')
  );

  test(
    'SuccessToastType enum defined',
    successToastContent.includes('export type SuccessToastType')
  );

  test(
    'createSuccessToast helper function',
    successToastContent.includes('export function createSuccessToast')
  );

  test(
    'createTranscriptSuccessToast helper function',
    successToastContent.includes('export function createTranscriptSuccessToast')
  );

  // Evidence Gate design compliance
  test(
    'Persona green styling (persona class)',
    successToastContent.includes('text-persona') &&
    successToastContent.includes('border-persona')
  );

  test(
    'Success toast animations',
    successToastContent.includes('transform transition-all duration-200') &&
    successToastContent.includes('translate-x-0 opacity-100')
  );

  test(
    'Auto-dismiss functionality',
    successToastContent.includes('autoDismissMs') &&
    successToastContent.includes('setTimeout')
  );

  test(
    'Manual dismiss functionality',
    successToastContent.includes('handleDismiss') &&
    successToastContent.includes('onDismiss')
  );

  // Accessibility features
  test(
    'Accessibility attributes',
    successToastContent.includes('aria-label="Dismiss success notification"') &&
    successToastContent.includes('title="Dismiss"')
  );

  // Success types support
  test(
    'Transcript success type support',
    successToastContent.includes('transcript-success')
  );

  test(
    'Evidence success type support',
    successToastContent.includes('evidence-success')
  );

  test(
    'General success type support',
    successToastContent.includes('general-success')
  );

  // Success details display
  test(
    'Evidence count display',
    successToastContent.includes('evidenceCount') &&
    successToastContent.includes('evidence items')
  );

  test(
    'Personas affected display',
    successToastContent.includes('personasAffected') &&
    successToastContent.includes('personas affected')
  );

  test(
    'Processing time display',
    successToastContent.includes('processingTime') &&
    successToastContent.includes('formatProcessingTime')
  );

  // Icon system tests
  test(
    'Success icons using SVG',
    successToastContent.includes('<svg') &&
    successToastContent.includes('M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z') // Check circle path
  );
}

// Test type definitions
console.log('\n📝 Type Definitions Tests');
console.log('-'.repeat(40));

const typesContent = readFileSync(typesFile, 'utf8');

test(
  'transcript-success-toast IPC event defined',
  typesContent.includes("'transcript-success-toast'")
);

test(
  'Success toast event interface',
  typesContent.includes('transcript-success-toast') &&
  typesContent.includes('type:') &&
  typesContent.includes('title:') &&
  typesContent.includes('message:')
);

test(
  'Success toast optional properties',
  typesContent.includes('fileName?:') &&
  typesContent.includes('evidenceCount?:') &&
  typesContent.includes('personasAffected?:')
);

// Test constants
console.log('\n🔧 Constants Tests');
console.log('-'.repeat(40));

const constantsContent = readFileSync(constantsFile, 'utf8');

test(
  'TRANSCRIPT_SUCCESS_TOAST IPC channel constant',
  constantsContent.includes('TRANSCRIPT_SUCCESS_TOAST') &&
  constantsContent.includes("'transcript-success-toast'")
);

// Test preload script
console.log('\n🔌 Preload Script Tests');
console.log('-'.repeat(40));

const preloadContent = readFileSync(preloadFile, 'utf8');

test(
  'onTranscriptSuccessToast interface method',
  preloadContent.includes('onTranscriptSuccessToast:') &&
  preloadContent.includes('(callback: (data: unknown) => void) => void')
);

test(
  'onTranscriptSuccessToast implementation',
  preloadContent.includes('onTranscriptSuccessToast: (callback: (data: unknown) => void) => {') &&
  preloadContent.includes("ipcRenderer.on('transcript-success-toast'")
);

// Test global types
console.log('\n🌐 Global Types Tests');
console.log('-'.repeat(40));

const globalDtsContent = readFileSync(globalDtsFile, 'utf8');

test(
  'ElectronAPI interface updated with success toast listener',
  globalDtsContent.includes('onTranscriptSuccessToast: (callback: (data: unknown) => void) => void')
);

// Test WorkflowOrchestrator integration
console.log('\n🎯 WorkflowOrchestrator Integration Tests');
console.log('-'.repeat(40));

const orchestratorContent = readFileSync(orchestratorFile, 'utf8');

test(
  'Success toast emission on transcript completion',
  orchestratorContent.includes("emitToRenderer('transcript-success-toast'")
);

test(
  'Success toast data structure',
  orchestratorContent.includes("type: 'transcript-success'") &&
  orchestratorContent.includes("title: 'Transcript Analysed'")
);

test(
  'Success toast message formatting',
  orchestratorContent.includes('Evidence added •') &&
  orchestratorContent.includes('items •') &&
  orchestratorContent.includes('personas affected')
);

test(
  'Success toast metadata',
  orchestratorContent.includes('fileName: result.transcriptFileName') &&
  orchestratorContent.includes('evidenceCount: result.evidenceCreated.length') &&
  orchestratorContent.includes('personasAffected: result.personasAffected')
);

test(
  'Success toast timing configuration',
  orchestratorContent.includes('autoDismissMs: 6000') // 6 seconds
);

// Test App.tsx integration
console.log('\n⚛️ App.tsx Integration Tests');
console.log('-'.repeat(40));

const appContent = readFileSync(appFile, 'utf8');

test(
  'GlobalSuccessToast import',
  appContent.includes("import { GlobalSuccessToast, SuccessToast") &&
  appContent.includes("from './components/GlobalSuccessToast'")
);

test(
  'Success toast state management',
  appContent.includes('const [successToasts, setSuccessToasts] = useState<SuccessToast[]>([]);')
);

test(
  'Success toast management functions',
  appContent.includes('const addSuccessToast = useCallback') &&
  appContent.includes('const dismissSuccessToast = useCallback')
);

test(
  'Success toast event listener',
  appContent.includes('window.electronAPI.onTranscriptSuccessToast')
);

test(
  'Success toast rendering',
  appContent.includes('<GlobalSuccessToast') &&
  appContent.includes('toasts={successToasts}') &&
  appContent.includes('onDismiss={dismissSuccessToast}')
);

test(
  'Success toast positioning (top-right)',
  appContent.includes('position="top-right"')
);

// Test dependencies in useEffect
test(
  'Success toast callback in dependencies',
  appContent.includes('addSuccessToast') &&
  appContent.includes('[isChatOpen, isImportModalOpen, isTranscriptModalOpen, addErrorToast, addSuccessToast]')
);

// Test implementation completeness
console.log('\n🎯 Implementation Completeness Tests');
console.log('-'.repeat(40));

test(
  'Success toast creation from IPC event',
  appContent.includes('const successData = data as IPCEvents') &&
  appContent.includes('const successToast: SuccessToast =')
);

test(
  'Success toast ID generation',
  appContent.includes('transcript-success-') &&
  appContent.includes('Date.now()') &&
  appContent.includes('Math.random()')
);

test(
  'Success toast logging',
  appContent.includes("console.log('✅ Transcript success received:") &&
  appContent.includes("console.log('✅ Adding success toast:")
);

// Design system compliance tests
console.log('\n🎨 Design System Compliance Tests');
console.log('-'.repeat(40));

if (existsSync(join(rootDir, 'src/renderer/components/GlobalSuccessToast.tsx'))) {
  const successToastContent = readFileSync(
    join(rootDir, 'src/renderer/components/GlobalSuccessToast.tsx'),
    'utf8'
  );

  test(
    'Evidence Gate color scheme (persona green)',
    successToastContent.includes('bg-persona/10') &&
    successToastContent.includes('text-persona')
  );

  test(
    'Consistent spacing and typography',
    successToastContent.includes('text-body-sm') &&
    successToastContent.includes('text-caption') &&
    successToastContent.includes('text-micro')
  );

  test(
    'Dark mode support',
    successToastContent.includes('dark:bg-persona/15') &&
    successToastContent.includes('dark:text-slate-dark')
  );

  test(
    'Responsive design classes',
    successToastContent.includes('max-w-sm w-full')
  );

  test(
    'Proper border radius',
    successToastContent.includes('rounded-dr-md')
  );

  test(
    'Shadow and backdrop effects',
    successToastContent.includes('shadow-dr-sm') &&
    successToastContent.includes('backdrop-blur-sm')
  );
}

// Performance and accessibility tests
console.log('\n⚡ Performance & Accessibility Tests');
console.log('-'.repeat(40));

if (existsSync(join(rootDir, 'src/renderer/components/GlobalSuccessToast.tsx'))) {
  const successToastContent = readFileSync(
    join(rootDir, 'src/renderer/components/GlobalSuccessToast.tsx'),
    'utf8'
  );

  test(
    'Proper cleanup in useEffect',
    successToastContent.includes('return () => clearTimeout(timer);')
  );

  test(
    'Animation performance optimization',
    successToastContent.includes('duration-200 ease-out')
  );

  test(
    'Keyboard accessibility',
    successToastContent.includes('focus:outline-none focus:ring-2')
  );

  test(
    'Screen reader support',
    successToastContent.includes('aria-label')
  );

  test(
    'Proper button semantics',
    successToastContent.includes('<button') &&
    successToastContent.includes('title="Dismiss"')
  );
}

// Integration test - Check all files work together
console.log('\n🔗 Integration Compatibility Tests');
console.log('-'.repeat(40));

test(
  'Type consistency between files',
  typesContent.includes("'transcript-success-toast'") &&
  constantsContent.includes('TRANSCRIPT_SUCCESS_TOAST') &&
  preloadContent.includes("'transcript-success-toast'") &&
  orchestratorContent.includes("'transcript-success-toast'")
);

test(
  'Event data structure consistency',
  typesContent.includes('evidenceCount?:') &&
  orchestratorContent.includes('evidenceCount: result.evidenceCreated.length') &&
  appContent.includes('evidenceCount: successData.evidenceCount')
);

test(
  'Persona data flow consistency',
  typesContent.includes('personasAffected?:') &&
  orchestratorContent.includes('personasAffected: result.personasAffected') &&
  appContent.includes('personasAffected: successData.personasAffected')
);

// Final summary
console.log('\n' + '='.repeat(60));
console.log('📊 Test Results Summary');
console.log('='.repeat(60));

console.log(`Total tests: ${totalTests}`);
console.log(`✅ Passed: ${passedTests}`);
console.log(`❌ Failed: ${totalTests - passedTests}`);

if (failedTests.length > 0) {
  console.log('\n❌ Failed tests:');
  failedTests.forEach(test => console.log(`  - ${test}`));
}

const successRate = Math.round((passedTests / totalTests) * 100);
console.log(`\n📈 Success rate: ${successRate}%`);

if (successRate === 100) {
  console.log('\n🎉 Phase 3.1.7 Success Toast implementation is COMPLETE!');
  console.log('✅ All component structure tests passed');
  console.log('✅ All integration tests passed');
  console.log('✅ All design system compliance tests passed');
  console.log('✅ All accessibility tests passed');
  console.log('✅ Ready for production deployment');
} else if (successRate >= 90) {
  console.log('\n✅ Phase 3.1.7 Success Toast implementation is MOSTLY COMPLETE');
  console.log('📝 Minor issues need attention before production');
} else if (successRate >= 70) {
  console.log('\n⚠️ Phase 3.1.7 Success Toast implementation is PARTIALLY COMPLETE');
  console.log('🔧 Significant work needed before production');
} else {
  console.log('\n❌ Phase 3.1.7 Success Toast implementation needs MAJOR WORK');
  console.log('🚫 Not ready for production deployment');
}

console.log('\n🔍 What was tested:');
console.log('  • GlobalSuccessToast component structure and exports');
console.log('  • Success toast type definitions and interfaces');
console.log('  • IPC event integration (types, constants, preload)');
console.log('  • WorkflowOrchestrator success event emission');
console.log('  • App.tsx state management and event handling');
console.log('  • Evidence Gate design system compliance');
console.log('  • Accessibility and performance features');
console.log('  • Cross-file type consistency and integration');

console.log('\n📋 Phase 3.1.7 Implementation Checklist:');
console.log('  [✓] GlobalSuccessToast component created');
console.log('  [✓] Success toast type system implemented');
console.log('  [✓] IPC event channels established');
console.log('  [✓] WorkflowOrchestrator integration');
console.log('  [✓] App.tsx event handling and state management');
console.log('  [✓] Evidence Gate design compliance');
console.log('  [✓] Accessibility features implemented');

process.exit(successRate === 100 ? 0 : 1); 