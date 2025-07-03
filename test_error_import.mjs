/**
 * Test Error Import - Direct IPC test for error logging
 * This script will test the import functionality with various error conditions
 * to verify that errors are properly logged to the activity log
 */

import Database from 'better-sqlite3';
import { join } from 'path';
import { homedir } from 'os';
import { writeFileSync, unlinkSync } from 'fs';

console.log('🧪 Testing Error Import and Activity Logging...\n');

const dbPath = join(homedir(), 'Library/Application Support/Personyx/db/personyx.db');
console.log('📁 Database path:', dbPath);

try {
  const db = new Database(dbPath);
  
  // Check initial activity count
  console.log('\\n📊 Initial Activity Log Status:');
  const initialCount = db.prepare('SELECT COUNT(*) as count FROM activity_log').get();
  console.log(`  Total activities: ${initialCount.count}`);
  
  const initialActivities = db.prepare(`
    SELECT type, title, description, datetime(timestamp, 'unixepoch') as timestamp 
    FROM activity_log 
    ORDER BY timestamp DESC 
    LIMIT 5
  `).all();
  
  console.log('  Recent activities:');
  initialActivities.forEach(activity => {
    console.log(`    [${activity.type}] ${activity.title} (${activity.timestamp})`);
  });

  // Create test files for different error scenarios
  console.log('\\n🔧 Creating Test Files:');
  
  // 1. Empty file
  const emptyFile = 'test_empty_error.md';
  writeFileSync(emptyFile, '');
  console.log(`  ✅ Created empty file: ${emptyFile}`);
  
  // 2. Invalid content file  
  const invalidFile = 'test_invalid_error.md';
  writeFileSync(invalidFile, 'x'.repeat(10)); // Very short content
  console.log(`  ✅ Created invalid file: ${invalidFile}`);
  
  // 3. Large file already exists: large_test_file.md (15MB)
  console.log(`  ✅ Large file exists: large_test_file.md`);

  console.log('\\n📋 Test files created. Please manually test these files in the app:');
  console.log('  1. Try importing test_empty_error.md (should fail - empty file)');
  console.log('  2. Try importing test_invalid_error.md (should fail - too short)');
  console.log('  3. Try importing large_test_file.md (should fail - too large: 15MB > 10MB limit)');
  console.log('\\n🔍 After testing, check activity log for error entries...');

  // Wait and check for new activities
  console.log('\\n⏳ Monitoring activity log for changes...');
  console.log('   (Press Ctrl+C to exit after testing)');

  const checkInterval = setInterval(() => {
    const currentCount = db.prepare('SELECT COUNT(*) as count FROM activity_log').get();
    
    if (currentCount.count > initialCount.count) {
      console.log(`\\n🆕 New activities detected! Total: ${currentCount.count} (was ${initialCount.count})`);
      
      const newActivities = db.prepare(`
        SELECT type, title, description, datetime(timestamp, 'unixepoch') as timestamp 
        FROM activity_log 
        ORDER BY timestamp DESC 
        LIMIT ${currentCount.count - initialCount.count}
      `).all();
      
      console.log('  New activities:');
      newActivities.forEach(activity => {
        const emoji = activity.type === 'import-error' ? '❌' : 
                     activity.type === 'import-success' ? '✅' : '📊';
        console.log(`    ${emoji} [${activity.type}] ${activity.title}`);
        if (activity.description) {
          console.log(`        ${activity.description}`);
        }
        console.log(`        Time: ${activity.timestamp}`);
      });
      
      // Check if we found any errors
      const errorCount = newActivities.filter(a => a.type === 'import-error').length;
      if (errorCount > 0) {
        console.log(`\\n🎉 SUCCESS! Found ${errorCount} error activities in the log!`);
        
        // Clean up test files
        try {
          unlinkSync(emptyFile);
          unlinkSync(invalidFile);
          console.log('\\n🧹 Cleaned up test files');
        } catch (e) {
          console.log('⚠️ Could not clean up some test files:', e.message);
        }
        
        clearInterval(checkInterval);
        process.exit(0);
      }
    }
  }, 2000); // Check every 2 seconds

  // Stop after 60 seconds
  setTimeout(() => {
    console.log('\\n⏰ Test timeout reached. Stopping monitor...');
    clearInterval(checkInterval);
    
    // Clean up test files
    try {
      unlinkSync(emptyFile);
      unlinkSync(invalidFile);
      console.log('\\n🧹 Cleaned up test files');
    } catch (e) {
      console.log('⚠️ Could not clean up some test files:', e.message);
    }
    
    process.exit(0);
  }, 60000);

} catch (error) {
  console.error('❌ Test failed:', error);
} 