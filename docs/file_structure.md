# Personyx File Structure

**Version:** 0.1.0 | **Updated:** 2025-01-02

Personyx: Desktop application for persona-based evidence analysis during development. Prevents wasted engineering sprints by demanding real-user evidence for every PRD.

## Project Root

```
Personyx/
├── .github/              # GitHub workflows & templates
├── .husky/               # Git hooks (pre-commit, pre-push)
├── assets/               # Static assets & icons
├── dev.sh                # Development environment startup script ✅
├── docs/                 # Project documentation
│   ├── DEVELOPMENT.md    # Development setup guide ✅
│   ├── PIPELINE.md       # CI/CD pipeline documentation ✅
│   └── file_structure.md # This file ✅
├── documentation/        # Legacy documentation (to be organized)
├── memory_bank/          # AI context & project memory
│   ├── personyx_design.md        # Design system specification
│   ├── memory_bank_projectbrief.md
│   ├── mmemory_bank_activeContext.md
│   ├── mmemory_bank_productContext.md
│   ├── mmemory_bank_progress.md
│   ├── mmemory_bank_systemPatterns.md
│   └── mmemory_bank_techContext.md
├── package.json          # Root package configuration & scripts ✅
├── pnpm-lock.yaml        # Dependency lock file ✅
├── pnpm-workspace.yaml   # pnpm workspace configuration ✅
├── postcss.config.js     # PostCSS configuration ✅
├── README.md             # Main project documentation ✅
├── release/              # Distribution packages (auto-generated)
├── src/                  # Source code
│   ├── main/             # Electron main process (Node.js)
│   ├── renderer/         # React UI process (Chromium)
│   └── shared/           # Shared types & constants
├── tailwind.config.js    # Tailwind CSS configuration ✅
├── tests/                # Test files & fixtures ✅
├── tsconfig.json         # Root TypeScript configuration ✅
└── .gitleaks.toml        # Security scanning configuration ✅
```

## Source Code Structure (`src/`)

### Main Process (`src/main/`)

Electron main process - handles system integration, file operations, and application lifecycle.

```
src/main/
├── main.ts               # Application entry point ✅
├── preload.ts            # Secure bridge to renderer ✅
├── tray.ts               # System tray management ✅
├── tsconfig.json         # Main process TypeScript config ✅
└── utils/
    ├── auto-updater.ts   # Update management service ✅
    └── logger.ts         # Logging utility ✅
```

### Renderer Process (`src/renderer/`)

React-based UI running in Chromium - handles user interface and interactions.

```
src/renderer/
├── App.tsx               # Main React component ✅
├── index.html            # HTML entry point ✅
├── main.tsx              # React application bootstrap ✅
├── styles/
│   └── index.css      # Tailwind + Personyx design system
├── tsconfig.json         # Renderer TypeScript config ✅
└── vite.config.ts        # Vite configuration ✅
```

### Shared Code (`src/shared/`)

Type definitions and constants used by both main and renderer processes.

```
src/shared/
├── constants.ts          # Application constants ✅
└── types.ts              # TypeScript type definitions ✅
```

## Configuration Files

```
├── .eslintrc.js          # ESLint configuration ✅
├── .gitleaks.toml        # Security scanning ✅
├── .gitignore            # Git ignore patterns ✅
├── .prettierrc           # Code formatting rules ✅
├── package.json          # Dependencies & scripts ✅
├── postcss.config.js     # PostCSS plugins ✅
├── tailwind.config.js       # ✅ Tailwind + Personyx design system
└── tsconfig.json         # TypeScript configuration ✅
```

## Key Technologies

- **Runtime**: Electron 28 + Node.js 20 + TypeScript 5.3 ✅
- **UI**: React 18 + Tailwind CSS + Personyx design system ✅
- **Build**: Vite 5 + TypeScript + Electron Builder ✅
- **Quality**: ESLint + Prettier + Husky + Gitleaks ✅
- **Package Management**: pnpm workspaces ✅

## Status Legend

- ✅ **Implemented** - Feature complete and tested
- 🔄 **In Progress** - Currently being developed
- 📋 **Planned** - Designed but not yet implemented
- ❓ **TBD** - To be defined in future phases
