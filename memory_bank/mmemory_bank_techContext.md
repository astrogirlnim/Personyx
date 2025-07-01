# Tech Context – The "With What"

_Last updated: 2025-06-30_

## Runtime Stack

| Layer                 | Tech                                   | Notes                                      |
| --------------------- | -------------------------------------- | ------------------------------------------ |
| Desktop Shell         | Electron 28 + Node 20                  | Tray menu, notifications, auto‑update stub |
| Front‑end UI          | React 19 + Vite + Tailwind + shadcn/ui | Dark/light ready                           |
| Workflow Orchestrator | n8n (Docker)                           | File‑watch & OAuth flows                   |
| AI / RAG              | LangGraph + OpenAI GPT‑4o              | Embeddings + persona chat                  |
| Storage               | SQLite + Drizzle ORM                   | Vector extension optional                  |
| Encryption            | AES‑256‑GCM via `crypto` module        | Token vault                                |
| Packaging             | Electron‑Builder                       | Scripts for Mac, Win, Linux                |
| Testing               | Jest + Playwright                      | Unit + smoke tests                         |
| CI/CD                 | GitHub Actions                         | Lint, unit tests, package artifacts        |

## Development Setup

1. `pnpm install` (monorepo)
2. `docker compose up n8n`
3. `pnpm dev` — launches Tray + Core in watch mode
4. **Env vars:** `OPENAI_API_KEY`, `NOTION_TOKEN`, `SLACK_BOT_TOKEN`, `LINEAR_API_KEY`

## Constraints

- Entire app must run offline (except optional API calls) for demo judges.
- Delivery deadline: **Thu 2025-06-30 20:00** local time.
- No cloud DBs; all data → local filesystem.
