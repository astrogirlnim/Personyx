# 🚀 Personyx CI/CD Pipeline

This document describes the comprehensive CI/CD pipeline setup for Personyx, including local git hooks, GitHub Actions workflows, and security scanning.

## 📋 Overview

Our pipeline consists of three main components:

1. **🔗 Local Git Hooks** - Fast feedback during development
2. **🧪 PR Validation** - Comprehensive validation for pull requests
3. **🚀 Main Build & Release** - Full builds and releases for main branch

## 🔗 Local Git Hooks (Husky + lint-staged)

### Pre-commit Hook

Runs automatically before each commit:

```bash
# 🕵️ Secret scanning with gitleaks
gitleaks detect --source . --no-git -v

# 🧹 ESLint + Prettier on staged files only
npx lint-staged
```

### Pre-push Hook

Runs automatically before pushing:

```bash
# 🔍 TypeScript type checking
npm run typecheck

# 🧹 ESLint validation
npm run lint:check

# 🧪 Test suite
npm run test
```

### Manual Commands

```bash
# Run security scan
npm run security:scan

# Run security scan on staged files only
npm run security:scan-staged

# Run full validation suite
npm run validate
```

## 🧪 PR Validation Workflow

**Trigger:** Pull requests to `main` or `phase-*` branches  
**File:** `.github/workflows/pr-validation.yml`

### Jobs

#### 1. 🧪 Validate Changes

- **Duration:** ~15 minutes
- **Runner:** Ubuntu Latest
- **Steps:**
  - 📥 Checkout code with full history
  - 📦 Setup pnpm + Node.js 20 with caching
  - 📋 Install dependencies (frozen lockfile)
  - 🕵️ Gitleaks secret scanning
  - 🔍 TypeScript type checking
  - 🧹 ESLint & Prettier validation
  - 🧪 Test suite execution
  - 🏗️ Application build
  - 📦 Electron packaging test (directory only)
  - 📤 Upload build artifacts (7-day retention)

#### 2. 🔒 Security Analysis

- **Duration:** ~10 minutes
- **Runner:** Ubuntu Latest
- **Steps:**
  - 📥 Checkout code
  - 🔍 CodeQL security analysis

#### 3. 📊 PR Summary

- **Duration:** ~1 minute
- **Dependencies:** validate + security jobs
- **Steps:**
  - 📊 Generate comprehensive validation summary
  - ✅ Display pass/fail status for all checks
  - 📝 Provide next steps guidance

## 🚀 Main Build & Release Workflow

**Trigger:** Pushes to `main` branch + manual dispatch  
**File:** `.github/workflows/main-build.yml`

### Jobs

#### 1. 🧪 Full Validation

- **Duration:** ~20 minutes
- **Runner:** Ubuntu Latest
- **Steps:**
  - Complete validation suite (same as PR)
  - 📤 Upload build artifacts (30-day retention)

#### 2. 📦 Multi-Platform Packaging

- **Duration:** ~30 minutes per platform
- **Strategy:** Matrix build across platforms
- **Platforms:**
  - 🍎 **macOS** - Universal binary (Intel + Apple Silicon)
  - 🐧 **Linux** - x64 AppImage
  - 🪟 **Windows** - x64 NSIS installer

**Platform-Specific Steps:**

- 📥 Download validated build artifacts
- 📦 Platform-specific Electron Builder packaging
- 📤 Upload platform packages (90-day retention)

#### 3. 🔒 Security Analysis

- **Duration:** ~15 minutes
- **Runner:** Ubuntu Latest
- **Steps:** CodeQL security analysis

#### 4. 🎉 Release Preparation

- **Duration:** ~5 minutes
- **Dependencies:** All previous jobs
- **Steps:**
  - 📥 Download all platform packages
  - 📝 Generate comprehensive release notes
  - 🏷️ Create development release with all artifacts
  - 📊 Generate deployment summary

## 🔒 Security Features

### Gitleaks Configuration

- **File:** `.gitleaks.toml`
- **Custom Rules:**
  - OpenAI API keys (`sk-...`)
  - Anthropic API keys (`sk-ant-...`)
  - Generic API key patterns
- **Allowlists:**
  - Build/release artifacts (dist/, release/, node_modules/)
  - Package lock files
  - Config files (.gitignore, .eslintrc, .prettierrc)
  - Documentation files are scanned for security

### CodeQL Analysis

- **Language:** JavaScript/TypeScript
- **Scope:** Full codebase security scanning
- **Frequency:** Every PR + main branch push

## 🛠️ Setup Instructions

### 1. Install Dependencies

```bash
# Install git hooks
npm install

# Install gitleaks (macOS)
brew install gitleaks
```

### 2. Test Local Hooks

```bash
# Test pre-commit hook
git add . && git commit -m "test: validate pre-commit hook"

# Test pre-push hook
git push origin feature-branch
```

### 3. GitHub Repository Setup

#### Required Secrets (Future)

For production releases, add these secrets to your GitHub repository:

```bash
# macOS Code Signing
MAC_CERTIFICATE          # Base64 encoded .p12 certificate
MAC_CERTIFICATE_PASSWORD # Certificate password
APPLE_ID                 # Apple Developer ID
APPLE_ID_PASSWORD        # App-specific password

# Windows Code Signing
WIN_CERTIFICATE          # Base64 encoded .p12 certificate
WIN_CERTIFICATE_PASSWORD # Certificate password
```

#### Branch Protection Rules

Recommended settings for `main` branch:

- ✅ Require pull request reviews
- ✅ Require status checks to pass
- ✅ Require branches to be up to date
- ✅ Required status checks:
  - `Validate Changes`
  - `Security Analysis`

## 📊 Pipeline Metrics

### Performance Targets

- **PR Validation:** < 20 minutes total
- **Main Build:** < 60 minutes total
- **Local Hooks:** < 30 seconds

### Artifact Retention

- **PR Builds:** 7 days
- **Main Builds:** 30 days
- **Release Packages:** 90 days

## 🔧 Troubleshooting

### Common Issues

#### Gitleaks False Positives

```bash
# Add to .gitleaks.toml allowlist
[[allowlist]]
description = "Your specific case"
regexes = ['''your-regex-pattern''']
```

#### Hook Installation Issues

```bash
# Reinstall hooks
rm -rf .husky
npx husky install
chmod +x .husky/pre-commit .husky/pre-push
```

#### Build Failures

```bash
# Clean and rebuild
npm run clean
npm install
npm run build
```

### Debug Commands

```bash
# Test gitleaks locally
npm run security:scan

# Test full validation
npm run validate

# Check TypeScript compilation
npm run typecheck

# Test Electron packaging
npm run package
```

## 🎯 Next Steps

1. **🔐 Add Code Signing** - Set up certificates for signed releases
2. **📦 Auto-Updates** - Implement Electron auto-updater
3. **📈 Analytics** - Add build time and success rate monitoring
4. **🧪 E2E Tests** - Add Playwright tests to pipeline
5. **🚀 Deployment** - Add automatic deployment to distribution channels

## 📚 Related Documentation

- [Development Guide](./DEVELOPMENT.md)
- [Contributing Guidelines](../README.md#contributing)
- [Security Policy](../SECURITY.md) _(future)_
- [Release Notes](../CHANGELOG.md) _(future)_
