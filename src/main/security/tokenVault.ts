/**
 * AES-256-GCM Token Vault for Personyx
 * Secure storage for third-party API tokens using OS keychain
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import * as keytar from 'keytar';
import { eq } from 'drizzle-orm';
import { getDatabase } from '@main/db/connection';
import { apiTokens } from '@main/db/schema';
import { Logger } from '@main/utils/logger';
import { SECURITY } from '@shared/constants';

const logger = new Logger('token-vault');

// Service name for keytar
const KEYCHAIN_SERVICE = SECURITY.KEYCHAIN_SERVICE_NAME;
const MASTER_KEY_ACCOUNT = 'vault-master-key';

/**
 * Supported API services
 */
export type ApiService =
  | 'openai'
  | 'notion'
  | 'slack'
  | 'linear'
  | 'firebase-cloud';

/**
 * Encrypted token data structure
 */
interface EncryptedTokenData {
  service: ApiService;
  cipherText: string;
  iv: string;
  authTag: string;
}

/**
 * Get or generate master key for encryption
 * Stored securely in OS keychain
 */
async function getMasterKey(): Promise<Buffer> {
  try {
    // Try to retrieve existing master key
    const existingKey = await keytar.getPassword(
      KEYCHAIN_SERVICE,
      MASTER_KEY_ACCOUNT
    );

    if (existingKey) {
      logger.debug('🔑 Retrieved existing master key from keychain');
      return Buffer.from(existingKey, 'hex');
    }

    // Generate new master key
    const newKey = randomBytes(SECURITY.TOKEN_ENCRYPTION_KEY_LENGTH);
    await keytar.setPassword(
      KEYCHAIN_SERVICE,
      MASTER_KEY_ACCOUNT,
      newKey.toString('hex')
    );

    logger.info('🔐 Generated new master key and stored in keychain');
    return newKey;
  } catch (error) {
    logger.error('❌ Failed to get/generate master key', error);
    throw new Error('Failed to access keychain for master key');
  }
}

/**
 * Encrypt a token using AES-256-GCM
 */
async function encryptToken(token: string): Promise<EncryptedTokenData> {
  try {
    const masterKey = await getMasterKey();
    const iv = randomBytes(SECURITY.AES_IV_LENGTH);

    // Create cipher
    const cipher = createCipheriv('aes-256-gcm', masterKey, iv);

    // Encrypt token
    let cipherText = cipher.update(token, 'utf8', 'hex');
    cipherText += cipher.final('hex');

    // Get authentication tag
    const authTag = cipher.getAuthTag();

    logger.debug('🔒 Token encrypted successfully');

    return {
      service: 'openai', // Will be set by caller
      cipherText,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
    };
  } catch (error) {
    logger.error('❌ Failed to encrypt token', error);
    throw new Error('Token encryption failed');
  }
}

/**
 * Decrypt a token using AES-256-GCM
 */
async function decryptToken(
  encryptedData: EncryptedTokenData
): Promise<string> {
  try {
    const masterKey = await getMasterKey();
    const iv = Buffer.from(encryptedData.iv, 'hex');
    const authTag = Buffer.from(encryptedData.authTag, 'hex');

    // Create decipher
    const decipher = createDecipheriv('aes-256-gcm', masterKey, iv);
    decipher.setAuthTag(authTag);

    // Decrypt token
    let decryptedText = decipher.update(
      encryptedData.cipherText,
      'hex',
      'utf8'
    );
    decryptedText += decipher.final('utf8');

    logger.debug('🔓 Token decrypted successfully');
    return decryptedText;
  } catch (error) {
    logger.error('❌ Failed to decrypt token', error);
    throw new Error('Token decryption failed');
  }
}

/**
 * Store an API token securely
 */
export async function storeToken(
  service: ApiService,
  token: string
): Promise<void> {
  try {
    // Input validation
    if (!service || service.trim() === '') {
      throw new Error('Service name cannot be empty');
    }

    if (!token || token.trim() === '') {
      throw new Error('Token cannot be empty');
    }

    logger.info(`🔐 Storing token for service: ${service}`);

    const db = getDatabase();
    const encryptedData = await encryptToken(token);
    encryptedData.service = service;

    // Generate unique ID for this token
    const tokenId = `${service}-${Date.now()}`;

    // Delete existing token for this service
    await db.delete(apiTokens).where(eq(apiTokens.service, service));

    // Insert new encrypted token
    await db.insert(apiTokens).values({
      id: tokenId,
      service,
      tokenEncrypted: encryptedData.cipherText,
      iv: encryptedData.iv,
      authTag: encryptedData.authTag,
    });

    logger.info(`✅ Token stored successfully for service: ${service}`);
  } catch (error) {
    logger.error(`❌ Failed to store token for service: ${service}`, error);
    throw error;
  }
}

