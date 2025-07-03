# MVP Development Checklist – **Personyx v0.1**

_All items are written as independent, testable tasks for your AI developer. Work straight down every phase; within each feature, sub-items have **zero internal dependencies**._

---

### Template Overview

This checklist follows the four-phase structure you provided. **Phase 1 (Foundation)** must finish first; Phases 2 & 3 can proceed in parallel; **Phase 4** begins once 1–3 are stable.

Legend — `[ ]` Not Started `[~]` In Progress `[X]` Done `[!]` Blocked

---

## Phases Overview

[X] **Phase 1:** Foundation ✅ COMPLETE  
[X] **Phase 2:** Data Layer ✅ COMPLETE (6/6 features)  
[ ] **Phase 3:** Interface Layer  
[ ] **Phase 4:** Implementation Layer

---

## Phase 1 – **Foundation**

_Criteria: essential build & tooling; no cross-dependencies._

[X] **Feature 1 – Project Bootstrap & Tooling**

- [x] **1.1** Scaffold an Electron 28 + TypeScript monorepo with one "Tray UI" process and one "Core" process.
- [x] **1.2** Add cross-platform build / packaging scripts (Mac, Win, Linux) and ESLint+Prettier pipeline.
- [x] **1.3** Stub a Tray menu containing a "Drop PRD (.md / .txt)" zone.
- [x] **1.4** Wire a basic auto-update placeholder (no server yet).

[X] **Feature 2 – Core Data Structures & Security**

- [x] **2.1** Define an SQLite schema for _personas, evidence, product docs, scores_.
- [x] **2.2** Implement an AES-encrypted token vault for API keys (VSCode, Slack, Apple Notes).
- [x] **2.3** Add typed DAL (e.g., Drizzle ORM) with migration script.
- [x] **2.4** Unit-test CRUD operations against an in-memory SQLite db.

[X] **Feature 3 – LangGraph + n8n Workflow**

- [x] **3.1** Create an n8n flow that _file-watches_ `/interviews` and publishes raw transcript text.
- [x] **3.2** Build a LangGraph pipeline to embed transcripts and _classify by persona_.
- [x] **3.3** Persist embeddings and metadata to SQLite.
- [x] **3.4** Emit a "TranscriptIngested" IPC event to the Tray process.

[X] **Feature 4 – Persona Definitions & Mock Data** ✅ COMPLETE

- [x] **4.1** Author `personas.yml` with **Solo Founder** & **Agency Marketer** objects. ✅ COMPLETE
- [x] **4.2** Seed two mock interview transcripts in `/interviews`. ✅ COMPLETE
- [x] **4.3** Place a sample PRD markdown file in `/samples` for import tests. ✅ COMPLETE
- [x] **4.4** Write Jest tests that prove transcripts and PRDs ingest without error. ✅ COMPLETE

---

## Phase 2 – **Data Layer**

_Criteria: storage & computation services, depends only on Phase 1._

[X] **Feature 1 – Evidence Score Engine** ✅ COMPLETE

- [x] **1.1** Implement a scoring algorithm (0-100) per persona using evidence coverage heuristics. ✅ COMPLETE
- [x] **1.2** Expose `calculateEvidenceScore(prdId, personaId)` as a service. ✅ COMPLETE
- [x] **1.3** Persist score snapshots with timestamp to SQLite. ✅ COMPLETE
- [x] **1.4** Add unit tests covering min, max, and median score paths. ✅ COMPLETE

[X] **Feature 2 – Embedding Retrieval API** ✅ COMPLETE

- [x] **2.1** Provide a similarity-search endpoint that returns top-N persona pull-quotes. ✅ COMPLETE
- [x] **2.2** Optimise vector-index (e.g., HNSW) for < 200 ms queries. ✅ COMPLETE
- [x] **2.3** Cache repeat queries in memory for 5 min sliding window. ✅ COMPLETE
- [x] **2.4** Document API in OpenAPI 3 format. ✅ COMPLETE

[X] **Feature 3 – Secure File Ingest** ✅ COMPLETE

