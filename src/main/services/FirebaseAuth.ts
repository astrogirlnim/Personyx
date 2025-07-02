/**
 * Firebase Authentication Service
 * Handles Firebase Authentication for managed embedding service
 * Phase 2.5.2 - Firebase MVP Implementation
 */

import { initializeApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  Auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import { Logger } from '@main/utils/logger';
import { getToken, storeToken } from '@main/security/tokenVault';

const logger = new Logger('firebase-auth');

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

export interface FirebaseCredentials {
  email: string;
  password: string;
  idToken?: string;
  refreshToken?: string;
  expiresAt?: Date;
}

export class FirebaseAuthService {
  private app: FirebaseApp | null = null;
  private auth: Auth | null = null;
  private currentUser: User | null = null;
  private initialized = false;

  constructor(private config: FirebaseConfig) {}

  async initialize(): Promise<void> {
    try {
      if (this.initialized) return;

      this.app = initializeApp(this.config);
      this.auth = getAuth(this.app);

      // Listen for auth state changes
      onAuthStateChanged(this.auth, (user: User | null) => {
        this.currentUser = user;
        if (user) {
          logger.info('✅ Firebase user signed in', {
            uid: user.uid,
            email: user.email,
          });
        } else {
          logger.info('👋 Firebase user signed out');
        }
      });

      this.initialized = true;
      logger.info('✅ Firebase Auth initialized');
    } catch (error) {
      logger.error('❌ Failed to initialize Firebase Auth', { error });
      throw new Error(`Firebase initialization failed: ${error}`);
    }
  }

  async signIn(email: string, password: string): Promise<string> {
    if (!this.auth) {
      throw new Error('Firebase Auth not initialized');
    }

    try {
      const userCredential = await signInWithEmailAndPassword(
        this.auth,
        email,
        password
      );
      const idToken = await userCredential.user.getIdToken();

      // Store credentials securely
      await this.storeCredentials({
        email,
        password, // Note: In production, consider using refresh tokens instead
        idToken,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      });

      logger.info('✅ Firebase sign in successful', {
        uid: userCredential.user.uid,
      });
      return idToken;
    } catch (error) {
      logger.error('❌ Firebase sign in failed', { error, email });
      throw new Error(`Sign in failed: ${error}`);
    }
  }

  async signUp(email: string, password: string): Promise<string> {
    if (!this.auth) {
      throw new Error('Firebase Auth not initialized');
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(
        this.auth,
        email,
        password
      );
      const idToken = await userCredential.user.getIdToken();

      // Store credentials securely
      await this.storeCredentials({
        email,
        password,
        idToken,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      });

      logger.info('✅ Firebase sign up successful', {
        uid: userCredential.user.uid,
      });
      return idToken;
    } catch (error) {
      logger.error('❌ Firebase sign up failed', { error, email });
      throw new Error(`Sign up failed: ${error}`);
    }
  }

  async getIdToken(): Promise<string | null> {
    if (!this.currentUser) {
      return null;
    }

    try {
      // This will automatically refresh the token if needed
      const idToken = await this.currentUser.getIdToken(true);

      // Update stored credentials with new token
      const credentials = await this.getStoredCredentials();
      if (credentials) {
        credentials.idToken = idToken;
        credentials.expiresAt = new Date(Date.now() + 60 * 60 * 1000);
        await this.storeCredentials(credentials);
      }

      return idToken;
    } catch (error) {
      logger.error('❌ Failed to get ID token', { error });
      return null;
    }
  }

  async signOutUser(): Promise<void> {
    if (!this.auth) {
      throw new Error('Firebase Auth not initialized');
    }

    try {
      await signOut(this.auth);

      // Clear stored credentials
      await this.clearStoredCredentials();

      logger.info('✅ Firebase sign out successful');
    } catch (error) {
      logger.error('❌ Firebase sign out failed', { error });
      throw new Error(`Sign out failed: ${error}`);
    }
  }

  isAuthenticated(): boolean {
    return !!this.currentUser;
  }

  getCurrentUser(): User | null {
    return this.currentUser;
  }

  async isTokenValid(): Promise<boolean> {
    const credentials = await this.getStoredCredentials();
    if (!credentials || !credentials.expiresAt) return false;

    return credentials.expiresAt > new Date();
  }

  private async storeCredentials(
    credentials: FirebaseCredentials
  ): Promise<void> {
    try {
      await storeToken('firebase-cloud', JSON.stringify(credentials));
      logger.debug('✅ Firebase credentials stored securely');
    } catch (error) {
      logger.error('❌ Failed to store Firebase credentials', { error });
      throw error;
    }
  }

  private async getStoredCredentials(): Promise<FirebaseCredentials | null> {
    try {
      const credentialsJson = await getToken('firebase-cloud');
      if (!credentialsJson) return null;

      const credentials: FirebaseCredentials = JSON.parse(credentialsJson);

      // Parse date strings back to Date objects
      if (credentials.expiresAt && typeof credentials.expiresAt === 'string') {
        credentials.expiresAt = new Date(credentials.expiresAt);
      }

      return credentials;
    } catch (error) {
      logger.error('❌ Failed to retrieve Firebase credentials', { error });
      return null;
    }
  }

  private async clearStoredCredentials(): Promise<void> {
    try {
      await storeToken('firebase-cloud', '');
      logger.debug('✅ Firebase credentials cleared');
    } catch (error) {
      logger.error('❌ Failed to clear Firebase credentials', { error });
    }
  }

  // Utility method to check if we have stored credentials
  async hasStoredCredentials(): Promise<boolean> {
    const credentials = await this.getStoredCredentials();
    return !!(credentials && credentials.email && credentials.password);
  }

  // Auto-restore session on initialization
  async restoreSessionIfPossible(): Promise<boolean> {
    try {
      const credentials = await this.getStoredCredentials();
      if (!credentials || !credentials.email || !credentials.password) {
        return false;
      }

      // Try to sign in with stored credentials
      await this.signIn(credentials.email, credentials.password);
      return true;
    } catch (error) {
      logger.warn('❌ Failed to restore Firebase session', { error });
      return false;
    }
  }
}
