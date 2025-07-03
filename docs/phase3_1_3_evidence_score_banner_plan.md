# Phase 3 – Interface Layer

## Feature 1 – Tray UI Core Screens

### 3.1.3 Evidence Score Banner – Comprehensive Implementation Plan

_All tasks are independent checklist items to ensure clear progress tracking._

---

### Phase 0 · Verification & Context Gathering

- [ ] **0.1** Review existing codebase for Evidence Score flow
  - [ ] Confirm `SecureFileIngestService` emits `prd-imported` with `evidenceScores` ✅ _(verified)_
  - [ ] Confirm `preload.ts` exposes `onPRDImported` & `onEvidenceScoreUpdated` listeners ✅ _(verified)_
  - [ ] Verify renderer has placeholder Ring Gauge UI in `App.tsx` ✅ _(verified)_
  - [ ] Ensure no conflicting state managers for scores exist (single `appState` source)

---

### Phase 1 · Main-Process Enhancements _(optional, improves real-time updates)_

- [ ] **1.1** Emit `evidence-score-updated` from `EvidenceScoreService.persistEvidenceScore()`
  - [ ] Add `mainWindow?.webContents.send('evidence-score-updated', { documentId, scores: [newScore] })` after DB persist.
  - [ ] Update unit tests in `tests/test_phase_2_4_complete.mjs` to expect event.

- [ ] **1.2** Guard against missing window / destroyed states (reuse existing logger pattern).

---

### Phase 2 · Preload & IPC Typings

- [ ] **2.1** Update `src/shared/constants.ts` to export `EVIDENCE_SCORE_UPDATED` string (already exists) – ensure renderer import.
- [ ] **2.2** Verify `ElectronAPI` in `preload.ts` already declares `onEvidenceScoreUpdated`; extend JSDoc.
- [ ] **2.3** Add strong TypeScript typings for callback payloads using `IPCEvents['evidence-score-updated']`.

---

### Phase 3 · Renderer UI Implementation

- [ ] **3.1** Create component `src/renderer/components/EvidenceScoreGauge.tsx`
  - [ ] Accept `score: number | null` prop.
  - [ ] Render SVG ring gauge with animated stroke-dashoffset.
  - [ ] Implement _Score Pulse_ animation (`scale(1.04) → 1`, opacity `100 → 80 → 100`, 400 ms, respect `prefers-reduced-motion`).
  - [ ] Ensure 4.5 : 1 contrast for centre label.

- [ ] **3.2** Integrate component into `App.tsx`
  - [ ] Replace placeholder Ring Gauge block.
  - [ ] Maintain state `latestEvidenceScore` inside `App` context.
  - [ ] Subscribe to `window.electronAPI.onPRDImported` & `onEvidenceScoreUpdated` to update state.
  - [ ] Fallback to `getEvidenceScores(documentId)` on app reload.

- [ ] **3.3** Responsive & A11y
  - [ ] Ensure gauge stays `160px` diameter (`--dr-ring-gauge-size`).
  - [ ] Add `aria-live="polite"` to score label for screen readers.
  - [ ] Keyboard focus ring for surrounding card (`outline-2 focus-visible:outline-evidence`).

- [ ] **3.4** Theming & Tailwind Tokens
  - [ ] Use `text-evidence` for filled arc, `text-graphite` dashed background.
  - [ ] Dark-mode variants via `dark:` utilities.

---

### Phase 4 · State Management & Persistence

- [ ] **4.1** Extend `AppState` interface (`src/shared/types.ts`) with `currentEvidenceScores: EvidenceScore[]`.
- [ ] **4.2** Persist last imported PRD ID & scores in localStorage for session restore.
- [ ] **4.3** Provide util hook `useEvidenceScores(documentId)` for components.

---

### Phase 5 · Firebase / Cloud Considerations

- [ ] **5.1** No direct Firebase writes required – Evidence Scores are local.
- [ ] **5.2** Ensure remote embedding (Firebase Function) returns before score calc (already handled in ingest service).
- [ ] **5.3** Update Cloud Functions README if payload shape changes due to `evidence-score-updated` event.

---

### Phase 6 · Testing & QA

- [ ] **6.1** Unit test `EvidenceScoreGauge` rendering for 0, 50, 100 scores using `@testing-library/react`.
- [ ] **6.2** End-to-end test: import sample PRD → expect gauge to animate & centre label to display score (`tests/test_phase_3_1_3_banner.mjs`).
- [ ] **6.3** Accessibility audit with `axe-core` – ensure no violations.

---

### Phase 7 · Documentation & Checklist Updates

- [ ] **7.1** Add usage example of `EvidenceScoreGauge` in `docs/personyx_design.md`.
- [ ] **7.2** Update `documentation/personyx_mvp_checklist.md` – mark **3.1.3** as `[~]` In Progress when work starts, `[X]` when done.
- [ ] **7.3** Record implementation summary in `docs/phase3_1_3_implementation_summary.md`.

---

### Phase 8 · Deployment

- [ ] **8.1** Validate macOS, Windows, Linux builds display banner correctly.
- [ ] **8.2** Increment app version & update release notes.

---

### Related Files & Modules

- **Main Process**
  - `src/main/services/SecureFileIngestService.ts`
  - `src/main/services/EvidenceScoreService.ts`
  - `src/main/main.ts` (IPC registration)
- **Shared**
  - `src/shared/types.ts`, `src/shared/constants.ts`
- **Preload**
  - `src/main/preload.ts`
- **Renderer**
  - `src/renderer/App.tsx`
  - `src/renderer/components/EvidenceScoreGauge.tsx` _(new)_
  - `src/renderer/styles/index.css` (Tailwind token usage)
- **Tests**
  - `tests/test_phase_3_1_3_banner.mjs` _(new)_
  - Updated existing ingest tests.
- **Docs**
  - `docs/personyx_design.md` (token references)
  - `docs/phase3_1_3_evidence_score_banner_plan.md` _(this file)_

---

> By following this checklist, we will deliver a polished, real-time Evidence Score banner that adheres to the _Evidence Gate_ design system while maintaining robust architecture and test coverage.
