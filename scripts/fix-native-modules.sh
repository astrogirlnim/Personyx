#!/bin/bash

# Fix Native Modules for Electron
# This script resolves Node.js version mismatches between Electron and native modules

echo "🔧 Fixing native modules for Electron..."
echo ""

# Check current Node.js version
echo "📍 Current Node.js version:"
node --version
echo ""

# Check Electron version  
echo "📍 Current Electron version:"
npx electron --version
echo ""

# Primary rebuild strategy: Use @electron/rebuild (most reliable)
echo "🔄 Using @electron/rebuild to rebuild native modules..."
if npx @electron/rebuild --only=better-sqlite3; then
    echo "✅ Successfully rebuilt better-sqlite3 for Electron"
else
    echo "⚠️  @electron/rebuild failed, trying electron-builder as fallback..."
    
    # Check if Python distutils issue exists
    if python3 -c "from distutils.version import StrictVersion" 2>/dev/null; then
        echo "✅ Python distutils available"
        echo "🔨 Rebuilding native modules with electron-builder..."
        npx electron-builder install-app-deps
    else
        echo "❌ Python distutils not available (Python 3.12+ issue)"
        echo "🔄 Trying pnpm rebuild as last resort..."
        pnpm rebuild better-sqlite3
    fi
fi

echo ""
echo "✅ Native modules rebuild complete!"
echo ""
echo "💡 If you continue to have issues:"
echo "   1. Ensure you're using Node.js version from .nvmrc"
echo "   2. Try: rm -rf node_modules pnpm-lock.yaml && pnpm install --ignore-scripts && npx @electron/rebuild"
echo "   3. Check that your Python version supports distutils or install setuptools" 