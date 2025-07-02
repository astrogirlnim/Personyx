#!/bin/bash

# Personyx Aggressive Native Module Fix - Python 3.11 + Continuous Symlink Cleanup
# Addresses the EEXIST symlink error with continuous monitoring and Python 3.11 enforcement
# Based on CI/CD success pattern analysis

set -e

echo "🔧 Personyx Aggressive Native Module Fix"
echo "========================================"
echo "🎯 Target: Force Python 3.11 + Continuous Symlink Cleanup"
echo "📋 Addresses: EEXIST symlink error in node_gyp_bins"
echo ""

# Verify Python 3.11 is available and has setuptools
echo "🐍 Verifying Python 3.11 environment..."
if ! command -v python3.11 >/dev/null 2>&1; then
    echo "❌ Python 3.11 not found"
    echo "💡 Install: brew install python@3.11"
    exit 1
fi

PYTHON311_VERSION=$(python3.11 --version)
echo "✅ Found: $PYTHON311_VERSION"

if python3.11 -c "import setuptools" 2>/dev/null; then
    echo "✅ setuptools available in Python 3.11"
else
    echo "❌ setuptools missing in Python 3.11"
    echo "💡 Install: python3.11 -m pip install setuptools wheel"
    exit 1
fi

echo ""

# Function for aggressive symlink cleanup
cleanup_symlinks() {
    echo "🧹 Aggressive symlink cleanup..."
    
    # Clean existing node_gyp_bins directories
    find . -name "node_gyp_bins" -type d -print0 | while IFS= read -r -d '' dir; do
        echo "   Removing: $dir"
        rm -rf "$dir" 2>/dev/null || true
    done
    
    # Clean in user directories
    find ~/.npm -name "node_gyp_bins" -type d -print0 2>/dev/null | while IFS= read -r -d '' dir; do
        echo "   Removing: $dir"
        rm -rf "$dir" 2>/dev/null || true
    done
    
    # Clean specific python3 symlinks that cause EEXIST
    find . -name "python3" -type l -delete 2>/dev/null || true
    
    echo "✅ Symlink cleanup complete"
}

# Function for continuous monitoring and cleanup during build
monitor_and_cleanup() {
    local pid=$1
    echo "🔍 Starting continuous symlink monitoring (PID: $pid)..."
    
    while kill -0 $pid 2>/dev/null; do
        # Clean symlinks every 2 seconds during build
        find . -name "node_gyp_bins" -type d -exec rm -rf {} + 2>/dev/null || true
        sleep 2
    done
    
    echo "✅ Monitoring stopped - build process finished"
}

# Step 1: Comprehensive cleanup
echo "🧹 Comprehensive pre-build cleanup..."
cleanup_symlinks

# Clean build directories
rm -rf node_modules/better-sqlite3/build 2>/dev/null || true
rm -rf node_modules/.pnpm/*/node_modules/better-sqlite3/build 2>/dev/null || true
rm -rf node_modules/keytar/build 2>/dev/null || true
rm -rf node_modules/.pnpm/*/node_modules/keytar/build 2>/dev/null || true

echo ""

# Step 2: Set up Python 3.11 environment
echo "🐍 Configuring Python 3.11 environment for node-gyp..."
export PYTHON=/opt/homebrew/bin/python3.11
export npm_config_python=/opt/homebrew/bin/python3.11

echo "✅ Python configured:"
echo "   PYTHON=$PYTHON"
echo "   npm_config_python=$npm_config_python"
echo ""

# Step 3: Aggressive rebuild with monitoring
echo "🔄 Starting aggressive rebuild with continuous symlink cleanup..."
echo "   Method: electron-builder install-app-deps with Python 3.11"
echo "   Monitoring: Continuous node_gyp_bins cleanup"
echo ""

# Start the rebuild in background to allow monitoring
electron-builder install-app-deps &
BUILD_PID=$!

# Start monitoring in background
monitor_and_cleanup $BUILD_PID &
MONITOR_PID=$!

# Wait for build to complete
if wait $BUILD_PID; then
    echo "✅ Aggressive rebuild completed successfully"
    
    # Stop monitoring
    kill $MONITOR_PID 2>/dev/null || true
    
    # Final cleanup
    cleanup_symlinks
else
    echo "❌ Aggressive rebuild failed, trying fallback..."
    
    # Stop monitoring
    kill $MONITOR_PID 2>/dev/null || true
    
    # Final aggressive cleanup
    cleanup_symlinks
    
    echo "🔄 Fallback: Direct @electron/rebuild with Python 3.11..."
    
    # Try fallback with continuous cleanup
    npx @electron/rebuild --only=better-sqlite3,keytar --force &
    FALLBACK_PID=$!
    
    # Monitor fallback
    monitor_and_cleanup $FALLBACK_PID &
    MONITOR_PID=$!
    
    if wait $FALLBACK_PID; then
        echo "✅ Fallback rebuild successful"
        kill $MONITOR_PID 2>/dev/null || true
        cleanup_symlinks
    else
        echo "❌ Both methods failed"
        kill $MONITOR_PID 2>/dev/null || true
        cleanup_symlinks
        
        echo ""
        echo "🛑 Ultimate failure - environment diagnosis:"
        echo "   Python: $(python3.11 --version)"
        echo "   Node.js: $(node --version)"
        echo "   setuptools: $(python3.11 -c 'import setuptools; print("Available")' 2>/dev/null || echo 'Missing')"
        echo ""
        echo "💡 This indicates a fundamental build tool issue"
        echo "   Try: brew reinstall python@3.11 node-gyp"
        exit 1
    fi
fi

# Step 4: Verification
echo ""
echo "🔍 Verifying build results..."

BETTER_SQLITE3_FOUND=false
if [ -f node_modules/.pnpm/better-sqlite3@*/node_modules/better-sqlite3/build/Release/better_sqlite3.node ] || 
   [ -f node_modules/better-sqlite3/build/Release/better_sqlite3.node ]; then
    echo "✅ better-sqlite3: Build successful"
    BETTER_SQLITE3_FOUND=true
else
    echo "❌ better-sqlite3: Still missing"
fi

KEYTAR_FOUND=false
if [ -f node_modules/.pnpm/keytar@*/node_modules/keytar/build/Release/keytar.node ] ||
   [ -f node_modules/keytar/build/Release/keytar.node ]; then
    echo "✅ keytar: Build successful"
    KEYTAR_FOUND=true
else
    echo "⚠️  keytar: Still missing"
fi

echo ""

if [ "$BETTER_SQLITE3_FOUND" = true ]; then
    echo "🎉 SUCCESS! Aggressive native module fix completed"
    echo ""
    echo "📋 What worked:"
    echo "  • Python 3.11 with setuptools (CI/CD environment match)"
    echo "  • Continuous symlink cleanup during build"
    echo "  • Aggressive monitoring prevents EEXIST errors"
    echo "  • PYTHON environment variable enforcement"
    echo ""
    echo "🚀 Database functionality should now work correctly"
    echo "💡 You can now run: npm run dev"
else
    echo "❌ FAILED: better-sqlite3 still not building"
    echo ""
    echo "🔍 Final diagnosis needed - this suggests a deeper issue"
    echo "   Possible causes:"
    echo "   • Xcode tools incomplete"
    echo "   • macOS SDK issues"
    echo "   • Electron version mismatch"
    echo ""
    echo "🛠️  Advanced recovery:"
    echo "   1. sudo xcode-select --reset"
    echo "   2. xcode-select --install"
    echo "   3. brew reinstall node-gyp"
    echo "   4. Check Xcode Command Line Tools version"
    exit 1
fi 