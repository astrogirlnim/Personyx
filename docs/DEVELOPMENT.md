# Development Guide

## 🚀 Quick Start

### Run PersonaPulse Locally

The fastest way to get PersonaPulse running locally:

```bash
npm start
```

This single command will:
1. Start TypeScript compilation in watch mode
2. Launch Vite dev server on `http://localhost:3000`
3. Wait for the dev server to be ready
4. Launch Electron app automatically
5. Enable hot reloading for both processes

### Alternative Methods

**Using the shell script:**
```bash
./dev.sh
```

**Manual step-by-step:**
```bash
# Terminal 1: Start dev servers
npm run dev

# Terminal 2: Launch Electron (after servers are ready)
npm run electron:dev
```

## 📋 Development Commands

### Core Development
```bash
npm start           # Full development environment (recommended)
npm run dev:app     # Alias for npm start
npm run dev         # Start dev servers only
npm run dev:main    # Main process compilation only
npm run dev:renderer # Renderer dev server only
```

### Building & Packaging
```bash
npm run build       # Production build (both processes)
npm run build:main  # Main process only
npm run build:renderer # Renderer process only
npm run package     # Create distributable packages
```

### Code Quality
```bash
npm run typecheck   # TypeScript validation
npm run lint        # ESLint + Prettier checks
npm run format      # Auto-format with Prettier
npm test           # Run test suite
```

### Utilities
```bash
npm run clean       # Remove build artifacts
npm run electron    # Launch built app (production mode)
```

## 🏗️ Development Workflow

### 1. Initial Setup
```bash
git clone <repository>
cd PersonaPulse
pnpm install
```

### 2. Daily Development
```bash
npm start           # Starts everything you need
# Make changes to code
# Hot reload happens automatically
# Ctrl+C to stop when done
```

### 3. Before Committing
```bash
npm run typecheck   # Check for type errors
npm run lint        # Check code quality
npm run build       # Verify production build works
```

## 🔧 Architecture Overview

### Process Structure
- **Main Process** (`src/main/`): Electron app core, tray, IPC handlers
- **Renderer Process** (`src/renderer/`): React UI with Vite dev server
- **Shared Layer** (`src/shared/`): Types, constants, utilities

### Build Pipeline
- **TypeScript**: Compiles both processes with strict type checking
- **tsc-alias**: Resolves `@shared/*` path aliases in compiled output
- **Vite**: Bundles renderer with hot module replacement
- **Concurrently**: Runs multiple processes simultaneously

### Hot Reloading
- **Renderer**: Instant updates via Vite HMR
- **Main Process**: Automatic recompilation, manual Electron restart needed
- **Shared**: Changes trigger recompilation of dependent processes

## 🐛 Troubleshooting

### Common Issues

**"Cannot find module '@shared/constants'"**
- Run `npm run build:main` to regenerate compiled output
- The `tsc-alias` step resolves path aliases

**Electron won't start**
- Ensure Vite dev server is running on port 3000
- Check that main process compiled successfully
- Try `npm run clean && npm start`

**Port 3000 already in use**
- Kill existing processes: `pkill -f "vite\|node"`
- Or change port in `src/renderer/vite.config.ts`

### Development Tips

1. **Use `npm start`** for the best development experience
2. **Keep console open** to see both process logs
3. **Restart Electron manually** when changing main process code
4. **Use TypeScript strict mode** - it catches bugs early
5. **Run `npm run format`** before committing

## 📱 Testing the App

### Manual Testing Checklist
- [ ] App launches with system tray icon
- [ ] Main window opens when clicking tray
- [ ] React UI loads with PersonaPulse branding
- [ ] No console errors in either process
- [ ] Hot reload works for renderer changes

### Automated Testing
```bash
npm test           # Run Jest test suite (when tests exist)
npm run typecheck  # Validate TypeScript types
npm run lint       # Check code quality
```

## 🚀 Ready for Development

Your PersonaPulse development environment is now ready! Start with:

```bash
npm start
```

Happy coding! 🎉 