# PersonaPulse 🎯

> **Evidence-based PRD analysis that stops costly feature bets before the first line of code**

PersonaPulse is a desktop application that prevents wasted engineering sprints by demanding real-user evidence for every Product Requirements Document (PRD). It ingests customer interview transcripts, classifies insights by persona, and provides go/no-go evidence scores—all while integrating seamlessly into your existing development workflow.

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)]()
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3+-blue)]()
[![Electron](https://img.shields.io/badge/Electron-28+-purple)]()
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)]()

## 🚀 Quick Start

### Run PersonaPulse Locally

**Option 1: Using npm scripts**
```bash
# Start full development environment (recommended)
npm start

# Or use the alias
npm run dev:app
```

**Option 2: Using the shell script**
```bash
# Make executable (first time only)
chmod +x dev.sh

# Run the development environment
./dev.sh
```

**Option 3: Manual step-by-step**
```bash
# Start development servers
npm run dev

# In another terminal, launch Electron
npm run electron:dev
```

This will:
1. ✅ Start TypeScript compilation in watch mode
2. ✅ Launch Vite dev server on `http://localhost:3000`
3. ✅ Open PersonaPulse in Electron when ready
4. ✅ Enable hot reloading for both main and renderer processes

---

## Overview

## ✨ Features

### 🎯 **Evidence-First Development**

- **PRD Evidence Scoring**: 0-100 score based on real user evidence coverage
- **Persona Classification**: Auto-categorize feedback by user personas
- **Risk Prevention**: Block unfounded features before development starts

### 🖥️ **Desktop-First Experience**

- **System Tray Integration**: Always accessible without disrupting workflow
- **Local-First Architecture**: All data encrypted and stored locally
- **Cross-Platform**: Native support for macOS, Windows, and Linux

### 🔗 **Workflow Integration**

- **VS Code Extension**: Chat with personas directly in your editor
- **Slack Bot**: Get evidence scores with `/evidence-check` command
- **Notion Export**: Generate evidence scorecards for roadmap reviews

## 🏗️ Architecture

PersonaPulse uses a **monorepo architecture** with clear separation between processes:

```
PersonaPulse/
├── src/
│   ├── main/           # Core Process (Electron Main)
│   │   ├── main.ts     # App initialization & IPC handlers
│   │   ├── tray.ts     # System tray management
│   │   └── utils/      # Logging & utilities
│   ├── renderer/       # Tray UI (Electron Renderer)
│   │   ├── App.tsx     # React application
│   │   ├── main.tsx    # React entry point
│   │   └── styles/     # Tailwind CSS + design system
│   └── shared/         # Shared Types & Constants
│       ├── types.ts    # TypeScript interfaces
│       └── constants.ts # IPC channels & app constants
├── docs/               # Documentation
├── memory_bank/        # Project context & progress
└── [configs]          # Build & development configurations
```

### 🔄 **Process Communication**

- **Main Process**: Business logic, file system access, database operations
- **Renderer Process**: React UI for evidence analysis and persona chat
- **IPC Layer**: Type-safe communication via Electron's IPC system

## 🛠️ Technology Stack

### **Core Framework**

