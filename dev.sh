#!/bin/bash

# Personyx Development Script
# Starts the full development environment with comprehensive validation

set -e  # Exit on any error

echo ""
echo "🚀 Starting Personyx Development Environment..."
echo "   Enhanced with comprehensive validation & standardization"
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
check_critical_packages() {
    echo "🔍 Checking critical development tools..."
    
    local missing_tools=()
    
    # Check Node.js
    if ! check_command "node"; then
        missing_tools+=("Node.js")
    fi
    
    # Check pnpm
    if ! check_command "pnpm"; then
        missing_tools+=("pnpm")
    fi
    
    # Check git (for version info)
    if ! check_command "git"; then
        echo "⚠️  git not available (version info may be limited)"
    fi
    
    if [ ${#missing_tools[@]} -gt 0 ]; then
        echo ""
        echo "❌ Missing critical development tools:"
        for tool in "${missing_tools[@]}"; do
            echo "   • $tool"
        done
        echo ""
        echo "📋 Installation guide:"
        echo "   • Node.js 20.19.2: https://nodejs.org/ or use nvm/volta"
        echo "   • pnpm: npm install -g pnpm"
        exit 1
    fi
    
    echo "✅ All critical development tools are available"
    echo ""
}

# 1. Check critical development tools first
check_critical_packages

# 2. Check Node.js version compatibility (uses our robust system)
echo "🔍 Checking Node.js version compatibility..."
if ! npm run check-node-version --silent; then
  echo "❌ Node.js version check failed"
  echo "💡 Run: npm run check-node-version for detailed guidance"
  exit 1
fi
echo ""

# 3. Verify project structure and package.json
echo "🔍 Validating project structure..."
if [ ! -f "package.json" ]; then
    echo "❌ package.json not found - are you in the project root?"
    exit 1
fi

if [ ! -f ".nvmrc" ]; then
    echo "❌ .nvmrc not found - version management may not work correctly"
    exit 1
fi

if [ ! -f "scripts/check-node-version.js" ]; then
    echo "❌ Version management scripts not found"
    exit 1
fi

echo "✅ Project structure validated"
echo ""

# 4. Check and install dependencies if needed
echo "📦 Checking project dependencies..."
if [ ! -d "node_modules" ]; then
    echo "📥 Installing dependencies..."
    pnpm install
    echo "✅ Dependencies installed"
elif [ "pnpm-lock.yaml" -nt "node_modules" ]; then
    echo "🔄 Lock file is newer than node_modules, reinstalling..."
    pnpm install
    echo "✅ Dependencies updated"
else
    echo "✅ Dependencies are up to date"
fi
echo ""

# 5. Validate critical npm packages are available
echo "🔍 Validating critical npm packages..."
critical_packages=("electron" "concurrently" "typescript" "vite")
missing_packages=()

for package in "${critical_packages[@]}"; do
    if ! pnpm list "$package" >/dev/null 2>&1; then
        missing_packages+=("$package")
    else
        echo "✅ $package is installed"
    fi
done

if [ ${#missing_packages[@]} -gt 0 ]; then
    echo ""
    echo "❌ Missing critical packages:"
    for pkg in "${missing_packages[@]}"; do
        echo "   • $pkg"
    done
    echo ""
    echo "🔧 Running: pnpm install to fix missing packages..."
    pnpm install
    echo ""
fi

echo "✅ All critical packages validated"
echo ""

# 6. Use our robust native module rebuild system
echo "🔧 Rebuilding native modules for Electron context..."
echo "   Using our enhanced dual-context system"
echo ""

# Use our standardized npm script instead of direct bash call
if npm run rebuild-for-electron --silent 2>&1 | tee rebuild.log; then
    echo ""
    echo "✅ Native modules rebuilt successfully for Electron"
    echo "   (Using standardized npm script)"
else
    echo ""
    echo "❌ Native module rebuild failed"
    echo "   Check rebuild.log for details"
    echo "💡 Try: npm run fix-native-modules"
    exit 1
fi

# 7. Brief stabilization pause
echo "⏳ Waiting for rebuild to stabilize..."
sleep 2
echo ""

# 8. Environment setup with enhanced debugging
export ELECTRON_ENABLE_LOGGING=1
export ELECTRON_LOG_LEVEL=debug
export NODE_ENV=development

echo "🎯 Development Environment Ready:"
echo "======================"
echo "  1. ✅ Node.js version validated ($(node --version))"
echo "  2. ✅ Critical packages verified"
echo "  3. ✅ Dependencies installed"
echo "  4. ✅ Native modules rebuilt for Electron"
echo "  5. ✅ Enhanced debugging enabled"
echo ""
echo "🔍 Debug Configuration:"
echo "  • Electron logging: ELECTRON_ENABLE_LOGGING=1"
echo "  • Chrome DevTools: --inspect=9229"
echo "  • Log level: debug"
echo "  • Environment: development"
echo ""
echo "🌐 Services Starting:"
echo "  • TypeScript compilation (watch mode)"
echo "  • Vite dev server → http://localhost:3000"
echo "  • Electron app (when ready)"
echo ""
echo "⏹️  Press Ctrl+C to stop all processes"
echo ""

# 9. Start development using our npm scripts
npm run start 