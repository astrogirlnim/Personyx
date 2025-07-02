#!/bin/bash

# Personyx Native Module Fix Script - Aligned with CI/CD Pipeline Success
# Uses the proven electron-builder approach that resolved CI/CD native module conflicts
# Based on Phase 2.5 CI/CD Pipeline Resolution (Memory Bank)
# ENHANCED: Includes Python setup and symlink cleanup that was missing

set -e

echo "🔧 Personyx Native Module Fix Script (CI/CD Pipeline Aligned)"
echo "============================================================="
echo "📋 Using proven approach that resolved CI/CD pipeline issues"
echo "🎯 ENHANCED: Includes Python setup and symlink cleanup"
echo ""

# Check Node.js version
NODE_VERSION=$(node --version)
echo "🔍 Node.js version: $NODE_VERSION"
echo "🎯 Target: Electron 28.3.3 (Node.js module version 119)"
echo "📋 Expected: Node.js 20.19.2 (from .nvmrc and CI/CD pipeline)"
echo ""

# Verify we're using the correct Node.js version
if ! npm run check-node-version --silent; then
    echo "⚠️  Node.js version mismatch detected"
    echo "💡 Run: npm run check-node-version for guidance"
    echo "   This was a major cause of CI/CD pipeline failures"
    echo ""
fi

# NEW: Python Environment Setup (Critical CI/CD Pipeline Step)
echo "🐍 Setting up Python environment (CI/CD Pipeline Requirement)..."
echo "   📋 This step was critical for resolving CI/CD native module conflicts"
echo ""

# Check current Python (same as CI/CD verification)
CURRENT_PYTHON=$(python3 --version 2>/dev/null || echo "Python not found")
echo "🔍 Current Python: $CURRENT_PYTHON"
echo "🎯 CI/CD Target: Python 3.11 with setuptools"

# Install setuptools for current Python (CI/CD pipeline requirement)
echo "🔧 Installing Python setuptools (CI/CD pipeline requirement)..."
if python3 -m pip install --upgrade setuptools wheel --user; then
    echo "✅ Python setuptools installed successfully"
elif pip3 install --upgrade setuptools wheel --user 2>/dev/null; then
    echo "✅ Python setuptools installed via pip3"
else
    echo "⚠️  Could not install setuptools - native modules may fail"
    echo "💡 Consider installing Python 3.11: brew install python@3.11"
fi

# Verify setuptools (CI/CD verification step)
if python3 -c "import setuptools; print('✅ setuptools ready for node-gyp')" 2>/dev/null; then
    echo "✅ Python environment ready for native module compilation"
else
    echo "⚠️  setuptools verification failed - this may cause native module issues"
    echo "💡 This was the root cause of CI/CD pipeline failures"
fi

echo ""

# ENHANCED: Clean approach (same as successful CI/CD pipeline)
echo "🧹 Applying enhanced clean environment strategy (CI/CD pipeline approach)..."
echo "   📋 This eliminates symlink conflicts that caused CI/CD failures"
echo "   🎯 Including node_gyp_bins cleanup (addresses EEXIST symlink error)"
echo ""

# Enhanced cleanup - addresses the specific symlink error
echo "🧹 Cleaning existing native module builds and caches..."
npx rimraf node_modules/.pnpm/*/node_modules/better-sqlite3/build 2>/dev/null || true
npx rimraf node_modules/.pnpm/*/node_modules/keytar/build 2>/dev/null || true
npx rimraf node_modules/better-sqlite3/build 2>/dev/null || true
npx rimraf node_modules/keytar/build 2>/dev/null || true

# CRITICAL: Clean node_gyp_bins directories (addresses the symlink error)
echo "🧹 Cleaning node_gyp_bins directories (symlink conflict prevention)..."
find . -name "node_gyp_bins" -type d -exec rm -rf {} + 2>/dev/null || true
find ~/.npm -name "node_gyp_bins" -type d -exec rm -rf {} + 2>/dev/null || true

# Clean electron-gyp cache (same as CI/CD pipeline)
npx rimraf ~/.electron-gyp 2>/dev/null || true
echo "✅ Enhanced build cleanup complete (including symlink cleanup)"
echo ""

# Use the proven CI/CD pipeline approach: electron-builder install-app-deps
echo "🔄 Rebuilding native modules using CI/CD proven approach..."
echo "   Method: electron-builder install-app-deps (not @electron/rebuild)"
echo "   Reason: This resolved the CI/CD pipeline native module conflicts"
echo "   Python: $(python3 --version 2>/dev/null || echo 'Not available')"
echo ""

# Execute the same command that works in CI/CD
if electron-builder install-app-deps; then
    echo "✅ Native modules rebuilt successfully using CI/CD approach"
