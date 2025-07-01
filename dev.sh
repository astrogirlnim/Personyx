#!/bin/bash

# Personyx Development Script
# Starts the full development environment

echo ""
echo "🚀 Starting Personyx Development Environment..."
echo ""
echo "This will:"
echo "  1. Start TypeScript compilation in watch mode"
echo "  2. Start Vite dev server on http://localhost:3000"
echo "  3. Launch Electron app when ready"
echo "  4. Enable enhanced debugging (DEBUG=*, ELECTRON_ENABLE_LOGGING=1)"
echo "  5. Chrome DevTools available at chrome://inspect for main process"
echo ""
echo "Press Ctrl+C to stop all processes"
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    pnpm install
    echo ""
fi

# Enhanced native module rebuilding for Electron compatibility
echo "🔧 Fixing native modules for Electron compatibility..."
echo "   This prevents Node.js version mismatches between system and Electron"
echo ""

# Force rebuild better-sqlite3 for Electron
echo "🔄 Rebuilding better-sqlite3 specifically for Electron..."
npx @electron/rebuild --only=better-sqlite3 --force

# Verify the rebuild worked
echo "🧪 Verifying native module compatibility..."
if [ -f "node_modules/better-sqlite3/build/Release/better_sqlite3.node" ]; then
    echo "✅ better-sqlite3 native module found"
    # Check the module info
    file node_modules/better-sqlite3/build/Release/better_sqlite3.node | head -1
else
    echo "❌ better-sqlite3 native module not found - attempting full rebuild..."
    npm rebuild better-sqlite3
fi

# Additional fallback - use the comprehensive fix script if rebuild issues persist
if [ -f "scripts/fix-native-modules.sh" ]; then
    echo "🔧 Running comprehensive native module fix..."
    bash scripts/fix-native-modules.sh
fi

echo ""
echo "✅ Native module preparation complete"
echo ""

# Enhanced debugging environment variables
export ELECTRON_ENABLE_LOGGING=1
export ELECTRON_LOG_LEVEL=debug
export NODE_ENV=development

echo "🔍 Enhanced debugging enabled:"
echo "  - ELECTRON_ENABLE_LOGGING=1 (Electron internal logs)"
echo "  - Chrome DevTools: --inspect=9229"
echo "  - Verbose logging: --verbose"
echo ""

# Build the project first to ensure latest code
echo "🔨 Building project..."
npm run build

echo ""
echo "🚀 Starting development servers..."
echo ""

# Start the development environment with enhanced debugging using npm scripts
npm run start 