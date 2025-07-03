#!/usr/bin/env node

/**
 * Create Test Evidence Script
 * Clears existing evidence and reloads with proper Unix timestamps
 * This fixes the NaN recency calculation bug
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Ensure we're in the project root
const projectRoot = process.cwd();
const dbPath = path.join(projectRoot, 'data', 'personyx.db');

console.log('🔄 Creating test evidence with proper timestamps...');
console.log(`📍 Project root: ${projectRoot}`);
console.log(`📍 Database path: ${dbPath}`);

// Check if database exists
if (!fs.existsSync(dbPath)) {
  console.error(`❌ Database not found at ${dbPath}`);
  console.log('💡 Run `pnpm dev` first to create the database');
  process.exit(1);
}

try {
  // Open database connection
  const db = new Database(dbPath);
  console.log('✅ Connected to database');

  // Clear existing evidence and evidence scores
  console.log('🗑️ Clearing existing evidence data...');
  db.exec('DELETE FROM evidence_scores');
  db.exec('DELETE FROM evidence');
  console.log('✅ Cleared evidence tables');

  // Insert personas with proper Unix timestamps
  console.log('👥 Inserting personas...');
  const insertPersona = db.prepare(`
    INSERT OR REPLACE INTO personas (id, name, description, primary_goal, main_pain_point, keywords, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, unixepoch(), unixepoch())
  `);

  insertPersona.run(
    'solo_founder',
    'Solo Founder',
    'Independent entrepreneur building their first product with limited resources and time.',
    'Ship MVP fast with minimal tooling overhead',
    'Context switching between development and uncertain feature value',
    '["mvp","validation","lean startup","product-market fit","bootstrap","time to market","resource constraints","feature priority","user feedback","iteration speed"]'
  );

  insertPersona.run(
    'agency_marketer',
    'Agency Marketer',
    'Marketing professional at a digital agency managing multiple client campaigns.',
    'Optimize funnels and deliver measurable client reporting',
    'Copy iteration speed and proving return on investment',
    '["conversion optimization","funnel analysis","a/b testing","roi reporting","client management","campaign performance","lead generation","copywriting","analytics","attribution modeling"]'
  );

  console.log('✅ Inserted 2 personas');

  // Insert evidence with proper Unix timestamps
  console.log('📝 Inserting evidence data...');
  const insertEvidence = db.prepare(`
    INSERT INTO evidence (id, persona_id, content, source, source_type, timestamp, tags, importance)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Helper function to calculate Unix timestamp with offset
  const getTimestampWithOffset = daysOffset => {
    const now = Math.floor(Date.now() / 1000); // Current Unix timestamp
    const offsetSeconds = daysOffset * 24 * 60 * 60; // Days to seconds
    const result = now - offsetSeconds;
    console.log(
      `📅 Generated timestamp: ${daysOffset} days ago = ${result} (${new Date(result * 1000).toISOString()})`
    );
    return result;
  };

  // Solo Founder evidence
  const soloFounderEvidence = [
    {
      id: 'evidence-solo-1',
      content:
        'I need to validate my MVP quickly before running out of runway. Time to market is critical.',
      source: 'User Interview #1',
      daysAgo: 7,
      tags: '["mvp","validation","time to market"]',
      importance: 9,
    },
    {
      id: 'evidence-solo-2',
      content:
        'As a bootstrap founder, I cannot afford expensive tools. I need lean solutions that help me prioritize features.',
      source: 'Survey Response',
      daysAgo: 14,
      tags: '["bootstrap","lean startup","feature priority"]',
      importance: 8,
    },
    {
      id: 'evidence-solo-3',
      content:
        'Context switching between coding and business decisions is killing my productivity. I need faster feedback loops.',
      source: 'User Interview #2',
      daysAgo: 5,
      tags: '["context switching","feedback","productivity"]',
      importance: 7,
    },
    {
      id: 'evidence-solo-4',
      content:
        'Product-market fit is my #1 goal. Everything else is secondary until I achieve it.',
      source: 'Survey Response',
      daysAgo: 10,
      tags: '["product-market fit","validation"]',
      importance: 9,
    },
    {
      id: 'evidence-solo-5',
      content:
        'I waste too much time building features that users dont want. Need better user feedback before development.',
      source: 'User Interview #3',
      daysAgo: 3,
      tags: '["user feedback","feature priority","validation"]',
      importance: 8,
    },
    {
      id: 'evidence-solo-6',
      content:
        'Resource constraints mean I need to be very selective about which features to build first.',
      source: 'Survey Response',
      daysAgo: 12,
      tags: '["resource constraints","feature priority","mvp"]',
      importance: 8,
    },
  ];

  for (const evidence of soloFounderEvidence) {
    const timestamp = getTimestampWithOffset(evidence.daysAgo);
    insertEvidence.run(
      evidence.id,
      'solo_founder',
      evidence.content,
      evidence.source,
      'interview',
      timestamp,
      evidence.tags,
      evidence.importance
    );
    console.log(
      `📝 Inserted ${evidence.id} (${evidence.daysAgo} days ago, timestamp: ${timestamp})`
    );
  }

  // Agency Marketer evidence
  const agencyMarketerEvidence = [
    {
      id: 'evidence-agency-1',
      content:
        'ROI reporting is everything. Clients demand clear attribution and conversion tracking across all campaigns.',
      source: 'Client Meeting Notes',
      daysAgo: 8,
      tags: '["roi reporting","attribution","conversion tracking"]',
      importance: 10,
    },
    {
      id: 'evidence-agency-2',
      content:
        'A/B testing copy variations takes too long. Need faster iteration tools to optimize funnels.',
      source: 'Team Standup',
      daysAgo: 6,
      tags: '["a/b testing","copywriting","funnel optimization"]',
      importance: 8,
    },
    {
      id: 'evidence-agency-3',
      content:
        'Managing multiple client campaigns requires better analytics dashboards. Current tools are too slow.',
      source: 'Survey Response',
      daysAgo: 15,
      tags: '["client management","analytics","campaign performance"]',
      importance: 7,
    },
    {
      id: 'evidence-agency-4',
      content:
        'Lead generation campaigns need better conversion optimization. Current funnel analysis is manual and time-consuming.',
      source: 'Client Meeting Notes',
      daysAgo: 4,
      tags: '["lead generation","conversion optimization","funnel analysis"]',
      importance: 9,
    },
    {
      id: 'evidence-agency-5',
      content:
        'Attribution modeling across channels is our biggest pain point. Clients question spend effectiveness.',
      source: 'Survey Response',
      daysAgo: 9,
      tags: '["attribution modeling","campaign performance","roi reporting"]',
      importance: 9,
    },
    {
      id: 'evidence-agency-6',
      content:
        'Copy iteration speed directly impacts campaign performance. We need faster testing workflows.',
      source: 'Team Meeting',
      daysAgo: 2,
      tags: '["copywriting","campaign performance","a/b testing"]',
      importance: 8,
    },
  ];

  for (const evidence of agencyMarketerEvidence) {
    const timestamp = getTimestampWithOffset(evidence.daysAgo);
    insertEvidence.run(
      evidence.id,
      'agency_marketer',
      evidence.content,
      evidence.source,
      'interview',
      timestamp,
      evidence.tags,
      evidence.importance
    );
    console.log(
      `📝 Inserted ${evidence.id} (${evidence.daysAgo} days ago, timestamp: ${timestamp})`
    );
  }

  console.log('✅ Inserted 12 evidence records');

  // Verification queries
  console.log('\n🔍 Verifying data insertion...');

  const personaCount = db
    .prepare('SELECT COUNT(*) as count FROM personas')
    .get();
  console.log(`👥 Personas: ${personaCount.count}`);

  const evidenceCount = db
    .prepare('SELECT COUNT(*) as count FROM evidence')
    .get();
  console.log(`📝 Evidence: ${evidenceCount.count}`);

  // Check timestamp formats in database
  console.log('\n🕐 Verifying timestamps...');
  const timestampCheck = db
    .prepare(
      `
    SELECT id, timestamp, typeof(timestamp) as type, 
           datetime(timestamp, 'unixepoch') as human_readable
    FROM evidence 
    ORDER BY timestamp DESC 
    LIMIT 5
  `
    )
    .all();

  console.log('📊 Sample timestamps:');
  timestampCheck.forEach(row => {
    console.log(
      `  ${row.id}: ${row.timestamp} (${row.type}) = ${row.human_readable}`
    );
  });

  // Check for any invalid timestamps
  const invalidTimestamps = db
    .prepare(
      `
    SELECT id, timestamp, typeof(timestamp) as type
    FROM evidence 
    WHERE timestamp IS NULL OR timestamp = 0
  `
    )
    .all();

  if (invalidTimestamps.length > 0) {
    console.log('\n⚠️ Found invalid timestamps:');
    invalidTimestamps.forEach(row => {
      console.log(`  ${row.id}: ${row.timestamp} (${row.type})`);
    });
  } else {
    console.log('\n✅ All timestamps are valid');
  }

  // Check tags format
  console.log('\n🏷️ Verifying tags format...');
  const tagsCheck = db
    .prepare(
      `
    SELECT id, tags, typeof(tags) as type
    FROM evidence 
    LIMIT 3
  `
    )
    .all();

  console.log('📊 Sample tags:');
  tagsCheck.forEach(row => {
    console.log(`  ${row.id}: ${row.tags} (${row.type})`);
  });

  console.log('\n✅ Test evidence creation completed successfully!');
  console.log('💡 You can now run the app to test evidence score calculations');

  // Close database
  db.close();
} catch (error) {
  console.error('❌ Error creating test evidence:', error.message);
  console.error(error.stack);
  process.exit(1);
}
