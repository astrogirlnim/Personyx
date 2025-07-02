# Phase 2.5.2 Implementation Plan: Firebase Cloud Integration

**Feature:** Integrate Firebase Auth + Cloud Functions for managed embedding (with auth)  
**Phase:** 2 - Data Layer  
**Sub-feature:** 5.2 of Hybrid AI Key Management & Cloud Option  
**Date:** 2025-01-03  
**Status:** Planning Phase

## Overview

This document outlines the implementation plan for integrating Firebase Authentication and Cloud Functions as an alternative to direct OpenAI embedding API calls. This enables users who prefer not to manage their own API keys to use a managed cloud service with authentication. **This is an MVP approach using Firebase instead of building a custom Personyx Cloud API.**

## Current Architecture Analysis

### Existing Embedding Flow

```
User Content → LangGraphService (OpenAI API) → text-embedding-3-small → Local Storage
                     ↓
                EmbeddingRetrievalService → Similarity Search
```

### Current Implementation Components

- **LangGraphService**: Direct OpenAI API integration for embeddings
- **EmbeddingRetrievalService**: Similarity search using stored embeddings
- **TokenVault**: Secure local storage for API keys (AES-256-GCM)
- **OpenAI Model**: `text-embedding-3-small` (1536 dimensions)

## Target Architecture

### New Hybrid Flow (MVP with Firebase)

```
User Content → EmbeddingProviderService (abstraction layer)
                     ↓                    ↓
              OpenAI Provider     Firebase Cloud Provider
                     ↓                    ↓
              Local API Key      Firebase Auth + Cloud Function
                     ↓                    ↓
                Local Storage     ← Same Storage Format →
```

### Firebase Architecture

```
Desktop App → Firebase Auth (Email/Password)
     ↓
Firebase ID Token → Cloud Function (embedding-proxy)
     ↓
Cloud Function → OpenAI API (with managed key)
     ↓
Response → Desktop App → Local Storage
```

## Implementation Plan

### Phase 1: Service Abstraction Layer (2 days)

#### 1.1 Create Embedding Provider Interface

**File:** `src/main/services/providers/IEmbeddingProvider.ts`

```typescript
export interface EmbeddingProvider {
  name: string;
  initialize(): Promise<void>;
  isReady(): boolean;
  generateEmbedding(text: string): Promise<EmbeddingResult>;
  generateBatchEmbeddings(texts: string[]): Promise<EmbeddingResult[]>;
  getStatus(): ProviderStatus;
  getSupportedModels(): string[];
  getMaxTokens(): number;
}

export interface EmbeddingResult {
  embedding: number[];
  model: string;
  dimensions: number;
  tokens: number;
  processingTime: number;
}

export interface ProviderStatus {
  initialized: boolean;
  authenticated: boolean;
  rateLimit: {
    remaining: number;
    resetTime: Date;
  };
  lastError?: string;
}
```

#### 1.2 Create OpenAI Provider Implementation

**File:** `src/main/services/providers/OpenAIEmbeddingProvider.ts`

Extract current OpenAI logic from LangGraphService into a dedicated provider.

### Phase 2: Firebase Integration (3 days)

#### 2.1 Firebase Project Setup

**Prerequisites:**

- Create Firebase project
- Enable Authentication (Email/Password)
- Set up Cloud Functions
- Configure environment variables

**Required Firebase Services:**

- Firebase Authentication
- Cloud Functions
- (Optional: Firestore for usage tracking)

#### 2.2 Create Firebase Authentication Service

**File:** `src/main/services/FirebaseAuth.ts`

```typescript
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from 'firebase/auth';

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

export class FirebaseAuthService {
  private auth: Auth;

  constructor(config: FirebaseConfig) {
    const app = initializeApp(config);
    this.auth = getAuth(app);
  }

  async signIn(email: string, password: string): Promise<string> {
    const userCredential = await signInWithEmailAndPassword(
      this.auth,
      email,
      password
    );
    const idToken = await userCredential.user.getIdToken();
    return idToken;
  }

  async signUp(email: string, password: string): Promise<string> {
    const userCredential = await createUserWithEmailAndPassword(
      this.auth,
      email,
      password
    );
    const idToken = await userCredential.user.getIdToken();
    return idToken;
  }

  async getIdToken(): Promise<string | null> {
    const user = this.auth.currentUser;
    if (!user) return null;
    return await user.getIdToken();
  }

  async signOut(): Promise<void> {
    await this.auth.signOut();
  }

  isAuthenticated(): boolean {
    return !!this.auth.currentUser;
  }
}
```

#### 2.3 Create Firebase Cloud Provider

**File:** `src/main/services/providers/FirebaseEmbeddingProvider.ts`

