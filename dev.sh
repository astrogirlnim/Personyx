#!/bin/bash

# Personyx Development Script - Comprehensive One-Step Setup
# Handles ALL native module issues automatically with robust fallback strategies
# This approach eliminates manual fixes and ensures consistent development environment

set -e  # Exit on any error

echo ""
echo "🚀 Starting Personyx Development Environment..."
echo "   ✅ Comprehensive one-step setup with automatic native module handling"
echo "   🛠️  Includes automatic fixes for better-sqlite3 and keytar issues"
echo ""

# Function to check if a command exists
check_command() {
    if command -v "$1" >/dev/null 2>&1; then
        echo "✅ $1 is available"
        return 0
    else
        echo "❌ $1 is not installed or not in PATH"
        return 1
    fi
}

# Function to check critical packages
check_critical_tools() {
    echo "🔍 Checking critical development tools..."
    
    local all_good=true
    for tool in node pnpm git; do
        if ! check_command "$tool"; then
            all_good=false
        fi
    done
    
    if [ "$all_good" = true ]; then
        echo "✅ All critical development tools are available"
        return 0
    else
        echo "❌ Some critical tools are missing"
        return 1
    fi
}

# Check and verify Node.js version
check_node_version() {
    echo ""
    echo "🔍 Checking Node.js version compatibility..."
    echo ""
    
    local expected_version="20.19.2"
    local current_version=$(node --version | sed 's/v//')
    
    echo "🔍 Node.js Version Check"
    echo "========================"
    echo "Expected version: $expected_version"
    echo "Current version:  $current_version"
    echo ""
    
    if [ "$current_version" = "$expected_version" ]; then
        echo "✅ Node.js version is correct!"
        return 0
    else
        echo "⚠️  Node.js version mismatch detected"
        echo "💡 Please switch to Node.js $expected_version using nvm:"  
        echo "   nvm use $expected_version"
        return 1
    fi
}

# Validate project structure
validate_project_structure() {
    echo ""
    echo "🔍 Validating project structure..."
    
    # Check if we're in the right directory
    if [ ! -f "package.json" ]; then
        echo "❌ package.json not found - are you in the project root?"
        return 1
    fi
    
    if [ ! -f "dev.sh" ]; then
        echo "❌ dev.sh not found - directory structure issue"
        return 1
    fi
    
    echo "✅ Project structure validated"
    return 0
}

# Check if native modules are properly built and located
check_native_modules() {
    echo ""
    echo "🔍 Comprehensive native module status check..."
    
    local all_modules_ok=true
    
    # Check better-sqlite3 in expected location
    local better_sqlite3_patterns=(
        "node_modules/.pnpm/better-sqlite3@*/node_modules/better-sqlite3/lib/binding/node-v119-darwin-*/better_sqlite3.node"
        "node_modules/better-sqlite3/lib/binding/node-v119-darwin-*/better_sqlite3.node"
    )
    
    local sqlite_found=false
    for pattern in "${better_sqlite3_patterns[@]}"; do
        if ls $pattern >/dev/null 2>&1; then
            echo "✅ better-sqlite3: Native module found in correct location"
            sqlite_found=true
            break
        fi
    done
    
    if [ "$sqlite_found" = false ]; then
        echo "⚠️  better-sqlite3: Native module missing from expected location"
        all_modules_ok=false
    fi
    
    # Check keytar native module
    local keytar_patterns=(
        "node_modules/.pnpm/keytar@*/node_modules/keytar/build/Release/keytar.node"
        "node_modules/keytar/build/Release/keytar.node"
    )
    
    local keytar_found=false
    for pattern in "${keytar_patterns[@]}"; do
        if ls $pattern >/dev/null 2>&1; then
            echo "✅ keytar: Native module found"
            keytar_found=true
            break
        fi
    done
    
    if [ "$keytar_found" = false ]; then
        echo "⚠️  keytar: Native module missing"
        all_modules_ok=false
    fi
    
    if [ "$all_modules_ok" = true ]; then
        echo "✅ All native modules are properly built and located"
        return 0
    else
        echo "🔧 Native modules need rebuilding/fixing"
        return 1
    fi
}

