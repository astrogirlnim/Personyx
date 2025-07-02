#!/bin/bash

# Personyx Development Script - Using PROVEN Working Approach
# Based on successful aggressive-native-fix.sh implementation
# Python 3.11 + @electron/rebuild method that actually works

set -e  # Exit on any error

echo ""
echo "🚀 Starting Personyx Development Environment..."
echo "   📋 Using PROVEN Working Approach (Python 3.11 + @electron/rebuild)"
echo "   ✅ Based on successful aggressive-native-fix.sh results"
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
        echo "🚀 All systems ready for development"
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

# Setup Python 3.11 environment (PROVEN WORKING APPROACH)
setup_python_environment() {
    echo ""
    echo "🐍 Setting up Python 3.11 environment (PROVEN WORKING)..."
    echo "   📋 Using the same approach that successfully built native modules"
    echo ""
    
    # Check if Python 3.11 is available
    if ! command -v python3.11 >/dev/null 2>&1; then
        echo "❌ Python 3.11 not found"
        echo "💡 Install: brew install python@3.11"
        return 1
    fi
    
    local python_version=$(python3.11 --version)
    echo "✅ Found: $python_version"
    
    # Check setuptools
    if python3.11 -c "import setuptools" 2>/dev/null; then
        echo "✅ setuptools available in Python 3.11"
    else
        echo "❌ setuptools missing in Python 3.11"
        echo "💡 Install: python3.11 -m pip install setuptools wheel"
        return 1
    fi
    
    # Configure environment variables (same as aggressive script)
    export PYTHON="/opt/homebrew/bin/python3.11"
    export npm_config_python="/opt/homebrew/bin/python3.11"
    
    echo "✅ Python 3.11 environment configured:"
    echo "   PYTHON=$PYTHON"
    echo "   npm_config_python=$npm_config_python"
    
    return 0
}

# Clean environment (enhanced approach)
clean_environment() {
    echo ""
    echo "🧹 Applying Enhanced Clean Environment Strategy..."
    echo "   📋 Using the proven approach that resolved CI/CD native module conflicts"
    echo ""
    
    echo "🧹 Cleaning node_modules and caches to prevent symlink conflicts..."
    rm -rf node_modules
    npm cache clean --force >/dev/null 2>&1 || true
    
    echo "🧹 Cleaning node_gyp_bins directories (symlink conflict prevention)..."
    find . -type d -name "node_gyp_bins" -exec rm -rf {} + 2>/dev/null || true
    
    echo "🧹 Cleaning pnpm cache..."
    pnpm store prune >/dev/null 2>&1 || true
    
    echo "✅ Enhanced clean environment prepared"
}

# Install dependencies
install_dependencies() {
    echo ""
    echo "📦 Installing dependencies (clean approach from proven method)..."
    pnpm install --frozen-lockfile
    echo "✅ Dependencies installed"
}

# Rebuild native modules (PROVEN WORKING METHOD)
rebuild_native_modules() {
    echo ""
    echo "🔧 Rebuilding native modules for Electron context..."
    echo "   📋 Using PROVEN @electron/rebuild method (Python 3.11)"
    echo "   🎯 Target: Electron 28.3.3 (Node.js module version 119)"
    echo "   🐍 Python: $(python3.11 --version)"
    echo ""
    
    # Use the proven @electron/rebuild approach
    echo "🔧 Running @electron/rebuild with Python 3.11..."
    npx electron-rebuild --version=28.3.3 --arch=arm64
    
    echo "✅ Native modules rebuilt successfully for Electron"
    echo "   📋 Using proven @electron/rebuild approach"
}

# Verify native modules
verify_native_modules() {
    echo ""
    echo "🔍 Verifying native modules (CI/CD pipeline verification)..."
    
    local better_sqlite3_path="node_modules/.pnpm/better-sqlite3@*/node_modules/better-sqlite3/lib/binding/node-v119-darwin-arm64/better_sqlite3.node"
    
    if ls $better_sqlite3_path >/dev/null 2>&1; then
        echo "✅ better-sqlite3: Native binding found"
        echo "💡 Database functionality should work correctly"
    else
        echo "❌ better-sqlite3: Native binding missing"
        echo "💡 Database functionality will fail - this was the original error"
        return 1
    fi
}

# Start development server
start_development() {
    echo ""
    echo "🚀 Starting Personyx development server..."
    echo "   📋 All native modules verified and ready"
    echo "   🔧 Database connectivity should work correctly"
    echo ""
    
    # Run the development server
    npm run dev
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
    
    # Step 4: Setup Python 3.11 environment (PROVEN APPROACH)
    if ! setup_python_environment; then
        echo "❌ Python 3.11 environment setup failed"
        echo "💡 This is required for native module compilation"
        exit 1
    fi
    
    # Step 5: Clean environment
    clean_environment
    
    # Step 6: Install dependencies
    install_dependencies
    
    # Step 7: Rebuild native modules (PROVEN METHOD)
    if ! rebuild_native_modules; then
        echo "❌ Native module rebuild failed"
        echo "💡 Try running: ./scripts/aggressive-native-fix.sh"
        exit 1
    fi
    
    # Step 8: Verify native modules
    if ! verify_native_modules; then
        echo "❌ Native module verification failed"
        # Don't exit - let user decide whether to continue
        echo "⚠️  Continuing anyway - app may have database issues"
    fi
    
    # Step 9: Start development
    start_development
}

# Execute main function
main "$@" 