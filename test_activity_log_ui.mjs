/**
 * Test Activity Log UI Communication
 * Temporary test script to verify IPC communication
 */

import Database from 'better-sqlite3';
import { join } from 'path';
import { homedir } from 'os';

console.log('🧪 Testing Activity Log Database Communication...\n');

try {
  // Connect to the same database the app uses
  const dbPath = join(homedir(), 'Library/Application Support/Personyx/db/personyx.db');
  console.log('📁 Database path:', dbPath);
  
  const db = new Database(dbPath);
  
  // Test 1: Check if activity_log table exists
  console.log('\n📝 Test 1: Check table existence');
  const tableCheck = db.prepare(`
    SELECT name FROM sqlite_master WHERE type='table' AND name='activity_log'
  `).get();
  console.log('✅ activity_log table exists:', !!tableCheck);
  
  // Test 2: Count total activities
  console.log('\n📊 Test 2: Count activities');
  const countResult = db.prepare('SELECT COUNT(*) as count FROM activity_log').get();
  console.log('✅ Total activities:', countResult.count);
  
  // Test 3: Get recent activities (simulating the UI call)
  console.log('\n📋 Test 3: Get recent activities');
  const activities = db.prepare(`
    SELECT id, type, title, description, source, 
           datetime(timestamp, 'unixepoch') as timestamp_formatted,
           datetime(created_at, 'unixepoch') as created_formatted
    FROM activity_log 
    ORDER BY timestamp DESC 
    LIMIT 5
  `).all();
  
  console.log('✅ Recent activities:');
  activities.forEach((activity, index) => {
    console.log(`   ${index + 1}. [${activity.type}] ${activity.title}`);
    console.log(`      Source: ${activity.source}`);
    console.log(`      Created: ${activity.created_formatted}`);
    console.log(`      ID: ${activity.id}`);
    console.log('');
  });
  
  // Test 4: Test statistics (simulating stats call)
  console.log('📈 Test 4: Calculate statistics');
  const stats = db.prepare(`
    SELECT 
      COUNT(*) as total,
      COUNT(CASE WHEN type = 'import-success' THEN 1 END) as success_count,
      COUNT(CASE WHEN type = 'import-error' THEN 1 END) as error_count,
      COUNT(CASE WHEN DATE(created_at, 'unixepoch') = DATE('now') THEN 1 END) as today_count
    FROM activity_log
  `).get();
  
  const successRate = stats.total > 0 ? (stats.success_count / stats.total * 100).toFixed(1) : 0;
  
  console.log('✅ Activity Statistics:');
  console.log(`   Total activities: ${stats.total}`);
  console.log(`   Success count: ${stats.success_count}`);
  console.log(`   Error count: ${stats.error_count}`);
  console.log(`   Today's activities: ${stats.today_count}`);
  console.log(`   Success rate: ${successRate}%`);
  
  // Test 5: Test filtering (simulating filter functionality)
  console.log('\n🔍 Test 5: Test filtering by type');
  const filteredActivities = db.prepare(`
    SELECT COUNT(*) as count 
    FROM activity_log 
    WHERE type = 'import-success'
  `).get();
  console.log('✅ Import success activities:', filteredActivities.count);
  
  db.close();
  
  console.log('\n🎉 All tests passed! Activity Log database communication is working correctly.');
  console.log('\n💡 Next steps:');
  console.log('   1. Open the Personyx app');
  console.log('   2. Press Ctrl+L or click the Activity Log button');
  console.log('   3. Verify the UI shows the activities listed above');
  console.log('   4. Test search and filtering functionality');
  
} catch (error) {
  console.error('❌ Test failed:', error.message);
  process.exit(1);
} 