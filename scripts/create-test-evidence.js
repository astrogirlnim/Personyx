#!/usr/bin/env node

/**
 * Create Test Evidence Data
 * Populates the database with mock evidence for testing evidence score differentiation
 */

import Database from 'better-sqlite3';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Database connection
const dbPath = join(__dirname, '..', 'personyx.db');
const db = Database(dbPath);

console.log('🗄️ Creating test evidence data...');

// Ensure personas exist first
const personas = [
  {
    id: 'solo_founder',
    name: 'Solo Founder',
    description:
      'Independent entrepreneur building their first product with limited resources and time.',
    primaryGoal: 'Ship MVP fast with minimal tooling overhead',
    mainPainPoint:
      'Context switching between development and uncertain feature value',
    keywords: JSON.stringify([
      'mvp',
      'validation',
      'lean startup',
      'product-market fit',
      'bootstrap',
      'time to market',
      'resource constraints',
      'feature priority',
      'user feedback',
      'iteration speed',
    ]),
  },
  {
    id: 'agency_marketer',
    name: 'Agency Marketer',
    description:
      'Marketing professional at a digital agency managing multiple client campaigns.',
    primaryGoal: 'Optimize funnels and deliver measurable client reporting',
    mainPainPoint: 'Copy iteration speed and proving return on investment',
    keywords: JSON.stringify([
      'conversion optimization',
      'funnel analysis',
      'a/b testing',
      'roi reporting',
      'client management',
      'campaign performance',
      'lead generation',
      'copywriting',
      'analytics',
      'attribution modeling',
    ]),
  },
];

// Insert personas
const insertPersona = db.prepare(`
  INSERT OR REPLACE INTO personas (id, name, description, primary_goal, main_pain_point, keywords, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

personas.forEach(persona => {
  const now = Date.now();
  insertPersona.run(
    persona.id,
    persona.name,
    persona.description,
    persona.primaryGoal,
    persona.mainPainPoint,
    persona.keywords,
    now,
    now
  );
  console.log(`✅ Created persona: ${persona.name}`);
});

// Mock evidence data for Solo Founder
const soloFounderEvidence = [
  {
    content:
      'I need to validate my MVP quickly before running out of runway. Time to market is critical.',
    source: 'User Interview #1',
    importance: 9,
    keywords: ['mvp', 'validation', 'time to market'],
  },
  {
    content:
      'As a bootstrap founder, I cannot afford expensive tools. I need lean solutions that help me prioritize features.',
    source: 'Survey Response',
    importance: 8,
    keywords: ['bootstrap', 'lean startup', 'feature priority'],
  },
  {
    content:
      'Context switching between coding and business decisions is killing my productivity. I need faster feedback loops.',
    source: 'User Interview #2',
    importance: 7,
    keywords: ['context switching', 'feedback', 'productivity'],
  },
  {
    content:
      'Product-market fit is my #1 goal. Everything else is secondary until I achieve it.',
    source: 'Survey Response',
    importance: 9,
    keywords: ['product-market fit', 'validation'],
  },
  {
    content:
      "I waste too much time building features that users don't want. Need better user feedback before development.",
    source: 'User Interview #3',
    importance: 8,
    keywords: ['user feedback', 'feature priority', 'validation'],
  },
];

// Mock evidence data for Agency Marketer
const agencyMarketerEvidence = [
  {
    content:
      'ROI reporting is everything. Clients demand clear attribution and conversion tracking across all campaigns.',
    source: 'Client Meeting Notes',
    importance: 10,
    keywords: ['roi reporting', 'attribution', 'conversion tracking'],
  },
  {
    content:
      'A/B testing copy variations takes too long. Need faster iteration tools to optimize funnels.',
    source: 'Team Standup',
    importance: 8,
    keywords: ['a/b testing', 'copywriting', 'funnel optimization'],
  },
  {
    content:
      'Managing multiple client campaigns requires better analytics dashboards. Current tools are too slow.',
    source: 'Survey Response',
    importance: 7,
    keywords: ['client management', 'analytics', 'campaign performance'],
  },
  {
    content:
      'Lead generation campaigns need better conversion optimization. Current funnel analysis is manual and time-consuming.',
    source: 'Client Meeting Notes',
    importance: 9,
    keywords: ['lead generation', 'conversion optimization', 'funnel analysis'],
  },
  {
    content:
      'Attribution modeling across channels is our biggest pain point. Clients question spend effectiveness.',
    source: 'Survey Response',
    importance: 9,
    keywords: ['attribution modeling', 'campaign performance', 'roi reporting'],
  },
];

// Insert evidence
const insertEvidence = db.prepare(`
  INSERT INTO evidence (id, persona_id, content, source, source_type, timestamp, tags, importance)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

// Insert Solo Founder evidence
soloFounderEvidence.forEach((evidence, index) => {
  const evidenceId = `evidence-solo-${Date.now()}-${index}`;
  const timestamp = Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000; // Last 30 days

  insertEvidence.run(
    evidenceId,
    'solo_founder',
    evidence.content,
    evidence.source,
    'interview',
    timestamp,
    JSON.stringify(evidence.keywords),
    evidence.importance
  );
});

console.log(
  `✅ Created ${soloFounderEvidence.length} evidence items for Solo Founder`
);

// Insert Agency Marketer evidence
agencyMarketerEvidence.forEach((evidence, index) => {
  const evidenceId = `evidence-agency-${Date.now()}-${index}`;
  const timestamp = Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000; // Last 30 days

  insertEvidence.run(
    evidenceId,
    'agency_marketer',
    evidence.content,
    evidence.source,
    'interview',
    timestamp,
    JSON.stringify(evidence.keywords),
    evidence.importance
  );
});

console.log(
  `✅ Created ${agencyMarketerEvidence.length} evidence items for Agency Marketer`
);

// Verify data
const evidenceCount = db
  .prepare('SELECT COUNT(*) as count FROM evidence')
  .get();
const personaCount = db.prepare('SELECT COUNT(*) as count FROM personas').get();

console.log(`\n📊 Database populated:`);
console.log(`   Personas: ${personaCount.count}`);
console.log(`   Evidence: ${evidenceCount.count}`);

console.log(
  '\n🎯 Now try importing different PRDs to see score differentiation!'
);
console.log(
  '   - PRDs with MVP/lean startup content should score higher for Solo Founder'
);
console.log(
  '   - PRDs with funnel/ROI content should score higher for Agency Marketer'
);

db.close();
