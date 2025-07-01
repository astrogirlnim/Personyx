#!/usr/bin/env node

/**
 * Phase 2.4 CLI Database Seeding Tool
 * Provides mock data for local demos and testing
 */

const { createRequire } = require('module');
const path = require('path');
const crypto = require('crypto');

// Mock Electron environment for CLI usage
global.process = {
  ...process,
  type: 'main',
};

console.log('🌱 Personyx Database Seeding Tool');
console.log('=================================\n');

// Parse command line arguments
const args = process.argv.slice(2);
const command = args[0] || 'help';
const size = args[1] || 'medium';

const SEED_SIZES = {
  small: { personas: 5, evidence: 25, documents: 3, embeddings: 50 },
  medium: { personas: 15, evidence: 100, documents: 8, embeddings: 200 },
  large: { personas: 50, evidence: 500, documents: 25, embeddings: 1000 },
};

// Sample data templates
const SAMPLE_PERSONAS = [
  {
    name: 'Solo Founder',
    description: 'Independent entrepreneur building a SaaS product',
    primaryGoal: 'Launch and scale a profitable product',
    mainPainPoint: 'Limited resources and time',
    keywords: ['startup', 'mvp', 'bootstrapping', 'product-market-fit'],
  },
  {
    name: 'Agency Marketer',
    description: 'Marketing professional at a digital agency',
    primaryGoal: 'Deliver measurable results for clients',
    mainPainPoint: 'Balancing multiple client demands',
    keywords: ['campaigns', 'roi', 'client-management', 'analytics'],
  },
  {
    name: 'Enterprise PM',
    description: 'Product Manager at a Fortune 500 company',
    primaryGoal: 'Ship features that drive business metrics',
    mainPainPoint: 'Complex stakeholder alignment',
    keywords: ['roadmap', 'stakeholders', 'metrics', 'enterprise'],
  },
  {
    name: 'Startup CTO',
    description: 'Technical co-founder of an early-stage startup',
    primaryGoal: 'Build scalable technical architecture',
    mainPainPoint: 'Technical debt vs speed of delivery',
    keywords: ['architecture', 'technical-debt', 'scaling', 'team-building'],
  },
  {
    name: 'Freelance Designer',
    description: 'Independent UX/UI designer working with multiple clients',
    primaryGoal: 'Create beautiful, functional user experiences',
    mainPainPoint: 'Managing client expectations and timelines',
    keywords: ['ux', 'ui', 'client-work', 'design-systems'],
  },
];

const SAMPLE_EVIDENCE_TEMPLATES = [
  'I need a solution that works out of the box without complex setup',
  'The biggest challenge is getting stakeholder buy-in for new tools',
  'Time-to-value is crucial - I need to see results quickly',
  'Integration with existing tools is non-negotiable',
  'I prefer solutions that grow with our team size',
  'Documentation and support quality make or break tool adoption',
  'Cost predictability is more important than having every feature',
  'I need detailed analytics to justify tool ROI to leadership',
  "The learning curve can't be too steep for team adoption",
  'Security and compliance features are table stakes',
];

const SAMPLE_PRD_TEMPLATES = [
  {
    title: 'User Dashboard Redesign',
    type: 'prd',
    content: `# User Dashboard Redesign PRD

## Objective
Redesign the main user dashboard to improve user engagement and task completion rates.

## Success Metrics
- 25% increase in daily active users
- 40% reduction in time-to-first-action
- 15% improvement in task completion rate

## User Stories
- As a new user, I want to quickly understand what actions I can take
- As a returning user, I want to see my most important tasks first
- As a power user, I want to customize my dashboard layout

## Technical Requirements
- Mobile-responsive design
- Real-time data updates
- Accessibility compliance (WCAG 2.1 AA)
- Performance: <2s initial load time

## Timeline
- Design phase: 2 weeks
- Development phase: 4 weeks
- Testing phase: 1 week
- Launch: Week 8`,
  },
  {
    title: 'API Rate Limiting System',
    type: 'spec',
    content: `# API Rate Limiting System

## Overview
Implement a comprehensive rate limiting system to prevent API abuse and ensure fair usage.

## Requirements
- Per-user rate limits based on subscription tier
- Per-endpoint granular controls
- Graceful degradation under load
- Real-time monitoring and alerting

## Implementation
- Redis-based sliding window algorithm
- Configurable limits per endpoint
- Custom headers for limit information
- Webhook notifications for limit violations

## Success Criteria
- 99.9% API uptime maintained
- Sub-100ms latency overhead
- Zero false positive rate limiting`,
  },
];

async function initializeDatabase() {
  try {
    console.log('🔧 Initializing database connection...');

    // Import database modules
    const { getDatabase } = require('../dist/main/main/db/connection.js');
    const { migrate } = require('drizzle-orm/better-sqlite3/migrator');
    const db = getDatabase();

    console.log('✅ Database connection established\n');
    return db;
  } catch (error) {
    console.error('❌ Failed to initialize database:', error.message);
    process.exit(1);
  }
}