# Fix better-sqlite3 location if built in wrong place
fix_better_sqlite3_location() {
    echo ""
    echo "🔧 Checking and fixing better-sqlite3 location..."
    
    # Check if it's built but in wrong location
    local built_sqlite3_patterns=(
        "node_modules/.pnpm/better-sqlite3@*/node_modules/better-sqlite3/build/Release/better_sqlite3.node"
        "node_modules/better-sqlite3/build/Release/better_sqlite3.node"
    )
    
    local built_found=false
    local source_path=""
    for pattern in "${built_sqlite3_patterns[@]}"; do
        if ls $pattern >/dev/null 2>&1; then
            source_path=$(ls $pattern | head -1)
            built_found=true
            break
        fi
    done
    
    if [ "$built_found" = true ]; then
        echo "🔍 Found better-sqlite3 built in: $source_path"
        
        # Determine target directory
        local target_dir=""
        if [[ $source_path == *".pnpm"* ]]; then
            # Extract the pnpm path
            local pnpm_base=$(echo "$source_path" | sed 's|/build/Release/better_sqlite3.node||')
            target_dir="$pnpm_base/lib/binding/node-v119-darwin-arm64"
        else
            target_dir="node_modules/better-sqlite3/lib/binding/node-v119-darwin-arm64"
        fi
        
        echo "🎯 Target directory: $target_dir"
        
        # Create target directory and copy file
        mkdir -p "$target_dir"
        cp "$source_path" "$target_dir/better_sqlite3.node"
        
        echo "✅ better-sqlite3 copied to correct location"
        return 0
    else
        echo "❌ better-sqlite3 not found in build directory"
        return 1
    fi
}

# Rebuild native modules using comprehensive approach
rebuild_native_modules() {
    echo ""
    echo "🔧 Rebuilding native modules using comprehensive approach..."
    echo "   📋 Strategy: electron-builder install-app-deps + targeted rebuilds"
    echo "   🎯 Target: Electron 28.3.3 (Node.js module version 119)"
    echo ""
    
    local rebuild_success=false
    
    # Strategy 1: Use electron-builder install-app-deps (primary approach)
    echo "🔧 Strategy 1: Running electron-builder install-app-deps..."
    if electron-builder install-app-deps; then
        echo "✅ electron-builder install-app-deps completed"
        
        # Check if better-sqlite3 needs location fix
        if ! check_native_modules >/dev/null 2>&1; then
            echo "🔧 Applying better-sqlite3 location fix..."
            if fix_better_sqlite3_location; then
                echo "✅ better-sqlite3 location fixed"
            fi
        fi
        
        # Check if keytar needs targeted rebuild
        if ! ls node_modules/.pnpm/keytar@*/node_modules/keytar/build/Release/keytar.node >/dev/null 2>&1 && \
           ! ls node_modules/keytar/build/Release/keytar.node >/dev/null 2>&1; then
            echo "🔧 keytar missing, doing targeted rebuild..."
            if npx @electron/rebuild --only=keytar --force >/dev/null 2>&1; then
                echo "✅ keytar rebuilt successfully"
            else
                echo "⚠️  keytar rebuild had issues but continuing..."
            fi
        fi
        
        rebuild_success=true
    else
        echo "⚠️  electron-builder install-app-deps failed, trying fallback..."
    fi
    
    # Strategy 2: Targeted rebuilds (fallback approach)
    if [ "$rebuild_success" = false ]; then
        echo "🔧 Strategy 2: Targeted native module rebuilds..."
        
        echo "   🔧 Rebuilding better-sqlite3..."
        if npx @electron/rebuild --only=better-sqlite3 --force; then
            echo "   ✅ better-sqlite3 rebuilt"
            fix_better_sqlite3_location || true
        fi
        
        echo "   🔧 Rebuilding keytar..."
        if npx @electron/rebuild --only=keytar --force; then
            echo "   ✅ keytar rebuilt"
        fi
        
        rebuild_success=true
    fi
    
    if [ "$rebuild_success" = true ]; then
        echo "✅ Native module rebuild process completed"
        return 0
    else
        echo "❌ All rebuild strategies failed"
        return 1
    fi
}

