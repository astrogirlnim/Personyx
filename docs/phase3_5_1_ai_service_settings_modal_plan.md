# Phase 3 · Feature 5 · Step 1 (3.5.1) — AI Service Settings Modal Implementation Plan

## 0 · Verification & Context ✅

- **Existing Services**:
  - `src/main/services/SettingsService.ts` handles settings persistence, AI provider config, token migration.
  - `src/main/services/EmbeddingProviderManager.ts` switches between `openai` and `firebase-cloud` providers.
  - `src/main/security/tokenVault.ts` securely stores API keys.
  - Main-process IPC handlers for settings already registered in `src/main/main.ts` (`handleGetSettings`, `handleUpdateSettings`, `handleConfigureAIService`, `handleTestAPIKey`, `handleGetCloudSubscriptionInfo`).
- **Missing Pieces**:
  - Renderer **UI** for settings (modal/panel) ✘
  - Preload exposure for settings IPC ✘
  - Tray action `open-settings` still **TODO**
  - Global state/hook to cache settings in renderer ✘
  - Validation / connectivity test UI ✘
  - Firebase Cloud subscription visibility ✘

Current architecture cleanly supports a settings UI; no conflicting files/functions found.

---

## 1 · Objectives 🎯

1. Provide a modal accessible from the tray that lets the user:
   - Select AI provider: **Local (OpenAI API Key)** vs **Personyx Cloud (Firebase)**.
   - Enter / remove OpenAI API key (local provider).
   - View Personyx Cloud subscription status + "Manage Plan" link.
   - Test connectivity to the chosen provider.
   - Persist the choice immediately and broadcast `settings-updated`.
2. Maintain Evidence Gate design system compliance (radius 8 px, shadow-sm, tokens).
3. No sensitive tokens stored in renderer; keys go through IPC ➝ TokenVault.

---

## 2 · Related Files 🗂️

- Main Process
  - `src/main/main.ts`
  - `src/main/services/SettingsService.ts`
  - `src/main/tray.ts`
- Security & Providers
  - `src/main/security/tokenVault.ts`
  - `src/main/services/EmbeddingProviderManager.ts`
  - `src/main/services/PersonyxCloudService.ts`
- Shared
  - `src/shared/constants.ts`
  - `src/shared/types.ts`
- Renderer
  - `src/renderer/App.tsx`
  - `src/renderer/components` (reference patterns: `TranscriptImportModal.tsx`, `GlobalSuccessToast.tsx`)
  - `src/renderer/hooks` (create `useSettings.ts`)
  - `src/renderer/utils/localStorage.ts`
- Preload
  - `src/main/preload.ts`

---

## 3 · Implementation Checklist

### 3.1 Main Process Enhancements

- [ ] **3.1.1** Implement `open-settings` tray action → send `open-settings-window` IPC to renderer.
- [ ] **3.1.2** Ensure `handleGetSettings`, `handleUpdateSettings`, `handleConfigureAIService`, `handleTestAPIKey`, `handleGetCloudSubscriptionInfo` are registered (already ✅) and add exhaustive logging.
- [ ] **3.1.3** Add activity-log entry `general-activity` titled "Settings opened" with source `general`.

### 3.2 Preload API Surface

- [ ] **3.2.1** Extend `ElectronAPI` interface with:
  - `getSettings()`
  - `updateSettings(partial)`
  - `configureAIService(config)`
  - `testAPIKey(provider, apiKey?)`
  - `getCloudSubscriptionInfo()`
  - Event listeners: `onSettingsUpdated`, `onApiKeyTestResult`, `onCloudSubscriptionInfo`.
- [ ] **3.2.2** Wire each to corresponding `ipcRenderer.invoke/on` channels (see `IPC_CHANNELS`).

### 3.3 Renderer State & Hooks

- [ ] **3.3.1** Create `useSettings.ts` hook (React context + reducer) to cache settings and expose updater.
- [ ] **3.3.2** Subscribe to `settings-updated` to keep state in sync.

### 3.4 AI Service Settings Modal UI

- [ ] **3.4.1** Create `AIServiceSettingsModal.tsx` in `components/` using Evidence Gate card styling.
- [ ] **3.4.2** Layout
  - Provider radio group (Local ▸ Cloud ▸ Auto).
  - Conditional section: Local Key input + "Save to Vault" button.
  - Conditional section: Cloud plan badge + usage bar + "Change Plan" link.
  - "Test Connection" button (shows spinner & toast).
  - Footer: "Save" (disabled while unchanged) & "Cancel".
- [ ] **3.4.3** Validation
  - OPenAI key length & pattern (starts with `sk-`).
  - Disable save until key passes basic regex.
- [ ] **3.4.4** Success / error handling via `GlobalSuccessToast` & `GlobalErrorToast`.
- [ ] **3.4.5** Keyboard shortcut `CmdOrCtrl+,` opens modal.

### 3.5 App Integration

- [ ] **3.5.1** Add modal state to `App.tsx` and register `onOpenSettingsWindow` listener.
- [ ] **3.5.2** Update Tailwind classes for radius/shadow tokens as per Evidence Gate.
- [ ] **3.5.3** Include modal in dark-mode theme toggle path.

### 3.6 Unit & Integration Tests

- [ ] **3.6.1** Add Vitest tests for `useSettings` reducer actions.
- [ ] **3.6.2** Add integration test `test_phase_3_5_1_settings_modal.mjs` to open modal, set fake key, verify vault stored & provider switched.

### 3.7 Firebase / Cloud Considerations

- [ ] **3.7.1** Validate that `PersonyxCloudService.initialize` is called on cloud provider switch.
- [ ] **3.7.2** Warn user if subscription `usageRemaining` < 10 %.
- [ ] **3.7.3** Handle network / auth errors with `onGlobalError` channel.

### 3.8 Documentation & Logging

- [ ] **3.8.1** Update `docs/DEVELOPMENT.md` with new IPC APIs.
- [ ] **3.8.2** Add log statements at each critical path (modal open, save, test key, provider switch).

### 3.9 Post-Implementation Cleanup

- [ ] **3.9.1** Manual QA: verify tray menu, shortcut, and modal flow on Mac & Windows.
- [ ] **3.9.2** Commit with message: `phase3.5.1 add ai service settings modal` (no slashes).

---

## 4 · Timeline (ideal)

1. Main & Preload wiring — 0.5 d
2. Renderer hook & modal — 1 d
3. Tests & QA — 0.5 d
4. Docs & polish — 0.25 d

Total: **≈ 2.25 development days**

---

> _"Tune the service, define your source; clarity in settings, the path you'll course." — Evidence Gate proverb_
