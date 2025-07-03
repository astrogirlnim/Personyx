# System Patterns – The "How"

_Last updated: 2025-01-20_

## High‑Level Architecture (Current Implementation)

```
Tray UI (React) ── drop PRD ─► File Ingest ─► LangGraph (embed+classify)
          ▲                                              │
          │  IPC events                                  ▼
    VS Code Panel ◄─────── SQLite (personas, evidence, docs, scores, embeddings)
          ▲                         ▲                    ▲
          │ Chat Q&A                │ Evidence scores    │ Vector search
Notion Scorecard ◄──── Evidence Engine ◄──── Embedding Retrieval
          ▲                                              ▲
          │ Export deck                                  │
Slack Bot / Linear Labeler ◄─── Hybrid AI Provider ────┘
                                        │
                                        ▼
                              [Firebase Provider] ⟷ [OpenAI Provider]
                                     │                     │
                                     ▼                     ▼
                             Firebase Auth            Direct API
                             Cloud Functions         (User Keys)
                             (Managed Service)
                                     ▲
                                     │
                          Third-Party Token Management
                                     │
                                     ▼
                          [VSCode] [Slack] [Apple Notes]
                              │       │         │
                              ▼       ▼         ▼
                         GitHub PAT  Bot Token  Future API
                         (ghp_*/     (xoxb-*)   (Placeholder)
                          github_pat_*)

                Development Infrastructure Layer
                          │
                          ▼
        Node.js Version Management → Native Module Context → Development Pipeline
               │                           │                        │
               ▼                           ▼                        ▼
          .nvmrc + Volta           rebuild-for-electron      Enhanced dev.sh
          check-node-version.js    rebuild-for-node          Comprehensive Validation
```

## Key Design Decisions

| Decision                                | Reason                                                                             |
| --------------------------------------- | ---------------------------------------------------------------------------------- |
| **Electron 28 + TypeScript**            | Rapid cross‑platform desktop shell with mature tray APIs and native file access.   |
| **React 18 + Tailwind CSS**             | Modern UI framework with responsive design system and component reusability.       |
| **Event‑driven IPC (Electron ⇄ Core)**  | Decouples UI from backend processing with type-safe communication.                 |
| **SQLite + Drizzle ORM**                | Zero‑setup DB with typed migrations; lives inside user profile with encryption.    |
| **LangGraph + OpenAI pipeline**         | Modular chain for embeddings, persona classification, and evidence scoring.        |
| **Firebase + Cloud Functions**          | Managed embedding service with authentication and automatic scaling.               |
| **Hybrid AI Provider System**           | User choice between self-managed keys and managed service with automatic fallback. |
| **AES‑256-GCM TokenVault**              | Keeps all credentials local and encrypted with enterprise-grade security.          |
| **Repository Pattern**                  | Clean data access layer with pagination, filtering, and type safety.               |
| **Exact Node.js Version Enforcement**   | Eliminates ALL native module conflicts with 20.19.2 + comprehensive validation.    |
| **Dual-Context Native Module Handling** | Perfect support for both Node.js testing and Electron runtime environments.        |
| **Third-Party Token Management**        | Extensible service-specific validation for VSCode/Slack/Apple Notes integrations.  |

## Core Service Architecture

### 1. Development Infrastructure Layer (Infrastructure - Complete)

```typescript
// Node.js version enforcement and validation
NodeVersionChecker.validate() → enforces exact 20.19.2 with helpful guidance
VoltaConfig.autoSwitch() → automatic team member version switching
EngineStrict.prevent() → blocks incompatible Node.js versions

// Dual-context native module management
NativeModuleManager.rebuildForElectron() → MODULE_VERSION 119 (runtime)
NativeModuleManager.rebuildForNode() → MODULE_VERSION 115 (testing)
NativeModuleManager.autoDetectContext() → intelligent context switching

// Comprehensive development pipeline
DevScript.validateEnvironment() → tools + versions + packages + rebuild
DevScript.launchWithValidation() → pre-flight checks + enhanced debugging
DevScript.handleErrors() → clear guidance + resolution steps
```

### 2. Data Layer Services (Phase 2 - Complete)

```typescript
// Evidence scoring with sophisticated algorithm
EvidenceScoreService.calculateEvidenceScore(prdId, personaId) → score: 0-100

// Vector similarity search with caching
EmbeddingRetrievalService.searchSimilar(query, personaId?, topN?, minSimilarity?) → results[]

// Secure file processing with validation
SecureFileIngestService.processFile(filePath) → metadata + embeddings

// Repository patterns with advanced features
PersonaRepo.findMany({ search?, pagination?, sorting? }) → personas[]
EmbeddingRepo.findSimilar(vector, limit) → embeddings[]
```

### 3. Hybrid AI Management (Phase 2.5 - Complete)

