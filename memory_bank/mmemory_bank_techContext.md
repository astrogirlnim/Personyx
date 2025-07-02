# Tech Context – The "With What"

_Last updated: 2025-01-03_

## Runtime Stack

| Layer           | Tech                                  | Version | Notes                                      |
| --------------- | ------------------------------------- | ------- | ------------------------------------------ |
| Desktop Shell   | Electron 28 + Node 20.19.2            | Latest  | Tray menu, native file dialogs, IPC        |
| Front‑end UI    | React 18 + Vite + Tailwind CSS v4     | Latest  | Modern hooks, concurrent features          |
| AI Providers    | Firebase + OpenAI (Hybrid)            | v10.7.1 | Managed service + direct API fallback      |
| Authentication  | Firebase Auth (Email/Password)        | v10.7.1 | Enterprise-grade session management        |
| Cloud Functions | Firebase Functions (Node.js 18)       | Latest  | OpenAI proxy with batch processing         |
| AI / RAG        | LangGraph + OpenAI GPT‑4 + Embeddings | Latest  | Vector embeddings + persona classification |
| Storage         | SQLite + Drizzle ORM                  | Latest  | 6-table schema with vector search          |
| Encryption      | AES‑256‑GCM + PBKDF2                  | crypto  | TokenVault for credentials                 |
| Environment     | dotenv + Environment Variables        | Latest  | Secure configuration management            |
| TypeScript      | TypeScript 5.3 (strict mode)          | Latest  | Full type safety throughout                |
| Package Manager | pnpm                                  | Latest  | Monorepo with workspaces                   |
| Build System    | tsc + tsc-alias + Vite                | Latest  | Module resolution + hot reload             |
| Code Quality    | ESLint + Prettier                     | Latest  | Automated formatting and linting           |
| Testing         | Custom integration scripts            | Custom  | End-to-end feature validation              |

## Development Dependencies

```json
{
  "firebase": "^10.7.1",
  "openai": "^4.20.1",
  "electron": "^28.0.0",
  "react": "^18.2.0",
  "drizzle-orm": "^0.29.0",
  "better-sqlite3": "^9.0.0",
  "js-yaml": "^4.1.0",
  "chokidar": "^3.5.3",
  "dotenv": "^16.3.1"
}
```

## Firebase Configuration

### Required Environment Variables

```bash
# Firebase Project Configuration (.env)
FIREBASE_API_KEY=your_api_key_here
FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_STORAGE_BUCKET=your_project.appspot.com
FIREBASE_MESSAGING_SENDER_ID=123456789
FIREBASE_APP_ID=1:123456789:web:abcdef123456

# OpenAI Configuration (for Cloud Functions)
OPENAI_API_KEY=sk-your_openai_key_here
```

### Firebase Project Setup

- **Project ID**: `personyx-42c74` (production example)
- **Authentication**: Email/Password enabled
- **Functions Region**: us-central1
- **Deployed Functions**: embeddings, batchEmbeddings, healthCheck, getSupportedModels

## Development Setup

### Prerequisites

1. **Node.js**: v20.19.2 (via `.nvmrc`)
2. **pnpm**: Package manager for monorepo
3. **Firebase Project**: Created at console.firebase.google.com
4. **OpenAI Account**: API key for embeddings

### Quick Start

```bash
# Install dependencies
pnpm install

# Configure environment
cp env.example .env
# Edit .env with your Firebase and OpenAI credentials

# Validate configuration
npm run check-firebase

# Start development environment
./dev.sh
```

### Development Scripts

```bash
# Main development
pnpm dev              # Start Electron app in watch mode
./dev.sh              # Launch full development environment

# Database management
npm run db:seed       # Seed database with mock data
npm run db:clear      # Clear all database data
npm run db:stats      # Show database statistics

# Configuration validation
npm run check-firebase    # Validate Firebase configuration
node scripts/setup-api-key.js  # OpenAI API key setup helper

# Testing
node tests/final-verification.mjs  # Comprehensive feature testing
```

## Architecture Patterns

### 1. Provider Pattern (AI Services)

```typescript
interface IEmbeddingProvider {
  generateEmbeddings(texts: string[]): Promise<EmbeddingResult[]>;
  isAvailable(): Promise<boolean>;
  getProviderName(): string;
}

// Firebase Provider (managed service)
// OpenAI Provider (direct API)
// Manager handles auto-selection + fallback
```

### 2. Repository Pattern (Data Access)