async function clearDatabase(db) {
  try {
    console.log('🧹 Clearing existing data...');

    const {
      evidenceScores,
      embeddings,
      evidence,
      productDocuments,
      personas,
      apiTokens,
    } = require('../dist/main/main/db/schema.js');

    // Clear in dependency order
    await db.delete(evidenceScores);
    await db.delete(embeddings);
    await db.delete(evidence);
    await db.delete(productDocuments);
    await db.delete(personas);
    // Keep apiTokens - don't clear user's actual API keys

    console.log('✅ Database cleared\n');
  } catch (error) {
    console.error('❌ Failed to clear database:', error.message);
    process.exit(1);
  }
}

function generateId(prefix) {
  return `${prefix}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
}

function getRandomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function generatePersona(index) {
  const base = getRandomItem(SAMPLE_PERSONAS);
  const variation = Math.floor(index / SAMPLE_PERSONAS.length) + 1;

  return {
    id: generateId('persona'),
    name: variation > 1 ? `${base.name} (${variation})` : base.name,
    description: base.description,
    primaryGoal: base.primaryGoal,
    mainPainPoint: base.mainPainPoint,
    keywords: JSON.stringify(base.keywords),
    createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // Last 30 days
    updatedAt: new Date(),
  };
}

function generateEvidence(personaId, index) {
  const template = getRandomItem(SAMPLE_EVIDENCE_TEMPLATES);
  const sourceTypes = ['interview', 'survey', 'feedback', 'analysis'];
  const sentiments = ['positive', 'neutral', 'negative'];

  return {
    id: generateId('evidence'),
    personaId,
    content: `${template} (Evidence #${index + 1})`,
    source: `Interview ${Math.floor(Math.random() * 50) + 1}`,
    sourceType: getRandomItem(sourceTypes),
    timestamp: new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000), // Last 60 days
    tags: JSON.stringify([
      getRandomItem([
        'pain-point',
        'feature-request',
        'workflow',
        'integration',
      ]),
      getRandomItem(['high-priority', 'medium-priority', 'low-priority']),
    ]),
    sentiment: getRandomItem(sentiments),
    importance: Math.floor(Math.random() * 10) + 1,
  };
}

function generateDocument(index) {
  const template = getRandomItem(SAMPLE_PRD_TEMPLATES);
  const variation = Math.floor(index / SAMPLE_PRD_TEMPLATES.length) + 1;

  return {
    id: generateId('doc'),
    title: variation > 1 ? `${template.title} v${variation}` : template.title,
    content: template.content,
    filePath: `./samples/${template.title.toLowerCase().replace(/\s+/g, '-')}-v${variation}.md`,
    type: template.type,
    uploadedAt: new Date(Date.now() - Math.random() * 45 * 24 * 60 * 60 * 1000),
    lastModified: new Date(),
    evidenceScore: Math.random() * 100, // Random score for demo
  };
}

function generateEmbedding(evidenceId, index) {
  // Generate a realistic embedding vector (simplified for demo)
  const dimensions = 1536; // OpenAI text-embedding-3-small dimensions
  const embedding = Array.from(
    { length: dimensions },
    () => (Math.random() - 0.5) * 2 // Random values between -1 and 1
  );

  return {
    id: generateId('emb'),
    evidenceId,
    embedding: JSON.stringify(embedding),
    model: 'text-embedding-3-small',
    dimensions,
    chunkIndex: 0,
    chunkCount: 1,
    createdAt: new Date(),
  };
}

function generateEvidenceScore(documentId, personaId) {
  const score = Math.random() * 100;
  const recency = Math.random() * 100;
  const coverage = Math.random() * 100;
  const relevance = Math.random() * 100;

  const topQuotes = [
    'This feature would save us hours every week',
    'The current workflow is too complex',
    'Integration with our existing tools is essential',
  ];

  return {
    id: generateId('score'),
    documentId,
    personaId,
    score,
    evidenceCount: Math.floor(Math.random() * 20) + 5,
    lastCalculated: new Date(),
    topQuotes: JSON.stringify(
      topQuotes.slice(0, Math.floor(Math.random() * 3) + 1)
    ),
    breakdownRecency: recency,
    breakdownCoverage: coverage,
    breakdownRelevance: relevance,
  };
}

