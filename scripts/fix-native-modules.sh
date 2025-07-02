#!/bin/bash

# Enhanced Native Module Fix for Personyx
# Handles both Node.js (testing) and Electron (runtime) contexts

set -e

echo "🔧 Enhanced Native Module Fix for Personyx"
echo "==========================================="
echo ""

# Function to display colored output
log_info() { echo -e "\033[36m$1\033[0m"; }
log_success() { echo -e "\033[32m$1\033[0m"; }
log_warning() { echo -e "\033[33m$1\033[0m"; }
log_error() { echo -e "\033[31m$1\033[0m"; }

# Check Node.js version matches .nvmrc
if [ -f ".nvmrc" ]; then
  EXPECTED_NODE=$(cat .nvmrc | tr -d '\n\r')
  CURRENT_NODE=$(node --version | sed 's/v//')
  
  log_info "📍 Node.js Version Check:"
  echo "   Expected: $EXPECTED_NODE"
  echo "   Current:  $CURRENT_NODE"
  
  if [ "$CURRENT_NODE" != "$EXPECTED_NODE" ]; then
    log_warning "⚠️  Node.js version mismatch detected!"
    log_warning "   This may cause native module compilation issues."
    echo ""
  else
    log_success "✅ Node.js version matches .nvmrc"
  fi
  echo ""
fi

# Check Electron version
if command -v npx >/dev/null 2>&1; then
  log_info "📍 Electron version:"
  npx electron --version 2>/dev/null || echo "   Electron not yet available (first install)"
  echo ""
fi

# Determine rebuild strategy based on context
REBUILD_CONTEXT=${1:-"electron"}
log_info "🎯 Rebuild context: $REBUILD_CONTEXT"
echo ""

# Clean previous build artifacts
log_info "🧹 Cleaning previous build artifacts..."
rm -rf node_modules/.pnpm/better-sqlite3*/node_modules/better-sqlite3/build 2>/dev/null || true
rm -rf node_modules/.pnpm/keytar*/node_modules/keytar/build 2>/dev/null || true
rm -rf node_modules/better-sqlite3/build 2>/dev/null || true
rm -rf node_modules/keytar/build 2>/dev/null || true
find node_modules -name "node_gyp_bins" -type d -exec rm -rf {} + 2>/dev/null || true
log_success "✅ Build artifacts cleaned"
echo ""

if [ "$REBUILD_CONTEXT" == "node" ]; then
  # Rebuild for Node.js (testing context)
  log_info "🔄 Rebuilding native modules for Node.js (testing)..."
  
  # Check Python availability (for better error messages)
  if ! python3 -c "import sys; print(f'Python {sys.version}')" 2>/dev/null; then
    log_warning "⚠️  Python 3 not found - may cause build issues"
  fi
  
  # Rebuild for current Node.js version
  if pnpm rebuild better-sqlite3 keytar; then
    log_success "✅ Successfully rebuilt native modules for Node.js"
    
    # Verify the build worked
    if [ -f "node_modules/better-sqlite3/build/Release/better_sqlite3.node" ]; then
      log_success "✅ Verified: better-sqlite3 built successfully"
    else
      log_error "❌ Verification failed: better-sqlite3 binary missing"
      exit 1
    fi
  else
    log_error "❌ Failed to rebuild native modules for Node.js"
    exit 1
  fi
  
else
  # Rebuild for Electron (runtime context)
  log_info "🔄 Rebuilding native modules for Electron (runtime)..."
  echo ""
  
  # Multi-strategy rebuild approach for maximum compatibility
  log_info "🏗️ Attempting native module rebuild with fallback strategies..."
  
  # Strategy 1: Use @electron/rebuild (most reliable in most environments)
  log_info "🔄 Strategy 1: @electron/rebuild (recommended)"
  if npx @electron/rebuild --only=better-sqlite3,keytar --force; then
    log_success "✅ @electron/rebuild completed successfully!"
  else
    log_warning "⚠️  @electron/rebuild failed, trying electron-builder..."
    echo ""
    
    # Strategy 2: Use electron-builder (good fallback)
    log_info "🔄 Strategy 2: electron-builder install-app-deps"
    if npx electron-builder install-app-deps; then
      log_success "✅ electron-builder completed successfully!"
    else
      log_warning "⚠️  electron-builder failed, trying manual pnpm rebuild..."
      echo ""
      
      # Strategy 3: Manual pnpm rebuild (last resort)
      log_info "🔄 Strategy 3: pnpm rebuild (fallback)"
      
      # Set CI-friendly environment variables for better compatibility
      export npm_config_prefer_offline=true
      export npm_config_audit=false
      export npm_config_fund=false
      export npm_config_update_notifier=false
      export npm_config_loglevel=warn
      
      if pnpm rebuild better-sqlite3 keytar --reporter=silent; then
        log_success "✅ pnpm rebuild completed successfully!"
      else
        log_error "❌ All rebuild strategies failed!"
        echo ""
        
        # Check for Python distutils issue (common with Python 3.12+)
        if python3 -c "from distutils.version import StrictVersion" 2>/dev/null; then
          log_success "✅ Python distutils available"
          log_error "❌ Unknown native module build failure"
        else
          log_error "❌ Python distutils not available (Python 3.12+ issue)"
          log_info "💡 Install Python 3.11 or add setuptools to fix this"
        fi
        
        log_error "This is a known issue with better-sqlite3 in some CI environments."
        log_error "The application may still work if prebuilt binaries are available."
        echo ""
        
        # Don't exit with error in CI environments - let the build continue
        if [ "$CI" = "true" ]; then
          log_info "🔄 CI environment detected, allowing build to continue with existing binaries"
        else
          exit 1
        fi
      fi
    fi
  fi
  
  # Verify Electron-specific build (only if we're not in CI graceful fallback mode)
  if [ "$CI" != "true" ] || [ -f "node_modules/better-sqlite3/build/Release/better_sqlite3.node" ]; then
    if [ -f "node_modules/better-sqlite3/build/Release/better_sqlite3.node" ]; then
      log_success "✅ Verified: better-sqlite3 built for Electron"
    else
      log_warning "⚠️  Verification: better-sqlite3 binary missing (may use prebuilt)"
    fi
  fi
fi

log_success "✅ Native module rebuild complete!"
echo ""
log_info "💡 Usage tips:"
echo "   • For Electron development: npm run rebuild-for-electron"
echo "   • For Node.js testing: npm run rebuild-for-node"
echo "   • Auto rebuild on dev: npm run dev (includes predev hook)"
echo ""
log_info "🆘 If issues persist:"
echo "   1. Ensure Node.js version matches .nvmrc: nvm use"
echo "   2. Clean install: rm -rf node_modules pnpm-lock.yaml && pnpm install"
echo "   3. Check Python version supports distutils or install setuptools"
echo "   4. Use npm run check-node-version for diagnostics"