```typescript
interface IRepository<T> {
  findMany(options?: FindOptions): Promise<T[]>;
  create(data: CreateData): Promise<T>;
  update(id: string, data: UpdateData): Promise<T>;
  delete(id: string): Promise<boolean>;
}
```

### 3. Service Layer (Business Logic)

```typescript
abstract class BaseService {
  protected repo: IRepository;
  protected logger: Logger;

  abstract initialize(): Promise<void>;
  abstract process(input: any): Promise<any>;
}
```

## Security Architecture

### 1. Credential Management

- **AES-256-GCM Encryption**: All API keys and credentials encrypted locally
- **PBKDF2 Key Derivation**: 100,000 iterations for maximum security
- **No Cloud Storage**: All credentials remain on local machine

### 2. Firebase Security

- **ID Token Authentication**: Secure API access with automatic refresh
- **HTTPS Only**: All communication encrypted in transit
- **Environment Isolation**: Sensitive configuration in .env files

### 3. Error Handling

- **Graceful Fallback**: Firebase fails → OpenAI automatically
- **User Guidance**: Clear setup instructions when credentials missing
- **Secure Logging**: No sensitive data in logs or error messages

## Database Schema

### Tables (6 total)

```sql
personas              -- User persona definitions
evidence              -- Evidence quotes and importance scores
product_documents     -- PRD files and content
evidence_scores       -- Calculated evidence scores per persona
embeddings           -- Vector embeddings for similarity search
api_tokens           -- Encrypted API keys and credentials
```

### Relationships

- `evidence` → `personas` (persona_id)
- `evidence` → `product_documents` (document_id)
- `evidence_scores` → `personas` + `product_documents`
- `embeddings` → metadata references

## Performance Characteristics

### 1. Response Times

- **Evidence Scoring**: < 100ms per PRD/persona combination
- **Similarity Search**: < 200ms with 5-minute caching
- **File Processing**: ~1-2 seconds per PRD (embedding generation)
- **UI Interactions**: < 50ms for all tray operations

### 2. Caching Strategy

- **Embedding Retrieval**: 5-minute TTL for repeat queries
- **Persona Data**: In-memory cache with database sync
- **Firebase Tokens**: Cached with automatic refresh

### 3. Batch Processing

- **Firebase Functions**: Up to 50 texts per batch request
- **Database Operations**: Batched inserts for embeddings
- **Error Recovery**: Retry logic with exponential backoff

## Cross-Platform Support

### Supported Platforms

- **macOS**: Primary development and testing platform
- **Windows**: Electron packaging with code signing
- **Linux**: AppImage distribution

### Native Integrations

- **File System**: Native file dialogs via Electron
- **System Tray**: Cross-platform tray menu and notifications
- **Auto-Updates**: Electron auto-updater with signed packages

## Production Deployment

### Firebase Functions Deployment

```bash
# Navigate to functions directory
cd functions

# Install dependencies
npm install

# Deploy to Firebase
npm run deploy
```

### Electron App Building

```bash
# Build for current platform
npm run build

# Build for all platforms (CI/CD)
npm run build:all
```

### Environment Management

- **Development**: Firebase free tier (generous limits)
- **Production**: Firebase Blaze plan (pay-as-you-go)
- **Fallback**: Direct OpenAI integration always available

## Monitoring and Debugging

### Logging Strategy

- **Application Logs**: File-based logging with rotation
- **Console Output**: Development debugging information
- **Error Tracking**: Comprehensive error classification and reporting

### Development Tools

- **Hot Reload**: Vite dev server for React components
- **TypeScript Watch**: Automatic compilation on file changes
- **Native Module Rebuilding**: Automatic better-sqlite3 rebuilds

### Configuration Validation

- **Firebase Checker**: Validates all Firebase configuration
- **API Key Tester**: Verifies OpenAI API key functionality
- **Database Validator**: Ensures proper schema and connections

## Constraints and Requirements

### Technical Constraints

- **Local-First**: All core functionality works offline
- **Cross-Platform**: Must run on macOS, Windows, Linux
- **Security**: Enterprise-grade encryption for credentials
- **Performance**: Sub-200ms response times for all operations

### User Experience Requirements

- **Zero Configuration**: Works out of box with guided setup
- **Graceful Degradation**: Always functional even if services unavailable
- **Clear Guidance**: Helpful error messages and setup instructions
- **Native Integration**: Feels like native desktop application

### Scalability Considerations

- **Database**: SQLite suitable for single-user, PostgreSQL for multi-user
- **Caching**: In-memory for development, Redis for production scale
- **AI Services**: Firebase Functions scale automatically, direct API for control
