# Electron Native Module Compatibility Guide

## Problem: Why Do These Issues Keep Happening?

### The Root Cause

**Electron native module compatibility issues** occur because of the **dual Node.js runtime environment**:

1. **System Node.js**: When you run `pnpm install`, native modules compile against your system's Node.js version
2. **Electron's Node.js**: Electron ships with its own embedded Node.js runtime, often a different version
3. **ABI Incompatibility**: Native modules (like `better-sqlite3`) contain compiled C++ code that's specific to Node.js ABI versions

### Example Error Pattern

```
Error: The module '/path/to/better_sqlite3.node'
was compiled against a different Node.js version using
NODE_MODULE_VERSION 115. This version of Node.js requires
NODE_MODULE_VERSION 119.
```

**Translation:**

- Module compiled for Node.js ABI version 115 (your system)
- Electron needs Node.js ABI version 119 (Electron's embedded Node.js)
- The compiled binary is incompatible

## Our Automated Solution

### 1. Enhanced `dev.sh` Script

The development script now **automatically rebuilds native modules** before starting:

```bash
# Always rebuild native modules for Electron to prevent version conflicts
echo "🔧 Rebuilding native modules for Electron..."
echo "   This prevents Node.js version mismatches between system and Electron"

# Use the existing fix script if it exists, otherwise use direct rebuild
if [ -f "scripts/fix-native-modules.sh" ]; then
    bash scripts/fix-native-modules.sh
else
    echo "🔄 Rebuilding better-sqlite3 for Electron..."
    npx @electron/rebuild
fi
```

### 2. Robust `fix-native-modules.sh` Script

Three-tier fallback strategy for maximum compatibility:

```bash
# 1. Primary: @electron/rebuild (most reliable)
npx @electron/rebuild --only=better-sqlite3

# 2. Fallback: electron-builder
npx electron-builder install-app-deps

# 3. Last resort: pnpm rebuild
pnpm rebuild better-sqlite3
```

### 3. Dependencies Added

- `@electron/rebuild`: Official Electron tool for rebuilding native modules
- Automatically rebuilds modules for Electron's specific Node.js version

## Technical Details

### Node.js ABI Version Mapping

| Node.js Version | ABI Version | Common In        |
| --------------- | ----------- | ---------------- |
| Node.js 18.x    | 108-115     | System installs  |
| Node.js 20.x    | 115-119     | System installs  |
| Electron 28.x   | 119         | Electron runtime |

### What Gets Rebuilt

- **better-sqlite3**: SQLite database bindings (C++)
- **keytar**: Native keychain access (C++)
- **Any native module**: Modules with `.node` compiled binaries

## Prevention Strategy

### 1. Automatic Development Flow

```bash
./dev.sh  # Now automatically handles native module rebuilding
```

**What happens:**

1. 📦 Install dependencies if needed
2. 🔧 **Rebuild native modules for Electron**
3. 🚀 Start TypeScript compilation + Vite + Electron

### 2. Manual Fix (if needed)

```bash
# Quick fix for immediate issues
npm run fix-native-modules

# Nuclear option (full reinstall)
rm -rf node_modules pnpm-lock.yaml
pnpm install
npm run fix-native-modules
```

### 3. CI/CD Integration

For production builds, ensure native modules are rebuilt:

```bash
# In CI/CD pipelines
pnpm install
npx @electron/rebuild
npm run build
npm run package
```

## Common Scenarios

### Scenario 1: After System Node.js Update

**Problem**: System Node.js updated, native modules no longer compatible
**Solution**: `./dev.sh` automatically detects and rebuilds

### Scenario 2: Fresh Clone/New Developer

**Problem**: First time setup, modules compiled for different environment  
**Solution**: `./dev.sh` handles initial native module compilation

### Scenario 3: Electron Version Update

**Problem**: Electron updated, ABI version changed
**Solution**: `npm run fix-native-modules` or next `./dev.sh` run

## Debugging

### Check Current Versions

```bash
# System Node.js version
node --version

# Electron's Node.js version
npx electron --version

# Check ABI compatibility
node -e "console.log(process.versions)"
```

### Verify Native Module Status

```bash
# Check if better-sqlite3 is working
node -e "console.log(require('better-sqlite3'))"

# In Electron context
npx electron -e "console.log(require('better-sqlite3'))"
```

### Manual Rebuild Commands

```bash
# Rebuild specific module
npx @electron/rebuild --only=better-sqlite3

# Rebuild all native modules
npx @electron/rebuild

# Use electron-builder method
npx electron-builder install-app-deps
```

## Best Practices

### For Developers

1. **Always use `./dev.sh`** instead of manual `npm start`
2. **Run `npm run fix-native-modules`** after Node.js updates
3. **Don't commit `node_modules/`** (obvious, but worth stating)

### For CI/CD

1. **Cache `node_modules/` carefully** - exclude native module binaries
2. **Run rebuild after dependency installation**
3. **Use specific Node.js versions** in CI to match Electron

### For New Dependencies

1. **Check if module is native** (look for `binding.gyp`, `.node` files)
2. **Test with `./dev.sh`** after adding native dependencies
3. **Document any special rebuild requirements**

## Performance Notes

- **Rebuild time**: ~10-30 seconds (better than debugging for hours!)
- **Frequency**: Only needed when Node.js/Electron versions change
- **Caching**: Native modules are cached per ABI version

## Troubleshooting

### Issue: Rebuild Fails with Python Errors

**Solution**: Install Python build tools

```bash
# macOS
xcode-select --install

# Ubuntu/Debian
sudo apt-get install build-essential python3-dev

# Windows
npm install -g windows-build-tools
```

### Issue: Permission Errors

**Solution**: Fix npm permissions or use node version manager

```bash
# Use nvm/fnm for proper Node.js management
nvm use 20
# or
fnm use 20
```

### Issue: Electron Version Mismatch

**Solution**: Ensure consistent Electron version

```bash
# Check package.json electron version matches throughout team
npm ls electron
```

---

## Summary

**The problem**: Native modules compile for system Node.js but need to run in Electron's Node.js  
**The solution**: Automatic native module rebuilding in development workflow  
**The result**: Zero-friction development without manual intervention

This approach **eliminates the recurring compatibility headaches** and ensures all developers can start working immediately with `./dev.sh`.