- [x] **3.1** Accept PRD markdown uploads via Tray drop or REST `/import` route. ✅ COMPLETE
- [x] **3.2** Validate file type & size; reject on failure with JSON error. ✅ COMPLETE
- [x] **3.3** Extract sections, chunk, embed, and store atoms + embeddings. ✅ COMPLETE
- [x] **3.4** Emit "PRDImported" event with new evidence scores. ✅ COMPLETE

[X] **Feature 4 – Data Access Layer Utilities** ✅ COMPLETE

- [x] **4.1** Implement a repository pattern for pagination & filtering. ✅ COMPLETE
- [x] **4.2** Add row-level encryption tests for sensitive tables. ✅ COMPLETE
- [x] **4.3** Provide CLI `db:seed --mock` for local demos. ✅ COMPLETE
- [x] **4.4** Generate ER-diagram in `/docs`. ✅ COMPLETE

[~] **Feature 5 – Hybrid AI Key Management & Cloud Option** 🔄 NEARLY COMPLETE (3/4 sub-features)

- [x] **5.1** Implement secure local storage for user-provided keys (AES-256-GCM) – TokenVault ✅
- [x] **5.2** Integrate Firebase Auth + Cloud Functions for managed embedding (with auth) ✅ COMPLETE
- [x] **5.3** Add logic to select between local and cloud embedding at runtime ✅ COMPLETE
- [x] **5.4** Unit-test key retrieval, cloud fallback & error states

[X] **Feature 6 – Interview Evidence Generator** ✅ COMPLETE

- [x] **6.1** Implement `TranscriptIngestService` to monitor `/interviews` and emit `transcript-imported`. ✅ COMPLETE
- [x] **6.2** Extract & chunk transcript text into analysable blocks. ✅ COMPLETE
- [x] **6.3** Classify chunks by persona and generate embeddings via LangGraph/OpenAI. ✅ COMPLETE
- [x] **6.4** Persist evidence rows with embeddings to SQLite and emit `evidence-created`. ✅ COMPLETE
- [x] **6.5** Trigger `EvidenceScoreService.recalculateAll` and broadcast `evidence-score-updated`. ✅ COMPLETE
- [x] **6.6** Unit & integration tests covering ingest → evidence → score delta. ✅ COMPLETE

---

## Phase 3 – **Interface Layer**

_Criteria: user-facing components; each relies on Phases 1 & 2._

[X] **Feature 1 – Tray UI Core Screens** ✅ COMPLETE (8/8 features, 32/32 sub-features)

- [x] **1.1** Build "Chat with Persona" window (single persona dropdown). ✅ COMPLETE
- [x] **1.2** Add "Import PRD" modal with drag-&-drop, progress bar, and error validation UI. ✅ COMPLETE
- [x] **1.3** Display real-time Evidence Score banner after import. ✅ COMPLETE (with advanced state management & persistence)
- [x] **1.4** Show global error toast for failed ingest events. ✅ COMPLETE
- [x] **1.5** Add "Import Interview Transcript" modal with drag-&-drop + "Open Folder" fallback. ✅ COMPLETE
- [x] **1.6** Implement Activity Log panel (ingest successes, errors, score updates). ✅ COMPLETE
  - [x] **1.6.1** Create ActivityLogService in main process to track all activities ✅ COMPLETE
  - [x] **1.6.2** Add activity log database schema and migration ✅ COMPLETE
  - [x] **1.6.3** Implement ActivityLogPanel component with filtering and search ✅ COMPLETE
  - [x] **1.6.4** Add real-time activity broadcasting via IPC events ✅ COMPLETE
  - [x] **1.6.5** Integrate activity logging into all main process services ✅ COMPLETE
  - [x] **1.6.6** Add activity log persistence and localStorage utilities ✅ COMPLETE
  - [x] **1.6.7** Implement activity log UI with Evidence Gate design compliance ✅ COMPLETE
  - [x] **1.6.8** Add comprehensive testing for activity log functionality ✅ COMPLETE
  - [x] **1.6.9** Add activity log performance optimizations and archival ✅ COMPLETE
  - [x] **1.6.10** Integrate activity log into main tray UI with keyboard shortcuts ✅ COMPLETE
