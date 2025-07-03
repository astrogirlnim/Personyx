/**
 * SQLite database connection for Personyx
 * Lazy singleton pattern with proper cleanup
 */

import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { app } from 'electron';
import { join } from 'path';
import { existsSync, mkdirSync, statSync, readFileSync } from 'fs';
import { Logger } from '@main/utils/logger';
import * as schema from './schema';

const logger = new Logger('DATABASE');

let dbInstance: Database.Database | null = null;
let drizzleInstance: ReturnType<typeof drizzle> | null = null;

/**
 * Get SQLite database path in userData directory
 * Handles test environment by using temporary or in-memory database
 */
function getDatabasePath(): string {
  // Check if we're in a test environment
  if (process.env.NODE_ENV === 'test' || process.env.VITEST === 'true') {
    // Use in-memory database for tests
    logger.info('🧪 Test environment detected, using in-memory database');
    return ':memory:';
  }

  // Check if app is available (Electron environment)
  if (typeof app === 'undefined' || !app.getPath) {
    // Not in Electron context, use local directory for testing
    const testDbPath = join(process.cwd(), 'test.db');
    logger.info('🔧 Non-Electron environment, using local test database', {
      path: testDbPath,
    });
    return testDbPath;
  }

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
 * Check if database tables exist
 */
function tablesExist(): boolean {
  if (!dbInstance) return false;

  try {
    // Check if all required tables exist (including embeddings and activity_log)
    const tableCheck = dbInstance.prepare(`
      SELECT COUNT(*) as count 
      FROM sqlite_master 
      WHERE type='table' AND name IN ('personas', 'evidence', 'product_documents', 'evidence_scores', 'api_tokens', 'embeddings', 'activity_log')
    `);

    const result = tableCheck.get() as { count: number };
    logger.debug('🔍 Table check result', { tablesFound: result.count });

    return result.count >= 7; // All 7 main tables should exist (including activity_log)
  } catch (error) {
    logger.error('❌ Error checking tables', error);
    return false;
  }
}

/**
 * Apply migration SQL directly
 */
function applyMigrationSQL(): void {
  if (!dbInstance) {
    throw new Error('Database instance not available');
  }

  try {
    // Check which tables currently exist
    const existingTables = (
      dbInstance
        .prepare(
          `
        SELECT name FROM sqlite_master WHERE type='table'
      `
        )
        .all() as { name: string }[]
    ).map(row => row.name);

    logger.debug('🔍 Existing tables found', { tables: existingTables });

    // Define required tables for each migration
    const migration0000Tables = [
      'api_tokens',
      'evidence',
      'evidence_scores',
      'personas',
      'product_documents',
    ];
    const migration0001Tables = ['embeddings'];
    const migration0002Tables = ['activity_log'];

    // Check if we need to run each migration
    const needsMigration0000 = migration0000Tables.some(
      table => !existingTables.includes(table)
    );
    const needsMigration0001 = migration0001Tables.some(
      table => !existingTables.includes(table)
    );
    const needsMigration0002 = migration0002Tables.some(
      table => !existingTables.includes(table)
    );

    let totalStatements = 0;

    // Run migration 0000 if needed
    if (needsMigration0000) {
      totalStatements += runSingleMigration('0000_common_satana.sql');
    } else {
      logger.info('⏭️ Migration 0000 skipped - tables already exist');
    }

    // Run migration 0001 if needed
    if (needsMigration0001) {
      totalStatements += runSingleMigration('0001_narrow_virginia_dare.sql');
    } else {
      logger.info(
        '⏭️ Migration 0001 skipped - embeddings table already exists'
      );
    }

    // Run migration 0002 if needed (Activity Log)
    if (needsMigration0002) {
      totalStatements += runSingleMigration('0002_activity_log_table.sql');
    } else {
      logger.info(
        '⏭️ Migration 0002 skipped - activity_log table already exists'
      );
    }

    if (totalStatements === 0 && existingTables.length === 0) {
      // If no tables exist at all and no migrations ran, create manually
      logger.info(
        '📝 No tables found and no migrations available, creating manually'
      );
      createTablesManually();
    } else {
      logger.info('🎉 Migration process completed', {
        totalStatements,
        existingTables: existingTables.length,
        needsMigration0000,
        needsMigration0001,
        needsMigration0002,
      });
    }
  } catch (error) {
    logger.error('❌ Failed to apply migration SQL', error);
    throw error;
  }
}

function runSingleMigration(migrationFile: string): number {
  const migrationPaths = [
    join(__dirname, `../../src/main/db/migrations/${migrationFile}`),
    join(process.cwd(), `src/main/db/migrations/${migrationFile}`),
    join(__dirname, `migrations/${migrationFile}`),
  ];

  let migrationSQL: string | null = null;
  let usedPath = '';

  for (const path of migrationPaths) {
    if (existsSync(path)) {
      migrationSQL = readFileSync(path, 'utf-8');
      usedPath = path;
      break;
    }
  }

  if (!migrationSQL) {
    logger.warn(`⚠️ Migration file ${migrationFile} not found, skipping`);
    return 0;
  }

  logger.info('🔄 Applying migration SQL', { source: usedPath });

  // Split SQL by statement breakpoints and execute each statement
  const statements = migrationSQL
    .split('--> statement-breakpoint')
    .map(stmt => stmt.trim())
    .filter(stmt => stmt.length > 0);

  for (const statement of statements) {
    if (statement.trim()) {
      logger.debug('📝 Executing SQL statement', {
        preview: statement.substring(0, 50) + '...',
      });
      dbInstance!.exec(statement);
    }
  }

  logger.info(`✅ Migration ${migrationFile} applied successfully`, {
    statementsExecuted: statements.length,
  });

  return statements.length;
}

/**
 * Create tables manually if migration file is not available
 */
function createTablesManually(): void {
  if (!dbInstance) {
    throw new Error('Database instance not available');
  }

  try {
    const createSQL = `
      CREATE TABLE IF NOT EXISTS personas (
        id text PRIMARY KEY NOT NULL,
        name text NOT NULL,
        description text NOT NULL,
        primary_goal text NOT NULL,
        main_pain_point text NOT NULL,
        keywords text NOT NULL,
        created_at integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at integer DEFAULT CURRENT_TIMESTAMP NOT NULL
      );

      CREATE TABLE IF NOT EXISTS product_documents (
        id text PRIMARY KEY NOT NULL,
        title text NOT NULL,
        content text NOT NULL,
        file_path text,
        type text NOT NULL,
        uploaded_at integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
        last_modified integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
        evidence_score real
      );

      CREATE TABLE IF NOT EXISTS evidence (
        id text PRIMARY KEY NOT NULL,
        persona_id text NOT NULL,
        content text NOT NULL,
        source text NOT NULL,
        source_type text NOT NULL,
        timestamp integer NOT NULL,
        tags text NOT NULL,
        sentiment text,
        importance integer NOT NULL,
        FOREIGN KEY (persona_id) REFERENCES personas(id) ON UPDATE no action ON DELETE no action
      );

      CREATE TABLE IF NOT EXISTS evidence_scores (
        id text PRIMARY KEY NOT NULL,
        document_id text NOT NULL,
        persona_id text NOT NULL,
        score real NOT NULL,
        evidence_count integer NOT NULL,
        last_calculated integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
        top_quotes text NOT NULL,
        breakdown_recency real NOT NULL,
        breakdown_coverage real NOT NULL,
        breakdown_relevance real NOT NULL,
        FOREIGN KEY (document_id) REFERENCES product_documents(id) ON UPDATE no action ON DELETE no action,
        FOREIGN KEY (persona_id) REFERENCES personas(id) ON UPDATE no action ON DELETE no action
      );

      CREATE TABLE IF NOT EXISTS api_tokens (
        id text PRIMARY KEY NOT NULL,
        service text NOT NULL,
        token_encrypted text NOT NULL,
        iv text NOT NULL,
        auth_tag text NOT NULL,
        created_at integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at integer DEFAULT CURRENT_TIMESTAMP NOT NULL
      );

      CREATE TABLE IF NOT EXISTS embeddings (
        id text PRIMARY KEY NOT NULL,
        evidence_id text NOT NULL,
        embedding text NOT NULL,
        model text NOT NULL,
        dimensions integer NOT NULL,
        chunk_index integer NOT NULL,
        chunk_count integer NOT NULL,
        created_at integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
        FOREIGN KEY (evidence_id) REFERENCES evidence(id) ON UPDATE no action ON DELETE no action
      );

      CREATE TABLE IF NOT EXISTS activity_log (
        id text PRIMARY KEY NOT NULL,
        type text NOT NULL,
        title text NOT NULL,
        description text,
        source text NOT NULL,
        metadata text,
        timestamp integer NOT NULL,
        created_at integer DEFAULT CURRENT_TIMESTAMP NOT NULL
      );

      -- Create indexes for activity_log performance
      CREATE INDEX IF NOT EXISTS idx_activity_log_timestamp ON activity_log (timestamp);
      CREATE INDEX IF NOT EXISTS idx_activity_log_type ON activity_log (type);
      CREATE INDEX IF NOT EXISTS idx_activity_log_source ON activity_log (source);
    `;

    logger.info('🔧 Creating tables manually');
    dbInstance.exec(createSQL);
    logger.info('✅ Tables created successfully');
  } catch (error) {
    logger.error('❌ Failed to create tables manually', error);
    throw error;
  }
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

    // Apply migrations/create tables
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
  if (!drizzleInstance || !dbInstance) {
    throw new Error('Database not initialized');
  }

  try {
    // Check if tables already exist
    if (tablesExist()) {
      logger.info('✅ Database tables already exist, skipping migration');
      return;
    }

    logger.info('🔄 Tables not found, applying migration');
    applyMigrationSQL();

    // Verify tables were created
    if (tablesExist()) {
      logger.info('✅ Database migration completed successfully');
    } else {
      throw new Error('Tables were not created successfully');
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
  if (path !== ':memory:' && existsSync(path)) {
    const stats = statSync(path);
    size = stats.size;
  }

  return { isConnected, path, size };
}
