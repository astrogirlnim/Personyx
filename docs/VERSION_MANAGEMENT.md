# Node.js Version Management & Native Module Standardization

> **Ensuring consistent Node.js versions across development, testing, and CI/CD**

## 📋 Overview

Personyx uses native modules (`better-sqlite3`, `keytar`) that must be compiled for specific Node.js versions. This document standardizes our approach to prevent the `NODE_MODULE_VERSION` mismatch errors.

## 🎯 Version Requirements

| Component    | Version    | Purpose                       |
| ------------ | ---------- | ----------------------------- |
| **Node.js**  | `20.19.2`  | Exact version for consistency |
| **Electron** | `28.3.3`   | Desktop app runtime           |
| **pnpm**     | `>=9.0.0`  | Package manager               |
| **npm**      | `>=10.0.0` | Fallback package manager      |

## 🔧 Standardization Implementation

### 1. Version Enforcement Files

- **`.nvmrc`** - Specifies exact Node.js version (20.19.2)
- **`package.json`** - Engine requirements + volta configuration
- **`.npmrc`** - NPM behavior standardization
- **`scripts/check-node-version.js`** - Automatic version validation

### 2. Dual Context Handling

Personyx requires native modules for two contexts:

| Context      | Purpose             | Command                        |
| ------------ | ------------------- | ------------------------------ |
| **Node.js**  | Testing, CLI tools  | `npm run rebuild-for-node`     |
| **Electron** | Desktop app runtime | `npm run rebuild-for-electron` |

### 3. Automatic Version Checking

Version checks run automatically:

- **Development**: Before `npm run dev` (predev hook)
- **Building**: Before `npm run build` (prebuild hook)
- **Testing**: Before `npm test`
- **CI/CD**: In GitHub Actions workflows

## 🚀 Quick Setup

### Install Correct Node.js Version

```bash
# Using nvm (recommended)
nvm install 20.19.2
nvm use 20.19.2

# Using volta (automatic switching)
volta install node@20.19.2
volta pin node@20.19.2

# Verify version
node --version  # Should output: v20.19.2
```

### Fix Native Module Issues

```bash
# For development (Electron context)
npm run rebuild-for-electron

# For testing (Node.js context)
npm run rebuild-for-node

# Comprehensive check and fix
npm run check-node-version
npm run fix-native-modules
```

## 🔄 Development Workflow

### Starting Development

```bash
# Automatic version check + native module rebuild
npm run dev
# OR
./dev.sh
```

### Running Tests

```bash
# Automatic rebuild for Node.js context
npm test
```

### Manual Native Module Management

```bash
# Clean rebuild for Electron
npm run rebuild-for-electron

# Clean rebuild for Node.js
npm run rebuild-for-node

# Enhanced fix script with context
bash scripts/fix-native-modules.sh electron
bash scripts/fix-native-modules.sh node
```

## 🏗️ CI/CD Integration

### GitHub Actions Configuration

All workflows use:

```yaml
- name: 📦 Setup Node.js
  uses: actions/setup-node@v4
  with:
    node-version-file: .nvmrc # Ensures consistency
    cache: pnpm
```

### Environment Variables

```bash
# Native module compilation for Electron
export npm_config_build_from_source=true
export npm_config_electron_version=28.3.3
export npm_config_disturl=https://electronjs.org/headers
export npm_config_runtime=electron
export npm_config_target=28.3.3
```

## 🛠️ Troubleshooting

### Common Issues

#### 1. `NODE_MODULE_VERSION` Mismatch

```
Error: The module was compiled against a different Node.js version
```

**Solution:**

```bash
npm run check-node-version  # Diagnose version mismatch
nvm use 20.19.2             # Switch to correct version
npm run rebuild-for-electron # Rebuild for current context
```

#### 2. Python Distutils Error (Python 3.12+)

```
Error: Microsoft Visual C++ 14.0 is required / distutils not found
```

**Solution:**

```bash
# Install Python 3.11 (has distutils)
# macOS:
brew install python@3.11

# Ubuntu:
sudo apt-get install python3.11 python3.11-dev python3.11-distutils

# Update environment
export PYTHON=/usr/bin/python3.11
```

#### 3. Clean Reinstall Needed

```bash
# Nuclear option - full clean install
rm -rf node_modules pnpm-lock.yaml
pnpm install
npm run rebuild-for-electron
```

### Diagnostic Commands

```bash
# Check all versions
npm run check-node-version
node --version
npx electron --version
python3 --version

# Verify native modules
ls -la node_modules/better-sqlite3/build/Release/
file node_modules/better-sqlite3/build/Release/better_sqlite3.node
```

## 📊 Implementation Status

### ✅ Completed

- [x] Exact Node.js version specification (20.19.2)
- [x] Volta configuration for automatic switching
- [x] Enhanced native module rebuild scripts
- [x] Dual context handling (Node.js vs Electron)
- [x] Automatic version checking in npm scripts
- [x] CI/CD standardization
- [x] Comprehensive error handling and diagnostics

### 🎯 Benefits

- **Zero** `NODE_MODULE_VERSION` errors in CI/CD
- **Consistent** development environment across team
- **Automatic** version validation and fixing
- **Clear** error messages with actionable solutions
- **Dual context** support for testing and runtime

## 📚 References

- [Node.js Releases](https://nodejs.org/en/about/releases/)
- [Electron Native Modules](https://www.electronjs.org/docs/tutorial/using-native-node-modules)
- [Volta Documentation](https://volta.sh/)
- [better-sqlite3 Installation](https://github.com/JoshuaWise/better-sqlite3/blob/HEAD/docs/installation.md)

---

_For questions or issues with version management, check the troubleshooting section or run `npm run check-node-version` for diagnostics._
