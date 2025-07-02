# System Patterns – The "How"

_Last updated: 2025-01-13_

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
  NodeVersionChecker.validateExact(),  // 20.19.2 enforcement
  ProjectValidator.checkStructure(),   // package.json, .nvmrc, scripts
  DependencyValidator.checkPackages(), // critical packages present
  NativeModuleManager.rebuildForElectron(), // context-aware rebuild
  ApplicationLauncher.startWithDebugging()  // enhanced debugging
];

// Error handling with guidance
ErrorHandler.provideGuidance(error) → specific resolution steps
```

## Security Architecture

### 1. Encryption at Rest

- **AES-256-GCM**: All credentials encrypted with unique IVs and auth tags
- **PBKDF2**: Key derivation with 100,000 iterations for maximum security
- **Local Storage**: No credentials transmitted to external services

### 2. Firebase Security

- **ID Token Authentication**: Secure API access with automatic refresh
- **HTTPS Only**: All Firebase communication encrypted in transit
- **Environment Isolation**: Sensitive config in .env files (gitignored)

### 3. API Key Management

- **User Choice**: Self-managed OpenAI keys OR managed Firebase service
- **Automatic Fallback**: Firebase unavailable → OpenAI direct (seamless)
- **Error Handling**: Clear guidance when API keys missing or invalid

### 4. Development Security

- **Version Enforcement**: Prevents potentially vulnerable Node.js versions
- **Native Module Security**: Controlled compilation with verified sources
- **Pre-commit Hooks**: Gitleaks security scanning + linting validation

## Database Schema Patterns

### 1. Relational Design (6 Tables)

```sql
personas (id, name, demographic, interests, pain_points, preferred_solutions)
evidence (id, persona_id, document_id, quote, importance, date_created)
product_documents (id, title, content, file_path, created_at)
evidence_scores (id, prd_id, persona_id, score, calculation_details, created_at)
embeddings (id, text, vector, metadata, created_at)
api_tokens (id, provider, encrypted_value, created_at)
```

### 2. Type Safety (TypeScript Interfaces)

```typescript
interface PersonaType {
  id: string;
  name: string;
  demographic: string[];
  interests: string[];
  pain_points: string[];
  preferred_solutions: string[];
}

// Database ↔ Application type conversion handled by repositories
```

## Performance Patterns

### 1. Caching Strategy

- **EmbeddingRetrievalService**: 5-minute TTL cache for similarity queries
- **PersonaLoader**: In-memory persona cache with database sync
- **Firebase Provider**: Connection pooling and retry logic

### 2. Optimization Techniques

- **Batch Processing**: Firebase supports up to 50 texts per request
- **Vector Indexing**: Efficient similarity search with cosine distance
- **Lazy Loading**: Services initialize only when needed

### 3. Development Performance

- **Native Module Caching**: Context-aware rebuilds prevent unnecessary recompilation
- **Version Validation Caching**: Fast validation with helpful error messages
- **Parallel Processing**: Concurrent TypeScript compilation + validation
