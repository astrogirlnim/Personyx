/**
 * Firebase Embedding Provider
 * Cloud-based embedding service with Firebase Authentication
 * Phase 2.5.2 - Firebase MVP Implementation
 */

import { Logger } from '@main/utils/logger';
import { FirebaseAuthService, FirebaseCredentials } from '../FirebaseAuth';
import { getToken } from '@main/security/tokenVault';
import dotenv from 'dotenv';
import type {
  EmbeddingProvider,
  EmbeddingResult,
  ProviderStatus,
} from './IEmbeddingProvider';

// Load environment variables
dotenv.config();

const logger = new Logger('firebase-embedding-provider');

// Firebase Configuration - Load from environment variables
function getFirebaseConfig() {
  // Validate required environment variables first
  const requiredVars = [
    'FIREBASE_API_KEY',
    'FIREBASE_AUTH_DOMAIN',
    'FIREBASE_PROJECT_ID',
    'FIREBASE_STORAGE_BUCKET',
    'FIREBASE_MESSAGING_SENDER_ID',
    'FIREBASE_APP_ID',
    'FIREBASE_FUNCTIONS_URL',
  ];

  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  if (missingVars.length > 0) {
    throw new Error(
      `Missing required Firebase environment variables: ${missingVars.join(', ')}.\n` +
        'Please copy env.example to .env and fill in your Firebase configuration.'
    );
  }

  // After validation, we can safely assert these are defined
  const config = {
    firebase: {
      apiKey: process.env.FIREBASE_API_KEY!,
      authDomain: process.env.FIREBASE_AUTH_DOMAIN!,
      projectId: process.env.FIREBASE_PROJECT_ID!,
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET!,
      messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID!,
      appId: process.env.FIREBASE_APP_ID!,
    },
    functionsUrl: process.env.FIREBASE_FUNCTIONS_URL!,
  };

  return config;
}

const firebaseConfig = getFirebaseConfig();
const FIREBASE_CONFIG = firebaseConfig.firebase;
const FUNCTIONS_BASE_URL = firebaseConfig.functionsUrl;

interface FirebaseEmbeddingResponse {
  embedding: number[];
  model: string;
  dimensions: number;
  usage?: {
    tokens: number;
  };
  processing_time?: number;
}

interface FirebaseBatchEmbeddingResponse {
  embeddings: FirebaseEmbeddingResponse[];
  total_tokens: number;
  processing_time: number;
}

export class FirebaseEmbeddingProvider implements EmbeddingProvider {
  public readonly name = 'firebase-cloud';
  private authService: FirebaseAuthService;
  private readonly MODEL = 'text-embedding-3-small';
  private readonly DIMENSIONS = 1536;
  private readonly MAX_TOKENS = 8191;
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 1000; // 1 second
  private readonly TIMEOUT = 30000; // 30 seconds

  private initialized = false;
  private lastError: string | null = null;

  constructor() {
    this.authService = new FirebaseAuthService(FIREBASE_CONFIG);
  }

  async initialize(): Promise<void> {
    try {
      if (this.initialized) return;

      logger.info('🔄 Initializing Firebase Embedding Provider...');

      // Initialize Firebase Auth
      await this.authService.initialize();

      // Try to restore existing session
      const restored = await this.authService.restoreSessionIfPossible();
      if (!restored) {
        logger.warn(
          '⚠️ No existing Firebase session found. User will need to authenticate.'
        );
      }

      this.initialized = true;
      this.lastError = null;
      logger.info('✅ Firebase Embedding Provider initialized');
    } catch (error) {
      this.lastError = `Initialization failed: ${error}`;
      logger.error('❌ Failed to initialize Firebase Embedding Provider', {
        error,
      });
      throw new Error(this.lastError);
    }
  }

  isReady(): boolean {
    return this.initialized && this.authService.isAuthenticated();
  }

  async generateEmbedding(text: string): Promise<EmbeddingResult> {
    if (!this.isReady()) {
      throw new Error(
        'Firebase provider not ready. User needs to authenticate.'
      );
    }

    const startTime = Date.now();

    try {
      const idToken = await this.authService.getIdToken();
      if (!idToken) {
        throw new Error('Failed to get Firebase ID token');
      }

      const response = await this.callEmbeddingFunction(
        {
          text,
          model: this.MODEL,
        },
        idToken
      );

      const processingTime = Date.now() - startTime;

      return {
        embedding: response.embedding,
        model: response.model,
        dimensions: response.dimensions,
        tokens: response.usage?.tokens || 0,
        processingTime,
      };
    } catch (error) {
      this.lastError = `Embedding generation failed: ${error}`;
      logger.error('❌ Firebase embedding generation failed', {
        error,
        textLength: text.length,
      });
      throw new Error(this.lastError);
    }
  }