- **[Electron 28](https://electronjs.org/)** - Cross-platform desktop apps
- **[TypeScript 5.3+](https://typescriptlang.org/)** - Type-safe development
- **[Node.js 20](https://nodejs.org/)** - Runtime environment

### **Frontend (Renderer Process)**

- **[React 18](https://react.dev/)** - UI framework
- **[Vite 5](https://vitejs.dev/)** - Fast build tool and dev server
- **[Tailwind CSS 3+](https://tailwindcss.com/)** - Utility-first CSS framework

### **Development Tools**

- **[pnpm](https://pnpm.io/)** - Fast, disk space efficient package manager
- **[ESLint](https://eslint.org/)** - Code linting and quality
- **[Prettier](https://prettier.io/)** - Code formatting
- **[Electron Builder](https://electron.build/)** - Packaging and distribution

### **Future Integrations** (Upcoming Phases)

- **[LangGraph](https://langchain-ai.github.io/langgraph/)** - AI workflow orchestration
- **[n8n](https://n8n.io/)** - Workflow automation
- **[SQLite + SQLCipher](https://sqlcipher.net/)** - Encrypted local database
- **[OpenAI APIs](https://openai.com/)** - Embeddings and chat completion

## 📊 Development Progress

### ✅ **Phase 1: Foundation** (1/4 Complete)

- [x] **1.1** Electron 28 + TypeScript monorepo scaffolding
- [ ] **1.2** Cross-platform build/packaging scripts + ESLint+Prettier
- [ ] **1.3** Tray menu with PRD drop zone
- [ ] **1.4** Auto-update mechanism placeholder

### 🔄 **Phase 2: Data Layer** (Upcoming)

- [ ] **2.1** SQLite schema + encrypted token vault
- [ ] **2.2** Evidence scoring engine
- [ ] **2.3** Embedding retrieval API
- [ ] **2.4** Secure file ingest system

### 🔄 **Phase 3: Interface Layer** (Upcoming)

- [ ] **3.1** Core tray UI screens
- [ ] **3.2** Notion scorecard prototype
- [ ] **3.3** VS Code extension stub
- [ ] **3.4** Slack bot MVP

### 🔄 **Phase 4: Implementation Layer** (Upcoming)

- [ ] **4.1** Evidence scorecard export
- [ ] **4.2** Linear evidence-score labeler
- [ ] **4.3** Security & maintenance utilities
- [ ] **4.4** Proactive notifications

## 🎨 Design System

PersonaPulse implements the **DeskResearcher Design System** with:

- **Evidence Blue** (`#2F80ED`) - Primary actions and scores
- **Persona Green** (`#27AE60`) - Success states and persona tags
- **Insight Violet** (`#9B51E0`) - Data visualization accents
- **Risk Red** (`#EB5757`) - Warnings and low evidence alerts
- **Typography**: Inter + JetBrains Mono for clean, readable interfaces

## 🔒 Security & Privacy

- **Local-First**: All data encrypted and stored locally with AES-256
- **No Cloud Dependencies**: Core functionality works completely offline
- **Token Vault**: API keys securely stored in OS keychain
- **30-Day Auto-Prune**: Configurable evidence retention policies

## 🤝 Contributing

We welcome contributions! Please see our [contributing guidelines](CONTRIBUTING.md) for details.

### Development Workflow

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'feat: add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### Commit Message Format

We use [Conventional Commits](https://conventionalcommits.org/):

```
feat: add new evidence scoring algorithm
fix: resolve tray icon display issue
docs: update installation instructions
refactor: improve IPC type safety
```

## 📝 Documentation

- **[Architecture Guide](docs/architecture.md)** - System design and patterns
- **[API Reference](docs/api.md)** - IPC events and data structures
- **[Development Guide](docs/development.md)** - Local setup and workflows
- **[Deployment Guide](docs/deployment.md)** - Building and distribution

## 📈 Project Status

**Current Version**: `0.1.0-alpha`  
**Development Phase**: Foundation (Phase 1)  
**Target Release**: Q2 2025

### Immediate Roadmap

- [ ] Complete Phase 1 Foundation (cross-platform packaging)
- [ ] Implement Phase 2 Data Layer (SQLite + evidence scoring)
- [ ] MVP demo-ready build for FlowGenius competition

## 🎯 Mission

> **Give makers an evidence-backed go/no-go gate that prevents wasted sprints before the first line of code — and provides live persona feedback while they build.**

PersonaPulse aims to save teams **1.5+ engineering sprints per month** by rejecting low-evidence features and surfacing persona-specific insights directly in development tools.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **FlowGenius Competition** - Inspiration for the desktop-first approach
- **DeskResearcher Design System** - Visual identity and UX patterns
- **Electron Community** - Cross-platform desktop framework
- **React + TypeScript Ecosystem** - Modern development tools

---

**Built with ❤️ for product teams who ship features users actually want.**

For questions, issues, or feature requests, please [open an issue](https://github.com/astrogirlnim/PersonaPulse/issues) or reach out to the team.
