#!/usr/bin/env node

/**
 * Test script to verify timestamp conversion fix
 * Tests the EvidenceRepo timestamp conversion logic
 */

import { EvidenceRepo } from './src/main/db/repositories/EvidenceRepo.js';
import { initDatabase } from './src/main/db/connection.js';

console.log('🧪 Testing timestamp conversion fix...\n');

try {
  // Initialize database
  console.log('📚 Initializing database...');
  initDatabase();
  
  // Create evidence repo instance
  const evidenceRepo = new EvidenceRepo();
  
  // Test reading existing evidence for agency_marketer
  console.log('\n🔍 Testing evidence retrieval for agency_marketer...');
  const agencyEvidence = await evidenceRepo.findByPersonaId('agency_marketer');
  
  console.log(`\n📊 Results:`);
  console.log(`- Found ${agencyEvidence.length} evidence items`);
  
  if (agencyEvidence.length > 0) {
    console.log('\n📋 Sample evidence item:');
    const sample = agencyEvidence[0];
    console.log(`- ID: ${sample.id}`);
    console.log(`- Content: ${sample.content.substring(0, 50)}...`);
    console.log(`- Timestamp: ${sample.timestamp}`);
    console.log(`- Timestamp ISO: ${sample.timestamp.toISOString()}`);
    console.log(`- Timestamp Ms: ${sample.timestamp.getTime()}`);
    console.log(`- Is Valid Date: ${!isNaN(sample.timestamp.getTime())}`);
    console.log(`- Tags: ${JSON.stringify(sample.tags)}`);
    console.log(`- Importance: ${sample.importance}`);
  }
  
  // Test reading existing evidence for solo_founder
  console.log('\n🔍 Testing evidence retrieval for solo_founder...');
  const soloEvidence = await evidenceRepo.findByPersonaId('solo_founder');
  
  console.log(`\n📊 Results:`);
  console.log(`- Found ${soloEvidence.length} evidence items`);
  
  if (soloEvidence.length > 0) {
    console.log('\n📋 Sample evidence item:');
    const sample = soloEvidence[0];
    console.log(`- ID: ${sample.id}`);
    console.log(`- Content: ${sample.content.substring(0, 50)}...`);
    console.log(`- Timestamp: ${sample.timestamp}`);
    console.log(`- Timestamp ISO: ${sample.timestamp.toISOString()}`);
    console.log(`- Timestamp Ms: ${sample.timestamp.getTime()}`);
    console.log(`- Is Valid Date: ${!isNaN(sample.timestamp.getTime())}`);
    console.log(`- Tags: ${JSON.stringify(sample.tags)}`);
    console.log(`- Importance: ${sample.importance}`);
  }
  
  // Summary
  const totalEvidence = agencyEvidence.length + soloEvidence.length;
  const validTimestamps = [...agencyEvidence, ...soloEvidence].filter(e => !isNaN(e.timestamp.getTime())).length;
  
  console.log(`\n✨ Summary:`);
  console.log(`- Total evidence items: ${totalEvidence}`);
  console.log(`- Valid timestamps: ${validTimestamps}`);
  console.log(`- Success rate: ${totalEvidence > 0 ? (validTimestamps / totalEvidence * 100).toFixed(1) + '%' : 'N/A'}`);
  
  if (validTimestamps === totalEvidence && totalEvidence > 0) {
    console.log('\n🎉 SUCCESS: All timestamps converted correctly!');
    process.exit(0);
  } else {
    console.log('\n❌ FAILURE: Some timestamps are still invalid');
    process.exit(1);
  }
  
} catch (error) {
  console.error('\n❌ Test failed with error:', error);
  process.exit(1);
} 