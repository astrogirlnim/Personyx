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

# Always rebuild native modules for Electron to prevent version conflicts
echo "🔧 Rebuilding native modules for Electron..."
echo "   This prevents Node.js version mismatches between system and Electron"
echo ""

# Use the existing fix script if it exists, otherwise use direct rebuild
if [ -f "scripts/fix-native-modules.sh" ]; then
    bash scripts/fix-native-modules.sh
else
    echo "🔄 Rebuilding better-sqlite3 for Electron..."
    npx @electron/rebuild
fi
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

# Start the development environment with enhanced debugging using npm scripts
npm run start 