# Ensure dependencies are installed
ensure_dependencies() {
    echo ""
    echo "📦 Checking dependencies..."
    
    if [ ! -d "node_modules" ]; then
        echo "📦 Installing dependencies (this will also rebuild native modules)..."
        pnpm install --frozen-lockfile
        echo "✅ Dependencies installed"
    else
        echo "✅ Dependencies already installed"
    fi
}

# Final verification of native modules
verify_native_modules() {
    echo ""
    echo "🔍 Final verification of native modules..."
    
    local verification_passed=true
    
    # Verify better-sqlite3
    local better_sqlite3_patterns=(
        "node_modules/.pnpm/better-sqlite3@*/node_modules/better-sqlite3/lib/binding/node-v119-darwin-*/better_sqlite3.node"
        "node_modules/better-sqlite3/lib/binding/node-v119-darwin-*/better_sqlite3.node"
    )
    
    local sqlite_verified=false
    for pattern in "${better_sqlite3_patterns[@]}"; do
        if ls $pattern >/dev/null 2>&1; then
            echo "✅ better-sqlite3: Verified and ready"
            sqlite_verified=true
            break
        fi
    done
    
    if [ "$sqlite_verified" = false ]; then
        echo "❌ better-sqlite3: Still missing after rebuild"
        verification_passed=false
    fi
    
    # Verify keytar
    local keytar_patterns=(
        "node_modules/.pnpm/keytar@*/node_modules/keytar/build/Release/keytar.node"
        "node_modules/keytar/build/Release/keytar.node"
    )
    
    local keytar_verified=false
    for pattern in "${keytar_patterns[@]}"; do
        if ls $pattern >/dev/null 2>&1; then
            echo "✅ keytar: Verified and ready"
            keytar_verified=true
            break
        fi
    done
    
    if [ "$keytar_verified" = false ]; then
        echo "❌ keytar: Still missing after rebuild"
        verification_passed=false
    fi
    
    if [ "$verification_passed" = true ]; then
        echo "🎉 All native modules verified and ready!"
        return 0
    else
        echo "⚠️  Some native modules still have issues - app may have limited functionality"
        echo ""
        echo "🛠️  Manual troubleshooting options:"
        echo "   1. Run: ./scripts/aggressive-native-fix.sh"
        echo "   2. Check Python 3.11: brew install python@3.11"
        echo "   3. Clean install: rm -rf node_modules && pnpm install"
        return 1
    fi
}

# Start development server
start_development() {
    echo ""
    echo "🚀 Starting Personyx development server..."
    echo "   🔧 All native modules verified and ready"
    echo "   🎯 This will start BOTH renderer (Vite) AND main process (Electron)"
    echo "   🖥️  Look for the tray icon in your system tray/menu bar"
    echo ""
    echo "📋 Development server will:"
    echo "   1. Start Vite dev server on http://localhost:3000"
    echo "   2. Compile TypeScript for main process (watch mode)"
    echo "   3. Launch Electron app with hot reload"
    echo "   4. Show tray icon in system tray"
    echo ""
    
    # Run the development server using the start script
    # This runs: concurrently "npm run dev" "wait-on http://localhost:3000 && npm run electron:dev"
    npm run start
}

# Main execution flow
main() {
    # Step 1: Check critical tools
    if ! check_critical_tools; then
        echo "❌ Critical tools missing - cannot proceed"
        exit 1
    fi
    
    # Step 2: Check Node.js version
    if ! check_node_version; then
        echo "❌ Node.js version issue - please fix before proceeding"
        exit 1
    fi
    
    # Step 3: Validate project structure
    if ! validate_project_structure; then
        echo "❌ Project structure issue - cannot proceed"
        exit 1
    fi
    
    # Step 4: Ensure dependencies are installed
    ensure_dependencies
    
    # Step 5: Check and fix native modules
    if ! check_native_modules; then
        echo "🔧 Native modules need rebuilding/fixing..."
        
        if rebuild_native_modules; then
            echo "✅ Native module rebuild completed"
        else
            echo "❌ Native module rebuild failed"
            echo "⚠️  Continuing anyway - app may have limited functionality"
        fi
    fi
    
    # Step 6: Final verification
    verify_native_modules
    
    # Step 7: Start development server
    start_development
}

# Run main function
main "$@" 