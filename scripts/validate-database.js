#!/usr/bin/env node

/**
 * Standalone Database Validation Script
 * Tests database initialization without Electron dependencies
 */

/* eslint-disable @typescript-eslint/no-var-requires */

const path = require('path');
const fs = require('fs');

// Mock Electron app.getPath for validation
const mockElectron = {
  app: {
    getPath: name => {
      if (name === 'userData') {
        return path.join(process.cwd(), 'test-db');
      }
      return path.join(process.cwd(), 'test-db');
    },
  },
};

// Override Electron import for validation
const Module = require('module');
const originalRequire = Module.prototype.require;
Module.prototype.require = function (id) {
  if (id === 'electron') {
    return mockElectron;
  }
  return originalRequire.apply(this, arguments);
};

async function validateDatabase() {
  console.log('🗄️ Starting database validation...');

  try {
    // Ensure test directory exists
    const testDbDir = path.join(process.cwd(), 'test-db');
    if (!fs.existsSync(testDbDir)) {
      fs.mkdirSync(testDbDir, { recursive: true });
    }

    // Import and initialize database
    const { initDatabase } = require('../dist/main/main/db/connection.js');

    console.log('🔧 Initializing database...');
    initDatabase();

    console.log('✅ Database initialization successful');

    // Test basic operations
    console.log('🧪 Testing database operations...');

    // Check if tables exist by listing them
    const Database = require('better-sqlite3');
    const dbPath = path.join(testDbDir, 'db', 'personyx.db');

    if (fs.existsSync(dbPath)) {
      const testDb = new Database(dbPath);
      const tables = testDb
        .prepare("SELECT name FROM sqlite_master WHERE type='table'")
        .all();
      testDb.close();

      console.log(
        `📊 Found ${tables.length} tables:`,
        tables.map(t => t.name).join(', ')
      );

      const expectedTables = [
        'personas',
        'evidence',
        'api_tokens',
        'product_documents',
        'evidence_scores',
      ];
      const missingTables = expectedTables.filter(
        table => !tables.some(t => t.name === table)
      );

      if (missingTables.length === 0) {
        console.log('✅ All required tables created successfully');
      } else {
        throw new Error(`Missing tables: ${missingTables.join(', ')}`);
      }
    } else {
      throw new Error('Database file was not created');
    }

    console.log('🎉 Database validation completed successfully!');

    // Clean up test database
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
      console.log('🧹 Test database cleaned up');
    }

    return true;
  } catch (error) {
    console.error('❌ Database validation failed:', error.message);

    // Clean up on failure
    const testDbPath = path.join(process.cwd(), 'test-db', 'db', 'personyx.db');
    if (fs.existsSync(testDbPath)) {
      try {
        fs.unlinkSync(testDbPath);
        console.log('🧹 Test database cleaned up after failure');
      } catch (cleanupError) {
        console.warn(
          '⚠️ Could not clean up test database:',
          cleanupError.message
        );
      }
    }

    process.exit(1);
  }
}

// Run validation
validateDatabase();
