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

# Check current better-sqlite3 module status
echo "📍 Current better-sqlite3 status:"
if [ -f "node_modules/better-sqlite3/build/Release/better_sqlite3.node" ]; then
    echo "✅ Native module exists"
    file node_modules/better-sqlite3/build/Release/better_sqlite3.node | head -1
else
    echo "❌ Native module not found"
fi
echo ""

# Remove existing builds to force fresh compilation
echo "🧹 Cleaning existing native module builds..."
rm -rf node_modules/better-sqlite3/build/ 2>/dev/null || echo "No existing build to clean"
echo ""

# Primary rebuild strategy: Use @electron/rebuild with force flag
echo "🔄 Using @electron/rebuild to rebuild native modules..."
if npx @electron/rebuild --only=better-sqlite3 --force; then
    echo "✅ @electron/rebuild completed"
    
    # Verify the rebuild worked
    echo "🧪 Verifying rebuild success..."
    if [ -f "node_modules/better-sqlite3/build/Release/better_sqlite3.node" ]; then
        echo "✅ Successfully rebuilt better-sqlite3 for Electron"
        file node_modules/better-sqlite3/build/Release/better_sqlite3.node | head -1
    else
        echo "⚠️  Rebuild completed but module not found, trying fallback..."
    fi
else
    echo "⚠️  @electron/rebuild failed, trying electron-builder as fallback..."
fi

# Fallback 1: electron-builder install-app-deps
if [ ! -f "node_modules/better-sqlite3/build/Release/better_sqlite3.node" ]; then
    echo "🔄 Fallback 1: Using electron-builder install-app-deps..."
    
    # Check if Python distutils issue exists
    if python3 -c "from distutils.version import StrictVersion" 2>/dev/null; then
        echo "✅ Python distutils available"
        npx electron-builder install-app-deps
    else
        echo "❌ Python distutils not available (Python 3.12+ issue)"
    fi
fi

# Fallback 2: Direct npm rebuild for Node.js target, then rebuild for Electron
if [ ! -f "node_modules/better-sqlite3/build/Release/better_sqlite3.node" ]; then
    echo "🔄 Fallback 2: Direct npm rebuild sequence..."
    
    # First rebuild for current Node.js
    echo "  📦 Rebuilding for Node.js..."
    npm rebuild better-sqlite3
    
    # Then rebuild for Electron
    echo "  ⚡ Rebuilding for Electron..."
    npx @electron/rebuild --only=better-sqlite3 --force
fi

# Fallback 3: Package manager rebuild
if [ ! -f "node_modules/better-sqlite3/build/Release/better_sqlite3.node" ]; then
    echo "🔄 Fallback 3: Using package manager rebuild..."
    if command -v pnpm &> /dev/null; then
        pnpm rebuild better-sqlite3
    else
        npm rebuild better-sqlite3
    fi
    
    # Follow up with Electron rebuild
    npx @electron/rebuild --only=better-sqlite3 --force
fi

# Final verification
echo ""
echo "🧪 Final verification..."
if [ -f "node_modules/better-sqlite3/build/Release/better_sqlite3.node" ]; then
    echo "✅ Native module successfully rebuilt!"
    echo "📊 Module info:"
    file node_modules/better-sqlite3/build/Release/better_sqlite3.node | head -1
else
    echo "❌ Native module rebuild failed"
    echo ""
    echo "🆘 Emergency fallback options:"
    echo "   1. rm -rf node_modules package-lock.json && npm install"
    echo "   2. Switch to Node.js version that matches Electron"
    echo "   3. Use alternative database solution temporarily"
fi

echo ""
echo "✅ Native modules rebuild process complete!"
echo ""
echo "💡 If you continue to have NODE_MODULE_VERSION issues:"
echo "   1. Ensure you're using Node.js version from .nvmrc"
echo "   2. Try: rm -rf node_modules pnpm-lock.yaml && pnpm install --ignore-scripts && npx @electron/rebuild"
echo "   3. Check that your Python version supports distutils or install setuptools"
echo "   4. Consider using a different Node.js version that matches Electron's requirements" 