async function seedDatabase(db, config) {
  try {
    console.log(`🌱 Seeding database with ${size} dataset...`);
    console.log(
      `   📊 Target: ${config.personas} personas, ${config.evidence} evidence, ${config.documents} documents, ${config.embeddings} embeddings\n`
    );

    const {
      personas,
      evidence,
      productDocuments,
      embeddings,
      evidenceScores,
    } = require('../dist/main/main/db/schema.js');

    // 1. Create personas
    console.log('👥 Creating personas...');
    const personaData = [];
    for (let i = 0; i < config.personas; i++) {
      personaData.push(generatePersona(i));
    }
    await db.insert(personas).values(personaData);
    console.log(`✅ Created ${personaData.length} personas`);

    // 2. Create evidence
    console.log('📝 Creating evidence...');
    const evidenceData = [];
    for (let i = 0; i < config.evidence; i++) {
      const randomPersona = getRandomItem(personaData);
      evidenceData.push(generateEvidence(randomPersona.id, i));
    }
    await db.insert(evidence).values(evidenceData);
    console.log(`✅ Created ${evidenceData.length} evidence entries`);

    // 3. Create documents
    console.log('📄 Creating documents...');
    const documentData = [];
    for (let i = 0; i < config.documents; i++) {
      documentData.push(generateDocument(i));
    }
    await db.insert(productDocuments).values(documentData);
    console.log(`✅ Created ${documentData.length} documents`);

    // 4. Create embeddings
    console.log('🔗 Creating embeddings...');
    const embeddingData = [];
    const evidenceForEmbeddings = evidenceData.slice(
      0,
      Math.min(config.embeddings, evidenceData.length)
    );
    for (let i = 0; i < evidenceForEmbeddings.length; i++) {
      embeddingData.push(generateEmbedding(evidenceForEmbeddings[i].id, i));
    }
    await db.insert(embeddings).values(embeddingData);
    console.log(`✅ Created ${embeddingData.length} embeddings`);

    // 5. Create evidence scores
    console.log('🎯 Creating evidence scores...');
    const scoreData = [];
    for (const doc of documentData) {
      for (const persona of personaData.slice(
        0,
        Math.min(5, personaData.length)
      )) {
        scoreData.push(generateEvidenceScore(doc.id, persona.id));
      }
    }
    await db.insert(evidenceScores).values(scoreData);
    console.log(`✅ Created ${scoreData.length} evidence scores`);

    console.log('\n🎉 Database seeding completed successfully!');

    // Display summary
    console.log('\n📊 Seeding Summary:');
    console.log(`   👥 Personas: ${personaData.length}`);
    console.log(`   📝 Evidence: ${evidenceData.length}`);
    console.log(`   📄 Documents: ${documentData.length}`);
    console.log(`   🔗 Embeddings: ${embeddingData.length}`);
    console.log(`   🎯 Evidence Scores: ${scoreData.length}`);
  } catch (error) {
    console.error('❌ Failed to seed database:', error.message);
    console.error(error);
    process.exit(1);
  }
}

async function showStats(db) {
  try {
    console.log('📊 Current Database Statistics\n');

    const {
      personas,
      evidence,
      productDocuments,
      embeddings,
      evidenceScores,
    } = require('../dist/main/main/db/schema.js');

    const personaCount = (await db.select().from(personas)).length;
    const evidenceCount = (await db.select().from(evidence)).length;
    const documentCount = (await db.select().from(productDocuments)).length;
    const embeddingCount = (await db.select().from(embeddings)).length;
    const scoreCount = (await db.select().from(evidenceScores)).length;

    console.log(`👥 Personas: ${personaCount}`);
    console.log(`📝 Evidence: ${evidenceCount}`);
    console.log(`📄 Documents: ${documentCount}`);
    console.log(`🔗 Embeddings: ${embeddingCount}`);
    console.log(`🎯 Evidence Scores: ${scoreCount}`);

    if (personaCount > 0) {
      console.log('\n🔍 Sample Personas:');
      const samplePersonas = await db.select().from(personas).limit(3);
      for (const persona of samplePersonas) {
        console.log(`   • ${persona.name}: ${persona.description}`);
      }
    }
  } catch (error) {
    console.error('❌ Failed to get database stats:', error.message);
    process.exit(1);
  }
}

function showHelp() {
  console.log(`Usage: node scripts/db-seed-mock.js <command> [size]

Commands:
  seed [size]    Seed database with mock data
  clear          Clear all data from database  
  stats          Show current database statistics
  help           Show this help message

Sizes:
  small          ${SEED_SIZES.small.personas} personas, ${SEED_SIZES.small.evidence} evidence, ${SEED_SIZES.small.documents} documents
  medium         ${SEED_SIZES.medium.personas} personas, ${SEED_SIZES.medium.evidence} evidence, ${SEED_SIZES.medium.documents} documents  
  large          ${SEED_SIZES.large.personas} personas, ${SEED_SIZES.large.evidence} evidence, ${SEED_SIZES.large.documents} documents

Examples:
  node scripts/db-seed-mock.js seed small
  node scripts/db-seed-mock.js seed medium
  node scripts/db-seed-mock.js clear
  node scripts/db-seed-mock.js stats

Note: This tool preserves API tokens in the apiTokens table.
`);
}

async function main() {
  switch (command) {
    case 'seed':
      if (!SEED_SIZES[size]) {
        console.error(`❌ Invalid size: ${size}. Use: small, medium, or large`);
        process.exit(1);
      }
      const db = await initializeDatabase();
      await clearDatabase(db);
      await seedDatabase(db, SEED_SIZES[size]);
      break;

    case 'clear':
      const clearDb = await initializeDatabase();
      await clearDatabase(clearDb);
      console.log('🧹 Database cleared successfully!');
      break;

    case 'stats':
      const statsDb = await initializeDatabase();
      await showStats(statsDb);
      break;

    case 'help':
    default:
      showHelp();
      break;
  }
}

main().catch(error => {
  console.error('💥 Seeding tool failed:', error);
  process.exit(1);
});
