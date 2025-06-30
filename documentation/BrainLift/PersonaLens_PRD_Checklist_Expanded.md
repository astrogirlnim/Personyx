# MVP Development Checklist – DeskResearcher · Persona-Pulse  
*Patched 30 Jun 2025 (adds DevOps, logging, config, a11y, etc.)*  

Legend `[ ]` Not Started `[~]` In Progress `[X]` Completed `[!]` Blocked  

---

## Phase 1 – Foundation  
*Essential build, DevOps, and security groundwork.*

- [ ] **Project Scaffold**  
  - [ ] Create Electron/Tauri repo with TypeScript build pipeline.  
  - [ ] Add LangGraph micro-service stub listening on localhost port.  
  - [ ] Add n8n worker container with file-watch capability.  
  - [ ] Configure cross-platform packaging scripts (Mac & Win).  

- [ ] **DevOps & CI**  
  - [ ] Set up GitHub Actions (or equivalent) to run ESLint, unit tests, and `tsc --noEmit`.  
  - [ ] Add pre-commit hook for prettier + secrets-scan.  
  - [ ] Generate signed installers (macOS notarization, Windows code-sign cert).  

- [ ] **Logging & Monitoring**  
  - [ ] Implement centralized logger wrapper (file + console).  
  - [ ] Add uncaught-exception handler in Electron main & renderer.  
  - [ ] (Optional) Stub Sentry/local crash reporter—respect privacy flag.  

- [ ] **Configuration Management**  
  - [ ] Load `.env` values and secure tokens via OS keychain helper.  
  - [ ] Define `settings.json` schema with versioned migrations helper.  

- [ ] **Persona Config Loader**  
  - [ ] Parse `personas.yml` into in-memory objects at app start.  
  - [ ] Validate YAML schema and log errors to console.  

- [ ] **Interview Folder Watcher**  
  - [ ] Monitor `/interviews` for new `.md` or `.txt` files via n8n trigger.  
  - [ ] On file creation, emit JSON payload to LangGraph endpoint.  

- [ ] **Security Baseline**  
  - [ ] Generate AES-256 key on first run and save to OS keychain.  
  - [ ] Provide helper to encrypt/decrypt arbitrary strings for later phases.  

- [ ] **Memory-Bank Auto-Update Script**  
  - [ ] Add CI step that updates `memory_bank_progress.md` after successful pipeline.  

---

## Phase 2 – Data Layer  
*Persistent storage, embeddings, scoring logic (depends on Phase 1).*

- [ ] **Encrypted SQLite Store**  
  - [ ] Create tables `personas`, `evidence`, `docs`, `settings`, `schema_migrations`.  
  - [ ] Wrap all CRUD in helper module that auto-encrypts tokens at rest.  

- [ ] **Embedding Pipeline**  
  - [ ] Chunk transcripts ≤ 1 k tokens each.  
  - [ ] Call OpenAI `text-embedding-3-small` and cache vectors.  
  - [ ] Implement local MiniLM fallback when OpenAI key missing / rate-limited.  
  - [ ] Persist vectors with foreign-key to `evidence`.  
  - [ ] Build on-device HNSW index for < 50 ms retrieval.  

- [ ] **Persona Classifier**  
  - [ ] Compute cosine similarity between chunk vector and persona prototypes.  
  - [ ] Insert classified snippet into `evidence` with `persona_id`.  

- [ ] **PRD Parser**  
  - [ ] Accept markdown file; extract title, feature bullets, and save to `docs`.  

- [ ] **Evidence Scorer**  
  - [ ] Calculate score = Σ(weighted snippets) for each persona (60-day decay).  
  - [ ] Add sentiment weighting toggle (positive vs negative).  
  - [ ] Implement exponential back-off & queued retries for OpenAI rate limits.  
  - [ ] Expose `/score?doc_id=` REST endpoint returning JSON `{persona, score}`.  

---

## Phase 3 – Interface Layer  
*User-visible components (depends on Phase 1 & 2).*

- [ ] **Tray Dashboard**  
  - [ ] Implement drag-and-drop PRD upload zone.  
  - [ ] Display Evidence Score gauge per persona.  
  - [ ] List top three supporting quotes with citation IDs.  
  - [ ] Provide slider to adjust red-badge threshold (default 60).  

- [ ] **Persona YAML Editor**  
  - [ ] Add in-app YAML editor with schema validation & save to disk.  

- [ ] **User On-boarding Wizard**  
  - [ ] First-run flow: choose interview folder, enter OpenAI key, Slack webhook.  

- [ ] **Theme & Accessibility**  
  - [ ] Add dark / light toggle saving preference in `settings`.  
  - [ ] Ensure keyboard navigation and ARIA labels for all controls.  

- [ ] **VS Code Extension**  
  - [ ] Register command `/ask-persona` with text-selection payload.  
  - [ ] Forward selection + persona ID to local REST endpoint.  

- [ ] **Tray Badge Indicator**  
  - [ ] Turn tray icon red when any score < threshold; neutral when all pass.  

---

## Phase 4 – Implementation Layer  
*High-value capabilities delivering end-user benefit (depends on Phase 1 + 2 + 3).*

- [ ] **Persona Chat Service**  
  - [ ] Build LangGraph RAG chain combining product description + top persona snippets.  
  - [ ] Return chat answer ≤ 2 s with inline citations.  

- [ ] **Product-Description Ingest**  
  - [ ] Allow upload of `product.md`; store in `docs` and feed into chat context.  

- [ ] **Auto-Prune & Audit**  
  - [ ] Nightly job deletes evidence older than 30 days.  
  - [ ] Export deleted IDs to `audit.log`.  

- [ ] **Auto-Update Mechanism**  
  - [ ] Integrate Electron or Tauri updater with signed releases.  

- [ ] **Telemetry Opt-In/Out**  
  - [ ] Provide toggle to send anonymous crash stats; default off.  

- [ ] **Weekly Slack Digest**  
  - [ ] n8n cron generates list of docs with score < threshold.  
  - [ ] Post markdown summary to configured Slack webhook.  

- [ ] **Multi-Source**
