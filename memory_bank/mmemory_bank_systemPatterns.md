# System Patterns – The "How"

_Last updated: 2025-01-03_

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
```

## Key Design Decisions

| Decision                               | Reason                                                                             |
| -------------------------------------- | ---------------------------------------------------------------------------------- |
| **Electron 28 + TypeScript**           | Rapid cross‑platform desktop shell with mature tray APIs and native file access.   |
| **React 18 + Tailwind CSS**            | Modern UI framework with responsive design system and component reusability.       |
| **Event‑driven IPC (Electron ⇄ Core)** | Decouples UI from backend processing with type-safe communication.                 |
| **SQLite + Drizzle ORM**               | Zero‑setup DB with typed migrations; lives inside user profile with encryption.    |
| **LangGraph + OpenAI pipeline**        | Modular chain for embeddings, persona classification, and evidence scoring.        |
| **Firebase + Cloud Functions**         | Managed embedding service with authentication and automatic scaling.               |
| **Hybrid AI Provider System**          | User choice between self-managed keys and managed service with automatic fallback. |
| **AES‑256-GCM TokenVault**             | Keeps all credentials local and encrypted with enterprise-grade security.          |
| **Repository Pattern**                 | Clean data access layer with pagination, filtering, and type safety.               |

## Core Service Architecture

### 1. Data Layer Services (Phase 2 - Complete)

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

### 2. Hybrid AI Management (Phase 2.5 - Complete)

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

### 3. Interface Layer (Phase 3.1 - Complete)

```typescript
// Tray UI with native integration
TrayWindow.show() → React app with persona chat, file import, settings
TrayWindow.importPRD() → native file dialog → secure processing

// Evidence score banner with API key guidance
EvidenceScoreBanner.display() → score + setup instructions
```

## Reusable Patterns

### 1. Provider Pattern (AI Services)

```typescript
interface IEmbeddingProvider {
  generateEmbeddings(texts: string[]): Promise<EmbeddingResult[]>;
  isAvailable(): Promise<boolean>;
  getProviderName(): string;
}

// Implementations: OpenAIEmbeddingProvider, FirebaseEmbeddingProvider
// Manager: EmbeddingProviderManager (auto-selection + fallback)
```

### 2. Repository Pattern (Data Access)

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

### 3. Service Layer Pattern (Business Logic)

```typescript
abstract class BaseService {
  protected repo: IRepository;
  protected logger: Logger;

  abstract initialize(): Promise<void>;
  abstract process(input: any): Promise<any>;
}

// Implementations: EvidenceScoreService, EmbeddingRetrievalService, etc.
```

### 4. Configuration Pattern (Environment Management)

```typescript
// Environment-based configuration with validation
dotenv.config(); // Load .env file
ConfigValidator.validate(); // Ensure required variables present
TokenVault.loadCredentials(); // Decrypt stored credentials
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

## Error Handling Patterns

### 1. Graceful Degradation

```typescript
try {
  return await firebaseProvider.generateEmbeddings(texts);
} catch (error) {
  logger.warn('Firebase unavailable, falling back to OpenAI');
  return await openaiProvider.generateEmbeddings(texts);
}
```

### 2. User Guidance

- **Missing API Keys**: Clear setup instructions with validation
- **Service Unavailable**: Automatic fallback with user notification
- **Configuration Errors**: Detailed error messages with resolution steps

## Development Patterns

### 1. Testing Strategy

- **Unit Tests**: Individual service methods with mock dependencies
- **Integration Tests**: End-to-end feature validation with real database
- **Configuration Tests**: Validation scripts for environment setup

### 2. Documentation

- **Code Comments**: JSDoc annotations for all public APIs
- **Setup Guides**: Step-by-step instructions for Firebase and OpenAI
- **Architecture Docs**: ER diagrams, API specifications, deployment guides

## Future Extension Points

### 1. Additional AI Providers

- **Pattern Ready**: IEmbeddingProvider interface supports new providers
- **Examples**: Anthropic, Cohere, local models (Ollama)
- **Integration**: Add to EmbeddingProviderManager with priority ordering

### 2. Advanced Features

- **Vector Databases**: Pinecone, Weaviate integration via repository pattern
- **Model Options**: Multiple embedding models per provider
- **Cost Tracking**: Usage monitoring and billing integration

### 3. External Integrations

- **Plugin Architecture**: VS Code, Slack, Linear adapters
- **Webhook Support**: Real-time updates from external systems
- **API Gateway**: GraphQL or REST API for external access

## Technology Stack Validation

### ✅ Production Ready

- **Electron 28**: Cross-platform desktop with native file access
- **React 18**: Modern UI with hooks and concurrent features
- **TypeScript 5.3**: Strict type checking with advanced features
- **SQLite + Drizzle**: Zero-config database with type-safe migrations
- **Firebase**: Enterprise-grade authentication and cloud functions
- **OpenAI**: Production embedding service with rate limiting

### 🎯 Scaling Considerations

- **Database**: SQLite → PostgreSQL for multi-user scenarios
- **Caching**: In-memory → Redis for distributed caching
- **Functions**: Firebase → Dedicated microservices for higher volume
- **Monitoring**: Application insights and performance tracking
