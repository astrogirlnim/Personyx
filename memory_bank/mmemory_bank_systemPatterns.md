# Memory Bank · System Patterns
## Architecture Overview
```text
Electron/Tauri Tray
└─ REST IPC
   ├─ LangGraph micro‑service (RAG + scoring)
   ├─ n8n worker (file‑watch, cron)
   └─ SQLite (encrypted)
VS Code Ext ─► REST IPC  (/ask‑persona)
```

### Key Patterns
* **Event‑driven ingest:** n8n watches folder & triggers LangGraph.
* **Local RAG:** All embeddings & retrieval happen on device.
* **Modular layers:** Foundation → Data → Interface → Implementation.

### Design Decisions
* SQLite for simplicity & local encryption.
* OpenAI embeddings cached locally; fallback MiniLM for offline.
* Strict separation between storage and UI layers for testability.
