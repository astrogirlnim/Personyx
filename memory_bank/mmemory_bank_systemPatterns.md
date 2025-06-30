
# System Patterns – The "How"

*Last updated: 2025-06-30*

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
| Decision | Reason |
| --- | --- |
| **Electron 28 + TypeScript** | Rapid cross‑platform desktop shell with mature tray APIs. |
| **Event‑driven IPC (Electron ⇄ Core)** | Decouples UI from LangGraph/n8n processing. |
| **SQLite + Drizzle ORM** | Zero‑setup DB with typed migrations; lives inside user profile. |
| **LangGraph RAG pipeline** | Modular chain for embeddings, persona classification, and RAG answers. |
| **n8n self‑hosted** | No‑code workflow for file‑watch & OAuth integrations; easy to extend post‑sprint. |
| **AES‑encrypted token vault** | Keeps Notion/Slack/Linear credentials local and secure. |

## Reusable Patterns
- **Repository pattern** for all DB access → swap storage layer later.
- **Background job queue** (within Core process) for ingest and scoring tasks.
- **Plugin adapters** for VS Code, Slack, Linear—all talk to the same local REST API.
- **Feature flags** via `.env` to toggle late‑breaking Wow features without branching.

