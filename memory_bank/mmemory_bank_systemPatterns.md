# System Patterns – The "How"

_Last updated: 2025-06-30_

## High‑Level Architecture (Phase‑1)

```
Tray UI (Electron) ── drop PRD ─► n8n Flow ─► LangGraph (embed+classify)
          ▲                                      │
          │  IPC events                          ▼
    VS Code Panel ◄───────── SQLite (personas, evidence, docs, scores)
          ▲                         ▲
          │ Chat Q&A                │ Score snapshots
Notion Scorecard ◄──── Persona Bot ─┘
          ▲
          │ Export deck
Slack Bot / Linear Labeler  (event‑driven adapters)
```

## Key Design Decisions

| Decision                               | Reason                                                                            |
| -------------------------------------- | --------------------------------------------------------------------------------- |
| **Electron 28 + TypeScript**           | Rapid cross‑platform desktop shell with mature tray APIs.                         |
| **Event‑driven IPC (Electron ⇄ Core)** | Decouples UI from LangGraph/n8n processing.                                       |
| **SQLite + Drizzle ORM**               | Zero‑setup DB with typed migrations; lives inside user profile.                   |
| **LangGraph RAG pipeline**             | Modular chain for embeddings, persona classification, and RAG answers.            |
| **n8n self‑hosted**                    | No‑code workflow for file‑watch & OAuth integrations; easy to extend post‑sprint. |
| **AES‑encrypted token vault**          | Keeps Notion/Slack/Linear credentials local and secure.                           |

## Reusable Patterns

- **Repository pattern** for all DB access → swap storage layer later.
- **Background job queue** (within Core process) for ingest and scoring tasks.
- **Plugin adapters** for VS Code, Slack, Linear—all talk to the same local REST API.
- **Feature flags** via `.env` to toggle late‑breaking Wow features without branching.
- **React + IPC pattern** for real-time UI updates → all interface components use this pattern.
- **Modal component architecture** with consistent state management and animations.
- **Evidence Gate design system** with Tailwind tokens for consistent UI styling.

## Phase 3.1 UI Architecture Patterns

### Component Structure

```
App.tsx (main container)
├── State management with React hooks
├── IPC event listeners for real-time updates
├── Persona loading from backend services
└── Modal components
    ├── PersonaChat.tsx (Feature 1.1)
    ├── ImportPRDModal.tsx (Feature 1.2)
    ├── EvidenceScoreBanner.tsx (Feature 1.3)
    └── ErrorToast.tsx (Feature 1.4)
```

### IPC Communication Pattern

- **Real-time Updates**: IPC events for live score updates, errors, persona data
- **State Synchronization**: Backend state changes immediately reflected in UI
- **Error Handling**: Graceful fallbacks when IPC communication fails
- **Type Safety**: Comprehensive TypeScript interfaces for all IPC events

### Design System Implementation

- **Evidence Gate Tokens**: Complete implementation of design system colors, spacing, typography
- **Animation Standards**: Consistent pulse effects, transitions, and slide animations
- **Responsive Design**: Mobile-first approach with proper breakpoints
- **Accessibility**: Proper ARIA labels, keyboard navigation, focus management
