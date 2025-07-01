/**
 * Setup OpenAI API Key for Personyx
 * Run this script to securely store your OpenAI API key
 */

import readline from 'readline';
import { storeToken } from '../dist/main/security/tokenVault.js';
import { initDatabase } from '../dist/main/db/connection.js';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function setupOpenAIKey() {
  console.log('🔑 Personyx OpenAI API Key Setup');
  console.log('================================');
  console.log('');
  console.log(
    'This will securely store your OpenAI API key using AES-256-GCM encryption.'
  );
  console.log('Your key will be stored locally in your system keychain.');
  console.log('');

  rl.question('Enter your OpenAI API Key (sk-...): ', async apiKey => {
    if (!apiKey || !apiKey.startsWith('sk-')) {
      console.error('❌ Invalid OpenAI API key format. Must start with "sk-"');
      process.exit(1);
    }

    try {
      // Initialize database
      console.log('🔧 Initializing database...');
      await initDatabase();

      // Store the API key
      console.log('🔐 Storing API key securely...');
      await storeToken('openai', apiKey);

      console.log('✅ OpenAI API key stored successfully!');
      console.log('');
      console.log('You can now use the Embedding Retrieval API features.');
      console.log(
        'The key is encrypted and stored securely in your system keychain.'
      );
    } catch (error) {
      console.error('❌ Failed to store API key:', error.message);
      process.exit(1);
    }

    rl.close();
  });
}

// Run if called directly
if (require.main === module) {
  setupOpenAIKey().catch(console.error);
}

module.exports = { setupOpenAIKey };
