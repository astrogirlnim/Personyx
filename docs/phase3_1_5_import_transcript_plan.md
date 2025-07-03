# Implementation Plan – Phase 3 · Feature 1.5 «Import Interview Transcript Modal»

> This plan expands the MVP checklist item _3.1.5 Add "Import Interview Transcript" modal with drag-&-drop + "Open Folder" fallback_ into a concrete, testable work-plan. It is informed by verification of existing Phase 1–2 code (\`InterviewFolderWatcher.ts\`, \`TranscriptIngestService.ts\`, \`WorkflowOrchestrator.ts\`, and PRD import flow in renderer, preload, and main process).

---

## ✅ Verification of Current Foundations

- [x] **Transcript ingestion pipeline exists** – `TranscriptIngestService.processTranscript()` already handles chunking, persona classification, evidence creation, and **re-calculates Evidence Scores**.
- [x] **Background watcher exists** – `InterviewFolderWatcher` streams new/updated files in `userData/interviews` to `WorkflowOrchestrator`, which pipes them into the ingest service.
- [x] **IPC broadcast exists** – `WorkflowOrchestrator` already emits `transcript-ingested` to the renderer.
- [x] **Renderer has import flow template** – `ImportPRDModal` demonstrates drag-&-drop UX, progress stages, IPC round-trip (`window.electronAPI.importPRD`). We will mirror this pattern.
- [ ] **Manual transcript import path missing** – no `importTranscript` IPC, no UI trigger, and `WorkflowOrchestrator` lacks a public helper for manual processing. **This is the gap we will close.**

---

## 📋 Phase 3 · Interface Layer – Checklist

### [ ] Feature 1 · Tray UI Core Screens

#### [ ] Sub-feature 1.5 · Import Interview Transcript Modal

##### Renderer (Vite React)

1.  **[ ] Create `TranscriptImportModal.tsx`** (or co-locate next to `ImportPRDModal`).
    - Mirrors PRD modal styling & motion guidelines (Evidence Gate design system).
    - Accepts `.md`, `.txt`, `.markdown`, ≤ 10 MB (matches `InterviewFolderWatcher`).
    - Provides **drag-&-drop zone** plus **"Browse…"** button (calls `electronAPI.openFileDialog`).
    - Shows five progress stages:
      1. Validating file
      2. Reading content
      3. Sending to main process
      4. AI processing (embeddings & classification)
      5. Re-calculating evidence scores
    - Emits **success toast** on `transcript-ingested` (hooks will also serve 3.1.7 later).
    - Adds detailed console logs for every stage.

2.  **[ ] Extend `App.tsx` state & handlers**
    - Add _Open Transcript Modal_ menu action in Tray window (alongside PRD import).
    - Wire `electronAPI.onOpenImportTranscriptModal` (new channel) to open modal when tray drop occurs.

##### Preload (Secure Bridge)

3.  **[ ] Expose new APIs in `preload.ts`**
    - `importTranscript(filePath: string | {fileName: string; fileContent: string})` (IPC _invoke_ `import-transcript`).
    - `onTranscriptIngested(callback)` already exists – reuse.
    - `openFileDialog()` already present; optionally add `openFolderDialog()` if required.

##### Shared Types

4.  **[ ] Update `src/shared/types.ts`**
    - Add IPC channel types:
      - `import-transcript`
      - `open-import-transcript-modal-with-file`

##### Main Process (Electron Core)

5.  **[ ] `main/main.ts` IPC Handler**
    - Register `ipcMain.handle('import-transcript', …)` in `setupIpcHandlers()`.
    - Logic steps:
      1. Accept **file path** OR **file content** (mirror PRD logic).
      2. Ensure `.md/.txt` and size ≤ 10 MB.
      3. If content, write to a _temporary_ file; else use provided path.
      4. **Copy / move** file into `userData/interviews/` so the path stays consistent.
      5. Construct `TranscriptFileEvent` and call **`workflowOrchestrator.processTranscriptManual(event)`** (step 6).
      6. Await result and `return` to renderer for progress modal.
    - Emits `open-import-transcript-modal-with-file` when tray drop occurs (drag file onto tray icon).

6.  **[ ] Extend `WorkflowOrchestrator`**
    - Add public method `processTranscriptManual(event: TranscriptFileEvent)` that internally calls `transcriptIngestService.processTranscript()` and routes errors ↔ renderer.
    - Refactor existing private `processTranscriptWithIngestService` to be re-usable.

##### Services Layer

7.  **[ ] No changes required in `TranscriptIngestService`** – it already recalculates personas & evidence scores.

##### Design System Compliance

8.  **[ ] Apply Evidence Gate tokens**
    - Card radius `--dr-radius-md`
    - Drop-zone dashed graphite border, hover Evidence Blue, as per §1.2 Import PRD Card spec.

##### Firebase / Cloud Embeddings Considerations

9.  **[ ] Ensure hybrid AI path works**
    - `TranscriptIngestService` relies on `EmbeddingProviderManager`, which already routes to **Firebase Cloud** when configured (§5.3 Phase 2). No additional Firebase setup needed.
    - Confirm Firestore/Functions rules allow transcript embedding (cloud function already accepts generic text blocks).

##### Testing & Verification

10. **[ ] Vitest integration test** `test_phase_3_1_5_transcript_import.mjs`
    - Feed sample transcript (\`tests/sample_interview_solo_founder.md\`).
    - Assert:
      - `evidence` table row count increases.
      - `evidence_scores` updated for affected persona.
      - `transcript-ingested` IPC broadcast payload matches schema.

11. **[ ] Manual QA script** in `docs/PHASE_3_1_5_TESTING_GUIDE.md` (drag file, observe progress, toast, DB rows).

##### Cleanup & Git

12. **[ ] Delete any temporary test files** as per user rule.
13. **[ ] Commit message** `feat: 3.1.5 import transcript modal plan` _(no slashes)_.

---

## 🛠️ Related Files To Update / Create

- `src/renderer/components/TranscriptImportModal.tsx`
- `src/renderer/App.tsx`
- `src/renderer/global.d.ts`
- `src/main/preload.ts`
- `src/main/main.ts`
- `src/main/services/WorkflowOrchestrator.ts`
- `src/shared/types.ts`
- `docs/PHASE_3_1_5_TESTING_GUIDE.md`
- `tests/test_phase_3_1_5_transcript_import.mjs`

---

## ⏩ Next Steps

1. Merge this plan document.
2. Execute checklist top-down, committing after logical units.
3. Run full test suite & manual QA.
4. Prepare PR `phase-3-1-5` upon completion.

---

> _"Update the future, we must. Clear the path, this plan shall."_ – Yoda