- [x] **1.7** Show success toast "Transcript analysed – evidence added" on completion. ✅ COMPLETE
- [x] **1.8** Add Activity Log row "Interview Imported" with persona evidence counts. ✅ COMPLETE + SUCCESS TOAST FIX
  - [x] **1.8.1** Update `TranscriptProcessingResult` interface to include detailed evidence data ✅ COMPLETE
  - [x] **1.8.2** Modify `WorkflowOrchestrator.processTranscriptManual()` to return detailed results ✅ COMPLETE
  - [x] **1.8.3** Update `main.ts.handleImportTranscript()` to receive and process detailed results ✅ COMPLETE
  - [x] **1.8.4** Create new `logInterviewImported()` method in `ActivityLogService` ✅ COMPLETE
  - [x] **1.8.5** Add persona name mapping functionality to `ActivityLogService` ✅ COMPLETE
  - [x] **1.8.6** Update activity log metadata interface for persona evidence details ✅ COMPLETE
  - [x] **1.8.7** Update `transcript-imported` IPC event to include evidence counts ✅ COMPLETE
  - [x] **1.8.8** Enhance activity log broadcasting with detailed persona information ✅ COMPLETE
  - [x] **1.8.9** Update `ActivityLogPanel` to display detailed persona evidence counts ✅ COMPLETE
  - [x] **1.8.10** Add persona-specific metadata display in activity log entries ✅ COMPLETE
  - [x] **1.8.11** Create comprehensive unit tests for new activity logging ✅ COMPLETE
  - [x] **1.8.12** Add integration tests for complete interview import → activity log flow ✅ COMPLETE
  - [x] **1.8.13** Manual testing verification and documentation updates ✅ COMPLETE
  - [x] **1.8.14** CRITICAL FIX: Restore success toast emission in enhanced pathway ✅ COMPLETE

[ ] **Feature 2 – Notion Scorecard Prototype** _(DEPRIORITIZED - Future Scope)_

- [ ] **2.1** Implement OAuth connect flow to user's Notion workspace. _(Future Scope)_
- [ ] **2.2** Render a scorecard preview inside a resizable panel. _(Future Scope)_
- [ ] **2.3** Add one-click "Export to Notion" button. _(Future Scope)_
- [ ] **2.4** Gracefully handle token expiry & permission errors. _(Future Scope)_

[ ] **Feature 3 – VS Code Extension (stub)**

- [ ] **3.1** Register slash command `/ask-persona` that pipes the open selection to the core API.
- [ ] **3.2** Display Q&A response in a sidebar webview.
- [ ] **3.3** Include local-instance discovery & auth handshake.
- [ ] **3.4** Package `.vsix` and include install steps in README.

[ ] **Feature 4 – Slack Bot MVP**

- [ ] **4.1** Create slash command `/evidence-check <PRD link>` parsing logic.
- [ ] **4.2** Fetch score + top quotes and post an interactive message.
- [ ] **4.3** Provide install script with required OAuth scopes.
- [ ] **4.4** Add rate-limit guard (max 3 calls / min / workspace).

[X] **Feature 5 – Settings & Management**

- [x] **5.1** Implement "AI Service" settings modal (enter OpenAI key, select Firebase Cloud). ✅ COMPLETE
  - [x] **5.1.1** Settings modal UI with Evidence Gate design compliance ✅ COMPLETE
  - [x] **5.1.2** Local/Cloud provider switching with proper validation ✅ COMPLETE
  - [x] **5.1.3** API key input with show/hide toggle and validation ✅ COMPLETE
  - [x] **5.1.4** Connection testing with detailed error feedback ✅ COMPLETE
  - [x] **5.1.5** Cloud subscription status display ✅ COMPLETE
  - [x] **5.1.6** Keyboard shortcuts (Ctrl/Cmd+,) and tray integration ✅ COMPLETE
  - [x] **5.1.7** Comprehensive test suite with 11 passing tests ✅ COMPLETE
  - [x] **5.1.8** Validation error display fix for frontend feedback ✅ COMPLETE
