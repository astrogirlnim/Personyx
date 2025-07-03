/**
 * Drizzle ORM schema definitions for Personyx
 * Based on types from src/shared/types.ts
 */

import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// Personas table
export const personas = sqliteTable('personas', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  primaryGoal: text('primary_goal').notNull(),
  mainPainPoint: text('main_pain_point').notNull(),
  keywords: text('keywords').notNull(), // JSON string array
  createdAt: integer('created_at', { mode: 'timestamp' })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

// Evidence table
export const evidence = sqliteTable('evidence', {
  id: text('id').primaryKey(),
  personaId: text('persona_id')
    .notNull()
    .references(() => personas.id),
  content: text('content').notNull(),
  source: text('source').notNull(),
  sourceType: text('source_type').notNull(), // 'interview' | 'prd' | 'feedback' | 'other'
  timestamp: integer('timestamp').notNull(),
  tags: text('tags').notNull(), // JSON string array
  sentiment: text('sentiment'), // 'positive' | 'negative' | 'neutral' | null
  importance: integer('importance').notNull(), // 1-10 scale
});

// Embeddings table - stores vector embeddings for similarity search
export const embeddings = sqliteTable('embeddings', {
  id: text('id').primaryKey(),
  evidenceId: text('evidence_id')
    .notNull()
    .references(() => evidence.id),
  embedding: text('embedding').notNull(), // JSON-serialized float array
  model: text('model').notNull(), // e.g., 'text-embedding-3-small'
  dimensions: integer('dimensions').notNull(), // vector dimensions
  chunkIndex: integer('chunk_index').notNull(), // for multi-chunk content
  chunkCount: integer('chunk_count').notNull(), // total chunks for this evidence
  createdAt: integer('created_at', { mode: 'timestamp' })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

// Product documents table
export const productDocuments = sqliteTable('product_documents', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  filePath: text('file_path'),
  type: text('type').notNull(), // 'prd' | 'requirements' | 'spec'
  uploadedAt: integer('uploaded_at', { mode: 'timestamp' })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  lastModified: integer('last_modified', { mode: 'timestamp' })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  evidenceScore: real('evidence_score'), // 0-100
});

// Evidence scores table
export const evidenceScores = sqliteTable('evidence_scores', {
  id: text('id').primaryKey(),
  documentId: text('document_id')
    .notNull()
    .references(() => productDocuments.id),
  personaId: text('persona_id')
    .notNull()
    .references(() => personas.id),
  score: real('score').notNull(), // 0-100
  evidenceCount: integer('evidence_count').notNull(),
  lastCalculated: integer('last_calculated', { mode: 'timestamp' })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  topQuotes: text('top_quotes').notNull(), // JSON string array
  breakdownRecency: real('breakdown_recency').notNull(),
  breakdownCoverage: real('breakdown_coverage').notNull(),
  breakdownRelevance: real('breakdown_relevance').notNull(),
});

// API tokens table (encrypted)
export const apiTokens = sqliteTable('api_tokens', {
  id: text('id').primaryKey(),
  service: text('service').notNull(), // 'openai' | 'notion' | 'slack' | 'linear'
  tokenEncrypted: text('token_encrypted').notNull(), // AES-256-GCM encrypted token
  iv: text('iv').notNull(), // Initialization vector for AES
  authTag: text('auth_tag').notNull(), // Authentication tag for AES-GCM
  createdAt: integer('created_at', { mode: 'timestamp' })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

// Activity log table - tracks all app activities for Phase 3.1.6
export const activityLog = sqliteTable('activity_log', {
  id: text('id').primaryKey(),
  type: text('type').notNull(), // 'import-success' | 'import-error' | 'score-update' | 'general-activity'
  title: text('title').notNull(),
  description: text('description'),
  source: text('source').notNull(), // 'prd-import' | 'transcript-import' | 'evidence-score' | 'general'
  metadata: text('metadata'), // JSON metadata (file names, scores, errors, etc.)
  timestamp: integer('timestamp').notNull(), // Unix timestamp
  createdAt: integer('created_at', { mode: 'timestamp' })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

// Export types for use in repositories
export type Persona = typeof personas.$inferSelect;
export type NewPersona = typeof personas.$inferInsert;
export type Evidence = typeof evidence.$inferSelect;
export type NewEvidence = typeof evidence.$inferInsert;
export type Embedding = typeof embeddings.$inferSelect;
export type NewEmbedding = typeof embeddings.$inferInsert;
export type ProductDocument = typeof productDocuments.$inferSelect;
export type NewProductDocument = typeof productDocuments.$inferInsert;
export type EvidenceScore = typeof evidenceScores.$inferSelect;
export type NewEvidenceScore = typeof evidenceScores.$inferInsert;
export type ApiToken = typeof apiTokens.$inferSelect;
export type NewApiToken = typeof apiTokens.$inferInsert;
export type ActivityLog = typeof activityLog.$inferSelect;
export type NewActivityLog = typeof activityLog.$inferInsert;
