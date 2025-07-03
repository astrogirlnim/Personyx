#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

/**
 * Test script to upload a file and verify content processing
 */
async function testFileUpload() {
  console.log('🧪 Testing file upload content processing...');
  
  const testFilePath = '/tmp/test_unique_content.md';
  
  if (!fs.existsSync(testFilePath)) {
    console.error('❌ Test file not found:', testFilePath);
    process.exit(1);
  }
  
  const fileContent = fs.readFileSync(testFilePath, 'utf8');
  console.log('📄 Test file content preview:');
  console.log(fileContent.substring(0, 200) + '...');
  console.log(`📊 File size: ${fileContent.length} bytes`);
  
  console.log('\n🎯 Manual test instructions:');
  console.log('1. Open the Personyx app');
  console.log('2. Use drag & drop or import modal to upload:', testFilePath);
  console.log('3. Check logs for debug messages about cached content');
  console.log('4. Verify that the processed content matches this file, not test_prd_update_1.md');
  console.log('\n📋 Expected content indicators:');
  console.log('- Title: "Different PRD Content"');
  console.log('- Section: "This is a unique test file to validate the file upload content fix"');
  console.log('- NOT: "Test PRD for Evidence Score Updates"');
  
  console.log('\n🔍 To check logs for debug output:');
  console.log('tail -f "/Users/ns/Library/Application Support/personyx/logs/main-2025-07-03.log" | grep -E "(DEBUG|CONTENT CORRUPTION)"');
}

testFileUpload().catch(console.error); 