```typescript
export class FirebaseEmbeddingProvider implements EmbeddingProvider {
  public readonly name = 'firebase-cloud';
  private authService: FirebaseAuthService;
  private functionsUrl: string;

  constructor() {
    this.authService = new FirebaseAuthService(firebaseConfig);
    this.functionsUrl = 'https://us-central1-personyx-mvp.cloudfunctions.net';
  }

  async initialize(): Promise<void> {
    // Check for stored Firebase credentials
    const credentials = await this.getStoredCredentials();
    if (!credentials) {
      throw new Error('Firebase credentials not configured');
    }

    await this.authService.signIn(credentials.email, credentials.password);
  }

  async generateEmbedding(text: string): Promise<EmbeddingResult> {
    const idToken = await this.authService.getIdToken();
    if (!idToken) {
      throw new Error('Not authenticated with Firebase');
    }

    const response = await fetch(`${this.functionsUrl}/embeddings`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${idToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        model: 'text-embedding-3-small',
      }),
    });

    if (!response.ok) {
      throw new Error(`Firebase embedding failed: ${response.statusText}`);
    }

    const data = await response.json();

    return {
      embedding: data.embedding,
      model: data.model,
      dimensions: data.dimensions,
      tokens: data.usage?.tokens || 0,
      processingTime: data.processing_time || 0,
    };
  }

  // ... other methods
}
```

### Phase 3: Firebase Cloud Function (1 day)

#### 3.1 Embedding Proxy Function

**File:** `functions/src/embeddings.ts`

```typescript
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getAuth } from 'firebase-admin/auth';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // Managed by Firebase
});

export const embeddings = onCall(async request => {
  // Verify authentication
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { text, model = 'text-embedding-3-small' } = request.data;

  if (!text) {
    throw new HttpsError('invalid-argument', 'Text is required');
  }

  try {
    const startTime = Date.now();

    const response = await openai.embeddings.create({
      model,
      input: text,
    });

    const processingTime = Date.now() - startTime;

    return {
      embedding: response.data[0].embedding,
      model: response.model,
      dimensions: response.data[0].embedding.length,
      usage: {
        tokens: response.usage.total_tokens,
      },
      processing_time: processingTime,
    };
  } catch (error) {
    console.error('OpenAI embedding error:', error);
    throw new HttpsError('internal', 'Failed to generate embedding');
  }
});
```

### Phase 4: Provider Manager Integration (1 day)

#### 4.1 Update EmbeddingProviderManager

**File:** `src/main/services/EmbeddingProviderManager.ts`

```typescript
export class EmbeddingProviderManager {
  private providers = new Map<EmbeddingProviderType, EmbeddingProvider>();

  constructor() {
    this.providers.set('openai', new OpenAIEmbeddingProvider());
    this.providers.set('firebase-cloud', new FirebaseEmbeddingProvider());
  }

  async getPreferredProvider(): Promise<EmbeddingProvider> {
    // Check user preference (stored in settings)
    const userPreference = await this.getUserPreference();

    if (userPreference === 'firebase-cloud') {
      const firebaseProvider = this.providers.get('firebase-cloud')!;
      if (await this.canUseProvider(firebaseProvider)) {
        return firebaseProvider;
      }
    }

    // Fallback to OpenAI
    const openaiProvider = this.providers.get('openai')!;
    if (await this.canUseProvider(openaiProvider)) {
      return openaiProvider;
    }

    throw new Error('No embedding provider available');
  }

  private async canUseProvider(provider: EmbeddingProvider): Promise<boolean> {
    try {
      await provider.initialize();
      return provider.isReady();
    } catch {
      return false;
    }
  }
}
```

## Dependencies

### New Dependencies Required

```json
{
  "firebase": "^10.7.1",
  "firebase-admin": "^12.0.0",
  "firebase-functions": "^4.8.0"
}
```

### Environment Variables

```env
# Firebase Config (public)
FIREBASE_API_KEY=xxx
FIREBASE_AUTH_DOMAIN=personyx-mvp.firebaseapp.com
FIREBASE_PROJECT_ID=personyx-mvp
FIREBASE_STORAGE_BUCKET=personyx-mvp.appspot.com
FIREBASE_MESSAGING_SENDER_ID=xxx
FIREBASE_APP_ID=xxx

# Firebase Functions (private)
OPENAI_API_KEY=xxx (managed in Firebase Functions)
```

## Security Considerations

1. **Firebase ID Token Validation**: Cloud Functions verify authentication
2. **Rate Limiting**: Implement per-user limits in Cloud Functions
3. **API Key Security**: OpenAI key stored securely in Firebase Functions
4. **Usage Tracking**: Optional Firestore collection for billing/limits

## Testing Strategy

1. **Unit Tests**: Each provider in isolation
2. **Integration Tests**: Full authentication flow
3. **End-to-End Tests**: Desktop app → Firebase → OpenAI
4. **Error Handling**: Network failures, auth errors, rate limits

## Deployment Considerations

1. **Firebase Project**: Create separate projects for dev/prod
2. **Cloud Functions**: Deploy with proper environment variables
3. **Electron App**: Bundle Firebase config (public keys only)
4. **Cross-Platform**: Test Firebase Auth on Mac/Windows/Linux

## Cost Considerations (MVP)

1. **Firebase Auth**: Free tier (50,000 monthly active users)
2. **Cloud Functions**: Pay-per-invocation (2 million free/month)
3. **OpenAI API**: Pay-per-token usage (passed through to users)
4. **Future**: Add billing/subscription logic as needed

## Migration Path

This Firebase approach provides a clear migration path:

1. **MVP**: Firebase Auth + Cloud Functions
2. **Future**: Custom Personyx Cloud API with OAuth 2.0
3. **Migration**: Provider interface remains the same
