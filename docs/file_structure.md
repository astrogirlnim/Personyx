# PersonaPulse File Structure

## Project Overview
DeskResearcher — Persona‑Lens: Desktop application for persona-based evidence analysis during development.

## Directory Structure

```
PersonaPulse/
├── .cursor/                    # Cursor IDE configuration (gitignored)
│   └── rules/                  # Project-specific rules and patterns
├── .git/                       # Git repository data
├── .gitignore                  # Git ignore patterns
├── documentation/              # Legacy documentation and concepts
│   └── BrainLift/             # Historical ideation and concepts
├── docs/                       # Current project documentation
│   └── file_structure.md      # This file - project organization
├── memory_bank/               # Memory bank for project context
│   ├── memory_bank_projectbrief.md      # Core requirements and scope
│   ├── mmemory_bank_activeContext.md    # Current work focus
│   ├── mmemory_bank_productContext.md   # Problem definition and UX goals
│   ├── mmemory_bank_progress.md          # Status tracking
│   ├── mmemory_bank_systemPatterns.md   # Architecture and patterns
│   └── mmemory_bank_techContext.md      # Technology stack and constraints
├── src/                       # Source code (to be created)
│   ├── main/                  # Electron main process
│   ├── renderer/              # Electron renderer process
│   ├── shared/               # Shared utilities and types
│   └── workflows/            # n8n workflow definitions
├── tests/                     # Test files (to be created)
├── scripts/                   # Build and development scripts (to be created)
├── package.json              # Node.js dependencies and scripts (to be created)
├── tsconfig.json             # TypeScript configuration (to be created)
└── README.md                 # Project overview (to be created)
```

## Core Principles

### Technology Stack
- **Desktop**: Electron 28 with TypeScript 5
- **UI**: React 19 + Tailwind + shadcn/ui
- **Workflow**: n8n for file watching and automation
- **AI**: LangGraph 0.3 for persona RAG chains
- **Database**: SQLite 3 + SQLCipher (AES-256 encryption)
- **Embeddings**: OpenAI text-embedding-3-small

### File Organization Rules
1. All `.md` documentation files go in `docs/`
2. Memory bank files maintain project context between sessions
3. Source code organized by Electron process boundaries
4. No hardcoded strings - everything uses LLM reasoning
5. Comprehensive logging for debugging and monitoring
6. No mock data or placeholder code - fully functional from start

### Development Guidelines
- Use pnpm workspace for dependency management
- TypeScript everywhere with shared types
- All data encrypted at rest with SQLCipher
- No cloud storage beyond optional Slack webhook
- Local-first architecture with OS keychain for secrets

## Status
- [x] Git repository initialized
- [x] Gitignore configured (.cursor excluded)
- [x] Remote origin set to git@github.com:astrogirlnim/PersonaPulse.git
- [x] Memory bank files present
- [x] Documentation structure established
- [ ] Source code structure to be created
- [ ] Package.json and dependencies to be added
- [ ] Development scripts to be created

## Next Steps
1. Set up Node.js/TypeScript project structure
2. Configure Electron main and renderer processes
3. Implement LangGraph persona analysis chains
4. Set up n8n workflow automation
5. Create encrypted SQLite database schema
6. Build React UI with shadcn/ui components 