```typescript
// Secure credential storage
TokenVault.store(key, value, provider) → encrypted storage
TokenVault.retrieve(key, provider) → decrypted value

// Firebase authentication and session management
FirebaseAuth.signIn(email, password) → user + idToken
FirebaseAuth.getIdToken() → fresh token for API access

// Intelligent provider selection with fallback
EmbeddingProviderManager.generateEmbeddings(texts[]) → embeddings[]
// Automatically selects: Firebase (if available) → OpenAI (fallback)
```

### 4. Interface Layer (Phase 3.1 - Complete)

```typescript
// Tray UI with native integration
TrayWindow.show() → React app with persona chat, file import, settings
TrayWindow.importPRD() → native file dialog → secure processing

// Evidence score banner with API key guidance
EvidenceScoreBanner.display() → score + setup instructions

// AI Service Settings Modal with comprehensive management
AIServiceSettingsModal.show() → provider selection, key management, connection testing
```

### 5. Third-Party Token Management (Phase 3.5.2 - Backend Complete)

```typescript
// Enhanced TokenVault with service-specific validation
TokenVault.validateToken(service: ApiService, token: string) → ValidationResult
TokenVault.isTokenStored(service: ApiService) → boolean

// Service-specific validation rules
interface ServiceValidationRules {
  vscode: {
    patterns: ['ghp_*', 'github_pat_*']
    minLength: 40
    description: 'GitHub Personal Access Token'
  }
  slack: {
    patterns: ['xoxb-*']
    minLength: 50
    description: 'Slack Bot Token'
  }
  'apple-notes': {
    patterns: ['*']
    minLength: 32
    description: 'Apple Notes API Token (Future)'
  }
}

// Enhanced SettingsService with CRUD operations
SettingsService.configureThirdPartyToken(service, token) → encrypted storage + validation
SettingsService.removeThirdPartyToken(service) → secure removal + audit logging
SettingsService.getTokenStatus() → multi-service availability status
SettingsService.testThirdPartyToken(service) → service-specific connection testing
SettingsService.getMissingTokenWarnings() → smart warning system

// Extended IPC Infrastructure
IPC_CHANNELS = {
  'configure-third-party-token': (service, token) → success/error
  'remove-third-party-token': (service) → success/error
  'get-token-status': () → { vscode: boolean, slack: boolean, ... }
  'test-third-party-token': (service) → connection result
}
```

## Reusable Patterns

### 1. Development Infrastructure Pattern (Node.js Standardization)

```typescript
interface IVersionManager {
  validateVersion(): Promise<boolean>;
  enforceExactVersion(): void;
  provideGuidance(): string[];
}

interface INativeModuleManager {
  rebuildForContext(context: 'node' | 'electron'): Promise<boolean>;
  detectCurrentContext(): 'node' | 'electron';
  handleVersionConflicts(): Promise<void>;
}

// Implementation: NodeVersionChecker, NativeModuleManager
// Usage: Pre-hooks in package.json scripts, enhanced dev.sh
```

### 2. Provider Pattern (AI Services)

```typescript
interface IEmbeddingProvider {
  generateEmbeddings(texts: string[]): Promise<EmbeddingResult[]>;
  isAvailable(): Promise<boolean>;
  getProviderName(): string;
}

// Implementations: OpenAIEmbeddingProvider, FirebaseEmbeddingProvider
// Manager: EmbeddingProviderManager (auto-selection + fallback)
```

### 3. Repository Pattern (Data Access)

```typescript
interface IRepository<T> {
  findMany(options?: FindOptions): Promise<T[]>;
  findById(id: string): Promise<T | null>;
  create(data: CreateData): Promise<T>;
  update(id: string, data: UpdateData): Promise<T>;
  delete(id: string): Promise<boolean>;
}

// Implementations: PersonaRepo, EvidenceRepo, ProductDocumentRepo, etc.
```

### 4. Service Layer Pattern (Business Logic)

```typescript
abstract class BaseService {
  protected repo: IRepository;
  protected logger: Logger;

  abstract initialize(): Promise<void>;
  abstract process(input: any): Promise<any>;
}

// Implementations: EvidenceScoreService, EmbeddingRetrievalService, etc.
```

### 5. Configuration Pattern (Environment Management)

```typescript
// Environment-based configuration with validation
dotenv.config(); // Load .env file
ConfigValidator.validate(); // Ensure required variables present
TokenVault.loadCredentials(); // Decrypt stored credentials

// Node.js version enforcement
NodeVersionChecker.enforceExact('20.19.2'); // Exact version validation
VoltaManager.autoSwitch(); // Team consistency
```

### 6. Development Pipeline Pattern (Enhanced Development Experience)