/**
 * Retrieve an API token
 */
export async function getToken(service: ApiService): Promise<string | null> {
  try {
    logger.debug(`🔍 Retrieving token for service: ${service}`);

    const db = getDatabase();
    const result = await db
      .select()
      .from(apiTokens)
      .where(eq(apiTokens.service, service))
      .limit(1);

    if (result.length === 0) {
      logger.debug(`📭 No token found for service: ${service}`);
      return null;
    }

    const tokenData = result[0];
    const encryptedData: EncryptedTokenData = {
      service,
      cipherText: tokenData.tokenEncrypted,
      iv: tokenData.iv,
      authTag: tokenData.authTag,
    };

    const decryptedToken = await decryptToken(encryptedData);
    logger.debug(`✅ Token retrieved successfully for service: ${service}`);

    return decryptedToken;
  } catch (error) {
    logger.error(`❌ Failed to retrieve token for service: ${service}`, error);
    throw error;
  }
}

/**
 * Remove an API token
 */
export async function removeToken(service: ApiService): Promise<void> {
  try {
    logger.info(`🗑️ Removing token for service: ${service}`);

    const db = getDatabase();
    await db.delete(apiTokens).where(eq(apiTokens.service, service));

    logger.info(`✅ Token removed successfully for service: ${service}`);
  } catch (error) {
    logger.error(`❌ Failed to remove token for service: ${service}`, error);
    throw error;
  }
}

/**
 * List all stored token services (without revealing tokens)
 */
export async function listTokenServices(): Promise<ApiService[]> {
  try {
    logger.debug('📋 Listing stored token services');

    const db = getDatabase();
    const result = await db
      .select({ service: apiTokens.service })
      .from(apiTokens);

    const services = result.map(
      (row: { service: string }) => row.service as ApiService
    );
    logger.debug(`✅ Found tokens for ${services.length} services`, {
      services,
    });

    return services;
  } catch (error) {
    logger.error('❌ Failed to list token services', error);
    throw error;
  }
}

/**
 * Test token vault functionality
 * Used for unit tests and health checks
 */
export async function testTokenVault(): Promise<boolean> {
  try {
    logger.info('🧪 Testing token vault functionality');

    const testService: ApiService = 'openai';
    const testToken = 'test-token-' + Date.now();

    // Store test token
    await storeToken(testService, testToken);

    // Retrieve test token
    const retrievedToken = await getToken(testService);

    // Verify tokens match
    const isValid = retrievedToken === testToken;

    // Clean up test token
    await removeToken(testService);

    if (isValid) {
      logger.info('✅ Token vault test passed');
    } else {
      logger.error('❌ Token vault test failed - tokens do not match');
    }

    return isValid;
  } catch (error) {
    logger.error('❌ Token vault test failed', error);
    return false;
  }
}

/**
 * Validate token format for different services
 */
export function validateToken(service: ApiService, token: string): boolean {
  if (!token || token.trim() === '') {
    return false;
  }

  const trimmedToken = token.trim();

  switch (service) {
    case 'openai':
      // OpenAI API keys start with 'sk-' and should be at least 40 characters
      return trimmedToken.startsWith('sk-') && trimmedToken.length >= 40;

    case 'notion':
      // Notion integration tokens start with 'secret_' and are longer
      return trimmedToken.startsWith('secret_') && trimmedToken.length >= 45;

    case 'slack':
      // Slack bot tokens start with 'xoxb-' and are typically 56+ characters
      return trimmedToken.startsWith('xoxb-') && trimmedToken.length >= 50;

    case 'linear':
      // Linear API keys are UUIDs or start with 'lin_api_' and are 40+ characters
      return (
        (trimmedToken.length === 36 && /^[0-9a-f-]+$/i.test(trimmedToken)) ||
        (trimmedToken.startsWith('lin_api_') && trimmedToken.length >= 40)
      );

    case 'firebase-cloud':
      // Firebase Cloud keys are typically JWT-like or long random strings
      return trimmedToken.length >= 32;

    default:
      // Unknown service - basic length check
      return trimmedToken.length >= 20;
  }
}

/**
 * Check if a token is stored for a service (without revealing the token)
 */
export async function isTokenStored(service: ApiService): Promise<boolean> {
  try {
    logger.debug(`🔍 Checking if token is stored for service: ${service}`);

    const db = getDatabase();
    const result = await db
      .select({ service: apiTokens.service })
      .from(apiTokens)
      .where(eq(apiTokens.service, service))
      .limit(1);

    const exists = result.length > 0;
    logger.debug(
      `${exists ? '✅' : '📭'} Token ${exists ? 'exists' : 'not found'} for service: ${service}`
    );

    return exists;
  } catch (error) {
    logger.error(
      `❌ Failed to check token existence for service: ${service}`,
      error
    );
    return false;
  }
}
