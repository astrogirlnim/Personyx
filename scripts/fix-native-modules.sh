#!/bin/bash

# Personyx Native Module Fix Script
# Simple, reliable approach to fixing better-sqlite3 and keytar for Electron

set -e

echo "🔧 Personyx Native Module Fix Script"
echo "====================================="

# Check Node.js version
NODE_VERSION=$(node --version)
echo "� Node.js version: $NODE_VERSION"
echo "🎯 Target: Electron 28.3.3 (Node.js module version 119)"
echo ""

# Clean up any existing builds
echo "🧹 Cleaning existing native module builds..."
rm -rf node_modules/better-sqlite3/build 2>/dev/null || true
rm -rf node_modules/keytar/build 2>/dev/null || true
echo "✅ Cleanup complete"
echo ""

# Rebuild for Electron
echo "🔄 Rebuilding native modules for Electron..."
npx @electron/rebuild --only=better-sqlite3,keytar --force

# Verify the rebuild
echo ""
echo "� Verifying native modules..."

if [ -f "node_modules/better-sqlite3/build/Release/better_sqlite3.node" ]; then
    echo "✅ better-sqlite3: OK"
else
    echo "❌ better-sqlite3: MISSING"
    echo "⚠️  Database functionality may not work"
fi

if [ -f "node_modules/keytar/build/Release/keytar.node" ]; then
    echo "✅ keytar: OK"
else
    echo "❌ keytar: MISSING"
    echo "⚠️  Credential storage may not work"
fi

echo ""
echo "✅ Native module rebuild complete!"
echo "🚀 You can now run: npm run dev"