  async generateBatchEmbeddings(texts: string[]): Promise<EmbeddingResult[]> {
    if (!this.isReady()) {
      throw new Error(
        'Firebase provider not ready. User needs to authenticate.'
      );
    }

    if (texts.length === 0) {
      return [];
    }

    const startTime = Date.now();

    try {
      const idToken = await this.authService.getIdToken();
      if (!idToken) {
        throw new Error('Failed to get Firebase ID token');
      }

      // For MVP, we'll process in batches of 10 to avoid timeout issues
      const batchSize = 10;
      const results: EmbeddingResult[] = [];

      for (let i = 0; i < texts.length; i += batchSize) {
        const batch = texts.slice(i, i + batchSize);

        const response = await this.callBatchEmbeddingFunction(
          {
            texts: batch,
            model: this.MODEL,
          },
          idToken
        );

        const processingTime = Date.now() - startTime;

        // Convert batch response to individual results
        for (const embeddingData of response.embeddings) {
          results.push({
            embedding: embeddingData.embedding,
            model: embeddingData.model,
            dimensions: embeddingData.dimensions,
            tokens: embeddingData.usage?.tokens || 0,
            processingTime: processingTime / response.embeddings.length,
          });
        }
      }

      return results;
    } catch (error) {
      this.lastError = `Batch embedding generation failed: ${error}`;
      logger.error('❌ Firebase batch embedding generation failed', {
        error,
        textCount: texts.length,
      });
      throw new Error(this.lastError);
    }
  }

  getStatus(): ProviderStatus {
    return {
      initialized: this.initialized,
      authenticated: this.authService.isAuthenticated(),
      rateLimit: {
        remaining: 100, // Firebase Functions handle rate limiting
        resetTime: new Date(Date.now() + 60000), // 1 minute from now
      },
      lastError: this.lastError || undefined,
    };
  }

  getSupportedModels(): string[] {
    return [this.MODEL];
  }

  getMaxTokens(): number {
    return this.MAX_TOKENS;
  }

  // Authentication helpers
  async authenticateUser(email: string, password: string): Promise<boolean> {
    try {
      await this.authService.signIn(email, password);
      logger.info('✅ Firebase user authentication successful');
      return true;
    } catch (error) {
      this.lastError = `Authentication failed: ${error}`;
      logger.error('❌ Firebase user authentication failed', { error, email });
      return false;
    }
  }

  async signUpUser(email: string, password: string): Promise<boolean> {
    try {
      await this.authService.signUp(email, password);
      logger.info('✅ Firebase user sign up successful');
      return true;
    } catch (error) {
      this.lastError = `Sign up failed: ${error}`;
      logger.error('❌ Firebase user sign up failed', { error, email });
      return false;
    }
  }

  async signOutUser(): Promise<void> {
    try {
      await this.authService.signOutUser();
      logger.info('✅ Firebase user signed out');
    } catch (error) {
      this.lastError = `Sign out failed: ${error}`;
      logger.error('❌ Firebase sign out failed', { error });
      throw new Error(this.lastError);
    }
  }

  // Private methods
  private async callEmbeddingFunction(
    data: { text: string; model: string },
    idToken: string
  ): Promise<FirebaseEmbeddingResponse> {
    const url = `${FUNCTIONS_BASE_URL}/embeddings`;

    const response = await this.makeHttpRequest(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${idToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Firebase function error: ${response.status} - ${errorText}`
      );
    }

    return (await response.json()) as FirebaseEmbeddingResponse;
  }

  private async callBatchEmbeddingFunction(
    data: { texts: string[]; model: string },
    idToken: string
  ): Promise<FirebaseBatchEmbeddingResponse> {
    const url = `${FUNCTIONS_BASE_URL}/batchEmbeddings`;

    const response = await this.makeHttpRequest(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${idToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Firebase batch function error: ${response.status} - ${errorText}`
      );
    }

    return (await response.json()) as FirebaseBatchEmbeddingResponse;
  }

  private async makeHttpRequest(
    url: string,
    options: RequestInit
  ): Promise<Response> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.TIMEOUT);

        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        return response;
      } catch (error) {
        lastError = error as Error;
        logger.warn(`🔄 Firebase request attempt ${attempt} failed`, {
          error,
          url,
        });

        if (attempt < this.MAX_RETRIES) {
          await this.delay(this.RETRY_DELAY * attempt);
        }
      }
    }

    throw lastError || new Error('All retry attempts failed');
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Utility methods for credentials management
  async hasStoredCredentials(): Promise<boolean> {
    return await this.authService.hasStoredCredentials();
  }

  async getStoredCredentials(): Promise<FirebaseCredentials | null> {
    try {
      const credentialsJson = await getToken('firebase-cloud');
      if (!credentialsJson) return null;

      return JSON.parse(credentialsJson) as FirebaseCredentials;
    } catch (error) {
      logger.error('❌ Failed to retrieve Firebase credentials', { error });
      return null;
    }
  }
}