```typescript
// Comprehensive pre-flight validation pipeline
DevelopmentPipeline = [
  ToolsValidator.checkCriticalTools(), // node, pnpm, git
  NodeVersionChecker.validateExact(), // 20.19.2 enforcement
  ProjectValidator.checkStructure(), // package.json, .nvmrc, scripts
  NativeModuleManager.rebuild(), // context-aware rebuilds
  TestSuite.runValidation(), // comprehensive testing
  BuildValidator.checkOutput(), // final build verification
];
```

### 7. Third-Party Integration Pattern (Phase 3.5.2 - New)

```typescript
// Extensible service-specific validation pattern
interface IThirdPartyService {
  validateToken(token: string): ValidationResult;
  testConnection(token: string): Promise<ConnectionResult>;
  getRequiredScopes(): string[];
  getSetupInstructions(): string;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

interface ConnectionResult {
  success: boolean;
  error?: string;
  metadata?: Record<string, any>;
}

// Implementations: VSCodeService, SlackService, AppleNotesService
// Usage: Service registry pattern with automatic discovery

class ThirdPartyServiceRegistry {
  private services = new Map<ApiService, IThirdPartyService>();

  register(service: ApiService, implementation: IThirdPartyService) {
    this.services.set(service, implementation);
  }

  validate(service: ApiService, token: string): ValidationResult {
    return (
      this.services.get(service)?.validateToken(token) ?? {
        isValid: false,
        errors: ['Service not found'],
      }
    );
  }
}

// Service-specific implementations
class VSCodeService implements IThirdPartyService {
  validateToken(token: string): ValidationResult {
    // GitHub PAT validation: ghp_* or github_pat_*, 40+ chars
    const patterns = [
      /^ghp_[A-Za-z0-9_]{36,}$/,
      /^github_pat_[A-Za-z0-9_]{22,}$/,
    ];
    const isValid =
      patterns.some(pattern => pattern.test(token)) && token.length >= 40;

    return {
      isValid,
      errors: isValid ? [] : ['Invalid GitHub Personal Access Token format'],
      warnings: !isValid
        ? ['Token should be ghp_* (classic) or github_pat_* (fine-grained)']
        : [],
    };
  }

  async testConnection(token: string): Promise<ConnectionResult> {
    // Test GitHub API access with token
    // Implementation specific to GitHub API validation
  }

  getRequiredScopes(): string[] {
    return ['repo', 'user:email']; // GitHub-specific scopes
  }

  getSetupInstructions(): string {
    return 'Generate a Personal Access Token at https://github.com/settings/tokens';
  }
}
```

## Architecture Evolution

### Phase 3.5.2 Strategic Scope Change

**Previous Integration Focus**: Notion + Slack + Linear  
**New Strategic Focus**: VSCode + Slack + Apple Notes

**Architectural Benefits**:

- **Developer-Centric**: VSCode integration aligns with daily development workflow
- **Communication-Focused**: Slack integration enables team evidence sharing
- **Future Productivity**: Apple Notes placeholder for personal workflow expansion
- **Simplified MVP**: Reduced integration complexity while maintaining extensibility

**Technical Implementation**:

- Service-specific validation with clear error messaging
- Extensible pattern supporting future service additions
- Type-safe service registry with automatic discovery
- Comprehensive testing infrastructure for validation and connection testing

### Extensibility Design

The third-party token management system is designed for easy expansion:

```typescript
// Adding new services requires minimal changes
type ApiService =
  | 'openai'
  | 'vscode'
  | 'slack'
  | 'apple-notes'
  | 'firebase-cloud'
  | 'future-service';

// Service registration pattern
serviceRegistry.register('future-service', new FutureService());

// Automatic UI discovery (future enhancement)
const availableServices = serviceRegistry.getAll();
```

## Current Implementation Status

**✅ COMPLETE PHASES**:

- Development Infrastructure Layer (Node.js standardization)
- Data Layer Services (evidence scoring, embeddings, file ingest)
- Hybrid AI Management (TokenVault, Firebase, provider selection)
- Interface Layer Core (chat, import, scores, toasts, activity logs, settings)
- Third-Party Token Management Backend (validation, storage, IPC, testing)

**🔄 IN PROGRESS**:

- Third-Party Token Management UI (service selection, validation display, connection testing)

**⏳ FUTURE SCOPE**:

- Notion/Linear integrations (moved to future scope for strategic focus)
- VS Code extension implementation
- Slack bot implementation
- Apple Notes integration implementation

## Quality Patterns Established

**Type Safety**: Strict TypeScript throughout with comprehensive interfaces  
**Error Handling**: Graceful degradation with detailed error messages  
**Security**: AES-256-GCM encryption for all credential storage  
**Testing**: Comprehensive test suites with high coverage  
**Documentation**: Complete implementation summaries and testing guides  
**Extensibility**: Service registry pattern supporting future integrations