else
    echo "❌ CI/CD approach failed, trying enhanced fallback method..."
    echo ""
    
    # Enhanced fallback with additional cleanup
    echo "🔄 Enhanced fallback: additional cleanup + direct @electron/rebuild..."
    
    # Additional pre-fallback cleanup
    echo "🧹 Additional cleanup before fallback..."
    find . -name "node_gyp_bins" -type d -exec rm -rf {} + 2>/dev/null || true
    rm -rf node_modules/better-sqlite3/build 2>/dev/null || true
    rm -rf node_modules/keytar/build 2>/dev/null || true
    
    if npx @electron/rebuild --only=better-sqlite3,keytar --force; then
        echo "✅ Enhanced fallback rebuild successful"
    else
        echo "❌ Both approaches failed"
        echo "💡 This indicates a fundamental environment issue"
        echo ""
        echo "🐍 Python environment diagnosis:"
        echo "   Current: $(python3 --version 2>/dev/null || echo 'Not available')"
        echo "   setuptools: $(python3 -c 'import setuptools; print("Available")' 2>/dev/null || echo 'Missing')"
        echo ""
        echo "🛠️  Manual fix suggestions:"
        echo "   1. Install Python 3.11: brew install python@3.11"
        echo "   2. Install setuptools: python3.11 -m pip install setuptools wheel"
        echo "   3. Set Python path: export PYTHON=$(which python3.11)"
        exit 1
    fi
fi

echo ""

# Comprehensive verification (enhanced from original script)
echo "🔍 Verifying native modules (comprehensive check)..."
echo ""

# Check better-sqlite3 in multiple possible locations (pnpm structure)
BETTER_SQLITE3_FOUND=false

# Check pnpm structure first
if [ -f node_modules/.pnpm/better-sqlite3@*/node_modules/better-sqlite3/build/Release/better_sqlite3.node ]; then
    echo "✅ better-sqlite3: OK (pnpm structure)"
    BETTER_SQLITE3_FOUND=true
elif [ -f node_modules/better-sqlite3/build/Release/better_sqlite3.node ]; then
    echo "✅ better-sqlite3: OK (standard structure)"
    BETTER_SQLITE3_FOUND=true
else
    echo "❌ better-sqlite3: MISSING"
    echo "   Checked locations:"
    echo "   • node_modules/.pnpm/better-sqlite3@*/node_modules/better-sqlite3/build/Release/"
    echo "   • node_modules/better-sqlite3/build/Release/"
    echo "⚠️  Database functionality will not work"
fi

# Check keytar in multiple possible locations (pnpm structure)
KEYTAR_FOUND=false

if [ -f node_modules/.pnpm/keytar@*/node_modules/keytar/build/Release/keytar.node ]; then
    echo "✅ keytar: OK (pnpm structure)"
    KEYTAR_FOUND=true
elif [ -f node_modules/keytar/build/Release/keytar.node ]; then
    echo "✅ keytar: OK (standard structure)"
    KEYTAR_FOUND=true
else
    echo "⚠️  keytar: MISSING"
    echo "   Checked locations:"
    echo "   • node_modules/.pnpm/keytar@*/node_modules/keytar/build/Release/"
    echo "   • node_modules/keytar/build/Release/"
    echo "⚠️  Credential storage may not work properly"
fi

echo ""

# Final status
if [ "$BETTER_SQLITE3_FOUND" = true ]; then
    echo "✅ Native module rebuild complete!"
    echo "🚀 Database functionality should work correctly"
    echo "💡 You can now run: npm run dev"
    echo ""
    echo "📋 Success Summary:"
    echo "  • Applied CI/CD pipeline proven approach"
    echo "  • Configured Python environment with setuptools"
    echo "  • Enhanced symlink cleanup (node_gyp_bins)"
    echo "  • Used electron-builder install-app-deps method"
    echo "  • Comprehensive verification completed"
else
    echo "❌ Critical native module missing"
    echo ""
    echo "🐍 Environment Analysis:"
    echo "   Node.js: $(node --version)"
    echo "   Python: $(python3 --version 2>/dev/null || echo 'Not available')"
    echo "   setuptools: $(python3 -c 'import setuptools; print("Available")' 2>/dev/null || echo 'Missing')"
    echo ""
    echo "💡 Recovery steps:"
    echo "   1. Check Node.js version: npm run check-node-version"
    echo "   2. Install Python 3.11: brew install python@3.11"
    echo "   3. Install setuptools: python3.11 -m pip install setuptools wheel"
    echo "   4. Clean rebuild: rm -rf node_modules && pnpm install"
    echo "   5. Force rebuild: npx @electron/rebuild --force"
    exit 1
fi

if [ "$KEYTAR_FOUND" = false ]; then
    echo ""
    echo "⚠️  Note: keytar missing - credential storage features may not work"
    echo "   This is not critical for basic functionality"
fi

echo ""
echo "🎯 Ready for development workflow with CI/CD-aligned environment"
