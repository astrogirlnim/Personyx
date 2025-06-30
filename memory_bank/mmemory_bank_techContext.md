# Memory Bank · Tech Context
| Stack Layer | Choice | Notes |
|-------------|--------|-------|
| Desktop shell | **Electron 28** | Familiar Chromium env; cross‑platform. |
| Workflow engine | **n8n** | File‑watch & cron; JSON nodes. |
| AI orchestration | **LangGraph 0.3** | Persona RAG chains & scoring. |
| Embeddings | **OpenAI text‑embedding‑3‑small** | Fallback: `all‑MiniLM‑L6‑v2`. |
| DB | **SQLite 3** + SQLCipher | AES‑256 at rest. |
| Language | **TypeScript 5** everywhere | Shared types via `ts‑up`. |
| UI | React 19 + Tailwind + shadcn/ui | Reusable components. |

### Dev Setup
* Node 20+, pnpm workspace.
* `scripts/dev` runs Electron + LangGraph hot‑reload.
* `scripts/package` produces macOS `.dmg` & Windows installer.

### Constraints
* No cloud DB.
* All Slack/Jira tokens stored via OS keychain helpers.
