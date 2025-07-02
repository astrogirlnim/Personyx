# Feature ⇄ Phase ⇄ Component Mapping

**PersonaPulse / DeskResearcher — v0.1-MVP**  
_Last update: July 2 2025_

---

## Legend

• **Phase #** — corresponds to the four-phase structure in `personyx_mvp_checklist.md`.  
• **Feature #.#** — item number inside that phase.  
• **Key Components** — concrete modules, services, screens, or external integrations that deliver or unblock the feature.  
• **Status** — present (✅ implemented in repo) | gap (⚠️ planned, code missing).

---

### Phase 1 — Foundation

| Feature                                 | Key Components                                                                      | Status |
| --------------------------------------- | ----------------------------------------------------------------------------------- | ------ |
| **1.1 Bootstrap & Tooling**             | `src/main/main.ts`, Vite, Electron builder scripts, ESLint/Prettier, `dev.sh`       | ✅     |
| **1.2 Cross-platform packaging**        | `scripts/fix-native-modules.sh`, `electron-builder` config                          | ✅     |
| **1.3 Tray menu stub**                  | `src/main/tray.ts`, `assets/tray-icon.png`                                          | ✅     |
| **1.4 Auto-update placeholder**         | `src/main/utils/auto-updater.ts`                                                    | ✅     |
| **2.x Core Data Structures & Security** | `src/main/db/schema.ts`, repositories, Drizzle migrations, `security/tokenVault.ts` | ✅     |
| **3.x LangGraph + n8n Workflow**        | `InterviewFolderWatcher.ts`, `LangGraphService.ts`, `WorkflowOrchestrator.ts`       | ✅     |
| **4.x Persona definitions & mock data** | `personas.yml`, `/interviews/*.md`, `/samples/sample_prd.md`                        | ✅     |

---

### Phase 2 — Data Layer

| Feature                         | Key Components                                                              | Status |
| ------------------------------- | --------------------------------------------------------------------------- | ------ |
| **2.1 Evidence Score Engine**   | `EvidenceScoreService.ts`, `EvidenceScoreRepo.ts`                           | ✅     |
| **2.2 Embedding Retrieval API** | `EmbeddingRetrievalService.ts`, OpenAPI spec `embedding-retrieval-api.yaml` | ✅     |
| **2.3 Secure File Ingest**      | `SecureFileIngestService.ts`, validation helpers                            | ✅     |
| **2.4 DAL Utilities**           | Repository pattern (`*Repo.ts`), CLI `scripts/db-seed-mock.js`              | ✅     |
| **2.5 Hybrid AI Key Mgmt**      | `security/tokenVault.ts` (backend ready); _UI selection modal_ (⚠️)         | ⚠️     |

---

### Phase 3 — Interface Layer

| Feature                      | Phase-2 Dependencies                                          | Key UI / IPC Components    | Status |
| ---------------------------- | ------------------------------------------------------------- | -------------------------- | ------ |
| **3.1 Tray UI Core Screens** | Evidence Score Engine, Secure File Ingest, Interview pipeline | • `renderer/App.tsx` shell |

• `ImportPrdModal` (⚠️)  
• `ChatWithPersonaWindow` (⚠️)  
• `EvidenceScoreBanner` (⚠️)  
• Global `ToastManager` (⚠️) | ⚠️ |
| **3.1-A Import Interview Transcript** _(gap)_ | InterviewFolderWatcher | • `ImportInterviewModal` (⚠️)  
• "Open Interviews Folder" CTA | ⚠️ |
| **3.1-B AI Service / Settings Modal** | TokenVault, Hybrid-AI selection | • `AiServiceSettingsModal` (⚠️)  
• Dark-mode toggle already present in Header | ⚠️ |
| **3.2 Notion Scorecard Prototype** | Embedding Retrieval API | • Notion OAuth flow (⚠️)  
• `ScorecardPreviewPanel` (⚠️) | ⚠️ |
| **3.3 VS Code Extension (stub)** | Embedding Retrieval API | • `/vscode-extension/` skeleton (⚠️)  
• Command `/ask-persona` (⚠️) | ⚠️ |
| **3.4 Slack Bot MVP** | Evidence Score Engine, Embedding Retrieval | • `/slack-bot/` folder, Bolt.js app (⚠️) | ⚠️ |

---

### Phase 4 — Implementation Layer

| Feature                               | Up-stream Dependencies                   | Key Components                       | Status |
| ------------------------------------- | ---------------------------------------- | ------------------------------------ | ------ |
| **4.1 Evidence Scorecard Export**     | Notion Prototype, Evidence Score Engine  | • `NotionExportService` (⚠️)         |
| • Deck conversion helper (⚠️)         | ⚠️                                       |
| **4.2 Linear Evidence-Score Labeler** | Evidence Score Engine, Linear API client | • `LinearLabelerService` (⚠️)        | ⚠️     |
| **4.3 Security & Maintenance**        | TokenVault, Electron updater             | • Prune job, `AuditLogExporter` (⚠️) | ⚠️     |
| **4.4 Proactive Notifications**       | Evidence scores, Slack Bot               | • `WeeklyDigestScheduler` (⚠️)       |
| • Tray badge logic (⚠️)               | ⚠️                                       |

---

## Observations & Gaps

1. **Interview transcript upload UI** is absent — tray app needs a modal or drag-and-drop zone mirroring PRD import.
2. **Hybrid AI key selection workflow** lacks a Settings modal despite backend vault readiness.
3. **User feedback loop** (toasts / activity log) is required for ingest success & error surfacing.
4. **Persona management UI** not yet scoped; current YAML is static.
5. External integrations (Notion, Slack, Linear) are placeholder only — need scaffolding repos & OAuth flows in later phases.

---

> _Mapping created to track completeness and to surface hidden work for Phase 3 UI. Update as features ship._