- [x] **5.2** Validate & encrypt keys via TokenVault; surface missing-key warnings. ✅ COMPLETE (Phase 3.5.2 - **SCOPE CHANGE**: Focused on VSCode, Slack, Apple Notes. Notion & Linear moved to future scope for strategic focus.)
  - [x] **5.2.1** Extend `TokenVault` with `validateToken` & `isTokenStored` for VSCode (GitHub PAT), Slack (xoxb-) and Apple Notes (placeholder) services ✅ COMPLETE
  - [x] **5.2.2** Add new IPC channels & handlers for third-party token CRUD operations ✅ COMPLETE
  - [x] **5.2.3** Enhance `SettingsService` with `configureThirdPartyToken`, `removeThirdPartyToken`, `getTokenStatus`, and `testThirdPartyToken` methods ✅ COMPLETE
  - [x] **5.2.4** Update **AI Service Settings Modal** UI: service picker, token inputs, validation errors, and connection-test buttons per service ✅ COMPLETE
  - [x] **5.2.5** Integrate front-end hook (`useSettings`) state management for new token workflows ✅ COMPLETE
  - [x] **5.2.6** Write unit tests for third-party token validation, storage, removal, and IPC round-trips ✅ COMPLETE
  - [x] **5.2.7** Add quick-verification vitest script `test_phase_3_5_2_quick_verification.mjs` covering happy path & edge cases ✅ COMPLETE
  - [x] **5.2.8** Update manual testing guide with new scenarios (valid/invalid tokens, removal, error states) ✅ COMPLETE
- [ ] **5.3** Add Persona Manager (view / edit `personas.yml`; trigger reload without restart).
- [ ] **5.4** Persist dark / light theme toggle to local prefs.

---

## Phase 4 – **Implementation Layer**

_Criteria: value-delivering capabilities built atop 1–3._

[ ] **Feature 1 – Evidence Scorecard Export** _(DEPRIORITIZED - Future Scope)_

- [ ] **1.1** Generate a Notion page summarising scores & persona quotes. _(Future Scope)_
- [ ] **1.2** Convert that page to a slide deck via Notion API and return link. _(Future Scope)_
- [ ] **1.3** Persist export history with `deckUrl` and timestamp. _(Future Scope)_
- [ ] **1.4** Add "Open Deck" button in Tray notifications. _(Future Scope)_

[ ] **Feature 2 – Linear Evidence-Score Labeler** _(DEPRIORITIZED - Future Scope)_

- [ ] **2.1** Connect to Linear GraphQL API and locate issues by PRD link. _(Future Scope)_
- [ ] **2.2** Apply or update `evidence-low / evidence-high` labels based on current score. _(Future Scope)_
- [ ] **2.3** Provide a batch-label CLI `linear:label-backlog`. _(Future Scope)_
- [ ] **2.4** Log label changes to audit table. _(Future Scope)_

[ ] **Feature 3 – Security & Maintenance Utilities**

- [ ] **3.1** Implement a 30-day auto-prune job for expired transcripts & logs.
- [ ] **3.2** Write audit-log exporter (CSV) with checksum verification.
- [ ] **3.3** Integrate a one-click "Check for Updates" menu item (touches auto-update stub).

[ ] **Feature 4 – Proactive Notifications & Retro Tools**

- [ ] **4.1** Send a weekly Slack digest: "Proposals lacking persona evidence".
- [ ] **4.2** Turn Tray badge red when any open PRD's Evidence Score < 60.
- [ ] **4.3** Schedule a "Renewal-risk radar" job that flags missing capabilities 90 days pre-renewal.
- [ ] **4.4** Build a _Retro Wizard_ that imports a failed feature (CSV or Jira) and quantifies wasted effort.

---

### Implementation Guidelines

- **Zero dependencies** inside any single feature list.
- Each sub-item is fully testable in isolation and can be rolled back without side-effects.
- Mark progress with `[~]` when partial, `[X]` when finished, `[!]` if blocked.
