# MVP Development Checklist – DeskResearcher · Persona-Lens

_Generated 30 Jun 2025_

---

## Phases Overview

- [ ] **Phase 1 – Foundation**
- [ ] **Phase 2 – Data Layer**
- [ ] **Phase 3 – Interface Layer**
- [ ] **Phase 4 – Implementation Layer**

---

## Phase 1 – Foundation

_Essential build & tooling tasks; zero external dependencies._

- [ ] **Project Scaffold**
  - [ ] Create Electron/Tauri repo with TypeScript build pipeline.
  - [ ] Add LangGraph micro-service stub listening on localhost port.
  - [ ] Add n8n worker container with file-watch capability.
  - [ ] Configure cross-platform packaging scripts (Mac & Win).

- [ ] **Persona Config Loader**
  - [ ] Parse `personas.yml` into in-memory objects at app start.
  - [ ] Validate YAML schema and log errors to console.

- [ ] **Interview Folder Watcher**
  - [ ] Monitor `/interviews` for new `.md` or `.txt` files using n8n trigger.
  - [ ] On file creation, emit JSON payload to LangGraph endpoint.

- [ ] **Security Baseline**
  - [ ] Generate AES-256 key on first run and save to OS keychain.
  - [ ] Provide helper to encrypt/decrypt arbitrary strings for later phases.

---

## Phase 2 – Data Layer

_Persistent storage, embeddings, and scoring logic (depends on Phase 1)._

- [ ] **Encrypted SQLite Store**
  - [ ] Create tables `personas`, `evidence`, `docs`, `settings`.
  - [ ] Wrap all CRUD in helper module that auto-encrypts tokens at rest.

- [ ] **Embedding Pipeline**
  - [ ] Chunk transcripts ≤ 1 k tokens each.
  - [ ] Call OpenAI `text-embedding-3-small` and cache vectors.
  - [ ] Persist vectors with foreign-key to `evidence`.

- [ ] **Persona Classifier**
  - [ ] Compute cosine similarity between chunk vector and persona prototypes.
  - [ ] Insert classified snippet into `evidence` with `persona_id`.

- [ ] **PRD Parser**
  - [ ] Accept markdown file; extract title, feature bullets, and save to `docs`.

- [ ] **Evidence Scorer**
  - [ ] Calculate score = Σ(weighted snippets) for each persona (60-day decay).
  - [ ] Expose `/score?doc_id=` REST endpoint returning JSON `{persona, score}`.

---

## Phase 3 – Interface Layer

_User-visible components (depends on Phase 1 & 2)._

- [ ] **Tray Dashboard**
  - [ ] Implement drag-and-drop PRD upload zone.
  - [ ] Display Evidence Score gauge per persona.
  - [ ] List top three supporting quotes with citation IDs.

- [ ] **Theme Toggle**
  - [ ] Add dark / light toggle saving preference in `settings`.

- [ ] **VS Code Extension**
  - [ ] Register command `/ask-persona` with text-selection payload.
  - [ ] Forward selection + persona ID to local REST endpoint.

- [ ] **Tray Badge Indicator**
  - [ ] Turn tray icon red when any score < 60; reset to neutral when all ≥ 60.

---

## Phase 4 – Implementation Layer

_High-value capabilities delivering end-user benefit (depends on Phase 1 + 2 + 3)._

- [ ] **Persona Chat Service**
  - [ ] Build LangGraph RAG chain combining product description + top persona snippets.
  - [ ] Return chat answer ≤ 2 s with inline citations.

- [ ] **Product-Description Ingest**
  - [ ] Allow upload of `product.md`; store in `docs` and feed into chat context.

- [ ] **Auto-Prune & Audit**
  - [ ] Nightly job deletes evidence older than 30 days.
  - [ ] Export deleted IDs to `audit.log`.

- [ ] **Weekly Slack Digest**
  - [ ] n8n cron generates list of docs with score < 60.
  - [ ] Post markdown summary to configured Slack webhook.

- [ ] **Multi-Source Ingest**
  - [ ] Import App-Store reviews CSV → embedding/classify flow.
  - [ ] Import Amplitude event CSV tagged to features.

- [ ] **Smart Context Inference**
  - [ ] Map open file path to feature name via regex.
  - [ ] Pre-load matching persona quotes into chat buffer.

- [ ] **Sentiment Trend Graph**
  - [ ] Query evidence counts per week; render sparkline with Recharts.

- [ ] **Linear/Jira Auto-Labeler**
  - [ ] For new ticket webhooks, attach `persona:X` and `evidence:score` labels.
