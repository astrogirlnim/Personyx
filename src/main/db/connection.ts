/**
 * SQLite database connection for Personyx
 * Lazy singleton pattern with proper cleanup
 */

import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { app } from 'electron';
import { join } from 'path';
import { existsSync, mkdirSync, statSync } from 'fs';
import { Logger } from '@main/utils/logger';
import * as schema from './schema';

const logger = new Logger('database');

let dbInstance: Database.Database | null = null;
let drizzleInstance: ReturnType<typeof drizzle> | null = null;

/**
 * Get SQLite database path in userData directory
 */
function getDatabasePath(): string {
  const userDataPath = app.getPath('userData');
  const dbDir = join(userDataPath, 'db');

  // Ensure database directory exists
  if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true });
    logger.info('📁 Created database directory', { path: dbDir });
  }

  return join(dbDir, 'personyx.db');
}

/**
 * Initialize SQLite database connection
 * Returns Drizzle client with schema
 */
export function initDatabase(): ReturnType<typeof drizzle> {
  if (drizzleInstance) {
    logger.debug('🔄 Reusing existing database connection');
    return drizzleInstance;
  }

  try {
    const dbPath = getDatabasePath();
    logger.info('🗄️ Initializing SQLite database', { path: dbPath });

    // Create better-sqlite3 connection
    dbInstance = new Database(dbPath);

    // Enable WAL mode for better performance
    dbInstance.pragma('journal_mode = WAL');
    dbInstance.pragma('synchronous = NORMAL');
    dbInstance.pragma('foreign_keys = ON');

    logger.info('✅ SQLite pragmas configured: WAL mode, foreign keys enabled');

    // Create Drizzle client
    drizzleInstance = drizzle(dbInstance, { schema });

    // Run migrations
    runMigrations();

    logger.info('🚀 Database initialized successfully');
    return drizzleInstance;
  } catch (error) {
    logger.error('❌ Failed to initialize database', error);
    throw error;
  }
}

/**
 * Run database migrations
 */
function runMigrations(): void {
  if (!drizzleInstance) {
    throw new Error('Database not initialized');
  }

  try {
    const migrationsPath = join(__dirname, 'migrations');

    // Only run migrations if migrations folder exists
    if (existsSync(migrationsPath)) {
      logger.info('🔄 Running database migrations', { path: migrationsPath });
      migrate(drizzleInstance, { migrationsFolder: migrationsPath });
      logger.info('✅ Database migrations completed');
    } else {
      logger.info('📝 No migrations folder found, skipping migrations');
    }
  } catch (error) {
    logger.error('❌ Migration failed', error);
    throw error;
  }
}

/**
 * Get the current database instance
 * Initializes if not already done
 */
export function getDatabase(): ReturnType<typeof drizzle> {
  if (!drizzleInstance) {
    return initDatabase();
  }
  return drizzleInstance;
}

/**
 * Close database connection
 * Called during app shutdown
 */
export function closeDatabase(): void {
  if (dbInstance) {
    logger.info('🔒 Closing database connection');
    dbInstance.close();
    dbInstance = null;
    drizzleInstance = null;
    logger.info('✅ Database connection closed');
  }
}

/**
 * Get database statistics for debugging
 */
export function getDatabaseStats(): {
  isConnected: boolean;
  path: string;
  size?: number;
} {
  const path = getDatabasePath();
  const isConnected = dbInstance !== null;

  let size: number | undefined;
  if (existsSync(path)) {
    const stats = statSync(path);
    size = stats.size;
  }

  return { isConnected, path, size };
}
